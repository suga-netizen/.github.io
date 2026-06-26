/* =========================================================
   GrowthPoint フォローアップ モック（最終版）
   - GPデザイン準拠 / 複数案件×複数受講者 / 3者フル
   - AI（スコア・サマリー・FB補助・プラン提案）は Phase6 で実API化。
     当面は computeMetrics() の暫定ロジック＋「AI連携予定」表示。
   ========================================================= */

/* ---------- 定数・ユーティリティ ---------- */
const GROWTH_STAGES = [
  { name: '種',   emoji: '🌰', desc: 'これから芽生えます' },
  { name: '芽',   emoji: '🌱', desc: '行動が芽生えました' },
  { name: '双葉', emoji: '🌿', desc: '新緑が育っています' },
  { name: '若木', emoji: '🪴', desc: 'しっかり根づいてきました' },
  { name: '大樹', emoji: '🌳', desc: '行動が定着しました' },
];
const FEELING = {
  '😀': { t: '大満足', v: 100 }, '🙂': { t: '満足', v: 80 },
  '😐': { t: 'ふつう', v: 50 }, '🙁': { t: 'やや不満', v: 30 }, '😢': { t: '苦戦', v: 10 },
};
const STAMPS = [
  { text: 'よくやった！', emoji: '👍' },
  { text: 'その調子！',   emoji: '✨' },
  { text: '次がんばろう', emoji: '🔥' },
];
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// デモ用：この名前の受講者を「ログイン中の受講者」として扱う
const DEMO_STUDENT_NAME = '山田 太郎';
function getMyMemberships() {
  const result = [];
  DATA.followups.forEach(fu => {
    fu.participants.forEach(p => {
      if (p.name === DEMO_STUDENT_NAME) result.push({ fu, p });
    });
  });
  return result;
}

// 支援期間×サイクルから総サイクル数を算出（期間連動）
function totalCycles(fu) {
  const per = fu.cycle === 'weekly' ? 4 : fu.cycle === 'biweekly' ? 2 : 1;
  return fu.durationMonths * per;
}
const cycleUnit = (fu) => (fu.cycle === 'monthly' ? 'ヶ月目' : '週目');

/* ---------- サンプルデータ ---------- */
// 振り返り1サイクル分の生成ヘルパー（ライト）
function cyc(submitted, progress, feeling, memo, stamp) {
  return {
    submitted, progress, feeling: feeling || '', memo: memo || '',
    bossFeedback: stamp ? { stamp: stamp.text, emoji: stamp.emoji, comment: stamp.comment || '' } : { stamp: null, emoji: '', comment: '' },
  };
}
// KPT月生成（じっくり）
function mon(submitted, kpts, changePlan, memo, fb) {
  return {
    submitted, kpts: kpts || {}, changePlan: changePlan || 'keep', memo: memo || '',
    bossFeedback: fb || { comment: '', confirmed: false, stamp: null, emoji: '' },
  };
}

const DATA = {
  followups: [
    {
      id: 'f1',
      name: '2026春 新人ビジネス基礎研修 フォローアップ',
      trainingName: 'ビジネス基礎研修',
      mode: 'light', cycle: 'weekly', durationMonths: 3,
      actionSetter: 'student', bossCommentRequired: 'optional',
      distributedAt: '2026-04-10',
      participants: [
        {
          id: 'p1', name: '山田 太郎', dept: '営業第二グループ', meta: '入社2年目', boss: '佐藤 部長', bossId: 'b1',
          setupCompleted: true,
          actions: [
            { id: 1, text: '訪問前に相手企業のニュースを1件調べて会話の糸口にする', history: [
              { actionId: 1, oldText: '訪問前に相手企業のことを調べる', newText: '訪問前に相手企業のニュースを1件調べて会話の糸口にする', reason: 'より具体的な行動にするため', cycleNum: 2 },
            ] },
          ],
          history: [
            { actionId: 1, oldText: '訪問前に相手企業のことを調べる', newText: '訪問前に相手企業のニュースを1件調べて会話の糸口にする', reason: 'より具体的な行動にするため', cycleNum: 2 },
          ],
          currentCycle: 3,
          cycles: {
            1: cyc(true, 60, '🙂', '初週。緊張したが1件だけ実践できた。', { text: 'よくやった！', emoji: '👍' }),
            2: cyc(true, 75, '😀', 'ニュースの話題で会話が弾んだ。手応えあり。', { text: 'その調子！', emoji: '✨' }),
            3: cyc(false, 50, '', ''),
          },
        },
        {
          id: 'p2', name: '鈴木 花子', dept: '営業第二グループ', meta: '入社2年目', boss: '佐藤 部長', bossId: 'b1',
          setupCompleted: true,
          actions: [{ id: 1, text: '朝礼で前日の良かった事例を1つ共有する', history: [] }],
          history: [],
          currentCycle: 4,
          cycles: {
            1: cyc(true, 80, '😀', '習慣化できそう。', { text: 'よくやった！', emoji: '👍' }),
            2: cyc(true, 85, '😀', 'メンバーの反応が良い。', { text: 'その調子！', emoji: '✨' }),
            3: cyc(true, 90, '🙂', '少しネタ切れ気味。', { text: 'その調子！', emoji: '✨' }),
            4: cyc(true, 88, '😀', '他部署の事例も拾うようにした。', null), // 上司FB待ち
          },
        },
        {
          id: 'p3', name: '田中 健', dept: '営業第一グループ', meta: '入社1年目', boss: '高橋 課長', bossId: 'b2',
          setupCompleted: true,
          actions: [{ id: 1, text: '商談メモをその日のうちにCRMへ入力する', history: [] }],
          history: [],
          currentCycle: 1,
          cycles: { 1: cyc(false, 50, '', '') }, // 未提出
        },
        {
          id: 'p4', name: '佐々木 悠', dept: '営業第一グループ', meta: '入社2年目', boss: '高橋 課長', bossId: 'b2',
          setupCompleted: false, // プラン未設定
          actions: [],
          history: [],
          currentCycle: 1,
          cycles: { 1: cyc(false, 50, '', '') },
        },
      ],
    },
    {
      id: 'f2',
      name: '次世代リーダー育成プログラム フォローアップ',
      trainingName: 'リーダーシップ研修',
      mode: 'detailed', cycle: 'monthly', durationMonths: 3,
      actionSetter: 'student', bossCommentRequired: 'required',
      distributedAt: '2026-04-01',
      participants: [
        {
          id: 'q1', name: '高橋 誠', dept: '開発部', meta: 'マネージャー', boss: '佐藤 部長', bossId: 'b1',
          setupCompleted: true,
          vision: 'メンバーの主体性を引き出すサーバントリーダー',
          challenge: '業務を抱え込みがちで権限委譲ができていない',
          plans: [
            { id: 1, item: '週次1on1の実施と傾聴', action: '毎週火曜午前に各メンバーと30分の1on1を確保し、8割聴く', history: [] },
            { id: 2, item: '権限委譲', action: '自分の業務を棚卸しし、月2件をメンバーに委譲する', history: [
              { oldAction: '業務をメンバーに任せる', newAction: '自分の業務を棚卸しし、月2件をメンバーに委譲する', reason: '基準を明確にするため', monthNum: 1 },
            ] },
          ],
          currentMonth: 2,
          months: {
            1: mon(true,
              { 1: { keep: '1on1を毎週実施できた', problem: '自分が話しすぎた', try: '次月は問いを増やす' },
                2: { keep: '2件委譲できた', problem: '進捗確認が過干渉だった', try: '報告タイミングを決める' } },
              'modify', '権限委譲の基準づくりに悩んでいます',
              { comment: '1on1の継続は素晴らしいです。話しすぎは誰もが通る道。次月の「問いを増やす」を一緒に試しましょう。', confirmed: true, stamp: 'よくやった！', emoji: '👍' }),
            2: mon(true,
              { 1: { keep: '問いを意識し相手の発話が増えた', problem: '沈黙に耐えられない時がある', try: '5秒待つルールを作る' },
                2: { keep: '報告タイミングを決め過干渉が減った', problem: '委譲先の品質にばらつき', try: 'チェックリストを渡す' } },
              'keep', '',
              { comment: '', confirmed: false, stamp: null, emoji: '' }), // 上司確認待ち
            3: mon(false, {}, 'keep', '', { comment: '', confirmed: false, stamp: null, emoji: '' }),
          },
        },
        {
          id: 'q2', name: '伊藤 里奈', dept: '管理部', meta: 'チームリーダー', boss: '佐藤 部長', bossId: 'b1',
          setupCompleted: true,
          vision: '数字で語れるチーム運営',
          challenge: '感覚的なマネジメントになっている',
          plans: [{ id: 1, item: 'KPIの可視化', action: '毎週月曜にチームKPIをダッシュボードで共有する', history: [] }],
          currentMonth: 1,
          months: {
            1: mon(false, {}, 'keep', '', { comment: '', confirmed: false, stamp: null, emoji: '' }),
            2: mon(false, {}, 'keep', '', { comment: '', confirmed: false, stamp: null, emoji: '' }),
            3: mon(false, {}, 'keep', '', { comment: '', confirmed: false, stamp: null, emoji: '' }),
          },
        },
      ],
    },
  ],
};

/* ---------- アプリ状態 ---------- */
const state = {
  currentUser: 'student',           // 'student' | 'boss' | 'hr'
  studentView: 'list',              // 'list' | 'detail'
  me: { followupId: 'f1', participantId: 'p1' },  // 受講者ビューの本人（detail時に使用）
  boss: { id: 'b1', name: '佐藤 部長' },           // 上司ビューの本人
  bossSelected: null,               // { followupId, participantId }
  hr: { followupId: null, participantId: null },  // 人事ドリルダウン位置
  hrView: null,
};

let chartInstances = {};

/* ---------- 参照ヘルパー ---------- */
const getFu = (id) => DATA.followups.find(f => f.id === id);
const getP = (fu, pid) => fu.participants.find(p => p.id === pid);

/* ---------- 初期化 ---------- */
document.addEventListener('DOMContentLoaded', () => {
  const r = (location.hash || '').replace('#', '');
  if (r === 'sdet') {
    switchUser('student');
    state.studentView = 'detail'; state.me = { followupId: 'f1', participantId: 'p1' }; render();
  } else if (r === 'hrcase') { state.hr = { followupId: 'f1', participantId: null }; switchUser('hr'); }
  else if (r === 'hrp') { state.hr = { followupId: 'f1', participantId: 'p2' }; switchUser('hr'); }
  else if (r === 'hrdist') { state.hrView = 'distribute'; switchUser('hr'); }
  else if (r === 'bossd') { state.bossSelected = { followupId: 'f1', participantId: 'p2' }; switchUser('boss'); }
  else switchUser(['student', 'boss', 'hr'].includes(r) ? r : 'student');
});

/* ---------- トースト ---------- */
let toastTimer = null;
function showToast(msg, isError = false) {
  const t = document.getElementById('toast');
  document.getElementById('toast-msg').textContent = msg;
  document.getElementById('toast-icon').setAttribute('data-lucide', isError ? 'alert-circle' : 'check-circle');
  t.className = 'toast show' + (isError ? ' error' : ' success');
  lucide.createIcons();
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.className = 'toast' + (isError ? ' error' : ' success'); }, 3000);
}

/* ---------- ロール切替 ---------- */
function switchUser(user) {
  state.currentUser = user;
  if (user === 'student') state.studentView = 'list';  // 受講者切替時は一覧に戻る
  ['student', 'boss', 'hr'].forEach(u => {
    document.getElementById('role-' + u).classList.toggle('active', u === user);
  });
  document.getElementById('profile-avatar').textContent =
    user === 'student' ? '山' : user === 'boss' ? '佐' : '人';
  render();
}

/* ---------- パンくず ---------- */
function setBreadcrumb(parts) {
  const el = document.getElementById('breadcrumb');
  el.innerHTML = parts.map((p, i) => {
    const last = i === parts.length - 1;
    const node = last
      ? `<span class="current">${esc(p.label)}</span>`
      : (p.onClick ? `<a href="#" onclick="${p.onClick};return false;">${esc(p.label)}</a>` : `<span>${esc(p.label)}</span>`);
    return (i ? '<span class="sep">›</span>' : '') + node;
  }).join('');
}

/* ---------- メトリクス（暫定：Phase6でAI差し替え） ---------- */
function computeMetrics(fu, p) {
  if (!p.setupCompleted) {
    return { score: 0, level: '測定前', growth: 0, submitted: 0, aiPending: true,
      summary: '受講者のアクションプラン設定を待っています。' };
  }
  let submitted = 0, words = 0, fb = 0;
  if (fu.mode === 'light') {
    Object.values(p.cycles).forEach(c => {
      if (c.submitted) {
        submitted++;
        words += (c.memo || '').length;
        if (c.bossFeedback.stamp) fb++;
      }
    });
    const subRate = submitted / totalCycles(fu);
    const txtRate = Math.min(words / 100, 1);
    var score = Math.round(subRate * 60 + txtRate * 40);
  } else {
    let kptWords = 0;
    for (let m = 1; m <= fu.durationMonths; m++) {
      const md = p.months[m]; if (!md) continue;
      if (md.submitted) {
        submitted++;
        words += (md.memo || '').length;
        Object.values(md.kpts).forEach(k => kptWords += (k.keep + k.problem + k.try).length);
        if (md.bossFeedback.confirmed) fb++;
      }
    }
    const subRate = submitted / fu.durationMonths;
    const kptRate = Math.min((words + kptWords) / 450, 1);
    const fbRate = fb / fu.durationMonths;
    var score = Math.round(subRate * 40 + kptRate * 30 + fbRate * 30);
  }
  score = Math.min(score, 100);
  const level = score >= 80 ? '定着レベル：高' : score >= 50 ? '定着レベル：中' : '定着レベル：低';
  const growth = Math.min(submitted + (fb > 0 ? 1 : 0), GROWTH_STAGES.length - 1);
  return { score, level, growth, submitted, aiPending: true,
    summary: `（AI連携予定）${fu.mode === 'light' ? 'ライト' : 'じっくり'}で${submitted}回の振り返りを実践。継続的に行動が観測されています。` };
}

/* ---------- レンダリング振り分け ---------- */
function render() {
  document.getElementById('view-student').classList.toggle('hidden', state.currentUser !== 'student');
  document.getElementById('view-boss').classList.toggle('hidden', state.currentUser !== 'boss');
  document.getElementById('view-hr').classList.toggle('hidden', state.currentUser !== 'hr');
  if (state.currentUser === 'student') renderStudent();
  else if (state.currentUser === 'boss') renderBoss();
  else renderHr();
  lucide.createIcons();
}

/* =========================================================
   受講者ビュー
   ========================================================= */
function renderStudent() {
  if (state.studentView === 'list') { renderStudentList(); return; }
  renderStudentDetail();
}

/* ---- フォローアップ一覧 ---- */
function renderStudentList() {
  setBreadcrumb([{ label: 'TOP' }, { label: 'フォローアップ一覧' }]);
  const el = document.getElementById('view-student');
  const memberships = getMyMemberships();
  if (!memberships.length) {
    el.innerHTML = `<div class="h1">フォローアップ一覧</div>
      <div class="panel"><div class="empty"><div class="empty-icon"><i data-lucide="sprout"></i></div>
        <h3>参加中のフォローアップはありません</h3><p>人事担当者から配信されると、ここに表示されます。</p></div></div>`;
    lucide.createIcons(); return;
  }
  el.innerHTML = `
    <div class="h1">フォローアップ一覧<span class="sub">参加中のフォローアップです。クリックして振り返りを記録しましょう</span></div>
    <div class="col gap5">
      ${memberships.map(({ fu, p }) => {
        const mt = computeMetrics(fu, p);
        const s = participantStatus(fu, p);
        const g = GROWTH_STAGES[mt.growth];
        const isLight = fu.mode === 'light';
        const needsSetup = !p.setupCompleted;
        return `
          <div class="panel" style="cursor:pointer;transition:box-shadow .15s,transform .1s;"
               onmouseenter="this.style.boxShadow='var(--sh-md)';this.style.transform='translateY(-2px)'"
               onmouseleave="this.style.boxShadow='';this.style.transform=''"
               onclick="openStudentFollowup('${fu.id}','${p.id}')">
            <div class="panel-head no-border">
              <div class="col gap2">
                <div class="row gap2 wrap">
                  <span class="tag ${isLight ? 'tag-train' : 'tag-info'}" style="${isLight ? 'background:#D4F7E3;color:#059A38;' : ''}">
                    <i data-lucide="${isLight ? 'zap' : 'book-open'}"></i>${isLight ? 'ライト伴走（週次）' : 'じっくりシート（月次）'}
                  </span>
                  ${toneTag(s)}
                  ${needsSetup ? '<span class="tag tag-warning"><i data-lucide="alert-circle"></i>プラン未設定</span>' : ''}
                </div>
                <div class="h2" style="margin-top:var(--s2);">${esc(fu.name)}</div>
                <div class="small muted">${esc(fu.trainingName)}・${fu.durationMonths}ヶ月間・${fu.distributedAt}開始</div>
              </div>
              <div class="row gap4" style="flex-shrink:0;">
                ${p.setupCompleted ? `
                  <div class="center">
                    <div style="font-size:56px;line-height:1;">${g.emoji}</div>
                    <div style="font-size:13px;font-weight:700;color:${isLight ? 'var(--success)' : 'var(--primary)'};">${g.name}</div>
                  </div>
                  <div class="center col gap2" style="min-width:72px;">
                    <div style="font-size:36px;font-weight:700;font-family:'Lato',sans-serif;color:var(--black);">${mt.score}</div>
                    <div class="small muted">スコア</div>
                  </div>
                ` : `<div class="center col gap2"><div style="font-size:40px;">🌰</div><div class="small muted">設定待ち</div></div>`}
                <i data-lucide="chevron-right" style="color:var(--placeholder);"></i>
              </div>
            </div>
          </div>`;
      }).join('')}
    </div>`;
  lucide.createIcons();
}

function openStudentFollowup(fuId, pid) {
  state.me = { followupId: fuId, participantId: pid };
  state.studentView = 'detail';
  render();
}
function backToStudentList() {
  state.studentView = 'list';
  render();
}

/* ---- 詳細ビュー ---- */
function renderStudentDetail() {
  const fu = getFu(state.me.followupId);
  const p = getP(fu, state.me.participantId);
  setBreadcrumb([
    { label: 'TOP' },
    { label: 'フォローアップ一覧', onClick: 'backToStudentList()' },
    { label: fu.name },
  ]);
  const el = document.getElementById('view-student');

  if (!p.setupCompleted) {
    el.innerHTML = `<div class="mode-${fu.mode}">${studentSetupHTML(fu, p)}</div>`;
    lucide.createIcons(); return;
  }

  const m = computeMetrics(fu, p);
  el.innerHTML = `<div class="mode-${fu.mode}">
    <div class="row-between wrap">
      <div class="h1">${esc(fu.name)}
        <span class="sub">${esc(fu.trainingName)}／${fu.mode === 'light' ? 'ライト伴走（週次）' : 'じっくりシート（月次）'}</span>
      </div>
      <button class="btn btn-tertiary" onclick="backToStudentList()"><i data-lucide="arrow-left"></i>一覧へ戻る</button>
    </div>
    <div class="grid-2">
      ${growthWidgetHTML(p, m)}
      <div class="panel">
        <div class="panel-head no-border"><span class="h3">行動変容の推移</span>
          <span class="small muted">${fu.mode === 'light' ? '色付きの点はアクションを変更した回' : '月ごとの実践度'}</span></div>
        <div class="chart-box"><canvas id="chart-student"></canvas></div>
      </div>
    </div>
    ${fu.mode === 'light' ? studentLightHTML(fu, p) : studentDetailedHTML(fu, p)}
  </div>`;
  lucide.createIcons();
  setTimeout(() => drawChart('chart-student', fu, p), 30);
}

/* ---- ゲーミフィケーション ウィジェット ---- */
function growthWidgetHTML(p, m) {
  const g = GROWTH_STAGES[m.growth];
  const dots = GROWTH_STAGES.map((s, i) => `<span class="gdot ${i <= m.growth ? 'on' : ''}" title="${s.name}"></span>`).join('');
  return `
    <div class="panel">
      <div class="panel-head no-border"><span class="h3">あなたの成長</span>
        <span class="tag tag-success"><i data-lucide="sprout"></i>${esc(g.name)}</span></div>
      <div class="growth">
        <div style="font-size:96px;line-height:1;filter:drop-shadow(0 4px 8px rgba(0,0,0,.12));">${g.emoji}</div>
        <div class="growth-stage-name">${esc(g.name)}：${esc(g.desc)}</div>
        <div class="growth-track">${dots}</div>
        <div class="small muted center" style="font-size:13px;line-height:1.7;">振り返りを続けるほど植物が育ちます。<br>次の段階まであと少し、継続しましょう。</div>
      </div>
    </div>`;
}

/* ---- 人事からのお知らせ表示ヘルパー ---- */
function hrNoticeHTML(fu) {
  if (!fu.hrNotice) return '';
  return `<div class="panel flat" style="background:#FFFBEA;border:1px solid #F5C842;border-left:4px solid #F5C842;gap:var(--s3);">
    <div class="row gap2">
      <i data-lucide="megaphone" style="color:#B8860B;width:20px;height:20px;flex-shrink:0;margin-top:2px;"></i>
      <div>
        <div class="bold sm" style="color:#7A5500;">人事からのお知らせ</div>
        <div class="small mt2" style="white-space:pre-wrap;line-height:1.7;">${esc(fu.hrNotice)}</div>
      </div>
    </div>
  </div>`;
}

/* ---- 初期設定（受講者がプランを立てる） ---- */
function studentSetupHTML(fu, p) {
  if (fu.mode === 'light') {
    const fixedCount = fu.actionCount > 0 ? fu.actionCount : 0;
    const slotCount = fixedCount || 1;
    const actionSlots = Array.from({ length: slotCount }, (_, i) => `
      <div class="field su-action-row">
        <div class="field-label"><span class="lbl">アクション${i + 1}<span class="tag tag-required">必須</span></span></div>
        <input class="input su-action-input" placeholder="例：訪問前に相手企業のニュースを1件調べて会話の糸口にする">
      </div>`).join('');
    return `
      <div class="h1">アクションプランの登録
        <span class="sub">${esc(fu.trainingName)}を踏まえ、今週から実践する小さな行動を決めましょう</span></div>
      ${hrNoticeHTML(fu)}
      <div class="panel">
        <div class="stepper">
          <div class="step current"><span class="step-dot">1</span><span class="step-label">プラン登録</span></div>
          <span class="step-line"></span>
          <div class="step"><span class="step-dot">2</span><span class="step-label">週次の振り返り</span></div>
          <span class="step-line"></span>
          <div class="step"><span class="step-dot">3</span><span class="step-label">上司フィードバック</span></div>
        </div>
        <div class="ai-box">
          <div class="ai-head"><i data-lucide="sparkles"></i>AIアクション提案<span class="ai-pending">AI連携予定</span></div>
          <div class="small">研修内容とあなたの課題から、実行可能なアクションをAIが提案します（Phase6で実装）。</div>
        </div>
        ${fixedCount ? `<div class="hint" style="margin-bottom:var(--s2);">人事が${fixedCount}件のアクションを設定するよう指定しています。</div>` : ''}
        <div class="col gap3" id="su-actions-wrap">
          ${actionSlots}
        </div>
        ${!fixedCount ? `<div style="margin-top:var(--s2);">
          <button type="button" class="btn btn-text" onclick="addActionInput()">
            <i data-lucide="plus"></i>アクションを追加する
          </button>
        </div>` : ''}
        <div class="row" style="justify-content:flex-end;margin-top:var(--s4);">
          <button class="btn btn-primary btn-lg" onclick="confirmSetup()">
            このプランで振り返りを始める<i data-lucide="arrow-right"></i>
          </button>
        </div>
      </div>`;
  }
  // じっくりシート
  return `
    <div class="h1">アクションプランの登録<span class="sub">3ヶ月の目標と改善プランを設計しましょう</span></div>
    ${hrNoticeHTML(fu)}
    <div class="panel">
      <div class="ai-box">
        <div class="ai-head"><i data-lucide="sparkles"></i>AIプラン設計サポート<span class="ai-pending">AI連携予定</span></div>
        <div class="small">SMART基準（具体的・測定可能・達成可能・関連性・期限）に沿ってAIが整えます（Phase6で実装）。</div>
      </div>
      <div class="grid-2">
        <div class="field"><div class="field-label"><span class="lbl">目指す理想像<span class="tag tag-required">必須</span></span></div>
          <textarea class="textarea" id="su-vision" rows="3" placeholder="例：メンバーの主体性を引き出すサーバントリーダー"></textarea></div>
        <div class="field"><div class="field-label"><span class="lbl">現状の課題<span class="tag tag-required">必須</span></span></div>
          <textarea class="textarea" id="su-challenge" rows="3" placeholder="例：業務を抱え込みがちで権限委譲ができていない"></textarea></div>
      </div>
      <div class="col gap3" id="su-plans-wrap">
        <div class="field su-plan-row" data-idx="0">
          <div class="field-label"><span class="lbl">改善項目1<span class="tag tag-required">必須</span></span></div>
          <input class="input su-det-item" placeholder="例：週次1on1の実施と傾聴">
        </div>
        <div class="field su-plan-row" data-idx="0">
          <div class="field-label"><span class="lbl">アクションプラン1<span class="tag tag-required">必須</span></span></div>
          <input class="input su-det-action" placeholder="例：毎週火曜午前に各メンバーと30分の1on1を確保し、8割聴く">
        </div>
      </div>
      <button type="button" class="btn btn-text" style="margin-top:var(--s2);" onclick="addDetPlanInput()">
        <i data-lucide="plus"></i>改善項目を追加する
      </button>
      <div class="row" style="justify-content:flex-end;margin-top:var(--s4);">
        <button class="btn btn-primary btn-lg" onclick="confirmSetup()">
          このプランで振り返りを始める<i data-lucide="arrow-right"></i>
        </button>
      </div>
    </div>`;
}

function confirmSetup() {
  const fu = getFu(state.me.followupId);
  const p = getP(fu, state.me.participantId);
  if (fu.mode === 'light') {
    const inputs = document.querySelectorAll('#su-actions-wrap .su-action-input');
    const actions = [];
    let err = false;
    inputs.forEach((inp, i) => {
      const t = inp.value.trim();
      if (!t) { err = true; return; }
      actions.push({ id: i + 1, text: t, history: [] });
    });
    if (err || !actions.length) return showToast('アクションをすべて入力してください', true);
    p.actions = actions;
  } else {
    const v = document.getElementById('su-vision').value.trim();
    const c = document.getElementById('su-challenge').value.trim();
    if (!v || !c) return showToast('理想像と課題を入力してください', true);
    const items = document.querySelectorAll('#su-plans-wrap .su-det-item');
    const actions = document.querySelectorAll('#su-plans-wrap .su-det-action');
    const plans = [];
    let err = false;
    items.forEach((inp, i) => {
      const it = inp.value.trim();
      const ac = actions[i]?.value.trim();
      if (!it || !ac) { err = true; return; }
      plans.push({ id: i + 1, item: it, action: ac, history: [] });
    });
    if (err || !plans.length) return showToast('すべての改善項目・プランを入力してください', true);
    p.vision = v; p.challenge = c; p.plans = plans;
  }
  p.setupCompleted = true;
  showToast('プランを登録しました。振り返りを始めましょう！');
  render();
}

function addActionInput() {
  const wrap = document.getElementById('su-actions-wrap');
  if (!wrap) return;
  const count = wrap.querySelectorAll('.su-action-row').length + 1;
  const div = document.createElement('div');
  div.className = 'field su-action-row';
  div.style.cssText = 'display:flex;gap:var(--s3);align-items:flex-end;';
  div.innerHTML = `<div class="field" style="flex:1;">
    <div class="field-label"><span class="lbl">アクション${count}<span class="tag tag-required">必須</span></span></div>
    <input class="input su-action-input" placeholder="実践する行動">
  </div>
  <button type="button" class="btn btn-tertiary btn-mini" onclick="this.closest('.su-action-row').remove()" style="height:48px;flex-shrink:0;">
    <i data-lucide="trash-2"></i>
  </button>`;
  wrap.appendChild(div);
  lucide.createIcons();
}

function addDetPlanInput() {
  const wrap = document.getElementById('su-plans-wrap');
  if (!wrap) return;
  const count = wrap.querySelectorAll('.su-det-item').length + 1;
  const g = document.createElement('div');
  g.className = 'col gap2';
  g.innerHTML = `<div class="field su-plan-row"><div class="field-label"><span class="lbl">改善項目${count}<span class="tag tag-required">必須</span></span>
    <button type="button" class="btn btn-text btn-mini" onclick="this.closest('.col').remove()"><i data-lucide="trash-2"></i></button></div>
    <input class="input su-det-item" placeholder="改善したい項目"></div>
    <div class="field su-plan-row"><div class="field-label"><span class="lbl">アクションプラン${count}<span class="tag tag-required">必須</span></span></div>
    <input class="input su-det-action" placeholder="具体的なアクション"></div>`;
  wrap.appendChild(g);
  lucide.createIcons();
}

/* ---- ライト：運用 ---- */
function studentLightHTML(fu, p) {
  const c = p.currentCycle;
  const cd = p.cycles[c];
  const unit = cycleUnit(fu);
  const canChangeAction = fu.actionSetter !== 'hr';  // 人事設定アクションは変更不可
  const actions = p.actions.map(a => `
    <div class="panel flat" style="flex-direction:row;align-items:center;justify-content:space-between;gap:12px;">
      <div><div class="tag tag-info">アクション${a.id}</div>
        <div class="bold mt2" style="font-size:15px;">${esc(a.text)}</div>
        ${!canChangeAction ? '<div class="small muted mt2"><i data-lucide="lock" style="width:12px;height:12px;"></i> 人事が設定したアクションです</div>' : ''}
      </div>
      ${(canChangeAction && !cd.submitted) ? `<button class="btn btn-secondary btn-mini" onclick="toggleActEdit(${a.id})"><i data-lucide="edit-3"></i>変更する</button>` : ''}
    </div>
    ${canChangeAction ? `
    <div id="act-edit-${a.id}" class="panel flat hidden" style="background:var(--light-violet);">
      <div class="field"><div class="field-label"><span class="lbl">新しいアクション<span class="tag tag-required">必須</span></span></div><input class="input" id="act-new-${a.id}" placeholder="新しい行動"></div>
      <div class="field"><div class="field-label"><span class="lbl">変更理由<span class="tag tag-required">必須</span></span></div><input class="input" id="act-reason-${a.id}" placeholder="なぜ変えるのか"></div>
      <div class="row" style="justify-content:flex-end;">
        <button class="btn btn-tertiary btn-mini" onclick="toggleActEdit(${a.id})">キャンセル</button>
        <button class="btn btn-primary btn-mini" onclick="applyActChange(${a.id})">変更を適用</button>
      </div>
    </div>` : ''}`).join('');

  const histHTML = (canChangeAction && p.history.length) ? `
    <div class="panel flat" style="background:var(--bg-violet);">
      <div class="section-label"><i data-lucide="history"></i> アクション変更履歴</div>
      ${p.history.map(h => `<div class="small"><span style="text-decoration:line-through;color:var(--placeholder);">${esc(h.oldText)}</span>
        <span style="color:var(--primary);">→</span> <strong>${esc(h.newText)}</strong>
        <span class="muted">（${h.cycleNum}${unit}・理由：${esc(h.reason)}）</span></div>`).join('')}
    </div>` : '';

  // 振り返りフォーム or 状態表示
  let formArea;
  if (!cd.submitted) {
    formArea = `
      <form onsubmit="submitLight(event)" class="col gap5">
        <div class="field">
          <div class="field-label">
            <span class="lbl">行動量（アクションの実践度）<span class="tag tag-required">必須</span></span>
            <span class="bold num" id="light-prog-val" style="font-size:20px;color:var(--primary);">${cd.progress}%</span>
          </div>
          <input type="range" min="0" max="100" value="${cd.progress}" id="light-prog"
            oninput="document.getElementById('light-prog-val').textContent=this.value+'%'" style="margin-top:var(--s2);">
        </div>
        <div class="field">
          <div class="field-label"><span class="lbl">振り返り<span class="tag tag-required">必須</span></span></div>
          <textarea class="textarea" id="light-memo" rows="4"
            placeholder="今週のアクションを振り返って。うまくいったこと・気づき・次週への工夫などを記録しましょう。"></textarea>
        </div>
        <div class="row" style="justify-content:flex-end;">
          <button class="btn btn-primary btn-lg" type="submit">上司に提出する<i data-lucide="send"></i></button>
        </div>
      </form>`;
  } else if (!cd.bossFeedback.stamp) {
    formArea = `<div class="panel flat" style="background:var(--bg-green);border-color:var(--success);border-left:4px solid var(--success);">
      <div class="row gap3"><i data-lucide="check-circle" style="color:var(--success);width:24px;height:24px;flex-shrink:0;"></i>
        <div><div class="bold sm">提出済みです</div><div class="small muted mt2">上司からのフィードバックをお待ちください。</div></div></div>
      <div class="panel flat" style="background:var(--bg-violet);margin-top:var(--s3);">
        <div class="section-label">提出した振り返り</div>
        <div class="mt2">行動量 <strong class="num">${cd.progress}%</strong></div>
        ${cd.memo ? `<div class="small mt2 muted">"${esc(cd.memo)}"</div>` : ''}
      </div>
    </div>`;
  } else {
    formArea = `
      <div class="panel flat" style="background:var(--bg-caution);border-color:var(--caution);border-left:4px solid var(--caution);">
        <div class="section-label"><i data-lucide="sparkles"></i> 上司からのフィードバック</div>
        <div class="row gap4 mt2"><div style="font-size:48px;">${cd.bossFeedback.emoji}</div>
          <div><div class="bold sm">「${esc(cd.bossFeedback.stamp)}」を受け取りました！</div>
          ${cd.bossFeedback.comment ? `<div class="small mt2">${esc(cd.bossFeedback.comment)}</div>` : ''}</div></div>
      </div>
      <div class="panel flat" style="background:var(--light-violet);border-color:var(--primary);border-left:4px solid var(--primary);">
        <div class="row-between wrap">
          <div class="row gap2"><i data-lucide="calendar-plus" style="color:var(--primary);"></i>
            <div><div class="bold">第${c}${unit}の伴走が完了しました</div><div class="small muted">次の振り返りを始められます。</div></div></div>
          <button class="btn btn-primary btn-lg" onclick="nextCycle()">次の${unit.replace('目','')}の振り返りへ<i data-lucide="arrow-right"></i></button>
        </div>
      </div>`;
  }

  return `
    ${hrNoticeHTML(fu)}
    <div class="panel">
      <div class="panel-head"><span class="h2">アクションプラン</span><span class="tag tag-ghost">第${c}${unit}</span></div>
      ${actions}${histHTML}
    </div>
    <div class="panel">
      <div class="panel-head"><span class="h2">今週の振り返り</span>
        ${cd.submitted ? '<span class="tag tag-success"><i data-lucide="check"></i>提出済み</span>' : '<span class="tag tag-info">入力中</span>'}</div>
      ${formArea}
    </div>`;
}

function pickFeeling(btn) {
  btn.parentElement.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}
function toggleActEdit(id) { document.getElementById('act-edit-' + id).classList.toggle('hidden'); }
function applyActChange(id) {
  const fu = getFu(state.me.followupId), p = getP(fu, state.me.participantId);
  const nt = document.getElementById('act-new-' + id).value.trim();
  const rs = document.getElementById('act-reason-' + id).value.trim();
  if (!nt || !rs) return showToast('新しいアクションと理由を入力してください', true);
  const a = p.actions.find(x => x.id === id);
  const h = { actionId: id, oldText: a.text, newText: nt, reason: rs, cycleNum: p.currentCycle };
  a.history.push(h); p.history.push(h); a.text = nt;
  showToast('アクションを軌道修正しました');
  render();
}
function submitLight(e) {
  e.preventDefault();
  const fu = getFu(state.me.followupId), p = getP(fu, state.me.participantId);
  const cd = p.cycles[p.currentCycle];
  const memo = document.getElementById('light-memo').value.trim();
  if (!memo) return showToast('振り返りを入力してください', true);
  cd.progress = parseInt(document.getElementById('light-prog').value);
  cd.memo = memo;
  cd.submitted = true;
  showToast('今週の振り返りを提出しました！');
  render();
}
function nextCycle() {
  const fu = getFu(state.me.followupId), p = getP(fu, state.me.participantId);
  if (p.currentCycle >= totalCycles(fu)) return showToast('支援期間の全サイクルが完了しました！');
  p.currentCycle++;
  p.cycles[p.currentCycle] = cyc(false, 50, '', '');
  showToast(`第${p.currentCycle}${cycleUnit(fu)}を開始しました`);
  render();
}

/* ---- じっくり：運用 ---- */
function studentDetailedHTML(fu, p) {
  const cur = p.currentMonth;
  const plans = p.plans.map(pl => `
    <div class="panel flat" style="flex-direction:row;align-items:center;justify-content:space-between;gap:12px;">
      <div><div class="row gap2"><span class="tag tag-info">プラン${pl.id}</span><span class="bold">${esc(pl.item)}</span></div>
        <div class="small mt2">${esc(pl.action)}</div></div>
      ${!p.months[cur].submitted ? `<button class="btn btn-secondary btn-mini" onclick="togglePlanEdit(${pl.id})"><i data-lucide="edit-3"></i>変更</button>` : ''}
    </div>
    <div id="plan-edit-${pl.id}" class="panel flat hidden" style="background:var(--light-violet);">
      <div class="field"><div class="field-label"><span class="lbl small">新しいアクションプラン</span></div><input class="input" id="plan-new-${pl.id}"></div>
      <div class="field"><div class="field-label"><span class="lbl small">変更理由</span></div><input class="input" id="plan-reason-${pl.id}"></div>
      <div class="row" style="justify-content:flex-end;"><button class="btn btn-tertiary btn-mini" onclick="togglePlanEdit(${pl.id})">キャンセル</button>
        <button class="btn btn-primary btn-mini" onclick="applyPlanChange(${pl.id})">変更を適用</button></div>
    </div>`).join('');

  let timeline = '';
  for (let m = 1; m <= fu.durationMonths; m++) {
    const md = p.months[m];
    const locked = m > cur, past = m < cur;
    let body;
    if (locked) {
      body = `<div class="empty" style="padding:24px;"><div class="empty-icon" style="width:48px;height:48px;"><i data-lucide="lock"></i></div>
        <div class="small muted">${m - 1}ヶ月目の上司フィードバック完了後に解放されます。</div></div>`;
    } else if (past || (md.submitted)) {
      const kpt = p.plans.map(pl => { const k = md.kpts[pl.id] || {}; return `
        <div class="panel flat" style="gap:6px;"><div class="bold small">プラン：${esc(pl.item)}</div>
        <div class="grid-3 small"><div><strong style="color:var(--success);">Keep</strong> ${esc(k.keep)}</div>
        <div><strong style="color:var(--error);">Problem</strong> ${esc(k.problem)}</div>
        <div><strong style="color:var(--orange);">Try</strong> ${esc(k.try)}</div></div></div>`; }).join('');
      const fb = md.bossFeedback.confirmed ? `
        <div class="panel flat" style="background:var(--bg-caution);border-color:var(--caution);">
          <div class="section-label"><i data-lucide="message-circle"></i> 上司FB（${esc(md.bossFeedback.emoji)} ${esc(md.bossFeedback.stamp)}）</div>
          <div class="small">${esc(md.bossFeedback.comment) || 'コメントなし'}</div></div>`
        : `<div class="panel flat" style="background:var(--bg-green);border-color:var(--success);"><div class="row gap2"><i data-lucide="check-circle" style="color:var(--success);"></i><span class="small">提出済み。上司フィードバックをお待ちください。</span></div></div>`;
      body = kpt + `<div class="small muted">アクションプラン：${md.changePlan === 'keep' ? '現状維持' : '一部変更'}　／　メモ：${esc(md.memo) || 'なし'}</div>` + fb;
    } else {
      // 当月・未提出 → KPT入力フォーム
      const forms = p.plans.map(pl => `
        <div class="panel flat"><div class="bold small">改善項目：${esc(pl.item)}</div>
          <div class="grid-3">
            <div class="field"><div class="field-label"><span class="lbl small" style="color:var(--success);">Keep（できたこと）</span></div><textarea class="textarea" rows="2" id="kpt-keep-${m}-${pl.id}"></textarea></div>
            <div class="field"><div class="field-label"><span class="lbl small" style="color:var(--error);">Problem（課題）</span></div><textarea class="textarea" rows="2" id="kpt-problem-${m}-${pl.id}"></textarea></div>
            <div class="field"><div class="field-label"><span class="lbl small" style="color:var(--orange);">Try（次月の工夫）</span></div><textarea class="textarea" rows="2" id="kpt-try-${m}-${pl.id}"></textarea></div>
          </div></div>`).join('');
      body = `<form onsubmit="submitMonth(event,${m})" class="col gap4">${forms}
        <div class="grid-2">
          <div class="field"><div class="field-label"><span class="lbl small">来月のプラン変更</span></div>
            <div class="seg seg-2"><button type="button" class="seg-btn active" data-cp="keep" onclick="pickSeg(this)">現状維持</button>
              <button type="button" class="seg-btn" data-cp="modify" onclick="pickSeg(this)">一部変更</button></div></div>
          <div class="field"><div class="field-label"><span class="lbl small">上司への相談・メモ<span class="tag tag-optional">任意</span></span></div>
            <textarea class="textarea" rows="2" id="det-memo-${m}"></textarea></div>
        </div>
        <div class="row" style="justify-content:flex-end;"><button class="btn btn-primary btn-lg" type="submit">${m}ヶ月目のシートを提出する<i data-lucide="send"></i></button></div>
      </form>`;
    }
    timeline += `
      <div class="panel">
        <div class="panel-head"><span class="h2">${m}ヶ月目の振り返り</span>
          ${past ? '<span class="tag tag-success"><i data-lucide="check"></i>完了</span>'
            : (m === cur && md.submitted) ? '<span class="tag tag-warning">上司確認中</span>'
            : (m === cur) ? '<span class="tag tag-info">入力中</span>' : '<span class="tag tag-ghost">ロック中</span>'}</div>
        ${body}
      </div>`;
  }

  return `
    ${hrNoticeHTML(fu)}
    <div class="panel" style="background:linear-gradient(135deg,var(--bg-violet),var(--light-violet));">
      <div class="grid-2">
        <div><div class="section-label">目指す理想像</div><div class="bold mt2">${esc(p.vision)}</div></div>
        <div><div class="section-label">現状の課題</div><div class="bold mt2">${esc(p.challenge)}</div></div>
      </div>
    </div>
    <div class="panel"><div class="panel-head"><span class="h2">アクションプランと変更履歴</span></div>${plans}</div>
    ${timeline}`;
}
function pickSeg(btn) { btn.parentElement.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); }
function togglePlanEdit(id) { document.getElementById('plan-edit-' + id).classList.toggle('hidden'); }
function applyPlanChange(id) {
  const fu = getFu(state.me.followupId), p = getP(fu, state.me.participantId);
  const nt = document.getElementById('plan-new-' + id).value.trim();
  const rs = document.getElementById('plan-reason-' + id).value.trim();
  if (!nt || !rs) return showToast('新しいプランと理由を入力してください', true);
  const pl = p.plans.find(x => x.id === id);
  pl.history.push({ oldAction: pl.action, newAction: nt, reason: rs, monthNum: p.currentMonth });
  pl.action = nt;
  showToast('プランを軌道修正しました');
  render();
}
function submitMonth(e, m) {
  e.preventDefault();
  const fu = getFu(state.me.followupId), p = getP(fu, state.me.participantId);
  const md = p.months[m]; md.kpts = {};
  let err = false;
  p.plans.forEach(pl => {
    const k = document.getElementById(`kpt-keep-${m}-${pl.id}`).value.trim();
    const pr = document.getElementById(`kpt-problem-${m}-${pl.id}`).value.trim();
    const tr = document.getElementById(`kpt-try-${m}-${pl.id}`).value.trim();
    if (!k || !pr || !tr) { err = true; return; }
    md.kpts[pl.id] = { keep: k, problem: pr, try: tr };
  });
  if (err) return showToast('すべてのKPTを入力してください', true);
  md.memo = document.getElementById('det-memo-' + m).value.trim();
  md.changePlan = document.querySelector(`#view-student .seg-btn.active[data-cp]`)?.dataset.cp || 'keep';
  md.submitted = true;
  showToast(`${m}ヶ月目の振り返りを提出しました！`);
  render();
}

/* =========================================================
   グラフ（行動変容の推移）
   ========================================================= */
function buildSeries(fu, p) {
  const labels = [], data = [], colors = [], hovers = [];
  if (fu.mode === 'light') {
    const n = totalCycles(fu);
    for (let i = 1; i <= n; i++) {
      labels.push(`${i}${cycleUnit(fu)}`);
      const cd = p.cycles[i];
      if (cd && cd.submitted) {
        data.push(cd.progress);
        const chg = p.history.find(h => h.cycleNum === i);
        if (chg) { colors.push('#9D3CFF'); hovers.push(`軌道修正：${chg.newText}`); }
        else { colors.push('#5D3CFF'); hovers.push(`行動量：${cd.progress}%`); }
      } else { data.push(null); colors.push('#D1D1D1'); hovers.push(''); }
    }
  } else {
    for (let m = 1; m <= fu.durationMonths; m++) {
      labels.push(`${m}ヶ月目`);
      const md = p.months[m];
      if (md && md.submitted) {
        const chg = p.plans.some(pl => pl.history.some(h => h.monthNum === m));
        const prog = md.changePlan === 'keep' ? 80 : 95;
        data.push(prog);
        colors.push(chg ? '#9D3CFF' : '#5D3CFF');
        hovers.push(chg ? 'プラン変更あり' : `実践度：${prog}%`);
      } else { data.push(null); colors.push('#D1D1D1'); hovers.push(''); }
    }
  }
  return { labels, data, colors, hovers };
}
// 案件平均（人事集計用）
function buildCaseSeries(fu) {
  const setupP = fu.participants.filter(p => p.setupCompleted);
  const labels = [], data = [], colors = [], hovers = [];
  if (fu.mode === 'light') {
    const n = totalCycles(fu);
    for (let i = 1; i <= n; i++) {
      labels.push(`${i}${cycleUnit(fu)}`);
      const vals = setupP.map(p => p.cycles[i]).filter(c => c && c.submitted).map(c => c.progress);
      if (vals.length) { const avg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
        data.push(avg); colors.push('#5D3CFF'); hovers.push(`平均行動量：${avg}%（${vals.length}名提出）`); }
      else { data.push(null); colors.push('#D1D1D1'); hovers.push(''); }
    }
  } else {
    for (let m = 1; m <= fu.durationMonths; m++) {
      labels.push(`${m}ヶ月目`);
      const vals = setupP.map(p => p.months[m]).filter(md => md && md.submitted).map(md => md.changePlan === 'keep' ? 80 : 95);
      if (vals.length) { const avg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
        data.push(avg); colors.push('#5D3CFF'); hovers.push(`平均実践度：${avg}%（${vals.length}名提出）`); }
      else { data.push(null); colors.push('#D1D1D1'); hovers.push(''); }
    }
  }
  return { labels, data, colors, hovers };
}
function drawChartFrom(canvasId, s) {
  const cv = document.getElementById(canvasId); if (!cv) return;
  if (chartInstances[canvasId]) chartInstances[canvasId].destroy();
  chartInstances[canvasId] = new Chart(cv.getContext('2d'), {
    type: 'line',
    data: { labels: s.labels, datasets: [{ data: s.data, borderColor: '#5D3CFF',
      backgroundColor: 'rgba(93,60,255,.06)', borderWidth: 2, tension: .15, spanGaps: true,
      pointBackgroundColor: s.colors, pointBorderColor: s.colors, pointRadius: 5, pointHoverRadius: 7, fill: true }] },
    options: { responsive: true, maintainAspectRatio: false,
      scales: { y: { min: 0, max: 100, grid: { color: '#F1F1F1' }, ticks: { font: { size: 10 } } },
        x: { grid: { display: false }, ticks: { font: { size: 10 } } } },
      plugins: { legend: { display: false },
        tooltip: { callbacks: { label: (ctx) => s.hovers[ctx.dataIndex] || '' } } } },
  });
}
const drawChart = (id, fu, p) => drawChartFrom(id, buildSeries(fu, p));

/* ---------- 参加者ステータス ---------- */
function participantStatus(fu, p) {
  if (!p.setupCompleted) return { label: 'プラン設定中', tone: 'ghost', needsAction: false };
  if (fu.mode === 'light') {
    const cd = p.cycles[p.currentCycle];
    if (cd && cd.submitted && !cd.bossFeedback.stamp) return { label: '要フィードバック', tone: 'warning', needsAction: true };
    if (cd && cd.submitted) return { label: '伴走中', tone: 'success', needsAction: false };
    return { label: '受講者入力中', tone: 'ghost', needsAction: false };
  } else {
    const md = p.months[p.currentMonth];
    if (md && md.submitted && !md.bossFeedback.confirmed) return { label: '要フィードバック', tone: 'warning', needsAction: true };
    if (p.currentMonth >= fu.durationMonths && md && md.bossFeedback.confirmed) return { label: '完了', tone: 'success', needsAction: false };
    if (md && md.submitted) return { label: '伴走中', tone: 'success', needsAction: false };
    return { label: '受講者入力中', tone: 'ghost', needsAction: false };
  }
}
const toneTag = (s) => `<span class="tag tag-${s.tone === 'ghost' ? 'ghost' : s.tone}">${s.needsAction ? '<i data-lucide="alert-circle"></i>' : ''}${esc(s.label)}</span>`;

/* =========================================================
   上司ビュー
   ========================================================= */
function bossReports() {
  const rows = [];
  DATA.followups.forEach(fu => fu.participants.forEach(p => {
    if (p.bossId === state.boss.id) rows.push({ fu, p });
  }));
  return rows;
}
function renderBoss() {
  if (state.bossSelected) return renderBossDetail();
  const el = document.getElementById('view-boss');
  setBreadcrumb([{ label: 'TOP' }, { label: 'フォローアップ' }, { label: '部下のフォローアップ' }]);
  const rows = bossReports();
  const needs = rows.filter(r => participantStatus(r.fu, r.p).needsAction).length;
  el.innerHTML = `
    <div class="h1">部下のフォローアップ<span class="sub">${esc(state.boss.name)}が担当する受講者：${rows.length}名${needs ? `／要フィードバック ${needs}名` : ''}</span></div>
    ${needs ? `<div class="panel flat" style="background:var(--bg-caution);border-color:var(--caution);border-left:4px solid var(--caution);flex-direction:row;align-items:center;gap:var(--s4);padding:var(--s4) var(--s5);"><i data-lucide="bell" style="color:var(--caution);width:22px;height:22px;flex-shrink:0;"></i><div><div class="bold">${needs}名の振り返りがフィードバック待ちです。</div><div class="small muted">上の一覧から確認してフィードバックしましょう。</div></div></div>` : ''}
    <div class="panel">
      <div class="panel-head"><span class="h2">担当受講者一覧</span></div>
      <div class="table-wrap"><table class="tbl">
        <thead><tr><th class="left">氏名</th><th class="left">フォローアップ案件</th><th>形式</th><th>進捗</th><th></th></tr></thead>
        <tbody>
          ${rows.sort((a, b) => participantStatus(b.fu, b.p).needsAction - participantStatus(a.fu, a.p).needsAction).map(r => {
            const s = participantStatus(r.fu, r.p);
            return `<tr class="clickable" onclick="openBoss('${r.fu.id}','${r.p.id}')">
              <td class="left"><div class="user-cell"><div class="ua">${esc(r.p.name[0])}</div>
                <div><div class="un">${esc(r.p.name)}</div><div class="um">${esc(r.p.dept)}・${esc(r.p.meta)}</div></div></div></td>
              <td class="left"><span class="small">${esc(r.fu.name)}</span></td>
              <td><span class="tag tag-train">${r.fu.mode === 'light' ? 'ライト' : 'じっくり'}</span></td>
              <td>${toneTag(s)}</td>
              <td><i data-lucide="chevron-right" style="color:var(--placeholder);"></i></td></tr>`;
          }).join('')}
        </tbody></table></div>
    </div>`;
  lucide.createIcons();
}
function openBoss(fuId, pid) { state.bossSelected = { followupId: fuId, participantId: pid }; render(); }
function backBoss() { state.bossSelected = null; render(); }

function renderBossDetail() {
  const fu = getFu(state.bossSelected.followupId);
  const p = getP(fu, state.bossSelected.participantId);
  setBreadcrumb([{ label: 'TOP' }, { label: 'フォローアップ' },
    { label: '部下のフォローアップ', onClick: 'backBoss()' }, { label: p.name }]);
  const el = document.getElementById('view-boss');
  el.innerHTML = `
    <div class="row-between wrap">
      <div class="h1">${esc(p.name)} さんの振り返り<span class="sub">${esc(p.dept)}・${esc(p.meta)}／${esc(fu.name)}</span></div>
      <button class="btn btn-secondary" onclick="backBoss()"><i data-lucide="arrow-left"></i>一覧へ戻る</button>
    </div>
    <div class="panel"><div class="panel-head no-border"><span class="h3">行動変容の推移</span></div>
      <div class="chart-box"><canvas id="chart-boss"></canvas></div></div>
    ${fu.mode === 'light' ? bossLightHTML(fu, p) : bossDetailedHTML(fu, p)}
  `;
  lucide.createIcons();
  setTimeout(() => drawChart('chart-boss', fu, p), 30);
}

function bossLightHTML(fu, p) {
  const cd = p.cycles[p.currentCycle];
  if (!cd || !cd.submitted) {
    return `<div class="panel"><div class="empty"><div class="empty-icon"><i data-lucide="hourglass"></i></div>
      <h3>受講者の提出を待っています</h3><p>${esc(p.name)}さんが第${p.currentCycle}${cycleUnit(fu)}の振り返りを提出すると、ここに反映されます。</p></div></div>`;
  }
  const stamped = !!cd.bossFeedback.stamp;
  const histAcc = Object.keys(p.cycles)
    .filter(k => { const c = p.cycles[k]; return c.submitted && c.bossFeedback.stamp; })
    .map(k => {
      const c = p.cycles[k];
      return `<div class="panel flat" style="background:var(--bg-violet);gap:var(--s3);">
        <div class="row-between">
          <span class="bold">第${k}${cycleUnit(fu)}</span>
          <span class="tag tag-success">完了</span>
        </div>
        <div class="muted">行動量 <strong class="num">${c.progress}%</strong></div>
        ${c.memo ? `<div class="muted" style="font-size:14px;">"${esc(c.memo)}"</div>` : ''}
        <div style="font-size:14px;color:var(--gray);">送信：${c.bossFeedback.emoji} <strong>${esc(c.bossFeedback.stamp)}</strong></div>
      </div>`;
    }).join('') || '<div class="muted center" style="padding:var(--s4);">過去の完了サイクルはありません。</div>';

  return `
    ${hrNoticeHTML(fu)}
    <div class="grid-2">
      <div class="panel">
        <div class="panel-head"><span class="h2">振り返りの内容</span><span class="tag tag-ghost">第${p.currentCycle}${cycleUnit(fu)}</span></div>
        ${p.actions.map(a => `
          <div class="panel flat" style="gap:var(--s2);">
            <div class="tag tag-info">アクション${a.id}</div>
            <div class="bold" style="font-size:16px;">${esc(a.text)}</div>
          </div>`).join('')}
        <div class="panel flat center" style="background:var(--bg-violet);">
          <div class="section-label">行動量</div>
          <div class="num bold" style="font-size:48px;color:var(--primary);line-height:1.1;">${cd.progress}%</div>
          <div class="pbar" style="height:10px;margin-top:var(--s3);"><i style="width:${cd.progress}%;"></i></div>
        </div>
        <div class="field">
          <div class="field-label"><span class="lbl">本人の振り返り</span></div>
          <div class="panel flat" style="background:var(--bg-violet);font-size:15px;line-height:1.7;">${esc(cd.memo) || '（振り返り未記入）'}</div>
        </div>
        <div class="field">
          <div class="field-label"><span class="lbl"><i data-lucide="history" style="width:16px;height:16px;"></i> 過去の週次履歴</span></div>
          <div class="col gap3">${histAcc}</div>
        </div>
      </div>
      <div class="panel">
        <div class="panel-head"><span class="h2">ワンクリック伴走</span></div>
        <div class="ai-box">
          <div class="ai-head"><i data-lucide="sparkles"></i>AIフィードバック補助<span class="ai-pending">AI連携予定</span></div>
          <div class="small">本人の努力を認めるFB文の下書きをAIが提案します（Phase6で実装）。</div>
        </div>
        ${stamped
          ? `<div class="panel flat" style="background:var(--bg-green);border-color:var(--success);border-left:4px solid var(--success);padding:var(--s5);">
              <div class="row gap3"><i data-lucide="check-circle" style="color:var(--success);width:24px;height:24px;flex-shrink:0;"></i>
                <div><div class="bold sm">送信済み：${cd.bossFeedback.emoji} ${esc(cd.bossFeedback.stamp)}</div>
                  <div class="small muted mt2">受講者へ伝わりました。</div></div></div>
            </div>`
          : `<div class="col gap4">${STAMPS.map(s => `
              <button class="btn btn-secondary btn-lg" style="justify-content:space-between;width:100%;" onclick="sendStamp('${s.text}','${s.emoji}')">
                <span style="font-size:24px;">${s.emoji}　<span class="sm bold">${s.text}</span></span>
                <i data-lucide="chevron-right"></i>
              </button>`).join('')}</div>`}
      </div>
    </div>`;
}
function sendStamp(text, emoji) {
  const fu = getFu(state.bossSelected.followupId), p = getP(fu, state.bossSelected.participantId);
  const cd = p.cycles[p.currentCycle];
  cd.bossFeedback.stamp = text; cd.bossFeedback.emoji = emoji;
  showToast(`「${text}」を送信しました`);
  render();
}

function bossDetailedHTML(fu, p) {
  const cur = p.currentMonth;
  const md = p.months[cur];
  if (!md || !md.submitted) {
    return `<div class="panel"><div class="empty"><div class="empty-icon"><i data-lucide="hourglass"></i></div>
      <h3>受講者の提出を待っています</h3><p>${esc(p.name)}さんが${cur}ヶ月目のKPT振り返りを提出すると、フィードバックできます。</p></div></div>`;
  }
  const req = fu.bossCommentRequired === 'required';
  const kpt = p.plans.map(pl => { const k = md.kpts[pl.id] || {}; return `
    <div class="panel flat" style="gap:6px;"><div class="bold small">改善プラン：${esc(pl.item)}</div>
    <div class="grid-3 small"><div><strong style="color:var(--success);">Keep</strong> ${esc(k.keep)}</div>
    <div><strong style="color:var(--error);">Problem</strong> ${esc(k.problem)}</div>
    <div><strong style="color:var(--orange);">Try</strong> ${esc(k.try)}</div></div></div>`; }).join('');
  return `
    ${hrNoticeHTML(fu)}
    <div class="grid-2">
      <div class="panel">
        <div class="panel-head"><span class="h2">${cur}ヶ月目の振り返り</span><span class="tag tag-warning">要確認</span></div>
        ${kpt}
        <div class="small muted">プラン変更：${md.changePlan === 'keep' ? '現状維持' : '一部変更'}　／　本人メモ：${esc(md.memo) || 'なし'}</div>
      </div>
      <div class="panel">
        <div class="panel-head"><span class="h2">フィードバック</span></div>
        <div class="ai-box"><div class="ai-head"><i data-lucide="sparkles"></i>AIフィードバック補助<span class="ai-pending">AI連携予定</span></div>
          <div class="small">事実を褒め、問いで改善を促す観点をAIがサジェストします（Phase6で実装）。</div></div>
        <div class="panel flat" style="background:var(--bg-violet);gap:8px;">
          <div class="section-label">フィードバックの視点</div>
          <div class="small">① 今回の行動の事実を褒める　② 次への改善を一緒に考える　③ 心理的安全性と期待を伝える</div></div>
        <div class="field"><div class="field-label"><span class="lbl small">フィードバックコメント</span>${req ? '<span class="tag tag-required">必須</span>' : '<span class="tag tag-optional">任意</span>'}</div>
          <textarea class="textarea" id="boss-comment-${cur}" rows="4" placeholder="部下の努力を認め、次のステップを促すコメントを入力"></textarea></div>
        <div class="row-between wrap">
          <div class="row gap2" id="boss-stamp-${cur}">
            ${STAMPS.map((s, i) => `<button class="btn btn-tertiary" data-stamp="${s.text}" data-emoji="${s.emoji}" onclick="pickStamp(${cur},this)" style="font-size:24px;padding:10px 14px;" title="${s.text}">${s.emoji}</button>`).join('')}
          </div>
          <button class="btn btn-primary btn-lg" onclick="confirmMonthFB(${cur})">フィードバックを確定<i data-lucide="check"></i></button>
        </div>
      </div>
    </div>`;
}
let pickedStamp = {};
function pickStamp(m, btn) {
  pickedStamp[m] = { stamp: btn.dataset.stamp, emoji: btn.dataset.emoji };
  btn.parentElement.querySelectorAll('button').forEach(b => b.classList.replace('btn-primary', 'btn-tertiary'));
  btn.classList.replace('btn-tertiary', 'btn-primary');
}
function confirmMonthFB(m) {
  const fu = getFu(state.bossSelected.followupId), p = getP(fu, state.bossSelected.participantId);
  const comment = document.getElementById('boss-comment-' + m).value.trim();
  if (fu.bossCommentRequired === 'required' && !comment) return showToast('フィードバックコメントは必須です', true);
  if (!pickedStamp[m]) return showToast('スタンプを1つ選択してください', true);
  const md = p.months[m];
  md.bossFeedback = { comment, confirmed: true, stamp: pickedStamp[m].stamp, emoji: pickedStamp[m].emoji };
  if (m < fu.durationMonths) { p.currentMonth = m + 1; showToast(`${m}ヶ月目のFBを確定。${m + 1}ヶ月目が解放されました。`); }
  else showToast('3ヶ月の伴走が完了しました！');
  render();
}

/* =========================================================
   人事ビュー（案件一覧 → 案件詳細 → 受講者個別 の3階層）
   ========================================================= */
const EMPLOYEE_POOL = [
  { name: '山田 太郎', dept: '営業第二グループ', meta: '入社2年目', boss: '佐藤 部長', bossId: 'b1' },
  { name: '鈴木 花子', dept: '営業第二グループ', meta: '入社2年目', boss: '佐藤 部長', bossId: 'b1' },
  { name: '田中 健', dept: '営業第一グループ', meta: '入社1年目', boss: '高橋 課長', bossId: 'b2' },
  { name: '中村 彩', dept: '管理部', meta: '入社3年目', boss: '高橋 課長', bossId: 'b2' },
  { name: '小林 大輔', dept: '開発部', meta: '入社4年目', boss: '佐藤 部長', bossId: 'b1' },
];

function caseAggregate(fu) {
  const total = fu.participants.length;
  let scoreSum = 0, scored = 0, c_unsub = 0, c_wait = 0, c_ok = 0;
  fu.participants.forEach(p => {
    const m = computeMetrics(fu, p);
    if (p.setupCompleted) { scoreSum += m.score; scored++; }
    const s = participantStatus(fu, p);
    if (s.needsAction) c_wait++;
    else if (s.label === 'プラン設定中' || s.label === '受講者入力中') c_unsub++;
    else c_ok++;
  });
  const submittedCnt = fu.participants.filter(p => {
    if (!p.setupCompleted) return false;
    if (fu.mode === 'light') return p.cycles[p.currentCycle]?.submitted;
    return p.months[p.currentMonth]?.submitted;
  }).length;
  return { total, avgScore: scored ? Math.round(scoreSum / scored) : 0,
    submitRate: Math.round(submittedCnt / total * 100), c_unsub, c_wait, c_ok };
}

function renderHr() {
  const el = document.getElementById('view-hr');
  if (state.hrView === 'distribute') return renderHrDistribute();
  if (state.hr.participantId) return renderHrParticipant();
  if (state.hr.followupId) return renderHrCase();
  // ---- Level1: 案件一覧 ----
  setBreadcrumb([{ label: 'TOP' }, { label: 'フォローアップ' }]);
  el.innerHTML = `
    <div class="row-between wrap">
      <div class="h1">フォローアップ<span class="sub">研修後の行動変容を、案件ごとに集計・個別で確認できます</span></div>
      <button class="btn btn-primary" onclick="hrStartDistribute()"><i data-lucide="plus"></i>新しく配信する</button>
    </div>
    <div class="card-grid">
      ${DATA.followups.map(fu => { const a = caseAggregate(fu); return `
        <div class="fu-card" onclick="openCase('${fu.id}')">
          <div class="row-between"><span class="tag tag-train"><i data-lucide="graduation-cap"></i>${fu.mode === 'light' ? 'ライト' : 'じっくり'}</span>
            <span class="small muted">${esc(fu.distributedAt)}</span></div>
          <div class="h3">${esc(fu.name)}</div>
          <div class="small muted">${esc(fu.trainingName)}／${fu.durationMonths}ヶ月・対象${a.total}名</div>
          <div class="fu-metrics">
            <div class="fu-metric"><div class="v">${a.avgScore}</div><div class="l">平均スコア</div></div>
            <div class="fu-metric"><div class="v">${a.submitRate}%</div><div class="l">提出率</div></div>
            <div class="fu-metric"><div class="v">${a.c_wait}</div><div class="l">上司FB待ち</div></div>
          </div>
        </div>`; }).join('')}
    </div>`;
  lucide.createIcons();
}
function openCase(id) { state.hr = { followupId: id, participantId: null }; render(); }
function openCaseParticipant(pid) { state.hr.participantId = pid; render(); }
function hrBackToList() { state.hr = { followupId: null, participantId: null }; render(); }
function hrBackToCase() { state.hr.participantId = null; render(); }

/* ---- Level2: 案件詳細（集計＋受講者リスト） ---- */
function renderHrCase() {
  const fu = getFu(state.hr.followupId);
  const a = caseAggregate(fu);
  setBreadcrumb([{ label: 'TOP' }, { label: 'フォローアップ', onClick: 'hrBackToList()' }, { label: fu.name }]);
  const el = document.getElementById('view-hr');
  el.innerHTML = `
    <div class="row-between wrap">
      <div class="h1">${esc(fu.name)}<span class="sub">${esc(fu.trainingName)}／${fu.mode === 'light' ? 'ライト伴走（週次）' : 'じっくりシート（月次）'}・${fu.durationMonths}ヶ月</span></div>
      <div class="row gap2"><button class="btn btn-secondary" onclick="openExcel('${fu.id}')"><i data-lucide="file-spreadsheet"></i>Excel出力</button>
        <button class="btn btn-tertiary" onclick="hrBackToList()"><i data-lucide="arrow-left"></i>一覧へ</button></div>
    </div>
    <div class="grid-2">
      <div class="panel"><div class="panel-head no-border"><span class="h3">行動変容インデックス（案件平均）</span></div>
        <div class="score-ring" style="--score-deg:${a.avgScore * 3.6}deg;"><div class="score-ring-inner"><div class="v">${a.avgScore}</div><div class="u">/ 100点</div></div></div>
        <div class="center mt4" style="font-size:14px;font-weight:700;color:${a.avgScore >= 80 ? 'var(--success)' : a.avgScore >= 50 ? 'var(--caution)' : 'var(--error)'};">${a.avgScore >= 80 ? '定着レベル：高' : a.avgScore >= 50 ? '定着レベル：中' : '定着レベル：低'}</div>
      </div>
      <div class="panel"><div class="panel-head no-border"><span class="h3">行動変容サマリー</span></div>
        <div class="ai-box"><div class="ai-head"><i data-lucide="sparkles"></i>AI行動変容分析<span class="ai-pending">AI連携予定</span></div>
          <div class="small">対象${a.total}名の振り返りからAIが案件全体の傾向サマリーを生成します（Phase6で実装）。<br>
          暫定：提出率${a.submitRate}％、平均スコア${a.avgScore}点。継続的な行動が観測されています。</div></div>
        <div class="stat-row">
          <div class="stat-box"><div class="v">${a.c_unsub}</div><div class="l">未提出・受講者対応中</div></div>
          <div class="stat-box"><div class="v" style="color:var(--caution);">${a.c_wait}</div><div class="l">上司FB待ち</div></div>
          <div class="stat-box"><div class="v" style="color:var(--success);">${a.c_ok}</div><div class="l">順調・完了</div></div>
        </div>
      </div>
    </div>
    <div class="panel"><div class="panel-head no-border"><span class="h3">行動変容の推移（案件平均）</span></div>
      <div class="chart-box"><canvas id="chart-hr-case"></canvas></div></div>
    <div class="panel">
      <div class="panel-head"><span class="h2">受講者一覧</span><span class="small muted">行をクリックで個別結果へ</span></div>
      <div class="table-wrap"><table class="tbl">
        <thead><tr><th class="left">氏名</th><th class="left">所属</th><th>担当上司</th><th>進捗</th><th>スコア</th><th></th></tr></thead>
        <tbody>${fu.participants.map(p => { const m = computeMetrics(fu, p); const s = participantStatus(fu, p); return `
          <tr class="clickable" onclick="openCaseParticipant('${p.id}')">
            <td class="left"><div class="user-cell"><div class="ua">${esc(p.name[0])}</div><div><div class="un">${esc(p.name)}</div><div class="um">${esc(p.meta)}</div></div></div></td>
            <td class="left"><span class="small">${esc(p.dept)}</span></td>
            <td><span class="small muted">${esc(p.boss)}</span></td>
            <td>${toneTag(s)}</td>
            <td><span class="num bold">${p.setupCompleted ? m.score : '–'}</span></td>
            <td><i data-lucide="chevron-right" style="color:var(--placeholder);"></i></td></tr>`; }).join('')}
        </tbody></table></div>
    </div>`;
  lucide.createIcons();
  setTimeout(() => drawChartFrom('chart-hr-case', buildCaseSeries(fu)), 30);
}

/* ---- Level3: 受講者個別結果（人事・読み取り専用） ---- */
function renderHrParticipant() {
  const fu = getFu(state.hr.followupId);
  const p = getP(fu, state.hr.participantId);
  const m = computeMetrics(fu, p);
  setBreadcrumb([{ label: 'TOP' }, { label: 'フォローアップ', onClick: 'hrBackToList()' },
    { label: fu.name, onClick: 'hrBackToCase()' }, { label: p.name }]);
  const el = document.getElementById('view-hr');
  el.innerHTML = `
    <div class="row-between wrap">
      <div class="h1">${esc(p.name)} さんの結果<span class="sub">${esc(p.dept)}・${esc(p.meta)}／担当上司：${esc(p.boss)}</span></div>
      <button class="btn btn-tertiary" onclick="hrBackToCase()"><i data-lucide="arrow-left"></i>案件へ戻る</button>
    </div>
    <div class="grid-2">
      <div class="panel"><div class="panel-head no-border"><span class="h3">行動変容インデックス</span></div>
        <div class="score-ring" style="--score-deg:${m.score * 3.6}deg;"><div class="score-ring-inner"><div class="v">${m.score}</div><div class="u">/ 100点</div></div></div>
        <div class="center mt4" style="font-size:14px;font-weight:700;color:${m.score >= 80 ? 'var(--success)' : m.score >= 50 ? 'var(--caution)' : 'var(--error)'};">${esc(m.level)}</div></div>
      <div class="panel"><div class="panel-head no-border"><span class="h3">個別サマリー</span></div>
        <div class="ai-box"><div class="ai-head"><i data-lucide="sparkles"></i>AI個別分析<span class="ai-pending">AI連携予定</span></div>
          <div class="small">${esc(m.summary)}</div></div>
        <div class="chart-box" style="height:160px;"><canvas id="chart-hr-p"></canvas></div></div>
    </div>
    <div class="panel"><div class="panel-head"><span class="h2">振り返り履歴</span></div>${hrHistoryHTML(fu, p)}</div>`;
  lucide.createIcons();
  setTimeout(() => drawChart('chart-hr-p', fu, p), 30);
}
function hrHistoryHTML(fu, p) {
  if (!p.setupCompleted) return '<div class="small muted center" style="padding:16px;">まだプランが設定されていません。</div>';
  if (fu.mode === 'light') {
    return Object.keys(p.cycles).filter(k => p.cycles[k].submitted).map(k => { const c = p.cycles[k]; return `
      <div class="panel flat"><div class="row-between"><span class="bold">第${k}${cycleUnit(fu)}</span>
        ${c.bossFeedback.stamp ? `<span class="tag tag-success">${c.bossFeedback.emoji} ${esc(c.bossFeedback.stamp)}</span>` : '<span class="tag tag-warning">上司FB待ち</span>'}</div>
        <div class="muted" style="margin-top:var(--s2);">行動量 <strong class="num">${c.progress}%</strong></div>
        ${c.memo ? `<div class="small muted">"${esc(c.memo)}"</div>` : ''}</div>`; }).join('') ||
      '<div class="small muted center" style="padding:16px;">まだ振り返りの提出がありません。</div>';
  }
  let out = '';
  for (let mo = 1; mo <= fu.durationMonths; mo++) {
    const md = p.months[mo]; if (!md || !md.submitted) continue;
    const kpt = p.plans.map(pl => { const k = md.kpts[pl.id] || {}; return `<div class="small col gap1"><strong>${esc(pl.item)}</strong><div class="muted">K=${esc(k.keep)} / P=${esc(k.problem)} / T=${esc(k.try)}</div></div>`; }).join('');
    out += `<div class="panel flat"><div class="row-between"><span class="bold small">${mo}ヶ月目</span>
      ${md.bossFeedback.confirmed ? `<span class="tag tag-success">${md.bossFeedback.emoji} 確定</span>` : '<span class="tag tag-warning">上司確認中</span>'}</div>
      ${kpt}${md.bossFeedback.confirmed ? `<div class="small muted mt2">上司FB：${esc(md.bossFeedback.comment)}</div>` : ''}</div>`;
  }
  return out || '<div class="small muted center" style="padding:16px;">まだ振り返りの提出がありません。</div>';
}

/* ---- 配信（新規案件作成） ---- */
function hrStartDistribute() { state.hrView = 'distribute'; render(); }
function hrCancelDistribute() { state.hrView = null; state.hr = { followupId: null, participantId: null }; render(); }

function renderHrDistribute() {
  setBreadcrumb([{ label: 'TOP' }, { label: 'フォローアップ', onClick: 'hrCancelDistribute()' }, { label: '新しく配信する' }]);
  const el = document.getElementById('view-hr');
  el.innerHTML = `
    <div class="row-between wrap">
      <div class="h1">フォローアップを配信する<span class="sub">運用ルールを設定し、対象の受講者へ配信します</span></div>
      <button class="btn btn-tertiary" onclick="hrCancelDistribute()"><i data-lucide="x"></i>キャンセル</button>
    </div>
    <div class="panel">
      <div class="stepper">
        <div class="step current"><span class="step-dot">1</span><span class="step-label">ルール設定</span></div>
        <span class="step-line"></span>
        <div class="step"><span class="step-dot">2</span><span class="step-label">対象者選択</span></div>
        <span class="step-line"></span>
        <div class="step"><span class="step-dot">3</span><span class="step-label">配信</span></div>
      </div>

      <div class="field">
        <div class="field-label"><span class="lbl">案件名<span class="tag tag-required">必須</span></span></div>
        <input class="input" id="d-name" placeholder="例：2026夏 〇〇研修 フォローアップ">
      </div>

      <div class="grid-2">
        <div class="field"><div class="field-label"><span class="lbl">振り返りの形式</span></div>
          <div class="seg seg-2" id="d-mode">
            <button type="button" class="seg-btn active" data-v="light" onclick="pickSeg(this)">ライト伴走（週次）</button>
            <button type="button" class="seg-btn" data-v="detailed" onclick="pickSeg(this)">じっくりシート（月次）</button>
          </div></div>
        <div class="field"><div class="field-label"><span class="lbl">支援期間</span></div>
          <select class="select" id="d-duration">
            <option value="1">1ヶ月</option><option value="3" selected>3ヶ月</option><option value="6">6ヶ月</option>
          </select></div>
      </div>

      <div class="grid-2">
        <div class="field"><div class="field-label"><span class="lbl">振り返りサイクル</span></div>
          <select class="select" id="d-cycle">
            <option value="weekly" selected>毎週</option><option value="biweekly">隔週</option><option value="monthly">毎月</option>
          </select></div>
        <div class="field"><div class="field-label"><span class="lbl">上司コメント要件</span></div>
          <div class="seg seg-2" id="d-comment">
            <button type="button" class="seg-btn active" data-v="optional" onclick="pickSeg(this)">任意（スタンプ可）</button>
            <button type="button" class="seg-btn" data-v="required" onclick="pickSeg(this)">コメント必須</button>
          </div></div>
      </div>

      <div class="field">
        <div class="field-label"><span class="lbl">アクション設定者</span></div>
        <div class="seg seg-2" id="d-actionsetter">
          <button type="button" class="seg-btn active" data-v="student" onclick="pickSeg(this);updateActionSetterUI()">
            受講者が自分で設定する（推奨）
          </button>
          <button type="button" class="seg-btn" data-v="hr" onclick="pickSeg(this);updateActionSetterUI()">
            人事があらかじめ設定する
          </button>
        </div>
        <div class="hint">「人事が設定」を選んだ場合、受講者はアクションを変更できません。</div>
      </div>

      <div id="d-student-count-box" class="col gap3" style="padding:var(--s4);background:var(--bg-violet);border-radius:var(--r-md);border:1px solid var(--border);">
        <div class="section-label">受講者が設定するアクションの数</div>
        <div class="row gap3" style="align-items:center;">
          <button type="button" class="btn btn-tertiary btn-mini" onclick="changeActionCount(-1)" style="width:40px;height:40px;flex-shrink:0;">−</button>
          <span id="d-action-count-val" class="bold num" style="font-size:28px;min-width:40px;text-align:center;">1</span>
          <button type="button" class="btn btn-tertiary btn-mini" onclick="changeActionCount(1)" style="width:40px;height:40px;flex-shrink:0;">＋</button>
          <input type="hidden" id="d-action-count" value="1">
          <span class="muted small">個のアクションを受講者が入力します</span>
        </div>
      </div>

      <div id="d-hr-actions" class="hidden col gap3" style="padding:var(--s4);background:var(--bg-violet);border-radius:var(--r-md);border:1px solid var(--border);">
        <div class="section-label">人事が設定するアクション</div>
        <div class="col gap3" id="d-hr-actions-wrap">
          <div class="field su-dist-action-row">
            <div class="field-label"><span class="lbl">アクション1<span class="tag tag-required">必須</span></span></div>
            <input class="input su-dist-action-input" placeholder="例：毎日終業前に翌日のTo-doを3件書き出す">
          </div>
        </div>
        <button type="button" class="btn btn-text" onclick="addDistActionInput()">
          <i data-lucide="plus"></i>アクションを追加する
        </button>
      </div>

      <div class="field">
        <div class="field-label"><span class="lbl">人事からのお知らせ<span class="tag tag-optional">任意</span></span></div>
        <textarea class="textarea" id="d-hr-notice" rows="4"
          placeholder="例：〇〇コンピテンシーの中からアクションを選んでください。&#10;参考資料はポータルの「研修フォロー」ページを確認してください。"></textarea>
        <div class="hint">受講者のアクション設定画面・振り返り画面、および上司のフィードバック画面の上部に表示されます。</div>
      </div>

      <div class="field">
        <div class="field-label"><span class="lbl">対象の受講者<span class="tag tag-required">必須</span></span></div>
        <div class="col gap2">${EMPLOYEE_POOL.map((e, i) => `
          <label class="panel flat" style="flex-direction:row;align-items:center;gap:var(--s4);cursor:pointer;padding:var(--s4) var(--s5);">
            <input type="checkbox" class="d-emp" value="${i}" style="width:20px;height:20px;accent-color:var(--primary);flex-shrink:0;">
            <div class="user-cell">
              <div class="ua">${esc(e.name[0])}</div>
              <div><div class="un">${esc(e.name)}</div><div class="um">${esc(e.dept)}・${esc(e.meta)}／上司：${esc(e.boss)}</div></div>
            </div>
          </label>`).join('')}
        </div>
      </div>

      <div class="row" style="justify-content:flex-end;gap:var(--s3);border-top:1px solid var(--disable);padding-top:var(--s5);margin-top:var(--s2);">
        <button class="btn btn-tertiary" onclick="hrCancelDistribute()"><i data-lucide="x"></i>キャンセル</button>
        <button class="btn btn-primary btn-lg" onclick="doDistribute()">配信して開始する<i data-lucide="send"></i></button>
      </div>
    </div>`;
  lucide.createIcons();
}

function updateActionSetterUI() {
  const setter = document.querySelector('#d-actionsetter .seg-btn.active')?.dataset.v;
  const hrBox = document.getElementById('d-hr-actions');
  const countBox = document.getElementById('d-student-count-box');
  if (hrBox) hrBox.classList.toggle('hidden', setter !== 'hr');
  if (countBox) countBox.classList.toggle('hidden', setter !== 'student');
}
function changeActionCount(delta) {
  const input = document.getElementById('d-action-count');
  const display = document.getElementById('d-action-count-val');
  if (!input || !display) return;
  const next = Math.min(5, Math.max(1, parseInt(input.value) + delta));
  input.value = next;
  display.textContent = next;
}
function addDistActionInput() {
  const wrap = document.getElementById('d-hr-actions-wrap');
  if (!wrap) return;
  const count = wrap.querySelectorAll('.su-dist-action-row').length + 1;
  const div = document.createElement('div');
  div.className = 'field su-dist-action-row';
  div.style.cssText = 'display:flex;gap:var(--s3);align-items:flex-end;';
  div.innerHTML = `<div class="field" style="flex:1;">
    <div class="field-label"><span class="lbl">アクション${count}<span class="tag tag-required">必須</span></span></div>
    <input class="input su-dist-action-input" placeholder="実践するアクション">
  </div>
  <button type="button" class="btn btn-tertiary btn-mini" onclick="this.closest('.su-dist-action-row').remove()" style="height:48px;flex-shrink:0;">
    <i data-lucide="trash-2"></i>
  </button>`;
  wrap.appendChild(div);
  lucide.createIcons();
}
function doDistribute() {
  const name = document.getElementById('d-name').value.trim();
  if (!name) return showToast('案件名を入力してください', true);
  const mode = document.querySelector('#d-mode .seg-btn.active').dataset.v;
  const cycle = document.getElementById('d-cycle').value;
  const duration = parseInt(document.getElementById('d-duration').value);
  const comment = document.querySelector('#d-comment .seg-btn.active').dataset.v;
  const actionSetter = document.querySelector('#d-actionsetter .seg-btn.active')?.dataset.v || 'student';
  const hrNotice = (document.getElementById('d-hr-notice')?.value || '').trim();
  const actionCount = actionSetter === 'student'
    ? (parseInt(document.getElementById('d-action-count')?.value) || 1) : 0;
  const emps = [...document.querySelectorAll('.d-emp:checked')].map(c => EMPLOYEE_POOL[parseInt(c.value)]);
  if (!emps.length) return showToast('対象の受講者を1名以上選択してください', true);

  // 人事設定アクションの収集
  let hrActions = [];
  if (actionSetter === 'hr') {
    document.querySelectorAll('.su-dist-action-input').forEach((inp, i) => {
      const t = inp.value.trim();
      if (t) hrActions.push({ id: i + 1, text: t, history: [] });
    });
    if (!hrActions.length) return showToast('アクションを1つ以上設定してください', true);
  }

  const fu = {
    id: 'f' + (DATA.followups.length + 1), name, trainingName: '（配信研修）', mode, cycle,
    durationMonths: duration, actionSetter, actionCount, hrNotice, bossCommentRequired: comment,
    distributedAt: new Date().toISOString().slice(0, 10), participants: [],
  };
  emps.forEach((e, i) => {
    const p = {
      id: fu.id + '-p' + i, name: e.name, dept: e.dept, meta: e.meta, boss: e.boss, bossId: e.bossId,
      setupCompleted: actionSetter === 'hr',  // 人事設定時はセットアップ不要
      actions: actionSetter === 'hr' ? hrActions.map(a => ({ ...a, history: [] })) : [],
      history: [], currentCycle: 1, cycles: { 1: cyc(false, 50, '', '') },
      vision: '', challenge: '', plans: [], currentMonth: 1, months: {},
    };
    for (let m = 1; m <= duration; m++) p.months[m] = mon(false, {}, 'keep', '', null);
    fu.participants.push(p);
  });
  DATA.followups.push(fu);
  state.hrView = null;
  state.hr = { followupId: fu.id, participantId: null };
  showToast(`「${name}」を${emps.length}名へ配信しました`);
  render();
}

/* =========================================================
   Excel プレビュー
   ========================================================= */
let excelCtx = null;
function openExcel(fuId) {
  const fu = getFu(fuId); excelCtx = fu;
  document.getElementById('modal-title').textContent = `${fu.name}.xlsx`;
  const rows = fu.participants.map((p, i) => { const m = computeMetrics(fu, p); const s = participantStatus(fu, p);
    return `<tr><td>${i + 1}</td><td class="left">${esc(p.name)}</td><td>${esc(p.dept)}</td>
      <td>${esc(s.label)}</td><td>${p.setupCompleted ? m.score : '-'}</td></tr>`; }).join('');
  document.getElementById('modal-body').innerHTML = `
    <table class="xls"><thead><tr><th></th><th>A</th><th>B</th><th>C</th><th>D</th></tr></thead>
      <tbody>
        <tr class="xls-title"><td>1</td><td colspan="4">${esc(fu.name)}</td></tr>
        <tr><td>2</td><td class="left">形式</td><td>${fu.mode === 'light' ? 'ライト伴走' : 'じっくりシート'}</td><td class="left">期間</td><td>${fu.durationMonths}ヶ月</td></tr>
        <tr class="xls-band"><td>3</td><td class="left" colspan="4">受講者別 行動変容サマリー</td></tr>
        <tr style="font-weight:700;text-align:center;"><td>No</td><td>氏名</td><td>所属</td><td>進捗</td><td>スコア</td></tr>
        ${rows}
      </tbody></table>`;
  const ov = document.getElementById('modal-overlay');
  ov.classList.remove('hidden'); setTimeout(() => ov.classList.add('show'), 20);
  lucide.createIcons();
}
function closeModal() { const ov = document.getElementById('modal-overlay'); ov.classList.remove('show'); setTimeout(() => ov.classList.add('hidden'), 250); }
function downloadExcel() { showToast(`「${excelCtx?.name || 'レポート'}.xlsx」を書き出しました`); closeModal(); }



