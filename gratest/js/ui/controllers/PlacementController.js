import { FLEET, ORIENTATION } from "../../state/constants.js";
import { on } from "../../utils/dom.js";
import { canPlaceShip, computeShipCells } from "../../state/placement.js";
import { placeShip } from "../../state/board.js";
import { generateRandomBoardWithRetries } from "../../state/randomFleet.js";
import { clearPreview, paintBoard, paintPreview } from "../renderBoard.js";
import { toast } from "../toast.js";
import { mpIsInRoom, mpReady } from "../../net/multiplayer.js";

export class PlacementController {
  constructor(game, { onStartBattle }) {
    this.game = game;
    this.onStartBattle = onStartBattle;
    this.unsubs = [];
    this.waitingForBattleStart = false;

    this.refresh();
    this.bind();
  }

  dispose() {
    for (const u of this.unsubs) u();
    this.unsubs.length = 0;
  }

  bind() {
    const { shipPicker, orientationPicker, btnStart, btnRandomize } = this.game.ui;

    if (this.game.mode === "multi" && this.game.multiplayer) {
      const mp = this.game.multiplayer;
      this.unsubs.push(
        mp.ws.on("battleStart", (m) => {
          if (this.game.phase !== "placement") return;
          if (!mpIsInRoom(mp)) return;

          this.waitingForBattleStart = false;
          this.game.phase = "battle";

          const starterId = mp.battleStarterId || m?.starterId;
          this.game.turn = starterId && starterId === mp.myId ? "player" : "enemy";

          this.game.ui.placementToolbar.style.display = "none";
          this.game.ui.subtitle.textContent = "Walka";
          this.game.ui.status.textContent =
            this.game.turn === "player" ? "Twoja tura" : "Tura przeciwnika";
          this.onStartBattle?.();
        })
      );

      this.unsubs.push(
        mp.ws.on("roomClosed", () => {
          this.waitingForBattleStart = false;
          if (this.game.phase === "placement") {
            this.game.ui.status.textContent = "Rozłączono. Tryb solo.";
          }
          this.refresh();
        })
      );
    }

    this.unsubs.push(
      on(shipPicker, "click", (e) => {
        const t = e.target;
        if (!(t instanceof HTMLElement)) return;
        const idx = t.dataset.shipIndex;
        if (idx === undefined) return;
        this.game.placement.currentShipIndex = Number(idx);
        this.refresh();
      })
    );

    this.unsubs.push(
      on(orientationPicker, "click", (e) => {
        const t = e.target;
        if (!(t instanceof HTMLElement)) return;
        const o = t.dataset.orientation;
        if (!o) return;
        this.game.orientation = o;
        this.refresh();
      })
    );

    this.unsubs.push(
      on(document, "keydown", (e) => {
        if (this.game.phase !== "placement") return;
        const key = String(e.key || "");
        const lower = key.toLowerCase();
        const isRotate = lower === "r" || key === " " || e.code === "Space";

        if (isRotate) {
          if (key === " " || e.code === "Space") e.preventDefault();
          this.game.orientation =
            this.game.orientation === ORIENTATION.H ? ORIENTATION.V : ORIENTATION.H;
          this.refresh();
        }
      })
    );

    this.unsubs.push(
      on(btnRandomize, "click", () => {
        this.game.player.board = generateRandomBoardWithRetries();
        this.game.player.ready = true;
        this.game.placement.currentShipIndex = FLEET.length - 1;
        this.refresh();
        toast("Wylosowano ustawienie");
      })
    );

    this.unsubs.push(
      on(btnStart, "click", () => {
        if (!this.game.player.ready) return;

        if (this.game.mode === "multi" && this.game.multiplayer && mpIsInRoom(this.game.multiplayer)) {
          this.waitingForBattleStart = true;
          mpReady(this.game.multiplayer);
          this.game.ui.status.textContent = "Czekanie na przeciwnika...";
          this.refresh();
          return;
        }

        this.game.phase = "battle";
        this.game.turn = "player";
        this.game.ui.placementToolbar.style.display = "none";
        this.game.ui.subtitle.textContent = "Walka";
        this.game.ui.status.textContent = "Twoja tura";
        this.onStartBattle?.();
      })
    );

    const { playerBoardEl, playerCells } = this.game.ui;

    this.unsubs.push(
      on(playerBoardEl, "mousemove", (e) => {
        if (this.game.phase !== "placement") return;
        const t = e.target;
        if (!(t instanceof HTMLElement)) return;
        const idxRaw = t.dataset.idx;
        if (!idxRaw) return;

        const anchor = Number(idxRaw);
        const len = FLEET[this.game.placement.currentShipIndex];
        const cells = computeShipCells(anchor, len, this.game.orientation);
        const ok = canPlaceShip(this.game.player.board, cells);

        clearPreview(playerCells);
        paintPreview(playerCells, cells, ok);
      })
    );

    this.unsubs.push(
      on(playerBoardEl, "mouseleave", () => {
        clearPreview(playerCells);
      })
    );

    this.unsubs.push(
      on(playerBoardEl, "click", (e) => {
        if (this.game.phase !== "placement") return;
        const t = e.target;
        if (!(t instanceof HTMLElement)) return;
        const idxRaw = t.dataset.idx;
        if (!idxRaw) return;

        const anchor = Number(idxRaw);
        const len = FLEET[this.game.placement.currentShipIndex];
        const used = countPlacedShipsOfLength(this.game.player.board, len);
        const total = countFleetOfLength(len);
        if (used >= total) {
          toast("Limit statków tego rozmiaru został już wykorzystany");
          return;
        }
        const cells = computeShipCells(anchor, len, this.game.orientation);
        const ok = canPlaceShip(this.game.player.board, cells);
        if (!ok) {
          toast("Nie można tu postawić");
          return;
        }

        placeShip(this.game.player.board, cells);

        const next = findNextUnplacedShipIndex(this.game);
        if (next === null) {
          this.game.player.ready = true;
          toast("Flota gotowa");
        } else {
          this.game.placement.currentShipIndex = next;
        }

        this.refresh();
      })
    );
  }

  refresh() {
    const { shipPicker, orientationPicker, btnStart, playerBoardEl } = this.game.ui;

    for (const node of Array.from(shipPicker.children)) {
      node.classList.toggle(
        "chip--active",
        Number(node.dataset.shipIndex) === this.game.placement.currentShipIndex
      );

      const shipIndex = Number(node.dataset.shipIndex);
      const len = FLEET[shipIndex];
      const used = countPlacedShipsOfLength(this.game.player.board, len);
      const total = countFleetOfLength(len);
      node.classList.toggle("cell--locked", used >= total);
      node.disabled = used >= total;
    }

    for (const node of Array.from(orientationPicker.children)) {
      node.classList.toggle("chip--active", node.dataset.orientation === this.game.orientation);
    }

    paintBoard({ board: this.game.player.board, cells: this.game.ui.playerCells, showShips: true });

    playerBoardEl.classList.toggle("board--interactive", this.game.phase === "placement");
    playerBoardEl.classList.toggle("board--placement", this.game.phase === "placement");

    btnStart.disabled = !this.game.player.ready || this.waitingForBattleStart;

    const left = summarizeRemaining(this.game);
    this.game.ui.playerMeta.textContent = left;

    this.game.ui.placementHint.textContent =
      this.game.player.ready
        ? this.waitingForBattleStart
          ? "Wysłano gotowość. Czekanie na start."
          : "Gotowe. Kliknij Start."
        : "Kliknij na planszę, aby rozstawić. Skrót: R / Spacja — obrót.";
  }
}

function countFleetOfLength(len) {
  let n = 0;
  for (const x of FLEET) if (x === len) n++;
  return n;
}

function countPlacedShipsOfLength(board, len) {
  let n = 0;
  for (const s of board.ships) if (s.cells.length === len) n++;
  return n;
}

function findNextUnplacedShipIndex(game) {
  for (let i = 0; i < FLEET.length; i++) {
    const len = FLEET[i];
    const used = countPlacedShipsOfLength(game.player.board, len);
    const total = countFleetOfLength(len);
    if (used < total) return i;
  }
  return null;
}

function summarizeRemaining(game) {
  const parts = [];
  const counted = new Map();
  for (const len of FLEET) counted.set(len, (counted.get(len) || 0) + 1);

  const placed = new Map();
  for (const s of game.player.board.ships) {
    const len = s.cells.length;
    placed.set(len, (placed.get(len) || 0) + 1);
  }

  const lens = Array.from(counted.keys()).sort((a, b) => b - a);
  for (const len of lens) {
    const left = (counted.get(len) || 0) - (placed.get(len) || 0);
    parts.push(`${len}×${Math.max(0, left)}`);
  }
  return `Pozostało: ${parts.join("  ")}`;
}
