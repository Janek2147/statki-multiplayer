import { neighbors4 } from "../utils/coord.js";
import { randInt, shuffleInPlace } from "../utils/rng.js";

export function createEnemyAI() {
  return {
    queue: [],
    tried: new Set(),
  };
}

export function aiPickShot(ai, board) {
  while (ai.queue.length > 0) {
    const idx = ai.queue.shift();
    if (!ai.tried.has(idx) && board.shots[idx] === null) return idx;
  }

  const candidates = [];
  for (let i = 0; i < board.shots.length; i++) {
    if (board.shots[i] === null) candidates.push(i);
  }

  if (candidates.length === 0) return null;
  return candidates[randInt(candidates.length)];
}

export function aiOnShotResult(ai, index, shotResult) {
  ai.tried.add(index);

  if (shotResult === "hit") {
    const n = neighbors4(index);
    shuffleInPlace(n);
    for (const c of n) ai.queue.push(c);
  }

  if (shotResult === "sunk") {
    ai.queue.length = 0;
  }
}
