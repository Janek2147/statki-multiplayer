import { FLEET, ORIENTATION, BOARD_SIZE } from "./constants.js";
import { createBoard, placeShip } from "./board.js";
import { canPlaceShip, computeShipCells } from "./placement.js";
import { randInt, shuffleInPlace } from "../utils/rng.js";

export function generateRandomBoard() {
  const board = createBoard();

  for (const len of FLEET) {
    let placed = false;
    for (let tries = 0; tries < 2000 && !placed; tries++) {
      const orientation = randInt(2) === 0 ? ORIENTATION.H : ORIENTATION.V;
      const x = randInt(BOARD_SIZE);
      const y = randInt(BOARD_SIZE);
      const anchor = y * BOARD_SIZE + x;
      const cells = computeShipCells(anchor, len, orientation);
      if (!cells) continue;
      if (!canPlaceShip(board, cells)) continue;
      placeShip(board, cells);
      placed = true;
    }
    if (!placed) return null;
  }

  return board;
}

export function generateRandomBoardWithRetries() {
  for (let i = 0; i < 300; i++) {
    const b = generateRandomBoard();
    if (b) return b;
  }
  throw new Error("Nie udało się wylosować ustawienia floty");
}

export function fleetRemaining(board) {
  const sizes = board.ships.map((s) => s.cells.length);
  const left = new Map();
  for (const len of FLEET) left.set(len, (left.get(len) || 0) + 1);
  for (const size of sizes) left.set(size, (left.get(size) || 0) - 1);

  const out = [];
  for (const len of shuffleInPlace(Array.from(left.keys()).sort((a, b) => b - a))) {
    const n = left.get(len);
    if (n > 0) out.push({ len, count: n });
  }
  return out;
}
