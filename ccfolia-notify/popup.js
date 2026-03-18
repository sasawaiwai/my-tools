// popup.js

let audioCtx = null;

function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

function playPreview(type, volume) {
  const ctx = getAudioCtx();
  if (ctx.state === 'suspended') ctx.resume();

  const now = ctx.currentTime;
  const vol = volume / 100;

  const schedule = (freq, start, duration, oscType = 'sine') => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = oscType;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, now + start);
    gain.gain.exponentialRampToValueAtTime(0.001, now + start + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + start);
    osc.stop(now + start + duration + 0.05);
  };

  switch (type) {
    case 'beep1':
      schedule(880, 0, 0.15);
      break;
    case 'beep2':
      schedule(660, 0, 0.12);
      schedule(880, 0.18, 0.12);
      break;
    case 'beep3': {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.linearRampToValueAtTime(880, now + 0.25);
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.3);
      break;
    }
    case 'chime':
      schedule(523.25, 0, 0.5, 'triangle');
      schedule(659.25, 0.12, 0.5, 'triangle');
      schedule(783.99, 0.24, 0.5, 'triangle');
      break;
  }
}

// --- Elements ---
const els = {
  enabled: document.getElementById('enabled'),
  tabFilter: document.getElementById('tabFilter'),
  sound: document.getElementById('sound'),
  testSound: document.getElementById('testSound'),
  volume: document.getElementById('volume'),
  volumeVal: document.getElementById('volumeVal'),
  ignoreSelf: document.getElementById('ignoreSelf'),
  selfName: document.getElementById('selfName'),
  selfNameRow: document.getElementById('selfNameRow'),
  status: document.getElementById('status'),
};

// --- 設定読み込み ---
const defaults = {
  enabled: true,
  tabFilter: 'all',
  sound: 'beep1',
  volume: 70,
  ignoreSelf: false,
  selfName: '',
};

chrome.storage.sync.get(defaults, (stored) => {
  els.enabled.checked = stored.enabled;
  els.tabFilter.value = stored.tabFilter;
  els.sound.value = stored.sound;
  els.volume.value = stored.volume;
  els.volumeVal.textContent = stored.volume + '%';
  els.ignoreSelf.checked = stored.ignoreSelf;
  els.selfName.value = stored.selfName;
  els.selfNameRow.style.display = stored.ignoreSelf ? 'block' : 'none';
});

// --- 設定保存 ---
function saveSettings() {
  const data = {
    enabled: els.enabled.checked,
    tabFilter: els.tabFilter.value,
    sound: els.sound.value,
    volume: parseInt(els.volume.value),
    ignoreSelf: els.ignoreSelf.checked,
    selfName: els.selfName.value.trim(),
  };
  chrome.storage.sync.set(data, () => {
    els.status.textContent = '✓ 保存しました';
    setTimeout(() => { els.status.textContent = ''; }, 1500);
  });
}

// --- イベント ---
els.enabled.addEventListener('change', saveSettings);
els.tabFilter.addEventListener('change', saveSettings);
els.sound.addEventListener('change', saveSettings);

els.volume.addEventListener('input', () => {
  els.volumeVal.textContent = els.volume.value + '%';
  saveSettings();
});

els.ignoreSelf.addEventListener('change', () => {
  els.selfNameRow.style.display = els.ignoreSelf.checked ? 'block' : 'none';
  saveSettings();
});

els.selfName.addEventListener('input', saveSettings);

els.testSound.addEventListener('click', () => {
  playPreview(els.sound.value, parseInt(els.volume.value));
});
