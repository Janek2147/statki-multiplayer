import { qs, el, on } from "../utils/dom.js";

export function createOverlay() {
  const root = qs("#overlay");
  const backdrop = qs(".overlay__backdrop");
  const titleEl = qs("#overlayTitle");
  const bodyEl = qs("#overlayBody");
  const actionsEl = qs("#overlayActions");
  const closeBtn = qs("#overlayClose");

  let unsubs = [];

  function clearActions() {
    for (const u of unsubs) u();
    unsubs = [];
    actionsEl.innerHTML = "";
  }

  function addActions(actions) {
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
  }

  function show({ title, body, bodyHtml, actions, dismissible = true }) {
    titleEl.textContent = title || "";
    if (bodyHtml) {
      bodyEl.innerHTML = bodyHtml;
    } else {
      bodyEl.textContent = body || "";
    }

    clearActions();

    addActions(actions);

    root.classList.add("overlay--show");
    root.setAttribute("aria-hidden", "false");

    closeBtn.style.display = dismissible ? "" : "none";
    closeBtn.disabled = !dismissible;

    if (dismissible) {
      unsubs.push(
        on(backdrop, "click", () => {
          hide();
        })
      );
      unsubs.push(
        on(closeBtn, "click", () => {
          hide();
        })
      );
      unsubs.push(
        on(document, "keydown", (e) => {
          if (String(e.key || "") === "Escape") {
            hide();
          }
        })
      );
    }
  }

  function hide() {
    clearActions();
    root.classList.remove("overlay--show");
    root.setAttribute("aria-hidden", "true");
  }

  return { show, hide };
}
