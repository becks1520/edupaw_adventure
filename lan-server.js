/* ==========================================================================
   EduPaw Adventure - lan-server.js
   Server lokal untuk memainkan game lewat Wi-Fi/LAN tanpa hosting berbayar.

   - Menyajikan file game (static) lewat HTTP.  -> TANPA dependensi, cukup Node.js.
   - Jika modul "express" + "peer" terpasang (npm install), server juga menjalankan
     PeerJS signaling di path /peerjs untuk multiplayer LAN offline.

   Jalankan:  node lan-server.js        (port bawaan 3003, ubah dengan PORT=xxxx)
   ========================================================================== */
const http = require("http");
const fs = require("fs");
const os = require("os");
const path = require("path");

const PORT = Number(process.env.PORT) || 3003;
const ROOT = __dirname;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};

/** Handler file statis dengan perlindungan path traversal. */
function serveStatic(req, res) {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  } catch (err) {
    res.writeHead(400);
    res.end("Bad request");
    return;
  }

  let filePath = path.normalize(path.join(ROOT, pathname));
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.stat(filePath, (err, stat) => {
    if (!err && stat.isDirectory()) filePath = path.join(filePath, "index.html");
    fs.readFile(filePath, (readErr, data) => {
      if (readErr) {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("404 - File tidak ditemukan");
        return;
      }
      res.writeHead(200, {
        "Content-Type": MIME[path.extname(filePath).toLowerCase()] || "application/octet-stream",
        "Cache-Control": "no-cache",
      });
      res.end(data);
    });
  });
}

/** Coba pasang PeerJS signaling server (opsional). */
function createServer() {
  try {
    const express = require("express");
    const { ExpressPeerServer } = require("peer");
    const app = express();
    const server = http.createServer(app);
    app.use("/peerjs", ExpressPeerServer(server, { path: "/", allow_discovery: false }));
    app.use(serveStatic);
    return { server, multiplayer: true };
  } catch (err) {
    return { server: http.createServer(serveStatic), multiplayer: false };
  }
}

const { server, multiplayer } = createServer();

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`\n[!] Port ${PORT} sudah dipakai. Server EduPaw kemungkinan sudah berjalan.`);
    console.error(`    Buka saja: http://localhost:${PORT}\n`);
  } else {
    console.error(err);
  }
  process.exit(1);
});

server.listen(PORT, "0.0.0.0", () => {
  console.log("\n🐾 EduPaw Adventure - server berjalan\n");
  console.log(`   Di komputer ini : http://localhost:${PORT}`);
  Object.values(os.networkInterfaces())
    .flat()
    .filter((i) => i && i.family === "IPv4" && !i.internal)
    .forEach((i) =>
      console.log(`   Perangkat lain  : http://${i.address}:${PORT}  (Wi-Fi yang sama)`)
    );
  console.log(
    multiplayer
      ? "\n   Multiplayer LAN : AKTIF (PeerJS signaling di /peerjs)\n"
      : "\n   Multiplayer LAN : nonaktif. Jalankan 'npm install' sekali (butuh internet) untuk mengaktifkan.\n"
  );
});
