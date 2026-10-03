(() => {
  const STYLE_ID = "ccfolia-chat-avatar-size-style";
  const DEFAULT_SIZE = 80;

  function getStyleElement() {
    let style = document.getElementById(STYLE_ID);
    if (!style) {
      style = document.createElement("style");
      style.id = STYLE_ID;
      document.head.appendChild(style);
    }
    return style;
  }

  function applySize(size) {
    const style = getStyleElement();

    // 0 = ココフォリア標準。CSSを空にして完全に元の表示へ戻す。
    if (!size || size === 0) {
      style.textContent = "";
      document.documentElement.removeAttribute("data-ccfolia-chat-avatar-size");
      return;
    }

    const gap = 16;
    const avatarColumn = size + gap;

    style.textContent = `
      /* ココフォリアの「ルームチャット」にある発言者アイコンだけを対象にする */
      ul[aria-label="ルームチャット"] .MuiListItemAvatar-root {
        min-width: ${avatarColumn}px !important;
        width: ${avatarColumn}px !important;
        overflow: visible !important;
      }

      ul[aria-label="ルームチャット"] .MuiListItemAvatar-root > div {
        width: ${size}px !important;
        height: ${size}px !important;
        min-width: ${size}px !important;
        min-height: ${size}px !important;
        overflow: visible !important;
      }

      ul[aria-label="ルームチャット"] .MuiListItemAvatar-root > div > .MuiAvatar-root {
        width: ${size}px !important;
        height: ${size}px !important;
        min-width: ${size}px !important;
        min-height: ${size}px !important;
      }

      ul[aria-label="ルームチャット"] img[alt="avatar"] {
        width: 100% !important;
        height: 100% !important;
        object-fit: cover !important;
      }
    `;

    document.documentElement.setAttribute("data-ccfolia-chat-avatar-size", String(size));
  }

  chrome.storage.local.get({ avatarSize: DEFAULT_SIZE }, ({ avatarSize }) => {
    applySize(Number(avatarSize));
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local" && changes.avatarSize) {
      applySize(Number(changes.avatarSize.newValue));
    }
  });
})();
