const toggle = document.getElementById('enabledToggle');
const statusText = document.getElementById('statusText');

function render(enabled) {
  toggle.checked = enabled;
  statusText.textContent = enabled ? 'ON' : 'OFF';
}

chrome.storage.local.get({ enabled: true }, (result) => {
  render(result.enabled);
});

toggle.addEventListener('change', () => {
  const enabled = toggle.checked;
  chrome.storage.local.set({ enabled }, () => {
    render(enabled);
  });
});
