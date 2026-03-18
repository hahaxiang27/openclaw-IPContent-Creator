import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const DEFAULT_DATA_FILE = path.join(process.cwd(), "data", "social-system.json");

const WORKERS = [
  {
    id: "worker-coordinator",
    name: "统筹龙虾",
    role: "coordinator",
    status: "busy",
    tagline: "接收飞书意图，拆任务、盯进度、催审核",
    avgDurationMinutes: 18,
    failureCount: 1,
    skills: ["social-system-base", "lobster-coordinator"],
    recentTaskId: "task-seed-review"
  },
  {
    id: "worker-research",
    name: "资讯龙虾",
    role: "researcher",
    status: "attention",
    tagline: "热点捕捉、资料补充、素材清洗",
    avgDurationMinutes: 26,
    failureCount: 2,
    skills: ["social-system-base", "lobster-researcher"],
    recentTaskId: "task-seed-review"
  },
  {
    id: "worker-creator",
    name: "创作龙虾",
    role: "creator",
    status: "busy",
    tagline: "多平台改写、版本提交、根据反馈重写",
    avgDurationMinutes: 39,
    failureCount: 0,
    skills: ["social-system-base", "lobster-creator"],
    recentTaskId: "task-seed-review"
  }
];

function now() {
  return new Date().toISOString();
}

function createId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeArray(input) {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input.map((item) => `${item}`.trim()).filter(Boolean);
  }
  return `${input}`
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function statusLabel(code) {
  const labels = {
    pending: "待创建",
    assigned: "已分派",
    researching: "采集中",
    drafting: "创作中",
    review: "待审核",
    publishing: "待发布",
    published: "已发布",
    archived: "已归档",
    pending_assignment: "待领取",
    in_progress: "执行中",
    completed: "已完成",
    failed: "失败",
    retried: "已重试",
    generating: "生成中",
    pending_review: "待审核",
    rewrite_requested: "已退回",
    approved: "已批准",
    not_ready: "未到发布",
    pending_sync: "待同步",
    syncing: "同步中",
    synced: "已同步",
    idle: "空闲",
    busy: "处理中",
    attention: "待确认",
    error: "异常"
  };
  return labels[code] || code;
}

function workerName(data, workerId) {
  return data.workers.find((worker) => worker.id === workerId)?.name || "未指派";
}

const DEFAULT_PLATFORMS = ["小红书", "公众号", "知乎"];

function seedData() {
  const seededAt = now();
  const workers = WORKERS.map((w) => ({
    ...w,
    status: "idle",
    recentTaskId: null
  }));
  return {
    meta: {
      version: 1,
      seededAt
    },
    platforms: DEFAULT_PLATFORMS,
    workers,
    tasks: [],
    assignments: [],
    materials: [],
    drafts: [],
    logs: [],
    publishRecords: []
  };
}

function completeLatestAssignment(data, taskId, workerId, type) {
  const assignment = data.assignments.find(
    (item) => item.taskId === taskId && item.workerId === workerId && item.type === type && item.status !== "completed"
  );
  if (assignment) {
    assignment.status = "completed";
    assignment.updatedAt = now();
  }
}

function refreshTaskStatus(data, taskId) {
  const task = data.tasks.find((item) => item.id === taskId);
  if (!task) return;

  const taskDrafts = data.drafts.filter((draft) => draft.taskId === taskId);
  const publishedCount = taskDrafts.filter((draft) => draft.publishStatus === "published").length;
  const approvedCount = taskDrafts.filter((draft) => draft.reviewStatus === "approved").length;
  const pendingReviewCount = taskDrafts.filter((draft) => draft.reviewStatus === "pending_review").length;
  const rewriteCount = taskDrafts.filter((draft) => draft.reviewStatus === "rewrite_requested").length;
  const syncedCount = taskDrafts.filter((draft) => draft.publishStatus === "synced").length;

  if (taskDrafts.length > 0 && publishedCount === taskDrafts.length) {
    task.status = "published";
    task.publishedAt = now();
    task.currentOwnerId = "worker-coordinator";
    return;
  }
  if (rewriteCount > 0) {
    task.status = "drafting";
    task.currentOwnerId = "worker-creator";
    return;
  }
  if (pendingReviewCount > 0) {
    task.status = "review";
    task.currentOwnerId = "worker-coordinator";
    return;
  }
  if (approvedCount > 0 || syncedCount > 0) {
    task.status = "publishing";
    task.currentOwnerId = "worker-coordinator";
  }
}

function buildDashboard(data) {
  const waitingReview = data.drafts.filter((draft) => draft.reviewStatus === "pending_review").length;
  const readyToPublish = data.drafts.filter((draft) => draft.reviewStatus === "approved").length;
  return {
    headline: "飞书龙虾协作式社媒系统",
    subline: "把飞书里的分工龙虾、素材池、审核池和发布池收进同一条本地内容流水线。",
    platforms: data.platforms || DEFAULT_PLATFORMS,
    stats: [
      { key: "tasks", label: "任务总数", value: data.tasks.length },
      { key: "review", label: "待审核草稿", value: waitingReview },
      { key: "publish", label: "待发布草稿", value: readyToPublish },
      { key: "history", label: "已发布留档", value: data.publishRecords.length }
    ]
  };
}

function buildWorkerCard(data, worker) {
  const queue = data.assignments.filter(
    (assignment) => assignment.workerId === worker.id && assignment.status !== "completed"
  );
  return {
    ...worker,
    statusLabel: statusLabel(worker.status),
    queueCount: queue.length,
    recentTaskTitle: data.tasks.find((task) => task.id === worker.recentTaskId)?.title || "暂无"
  };
}

function buildTaskSummary(data, task) {
  if (!task) return null;
  const drafts = data.drafts.filter((draft) => draft.taskId === task.id);
  const materials = data.materials.filter((material) => material.taskId === task.id);
  const publishRecords = data.publishRecords.filter((record) => record.taskId === task.id);
  return {
    ...task,
    statusLabel: statusLabel(task.status),
    currentOwnerName: workerName(data, task.currentOwnerId),
    draftCount: drafts.length,
    materialCount: materials.length,
    publishedCount: publishRecords.length
  };
}

function buildTaskDetail(data, task) {
  return {
    ...buildTaskSummary(data, task),
    assignments: data.assignments
      .filter((assignment) => assignment.taskId === task.id)
      .map((assignment) => ({
        ...assignment,
        workerName: workerName(data, assignment.workerId),
        statusLabel: statusLabel(assignment.status)
      })),
    materials: data.materials.filter((material) => material.taskId === task.id),
    drafts: data.drafts
      .filter((draft) => draft.taskId === task.id)
      .map((draft) => ({
        ...draft,
        reviewStatusLabel: statusLabel(draft.reviewStatus),
        publishStatusLabel: statusLabel(draft.publishStatus),
        assignedWorkerName: workerName(data, draft.assignedWorkerId)
      })),
    logs: data.logs.filter((log) => log.taskId === task.id),
    publishRecords: data.publishRecords.filter((record) => record.taskId === task.id)
  };
}

function buildHistory(data) {
  return data.publishRecords.map((record) => {
    const task = data.tasks.find((item) => item.id === record.taskId);
    const draft = data.drafts.find((item) => item.id === record.draftId);
    const materials = data.materials.filter((item) => item.taskId === record.taskId);
    return {
      ...record,
      taskTitle: task?.title || "未知任务",
      platform: draft?.platform || record.platform,
      materialTrail: materials.map((material) => material.title),
      taskStatusLabel: statusLabel(task?.status)
    };
  });
}

export class SocialSystemStore {
  constructor(filePath = DEFAULT_DATA_FILE) {
    this.filePath = filePath || DEFAULT_DATA_FILE;
  }

  async init() {
    try {
      const data = await this.read();
      let changed = false;
      if (!data.platforms) {
        data.platforms = DEFAULT_PLATFORMS;
        changed = true;
      }
      const seedTaskIds = ["task-seed-review", "task-seed-published"];
      const hasSeedTasks = data.tasks?.some((t) => seedTaskIds.includes(t.id));
      if (hasSeedTasks) {
        data.tasks = [];
        data.assignments = [];
        data.materials = [];
        data.drafts = [];
        data.logs = [];
        data.publishRecords = [];
        data.workers = (data.workers || WORKERS).map((w) => ({
          ...w,
          status: "idle",
          recentTaskId: null
        }));
        changed = true;
      }
      if (changed) await this.write(data);
    } catch {
      await mkdir(path.dirname(this.filePath), { recursive: true });
      await this.write(seedData());
    }
  }

  async read() {
    const raw = await readFile(this.filePath, "utf8");
    return JSON.parse(raw);
  }

  async write(data) {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, JSON.stringify(data, null, 2), "utf8");
  }

  async listBootstrap() {
    const data = await this.read();
    return {
      dashboard: buildDashboard(data),
      workers: data.workers.map((worker) => buildWorkerCard(data, worker)),
      tasks: data.tasks.map((task) => buildTaskSummary(data, task)),
      history: buildHistory(data)
    };
  }

  async listTasks() {
    const data = await this.read();
    return data.tasks.map((task) => buildTaskSummary(data, task));
  }

  async getTaskContext(taskId) {
    const data = await this.read();
    const task = data.tasks.find((item) => item.id === taskId);
    if (!task) {
      throw new Error("TASK_NOT_FOUND");
    }
    return buildTaskDetail(data, task);
  }

  async createTask(input) {
    const data = await this.read();
    const createdAt = now();
    const taskId = createId("task");
    const platforms = normalizeArray(input.platforms);
    const materialEntries = (input.materials || []).map((material) => ({
      id: createId("material"),
      taskId,
      type: material.type || "manual_text",
      title: material.title || "未命名素材",
      content: material.content || "",
      sourceUrl: material.sourceUrl || "",
      tags: normalizeArray(material.tags),
      createdAt
    }));
    const task = {
      id: taskId,
      title: input.title,
      goal: input.goal,
      type: input.type || "manual_creation",
      priority: input.priority || "medium",
      origin: input.origin || "飞书统筹指令",
      platforms,
      status: input.needsResearch ? "researching" : "drafting",
      currentOwnerId: input.needsResearch ? "worker-research" : "worker-creator",
      needsResearch: Boolean(input.needsResearch),
      createdAt,
      updatedAt: createdAt
    };

    const assignments = [
      {
        id: createId("assignment"),
        taskId,
        workerId: "worker-coordinator",
        type: "orchestration",
        status: "completed",
        inputContext: "接收飞书指令并创建协作任务。",
        dueAt: createdAt,
        createdAt,
        updatedAt: createdAt
      },
      {
        id: createId("assignment"),
        taskId,
        workerId: input.needsResearch ? "worker-research" : "worker-creator",
        type: input.needsResearch ? "research" : "draft",
        status: "in_progress",
        inputContext: input.needsResearch ? "优先补齐背景信息和链接摘要。" : "直接生成多平台初稿。",
        dueAt: createdAt,
        createdAt,
        updatedAt: createdAt
      }
    ];

    const logs = [
      {
        id: createId("log"),
        taskId,
        workerId: "worker-coordinator",
        action: "create_task",
        message: `创建任务：${input.title}`,
        result: "success",
        durationMs: 800,
        createdAt
      }
    ];

    data.tasks.unshift(task);
    data.materials.unshift(...materialEntries);
    data.assignments.unshift(...assignments);
    data.logs.unshift(...logs);
    data.workers = data.workers.map((worker) =>
      worker.id === task.currentOwnerId ? { ...worker, status: "busy", recentTaskId: taskId } : worker
    );

    await this.write(data);
    return buildTaskDetail(data, task);
  }

  async assignSubtask(taskId, input) {
    const data = await this.read();
    const task = data.tasks.find((item) => item.id === taskId);
    if (!task) {
      throw new Error("TASK_NOT_FOUND");
    }

    const assignment = {
      id: createId("assignment"),
      taskId,
      workerId: input.workerId,
      type: input.type || "draft",
      status: input.status || "pending_assignment",
      inputContext: input.inputContext || "",
      dueAt: input.dueAt || now(),
      createdAt: now(),
      updatedAt: now()
    };

    data.assignments.unshift(assignment);
    task.currentOwnerId = input.workerId;
    task.status = input.type === "research" ? "researching" : "drafting";
    task.updatedAt = now();

    data.logs.unshift({
      id: createId("log"),
      taskId,
      workerId: "worker-coordinator",
      action: "assign_subtask",
      message: `已分派给 ${workerName(data, input.workerId)} 处理 ${assignment.type}。`,
      result: "success",
      durationMs: 900,
      createdAt: now()
    });

    await this.write(data);
    return buildTaskDetail(data, task);
  }

  async appendMaterial(taskId, input) {
    const data = await this.read();
    const task = data.tasks.find((item) => item.id === taskId);
    if (!task) {
      throw new Error("TASK_NOT_FOUND");
    }

    const material = {
      id: createId("material"),
      taskId,
      type: input.type || "manual_text",
      title: input.title || "新增素材",
      content: input.content || "",
      sourceUrl: input.sourceUrl || "",
      tags: normalizeArray(input.tags),
      createdAt: now()
    };

    data.materials.unshift(material);
    task.updatedAt = now();
    if (material.type === "audio") {
      task.status = "researching";
    }
    data.logs.unshift({
      id: createId("log"),
      taskId,
      workerId: input.workerId || "worker-research",
      action: "append_material",
      message: `新增素材：${material.title}`,
      result: "success",
      durationMs: 1200,
      createdAt: now()
    });

    await this.write(data);
    return material;
  }

  async submitDraft(input) {
    const data = await this.read();
    const task = data.tasks.find((item) => item.id === input.taskId);
    if (!task) {
      throw new Error("TASK_NOT_FOUND");
    }

    const existing = data.drafts.find(
      (draft) => draft.taskId === input.taskId && draft.platform === input.platform
    );
    const timestamp = now();
    const draft = existing || {
      id: createId("draft"),
      taskId: input.taskId,
      platform: input.platform,
      version: 0,
      createdAt: timestamp
    };

    draft.title = input.title || draft.title || `${input.platform} 初稿`;
    draft.content = input.content || draft.content || "";
    draft.version += 1;
    draft.reviewStatus = "pending_review";
    draft.publishStatus = "pending_sync";
    draft.assignedWorkerId = input.workerId || "worker-creator";
    draft.materialIds = normalizeArray(input.materialIds);
    draft.updatedAt = timestamp;

    if (!existing) {
      data.drafts.unshift(draft);
    }

    task.status = "review";
    task.currentOwnerId = "worker-coordinator";
    task.reviewRequestedAt = timestamp;
    task.updatedAt = timestamp;

    completeLatestAssignment(data, input.taskId, draft.assignedWorkerId, "draft");

    data.logs.unshift({
      id: createId("log"),
      taskId: input.taskId,
      workerId: draft.assignedWorkerId,
      action: "submit_draft",
      message: `${draft.platform} 初稿已提交审核。`,
      result: "success",
      durationMs: Number(input.durationMs || 10000),
      createdAt: timestamp
    });

    data.workers = data.workers.map((worker) =>
      worker.id === draft.assignedWorkerId
        ? { ...worker, status: "attention", recentTaskId: input.taskId }
        : worker
    );

    await this.write(data);
    return buildTaskDetail(data, task);
  }

  async updateTaskStatus(taskId, input) {
    const data = await this.read();
    const task = data.tasks.find((item) => item.id === taskId);
    if (!task) {
      throw new Error("TASK_NOT_FOUND");
    }

    task.status = input.status || task.status;
    task.currentOwnerId = input.currentOwnerId || task.currentOwnerId;
    task.updatedAt = now();

    data.logs.unshift({
      id: createId("log"),
      taskId,
      workerId: input.workerId || "worker-coordinator",
      action: "update_task_status",
      message: input.message || `任务状态更新为 ${statusLabel(task.status)}。`,
      result: "success",
      durationMs: 300,
      createdAt: now()
    });

    await this.write(data);
    return buildTaskDetail(data, task);
  }

  async markReviewNeeded(taskId, input = {}) {
    const data = await this.read();
    const task = data.tasks.find((item) => item.id === taskId);
    if (!task) {
      throw new Error("TASK_NOT_FOUND");
    }

    task.status = "review";
    task.currentOwnerId = "worker-coordinator";
    task.reviewRequestedAt = now();
    task.updatedAt = now();

    data.logs.unshift({
      id: createId("log"),
      taskId,
      workerId: input.workerId || "worker-coordinator",
      action: "mark_review_needed",
      message: input.message || "统筹龙虾已提醒你进入页面审核。",
      result: "success",
      durationMs: 200,
      createdAt: now()
    });

    await this.write(data);
    return buildTaskDetail(data, task);
  }

  async reviewDraft(draftId, input) {
    const data = await this.read();
    const draft = data.drafts.find((item) => item.id === draftId);
    if (!draft) {
      throw new Error("DRAFT_NOT_FOUND");
    }

    const task = data.tasks.find((item) => item.id === draft.taskId);
    const timestamp = now();

    if (input.title) {
      draft.title = input.title;
    }
    if (input.content) {
      draft.content = input.content;
    }
    draft.updatedAt = timestamp;

    if (input.action === "approve") {
      draft.reviewStatus = "approved";
      draft.publishStatus = draft.publishStatus === "published" ? "published" : "pending_sync";
      task.status = "publishing";
      task.currentOwnerId = "worker-coordinator";
    }

    if (input.action === "request_rewrite") {
      draft.reviewStatus = "rewrite_requested";
      draft.publishStatus = "not_ready";
      task.status = "drafting";
      task.currentOwnerId = "worker-creator";
      data.assignments.unshift({
        id: createId("assignment"),
        taskId: task.id,
        workerId: "worker-creator",
        type: "rewrite",
        status: "in_progress",
        inputContext: input.message || "根据审核意见重写草稿。",
        dueAt: timestamp,
        createdAt: timestamp,
        updatedAt: timestamp
      });
    }

    if (input.action === "edit") {
      draft.version += 1;
    }

    task.updatedAt = timestamp;
    refreshTaskStatus(data, task.id);

    data.logs.unshift({
      id: createId("log"),
      taskId: task.id,
      workerId: input.workerId || "user-review",
      action: "review_draft",
      message:
        input.message ||
        (input.action === "approve" ? `${draft.platform} 草稿已批准。` : `${draft.platform} 草稿已退回重写。`),
      result: "success",
      durationMs: 500,
      createdAt: timestamp
    });

    await this.write(data);
    return buildTaskDetail(data, task);
  }

  async syncDraft(draftId, input = {}) {
    const data = await this.read();
    const draft = data.drafts.find((item) => item.id === draftId);
    if (!draft) {
      throw new Error("DRAFT_NOT_FOUND");
    }

    draft.publishStatus = input.status || "synced";
    draft.updatedAt = now();

    const task = data.tasks.find((item) => item.id === draft.taskId);
    refreshTaskStatus(data, task.id);
    data.logs.unshift({
      id: createId("log"),
      taskId: task.id,
      workerId: input.workerId || "worker-coordinator",
      action: "sync_draft",
      message: `${draft.platform} 已同步到平台草稿箱。`,
      result: "success",
      durationMs: 1600,
      createdAt: now()
    });

    await this.write(data);
    return buildTaskDetail(data, task);
  }

  async markPublished(draftId, input) {
    const data = await this.read();
    const draft = data.drafts.find((item) => item.id === draftId);
    if (!draft) {
      throw new Error("DRAFT_NOT_FOUND");
    }

    const task = data.tasks.find((item) => item.id === draft.taskId);
    const timestamp = now();
    draft.publishStatus = "published";
    draft.reviewStatus = "approved";
    draft.publishedAt = timestamp;
    draft.updatedAt = timestamp;

    data.publishRecords.unshift({
      id: createId("publish"),
      taskId: task.id,
      draftId,
      platform: draft.platform,
      url: input.url,
      publishedAt: timestamp,
      finalTitle: draft.title,
      metrics: {
        views: Number(input.views || 0),
        likes: Number(input.likes || 0),
        bookmarks: Number(input.bookmarks || 0),
        comments: Number(input.comments || 0),
        shares: Number(input.shares || 0)
      }
    });

    refreshTaskStatus(data, task.id);
    data.logs.unshift({
      id: createId("log"),
      taskId: task.id,
      workerId: input.workerId || "user-review",
      action: "mark_published",
      message: `${draft.platform} 已发布并回填链接。`,
      result: "success",
      durationMs: 700,
      createdAt: timestamp
    });

    await this.write(data);
    return buildTaskDetail(data, task);
  }

  async listQueue(workerId) {
    const data = await this.read();
    return data.assignments
      .filter((assignment) => assignment.workerId === workerId && assignment.status !== "completed")
      .map((assignment) => ({
        ...assignment,
        statusLabel: statusLabel(assignment.status),
        task: buildTaskSummary(data, data.tasks.find((task) => task.id === assignment.taskId))
      }));
  }

  async listHistory() {
    const data = await this.read();
    return buildHistory(data);
  }
}
