/* ════════════════════════════════════════════
   カラピッ！ - script.js
   構成：色変換 → パレット生成 → DOM描画 → イベント
════════════════════════════════════════════ */


// ────────────────────────────────────────────
// 色変換ユーティリティ
// ────────────────────────────────────────────

/** "#rrggbb" → { r, g, b } (各0〜255) */
function hexToRgb(hex) {
  const match = /^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!match) return null;
  return {
    r: parseInt(match[1], 16),
    g: parseInt(match[2], 16),
    b: parseInt(match[3], 16)
  };
}

/** { r, g, b } → { h, s, l } (h:0〜360, s/l:0〜100) */
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

/** { h, s, l } → { r, g, b } (h:0〜360, s/l:0〜100 → r/g/b:0〜255) */
function hslToRgb(h, s, l) {
  h /= 360; s /= 100; l /= 100;
  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255)
  };
}

/** { r, g, b } → "#rrggbb" */
function rgbToHex(r, g, b) {
  return '#' + [r, g, b]
    .map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0'))
    .join('');
}

/** ユーザー入力HEXを "#rrggbb" 形式に正規化（3桁展開対応） */
function normalizeHex(input) {
  let hex = input.trim().replace(/^#/, '');
  if (hex.length === 3) {
    hex = hex[0]+hex[0] + hex[1]+hex[1] + hex[2]+hex[2];
  }
  return '#' + hex.toLowerCase();
}

/** 入力文字列が有効なHEXカラーかを判定（3桁・6桁対応） */
function isValidHex(input) {
  const str = input.trim();
  return /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(str);
}


// ────────────────────────────────────────────
// 色調整ヘルパー
// ────────────────────────────────────────────

function clampHue(h) {
  return ((h % 360) + 360) % 360;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

/** HSL → HEX ショートカット */
function hslToHex(h, s, l) {
  const rgb = hslToRgb(h, s, l);
  return rgbToHex(rgb.r, rgb.g, rgb.b);
}

/** HEX → HSL ショートカット */
function hexToHsl(hex) {
  const rgb = hexToRgb(hex);
  return rgbToHsl(rgb.r, rgb.g, rgb.b);
}

/** 色相の短弧中点を計算（循環対応） */
function hueMiddle(h1, h2) {
  const diff = ((h2 - h1 + 540) % 360) - 180;
  return ((h1 + diff / 2) + 360) % 360;
}

/** 毒々しい色を穏やかに補正 */
function soften(h, s, l) {
  h = clampHue(h);
  if (s > 85) s = 78;
  l = clamp(l, 25, 75);
  return { h, s, l };
}


// ────────────────────────────────────────────
// パレット生成ロジック
// ────────────────────────────────────────────

/*
 * パレット構造:
 * {
 *   label: string,                        // パレット名
 *   reason: string,                       // 提案理由
 *   colors: [hex, hex, hex],              // 3色パレット
 *   suggested: number[],                  // 提案色のインデックス
 *   colorLabels: [string, string, string] // 各色のラベル
 * }
 */

/**
 * 1色モード：ベースカラーから4つの3色パレットを生成
 *   1. 類似色ハーモニー（H±30°）
 *   2. 補色ハーモニー（H+180° + ニュートラル）
 *   3. トライアド（H+120° / H+240°）
 *   4. スプリット補色（H+150° / H+210°）
 */
function generatePalettesForOneColor(hex) {
  const { h, s, l } = hexToHsl(hex);
  const palettes = [];

  // 1. 類似色ハーモニー
  {
    const c1 = soften(h + 30, s, l);
    const c2 = soften(h - 30, s, l);
    palettes.push({
      label: '類似色ハーモニー',
      reason: '隣り合う色相で統一感のある落ち着いた配色',
      colors: [hex, hslToHex(c1.h, c1.s, c1.l), hslToHex(c2.h, c2.s, c2.l)],
      suggested: [1, 2],
      colorLabels: ['入力色', '類似色A', '類似色B']
    });
  }

  // 2. 補色ハーモニー
  {
    const comp = soften(h + 180, Math.max(s, 45), l);
    const neut = { h: clampHue(h), s: clamp(s * 0.15, 0, 12), l: 92 };
    palettes.push({
      label: '補色ハーモニー',
      reason: '反対色で強いコントラストとメリハリのある配色',
      colors: [hex, hslToHex(comp.h, comp.s, comp.l), hslToHex(neut.h, neut.s, neut.l)],
      suggested: [1, 2],
      colorLabels: ['入力色', '補色', 'ニュートラル']
    });
  }

  // 3. トライアド
  {
    const c1 = soften(h + 120, s, l);
    const c2 = soften(h + 240, s, l);
    palettes.push({
      label: 'トライアド',
      reason: '色相環を3等分したバランスの良い鮮やかな配色',
      colors: [hex, hslToHex(c1.h, c1.s, c1.l), hslToHex(c2.h, c2.s, c2.l)],
      suggested: [1, 2],
      colorLabels: ['入力色', 'トライアドA', 'トライアドB']
    });
  }

  // 4. スプリット補色
  {
    const c1 = soften(h + 150, Math.max(s, 40), l);
    const c2 = soften(h + 210, Math.max(s, 40), l);
    palettes.push({
      label: 'スプリット補色',
      reason: '補色の両隣を使い強すぎないコントラストで調和',
      colors: [hex, hslToHex(c1.h, c1.s, c1.l), hslToHex(c2.h, c2.s, c2.l)],
      suggested: [1, 2],
      colorLabels: ['入力色', 'スプリットA', 'スプリットB']
    });
  }

  return palettes;
}

/**
 * 2色モード：2つのベースカラーから4つの3色パレットを生成
 *   1. 橋渡し色（2色の色相中間）
 *   2. コントラスト差し色（中間+90°）
 *   3. トライアド補完（中間+180°）
 *   4. ニュートラル補完（低彩度の中間調）
 */
function generatePalettesForTwoColors(hex1, hex2) {
  const hsl1 = hexToHsl(hex1);
  const hsl2 = hexToHsl(hex2);
  const hMid = hueMiddle(hsl1.h, hsl2.h);
  const sMid = (hsl1.s + hsl2.s) / 2;
  const lMid = (hsl1.l + hsl2.l) / 2;

  const palettes = [];

  // 1. 橋渡し色
  {
    const c = soften(hMid, sMid, lMid);
    palettes.push({
      label: '橋渡し色',
      reason: '2色の中間に位置し全体をなめらかにつなぐ色',
      colors: [hex1, hex2, hslToHex(c.h, c.s, c.l)],
      suggested: [2],
      colorLabels: ['入力色1', '入力色2', '橋渡し色']
    });
  }

  // 2. コントラスト差し色
  {
    const c = soften(hMid + 90, Math.max(sMid, 50), lMid);
    palettes.push({
      label: 'コントラスト',
      reason: '2色に対して直角の色相でメリハリを加える差し色',
      colors: [hex1, hex2, hslToHex(c.h, c.s, c.l)],
      suggested: [2],
      colorLabels: ['入力色1', '入力色2', '差し色']
    });
  }

  // 3. トライアド補完
  {
    const c = soften(hMid + 180, Math.max(sMid, 40), lMid);
    palettes.push({
      label: 'トライアド補完',
      reason: '3色が色相環上で均等に分散するバランス配色',
      colors: [hex1, hex2, hslToHex(c.h, c.s, c.l)],
      suggested: [2],
      colorLabels: ['入力色1', '入力色2', 'トライアド色']
    });
  }

  // 4. ニュートラル補完
  {
    const neut = { h: clampHue(hMid), s: clamp(sMid * 0.2, 0, 15), l: clamp(lMid, 85, 95) };
    palettes.push({
      label: 'ニュートラル',
      reason: '2色を引き立てる控えめな中間色で全体を落ち着かせる',
      colors: [hex1, hex2, hslToHex(neut.h, neut.s, neut.l)],
      suggested: [2],
      colorLabels: ['入力色1', '入力色2', 'ニュートラル']
    });
  }

  return palettes;
}


// ────────────────────────────────────────────
// DOM描画処理
// ────────────────────────────────────────────

/** 提案カード1色分を生成 */
function buildSuggestionCard(hex, label) {
  const card = document.createElement('div');
  card.className = 'suggestion-card';

  const swatch = document.createElement('div');
  swatch.className = 'suggestion-swatch';
  swatch.style.backgroundColor = hex;

  const info = document.createElement('div');
  info.className = 'suggestion-info';

  const labelEl = document.createElement('span');
  labelEl.className = 'suggestion-label';
  labelEl.textContent = label;

  const hexRow = document.createElement('div');
  hexRow.className = 'suggestion-hex-row';

  const hexSpan = document.createElement('span');
  hexSpan.className = 'suggestion-hex';
  hexSpan.textContent = hex.toUpperCase();

  const copyBtn = document.createElement('button');
  copyBtn.className = 'copy-btn';
  copyBtn.type = 'button';
  copyBtn.textContent = 'コピー';
  copyBtn.setAttribute('aria-label', hex + ' をコピー');
  copyBtn.addEventListener('click', () => copyHex(hex, copyBtn));

  hexRow.appendChild(hexSpan);
  hexRow.appendChild(copyBtn);

  info.appendChild(labelEl);
  info.appendChild(hexRow);

  card.appendChild(swatch);
  card.appendChild(info);

  return card;
}

/** 提案カード一覧をパレットごとにグループ化して描画 */
function renderSuggestions(palettes) {
  const container = document.getElementById('suggestions');
  container.innerHTML = '';

  palettes.forEach(palette => {
    const group = document.createElement('div');
    group.className = 'suggestion-group';

    // パレット名
    const groupLabel = document.createElement('div');
    groupLabel.className = 'suggestion-group__label';
    groupLabel.textContent = palette.label;
    group.appendChild(groupLabel);

    // 提案理由
    const groupReason = document.createElement('div');
    groupReason.className = 'suggestion-group__reason';
    groupReason.textContent = palette.reason;
    group.appendChild(groupReason);

    // 個別カードの行
    const cardsRow = document.createElement('div');
    cardsRow.className = 'suggestion-group__cards';

    palette.suggested.forEach(idx => {
      cardsRow.appendChild(
        buildSuggestionCard(palette.colors[idx], palette.colorLabels[idx])
      );
    });

    group.appendChild(cardsRow);
    container.appendChild(group);
  });

  document.getElementById('results-area').classList.remove('hidden');
}


// ────────────────────────────────────────────
// 配色プレビュー
// ────────────────────────────────────────────

// 回転パターン：3色をどの役割に割り当てるか
// [背景のインデックス, 文字のインデックス, アクセントのインデックス]
const ROLE_ROTATIONS = [
  [0, 1, 2],
  [2, 0, 1],
  [1, 2, 0],
];

/** プレビューカード1枚を生成 */
function buildPreviewCard(palette) {
  const card = document.createElement('div');
  card.className = 'preview-card card';
  card.dataset.rotation = '0';

  // ── ヘッダー（ラベル＋回転ボタン） ──
  const header = document.createElement('div');
  header.className = 'preview-card__header';

  const label = document.createElement('span');
  label.className = 'preview-card__label';
  label.textContent = palette.label;

  const rotateBtn = document.createElement('button');
  rotateBtn.className = 'preview-card__rotate';
  rotateBtn.type = 'button';
  rotateBtn.title = '配色の割り当てを回転';
  rotateBtn.textContent = '↻';
  rotateBtn.addEventListener('click', () => {
    const current = parseInt(card.dataset.rotation);
    const next = (current + 1) % ROLE_ROTATIONS.length;
    card.dataset.rotation = String(next);
    applyPreviewColors(card, palette.colors, palette.colorLabels, ROLE_ROTATIONS[next]);
  });

  header.appendChild(label);
  header.appendChild(rotateBtn);

  // ── パレットスウォッチ（3色横並び） ──
  const paletteRow = document.createElement('div');
  paletteRow.className = 'preview-card__palette';

  palette.colors.forEach((hex, i) => {
    const swatch = document.createElement('div');
    swatch.className = 'preview-card__swatch';
    swatch.style.backgroundColor = hex;
    swatch.title = palette.colorLabels[i] + ': ' + hex.toUpperCase();
    paletteRow.appendChild(swatch);
  });

  // ── サンプル表示エリア ──
  const sample = document.createElement('div');
  sample.className = 'preview-card__sample';

  const heading = document.createElement('h3');
  heading.className = 'preview-card__heading';
  heading.textContent = '見出しサンプル';

  const body = document.createElement('p');
  body.className = 'preview-card__body';
  body.textContent = 'これは本文のサンプルテキストです。配色の読みやすさを確認できます。';

  const btn = document.createElement('button');
  btn.className = 'preview-card__btn';
  btn.type = 'button';
  btn.textContent = 'ボタン';

  sample.appendChild(heading);
  sample.appendChild(body);
  sample.appendChild(btn);

  // ── ロール表示 ──
  const roleInfo = document.createElement('div');
  roleInfo.className = 'preview-card__roles';

  card.appendChild(header);
  card.appendChild(paletteRow);
  card.appendChild(sample);
  card.appendChild(roleInfo);

  // 初期配色を適用
  applyPreviewColors(card, palette.colors, palette.colorLabels, ROLE_ROTATIONS[0]);

  return card;
}

/** プレビューカードに配色を適用する */
function applyPreviewColors(card, colors, colorLabels, roles) {
  const [bgIdx, textIdx, accentIdx] = roles;
  const bgColor = colors[bgIdx];
  const textColor = colors[textIdx];
  const accentColor = colors[accentIdx];

  // サンプルエリアに色を適用
  const sample = card.querySelector('.preview-card__sample');
  sample.style.backgroundColor = bgColor;

  card.querySelector('.preview-card__heading').style.color = accentColor;
  card.querySelector('.preview-card__body').style.color = textColor;

  const btn = card.querySelector('.preview-card__btn');
  btn.style.backgroundColor = accentColor;
  // ボタン文字色：アクセントの明度に応じて白か黒
  const accentHsl = hexToHsl(accentColor);
  btn.style.color = accentHsl.l > 55 ? '#222' : '#fff';

  // ロール表示を更新
  const roleInfo = card.querySelector('.preview-card__roles');
  while (roleInfo.firstChild) {
    roleInfo.removeChild(roleInfo.firstChild);
  }

  const roleNames = ['背景', '文字', 'アクセント'];
  roles.forEach((colorIdx, roleIdx) => {
    const span = document.createElement('span');
    span.className = 'preview-card__role';

    const dot = document.createElement('span');
    dot.className = 'preview-card__role-dot';
    dot.style.backgroundColor = colors[colorIdx];

    span.appendChild(dot);
    span.appendChild(document.createTextNode(roleNames[roleIdx]));
    roleInfo.appendChild(span);
  });
}

/** プレビュー一覧を描画 */
function renderPreviews(palettes) {
  const container = document.getElementById('previews');
  container.innerHTML = '';

  palettes.forEach(palette => {
    container.appendChild(buildPreviewCard(palette));
  });

  document.getElementById('preview-area').classList.remove('hidden');
}


// ────────────────────────────────────────────
// コピー機能
// ────────────────────────────────────────────

/** HEXコードをクリップボードにコピー */
function copyHex(hex, btn) {
  const text = hex.toUpperCase();

  const onSuccess = () => {
    btn.textContent = 'コピー済み';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.textContent = 'コピー';
      btn.classList.remove('copied');
    }, 1600);
  };

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(onSuccess).catch(() => {
      fallbackCopy(text, onSuccess);
    });
  } else {
    fallbackCopy(text, onSuccess);
  }
}

/** クリップボードAPIが使えない環境用フォールバック */
function fallbackCopy(text, onSuccess) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none;';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
    onSuccess();
  } catch (e) {
    console.warn('コピーに失敗しました:', e);
  }
  document.body.removeChild(ta);
}


// ────────────────────────────────────────────
// メイン処理
// ────────────────────────────────────────────

/** 「配色を提案する」ボタン押下時のハンドラ */
function handleGenerate() {
  hideError();
  ['hex1', 'hex2', 'hex3'].forEach(id => {
    document.getElementById(id).classList.remove('is-error');
  });

  const mode = getCurrentMode();

  if (mode === 'one') {
    const rawHex = document.getElementById('hex1').value.trim();

    if (!isValidHex(rawHex)) {
      showError('有効なHEXカラーコードを入力してください（例：#4a90e2 または #f00）');
      document.getElementById('hex1').classList.add('is-error');
      return;
    }

    const hex = normalizeHex(rawHex);
    const palettes = generatePalettesForOneColor(hex);
    renderSuggestions(palettes);
    renderPreviews(palettes);

  } else {
    const rawHex1 = document.getElementById('hex2').value.trim();
    const rawHex2 = document.getElementById('hex3').value.trim();
    let hasError = false;

    if (!isValidHex(rawHex1)) {
      document.getElementById('hex2').classList.add('is-error');
      hasError = true;
    }
    if (!isValidHex(rawHex2)) {
      document.getElementById('hex3').classList.add('is-error');
      hasError = true;
    }
    if (hasError) {
      showError('有効なHEXカラーコードを入力してください（例：#4a90e2 または #f00）');
      return;
    }

    const hex1 = normalizeHex(rawHex1);
    const hex2 = normalizeHex(rawHex2);
    const palettes = generatePalettesForTwoColors(hex1, hex2);
    renderSuggestions(palettes);
    renderPreviews(palettes);
  }
}

function showError(msg) {
  const el = document.getElementById('error-msg');
  el.textContent = msg;
  el.classList.remove('hidden');
}

function hideError() {
  document.getElementById('error-msg').classList.add('hidden');
}

function getCurrentMode() {
  const activeTab = document.querySelector('.tab--active');
  return activeTab ? activeTab.dataset.mode : 'one';
}


// ────────────────────────────────────────────
// カラーピッカー ↔ HEXテキスト同期
// ────────────────────────────────────────────

function setupColorSync(pickerId, hexId) {
  const picker = document.getElementById(pickerId);
  const hexInput = document.getElementById(hexId);

  picker.addEventListener('input', () => {
    hexInput.value = picker.value;
    hexInput.classList.remove('is-error');
    hideError();
  });

  hexInput.addEventListener('input', () => {
    const val = hexInput.value.trim();
    if (isValidHex(val)) {
      picker.value = normalizeHex(val);
      hexInput.classList.remove('is-error');
    }
  });
}


// ────────────────────────────────────────────
// 初期化
// ────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  setupColorSync('picker1', 'hex1');
  setupColorSync('picker2', 'hex2');
  setupColorSync('picker3', 'hex3');

  // タブ切り替え
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => {
        t.classList.remove('tab--active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('tab--active');
      tab.setAttribute('aria-selected', 'true');

      const mode = tab.dataset.mode;
      document.getElementById('input-one').classList.toggle('hidden', mode !== 'one');
      document.getElementById('input-two').classList.toggle('hidden', mode !== 'two');

      hideError();
      ['hex1', 'hex2', 'hex3'].forEach(id => {
        document.getElementById(id).classList.remove('is-error');
      });

      document.getElementById('results-area').classList.add('hidden');
      document.getElementById('preview-area').classList.add('hidden');
    });
  });

  document.getElementById('generate-btn').addEventListener('click', handleGenerate);
});
