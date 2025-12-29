import { createGame } from "./state/createGame.js";
import { renderStaticUI } from "./ui/renderStaticUI.js";
import { PlacementController } from "./ui/controllers/PlacementController.js";
import { BattleController } from "./ui/controllers/BattleController.js";
import { toast } from "./ui/toast.js";
import { createMultiplayer, mpConnect, mpIsInRoom, mpLeaveRoom } from "./net/multiplayer.js";
import { UsersPanel } from "./ui/usersPanel.js";
import { createOverlay } from "./ui/overlay.js";
import { mpOfferRematch } from "./net/multiplayer.js";

const app = document.getElementById("app");
const btnNew = document.getElementById("btnNew");

let game;
let placementController;
let battleController;

const mp = createMultiplayer();
mpConnect(mp);

const overlay = createOverlay();

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
      battleController = new BattleController(game, {
        onFinished: (msg) => {
          const inRoom = mpIsInRoom(mp);
          overlay.show({
            title: msg,
            body: inRoom
              ? "Chcesz zagrać rewanż z tym samym graczem?"
              : "Zagrać jeszcze raz?",
            actions: [
              {
                label: "Nowa gra",
                variant: "btn--primary",
                onClick: () => {
                  overlay.hide();
                  if (inRoom) mpLeaveRoom(mp);
                  startNewGame({ mode: "solo" });
                },
              },
              ...(inRoom
                ? [
                    {
                      label: "Rewanż",
                      onClick: () => {
                        overlay.hide();
                        mpOfferRematch(mp);
                      },
                    },
                  ]
                : []),
            ],
          });
        },
      });
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

mp.ws.on("rematchStart", () => {
  startNewGame({ mode: "multi" });
});

startNewGame({ mode: "solo" });

overlay.show({
  title: "Menu",
  body:
    "Tryb solo: rozstaw flotę i kliknij Start.\n\n" +
    "Multiplayer: ustaw nick, kliknij gracza na liście, wyślij zaproszenie i zagrajcie 1vs1.\n\n" +
    "Tip: po zatopieniu statku pola dookoła oznaczają się automatycznie.",
  actions: [
    {
      label: "Graj",
      variant: "btn--primary",
      onClick: () => overlay.hide(),
    },
  ],
});
