import { FLEET, ORIENTATION } from "../state/constants.js";
import { qs, el } from "../utils/dom.js";
import { renderBoardGrid, paintBoard } from "./renderBoard.js";

export function renderStaticUI(game) {
  const subtitle = qs("#subtitle");
  const status = qs("#status");
  const playerMeta = qs("#playerMeta");
  const enemyMeta = qs("#enemyMeta");

  subtitle.textContent = game.phase === "placement" ? "Rozstaw statki" : "Walka";

  playerMeta.textContent = "";
  enemyMeta.textContent = "";

  status.textContent = game.phase === "placement" ? "Rozstaw swoją flotę" : "Twoja tura";

  const playerBoardEl = qs("#playerBoard");
  const enemyBoardEl = qs("#enemyBoard");

  const leftPanel = qs("#leftPanel");
  const rightPanel = qs("#rightPanel");

  const playerCells = renderBoardGrid(playerBoardEl);
  const enemyCells = renderBoardGrid(enemyBoardEl);

  game.ui = {
    subtitle,
    status,
    playerMeta,
    enemyMeta,
    playerBoardEl,
    enemyBoardEl,
    leftPanel,
    rightPanel,
    playerCells,
    enemyCells,
    placementToolbar: qs("#placementToolbar"),
    btnStart: qs("#btnStart"),
    btnRandomize: qs("#btnRandomize"),
    shipPicker: qs("#shipPicker"),
    orientationPicker: qs("#orientationPicker"),
    placementHint: qs("#placementHint"),
    usersPanel: qs("#usersPanel"),
    netMeta: qs("#netMeta"),
  };

  game.ui.placementToolbar.style.display = game.phase === "placement" ? "" : "none";

  renderPickers(game);

  paintBoard({ board: game.player.board, cells: playerCells, showShips: true });
  paintBoard({ board: game.enemy.board, cells: enemyCells, showShips: false });
}

function renderPickers(game) {
  const { shipPicker, orientationPicker } = game.ui;
  shipPicker.innerHTML = "";
  orientationPicker.innerHTML = "";

  for (let i = 0; i < FLEET.length; i++) {
    const len = FLEET[i];
    const chip = el("button", "chip", { type: "button", text: `${len}` });
    chip.dataset.shipIndex = String(i);
    if (i === game.placement.currentShipIndex) chip.classList.add("chip--active");
    shipPicker.appendChild(chip);
  }

  const chipH = el("button", "chip", { type: "button", text: "Poziomo" });
  chipH.dataset.orientation = ORIENTATION.H;
  if (game.orientation === ORIENTATION.H) chipH.classList.add("chip--active");

  const chipV = el("button", "chip", { type: "button", text: "Pionowo" });
  chipV.dataset.orientation = ORIENTATION.V;
  if (game.orientation === ORIENTATION.V) chipV.classList.add("chip--active");

  orientationPicker.appendChild(chipH);
  orientationPicker.appendChild(chipV);
}
