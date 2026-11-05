const { PeerServer } = require('peer');

const port = 9000;
const server = PeerServer({
    port: port,
    path: '/edupaw'
});

server.on('connection', (client) => {
    console.log(`[LAN Signaling] Klien tersambung: ${client.getId()}`);
});

server.on('disconnect', (client) => {
    console.log(`[LAN Signaling] Klien terputus: ${client.getId()}`);
});

console.log(`\n========================================`);
console.log(`📡 Server Signaling EduPaw Aktif di Port ${port}`);
console.log(`Buka command prompt / terminal baru dan jalankan: 'ipconfig' (Windows) atau 'ifconfig' (Mac/Linux)`);
console.log(`Cari IPv4 Address Anda (misal 192.168.x.x) lalu masukkan IP tersebut ke PEER_CONFIG.host di network.js`);
console.log(`========================================\n`);