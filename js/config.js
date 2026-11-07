/* ==========================================================================
   EduPaw Adventure - config.js
   Konfigurasi global: karakter, level, aksesori, achievement, penyimpanan.
   ========================================================================== */
(function () {
  "use strict";

  const E = (window.EduPaw = window.EduPaw || {});

  E.TILE = 32;
  E.VIEW = { w: 800, h: 448 };
  E.KEYS_REQUIRED = 3;
  E.DIFFICULTIES = ["easy", "medium", "hard"];
  E.UPGRADE_COST = { 2: 25, 3: 60 }; // biaya koin menuju level ability 2 dan 3

  /* ---------------------------------------------------------------------
     Karakter (8 hewan)
     --------------------------------------------------------------------- */
  E.CHARACTERS = {
    foxy: {
      id: "foxy",
      name: "Foxy",
      emoji: "🦊",
      ability: "Double Jump",
      desc: "Lompat lagi di udara (3x lompat di Lv3).",
      body: 0xf28c28,
      belly: 0xffffff,
      ear: "point",
      cooldown: 9,
      aura: 0xffb347,
      starter: true,
      price: 25,
    },
    bunny: {
      id: "bunny",
      name: "Bunny",
      emoji: "🐰",
      ability: "High Jump",
      desc: "Lompatan super tinggi untuk menggapai jalur rahasia di atas.",
      body: 0xf5f0ff,
      belly: 0xffd6e8,
      ear: "long",
      cooldown: 9,
      aura: 0xff9ad5,
      starter: true,
      price: 25,
    },
    kitty: {
      id: "kitty",
      name: "Kitty",
      emoji: "🐱",
      ability: "Speed Dash",
      desc: "Menerjang cepat ke depan dan kebal sesaat.",
      body: 0x9aa5b1,
      belly: 0xffffff,
      ear: "tri",
      cooldown: 8,
      aura: 0xbfc7d1,
      starter: true,
      price: 25,
    },
    panda: {
      id: "panda",
      name: "Panda",
      emoji: "🐼",
      ability: "Sturdy Shield",
      desc: "Perisai kokoh: kebal dari musuh dan duri.",
      body: 0xffffff,
      belly: 0xffffff,
      earColor: 0x222222,
      patch: true,
      ear: "round",
      cooldown: 12,
      aura: 0x7fe38a,
      price: 40,
    },
    owl: {
      id: "owl",
      name: "Owl",
      emoji: "🦉",
      ability: "Glide",
      desc: "Meluncur pelan di udara untuk menyeberangi jurang jauh.",
      body: 0x9c6b3f,
      belly: 0xe9d3a8,
      ear: "tuft",
      cooldown: 10,
      aura: 0xd2a679,
      price: 60,
    },
    bear: {
      id: "bear",
      name: "Bear",
      emoji: "🐻",
      ability: "Brick Breaker",
      desc: "Membobol blok retak dan menghancurkan musuh.",
      body: 0x7a4a2a,
      belly: 0xd9b38c,
      ear: "round",
      cooldown: 10,
      aura: 0xff6b6b,
      price: 60,
    },
    penguin: {
      id: "penguin",
      name: "Penguin",
      emoji: "🐧",
      ability: "Ice Slide",
      desc: "Meluncur kencang di tanah dan menabrak musuh.",
      body: 0x23395b,
      belly: 0xffffff,
      ear: "none",
      beak: true,
      cooldown: 11,
      aura: 0x7ad7ff,
      price: 80,
    },
    cheetah: {
      id: "cheetah",
      name: "Cheetah",
      emoji: "🐆",
      ability: "Magnet Paw",
      desc: "Menarik koin dan bintang di sekitar.",
      body: 0xf2c14e,
      belly: 0xfff3c4,
      ear: "round",
      spots: true,
      cooldown: 12,
      aura: 0xffd93b,
      price: 100,
    },
  };

  E.CHARACTER_ORDER = ["foxy", "bunny", "kitty", "panda", "owl", "bear", "penguin", "cheetah"];

  // Durasi efek ability (detik) berdasarkan level upgrade 1-3
  E.ABILITY_DURATION = {
    foxy: (l) => 4 + l,
    bunny: (l) => 4 + l,
    kitty: (l) => 0.3 + 0.1 * l,
    panda: (l) => 3 + l,
    owl: (l) => 3 + l,
    bear: (l) => 3 + l,
    penguin: (l) => 3 + l,
    cheetah: (l) => 4 + 2 * l,
  };

  /* ---------------------------------------------------------------------
     Level
     --------------------------------------------------------------------- */
  E.LEVELS = [
    {
      name: "Padang Rumput",
      theme: "grass",
      sky: 0x8fd3ff,
      tint: 0xffffff,
      pit: 3,
      enemySpeed: 60,
    },
    { name: "Gua Kristal", theme: "cave", sky: 0x2a2f5a, tint: 0x9fb4ff, pit: 4, enemySpeed: 80 },
    {
      name: "Benteng Raja Angka",
      theme: "castle",
      sky: 0x4a2c3b,
      tint: 0xffb3a0,
      pit: 3,
      enemySpeed: 70,
      boss: true,
    },
  ];

  /* ---------------------------------------------------------------------
     Wardrobe (aksesori + efek status)
     --------------------------------------------------------------------- */
  E.WARDROBE = [
    {
      id: "cap",
      slot: "hat",
      name: "Topi Baseball",
      emoji: "🧢",
      price: 10,
      fx: { magnet: 0.3 },
      info: "Radius magnet +30%",
    },
    {
      id: "crown",
      slot: "hat",
      name: "Mahkota Emas",
      emoji: "👑",
      price: 40,
      fx: { magnet: 0.6 },
      info: "Radius magnet +60%",
    },
    {
      id: "nerd",
      slot: "glasses",
      name: "Kacamata Pintar",
      emoji: "👓",
      price: 15,
      fx: { hint: 1 },
      info: "Petunjuk kuis selalu tampil",
    },
    {
      id: "shades",
      slot: "glasses",
      name: "Kacamata Hitam",
      emoji: "🕶️",
      price: 45,
      fx: { hint: 2 },
      info: "Petunjuk + 1 opsi salah dihapus",
    },
    {
      id: "pack",
      slot: "bag",
      name: "Ransel Kecil",
      emoji: "🎒",
      price: 20,
      fx: { bonus: 2 },
      info: "+2 koin tiap jawaban benar",
    },
    {
      id: "satchel",
      slot: "bag",
      name: "Tas Selempang",
      emoji: "👜",
      price: 50,
      fx: { bonus: 4 },
      info: "+4 koin tiap jawaban benar",
    },
  ];
  E.SLOT_LABEL = { hat: "Topi", glasses: "Kacamata", bag: "Tas" };

  /* ---------------------------------------------------------------------
     Achievement (membuka karakter secara gratis)
     --------------------------------------------------------------------- */
  E.ACHIEVEMENTS = [
    {
      id: "quiz10",
      title: "Otak Cemerlang",
      desc: "Jawab 10 soal dengan benar",
      unlock: "panda",
      test: (s) => s.correct >= 10,
      progress: (s) => `${Math.min(s.correct, 10)}/10`,
    },
    {
      id: "streak5",
      title: "Beruntun!",
      desc: "Jawab 5 soal benar berturut-turut",
      unlock: "owl",
      test: (s) => s.bestStreak >= 5,
      progress: (s) => `${Math.min(s.bestStreak, 5)}/5`,
    },
    {
      id: "level1",
      title: "Petualang Pemula",
      desc: "Selesaikan Level 1",
      unlock: "bear",
      test: (s) => s.levelsDone >= 1,
      progress: (s) => `${Math.min(s.levelsDone, 1)}/1`,
    },
    {
      id: "secret1",
      title: "Penjelajah Rahasia",
      desc: "Temukan 1 harta di jalan rahasia",
      unlock: "penguin",
      test: (s) => s.secrets >= 1,
      progress: (s) => `${Math.min(s.secrets, 1)}/1`,
    },
    {
      id: "coins100",
      title: "Kolektor Koin",
      desc: "Kumpulkan 100 koin edukasi",
      unlock: "cheetah",
      test: (s) => s.totalCoins >= 100,
      progress: (s) => `${Math.min(s.totalCoins, 100)}/100`,
    },
  ];

  /* ---------------------------------------------------------------------
     Bank soal cadangan (dipakai jika questions.json gagal dimuat,
     misalnya index.html dibuka langsung lewat file://)
     --------------------------------------------------------------------- */
  E.FALLBACK = {
    subjects: [
      { id: "matematika", name: "Matematika", emoji: "➗" },
      { id: "umum", name: "Pengetahuan Umum", emoji: "🌏" },
    ],
    questions: [
      {
        id: "f1",
        subject: "matematika",
        level: "easy",
        q: "3 + 4 = ?",
        options: ["6", "7", "8", "9"],
        answer: 1,
        hint: "Hitung dengan jari: 3 lalu tambah 4.",
      },
      {
        id: "f2",
        subject: "matematika",
        level: "easy",
        q: "10 - 6 = ?",
        options: ["2", "3", "4", "5"],
        answer: 2,
        hint: "Mundur 6 langkah dari 10.",
      },
      {
        id: "f3",
        subject: "matematika",
        level: "medium",
        q: "6 x 7 = ?",
        options: ["36", "42", "48", "49"],
        answer: 1,
        hint: "6 x 7 sama dengan 6 x 6 + 6.",
      },
      {
        id: "f4",
        subject: "matematika",
        level: "hard",
        q: "144 : 12 = ?",
        options: ["10", "11", "12", "14"],
        answer: 2,
        hint: "12 x 12 = 144.",
      },
      {
        id: "f5",
        subject: "umum",
        level: "easy",
        q: "Ibu kota Indonesia saat ini adalah?",
        options: ["Jakarta", "Bandung", "Medan", "Surabaya"],
        answer: 0,
        hint: "Kota di Pulau Jawa dengan Monas.",
      },
      {
        id: "f6",
        subject: "umum",
        level: "medium",
        q: "Planet terdekat dari Matahari?",
        options: ["Venus", "Bumi", "Merkurius", "Mars"],
        answer: 2,
        hint: "Planet terkecil di tata surya.",
      },
    ],
  };

  const DEFAULT_SUBJECTS = [
    { id: "matematika", name: "Matematika", emoji: "➗" },
    { id: "ipa", name: "IPA", emoji: "🔬" },
    { id: "indonesia", name: "Bahasa Indonesia", emoji: "📖" },
    { id: "inggris", name: "Bahasa Inggris", emoji: "🔤" },
    { id: "umum", name: "Pengetahuan Umum", emoji: "🌏" },
  ];

  const LEVELS = ["easy", "medium", "hard"];

  /** Apakah item ini soal yang valid? Mengembalikan pesan error atau null. */
  function checkQuestion(q) {
    if (!q || typeof q.q !== "string" || !q.q.trim()) return "teks soal (q) kosong";
    if (!Array.isArray(q.options) || q.options.length < 2) return "options minimal 2 pilihan";
    if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.options.length) {
      return "answer harus angka indeks pilihan (mulai dari 0)";
    }
    if (!LEVELS.includes(q.level)) return 'level harus "easy", "medium", atau "hard"';
    if (!q.subject) return "subject kosong";
    return null;
  }

  /**
   * Membaca bank soal. Semua properti berupa array soal digabung, jadi nama
   * kuncinya bebas ("questions", "new_questions", "fun_questions", dst.).
   */
  E.setQuestions = function (data) {
    const seen = new Set();
    const all = [];
    Object.keys(data).forEach((key) => {
      if (key === "subjects" || !Array.isArray(data[key])) return;
      data[key].forEach((q, i) => {
        const problem = checkQuestion(q);
        if (problem) {
          console.warn(
            `[EduPaw] Soal dilewati: ${key}[${i}] ${q && q.id ? `(${q.id})` : ""} - ${problem}`
          );
          return;
        }
        if (q.id && seen.has(q.id)) {
          console.warn(`[EduPaw] ID ganda dilewati: ${q.id}`);
          return;
        }
        if (q.id) seen.add(q.id);
        all.push(q);
      });
    });

    E.questions = all;
    E.subjects =
      Array.isArray(data.subjects) && data.subjects.length ? data.subjects : DEFAULT_SUBJECTS;
    console.info(`[EduPaw] ${all.length} soal dimuat.`);
  };

  /** Apakah data memuat minimal satu array soal? */
  E.hasQuestions = function (data) {
    return (
      !!data &&
      Object.keys(data).some((k) => k !== "subjects" && Array.isArray(data[k]) && data[k].length)
    );
  };

  /* ---------------------------------------------------------------------
     Penyimpanan progres (LocalStorage)
     --------------------------------------------------------------------- */
  const SAVE_KEY = "edupaw_save_v1";

  const defaults = () => ({
    name: "Pemain",
    starterChosen: false,
    seenHowto: false,
    selected: "foxy",
    unlocked: [],
    upgrades: {},
    coins: 0,
    stars: 0,
    subject: "mixed",
    wardrobe: { owned: [], equipped: { hat: null, glasses: null, bag: null } },
    achievements: [],
    levels: {},
    stats: { correct: 0, bestStreak: 0, totalCoins: 0, secrets: 0, levelsDone: 0 },
  });

  E.Save = {
    data: null,

    load() {
      const base = defaults();
      try {
        const saved = JSON.parse(localStorage.getItem(SAVE_KEY) || "{}");
        this.data = Object.assign(base, saved);
        this.data.wardrobe = Object.assign(defaults().wardrobe, saved.wardrobe || {});
        this.data.wardrobe.equipped = Object.assign(
          defaults().wardrobe.equipped,
          (saved.wardrobe || {}).equipped || {}
        );
        this.data.stats = Object.assign(defaults().stats, saved.stats || {});
      } catch (err) {
        this.data = base;
      }
      return this.data;
    },

    write() {
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(this.data));
      } catch (err) {
        /* penyimpanan penuh / diblokir: abaikan */
      }
    },

    reset() {
      this.data = defaults();
      this.write();
    },

    addCoins(n) {
      this.data.coins += n;
      if (n > 0) this.data.stats.totalCoins += n;
    },

    lv(id) {
      return this.data.upgrades[id] || 1;
    },

    isUnlocked(id) {
      return this.data.unlocked.includes(id);
    },
  };

  E.Save.load();

  /** Cek achievement baru. Mengembalikan array achievement yang baru didapat. */
  E.checkAchievements = function () {
    const d = E.Save.data;
    const fresh = [];
    E.ACHIEVEMENTS.forEach((a) => {
      if (!d.achievements.includes(a.id) && a.test(d.stats)) {
        d.achievements.push(a.id);
        if (a.unlock && !d.unlocked.includes(a.unlock)) d.unlocked.push(a.unlock);
        fresh.push(a);
      }
    });
    if (fresh.length) E.Save.write();
    return fresh;
  };

  /** Total efek aksesori yang sedang dipakai. */
  E.wardrobeEffects = function () {
    const fx = { magnet: 0, hint: 0, bonus: 0 };
    Object.values(E.Save.data.wardrobe.equipped).forEach((id) => {
      const item = E.WARDROBE.find((w) => w.id === id);
      if (!item) return;
      fx.magnet += item.fx.magnet || 0;
      fx.hint = Math.max(fx.hint, item.fx.hint || 0);
      fx.bonus += item.fx.bonus || 0;
    });
    return fx;
  };
})();
