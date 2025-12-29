import express from "express";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import { WebSocketServer } from "ws";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = Number(process.env.PORT || 5173);
const PUBLIC_DIR = path.join(__dirname, "..");

app.use(express.static(PUBLIC_DIR));

app.get("/health", (req, res) => {
  res.json({ ok: true });
});

function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

const clients = new Map(); // id -> { ws, nick, roomId }
const rooms = new Map(); // roomId -> { aId, bId, starterId, readyA, readyB }

function send(ws, msg) {
  if (ws.readyState !== ws.OPEN) return;
  ws.send(JSON.stringify(msg));
}

function broadcastPresence() {
  const users = Array.from(clients.entries()).map(([id, c]) => ({
    id,
    nick: c.nick,
    inRoom: !!c.roomId,
  }));

  for (const [, c] of clients) {
    send(c.ws, { type: "presence", users });
  }
}

function getOpponent(room, selfId) {
  return room.aId === selfId ? room.bId : room.aId;
}

function leaveRoom(clientId) {
  const c = clients.get(clientId);
  if (!c?.roomId) return;

  const roomId = c.roomId;
  const room = rooms.get(roomId);
  c.roomId = null;

  if (!room) {
    broadcastPresence();
    return;
  }

  const oppId = getOpponent(room, clientId);
  const opp = clients.get(oppId);
  if (opp) {
    opp.roomId = null;
    send(opp.ws, { type: "roomClosed", roomId });
  }

  rooms.delete(roomId);
  broadcastPresence();
}

wss.on("connection", (ws) => {
  const id = uid();
  clients.set(id, { ws, nick: `Guest-${id.slice(0, 4)}`, roomId: null });

  send(ws, { type: "welcome", id, nick: clients.get(id).nick });
  broadcastPresence();

  ws.on("message", (buf) => {
    let msg;
    try {
      msg = JSON.parse(buf.toString());
    } catch {
      return;
    }

    const c = clients.get(id);
    if (!c) return;

    if (msg.type === "setNick") {
      const nick = String(msg.nick || "").trim().slice(0, 18);
      if (nick) c.nick = nick;
      send(ws, { type: "nick", nick: c.nick });
      broadcastPresence();
      return;
    }

    if (msg.type === "invite") {
      if (c.roomId) {
        send(ws, { type: "error", message: "Jesteś już w grze" });
        return;
      }

      const toId = String(msg.toId || "");
      const target = clients.get(toId);
      if (!target) {
        send(ws, { type: "error", message: "Użytkownik nie istnieje" });
        return;
      }
      if (target.roomId) {
        send(ws, { type: "error", message: "Użytkownik jest już w grze" });
        return;
      }

      send(target.ws, {
        type: "invite",
        fromId: id,
        fromNick: c.nick,
      });
      return;
    }

    if (msg.type === "inviteResponse") {
      const fromId = String(msg.fromId || "");
      const accepted = !!msg.accepted;
      const from = clients.get(fromId);
      if (!from) return;

      if (!accepted) {
        send(from.ws, { type: "inviteDeclined", byId: id, byNick: c.nick });
        return;
      }

      if (c.roomId || from.roomId) {
        send(ws, { type: "error", message: "Ktoś jest już w grze" });
        send(from.ws, { type: "error", message: "Ktoś jest już w grze" });
        return;
      }

      const roomId = uid();
      const starterId = fromId;
      rooms.set(roomId, { aId: fromId, bId: id, starterId, readyA: false, readyB: false });
      c.roomId = roomId;
      from.roomId = roomId;

      const payload = {
        type: "roomStart",
        roomId,
        aId: fromId,
        bId: id,
        starterId,
        aNick: from.nick,
        bNick: c.nick,
      };
      send(from.ws, payload);
      send(ws, payload);
      broadcastPresence();
      return;
    }

    if (msg.type === "leaveRoom") {
      leaveRoom(id);
      return;
    }

    if (msg.type === "ready") {
      const roomId = c.roomId;
      const room = roomId ? rooms.get(roomId) : null;
      if (!room) return;

      if (room.aId === id) room.readyA = true;
      if (room.bId === id) room.readyB = true;

      const a = clients.get(room.aId);
      const b = clients.get(room.bId);
      if (a) send(a.ws, { type: "readyState", readyA: room.readyA, readyB: room.readyB });
      if (b) send(b.ws, { type: "readyState", readyA: room.readyA, readyB: room.readyB });

      if (room.readyA && room.readyB) {
        if (a) send(a.ws, { type: "battleStart", starterId: room.starterId });
        if (b) send(b.ws, { type: "battleStart", starterId: room.starterId });
      }
      return;
    }

    if (msg.type === "shot") {
      const roomId = c.roomId;
      const room = roomId ? rooms.get(roomId) : null;
      if (!room) return;

      const idx = Number(msg.idx);
      if (!Number.isFinite(idx)) return;

      const oppId = getOpponent(room, id);
      const opp = clients.get(oppId);
      if (!opp) return;

      send(opp.ws, { type: "incomingShot", fromId: id, idx });
      return;
    }

    if (msg.type === "shotResult") {
      const roomId = c.roomId;
      const room = roomId ? rooms.get(roomId) : null;
      if (!room) return;

      const toId = String(msg.toId || "");
      const idx = Number(msg.idx);
      const result = String(msg.result || "");
      const win = !!msg.win;
      const updates = Array.isArray(msg.updates) ? msg.updates : [];

      if (!Number.isFinite(idx)) return;
      const target = clients.get(toId);
      if (!target) return;

      send(target.ws, { type: "shotResult", idx, result, win, updates });
      return;
    }
  });

  ws.on("close", () => {
    leaveRoom(id);
    clients.delete(id);
    broadcastPresence();
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server listening on http://0.0.0.0:${PORT}`);
});
