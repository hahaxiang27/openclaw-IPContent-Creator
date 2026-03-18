const params = new URLSearchParams(window.location.search);
const taskId = params.get("taskId");
const recordId = params.get("recordId");

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

async function load() {
  if (!taskId || !recordId) {
    document.querySelector("#history-detail").innerHTML = `<div class="panel empty-state"><p>缺少 taskId 或 recordId。</p></div>`;
    return;
  }

  document.querySelector("#history-detail").innerHTML = `
    <div class="panel" style="padding:40px;text-align:center">
      <div class="skeleton" style="width:60%;height:24px;margin:0 auto 16px"></div>
      <div class="skeleton" style="width:40%;height:16px;margin:0 auto"></div>
    </div>
  `;

  const [detail, history] = await Promise.all([request(`/api/tasks/${taskId}`), request("/api/history")]);
  const record = history.find((item) => item.id === recordId);
  if (!record) {
    document.querySelector("#history-detail").innerHTML = `<div class="panel empty-state"><p>没有找到这条历史留档。</p></div>`;
    return;
  }

  document.querySelector("#history-title").textContent = record.finalTitle;
  document.querySelector("#history-subline").textContent = `${record.platform} / ${detail.title} / 发布于 ${new Date(record.publishedAt).toLocaleString("zh-CN")}`;

  document.querySelector("#history-detail").innerHTML = `
    <section class="panel archive-main fade-in">
      <div class="section-head">
        <h2>留档摘要</h2>
        <span>最终发布结果与效果</span>
      </div>
      <div class="archive-body">
        <div class="chips">
          <span class="tag-pill">${escapeHtml(record.platform)}</span>
          <span class="status-pill" data-status="${escapeHtml(record.taskStatusLabel)}">${escapeHtml(record.taskStatusLabel)}</span>
        </div>
        <p>${escapeHtml(record.finalTitle)}</p>
        <div class="metric-board">
          <div class="mini-metric"><span>阅读</span><strong>${escapeHtml(record.metrics.views)}</strong></div>
          <div class="mini-metric"><span>点赞</span><strong>${escapeHtml(record.metrics.likes)}</strong></div>
          <div class="mini-metric"><span>收藏</span><strong>${escapeHtml(record.metrics.bookmarks)}</strong></div>
          <div class="mini-metric"><span>评论</span><strong>${escapeHtml(record.metrics.comments)}</strong></div>
        </div>
        <a class="mini-btn nav-link" href="${escapeHtml(record.url)}" target="_blank" rel="noreferrer">打开已发布内容 →</a>
      </div>
    </section>

    <aside class="archive-side">
      <section class="panel fade-in" style="animation-delay:80ms">
        <div class="section-head">
          <h2>素材谱系</h2>
          <span>这篇内容从哪里来</span>
        </div>
        <div class="editor-side-body">
          <ul>
            ${detail.materials.map((material) => `<li>${escapeHtml(material.title)} · ${escapeHtml(material.type)}</li>`).join("")}
          </ul>
        </div>
      </section>

      <section class="panel fade-in" style="animation-delay:160ms">
        <div class="section-head">
          <h2>任务分派链路</h2>
          <span>谁接手过这篇内容</span>
        </div>
        <div class="editor-side-body">
          <ul>
            ${detail.assignments.map((assignment) => `<li>${escapeHtml(assignment.workerName)} · ${escapeHtml(assignment.type)} · ${escapeHtml(assignment.statusLabel)}</li>`).join("")}
          </ul>
        </div>
      </section>

      <section class="panel fade-in" style="animation-delay:240ms">
        <div class="section-head">
          <h2>执行日志</h2>
          <span>关键动作回放</span>
        </div>
        <div class="editor-side-body">
          <ul>
            ${detail.logs.map((log) => `<li>${escapeHtml(log.action)} · ${escapeHtml(log.message)}</li>`).join("")}
          </ul>
        </div>
      </section>
    </aside>
  `;
}

load().catch((error) => {
  console.error(error);
  showToast(`加载失败：${error.message}`, "error");
});
