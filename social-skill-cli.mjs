import process from "node:process";

const baseUrl = process.env.SOCIAL_SYSTEM_BASE_URL || "http://localhost:3030";
const [command, ...args] = process.argv.slice(2);

function parseArgs(values) {
  return values.reduce((acc, item) => {
    const [key, ...rest] = item.split("=");
    acc[key.replace(/^--/, "")] = rest.join("=");
    return acc;
  }, {});
}

async function call(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || "REQUEST_FAILED");
  }
  console.log(JSON.stringify(payload, null, 2));
}

const params = parseArgs(args);

switch (command) {
  case "create_task":
    await call("/api/tasks", {
      method: "POST",
      body: JSON.stringify({
        title: params.title,
        goal: params.goal,
        type: params.type || "manual_creation",
        origin: params.origin || "飞书统筹指令",
        platforms: params.platforms || "小红书,公众号",
        needsResearch: params.needsResearch === "true",
        materials: params.material
          ? [{ type: params.materialType || "manual_text", title: "CLI 素材", content: params.material }]
          : []
      })
    });
    break;
  case "assign_subtask":
    await call(`/api/tasks/${params.taskId}/assignments`, {
      method: "POST",
      body: JSON.stringify({
        workerId: params.workerId,
        type: params.type || "draft",
        inputContext: params.context || ""
      })
    });
    break;
  case "append_material":
    await call(`/api/tasks/${params.taskId}/materials`, {
      method: "POST",
      body: JSON.stringify({
        title: params.title || "CLI 素材",
        type: params.type || "manual_text",
        content: params.content || "",
        sourceUrl: params.sourceUrl || ""
      })
    });
    break;
  case "submit_draft":
    await call("/api/drafts", {
      method: "POST",
      body: JSON.stringify({
        taskId: params.taskId,
        platform: params.platform,
        title: params.title,
        content: params.content,
        workerId: params.workerId || "worker-creator"
      })
    });
    break;
  case "update_task_status":
    await call(`/api/tasks/${params.taskId}/status`, {
      method: "POST",
      body: JSON.stringify({
        status: params.status,
        currentOwnerId: params.currentOwnerId,
        message: params.message
      })
    });
    break;
  case "list_my_queue":
    await call(`/api/queue/${params.workerId}`);
    break;
  case "get_task_context":
    await call(`/api/context/${params.taskId}`);
    break;
  case "mark_review_needed":
    await call(`/api/tasks/${params.taskId}/review-needed`, {
      method: "POST",
      body: JSON.stringify({ message: params.message })
    });
    break;
  case "mark_published":
    await call(`/api/drafts/${params.draftId}/publish`, {
      method: "POST",
      body: JSON.stringify({
        url: params.url,
        views: params.views || 0,
        likes: params.likes || 0,
        bookmarks: params.bookmarks || 0,
        comments: params.comments || 0,
        shares: params.shares || 0
      })
    });
    break;
  default:
    console.log(`Available commands:
  create_task --title=... --goal=... --platforms=小红书,公众号 --needsResearch=true
  assign_subtask --taskId=... --workerId=worker-creator --type=draft --context=...
  append_material --taskId=... --title=... --type=url --content=...
  submit_draft --taskId=... --platform=小红书 --title=... --content=...
  update_task_status --taskId=... --status=review
  list_my_queue --workerId=worker-research
  get_task_context --taskId=...
  mark_review_needed --taskId=...
  mark_published --draftId=... --url=https://...
`);
}
