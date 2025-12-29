import { BOARD_SIZE, SHOT } from "../state/constants.js";
import { el } from "../utils/dom.js";
import { isShipAt, getShot } from "../state/board.js";

export function renderBoardGrid(root) {
  root.innerHTML = "";
  const cells = [];
  for (let i = 0; i < BOARD_SIZE * BOARD_SIZE; i++) {
    const cell = el("button", "cell", {
      type: "button",
      "data-idx": i,
      "aria-label": `Pole ${i}`,
    });
    cells.push(cell);
    root.appendChild(cell);
  }
  return cells;
}

export function paintBoard({ board, cells, showShips }) {
  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    cell.classList.toggle("cell--ship", showShips && isShipAt(board, i));

    const shot = getShot(board, i);
    cell.classList.toggle("cell--miss", shot === SHOT.MISS);
    cell.classList.toggle("cell--hit", shot === SHOT.HIT);
    cell.classList.toggle("cell--sunk", shot === SHOT.SUNK);
  }
}

export function clearPreview(cells) {
  for (const c of cells) {
    c.classList.remove("cell--preview-ok");
    c.classList.remove("cell--preview-bad");
  }
}

export function paintPreview(cells, indexes, ok) {
  if (!indexes) return;
  for (const idx of indexes) {
    const c = cells[idx];
    if (!c) continue;
    c.classList.toggle("cell--preview-ok", !!ok);
    c.classList.toggle("cell--preview-bad", !ok);
  }
}
