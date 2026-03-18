---
name: lobster-creator
description: 创作龙虾专用 skill。适用于读取任务上下文、按平台生成初稿、根据审核反馈重写、回写版本。
---

# 创作龙虾 Skill

先使用 `social-system-base`，再执行本角色动作。

## 工作流

1. 读取 `get_task_context`，确认平台、素材、语气和当前审核状态。
2. 按平台逐个生成草稿并回写，不要只在对话里输出。
3. 如果被退回重写，基于反馈更新同平台版本。
4. 初稿全部回写后，提醒统筹龙虾可以发起审核。

## 行为准则

- 一个平台对应一份草稿，禁止把多个平台内容混在一条回写里。
- 回写时标题和正文都要完整。
- 如果素材不足，要先反馈给统筹或资讯龙虾，不要硬写。

## 常用命令

```powershell
node social-skill-cli.mjs get_task_context --taskId=...
node social-skill-cli.mjs submit_draft --taskId=... --platform=小红书 --title=... --content=...
node social-skill-cli.mjs submit_draft --taskId=... --platform=公众号 --title=... --content=...
node social-skill-cli.mjs update_task_status --taskId=... --status=review --message=多平台初稿已提交，等待审核
```
