let hideTimer = null;

export function toast(message, ms = 1400) {
  const node = document.getElementById("toast");
  if (!node) return;

  node.textContent = String(message);
  node.classList.add("toast--show");

  if (hideTimer) window.clearTimeout(hideTimer);
  hideTimer = window.setTimeout(() => {
    node.classList.remove("toast--show");
    hideTimer = null;
  }, ms);
}
