// ココフォリアのログ（全ログ .html / JSON .json）を読み取り、表示用HTMLに埋め込むデータを作る。
// すべてブラウザの中で処理する（どこにも送らない）。

const MSG_RE = /<p style="color:([^;"]*);?">\s*<span>\s*\[([^\]]*)\]<\/span>\s*<span>([\s\S]*?)<\/span>\s*:\s*<span>([\s\S]*?)<\/span>\s*<\/p>/g;

// 先に並べたいタブの順番（ここに無いタブは登場順で後ろに付く。other は最後）
const PREFERRED = ['main', 'サブ行動', 'HO1', 'HO2', 'HO3', 'HO4', '壁', 'info', 'レート管理'];

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
function decodeEntities(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (all, e) => {
    if (e[0] === '#') {
      const code = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : all;
    }
    const v = ENTITIES[e.toLowerCase()];
    return v === undefined ? all : v;
  });
}

function clean(s) {
  return decodeEntities(s.trim().replace(/<br\s*\/?>/gi, '\n')).trim();
}

function parseHtmlLog(src) {
  const msgs = [];
  for (const m of src.matchAll(MSG_RE)) {
    msgs.push({ n: msgs.length + 1, tab: m[2], name: clean(m[3]), color: m[1].trim(), text: clean(m[4]) });
  }
  return { msgs, images: {} };
}

function rollKind(r) {
  for (const k of ['critical', 'fumble', 'success', 'failure']) if (r[k]) return k;
  return '';
}

function parseJsonLog(src) {
  const data = JSON.parse(src);
  const images = data.images || {};
  const used = {};
  const msgs = (data.messages || []).map((m, i) => {
    const msg = {
      n: i + 1,
      tab: m.channelName || m.channel || 'main',
      name: (m.name || '').trim(),
      color: m.color || '#888888',
      text: (m.text || '').trim(),
      t: m.createdAt ?? null,
    };
    const icon = m.iconImage;
    if (icon && icon in images) { used[icon] = images[icon]; msg.icon = icon; }
    const roll = (m.extend || {}).roll;
    if (roll) msg.roll = { result: roll.result || '', kind: rollKind(roll) };
    return msg;
  });
  return { msgs, images: used };
}

function orderTabs(msgs) {
  const seen = [];
  msgs.forEach(m => { if (!seen.includes(m.tab)) seen.push(m.tab); });
  const head = PREFERRED.filter(t => seen.includes(t));
  const rest = seen.filter(t => !PREFERRED.includes(t) && t !== 'other');
  return [...head, ...rest, ...(seen.includes('other') ? ['other'] : [])];
}

// ファイル名と中身から、表示用のデータを作る
function buildData(fileName, src) {
  const isJson = /\.json$/i.test(fileName);
  const { msgs, images } = isJson ? parseJsonLog(src) : parseHtmlLog(src);
  return {
    title: fileName.replace(/\.[^.]*$/, '').replace(/_log$/, ''),
    kind: isJson ? 'json' : 'html',
    total: msgs.length,
    tabs: orderTabs(msgs),
    images,
    msgs,
  };
}

// 表示用HTMLのひな形に、ダイス処理とデータを埋め込む（置き換えは関数で行い、$ などの記号をそのまま入れる）
function makeViewer(template, diceCode, data) {
  const payload = JSON.stringify(data).replace(/<\//g, '<\\/');
  return template
    .replace('/*__DICE__*/', () => diceCode)
    .replace('/*__DATA__*/null', () => payload);
}

if (typeof module !== 'undefined') module.exports = { buildData, makeViewer };
