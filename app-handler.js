import { createReadStream } from "node:fs";
import { access } from "node:fs/promises";
import path from "node:path";

const ROOT_DIR = process.cwd();

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
};

function sendJson(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  if (chunks.length === 0) {
    return {};
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

async function serveStatic(res, pathname) {
  const normalized = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.join(ROOT_DIR, normalized);
  try {
    await access(filePath);
    res.writeHead(200, {
      "Content-Type": MIME_TYPES[path.extname(filePath)] || "application/octet-stream"
    });
    createReadStream(filePath).pipe(res);
    return true;
  } catch {
    return false;
  }
}

function routeMatch(pathname, template) {
  const current = pathname.split("/").filter(Boolean);
  const target = template.split("/").filter(Boolean);
  if (current.length !== target.length) {
    return null;
  }
  const params = {};
  for (let index = 0; index < target.length; index += 1) {
    if (target[index].startsWith(":")) {
      params[target[index].slice(1)] = decodeURIComponent(current[index]);
      continue;
    }
    if (target[index] !== current[index]) {
      return null;
    }
  }
  return params;
}

export function createRequestHandler(store) {
  return async (req, res) => {
    try {
      const url = new URL(req.url, "http://localhost");
      const { pathname } = url;

      if (pathname.startsWith("/api/")) {
        if (req.method === "GET" && pathname === "/api/bootstrap") {
          return sendJson(res, 200, await store.listBootstrap());
        }
        if (req.method === "GET" && pathname === "/api/tasks") {
          return sendJson(res, 200, await store.listTasks());
        }
        if (req.method === "GET" && pathname === "/api/history") {
          return sendJson(res, 200, await store.listHistory());
        }

        const taskParams = routeMatch(pathname, "/api/tasks/:taskId");
        if (req.method === "GET" && taskParams) {
          return sendJson(res, 200, await store.getTaskContext(taskParams.taskId));
        }

        if (req.method === "POST" && pathname === "/api/tasks") {
          return sendJson(res, 201, await store.createTask(await readBody(req)));
        }

        const assignmentParams = routeMatch(pathname, "/api/tasks/:taskId/assignments");
        if (req.method === "POST" && assignmentParams) {
          return sendJson(res, 200, await store.assignSubtask(assignmentParams.taskId, await readBody(req)));
        }

        const materialParams = routeMatch(pathname, "/api/tasks/:taskId/materials");
        if (req.method === "POST" && materialParams) {
          return sendJson(res, 201, await store.appendMaterial(materialParams.taskId, await readBody(req)));
        }

        const statusParams = routeMatch(pathname, "/api/tasks/:taskId/status");
        if (req.method === "POST" && statusParams) {
          return sendJson(res, 200, await store.updateTaskStatus(statusParams.taskId, await readBody(req)));
        }

        const reviewNeededParams = routeMatch(pathname, "/api/tasks/:taskId/review-needed");
        if (req.method === "POST" && reviewNeededParams) {
          return sendJson(res, 200, await store.markReviewNeeded(reviewNeededParams.taskId, await readBody(req)));
        }

        if (req.method === "POST" && pathname === "/api/drafts") {
          return sendJson(res, 201, await store.submitDraft(await readBody(req)));
        }

        const draftReviewParams = routeMatch(pathname, "/api/drafts/:draftId/review");
        if (req.method === "POST" && draftReviewParams) {
          return sendJson(res, 200, await store.reviewDraft(draftReviewParams.draftId, await readBody(req)));
        }

        const draftSyncParams = routeMatch(pathname, "/api/drafts/:draftId/sync");
        if (req.method === "POST" && draftSyncParams) {
          return sendJson(res, 200, await store.syncDraft(draftSyncParams.draftId, await readBody(req)));
        }

        const draftPublishParams = routeMatch(pathname, "/api/drafts/:draftId/publish");
        if (req.method === "POST" && draftPublishParams) {
          return sendJson(res, 200, await store.markPublished(draftPublishParams.draftId, await readBody(req)));
        }

        const queueParams = routeMatch(pathname, "/api/queue/:workerId");
        if (req.method === "GET" && queueParams) {
          return sendJson(res, 200, await store.listQueue(queueParams.workerId));
        }

        const contextParams = routeMatch(pathname, "/api/context/:taskId");
        if (req.method === "GET" && contextParams) {
          return sendJson(res, 200, await store.getTaskContext(contextParams.taskId));
        }

        return sendJson(res, 404, { error: "NOT_FOUND" });
      }

      const served = await serveStatic(res, pathname);
      if (!served) {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Not found");
      }
    } catch (error) {
      const status = error.message === "TASK_NOT_FOUND" || error.message === "DRAFT_NOT_FOUND" ? 404 : 500;
      sendJson(res, status, { error: error.message || "INTERNAL_ERROR" });
    }
  };
}
