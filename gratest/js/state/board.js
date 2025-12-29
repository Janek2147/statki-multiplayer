import { BOARD_SIZE, CELL_COUNT, SHOT } from "./constants.js";

function inBounds(x, y) {
  return x >= 0 && y >= 0 && x < BOARD_SIZE && y < BOARD_SIZE;
}

function toIndex(x, y) {
  return y * BOARD_SIZE + x;
}

function toXY(index) {
  const x = index % BOARD_SIZE;
  const y = Math.floor(index / BOARD_SIZE);
  return { x, y };
}

function around8(index) {
  const { x, y } = toXY(index);
  const out = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx;
      const ny = y + dy;
      if (!inBounds(nx, ny)) continue;
      out.push(toIndex(nx, ny));
    }
  }
  return out;
}

export function createBoard() {
  return {
    ships: [],
    shipCellToShipId: new Array(CELL_COUNT).fill(-1),
    shots: new Array(CELL_COUNT).fill(null),
    remainingShipCells: 0,
  };
}

export function hasShotAt(board, index) {
  return board.shots[index] !== null;
}

export function getShot(board, index) {
  return board.shots[index];
}

export function isShipAt(board, index) {
  return board.shipCellToShipId[index] !== -1;
}

export function getShipAt(board, index) {
  const id = board.shipCellToShipId[index];
  if (id === -1) return null;
  return board.ships[id] || null;
}

export function placeShip(board, cells) {
  const shipId = board.ships.length;
  const ship = {
    id: shipId,
    cells: cells.slice(),
    hits: 0,
    sunk: false,
  };

  board.ships.push(ship);
  for (const idx of cells) {
    board.shipCellToShipId[idx] = shipId;
  }
  board.remainingShipCells += cells.length;
  return ship;
}

export function applyShot(board, index) {
  if (board.shots[index] !== null) {
    return { ok: false, error: "Pole już ostrzelane" };
  }

  const shipId = board.shipCellToShipId[index];
  if (shipId === -1) {
    board.shots[index] = SHOT.MISS;
    return { ok: true, result: SHOT.MISS, ship: null, win: false };
  }

  const ship = board.ships[shipId];
  ship.hits += 1;
  board.remainingShipCells -= 1;

  if (ship.hits >= ship.cells.length) {
    ship.sunk = true;
    for (const c of ship.cells) {
      board.shots[c] = SHOT.SUNK;
    }

    for (const c of ship.cells) {
      for (const n of around8(c)) {
        if (board.shipCellToShipId[n] !== -1) continue;
        if (board.shots[n] !== null) continue;
        board.shots[n] = SHOT.MISS;
      }
    }
    const win = board.remainingShipCells === 0;
    return { ok: true, result: SHOT.SUNK, ship, win };
  }

  board.shots[index] = SHOT.HIT;
  return { ok: true, result: SHOT.HIT, ship, win: false };
}
