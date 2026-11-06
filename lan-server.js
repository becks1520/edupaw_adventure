/* ==========================================================================
   EduPaw Adventure - lan-server.js
   Server lokal (offline) untuk mode LAN:
   - menyajikan file game (static) lewat HTTP
   - menjalankan PeerJS signaling server di path /peerjs
   Jalankan:  npm install  &&  node lan-server.js
   ========================================================================== */
const express = require("express");
const http = require("http");
const os = require("os");
const path = require("path");
const { ExpressPeerServer } = require("peer");

const PORT = Number(process.env.PORT) || 8080;

const app = express();
app.use(express.static(path.join(__dirname)));

const server = http.createServer(app);
app.use("/peerjs", ExpressPeerServer(server, { path: "/", allow_discovery: false }));

server.listen(PORT, "0.0.0.0", () => {
  console.log("\n🐾 EduPaw Adventure - server LAN berjalan\n");
  Object.values(os.networkInterfaces())
    .flat()
    .filter((i) => i && i.family === "IPv4" && !i.internal)
    .forEach((i) =>
      console.log(`   Buka di perangkat mana pun di Wi-Fi yang sama: http://${i.address}:${PORT}`)
    );
  console.log(`   (di komputer ini: http://localhost:${PORT})\n`);
});
