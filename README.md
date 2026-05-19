# Crackit Study Helper

A multi-client, stealthy AI study helper designed for ultimate reliability and invisibility. The project is split into three main components based on the user's operational needs.

## Architecture & Ecosystem

### 1. The Stealth Desktop Client (`/application`)
A standalone Electron desktop application engineered to be completely invisible to screen recording and proctoring software.
- **Stealth Features**: Uses `setContentProtection(true)` to hide the window from screen recordings/sharing. Does not steal focus from the browser.
- **Seamless Shortcuts**: Use global keyboard shortcuts (`Cmd+Shift+E`, `Cmd+Shift+C`) to extract text and answer questions without losing window focus.
- **WebSocket Server**: Runs a local WebSocket server to receive extracted questions directly from the Chrome extension.
- **Build Instructions**: 
  - Install dependencies: `npm install`
  - Run locally: `npm start`
  - Build for Mac: `npm run build:mac`
  - Build for Win: `npm run build:win`

### 2. The DOM Extractor (`/extension`)
A lightweight Chrome Extension that serves as the bridge between locked-down web pages and the Stealth Desktop Client.
- **Silent DOM Reading**: Injects a content script that pulls the inner text of multiple-choice questions natively, bypassing copy-paste restrictions and without capturing visual screenshots.
- **Zero UI Overhead**: Offloads all logic and API keys to the Desktop app. It simply checks the connection and acts as an invisible WebSocket client.
- **Installation**: Load `extension/` as an unpacked extension in Chrome via `chrome://extensions/`.

### 3. The Mobile Web Client (`/webapp`)
A 100% physically detached solution for environments where running an Electron app is impossible.
- **Mobile First**: Built with React and Vite. Open this on your mobile phone and point your camera at your screen.
- **Vision AI**: Uses Groq's Vision API (`llama-3.2-11b-vision-preview`) to run OCR and solve questions from your mobile device camera in real-time.
- **No Permissions Needed**: Bypasses all PC-based proctoring mechanisms because it runs on a completely separate device.
- **Run Locally**:
  - `cd webapp`
  - `npm install`
  - `npm run dev`

### 4. Injection Scripts (`console-script.js`)
A raw JavaScript snippet that can be pasted directly into a browser's Developer Tools Console to inject a floating AI widget onto the screen. This is an alternative to the Extension/Desktop setup.

## Built With
- **Electron JS**
- **React / Vite**
- **Groq AI (Llama 3.3 70B & 3.2 Vision 11B)**
- **Vanilla Glassmorphic CSS**
