import { BOARD_SIZE } from "../state/constants.js";

export function toIndex(x, y) {
  return y * BOARD_SIZE + x;
}

export function toXY(index) {
  const x = index % BOARD_SIZE;
  const y = Math.floor(index / BOARD_SIZE);
  return { x, y };
}

export function inBounds(x, y) {
  return x >= 0 && y >= 0 && x < BOARD_SIZE && y < BOARD_SIZE;
}

export function neighbors4(index) {
  const { x, y } = toXY(index);
  const out = [];
  if (inBounds(x + 1, y)) out.push(toIndex(x + 1, y));
  if (inBounds(x - 1, y)) out.push(toIndex(x - 1, y));
  if (inBounds(x, y + 1)) out.push(toIndex(x, y + 1));
  if (inBounds(x, y - 1)) out.push(toIndex(x, y - 1));
  return out;
}
