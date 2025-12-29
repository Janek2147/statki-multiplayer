import { BOARD_SIZE, ORIENTATION } from "./constants.js";
import { inBounds, toIndex } from "../utils/coord.js";

function around(index) {
  const x = index % BOARD_SIZE;
  const y = Math.floor(index / BOARD_SIZE);
  const out = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx;
      const ny = y + dy;
      if (inBounds(nx, ny)) out.push(toIndex(nx, ny));
    }
  }
  return out;
}

export function computeShipCells(anchorIndex, length, orientation) {
  const ax = anchorIndex % BOARD_SIZE;
  const ay = Math.floor(anchorIndex / BOARD_SIZE);

  const cells = [];
  for (let i = 0; i < length; i++) {
    const x = orientation === ORIENTATION.H ? ax + i : ax;
    const y = orientation === ORIENTATION.V ? ay + i : ay;
    if (!inBounds(x, y)) return null;
    cells.push(toIndex(x, y));
  }
  return cells;
}

export function canPlaceShip(board, cells) {
  if (!cells || cells.length === 0) return false;

  for (const idx of cells) {
    for (const near of around(idx)) {
      if (board.shipCellToShipId[near] !== -1) return false;
    }
  }

  return true;
}
