const { ipcRenderer, clipboard } = require('electron');

// ────────────────────────────────────────────────────────
//  DOM REFERENCES
// ────────────────────────────────────────────────────────
const fetchBtn     = document.getElementById("fetchBtn");
const autoReadBtn  = document.getElementById("scanScreenBtn"); // Keep the same ID for now since index.html uses it
const questionBox  = document.getElementById("questionBox");
const explainBtn   = document.getElementById("explainBtn");
const hintBtn      = document.getElementById("hintBtn");
const similarBtn   = document.getElementById("similarBtn");
const answerBtn    = document.getElementById("answerBtn");
const saveBtn      = document.getElementById("saveBtn");
const responseArea = document.getElementById("responseArea");

const manualSavedList = document.getElementById("manualSavedList");
const clearManualBtn  = document.getElementById("clearManualBtn");
const exportManualBtn = document.getElementById("exportManualBtn");
const manualBadge     = document.getElementById("manualBadge");

const autoSavedList = document.getElementById("autoSavedList");
const clearAutoBtn  = document.getElementById("clearAutoBtn");
const exportAutoBtn = document.getElementById("exportAutoBtn");
const autoBadge     = document.getElementById("autoBadge");

const toast          = document.getElementById("toast");
const confirmOverlay = document.getElementById("confirmOverlay");
const confirmCancel  = document.getElementById("confirmCancel");
const confirmDelete  = document.getElementById("confirmDelete");

const tabBtns   = document.querySelectorAll(".tab-btn");
const tabPanels = document.querySelectorAll(".tab-panel");

const apiKeyInput = document.getElementById("groqApiKey");
const saveApiKeyBtn = document.getElementById("saveApiKey");
const apiKeyStatus = document.getElementById("apiKeyStatus");

// STORAGE KEYS
const MANUAL_KEY = "savedQuestions";
const AUTO_KEY   = "autoSavedQuestions";
const GROQ_KEY_STORAGE = "groqApiKey";

// LOCAL STORAGE WRAPPER
function storageGet(key, defaultVal) {
  const val = localStorage.getItem(key);
  return val ? JSON.parse(val) : defaultVal;
}
function storageSet(key, val) {
  localStorage.setItem(key, JSON.stringify(val));
}

// ────────────────────────────────────────────────────────
//  TAB NAVIGATION
// ────────────────────────────────────────────────────────
tabBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = btn.dataset.tab;
    tabBtns.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    tabPanels.forEach((p) => p.classList.remove("active"));
    document.getElementById(`tab-${target}`).classList.add("active");

    if (target === "manual-saved") renderManualSaved();
    if (target === "auto-saved") renderAutoSaved();
  });
});

// ────────────────────────────────────────────────────────
//  COMPACT MODE
// ────────────────────────────────────────────────────────
const toggleCompactBtn = document.getElementById('toggleCompactBtn');
let isCompact = false;
toggleCompactBtn.addEventListener('click', () => {
  isCompact = !isCompact;
  if (isCompact) {
    document.body.classList.add('compact-mode');
    toggleCompactBtn.innerText = 'Expand';
    ipcRenderer.send('resize-window', { width: 280, height: 160 });
  } else {
    document.body.classList.remove('compact-mode');
    toggleCompactBtn.innerText = 'Compact';
    ipcRenderer.send('resize-window', { width: 420, height: 650 });
  }
});

function showToast(message, type = "info") {
  toast.textContent = message;
  toast.className = `toast ${type} show`;
  setTimeout(() => toast.classList.remove("show"), 2500);
}

function updateBadges() {
  const manualCount = storageGet(MANUAL_KEY, []).length;
  const autoCount   = storageGet(AUTO_KEY, []).length;

  manualBadge.textContent = manualCount;
  manualBadge.className = `tab-badge ${manualCount === 0 ? "empty" : ""}`;

  autoBadge.textContent = autoCount;
  autoBadge.className = `tab-badge ${autoCount === 0 ? "empty" : ""}`;
}

updateBadges();

const savedKey = storageGet(GROQ_KEY_STORAGE, "");
if (savedKey) {
  apiKeyInput.value = savedKey;
  apiKeyStatus.textContent = " API key loaded";
  apiKeyStatus.style.color = "var(--success)";
}

saveApiKeyBtn.addEventListener("click", () => {
  const key = apiKeyInput.value.trim();
  if (key) {
    storageSet(GROQ_KEY_STORAGE, key);
    apiKeyStatus.textContent = " API key saved!";
    apiKeyStatus.style.color = "var(--success)";
    showToast("Groq API key saved!", "success");
  } else {
    showToast("Please enter an API key", "error");
  }
});


// ────────────────────────────────────────────────────────
//  FETCH FROM CLIPBOARD
// ────────────────────────────────────────────────────────
fetchBtn.addEventListener("click", async () => {
  try {
    const text = clipboard.readText();
    if (text) {
      questionBox.value = text;
      showToast("Question loaded from clipboard!", "success");
    } else {
      showToast("Clipboard is empty.", "error");
    }
  } catch (err) {
    showToast("Failed to read clipboard.", "error");
  }
});

let pendingAction = "answer"; // Keep track of what to do after reading browser text

// ────────────────────────────────────────────────────────
//  AUTO-READ DIRECTLY FROM BROWSER (VIA EXTENSION)
// ────────────────────────────────────────────────────────
autoReadBtn.addEventListener("click", () => {
  pendingAction = "answer"; // Default action if clicked manually
  triggerBrowserRead();
});

function triggerBrowserRead() {
  autoReadBtn.disabled = true;
  autoReadBtn.innerHTML = `<span class="spinner"></span> Reading Browser...`;
  
  // Ask the main process to ask the Chrome Extension via WebSocket
  ipcRenderer.send('request-auto-read');

  // Set a timeout in case the extension isn't installed or connected
  setTimeout(() => {
    if (autoReadBtn.disabled) {
      autoReadBtn.disabled = false;
      autoReadBtn.innerHTML = `Read Browser Text`;
      showToast("Could not read tab. Is the Chrome Extension open?", "error");
    }
  }, 2000);
}

ipcRenderer.on('auto-read-result', async (event, text) => {
  if (autoReadBtn.disabled) {
    autoReadBtn.disabled = false;
    autoReadBtn.innerHTML = `Read Browser Text`;

    if (text && text.trim().length > 0 && text !== "null") {
      questionBox.value = text;
      showToast("Extracted directly from browser!", "success");
      await askAI(pendingAction);
    } else {
      showToast("No question found on the page.", "error");
    }
  }
});

// Shortcut triggered from Main
ipcRenderer.on('shortcut-triggered', async (event, { action }) => {
  if (action === 'browser-answer') {
    pendingAction = 'answer';
    triggerBrowserRead();
  } 
  else if (action === 'browser-explain') {
    pendingAction = 'explain';
    triggerBrowserRead();
  }
  else if (action === 'clipboard-answer') {
    const text = clipboard.readText();
    if (text) {
      questionBox.value = text;
      showToast("Loaded from clipboard!", "success");
      await askAI('answer');
    } else {
      showToast("Clipboard is empty.", "error");
    }
  }
});

// ────────────────────────────────────────────────────────
//  AI-POWERED STUDY TOOLS
// ────────────────────────────────────────────────────────
function buildPrompt(question, action) {
  const prompts = {
    explain: `You are a helpful tutor. Explain the concept behind this question clearly. Break it down step by step.\n\nQuestion:\n${question}`,
    hint: `You are a study mentor. Give a helpful hint for solving this WITHOUT giving the full answer.\n\nQuestion:\n${question}`,
    similar: `Generate a similar practice question based on the same concept. Include 4 multiple-choice options (A–D). At the end state: "Correct Answer: [letter]"\n\nOriginal Question:\n${question}`,
    answer: `For this question, think step-by-step. At the VERY END of your response, respond with ONLY the correct option letter and text on a new line. Format: "Correct Answer: [letter] - [option text]".\n\nQuestion:\n${question}`,
  };
  return prompts[action] || prompts.explain;
}

async function askAI(action) {
  const question = questionBox.value.trim();
  if (!question) {
    showToast("Please enter or paste a question first.", "error");
    return;
  }

  responseArea.classList.add("visible");
  responseArea.innerHTML = `<span class="spinner"></span> Loading from Groq (fast mode)…`;

  const prompt = buildPrompt(question, action);
  const apiKey = storageGet(GROQ_KEY_STORAGE, "");

  if (!apiKey) {
    responseArea.textContent = "️ No Groq API key set.\nPlease enter your Groq API key in the Settings tab.";
    showToast("Please add your Groq API key", "error");
    return;
  }

  const startTime = Date.now();
  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [
          { role: "system", content: "You are a helpful study tutor." },
          { role: "user", content: prompt }
        ],
        model: "llama-3.3-70b-versatile",
        temperature: 0.2,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) throw new Error("API Error");

    const data = await response.json();
    const elapsed = Date.now() - startTime;
    let text = data.choices?.[0]?.message?.content;

    if (action === 'answer' && text) {
      const answerLineMatch = text.match(/(Correct Answer:.*)/i);
      if (answerLineMatch) text = answerLineMatch[1];
    }

    if (text) {
      responseArea.textContent = text;
      responseArea.scrollTop = 0;
      showToast(`Response ready! (${elapsed}ms)`, "success");
      
      // Auto-save logic
      const autoList = storageGet(AUTO_KEY, []);
      autoList.push({ text: question, url: "Desktop Capture", savedAt: new Date().toISOString(), source: "auto" });
      storageSet(AUTO_KEY, autoList);
      updateBadges();

    } else {
      responseArea.textContent = "No response received.";
    }
  } catch (err) {
    responseArea.textContent = "Error connecting to AI.";
    showToast("API error.", "error");
  }
}

explainBtn.addEventListener("click", () => askAI("explain"));
hintBtn.addEventListener("click",    () => askAI("hint"));
similarBtn.addEventListener("click", () => askAI("similar"));
answerBtn.addEventListener("click",  () => askAI("answer"));

// ────────────────────────────────────────────────────────
//  MANUAL SAVE
// ────────────────────────────────────────────────────────
saveBtn.addEventListener("click", () => {
  const question = questionBox.value.trim();
  if (!question) {
    showToast("Nothing to save.", "error");
    return;
  }

  const list = storageGet(MANUAL_KEY, []);
  if (list.some(item => (item.text || item) === question)) {
    showToast("Already saved.", "info");
    return;
  }

  list.push({ text: question, url: "Desktop app", savedAt: new Date().toISOString(), source: "manual" });
  storageSet(MANUAL_KEY, list);
  showToast("Question saved!", "success");
  updateBadges();
});

// RENDER HELPERS
function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString() + " " + d.toLocaleTimeString();
}

function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, tag => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[tag]));
}

function buildItemHTML(item, index, listType) {
  const text = item.text || item;
  const source = item.source || "manual";
  const date = item.savedAt ? `<span class="meta-tag date">${formatDate(item.savedAt)}</span>` : "";
  return `
    <div class="saved-item" data-index="${index}" data-list="${listType}">
      <div class="question-text">${escapeHTML(text)}</div>
      <div class="meta"><span class="meta-tag ${source}">${source}</span>${date}</div>
      <div class="item-actions">
        <button class="load-btn" data-index="${index}" data-list="${listType}">Load</button>
        <button class="ask-btn" data-index="${index}" data-list="${listType}">Ask AI</button>
      </div>
      <button class="delete-btn" data-index="${index}" data-list="${listType}"></button>
    </div>`;
}

function renderManualSaved() {
  const list = storageGet(MANUAL_KEY, []);
  manualSavedList.innerHTML = list.length 
    ? list.map((item, i) => buildItemHTML(item, i, "manual")).reverse().join("")
    : `<div class="empty-state">No saved questions</div>`;
}

function renderAutoSaved() {
  const list = storageGet(AUTO_KEY, []);
  autoSavedList.innerHTML = list.length 
    ? list.map((item, i) => buildItemHTML(item, i, "auto")).reverse().join("")
    : `<div class="empty-state">No auto-saved questions</div>`;
}

function setupListeners(container) {
  container.addEventListener("click", (e) => {
    const target = e.target;
    const index = parseInt(target.dataset.index, 10);
    const type = target.dataset.list;
    if (isNaN(index)) return;

    const key = type === "auto" ? AUTO_KEY : MANUAL_KEY;
    const list = storageGet(key, []);

    if (target.classList.contains("delete-btn")) {
      list.splice(index, 1);
      storageSet(key, list);
      type === "auto" ? renderAutoSaved() : renderManualSaved();
      updateBadges();
    } else if (target.classList.contains("load-btn") || target.classList.contains("ask-btn")) {
      const item = list[index];
      questionBox.value = item.text || item;
      tabBtns[0].click();
      if (target.classList.contains("ask-btn")) askAI("explain");
    }
  });
}

setupListeners(manualSavedList);
setupListeners(autoSavedList);

let pendingClearKey = null;
clearManualBtn.addEventListener("click", () => { pendingClearKey = MANUAL_KEY; confirmOverlay.classList.add("visible"); });
clearAutoBtn.addEventListener("click", () => { pendingClearKey = AUTO_KEY; confirmOverlay.classList.add("visible"); });

confirmCancel.addEventListener("click", () => { confirmOverlay.classList.remove("visible"); });
confirmDelete.addEventListener("click", () => {
  if (pendingClearKey) storageSet(pendingClearKey, []);
  confirmOverlay.classList.remove("visible");
  updateBadges();
  pendingClearKey === AUTO_KEY ? renderAutoSaved() : renderManualSaved();
});

exportManualBtn.addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(storageGet(MANUAL_KEY, []), null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "manual-saved.json";
  a.click();
});
exportAutoBtn.addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(storageGet(AUTO_KEY, []), null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "auto-saved.json";
  a.click();
});
