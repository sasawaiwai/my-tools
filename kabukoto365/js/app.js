// グローバル変数
let currentDate = new Date();
let currentTipsTab = 'anniversary'; // 現在選択中のタブ
let currentTipsData = { anniversary: [], birthday: [], history: [] }; // 現在表示中のTipsデータ

// ページ読み込み時の初期化
document.addEventListener('DOMContentLoaded', function() {
    // 今日の日付の格言を表示
    displayQuoteForDate(currentDate);
    
    // イベントリスナーの追加
    document.getElementById('prev-day').addEventListener('click', showPreviousDay);
    document.getElementById('next-day').addEventListener('click', showNextDay);
    document.getElementById('today-btn').addEventListener('click', showToday);
    document.getElementById('share-btn').addEventListener('click', showShareMenu);
    document.getElementById('tips-toggle').addEventListener('click', toggleTips);
    
    // 格言コンテナをクリック可能に
    document.getElementById('quote-container').addEventListener('click', showQuoteDetail);
    
    // モーダルを閉じるボタン
    document.getElementById('modal-close').addEventListener('click', closeModal);
    
    // モーダル外をクリックした時に閉じる
    window.addEventListener('click', function(event) {
        const modal = document.getElementById('quote-modal');
        if (event.target === modal) {
            closeModal();
        }
    });
    

    
// 共有ボタンがクリックされた時にイベントの伝播を停止
document.getElementById('share-btn').addEventListener('click', function(event) {
    event.stopPropagation();
});
    
    // スクロールインジケーターの設定
    setupScrollIndicator();
    
    // 背景画像をランダムに設定
    setRandomBackground();
    

    

    
});




// 日付に応じた格言を表示する関数
function displayQuoteForDate(date) {
    // 日付から MM-DD 形式の文字列を取得
    const monthDay = dateSystem.formatDateMMDD(date);
    
    // 該当する格言データとTipsを取得
    const quoteData = quotesData[monthDay] || getFallbackQuote();
    const tips = dailyTips[monthDay] || { anniversary: [], birthday: [], history: [] };
    
    // 格言を表示
    const quoteTextElement = document.getElementById('quote-text');
    quoteTextElement.innerHTML = formatQuoteText(quoteData.quote);
    
    // フォントサイズ調整
    adjustQuoteTextSize(quoteData.quote);
    
    // 出典を表示
    const quoteSourceElement = document.getElementById('quote-source');
    quoteSourceElement.textContent = `- ${quoteData.source || '株の格言'} -`;
    
    // 日付表示を更新
    updateDateDisplay(date);
    
    // Tips情報を表示
    displayTips(tips);
    
    // 現在表示中の日付を保存
    localStorage.setItem('lastViewedDate', date.toISOString());
}




// 格言テキストのフォーマット（改行を処理）
function formatQuoteText(text) {
    // テキストの長さに応じて自動改行または手動改行を処理
    if (text.includes('\n')) {
        return text.split('\n').map(line => `<span>${line}</span>`).join('');
    }
    
    // 長い文章の場合は適宜分割（例：40文字以上で改行を考慮）
    if (text.length > 40) {
        const middleIndex = findOptimalBreakPoint(text);
        const firstHalf = text.substring(0, middleIndex);
        const secondHalf = text.substring(middleIndex);
        
        return `<span>${firstHalf}</span><span>${secondHalf}</span>`;
    }
    
    return `<span>${text}</span>`;
}

// 最適な改行位置を見つける
function findOptimalBreakPoint(text) {
    // 理想的には文の途中で切らないようにする
    const middleIndex = Math.floor(text.length / 2);
    const punctuations = ['。', '、', '，', '．', ' ', '　'];
    
    // 中央から前後20文字以内で句読点を探す
    for (let i = 0; i < 20; i++) {
        if (middleIndex + i < text.length && punctuations.includes(text[middleIndex + i])) {
            return middleIndex + i + 1; // 句読点の後で改行
        }
        if (middleIndex - i > 0 && punctuations.includes(text[middleIndex - i])) {
            return middleIndex - i + 1; // 句読点の後で改行
        }
    }
    
    // 適切な句読点が見つからない場合は単純に半分で区切る
    return middleIndex;
}

// 格言テキストのサイズを調整
function adjustQuoteTextSize(text) {
    const quoteTextElement = document.getElementById('quote-text');
    const quoteContainer = document.querySelector('.quote-container');
    
    // テキストの長さに応じてフォントサイズを調整
    if (text.length < 20) {
        quoteTextElement.style.fontSize = '20px';
        quoteContainer.style.minHeight = '175px'; // 短い格言
    } else if (text.length < 40) {
        quoteTextElement.style.fontSize = '18px';
        quoteContainer.style.minHeight = '175px'; // 中程度の格言
    } else if (text.length < 80) {
        quoteTextElement.style.fontSize = '16px';
        quoteContainer.style.minHeight = '200px'; // やや長い格言
    } else {
        quoteTextElement.style.fontSize = '15px';
        quoteContainer.style.minHeight = '225px'; // 長い格言
    }
    
    // コンテナの高さを内容に合わせて調整（少し遅延を入れて確実に反映）
    setTimeout(() => {
        const quoteContentContainer = document.querySelector('.quote-content-container');
        const contentHeight = quoteContentContainer.scrollHeight;
        const minContentHeight = 125; // 最小コンテンツ高さ
        
        if (contentHeight > minContentHeight) {
            // コンテンツの高さ + マージン
            quoteContainer.style.height = (contentHeight + 50) + 'px';
        } else {
            // 最小高さを維持
            quoteContainer.style.height = (minContentHeight + 50) + 'px';
        }
    }, 10);
}

// Tips情報を表示（タブUI）
function displayTips(tips) {
    currentTipsData = tips || { anniversary: [], birthday: [], history: [] };
    const tipsContentElement = document.getElementById('tips-content');
    const tipsContainer = document.querySelector('.tips-container');

    // タブバーとコンテンツペインを構築
    tipsContentElement.innerHTML = `
        <div class="tips-tabs">
            <button class="tips-tab" data-tab="anniversary">記念日</button>
            <button class="tips-tab" data-tab="birthday">誕生日</button>
            <button class="tips-tab" data-tab="history">歴史</button>
        </div>
        <div class="tips-tab-pane" id="tips-tab-pane"></div>
    `;

    // タブクリックイベント
    tipsContentElement.querySelectorAll('.tips-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            tipsContentElement.querySelectorAll('.tips-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            currentTipsTab = this.dataset.tab;
            renderTipsPane(currentTipsTab);
        });
    });

    // 現在選択中のタブをアクティブにして描画
    const activeTabEl = tipsContentElement.querySelector(`[data-tab="${currentTipsTab}"]`);
    if (activeTabEl) {
        activeTabEl.classList.add('active');
    }
    renderTipsPane(currentTipsTab);

    setTimeout(() => {
        tipsContainer.style.height = 'auto';
        updateScrollIndicator();
    }, 10);
}

// 指定タブのコンテンツを描画
function renderTipsPane(tabKey) {
    const pane = document.getElementById('tips-tab-pane');
    if (!pane) return;

    const items = currentTipsData[tabKey] || [];

    if (items.length === 0) {
        pane.innerHTML = '<p class="tips-empty">本日の情報はありません</p>';
        return;
    }

    pane.innerHTML = '';
    items.forEach((text, index) => {
        const item = document.createElement('div');
        item.className = 'tips-item tips-clickable';
        item.innerHTML = `<div class="tips-text">${text}</div>`;

        // タップでGoogle検索（新タブ）
        item.addEventListener('click', () => {
            window.open('https://www.google.com/search?q=' + encodeURIComponent(text), '_blank');
        });

        pane.appendChild(item);

        if (index < items.length - 1) {
            const divider = document.createElement('div');
            divider.className = 'tips-divider';
            pane.appendChild(divider);
        }
    });
}


// スクロールインジケーターの表示更新
function updateScrollIndicator() {
    // スクロールが不要になったためこの機能は無効化
    const scrollIndicator = document.getElementById('scroll-indicator');
    if (scrollIndicator) {
        scrollIndicator.style.display = 'none';
    }
}

// 日付表示の更新
function updateDateDisplay(date) {
    const yearElement = document.getElementById('date-year');
    const monthdayElement = document.getElementById('date-monthday');
    const weekdayElement = document.getElementById('date-weekday');
    
    // 年を表示
    const year = date.getFullYear();
    yearElement.textContent = year;
    
    // 月.日 形式で表示
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    monthdayElement.textContent = `${month}.${day}`;
    
    // 曜日を表示
    const weekdays = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    weekdayElement.textContent = weekdays[date.getDay()];
}

// 前日の格言を表示
function showPreviousDay() {
    const prevDate = new Date(currentDate);
    prevDate.setDate(prevDate.getDate() - 1);
    currentDate = prevDate;
    displayQuoteForDate(currentDate);
    animateQuoteChange();
}

// 翌日の格言を表示
function showNextDay() {
    const nextDate = new Date(currentDate);
    nextDate.setDate(nextDate.getDate() + 1);
    currentDate = nextDate;
    displayQuoteForDate(currentDate);
    animateQuoteChange();
}

// 今日の格言を表示
function showToday() {
    currentDate = new Date();
    displayQuoteForDate(currentDate);
    animateQuoteChange();
}

// 格言切り替え時のアニメーション
function animateQuoteChange() {
    const quoteContainer = document.querySelector('.quote-container');
    quoteContainer.classList.remove('fade-in');
    
    // Forced reflow to restart animation
    void quoteContainer.offsetWidth;
    
    quoteContainer.classList.add('fade-in');
}



// 共有メニューを表示
function showShareMenu(event) {
    event.stopPropagation();
    
    // すでに表示されているメニューがあれば削除
    const existingMenu = document.querySelector('.share-menu');
    if (existingMenu) {
        existingMenu.remove();
        return;
    }
    
    // 共有ボタンのアクティブスタイルを適用
    const shareBtn = document.getElementById('share-btn');
    shareBtn.classList.add('active');
    
    // 現在の格言と出典を取得
    const quoteText = document.getElementById('quote-text').textContent;
    const quoteSource = document.getElementById('quote-source').textContent;
    const shareText = `${quoteText} ${quoteSource} #かぶこと365 #株の格言`;
    
    // 共有メニューを作成
    const shareMenu = document.createElement('div');
    shareMenu.className = 'share-menu';
    
    // Twitter共有オプション
    const twitterOption = createShareOption(
        '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M22 4.01C21 4.5 20.02 4.69 19 4.82C18.46 4.28 17.8 3.9 17.07 3.72C16.34 3.54 15.58 3.57 14.88 3.8C14.17 4.03 13.56 4.45 13.09 5.01C12.61 5.57 12.32 6.23 12 7V8C10.95 8.04 9.91 7.8 8.96 7.34C8.01 6.88 7.17 6.21 6.5 5.39C6.5 5.39 3 13.39 12 17.39C10.69 18.24 9.14 18.66 7.59 18.59C16.59 23.59 24 17.39 24 7.39C24 7.19 23.97 6.99 23.94 6.79C22.79 6.99 21 5.39 22 4.01Z" stroke="#A1A1AA" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
        'Twitter で共有',
        function() {
            const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(window.location.href)}`;
            window.open(twitterUrl, '_blank');
            closeShareMenu();
            showToast('Twitterで共有しました');
        }
    );
    
    // Facebook共有オプション
    const facebookOption = createShareOption(
        '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M17 2H14C12.6739 2 11.4021 2.52678 10.4645 3.46447C9.52678 4.40215 9 5.67392 9 7V10H6V14H9V22H13V14H16L17 10H13V7C13 6.73478 13.1054 6.48043 13.2929 6.29289C13.4804 6.10536 13.7348 6 14 6H17V2Z" stroke="#A1A1AA" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
        'Facebook で共有',
        function() {
            const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`;
            window.open(facebookUrl, '_blank');
            closeShareMenu();
            showToast('Facebookで共有しました');
        }
    );
    
    // LINE共有オプション
    const lineOption = createShareOption(
        '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M22 11.09V12.8C22 16.71 19.01 20 12 20C5 20 2 16.71 2 12.8V11.09C2 6.35 6.16 4.11 10.37 2.11C10.9 1.86 11.5 2.21 11.5 2.8V6.12C11.5 6.45 11.76 6.71 12.09 6.71H15.55C15.88 6.71 16.14 6.45 16.14 6.12V2.8C16.14 2.21 16.74 1.86 17.27 2.11C21.48 4.11 22 7.35 22 11.09Z" stroke="#A1A1AA" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
        'LINE で共有',
        function() {
            const lineUrl = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(shareText)}`;
            window.open(lineUrl, '_blank');
            closeShareMenu();
            showToast('LINEで共有しました');
        }
    );
    
    // コピーオプション
    const copyOption = createShareOption(
        '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 10C8 9.46957 8.21071 8.96086 8.58579 8.58579C8.96086 8.21071 9.46957 8 10 8H18C18.5304 8 19.0391 8.21071 19.4142 8.58579C19.7893 8.96086 20 9.46957 20 10V18C20 18.5304 19.7893 19.0391 19.4142 19.4142C19.0391 19.7893 18.5304 20 18 20H10C9.46957 20 8.96086 19.7893 8.58579 19.4142C8.21071 19.0391 8 18.5304 8 18V10Z" stroke="#A1A1AA" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 8V6C16 5.46957 15.7893 4.96086 15.4142 4.58579C15.0391 4.21071 14.5304 4 14 4H6C5.46957 4 4.96086 4.21071 4.58579 4.58579C4.21071 4.96086 4 5.46957 4 6V14C4 14.5304 4.21071 15.0391 4.58579 15.4142C4.96086 15.7893 5.46957 16 6 16H8" stroke="#A1A1AA" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
        'テキストをコピー',
        function() {
            navigator.clipboard.writeText(shareText).then(function() {
                closeShareMenu();
                showToast('テキストをコピーしました');
            }, function() {
                closeShareMenu();
                showToast('コピーに失敗しました');
            });
        }
    );
    
    // オプションをメニューに追加
    shareMenu.appendChild(twitterOption);
    shareMenu.appendChild(facebookOption);
    shareMenu.appendChild(lineOption);
    shareMenu.appendChild(copyOption);
    
    // メニューの位置を設定
    shareMenu.style.position = 'fixed'; // absoluteではなくfixedを使用
    
    // 共有ボタンの位置を取得
    const shareBtnRect = shareBtn.getBoundingClientRect();
    
    // 画面の端から計算するのではなく、ボタンの位置から計算
    shareMenu.style.top = shareBtnRect.bottom + 'px';
    shareMenu.style.right = (window.innerWidth - shareBtnRect.right) + 'px';
    
    // メニューをbodyに追加
    document.body.appendChild(shareMenu);
    
    // アニメーション効果を実現
    setTimeout(() => {
        shareMenu.classList.add('show');
    }, 10);
    
    // ドキュメントのクリックイベントを監視して、メニュー外をクリックしたら閉じる
    document.addEventListener('click', closeShareMenuOnClickOutside);
}

// 共有オプション要素を作成するヘルパー関数
function createShareOption(iconSvg, text, clickHandler) {
    const option = document.createElement('div');
    option.className = 'share-option';
    option.innerHTML = iconSvg;
    
    const span = document.createElement('span');
    span.textContent = text;
    option.appendChild(span);
    
    option.addEventListener('click', clickHandler);
    
    return option;
}

// 共有メニューを閉じる
function closeShareMenu() {
    const shareMenu = document.querySelector('.share-menu');
    if (shareMenu) {
        shareMenu.classList.remove('show');
        setTimeout(() => {
            shareMenu.remove();
        }, 200);
    }
    
    const shareBtn = document.getElementById('share-btn');
    shareBtn.classList.remove('active');
    
    // ドキュメントのクリックイベントリスナーを削除
    document.removeEventListener('click', closeShareMenuOnClickOutside);
}

// メニュー外をクリックしたときに閉じる
function closeShareMenuOnClickOutside(event) {
    const shareMenu = document.querySelector('.share-menu');
    const shareBtn = document.getElementById('share-btn');
    
    if (shareMenu && !shareMenu.contains(event.target) && !shareBtn.contains(event.target)) {
        closeShareMenu();
    }
}
// トースト通知を表示
function showToast(message) {
    // 既存のトーストを削除
    const existingToast = document.querySelector('.toast-notification');
    if (existingToast) {
        existingToast.remove();
    }
    
    // 新しいトーストを作成して表示
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // アニメーションのためにタイミングをずらす
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    // 3秒後にトーストを消す
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
}


// Tips表示の切り替え
function toggleTips() {
    const tipsContent = document.getElementById('tips-content');
    const tipsToggle = document.getElementById('tips-toggle');
    
    if (tipsContent.style.display === 'none') {
        tipsContent.style.display = 'block';
        tipsToggle.classList.add('active');
    } else {
        tipsContent.style.display = 'none';
        tipsToggle.classList.remove('active');
    }
}

// スクロールインジケーターのセットアップ
function setupScrollIndicator() {
    // 可変高さになったためスクロールインジケーターは必要なくなりました
    const scrollIndicator = document.getElementById('scroll-indicator');
    if (scrollIndicator) {
        scrollIndicator.style.display = 'none';
    }
}

// 背景画像をランダムに設定
function setRandomBackground() {
    // 背景画像の配列
    const backgrounds = [
        'url("images/backgrounds/bg-chart1.jpg")',
        'url("images/backgrounds/bg-chart2.jpg")',
        'url("images/backgrounds/bg-trading1.jpg")',
        'url("images/backgrounds/bg-trading2.jpg")',
        'url("images/backgrounds/bg-board.jpg")'
    ];
    
    // 日付に基づいて決定論的に選択（同じ日なら同じ背景になる）
    const dayOfYear = dateSystem.getDayOfYear(currentDate);
    const index = dayOfYear % backgrounds.length;
    
    document.querySelector('.quote-background').style.backgroundImage = backgrounds[index];
}

// 日付を MM-DD 形式に変換
function formatDateMMDD(date) {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${month}-${day}`;
}

// 年内の日数を取得（1月1日が1、12月31日が365または366）
function getDayOfYear(date) {
    const startOfYear = new Date(date.getFullYear(), 0, 0);
    const diff = date - startOfYear;
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
}

// データがない場合のフォールバック
function getFallbackQuote() {
    return {
        quote: "相場は時に我々に謙虚さを教えてくれる",
        source: "株の格言",
        tips: ["データが見つかりませんでした"],
        explanation: "相場の動きは予測不可能なことが多く、投資家に謙虚さを教えてくれます。市場は常に正しいとされ、自分の分析や見通しが間違っていることを受け入れる謙虚さが必要です。",
        examples: [
            {
                title: "事例",
                content: "市場の変動に対して謙虚さを持ち続けることで、過度な自信から来る損失を避けることができます。"
            }
        ]
    };
}

// 格言詳細モーダルを表示
function showQuoteDetail(event) {
    // 共有ボタンクリック時は何もしない（既にstopPropagationで処理）
    
    // 現在の日付のデータを取得
    const monthDay = dateSystem.formatDateMMDD(currentDate);
    const quoteData = quotesData[monthDay] || getFallbackQuote();
    
    // モーダルに内容を設定
    document.getElementById('modal-title').textContent = '格言の詳細';
    document.getElementById('modal-quote').textContent = quoteData.quote;
    document.getElementById('modal-source').textContent = `- ${quoteData.source || '株の格言'} -`;
    document.getElementById('modal-explanation').textContent = quoteData.explanation || '詳細情報はありません。';
    
    // 楽天アフィカードHTMLを表示（examplesの代わり）
    const examplesElement = document.getElementById('modal-examples');
    examplesElement.innerHTML = '';
    
    // 楽天アフィカード表示用コンテナを追加
    const rakutenSlot = document.createElement('div');
    rakutenSlot.id = 'rakuten-slot';
    rakutenSlot.className = 'rakuten-slot';
    examplesElement.appendChild(rakutenSlot);
    
    if (quoteData.rakutenHtml) {
        rakutenSlot.innerHTML = quoteData.rakutenHtml;
    }
    
    // モーダルを表示
    const modal = document.getElementById('quote-modal');
    modal.classList.add('show');
    
    // スクロールを無効化（背景固定）
    document.body.style.overflow = 'hidden';
}

// モーダルを閉じる
function closeModal() {
    const modal = document.getElementById('quote-modal');
    modal.classList.remove('show');
    
    // スクロールを再有効化
    document.body.style.overflow = '';
}






// DOMの読み込み完了後に実行
document.addEventListener('DOMContentLoaded', function() {
    // ヘッダーナビゲーションを非表示
    const headerNav = document.querySelector('header nav');
    if (headerNav) {
        headerNav.style.display = 'none';
    }
    
    // フッターにナビゲーションを追加
    const footerLinks = document.querySelector('.footer-links');
    if (footerLinks) {
        // 既存のフッターリンクを非表示
        footerLinks.style.display = 'none';
        
        // 新しいナビゲーションを追加
        const footerContent = document.querySelector('.footer-content');
        if (footerContent) {
            // フッターナビの生成
            const footerNav = document.createElement('nav');
            footerNav.className = 'footer-nav';
            
            // 元のヘッダーと同じナビゲーションリンクを作成
            const navUl = document.createElement('ul');
            
            // リンク情報の配列
            const links = [
                { href: 'about.html', text: 'サイトについて' },
                { href: 'archive.html', text: '格言アーカイブ' },
                { href: 'privacy.html', text: 'プライバシーポリシー' },
                { href: 'contact.html', text: 'お問い合わせ' }
            ];
            
            // リンクを作成して追加
            links.forEach(linkInfo => {
                const li = document.createElement('li');
                const a = document.createElement('a');
                a.href = linkInfo.href;
                a.textContent = linkInfo.text;
                li.appendChild(a);
                navUl.appendChild(li);
            });
            
            footerNav.appendChild(navUl);
            footerContent.appendChild(footerNav);
        }
    }
    
    // ヘッダーの高さを調整
    const header = document.querySelector('header');
    if (header) {
        header.style.height = '40px';
    }
    
    // ステータスバーの高さ調整
    const statusBar = document.querySelector('.status-bar');
    if (statusBar) {
        statusBar.style.height = '20px';
    }
});