/**
 * =========================================================
 *  ITM Crackit Study Helper - Console Version
 * =========================================================
 * 
 *  Usage: 
 *  Paste this entire script into your browser's Developer Tools 
 *  Console on the Crackit website and press Enter.
 *  A floating widget will appear on the right side of the screen.
 * =========================================================
 */
(function() {
  // Prevent multiple injections
  if (document.getElementById('crackit-helper-widget')) {
    console.log('Crackit Helper is already running.');
    return;
  }

  // ────────────────────────────────────────────────────────
  //  1. INJECT STYLES & UI
  // ────────────────────────────────────────────────────────
  const widgetContainer = document.createElement('div');
  widgetContainer.id = 'crackit-helper-widget';
  
  // Create shadow DOM to prevent styling conflicts with the main page
  const shadow = widgetContainer.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = `
    :host {
      position: fixed;
      top: 20px;
      right: 20px;
      width: 380px;
      z-index: 2147483647;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
      border-radius: 12px;
      overflow: hidden;
      background: #0f1117;
      color: #e8eaed;
      display: flex;
      flex-direction: column;
      max-height: calc(100vh - 40px);
    }
    
    * { box-sizing: border-box; margin: 0; padding: 0; }
    
    /* Scrollbar */
    ::-webkit-scrollbar { width: 5px; }
    ::-webkit-scrollbar-track { background: #0f1117; }
    ::-webkit-scrollbar-thumb { background: #2e3240; border-radius: 10px; }

    .header {
      background: linear-gradient(135deg, #7c5cfc 0%, #6344e0 100%);
      padding: 16px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: move; /* Indicate draggable */
    }
    .header h1 { font-size: 16px; font-weight: 700; color: #fff; margin: 0; }
    .header p { font-size: 11px; color: rgba(255,255,255,0.8); margin: 2px 0 0; }
    .close-btn {
      background: rgba(0,0,0,0.2); border: none; color: white;
      border-radius: 50%; width: 24px; height: 24px;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
    }
    .close-btn:hover { background: rgba(0,0,0,0.4); }

    .content { padding: 16px; overflow-y: auto; flex: 1; }

    /* Settings */
    details {
      background: #1a1d27; border: 1px solid #2e3240;
      border-radius: 8px; padding: 10px; margin-bottom: 16px;
      font-size: 11px;
    }
    summary { cursor: pointer; color: #9ca3af; font-weight: 500; outline: none; }
    .api-row { display: flex; gap: 8px; margin-top: 10px; align-items: center; }
    input[type="password"] {
      flex: 1; padding: 8px; border: 1px solid #2e3240; border-radius: 6px;
      background: #22252f; color: #e8eaed; font-size: 11px;
    }
    button.save-btn {
      padding: 8px 12px; background: #7c5cfc; color: #fff; border: none;
      border-radius: 6px; font-weight: 600; cursor: pointer;
    }
    
    /* Study Tools */
    .row { display: flex; gap: 8px; margin-bottom: 12px; }
    .btn-auto-read {
      flex: 2; padding: 12px; border: none; border-radius: 8px;
      background: linear-gradient(135deg, #f97316 0%, #ef4444 50%, #ec4899 100%);
      color: #fff; font-weight: 700; cursor: pointer; font-size: 13px;
    }
    .btn-auto-read:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(249, 115, 22, 0.3); }
    .btn-fetch {
      flex: 1; padding: 12px; border: 2px dashed #2e3240; border-radius: 8px;
      background: #1a1d27; color: #9ca3af; font-weight: 500; cursor: pointer; font-size: 11px;
    }
    .btn-fetch:hover { border-color: #7c5cfc; color: #9b82fc; }

    textarea {
      width: 100%; min-height: 80px; padding: 12px; background: #1a1d27;
      border: 1px solid #2e3240; border-radius: 8px; color: #e8eaed;
      font-family: inherit; font-size: 12px; line-height: 1.5;
      resize: vertical; margin-bottom: 12px;
    }
    textarea:focus { outline: none; border-color: #7c5cfc; }

    .actions { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px; }
    .btn-action {
      padding: 10px; border: none; border-radius: 6px; font-weight: 600;
      cursor: pointer; font-size: 12px; color: #fff;
    }
    .btn-explain { background: linear-gradient(135deg, #7c5cfc, #6344e0); }
    .btn-hint { background: linear-gradient(135deg, #f59e0b, #d97706); }
    .btn-similar { background: linear-gradient(135deg, #10b981, #059669); }
    .btn-answer { background: linear-gradient(135deg, #3b82f6, #2563eb); }
    
    .response-area {
      background: #1a1d27; border: 1px solid #2e3240; border-radius: 8px;
      padding: 14px; min-height: 80px; font-size: 13px; line-height: 1.6;
      color: #9ca3af; white-space: pre-wrap; word-wrap: break-word;
      display: none;
    }
    .response-area.visible { display: block; }
    
    /* Toast */
    .toast {
      position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%) translateY(40px);
      padding: 8px 16px; border-radius: 6px; font-size: 12px; font-weight: 500;
      color: #fff; opacity: 0; transition: 0.3s; pointer-events: none;
    }
    .toast.show { transform: translateX(-50%) translateY(0); opacity: 1; }
    .toast.success { background: #34d399; }
    .toast.error { background: #f87171; }
    .toast.info { background: #7c5cfc; }
  `;

  const html = `
    <div class="header" id="dragHeader">
      <div>
        <h1>📚 Crackit Console Helper</h1>
        <p>In-page standalone version</p>
      </div>
      <button class="close-btn" id="closeBtn">✕</button>
    </div>
    
    <div class="content">
      <details>
        <summary>⚙️ API Settings</summary>
        <div class="api-row">
          <input type="password" id="groqApiKey" placeholder="Enter Groq API Key">
          <button id="saveApiKey" class="save-btn">Save</button>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 6px;">
          <div id="apiKeyStatus" style="font-size: 10px; color: #9ca3af;"></div>
          <div style="font-size: 10px; color: #9ca3af;">Get free key at <a href="https://console.groq.com/keys" target="_blank" style="color: #9b82fc;">console.groq.com</a></div>
        </div>
      </details>

      <div class="row">
        <button id="autoReadBtn" class="btn-auto-read">🚀 Auto-Read</button>
        <button id="fetchBtn" class="btn-fetch">📋 Selected Text</button>
      </div>

      <textarea id="questionBox" placeholder="Type a question here or grab it from the page..."></textarea>

      <div class="actions">
        <button id="explainBtn" class="btn-action btn-explain">💡 Explain</button>
        <button id="hintBtn" class="btn-action btn-hint">🔍 Hint</button>
        <button id="similarBtn" class="btn-action btn-similar">🔄 Similar</button>
        <button id="answerBtn" class="btn-action btn-answer">✅ Answer</button>
      </div>

      <div id="responseArea" class="response-area"></div>
    </div>
    <div id="toast" class="toast"></div>
  `;

  shadow.appendChild(style);
  
  const wrapper = document.createElement('div');
  wrapper.innerHTML = html;
  while (wrapper.firstChild) {
    shadow.appendChild(wrapper.firstChild);
  }
  
  document.body.appendChild(widgetContainer);

  // ────────────────────────────────────────────────────────
  //  2. DRAGGABLE LOGIC
  // ────────────────────────────────────────────────────────
  const dragHeader = shadow.getElementById('dragHeader');
  let isDragging = false;
  let offsetX = 0, offsetY = 0;

  dragHeader.addEventListener('mousedown', (e) => {
    isDragging = true;
    const rect = widgetContainer.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    widgetContainer.style.left = `${e.clientX - offsetX}px`;
    widgetContainer.style.top = `${e.clientY - offsetY}px`;
    widgetContainer.style.right = 'auto'; // Disable right-anchor so left-anchor works
  });

  document.addEventListener('mouseup', () => { isDragging = false; });

  shadow.getElementById('closeBtn').addEventListener('click', () => {
    widgetContainer.remove();
  });

  // ────────────────────────────────────────────────────────
  //  3. LOGIC & API
  // ────────────────────────────────────────────────────────
  const toastEl = shadow.getElementById('toast');
  const questionBox = shadow.getElementById('questionBox');
  const responseArea = shadow.getElementById('responseArea');
  const apiKeyInput = shadow.getElementById('groqApiKey');
  const apiKeyStatus = shadow.getElementById('apiKeyStatus');
  
  function showToast(msg, type = "info") {
    toastEl.textContent = msg;
    toastEl.className = `toast ${type} show`;
    setTimeout(() => toastEl.classList.remove('show'), 2500);
  }

  // API Key Management via localStorage
  const storedKey = localStorage.getItem('groqApiKey');
  if (storedKey) {
    apiKeyInput.value = storedKey;
    apiKeyStatus.textContent = "✓ API key loaded";
    apiKeyStatus.style.color = "#34d399";
  }

  shadow.getElementById('saveApiKey').addEventListener('click', () => {
    const key = apiKeyInput.value.trim();
    if (key) {
      localStorage.setItem('groqApiKey', key);
      apiKeyStatus.textContent = "✓ API key saved!";
      apiKeyStatus.style.color = "#34d399";
      showToast("Key saved locally!", "success");
    } else {
      showToast("Please enter a key", "error");
    }
  });

  // Get Selected Text
  shadow.getElementById('fetchBtn').addEventListener('click', () => {
    const text = window.getSelection().toString().trim();
    if (text) {
      questionBox.value = text;
      showToast("Question captured!", "success");
    } else {
      showToast("No text selected.", "error");
    }
  });

  // Auto Read
  shadow.getElementById('autoReadBtn').addEventListener('click', async () => {
    // Re-use logic from content.js
    const prioritySelectors = [
      "[data-functional-selector='block-title']", "[data-functional-selector='question-title']",
      ".question-text", ".question_text", ".question-content",
      ".question-body", ".qtext", ".que .qtext",
      "[class*='question-text']", "[class*='question_text']",
      ".question p", ".que p", "[class*='question'] p", "h3", "h4", "h2",
    ];

    let bestText = null;
    let bestScore = 0;

    for (const selector of prioritySelectors) {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach((el) => {
          if (el.offsetParent === null) return; 
          const text = el.innerText.trim().replace(/\\s+/g, " ");
          if (text.length >= 20 && text.length > bestScore) {
            bestScore = text.length; bestText = text;
          }
        });
      } catch {}
      if (bestText && bestText.length > 50) break;
    }

    if (bestText) {
      const optionSelectors = [
        "[data-functional-selector='question-choice-text']", "[data-functional-selector='answer-text']",
        ".answer", ".option", ".choice", "[class*='option']", "[class*='answer']", "li",
      ];
      let optionsText = "";
      window.activeOptionsElements = [];
      for (const sel of optionSelectors) {
        try {
          const opts = document.querySelectorAll(sel);
          const optTexts = [];
          const optElements = [];
          opts.forEach((el) => {
            if (el.offsetParent === null) return;
            const t = el.innerText.trim().replace(/\s+/g, " ");
            if (t.length > 3 && t.length < 300) {
              optTexts.push(t);
              optElements.push(el);
            }
          });
          if (optTexts.length >= 2 && optTexts.length <= 8) {
            window.activeOptionsElements = optElements;
            optionsText = "\\n\\nOptions:\\n" + optTexts.map((t, i) => `${String.fromCharCode(65 + i)}. ${t}`).join("\\n");
            break;
          }
        } catch {}
      }
      bestText += optionsText;
    } else {
      // Brute force fallback
      document.querySelectorAll("p, span, div, h1, h2, h3, h4, li").forEach((el) => {
        if (el.offsetParent === null || el.children.length > 5) return;
        const text = el.innerText.trim().replace(/\\s+/g, " ");
        if (text.length > bestScore && text.length < 1000) {
          bestScore = text.length; bestText = text;
        }
      });
    }

    if (bestText) {
      questionBox.value = bestText;
      showToast("Auto-read success! Asking AI...", "success");
      await askAI('answer');
    } else {
      showToast("Could not find a question on page.", "error");
    }
  });

  // AI Prompt Builder
  function buildPrompt(question, action) {
    const prompts = {
      explain: `You are a helpful tutor. Explain the concept behind this question.\\n\\nQuestion:\\n${question}`,
      hint: `Give a helpful hint for solving this question WITHOUT giving the answer.\\n\\nQuestion:\\n${question}`,
      similar: `Generate a similar practice question based on the same concept.\\n\\nOriginal Question:\\n${question}`,
      answer: `For this MCQ, first think step-by-step to calculate or derive the answer. Then, at the VERY END of your response, respond with ONLY the correct option letter and text on a new line. Format: "Correct Answer: [letter] - [option text]".\\n\\nQuestion:\\n${question}`,
    };
    return prompts[action] || prompts.explain;
  }

  async function askAI(action) {
    const question = questionBox.value.trim();
    if (!question) return showToast("Enter a question first.", "error");
    
    const apiKey = localStorage.getItem('groqApiKey');
    if (!apiKey) return showToast("Please save Groq API Key first.", "error");

    responseArea.classList.add("visible");
    responseArea.innerHTML = "Loading from Groq...";

    try {
      const prompt = buildPrompt(question, action);
      const startTime = Date.now();
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "system", content: "You are a helpful study tutor." }, { role: "user", content: prompt }],
          model: "llama-3.3-70b-versatile",
          temperature: 0.2,
          max_tokens: 1024,
        }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      let content = data.choices?.[0]?.message?.content || "No response received.";
      
      let autoSelected = false;
      if (action === 'answer') {
        const match = content.match(/Correct Answer:\s*([A-Z])/i);
        if (match && window.activeOptionsElements?.length > 0) {
           const index = match[1].toUpperCase().charCodeAt(0) - 65;
           if (window.activeOptionsElements[index]) {
               const el = window.activeOptionsElements[index];
               const radio = el.querySelector('input[type="radio"], input[type="checkbox"]');
               if (radio) radio.click();
               else el.click();
               showToast(`Auto-selected Option ${match[1].toUpperCase()}!`, "success");
               autoSelected = true;
           }
        }
        
        // Hide explanation for 'answer' action
        const answerLineMatch = content.match(/(Correct Answer:.*)/i);
        if (answerLineMatch) {
            content = answerLineMatch[1];
        }
      }
      
      responseArea.textContent = content;
      
      if (!autoSelected) {
        showToast(`Done (${Date.now() - startTime}ms)`, "success");
      }
    } catch (err) {
      console.warn("AI error:", err);
      responseArea.textContent = "API error. Check console.";
      showToast("Failed to fetch response.", "error");
    }
  }

  shadow.getElementById('explainBtn').addEventListener('click', () => askAI('explain'));
  shadow.getElementById('hintBtn').addEventListener('click', () => askAI('hint'));
  shadow.getElementById('similarBtn').addEventListener('click', () => askAI('similar'));
  shadow.getElementById('answerBtn').addEventListener('click', () => askAI('answer'));

  console.log("%c📚 ITM Crackit Study Helper is running via Console!", "color: #34d399; font-size: 14px; font-weight: bold;");
})();
