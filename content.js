let panelEl = null;
let isVisible = false;

const SHOP_TAB_TARGET = "rgp_shopping_tab";

function normalizeLines(text) {
  return (text || "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

function ralphsSearchUrl(query) {
  return `https://www.ralphs.com/search?query=${encodeURIComponent(query)}`;
}

function openInShoppingTab(query) {
  const url = ralphsSearchUrl(query);
  window.open(url, SHOP_TAB_TARGET);
}

async function loadState() {
  const { groceryList, checkedMap, currentIndex, collapsed } =
    await chrome.storage.local.get([
      "groceryList",
      "checkedMap",
      "currentIndex",
      "collapsed",
    ]);

  const items = normalizeLines(groceryList);

  return {
    items,
    checkedMap: checkedMap || {},
    currentIndex: Number.isInteger(currentIndex) ? currentIndex : 0,
    collapsed: !!collapsed,
  };
}

async function saveChecked(checkedMap) {
  await chrome.storage.local.set({ checkedMap });
}

async function saveCurrentIndex(currentIndex) {
  await chrome.storage.local.set({ currentIndex });
}

async function setCollapsed(collapsed) {
  await chrome.storage.local.set({ collapsed: !!collapsed });
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function findNextUnchecked(items, checkedMap, startIdx) {
  for (let i = startIdx; i < items.length; i++) {
    if (!checkedMap[i]) return i;
  }
  for (let i = 0; i < startIdx; i++) {
    if (!checkedMap[i]) return i;
  }
  return -1;
}

function ensurePanel() {
  if (panelEl) return panelEl;

  panelEl = document.createElement("div");
  panelEl.id = "rgp-panel";
  panelEl.style.display = "none";

  panelEl.innerHTML = `
    <div class="rgp-header">
      <div class="rgp-title">
        <h3>Grocery Runner</h3>
        <div class="rgp-sub">One-by-one cart helper</div>
      </div>
      <div class="rgp-actions">
        <button id="rgp-collapse" title="Collapse">▾</button>
        <button id="rgp-close" title="Close">✕</button>
      </div>
    </div>

    <div class="rgp-body">
      <div class="rgp-card">
        <div class="rgp-meta">
          <div>
            <span id="rgp-progress-text">0/0</span>
            <span class="rgp-pill" id="rgp-status">—</span>
          </div>
          <span class="rgp-pill">Shortcuts: S, D, K, J, Esc</span>
        </div>

        <div class="rgp-progress"><div id="rgp-progress-bar"></div></div>

        <div class="rgp-current" id="rgp-current">No items loaded.</div>

        <div class="rgp-controls">
          <button id="rgp-back">Back (J)</button>
          <button class="rgp-primary" id="rgp-search">Search (S)</button>
          <button class="rgp-primary" id="rgp-done-next">Done + Next (D)</button>
          <button id="rgp-skip-next">Skip (K)</button>
        </div>
      </div>

      <div class="rgp-divider"></div>

      <div class="rgp-controls" style="margin-bottom: 10px;">
        <button id="rgp-open-all">Open all</button>
        <button id="rgp-reset">Reset</button>
      </div>

      <div class="rgp-list" id="rgp-list"></div>

      <div class="rgp-footnote">
        Tip: Upload your list (one item per line) from the extension popup. This panel never auto-adds items; it just speeds up searching.
      </div>
    </div>
  `;

  document.body.appendChild(panelEl);

  // Header actions
  panelEl.querySelector("#rgp-close").addEventListener("click", () => {
    isVisible = false;
    panelEl.style.display = "none";
  });

  panelEl.querySelector("#rgp-collapse").addEventListener("click", async () => {
    const { collapsed } = await loadState();
    await setCollapsed(!collapsed);
    await applyCollapsedState();
  });

  // Runner actions
  panelEl.querySelector("#rgp-search").addEventListener("click", async () => {
    const { items, currentIndex } = await loadState();
    if (!items.length) return;
    const idx = clamp(currentIndex, 0, items.length - 1);
    openInShoppingTab(items[idx]);
  });

  panelEl.querySelector("#rgp-done-next").addEventListener("click", async () => {
    const state = await loadState();
    const { items } = state;
    if (!items.length) return;

    let { checkedMap, currentIndex } = state;
    currentIndex = clamp(currentIndex, 0, items.length - 1);

    checkedMap[currentIndex] = true;
    await saveChecked(checkedMap);

    const next = findNextUnchecked(items, checkedMap, currentIndex + 1);
    const newIndex = next === -1 ? currentIndex : next;
    await saveCurrentIndex(newIndex);

    await render();

    if (next !== -1) {
      openInShoppingTab(items[newIndex]); // reuse same shopping tab
    }
  });

  panelEl.querySelector("#rgp-skip-next").addEventListener("click", async () => {
    const { items, checkedMap, currentIndex } = await loadState();
    if (!items.length) return;

    const idx = clamp(currentIndex, 0, items.length - 1);
    const next = findNextUnchecked(items, checkedMap, idx + 1);
    const newIndex = next === -1 ? idx : next;

    await saveCurrentIndex(newIndex);
    await render();
  });

  panelEl.querySelector("#rgp-back").addEventListener("click", async () => {
    const { items, checkedMap, currentIndex } = await loadState();
    if (!items.length) return;

    let idx = clamp(currentIndex, 0, items.length - 1);

    for (let i = idx - 1; i >= 0; i--) {
      if (!checkedMap[i]) {
        idx = i;
        await saveCurrentIndex(idx);
        await render();
        return;
      }
    }

    idx = clamp(idx - 1, 0, items.length - 1);
    await saveCurrentIndex(idx);
    await render();
  });

  // Bulk actions
  panelEl.querySelector("#rgp-open-all").addEventListener("click", async () => {
    const { items } = await loadState();
    items.forEach((q, i) =>
      setTimeout(() => window.open(ralphsSearchUrl(q), "_blank"), i * 250)
    );
  });

  panelEl.querySelector("#rgp-reset").addEventListener("click", async () => {
    await chrome.storage.local.set({ checkedMap: {}, currentIndex: 0 });
    await render();
  });

  // Keyboard shortcuts (only when panel visible; ignore typing in inputs)
  document.addEventListener("keydown", async (e) => {
    if (!isVisible) return;
    const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : "";
    if (tag === "input" || tag === "textarea" || e.isComposing) return;

    if (e.key === "Escape") {
      isVisible = false;
      panelEl.style.display = "none";
      return;
    }

    const key = e.key.toLowerCase();
    if (key === "s") panelEl.querySelector("#rgp-search")?.click();
    if (key === "d") panelEl.querySelector("#rgp-done-next")?.click();
    if (key === "k") panelEl.querySelector("#rgp-skip-next")?.click();
    if (key === "j") panelEl.querySelector("#rgp-back")?.click();
  });

  return panelEl;
}

async function applyCollapsedState() {
  const el = ensurePanel();
  const { collapsed } = await loadState();
  el.classList.toggle("rgp-collapsed", collapsed);
  const btn = el.querySelector("#rgp-collapse");
  if (btn) btn.textContent = collapsed ? "▸" : "▾";
}

async function renderRunner() {
  const el = ensurePanel();

  const curEl = el.querySelector("#rgp-current");
  const progTextEl = el.querySelector("#rgp-progress-text");
  const progBarEl = el.querySelector("#rgp-progress-bar");
  const statusEl = el.querySelector("#rgp-status");

  const { items, checkedMap, currentIndex } = await loadState();

  if (!items.length) {
    curEl.textContent = "No items loaded. Upload a .txt file in the extension popup.";
    progTextEl.textContent = "0/0";
    statusEl.textContent = "—";
    progBarEl.style.width = "0%";
    return;
  }

  const checkedCount = Object.values(checkedMap).filter(Boolean).length;
  progTextEl.textContent = `${checkedCount}/${items.length}`;
  progBarEl.style.width = `${Math.round((checkedCount / items.length) * 100)}%`;

  let idx = clamp(currentIndex, 0, items.length - 1);
  if (checkedMap[idx]) {
    const next = findNextUnchecked(items, checkedMap, idx);
    if (next !== -1) idx = next;
  }
  if (idx !== currentIndex) await saveCurrentIndex(idx);

  curEl.textContent = items[idx];
  statusEl.textContent = checkedMap[idx] ? "done" : "pending";
}

async function renderList() {
  const el = ensurePanel();
  const listEl = el.querySelector("#rgp-list");
  const { items, checkedMap } = await loadState();

  listEl.innerHTML = "";
  if (!items.length) return;

  items.forEach((q, idx) => {
    const row = document.createElement("div");
    row.className = "rgp-row";

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = !!checkedMap[idx];
    cb.addEventListener("change", async () => {
      checkedMap[idx] = cb.checked;
      await saveChecked(checkedMap);
      await render();
    });

    const text = document.createElement("div");
    text.className = "rgp-item" + (cb.checked ? " done" : "");
    text.textContent = q;

    const goBtn = document.createElement("button");
    goBtn.textContent = "Set";
    goBtn.addEventListener("click", async () => {
      await saveCurrentIndex(idx);
      await render();
    });

    row.appendChild(cb);
    row.appendChild(text);
    row.appendChild(goBtn);
    listEl.appendChild(row);
  });
}

async function render() {
  await renderRunner();
  await renderList();
}

function toggle() {
  ensurePanel();
  isVisible = !isVisible;
  panelEl.style.display = isVisible ? "block" : "none";
  if (isVisible) {
    applyCollapsedState();
    render();
  }
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === "TOGGLE_PANEL") toggle();
});
