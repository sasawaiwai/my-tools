/* ════════════════════════════════════════════
   配色補完ツール - script.js
   構成：色変換 → 候補生成 → DOM描画 → イベント
════════════════════════════════════════════ */


// ────────────────────────────────────────────
// 色変換ユーティリティ
// ────────────────────────────────────────────

/**
 * "#rrggbb" → { r, g, b } (各0〜255)
 * @param {string} hex
 * @returns {{ r: number, g: number, b: number } | null}
 */
function hexToRgb(hex) {
  const match = /^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!match) return null;
  return {
    r: parseInt(match[1], 16),
    g: parseInt(match[2], 16),
    b: parseInt(match[3], 16)
  };
}

/**
 * { r, g, b } → { h, s, l } (h:0〜360, s/l:0〜100)
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @returns {{ h: number, s: number, l: number }}
 */
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

/**
 * { h, s, l } → { r, g, b } (h:0〜360, s/l:0〜100 → r/g/b:0〜255)
 * @param {number} h
 * @param {number} s
 * @param {number} l
 * @returns {{ r: number, g: number, b: number }}
 */
function hslToRgb(h, s, l) {
  h /= 360; s /= 100; l /= 100;
  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    /**
     * HUEコンポーネント計算ヘルパー
     * @param {number} p
     * @param {number} q
     * @param {number} t
     * @returns {number}
     */
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

/**
 * { r, g, b } → "#rrggbb"
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @returns {string}
 */
function rgbToHex(r, g, b) {
  return '#' + [r, g, b]
    .map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0'))
    .join('');
}

/**
 * ユーザー入力HEXを "#rrggbb" 形式に正規化
 * 3桁形式（#abc）も6桁（#aabbcc）に展開する
 * @param {string} input
 * @returns {string}
 */
function normalizeHex(input) {
  let hex = input.trim().replace(/^#/, '');
  if (hex.length === 3) {
    hex = hex[0]+hex[0] + hex[1]+hex[1] + hex[2]+hex[2];
  }
  return '#' + hex.toLowerCase();
}

/**
 * 入力文字列が有効なHEXカラーかを判定する（3桁・6桁対応）
 * @param {string} input
 * @returns {boolean}
 */
function isValidHex(input) {
  const str = input.trim();
  return /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(str);
}


// ────────────────────────────────────────────
// 色候補生成ロジック
// ────────────────────────────────────────────

/**
 * ロール（用途）に応じてHSLを補正する
 *   'background' : 彩度を落とし、明度を高く（背景向き淡色）
 *   'text'       : 彩度を落とし、明度を低く（読みやすい文字色）
 *   'accent'     : 毒々しい高彩度を抑え、白飛び・黒潰れを防ぐ
 *   'bridge'     : 2色の橋渡し。彩度・明度を中程度に均す
 *   'neutral'    : ニュートラルな中間調（汎用補正）
 *
 * @param {number} h 色相 0〜360
 * @param {number} s 彩度 0〜100
 * @param {number} l 明度 0〜100
 * @param {'background'|'text'|'accent'|'bridge'|'neutral'} role
 * @returns {{ h: number, s: number, l: number }}
 */
function adjustSuggestionColor(h, s, l, role) {
  // 色相を 0〜360 に正規化
  h = ((h % 360) + 360) % 360;

  switch (role) {
    case 'background':
      s = Math.min(s, 22);       // 彩度を落として穏やかに
      l = Math.max(l, 90);       // 明度を高く（白に近い背景）
      break;

    case 'text':
      s = Math.min(s, 18);       // 彩度を落として落ち着いた色に
      l = Math.min(l, 22);       // 明度を低く（暗い文字色）
      break;

    case 'accent':
      if (s > 80) s = 72;        // 毒々しい彩度を穏やかに
      l = Math.max(35, Math.min(l, 68)); // 白飛び・黒潰れを防ぐ
      break;

    case 'bridge':
      if (s > 70) s = 60;        // やや落ち着かせる
      l = Math.max(38, Math.min(l, 62)); // 中程度の明度に
      break;

    case 'neutral':
      s = Math.min(s, 15);       // 低彩度
      l = Math.max(40, Math.min(l, 62));
      break;
  }

  return { h, s, l };
}

/**
 * 1色モード：ベースカラーから補完色候補を4件生成する
 *   1. 類似色アクセント（H+30°）
 *   2. 分割補色アクセント（H+150°）
 *   3. 文字向き中立色（同系統の暗色）
 *   4. 背景向き淡色（同系統の明色）
 *
 * @param {string} hex "#rrggbb" 形式
 * @returns {Array<{hex: string, label: string, reason: string, role: string}>}
 */
function generateSuggestionsForOneColor(hex) {
  const rgb = hexToRgb(hex);
  const { h, s, l } = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const suggestions = [];

  // 1. 類似色アクセント（H+30°）
  {
    const adj = adjustSuggestionColor(h + 30, s, l, 'accent');
    const c = hslToRgb(adj.h, adj.s, adj.l);
    suggestions.push({
      hex: rgbToHex(c.r, c.g, c.b),
      label: '差し色向き',
      reason: '類似色で統一感を保ちながら変化を加えます',
      role: 'accent'
    });
  }

  // 2. 分割補色アクセント（H+150°）
  {
    const accentS = Math.max(s, 52); // 入力色が低彩度でもアクセントとして成立する彩度に
    const adj = adjustSuggestionColor(h + 150, accentS, l, 'accent');
    const c = hslToRgb(adj.h, adj.s, adj.l);
    suggestions.push({
      hex: rgbToHex(c.r, c.g, c.b),
      label: 'アクセント向き',
      reason: '分割補色でメリハリと目を引くアクセントになります',
      role: 'accent2'
    });
  }

  // 3. 文字向き中立色（低彩度・低明度）
  {
    const adj = adjustSuggestionColor(h, Math.min(s, 28), l, 'text');
    const c = hslToRgb(adj.h, adj.s, adj.l);
    suggestions.push({
      hex: rgbToHex(c.r, c.g, c.b),
      label: '文字向き',
      reason: '彩度を落とした暗色で読みやすい文字色になります',
      role: 'text'
    });
  }

  // 4. 背景向き淡色（低彩度・高明度）
  {
    const adj = adjustSuggestionColor(h, s * 0.35, l, 'background');
    const c = hslToRgb(adj.h, adj.s, adj.l);
    suggestions.push({
      hex: rgbToHex(c.r, c.g, c.b),
      label: '背景向き',
      reason: '同系統の淡色で品のある背景色になります',
      role: 'background'
    });
  }

  return suggestions;
}

/**
 * 色相の「短い弧」の中点を計算する（循環対応）
 * 例：10° と 350° の中点は 0°（360° ではなく短い方の弧）
 * @param {number} h1
 * @param {number} h2
 * @returns {number} 0〜360
 */
function hueMiddle(h1, h2) {
  // h2 - h1 を -180〜180 に収める（短い弧の方向を選ぶ）
  const diff = ((h2 - h1 + 540) % 360) - 180;
  return ((h1 + diff / 2) + 360) % 360;
}

/**
 * 2色モード：2つのベースカラーから補完色候補を4件生成する
 *   1. 橋渡し色（2色の色相・彩度・明度の中間）
 *   2. 差し色（橋渡しH+90°でコントラスト）
 *   3. 背景向き中立色
 *   4. 文字向き中立色
 *
 * @param {string} hex1
 * @param {string} hex2
 * @returns {Array<{hex: string, label: string, reason: string, role: string}>}
 */
function generateSuggestionsForTwoColors(hex1, hex2) {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);
  const hsl1 = rgbToHsl(rgb1.r, rgb1.g, rgb1.b);
  const hsl2 = rgbToHsl(rgb2.r, rgb2.g, rgb2.b);

  // 2色の中間値
  const hMid = hueMiddle(hsl1.h, hsl2.h);
  const sMid = (hsl1.s + hsl2.s) / 2;
  const lMid = (hsl1.l + hsl2.l) / 2;

  const suggestions = [];

  // 1. 橋渡し色（2色の中間）
  {
    const adj = adjustSuggestionColor(hMid, sMid, lMid, 'bridge');
    const c = hslToRgb(adj.h, adj.s, adj.l);
    suggestions.push({
      hex: rgbToHex(c.r, c.g, c.b),
      label: 'まとめ色向き',
      reason: '2色の間に挟んでグラデーション感とまとまりを出します',
      role: 'bridge'
    });
  }

  // 2. 差し色（橋渡しH+90°でコントラスト）
  {
    const accentS = Math.max(sMid, 52);
    const adj = adjustSuggestionColor(hMid + 90, accentS, lMid, 'accent');
    const c = hslToRgb(adj.h, adj.s, adj.l);
    suggestions.push({
      hex: rgbToHex(c.r, c.g, c.b),
      label: '差し色向き',
      reason: '2色に対してコントラストを与える強調色になります',
      role: 'accent'
    });
  }

  // 3. 背景向き中立色（2色の雰囲気を損なわない淡色）
  {
    const adj = adjustSuggestionColor(hMid, sMid * 0.28, lMid, 'background');
    const c = hslToRgb(adj.h, adj.s, adj.l);
    suggestions.push({
      hex: rgbToHex(c.r, c.g, c.b),
      label: '背景向き',
      reason: '2色の雰囲気を損なわない柔らかい背景色です',
      role: 'background'
    });
  }

  // 4. 文字向き中立色（2色を引き立てる暗色）
  {
    const adj = adjustSuggestionColor(hMid, sMid * 0.22, lMid, 'text');
    const c = hslToRgb(adj.h, adj.s, adj.l);
    suggestions.push({
      hex: rgbToHex(c.r, c.g, c.b),
      label: '文字向き',
      reason: '2色を引き立てる落ち着いた文字色になります',
      role: 'text'
    });
  }

  return suggestions;
}


// ────────────────────────────────────────────
// DOM描画処理
// ────────────────────────────────────────────

/**
 * 提案1件分のカードDOM要素を生成して返す
 * @param {{ hex: string, label: string, reason: string, role: string }} suggestion
 * @returns {HTMLElement}
 */
function buildSuggestionCard(suggestion) {
  const card = document.createElement('div');
  card.className = 'suggestion-card';

  // スウォッチ（色見本）
  const swatch = document.createElement('div');
  swatch.className = 'suggestion-swatch';
  swatch.style.backgroundColor = suggestion.hex;
  swatch.setAttribute('aria-label', suggestion.hex + ' の色見本');

  // カード情報エリア
  const info = document.createElement('div');
  info.className = 'suggestion-info';

  // 用途ラベル
  const label = document.createElement('span');
  label.className = 'suggestion-label';
  label.textContent = suggestion.label;

  // 提案理由
  const reason = document.createElement('p');
  reason.className = 'suggestion-reason';
  reason.textContent = suggestion.reason;

  // HEXコード + コピーボタン行
  const hexRow = document.createElement('div');
  hexRow.className = 'suggestion-hex-row';

  const hexSpan = document.createElement('span');
  hexSpan.className = 'suggestion-hex';
  hexSpan.textContent = suggestion.hex.toUpperCase();

  const copyBtn = document.createElement('button');
  copyBtn.className = 'copy-btn';
  copyBtn.type = 'button';
  copyBtn.textContent = 'コピー';
  copyBtn.setAttribute('aria-label', suggestion.hex + ' をコピー');
  copyBtn.addEventListener('click', () => copyHex(suggestion.hex, copyBtn));

  hexRow.appendChild(hexSpan);
  hexRow.appendChild(copyBtn);

  info.appendChild(label);
  info.appendChild(reason);
  info.appendChild(hexRow);

  card.appendChild(swatch);
  card.appendChild(info);

  return card;
}

/**
 * 提案カード一覧を結果エリアに描画する
 * @param {Array} suggestions
 */
function renderSuggestions(suggestions) {
  const container = document.getElementById('suggestions');
  container.innerHTML = '';
  suggestions.forEach(s => {
    container.appendChild(buildSuggestionCard(s));
  });
  document.getElementById('results-area').classList.remove('hidden');
}

/**
 * プレビューエリアの色を更新する
 * ロール別に提案色を割り当て、残りは入力色で補完する
 *
 * @param {string[]} inputHexes 入力色（1〜2色）
 * @param {Array<{hex, role}>} suggestions
 */
function updatePreview(inputHexes, suggestions) {
  // ロール別に提案色を取り出す
  const bgSuggestion     = suggestions.find(s => s.role === 'background');
  const textSuggestion   = suggestions.find(s => s.role === 'text');
  const accentSuggestion = suggestions.find(
    s => s.role === 'accent' || s.role === 'accent2' || s.role === 'bridge'
  );

  // 各部位への色割り当て（フォールバック付き）
  const bgColor      = bgSuggestion     ? bgSuggestion.hex     : '#f5f6f8';
  const headingColor = inputHexes[0];                           // 入力色1 = 見出し
  const bodyColor    = textSuggestion   ? textSuggestion.hex   : '#2c2c2c';
  const btnColor     = accentSuggestion ? accentSuggestion.hex : inputHexes[inputHexes.length - 1];

  // プレビューへ適用
  const inner = document.getElementById('preview-inner');
  inner.style.backgroundColor = bgColor;

  document.getElementById('preview-heading').style.color = headingColor;
  document.getElementById('preview-body').style.color    = bodyColor;
  document.getElementById('preview-button').style.backgroundColor = btnColor;

  // プレビューエリアを表示
  document.getElementById('preview-area').classList.remove('hidden');
}


// ────────────────────────────────────────────
// コピー機能
// ────────────────────────────────────────────

/**
 * HEXコードをクリップボードにコピーし、ボタン表示を一時的に変更する
 * navigator.clipboard が使えない場合は execCommand でフォールバック
 * @param {string} hex
 * @param {HTMLButtonElement} btn
 */
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
    // モダンブラウザ：Clipboard API
    navigator.clipboard.writeText(text).then(onSuccess).catch(() => {
      fallbackCopy(text, onSuccess);
    });
  } else {
    // フォールバック：textarea + execCommand
    fallbackCopy(text, onSuccess);
  }
}

/**
 * クリップボードAPIが使えない環境用のコピーフォールバック
 * @param {string} text
 * @param {Function} onSuccess
 */
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
// 提案ハンドラ（ボタン押下時のメイン処理）
// ────────────────────────────────────────────

/**
 * 「配色を提案する」ボタンが押されたときの処理
 * バリデーション → 候補生成 → 描画 の順で実行する
 */
function handleGenerate() {
  // エラー表示・入力ハイライトをリセット
  hideError();
  ['hex1', 'hex2', 'hex3'].forEach(id => {
    document.getElementById(id).classList.remove('is-error');
  });

  const mode = getCurrentMode();

  if (mode === 'one') {
    // ── 1色モード ──
    const rawHex = document.getElementById('hex1').value.trim();

    if (!isValidHex(rawHex)) {
      showError('有効なHEXカラーコードを入力してください（例：#4a90e2 または #f00）');
      document.getElementById('hex1').classList.add('is-error');
      return;
    }

    const hex = normalizeHex(rawHex);
    const suggestions = generateSuggestionsForOneColor(hex);
    renderSuggestions(suggestions);
    updatePreview([hex], suggestions);

  } else {
    // ── 2色モード ──
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
    const suggestions = generateSuggestionsForTwoColors(hex1, hex2);
    renderSuggestions(suggestions);
    updatePreview([hex1, hex2], suggestions);
  }
}

/** エラーメッセージを表示する */
function showError(msg) {
  const el = document.getElementById('error-msg');
  el.textContent = msg;
  el.classList.remove('hidden');
}

/** エラーメッセージを非表示にする */
function hideError() {
  document.getElementById('error-msg').classList.add('hidden');
}

/** 現在アクティブなモードを返す ('one' | 'two') */
function getCurrentMode() {
  const activeTab = document.querySelector('.tab--active');
  return activeTab ? activeTab.dataset.mode : 'one';
}


// ────────────────────────────────────────────
// カラーピッカー ↔ HEXテキスト 双方向同期
// ────────────────────────────────────────────

/**
 * カラーピッカーとHEXテキスト入力を双方向に同期させる
 * @param {string} pickerId input[type=color] の id
 * @param {string} hexId    input[type=text]  の id
 */
function setupColorSync(pickerId, hexId) {
  const picker   = document.getElementById(pickerId);
  const hexInput = document.getElementById(hexId);

  // ピッカー変更 → テキスト更新
  picker.addEventListener('input', () => {
    hexInput.value = picker.value; // ピッカーは常に "#rrggbb" を返す
    hexInput.classList.remove('is-error');
    hideError();
  });

  // テキスト変更 → ピッカー更新（有効なHEXの場合のみ）
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

  // カラーピッカー ↔ テキスト入力の同期を設定
  setupColorSync('picker1', 'hex1');
  setupColorSync('picker2', 'hex2');
  setupColorSync('picker3', 'hex3');

  // タブ切り替え処理
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      // アクティブタブを切り替え
      document.querySelectorAll('.tab').forEach(t => {
        t.classList.remove('tab--active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('tab--active');
      tab.setAttribute('aria-selected', 'true');

      // 入力エリアを切り替え
      const mode = tab.dataset.mode;
      document.getElementById('input-one').classList.toggle('hidden', mode !== 'one');
      document.getElementById('input-two').classList.toggle('hidden', mode !== 'two');

      // エラーとハイライトをリセット
      hideError();
      ['hex1', 'hex2', 'hex3'].forEach(id => {
        document.getElementById(id).classList.remove('is-error');
      });

      // 結果・プレビューを非表示に（モード切替で前の結果をリセット）
      document.getElementById('results-area').classList.add('hidden');
      document.getElementById('preview-area').classList.add('hidden');
    });
  });

  // 生成ボタン
  document.getElementById('generate-btn').addEventListener('click', handleGenerate);
});
