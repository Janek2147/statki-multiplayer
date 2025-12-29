import { createGame } from "./state/createGame.js";
import { renderStaticUI } from "./ui/renderStaticUI.js";
import { PlacementController } from "./ui/controllers/PlacementController.js";
import { BattleController } from "./ui/controllers/BattleController.js";
import { toast } from "./ui/toast.js";
import { createMultiplayer, mpConnect, mpIsInRoom, mpLeaveRoom } from "./net/multiplayer.js";
import { UsersPanel } from "./ui/usersPanel.js";

const app = document.getElementById("app");
const btnNew = document.getElementById("btnNew");

let game;
let placementController;
let battleController;

const mp = createMultiplayer();
mpConnect(mp);

let usersPanel;
let unsubPresence;

function disposeControllers() {
  if (placementController) placementController.dispose();
  if (battleController) battleController.dispose();
  placementController = null;
  battleController = null;
}

function startNewGame({ mode = "solo" } = {}) {
  disposeControllers();

  game = createGame({ mode, multiplayer: mp });
  if (mode === "multi" && mp.room) {
    game.enemy.name = mp.room.opponentNick || "Przeciwnik";
  }
  renderStaticUI(game);

  if (!usersPanel) {
    usersPanel = new UsersPanel(mp, game.ui.usersPanel);
    if (unsubPresence) unsubPresence();
    unsubPresence = mp.ws.on("presence", () => usersPanel.render());
  } else {
    usersPanel.root = game.ui.usersPanel;
    usersPanel.root.innerHTML = "";
    usersPanel.dispose();
    usersPanel = new UsersPanel(mp, game.ui.usersPanel);
    if (unsubPresence) unsubPresence();
    unsubPresence = mp.ws.on("presence", () => usersPanel.render());
  }

  game.ui.netMeta.textContent = mpIsInRoom(mp)
    ? `W grze z: ${mp.room?.opponentNick || "?"}`
    : "Kliknij użytkownika, aby zaprosić";

  placementController = new PlacementController(game, {
    onStartBattle: () => {
      placementController.dispose();
      placementController = null;
      battleController = new BattleController(game);
      toast("Powodzenia! Atakuj planszę przeciwnika.");
    },
  });
}

btnNew.addEventListener("click", () => {
  if (mpIsInRoom(mp)) {
    mpLeaveRoom(mp);
  }
  startNewGame({ mode: "solo" });
  toast("Nowa gra");
});

if (!app) {
  throw new Error("Brak elementu #app");
}

mp.ws.on("roomStart", () => {
  startNewGame({ mode: "multi" });
});

startNewGame({ mode: "solo" });
