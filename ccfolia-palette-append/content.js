(() => {
  'use strict';

  const INPUT_SELECTOR =
    'textarea[name="text"][placeholder="メッセージを入力"]';

  let enabled = true;

  chrome.storage.local.get({ enabled: true }, (result) => {
    enabled = result.enabled;
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes.enabled) {
      enabled = changes.enabled.newValue;
    }
  });

  function setReactTextareaValue(textarea, value) {
    const descriptor = Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      'value'
    );

    if (descriptor && descriptor.set) {
      descriptor.set.call(textarea, value);
    } else {
      textarea.value = value;
    }

    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    textarea.dispatchEvent(new Event('change', { bubbles: true }));

    textarea.focus();
    try {
      textarea.setSelectionRange(value.length, value.length);
    } catch (_) {}
  }

  function getPaletteText(button) {
    const textEl = button.querySelector('.MuiListItemText-primary');
    if (!textEl) return '';
    return (textEl.textContent || '').trim();
  }

  function isPaletteButton(button) {
    if (!button) return false;

    if (
      !button.classList.contains('MuiListItemButton-root') ||
      button.getAttribute('role') !== 'button'
    ) {
      return false;
    }

    return Boolean(button.closest('ul.MuiList-root'));
  }

  document.addEventListener(
    'click',
    (event) => {
      if (!enabled) return;
      if (!(event.target instanceof Element)) return;

      const button = event.target.closest('[role="button"]');
      if (!isPaletteButton(button)) return;

      const paletteText = getPaletteText(button);

      // @から始まる項目だけ拡張側で追記処理。
      if (!paletteText.startsWith('@')) return;

      const textarea = document.querySelector(INPUT_SELECTOR);
      if (!(textarea instanceof HTMLTextAreaElement)) return;

      // ココフォリア標準の「入力欄を置換する」処理より先に止める。
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      let current = textarea.value || '';

      // 末尾に既存の @ラベル がある場合は差し替える。
      current = current.replace(/\s*@[^\s]+\s*$/, '');

      const newValue =
        current.length === 0
          ? paletteText
          : current + (/\s$/.test(current) ? '' : ' ') + paletteText;

      setReactTextareaValue(textarea, newValue);
    },
    true
  );
})();
