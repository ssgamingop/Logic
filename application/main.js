const { app, BrowserWindow, globalShortcut, clipboard, ipcMain, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const WebSocket = require('ws');

// Set up WebSocket server
const wss = new WebSocket.Server({ port: 31415 });
let wsClients = [];

wss.on('connection', function connection(ws) {
  wsClients.push(ws);
  ws.on('message', function incoming(message) {
    // Message from Chrome extension (the extracted question)
    const text = message.toString();
    if (mainWindow) {
      mainWindow.webContents.send('auto-read-result', text);
    }
  });
  ws.on('close', () => {
    wsClients = wsClients.filter(client => client !== ws);
  });
});

ipcMain.on('request-auto-read', () => {
  // Tell all connected browser tabs to read their content
  // The content script will check if it's the active tab before responding
  wsClients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send('READ');
    }
  });
});

ipcMain.on('resize-window', (event, { width, height }) => {
  if (mainWindow) {
    mainWindow.setSize(width, height, true);
  }
});

let mainWindow;
let tray = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 420,
    height: 650,
    show: false, // Prevent focus stealing on launch
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // Show inactive once loaded to keep focus on the browser
  mainWindow.once('ready-to-show', () => {
    mainWindow.showInactive();
  });

  // PIN ON TOP OF EVERYTHING (including fullscreen apps)
  mainWindow.setAlwaysOnTop(true, 'screen-saver', 1);
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  // HIDE FROM SCREEN RECORDING & SCREENSHOTS
  mainWindow.setContentProtection(true);

  // Load the UI
  mainWindow.loadFile('index.html');

  // Register Global Keyboard Shortcuts
  // Cmd+Shift+E : Extract from Browser & Answer
  globalShortcut.register('CommandOrControl+Shift+E', () => {
    if (!mainWindow || mainWindow.isDestroyed()) createWindow();
    else {
      mainWindow.showInactive();
      mainWindow.webContents.send('shortcut-triggered', { action: 'browser-answer' });
    }
  });

  // Cmd+Shift+C : Extract from Clipboard & Answer
  globalShortcut.register('CommandOrControl+Shift+C', () => {
    if (!mainWindow || mainWindow.isDestroyed()) createWindow();
    else {
      mainWindow.showInactive();
      mainWindow.webContents.send('shortcut-triggered', { action: 'clipboard-answer' });
    }
  });

  // Cmd+Shift+X : Extract from Browser & Explain
  globalShortcut.register('CommandOrControl+Shift+X', () => {
    if (!mainWindow || mainWindow.isDestroyed()) createWindow();
    else {
      mainWindow.showInactive();
      mainWindow.webContents.send('shortcut-triggered', { action: 'browser-explain' });
    }
  });

  // Cmd+Shift+H : Toggle window visibility
  globalShortcut.register('CommandOrControl+Shift+H', () => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      createWindow();
    } else {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.showInactive();
      }
    }
  });
  
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // HIDE FROM DOCK (MacOS)
  if (app.dock) {
    app.dock.hide();
  }

  // Create Tray Icon (Menu Bar)
  const iconPath = path.join(__dirname, 'build', 'icon.png');
  const trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  tray = new Tray(trayIcon);
  
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show Crackit', click: () => { if (!mainWindow || mainWindow.isDestroyed()) createWindow(); else mainWindow.showInactive(); } },
    { type: 'separator' },
    { label: 'Quit', click: () => { 
        isQuitting = true;
        app.quit(); 
      } 
    }
  ]);
  
  tray.setToolTip('Crackit Study Helper');
  tray.setContextMenu(contextMenu);
  
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

let isQuitting = false;

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  try {
    wss.close();
  } catch(e) {}
});

app.on('window-all-closed', function () {
  // If the user explicitly hits Cmd+Q or Quit from Tray, kill it completely.
  // Otherwise, let it stay alive in the tray for shortcuts.
  if (isQuitting || process.platform !== 'darwin') {
    app.quit();
  }
});
