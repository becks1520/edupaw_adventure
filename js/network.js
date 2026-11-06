/* ==========================================================================
   EduPaw Adventure - network.js
   Multiplayer LAN berbasis PeerJS (WebRTC P2P).
   Topologi bintang: 1 Host (pembuat room) + banyak Client. Host meneruskan
   (relay) pesan antar client.
   ========================================================================== */
(function () {
  "use strict";

  const E = (window.EduPaw = window.EduPaw || {});

  const PREFIX = "edupaw-";
  const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const TIMEOUT_MS = 10000;

  const randomCode = () =>
    Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join(
      ""
    );

  /** "192.168.1.5:8080" -> {host, port, path, secure} */
  function parseServer(str) {
    const text = (str || "").trim();
    if (!text) return null;
    const m = text.match(/^(https?:\/\/)?([^:/]+)(?::(\d+))?(\/.*)?$/);
    if (!m) return null;
    const secure = m[1] === "https://";
    return {
      host: m[2],
      port: m[3] ? Number(m[3]) : secure ? 443 : 80,
      path: m[4] && m[4] !== "/" ? m[4].replace(/\/$/, "") : "/peerjs",
      secure,
    };
  }

  class LanNet {
    constructor() {
      this.handlers = {};
      this.reset();
    }

    reset() {
      this.peer = null;
      this.isHost = false;
      this.hostConn = null;
      this.conns = new Map();
      this.players = {};
      this.myId = null;
      this.code = null;
      this.connected = false;
      this.name = "Pemain";
      this.char = "foxy";
    }

    get available() {
      return typeof window.Peer === "function";
    }

    /* ---------- Event emitter sederhana ---------- */
    on(type, fn) {
      (this.handlers[type] = this.handlers[type] || []).push(fn);
      return () => {
        this.handlers[type] = (this.handlers[type] || []).filter((f) => f !== fn);
      };
    }

    _emit(type, data, from) {
      (this.handlers[type] || []).slice().forEach((fn) => {
        try {
          fn(data, from);
        } catch (err) {
          console.error("[net] handler error", type, err);
        }
      });
    }

    /* ---------- Deteksi server LAN lokal (lan-server.js) ---------- */
    async detectLocalServer() {
      if (location.protocol !== "http:" && location.protocol !== "https:") return "";
      try {
        const res = await fetch("peerjs/", { cache: "no-store" });
        if (!res.ok) return "";
        const info = await res.json();
        return info && info.name ? location.host : "";
      } catch (err) {
        return "";
      }
    }

    _peerOptions(server) {
      const s = parseServer(server);
      if (!s) return { debug: 1 };
      // iceServers kosong = hanya kandidat jaringan lokal (tanpa STUN internet)
      return {
        host: s.host,
        port: s.port,
        path: s.path,
        secure: s.secure,
        debug: 1,
        config: { iceServers: [] },
      };
    }

    _openPeer(id, server) {
      return new Promise((resolve, reject) => {
        const options = this._peerOptions(server);
        const peer = id ? new window.Peer(id, options) : new window.Peer(options);
        let settled = false;

        const timer = setTimeout(() => {
          if (settled) return;
          settled = true;
          try {
            peer.destroy();
          } catch (err) {
            /* abaikan */
          }
          reject(new Error("Timeout menghubungi server signaling."));
        }, TIMEOUT_MS);

        peer.on("open", () => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          this.peer = peer;
          resolve(peer);
        });

        peer.on("error", (err) => {
          if (!settled) {
            settled = true;
            clearTimeout(timer);
            try {
              peer.destroy();
            } catch (e) {
              /* abaikan */
            }
            reject(err);
          } else {
            this._emit("error", err);
          }
        });
      });
    }

    /* ---------- Host ---------- */
    async createRoom({ name, char, server }) {
      if (!this.available) throw new Error("Library PeerJS tidak termuat.");
      this.leave();
      this.isHost = true;
      this.name = name;
      this.char = char;

      let lastError = null;
      for (let attempt = 0; attempt < 5 && !this.code; attempt++) {
        const code = randomCode();
        try {
          await this._openPeer(PREFIX + code, server);
          this.code = code;
        } catch (err) {
          lastError = err;
          if (err.type !== "unavailable-id") break;
        }
      }
      if (!this.code) throw lastError || new Error("Gagal membuat room.");

      this.myId = this.peer.id;
      this.connected = true;
      this.players[this.myId] = { id: this.myId, name, char, host: true };

      this.peer.on("connection", (conn) => this._onClientConnection(conn));
      return this.code;
    }

    _onClientConnection(conn) {
      conn.on("open", () => this.conns.set(conn.peer, conn));
      conn.on("data", (msg) => this._onData(msg, conn));
      conn.on("close", () => {
        this.conns.delete(conn.peer);
        delete this.players[conn.peer];
        this._broadcastLobby();
        this._emit("playerLeft", conn.peer);
      });
    }

    _broadcastLobby() {
      const payload = { players: this.players, hostId: this.myId };
      this.conns.forEach((c) => {
        if (c.open) c.send({ t: "lobby", d: payload, from: this.myId });
      });
      this._emit("lobby", payload, this.myId);
    }

    /* ---------- Client ---------- */
    async joinRoom(code, { name, char, server }) {
      if (!this.available) throw new Error("Library PeerJS tidak termuat.");
      this.leave();
      this.name = name;
      this.char = char;
      const roomCode = String(code).toUpperCase().trim();

      await this._openPeer(null, server);
      this.myId = this.peer.id;

      const conn = this.peer.connect(PREFIX + roomCode, { reliable: true });
      await new Promise((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error("Room tidak ditemukan atau host tidak merespons.")),
          TIMEOUT_MS
        );
        const fail = (err) => {
          clearTimeout(timer);
          reject(err.type === "peer-unavailable" ? new Error("Kode room tidak ditemukan.") : err);
        };
        this.peer.once("error", fail);
        conn.on("error", fail);
        conn.on("open", () => {
          clearTimeout(timer);
          this.peer.off("error", fail);
          resolve();
        });
      });

      this.hostConn = conn;
      this.code = roomCode;
      this.connected = true;
      conn.on("data", (msg) => this._onData(msg, null));
      conn.on("close", () => {
        const was = this.connected;
        this.connected = false;
        if (was) this._emit("disconnected");
      });
      conn.send({ t: "hello", d: { name, char }, from: this.myId });
    }

    /* ---------- Pesan ---------- */
    _onData(msg, conn) {
      if (!msg || !msg.t) return;

      if (this.isHost) {
        if (msg.t === "hello") {
          this.players[conn.peer] = {
            id: conn.peer,
            name: String((msg.d && msg.d.name) || "Pemain").slice(0, 14),
            char: (msg.d && msg.d.char) || "foxy",
            host: false,
          };
          this._broadcastLobby();
          return;
        }
        msg.from = conn.peer;
        // relay ke client lain
        this.conns.forEach((c, id) => {
          if (id !== conn.peer && c.open) c.send(msg);
        });
        this._emit(msg.t, msg.d, msg.from);
      } else {
        if (msg.t === "lobby") {
          this.players = msg.d.players;
          this.hostId = msg.d.hostId;
        }
        this._emit(msg.t, msg.d, msg.from);
      }
    }

    /** Kirim ke semua pemain lain (host: broadcast, client: lewat host). */
    send(type, data) {
      if (!this.connected) return;
      const msg = { t: type, d: data, from: this.myId };
      if (this.isHost) {
        this.conns.forEach((c) => {
          if (c.open) c.send(msg);
        });
      } else if (this.hostConn && this.hostConn.open) {
        this.hostConn.send(msg);
      }
    }

    leave() {
      try {
        this.conns.forEach((c) => c.close());
        if (this.hostConn) this.hostConn.close();
        if (this.peer) this.peer.destroy();
      } catch (err) {
        /* abaikan */
      }
      const handlers = this.handlers;
      this.reset();
      this.handlers = handlers;
    }
  }

  E.net = new LanNet();
})();
