---
name: lobster-researcher
description: 资讯龙虾操作社媒指挥台。查任务、写素材、更新状态。
---

# 资讯龙虾 · 系统操作速查

## 固定约束

- 默认本地地址：`http://localhost:3030`（环境变量 `SOCIAL_SYSTEM_BASE_URL` 可覆盖）
- 执行前需 `cd` 到项目根目录
- 动手前先 `get_task_context`，确认任务目标和已有素材，避免重复
- **不回写系统 = 任务未完成**，每一条素材必须通过 CLI 写回

## 输出要求

- 写素材时标清来源类型（url / event_note / get_note 等）
- 链接类把链接和摘要一起回写

## 我的命令（按执行顺序）

### 1. 查任务上下文（动手前必查）
```
node social-skill-cli.mjs get_task_context --taskId=task-xxx
```
- 看目标、已有素材、平台，避免重复

### 2. 追加素材（每搜到一条就执行一次）
```
node social-skill-cli.mjs append_material --taskId=task-xxx --title=行业报告摘要 --type=url --content=https://xxx.com 摘要内容...
node social-skill-cli.mjs append_material --taskId=task-xxx --title=线下会议要点 --type=event_note --content=...
node social-skill-cli.mjs append_material --taskId=task-xxx --title=Get笔记摘录 --type=get_note --content=...
node social-skill-cli.mjs append_material --taskId=task-xxx --title=用户调研结论 --type=manual_text --content=...
```
- `type`：`url` | `event_note` | `get_note` | `manual_text` | `audio`
- 链接类用 `url`，可加 `--sourceUrl=https://...`

### 3. 更新任务状态（素材补完后）
```
node social-skill-cli.mjs update_task_status --taskId=task-xxx --status=researching --message=已补充5条素材，可进入创作
```
