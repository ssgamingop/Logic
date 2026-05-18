/**
 * =========================================================
 *  popup.js — ITM Crackit Study Helper v1.1 (Popup Logic)
 * =========================================================
 *
 *  This file handles:
 *    1. Tab navigation (Study Tools / Manual Saved / Auto-Saved)
 *    2. Fetching selected text from the Crackit website.
 *    3. Sending the question to a free AI API for
 *       explanations, hints, similar questions, and answers.
 *    4. Saving / loading / deleting questions.
 *    5. Displaying auto-saved questions with metadata.
 *    6. Clear all & Export as JSON functionality.
 *
 *  IMPORTANT: This tool is for learning & revision only.
 *  It does NOT auto-answer live tests.
 * =========================================================
 */

// ────────────────────────────────────────────────────────
//  DOM REFERENCES
// ────────────────────────────────────────────────────────

// Study Tools tab
const fetchBtn     = document.getElementById("fetchBtn");
const autoReadBtn  = document.getElementById("autoReadBtn");
const questionBox  = document.getElementById("questionBox");
const explainBtn   = document.getElementById("explainBtn");
const hintBtn      = document.getElementById("hintBtn");
const similarBtn   = document.getElementById("similarBtn");
const answerBtn    = document.getElementById("answerBtn");
const saveBtn      = document.getElementById("saveBtn");
const responseArea = document.getElementById("responseArea");

// Manual Saved tab
const manualSavedList = document.getElementById("manualSavedList");
const clearManualBtn  = document.getElementById("clearManualBtn");
const exportManualBtn = document.getElementById("exportManualBtn");
const manualBadge     = document.getElementById("manualBadge");

// Auto-Saved tab
const autoSavedList = document.getElementById("autoSavedList");
const clearAutoBtn  = document.getElementById("clearAutoBtn");
const exportAutoBtn = document.getElementById("exportAutoBtn");
const autoBadge     = document.getElementById("autoBadge");

// Shared
const toast          = document.getElementById("toast");
const confirmOverlay = document.getElementById("confirmOverlay");
const confirmCancel  = document.getElementById("confirmCancel");
const confirmDelete  = document.getElementById("confirmDelete");

// Tab navigation elements
const tabBtns   = document.querySelectorAll(".tab-btn");
const tabPanels = document.querySelectorAll(".tab-panel");

// ────────────────────────────────────────────────────────
//  STORAGE KEYS (constants for clarity)
// ────────────────────────────────────────────────────────
const MANUAL_KEY = "savedQuestions";      // Array of objects
const AUTO_KEY   = "autoSavedQuestions";  // Array of objects

// ────────────────────────────────────────────────────────
//  TAB NAVIGATION
// ────────────────────────────────────────────────────────
tabBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = btn.dataset.tab;

    // Toggle active state on buttons
    tabBtns.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    // Toggle active state on panels
    tabPanels.forEach((p) => p.classList.remove("active"));
    document.getElementById(`tab-${target}`).classList.add("active");

    // Refresh the list when switching to saved tabs
    if (target === "manual-saved") renderManualSaved();
    if (target === "auto-saved") renderAutoSaved();
  });
});

// ────────────────────────────────────────────────────────
//  TOAST NOTIFICATION HELPER
// ────────────────────────────────────────────────────────

/**
 * Show a brief toast message at the bottom of the popup.
 * @param {string} message  — text to display
 * @param {"success"|"error"|"info"} type — colour variant
 */
function showToast(message, type = "info") {
  toast.textContent = message;
  toast.className = `toast ${type} show`;

  // Auto-hide after 2.5 seconds
  setTimeout(() => {
    toast.classList.remove("show");
  }, 2500);
}

// ────────────────────────────────────────────────────────
//  BADGE COUNTERS
// ────────────────────────────────────────────────────────

/**
 * Update the badge counters on both tabs.
 * Called on popup open and after any save/delete.
 */
function updateBadges() {
  chrome.storage.local.get({ [MANUAL_KEY]: [], [AUTO_KEY]: [] }, (data) => {
    const manualCount = data[MANUAL_KEY].length;
    const autoCount   = data[AUTO_KEY].length;

    manualBadge.textContent = manualCount;
    manualBadge.className = `tab-badge ${manualCount === 0 ? "empty" : ""}`;

    autoBadge.textContent = autoCount;
    autoBadge.className = `tab-badge ${autoCount === 0 ? "empty" : ""}`;
  });
}

// Update badges on popup open
updateBadges();

// ────────────────────────────────────────────────────────
//  1.  FETCH SELECTED TEXT FROM THE ACTIVE TAB
// ────────────────────────────────────────────────────────
fetchBtn.addEventListener("click", async () => {
  try {
    // Get the currently active tab
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab) {
      showToast("No active tab found.", "error");
      return;
    }

    // Execute a tiny script in the page to grab selected text
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.getSelection().toString().trim(),
    });

    const selectedText = results?.[0]?.result;

    if (selectedText) {
      questionBox.value = selectedText;
      showToast("Question captured!", "success");
    } else {
      showToast("No text selected on the page.", "error");
    }
  } catch (err) {
    console.error("Fetch error:", err);
    showToast("Could not access the page — make sure you're on Crackit.", "error");
  }
});

// ────────────────────────────────────────────────────────
//  1b.  AUTO-READ & ANSWER (NEW in v2.0)
// ────────────────────────────────────────────────────────

/**
 * Auto-Read & Answer: sends a message to the content script
 * asking for the current page question (no text selection needed),
 * populates the question box, then immediately gets the AI answer.
 *
 * Works even on apps that disable text selection / copy-paste.
 */
autoReadBtn.addEventListener("click", async () => {
  // Disable the button to prevent double-click
  autoReadBtn.disabled = true;
  autoReadBtn.innerHTML = `<span class="spinner"></span> Reading page…`;

  try {
    // Get the currently active tab
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab) {
      showToast("No active tab found.", "error");
      return;
    }

    // ── Check if content script is running on this tab ──
    // We ping the content script first to see if it's loaded
    let response;
    try {
      response = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("timeout")), 3000);
        chrome.tabs.sendMessage(
          tab.id,
          { action: "GET_CURRENT_QUESTION" },
          (res) => {
            clearTimeout(timeout);
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve(res);
            }
          }
        );
      });
    } catch (msgErr) {
      // Content script not running — inject it on the fly
      console.warn("Content script not found, injecting…", msgErr);
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"],
      });
      // Wait a moment for it to initialize, then retry
      await new Promise((r) => setTimeout(r, 800));
      response = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("timeout")), 3000);
        chrome.tabs.sendMessage(
          tab.id,
          { action: "GET_CURRENT_QUESTION" },
          (res) => {
            clearTimeout(timeout);
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve(res);
            }
          }
        );
      });
    }

    const question = response?.question;

    if (question && question.length > 0) {
      questionBox.value = question;
      showToast("Question read from page! Getting answer…", "success");

      // Immediately ask AI for the answer
      await askAI("answer");
    } else {
      showToast("Could not find a question on this page.", "error");
      responseArea.classList.add("visible");
      responseArea.innerHTML =
        `⚠️ No question detected on this page.\n\n` +
        `Try:\n` +
        `• Navigating to a question page first\n` +
        `• Using "Get Selected Question" (select text manually)\n` +
        `• Typing the question in the box below`;
    }
  } catch (err) {
    console.error("Auto-read error:", err);
    showToast("Could not read the page. Are you on Crackit?", "error");
  } finally {
    // Re-enable button
    autoReadBtn.disabled = false;
    autoReadBtn.innerHTML = `🚀 Auto-Read &amp; Answer`;
  }
});

// ────────────────────────────────────────────────────────
//  2.  AI-POWERED STUDY TOOLS
// ────────────────────────────────────────────────────────

/**
 * Build the system prompt for a given action type.
 * Each type focuses on learning, not cheating.
 */
function buildPrompt(question, action) {
  const prompts = {
    explain:
      `You are a helpful tutor. A student is studying for exams and needs a clear, ` +
      `detailed explanation of the concept behind this question. Break it down step ` +
      `by step so they truly understand. Use examples where helpful.\n\nQuestion:\n${question}`,

    hint:
      `You are a study mentor. Give the student a helpful hint for solving this ` +
      `question WITHOUT giving the full answer. Guide their thinking.\n\nQuestion:\n${question}`,

    similar:
      `Generate a similar practice question based on the same concept as the one ` +
      `below. Include 4 multiple-choice options (A–D) and mark the correct answer ` +
      `at the end.\n\nOriginal Question:\n${question}`,

    answer:
      `You are a knowledgeable tutor. Provide the correct answer to this question ` +
      `with a brief explanation of WHY it is correct. This is for revision and ` +
      `learning purposes only.\n\nQuestion:\n${question}`,
  };

  return prompts[action] || prompts.explain;
}

/**
 * Send the question to a free AI API and display the response.
 * Uses the Pollinations AI API (free, no API key required).
 * Docs: https://text.pollinations.ai/
 *
 * @param {string} action — one of: explain, hint, similar, answer
 */
async function askAI(action) {
  const question = questionBox.value.trim();

  // Validate
  if (!question) {
    showToast("Please enter or select a question first.", "error");
    return;
  }

  // Show loading state
  responseArea.classList.add("visible");
  responseArea.innerHTML = `<span class="spinner"></span> Thinking…`;

  const prompt = buildPrompt(question, action);

  try {
    // ── Use Pollinations AI (free, no API key needed) ──
    const response = await fetch("https://text.pollinations.ai/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [
          {
            role: "system",
            content: "You are a helpful study tutor. Give clear, accurate, and detailed answers. Format your response nicely with bullet points and numbered lists where appropriate."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        model: "openai",
        seed: Math.floor(Math.random() * 10000),
      }),
    });

    // Pollinations returns plain text directly
    const text = await response.text();

    if (text && text.length > 0) {
      responseArea.textContent = text;
      responseArea.scrollTop = 0;
      showToast("Response ready!", "success");
    } else {
      responseArea.textContent = "No response received. Please try again.";
      showToast("Empty response — try again.", "error");
    }
  } catch (err) {
    console.error("AI error:", err);

    // Fallback: generate a local response
    responseArea.textContent = generateLocalResponse(question, action);
    showToast("Using offline study helper.", "info");
  }
}

/**
 * Fallback local responses when the AI API is unavailable.
 * Provides useful study guidance without an internet connection.
 */
function generateLocalResponse(question, action) {
  const responses = {
    explain:
      `📖 Concept Explanation\n\n` +
      `Question: "${question}"\n\n` +
      `To understand this question, break it down:\n` +
      `1. Identify the key terms and concepts mentioned.\n` +
      `2. Recall the definition of each term from your textbook.\n` +
      `3. Think about how these concepts relate to each other.\n` +
      `4. Consider real-world examples that illustrate the concept.\n\n` +
      `💡 Tip: Try explaining this concept to a friend — if you can teach it simply, you understand it!`,

    hint:
      `🔍 Hint\n\n` +
      `Question: "${question}"\n\n` +
      `Here's how to approach this:\n` +
      `• Read the question carefully — what is it actually asking?\n` +
      `• Underline or highlight the key words.\n` +
      `• Eliminate any obviously wrong options first.\n` +
      `• Think about related concepts from your syllabus.\n` +
      `• If it's a numerical problem, write down the formula first.\n\n` +
      `⚡ You've got this — think step by step!`,

    similar:
      `🔄 Practice Question\n\n` +
      `Based on: "${question}"\n\n` +
      `Try this similar question:\n` +
      `"Explain the concept described above using a different real-world example. ` +
      `How would the outcome change if the key variable were doubled?"\n\n` +
      `🎯 Practice rephrasing questions in your own words — it's a powerful study technique!`,

    answer:
      `✅ Study Answer\n\n` +
      `Question: "${question}"\n\n` +
      `To find the answer:\n` +
      `1. Identify the topic area (refer to your syllabus index).\n` +
      `2. Open the relevant chapter in your textbook.\n` +
      `3. Look for definitions, theorems, or rules that apply.\n` +
      `4. Cross-reference with your class notes.\n\n` +
      `📝 For the best learning, always verify answers from multiple sources.\n\n` +
      `⚠️ AI is currently offline. Connect to the internet for AI-powered answers.`,
  };

  return responses[action] || responses.explain;
}

// ── Wire up action buttons ──
explainBtn.addEventListener("click", () => askAI("explain"));
hintBtn.addEventListener("click",    () => askAI("hint"));
similarBtn.addEventListener("click", () => askAI("similar"));
answerBtn.addEventListener("click",  () => askAI("answer"));

// ────────────────────────────────────────────────────────
//  3.  MANUAL SAVE (Save for Revision button)
// ────────────────────────────────────────────────────────

/**
 * Save the current question to chrome.storage.local
 * as an object with metadata (text, url, savedAt, source).
 */
saveBtn.addEventListener("click", async () => {
  const question = questionBox.value.trim();

  if (!question) {
    showToast("Nothing to save — enter a question first.", "error");
    return;
  }

  // Try to get the current tab URL
  let pageUrl = "N/A";
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.url) pageUrl = tab.url;
  } catch {
    // If we can't get the URL, that's fine
  }

  chrome.storage.local.get({ [MANUAL_KEY]: [] }, (data) => {
    const list = data[MANUAL_KEY];

    // Avoid exact duplicates (compare text only)
    const isDuplicate = list.some((item) => {
      // Support both old format (string) and new format (object)
      const existingText = typeof item === "string" ? item : item.text;
      return existingText === question;
    });

    if (isDuplicate) {
      showToast("This question is already saved.", "info");
      return;
    }

    // Save as object with metadata
    list.push({
      text: question,
      url: pageUrl,
      savedAt: new Date().toISOString(),
      source: "manual",
    });

    chrome.storage.local.set({ [MANUAL_KEY]: list }, () => {
      showToast("Question saved for revision! 🎉", "success");
      updateBadges();
    });
  });
});

// ────────────────────────────────────────────────────────
//  4.  RENDER SAVED QUESTIONS
// ────────────────────────────────────────────────────────

/**
 * Format an ISO date string into a human-friendly format.
 * Example: "18 May 2026, 10:36 PM"
 */
function formatDate(isoString) {
  if (!isoString) return "Unknown date";
  const d = new Date(isoString);
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }) + ", " + d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Shorten a URL for display (removes protocol, keeps domain + path start).
 */
function shortenUrl(url) {
  if (!url || url === "N/A") return "N/A";
  try {
    const u = new URL(url);
    const path = u.pathname.length > 20
      ? u.pathname.substring(0, 20) + "…"
      : u.pathname;
    return u.hostname + path;
  } catch {
    return url.substring(0, 30) + "…";
  }
}

/**
 * Build the HTML for a single saved-question card.
 * Works for both manual and auto-saved questions.
 *
 * @param {object|string} item  — question object or legacy string
 * @param {number}        index — position in the array
 * @param {string}        listType — "manual" or "auto"
 */
function buildSavedItemHTML(item, index, listType) {
  // Support legacy format (plain string) from v1.0
  const text    = typeof item === "string" ? item : item.text;
  const url     = typeof item === "string" ? "N/A" : (item.url || "N/A");
  const savedAt = typeof item === "string" ? null : item.savedAt;
  const source  = typeof item === "string" ? "manual" : (item.source || "manual");

  return `
    <div class="saved-item" data-index="${index}" data-list="${listType}">
      <div class="question-text">${escapeHTML(text)}</div>
      <div class="meta">
        <span class="meta-tag ${source}">${source === "auto" ? "🤖 Auto" : "✏️ Manual"}</span>
        ${savedAt ? `<span class="meta-tag date">📅 ${formatDate(savedAt)}</span>` : ""}
        ${url !== "N/A" ? `<span class="meta-tag url-tag" title="${escapeHTML(url)}">🔗 ${escapeHTML(shortenUrl(url))}</span>` : ""}
      </div>
      <div class="item-actions">
        <button class="load-btn" data-index="${index}" data-list="${listType}">📝 Load</button>
        <button class="ask-btn" data-index="${index}" data-list="${listType}">💡 Ask AI</button>
      </div>
      <button class="delete-btn" data-index="${index}" data-list="${listType}" title="Delete">✕</button>
    </div>`;
}

/**
 * Render the manual-saved questions list.
 */
function renderManualSaved() {
  chrome.storage.local.get({ [MANUAL_KEY]: [] }, (data) => {
    const list = data[MANUAL_KEY];

    if (list.length === 0) {
      manualSavedList.innerHTML = `
        <div class="empty-state">
          <div class="icon">📭</div>
          <p>No manually saved questions yet.<br/>Use the "Save for Revision" button.</p>
        </div>`;
    } else {
      // Show newest first
      manualSavedList.innerHTML = list
        .map((item, i) => buildSavedItemHTML(item, i, "manual"))
        .reverse()
        .join("");
    }

    updateBadges();
  });
}

/**
 * Render the auto-saved questions list.
 */
function renderAutoSaved() {
  chrome.storage.local.get({ [AUTO_KEY]: [] }, (data) => {
    const list = data[AUTO_KEY];

    if (list.length === 0) {
      autoSavedList.innerHTML = `
        <div class="empty-state">
          <div class="icon">🤖</div>
          <p>No auto-saved questions yet.<br/>Browse Crackit and questions will appear here automatically.</p>
        </div>`;
    } else {
      // Show newest first
      autoSavedList.innerHTML = list
        .map((item, i) => buildSavedItemHTML(item, i, "auto"))
        .reverse()
        .join("");
    }

    updateBadges();
  });
}

// ────────────────────────────────────────────────────────
//  5.  EVENT DELEGATION FOR SAVED LISTS
// ────────────────────────────────────────────────────────

/**
 * Handle clicks inside saved lists (delete, load, ask AI).
 * Uses event delegation — one listener per container.
 */
function setupListListeners(container) {
  container.addEventListener("click", (e) => {
    const target   = e.target;
    const index    = parseInt(target.dataset.index, 10);
    const listType = target.dataset.list;

    if (isNaN(index) || !listType) return;

    const storageKey = listType === "auto" ? AUTO_KEY : MANUAL_KEY;

    // ── Delete a saved question ──
    if (target.classList.contains("delete-btn")) {
      chrome.storage.local.get({ [storageKey]: [] }, (data) => {
        const list = data[storageKey];
        list.splice(index, 1);

        chrome.storage.local.set({ [storageKey]: list }, () => {
          showToast("Question removed.", "info");
          // Re-render the correct list
          if (listType === "auto") renderAutoSaved();
          else renderManualSaved();
        });
      });
    }

    // ── Load a saved question into the textarea ──
    if (target.classList.contains("load-btn")) {
      chrome.storage.local.get({ [storageKey]: [] }, (data) => {
        const item = data[storageKey][index];
        if (item) {
          const text = typeof item === "string" ? item : item.text;
          questionBox.value = text;

          // Switch to the Study Tools tab
          tabBtns[0].click();
          showToast("Question loaded!", "success");
        }
      });
    }

    // ── Ask AI about a saved question ──
    if (target.classList.contains("ask-btn")) {
      chrome.storage.local.get({ [storageKey]: [] }, (data) => {
        const item = data[storageKey][index];
        if (item) {
          const text = typeof item === "string" ? item : item.text;
          questionBox.value = text;

          // Switch to Study Tools tab and trigger explain
          tabBtns[0].click();
          setTimeout(() => askAI("explain"), 300);
        }
      });
    }
  });
}

// Attach listeners to both list containers
setupListListeners(manualSavedList);
setupListListeners(autoSavedList);

// ────────────────────────────────────────────────────────
//  6.  CLEAR ALL QUESTIONS (with confirmation)
// ────────────────────────────────────────────────────────

/**
 * Which storage key should the confirm dialog clear?
 * Set before showing the dialog so the confirm button
 * knows what to delete.
 */
let pendingClearKey = null;

/**
 * Show the confirm dialog and set the pending clear key.
 */
function showConfirmClear(storageKey) {
  pendingClearKey = storageKey;
  confirmOverlay.classList.add("visible");
}

// Cancel button
confirmCancel.addEventListener("click", () => {
  confirmOverlay.classList.remove("visible");
  pendingClearKey = null;
});

// Confirm delete button
confirmDelete.addEventListener("click", () => {
  if (!pendingClearKey) return;

  chrome.storage.local.set({ [pendingClearKey]: [] }, () => {
    confirmOverlay.classList.remove("visible");
    showToast("All questions cleared.", "success");

    // Re-render the correct list
    if (pendingClearKey === AUTO_KEY) renderAutoSaved();
    else renderManualSaved();

    pendingClearKey = null;
  });
});

// Wire up clear buttons
clearManualBtn.addEventListener("click", () => showConfirmClear(MANUAL_KEY));
clearAutoBtn.addEventListener("click",   () => showConfirmClear(AUTO_KEY));

// ────────────────────────────────────────────────────────
//  7.  EXPORT AS JSON
// ────────────────────────────────────────────────────────

/**
 * Export saved questions as a downloadable JSON file.
 * Uses a Blob + invisible <a> tag to trigger download.
 *
 * @param {string} storageKey — which list to export
 * @param {string} filename   — name of the downloaded file
 */
function exportAsJSON(storageKey, filename) {
  chrome.storage.local.get({ [storageKey]: [] }, (data) => {
    const list = data[storageKey];

    if (list.length === 0) {
      showToast("Nothing to export — the list is empty.", "error");
      return;
    }

    // Build the JSON content
    const exportData = {
      exportedAt: new Date().toISOString(),
      source: "ITM Crackit Study Helper v1.1",
      totalQuestions: list.length,
      questions: list,
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url  = URL.createObjectURL(blob);

    // Create a temporary link and click it to trigger download
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();

    // Clean up
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast(`Exported ${list.length} question(s)! 📥`, "success");
  });
}

// Wire up export buttons
exportManualBtn.addEventListener("click", () => {
  exportAsJSON(MANUAL_KEY, "crackit-manual-questions.json");
});
exportAutoBtn.addEventListener("click", () => {
  exportAsJSON(AUTO_KEY, "crackit-auto-saved-questions.json");
});

// ────────────────────────────────────────────────────────
//  UTILITY HELPERS
// ────────────────────────────────────────────────────────

/**
 * Basic HTML escaping to prevent XSS when rendering saved questions.
 */
function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
