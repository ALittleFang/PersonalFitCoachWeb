"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { userApi } from "@/lib/api";
import { userStorage } from "@/lib/storage";
import { UserProfile } from "@/lib/types";

type Goal = UserProfile["goal"];

interface ProfileForm {
  name: string;
  gender: string;
  birthYear: number;
  heightCm: number;
  weightKg: number;
  targetWeightKg: number;
  goal: Goal;
  activityLevel: string;
  trainingDaysPerWeek: number;
  dietaryPreferences: string;
}

const goalOptions: { id: Goal; label: string; desc: string; icon: string }[] = [
  { id: "fat_loss", label: "减脂", desc: "稳定热量缺口", icon: "🔥" },
  { id: "muscle_gain", label: "增肌", desc: "训练日提高供能", icon: "💪" },
  { id: "maintenance", label: "保持", desc: "维持代谢与状态", icon: "⚖️" },
];

const activityOptions = [
  { id: "light", label: "轻量活动" },
  { id: "moderate", label: "中等活动" },
  { id: "active", label: "高活动量" },
  { id: "athlete", label: "高强度训练" },
];

const formatGoal = (goal: string) => goalOptions.find(item => item.id === goal)?.label || goal;

const getBirthYear = (birthDate?: string) => {
  const year = Number((birthDate || "").slice(0, 4));
  return Number.isFinite(year) && year > 1900 ? year : 1995;
};

const getAge = (birthDate?: string) => {
  if (!birthDate) return "-";
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return "-";
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) age -= 1;
  return `${age} 岁`;
};

const GlassPanel = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <section className={`glass-card p-6 ${className}`}>{children}</section>
);

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [form, setForm] = useState<ProfileForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadProfile = useCallback(async () => {
    const userId = userStorage.getUserId();
    if (!userId) {
      router.replace("/login");
      return;
    }

    try {
      const data = await userApi.get(userId);
      setUser(data);
      setForm({
        name: data.name || "",
        gender: data.gender || "male",
        birthYear: getBirthYear(data.birth_date),
        heightCm: data.height_cm || 170,
        weightKg: data.weight_kg || 0,
        targetWeightKg: data.target_weight_kg || data.weight_kg || 0,
        goal: data.goal,
        activityLevel: data.activity_level || "moderate",
        trainingDaysPerWeek: data.training_days_per_week || 4,
        dietaryPreferences: (data.dietary_preferences || []).join(", "),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载个人信息失败");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const progress = useMemo(() => {
    if (!user || !form) return null;
    const start = user.weight_kg || form.weightKg;
    const target = form.targetWeightKg;
    const current = form.weightKg;
    const total = Math.abs(start - target);
    if (total === 0) return 100;
    const moved = Math.abs(start - current);
    return Math.max(0, Math.min(100, Math.round((moved / total) * 100)));
  }, [form, user]);

  const updateForm = <K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) => {
    if (!form) return;
    setForm({ ...form, [key]: value });
    setMessage("");
    setError("");
  };

  const handleSave = async () => {
    if (!user || !form) return;
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const updated = await userApi.update(user.id, {
        name: form.name,
        gender: form.gender,
        birth_date: `${form.birthYear}-01-01`,
        height_cm: form.heightCm,
        weight_kg: form.weightKg,
        target_weight_kg: form.targetWeightKg,
        goal: form.goal,
        activity_level: form.activityLevel,
        training_days_per_week: form.trainingDaysPerWeek,
        dietary_preferences: form.dietaryPreferences
          .split(/[,，]/)
          .map(item => item.trim())
          .filter(Boolean),
      });
      setUser(updated);
      userStorage.setUserName(updated.name);
      setMessage("个人信息已保存");
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败，请稍后重试");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    if (!confirm("确定要退出当前账户吗？")) return;
    userStorage.clearAll();
    router.replace("/login");
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-primary animate-pulse text-xl font-bold">
        正在加载个人信息...
      </div>
    );
  }

  if (!user || !form) {
    return (
      <div className="h-full flex items-center justify-center">
        <GlassPanel className="max-w-md text-center">
          <h1 className="text-2xl font-black text-primary">无法读取个人信息</h1>
          <p className="mt-2 text-sm text-muted-foreground">{error || "请重新登录后再试。"}</p>
          <button
            onClick={() => router.replace("/login")}
            className="mt-6 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white"
          >
            返回登录
          </button>
        </GlassPanel>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-6rem)] overflow-y-auto no-scrollbar px-4 py-6 pb-28">
      <div className="mx-auto grid max-w-[1280px] gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
        <div className="space-y-5">
          <GlassPanel className="relative overflow-hidden">
            <div className="absolute right-[-4rem] top-[-4rem] h-40 w-40 rounded-full bg-accent/20 blur-3xl" />
            <div className="relative">
              <div className="flex items-center gap-4">
                <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-primary text-4xl text-white shadow-xl shadow-primary/20">
                  {user.gender === "female" ? "👩" : "👤"}
                </div>
                <div className="min-w-0">
                  <h1 className="truncate text-2xl font-black text-primary">{user.name}</h1>
                  <p className="truncate text-sm text-muted-foreground">{user.email || "未绑定邮箱"}</p>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white/55 p-4">
                  <div className="text-xs font-bold uppercase text-muted-foreground">当前目标</div>
                  <div className="mt-1 text-xl font-black text-foreground">{formatGoal(form.goal)}</div>
                </div>
                <div className="rounded-2xl bg-white/55 p-4">
                  <div className="text-xs font-bold uppercase text-muted-foreground">训练频率</div>
                  <div className="mt-1 text-xl font-black text-foreground">{form.trainingDaysPerWeek} 天/周</div>
                </div>
              </div>

              <div className="mt-4 rounded-2xl bg-secondary/40 p-4">
                <div className="flex items-center justify-between text-sm font-bold">
                  <span className="text-muted-foreground">体重目标进度</span>
                  <span className="text-primary">{progress}%</span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
                </div>
                <div className="mt-3 flex justify-between text-xs font-semibold text-muted-foreground">
                  <span>{form.weightKg} kg</span>
                  <span>目标 {form.targetWeightKg} kg</span>
                </div>
              </div>
            </div>
          </GlassPanel>

          <GlassPanel>
            <h2 className="text-sm font-black uppercase tracking-wider text-muted-foreground">基础档案</h2>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between rounded-xl bg-white/45 px-4 py-3">
                <span className="text-muted-foreground">性别</span>
                <span className="font-bold">{form.gender === "female" ? "女士" : "男士"}</span>
              </div>
              <div className="flex justify-between rounded-xl bg-white/45 px-4 py-3">
                <span className="text-muted-foreground">年龄</span>
                <span className="font-bold">{getAge(`${form.birthYear}-01-01`)}</span>
              </div>
              <div className="flex justify-between rounded-xl bg-white/45 px-4 py-3">
                <span className="text-muted-foreground">身高</span>
                <span className="font-bold">{form.heightCm} cm</span>
              </div>
              <div className="flex justify-between rounded-xl bg-white/45 px-4 py-3">
                <span className="text-muted-foreground">BMR / TDEE</span>
                <span className="font-bold">{Math.round(user.bmr || 0)} / {Math.round(user.tdee || 0)}</span>
              </div>
            </div>
          </GlassPanel>

          <button
            onClick={handleLogout}
            className="w-full rounded-2xl border border-red-200 bg-red-50/80 px-5 py-4 text-sm font-black text-red-600 shadow-lg transition-all hover:bg-red-100"
          >
            退出登录
          </button>
        </div>

        <GlassPanel>
          <div className="flex flex-col gap-2 border-b border-border pb-5 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-2xl font-black text-primary">个人信息</h2>
              <p className="mt-1 text-sm text-muted-foreground">调整目标后，后续计划和复盘会使用新的偏好。</p>
            </div>
            <div className="flex min-h-6 items-center text-sm font-bold">
              {message && <span className="text-emerald-600">{message}</span>}
              {error && <span className="text-red-600">{error}</span>}
            </div>
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            <label className="space-y-2">
              <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">昵称 / 姓名</span>
              <input
                value={form.name}
                onChange={event => updateForm("name", event.target.value)}
                className="w-full rounded-2xl border border-primary/10 bg-white/60 px-5 py-4 text-sm font-bold outline-none transition-all focus:ring-2 focus:ring-primary/20"
              />
            </label>

            <label className="space-y-2">
              <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">活动水平</span>
              <select
                value={form.activityLevel}
                onChange={event => updateForm("activityLevel", event.target.value)}
                className="w-full rounded-2xl border border-primary/10 bg-white/60 px-5 py-4 text-sm font-bold outline-none transition-all focus:ring-2 focus:ring-primary/20"
              >
                {activityOptions.map(option => (
                  <option key={option.id} value={option.id}>{option.label}</option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">性别</span>
              <select
                value={form.gender}
                onChange={event => updateForm("gender", event.target.value)}
                className="w-full rounded-2xl border border-primary/10 bg-white/60 px-5 py-4 text-sm font-bold outline-none transition-all focus:ring-2 focus:ring-primary/20"
              >
                <option value="male">男士</option>
                <option value="female">女士</option>
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">出生年份</span>
              <input
                type="number"
                min={1920}
                max={new Date().getFullYear()}
                step={1}
                value={form.birthYear}
                onChange={event => updateForm("birthYear", Number(event.target.value))}
                className="w-full rounded-2xl border border-primary/10 bg-white/60 px-5 py-4 text-sm font-bold outline-none transition-all focus:ring-2 focus:ring-primary/20"
              />
            </label>

            <label className="space-y-2">
              <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">身高 (cm)</span>
              <input
                type="number"
                min={100}
                max={250}
                step={0.1}
                value={form.heightCm}
                onChange={event => updateForm("heightCm", Number(event.target.value))}
                className="w-full rounded-2xl border border-primary/10 bg-white/60 px-5 py-4 text-sm font-bold outline-none transition-all focus:ring-2 focus:ring-primary/20"
              />
            </label>

            <label className="space-y-2">
              <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">当前体重 (kg)</span>
              <input
                type="number"
                min={30}
                max={300}
                step={0.1}
                value={form.weightKg}
                onChange={event => updateForm("weightKg", Number(event.target.value))}
                className="w-full rounded-2xl border border-primary/10 bg-white/60 px-5 py-4 text-sm font-bold outline-none transition-all focus:ring-2 focus:ring-primary/20"
              />
            </label>

            <label className="space-y-2">
              <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">目标体重 (kg)</span>
              <input
                type="number"
                min={30}
                max={300}
                step={0.1}
                value={form.targetWeightKg}
                onChange={event => updateForm("targetWeightKg", Number(event.target.value))}
                className="w-full rounded-2xl border border-primary/10 bg-white/60 px-5 py-4 text-sm font-bold outline-none transition-all focus:ring-2 focus:ring-primary/20"
              />
            </label>
          </div>

          <div className="mt-7">
            <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground">训练目标</h3>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              {goalOptions.map(option => {
                const active = form.goal === option.id;
                return (
                  <button
                    key={option.id}
                    onClick={() => updateForm("goal", option.id)}
                    className={`rounded-2xl border-2 p-4 text-left transition-all ${
                      active
                        ? "border-primary bg-primary/5 shadow-inner"
                        : "border-transparent bg-white/45 hover:bg-white/70"
                    }`}
                  >
                    <div className="text-3xl">{option.icon}</div>
                    <div className={`mt-3 font-black ${active ? "text-primary" : "text-foreground"}`}>{option.label}</div>
                    <div className="mt-1 text-xs font-medium text-muted-foreground">{option.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-7 grid gap-5 lg:grid-cols-[1fr_220px]">
            <label className="space-y-2">
              <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">饮食偏好</span>
              <input
                value={form.dietaryPreferences}
                onChange={event => updateForm("dietaryPreferences", event.target.value)}
                placeholder="例如：高蛋白, 少油, 不吃辣"
                className="w-full rounded-2xl border border-primary/10 bg-white/60 px-5 py-4 text-sm font-bold outline-none transition-all focus:ring-2 focus:ring-primary/20"
              />
            </label>

            <label className="space-y-2">
              <span className="text-xs font-black uppercase tracking-wider text-muted-foreground">每周训练天数</span>
              <div className="rounded-2xl border border-primary/10 bg-white/60 px-5 py-4">
                <input
                  type="range"
                  min={0}
                  max={7}
                  step={1}
                  value={form.trainingDaysPerWeek}
                  onChange={event => updateForm("trainingDaysPerWeek", Number(event.target.value))}
                  className="w-full accent-primary"
                />
                <div className="mt-2 text-center text-xl font-black text-primary">{form.trainingDaysPerWeek} 天</div>
              </div>
            </label>
          </div>

          <div className="mt-8 flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving || !form.name.trim()}
              className="rounded-2xl bg-primary px-8 py-4 text-sm font-black text-white shadow-xl shadow-primary/20 transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "保存中..." : "保存修改"}
            </button>
          </div>
        </GlassPanel>
      </div>
    </div>
  );
}
