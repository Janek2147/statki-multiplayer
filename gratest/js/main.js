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

const LS_NO_ANIM = "statki_no_anim";

function setAnimationsEnabled(enabled) {
  const noAnim = !enabled;
  document.body.classList.toggle("no-anim", noAnim);
  try {
    if (noAnim) localStorage.setItem(LS_NO_ANIM, "1");
    else localStorage.removeItem(LS_NO_ANIM);
  } catch {}
}

function getAnimationsEnabled() {
  try {
    return localStorage.getItem(LS_NO_ANIM) !== "1";
  } catch {
    return true;
  }
}

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

function showMenu() {
  const animOn = getAnimationsEnabled();
  overlay.show({
    title: "Menu",
    bodyHtml:
      `<div class="menu">` +
      `<div class="menu__section">` +
      `<div class="menu__title">Solo</div>` +
      `<div class="menu__hint">Rozstaw flotę, potem Start. Obrót: <b>R</b> lub <b>Spacja</b>.</div>` +
      `</div>` +
      `<div class="menu__section">` +
      `<div class="menu__title">Multiplayer</div>` +
      `<div class="menu__hint">Ustaw nick po prawej i kliknij gracza online, żeby wysłać zaproszenie.</div>` +
      `</div>` +
      `<div class="menu__section">` +
      `<div class="menu__title">Ustawienia</div>` +
      `<div class="menu__hint">Animacje: <b>${animOn ? "ON" : "OFF"}</b></div>` +
      `</div>` +
      `</div>`,
    actions: [
      {
        label: "Graj",
        variant: "btn--primary",
        onClick: () => overlay.hide(),
      },
      {
        label: "Nowa gra",
        onClick: () => {
          overlay.hide();
          if (mpIsInRoom(mp)) mpLeaveRoom(mp);
          startNewGame({ mode: "solo" });
          toast("Nowa gra");
        },
      },
      {
        label: "Instrukcja",
        onClick: () => {
          overlay.show({
            title: "Instrukcja",
            body:
              "1) Rozstaw statki na lewej planszy\n" +
              "2) Start (w multi: wysyła gotowość)\n" +
              "3) W walce strzelasz w prawą planszę\n\n" +
              "Skróty: R/Spacja — obrót.\n" +
              "Tip: po zatopieniu statku pola dookoła oznaczają się automatycznie.",
            actions: [
              {
                label: "Wróć do menu",
                variant: "btn--primary",
                onClick: () => showMenu(),
              },
            ],
          });
        },
      },
      {
        label: animOn ? "Animacje: OFF" : "Animacje: ON",
        onClick: () => {
          setAnimationsEnabled(!animOn);
          showMenu();
        },
      },
      {
        label: "Ustaw nick (multi)",
        onClick: () => {
          overlay.hide();
          requestAnimationFrame(() => {
            usersPanel?.nickInput?.focus?.();
          });
        },
      },
    ],
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

setAnimationsEnabled(getAnimationsEnabled());
showMenu();
