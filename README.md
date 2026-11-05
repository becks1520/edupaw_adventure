# EduPaw Adventure

Game platformer 2D aksi edukatif yang di-build menggunakan JavaScript murni, Phaser 3, dan WebRTC (PeerJS).
Didesain sebagai modul interaktif responsif (Desktop & Mobile) yang dapat berjalan sepenuhnya di klien.

## Syarat Sistem (Lokal)
Karena kebijakan keamanan peramban yang memblokir Fetch API dari protokol `file://`, Anda membutuhkan HTTP Server lokal yang sederhana untuk memuat `questions.json`.

1. Pastikan Anda memiliki [Node.js](https://nodejs.org/) terpasang.
2. Buka terminal di folder proyek ini, lalu jalankan:
   ```bash
   npx http-server .