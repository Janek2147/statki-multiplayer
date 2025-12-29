import { FLEET, ORIENTATION } from "./constants.js";
import { createBoard } from "./board.js";
import { generateRandomBoardWithRetries } from "./randomFleet.js";
import { createEnemyAI } from "../ai/enemyAI.js";

export function createGame({ mode = "solo", multiplayer = null } = {}) {
  const player = {
    name: "Ty",
    board: createBoard(),
    ready: false,
  };

  const enemy =
    mode === "multi"
      ? {
          name: "Przeciwnik",
          board: createBoard(),
          ready: false,
        }
      : {
          name: "Przeciwnik",
          board: generateRandomBoardWithRetries(),
          ready: true,
        };

  return {
    mode,
    multiplayer,
    enemyShipsLeft: mode === "multi" ? FLEET.length : null,
    phase: "placement",
    turn: "player",
    orientation: ORIENTATION.H,
    fleet: FLEET.slice(),
    placement: {
      currentShipIndex: 0,
    },
    player,
    enemy,
    ai: mode === "solo" ? createEnemyAI() : null,
    lastEvent: null,
  };
}
