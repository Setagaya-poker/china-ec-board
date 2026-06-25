"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { hasSupabaseConfig, supabase } from "../lib/supabase";

const statuses = ["検討中", "準備中", "実行中", "完了"] as const;
const qaStates = ["未対応", "対応中", "完了", "保留"] as const;
const qaTypes = ["調査依頼", "QA"] as const;

type Status = (typeof statuses)[number];
type QaState = (typeof qaStates)[number];
type QaType = (typeof qaTypes)[number];

type ProjectCard = {
  id: string;
  title: string;
  body: string;
  status: Status;
  tags: string[];
  isRoutine: boolean;
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

type AuthStatus = "checking" | "signedOut" | "unauthorized" | "ready";

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

const sampleCards: ProjectCard[] = [
  {
    id: "card-1",
    title: "Douyin公式アカウント運用整理",
    body: "目的、投稿候補、確認事項をここにまとめる。",
    status: "検討中",
    tags: ["モール施策：Douyin", "SNS企画：Douyin公式"],
    isRoutine: false,
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
    isRoutine: false,
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
    isRoutine: true,
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

const blankCardDraft = (tags: string[]): ProjectCard => ({
  id: `card-${Date.now()}`,
  title: "",
  body: "",
  status: "検討中",
  tags: [],
  isRoutine: false,
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
  return tagColors?.[tag] ?? fallbackTagStyle(tag, tags);
};

export default function Home() {
  const [view, setView] = useState<"board" | "tags" | "qa" | "tagAdmin" | "users">("board");
  const [cards, setCards] = useState<ProjectCard[]>([]);
  const [qaLogs, setQaLogs] = useState<QaLog[]>([]);
  const [tags, setTags] = useState(initialTags);
  const [tagIds, setTagIds] = useState<Record<string, string>>({});
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [selectedQaId, setSelectedQaId] = useState<string | null>(null);
  const [newTag, setNewTag] = useState("");
  const [allowedUsers, setAllowedUsers] = useState("umezawa@example.com");
  const [cardDraft, setCardDraft] = useState<ProjectCard>(() => blankCardDraft(initialTags));
  const [showCreateCard, setShowCreateCard] = useState(false);
  const [tagColors, setTagColors] = useState<Record<string, TagColor>>(initialTagColors);
  const [tagAlert, setTagAlert] = useState<string | null>(null);
  const [dataNotice, setDataNotice] = useState("ログイン状態を確認しています。");
  const [authStatus, setAuthStatus] = useState<AuthStatus>("checking");
  const [currentUserEmail, setCurrentUserEmail] = useState("");

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
      setDataNotice("Supabase設定が未入力のため、仮データを表示しています。");
      return;
    }

    setDataNotice("Supabaseから読み込み中です。");

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
        isRoutine: card.is_routine,
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

    setDataNotice("Supabaseに保存されます。");
  };

  const selectedCard = cards.find((card) => card.id === selectedCardId) ?? null;
  const selectedQa = qaLogs.find((log) => log.id === selectedQaId) ?? null;

  const cardsByTag = useMemo(
    () => tags.map((tag) => ({ tag, cards: cards.filter((card) => card.tags.includes(tag)) })),
    [cards, tags]
  );
  const canUseApp = authStatus === "ready";

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

  const persistCardUpdate = async (id: string, patch: Partial<ProjectCard>) => {
    if (!supabase || id.startsWith("card-")) return;

    const updatePayload: {
      title?: string;
      body?: string;
      status?: Status;
      is_routine?: boolean;
      updated_by?: string;
    } = {};

    if (patch.title !== undefined) updatePayload.title = patch.title;
    if (patch.body !== undefined) updatePayload.body = patch.body;
    if (patch.status !== undefined) updatePayload.status = patch.status;
    if (patch.isRoutine !== undefined) updatePayload.is_routine = patch.isRoutine;
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

  const moveCard = (id: string, status: Status) => updateCard(id, { status, isRoutine: false });

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
      const message = `「${tag}」は${count}件の案件またはQAで使用されています。`;
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
    setCardDraft((current) => ({
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
      const { data, error } = await supabase
        .from("project_cards")
        .insert({
          title,
          body: cardDraft.body,
          status: cardDraft.status,
          is_routine: cardDraft.isRoutine,
          sort_order: cards.length,
          updated_by: "梅澤"
        })
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
        isRoutine: row.is_routine,
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
          <h1>施策・QA管理ボード</h1>
        </div>
        <nav>
          <button className={view === "board" ? "active" : ""} onClick={() => setView("board")}>
            案件カンバン
          </button>
          <button className={view === "tags" ? "active" : ""} onClick={() => setView("tags")}>
            タグ別ビュー
          </button>
          <button className={view === "qa" ? "active" : ""} onClick={() => setView("qa")}>
            QA/調査依頼
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
        <div className="dataNotice">{dataNotice}</div>
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
                <h2>案件カンバン</h2>
                <p>追加したい列から案件を登録します。</p>
              </div>
            </header>
            <div className="boardLayout">
              <div className="boardStack">
                <div className="kanban">
                  {statuses.map((status) => (
                  <section
                    className="column"
                    key={status}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => moveCard(event.dataTransfer.getData("text/plain"), status)}
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
                          isSelected={selectedCardId === card.id}
                          tags={tags}
                          tagColors={tagColors}
                          onOpen={() => setSelectedCardId(card.id)}
                          onReorder={(direction) => reorderCard(card.id, direction)}
                        />
                      ))}
                  </section>
                  ))}
                </div>
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
                    {cards.filter((card) => card.isRoutine).map((card) => (
                      <CardTile
                        key={card.id}
                        card={card}
                        isSelected={selectedCardId === card.id}
                        tags={tags}
                        tagColors={tagColors}
                        onOpen={() => setSelectedCardId(card.id)}
                        onReorder={(direction) => reorderCard(card.id, direction)}
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
                    <button className="rowButton" key={card.id} onClick={() => setSelectedCardId(card.id)}>
                      <strong>{card.title}</strong>
                      <span>{card.isRoutine ? "定常運用" : card.status}</span>
                    </button>
                  ))}
                </section>
              ))}
            </div>
          </>
        )}

        {canUseApp && view === "qa" && (
          <>
            <header className="toolbar">
              <div>
                <h2>梅澤依頼・QAログ</h2>
                <p>一度聞いたQAと調査依頼を残します。</p>
              </div>
              <button onClick={() => void createQaLog()}>QAを追加</button>
            </header>
            <div className="tableList">
              {qaLogs.map((log) => (
                <button className="tableRow" key={log.id} onClick={() => setSelectedQaId(log.id)}>
                  <strong>{log.title}</strong>
                  <span>{log.type}</span>
                  <span>{log.state}</span>
                  <span>{log.tags.join(" / ")}</span>
                </button>
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

      {selectedCard && (
        <Drawer title="案件詳細" onClose={() => setSelectedCardId(null)}>
          <EditorField label="タイトル" value={selectedCard.title} onChange={(value) => updateCard(selectedCard.id, { title: value })} />
          <EditorArea label="本文" value={selectedCard.body} onChange={(value) => updateCard(selectedCard.id, { body: value })} />
          <label>
            ステータス
            <select value={selectedCard.status} onChange={(event) => updateCard(selectedCard.id, { status: event.target.value as Status })}>
              {statuses.map((status) => <option key={status}>{status}</option>)}
            </select>
          </label>
          <label className="checkboxLine">
            <input
              checked={selectedCard.isRoutine}
              type="checkbox"
              onChange={(event) => updateCard(selectedCard.id, { isRoutine: event.target.checked })}
            />
            定常運用に入れる
          </label>
          <TagPicker allTags={tags} tagColors={tagColors} selected={selectedCard.tags} onChange={(next) => updateCard(selectedCard.id, { tags: next })} />
          <button className="danger" onClick={() => void deleteCard(selectedCard.id)}>削除</button>
        </Drawer>
      )}

      {selectedQa && (
        <Drawer title="QA/調査依頼詳細" onClose={() => setSelectedQaId(null)}>
          <EditorField label="タイトル" value={selectedQa.title} onChange={(value) => updateQa(selectedQa.id, { title: value })} />
          <EditorArea label="本文" value={selectedQa.body} onChange={(value) => updateQa(selectedQa.id, { body: value })} />
          <label>
            種別
            <select value={selectedQa.type} onChange={(event) => updateQa(selectedQa.id, { type: event.target.value as QaType })}>
              {qaTypes.map((type) => <option key={type}>{type}</option>)}
            </select>
          </label>
          <label>
            状態
            <select value={selectedQa.state} onChange={(event) => updateQa(selectedQa.id, { state: event.target.value as QaState })}>
              {qaStates.map((state) => <option key={state}>{state}</option>)}
            </select>
          </label>
          <TagPicker allTags={tags} tagColors={tagColors} selected={selectedQa.tags} onChange={(next) => updateQa(selectedQa.id, { tags: next })} />
          <button className="danger" onClick={() => void deleteQaLog(selectedQa.id)}>削除</button>
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

function Modal({ children, title, onClose }: { children: React.ReactNode; title: string; onClose: () => void }) {
  return (
    <div className="modalBackdrop">
      <section className="modalPanel" role="dialog" aria-modal="true" aria-label={title}>
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

function EditorArea({ label, value, onChange, rows = 8 }: { label: string; value: string; onChange: (value: string) => void; rows?: number }) {
  return (
    <label>
      {label}
      <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={rows} />
    </label>
  );
}

function CardTile({
  card,
  isSelected,
  tags,
  tagColors,
  onOpen,
  onReorder
}: {
  card: ProjectCard;
  isSelected: boolean;
  tags: string[];
  tagColors: Record<string, TagColor>;
  onOpen: () => void;
  onReorder: (direction: -1 | 1) => void;
}) {
  return (
    <article
      className={isSelected ? "card selected" : "card"}
      draggable
      onClick={onOpen}
      onDragStart={(event) => event.dataTransfer.setData("text/plain", card.id)}
    >
      <div className="cardTopline">
        <h4>{card.title}</h4>
        {card.isRoutine ? <span className="routineBadge">定常</span> : null}
      </div>
      <p>{card.body || "本文未入力"}</p>
      <div className="tags">
        {card.tags.map((tag) => (
          <span key={tag} style={tagStyle(tag, tags, tagColors)}>{tag}</span>
        ))}
      </div>
      <div className="cardActions">
        <button onClick={(event) => { event.stopPropagation(); onReorder(-1); }}>上へ</button>
        <button onClick={(event) => { event.stopPropagation(); onReorder(1); }}>下へ</button>
      </div>
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
            style={{ background: color.background, borderColor: color.border }}
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
