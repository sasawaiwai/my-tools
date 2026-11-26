// ===== ダイス結果（クトゥルフ神話TRPG 6版・7版の判定ロールをキャラ別に集計） =====
// サイトの画面と、ダウンロードするHTMLの両方で使う（ダウンロードするHTMLにはこのファイルの中身を埋め込む）
const RESULT_WORDS = /^(決定的成功|致命的失敗|スペシャル|イクストリーム成功|ハード成功|レギュラー成功|クリティカル|ファンブル|成功|失敗)/;

// 判定ロール1回分を読み取る。
// cmd：コマンド部分（例「CC<=88h 【科学】」）、line：結果部分（例「(1D100<=44) ボーナス・ペナルティダイス[0] ＞ 23 ＞ 成功」）
function parseRoll(cmd, line) {
  const tgt = line.match(/\(1D100<=(\d+)\)/i);
  if (!tgt) return null;                                   // 目標値のないロールは数えない
  const end = line.match(/＞\s*(\d+)\s*＞\s*([^＞]+?)\s*$/);
  if (!end || !RESULT_WORDS.test(end[2])) return null;
  const word = end[2], value = Number(end[1]), target = Number(tgt[1]);
  const v7 = /ボーナス・ペナルティダイス|レギュラー成功|ハード成功|イクストリーム成功/.test(line);
  const crit = /決定的成功|クリティカル/.test(word);
  const fumble = /致命的失敗|ファンブル/.test(word);
  const success = crit || (!fumble && /成功|スペシャル/.test(word));
  let level = '';
  if (!crit && /スペシャル/.test(word)) level = 'special';
  if (v7 && success && !crit) {
    // 7版は難易度つき（CC<=88h など）だと「成功」としか出ないので、元の技能値と出目から達成度を出す
    const diff = cmd.match(/^\s*(?:x\d+\s+)?S?CC(?:\([^)]*\))?<=(\d+)\s*[HhEe](?![A-Za-z])/i);
    const base = diff ? Number(diff[1]) : target;
    level = value <= Math.floor(base / 5) ? 'extreme' : value <= Math.floor(base / 2) ? 'hard' : 'regular';
  }
  return { value, success, crit, fumble, level, v7 };
}

// 1つの発言から判定ロールを取り出す。「x2 CC<=60」のようにまとめて振ったときは、1回ずつ数える
function rollsOf(m) {
  const all = m.roll ? `${m.text} ${m.roll.result}` : m.text; // JSONはコマンドと結果が別になっている
  const lines = all.split('\n');
  const cmd = lines[0].split(/\s*\(1D100/i)[0].replace(/\s*#\d+\s*$/, '').trim();
  const out = [];
  lines.forEach(l => {
    const i = l.search(/\(1D100<=/i);
    if (i < 0) return;
    const part = l.slice(i).trim();
    const r = parseRoll(cmd, part);
    if (r) out.push({ r, text: `[${m.tab}] ${cmd} ${part}` });
  });
  return out;
}

// 発言の一覧から、キャラ別の判定ロールを集める
function collectDice(msgs) {
  const map = new Map();
  let anyV7 = false;
  msgs.forEach(m => {
    const found = rollsOf(m);
    if (!found.length) return;
    if (found.some(x => x.r.v7)) anyV7 = true;
    const c = map.get(m.name) || { name: m.name, color: m.color, rolls: [] };
    c.rolls.push(...found);
    map.set(m.name, c);
  });
  return { chars: [...map.values()], anyV7 };
}

// キャラ1人分のコピー用テキスト
function diceBlock(c, anyV7) {
  const rs = c.rolls.map(x => x.r);
  const cnt = f => rs.filter(f).length;
  const n = rs.length, ok = cnt(r => r.success);
  const avg = rs.reduce((s, r) => s + r.value, 0) / n;
  const head = anyV7
    ? `C${cnt(r => r.crit)}F${cnt(r => r.fumble)}イクストリーム${cnt(r => r.level === 'extreme')}ハード${cnt(r => r.level === 'hard')}`
    : `C${cnt(r => r.crit)}F${cnt(r => r.fumble)}スペシャル${cnt(r => r.level === 'special')}`;
  return [c.name, head, `成功率${(ok / n * 100).toFixed(1)}%（${ok}/${n}）　平均${avg.toFixed(2)}`,
    ...c.rolls.map(x => x.text)].join('\n');
}

function copyText(text, btn) {
  const done = () => { const t = btn.textContent; btn.textContent = 'コピーしました'; setTimeout(() => { btn.textContent = t; }, 1500); };
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(done, () => fallbackCopy(text) && done());
  } else if (fallbackCopy(text)) done();
}
function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
  document.body.append(ta); ta.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
  ta.remove();
  return ok;
}
