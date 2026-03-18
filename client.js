const state = {
  bootstrap: null,
  details: new Map(),
  selectedPlatform: null,
  refreshTimer: null,
  isLoading: false
};

const REFRESH_INTERVAL = 30_000;

function escapeHtml(value) {
  return `${value ?? ""}`
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function request(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: "REQUEST_FAILED" }));
    throw new Error(payload.error || "REQUEST_FAILED");
  }
  return response.json();
}

function showToast(message, type = "default") {
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();
  const node = document.createElement("div");
  node.className = `toast toast-${type}`;
  node.textContent = message;
  document.body.append(node);
  setTimeout(() => {
    node.classList.add("toast-exit");
    node.addEventListener("animationend", () => node.remove());
  }, 2000);
}

function renderSkeletons() {
  document.querySelector("#stats").innerHTML = Array(4)
    .fill('<article class="skeleton skeleton-stat"></article>')
    .join("");
  document.querySelector("#content-list").innerHTML = Array(4)
    .fill('<div class="skeleton skeleton-card"></div>')
    .join("");
  document.querySelector("#history").innerHTML = Array(2)
    .fill('<div class="skeleton skeleton-card"></div>')
    .join("");
}

async function loadTask(taskId) {
  const detail = await request(`/api/tasks/${taskId}`);
  state.details.set(taskId, detail);
}

function collectPlatforms() {
  return [...new Set(getAllDrafts().map((draft) => draft.platform))];
}

function getAllDrafts() {
  return [...state.details.values()].flatMap((detail) =>
    (detail.drafts || []).map((draft) => ({
      ...draft,
      taskId: detail.id,
      taskTitle: detail.title,
      taskOwnerName: detail.currentOwnerName,
      updatedAt: draft.updatedAt || detail.updatedAt
    }))
  );
}

function scheduleRefresh() {
  clearTimeout(state.refreshTimer);
  state.refreshTimer = setTimeout(() => refresh(true), REFRESH_INTERVAL);
}

function formatWhen(value) {
  if (!value) return "刚刚";
  return new Date(value).toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function renderStats() {
  const stats = state.bootstrap.dashboard.stats
    .map(
      (item, i) => `
        <article class="stat-card fade-in" style="animation-delay:${i * 60}ms">
          <span class="stat-label">${escapeHtml(item.label)}</span>
          <strong class="stat-value">${escapeHtml(item.value)}</strong>
        </article>
      `
    )
    .join("");
  document.querySelector("#headline").textContent = "超级龙虾社媒发布管理系统";
  document.querySelector("#subline").textContent =
    "内容从飞书对话进入系统，首页只保留内容池与历史留档两个核心工作区。";
  document.querySelector("#stats").innerHTML = stats;
}

function renderPlatformRail() {
  const platforms = collectPlatforms();
  const drafts = getAllDrafts();
  const html = platforms
    .map((platform) => {
      const items = drafts.filter((draft) => draft.platform === platform);
      return `
        <button class="platform-tab ${platform === state.selectedPlatform ? "active" : ""}" data-platform="${escapeHtml(platform)}">
          <strong>${escapeHtml(platform)}</strong>
          <span>${items.length} 篇</span>
        </button>
      `;
    })
    .join("");

  const rail = document.querySelector("#platform-rail");
  rail.innerHTML = html || `<div class="empty-state"><p>暂无平台内容</p></div>`;
  rail.querySelectorAll(".platform-tab").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedPlatform = button.dataset.platform;
      renderPlatformRail();
      renderContentPool();
    });
  });
}

function renderContentPool() {
  const drafts = getAllDrafts();
  const selected = drafts.filter((draft) => draft.platform === state.selectedPlatform);
  const reviewCount = selected.filter((draft) => draft.reviewStatus === "pending_review").length;
  const readyCount = selected.filter((draft) => draft.reviewStatus === "approved" && draft.publishStatus !== "published").length;
  const publishedCount = selected.filter((draft) => draft.publishStatus === "published").length;

  document.querySelector("#pool-platform-name").textContent = state.selectedPlatform || "未选择平台";
  document.querySelector("#pool-counts").innerHTML = `
    <span class="tag-pill">待审 ${reviewCount}</span>
    <span class="tag-pill">待发布 ${readyCount}</span>
    <span class="tag-pill">已发布 ${publishedCount}</span>
  `;

  document.querySelector("#content-list").innerHTML =
    selected.length > 0
      ? selected
          .map(
            (draft, i) => `
              <article class="article-card fade-in" style="animation-delay:${i * 60}ms" data-task-id="${escapeHtml(draft.taskId)}" data-draft-id="${escapeHtml(draft.id)}">
                <div class="article-card-head">
                  <div class="chips">
                    <span class="status-pill" data-status="${escapeHtml(draft.reviewStatusLabel)}">${escapeHtml(draft.reviewStatusLabel)}</span>
                    <span class="tag-pill">${escapeHtml(draft.publishStatusLabel)}</span>
                  </div>
                  <span class="article-time">${escapeHtml(formatWhen(draft.updatedAt))}</span>
                </div>
                <h3>${escapeHtml(draft.title)}</h3>
                <p>${escapeHtml(draft.content.slice(0, 140))}</p>
                <div class="meta-row">
                  <span class="tag-pill">任务：${escapeHtml(draft.taskTitle)}</span>
                  <span class="tag-pill">负责人：${escapeHtml(draft.taskOwnerName)}</span>
                </div>
                <div class="article-card-foot">
                  <span class="article-link">进入编辑页 →</span>
                </div>
              </article>
            `
          )
          .join("")
      : `<div class="empty-state"><p>当前平台还没有内容。</p></div>`;

  document.querySelectorAll(".article-card").forEach((card) => {
    card.addEventListener("click", () => {
      window.location.href = `/editor.html?taskId=${encodeURIComponent(card.dataset.taskId)}&draftId=${encodeURIComponent(card.dataset.draftId)}`;
    });
  });
}

function renderHistory() {
  const html = state.bootstrap.history
    .map(
      (item, i) => `
        <article class="history-card compact-history-card fade-in" style="animation-delay:${i * 60}ms" data-task-id="${escapeHtml(item.taskId)}" data-record-id="${escapeHtml(item.id)}">
          <header>
            <div>
              <div class="chips">
                <span class="tag-pill">${escapeHtml(item.platform)}</span>
                <span class="status-pill" data-status="${escapeHtml(item.taskStatusLabel)}">${escapeHtml(item.taskStatusLabel)}</span>
              </div>
              <h3>${escapeHtml(item.taskTitle)}</h3>
            </div>
          </header>
          <p>${escapeHtml(item.finalTitle)}</p>
          <div class="meta-row">
            <span class="tag-pill">阅读 ${escapeHtml(item.metrics.views)}</span>
            <span class="tag-pill">点赞 ${escapeHtml(item.metrics.likes)}</span>
          </div>
          <div class="article-card-foot">
            <span class="article-link">查看留档 →</span>
          </div>
        </article>
      `
    )
    .join("");

  const node = document.querySelector("#history");
  node.innerHTML = html || `<div class="empty-state"><p>暂无历史留档。</p></div>`;
  node.querySelectorAll(".history-card").forEach((card) => {
    card.addEventListener("click", () => {
      window.location.href = `/history.html?taskId=${encodeURIComponent(card.dataset.taskId)}&recordId=${encodeURIComponent(card.dataset.recordId)}`;
    });
  });
}

function render() {
  renderStats();
  renderPlatformRail();
  renderContentPool();
  renderHistory();
}

async function refresh(silent = false) {
  if (state.isLoading) return;
  state.isLoading = true;

  const refreshBar = document.querySelector(".refresh-bar");
  if (refreshBar) refreshBar.classList.add("loading");
  if (!silent && !state.bootstrap) renderSkeletons();

  try {
    state.bootstrap = await request("/api/bootstrap");
    const tasks = state.bootstrap.tasks || [];
    await Promise.all(tasks.map((task) => loadTask(task.id)));

    const platforms = collectPlatforms();
    if (!state.selectedPlatform && platforms.length > 0) {
      state.selectedPlatform = platforms[0];
    }
    if (state.selectedPlatform && !platforms.includes(state.selectedPlatform)) {
      state.selectedPlatform = platforms[0] || null;
    }

    render();
    scheduleRefresh();
  } catch (error) {
    console.error(error);
    showToast(`加载失败：${error.message}`, "error");
  } finally {
    state.isLoading = false;
    if (refreshBar) refreshBar.classList.remove("loading");
  }
}

window.__refreshDashboard = () => refresh(true);
refresh().catch((error) => {
  console.error(error);
  showToast(`初始化失败：${error.message}`, "error");
});
