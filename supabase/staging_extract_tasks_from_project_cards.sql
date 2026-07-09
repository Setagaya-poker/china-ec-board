-- Staging-only data operation.
-- Extract obvious task-like notes from project_cards into mini_tasks.
-- This is additive only: no delete, truncate, update, or overwrite.

with source_tasks(source_card_id, title, body, status, due_date) as (
  values
    (
      '1b05fb4d-e8a6-4c01-83f0-ffde705bb7e6'::uuid,
      '商品画像ABテストの測定方法をDouyinコンサルに確認する',
      '元施策: 商品画像ABテスト

本文内のタスク候補:
商品画像のABテストの方法をDouyinコンサルにヒアリングする。',
      '実施中',
      null::date
    ),
    (
      '1b05fb4d-e8a6-4c01-83f0-ffde705bb7e6'::uuid,
      'ライフガード味の商品画像ABテストを開始する',
      '元施策: 商品画像ABテスト

本文内のタスク候補:
ライフガード味でABテストを開始する想定。',
      '実施中',
      null::date
    ),
    (
      '592ff838-60c0-4a1f-b714-bf7a98b66e91'::uuid,
      'Douyin SHOPの要対応事項を洗い出す',
      '元施策: Douyinコンサル

本文内のタスク候補:
DouyinのSHOP運営において、現在対応できていない要対応事項を洗い出す。',
      '実施中',
      null::date
    ),
    (
      '592ff838-60c0-4a1f-b714-bf7a98b66e91'::uuid,
      'Douyinコンサル契約を進める',
      '元施策: Douyinコンサル

本文内のタスク候補:
要対応事項の洗い出しに向けて契約を進める。',
      '実施中',
      null::date
    ),
    (
      '0f44ed2e-42b3-4bd7-8276-f46e74adb850'::uuid,
      'C&A広告費を1500元/日に調整する',
      '元施策: C&Aの広告費最適化調整

本文内のタスク候補:
6/25-7/4: 1500元/日へ調整する。',
      '実施中',
      '2026-06-25'::date
    ),
    (
      '0f44ed2e-42b3-4bd7-8276-f46e74adb850'::uuid,
      'C&A広告費を1000元/日に調整する',
      '元施策: C&Aの広告費最適化調整

本文内のタスク候補:
7/5-7/14: 1000元/日へ調整する。',
      '実施中',
      '2026-07-05'::date
    ),
    (
      '1b4530f4-9176-4edb-9294-a9b514f9b54d'::uuid,
      '新規購入者向けセット品の専用動画を制作する',
      '元施策: 新規購入者向け　特化施策

本文内のタスク候補:
動画広告用にセット品でキャンペーンを作り、専用動画を制作する。',
      '未着手',
      null::date
    ),
    (
      '98d4ff40-23b6-4851-9ee9-e6b7e67a4cdf'::uuid,
      'ライフガード味ライブコマース会社へサンプルを送付する',
      '元施策: シトルリン・アルギニン ライフガード味　ライブコマース

本文内のタスク候補:
通関後にライブコマースの会社へサンプルを送付する。',
      '未着手',
      null::date
    ),
    (
      '98d4ff40-23b6-4851-9ee9-e6b7e67a4cdf'::uuid,
      'ライブコマースの撤退ラインと判断時期を決める',
      '元施策: シトルリン・アルギニン ライフガード味　ライブコマース

本文内のタスク候補:
チームとして明確に撤退ラインと判断時期を決める。',
      '未着手',
      null::date
    ),
    (
      '98d4ff40-23b6-4851-9ee9-e6b7e67a4cdf'::uuid,
      'ライブコマース方針をDouyinコンサルにヒアリングする',
      '元施策: シトルリン・アルギニン ライフガード味　ライブコマース

本文内のタスク候補:
Douyinコンサルタントにヒアリングした結果で決める。',
      '未着手',
      null::date
    ),
    (
      '2807b3cc-1803-497f-b481-74fee77c2031'::uuid,
      'しみけん中国語動画のキャスティングを決める',
      '元施策: しみけん＊中国語勉強

本文内のタスク候補:
中国語ができる美女のキャスティングが必要。',
      '未着手',
      null::date
    ),
    (
      '25a68a46-45ed-4ad3-b5a5-5e170872dc5a'::uuid,
      '自社広告の新規素材を定期追加する運用方針を決める',
      '元施策: 自社広告定期的な素材投下

本文内のタスク候補:
新規素材の定期追加をどうするか決める。',
      '未着手',
      null::date
    ),
    (
      '372efec6-d8d8-46c4-b8ae-e42ad3b8d230'::uuid,
      '顔出しDouyin KOC施策のサンプル調達方法を確認する',
      '元施策: 顔出しのDouyin　KOCによる商品紹介＋広告投下

本文内のタスク候補:
課題として残っているサンプル調達問題を確認する。',
      '未着手',
      null::date
    ),
    (
      '8e04523c-1aee-4329-9107-9c85f723a8ec'::uuid,
      'クレアルカリン個包装3000個の使い道を決める',
      '元施策: クレアルカリン　個包装活用

本文内のタスク候補:
クレアルカリン個包装3000個の使い道を決める。',
      '未着手',
      null::date
    ),
    (
      '8e04523c-1aee-4329-9107-9c85f723a8ec'::uuid,
      'セット販売経由を追えるクーポン設計を決める',
      '元施策: クレアルカリン　個包装活用

本文内のタスク候補:
クーポンはどこのセット販売経由で来たかを辿れる設計にする。',
      '未着手',
      null::date
    ),
    (
      'e84bed86-8de3-4313-b8e9-acac0b7c986d'::uuid,
      'SOY PROTEINの工場選定状況を確認する',
      '元施策: SOY PROTEIN 導入　(発注)

本文内のタスク候補:
別工場で生産する必要があるため、工場選定状況を確認する。',
      '未着手',
      null::date
    ),
    (
      'e84bed86-8de3-4313-b8e9-acac0b7c986d'::uuid,
      'SOY PROTEINの発注数量を確定する',
      '元施策: SOY PROTEIN 導入　(発注)

本文内のタスク候補:
発注数量を確定させる。',
      '未着手',
      null::date
    ),
    (
      'e84bed86-8de3-4313-b8e9-acac0b7c986d'::uuid,
      'SOY PROTEINの最低発注数量を確認する',
      '元施策: SOY PROTEIN 導入　(発注)

本文内のタスク候補:
最低発注数量を確認する。',
      '未着手',
      null::date
    ),
    (
      '061b650d-cb4a-4968-bee2-d74dd0c5ef5b'::uuid,
      'VITA BURN競合の販売方法を調査する',
      '元施策: VITA BURN 導入

本文内のタスク候補:
競合がどのように商品を販売しているか、広告表現・ライブコマースを調査する。',
      '未着手',
      null::date
    ),
    (
      '061b650d-cb4a-4968-bee2-d74dd0c5ef5b'::uuid,
      'VITA BURNの販売方針をDouyinコンサルに相談する',
      '元施策: VITA BURN 導入

本文内のタスク候補:
燃焼系をどう売るか、インフルエンサーライブをどう継続実施するかをコンサルに相談する。',
      '未着手',
      null::date
    ),
    (
      '78d7d5b6-b093-48b3-a82e-38a9823c801d'::uuid,
      'EAA個包装の発送時期を確定する',
      '元施策: EAA個包装導入

本文内のタスク候補:
8月にクレアルカリンと一緒に発送するか、7月中にVITABURN/VITACと先に発送するかを確定する。',
      '未着手',
      null::date
    ),
    (
      'd86b1a2e-22bb-4ba6-99a0-0bfc4e08c5da'::uuid,
      'VITAPOWER個包装の商品企画と数量を確認する',
      '元施策: VITAPOWER個包装活用施策

本文内のタスク候補:
VITAPOWER個包装の商品企画と数量を確認する。',
      '未着手',
      null::date
    ),
    (
      '0a9ad234-a0d4-4d50-8e41-71f144a95a89'::uuid,
      '社名変更に伴う各モール対応事項を洗い出す',
      '元施策: 社名変更対応

本文内のタスク候補:
各モールで社名変更後も販売が継続できるように、事前対応事項を洗い出す。',
      '未着手',
      null::date
    ),
    (
      'cd8e8ac6-b54d-46a3-b112-6ceb17bfd71b'::uuid,
      'クレアルカリン個包装パッケージデザインを進める',
      '元施策: クレアルカリン個包装デザイン

本文内のタスク候補:
クレアルカリン個包装のパッケージデザイン。',
      '未着手',
      '2026-07-08'::date
    ),
    (
      'aa66a480-66a7-4c09-8eeb-d1464d64f967'::uuid,
      'VITAPOWER・クレアルカリン複数セット用ページを作る',
      '元施策: VITAPOWER・クレアルカカリンの複数セット用ページを作る

本文内のタスク候補:
複数セット用ページを作る。',
      '未着手',
      null::date
    ),
    (
      'a868ed91-4d3d-4809-88ff-d7e02abd9320'::uuid,
      'SOY PROTEINのDouyin競合クリエイティブ・訴求を調査する',
      '元施策: SOY PROTEINの販売戦略を検討する

本文内のタスク候補:
Douyin内でSoyProteinを販売している競合が、誰に、どんなクリエイティブで、どんな訴求で販売しているのかを調査する。',
      '未着手',
      '2026-07-09'::date
    ),
    (
      'a868ed91-4d3d-4809-88ff-d7e02abd9320'::uuid,
      'SOY PROTEINの販売価格を決める',
      '元施策: SOY PROTEINの販売戦略を検討する

本文内のタスク候補:
販売価格を決める。現時点では180〜190元で販売する予定。',
      '未着手',
      '2026-07-09'::date
    ),
    (
      'a868ed91-4d3d-4809-88ff-d7e02abd9320'::uuid,
      'SOY PROTEIN市場規模・TOP5販売経路・価格帯を調査する',
      '元施策: SOY PROTEINの販売戦略を検討する

本文内のタスク候補:
市場規模、TOP5売上、主な販売経路、価格帯、ターゲット、商品ページ訴求、URLを調査する。',
      '未着手',
      '2026-07-09'::date
    )
),
inserted_tasks as (
  insert into public.mini_tasks (title, body, status, due_date, updated_by)
  select st.title, st.body, st.status, st.due_date, 'Codex'
  from source_tasks st
  where not exists (
    select 1
    from public.mini_tasks existing
    where existing.title = st.title
  )
  returning id, title
),
inserted_task_sources as (
  select it.id as mini_task_id, st.source_card_id
  from inserted_tasks it
  join source_tasks st on st.title = it.title
),
inserted_tags as (
  insert into public.mini_task_tags (mini_task_id, tag_id)
  select distinct its.mini_task_id, pct.tag_id
  from inserted_task_sources its
  join public.project_card_tags pct on pct.card_id = its.source_card_id
  on conflict do nothing
  returning mini_task_id, tag_id
)
select
  (select count(*) from inserted_tasks) as inserted_task_count,
  (select count(*) from inserted_tags) as inserted_tag_link_count;
