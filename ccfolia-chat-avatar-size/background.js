const DEFAULT_SIZE = 80;

function badgeText(size) {
  return Number(size) === 0 ? "STD" : String(size);
}

async function updateBadge(size) {
  await chrome.action.setBadgeText({ text: badgeText(size) });
}

chrome.runtime.onInstalled.addListener(async () => {
  const { avatarSize } = await chrome.storage.local.get({ avatarSize: DEFAULT_SIZE });
  if (avatarSize === undefined) {
    await chrome.storage.local.set({ avatarSize: DEFAULT_SIZE });
  }
  await updateBadge(avatarSize ?? DEFAULT_SIZE);
});

chrome.runtime.onStartup.addListener(async () => {
  const { avatarSize } = await chrome.storage.local.get({ avatarSize: DEFAULT_SIZE });
  await updateBadge(avatarSize);
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && changes.avatarSize) {
    updateBadge(changes.avatarSize.newValue);
  }
});
