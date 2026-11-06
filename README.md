# 🐾 EduPaw Adventure

Game edukasi 2D Action-Platformer (Phaser 3) dengan kuis adaptif (DDA), 8 karakter hewan, bos dual-phase, dan multiplayer LAN (PeerJS / WebRTC).

## Struktur Folder

```
edupaw-adventure/
├── index.html            # Halaman utama (canvas + UI + CSS responsif)
├── css/style.css         # Layout PC & Mobile
├── js/
│   ├── config.js         # Karakter, level, wardrobe, achievement, LocalStorage
│   ├── network.js        # Multiplayer LAN P2P (PeerJS)
│   ├── ui.js             # Menu, HUD, kontrol sentuh, Quiz Board
│   └── game.js           # Engine Phaser: fisika, ability, DDA, bos, balapan
├── data/questions.json   # Bank soal (edit sesuai kebutuhan)
├── libs/                 # (opsional) phaser.min.js & peerjs.min.js untuk mode offline
├── lan-server.js         # Server lokal (static + signaling PeerJS) untuk LAN offline
├── package.json
├── .nojekyll
└── .vscode/              # Pengaturan VS Code + Prettier
```

## Kontrol

| Aksi       | PC                   | Mobile               |
| ---------- | -------------------- | -------------------- |
| Jalan      | A / D atau ← →       | D-Pad ◀ ▶            |
| Lompat     | Spasi / W / ↑        | Tombol ⤒             |
| Ability    | E atau Shift         | Tombol Action Paw 🐾 |
| Jawab kuis | Klik atau tombol 1-4 | Ketuk                |

## Menjalankan di Komputer (Pengembangan)

1. Buka folder di VS Code, pasang ekstensi yang disarankan (Prettier, Live Server).
2. Klik kanan `index.html` → **Open with Live Server**.
   (Jangan buka via `file://` karena `questions.json` tidak bisa dimuat; game akan memakai soal cadangan.)
3. Format kode: `Shift+Alt+F` atau otomatis saat simpan (sudah diatur di `.vscode/settings.json`).

## Hosting di GitHub Pages (Gratis)

1. Buat repository baru di GitHub, lalu push isi folder ini:
   ```bash
   git init
   git add .
   git commit -m "EduPaw Adventure"
   git branch -M main
   git remote add origin https://github.com/<username>/edupaw-adventure.git
   git push -u origin main
   ```
2. Di GitHub: **Settings → Pages → Build and deployment**
   - Source: **Deploy from a branch**
   - Branch: **main** , folder **/ (root)** (atau `/docs` bila file dipindah ke folder `docs`)
3. Tunggu 1-2 menit, game bisa dibuka di `https://<username>.github.io/edupaw-adventure/`.

Catatan:

- Mode **singleplayer** berjalan penuh di GitHub Pages. Soal dibaca dari `./data/questions.json`; progres tersimpan di LocalStorage browser.
- Untuk menambah soal, cukup edit `data/questions.json` lalu push.
- Multiplayer lewat GitHub Pages memakai server signaling publik PeerJS (butuh internet). Untuk jaringan lokal tanpa internet, pakai mode LAN di bawah.

### Format `questions.json`

```json
{
  "id": "mat-e1",
  "subject": "matematika",
  "level": "easy|medium|hard",
  "q": "7 + 5 = ?",
  "options": ["10", "11", "12", "13"],
  "answer": 2,
  "hint": "..."
}
```

Tambah mata pelajaran baru di array `subjects` (`id`, `name`, `emoji`).

## Menjalankan di Wi-Fi Lokal (LAN, Tanpa Internet)

**Persiapan satu kali (butuh internet):**

```bash
npm install
mkdir -p libs
curl -L https://cdn.jsdelivr.net/npm/phaser@3.80.1/dist/phaser.min.js -o libs/phaser.min.js
curl -L https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js -o libs/peerjs.min.js
```

**Saat bermain (tanpa internet):**

1. Di komputer host (terhubung ke Wi-Fi/router yang sama dengan pemain lain):
   ```bash
   node lan-server.js
   ```
   Terminal menampilkan alamat seperti `http://192.168.1.5:8080`.
2. Semua pemain membuka alamat tersebut di browser (HP / laptop).
3. Menu **Multiplayer LAN**:
   - Host: **Buat Room** → bagikan kode 4 karakter.
   - Pemain lain: masukkan kode → **Gabung**.
   - Kolom server terisi otomatis bila terdeteksi.
4. Host memilih mode lalu **Mulai Pertandingan**:
   - 🏁 **Balapan**: level sama (seed sama) untuk semua; yang mencapai bendera finish tercepat menang.
   - ⚡ **Adu Cepat Kuis**: soal sama, poin lebih besar bila lebih cepat menjawab.

Jika perangkat tidak saling terhubung: pastikan di Wi-Fi yang sama, matikan "AP isolation" di router, dan izinkan port 8080 di firewall komputer host.

## Mengganti Visual dengan Render 3D Chibi

Semua sprite dibuat prosedural (`makeTextures` di `js/game.js`) agar proyek langsung berjalan tanpa aset. Untuk memakai render 3D Chibi Anda, muat PNG di `BootScene.preload()` dengan key yang sama (`char_foxy`, `char_bunny`, dst.) dan hapus pembuatan tekstur terkait.

## Jalankan otomatis di Windows (port 3003)

- `jalankan.bat` - menyalakan server di http://localhost:3003 dan membuka browser.
- `pasang-autostart.bat` - klik 2x sekali saja; server menyala sendiri (tanpa jendela) setiap login Windows.
- `hapus-autostart.bat` - mematikan fitur autostart.

Pemain lain di Wi-Fi yang sama membuka `http://IP-KOMPUTER:3003`. Saat pertama kali, izinkan Node.js di Windows Firewall (jaringan Private).
