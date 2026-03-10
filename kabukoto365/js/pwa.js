// Service Workerをサポートするかチェック
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('Service Workerが登録されました：', registration.scope);
      })
      .catch(error => {
        console.error('Service Worker登録エラー:', error);
      });
  });
}

// インストールバナーを表示するかどうかを追跡するための変数
let deferredPrompt;

// beforeinstallpromptイベントをキャプチャ
window.addEventListener('beforeinstallprompt', (e) => {
  // デフォルトのプロンプト表示を防止
  e.preventDefault();
  // イベントを保存
  deferredPrompt = e;
  
  // 必要に応じてインストールを促すUIを表示
  // ここでは5秒後に自動的にインストールプロンプトを表示する例
  setTimeout(() => {
    showInstallPrompt();
  }, 5000);
});

// インストールプロンプトを表示する関数
function showInstallPrompt() {
  if (!deferredPrompt) {
    return;
  }
  
  // 簡易的なインストールバナーを作成
  const installBanner = document.createElement('div');
  installBanner.className = 'install-banner';
  installBanner.innerHTML = `
    <div class="install-message">
      <p>「かぶこと365」をホーム画面に追加しませんか？</p>
      <div class="install-buttons">
        <button id="install-yes">はい</button>
        <button id="install-no">あとで</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(installBanner);
  
  // インストールイベントリスナーを追加
  document.getElementById('install-yes').addEventListener('click', () => {
    // プロンプトを表示
    deferredPrompt.prompt();
    
    // ユーザーの応答を待つ
    deferredPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('ユーザーがPWAのインストールを承認しました');
      } else {
        console.log('ユーザーがPWAのインストールを拒否しました');
      }
      // プロンプトは一度しか使用できないのでリセット
      deferredPrompt = null;
      
      // バナーを削除
      installBanner.remove();
    });
  });
  
  // 「あとで」ボタン
  document.getElementById('install-no').addEventListener('click', () => {
    installBanner.remove();
    
    // 24時間後に再表示するためにフラグを保存
    localStorage.setItem('installPromptDismissed', Date.now().toString());
  });
  
  // 以前に「あとで」を選択した場合、24時間は表示しない
  const lastDismissed = localStorage.getItem('installPromptDismissed');
  if (lastDismissed) {
    const hoursSinceDismissed = (Date.now() - parseInt(lastDismissed)) / (1000 * 60 * 60);
    if (hoursSinceDismissed < 24) {
      installBanner.remove();
    }
  }
}