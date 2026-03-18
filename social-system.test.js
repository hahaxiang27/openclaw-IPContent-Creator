import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";

import { SocialSystemStore } from "./social-system-store.js";

async function main() {
  const filePath = path.join(os.tmpdir(), `social-system-${Date.now()}.json`);
  const store = new SocialSystemStore(filePath);
  await store.init();

  const task = await store.createTask({
    title: "测试任务",
    goal: "测试多平台代理链路",
    platforms: "小红书,知乎",
    needsResearch: true,
    materials: [{ title: "测试素材", content: "一条素材" }]
  });

  assert.equal(task.title, "测试任务");
  assert.equal(task.status, "researching");

  await store.assignSubtask(task.id, {
    workerId: "worker-creator",
    type: "draft",
    inputContext: "开始写作"
  });

  const afterDraft = await store.submitDraft({
    taskId: task.id,
    platform: "小红书",
    title: "测试标题",
    content: "测试正文"
  });

  assert.equal(afterDraft.status, "review");
  assert.equal(afterDraft.drafts[0].reviewStatus, "pending_review");

  const approved = await store.reviewDraft(afterDraft.drafts[0].id, {
    action: "approve",
    title: "测试标题",
    content: "测试正文"
  });

  assert.equal(approved.status, "publishing");

  const published = await store.markPublished(approved.drafts[0].id, {
    url: "https://example.com/post"
  });

  assert.equal(published.status, "published");
  assert.equal(published.publishRecords[0].url, "https://example.com/post");
  console.log("social-system smoke test passed");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
