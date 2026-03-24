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
 *
 * 設計方針：
 *   色相だけでなく明度・彩度も意図的に変化させ、
 *   パレットごとに異なる「ムード」を提案する。
 *   同じトーンの3色が並ぶのを避け、明暗差・鮮やかさの
 *   コントラストで実用的な配色をつくる。
 */

/**
 * 1色モード：ベースカラーから4つの3色パレットを生成
 *   1. やわらかハーモニー — 隣接色＋明暗差で上品に
 *   2. 大胆アクセント — 補色の鮮やかさ＋ニュートラル
 *   3. カラフルトライアド — 120°間隔＋明暗の強弱
 *   4. シック＆モダン — スプリット補色＋深いニュートラル
 */
function generatePalettesForOneColor(hex) {
  const { h, s, l } = hexToHsl(hex);
  const palettes = [];

  // 1. やわらかハーモニー
  // 隣接色相で、一方を明るく柔らかく、もう一方を深く落ち着かせる
  {
    const c1 = {
      h: clampHue(h + 25),
      s: clamp(s * 0.55, 15, 45),
      l: clamp(l + 28, 78, 93)
    };
    const c2 = {
      h: clampHue(h - 20),
      s: clamp(s * 0.55, 12, 40),
      l: clamp(l - 30, 15, 32)
    };
    palettes.push({
      label: 'やわらかハーモニー',
      reason: '明暗差のある隣接色で上品にまとまる配色',
      colors: [hex, hslToHex(c1.h, c1.s, c1.l), hslToHex(c2.h, c2.s, c2.l)],
      suggested: [1, 2],
      colorLabels: ['入力色', 'ライト', 'ダーク']
    });
  }

  // 2. 大胆アクセント
  // 補色を鮮やかなアクセントに、入力色のごく薄いトーンで地を作る
  {
    const c1 = {
      h: clampHue(h + 180),
      s: clamp(Math.max(s, 50) * 1.05, 48, 82),
      l: clamp(l, 38, 58)
    };
    const c2 = {
      h: clampHue(h + 10),
      s: clamp(s * 0.1, 2, 10),
      l: 93
    };
    palettes.push({
      label: '大胆アクセント',
      reason: '補色の鮮やかなアクセントが目を引く配色',
      colors: [hex, hslToHex(c1.h, c1.s, c1.l), hslToHex(c2.h, c2.s, c2.l)],
      suggested: [1, 2],
      colorLabels: ['入力色', 'アクセント', 'ニュートラル']
    });
  }

  // 3. カラフルトライアド
  // 色相環3等分で、一方をやや明るめ・もう一方をやや深めにして動きをつける
  {
    const c1 = {
      h: clampHue(h + 120),
      s: clamp(s * 0.85, 30, 70),
      l: clamp(l + 12, 48, 72)
    };
    const c2 = {
      h: clampHue(h + 240),
      s: clamp(s * 0.7, 25, 60),
      l: clamp(l - 12, 28, 52)
    };
    palettes.push({
      label: 'カラフルトライアド',
      reason: '色相環を3等分し明暗差をつけた華やかな配色',
      colors: [hex, hslToHex(c1.h, c1.s, c1.l), hslToHex(c2.h, c2.s, c2.l)],
      suggested: [1, 2],
      colorLabels: ['入力色', 'トライアドA', 'トライアドB']
    });
  }

  // 4. シック＆モダン
  // スプリット補色の1色を中彩度で使い、深いニュートラルで引き締める
  {
    const c1 = {
      h: clampHue(h + 150),
      s: clamp(Math.max(s, 40) * 0.9, 35, 72),
      l: clamp(l + 5, 42, 62)
    };
    const c2 = {
      h: clampHue(h + 200),
      s: clamp(s * 0.18, 5, 15),
      l: 20
    };
    palettes.push({
      label: 'シック＆モダン',
      reason: 'スプリット補色と深いニュートラルで洗練された配色',
      colors: [hex, hslToHex(c1.h, c1.s, c1.l), hslToHex(c2.h, c2.s, c2.l)],
      suggested: [1, 2],
      colorLabels: ['入力色', 'スプリット', 'ディープ']
    });
  }

  return palettes;
}

/**
 * 2色モード：2つのベースカラーから4つの3色パレットを生成
 *   1. なめらかブリッジ — 2色を柔らかくつなぐ中間色
 *   2. ポップアクセント — 直角色相の鮮やかな差し色
 *   3. バランス補完 — 色相環の反対側で均等バランス
 *   4. 落ち着きグラウンド — 2色を引き立てるニュートラル
 */
function generatePalettesForTwoColors(hex1, hex2) {
  const hsl1 = hexToHsl(hex1);
  const hsl2 = hexToHsl(hex2);
  const hMid = hueMiddle(hsl1.h, hsl2.h);
  const sMid = (hsl1.s + hsl2.s) / 2;
  const lMid = (hsl1.l + hsl2.l) / 2;

  const palettes = [];

  // 1. なめらかブリッジ
  // 中間色相で、彩度をやや落とし明度を少し上げてなじませる
  {
    const c = {
      h: hMid,
      s: clamp(sMid * 0.7, 18, 50),
      l: clamp(lMid + 18, 60, 82)
    };
    palettes.push({
      label: 'なめらかブリッジ',
      reason: '2色の間を柔らかくつなぐ中間色',
      colors: [hex1, hex2, hslToHex(c.h, c.s, c.l)],
      suggested: [2],
      colorLabels: ['入力色1', '入力色2', 'ブリッジ']
    });
  }

  // 2. ポップアクセント
  // 中間色相から直角方向に鮮やかな色を取る
  {
    const c = {
      h: clampHue(hMid + 90),
      s: clamp(Math.max(sMid, 45) * 1.1, 45, 80),
      l: clamp(lMid, 40, 58)
    };
    palettes.push({
      label: 'ポップアクセント',
      reason: '2色に対して鮮やかなメリハリを加える差し色',
      colors: [hex1, hex2, hslToHex(c.h, c.s, c.l)],
      suggested: [2],
      colorLabels: ['入力色1', '入力色2', 'アクセント']
    });
  }

  // 3. バランス補完
  // 中間色相の反対側、やや落ち着いたトーンで均等感を出す
  {
    const c = {
      h: clampHue(hMid + 180),
      s: clamp(sMid * 0.8, 28, 65),
      l: clamp(lMid - 8, 32, 55)
    };
    palettes.push({
      label: 'バランス補完',
      reason: '色相環の反対側で3色を均等に分散させる配色',
      colors: [hex1, hex2, hslToHex(c.h, c.s, c.l)],
      suggested: [2],
      colorLabels: ['入力色1', '入力色2', '補完色']
    });
  }

  // 4. 落ち着きグラウンド
  // 入力色が暗ければ明るいニュートラル、明るければ暗いニュートラル
  {
    const goLight = lMid < 50;
    const c = {
      h: hMid,
      s: clamp(sMid * 0.12, 2, 10),
      l: goLight ? clamp(lMid + 40, 88, 95) : clamp(lMid - 35, 12, 22)
    };
    palettes.push({
      label: '落ち着きグラウンド',
      reason: '2色を引き立てる控えめな地色で全体を安定させる',
      colors: [hex1, hex2, hslToHex(c.h, c.s, c.l)],
      suggested: [2],
      colorLabels: ['入力色1', '入力色2', goLight ? 'ライトベース' : 'ダークベース']
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
// [背景のインデックス, テキストのインデックス, アクセント(ボタン)のインデックス]
const ROLE_ROTATIONS = [
  [0, 2, 1],  // 初期: 1色目=背景, 3色目=文字, 2色目=ボタン
  [2, 0, 1],
  [1, 2, 0],
];

// 円グラフの割合パターン（60-30-10の法則ベース）
const PIE_RATIOS = [60, 30, 10];

/** SVG円グラフを生成する */
function buildPieChart(colors, roles) {
  const size = 80;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 2;

  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('viewBox', '0 0 ' + size + ' ' + size);
  svg.classList.add('preview-card__pie');

  let cumulative = 0;
  const roleOrder = [roles[0], roles[2], roles[1]]; // 背景60%, アクセント30%, 文字10%

  roleOrder.forEach((colorIdx, i) => {
    const ratio = PIE_RATIOS[i] / 100;
    const startAngle = cumulative * 2 * Math.PI - Math.PI / 2;
    cumulative += ratio;
    const endAngle = cumulative * 2 * Math.PI - Math.PI / 2;

    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const largeArc = ratio > 0.5 ? 1 : 0;

    const path = document.createElementNS(ns, 'path');
    const d = [
      'M', cx, cy,
      'L', x1, y1,
      'A', r, r, 0, largeArc, 1, x2, y2,
      'Z'
    ].join(' ');
    path.setAttribute('d', d);
    path.setAttribute('fill', colors[colorIdx]);
    svg.appendChild(path);
  });

  // 外枠の円
  const circle = document.createElementNS(ns, 'circle');
  circle.setAttribute('cx', String(cx));
  circle.setAttribute('cy', String(cy));
  circle.setAttribute('r', String(r));
  circle.setAttribute('fill', 'none');
  circle.setAttribute('stroke', 'rgba(0,0,0,0.08)');
  circle.setAttribute('stroke-width', '1');
  svg.appendChild(circle);

  return svg;
}

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

  // ── ビジュアルエリア（円グラフ＋サンプル横並び） ──
  const visual = document.createElement('div');
  visual.className = 'preview-card__visual';

  // 円グラフ
  const pieWrap = document.createElement('div');
  pieWrap.className = 'preview-card__pie-wrap';
  visual.appendChild(pieWrap);

  // テキストサンプル
  const sample = document.createElement('div');
  sample.className = 'preview-card__sample';

  const heading = document.createElement('h3');
  heading.className = 'preview-card__heading';
  heading.textContent = '見出しサンプル';

  const body = document.createElement('p');
  body.className = 'preview-card__body';
  body.textContent = '本文テキストの読みやすさを確認できます。';

  const btn = document.createElement('button');
  btn.className = 'preview-card__btn';
  btn.type = 'button';
  btn.textContent = 'ボタン';

  sample.appendChild(heading);
  sample.appendChild(body);
  sample.appendChild(btn);
  visual.appendChild(sample);

  // ── ロール表示 ──
  const roleInfo = document.createElement('div');
  roleInfo.className = 'preview-card__roles';

  card.appendChild(header);
  card.appendChild(visual);
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

  // 円グラフを再描画
  const pieWrap = card.querySelector('.preview-card__pie-wrap');
  while (pieWrap.firstChild) {
    pieWrap.removeChild(pieWrap.firstChild);
  }
  pieWrap.appendChild(buildPieChart(colors, roles));

  // テキストサンプルに色を適用
  const sample = card.querySelector('.preview-card__sample');
  sample.style.backgroundColor = bgColor;

  card.querySelector('.preview-card__heading').style.color = textColor;
  card.querySelector('.preview-card__body').style.color = textColor;

  const btn = card.querySelector('.preview-card__btn');
  btn.style.backgroundColor = accentColor;
  const accentHsl = hexToHsl(accentColor);
  btn.style.color = accentHsl.l > 55 ? '#222' : '#fff';

  // ロール表示を更新
  const roleInfo = card.querySelector('.preview-card__roles');
  while (roleInfo.firstChild) {
    roleInfo.removeChild(roleInfo.firstChild);
  }

  const roleNames = ['背景 60%', '文字', 'ボタン 30%'];
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

/** スライダーの値をHEXから更新する */
function updateSlidersFromHex(slidersContainer, hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return;
  ['r', 'g', 'b'].forEach(ch => {
    const slider = slidersContainer.querySelector('[data-channel="' + ch + '"]');
    const valDisplay = slidersContainer.querySelector('[data-channel-value="' + ch + '"]');
    if (slider) slider.value = rgb[ch];
    if (valDisplay) valDisplay.textContent = rgb[ch];
  });
}

/** HEXをスライダーのRGB値から生成する */
function hexFromSliders(slidersContainer) {
  const r = parseInt(slidersContainer.querySelector('[data-channel="r"]').value);
  const g = parseInt(slidersContainer.querySelector('[data-channel="g"]').value);
  const b = parseInt(slidersContainer.querySelector('[data-channel="b"]').value);
  return rgbToHex(r, g, b);
}

function setupColorSync(pickerId, hexId, targetNum) {
  const picker = document.getElementById(pickerId);
  const hexInput = document.getElementById(hexId);
  const slidersContainer = document.querySelector('.rgb-sliders[data-target="' + targetNum + '"]');

  // ピッカー → HEX + スライダー
  picker.addEventListener('input', () => {
    hexInput.value = picker.value;
    hexInput.classList.remove('is-error');
    hideError();
    if (slidersContainer) updateSlidersFromHex(slidersContainer, picker.value);
  });

  // HEXテキスト → ピッカー + スライダー
  hexInput.addEventListener('input', () => {
    const val = hexInput.value.trim();
    if (isValidHex(val)) {
      const normalized = normalizeHex(val);
      picker.value = normalized;
      hexInput.classList.remove('is-error');
      if (slidersContainer) updateSlidersFromHex(slidersContainer, normalized);
    }
  });

  // スライダー → HEX + ピッカー
  if (slidersContainer) {
    slidersContainer.querySelectorAll('.rgb-slider').forEach(slider => {
      slider.addEventListener('input', () => {
        const ch = slider.dataset.channel;
        const valDisplay = slidersContainer.querySelector('[data-channel-value="' + ch + '"]');
        if (valDisplay) valDisplay.textContent = slider.value;
        const hex = hexFromSliders(slidersContainer);
        hexInput.value = hex;
        picker.value = hex;
        hexInput.classList.remove('is-error');
        hideError();
      });
    });
  }
}


// ────────────────────────────────────────────
// 初期化
// ────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  setupColorSync('picker1', 'hex1', '1');
  setupColorSync('picker2', 'hex2', '2');
  setupColorSync('picker3', 'hex3', '3');

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
