const params = new URLSearchParams(window.location.search);
const taskId = params.get("taskId");
const draftId = params.get("draftId");

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

function showModal({ title, message, fields = [], confirmLabel = "确认", cancelLabel = "取消", onConfirm }) {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";

  const fieldsHtml = fields
    .map(
      (field) =>
        field.type === "textarea"
          ? `<label><span>${escapeHtml(field.label)}</span><textarea id="modal-${field.name}" rows="3" placeholder="${escapeHtml(field.placeholder || "")}">${escapeHtml(field.defaultValue || "")}</textarea></label>`
          : `<label><span>${escapeHtml(field.label)}</span><input id="modal-${field.name}" value="${escapeHtml(field.defaultValue || "")}" placeholder="${escapeHtml(field.placeholder || "")}" /></label>`
    )
    .join("");

  overlay.innerHTML = `
    <div class="modal-box">
      <h3>${escapeHtml(title)}</h3>
      ${message ? `<p>${escapeHtml(message)}</p>` : ""}
      ${fieldsHtml}
      <div class="modal-actions">
        <button class="ghost-btn" data-modal="cancel">${escapeHtml(cancelLabel)}</button>
        <button class="primary-btn" data-modal="confirm">${escapeHtml(confirmLabel)}</button>
      </div>
    </div>
  `;

  document.body.append(overlay);

  overlay.querySelector('[data-modal="cancel"]').addEventListener("click", () => overlay.remove());
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) overlay.remove();
  });

  overlay.querySelector('[data-modal="confirm"]').addEventListener("click", () => {
    const values = {};
    fields.forEach((field) => {
      const node = document.querySelector(`#modal-${field.name}`);
      values[field.name] = node ? node.value : "";
    });
    overlay.remove();
    onConfirm(values);
  });
}

function setButtonLoading(button, loading) {
  if (loading) {
    button.classList.add("loading");
    button.disabled = true;
  } else {
    button.classList.remove("loading");
    button.disabled = false;
  }
}

async function load() {
  if (!taskId || !draftId) {
    document.querySelector("#editor-layout").innerHTML = `<div class="panel empty-state"><p>缺少 taskId 或 draftId。</p></div>`;
    return;
  }

  const detail = await request(`/api/tasks/${taskId}`);
  const draft = detail.drafts.find((item) => item.id === draftId);
  if (!draft) {
    document.querySelector("#editor-layout").innerHTML = `<div class="panel empty-state"><p>没有找到这篇文章。</p></div>`;
    return;
  }

  document.querySelector("#editor-title").textContent = draft.title;
  document.querySelector("#editor-subline").textContent = `${draft.platform} / ${detail.title} / 当前负责人：${detail.currentOwnerName}`;

  document.querySelector("#editor-layout").innerHTML = `
    <section class="panel editor-main fade-in">
      <div class="section-head">
        <h2>正文编辑</h2>
        <span>审核、发布动作都在这里完成</span>
      </div>
      <div class="editor-body">
        <div class="chips">
          <span class="status-pill" data-status="${escapeHtml(draft.reviewStatusLabel)}">${escapeHtml(draft.reviewStatusLabel)}</span>
          <span class="tag-pill">${escapeHtml(draft.publishStatusLabel)}</span>
          <span class="tag-pill">${escapeHtml(draft.platform)}</span>
        </div>
        <label>
          <span>标题</span>
          <input id="draft-title" value="${escapeHtml(draft.title)}" />
        </label>
        <label>
          <span>正文</span>
          <textarea id="draft-content" rows="18">${escapeHtml(draft.content)}</textarea>
        </label>
        <div class="action-bar">
          <button class="ghost-btn" data-action="edit">保存改稿</button>
          <button class="mini-btn" data-action="approve">批准进入待发布</button>
          <button class="danger-btn" data-action="request_rewrite">退回重写</button>
          <button class="ghost-btn" data-action="sync">同步平台草稿箱</button>
          <button class="ghost-btn" data-action="publish">标记已发布</button>
        </div>
      </div>
    </section>

    <aside class="editor-side">
      <section class="panel fade-in" style="animation-delay:80ms">
        <div class="section-head">
          <h2>发布信息</h2>
          <span>当前稿件状态</span>
        </div>
        <div class="editor-side-body">
          <div class="metric-grid">
            <div class="mini-metric"><span>版本</span><strong>${escapeHtml(draft.version)}</strong></div>
            <div class="mini-metric"><span>更新时间</span><strong>${escapeHtml(new Date(draft.updatedAt).toLocaleString("zh-CN"))}</strong></div>
          </div>
          ${
            detail.publishRecords.length
              ? `<a class="ghost-btn nav-link" href="${escapeHtml(detail.publishRecords[0].url)}" target="_blank" rel="noreferrer">打开已发布链接 →</a>`
              : `<p>当前还没有发布链接。</p>`
          }
        </div>
      </section>

      <section class="panel fade-in" style="animation-delay:160ms">
        <div class="section-head">
          <h2>来源摘要</h2>
          <span>来自飞书素材</span>
        </div>
        <div class="editor-side-body">
          <ul>
            ${detail.materials.map((material) => `<li>${escapeHtml(material.title)} · ${escapeHtml(material.type)}</li>`).join("")}
          </ul>
        </div>
      </section>

      <section class="panel fade-in" style="animation-delay:240ms">
        <div class="section-head">
          <h2>任务日志</h2>
          <span>最近执行记录</span>
        </div>
        <div class="editor-side-body">
          <ul>
            ${detail.logs.slice(0, 8).map((log) => `<li>${escapeHtml(log.action)} · ${escapeHtml(log.message)}</li>`).join("")}
          </ul>
        </div>
      </section>
    </aside>
  `;

  document.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", async () => {
      const title = document.querySelector("#draft-title").value;
      const content = document.querySelector("#draft-content").value;
      const action = button.dataset.action;

      if (action === "request_rewrite") {
        showModal({
          title: "退回重写",
          message: "请输入退回原因，帮助创作龙虾改进。",
          fields: [{ name: "reason", label: "退回原因", type: "textarea", defaultValue: "请补充更强的开头和行动建议。" }],
          confirmLabel: "确认退回",
          onConfirm: async ({ reason }) => {
            setButtonLoading(button, true);
            try {
              await request(`/api/drafts/${draftId}/review`, {
                method: "POST",
                body: JSON.stringify({ action, title, content, message: reason || "请根据反馈重写。" })
              });
              showToast("已退回重写", "success");
              await load();
            } catch (error) {
              showToast(`操作失败：${error.message}`, "error");
            } finally {
              setButtonLoading(button, false);
            }
          }
        });
        return;
      }

      if (action === "publish") {
        showModal({
          title: "标记已发布",
          message: "填写发布信息和初始数据。",
          fields: [
            { name: "url", label: "发布链接", defaultValue: "https://", placeholder: "https://..." },
            { name: "views", label: "阅读数", defaultValue: "0" },
            { name: "likes", label: "点赞数", defaultValue: "0" },
            { name: "bookmarks", label: "收藏数", defaultValue: "0" },
            { name: "comments", label: "评论数", defaultValue: "0" },
            { name: "shares", label: "转发数", defaultValue: "0" }
          ],
          confirmLabel: "确认发布",
          onConfirm: async (values) => {
            if (!values.url || values.url === "https://") {
              showToast("请输入有效的发布链接", "error");
              return;
            }
            setButtonLoading(button, true);
            try {
              await request(`/api/drafts/${draftId}/publish`, {
                method: "POST",
                body: JSON.stringify(values)
              });
              showToast("已标记为发布", "success");
              await load();
            } catch (error) {
              showToast(`操作失败：${error.message}`, "error");
            } finally {
              setButtonLoading(button, false);
            }
          }
        });
        return;
      }

      setButtonLoading(button, true);
      try {
        if (action === "edit" || action === "approve") {
          await request(`/api/drafts/${draftId}/review`, {
            method: "POST",
            body: JSON.stringify({ action, title, content })
          });
        }

        if (action === "sync") {
          await request(`/api/drafts/${draftId}/sync`, {
            method: "POST",
            body: JSON.stringify({ status: "synced" })
          });
        }

        const labels = {
          edit: "改稿已保存",
          approve: "已批准进入待发布",
          sync: "已同步平台草稿箱"
        };
        showToast(labels[action] || "操作完成", "success");
        await load();
      } catch (error) {
        showToast(`操作失败：${error.message}`, "error");
      } finally {
        setButtonLoading(button, false);
      }
    });
  });
}

load().catch((error) => {
  console.error(error);
  showToast(`加载失败：${error.message}`, "error");
});
