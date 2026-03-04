function setStatus(msg, isError = false) {
  const el = document.getElementById("status");
  el.style.color = isError ? "#a00" : "#0a0";
  el.textContent = msg || "";
  if (msg) setTimeout(() => (el.textContent = ""), 2500);
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function normalizeLines(text) {
  return (text || "")
    .split("\n")
    .map(s => s.trim())
    .filter(Boolean)
    .join("\n");
}

function downloadText(filename, text) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

(async () => {
  const { groceryList } = await chrome.storage.local.get("groceryList");
  document.getElementById("list").value = groceryList ?? "";

  document.getElementById("file").addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const normalized = normalizeLines(text);

      await chrome.storage.local.set({ groceryList: normalized, checkedMap: {}, currentIndex: 0 });
      document.getElementById("list").value = normalized;

      setStatus(`Loaded ${file.name}`);
    } catch (err) {
      setStatus(`Failed to read file: ${err?.message || err}`, true);
    } finally {
      e.target.value = "";
    }
  });

  document.getElementById("save").addEventListener("click", async () => {
    const val = normalizeLines(document.getElementById("list").value);
    await chrome.storage.local.set({ groceryList: val });
    setStatus("Saved.");
  });

  document.getElementById("clear").addEventListener("click", async () => {
    await chrome.storage.local.set({ groceryList: "", checkedMap: {}, currentIndex: 0 });
    document.getElementById("list").value = "";
    setStatus("Cleared.");
  });

  document.getElementById("download").addEventListener("click", async () => {
    const val = normalizeLines(document.getElementById("list").value);
    downloadText("ralphs-list.txt", val + (val ? "\n" : ""));
    setStatus("Downloaded ralphs-list.txt");
  });

  document.getElementById("toggle").addEventListener("click", async () => {
    const tab = await getActiveTab();
    if (!tab?.id) return;
    chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_PANEL" });
  });
})();
