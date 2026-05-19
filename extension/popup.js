document.addEventListener("DOMContentLoaded", () => {
  const statusEl = document.getElementById("wsStatus");

  try {
    const ws = new WebSocket('ws://localhost:31415');
    ws.onopen = () => {
      statusEl.textContent = "● Connected to Desktop App";
      statusEl.className = "status";
    };
    ws.onerror = () => {
      statusEl.textContent = "● Desktop App Offline";
      statusEl.className = "status disconnected";
    };
    ws.onclose = () => {
      statusEl.textContent = "● Desktop App Offline";
      statusEl.className = "status disconnected";
    };
  } catch(e) {
    statusEl.textContent = "● Desktop App Offline";
    statusEl.className = "status disconnected";
  }
});
