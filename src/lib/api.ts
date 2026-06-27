import {
  AgentActionCard,
  AgentRunResult,
  CarbonCyclePlan,
  DayPlan,
  DayType,
  HistoricalReport,
  LogStats,
  UserProfile,
} from "@/lib/types";
import { userStorage } from "@/lib/storage";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";
const DEMO_USER_ID = "1";
const DEMO_EMAIL = "demo@fitagent.local";
const DEMO_PASSWORD = "password123";

type ApiEnvelope<T> = {
  code: number;
  message: string;
  data: T;
  timestamp?: string;
};

type AnyRecord = Record<string, unknown>;

type ChatStreamChunk =
  | { type: "session"; session_id: string }
  | { type: "content"; content: string }
  | { type: "actions"; actions: AgentActionCard[] }
  | { type: "done"; message_id: string };

const asNumber = (value: unknown, fallback = 0) => {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") return Number(value);
  return fallback;
};

const asString = (value: unknown, fallback = "") => {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return fallback;
};

const toArray = <T>(value: unknown): T[] => (Array.isArray(value) ? value as T[] : []);

const BIG_ID_KEYS = [
  "id",
  "userId",
  "user_id",
  "planId",
  "plan_id",
  "logId",
  "log_id",
  "reportId",
  "report_id",
  "sessionId",
  "session_id",
  "messageId",
  "message_id",
  "runId",
  "run_id",
];

const quoteUnsafeIntegerIds = (json: string) => {
  const keyPattern = BIG_ID_KEYS.map(key => key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const idFieldPattern = new RegExp(`("(?:${keyPattern})"\\s*:\\s*)(-?\\d{16,})`, "g");
  return json.replace(idFieldPattern, "$1\"$2\"");
};

const parseJsonPreservingIds = (text: string) => {
  if (!text.trim()) return null;
  return JSON.parse(quoteUnsafeIntegerIds(text));
};

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(date.getDate() + days);
  return next.toISOString().split("T")[0];
};

const demoUser = (): UserProfile => ({
  id: DEMO_USER_ID,
  name: "Demo 用户",
  email: DEMO_EMAIL,
  gender: "male",
  birth_date: "1995-01-01",
  height_cm: 175,
  weight_kg: 75,
  target_weight_kg: 70,
  goal: "fat_loss",
  activity_level: "moderate",
  training_days_per_week: 4,
  dietary_preferences: ["高蛋白", "少油"],
  bmr: 1680,
  tdee: 2450,
});

const demoPlan = (userId = DEMO_USER_ID): CarbonCyclePlan => {
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const types: DayType[] = ["high_carb", "medium_carb", "low_carb", "high_carb", "medium_carb", "low_carb", "low_carb"];
  const macrosByType: Record<DayType, { protein_g: number; carbs_g: number; fat_g: number; fiber_g: number }> = {
    high_carb: { protein_g: 155, carbs_g: 280, fat_g: 52, fiber_g: 30 },
    medium_carb: { protein_g: 160, carbs_g: 190, fat_g: 65, fiber_g: 28 },
    low_carb: { protein_g: 170, carbs_g: 95, fat_g: 82, fiber_g: 25 },
    refeed: { protein_g: 150, carbs_g: 330, fat_g: 45, fiber_g: 30 },
  };
  const days = types.map((dayType, index): DayPlan => ({
    id: String(index + 1),
    plan_id: "demo-plan",
    date: addDays(monday, index),
    day_type: dayType,
    target_calories: macrosByType[dayType].protein_g * 4 + macrosByType[dayType].carbs_g * 4 + macrosByType[dayType].fat_g * 9,
    macros: macrosByType[dayType],
    training_scheduled: index < 5 && dayType !== "low_carb",
    training_type: dayType === "high_carb" ? "力量训练：深蹲 4x8、卧推 4x8、划船 4x10" : dayType === "medium_carb" ? "中等强度：肩背训练 + 20 分钟有氧" : "恢复日：步行 8000 步 + 拉伸",
    notes: dayType === "high_carb" ? "训练前后安排主食，优先米饭、土豆、燕麦。" : dayType === "medium_carb" ? "三餐均衡，晚餐减少精制碳水。" : "提高蔬菜和优质脂肪，避免饥饿感过强。",
  }));

  return {
    id: "demo-plan",
    user_id: userId,
    name: "Demo 碳循环计划",
    start_date: days[0].date,
    end_date: days[days.length - 1].date,
    cycle_length_days: 7,
    base_calories: 2200,
    goal_deficit: -500,
    is_active: true,
    notes: "本地 Demo 数据，用于无后端时预览页面。",
    days,
    average_daily_calories: Math.round(days.reduce((sum, day) => sum + (day.target_calories || 0), 0) / days.length),
    day_type_counts: { high_carb: 2, medium_carb: 2, low_carb: 3 },
  };
};

const demoLogStats = (userId: string, days: number): LogStats => ({
  user_id: userId,
  days,
  log_count: 5,
  avg_calories: 1980,
  avg_protein: 148,
  avg_carbs: 168,
  avg_fat: 61,
  avg_water_ml: 2300,
  training_completed_days: 3,
  training_completion_rate: 75,
});

const demoReport = (id = "demo-report"): HistoricalReport => ({
  id,
  week_start: addDays(new Date(), -6),
  week_end: addDays(new Date(), 0),
  calorie_rate: 88,
  training_rate: 75,
  avg_protein: 148,
  avg_carbs: 168,
  avg_fat: 61,
  weight_change: -0.4,
  summary: "本周整体执行不错，蛋白质摄入接近目标。建议高碳日继续绑定力量训练，低碳日关注睡眠和饥饿感。",
  recommendations: ["训练日前后补足碳水", "晚餐保持高蛋白", "继续记录体重趋势"],
});

const saveDemoSession = () => {
  userStorage.setToken("demo-token");
  userStorage.setUserId(DEMO_USER_ID);
  userStorage.setUserName("Demo 用户");
};

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const token = userStorage.getToken();

  if (!(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });

  if (response.status === 204) return undefined as T;

  const text = await response.text().catch(() => "");
  const payload = text ? parseJsonPreservingIds(text) : null;
  if (!response.ok) {
    const message = payload?.message || payload?.detail || response.statusText || "请求失败";
    throw new Error(message);
  }

  if (payload && typeof payload === "object" && "data" in payload) {
    const envelope = payload as ApiEnvelope<T>;
    if (envelope.code !== 0) throw new Error(envelope.message || "请求失败");
    return envelope.data;
  }

  return payload as T;
}

const toJavaUser = (input: AnyRecord) => ({
  name: input.name,
  email: input.email,
  password: input.password,
  gender: input.gender,
  birthDate: input.birthDate ?? input.birth_date,
  heightCm: input.heightCm ?? input.height_cm,
  weightKg: input.weightKg ?? input.weight_kg,
  targetWeightKg: input.targetWeightKg ?? input.target_weight_kg,
  goal: input.goal,
  activityLevel: input.activityLevel ?? input.activity_level,
  trainingDaysPerWeek: input.trainingDaysPerWeek ?? input.training_days_per_week,
  dietaryPreferences: input.dietaryPreferences ?? input.dietary_preferences ?? [],
});

const fromJavaUser = (input: AnyRecord): UserProfile => ({
  id: asString(input.id),
  name: asString(input.name, "未命名用户"),
  email: asString(input.email),
  gender: asString(input.gender, "male"),
  birth_date: asString(input.birthDate ?? input.birth_date, "1990-01-01"),
  height_cm: asNumber(input.heightCm ?? input.height_cm, 170),
  weight_kg: asNumber(input.weightKg ?? input.weight_kg, 70),
  target_weight_kg: input.targetWeightKg === null ? null : asNumber(input.targetWeightKg ?? input.target_weight_kg, 0) || null,
  goal: normalizeGoal(input.goal),
  activity_level: asString(input.activityLevel ?? input.activity_level, "moderate"),
  training_days_per_week: asNumber(input.trainingDaysPerWeek ?? input.training_days_per_week, 4),
  dietary_preferences: toArray<string>(input.dietaryPreferences ?? input.dietary_preferences),
  bmr: input.bmr === null ? null : asNumber(input.bmr, 0) || null,
  tdee: input.tdee === null ? null : asNumber(input.tdee, 0) || null,
});

const normalizeDayType = (value: unknown): DayType => {
  const text = asString(value, "medium_carb").toLowerCase();
  if (text === "high_carb" || text === "high") return "high_carb";
  if (text === "low_carb" || text === "low") return "low_carb";
  if (text === "refeed") return "refeed";
  return "medium_carb";
};

const normalizeGoal = (value: unknown): UserProfile["goal"] => {
  const text = asString(value, "maintenance");
  if (text === "fat_loss" || text === "muscle_gain" || text === "maintenance") return text;
  return "maintenance";
};

const fromJavaDay = (input: AnyRecord): DayPlan => ({
  id: asString(input.id),
  plan_id: asString(input.planId ?? input.plan_id),
  date: asString(input.date),
  day_type: normalizeDayType(input.dayType ?? input.day_type),
  target_calories: asNumber(input.targetCalories ?? input.target_calories, 0),
  macros: {
    protein_g: asNumber(input.proteinG ?? input.protein_g ?? (input.macros as AnyRecord | undefined)?.protein_g, 0),
    carbs_g: asNumber(input.carbsG ?? input.carbs_g ?? (input.macros as AnyRecord | undefined)?.carbs_g, 0),
    fat_g: asNumber(input.fatG ?? input.fat_g ?? (input.macros as AnyRecord | undefined)?.fat_g, 0),
    fiber_g: asNumber(input.fiberG ?? input.fiber_g ?? (input.macros as AnyRecord | undefined)?.fiber_g, 0),
  },
  training_scheduled: Boolean(input.trainingScheduled ?? input.training_scheduled),
  training_type: asString(input.trainingType ?? input.training_type),
  notes: asString(input.notes),
});

const toJavaDay = (day: DayPlan) => ({
  date: day.date,
  dayType: day.day_type,
  proteinG: day.macros.protein_g,
  carbsG: day.macros.carbs_g,
  fatG: day.macros.fat_g,
  fiberG: day.macros.fiber_g ?? 0,
  trainingScheduled: day.training_scheduled,
  trainingType: day.training_type,
  notes: day.notes,
});

const fromJavaPlan = (input: AnyRecord): CarbonCyclePlan => ({
  id: asString(input.id),
  user_id: asString(input.userId ?? input.user_id),
  name: asString(input.name, "碳循环计划"),
  start_date: asString(input.startDate ?? input.start_date),
  end_date: asString(input.endDate ?? input.end_date),
  cycle_length_days: asNumber(input.cycleLengthDays ?? input.cycle_length_days, 7),
  base_calories: asNumber(input.baseCalories ?? input.base_calories, 0),
  goal_deficit: asNumber(input.goalDeficit ?? input.goal_deficit, 0),
  is_active: Boolean(input.isActive ?? input.is_active ?? true),
  notes: asString(input.notes),
  days: toArray<AnyRecord>(input.days).map(fromJavaDay),
  average_daily_calories: asNumber(input.averageDailyCalories ?? input.average_daily_calories, 0),
  day_type_counts: (input.dayTypeCounts ?? input.day_type_counts ?? {}) as Record<string, number>,
});

const toJavaPlanCreate = (input: AnyRecord) => ({
  userId: input.userId ?? input.user_id,
  name: input.name,
  startDate: input.startDate ?? input.start_date,
  cycleLengthDays: input.cycleLengthDays ?? input.cycle_length_days,
  numCycles: input.numCycles ?? input.num_cycles,
  goalDeficit: input.goalDeficit ?? input.goal_deficit,
});

const emptyAgentRun = (trigger: string): AgentRunResult => ({
  run_id: `local-${Date.now()}`,
  status: "mocked",
  latency_ms: 0,
  reflection_summary: `已收到「${trigger}」请求。当前前端已独立部署，后端 Agent 结果会在 Java API 可用时显示。`,
  motivation: "先把记录和计划坚持起来，数据越完整，建议越准。",
  safety_warnings: [],
  plan_diff: [],
  action_cards: [],
  missions: [],
  trace: [
    {
      node: "frontend-adapter",
      title: "前端独立适配",
      decision: "mock",
      reasoning: "Java 后端 Agent 响应字段与原 Python trace 不完全一致，当前以前端兜底展示。",
    },
  ],
  tool_trace: [],
});

export const authApi = {
  async register(input: AnyRecord): Promise<UserProfile> {
    try {
      const data = await request<AnyRecord>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(toJavaUser(input)),
      });
      return fromJavaUser(data);
    } catch {
      saveDemoSession();
      return { ...demoUser(), name: asString(input.name, "Demo 用户"), email: asString(input.email, DEMO_EMAIL) };
    }
  },

  async login(input: { email: string; password: string }) {
    try {
      const data = await request<AnyRecord>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(input),
      });
      return {
        access_token: asString(data.accessToken ?? data.access_token),
        token_type: asString(data.tokenType ?? data.token_type, "Bearer"),
        user_id: asString(data.userId ?? data.user_id),
        user_name: asString(data.userName ?? data.user_name),
        expires_at: asString(data.expiresAt ?? data.expires_at),
      };
    } catch {
      if (input.email !== DEMO_EMAIL || input.password !== DEMO_PASSWORD) {
        throw new Error(`后端不可用。可使用 Demo 账号：${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
      }
      saveDemoSession();
      return {
        access_token: "demo-token",
        token_type: "Bearer",
        user_id: DEMO_USER_ID,
        user_name: "Demo 用户",
        expires_at: new Date(Date.now() + 86400000).toISOString(),
      };
    }
  },
};

export const userApi = {
  async create(input: AnyRecord): Promise<UserProfile> {
    try {
      const data = await request<AnyRecord>("/api/users", {
        method: "POST",
        body: JSON.stringify(toJavaUser({ ...input, email: input.email ?? `user-${Date.now()}@local.dev`, password: input.password ?? "password123" })),
      });
      return fromJavaUser(data);
    } catch {
      return fromJavaUser({ ...demoUser(), ...toJavaUser(input), id: DEMO_USER_ID });
    }
  },

  async get(userId: string): Promise<UserProfile> {
    try {
      const data = await request<AnyRecord>(`/api/users/${userId}`);
      return fromJavaUser(data);
    } catch {
      return demoUser();
    }
  },

  async update(userId: string, input: AnyRecord): Promise<UserProfile> {
    try {
      const data = await request<AnyRecord>(`/api/users/${userId}`, {
        method: "PATCH",
        body: JSON.stringify(toJavaUser(input)),
      });
      return fromJavaUser(data);
    } catch {
      return fromJavaUser({ ...demoUser(), ...toJavaUser(input), id: userId });
    }
  },
};

export const planApi = {
  async create(input: AnyRecord): Promise<CarbonCyclePlan> {
    try {
      const data = await request<AnyRecord>("/api/plans", {
        method: "POST",
        body: JSON.stringify(toJavaPlanCreate(input)),
      });
      return fromJavaPlan(data);
    } catch {
      return demoPlan(asString(input.userId ?? input.user_id, DEMO_USER_ID));
    }
  },

  async getActive(userId: string): Promise<CarbonCyclePlan> {
    try {
      const data = await request<AnyRecord>(`/api/plans/user/${userId}/active`);
      return fromJavaPlan(data);
    } catch {
      return demoPlan(userId);
    }
  },

  async update(planId: string, input: { name?: string; is_active?: boolean; days?: DayPlan[] }): Promise<CarbonCyclePlan> {
    try {
      const data = await request<AnyRecord>(`/api/plans/${planId}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: input.name,
          isActive: input.is_active,
          days: input.days?.map(toJavaDay),
        }),
      });
      return fromJavaPlan(data);
    } catch {
      return { ...demoPlan(), id: planId, name: input.name ?? "Demo 碳循环计划", is_active: input.is_active ?? true, days: input.days ?? demoPlan().days };
    }
  },

  async regenerateDay(planId: string, dayDate: string): Promise<DayPlan> {
    try {
      const data = await request<AnyRecord>(`/api/plans/${planId}/days/${dayDate}/regenerate`, {
        method: "POST",
      });
      return fromJavaDay(data);
    } catch {
      const day = demoPlan().days.find(item => item.date === dayDate) ?? demoPlan().days[0];
      return { ...day, id: `${planId}-${dayDate}`, notes: `${day.notes}（已本地重新生成）` };
    }
  },
};

export const logApi = {
  async getStats(userId: string, days = 7): Promise<LogStats> {
    try {
      const data = await request<AnyRecord>(`/api/logs/user/${userId}/stats?days=${days}`);
      return {
        user_id: asString(data.userId ?? data.user_id, userId),
        days: asNumber(data.days, days),
        log_count: asNumber(data.logCount ?? data.log_count, 0),
        avg_calories: asNumber(data.averageCalories ?? data.avg_calories, 0),
        avg_protein: asNumber(data.averageProtein ?? data.avg_protein, 0),
        avg_carbs: asNumber(data.averageCarbs ?? data.avg_carbs, 0),
        avg_fat: asNumber(data.averageFat ?? data.avg_fat, 0),
        avg_water_ml: asNumber(data.averageWaterMl ?? data.avg_water_ml, 0),
        training_completed_days: asNumber(data.trainingCompletedDays ?? data.training_completed_days, 0),
      };
    } catch {
      return demoLogStats(userId, days);
    }
  },
};

export const reportApi = {
  async createWeekly(input: AnyRecord): Promise<HistoricalReport> {
    try {
      const data = await request<AnyRecord>("/api/reports/weekly", {
        method: "POST",
        body: JSON.stringify({
          userId: input.userId ?? input.user_id,
          planId: input.planId ?? input.plan_id,
          weekStart: input.weekStart ?? input.week_start,
          weekEnd: input.weekEnd ?? input.week_end,
        }),
      });
      return fromJavaReport(data);
    } catch {
      return demoReport();
    }
  },

  async getById(reportId: string): Promise<HistoricalReport> {
    try {
      const data = await request<AnyRecord>(`/api/reports/${reportId}`);
      return fromJavaReport(data);
    } catch {
      return demoReport(reportId);
    }
  },
};

function fromJavaReport(input: AnyRecord): HistoricalReport {
  return {
    id: asString(input.id),
    week_start: asString(input.weekStart ?? input.week_start),
    week_end: asString(input.weekEnd ?? input.week_end),
    calorie_rate: asNumber(input.dietAdherence ?? input.calorie_rate, 0),
    training_rate: asNumber(input.trainingAdherence ?? input.training_rate, 0),
    avg_protein: asNumber(input.averageProtein ?? input.avg_protein, 0),
    avg_carbs: asNumber(input.averageCarbs ?? input.avg_carbs, 0),
    avg_fat: asNumber(input.averageFat ?? input.avg_fat, 0),
    weight_change: input.weightChangeKg === null ? null : asNumber(input.weightChangeKg ?? input.weight_change, 0),
    summary: asString(input.summary),
    recommendations: toArray<string>(input.recommendations),
  };
}

export const agentApi = {
  async run(userId: string, trigger: string): Promise<AgentRunResult> {
    try {
      const data = await request<AnyRecord>("/api/agent/chat", {
        method: "POST",
        body: JSON.stringify({
          userId,
          trigger,
          content: trigger === "weekly_review" ? "请生成本周复盘建议" : "请分析我的当前计划和记录",
        }),
      });
      const structured = (data.structuredOutput ?? data.structured_output ?? {}) as AnyRecord;
      return {
        ...emptyAgentRun(trigger),
        run_id: asString(data.runId ?? data.run_id ?? data.sessionId ?? data.session_id, `agent-${Date.now()}`),
        status: "success",
        reflection_summary: asString(data.content ?? data.reply ?? structured.summary, emptyAgentRun(trigger).reflection_summary),
        action_cards: toArray<AgentActionCard>(structured.actionCards ?? structured.action_cards),
      };
    } catch {
      return emptyAgentRun(trigger);
    }
  },

  async executeAction(userId: string, actionType: string, data: Record<string, unknown>) {
    void userId;
    void data;
    return { message: `动作「${actionType}」已在前端记录。后端执行接口接入后会发送真实请求。` };
  },
};

export const chatApi = {
  async *streamMessage(userId: string, content: string, sessionId?: string): AsyncGenerator<ChatStreamChunk> {
    let data: AnyRecord = {};
    try {
      data = await request<AnyRecord>("/api/agent/chat", {
        method: "POST",
        body: JSON.stringify({
          userId,
          sessionId,
          trigger: "chat",
          content,
        }),
      });
    } catch {
      data = {
        sessionId: sessionId ?? `demo-session-${Date.now()}`,
        content: `我看到了你的问题：「${content}」。Demo 模式下建议你先查看今日计划和策略页，重点关注高碳日配合力量训练、低碳日保证蛋白质和睡眠。`,
      };
    }
    const nextSessionId = asString(data.sessionId ?? data.session_id ?? sessionId ?? `session-${Date.now()}`);
    const reply = asString(data.content ?? data.reply ?? data.message, "我已经收到你的问题，会结合你的计划和记录给出建议。");
    yield { type: "session", session_id: nextSessionId };
    yield { type: "content", content: reply };
    yield { type: "actions", actions: toArray<AgentActionCard>((data.structuredOutput as AnyRecord | undefined)?.actionCards) };
    yield { type: "done", message_id: asString(data.messageId ?? data.message_id, `message-${Date.now()}`) };
  },
};
