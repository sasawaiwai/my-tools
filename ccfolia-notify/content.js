// ココフォリア チャット通知 - content.js

let settings = {
  enabled: true,
  tabFilter: 'all',  // 'main-only' | 'main-and-chat' | 'all'
  sound: 'beep1',    // 'beep1' | 'beep2' | 'beep3' | 'chime'
  volume: 70,
  ignoreSelf: false,
  selfName: '',
};

chrome.storage.sync.get(settings, (stored) => {
  Object.assign(settings, stored);
});

chrome.storage.onChanged.addListener((changes) => {
  for (const [key, { newValue }] of Object.entries(changes)) {
    settings[key] = newValue;
  }
});

// --- Audio ---
let audioCtx = null;

function getAudioCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

// ユーザー操作後にAudioContextをresumeする
document.addEventListener('click', () => {
  if (audioCtx?.state === 'suspended') audioCtx.resume();
}, true);

function playSound() {
  try {
    const ctx = getAudioCtx();
    if (ctx.state === 'suspended') ctx.resume();

    const now = ctx.currentTime;
    const vol = settings.volume / 100;

    const schedule = (freq, start, duration, oscType = 'sine') => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = oscType;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(vol, now + start);
      gain.gain.exponentialRampToValueAtTime(0.001, now + start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + start);
      osc.stop(now + start + duration + 0.05);
    };

    switch (settings.sound) {
      case 'beep1':
        schedule(880, 0, 0.15);
        break;
      case 'beep2':
        schedule(660, 0, 0.12);
        schedule(880, 0.18, 0.12);
        break;
      case 'beep3': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.linearRampToValueAtTime(880, now + 0.25);
        gain.gain.setValueAtTime(vol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.3);
        break;
      }
      case 'chime':
        schedule(523.25, 0, 0.5, 'triangle');
        schedule(659.25, 0.12, 0.5, 'triangle');
        schedule(783.99, 0.24, 0.5, 'triangle');
        break;
    }
  } catch (e) {
    // AudioContext が使えない場合は無視
  }
}

// --- タブ識別 ---
function extractTabText(btn) {
  const badgeRoot = btn.querySelector('.MuiBadge-root');
  if (badgeRoot) {
    // div要素内のテキスト（成長・KPのメモ等）
    const div = badgeRoot.querySelector('div');
    if (div) return div.textContent.trim();
    // テキストノード直接（メイン・雑談等）
    const text = Array.from(badgeRoot.childNodes)
      .filter(n => n.nodeType === Node.TEXT_NODE)
      .map(n => n.textContent.trim())
      .filter(Boolean)
      .join('');
    if (text) return text;
  }
  return btn.textContent.replace(/\d+/g, '').trim();
}

function getActiveTabName() {
  const activeTab = document.querySelector('[role="tab"][aria-selected="true"]');
  return activeTab ? extractTabText(activeTab) : null;
}

// --- 通知するか判定 ---
function shouldNotify(msgEl) {
  if (!settings.enabled) return false;

  // 'all' の場合はタブ判定不要（マーカーパネル・シーン含む全通知）
  if (settings.tabFilter !== 'all') {
    const tabName = getActiveTabName();
    if (tabName) {
      if (settings.tabFilter === 'main-only' && tabName !== 'メイン') return false;
      if (settings.tabFilter === 'main-and-chat' && tabName !== 'メイン' && tabName !== '雑談') return false;
    }
  }

  // 自分の発言フィルター
  if (settings.ignoreSelf && settings.selfName) {
    const root = msgEl.closest('.MuiListItemText-root');
    const primary = root?.querySelector('.MuiListItemText-primary');
    if (primary?.textContent.trim().includes(settings.selfName)) return false;
  }

  return true;
}

// --- ユーザー操作検知 ---
// クリック/タップ直後はタブ切り替えやパネル開いたによるDOM変化なのでスキップする
let lastUserActionAt = 0;
const SUPPRESS_AFTER_ACTION_MS = 300;

document.addEventListener('click', () => { lastUserActionAt = Date.now(); }, true);
document.addEventListener('touchstart', () => { lastUserActionAt = Date.now(); }, true);

// --- MutationObserver ---
const knownMessages = new WeakSet();
let initialized = false;

function markExisting() {
  document.querySelectorAll('.MuiListItemText-secondary').forEach(el => {
    knownMessages.add(el);
  });
  initialized = true;
}

// チャットUIのレンダリングを待って初期化
let initTimer = setTimeout(markExisting, 3000);

const initObserver = new MutationObserver(() => {
  if (!initialized && document.querySelector('.MuiListItemText-secondary')) {
    clearTimeout(initTimer);
    setTimeout(() => {
      markExisting();
      initObserver.disconnect();
    }, 500);
  }
});
initObserver.observe(document.body, { childList: true, subtree: true });

// 短時間に複数通知が鳴らないようクールダウン
let lastNotifyTime = 0;
const NOTIFY_COOLDOWN_MS = 500;

const observer = new MutationObserver((mutations) => {
  if (!initialized) return;

  const newMsgs = [];
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (node.nodeType !== Node.ELEMENT_NODE) continue;
      const msgs = node.classList?.contains('MuiListItemText-secondary')
        ? [node]
        : Array.from(node.querySelectorAll?.('.MuiListItemText-secondary') ?? []);
      for (const msg of msgs) {
        if (!knownMessages.has(msg)) newMsgs.push(msg);
      }
    }
  }

  for (const msg of newMsgs) knownMessages.add(msg);

  if (!newMsgs.length) return;

  // ユーザーが操作した直後はスキップ（タブ切り替え・パネルを開いた等）
  if (Date.now() - lastUserActionAt < SUPPRESS_AFTER_ACTION_MS) return;

  // 通知判定
  for (const msg of newMsgs) {
    if (shouldNotify(msg)) {
      const now = Date.now();
      if (now - lastNotifyTime >= NOTIFY_COOLDOWN_MS) {
        lastNotifyTime = now;
        playSound();
      }
      break;
    }
  }
});

observer.observe(document.body, { childList: true, subtree: true });
