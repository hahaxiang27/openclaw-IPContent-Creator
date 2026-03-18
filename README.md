# 龙虾社媒指挥台

本项目实现了一个本地运行的社媒内容协作系统，核心目标是把飞书中的统筹龙虾、资讯龙虾、创作龙虾接入同一条内容生产流水线。

## 已实现能力

- 本地 Web 指挥台：任务池、龙虾工作台、今日初稿池、待发布池、已发布池、历史留档。
- 本地 API：支持 `create_task`、`assign_subtask`、`append_material`、`submit_draft`、`update_task_status`、`list_my_queue`、`get_task_context`、`mark_review_needed`、`mark_published`。
- 本地 skill CLI：`social-skill-cli.mjs` 可作为不同龙虾 skill 的底层调用工具。
- 数据落盘：默认写入 `data/social-system.json`。

## 运行方式

```powershell
node server.js
```

启动后访问 [http://localhost:3030](http://localhost:3030)。

## 常用 CLI 示例

```powershell
node social-skill-cli.mjs create_task --title=今天的AI总结 --goal=根据活动笔记生成小红书和公众号初稿 --platforms=小红书,公众号 --needsResearch=true --material=这是我今天的活动记录
node social-skill-cli.mjs list_my_queue --workerId=worker-creator
node social-skill-cli.mjs get_task_context --taskId=task-xxxx
```

## 测试

```powershell
node --test
```

## 文件说明

- `server.js`：本地 HTTP 服务入口。
- `app-handler.js`：API 路由和静态资源分发。
- `social-system-store.js`：数据模型、状态流转和种子数据。
- `index.html` / `styles.css` / `client.js`：本地控制台前端。
- `social-skill-cli.mjs`：供 skill / 龙虾调用的本地命令入口。
