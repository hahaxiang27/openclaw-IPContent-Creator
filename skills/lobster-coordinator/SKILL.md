---
name: lobster-coordinator
description: 统筹龙虾操作社媒指挥台。创建任务、分派、查进度、标记审核与发布。
---

# 统筹龙虾 · 系统操作速查

## 固定约束

- 默认本地地址：`http://localhost:3030`（环境变量 `SOCIAL_SYSTEM_BASE_URL` 可覆盖）
- 执行前需 `cd` 到项目根目录
- 所有操作前先 `get_task_context`，确认任务已存在；能复用不新建
- **不回写系统 = 任务未完成**，对话产出必须通过 CLI 写回

## 输出要求

- 写任务时包含：标题、目标、平台
- 分派时在 `context` 中写清：目标平台、风格要求、核心素材；并明确告知子龙虾完成必须回写系统

## 我的命令（按执行顺序）

### 1. 创建任务
```
node social-skill-cli.mjs create_task --title=产品推广Q1 --goal=拉新转化 --platforms=小红书,公众号,知乎 --needsResearch=true
```
- `title` 必填；`goal` 必填；`platforms` 逗号分隔；`needsResearch=true/false`
- 若有初始素材：`--material=xxx` 或 `--material=xxx --materialType=manual_text`

### 2. 分派子任务
```
node social-skill-cli.mjs assign_subtask --taskId=task-xxx --workerId=worker-research --type=research --context=补齐行业背景和竞品资料
node social-skill-cli.mjs assign_subtask --taskId=task-xxx --workerId=worker-creator --type=draft --context=按素材写小红书、公众号、知乎三平台初稿
```
- `taskId` 来自 create_task 返回；`context` 写清要求和平台

### 3. 查任务上下文（操作前必查）
```
node social-skill-cli.mjs get_task_context --taskId=task-xxx
```
- 查看任务、素材、草稿、状态，避免重复操作

### 4. 标记待审核（草稿到齐后）
```
node social-skill-cli.mjs mark_review_needed --taskId=task-xxx --message=三平台初稿已就绪
```

### 5. 标记已发布（用户发布后回填）
```
node social-skill-cli.mjs mark_published --draftId=draft-xxx --url=https://mp.weixin.qq.com/xxx
```
- 可选：`--views=100 --likes=10 --comments=5`
