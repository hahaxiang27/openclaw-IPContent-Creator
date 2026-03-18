---
name: social-system-base
description: 用于操作本地龙虾社媒指挥台。适用于创建任务、追加素材、回写草稿、查询任务上下文、查看个人队列、提醒审核、回填发布链接等所有需要和本地系统交互的场景。
---

# 社媒系统基座 Skill

## 使用时机

- 任何龙虾需要读写本地社媒系统时。
- 需要把飞书对话中的意图转换成系统任务、素材、草稿或发布记录时。

## 固定约束

- 默认本地地址：`http://localhost:3030`（可设置环境变量 `SOCIAL_SYSTEM_BASE_URL` 覆盖）
- 执行 CLI 前需先 `cd` 到项目根目录
- 优先通过项目内 CLI 调用：`node social-skill-cli.mjs`
- 所有操作前，先判断任务是否已存在；能复用就不要新建重复任务。

## 常用命令

```powershell
node social-skill-cli.mjs create_task --title=... --goal=... --platforms=小红书,公众号,知乎 --needsResearch=true --material=...
node social-skill-cli.mjs append_material --taskId=... --title=... --type=url --content=https://...
node social-skill-cli.mjs submit_draft --taskId=... --platform=小红书 --title=... --content=...
node social-skill-cli.mjs get_task_context --taskId=...
node social-skill-cli.mjs list_my_queue --workerId=worker-creator
node social-skill-cli.mjs mark_review_needed --taskId=...
node social-skill-cli.mjs mark_published --draftId=... --url=https://...
```

## 输出要求

- 写任务时要包含明确标题、目标、平台。
- 写素材时要标清来源类型。
- 回写草稿时必须区分平台。
- 查询上下文时优先读取任务、素材、草稿、日志，再决定下一步动作。
