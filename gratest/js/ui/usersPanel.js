import { el, on } from "../utils/dom.js";
import { mpInvite, mpSetNick, mpIsInRoom } from "../net/multiplayer.js";

export class UsersPanel {
  constructor(mp, root, { onNickChanged } = {}) {
    this.mp = mp;
    this.root = root;
    this.onNickChanged = onNickChanged;
    this.unsubs = [];

    this.nickInput = el("input", "input", { type: "text", placeholder: "Nick" });
    this.btnNick = el("button", "btn", { type: "button", text: "Ustaw" });
    this.list = el("div", "userlist");

    const row = el("div", "userpanel__row");
    row.appendChild(this.nickInput);
    row.appendChild(this.btnNick);

    this.root.appendChild(row);
    this.root.appendChild(this.list);

    this.unsubs.push(
      on(this.btnNick, "click", () => {
        const nick = this.nickInput.value.trim();
        if (!nick) return;
        mpSetNick(this.mp, nick);
        this.onNickChanged?.(nick);
      })
    );

    this.unsubs.push(
      on(this.list, "click", (e) => {
        const t = e.target;
        if (!(t instanceof HTMLElement)) return;
        const id = t.dataset.userId;
        if (!id) return;
        if (mpIsInRoom(this.mp)) return;
        mpInvite(this.mp, id);
      })
    );

    this.render();
  }

  dispose() {
    for (const u of this.unsubs) u();
    this.unsubs.length = 0;
  }

  render() {
    this.list.innerHTML = "";

    const myId = this.mp.myId;
    const users = Array.isArray(this.mp.users) ? this.mp.users : [];

    for (const u of users) {
      if (!u || !u.id) continue;
      if (u.id === myId) continue;

      const item = el("button", "user", {
        type: "button",
        text: `${u.nick || "Guest"}${u.inRoom ? " (w grze)" : ""}`,
      });
      item.dataset.userId = u.id;
      item.disabled = !!u.inRoom || mpIsInRoom(this.mp);
      this.list.appendChild(item);
    }

    if (users.filter((u) => u.id !== myId).length === 0) {
      const empty = el("div", "userlist__empty", { text: "Brak innych online" });
      this.list.appendChild(empty);
    }
  }
}
