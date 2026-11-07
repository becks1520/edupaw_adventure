# 🐾 EduPaw Adventure

Game edukasi 2D Action-Platformer (Phaser 3) dengan kuis adaptif (DDA), 8 karakter hewan, bos dual-phase, dan multiplayer LAN (PeerJS / WebRTC).

## Struktur Folder

```
edupaw-adventure/
├── index.html            # Halaman utama (canvas + UI + CSS responsif)
├── assets/               # logo.svg, logo.png, favicon.svg
├── css/style.css         # Layout PC & Mobile
├── js/
│   ├── config.js         # Karakter, level, wardrobe, achievement, LocalStorage
│   ├── art.js            # Potret hewan SVG + latar pemandangan menu
│   ├── network.js        # Multiplayer LAN P2P (PeerJS)
│   ├── ui.js             # Layar awal, pilih karakter, cara bermain, HUD, Quiz Board
│   └── game.js           # Engine Phaser: fisika, ability, DDA, bos, balapan
├── data/questions.json   # Bank soal (edit sesuai kebutuhan)
├── libs/                 # (opsional) phaser.min.js & peerjs.min.js untuk mode offline
├── lan-server.js         # Server lokal port 3003 (static; + PeerJS jika npm install)
├── jalankan.bat          # Windows: nyalakan server + buka game
├── pasang-autostart.bat  # Windows: server menyala otomatis saat login
├── hapus-autostart.bat
├── jalankan-tersembunyi.vbs
├── package.json
├── .nojekyll
└── .vscode/              # Pengaturan VS Code + Prettier
```

## Alur Layar

Layar awal (isi nama, **Mulai Petualangan**) → Pilih Teman Pertamamu (pertama kali saja) → Cara Bermain → Beranda.
Panduan juga bisa dibuka kapan saja lewat tombol **Cara Bermain** di beranda.

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
   Terminal menampilkan alamat seperti `http://192.168.1.5:3003`.
2. Semua pemain membuka alamat tersebut di browser (HP / laptop).
3. Menu **Multiplayer LAN**:
   - Host: **Buat Room** → bagikan kode 4 karakter.
   - Pemain lain: masukkan kode → **Gabung**.
   - Kolom server terisi otomatis bila terdeteksi.
4. Host memilih mode lalu **Mulai Pertandingan**:
   - 🏁 **Balapan**: level sama (seed sama) untuk semua; yang mencapai bendera finish tercepat menang.
   - ⚡ **Adu Cepat Kuis**: soal sama, poin lebih besar bila lebih cepat menjawab.

Jika perangkat tidak saling terhubung: pastikan di Wi-Fi yang sama, matikan "AP isolation" di router, dan izinkan port 3003 di firewall komputer host.

## Mengganti Visual dengan Render 3D Chibi

Semua sprite dibuat prosedural (`makeTextures` di `js/game.js`) agar proyek langsung berjalan tanpa aset. Untuk memakai render 3D Chibi Anda, muat PNG di `BootScene.preload()` dengan key yang sama (`char_foxy`, `char_bunny`, dst.) dan hapus pembuatan tekstur terkait.

## Jalankan otomatis di Windows (port 3003)

- `jalankan.bat` - menyalakan server di http://localhost:3003 dan membuka browser.
- `pasang-autostart.bat` - klik 2x sekali saja; server menyala sendiri (tanpa jendela) setiap login Windows.
- `hapus-autostart.bat` - mematikan fitur autostart.

Pemain lain di Wi-Fi yang sama membuka `http://IP-KOMPUTER:3003`. Saat pertama kali, izinkan Node.js di Windows Firewall (jaringan Private).

## Area Petualangan & Bos

Ada **8 area**, 4 di antaranya memiliki bos:

| Level | Area               | Bos                      | HP  |
| ----- | ------------------ | ------------------------ | --- |
| 1     | Padang Rumput      | -                        | -   |
| 2     | Hutan Berbunga     | 🐝 Ratu Lebah Hitung     | 3   |
| 3     | Gua Kristal        | -                        | -   |
| 4     | Gurun Pasir        | 🌵 Raja Kaktus Soal      | 4   |
| 5     | Gunung Salju       | -                        | -   |
| 6     | Pulau Awan         | 🐉 Naga Awan Kuis        | 5   |
| 7     | Gunung Api         | -                        | -   |
| 8     | Benteng Raja Angka | 👑 Raja Angka (terakhir) | 7   |

Level dibuat otomatis (deterministik) dari `E.LEVELS` di `js/config.js`. Untuk mengubah panjang area, ubah `length`;
untuk mengubah kekuatan bos, ubah `hp`, `speed`, `shoot`, `ball`, dan `dodge`.

## Menambah Soal (semua soal ditampilkan)

Edit `data/questions.json`. Setiap soal berbentuk:

```json
{
  "id": "mat-01",
  "subject": "matematika",
  "level": "easy",
  "q": "7 + 5 = ?",
  "options": ["10", "11", "12", "13"],
  "answer": 2,
  "hint": "..."
}
```

- `level`: `easy`, `medium`, atau `hard`. `answer` adalah nomor pilihan yang benar, dimulai dari 0. `id` harus unik.
- Semua array soal di file digabung, apa pun nama kuncinya. Soal yang salah format dilewati dan dilaporkan di console (F12).
- **Semua soal dibagi otomatis ke 8 area.** Area dengan bos mendapat jatah lebih banyak. Jumlah kotak ❓ tiap area
  mengikuti jatah soalnya (minimal 5), jadi makin banyak soal, makin panjang petualangannya.
- Soal di dalam satu area tidak berulang sampai semuanya muncul. Tingkat kesulitan tetap menyesuaikan jawaban pemain (DDA).
- Bonus +15 🪙 jika semua kotak ❓ di sebuah area berhasil dibuka.
- Saran jumlah soal: **60 atau lebih** (sekitar 8 soal per area) agar tidak ada soal yang terulang lintas area.

## Kunci & Kontrol Sentuh

- **Kunci 🔑 per area = 50% dari jumlah soal area itu** (minimal 3). Contoh: area berisi 20 soal → butuh 10 kunci. Jumlah tampil di HUD (mis. 🔑 4/10) dan di kartu level.
- Tombol sentuh otomatis menyesuaikan layar: ukuran mengikuti lebar/tinggi layar HP, lebih besar (tapi dibatasi) di tablet, menghormati *safe area* (notch). ◀ ▶ di kiri, Lompat dan Skill bertumpuk di kanan sehingga tidak saling menimpa.

## Batas 20 Kotak & Soal Berganti Tiap Main

- Setiap area memuat **maksimal 20 kotak ❓** (ditambah ronde bos). Kunci 🔑 = 50% dari jumlah kotak (maks. 10).
- Seluruh bank soal area tetap terpakai: tiap kali masuk area, soal diambil dari yang **belum pernah muncul** (riwayat tersimpan di LocalStorage per mata pelajaran & area). Setelah semua soal area habis dipakai, putaran baru dimulai.
- Soal tanpa `id` otomatis diberi ID dari isinya.
