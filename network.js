let peer = null;
let connections = {}; // Menyimpan koneksi ke peer lain
let myPeerId = null;

// Konfigurasi ini menunjuk ke server lokal Node.js yang kita buat (port 9000).
// Harus diubah ke IP Host yang sebenarnya (contoh: 192.168.1.10) agar PC lain bisa join.
const PEER_CONFIG = {
    host: 'localhost', // <-- GANTI DENGAN IP LOKAL HOST SAAT MAIN LAN (misal: '192.168.1.15')
    port: 9000,
    path: '/edupaw',
    secure: false // Lokal (HTTP)
};

function initNetworkEvents() {
    document.getElementById('btn-host').onclick = () => startHost();
    document.getElementById('btn-join').onclick = () => joinRoom();
    document.getElementById('btn-leave').onclick = () => disconnectAll();
}

function startHost() {
    // Sebagai Host, ID dibuat random sederhana
    let roomId = Math.floor(1000 + Math.random() * 9000).toString();
    initPeer(roomId, true);
}

function joinRoom() {
    let roomId = document.getElementById('join-id').value.trim();
    if (roomId) initPeer(null, false, roomId);
}

function initPeer(requestedId, isHost, connectToId = null) {
    try {
        peer = requestedId ? new Peer(requestedId, PEER_CONFIG) : new Peer(PEER_CONFIG);
        
        peer.on('open', (id) => {
            myPeerId = id;
            gameState.isMultiplayer = true;
            document.getElementById('mp-offline').style.display = 'none';
            document.getElementById('mp-online').style.display = 'block';
            document.getElementById('room-code-display').innerText = id;
            
            if (!isHost && connectToId) {
                connectToPeer(connectToId);
            }
        });

        // Menerima koneksi (Sebagai Host / Peer)
        peer.on('connection', (conn) => {
            setupConnection(conn);
        });

        peer.on('error', (err) => {
            console.error("PeerJS Error:", err);
            document.getElementById('mp-status').innerText = "Gagal: " + err.type;
            if (err.type === 'server-error') {
                alert("Gagal konek ke Server Signaling. Pastikan Node.js jalan dan IP benar.");
            }
        });

    } catch (e) {
        console.error("Gagal inisialisasi Peer", e);
    }
}

function connectToPeer(targetId) {
    let conn = peer.connect(targetId);
    setupConnection(conn);
}

function setupConnection(conn) {
    conn.on('open', () => {
        connections[conn.peer] = conn;
        document.getElementById('mp-status').innerText = "Terhubung: " + Object.keys(connections).length + " user";
        
        conn.on('data', (data) => {
            handleNetworkData(conn.peer, data);
        });
    });

    conn.on('close', () => {
        delete connections[conn.peer];
        if (gameState.networkPeers[conn.peer]) {
            gameState.networkPeers[conn.peer].destroy();
            delete gameState.networkPeers[conn.peer];
        }
        document.getElementById('mp-status').innerText = "Terhubung: " + Object.keys(connections).length + " user";
    });
}

function sendNetworkData(data) {
    for (let id in connections) {
        if (connections[id].open) {
            connections[id].send(data);
        }
    }
}

function handleNetworkData(peerId, data) {
    if (data.type === 'pos') {
        // Panggil fungsi global Phaser jika siap
        if (window.updateNetworkPeers) {
            window.updateNetworkPeers(peerId, data);
        }
    } else if (data.type === 'quiz_result') {
        // Tampilkan notif teman menjawab kuis
        let msg = data.correct ? "Temanmu menjawab BENAR!" : "Temanmu salah menjawab.";
        console.log("LAN Info:", msg); // Bisa dihubungkan ke UI Notifikasi
    }
}

function disconnectAll() {
    if (peer) peer.destroy();
    connections = {};
    gameState.isMultiplayer = false;
    document.getElementById('mp-offline').style.display = 'block';
    document.getElementById('mp-online').style.display = 'none';
    for (let id in gameState.networkPeers) {
        gameState.networkPeers[id].destroy();
    }
    gameState.networkPeers = {};
}

// Inisialisasi UI
document.addEventListener('DOMContentLoaded', initNetworkEvents);