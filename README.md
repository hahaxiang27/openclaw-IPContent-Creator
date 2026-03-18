# 飞书 + 多 Agent Team：基于 A2A 的社媒内容创作一体化流程

把飞书里的**统筹龙虾、资讯龙虾、创作龙虾**接入同一条本地内容流水线，通过 A2A（Agent-to-Agent）协作完成从创作意图到待审核稿件的全流程，并在 Web 指挥台统一管理任务、素材、草稿与发布留档。

---

## 一、创建方法

### 1.1 整体架构

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           飞书（Feishu）                                  │
│  ┌─────────────┐    A2A 调用    ┌─────────────┐    A2A 调用    ┌─────────┐ │
│  │ 统筹龙虾     │ ◄──────────► │ 资讯龙虾     │                │ 创作龙虾 │ │
│  │ Coordinator │               │ Researcher   │                │ Creator  │ │
│  └──────┬──────┘               └──────┬───────┘                └────┬────┘ │
│         │                             │                             │      │
│         └─────────────────────────────┼─────────────────────────────┘      │
│                                       │ 执行 CLI 命令                       │
└───────────────────────────────────────┼─────────────────────────────────────┘
                                        │ HTTP (localhost:3030)
                                        ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                    龙虾社媒指挥台（本地）                                    │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────────────┐ │
│  │ social-skill-cli │───►│  REST API       │───►│ social-system-store     │ │
│  │ (CLI 入口)       │    │  (app-handler)  │    │ (JSON 持久化)           │ │
│  └─────────────────┘    └─────────────────┘    └───────────┬─────────────┘ │
│                                                             │              │
│                                                             ▼              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Web 前端：仪表盘 / 编辑页 / 历史留档                                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────────────────────────────┘
```

### 1.2 技术栈与项目结构

| 层级 | 技术 | 说明 |
|------|------|------|
| 运行环境 | Node.js 18+ | 纯 ESM 模块 |
| 后端 | 原生 `node:http` | 无框架，`server.js` + `app-handler.js` |
| 存储 | JSON 文件 | `data/social-system.json`，可 `SOCIAL_SYSTEM_DATA_FILE` 覆盖 |
| 前端 | 原生 HTML/CSS/JS | 无框架，`index.html` / `editor.html` / `history.html` |
| 飞书交互 | Skill + CLI | 龙虾执行 `social-skill-cli.mjs` 调用本地 API |

**核心文件：**

- `server.js` — HTTP 服务入口（默认 3030 端口）
- `app-handler.js` — REST API 路由与请求处理
- `social-system-store.js` — 任务 / 素材 / 草稿 / 发布 的业务逻辑与持久化
- `social-skill-cli.mjs` — 供飞书龙虾调用的 CLI 入口
- `client.js` / `editor.js` / `history.js` — 前端页面逻辑
- `skills/` — 各龙虾的 Skill 定义（统筹 / 资讯 / 创作 + 基座）

### 1.3 飞书龙虾 Skill 安装

在飞书中创建三个 Agent（或使用多 Agent 编排），分别配置以下 Skill：

**统筹龙虾** — 学习 `lobster-coordinator`  
**资讯龙虾** — 学习 `lobster-researcher`  
**创作龙虾** — 学习 `lobster-creator`  

Skill 文件位于本仓库（每个龙虾仅加载对应一份）：

- `skills/lobster-coordinator/SKILL.md`
- `skills/lobster-researcher/SKILL.md`
- `skills/lobster-creator/SKILL.md`

若 Skill 托管在 GitHub，可用 raw 链接，例如：

```
https://raw.githubusercontent.com/<org>/<repo>/master/skills/lobster-coordinator/SKILL.md
```

### 1.4 API 与 CLI 能力

**主要 API：**

- `POST /api/tasks` — 创建任务
- `POST /api/tasks/:taskId/assignments` — 分派子任务
- `POST /api/tasks/:taskId/materials` — 追加素材
- `POST /api/drafts` — 提交草稿
- `GET /api/context/:taskId` — 获取任务上下文（供龙虾决策）
- `POST /api/tasks/:taskId/review-needed` — 标记待审核
- `POST /api/drafts/:draftId/publish` — 标记已发布

**CLI 命令（龙虾执行）：**

```powershell
node social-skill-cli.mjs create_task --title=... --goal=... --platforms=小红书,公众号 --needsResearch=true
node social-skill-cli.mjs assign_subtask --taskId=... --workerId=worker-research --type=research --context=...
node social-skill-cli.mjs append_material --taskId=... --title=... --type=url --content=...
node social-skill-cli.mjs submit_draft --taskId=... --platform=小红书 --title=... --content=...
node social-skill-cli.mjs get_task_context --taskId=...
node social-skill-cli.mjs mark_review_needed --taskId=...
node social-skill-cli.mjs mark_published --draftId=... --url=https://...
```

---

## 二、使用方法

### 2.1 启动本地服务

```powershell
cd d:\AIAI\龙虾社媒管理页面
npm start
# 或开发模式（热重载）
npm run dev
```

服务默认监听 `http://localhost:3030`。龙虾执行 CLI 时需确保服务已启动。

### 2.2 飞书中发起创作

1. 在飞书对话中，向**统筹龙虾**说出创作意图，例如：
   - 「帮我写一篇关于 XX 产品的小红书、公众号、知乎三平台的推广文，需要先查一下行业背景」
2. 统筹龙虾会：
   - 执行 `create_task` 创建任务
   - 若需要资讯补充，通过 A2A 调用资讯龙虾
   - 资讯龙虾搜集素材后，逐条 `append_material` 写回系统
   - 素材就绪后，统筹通过 A2A 调用创作龙虾
   - 创作龙虾按平台 `submit_draft` 回写
   - 全部草稿就绪后，统筹执行 `mark_review_needed`

### 2.3 在指挥台审核与发布

1. 打开 `http://localhost:3030` 进入仪表盘
2. 在「内容池」中按平台浏览待审核稿件
3. 点击文章进入编辑页，进行：
   - 批准 / 退回重写 / 直接编辑
4. 批准后可同步到平台草稿箱或标记已发布
5. 发布后可在「历史留档」查看链接与数据

### 2.4 强制回写规则（务必遵守）

**不回写系统 = 任务未完成。** 龙虾必须在对话之外，通过 CLI 把结果写回系统：

| 角色 | 完成后必须执行 |
|------|----------------|
| 统筹 | `create_task` / `assign_subtask` / `mark_review_needed` / `mark_published` |
| 资讯 | 每一条素材 `append_material`；阶段结束 `update_task_status` |
| 创作 | 每个平台 `submit_draft`，一个平台一条 |

分派子任务时，统筹应在 `--context` 中明确要求子龙虾回写。

---

## 三、最终效果

### 3.1 端到端流程

```
用户发话（飞书）
    │
    ▼
统筹龙虾：解析意图 → create_task → 判断是否需资讯
    │
    ├─ 需要 → assign_subtask(资讯) → 资讯龙虾
    │           │
    │           ▼
    │        append_material × N → update_task_status
    │
    ├─ 素材就绪 → assign_subtask(创作) → 创作龙虾
    │               │
    │               ▼
    │            submit_draft(小红书) → submit_draft(公众号) → submit_draft(知乎)
    │
    └─ 草稿到齐 → mark_review_needed → 提醒用户
                         │
                         ▼
用户打开指挥台 → 内容池出现待审核帖子 → 审核 / 编辑 / 批准 / 发布
                         │
                         ▼
               mark_published → 历史留档可见
```

### 3.2 用户视角的收获

- **入口统一**：在飞书里用自然语言说一句，即可启动多平台内容生产
- **角色分工清晰**：统筹拆任务、资讯补资料、创作出稿，各司其职
- **数据可追溯**：任务、素材、草稿、发布记录都在指挥台可查
- **审核集中**：所有待审核稿件在同一个页面呈现，按平台筛选
- **留档可查**：发布后的链接、阅读量、互动等可集中管理

### 3.3 指挥台页面

| 页面 | 功能 |
|------|------|
| 仪表盘 (`/`) | 统计概览、内容池（按平台切换）、历史留档列表 |
| 编辑页 (`/editor.html?id=...`) | 查看 / 编辑草稿，审核（批准 / 退回 / 编辑），同步 / 发布 |
| 历史留档 (`/history.html?id=...`) | 查看单次发布的完整留档与数据 |

### 3.4 数据自动更新

- 前端每 30 秒轮询 `/api/bootstrap` 等接口，自动刷新
- 龙虾通过 CLI 回写后，刷新即可看到最新任务、素材、草稿
- 无需手动导入导出，全程通过 API 与 JSON 存储同步

---

## 快速开始

```powershell
# 1. 启动服务
npm start

# 2. 在飞书中对统筹龙虾说：帮我写一篇关于 XX 的小红书推广文，需要查资料

# 3. 打开 http://localhost:3030 等待草稿回写完成，进入编辑页审核
```
