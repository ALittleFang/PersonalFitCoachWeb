export type DayType = "high_carb" | "medium_carb" | "low_carb" | "refeed";

export interface UserProfile {
  id: string;
  name: string;
  email?: string;
  gender: "male" | "female" | string;
  birth_date: string;
  height_cm: number;
  weight_kg: number;
  target_weight_kg?: number | null;
  goal: "fat_loss" | "muscle_gain" | "maintenance";
  activity_level?: string | null;
  training_days_per_week?: number | null;
  dietary_preferences?: string[];
  bmr?: number | null;
  tdee?: number | null;
}

export interface MacroTargets {
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number;
}

export interface DayPlan {
  id?: string;
  plan_id?: string;
  date: string;
  day_type: DayType;
  target_calories?: number;
  macros: MacroTargets;
  training_scheduled: boolean;
  training_type?: string;
  notes?: string;
}

export interface CarbonCyclePlan {
  id: string;
  user_id: string;
  name: string;
  start_date: string;
  end_date?: string;
  cycle_length_days: number;
  base_calories?: number;
  goal_deficit?: number;
  is_active: boolean;
  notes?: string;
  days: DayPlan[];
  average_daily_calories?: number;
  day_type_counts?: Record<string, number>;
}

export interface FoodLogEntry {
  id: string;
  food_name: string;
  portion: string;
  carbs_g: number;
  protein_g: number;
  fat_g: number;
  calories: number;
  time: string;
  image_path?: string;
}

export interface LogStats {
  user_id: string;
  days: number;
  log_count: number;
  avg_calories: number;
  avg_protein: number;
  avg_carbs: number;
  avg_fat: number;
  avg_water_ml?: number;
  training_completed_days?: number;
  training_completion_rate?: number;
}

export interface HistoricalReport {
  id: string;
  week_start: string;
  week_end: string;
  calorie_rate: number;
  training_rate: number;
  avg_protein: number;
  avg_carbs: number;
  avg_fat: number;
  weight_change: number | null;
  summary?: string;
  recommendations?: string[];
}

export interface AgentActionCard {
  type: string;
  title: string;
  description: string;
  data?: Record<string, unknown>;
}

export interface AgentRunResult {
  run_id: string;
  status: string;
  latency_ms?: number;
  reflection_summary?: string;
  motivation?: string;
  safety_warnings: Array<{ rule?: string; message: string }>;
  plan_diff: Array<{
    field: string;
    label: string;
    before?: unknown;
    after?: unknown;
    reason?: string;
  }>;
  action_cards: AgentActionCard[];
  missions: Array<{
    id: string;
    title: string;
    description: string;
    next_action?: string;
  }>;
  trace: Array<{
    node: string;
    title?: string;
    decision?: string;
    reasoning?: string;
    duration_ms?: number;
    input_summary?: unknown;
    output_summary?: unknown;
  }>;
  tool_trace: Array<{
    tool_name: string;
    status: string;
    duration_ms?: number;
    result?: unknown;
  }>;
  evaluation_summary?: unknown;
}
