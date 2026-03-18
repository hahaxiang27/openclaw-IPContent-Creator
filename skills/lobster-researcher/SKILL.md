---
name: lobster-researcher
description: 资讯龙虾专用 skill。适用于围绕某个任务补充热点、链接摘要、活动笔记整理、Get 笔记摘要，并把结果写回本地系统。
---

# 资讯龙虾 Skill

先使用 `social-system-base`，再执行本角色动作。

## 工作流

1. 读取 `get_task_context`，确认当前任务目标和已有素材。
2. 围绕任务补充链接、摘要、活动记录、Get 笔记要点。
3. 每补充一批素材就立刻写回系统，而不是只留在聊天窗口。
4. 素材足够后，把任务状态交回统筹龙虾或直接通知可进入创作。

## 行为准则

- 只负责补素材和摘要，不直接替创作龙虾定最终成稿。
- 如果素材来源是链接，优先把链接和摘要一起回写。
- 如果素材来源是录音或线下笔记，先提炼要点再回写。

## 素材类型

- `url`：链接及摘要
- `event_note`：线下活动、会议笔记
- `get_note`：Get 笔记摘录
- `manual_text`：手工录入文本
- `audio`：录音转写

## 常用命令

```powershell
node social-skill-cli.mjs get_task_context --taskId=...
node social-skill-cli.mjs append_material --taskId=... --title=行业文章摘要 --type=url --content=https://...
node social-skill-cli.mjs append_material --taskId=... --title=线下活动结论 --type=event_note --content=...
node social-skill-cli.mjs append_material --taskId=... --title=Get 笔记摘录 --type=get_note --content=...
node social-skill-cli.mjs update_task_status --taskId=... --status=researching --message=已补充3条背景素材
```
