const DEFAULT_SIZE = 80;
const current = document.getElementById("current");
const quickToggle = document.getElementById("quickToggle");
const sizeButtons = [...document.querySelectorAll("[data-size]")];

function label(size) {
  return Number(size) === 0 ? "標準" : `${size}px`;
}

function render(size) {
  current.textContent = `現在：${label(size)}`;
  sizeButtons.forEach((button) => {
    button.classList.toggle("active", Number(button.dataset.size) === Number(size));
  });
}

async function setSize(size) {
  await chrome.storage.local.set({ avatarSize: Number(size) });
  render(Number(size));
}

chrome.storage.local.get({ avatarSize: DEFAULT_SIZE }, ({ avatarSize }) => {
  render(Number(avatarSize));
});

sizeButtons.forEach((button) => {
  button.addEventListener("click", () => setSize(Number(button.dataset.size)));
});

quickToggle.addEventListener("click", async () => {
  const { avatarSize } = await chrome.storage.local.get({ avatarSize: DEFAULT_SIZE });
  // 標準なら80px、拡大中なら標準へ。ログを一気に遡る時の切替用。
  await setSize(Number(avatarSize) === 0 ? 80 : 0);
});
