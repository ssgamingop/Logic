/**
 * =========================================================
 *  content.js — ITM Crackit Study Helper (Content Script)
 * =========================================================
 *
 *  This script runs on: https://crackit.itmgroup.online/*
 *
 *  Features:
 *    1. Floating tooltip when user selects text.
 *    2. AUTO-SAVE: Uses MutationObserver to detect visible
 *       question text on the page and save it automatically
 *       to chrome.storage.local for revision.
 *    3. AUTO-READ: Responds to popup messages requesting the
 *       current question from the page DOM directly —
 *       works even when text selection is disabled.
 *
 *  IMPORTANT: This does NOT auto-answer questions or bypass
 *  any website security. It only reads visible text for
 *  learning & revision purposes.
 * =========================================================
 */

(function () {
  "use strict";

  // ────────────────────────────────────────────────────────
  //  1.  FLOATING TOOLTIP (unchanged from v1.0)
  // ────────────────────────────────────────────────────────

  // Create the floating tooltip element
  const tooltip = document.createElement("div");
  tooltip.id = "crackit-helper-tooltip";
  tooltip.innerHTML = `📚 <span>Open Study Helper to grab this question</span>`;
  document.body.appendChild(tooltip);

  // Show tooltip near the cursor when text is selected
  document.addEventListener("mouseup", (e) => {
    setTimeout(() => {
      const selectedText = window.getSelection().toString().trim();

      if (selectedText.length > 10) {
        tooltip.style.top = `${e.pageY - 50}px`;
        tooltip.style.left = `${Math.min(e.pageX, window.innerWidth - 280)}px`;
        tooltip.classList.add("visible");

        // Auto-hide after 3 seconds
        setTimeout(() => {
          tooltip.classList.remove("visible");
        }, 3000);
      } else {
        tooltip.classList.remove("visible");
      }
    }, 100);
  });

  // Hide tooltip when user clicks elsewhere
  document.addEventListener("mousedown", () => {
    tooltip.classList.remove("visible");
  });

  // ────────────────────────────────────────────────────────
  //  2.  AUTO-SAVE QUESTIONS (NEW in v1.1)
  // ────────────────────────────────────────────────────────

  /**
   * Common CSS selectors where question text typically appears
   * on quiz/exam platforms. We try multiple selectors to
   * maximize detection across different page layouts.
   */
  const QUESTION_SELECTORS = [
    // Common quiz platform selectors
    ".question-text",
    ".question_text",
    ".question-content",
    ".question-body",
    ".question-title",
    ".quiz-question",
    ".exam-question",
    ".qtext",
    ".que .qtext",
    // Generic patterns
    "[class*='question']",
    "[class*='Question']",
    "[id*='question']",
    "[id*='Question']",
    // Paragraph inside question containers
    ".question p",
    ".que p",
    // Broader fallbacks (checked last)
    "h3",
    "h4",
  ];

  /**
   * Minimum length for a string to be considered a "question".
   * Filters out buttons, labels, and other short UI text.
   */
  const MIN_QUESTION_LENGTH = 20;

  /**
   * Set of question texts we've already saved during this
   * page session, to avoid spamming chrome.storage with
   * duplicate writes.
   */
  const savedThisSession = new Set();

  /**
   * Extract visible question text from the page.
   * Returns an array of unique question strings found.
   */
  function extractQuestions() {
    const found = new Set();

    for (const selector of QUESTION_SELECTORS) {
      try {
        const elements = document.querySelectorAll(selector);

        elements.forEach((el) => {
          // Only consider visible elements
          if (el.offsetParent === null) return;

          const text = el.innerText.trim();

          // Must be long enough to be a real question
          if (text.length >= MIN_QUESTION_LENGTH) {
            // Normalize whitespace for cleaner storage
            const cleaned = text.replace(/\s+/g, " ");
            found.add(cleaned);
          }
        });
      } catch {
        // Selector might be invalid on some pages — skip silently
      }
    }

    return Array.from(found);
  }

  /**
   * Save detected questions to chrome.storage.local.
   * Each question is stored as an object:
   *   { text, url, savedAt, source }
   *
   * - Avoids duplicates by comparing question text.
   * - `source` distinguishes auto-saved vs manually saved.
   */
  function saveDetectedQuestions(questions) {
    if (questions.length === 0) return;

    // Filter out questions already saved this session
    const newQuestions = questions.filter((q) => !savedThisSession.has(q));
    if (newQuestions.length === 0) return;

    chrome.storage.local.get({ autoSavedQuestions: [] }, (data) => {
      const existing = data.autoSavedQuestions;

      // Build a Set of existing question texts for fast lookup
      const existingTexts = new Set(existing.map((item) => item.text));

      let addedCount = 0;

      for (const text of newQuestions) {
        // Skip if already in storage
        if (existingTexts.has(text)) {
          savedThisSession.add(text); // mark so we don't check again
          continue;
        }

        // Create a question record with metadata
        existing.push({
          text: text,
          url: window.location.href,
          savedAt: new Date().toISOString(),
          source: "auto",
        });

        savedThisSession.add(text);
        addedCount++;
      }

      // Only write to storage if we actually added something
      if (addedCount > 0) {
        chrome.storage.local.set({ autoSavedQuestions: existing }, () => {
          console.log(
            `%c📚 Auto-saved ${addedCount} new question(s) for revision.`,
            "color: #34d399; font-size: 12px;"
          );
        });
      }
    });
  }

  /**
   * Scan the page for questions and save any new ones.
   * Called on initial load and whenever the DOM changes.
   */
  function scanAndSave() {
    const questions = extractQuestions();
    if (questions.length > 0) {
      saveDetectedQuestions(questions);
    }
  }

  // ── Run an initial scan after the page loads ──
  // Small delay to let dynamic content render
  setTimeout(scanAndSave, 1500);

  // ── MutationObserver: watch for new questions appearing ──
  // Many quiz sites load questions dynamically (AJAX, SPA
  // navigation, "Next" button, etc). The observer catches these.

  let debounceTimer = null;

  const observer = new MutationObserver(() => {
    // Debounce: wait 800ms after the last mutation before scanning.
    // This prevents excessive scanning during rapid DOM updates.
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(scanAndSave, 800);
  });

  // Start observing the entire document body
  observer.observe(document.body, {
    childList: true,   // Watch for added/removed elements
    subtree: true,     // Watch the entire subtree
    characterData: true // Watch for text content changes
  });

  // ────────────────────────────────────────────────────────
  //  3.  AUTO-READ: Respond to popup requests (NEW in v2.0)
  // ────────────────────────────────────────────────────────

  /**
   * Extended selectors that also capture MCQ options.
   * Used when the popup asks for the "current question".
   */
  const EXTENDED_SELECTORS = [
    // Specific question text
    ".question-text", ".question_text", ".question-content",
    ".question-body", ".question-title", ".quiz-question",
    ".exam-question", ".qtext", ".que .qtext",
    // Generic patterns
    "[class*='question']", "[class*='Question']",
    "[id*='question']", "[id*='Question']",
    ".question p", ".que p",
    // MCQ option containers
    ".answer", ".option", ".choice", ".answers",
    "[class*='option']", "[class*='choice']", "[class*='answer']",
    // Paragraph / list fallbacks
    "p", "li", "h3", "h4",
  ];

  /**
   * Extract the best single "current question" from the page.
   * Tries to read the longest, most question-like visible text.
   * Falls back to grabbing any visible readable text block.
   *
   * This works even when the site disables copy/select because
   * we read the DOM directly via innerText.
   *
   * @returns {string|null} The extracted question text, or null.
   */
  function getCurrentQuestion() {
    // Priority 1: Try specific question selectors
    const prioritySelectors = [
      ".question-text", ".question_text", ".question-content",
      ".question-body", ".qtext", ".que .qtext",
      "[class*='question-text']", "[class*='questionText']",
      "[class*='question_text']",
      ".question p", ".que p",
      "[class*='question'] p",
      "h3", "h4", "h2",
    ];

    let bestText = null;
    let bestScore = 0;

    for (const selector of prioritySelectors) {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach((el) => {
          if (el.offsetParent === null) return; // Skip hidden elements
          const text = el.innerText.trim().replace(/\s+/g, " ");
          if (text.length >= MIN_QUESTION_LENGTH && text.length > bestScore) {
            bestScore = text.length;
            bestText = text;
          }
        });
      } catch { /* ignore invalid selectors */ }

      // If we found something good (>50 chars), stop here
      if (bestText && bestText.length > 50) break;
    }

    // Priority 2: If nothing found, grab ALL option texts too
    // to build a full MCQ question string
    if (bestText) {
      const optionSelectors = [
        ".answer", ".option", ".choice",
        "[class*='option']", "[class*='choice']", "[class*='answer']",
        "li",
      ];
      let optionsText = "";
      for (const sel of optionSelectors) {
        try {
          const opts = document.querySelectorAll(sel);
          const optTexts = [];
          opts.forEach((el) => {
            if (el.offsetParent === null) return;
            const t = el.innerText.trim().replace(/\s+/g, " ");
            if (t.length > 3 && t.length < 300) optTexts.push(t);
          });
          if (optTexts.length >= 2 && optTexts.length <= 8) {
            optionsText = "\n\nOptions:\n" + optTexts.map((t, i) =>
              `${String.fromCharCode(65 + i)}. ${t}`).join("\n");
            break;
          }
        } catch { /* skip */ }
      }
      return bestText + optionsText;
    }

    // Priority 3: Brute-force — find the longest visible text block
    const allElements = document.querySelectorAll("p, span, div, h1, h2, h3, h4, li");
    let longestText = null;
    let longestLen = MIN_QUESTION_LENGTH;

    allElements.forEach((el) => {
      // Only leaf-like elements (skip containers with many children)
      if (el.offsetParent === null) return;
      if (el.children.length > 5) return;
      const text = el.innerText.trim().replace(/\s+/g, " ");
      if (text.length > longestLen && text.length < 1000) {
        longestLen = text.length;
        longestText = text;
      }
    });

    return longestText;
  }

  /**
   * Listen for messages from the popup.
   * The popup sends { action: "GET_CURRENT_QUESTION" } and
   * we respond with { question: "..." }.
   */
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.action === "GET_CURRENT_QUESTION") {
      const question = getCurrentQuestion();
      sendResponse({ question: question || null });
    }
    // Must return true for async sendResponse (even though this is sync,
    // keeping it safe for future async extraction)
    return true;
  });

  // ────────────────────────────────────────────────────────
  //  4.  CONSOLE LOG
  // ────────────────────────────────────────────────────────

  console.log(
    "%c📚 ITM Crackit Study Helper v2.0 is active!",
    "color: #7c5cfc; font-size: 14px; font-weight: bold;"
  );
  console.log(
    "%cAuto-save is ON — questions will be saved for revision automatically.",
    "color: #34d399; font-size: 12px;"
  );
  console.log(
    "%cAuto-Read is ON — popup can read questions even without text selection.",
    "color: #34d399; font-size: 12px;"
  );
})();
