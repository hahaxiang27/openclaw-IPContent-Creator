---
name: lobster-creator
description: 创作龙虾操作社媒指挥台。查任务、按平台提交草稿。
---

# 创作龙虾 · 系统操作速查

## 固定约束

- 默认本地地址：`http://localhost:3030`（环境变量 `SOCIAL_SYSTEM_BASE_URL` 可覆盖）
- 执行前需 `cd` 到项目根目录
- 写稿前先 `get_task_context`，确认平台、素材、风格
- **不回写系统 = 任务未完成**，每个平台的草稿必须通过 CLI 写回

## 输出要求

- 回写草稿必须区分平台，一平台一稿，禁止多平台混在一条里
- 标题和正文都要完整写入

## 我的命令（按执行顺序）

### 1. 查任务上下文（写稿前必查）
```
node social-skill-cli.mjs get_task_context --taskId=task-xxx
```
- 看平台、素材、风格要求，决定写哪些平台

### 2. 提交草稿（一个平台一条，不能混）
```
node social-skill-cli.mjs submit_draft --taskId=task-xxx --platform=小红书 --title=标题 --content=正文...
node social-skill-cli.mjs submit_draft --taskId=task-xxx --platform=公众号 --title=标题 --content=正文...
node social-skill-cli.mjs submit_draft --taskId=task-xxx --platform=知乎 --title=标题 --content=正文...
```
- `platform` 必填；`title`、`content` 必须完整
- 每写完一个平台立刻 `submit_draft`，不要等全部写完再一次性提交

### 3. 退回重写时
- 再次 `submit_draft` 同平台，提交新版本即可
