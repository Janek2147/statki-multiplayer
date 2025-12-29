import { qs, el, on } from "../utils/dom.js";

export function createOverlay() {
  const root = qs("#overlay");
  const titleEl = qs("#overlayTitle");
  const bodyEl = qs("#overlayBody");
  const actionsEl = qs("#overlayActions");

  let unsubs = [];

  function clearActions() {
    for (const u of unsubs) u();
    unsubs = [];
    actionsEl.innerHTML = "";
  }

  function show({ title, body, actions }) {
    titleEl.textContent = title || "";
    bodyEl.textContent = body || "";

    clearActions();

    for (const a of actions || []) {
      const btn = el("button", `btn ${a.variant || ""}`.trim(), {
        type: "button",
        text: a.label,
      });
      actionsEl.appendChild(btn);
      unsubs.push(
        on(btn, "click", () => {
          a.onClick?.();
        })
      );
    }

    root.classList.add("overlay--show");
    root.setAttribute("aria-hidden", "false");
  }

  function hide() {
    clearActions();
    root.classList.remove("overlay--show");
    root.setAttribute("aria-hidden", "true");
  }

  return { show, hide };
}
