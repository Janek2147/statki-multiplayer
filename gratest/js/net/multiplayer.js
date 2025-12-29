import { WSClient, defaultWSUrl } from "./wsClient.js";
import { toast } from "../ui/toast.js";

export function createMultiplayer() {
  const ws = new WSClient(defaultWSUrl());

  const state = {
    ws,
    myId: null,
    nick: null,
    users: [],
    room: null, // { roomId, opponentId, opponentNick, starterId }
    readyA: false,
    readyB: false,
    battleStarterId: null,
  };

  ws.on("welcome", (m) => {
    state.myId = m.id;
    state.nick = m.nick;
  });

  ws.on("presence", (m) => {
    state.users = Array.isArray(m.users) ? m.users : [];
  });

  ws.on("invite", (m) => {
    const fromNick = m.fromNick || "Ktoś";
    const ok = window.confirm(`${fromNick} zaprasza Cię do gry. Akceptujesz?`);
    ws.send({ type: "inviteResponse", fromId: m.fromId, accepted: ok });
  });

  ws.on("inviteDeclined", (m) => {
    toast(`${m.byNick || "Użytkownik"} odrzucił zaproszenie`);
  });

  ws.on("rematchOffer", (m) => {
    const fromNick = m.fromNick || "Ktoś";
    const ok = window.confirm(`${fromNick} proponuje rewanż. Gramy?`);
    ws.send({ type: "rematchResponse", accepted: ok });
  });

  ws.on("rematchDeclined", (m) => {
    toast(`${m.byNick || "Użytkownik"} odrzucił rewanż`);
  });

  ws.on("rematchStart", (m) => {
    state.battleStarterId = m.starterId || null;
    state.readyA = false;
    state.readyB = false;
    toast("Rewanż!");
  });

  ws.on("roomStart", (m) => {
    const myId = state.myId;
    if (!myId) return;

    const opponentId = m.aId === myId ? m.bId : m.aId;
    const opponentNick = m.aId === myId ? m.bNick : m.aNick;

    state.room = {
      roomId: m.roomId,
      opponentId,
      opponentNick,
      starterId: m.starterId,
    };

    toast(`Połączono z ${opponentNick}`);
  });

  ws.on("roomClosed", () => {
    state.room = null;
    state.readyA = false;
    state.readyB = false;
    toast("Przeciwnik rozłączył się");
  });

  ws.on("readyState", (m) => {
    state.readyA = !!m.readyA;
    state.readyB = !!m.readyB;
  });

  ws.on("battleStart", (m) => {
    state.battleStarterId = m.starterId || null;
  });

  ws.on("error", (m) => {
    if (m && m.message) toast(m.message);
  });

  return state;
}

export function mpIsInRoom(mp) {
  return !!mp.room;
}

export function mpConnect(mp) {
  mp.ws.connect();
}

export function mpSetNick(mp, nick) {
  mp.ws.send({ type: "setNick", nick });
}

export function mpInvite(mp, toId) {
  mp.ws.send({ type: "invite", toId });
}

export function mpLeaveRoom(mp) {
  mp.ws.send({ type: "leaveRoom" });
  mp.room = null;
  mp.readyA = false;
  mp.readyB = false;
}

export function mpReady(mp) {
  mp.ws.send({ type: "ready" });
}

export function mpSendShot(mp, idx) {
  mp.ws.send({ type: "shot", idx });
}

export function mpSendShotResult(mp, toId, idx, result, win) {
  mp.ws.send({ type: "shotResult", toId, idx, result, win });
}

export function mpSendShotResultWithUpdates(mp, toId, idx, result, win, updates) {
  mp.ws.send({ type: "shotResult", toId, idx, result, win, updates });
}

export function mpOfferRematch(mp) {
  mp.ws.send({ type: "rematchOffer" });
}
