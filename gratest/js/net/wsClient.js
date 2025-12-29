export class WSClient {
  constructor(url) {
    this.url = url;
    this.ws = null;
    this.handlers = new Map();
    this.connected = false;
  }

  connect() {
    if (this.ws) return;
    this.ws = new WebSocket(this.url);

    this.ws.addEventListener("open", () => {
      this.connected = true;
      this.emit("open", null);
    });

    this.ws.addEventListener("close", () => {
      this.connected = false;
      this.emit("close", null);
    });

    this.ws.addEventListener("error", (e) => {
      this.emit("error", e);
    });

    this.ws.addEventListener("message", (e) => {
      let msg;
      try {
        msg = JSON.parse(e.data);
      } catch {
        return;
      }
      this.emit("message", msg);
      if (msg && msg.type) this.emit(msg.type, msg);
    });
  }

  on(type, handler) {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type).add(handler);
    return () => {
      this.handlers.get(type)?.delete(handler);
    };
  }

  emit(type, payload) {
    const hs = this.handlers.get(type);
    if (!hs) return;
    for (const h of Array.from(hs)) h(payload);
  }

  send(msg) {
    if (!this.ws) return;
    if (this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify(msg));
  }

  close() {
    try {
      this.ws?.close();
    } catch {
      // ignore
    }
    this.ws = null;
    this.connected = false;
  }
}

export function defaultWSUrl() {
  const proto = location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${location.host}`;
}
