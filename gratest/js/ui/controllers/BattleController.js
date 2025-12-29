import { on } from "../../utils/dom.js";
import { applyShot } from "../../state/board.js";
import { paintBoard } from "../renderBoard.js";
import { aiPickShot, aiOnShotResult } from "../../ai/enemyAI.js";
import { toast } from "../toast.js";
import { mpIsInRoom, mpSendShot, mpSendShotResultWithUpdates } from "../../net/multiplayer.js";

export class BattleController {
  constructor(game, { onFinished } = {}) {
    this.game = game;
    this.onFinished = onFinished;
    this.unsubs = [];
    this.busy = false;
    this.disposed = false;
    this.waitingForRemoteResult = false;

    this.refresh();
    this.bind();
  }

  dispose() {
    this.disposed = true;
    for (const u of this.unsubs) u();
    this.unsubs.length = 0;
  }

  bind() {
    const { enemyBoardEl } = this.game.ui;

    if (this.game.mode === "multi" && this.game.multiplayer) {
      const mp = this.game.multiplayer;

      this.unsubs.push(
        mp.ws.on("incomingShot", (m) => {
          if (this.disposed) return;
          if (!mpIsInRoom(mp)) return;
          if (this.game.phase !== "battle") return;

          const idx = Number(m.idx);
          if (!Number.isFinite(idx)) return;

          const res = applyShot(this.game.player.board, idx);
          if (!res.ok) return;

          const updates = computeDefenderUpdates(this.game.player.board, idx, res);
          mpSendShotResultWithUpdates(mp, m.fromId, idx, res.result, res.win, updates);

          this.refresh();

          if (res.win) {
            this.finish("Przegrałeś!");
            return;
          }

          if (res.result === "miss") {
            this.game.turn = "player";
            this.game.ui.status.textContent = "Twoja tura";
          } else {
            this.game.turn = "enemy";
            this.game.ui.status.textContent = "Tura przeciwnika";
          }
        })
      );

      this.unsubs.push(
        mp.ws.on("shotResult", (m) => {
          if (this.disposed) return;
          if (!mpIsInRoom(mp)) return;
          if (this.game.phase !== "battle") return;

          this.waitingForRemoteResult = false;

          const updates = Array.isArray(m.updates) ? m.updates : [];
          for (const u of updates) {
            const idx = Number(u.idx);
            const shot = u.shot;
            if (!Number.isFinite(idx)) continue;
            if (shot === null || shot === undefined) continue;
            this.game.enemy.board.shots[idx] = shot;
          }

          if (m.result === "sunk") {
            if (typeof this.game.enemyShipsLeft === "number") {
              this.game.enemyShipsLeft = Math.max(0, this.game.enemyShipsLeft - 1);
            }
          }

          this.refresh();

          if (m.win) {
            this.finish("Wygrałeś!");
            return;
          }

          if (m.result === "miss") {
            this.game.turn = "enemy";
            this.game.ui.status.textContent = "Tura przeciwnika";
          } else {
            this.game.turn = "player";
            this.game.ui.status.textContent =
              m.result === "hit" ? "Trafienie! Strzelasz dalej." : "Zatopiony! Strzelasz dalej.";
          }
        })
      );
    }

    this.unsubs.push(
      on(enemyBoardEl, "click", async (e) => {
        if (this.busy) return;
        if (this.game.phase !== "battle") return;
        if (this.game.turn !== "player") return;
        if (this.game.mode === "multi" && this.waitingForRemoteResult) return;

        const t = e.target;
        if (!(t instanceof HTMLElement)) return;
        const idxRaw = t.dataset.idx;
        if (!idxRaw) return;

        const idx = Number(idxRaw);
        if (this.game.mode === "multi" && this.game.multiplayer && mpIsInRoom(this.game.multiplayer)) {
          mpSendShot(this.game.multiplayer, idx);
          this.waitingForRemoteResult = true;
          this.game.ui.status.textContent = "Strzał wysłany...";
          return;
        }

        await this.playerShot(idx);
      })
    );
  }

  async playerShot(idx) {
    if (this.disposed) return;
    const res = applyShot(this.game.enemy.board, idx);
    if (!res.ok) {
      toast(res.error);
      return;
    }

    this.refresh();

    if (res.result === "miss") {
      this.game.turn = "enemy";
      this.game.ui.status.textContent = "Tura przeciwnika";
      await wait(420);
      if (this.disposed) return;
      await this.enemyTurn();
      return;
    }

    if (res.result === "hit") {
      this.game.ui.status.textContent = "Trafienie! Strzelasz dalej.";
    }

    if (res.result === "sunk") {
      this.game.ui.status.textContent = "Zatopiony! Strzelasz dalej.";
    }

    if (res.win) {
      this.finish("Wygrałeś!");
    }
  }

  async enemyTurn() {
    if (this.disposed) return;
    if (this.game.mode !== "solo") return;
    this.busy = true;

    while (!this.disposed && this.game.turn === "enemy" && this.game.phase === "battle") {
      const idx = aiPickShot(this.game.ai, this.game.player.board);
      if (idx === null) {
        this.finish("Koniec (brak ruchów AI)");
        break;
      }

      const res = applyShot(this.game.player.board, idx);
      if (!res.ok) {
        this.finish("Błąd AI");
        break;
      }

      aiOnShotResult(this.game.ai, idx, res.result);
      if (this.disposed) break;
      this.refresh();

      if (res.win) {
        this.finish("Przegrałeś!");
        break;
      }

      if (res.result === "miss") {
        this.game.turn = "player";
        this.game.ui.status.textContent = "Twoja tura";
        break;
      }

      await wait(380);
    }

    this.busy = false;
  }

  finish(message) {
    if (this.disposed) return;
    this.game.phase = "finished";
    this.game.ui.status.textContent = message;
    toast(message, 1800);
    this.onFinished?.(message);
  }

  refresh() {
    if (this.disposed) return;
    paintBoard({ board: this.game.player.board, cells: this.game.ui.playerCells, showShips: true });
    paintBoard({ board: this.game.enemy.board, cells: this.game.ui.enemyCells, showShips: false });

    const pLeft = countUnsunkShips(this.game.player.board);
    const eLeft =
      this.game.mode === "multi" && typeof this.game.enemyShipsLeft === "number"
        ? this.game.enemyShipsLeft
        : countUnsunkShips(this.game.enemy.board);

    this.game.ui.playerMeta.textContent = `Statków: ${pLeft}`;
    this.game.ui.enemyMeta.textContent = `Statków: ${eLeft}`;
  }
}

function computeDefenderUpdates(board, idx, res) {
  if (res.result !== "sunk") {
    return [{ idx, shot: board.shots[idx] }];
  }

  const set = new Set();
  for (const c of res.ship?.cells || []) {
    set.add(c);
    const x = c % 10;
    const y = Math.floor(c / 10);
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= 10 || ny >= 10) continue;
        set.add(ny * 10 + nx);
      }
    }
  }

  const out = [];
  for (const i of set) {
    const shot = board.shots[i];
    if (shot === null) continue;
    out.push({ idx: i, shot });
  }
  return out;
}

function countUnsunkShips(board) {
  let n = 0;
  for (const s of board.ships) if (!s.sunk) n++;
  return n;
}

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
