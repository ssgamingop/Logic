# 📚 ITM Crackit Study Helper

A powerful, AI-driven study assistant designed to help students learn, understand, and solve academic questions instantly. Built as both a full **Chrome Extension** and a portable **Console Script**, this tool seamlessly integrates with Learning Management Systems (LMS), custom test sites, and platforms like Kahoot.

## ✨ Features

* **🧠 Groq-Powered AI (Llama 3.3 70B):** Uses the most advanced open-source AI model available, running on lightning-fast LPU hardware for instant responses.
* **🚀 Auto-Read & Auto-Select:** Automatically extracts questions from the webpage, sends them to the AI, and **automatically clicks the correct multiple-choice option** for you.
* **🕵️ Hidden Chain of Thought:** For complex questions, the AI silently thinks step-by-step to calculate the correct answer mathematically before outputting only the final answer—giving you maximum accuracy without screen clutter.
* **💡 Explain, Hint, & Similar:** Provides detailed conceptual explanations, helpful hints that don't give away the answer, and generates similar practice questions.
* **🎨 Beautiful UI:** Features a sleek, draggable floating widget (console script) or an organized popup (extension) with dark mode and glassmorphic elements.
* **🛡️ Stealth & Sandboxed:** Uses Shadow DOM in the console script version to ensure the widget's styling never conflicts with the host website.

## 🛠️ Installation

### Option 1: Chrome Extension
1. Download or clone this repository.
2. Open Google Chrome and navigate to `chrome://extensions/`.
3. Enable **"Developer mode"** in the top right corner.
4. Click **"Load unpacked"** and select the folder containing this repository.
5. Pin the extension to your toolbar and enter your Groq API Key!

### Option 2: Portable Console Script
Don't want to install an extension? No problem! 
1. Open `console-script.js`.
2. Copy the entire file content.
3. Open your browser's Developer Tools (F12 or `Ctrl+Shift+I` / `Cmd+Option+I`) on any test site.
4. Go to the **Console** tab, paste the code, and press Enter.
5. The draggable helper widget will instantly appear on the page!

## 🚀 How to Use Auto-Select
1. Make sure you have saved your **Groq API Key** (get one for free at [console.groq.com](https://console.groq.com)).
2. On any test site, click the **"🚀 Auto-Read"** button in the extension or console widget.
3. The script will automatically locate the question and options on the screen.
4. The AI will calculate the answer and the script will **automatically select the correct radio button**!

## 🧪 Test Environment
This repository includes a built-in `test_site` folder to test the Auto-Select features safely.
1. Open `test_site/index.html` in your browser.
2. Run the `console-script.js` code in the Developer Tools console.
3. Click Auto-Read and watch it solve the Data Structures & Algorithms quiz!

## ⚙️ Architecture & Tech Stack
* **HTML/CSS/JS (Vanilla):** No bulky frameworks, ensuring maximum performance and zero dependency overhead.
* **Manifest V3:** Adheres to the latest Chrome extension security protocols, including `<all_urls>` permission scoping.
* **Groq API Integration:** Direct REST API calls to Groq's inference engine for near-zero latency generation.

## 📝 Disclaimer
This tool is built for educational and studying purposes. Please adhere to your institution's academic integrity guidelines when using AI-assisted study tools.
