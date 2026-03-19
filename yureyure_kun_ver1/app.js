let tokenizer = null;
let lastAnalysis = null; // 解析結果を保存（クリック時に参照）
let lastSelectedEl = null; // 直前に選択したハイライト要素

// 出現箇所スニペットの前後文字数
const CONTEXT_CHARS = 25;

/**
 * kuromoji の形態素解析エンジンを初期化（CDNフォールバック付き）
 */
function initTokenizer() {
    const statusEl = document.getElementById('status');
    const button = document.getElementById('analyze-btn');

    const cdnList = [
        './dict/',
        'https://cdn.jsdelivr.net/npm/kuromoji@0.1.2/dict/',
        'https://unpkg.com/kuromoji@0.1.2/dict/',
    ];
    let currentIndex = 0;

    function tryLoad() {
        if (currentIndex >= cdnList.length) {
            statusEl.textContent = '形態素解析エンジンがうまく読み込めませんでした。時間をおいて再読み込みしてください。';
            statusEl.className = 'error';
            return;
        }

        const dicPath = cdnList[currentIndex];
        statusEl.textContent = '形態素解析エンジンを読み込み中...';

        let done = false;
        const timer = setTimeout(() => {
            if (done) return;
            done = true;
            currentIndex++;
            tryLoad();
        }, 15000);

        kuromoji.builder({ dicPath })
            .build((err, built) => {
                if (done) return;
                done = true;
                clearTimeout(timer);

                if (err) {
                    currentIndex++;
                    tryLoad();
                    return;
                }

                tokenizer = built;
                button.disabled = false;
                statusEl.textContent = '準備完了(解析可能)';
                statusEl.className = 'ready';
            });
    }

    tryLoad();
}

// ========================================
// 和語数詞の辞書定義
// ========================================

/**
 * 和語数詞グループ定義
 * 各グループは同じ意味を持つ様々な表記をまとめています
 */
const WAGO_NUMBER_GROUPS = [
    { id: 1, variants: ['一つ', 'ひとつ', '1つ', '１つ'] },
    { id: 2, variants: ['二つ', 'ふたつ', '2つ', '２つ'] },
    { id: 3, variants: ['三つ', 'みっつ', '3つ', '３つ'] },
    { id: 4, variants: ['四つ', 'よっつ', '4つ', '４つ'] },
    { id: 5, variants: ['五つ', 'いつつ', '5つ', '５つ'] },
    { id: 6, variants: ['六つ', 'むっつ', '6つ', '６つ'] },
    { id: 7, variants: ['七つ', 'ななつ', '7つ', '７つ'] },
    { id: 8, variants: ['八つ', 'やっつ', '8つ', '８つ'] },
    { id: 9, variants: ['九つ', 'ここのつ', '9つ', '９つ'] },
    { id: 10, variants: ['十', 'とお', '10', '１０'] }
];

/**
 * 表層形 → グループID への逆引き辞書
 * 例: WAGO_SURFACE_TO_GROUP_ID['一つ'] => 1
 *     WAGO_SURFACE_TO_GROUP_ID['ひとつ'] => 1
 */
const WAGO_SURFACE_TO_GROUP_ID = {};
for (const group of WAGO_NUMBER_GROUPS) {
    for (const variant of group.variants) {
        WAGO_SURFACE_TO_GROUP_ID[variant] = group.id;
    }
}

/**
 * 全角英数字を半角に正規化（括弧・記号は変換しない）
 * 例: 'ＫＰ' → 'KP'、'１２３' → '123'
 * 対象: ０-９(FF10-FF19)、Ａ-Ｚ(FF21-FF3A)、ａ-ｚ(FF41-FF5A)
 */
function normalizeFullWidth(str) {
    return str.replace(/[\uFF10-\uFF19\uFF21-\uFF3A\uFF41-\uFF5A]/g, ch =>
        String.fromCharCode(ch.charCodeAt(0) - 0xFEE0)
    );
}

/**
 * カタカナをひらがなに変換
 * 例: 'オクリガナ' → 'おくりがな'
 */
function katakanaToHiragana(str) {
    return str.replace(/[\u30A1-\u30F6]/g, (ch) =>
        String.fromCharCode(ch.charCodeAt(0) - 0x60)
    );
}

/**
 * 送り仮名の揺れを検出する補助関数
 * 送り仮名が異なるだけで同じ漢字部分を持つ表記を検出
 */
function extractKanjiCore(surface) {
    const match = surface.match(/^([\u4E00-\u9FFF\u3400-\u4DBF]+)/);
    return match ? match[1] : null;
}

/**
 * メイン解析関数
 * テキストから表記揺れ候補を抽出
 */
function analyzeText(text) {
    if (!tokenizer) return { candidates: [], groupCount: 0, tokens: [], highlightKeys: [] };

    // ========================================
    // 【1】解析直後に「正規化済みトークン配列」を作る
    // ========================================
    const rawTokens = tokenizer.tokenize(text);
    const normTokens = [];

    for (let i = 0; i < rawTokens.length; i++) {
        const t = rawTokens[i];
        const next = rawTokens[i + 1];

        // 「数字」＋「つ」を一塊の擬似トークンとして扱う
        if (
            next &&
            /^[0-9０-９]+$/.test(t.surface_form || '') &&
            (next.surface_form === 'つ')
        ) {
            const pseudoSurface = (t.surface_form || '') + (next.surface_form || '');

            // 和語数詞辞書にある形だけ特別扱いする
            if (WAGO_SURFACE_TO_GROUP_ID[pseudoSurface]) {
                const pseudoToken = {
                    // 元トークンをベースにしておけば、品詞や位置情報は概ね維持できる
                    ...t,
                    surface_form: pseudoSurface,
                    basic_form: pseudoSurface,
                    reading: t.reading || pseudoSurface,
                    // word_position は t のものをそのまま使う（開始位置は同じでよい）
                };
                normTokens.push(pseudoToken);
                // 「つ」のトークンは消費済みとしてスキップ
                i++;
                continue;
            }
        }

        // それ以外はそのまま
        normTokens.push(t);
    }

    // ========================================
    // 【2】グルーピング処理は必ず normTokens を使う
    // ========================================

    /**
     * 通常のグルーピング（読み＋品詞）
     * groupMap: { "読み\t品詞" => { surfaceMap: { "表層形" => count }, ... } }
     */
    const groupMap = new Map();

    /**
     * 否定形のグルーピング（語幹＋「ない」）
     * negGroupMap: { "基本形\t品詞" => { surfaceMap: { "表層形" => count }, ... } }
     */
    const negGroupMap = new Map();

    for (const token of normTokens) {
        const surface = token.surface_form || '';
        const pos = token.pos || '不明';
        const reading = token.reading || token.surface_form || token.basic_form;
        const basicForm = token.basic_form || surface;

        // ========================================
        // 通常のグルーピング処理
        // ========================================

        // 和語数詞の特例処理
        const wagoGroupId = WAGO_SURFACE_TO_GROUP_ID[surface];
        let normalizedReading;
        let key;
        if (wagoGroupId) {
            // 和語数詞の場合：辞書IDベースのキーを使う（POSを固定してASCII/全角を同グループに統合）
            normalizedReading = '__WAGO__' + wagoGroupId;
            key = normalizedReading + '\t和語数詞';
        } else {
            // 通常の場合：カタカナ→ひらがな変換した読みをキーに使用
            normalizedReading = katakanaToHiragana(reading);
            key = `${normalizedReading}\t${pos}`;
        }

        if (!groupMap.has(key)) {
            groupMap.set(key, {
                surfaceMap: new Map(),
                normalizedReading,
                pos,
                totalCount: 0,
                // 和語数詞かどうかのフラグ
                hasWago: !!wagoGroupId,
                // 送り仮名の揺れ検出用：漢字コア
                kanjiCores: new Set()
            });
        }

        const group = groupMap.get(key);
        const currentCount = group.surfaceMap.get(surface) || 0;
        group.surfaceMap.set(surface, currentCount + 1);
        group.totalCount += 1;

        // 送り仮名の揺れを検出するため、漢字部分を記録
        const kanjiCore = extractKanjiCore(surface);
        if (kanjiCore) {
            group.kanjiCores.add(kanjiCore);
        }

        // ========================================
        // 否定形のグルーピング処理
        // ========================================
        if (pos === '動詞' && surface.endsWith('ない')) {
            const stem = surface.slice(0, -2);
            if (stem.length > 0) {
                const negKey = `${basicForm}\t${pos}_neg`;

                if (!negGroupMap.has(negKey)) {
                    negGroupMap.set(negKey, {
                        surfaceMap: new Map(),
                        basicForm,
                        pos,
                        totalCount: 0
                    });
                }

                const negGroup = negGroupMap.get(negKey);
                const negCurrentCount = negGroup.surfaceMap.get(surface) || 0;
                negGroup.surfaceMap.set(surface, negCurrentCount + 1);
                negGroup.totalCount += 1;
            }
        }
    }

    // ========================================
    // 候補を収集
    // ========================================
    const candidates = [];

    // 通常のグループを処理
    for (const [key, group] of groupMap.entries()) {
        const { surfaceMap, normalizedReading, pos, totalCount, hasWago, kanjiCores } = group;

        // 和語数詞グループは緩いフィルタ（ほぼ無条件で残す）
        if (hasWago) {
            // 和語数詞の場合、どんなに少なくても候補として残す（POSを和語数詞に固定）
            for (const [surface, count] of surfaceMap.entries()) {
                candidates.push({
                    basicForm: surface,
                    surface,
                    count,
                    pos: '和語数詞',
                    _sortKey: normalizedReading,
                    groupType: 'strict',
                    variationType: 'wagoNumber'
                });
            }
            continue;
        }

        // 和語数詞以外は「異なる表記が2種類以上ある場合のみ」候補とする
        // （出現回数は 1 回ずつでもよい）
        if (surfaceMap.size < 2) {
            continue;
        }

        // 送り仮名の揺れかどうかを判定
        const isOkuriganaVariation = (kanjiCores.size === 1 && surfaceMap.size >= 2);

        for (const [surface, count] of surfaceMap.entries()) {
            candidates.push({
                basicForm: surface,
                surface,
                count,
                pos,
                _sortKey: normalizedReading,
                groupType: 'strict',
                variationType: isOkuriganaVariation ? 'okurigana' : 'default'
            });
        }
    }

    // 否定形のグループを処理
    for (const [key, negGroup] of negGroupMap.entries()) {
        const { surfaceMap, basicForm, pos, totalCount } = negGroup;

        // 否定形も「異なる表記が2種類以上ある場合のみ」候補とする
        if (surfaceMap.size < 2) {
            continue;
        }

        for (const [surface, count] of surfaceMap.entries()) {
            candidates.push({
                basicForm,
                surface,
                count,
                pos,
                _sortKey: basicForm,
                groupType: 'neg',
                variationType: 'default'
            });
        }
    }

    // ソート
    candidates.sort((a, b) => {
        if (a._sortKey !== b._sortKey) return a._sortKey.localeCompare(b._sortKey);
        if (a.pos !== b.pos) return a.pos.localeCompare(b.pos);
        return b.count - a.count;
    });

    const groupSet = new Set();
    for (const c of candidates) {
        groupSet.add(`${c._sortKey}\t${c.pos}`);
    }

    return {
        candidates,
        groupCount: groupSet.size,
        // ハイライト用に、正規化済みトークン列と「揺れグループのキー一覧」を返す
        tokens: normTokens,
        highlightKeys: Array.from(groupSet)
    };
}

// ========================================
// 全角・半角英数字の揺れ検出（正規表現ベース）
// ========================================

/**
 * テキスト中の半角英数字と全角英数字が混在している候補を抽出
 * 例: 'KP' と 'ＫＰ'、'a' と 'ａ'、'1' と '１'
 * kuromojiを使わず正規表現で直接スキャンするため確実に検出できる
 */
function detectFullWidthVariations(text) {
    const allMatches = [];
    let m;

    // 半角英数字シーケンスを抽出
    const halfReg = /[A-Za-z0-9]+/g;
    while ((m = halfReg.exec(text)) !== null) {
        allMatches.push({
            normalized: m[0],
            width: 'half',
            start: m.index,
            end: m.index + m[0].length,
            original: m[0]
        });
    }

    // 全角英数字シーケンスを抽出し、半角に正規化して比較
    const fullReg = /[Ａ-Ｚａ-ｚ０-９]+/g;
    while ((m = fullReg.exec(text)) !== null) {
        const normalized = normalizeFullWidth(m[0]);
        allMatches.push({
            normalized,
            width: 'full',
            start: m.index,
            end: m.index + m[0].length,
            original: m[0]
        });
    }

    // 正規化後の内容でグルーピング
    const groupMap = new Map();
    for (const match of allMatches) {
        const mapKey = match.normalized;
        if (!groupMap.has(mapKey)) {
            groupMap.set(mapKey, { halfMatches: [], fullMatches: [] });
        }
        const group = groupMap.get(mapKey);
        if (match.width === 'half') group.halfMatches.push(match);
        else group.fullMatches.push(match);
    }

    const candidates = [];
    const fwhwPositions = [];

    for (const [normalized, group] of groupMap.entries()) {
        // 半角・全角の両方が存在する場合のみ候補とする
        if (group.halfMatches.length === 0 || group.fullMatches.length === 0) continue;

        const sortKey = '__FWHW__\t' + normalized;
        const pos = '英数字';
        const groupKey = sortKey + '\t' + pos;

        // 表記ごとに出現回数を集計
        const halfSurfaces = new Map();
        for (const match of group.halfMatches) halfSurfaces.set(match.original, (halfSurfaces.get(match.original) || 0) + 1);
        const fullSurfaces = new Map();
        for (const match of group.fullMatches) fullSurfaces.set(match.original, (fullSurfaces.get(match.original) || 0) + 1);

        for (const [surface, count] of halfSurfaces) {
            candidates.push({ basicForm: normalized, surface, count, pos, _sortKey: sortKey, groupType: 'fwhw', variationType: 'fwhw' });
        }
        for (const [surface, count] of fullSurfaces) {
            candidates.push({ basicForm: normalized, surface, count, pos, _sortKey: sortKey, groupType: 'fwhw', variationType: 'fwhw' });
        }

        // ハイライト用の位置情報を構築
        const allGroupMatches = [...group.halfMatches, ...group.fullMatches].sort((a, b) => a.start - b.start);
        for (let i = 0; i < allGroupMatches.length; i++) {
            const match = allGroupMatches[i];
            const prefixStart = Math.max(0, match.start - CONTEXT_CHARS);
            const suffixEnd = Math.min(text.length, match.end + CONTEXT_CHARS);
            const lineNumber = text.substring(0, match.start).split('\n').length;
            fwhwPositions.push({
                start: match.start,
                end: match.end,
                key: groupKey,
                id: 'occ-' + encodeGroupKey(groupKey) + '-' + i,
                lineNumber,
                snippet: {
                    prefix: text.slice(prefixStart, match.start),
                    hit: text.slice(match.start, match.end),
                    suffix: text.slice(match.end, suffixEnd)
                },
                prefixIsStart: prefixStart === 0,
                suffixIsEnd: suffixEnd === text.length
            });
        }
    }

    return { candidates, fwhwPositions };
}

// ========================================
// ブラケット全角半角揺れ検出
// ========================================

/**
 * 全角・半角ブラケットの表記揺れを検出
 * 例: ｛PC1｝と{PC1}が混在している場合に候補として返す
 */
function detectBracketVariations(text) {
    const BRACKET_PAIRS = [
        { name: '波括弧', fullOpen: '\uff5b', fullClose: '\uff5d', halfOpen: '{', halfClose: '}' },
        { name: '丸括弧', fullOpen: '\uff08', fullClose: '\uff09', halfOpen: '(', halfClose: ')' },
        { name: '角括弧', fullOpen: '\uff3b', fullClose: '\uff3d', halfOpen: '[', halfClose: ']' },
    ];

    const allMatches = [];
    for (const pair of BRACKET_PAIRS) {
        // 全角ブラケットで囲まれた部分を抽出
        const fReg = new RegExp(pair.fullOpen + '([^' + pair.fullClose + ']*)' + pair.fullClose, 'g');
        let m;
        while ((m = fReg.exec(text)) !== null) {
            allMatches.push({ content: m[1], bracketWidth: 'full', pairName: pair.name, start: m.index, end: m.index + m[0].length, original: m[0] });
        }
        // 半角ブラケットで囲まれた部分を抽出（特殊文字をエスケープ）
        const ho = pair.halfOpen.replace(/[[\](){}\\^$|?*+.]/g, '\\$&');
        const hc = pair.halfClose.replace(/[[\](){}\\^$|?*+.]/g, '\\$&');
        const hReg = new RegExp(ho + '([^' + hc + ']*)' + hc, 'g');
        while ((m = hReg.exec(text)) !== null) {
            allMatches.push({ content: m[1], bracketWidth: 'half', pairName: pair.name, start: m.index, end: m.index + m[0].length, original: m[0] });
        }
    }

    // ブラケット種類＋内容でグルーピング
    const groupMap = new Map();
    for (const match of allMatches) {
        const mapKey = match.pairName + '\t' + match.content;
        if (!groupMap.has(mapKey)) {
            groupMap.set(mapKey, { content: match.content, pairName: match.pairName, fullMatches: [], halfMatches: [] });
        }
        const group = groupMap.get(mapKey);
        if (match.bracketWidth === 'full') group.fullMatches.push(match);
        else group.halfMatches.push(match);
    }

    const candidates = [];
    const bracketPositions = [];

    for (const [, group] of groupMap.entries()) {
        // 全角・半角の両方が存在する場合のみ候補とする
        if (group.fullMatches.length === 0 || group.halfMatches.length === 0) continue;

        // displayResultのcurrentKey（_sortKey + "\t" + pos）と一致させる
        const sortKey = '__BRACKET__\t' + group.content;
        const pos = group.pairName;
        const groupKey = sortKey + '\t' + pos;

        // 表記ごとに出現回数を集計
        const fullSurfaces = new Map();
        for (const m of group.fullMatches) fullSurfaces.set(m.original, (fullSurfaces.get(m.original) || 0) + 1);
        const halfSurfaces = new Map();
        for (const m of group.halfMatches) halfSurfaces.set(m.original, (halfSurfaces.get(m.original) || 0) + 1);

        for (const [surface, count] of fullSurfaces) {
            candidates.push({ basicForm: group.content, surface, count, pos, _sortKey: sortKey, groupType: 'bracket', variationType: 'bracket' });
        }
        for (const [surface, count] of halfSurfaces) {
            candidates.push({ basicForm: group.content, surface, count, pos, _sortKey: sortKey, groupType: 'bracket', variationType: 'bracket' });
        }

        // ハイライト用の位置情報を構築
        const allGroupMatches = [...group.fullMatches, ...group.halfMatches].sort((a, b) => a.start - b.start);
        for (let i = 0; i < allGroupMatches.length; i++) {
            const match = allGroupMatches[i];
            const prefixStart = Math.max(0, match.start - CONTEXT_CHARS);
            const suffixEnd = Math.min(text.length, match.end + CONTEXT_CHARS);
            const lineNumber = text.substring(0, match.start).split('\n').length;
            bracketPositions.push({
                start: match.start,
                end: match.end,
                key: groupKey,
                id: 'occ-' + encodeGroupKey(groupKey) + '-' + i,
                lineNumber,
                snippet: {
                    prefix: text.slice(prefixStart, match.start),
                    hit: text.slice(match.start, match.end),
                    suffix: text.slice(match.end, suffixEnd)
                },
                prefixIsStart: prefixStart === 0,
                suffixIsEnd: suffixEnd === text.length
            });
        }
    }

    return { candidates, bracketPositions };
}

// ハイライト用：トークンから「グルーピングキー」を再計算する
// analyzeText 内で使っているものと同じロジック
// 否定形にも対応するように修正
function makeGroupKeyFromToken(token) {
    // 表層形
    const surface = token.surface_form || '';
    const pos = token.pos || '不明';
    const basicForm = token.basic_form || surface;

    // 否定形の場合
    if (pos === '動詞' && surface.endsWith('ない')) {
        return `${basicForm}\t${pos}_neg`;
    }

    // 読み（なければ表層形や原形）
    const reading = token.reading || token.surface_form || token.basic_form;

    // 和語数詞の特例処理
    const wagoGroupId = WAGO_SURFACE_TO_GROUP_ID[surface];
    if (wagoGroupId) {
        // 和語数詞の場合：POSを固定してanalyzeTextのキーと一致させる
        return '__WAGO__' + wagoGroupId + '\t和語数詞';
    }

    // 通常の場合：カタカナ→ひらがな変換した読みをキーに使用
    const normalizedReading = katakanaToHiragana(reading);
    return `${normalizedReading}\t${pos}`;
}

/**
 * groupkey を URL-safe な ID に変換
 */
function encodeGroupKey(key) {
    return btoa(encodeURIComponent(key))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}

/**
 * 結果をHTMLテーブルとして表示
 * @param {Object} result - 解析結果
 */
function displayResult(result) {
    const sectionEl = document.getElementById('result-section');
    const { candidates, groupCount } = result;

    if (candidates.length === 0) {
        sectionEl.innerHTML = '<div class="no-result">表記揺れ候補は見つかりませんでした。</div>';
        return;
    }

    let html = `<div class="result-summary">${groupCount}件の表記揺れ候補グループが見つかりました</div>`;

    // 凡例を追加
    html += `
        <div class="legend">
            <span class="legend-item"><span class="type-badge strict">通常</span> 読み＋品詞でグルーピング</span>
            <span class="legend-item"><span class="type-badge neg">否定形</span> 動詞＋「ない」でグルーピング</span>
            <span class="legend-item"><span class="type-badge okurigana">送り仮名</span> 漢字部分が同じで送り仮名が異なる</span>
            <span class="legend-item"><span class="type-badge wago">和語数詞</span> 和語の数詞／数字まわりの表記揺れ</span>
            <span class="legend-item"><span class="type-badge bracket">全角半角</span> ｛｝と{}など、全角・半角ブラケットの混在</span>
            <span class="legend-item"><span class="type-badge fwhw">英数字</span> ＫＰとKPなど、全角・半角英数字の混在</span>
        </div>
    `;

    html += `
        <table>
            <thead>
                <tr>
                    <th>原形</th>
                    <th>品詞</th>
                    <th>表記</th>
                    <th>出現回数</th>
                    <th>種別</th>
                </tr>
            </thead>
            <tbody>
    `;

    let prevKey = null;
    for (let i = 0; i < candidates.length; i++) {
        const c = candidates[i];
        const currentKey = `${c._sortKey}\t${c.pos}`;
        const isGroupStart = currentKey !== prevKey;
        const nextCandidate = i < candidates.length - 1 ? candidates[i + 1] : null;
        const nextKey = nextCandidate ? `${nextCandidate._sortKey}\t${nextCandidate.pos}` : null;
        const isGroupEnd = !nextCandidate || nextKey !== currentKey;

        // CSSクラスを構築
        const classes = [];
        if (isGroupStart) classes.push('group-start');
        if (c.groupType === 'neg') classes.push('neg-type');
        if (c.variationType === 'okurigana') classes.push('okurigana-type');
        if (c.variationType === 'wagoNumber') classes.push('wago-type');
        if (c.variationType === 'bracket') classes.push('bracket-type');
        if (c.variationType === 'fwhw') classes.push('fwhw-type');
        const rowClass = classes.join(' ');

        // タイプバッジ（否定形）
        const negBadge = c.groupType === 'neg'
            ? '<span class="type-badge neg">否定形</span>'
            : '';

        // 種別ラベル（5分岐）
        let variationLabel;
        if (c.variationType === 'okurigana') {
            variationLabel = '<span class="variation-label okurigana">送り仮名</span>';
        } else if (c.variationType === 'wagoNumber') {
            variationLabel = '<span class="variation-label wago">和語数詞</span>';
        } else if (c.variationType === 'bracket') {
            variationLabel = '<span class="variation-label bracket">全角半角</span>';
        } else if (c.variationType === 'fwhw') {
            variationLabel = '<span class="variation-label fwhw">英数字</span>';
        } else {
            variationLabel = '<span class="variation-label default">通常</span>';
        }

        html += `
            <tr ${rowClass ? `class="${rowClass}"` : ''} data-groupkey="${escapeHtml(currentKey)}" style="cursor: pointer;">
                <td>${escapeHtml(c.basicForm)}${negBadge}</td>
                <td>${escapeHtml(c.pos)}</td>
                <td>${escapeHtml(c.surface)}</td>
                <td>${c.count}</td>
                <td>${variationLabel}</td>
            </tr>
        `;

        // グループの最後の行の直後にocc-rowを挿入
        if (isGroupEnd) {
            html += `
                <tr class="occ-row" data-groupkey="${escapeHtml(currentKey)}">
                    <td colspan="5">
                        <div class="occ-container" style="display:none;"></div>
                    </td>
                </tr>
            `;
        }

        prevKey = currentKey;
    }

    html += '</tbody></table>';

    sectionEl.innerHTML = html;

    // テーブル行にクリックイベントを設定（occ-row以外）
    const rows = sectionEl.querySelectorAll('tbody tr[data-groupkey]:not(.occ-row)');
    rows.forEach(row => {
        row.addEventListener('click', function() {
            const groupKey = this.getAttribute('data-groupkey');
            showOccurrences(groupKey);
        });
    });
}

/**
 * 出現箇所リストを表示（トグル動作）
 */
function showOccurrences(groupKey) {
    if (!lastAnalysis || !lastAnalysis.occurrencesByKey) {
        return;
    }

    // 該当するocc-rowを取得
    const occRow = document.querySelector(`.occ-row[data-groupkey="${CSS.escape(groupKey)}"]`);
    if (!occRow) {
        return;
    }

    const occContainer = occRow.querySelector('.occ-container');
    if (!occContainer) {
        return;
    }

    // トグル処理：すでに表示中なら非表示に、非表示なら表示
    if (occContainer.style.display === 'block') {
        occContainer.style.display = 'none';
        occContainer.innerHTML = '';
        return;
    }

    // 出現箇所データを取得
    const occurrences = lastAnalysis.occurrencesByKey[groupKey] || [];

    if (occurrences.length === 0) {
        occContainer.innerHTML = '<div class="no-result" style="padding: 10px;">出現箇所が見つかりませんでした。</div>';
        occContainer.style.display = 'block';
        return;
    }

    // 出現箇所を描画
    let html = `<div style="margin-bottom: 8px; padding: 10px 10px 0; color: #666; font-size: 0.9rem; font-weight: bold; border-bottom: 2px solid #3498db;">出現箇所（合計 ${occurrences.length} 件）</div>`;

    occurrences.forEach((occ, idx) => {
        // 前後25文字スニペットで表示
        const { prefix, hit, suffix } = occ.snippet;
        const prefixDisplay = occ.prefixIsStart
            ? escapeHtml(prefix)
            : '…' + escapeHtml(prefix);
        const suffixDisplay = occ.suffixIsEnd
            ? escapeHtml(suffix)
            : escapeHtml(suffix) + '…';
        const contextHtml = `<div style="padding: 2px 4px;">${prefixDisplay}<mark>${escapeHtml(hit)}</mark>${suffixDisplay}</div>`;

        html += `
            <div class="occurrence-item" data-occ-id="${escapeHtml(occ.id)}" style="margin: 10px; padding: 10px; background: #f8f9fa; border-left: 3px solid #3498db; cursor: pointer; border-radius: 4px;">
                <div style="font-size: 0.85rem; color: #666; margin-bottom: 4px;">行 ${occ.lineNumber}</div>
                <div style="font-size: 0.9rem; font-family: monospace; line-height: 1.5;">
                    ${contextHtml}
                </div>
            </div>
        `;
    });

    occContainer.innerHTML = html;
    occContainer.style.display = 'block';

    // 出現箇所項目にクリックイベントを設定
    const items = occContainer.querySelectorAll('.occurrence-item');
    items.forEach(item => {
        item.addEventListener('click', function() {
            const occId = this.getAttribute('data-occ-id');
            jumpToOccurrence(occId);
        });
    });
}

/**
 * ハイライト箇所へジャンプして強調
 */
function jumpToOccurrence(occId) {
    const targetEl = document.getElementById(occId);
    if (!targetEl) {
        return;
    }

    // スクロール
    targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // 直前の選択を解除
    if (lastSelectedEl) {
        lastSelectedEl.classList.remove('hl-selected');
    }

    // 新しい選択を適用して記憶
    targetEl.classList.add('hl-selected');
    lastSelectedEl = targetEl;
}

/**
 * 原文テキストを「トークン＋それ以外」に分解し、
 * 表記揺れ候補のグループに属するトークンとextrePositions箇所をハイライト表示する
 * @param {string} text - 元のテキスト（handleAnalyze から渡す）
 * @param {Array} tokens - kuromoji のトークン配列（analyzeText の戻り値）
 * @param {Array} highlightKeys - 揺れグループのキー一覧（analyzeText の戻り値）
 * @param {Array} extraPositions - ブラケット・英数字一致位置一覧
 */
function renderHighlightedText(text, tokens, highlightKeys, extraPositions) {
    const container = document.getElementById('highlighted-text');
    if (!container) return;

    if (!text) { container.textContent = ''; return; }

    const hasExtra = extraPositions && extraPositions.length > 0;
    if ((!tokens || tokens.length === 0) && !hasExtra) {
        container.textContent = text;
        return;
    }

    const highlightSet = new Set(highlightKeys || []);

    // --- Step 1: トークン位置を解決してハイライト範囲を構築 ---
    const tokenRanges = [];
    {
        let lastIndex = 0;
        for (const token of (tokens || [])) {
            const surface = token.surface_form || '';
            if (!surface) continue;
            let start = text.indexOf(surface, lastIndex);
            if (start === -1) start = token.word_position != null ? token.word_position - 1 : lastIndex;
            if (start < lastIndex) start = lastIndex;
            const end = start + surface.length;
            lastIndex = end;
            const key = makeGroupKeyFromToken(token);
            if (highlightSet.has(key)) tokenRanges.push({ start, end, key, source: 'token' });
        }
    }

    // --- Step 2: extraPositions と統合してソート ---
    const epRanges = (extraPositions || []).map(ep => ({ ...ep, source: 'extra' }));
    const allRanges = [...tokenRanges, ...epRanges].sort((a, b) => a.start - b.start);

    // --- Step 3: extra出現箇所を事前登録 ---
    const occurrencesByKey = {};
    for (const ep of (extraPositions || [])) {
        if (!occurrencesByKey[ep.key]) occurrencesByKey[ep.key] = [];
        occurrencesByKey[ep.key].push({
            id: ep.id, start: ep.start, end: ep.end, lineNumber: ep.lineNumber,
            snippet: ep.snippet, prefixIsStart: ep.prefixIsStart, suffixIsEnd: ep.suffixIsEnd
        });
    }
    for (const key of Object.keys(occurrencesByKey)) {
        occurrencesByKey[key].sort((a, b) => a.start - b.start);
    }

    // --- Step 4: 一括レンダリング ---
    const tokenOccCountByKey = {};
    let html = '';
    let pos = 0;

    for (const range of allRanges) {
        if (range.start < pos) continue; // 重複をスキップ

        if (range.start > pos) html += escapeHtml(text.slice(pos, range.start));

        const word = text.slice(range.start, range.end);
        let occId;

        if (range.source === 'extra') {
            occId = range.id;
        } else {
            if (!occurrencesByKey[range.key]) occurrencesByKey[range.key] = [];
            const occIdx = tokenOccCountByKey[range.key] || 0;
            tokenOccCountByKey[range.key] = occIdx + 1;
            occId = 'occ-' + encodeGroupKey(range.key) + '-' + occIdx;
            const lineNumber = text.substring(0, range.start).split('\n').length;
            const prefixStart = Math.max(0, range.start - CONTEXT_CHARS);
            const suffixEnd = Math.min(text.length, range.end + CONTEXT_CHARS);
            occurrencesByKey[range.key].push({
                id: occId, start: range.start, end: range.end, lineNumber,
                snippet: {
                    prefix: text.slice(prefixStart, range.start),
                    hit: text.slice(range.start, range.end),
                    suffix: text.slice(range.end, suffixEnd)
                },
                prefixIsStart: prefixStart === 0,
                suffixIsEnd: suffixEnd === text.length
            });
        }

        html += '<span class="hl-variant" id="' + occId + '" data-groupkey="' + escapeHtml(range.key) + '" data-idx="' + ((occurrencesByKey[range.key] || []).length - 1) + '">' + escapeHtml(word) + '</span>';
        pos = range.end;
    }

    if (pos < text.length) html += escapeHtml(text.slice(pos));

    container.innerHTML = html;

    if (!lastAnalysis) lastAnalysis = {};
    lastAnalysis.occurrencesByKey = occurrencesByKey;
}

/**
 * HTMLエスケープ
 */
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/**
 * メイン処理（ボタンクリック時）
 */
function handleAnalyze() {
    const text = document.getElementById('input-text').value.trim();

    if (!text) {
        alert('テキストを入力してください。');
        return;
    }

    if (!tokenizer) {
        alert('形態素解析エンジンがまだ準備できていません。');
        return;
    }

    const statusEl = document.getElementById('status');
    statusEl.textContent = '解析中...';
    statusEl.className = 'loading';

    // UIがブロックされないように少し遅延
    setTimeout(() => {
        try {
            const result = analyzeText(text);
            const bracketResult = detectBracketVariations(text);
            const fwhwResult = detectFullWidthVariations(text);

            // 全候補をマージしてソート
            const allCandidates = [...result.candidates, ...bracketResult.candidates, ...fwhwResult.candidates];
            allCandidates.sort((a, b) => {
                if (a._sortKey !== b._sortKey) return a._sortKey.localeCompare(b._sortKey);
                if (a.pos !== b.pos) return a.pos.localeCompare(b.pos);
                return b.count - a.count;
            });

            const groupSet = new Set();
            for (const c of allCandidates) groupSet.add(c._sortKey + '\t' + c.pos);

            const mergedResult = {
                candidates: allCandidates,
                groupCount: groupSet.size,
                tokens: result.tokens,
                highlightKeys: result.highlightKeys
            };

            // グローバルに保存
            lastAnalysis = {
                text,
                tokens: result.tokens,
                highlightKeys: result.highlightKeys,
                occurrencesByKey: {},
                candidates: allCandidates
            };

            displayResult(mergedResult);

            // 原文のハイライト表示を更新（出現箇所インデックスも構築）
            const allExtraPositions = [...bracketResult.bracketPositions, ...fwhwResult.fwhwPositions];
            renderHighlightedText(text, result.tokens, result.highlightKeys, allExtraPositions);

            statusEl.textContent = '解析完了';
            statusEl.className = 'ready';

            // TSVダウンロードボタンを有効化
            const exportBtn = document.getElementById('export-tsv-btn');
            if (exportBtn) exportBtn.disabled = false;
        } catch (e) {
            console.error(e);
            statusEl.textContent = 'エラー: 解析中に問題が発生しました';
            statusEl.className = 'error';
        }
    }, 50);
}

// ========================================
// ファイル読み込み処理
// ========================================

/**
 * ファイル読み込みハンドラ
 */
function handleFileInput(event) {
    const file = event.target.files[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    const statusEl = document.getElementById('status');
    const textArea = document.getElementById('input-text');

    // ファイル拡張子を判定
    if (fileName.endsWith('.txt')) {
        // .txt ファイルの処理
        statusEl.textContent = 'テキストファイルを読み込み中...';
        statusEl.className = 'loading';

        const reader = new FileReader();
        reader.onload = function(e) {
            const text = e.target.result;
            textArea.value = text;
            statusEl.textContent = '準備完了（解析可能）';
            statusEl.className = 'ready';
        };
        reader.onerror = function() {
            statusEl.textContent = 'エラー: ファイルの読み込みに失敗しました';
            statusEl.className = 'error';
        };
        reader.readAsText(file, 'UTF-8');

    } else if (fileName.endsWith('.docx')) {
        // .docx ファイルの処理
        statusEl.textContent = 'Wordファイルを読み込み中...';
        statusEl.className = 'loading';

        const reader = new FileReader();
        reader.onload = function(e) {
            const arrayBuffer = e.target.result;

            mammoth.extractRawText({ arrayBuffer: arrayBuffer })
                .then(function(result) {
                    const text = result.value;
                    textArea.value = text;
                    statusEl.textContent = '準備完了（解析可能）';
                    statusEl.className = 'ready';
                })
                .catch(function(err) {
                    console.error(err);
                    statusEl.textContent = 'エラー: Wordファイルの解析に失敗しました';
                    statusEl.className = 'error';
                });
        };
        reader.onerror = function() {
            statusEl.textContent = 'エラー: ファイルの読み込みに失敗しました';
            statusEl.className = 'error';
        };
        reader.readAsArrayBuffer(file);

    } else {
        alert('対応していないファイル形式です。.txt または .docx ファイルを選択してください。');
        event.target.value = ''; // ファイル選択をリセット
    }
}

// 和語数詞の辞書内容をページ下部に自動表示する
function renderWagoDictionary() {
    const container = document.getElementById("registered-wago");
    let html = "";

    for (const group of WAGO_NUMBER_GROUPS) {
        const variants = group.variants.join(" ／ ");
        html += `<p><strong>${variants}</strong></p>`;
    }

    container.innerHTML = html;
}

// ========================================
// イベントリスナー設定
// ========================================

document.getElementById('analyze-btn').addEventListener('click', handleAnalyze);
document.getElementById('file-input').addEventListener('change', handleFileInput);

// ========================================
// TSVエクスポート
// ========================================

/**
 * タブ・改行を含む文字列をTSVセルとして安全にする
 */
function sanitizeTsvCell(str) {
    if (str == null) return '';
    return String(str).replace(/[\t\n\r]/g, ' ');
}

/**
 * スニペットを1文字列に整形
 * 改行はスペースに置換、先頭/末尾の「…」は元テキスト端かどうかで制御
 */
function formatSnippet(occ) {
    const { prefix, hit, suffix } = occ.snippet;
    const pre = occ.prefixIsStart ? prefix  : '…' + prefix;
    const suf = occ.suffixIsEnd   ? suffix  : suffix + '…';
    return sanitizeTsvCell(pre + hit + suf);
}

/**
 * 解析結果をTSVとして生成しダウンロード
 */
function exportTsv() {
    if (!lastAnalysis || !lastAnalysis.occurrencesByKey || !lastAnalysis.candidates) {
        alert('先に解析を実行してください。');
        return;
    }

    const { candidates, occurrencesByKey } = lastAnalysis;

    // groupKey → メタ情報の辞書を構築
    const groupMeta = new Map();
    for (const c of candidates) {
        const key = `${c._sortKey}\t${c.pos}`;
        if (!groupMeta.has(key)) {
            groupMeta.set(key, {
                basicForm: c.basicForm,
                pos: c.pos,
                variationType: c.variationType,
                groupType: c.groupType,
                surfaces: new Map()
            });
        }
        groupMeta.get(key).surfaces.set(c.surface, c);
    }

    // 種別の日本語ラベル
    function variationLabel(meta) {
        if (meta.groupType === 'neg')            return '否定形';
        if (meta.variationType === 'okurigana')  return '送り仮名';
        if (meta.variationType === 'wagoNumber') return '和語数詞';
        if (meta.variationType === 'bracket')    return '全角半角';
        if (meta.variationType === 'fwhw')       return '英数字(全角半角)';
        return '通常';
    }

    const rows = [];
    // ヘッダー行
    rows.push(['groupKey', '原形', '品詞', '表記', '種別', '行番号', 'スニペット（前後25文字）'].join('\t'));

    for (const [groupKey, occs] of Object.entries(occurrencesByKey)) {
        if (!occs || occs.length === 0) continue;

        const meta = groupMeta.get(groupKey);
        if (!meta) continue;

        for (const occ of occs) {
            const hitSurface = occ.snippet.hit;
            const cols = [
                sanitizeTsvCell(groupKey),
                sanitizeTsvCell(meta.basicForm),
                sanitizeTsvCell(meta.pos),
                sanitizeTsvCell(hitSurface),
                sanitizeTsvCell(variationLabel(meta)),
                occ.lineNumber != null ? occ.lineNumber : '',
                formatSnippet(occ)
            ];
            rows.push(cols.join('\t'));
        }
    }

    // BOM付きUTF-8（Excelでも文字化けしない）
    const bom = '\uFEFF';
    const tsvContent = bom + rows.join('\n');
    const blob = new Blob([tsvContent], { type: 'text/tab-separated-values;charset=utf-8' });

    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'yure_export.tsv';
    a.click();
    URL.revokeObjectURL(a.href);
}

document.getElementById('export-tsv-btn').addEventListener('click', exportTsv);

// 初期化処理
renderWagoDictionary();
initTokenizer();
