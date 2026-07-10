"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { hasSupabaseConfig, supabase } from "../lib/supabase";

const statuses = ["検討中", "準備中", "実行中", "完了"] as const;
const miniTaskStatuses = ["未着手", "実施中", "完了"] as const;
const assigneeOptions = ["梅澤", "Hao", "寧"] as const;
const qaStates = ["未対応", "対応中", "完了", "保留"] as const;
const qaTypes = ["調査依頼", "QA"] as const;

type Status = (typeof statuses)[number];
type MiniTaskStatus = (typeof miniTaskStatuses)[number];
type QaState = (typeof qaStates)[number];
type QaType = (typeof qaTypes)[number];

type ProjectCard = {
  id: string;
  title: string;
  body: string;
  status: Status;
  tags: string[];
  assignees: string[];
  isRoutine: boolean;
  dueDate: string | null;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
};

type QaLog = {
  id: string;
  title: string;
  body: string;
  type: QaType;
  state: QaState;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

type MiniTask = {
  id: string;
  title: string;
  body: string;
  status: MiniTaskStatus;
  projectCardId: string | null;
  tags: string[];
  assignees: string[];
  dueDate: string | null;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
};

type TagColor = {
  background: string;
  border: string;
  color: string;
};

type TagRow = {
  id: string;
  name: string;
  background_color: string;
  border_color: string;
  text_color: string;
};

type ProjectCardRow = {
  id: string;
  title: string;
  body: string;
  status: Status;
  is_routine: boolean;
  due_date?: string | null;
  assignees?: string[] | null;
  sort_order: number;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  project_card_tags?: { tags: TagRow | null }[];
};

type QaLogRow = {
  id: string;
  title: string;
  body: string;
  type: QaType;
  state: QaState;
  created_at: string;
  updated_at: string;
  qa_log_tags?: { tags: TagRow | null }[];
};

type MiniTaskRow = {
  id: string;
  title: string;
  body: string;
  status: string;
  source_project_card_id?: string | null;
  due_date: string | null;
  assignees?: string[] | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  mini_task_tags?: { tags: TagRow | null }[];
};

type AuthStatus = "checking" | "signedOut" | "unauthorized" | "ready";

type ExtractedTaskCandidate = {
  clientId: string;
  sourceCardId: string;
  title: string;
  body: string;
  status: MiniTaskStatus;
  dueDate: string | null;
  assignees: string[];
  duplicateWarning: string | null;
  selected: boolean;
};

type SpeechRecognitionConstructor = new () => {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: { resultIndex: number; results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};

const initialTags = [
  "シトルリン&アルギニン",
  "クレアルカリン",
  "VITAPOWER",
  "EAA",
  "商品共通タグ",
  "画像制作",
  "モール施策：Douyin",
  "モール施策：TMALL",
  "モール施策：JD",
  "同梱物",
  "動画制作",
  "動画制作（代理店）",
  "SNS企画：RED",
  "SNS企画：Douyin公式",
  "SNS企画：Douyinしみけん×VITAS",
  "SNS企画：Bilibiliしみけん",
  "ライブコマース（代理店）",
  "ライブコマース（自社）",
  "インフルエンサー施策"
];

const now = () => new Date().toLocaleString("ja-JP");

const formatDueDate = (dueDate: string | null) => {
  if (!dueDate) return null;
  return new Date(`${dueDate}T00:00:00`).toLocaleDateString("ja-JP", {
    month: "numeric",
    day: "numeric",
    weekday: "short"
  });
};

const normalizeDueDateForDb = (value: string | null) => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  const slashMatch = trimmed.match(/^(?:(\d{4})[/-])?(\d{1,2})[/-](\d{1,2})$/);
  if (slashMatch) {
    const [, year, month, day] = slashMatch;
    return `${year ?? String(new Date().getFullYear())}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  const japaneseMatch = trimmed.match(/^(?:(\d{4})年)?\s*(\d{1,2})月\s*(\d{1,2})日?$/);
  if (japaneseMatch) {
    const [, year, month, day] = japaneseMatch;
    return `${year ?? String(new Date().getFullYear())}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  return null;
};

const normalizeTaskTitle = (title: string) =>
  title
    .replace(/[　\s]+/g, " ")
    .replace(/[。、,.，．]+$/g, "")
    .trim()
    .toLowerCase();

const taskTokens = (title: string) =>
  normalizeTaskTitle(title)
    .replace(/[のをにへでとがはもや・＆&／/()（）「」、。]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 2);

const taskSimilarity = (a: string, b: string) => {
  const aTokens = new Set(taskTokens(a));
  const bTokens = new Set(taskTokens(b));
  if (aTokens.size === 0 || bTokens.size === 0) return 0;
  const intersection = Array.from(aTokens).filter((token) => bTokens.has(token)).length;
  return intersection / Math.min(aTokens.size, bTokens.size);
};

const taskActionKeywords = [
  "確認",
  "調査",
  "ヒアリング",
  "相談",
  "決める",
  "確定",
  "作る",
  "制作",
  "製作",
  "送付",
  "洗い出",
  "整理",
  "調整",
  "進める",
  "デザイン",
  "リサーチ",
  "キャスティング"
];

const cleanTaskLine = (line: string) =>
  line
    .replace(/^[\s　]*[・\-*•●○\d０-９]+[.)．、:：\s　]*/g, "")
    .replace(/^→/g, "")
    .replace(/^＆/g, "")
    .replace(/[。；;]+$/g, "")
    .trim();

const isTaskLikeLine = (line: string) => {
  const cleaned = cleanTaskLine(line);
  if (cleaned.length < 8 || cleaned.length > 90) return false;
  if (/^(想定|目的|予算|対象商品|起用予定|リサーチ|調べ内容)$/.test(cleaned)) return false;
  return taskActionKeywords.some((keyword) => cleaned.includes(keyword));
};

const polishVoiceText = (text: string) =>
  text
    .replace(/\s+/g, "")
    .replace(/まる/g, "。")
    .replace(/てん/g, "、")
    .replace(/改行/g, "\n")
    .replace(/かっこ/g, "（")
    .replace(/かっことじ/g, "）")
    .replace(/。、/g, "。")
    .replace(/、、/g, "、")
    .trim();

const googleDocUrlPattern = /https:\/\/docs\.google\.com\/(?:document|spreadsheets|presentation)\/d\/[^\s)）]+/g;

const getGoogleDocLinks = (body: string) =>
  Array.from(new Set(body.match(googleDocUrlPattern) ?? []));

const normalizeMiniTaskStatus = (status: string): MiniTaskStatus => {
  if (status === "完了") return "完了";
  if (status === "実施中" || status === "実行中") return "実施中";
  return "未着手";
};

const sampleCards: ProjectCard[] = [
  {
    id: "card-1",
    title: "Douyin公式アカウント運用整理",
    body: "目的、投稿候補、確認事項をここにまとめる。",
    status: "検討中",
    tags: ["モール施策：Douyin", "SNS企画：Douyin公式"],
    assignees: ["梅澤"],
    isRoutine: false,
    dueDate: null,
    updatedBy: "梅澤",
    createdAt: now(),
    updatedAt: now()
  },
  {
    id: "card-2",
    title: "動画制作素材の確認",
    body: "代理店に渡す素材と不足分を確認する。",
    status: "準備中",
    tags: ["動画制作", "動画制作（代理店）"],
    assignees: [],
    isRoutine: false,
    dueDate: null,
    updatedBy: "梅澤",
    createdAt: now(),
    updatedAt: now()
  },
  {
    id: "card-3",
    title: "RED投稿の定常確認",
    body: "週次で投稿状況と反応を確認する。リンクや添付ファイルの場所も必要なら本文に貼る。",
    status: "実行中",
    tags: ["SNS企画：RED"],
    assignees: [],
    isRoutine: true,
    dueDate: null,
    updatedBy: "梅澤",
    createdAt: now(),
    updatedAt: now()
  }
];

const sampleQa: QaLog[] = [
  {
    id: "qa-1",
    title: "RED投稿で使える表現確認",
    body: "過去に確認したNG表現を再確認する。",
    type: "QA",
    state: "未対応",
    tags: ["SNS企画：RED"],
    createdAt: now(),
    updatedAt: now()
  }
];

const sampleMiniTasks: MiniTask[] = [
  {
    id: "mini-task-1",
    title: "代理店への確認事項を整理",
    body: "次回MTGまでに確認したい小さい作業をここに残す。",
    status: "未着手",
    projectCardId: null,
    tags: ["動画制作"],
    assignees: ["梅澤"],
    dueDate: null,
    updatedBy: "梅澤",
    createdAt: now(),
    updatedAt: now()
  }
];

const blankCardDraft = (tags: string[]): ProjectCard => ({
  id: `card-${Date.now()}`,
  title: "",
  body: "",
  status: "検討中",
  tags: [],
  assignees: [],
  isRoutine: false,
  dueDate: null,
  updatedBy: "梅澤",
  createdAt: now(),
  updatedAt: now()
});

const blankMiniTaskDraft = (): MiniTask => ({
  id: `mini-task-${Date.now()}`,
  title: "",
  body: "",
  status: "未着手",
  projectCardId: null,
  tags: [],
  assignees: [],
  dueDate: null,
  updatedBy: "梅澤",
  createdAt: now(),
  updatedAt: now()
});

const emptyQa = (tags: string[]): QaLog => ({
  id: `qa-${Date.now()}`,
  title: "新しいQA",
  body: "",
  type: "QA",
  state: "未対応",
  tags: tags.slice(0, 1),
  createdAt: now(),
  updatedAt: now()
});

const tagPalette = [
  { background: "#d9eef4", border: "#a8cfda", color: "#174555" },
  { background: "#e4f1dc", border: "#b9d4a8", color: "#315f28" },
  { background: "#fff0c9", border: "#e4c46f", color: "#665018" },
  { background: "#f7dbe3", border: "#daa9b7", color: "#743449" },
  { background: "#e7e0f4", border: "#c8b8df", color: "#49396d" },
  { background: "#dff0e9", border: "#a8d0c0", color: "#245647" },
  { background: "#f3e1d5", border: "#d7b39b", color: "#69422c" }
];

const initialTagColors = Object.fromEntries(
  initialTags.map((tag, index) => [tag, tagPalette[index % tagPalette.length]])
) as Record<string, TagColor>;

const fallbackTagStyle = (tag: string, tags: string[]) => {
  const index = Math.max(tags.indexOf(tag), 0) % tagPalette.length;
  return tagPalette[index];
};

const tagStyle = (tag: string, tags: string[], tagColors: Record<string, TagColor>) => {
  const color = tagColors?.[tag] ?? fallbackTagStyle(tag, tags);
  return {
    background: color.background,
    color: color.color
  };
};

export default function Home() {
  const [view, setView] = useState<"board" | "tags" | "tagAdmin" | "users">("board");
  const [cards, setCards] = useState<ProjectCard[]>([]);
  const [qaLogs, setQaLogs] = useState<QaLog[]>([]);
  const [miniTasks, setMiniTasks] = useState<MiniTask[]>([]);
  const [tags, setTags] = useState(initialTags);
  const [tagIds, setTagIds] = useState<Record<string, string>>({});
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [selectedQaId, setSelectedQaId] = useState<string | null>(null);
  const [selectedMiniTaskId, setSelectedMiniTaskId] = useState<string | null>(null);
  const [hoveredTagCardId, setHoveredTagCardId] = useState<string | null>(null);
  const [newTag, setNewTag] = useState("");
  const [allowedUsers, setAllowedUsers] = useState("umezawa@example.com");
  const [cardDraft, setCardDraft] = useState<ProjectCard>(() => blankCardDraft(initialTags));
  const [miniTaskDraft, setMiniTaskDraft] = useState<MiniTask>(() => blankMiniTaskDraft());
  const [showCreateCard, setShowCreateCard] = useState(false);
  const [showCreateMiniTask, setShowCreateMiniTask] = useState(false);
  const [miniTaskFormError, setMiniTaskFormError] = useState<string | null>(null);
  const [tagColors, setTagColors] = useState<Record<string, TagColor>>(initialTagColors);
  const [tagAlert, setTagAlert] = useState<string | null>(null);
  const [dataNotice, setDataNotice] = useState<string | null>(null);
  const [taskNotice, setTaskNotice] = useState<string | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>("checking");
  const [currentUserEmail, setCurrentUserEmail] = useState("");
  const [animatedCardId, setAnimatedCardId] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [isExtractingTasks, setIsExtractingTasks] = useState(false);
  const [taskCandidates, setTaskCandidates] = useState<ExtractedTaskCandidate[]>([]);
  const [showTaskCandidateModal, setShowTaskCandidateModal] = useState(false);
  const [editingTaskCandidateId, setEditingTaskCandidateId] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase || !hasSupabaseConfig) {
      setAuthStatus("ready");
      void loadSupabaseData();
      return;
    }

    void supabase.auth.getSession().then(({ data }) => {
      void handleAuthUser(data.session?.user ?? null);
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void handleAuthUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleAuthUser = async (user: User | null) => {
    if (!supabase) return;

    if (!user?.email) {
      setAuthStatus("signedOut");
      setCurrentUserEmail("");
      setCards([]);
      setQaLogs([]);
      setDataNotice("Googleログインしてください。");
      return;
    }

    const email = user.email;
    setCurrentUserEmail(email);
    setDataNotice("許可ユーザーか確認しています。");

    const { data, error } = await supabase
      .from("allowed_users")
      .select("email, role")
      .eq("email", email)
      .maybeSingle();

    if (error) {
      setAuthStatus("unauthorized");
      setDataNotice(`許可ユーザー確認に失敗しました: ${error.message}`);
      return;
    }

    if (!data) {
      setAuthStatus("unauthorized");
      setCards([]);
      setQaLogs([]);
      setDataNotice(`${email} は許可ユーザーに登録されていません。`);
      return;
    }

    setAuthStatus("ready");
    await loadSupabaseData();
  };

  const signInWithGoogle = async () => {
    if (!supabase) return;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin
      }
    });
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setAuthStatus("signedOut");
    setCurrentUserEmail("");
    setCards([]);
    setQaLogs([]);
    setMiniTasks([]);
    setDataNotice("ログアウトしました。");
  };

  const mapTagColor = (tag: TagRow): TagColor => ({
    background: tag.background_color,
    border: tag.border_color,
    color: tag.text_color
  });

  const loadSupabaseData = async () => {
    if (!supabase || !hasSupabaseConfig) {
      setCards(sampleCards);
      setQaLogs(sampleQa);
      setMiniTasks(sampleMiniTasks);
      setDataNotice("Supabase設定が未入力のため、仮データを表示しています。");
      return;
    }

    const [tagResult, cardResult, qaResult] = await Promise.all([
      supabase.from("tags").select("*").order("created_at", { ascending: true }),
      supabase
        .from("project_cards")
        .select("*, project_card_tags(tags(*))")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false }),
      supabase.from("qa_logs").select("*, qa_log_tags(tags(*))").order("created_at", { ascending: false })
    ]);

    if (tagResult.error || cardResult.error || qaResult.error) {
      setCards(sampleCards);
      setQaLogs(sampleQa);
      setMiniTasks(sampleMiniTasks);
      const message = tagResult.error?.message ?? cardResult.error?.message ?? qaResult.error?.message;
      setDataNotice(`Supabaseの読み込みに失敗しました: ${message}`);
      return;
    }

    let tagRows = (tagResult.data ?? []) as TagRow[];
    if (tagRows.length === 0) {
      const seedRows = initialTags.map((tag, index) => {
        const color = tagPalette[index % tagPalette.length];
        return {
          name: tag,
          background_color: color.background,
          border_color: color.border,
          text_color: color.color
        };
      });
      const { data: seededTags, error: seedError } = await supabase
        .from("tags")
        .insert(seedRows)
        .select("*");

      if (seedError) {
        setDataNotice(`タグの初期投入に失敗しました: ${seedError.message}`);
        return;
      }
      tagRows = (seededTags ?? []) as TagRow[];
    }
    const nextTags = tagRows.map((tag) => tag.name);
    setTags(nextTags);
    setTagIds(Object.fromEntries(tagRows.map((tag) => [tag.name, tag.id])));
    setTagColors(Object.fromEntries(tagRows.map((tag) => [tag.name, mapTagColor(tag)])));

    const cardRows = (cardResult.data ?? []) as ProjectCardRow[];
    setCards(
      cardRows.map((card) => ({
        id: card.id,
        title: card.title,
        body: card.body,
        status: card.status,
        tags: card.project_card_tags?.map((item) => item.tags?.name).filter((tag): tag is string => Boolean(tag)) ?? [],
        assignees: card.assignees ?? [],
        isRoutine: card.is_routine,
        dueDate: card.due_date ?? null,
        updatedBy: card.updated_by ?? "梅澤",
        createdAt: new Date(card.created_at).toLocaleString("ja-JP"),
        updatedAt: new Date(card.updated_at).toLocaleString("ja-JP")
      }))
    );

    const qaRows = (qaResult.data ?? []) as QaLogRow[];
    setQaLogs(
      qaRows.map((log) => ({
        id: log.id,
        title: log.title,
        body: log.body,
        type: log.type,
        state: log.state,
        tags: log.qa_log_tags?.map((item) => item.tags?.name).filter((tag): tag is string => Boolean(tag)) ?? [],
        createdAt: new Date(log.created_at).toLocaleString("ja-JP"),
        updatedAt: new Date(log.updated_at).toLocaleString("ja-JP")
      }))
    );

    const taskResult = await supabase
      .from("mini_tasks")
      .select("*, mini_task_tags(tags(*))")
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (taskResult.error) {
      setMiniTasks([]);
    } else {
      const taskRows = (taskResult.data ?? []) as MiniTaskRow[];
      setMiniTasks(
        taskRows.map((task) => ({
          id: task.id,
          title: task.title,
          body: task.body,
          status: normalizeMiniTaskStatus(task.status),
          projectCardId: task.source_project_card_id ?? null,
          tags: task.mini_task_tags?.map((item) => item.tags?.name).filter((tag): tag is string => Boolean(tag)) ?? [],
          assignees: task.assignees ?? [],
          dueDate: task.due_date ?? null,
          updatedBy: task.updated_by ?? "梅澤",
          createdAt: new Date(task.created_at).toLocaleString("ja-JP"),
          updatedAt: new Date(task.updated_at).toLocaleString("ja-JP")
        }))
      );
    }

    setDataNotice(null);
  };

  const selectedCard = cards.find((card) => card.id === selectedCardId) ?? null;
  const selectedQa = qaLogs.find((log) => log.id === selectedQaId) ?? null;
  const selectedMiniTask = miniTasks.find((task) => task.id === selectedMiniTaskId) ?? null;

  const cardsByTag = useMemo(
    () => tags.map((tag) => ({ tag, cards: cards.filter((card) => card.tags.includes(tag)) })),
    [cards, tags]
  );
  const canUseApp = authStatus === "ready";
  const visibleStatuses = showCompleted ? statuses : statuses.filter((status) => status !== "完了");
  const visibleMiniTasks = showCompleted ? miniTasks : miniTasks.filter((task) => task.status !== "完了");
  const visibleRoutineCards = showCompleted
    ? cards.filter((card) => card.isRoutine)
    : cards.filter((card) => card.isRoutine && card.status !== "完了");

  const persistCardTags = async (cardId: string, tagNames: string[]) => {
    if (!supabase) return;
    const tagRows = tagNames
      .map((tagName) => tagIds[tagName])
      .filter((tagId): tagId is string => Boolean(tagId))
      .map((tagId) => ({ card_id: cardId, tag_id: tagId }));

    await supabase.from("project_card_tags").delete().eq("card_id", cardId);
    if (tagRows.length > 0) {
      await supabase.from("project_card_tags").insert(tagRows);
    }
  };

  const persistQaTags = async (qaLogId: string, tagNames: string[]) => {
    if (!supabase) return;
    const tagRows = tagNames
      .map((tagName) => tagIds[tagName])
      .filter((tagId): tagId is string => Boolean(tagId))
      .map((tagId) => ({ qa_log_id: qaLogId, tag_id: tagId }));

    await supabase.from("qa_log_tags").delete().eq("qa_log_id", qaLogId);
    if (tagRows.length > 0) {
      await supabase.from("qa_log_tags").insert(tagRows);
    }
  };

  const persistMiniTaskTags = async (taskId: string, tagNames: string[]) => {
    if (!supabase) return;
    const tagRows = tagNames
      .map((tagName) => tagIds[tagName])
      .filter((tagId): tagId is string => Boolean(tagId))
      .map((tagId) => ({ mini_task_id: taskId, tag_id: tagId }));

    await supabase.from("mini_task_tags").delete().eq("mini_task_id", taskId);
    if (tagRows.length > 0) {
      await supabase.from("mini_task_tags").insert(tagRows);
    }
  };

  const persistCardUpdate = async (id: string, patch: Partial<ProjectCard>) => {
    if (!supabase || id.startsWith("card-")) return;

    const updatePayload: {
      title?: string;
      body?: string;
      status?: Status;
      is_routine?: boolean;
      due_date?: string | null;
      assignees?: string[];
      updated_by?: string;
    } = {};

    if (patch.title !== undefined) updatePayload.title = patch.title;
    if (patch.body !== undefined) updatePayload.body = patch.body;
    if (patch.status !== undefined) updatePayload.status = patch.status;
    if (patch.isRoutine !== undefined) updatePayload.is_routine = patch.isRoutine;
    if (patch.dueDate !== undefined) updatePayload.due_date = patch.dueDate;
    if (patch.assignees !== undefined) updatePayload.assignees = patch.assignees;
    if (patch.updatedBy !== undefined) updatePayload.updated_by = patch.updatedBy;

    if (Object.keys(updatePayload).length > 0) {
      await supabase.from("project_cards").update(updatePayload).eq("id", id);
    }
    if (patch.tags !== undefined) {
      await persistCardTags(id, patch.tags);
    }
  };

  const persistQaUpdate = async (id: string, patch: Partial<QaLog>) => {
    if (!supabase || id.startsWith("qa-")) return;

    const updatePayload: {
      title?: string;
      body?: string;
      type?: QaType;
      state?: QaState;
    } = {};

    if (patch.title !== undefined) updatePayload.title = patch.title;
    if (patch.body !== undefined) updatePayload.body = patch.body;
    if (patch.type !== undefined) updatePayload.type = patch.type;
    if (patch.state !== undefined) updatePayload.state = patch.state;

    if (Object.keys(updatePayload).length > 0) {
      await supabase.from("qa_logs").update(updatePayload).eq("id", id);
    }
    if (patch.tags !== undefined) {
      await persistQaTags(id, patch.tags);
    }
  };

  const persistMiniTaskUpdate = async (id: string, patch: Partial<MiniTask>) => {
    if (!supabase || id.startsWith("mini-task-")) return;

    const updatePayload: {
      title?: string;
      body?: string;
      status?: MiniTaskStatus;
      source_project_card_id?: string | null;
      due_date?: string | null;
      assignees?: string[];
      updated_by?: string;
    } = {};

    if (patch.title !== undefined) updatePayload.title = patch.title;
    if (patch.body !== undefined) updatePayload.body = patch.body;
    if (patch.status !== undefined) updatePayload.status = patch.status;
    if (patch.projectCardId !== undefined) updatePayload.source_project_card_id = patch.projectCardId;
    if (patch.dueDate !== undefined) updatePayload.due_date = patch.dueDate;
    if (patch.assignees !== undefined) updatePayload.assignees = patch.assignees;
    if (patch.updatedBy !== undefined) updatePayload.updated_by = patch.updatedBy;

    if (Object.keys(updatePayload).length > 0) {
      await supabase.from("mini_tasks").update(updatePayload).eq("id", id);
    }
    if (patch.tags !== undefined) {
      await persistMiniTaskTags(id, patch.tags);
    }
  };

  const persistCardOrder = async (nextCards: ProjectCard[]) => {
    if (!supabase) return;
    const client = supabase;
    await Promise.all(
      nextCards.map((card, index) =>
        card.id.startsWith("card-")
          ? Promise.resolve()
          : client.from("project_cards").update({ sort_order: index }).eq("id", card.id)
      )
    );
  };

  const updateCard = (id: string, patch: Partial<ProjectCard>) => {
    setCards((current) =>
      current.map((card) =>
        card.id === id ? { ...card, ...patch, updatedAt: now(), updatedBy: "梅澤" } : card
      )
    );
    void persistCardUpdate(id, { ...patch, updatedBy: "梅澤" });
  };

  const updateQa = (id: string, patch: Partial<QaLog>) => {
    setQaLogs((current) =>
      current.map((log) => (log.id === id ? { ...log, ...patch, updatedAt: now() } : log))
    );
    void persistQaUpdate(id, patch);
  };

  const updateMiniTask = (id: string, patch: Partial<MiniTask>) => {
    setMiniTasks((current) =>
      current.map((task) =>
        task.id === id ? { ...task, ...patch, updatedAt: now(), updatedBy: "梅澤" } : task
      )
    );
    void persistMiniTaskUpdate(id, { ...patch, updatedBy: "梅澤" });
  };

  const markCardAnimated = (id: string) => {
    setAnimatedCardId(id);
    window.setTimeout(() => {
      setAnimatedCardId((current) => (current === id ? null : current));
    }, 420);
  };

  const moveCard = (id: string, status: Status) => {
    updateCard(id, { status, isRoutine: false });
    markCardAnimated(id);
  };

  const moveCardToPosition = (id: string, status: Status, targetId?: string) => {
    if (id === targetId) return;
    setCards((current) => {
      const dragged = current.find((card) => card.id === id);
      if (!dragged) return current;

      const withoutDragged = current.filter((card) => card.id !== id);
      const updatedDragged = { ...dragged, status, isRoutine: false, updatedAt: now(), updatedBy: "梅澤" };
      const targetIndex = targetId ? withoutDragged.findIndex((card) => card.id === targetId) : -1;
      const insertIndex =
        targetIndex >= 0
          ? targetIndex
          : withoutDragged.findLastIndex((card) => card.status === status && !card.isRoutine) + 1;
      const next = [...withoutDragged];
      next.splice(insertIndex, 0, updatedDragged);
      void persistCardUpdate(id, { status, isRoutine: false, updatedBy: "梅澤" });
      void persistCardOrder(next);
      markCardAnimated(id);
      return next;
    });
  };

  const reorderCard = (id: string, direction: -1 | 1) => {
    setCards((current) => {
      const index = current.findIndex((card) => card.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= current.length) return current;
      if (current[index].status !== current[target].status) return current;
      const next = [...current];
      const [item] = next.splice(index, 1);
      next.splice(target, 0, item);
      void persistCardOrder(next);
      markCardAnimated(id);
      return next;
    });
  };

  const addTag = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = newTag.trim();
    if (!trimmed || tags.includes(trimmed)) return;
    const color = tagPalette[tags.length % tagPalette.length];

    if (supabase) {
      const { data, error } = await supabase
        .from("tags")
        .insert({
          name: trimmed,
          background_color: color.background,
          border_color: color.border,
          text_color: color.color
        })
        .select("*")
        .single();

      if (error || !data) {
        setTagAlert("タグの追加に失敗しました。Supabaseの設定を確認してください。");
        return;
      }
      const row = data as TagRow;
      setTagIds((current) => ({ ...current, [row.name]: row.id }));
    }

    setTags((current) => [...current, trimmed]);
    setTagColors((current) => ({
      ...current,
      [trimmed]: color
    }));
    setNewTag("");
  };

  const tagUsageCount = (tag: string) => {
    const cardCount = cards.filter((card) => card.tags.includes(tag)).length;
    const qaCount = qaLogs.filter((log) => log.tags.includes(tag)).length;
    const draftCount = cardDraft.tags.includes(tag) ? 1 : 0;
    return cardCount + qaCount + draftCount;
  };

  const showTagUsageAlert = (tag: string) => {
    const count = tagUsageCount(tag);
    if (count > 0) {
      const message = `「${tag}」は${count}件の記録で使用されています。`;
      setTagAlert(message);
    }
    return count;
  };

  const renameTag = async (oldName: string, nextName: string) => {
    const trimmed = nextName.trim();
    if (!trimmed || trimmed === oldName) return;
    if (tags.includes(trimmed)) {
      const message = "同じ名前のタグがすでにあります。";
      setTagAlert(message);
      return;
    }
    showTagUsageAlert(oldName);
    if (supabase && tagIds[oldName]) {
      const { error } = await supabase.from("tags").update({ name: trimmed }).eq("id", tagIds[oldName]);
      if (error) {
        setTagAlert("タグ名の変更に失敗しました。");
        return;
      }
    }
    setTags((current) => current.map((tag) => (tag === oldName ? trimmed : tag)));
    setTagIds((current) => {
      const { [oldName]: oldId, ...rest } = current;
      return oldId ? { ...rest, [trimmed]: oldId } : rest;
    });
    setCards((current) =>
      current.map((card) => ({
        ...card,
        tags: card.tags.map((tag) => (tag === oldName ? trimmed : tag))
      }))
    );
    setQaLogs((current) =>
      current.map((log) => ({
        ...log,
        tags: log.tags.map((tag) => (tag === oldName ? trimmed : tag))
      }))
    );
    setMiniTasks((current) =>
      current.map((task) => ({
        ...task,
        tags: task.tags.map((tag) => (tag === oldName ? trimmed : tag))
      }))
    );
    setCardDraft((current) => ({
      ...current,
      tags: current.tags.map((tag) => (tag === oldName ? trimmed : tag))
    }));
    setMiniTaskDraft((current) => ({
      ...current,
      tags: current.tags.map((tag) => (tag === oldName ? trimmed : tag))
    }));
    setTagColors((current) => {
      const { [oldName]: color, ...rest } = current;
      return { ...rest, [trimmed]: color ?? fallbackTagStyle(oldName, tags) };
    });
  };

  const changeTagColor = async (tag: string, paletteIndex: number) => {
    showTagUsageAlert(tag);
    const color = tagPalette[paletteIndex];
    if (supabase && tagIds[tag]) {
      const { error } = await supabase
        .from("tags")
        .update({
          background_color: color.background,
          border_color: color.border,
          text_color: color.color
        })
        .eq("id", tagIds[tag]);

      if (error) {
        setTagAlert("タグ色の変更に失敗しました。");
        return;
      }
    }
    setTagColors((current) => ({ ...current, [tag]: color }));
  };

  const deleteTag = async (tag: string) => {
    if (showTagUsageAlert(tag) > 0) return;
    if (supabase && tagIds[tag]) {
      const { error } = await supabase.from("tags").delete().eq("id", tagIds[tag]);
      if (error) {
        setTagAlert("タグの削除に失敗しました。");
        return;
      }
    }
    setTags((current) => current.filter((item) => item !== tag));
    setTagIds((current) => {
      const { [tag]: _removed, ...rest } = current;
      return rest;
    });
    setTagColors((current) => {
      const { [tag]: _removed, ...rest } = current;
      return rest;
    });
    setCardDraft((current) => ({
      ...current,
      tags: current.tags.filter((item) => item !== tag)
    }));
    setMiniTaskDraft((current) => ({
      ...current,
      tags: current.tags.filter((item) => item !== tag)
    }));
  };

  const openCreateCard = (status: Status, isRoutine = false) => {
    setCardDraft({
      ...blankCardDraft(tags),
      status,
      isRoutine
    });
    setShowCreateCard(true);
  };

  const registerCard = async (event: FormEvent) => {
    event.preventDefault();
    const title = cardDraft.title.trim();
    if (!title) return;

    if (supabase) {
      const insertPayload: {
        title: string;
        body: string;
        status: Status;
        is_routine: boolean;
        due_date?: string | null;
        assignees: string[];
        sort_order: number;
        updated_by: string;
      } = {
        title,
        body: cardDraft.body,
        status: cardDraft.status,
        is_routine: cardDraft.isRoutine,
        assignees: cardDraft.assignees,
        sort_order: cards.length,
        updated_by: "梅澤"
      };
      if (cardDraft.dueDate) {
        insertPayload.due_date = cardDraft.dueDate;
      }

      const { data, error } = await supabase
        .from("project_cards")
        .insert(insertPayload)
        .select("*")
        .single();

      if (error || !data) {
        setDataNotice("案件の登録に失敗しました。Supabaseの設定を確認してください。");
        return;
      }

      const row = data as ProjectCardRow;
      await persistCardTags(row.id, cardDraft.tags);
      const savedCard: ProjectCard = {
        id: row.id,
        title: row.title,
        body: row.body,
        status: row.status,
        tags: cardDraft.tags,
        assignees: row.assignees ?? cardDraft.assignees,
        isRoutine: row.is_routine,
        dueDate: row.due_date ?? null,
        updatedBy: row.updated_by ?? "梅澤",
        createdAt: new Date(row.created_at).toLocaleString("ja-JP"),
        updatedAt: new Date(row.updated_at).toLocaleString("ja-JP")
      };
      setCards((current) => [savedCard, ...current]);
    } else {
      const card = {
        ...cardDraft,
        id: `card-${Date.now()}`,
        title,
        createdAt: now(),
        updatedAt: now()
      };
      setCards((current) => [card, ...current]);
    }

    setCardDraft(blankCardDraft(tags));
    setShowCreateCard(false);
  };

  const openCreateMiniTask = () => {
    setMiniTaskDraft(blankMiniTaskDraft());
    setMiniTaskFormError(null);
    setShowCreateMiniTask(true);
  };

  const registerMiniTask = async (event: FormEvent) => {
    event.preventDefault();
    const title = miniTaskDraft.title.trim();
    if (!title) return;
    setMiniTaskFormError(null);

    if (supabase) {
      const { data, error } = await supabase
        .from("mini_tasks")
        .insert({
          title,
          body: miniTaskDraft.body,
          status: miniTaskDraft.status,
          source_project_card_id: miniTaskDraft.projectCardId,
          due_date: miniTaskDraft.dueDate,
          assignees: miniTaskDraft.assignees,
          updated_by: "梅澤"
        })
        .select("*")
        .single();

      if (error || !data) {
        setMiniTaskFormError("登録に失敗しました。Supabaseでタスク用SQLを実行してください。");
        return;
      }

      const row = data as MiniTaskRow;
      await persistMiniTaskTags(row.id, miniTaskDraft.tags);
      const savedTask: MiniTask = {
        id: row.id,
        title: row.title,
        body: row.body,
        status: normalizeMiniTaskStatus(row.status),
        projectCardId: row.source_project_card_id ?? null,
        tags: miniTaskDraft.tags,
        assignees: row.assignees ?? miniTaskDraft.assignees,
        dueDate: row.due_date ?? null,
        updatedBy: row.updated_by ?? "梅澤",
        createdAt: new Date(row.created_at).toLocaleString("ja-JP"),
        updatedAt: new Date(row.updated_at).toLocaleString("ja-JP")
      };
      setMiniTasks((current) => [savedTask, ...current]);
    } else {
      setMiniTasks((current) => [
        {
          ...miniTaskDraft,
          id: `mini-task-${Date.now()}`,
          title,
          createdAt: now(),
          updatedAt: now()
        },
        ...current
      ]);
    }

    setMiniTaskDraft(blankMiniTaskDraft());
    setMiniTaskFormError(null);
    setShowCreateMiniTask(false);
  };

  const createMiniTaskFromCardLine = async (card: ProjectCard, line: string) => {
    const title = cleanTaskLine(line);
    const dueDate = card.dueDate;
    const taskBody = `元施策: ${card.title}\n\n本文内のタスク候補:\n${title}`;
    const status: MiniTaskStatus = card.status === "実行中" ? "実施中" : "未着手";

    if (supabase) {
      const { data, error } = await supabase
        .from("mini_tasks")
        .insert({
          title,
          body: taskBody,
          status,
          source_project_card_id: card.id,
          due_date: dueDate,
          assignees: card.assignees,
          updated_by: "梅澤"
        })
        .select("*")
        .single();

      if (error || !data) {
        throw new Error(error?.message ?? "タスクの追加に失敗しました。");
      }

      const row = data as MiniTaskRow;
      await persistMiniTaskTags(row.id, card.tags);
      return {
        id: row.id,
        title: row.title,
        body: row.body,
        status: normalizeMiniTaskStatus(row.status),
        projectCardId: row.source_project_card_id ?? card.id,
        tags: card.tags,
        assignees: row.assignees ?? card.assignees,
        dueDate: row.due_date ?? null,
        updatedBy: row.updated_by ?? "梅澤",
        createdAt: new Date(row.created_at).toLocaleString("ja-JP"),
        updatedAt: new Date(row.updated_at).toLocaleString("ja-JP")
      } satisfies MiniTask;
    }

    return {
      id: `mini-task-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      title,
      body: taskBody,
      status,
      projectCardId: card.id,
      tags: card.tags,
      assignees: card.assignees,
      dueDate,
      updatedBy: "梅澤",
      createdAt: now(),
      updatedAt: now()
    } satisfies MiniTask;
  };

  const createMiniTaskFromAiTask = async (task: {
    sourceCardId: string;
    title: string;
    body: string;
    status: MiniTaskStatus;
    dueDate: string | null;
    assignees: string[];
  }) => {
    const sourceCard = cards.find((card) => card.id === task.sourceCardId) ?? null;
    const title = task.title.trim();
    const taskBody = task.body.trim() || (sourceCard ? `元施策: ${sourceCard.title}` : "");
    const dueDate = normalizeDueDateForDb(task.dueDate);

    if (supabase) {
      const { data, error } = await supabase
        .from("mini_tasks")
        .insert({
          title,
          body: taskBody,
          status: task.status,
          source_project_card_id: sourceCard?.id ?? null,
          due_date: dueDate,
          assignees: task.assignees,
          updated_by: "梅澤"
        })
        .select("*")
        .single();

      if (error || !data) {
        throw new Error(error?.message ?? "タスクの追加に失敗しました。");
      }

      const row = data as MiniTaskRow;
      await persistMiniTaskTags(row.id, sourceCard?.tags ?? []);
      return {
        id: row.id,
        title: row.title,
        body: row.body,
        status: normalizeMiniTaskStatus(row.status),
        projectCardId: row.source_project_card_id ?? sourceCard?.id ?? null,
        tags: sourceCard?.tags ?? [],
        assignees: row.assignees ?? task.assignees,
        dueDate: row.due_date ?? null,
        updatedBy: row.updated_by ?? "梅澤",
        createdAt: new Date(row.created_at).toLocaleString("ja-JP"),
        updatedAt: new Date(row.updated_at).toLocaleString("ja-JP")
      } satisfies MiniTask;
    }

    return {
      id: `mini-task-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      title,
      body: taskBody,
      status: task.status,
      projectCardId: sourceCard?.id ?? null,
      tags: sourceCard?.tags ?? [],
      assignees: task.assignees,
      dueDate,
      updatedBy: "梅澤",
      createdAt: now(),
      updatedAt: now()
    } satisfies MiniTask;
  };

  const extractTasksFromProjectBodies = async () => {
    if (isExtractingTasks) return;
    const existingTitles = new Set(miniTasks.map((task) => normalizeTaskTitle(task.title)));

    try {
      setIsExtractingTasks(true);
      setTaskNotice("AIで施策本文からタスク候補を抽出しています。");
      setDataNotice("AIで施策本文からタスク候補を抽出しています。");
      const response = await fetch("/api/ai/extract-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          existingTitles: Array.from(existingTitles),
          cards: cards
            .filter((card) => card.status !== "完了" && card.body.trim())
            .map((card) => ({
              id: card.id,
              title: card.title,
              body: card.body,
              status: card.status,
              dueDate: card.dueDate,
              tags: card.tags
            }))
        })
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const result = (await response.json()) as {
        tasks?: Array<{
          sourceCardId: string;
          title: string;
          body: string;
          status: MiniTaskStatus;
          dueDate: string | null;
        }>;
      };
      const seenTitles = new Set<string>();
      const candidates = (result.tasks ?? []).flatMap((task, index) => {
        const key = normalizeTaskTitle(task.title);
        if (!key || seenTitles.has(key)) return [];
        seenTitles.add(key);
        const sourceCard = cards.find((card) => card.id === task.sourceCardId);
        if (!sourceCard) return [];

        const exactDuplicate = miniTasks.find((existing) => normalizeTaskTitle(existing.title) === key);
        const similarDuplicate = miniTasks.find((existing) => {
          if (exactDuplicate) return false;
          const sameCard = existing.projectCardId && existing.projectCardId === task.sourceCardId;
          return sameCard && taskSimilarity(existing.title, task.title) >= 0.6;
        });
        const duplicateWarning = exactDuplicate
          ? `既存タスク「${exactDuplicate.title}」と同じ可能性があります。`
          : similarDuplicate
            ? `既存タスク「${similarDuplicate.title}」と近い可能性があります。`
            : null;

        return [{
          ...task,
          assignees: sourceCard.assignees,
          clientId: `${task.sourceCardId}-${index}-${key}`,
          duplicateWarning,
          selected: duplicateWarning === null
        } satisfies ExtractedTaskCandidate];
      });

      if (candidates.length === 0) {
        setTaskNotice("追加できる新しいタスク候補は見つかりませんでした。");
        setDataNotice("追加できる新しいタスク候補は見つかりませんでした。");
        return;
      }

      setTaskCandidates(candidates);
      setShowTaskCandidateModal(true);
      const selectedCount = candidates.filter((candidate) => candidate.selected).length;
      const warningCount = candidates.length - selectedCount;
      setTaskNotice(`AI候補が${candidates.length}件あります。${warningCount > 0 ? `${warningCount}件は重複候補として未選択です。` : "追加前に確認してください。"}`);
      setDataNotice("AIタスク候補を確認してください。");
    } catch (error) {
      setTaskNotice(error instanceof Error ? `AIタスク抽出に失敗しました: ${error.message}` : "AIタスク抽出に失敗しました。");
      setDataNotice(error instanceof Error ? `AIタスク抽出に失敗しました: ${error.message}` : "AIタスク抽出に失敗しました。");
    } finally {
      setIsExtractingTasks(false);
    }
  };

  const updateTaskCandidate = (clientId: string, patch: Partial<ExtractedTaskCandidate>) => {
    setTaskCandidates((current) =>
      current.map((candidate) => (candidate.clientId === clientId ? { ...candidate, ...patch } : candidate))
    );
  };

  const confirmTaskCandidates = async () => {
    const selected = taskCandidates.filter((candidate) => candidate.selected);
    if (selected.length === 0) {
      setTaskNotice("追加するタスクが選択されていません。");
      return;
    }

    try {
      setIsExtractingTasks(true);
      const createdTasks: MiniTask[] = [];
      for (const candidate of selected) {
        createdTasks.push(await createMiniTaskFromAiTask(candidate));
      }
      setMiniTasks((current) => [...createdTasks, ...current]);
      setTaskNotice(`タスクを${createdTasks.length}件追加しました。`);
      setDataNotice(`タスクを${createdTasks.length}件追加しました。`);
      setShowTaskCandidateModal(false);
      setTaskCandidates([]);
      setEditingTaskCandidateId(null);
    } catch (error) {
      setTaskNotice(error instanceof Error ? `タスク追加に失敗しました: ${error.message}` : "タスク追加に失敗しました。");
    } finally {
      setIsExtractingTasks(false);
    }
  };

  const createQaLog = async () => {
    if (supabase) {
      const { data, error } = await supabase
        .from("qa_logs")
        .insert({
          title: "新しいQA",
          body: "",
          type: "QA",
          state: "未対応"
        })
        .select("*")
        .single();

      if (error || !data) {
        setDataNotice("QAの登録に失敗しました。Supabaseの設定を確認してください。");
        return;
      }

      const row = data as QaLogRow;
      const initialQaTags = tags.slice(0, 1);
      await persistQaTags(row.id, initialQaTags);
      setQaLogs((current) => [
        {
          id: row.id,
          title: row.title,
          body: row.body,
          type: row.type,
          state: row.state,
          tags: initialQaTags,
          createdAt: new Date(row.created_at).toLocaleString("ja-JP"),
          updatedAt: new Date(row.updated_at).toLocaleString("ja-JP")
        },
        ...current
      ]);
      return;
    }

    setQaLogs((current) => [emptyQa(tags), ...current]);
  };

  const deleteCard = async (id: string) => {
    if (supabase && !id.startsWith("card-")) {
      const { error } = await supabase.from("project_cards").delete().eq("id", id);
      if (error) {
        setDataNotice("案件の削除に失敗しました。");
        return;
      }
    }
    setCards((current) => current.filter((card) => card.id !== id));
    setSelectedCardId(null);
  };

  const deleteMiniTask = async (id: string) => {
    if (supabase && !id.startsWith("mini-task-")) {
      const { error } = await supabase.from("mini_tasks").delete().eq("id", id);
      if (error) {
        setDataNotice("タスクの削除に失敗しました。");
        return;
      }
    }
    setMiniTasks((current) => current.filter((task) => task.id !== id));
    setSelectedMiniTaskId(null);
  };

  const deleteQaLog = async (id: string) => {
    if (supabase && !id.startsWith("qa-")) {
      const { error } = await supabase.from("qa_logs").delete().eq("id", id);
      if (error) {
        setDataNotice("QAの削除に失敗しました。");
        return;
      }
    }
    setQaLogs((current) => current.filter((log) => log.id !== id));
    setSelectedQaId(null);
  };

  return (
    <main>
      <aside className="sidebar">
        <div>
          <p className="eyebrow">China EC</p>
          <h1>Dragon Deck</h1>
        </div>
        <nav>
          <button className={view === "board" ? "active" : ""} onClick={() => setView("board")}>
            施策ダッシュボード
          </button>
          <button className={view === "tags" ? "active" : ""} onClick={() => setView("tags")}>
            タグ別ビュー
          </button>
          <button className={view === "tagAdmin" ? "active" : ""} onClick={() => setView("tagAdmin")}>
            タグ管理
          </button>
          <button className={view === "users" ? "active" : ""} onClick={() => setView("users")}>
            許可ユーザー
          </button>
        </nav>
        <section className="loginBox">
          {canUseApp ? (
            <>
              <p>{currentUserEmail || "ローカル表示"}</p>
              {supabase ? <button onClick={() => void signOut()}>ログアウト</button> : null}
            </>
          ) : (
            <>
              <p>{currentUserEmail ? `${currentUserEmail} は未許可です。` : "Googleログインが必要です。"}</p>
              {supabase ? <button onClick={() => void signInWithGoogle()}>Googleでログイン</button> : null}
            </>
          )}
        </section>
      </aside>

      <section className="content">
        {dataNotice ? <div className="dataNotice">{dataNotice}</div> : null}
        {!canUseApp && hasSupabaseConfig ? (
          <section className="panel authPanel">
            <h2>{authStatus === "unauthorized" ? "アクセスできません" : "ログインしてください"}</h2>
            <p className="muted">
              {authStatus === "unauthorized"
                ? "このGoogleアカウントは許可ユーザーリストに入っていません。管理者にメールアドレスの追加を依頼してください。"
                : "チーム用ボードを見るには、許可されたGoogleアカウントでログインしてください。"}
            </p>
            {supabase ? <button className="primary" onClick={() => void signInWithGoogle()}>Googleでログイン</button> : null}
          </section>
        ) : null}
        {canUseApp && view === "board" && (
          <>
            <header className="toolbar">
              <div>
                <h2>施策ダッシュボード</h2>
                <p>追加したい列から案件を登録します。</p>
              </div>
              <button onClick={() => setShowCompleted((current) => !current)}>
                {showCompleted ? "完了を隠す" : "完了を表示"}
              </button>
            </header>
            <div className="boardLayout">
              <div className="boardStack">
                <div className={showCompleted ? "kanban withCompleted" : "kanban"}>
                  {visibleStatuses.map((status) => (
                  <section
                    className="column"
                    key={status}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      moveCardToPosition(event.dataTransfer.getData("text/plain"), status);
                    }}
                  >
                    <div className="columnHeader">
                      <h3>{status}</h3>
                      <button onClick={() => openCreateCard(status)}>追加</button>
                    </div>
                    {cards
                      .filter((card) => card.status === status && !card.isRoutine)
                      .map((card) => (
                        <CardTile
                          key={card.id}
                          card={card}
                          linkedTasks={miniTasks.filter((task) => task.projectCardId === card.id)}
                          isSelected={selectedCardId === card.id}
                          tags={tags}
                          tagColors={tagColors}
                          isAnimated={animatedCardId === card.id}
                          onOpen={() => setSelectedCardId(card.id)}
                          onOpenTask={(taskId) => setSelectedMiniTaskId(taskId)}
                          onReorder={(direction) => reorderCard(card.id, direction)}
                          onDropOnCard={(draggedId) => moveCardToPosition(draggedId, status, card.id)}
                        />
                      ))}
                  </section>
                  ))}
                </div>
                <section className="miniTaskArea">
                  <div>
                    <h3>タスク</h3>
                    <p>施策カードにするほどではない、小さな作業を残します。</p>
                  </div>
                  <div className="miniTaskActions">
                    <button
                      className={isExtractingTasks ? "routineAdd processingButton" : "routineAdd"}
                      disabled={isExtractingTasks}
                      onClick={() => void extractTasksFromProjectBodies()}
                    >
                      {isExtractingTasks ? <span className="spinner" /> : null}
                      {isExtractingTasks ? "抽出中" : "施策本文から追加"}
                    </button>
                    <button className="routineAdd" onClick={openCreateMiniTask}>追加</button>
                  </div>
                  {taskNotice ? <div className="taskNotice">{taskNotice}</div> : null}
                  <div className="miniTaskList">
                    {visibleMiniTasks.length === 0 ? <p className="muted">表示中のタスクはありません。</p> : null}
                    {visibleMiniTasks.map((task) => (
                      <div
                        className="miniTaskRow"
                        key={task.id}
                      >
                        <button className="miniTaskOpen" onClick={() => setSelectedMiniTaskId(task.id)}>
                          <span className="miniTaskMain">
                            <strong>{task.title}</strong>
                            <span>
                              {task.projectCardId
                                ? `施策: ${cards.find((card) => card.id === task.projectCardId)?.title ?? "未設定"}`
                                : task.body || "本文未入力"}
                            </span>
                          </span>
                        </button>
                        <span>{task.status}</span>
                        <span>{task.dueDate ? formatDueDate(task.dueDate) : "期限なし"}</span>
                        <span className="assigneesText">{task.assignees.length ? `担当 ${task.assignees.join(" / ")}` : "担当なし"}</span>
                        <span className="miniTaskTags">{task.tags.join(" / ") || "タグなし"}</span>
                        <button
                          aria-label="タスクを削除"
                          className="miniTaskDelete"
                          title="タスクを削除"
                          onClick={() => {
                            if (window.confirm("このタスクを削除しますか？")) {
                              void deleteMiniTask(task.id);
                            }
                          }}
                        >
                          <svg aria-hidden="true" viewBox="0 0 24 24">
                            <path d="M9 4h6" />
                            <path d="M5 7h14" />
                            <path d="M10 11v6" />
                            <path d="M14 11v6" />
                            <path d="M7 7l1 13h8l1-13" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
                <section
                  className="routineArea"
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => updateCard(event.dataTransfer.getData("text/plain"), { isRoutine: true })}
                >
                  <div>
                    <h3>定常運用</h3>
                    <p>継続して回している施策をここに置きます。</p>
                  </div>
                  <button className="routineAdd" onClick={() => openCreateCard("実行中", true)}>追加</button>
                  <div className="routineGrid">
                    {visibleRoutineCards.map((card) => (
                      <CardTile
                        key={card.id}
                        card={card}
                        linkedTasks={miniTasks.filter((task) => task.projectCardId === card.id)}
                        isSelected={selectedCardId === card.id}
                        tags={tags}
                        tagColors={tagColors}
                        isAnimated={animatedCardId === card.id}
                        onOpen={() => setSelectedCardId(card.id)}
                        onOpenTask={(taskId) => setSelectedMiniTaskId(taskId)}
                        onReorder={(direction) => reorderCard(card.id, direction)}
                        onDropOnCard={(draggedId) => moveCardToPosition(draggedId, card.status, card.id)}
                      />
                    ))}
                  </div>
                </section>
              </div>
            </div>
          </>
        )}

        {canUseApp && view === "tags" && (
          <>
            <header className="toolbar">
              <div>
                <h2>タグ別横断ビュー</h2>
                <p>テーマごとに走っている案件を確認します。</p>
              </div>
            </header>
            <div className="listGrid">
              {cardsByTag.map(({ tag, cards: taggedCards }) => (
                <section className="panel" key={tag}>
                  <h3>{tag}</h3>
                  {taggedCards.length === 0 ? <p className="muted">該当案件なし</p> : null}
                  {taggedCards.map((card) => (
                    <button
                      aria-current={selectedCardId === card.id ? "true" : undefined}
                      className={
                        selectedCardId === card.id || hoveredTagCardId === card.id
                          ? "rowButton selected"
                          : "rowButton"
                      }
                      key={card.id}
                      onClick={() => setSelectedCardId(card.id)}
                      onMouseEnter={() => setHoveredTagCardId(card.id)}
                      onMouseLeave={() => setHoveredTagCardId(null)}
                    >
                      <strong>{card.title}</strong>
                      <span>{card.isRoutine ? "定常運用" : card.status}</span>
                    </button>
                  ))}
                </section>
              ))}
            </div>
          </>
        )}

        {canUseApp && view === "tagAdmin" && (
          <section className="panel wide">
            <h2>タグ管理</h2>
            {tagAlert ? <div className="alertBanner" role="alert">{tagAlert}</div> : null}
            <form className="inlineForm" onSubmit={addTag}>
              <input value={newTag} onChange={(event) => setNewTag(event.target.value)} placeholder="新しいタグ" />
              <button type="submit">追加</button>
            </form>
            <div className="tagAdminList">
              {tags.map((tag) => (
                <TagAdminRow
                  key={tag}
                  tag={tag}
                  tags={tags}
                  tagColors={tagColors}
                  usageCount={tagUsageCount(tag)}
                  onRename={renameTag}
                  onColorChange={changeTagColor}
                  onDelete={deleteTag}
                />
              ))}
            </div>
          </section>
        )}

        {canUseApp && view === "users" && (
          <section className="panel wide">
            <h2>ユーザー許可リスト管理</h2>
            <p className="muted">MVPでは許可するGoogleアカウントをシンプルに管理します。</p>
            <textarea value={allowedUsers} onChange={(event) => setAllowedUsers(event.target.value)} rows={8} />
          </section>
        )}
      </section>

      {showCreateCard && (
        <Modal title="案件を追加" onClose={() => setShowCreateCard(false)}>
          <form className="createForm" onSubmit={registerCard}>
            <EditorField
              label="タイトル"
              required
              value={cardDraft.title}
              onChange={(value) => setCardDraft((current) => ({ ...current, title: value }))}
            />
            <EditorArea
              label="本文"
              value={cardDraft.body}
              onChange={(value) => setCardDraft((current) => ({ ...current, body: value }))}
              rows={7}
              voiceEnabled
            />
            <DateField
              label="期限"
              value={cardDraft.dueDate}
              onChange={(value) => setCardDraft((current) => ({ ...current, dueDate: value }))}
            />
            <AssigneePicker
              selected={cardDraft.assignees}
              onChange={(next) => setCardDraft((current) => ({ ...current, assignees: next }))}
            />
            <label>
              ステータス
              <select
                value={cardDraft.status}
                onChange={(event) =>
                  setCardDraft((current) => ({ ...current, status: event.target.value as Status }))
                }
              >
                {statuses.map((status) => <option key={status}>{status}</option>)}
              </select>
            </label>
            <label className="checkboxLine">
              <input
                checked={cardDraft.isRoutine}
                type="checkbox"
                onChange={(event) =>
                  setCardDraft((current) => ({ ...current, isRoutine: event.target.checked }))
                }
              />
              定常運用に入れる
            </label>
            <TagPicker
              allTags={tags}
              tagColors={tagColors}
              selected={cardDraft.tags}
              onChange={(next) => setCardDraft((current) => ({ ...current, tags: next }))}
            />
            <div className="formActions">
              <button type="button" onClick={() => setShowCreateCard(false)}>キャンセル</button>
              <button className="primary" type="submit">登録</button>
            </div>
          </form>
        </Modal>
      )}

      {showCreateMiniTask && (
        <Modal title="タスクを追加" onClose={() => { setMiniTaskFormError(null); setShowCreateMiniTask(false); }}>
          <form className="createForm" onSubmit={registerMiniTask}>
            {miniTaskFormError ? <div className="formError" role="alert">{miniTaskFormError}</div> : null}
            <EditorField
              label="タイトル"
              required
              value={miniTaskDraft.title}
              onChange={(value) => setMiniTaskDraft((current) => ({ ...current, title: value }))}
            />
            <EditorArea
              label="本文"
              value={miniTaskDraft.body}
              onChange={(value) => setMiniTaskDraft((current) => ({ ...current, body: value }))}
              rows={6}
              voiceEnabled
            />
            <div className="compactFields">
              <label>
                ステータス
                <select
                  value={miniTaskDraft.status}
                  onChange={(event) =>
                    setMiniTaskDraft((current) => ({ ...current, status: event.target.value as MiniTaskStatus }))
                  }
                >
                  {miniTaskStatuses.map((status) => <option key={status}>{status}</option>)}
                </select>
              </label>
              <DateField
                label="期限"
                value={miniTaskDraft.dueDate}
                onChange={(value) => setMiniTaskDraft((current) => ({ ...current, dueDate: value }))}
              />
            </div>
            <ProjectCardSelect
              cards={cards}
              label="紐づける施策"
              value={miniTaskDraft.projectCardId}
              onChange={(value) => setMiniTaskDraft((current) => ({ ...current, projectCardId: value }))}
            />
            <AssigneePicker
              selected={miniTaskDraft.assignees}
              onChange={(next) => setMiniTaskDraft((current) => ({ ...current, assignees: next }))}
            />
            <TagPicker
              allTags={tags}
              tagColors={tagColors}
              selected={miniTaskDraft.tags}
              onChange={(next) => setMiniTaskDraft((current) => ({ ...current, tags: next }))}
            />
            <div className="formActions">
              <button type="button" onClick={() => setShowCreateMiniTask(false)}>キャンセル</button>
              <button className="primary" type="submit">登録</button>
            </div>
          </form>
        </Modal>
      )}

      {showTaskCandidateModal && (
        <Modal
          size="large"
          title={editingTaskCandidateId ? "タスク候補を編集" : "追加するタスクを確認"}
          onClose={() => {
            setShowTaskCandidateModal(false);
            setTaskCandidates([]);
            setEditingTaskCandidateId(null);
          }}
        >
          <div className="candidateModal">
            {editingTaskCandidateId ? (
              (() => {
                const candidate = taskCandidates.find((item) => item.clientId === editingTaskCandidateId);
                if (!candidate) return null;
                const sourceCard = cards.find((card) => card.id === candidate.sourceCardId);
                return (
                  <div className="candidateEditor">
                    <button className="backButton" type="button" onClick={() => setEditingTaskCandidateId(null)}>
                      候補一覧に戻る
                    </button>
                    <section className="candidateSource">
                      <span>{sourceCard?.status ?? "状態不明"}</span>
                      <strong>{sourceCard?.title ?? "紐づく施策が見つかりません"}</strong>
                      {sourceCard?.tags.length ? <small>{sourceCard.tags.join(" / ")}</small> : null}
                    </section>
                    {candidate.duplicateWarning ? <div className="candidateWarning">{candidate.duplicateWarning}</div> : null}
                    <label className="candidateCheck">
                      <input
                        checked={candidate.selected}
                        type="checkbox"
                        onChange={(event) => updateTaskCandidate(candidate.clientId, { selected: event.target.checked })}
                      />
                      追加する
                    </label>
                    <label>
                      タイトル
                      <input
                        autoFocus
                        value={candidate.title}
                        onChange={(event) => updateTaskCandidate(candidate.clientId, { title: event.target.value })}
                      />
                    </label>
                    <label>
                      本文
                      <EditorArea
                        label=""
                        rows={8}
                        value={candidate.body}
                        voiceEnabled
                        onChange={(value) => updateTaskCandidate(candidate.clientId, { body: value })}
                      />
                    </label>
                    <div className="candidateMeta">
                      <span>施策: {sourceCard?.title ?? "不明"}</span>
                      <span>状態: {candidate.status}</span>
                      <DateField
                        label="期限"
                        value={candidate.dueDate}
                        onChange={(value) => updateTaskCandidate(candidate.clientId, { dueDate: value })}
                      />
                    </div>
                    <AssigneePicker
                      selected={candidate.assignees}
                      onChange={(next) => updateTaskCandidate(candidate.clientId, { assignees: next })}
                    />
                    <div className="formActions">
                      <button type="button" onClick={() => setEditingTaskCandidateId(null)}>
                        候補一覧に戻る
                      </button>
                      <button
                        className="primary"
                        type="button"
                        onClick={() => {
                          updateTaskCandidate(candidate.clientId, { selected: true });
                          setEditingTaskCandidateId(null);
                        }}
                      >
                        保存
                      </button>
                    </div>
                  </div>
                );
              })()
            ) : (
              <>
                <p className="muted">AIが抽出した候補です。候補をクリックすると内容を編集できます。追加されるのはチェック済みの候補だけです。</p>
                <div className="candidateList">
                  {cards
                    .filter((card) => taskCandidates.some((candidate) => candidate.sourceCardId === card.id))
                    .map((sourceCard) => {
                      const sourceCandidates = taskCandidates.filter((candidate) => candidate.sourceCardId === sourceCard.id);
                      const selectedCount = sourceCandidates.filter((candidate) => candidate.selected).length;
                    return (
                      <section className="candidateGroup" key={sourceCard.id}>
                        <header className="candidateGroupHeader">
                          <div>
                            <span>{sourceCard.status}</span>
                            <h3>{sourceCard.title}</h3>
                            {sourceCard.tags.length ? <small>{sourceCard.tags.join(" / ")}</small> : null}
                          </div>
                          <strong>{selectedCount}/{sourceCandidates.length}件追加</strong>
                        </header>
                        <div className="candidateGroupItems">
                          {sourceCandidates.map((candidate) => (
                            <section
                              className={candidate.duplicateWarning ? "candidateItem warning" : "candidateItem"}
                              key={candidate.clientId}
                            >
                              <label className="candidateCheck" onClick={(event) => event.stopPropagation()}>
                                <input
                                  checked={candidate.selected}
                                  type="checkbox"
                                  onChange={(event) => updateTaskCandidate(candidate.clientId, { selected: event.target.checked })}
                                />
                                追加する
                              </label>
                              <button
                                className="candidateOpen"
                                type="button"
                                onClick={() => setEditingTaskCandidateId(candidate.clientId)}
                              >
                                <strong>{candidate.title}</strong>
                                <span>{candidate.body}</span>
                                <small>期限: {candidate.dueDate ? formatDueDate(candidate.dueDate) : "なし"}</small>
                              </button>
                              {candidate.duplicateWarning ? <div className="candidateWarning">{candidate.duplicateWarning}</div> : null}
                            </section>
                          ))}
                        </div>
                      </section>
                    );
                  })}
                </div>
                <div className="formActions">
                  <button
                    type="button"
                    onClick={() => {
                      setShowTaskCandidateModal(false);
                      setTaskCandidates([]);
                      setEditingTaskCandidateId(null);
                    }}
                  >
                    キャンセル
                  </button>
                  <button
                    className="primary"
                    disabled={isExtractingTasks || taskCandidates.every((candidate) => !candidate.selected)}
                    type="button"
                    onClick={() => void confirmTaskCandidates()}
                  >
                    {isExtractingTasks ? "追加中" : "チェックした候補だけ追加"}
                  </button>
                </div>
              </>
            )}
          </div>
        </Modal>
      )}

      {selectedCard && (
        <Drawer title="案件詳細" onClose={() => setSelectedCardId(null)}>
          <EditorField label="タイトル" value={selectedCard.title} onChange={(value) => updateCard(selectedCard.id, { title: value })} />
          <EditorArea label="本文" value={selectedCard.body} onChange={(value) => updateCard(selectedCard.id, { body: value })} rows={18} voiceEnabled />
          <div className="compactFields">
            <label>
              ステータス
              <select value={selectedCard.status} onChange={(event) => updateCard(selectedCard.id, { status: event.target.value as Status })}>
                {statuses.map((status) => <option key={status}>{status}</option>)}
              </select>
            </label>
            <DateField label="期限" value={selectedCard.dueDate} onChange={(value) => updateCard(selectedCard.id, { dueDate: value })} />
          </div>
          <label className="checkboxLine">
            <input
              checked={selectedCard.isRoutine}
              type="checkbox"
              onChange={(event) => updateCard(selectedCard.id, { isRoutine: event.target.checked })}
            />
            定常運用に入れる
          </label>
          <TagPicker allTags={tags} tagColors={tagColors} selected={selectedCard.tags} onChange={(next) => updateCard(selectedCard.id, { tags: next })} />
          <AssigneePicker
            selected={selectedCard.assignees}
            onChange={(next) => updateCard(selectedCard.id, { assignees: next })}
          />
          <div className="drawerFooter">
            <button
              aria-label="案件を削除"
              className="iconDeleteButton"
              title="案件を削除"
              onClick={() => {
                if (window.confirm("この案件を削除しますか？")) {
                  void deleteCard(selectedCard.id);
                }
              }}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24">
                <path d="M9 4h6" />
                <path d="M5 7h14" />
                <path d="M10 11v6" />
                <path d="M14 11v6" />
                <path d="M7 7l1 13h8l1-13" />
              </svg>
            </button>
          </div>
        </Drawer>
      )}

      {selectedMiniTask && (
        <Drawer title="タスク詳細" onClose={() => setSelectedMiniTaskId(null)}>
          <EditorField label="タイトル" value={selectedMiniTask.title} onChange={(value) => updateMiniTask(selectedMiniTask.id, { title: value })} />
          <EditorArea label="本文" value={selectedMiniTask.body} onChange={(value) => updateMiniTask(selectedMiniTask.id, { body: value })} rows={12} voiceEnabled />
          <div className="compactFields">
            <label>
              ステータス
              <select
                value={selectedMiniTask.status}
                onChange={(event) =>
                  updateMiniTask(selectedMiniTask.id, { status: event.target.value as MiniTaskStatus })
                }
              >
                {miniTaskStatuses.map((status) => <option key={status}>{status}</option>)}
              </select>
            </label>
            <DateField label="期限" value={selectedMiniTask.dueDate} onChange={(value) => updateMiniTask(selectedMiniTask.id, { dueDate: value })} />
          </div>
          <ProjectCardSelect
            cards={cards}
            label="紐づける施策"
            value={selectedMiniTask.projectCardId}
            onChange={(value) => updateMiniTask(selectedMiniTask.id, { projectCardId: value })}
          />
          <AssigneePicker
            selected={selectedMiniTask.assignees}
            onChange={(next) => updateMiniTask(selectedMiniTask.id, { assignees: next })}
          />
          <TagPicker allTags={tags} tagColors={tagColors} selected={selectedMiniTask.tags} onChange={(next) => updateMiniTask(selectedMiniTask.id, { tags: next })} />
          <div className="drawerFooter">
            <button
              aria-label="タスクを削除"
              className="iconDeleteButton"
              title="タスクを削除"
              onClick={() => {
                if (window.confirm("このタスクを削除しますか？")) {
                  void deleteMiniTask(selectedMiniTask.id);
                }
              }}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24">
                <path d="M9 4h6" />
                <path d="M5 7h14" />
                <path d="M10 11v6" />
                <path d="M14 11v6" />
                <path d="M7 7l1 13h8l1-13" />
              </svg>
            </button>
          </div>
        </Drawer>
      )}

    </main>
  );
}

function Drawer({ children, title, onClose }: { children: React.ReactNode; title: string; onClose: () => void }) {
  return (
    <aside className="drawer">
      <header>
        <h2>{title}</h2>
        <button onClick={onClose}>閉じる</button>
      </header>
      {children}
    </aside>
  );
}

function Modal({
  children,
  title,
  onClose,
  size = "default"
}: {
  children: React.ReactNode;
  title: string;
  onClose: () => void;
  size?: "default" | "large";
}) {
  return (
    <div className="modalBackdrop">
      <section className={size === "large" ? "modalPanel large" : "modalPanel"} role="dialog" aria-modal="true" aria-label={title}>
        <header>
          <h2>{title}</h2>
          <button onClick={onClose}>閉じる</button>
        </header>
        {children}
      </section>
    </div>
  );
}

function EditorField({
  label,
  required = false,
  value,
  onChange
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      {label}
      <input required={required} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function EditorArea({
  label,
  value,
  onChange,
  rows = 8,
  voiceEnabled = false
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  voiceEnabled?: boolean;
}) {
  const [isListening, setIsListening] = useState(false);
  const [isPolishingVoice, setIsPolishingVoice] = useState(false);
  const [speechMessage, setSpeechMessage] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const appendVoiceText = async (audioBlob: Blob) => {
    setIsPolishingVoice(true);
    setSpeechMessage("AIで文字起こし・日本語整形中です。");
    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "voice.webm");

      const response = await fetch("/api/ai/voice-transcribe", {
        method: "POST",
        cache: "no-store",
        body: formData
      });

      if (!response.ok) {
        const contentType = response.headers.get("content-type") ?? "";
        const errorText = contentType.includes("application/json")
          ? ((await response.json()) as { error?: string }).error ?? "不明なエラー"
          : await response.text();
        setSpeechMessage(`音声入力に失敗しました: ${errorText.slice(0, 120)}`);
        return;
      }

      const result = (await response.json()) as { text?: string };
      const text = result.text?.trim();
      if (text) {
        onChange(value ? `${value}\n${text}` : text);
        setSpeechMessage("日本語テキストとして追加しました。");
      } else {
        setSpeechMessage("音声をテキスト化できませんでした。");
      }
    } finally {
      setIsPolishingVoice(false);
    }
  };

  const startVoiceInput = async () => {
    if (isListening) {
      mediaRecorderRef.current?.stop();
      return;
    }

    if (typeof navigator === "undefined" || !navigator.mediaDevices || typeof MediaRecorder === "undefined") {
      setSpeechMessage("このブラウザは録音に対応していません。Chromeで試してください。");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        setIsListening(false);
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        void appendVoiceText(audioBlob);
      };
      recorder.start();
      setSpeechMessage("録音中。もう一度押すと停止してAI整形します。");
      setIsListening(true);
    } catch {
      setSpeechMessage("マイクを使えません。ブラウザのマイク許可を確認してください。");
      setIsListening(false);
    }
  };

  return (
    <label className="editorAreaLabel">
      <span className="editorAreaHeader">
        {label}
        {voiceEnabled ? (
          <button
            aria-label={isListening ? "録音を停止" : "音声で入力"}
            className={[
              "micButton",
              isListening ? "listening" : "",
              isPolishingVoice ? "processing" : ""
            ].filter(Boolean).join(" ")}
            disabled={isPolishingVoice}
            onClick={startVoiceInput}
            title={isListening ? "録音を停止" : "音声で入力"}
            type="button"
          >
            {isPolishingVoice ? <span className="spinner" /> : (
              <svg aria-hidden="true" viewBox="0 0 24 24">
                <path d="M12 4a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V7a3 3 0 0 0-3-3Z" />
                <path d="M5 11a7 7 0 0 0 14 0" />
                <path d="M12 18v3" />
                <path d="M9 21h6" />
              </svg>
            )}
            {isListening ? <span className="recordingDot" /> : null}
          </button>
        ) : null}
      </span>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={rows} />
      {voiceEnabled && speechMessage ? (
        <span className={isListening || isPolishingVoice ? "speechMessage active" : "speechMessage"}>
          {isPolishingVoice ? <span className="spinner" /> : null}
          {speechMessage}
        </span>
      ) : null}
    </label>
  );
}

function DateField({
  label,
  value,
  onChange
}: {
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  return (
    <label>
      {label}
      <div className="dateField">
        <input type="date" value={value ?? ""} onChange={(event) => onChange(event.target.value || null)} />
        <button type="button" onClick={() => onChange(null)}>
          クリア
        </button>
      </div>
    </label>
  );
}

function ProjectCardSelect({
  cards,
  label,
  value,
  onChange
}: {
  cards: ProjectCard[];
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  return (
    <label>
      {label}
      <select value={value ?? ""} onChange={(event) => onChange(event.target.value || null)}>
        <option value="">紐づけなし</option>
        {cards.map((card) => (
          <option key={card.id} value={card.id}>
            {card.title}
          </option>
        ))}
      </select>
    </label>
  );
}

function AssigneePicker({
  selected,
  onChange
}: {
  selected: string[];
  onChange: (value: string[]) => void;
}) {
  const toggleAssignee = (assignee: string) => {
    onChange(
      selected.includes(assignee)
        ? selected.filter((item) => item !== assignee)
        : [...selected, assignee]
    );
  };

  return (
    <section className="assigneePicker" aria-label="担当">
      <p className="fieldLabel">担当</p>
      <div>
        {assigneeOptions.map((assignee) => (
          <button
            className={selected.includes(assignee) ? "selected" : ""}
            key={assignee}
            type="button"
            onClick={() => toggleAssignee(assignee)}
          >
            {assignee}
          </button>
        ))}
      </div>
    </section>
  );
}

function CardTile({
  card,
  linkedTasks,
  isSelected,
  isAnimated,
  tags,
  tagColors,
  onOpen,
  onOpenTask,
  onReorder,
  onDropOnCard
}: {
  card: ProjectCard;
  linkedTasks: MiniTask[];
  isSelected: boolean;
  isAnimated: boolean;
  tags: string[];
  tagColors: Record<string, TagColor>;
  onOpen: () => void;
  onOpenTask: (taskId: string) => void;
  onReorder: (direction: -1 | 1) => void;
  onDropOnCard: (draggedId: string) => void;
}) {
  const googleDocLinks = getGoogleDocLinks(card.body);

  return (
    <article
      className={[
        "card",
        isSelected ? "selected" : "",
        isAnimated ? "moved" : ""
      ].filter(Boolean).join(" ")}
      draggable
      onClick={onOpen}
      onDragStart={(event) => event.dataTransfer.setData("text/plain", card.id)}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onDropOnCard(event.dataTransfer.getData("text/plain"));
      }}
    >
      <div className="cardTopline">
        <h4>{card.title}</h4>
        <div className="cardMeta">
          {card.dueDate ? <span className="dueText">期限 {formatDueDate(card.dueDate)}</span> : null}
          {card.isRoutine ? <span className="routineBadge">定常</span> : null}
        </div>
      </div>
      {card.assignees.length > 0 ? (
        <div className="assigneeLine" aria-label="担当者">
          {card.assignees.map((assignee) => (
            <span key={assignee}>{assignee}</span>
          ))}
        </div>
      ) : null}
      <div className="tags">
        {card.tags.map((tag) => (
          <span key={tag} style={tagStyle(tag, tags, tagColors)}>{tag}</span>
        ))}
      </div>
      <p className="cardBodyPreview">{card.body || "本文未入力"}</p>
      {googleDocLinks.length > 0 ? (
        <div className="cardDocLinks">
          {googleDocLinks.map((link, index) => (
            <a
              href={link}
              key={link}
              onClick={(event) => event.stopPropagation()}
              rel="noreferrer"
              target="_blank"
              title={link}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24">
                <path d="M14 4h6v6" />
                <path d="M10 14L20 4" />
                <path d="M20 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h5" />
              </svg>
              Doc{googleDocLinks.length > 1 ? index + 1 : ""}
            </a>
          ))}
        </div>
      ) : null}
      <div className="cardActions">
        <button aria-label="上へ移動" title="上へ移動" onClick={(event) => { event.stopPropagation(); onReorder(-1); }}>↑</button>
        <button aria-label="下へ移動" title="下へ移動" onClick={(event) => { event.stopPropagation(); onReorder(1); }}>↓</button>
      </div>
      <aside className={linkedTasks.length ? "cardTaskBurst" : "cardTaskBurst empty"} aria-label={`${card.title}に紐づくタスク`}>
        <span className="cardTaskBurstLabel">LINKED TASKS</span>
        {linkedTasks.length ? (
          linkedTasks.slice(0, 5).map((task) => (
            <button
              className="cardTaskBurstItem"
              key={task.id}
              onClick={(event) => {
                event.stopPropagation();
                onOpenTask(task.id);
              }}
              type="button"
            >
              <strong>{task.title}</strong>
              <span>{task.status}{task.dueDate ? ` / ${formatDueDate(task.dueDate)}` : ""}</span>
            </button>
          ))
        ) : (
          <div className="cardTaskBurstItem">
            <strong>紐づくタスクなし</strong>
            <span>この施策にタスクは未設定</span>
          </div>
        )}
      </aside>
    </article>
  );
}

function TagAdminRow({
  tag,
  tags,
  tagColors,
  usageCount,
  onRename,
  onColorChange,
  onDelete
}: {
  tag: string;
  tags: string[];
  tagColors: Record<string, TagColor>;
  usageCount: number;
  onRename: (oldName: string, nextName: string) => void;
  onColorChange: (tag: string, paletteIndex: number) => void;
  onDelete: (tag: string) => void;
}) {
  const currentStyle = tagStyle(tag, tags, tagColors);
  const currentPaletteIndex = Math.max(
    tagPalette.findIndex((color) => color.background === currentStyle.background),
    0
  );

  return (
    <div className="tagAdminRow">
      <span className="tagPreview" style={currentStyle}>{tag}</span>
      <input
        aria-label={`${tag}の名称`}
        defaultValue={tag}
        onBlur={(event) => onRename(tag, event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur();
          }
        }}
      />
      <div className="colorSwatches" aria-label={`${tag}の色`}>
        {tagPalette.map((color, index) => (
          <button
            aria-label={`${tag}の色を変更`}
            className={currentPaletteIndex === index ? "selected" : ""}
            key={color.background}
            onClick={() => onColorChange(tag, index)}
            style={{ background: color.background }}
            type="button"
          />
        ))}
      </div>
      <span className="usageText">使用中 {usageCount}件</span>
      <button className="danger" onClick={() => onDelete(tag)}>削除</button>
    </div>
  );
}

function TagPicker({
  allTags,
  tagColors,
  selected,
  onChange
}: {
  allTags: string[];
  tagColors: Record<string, TagColor>;
  selected: string[];
  onChange: (tags: string[]) => void;
}) {
  return (
    <section>
      <p className="fieldLabel">タグ</p>
      <div className="tagPicker">
        {allTags.map((tag) => (
          <label key={tag}>
            <input
              checked={selected.includes(tag)}
              type="checkbox"
              onChange={(event) =>
                onChange(event.target.checked ? [...selected, tag] : selected.filter((item) => item !== tag))
              }
            />
            <span style={tagStyle(tag, allTags, tagColors)}>{tag}</span>
          </label>
        ))}
      </div>
    </section>
  );
}
