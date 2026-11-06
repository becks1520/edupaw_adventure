/* ==========================================================================
   EduPaw Adventure - game.js
   Engine utama (Phaser 3): tekstur prosedural, generator level, fisika,
   ability karakter, kuis Pause Total + DDA, bos dual-phase, mode balapan
   LAN dan duel kuis.
   ========================================================================== */
(function () {
  "use strict";

  const E = window.EduPaw;
  const T = E.TILE;
  const Save = E.Save;
  const UI = E.UI;
  const SOLID_CHARS = "#DBK?";

  /* ======================================================================
     UTILITAS
     ====================================================================== */
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ======================================================================
     ADAPTIVE ENGINE (Dynamic Difficulty Adjustment)
     - >= 3 benar beruntun  -> tingkat soal naik
     - >= 2 salah beruntun  -> soal disederhanakan + visual hint
     ====================================================================== */
  class AdaptiveEngine {
    constructor(questions, subject) {
      this.pool = questions.filter((q) => subject === "mixed" || q.subject === subject);
      if (!this.pool.length) this.pool = questions.slice();
      this.levelIdx = 0;
      this.correctStreak = 0;
      this.wrongStreak = 0;
      this.needHint = false;
      this.used = new Set();
    }

    get level() {
      return E.DIFFICULTIES[this.levelIdx];
    }

    pick() {
      const ofLevel = () => this.pool.filter((q) => q.level === this.level);
      let cand = ofLevel().filter((q) => !this.used.has(q.id));
      if (!cand.length) {
        ofLevel().forEach((q) => this.used.delete(q.id));
        cand = ofLevel();
      }
      if (!cand.length) cand = this.pool.filter((q) => !this.used.has(q.id));
      if (!cand.length) cand = this.pool;
      const q = cand[Math.floor(Math.random() * cand.length)];
      this.used.add(q.id);
      return q;
    }

    /** Mengembalikan "up", "down", atau null. */
    report(correct) {
      if (correct) {
        this.correctStreak++;
        this.wrongStreak = 0;
        if (this.correctStreak >= 3) {
          this.correctStreak = 0;
          if (this.levelIdx < E.DIFFICULTIES.length - 1) {
            this.levelIdx++;
            return "up";
          }
        }
      } else {
        this.wrongStreak++;
        this.correctStreak = 0;
        if (this.wrongStreak >= 2) {
          this.wrongStreak = 0;
          this.needHint = true;
          if (this.levelIdx > 0) this.levelIdx--;
          return "down";
        }
      }
      return null;
    }
  }

  /* ======================================================================
     GENERATOR LEVEL (deterministik berdasarkan seed -> sama di semua
     pemain pada mode balapan)
     Legenda: # tanah  D tanah dalam  B bata  ? kotak kuis  K blok retak
              ^ duri  C koin  T harta rahasia  E musuh  N monster angka
              H checkpoint  F finish  P start  X bos
     ====================================================================== */
  const PLANS = [
    [
      "flat",
      "boxes",
      "pit",
      "enemy",
      "stairs",
      "boxes",
      "spikes",
      "checkpoint",
      "monster",
      "secretBear",
      "boxes",
      "pit",
      "enemy",
      "secretHigh",
      "boxes",
      "checkpoint",
      "stairs",
      "pit",
      "secretGlide",
      "monster",
      "boxes",
    ],
    [
      "flat",
      "enemy",
      "boxes",
      "pit",
      "monster",
      "spikes",
      "boxes",
      "stairs",
      "secretBear",
      "checkpoint",
      "pit",
      "monster",
      "enemy",
      "boxes",
      "secretGlide",
      "pit",
      "spikes",
      "checkpoint",
      "secretHigh",
      "monster",
      "boxes",
    ],
    ["flat", "boxes", "checkpoint", "boxes", "enemy", "boxes"],
  ];

  function buildLevel(index, seed) {
    const meta = E.LEVELS[index];
    const ROWS = 14;
    const GROUND = 12;
    const MAXC = 420;
    const g = Array.from({ length: ROWS }, () => Array(MAXC).fill(" "));
    const rnd = mulberry32(seed + index * 7919);
    const between = (a, b) => a + Math.floor(rnd() * (b - a + 1));

    const put = (x, y, ch) => {
      if (x >= 0 && x < MAXC && y >= 0 && y < ROWS) g[y][x] = ch;
    };
    const ground = (x0, x1) => {
      for (let x = x0; x < x1; x++) {
        put(x, GROUND, "#");
        put(x, GROUND + 1, "D");
      }
    };
    const coinRow = (x0, n, y = GROUND - 3) => {
      for (let i = 0; i < n; i++) put(x0 + i, y, "C");
    };

    const seg = {
      flat(x) {
        const n = between(5, 8);
        ground(x, x + n);
        if (rnd() < 0.7) coinRow(x + 1, between(2, 4));
        return n;
      },
      pit(x) {
        const w = meta.pit;
        for (let i = 0; i < w; i++) put(x + i, GROUND - 4, "C");
        ground(x + w, x + w + 3);
        return w + 3;
      },
      enemy(x) {
        ground(x, x + 8);
        put(x + 4, GROUND - 1, "E");
        return 8;
      },
      monster(x) {
        ground(x, x + 8);
        put(x + 4, GROUND - 4, "N");
        return 8;
      },
      stairs(x) {
        ground(x, x + 9);
        put(x + 2, 11, "B");
        put(x + 3, 11, "B");
        put(x + 3, 10, "B");
        put(x + 4, 11, "B");
        put(x + 4, 10, "B");
        put(x + 5, 11, "B");
        put(x + 3, 9, "C");
        put(x + 4, 9, "C");
        return 9;
      },
      boxes(x) {
        ground(x, x + 8);
        put(x + 2, 8, "?");
        put(x + 3, 8, "B");
        put(x + 4, 8, rnd() < 0.6 ? "?" : "B");
        put(x + 5, 8, "B");
        coinRow(x + 1, 3, 11);
        return 8;
      },
      spikes(x) {
        ground(x, x + 8);
        put(x + 3, GROUND - 1, "^");
        put(x + 4, GROUND - 1, "^");
        return 8;
      },
      checkpoint(x) {
        ground(x, x + 4);
        put(x + 2, GROUND - 1, "H");
        return 4;
      },
      // Jalan rahasia 1: dinding retak -> hanya Bear (Brick Breaker)
      secretBear(x) {
        ground(x, x + 10);
        for (let i = 2; i <= 6; i++) put(x + i, 9, "B");
        put(x + 6, 10, "B");
        put(x + 6, 11, "B");
        put(x + 2, 10, "B");
        put(x + 2, 11, "K");
        put(x + 3, 11, "C");
        put(x + 4, 11, "T");
        put(x + 5, 11, "C");
        return 10;
      },
      // Jalan rahasia 2: platform sangat tinggi -> Bunny / Foxy
      secretHigh(x) {
        ground(x, x + 10);
        for (let i = 3; i <= 7; i++) put(x + i, 6, "B");
        put(x + 4, 5, "C");
        put(x + 5, 5, "T");
        put(x + 6, 5, "C");
        return 10;
      },
      // Jalan rahasia 3: pulau melayang jauh -> Owl (Glide) / Kitty / Foxy
      secretGlide(x) {
        ground(x, x + 20);
        put(x + 1, 11, "B");
        put(x + 2, 11, "B");
        put(x + 2, 10, "B");
        put(x + 3, 8, "B");
        put(x + 4, 8, "B");
        for (let i = 12; i <= 16; i++) put(x + i, 6, "B");
        put(x + 13, 5, "C");
        put(x + 14, 5, "T");
        put(x + 15, 5, "C");
        return 20;
      },
    };

    // Zona awal
    ground(0, 10);
    put(2, GROUND - 1, "P");
    coinRow(5, 3);

    let x = 10;
    PLANS[index].forEach((name) => {
      x += seg[name](x);
    });

    let arena = null;
    if (meta.boss) {
      const x0 = x;
      ground(x0, x0 + 44);
      put(x0 + 2, GROUND - 1, "H");
      for (let i = 8; i <= 12; i++) put(x0 + i, 9, "B");
      for (let i = 20; i <= 24; i++) put(x0 + i, 8, "B");
      for (let i = 32; i <= 36; i++) put(x0 + i, 9, "B");
      put(x0 + 30, GROUND - 3, "X");
      put(x0 + 41, GROUND - 1, "F");
      arena = { x0, x1: x0 + 44 };
      x = x0 + 44;
    } else {
      ground(x, x + 12);
      put(x + 7, GROUND - 1, "F");
      x += 12;
    }

    const cols = x;
    return { grid: g.map((row) => row.slice(0, cols)), cols, rows: ROWS, arena };
  }

  /* ======================================================================
     TEKSTUR PROSEDURAL (placeholder bergaya chibi cartoon).
     Ganti dengan sprite sheet render 3D chibi Anda bila sudah ada.
     ====================================================================== */
  function drawAnimal(g, c) {
    g.fillStyle(c.earColor || c.body, 1);
    switch (c.ear) {
      case "point":
        g.fillTriangle(6, 15, 7, 1, 19, 11);
        g.fillTriangle(34, 15, 33, 1, 21, 11);
        break;
      case "long":
        g.fillEllipse(13, 8, 9, 20);
        g.fillEllipse(27, 8, 9, 20);
        g.fillStyle(0xffb6cf, 1);
        g.fillEllipse(13, 9, 4, 13);
        g.fillEllipse(27, 9, 4, 13);
        break;
      case "round":
        g.fillCircle(9, 11, 6);
        g.fillCircle(31, 11, 6);
        break;
      case "tri":
        g.fillTriangle(5, 17, 6, 2, 18, 11);
        g.fillTriangle(35, 17, 34, 2, 22, 11);
        break;
      case "tuft":
        g.fillTriangle(6, 15, 3, 2, 16, 10);
        g.fillTriangle(34, 15, 37, 2, 24, 10);
        break;
      default:
        break;
    }

    g.fillStyle(c.id === "panda" ? 0x222222 : c.body, 1);
    g.fillCircle(11, 37, 4.5);
    g.fillCircle(29, 37, 4.5);

    g.fillStyle(c.body, 1);
    g.fillRoundedRect(3, 9, 34, 29, 13);
    g.fillStyle(c.belly, 1);
    g.fillEllipse(20, 29, 22, 14);

    if (c.spots) {
      g.fillStyle(0x4a3a1a, 1);
      [
        [10, 16],
        [16, 13],
        [26, 14],
        [31, 18],
        [9, 27],
        [31, 28],
      ].forEach((p) => g.fillCircle(p[0], p[1], 1.8));
    }
    if (c.patch) {
      g.fillStyle(0x222222, 1);
      g.fillEllipse(13, 22, 10, 12);
      g.fillEllipse(27, 22, 10, 12);
    }

    if (c.id === "owl") {
      g.fillStyle(0xfff3c4, 1);
      g.fillCircle(13, 21, 7);
      g.fillCircle(27, 21, 7);
      g.fillStyle(0x222222, 1);
      g.fillCircle(13, 21, 3.5);
      g.fillCircle(27, 21, 3.5);
      g.fillStyle(0xffffff, 1);
      g.fillCircle(14.2, 19.8, 1.3);
      g.fillCircle(28.2, 19.8, 1.3);
    } else {
      g.fillStyle(0xffffff, 1);
      g.fillCircle(13, 22, 4.6);
      g.fillCircle(27, 22, 4.6);
      g.fillStyle(0x1b1b1b, 1);
      g.fillCircle(13.8, 22.6, 2.8);
      g.fillCircle(27.8, 22.6, 2.8);
      g.fillStyle(0xffffff, 1);
      g.fillCircle(14.6, 21.6, 1);
      g.fillCircle(28.6, 21.6, 1);
    }

    if (c.beak || c.id === "owl") {
      g.fillStyle(c.beak ? 0xff9f1c : 0xffa826, 1);
      g.fillTriangle(16.5, 27, 23.5, 27, 20, 33);
    } else {
      g.fillStyle(0x3b2a2a, 1);
      g.fillTriangle(17.5, 26.5, 22.5, 26.5, 20, 29.5);
    }
    g.fillStyle(0xff8fa3, 0.6);
    g.fillCircle(7.5, 28, 2.6);
    g.fillCircle(32.5, 28, 2.6);
  }

  function starPoints(cx, cy, outer, inner) {
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? outer : inner;
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
    }
    return pts;
  }

  function makeTextures(scene) {
    const mk = (key, w, h, fn) => {
      const g = scene.make.graphics({ x: 0, y: 0, add: false });
      fn(g);
      g.generateTexture(key, w, h);
      g.destroy();
    };

    // Karakter
    E.CHARACTER_ORDER.forEach((id) =>
      mk("char_" + id, 40, 40, (g) => drawAnimal(g, E.CHARACTERS[id]))
    );

    // Tile
    mk("ground", 32, 32, (g) => {
      g.fillStyle(0x8b5a2b, 1).fillRect(0, 0, 32, 32);
      g.fillStyle(0x4cc34c, 1).fillRect(0, 0, 32, 9);
      g.fillStyle(0x38a338, 1).fillRect(0, 7, 32, 3);
      g.fillStyle(0x6e4520, 1).fillRect(6, 16, 5, 4).fillRect(20, 22, 6, 4).fillRect(14, 27, 4, 3);
    });
    mk("dirt", 32, 32, (g) => {
      g.fillStyle(0x8b5a2b, 1).fillRect(0, 0, 32, 32);
      g.fillStyle(0x6e4520, 1).fillRect(6, 8, 5, 4).fillRect(20, 14, 6, 4).fillRect(12, 24, 4, 3);
    });
    mk("brick", 32, 32, (g) => {
      g.fillStyle(0xd9763a, 1).fillRect(0, 0, 32, 32);
      g.fillStyle(0x9c4f20, 1);
      g.fillRect(0, 10, 32, 2).fillRect(0, 21, 32, 2).fillRect(16, 0, 2, 10).fillRect(8, 12, 2, 9);
      g.fillRect(24, 12, 2, 9).fillRect(16, 23, 2, 9);
      g.lineStyle(2, 0x7a3a14, 1).strokeRect(1, 1, 30, 30);
    });
    const drawBox = (g, fill, edge, mark) => {
      g.fillStyle(fill, 1).fillRoundedRect(0, 0, 32, 32, 5);
      g.lineStyle(3, edge, 1).strokeRoundedRect(1.5, 1.5, 29, 29, 5);
      if (mark) {
        g.lineStyle(4, 0x7a4b00, 1);
        g.beginPath();
        g.arc(16, 12, 5, Phaser.Math.DegToRad(180), Phaser.Math.DegToRad(450), false);
        g.lineTo(16, 20);
        g.strokePath();
        g.fillStyle(0x7a4b00, 1).fillCircle(16, 25, 2.4);
      }
    };
    mk("box", 32, 32, (g) => drawBox(g, 0xffc93c, 0xb37400, true));
    mk("boxUsed", 32, 32, (g) => drawBox(g, 0xb9b9b9, 0x7d7d7d, false));
    mk("cracked", 32, 32, (g) => {
      g.fillStyle(0xa0865f, 1).fillRect(0, 0, 32, 32);
      g.lineStyle(3, 0x4a3a22, 1).strokeRect(1.5, 1.5, 29, 29);
      g.lineStyle(2, 0x3a2c18, 1);
      g.beginPath();
      g.moveTo(16, 2);
      g.lineTo(11, 12);
      g.lineTo(19, 18);
      g.lineTo(13, 30);
      g.strokePath();
    });

    // Item
    mk("coin", 20, 20, (g) => {
      g.fillStyle(0xe0a800, 1).fillCircle(10, 10, 9.5);
      g.fillStyle(0xffd23f, 1).fillCircle(10, 10, 8);
      g.fillStyle(0xfff0a0, 1).fillCircle(8, 8, 3);
      g.fillStyle(0xe0a800, 1).fillRect(9, 5, 2, 10);
    });
    mk("treasure", 30, 30, (g) => {
      g.fillStyle(0xff9f1c, 1).fillPoints(starPoints(15, 16, 14, 6), true);
      g.fillStyle(0xffe066, 1).fillPoints(starPoints(15, 16, 10.5, 4.5), true);
    });
    mk("spike", 32, 32, (g) => {
      g.fillStyle(0xdfe6ee, 1);
      for (let i = 0; i < 4; i++) g.fillTriangle(i * 8, 32, i * 8 + 4, 12, i * 8 + 8, 32);
      g.fillStyle(0x9aa6b5, 1);
      for (let i = 0; i < 4; i++) g.fillTriangle(i * 8 + 4, 12, i * 8 + 8, 32, i * 8 + 4, 32);
    });

    // Bendera
    const flag = (key, h, poleColor, flagColor, accent) =>
      mk(key, 36, h, (g) => {
        g.fillStyle(poleColor, 1).fillRect(5, 0, 4, h);
        g.fillStyle(flagColor, 1).fillTriangle(9, 4, 34, 14, 9, 26);
        g.fillStyle(accent, 1).fillCircle(7, 4, 4);
      });
    flag("flag", 96, 0x8a96a8, 0x9aa6b5, 0x8a96a8);
    flag("flagOn", 96, 0xb8860b, 0x3ec46d, 0xffd23f);
    flag("cp", 64, 0x8a96a8, 0xff6b6b, 0x8a96a8);
    flag("cpOn", 64, 0x8a96a8, 0x3ec46d, 0xffd23f);

    // Musuh
    mk("enemy", 32, 32, (g) => {
      g.fillStyle(0xc0392b, 1).fillCircle(7, 28, 5).fillCircle(25, 28, 5);
      g.fillStyle(0xff5a4a, 1).fillCircle(16, 17, 14);
      g.fillStyle(0xffffff, 1).fillCircle(11, 15, 4.5).fillCircle(21, 15, 4.5);
      g.fillStyle(0x111111, 1).fillCircle(12, 16, 2.4).fillCircle(20, 16, 2.4);
      g.lineStyle(3, 0x111111, 1);
      g.beginPath().moveTo(6, 8).lineTo(14, 11).strokePath();
      g.beginPath().moveTo(26, 8).lineTo(18, 11).strokePath();
    });
    mk("monster", 36, 36, (g) => {
      g.fillStyle(0x7e57c2, 1).fillCircle(18, 19, 16);
      g.fillStyle(0xb39ddb, 1).fillCircle(14, 13, 5);
      g.fillStyle(0x7e57c2, 1).fillTriangle(6, 8, 8, 0, 14, 8).fillTriangle(30, 8, 28, 0, 22, 8);
      g.fillStyle(0xffffff, 1)
        .fillTriangle(10, 30, 14, 30, 12, 35)
        .fillTriangle(22, 30, 26, 30, 24, 35);
    });
    mk("boss", 96, 96, (g) => {
      g.fillStyle(0x4b2e8c, 1)
        .fillTriangle(14, 26, 20, 0, 36, 22)
        .fillTriangle(82, 26, 76, 0, 60, 22);
      g.fillStyle(0x6b4bb8, 1).fillCircle(48, 54, 40);
      g.fillStyle(0x9a7be0, 1).fillEllipse(48, 68, 52, 34);
      g.fillStyle(0xffd23f, 1)
        .fillTriangle(24, 24, 30, 6, 38, 22)
        .fillTriangle(38, 22, 48, 2, 58, 22)
        .fillTriangle(58, 22, 66, 6, 72, 24);
      g.fillStyle(0xffffff, 1).fillCircle(34, 46, 10).fillCircle(62, 46, 10);
      g.fillStyle(0xd62828, 1).fillCircle(35, 47, 5).fillCircle(61, 47, 5);
      g.lineStyle(5, 0x111111, 1);
      g.beginPath().moveTo(22, 34).lineTo(42, 42).strokePath();
      g.beginPath().moveTo(74, 34).lineTo(54, 42).strokePath();
      g.fillStyle(0x2b1655, 1).fillRoundedRect(30, 66, 36, 16, 6);
      g.fillStyle(0xffffff, 1);
      for (let i = 0; i < 4; i++) g.fillTriangle(32 + i * 9, 66, 40 + i * 9, 66, 36 + i * 9, 75);
    });
    mk("ball", 16, 16, (g) => {
      g.fillStyle(0xff6b00, 1).fillCircle(8, 8, 7.5);
      g.fillStyle(0xffd23f, 1).fillCircle(7, 7, 4);
    });
    mk("shield", 64, 64, (g) => {
      g.fillStyle(0xffffff, 0.18).fillCircle(32, 32, 30);
      g.lineStyle(4, 0xffffff, 0.9).strokeCircle(32, 32, 29);
    });
    mk("cloud", 110, 56, (g) => {
      g.fillStyle(0xffffff, 1)
        .fillCircle(30, 34, 20)
        .fillCircle(56, 26, 24)
        .fillCircle(82, 34, 18)
        .fillRect(30, 34, 52, 20);
    });

    // Aksesori
    mk("acc_cap", 30, 16, (g) => {
      g.fillStyle(0xe63946, 1).fillRoundedRect(4, 0, 22, 12, 6).fillRect(18, 9, 12, 5);
      g.fillStyle(0xffffff, 1).fillCircle(15, 3, 2);
    });
    mk("acc_crown", 30, 16, (g) => {
      g.fillStyle(0xffd23f, 1).fillRect(4, 8, 22, 7);
      g.fillTriangle(4, 8, 6, 0, 12, 8)
        .fillTriangle(10, 8, 15, 0, 20, 8)
        .fillTriangle(18, 8, 24, 0, 26, 8);
      g.fillStyle(0xe63946, 1).fillCircle(15, 11, 2);
    });
    mk("acc_nerd", 32, 14, (g) => {
      g.lineStyle(3, 0x222222, 1).strokeCircle(8, 7, 5.5).strokeCircle(24, 7, 5.5);
      g.beginPath().moveTo(13.5, 7).lineTo(18.5, 7).strokePath();
    });
    mk("acc_shades", 32, 14, (g) => {
      g.fillStyle(0x111111, 1)
        .fillRoundedRect(1, 2, 13, 10, 4)
        .fillRoundedRect(18, 2, 13, 10, 4)
        .fillRect(13, 4, 6, 2);
      g.fillStyle(0xffffff, 0.5).fillRect(4, 4, 4, 2).fillRect(21, 4, 4, 2);
    });
    mk("acc_pack", 14, 22, (g) => {
      g.fillStyle(0x2a9d8f, 1).fillRoundedRect(0, 0, 14, 22, 5);
      g.fillStyle(0x1f7a70, 1).fillRect(2, 12, 10, 7);
    });
    mk("acc_satchel", 18, 18, (g) => {
      g.fillStyle(0x8d5524, 1).fillRoundedRect(0, 3, 18, 15, 4);
      g.fillStyle(0xffd23f, 1).fillRect(7, 8, 4, 4);
      g.lineStyle(2, 0x5c3a17, 1).strokeRoundedRect(1, 4, 16, 13, 4);
    });
  }

  /* ======================================================================
     SCENE: BOOT
     ====================================================================== */
  class BootScene extends Phaser.Scene {
    constructor() {
      super("Boot");
    }

    preload() {
      this.load.json("questions", "data/questions.json");
      this.load.on("loaderror", () => {
        E.loadFailed = true;
      });
    }

    create() {
      makeTextures(this);
      const data = !E.loadFailed && this.cache.json.get("questions");
      E.setQuestions(data && data.questions ? data : E.FALLBACK);
      if (!data) UI.Toast.show("questions.json tidak termuat, memakai soal cadangan.", 3500);
      document.getElementById("boot").classList.add("gone");
      UI.init();
      this.scene.stop();
    }
  }

  /* ======================================================================
     SCENE: GAME
     ====================================================================== */
  class GameScene extends Phaser.Scene {
    constructor() {
      super("Game");
    }

    init(data) {
      this.opts = data || {};
    }

    /* ---------------------------------------------------------------- */
    create() {
      const o = this.opts;
      this.levelIdx = o.level || 0;
      this.meta = E.LEVELS[this.levelIdx];
      this.mode = o.mode || "single";

      const built = buildLevel(this.levelIdx, o.seed || 20260101);
      this.grid = built.grid.map((row) => row.slice());
      this.cols = built.cols;
      this.rows = built.rows;
      this.arena = built.arena;
      this.worldW = this.cols * T;
      this.worldH = this.rows * T;

      this.state = {
        coins: 0,
        keys: 0,
        correct: 0,
        wrong: 0,
        enemies: 0,
        secrets: 0,
        deaths: 0,
        time: 0,
        streak: 0,
      };
      this.quizActive = false;
      this.finished = false;
      this.invuln = 0;
      this.levelTime = 0;
      this.hudTimer = 0;
      this.netTimer = 0;
      this.raceTimer = 0;
      this.lastFlagToast = -10;
      this.bossDefeated = !this.meta.boss;
      this.boss = null;
      this.toBreak = [];
      this.facing = 1;
      this.airJumps = 0;
      this.coyote = 0;
      this.fx = E.wardrobeEffects();
      this.ai = new AdaptiveEngine(E.questions, o.subject || Save.data.subject);

      this.physics.resume();
      this.tweens.resumeAll();
      this.time.paused = false;

      this.physics.world.setBounds(0, 0, this.worldW, this.worldH + 300);
      this.physics.world.setBoundsCollision(true, true, true, false);
      this.cameras.main.setBackgroundColor(this.meta.sky);

      this.makeBackground();
      this.buildWorld();
      this.createPlayer();
      this.setupColliders();
      this.setupInput();
      this.setupCamera();
      this.setupAbility();
      this.setupNetwork();

      UI.HUD.setLevel(`Lv${this.levelIdx + 1} · ${this.meta.name}`);
      UI.HUD.setStats(this.hudStats());
      if (this.meta.boss) UI.HUD.bossBar(false);
      this.refreshFlag();

      this.events.once("shutdown", () => this.cleanup());
      UI.Toast.show(
        this.meta.boss
          ? "👑 Kumpulkan 3 🔑 lalu kalahkan Raja Angka!"
          : "🔑 Kumpulkan 3 kunci dari kotak ❓ lalu capai bendera!",
        3000
      );
    }

    cleanup() {
      (this.netOffs || []).forEach((off) => off());
      this.netOffs = [];
      UI.HUD.setRace(null);
      UI.HUD.bossBar(false);
      UI.QuizUI.hide();
    }

    /* ----------------------------- Dunia ----------------------------- */
    makeBackground() {
      const count = Math.ceil(this.worldW / 380);
      const alpha = this.meta.theme === "grass" ? 0.95 : 0.18;
      for (let i = 0; i < count; i++) {
        this.add
          .image(i * 380 + Phaser.Math.Between(0, 160), Phaser.Math.Between(30, 150), "cloud")
          .setScrollFactor(0.3)
          .setAlpha(alpha)
          .setScale(Phaser.Math.FloatBetween(0.7, 1.2))
          .setDepth(-5);
      }
    }

    buildWorld() {
      this.solids = this.physics.add.staticGroup();
      this.boxes = this.physics.add.staticGroup();
      this.cracks = this.physics.add.staticGroup();
      this.spikes = this.physics.add.staticGroup();
      this.checkpoints = this.physics.add.staticGroup();
      this.coins = this.physics.add.group({ allowGravity: false, immovable: true });
      this.enemies = this.physics.add.group();
      this.projectiles = this.physics.add.group({ allowGravity: false });

      const tint = this.meta.tint;
      this.startPos = { x: 3 * T, y: 11 * T };
      let bossPos = null;

      this.grid.forEach((row, r) => {
        row.forEach((ch, c) => {
          const x = c * T + T / 2;
          const y = r * T + T / 2;
          switch (ch) {
            case "#":
              this.solids.create(x, y, "ground").setTint(tint);
              break;
            case "D":
              this.solids.create(x, y, "dirt").setTint(tint);
              break;
            case "B":
              this.solids.create(x, y, "brick").setTint(tint);
              break;
            case "?": {
              const box = this.boxes.create(x, y, "box");
              box.setData("used", false);
              break;
            }
            case "K": {
              const k = this.cracks.create(x, y, "cracked");
              k.setData("r", r).setData("c", c);
              break;
            }
            case "^":
              this.spikes.create(x, y, "spike");
              break;
            case "C":
              this.addCoin(x, y, "coin");
              break;
            case "T":
              this.addCoin(x, y, "treasure");
              break;
            case "E":
              this.spawnWalker(x, y);
              break;
            case "N":
              this.spawnMonster(x, y);
              break;
            case "H": {
              const cp = this.checkpoints.create(x, (r + 1) * T - 32, "cp");
              cp.setData("on", false);
              break;
            }
            case "F":
              this.finishFlag = this.physics.add.staticSprite(x, (r + 1) * T - 48, "flag");
              break;
            case "P":
              this.startPos = { x, y: y - 4 };
              break;
            case "X":
              bossPos = { x, y };
              break;
            default:
              break;
          }
        });
      });

      this.checkpoint = { x: this.startPos.x, y: this.startPos.y };
      if (bossPos) this.spawnBoss(bossPos.x, bossPos.y);
    }

    solidAt(x, y) {
      const c = Math.floor(x / T);
      const r = Math.floor(y / T);
      if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) return false;
      return SOLID_CHARS.includes(this.grid[r][c]);
    }

    addCoin(x, y, kind) {
      const coin = this.coins.create(x, y, kind);
      coin.setData("kind", kind);
      coin.setDepth(3);
      if (kind === "treasure") coin.body.setSize(26, 26);
      return coin;
    }

    spawnWalker(x, y) {
      const e = this.enemies.create(x, y, "enemy");
      e.kind = "walker";
      e.dir = Math.random() < 0.5 ? -1 : 1;
      e.speed = this.meta.enemySpeed;
      e.body.setSize(26, 26).setOffset(3, 5);
      e.setCollideWorldBounds(true);
      e.setDepth(5);
    }

    spawnMonster(x, y) {
      const e = this.enemies.create(x, y, "monster");
      e.kind = "monster";
      e.body.setAllowGravity(false);
      e.body.setSize(28, 28).setOffset(4, 4);
      e.baseX = x;
      e.dir = 1;
      e.phase = Math.random() * 6;
      e.label = this.add
        .text(x, y, String(Phaser.Math.Between(1, 20)), {
          fontSize: "16px",
          fontStyle: "bold",
          color: "#ffffff",
          stroke: "#2b1655",
          strokeThickness: 3,
        })
        .setOrigin(0.5)
        .setDepth(6);
      e.setDepth(5);
    }

    /* ----------------------------- Pemain ----------------------------- */
    createPlayer() {
      const ch = E.CHARACTERS[Save.data.selected];
      this.character = ch;
      this.player = this.physics.add.sprite(this.startPos.x, this.startPos.y, "char_" + ch.id);
      this.player.setDepth(10);
      this.player.setCollideWorldBounds(true);
      this.player.body.setSize(26, 32).setOffset(7, 8);
      this.player.body.setMaxVelocityY(900);

      // Aksesori dari Wardrobe
      this.accessories = [];
      const eq = Save.data.wardrobe.equipped;
      const offsets = { hat: { x: 0, y: -17 }, glasses: { x: 0, y: 2 }, bag: { x: -16, y: 6 } };
      Object.keys(eq).forEach((slot) => {
        if (!eq[slot]) return;
        const sprite = this.add.image(0, 0, "acc_" + eq[slot]).setDepth(slot === "bag" ? 9 : 11);
        this.accessories.push({ sprite, slot, off: offsets[slot] });
      });

      this.aura = this.add.image(0, 0, "shield").setTint(ch.aura).setDepth(12).setVisible(false);
    }

    updateAccessories() {
      const p = this.player;
      this.accessories.forEach((a) => {
        const dx = a.slot === "bag" ? -this.facing * 16 : a.off.x;
        a.sprite.setPosition(p.x + dx, p.y + a.off.y);
        a.sprite.setFlipX(p.flipX);
        a.sprite.setAlpha(p.alpha);
      });
      const ab = this.ability;
      const on = ab.active > 0 || ab.dash > 0;
      this.aura.setVisible(on);
      if (on) {
        this.aura.setPosition(p.x, p.y);
        this.aura.setAlpha(0.55 + 0.25 * Math.sin(this.levelTime * 10));
      }
    }

    setupColliders() {
      const p = this.player;
      this.physics.add.collider(p, this.solids);
      this.physics.add.collider(p, this.boxes, this.onBoxHit, null, this);
      this.physics.add.collider(p, this.cracks, this.onCrackTouch, null, this);
      this.physics.add.collider(this.enemies, this.solids);
      this.physics.add.collider(this.enemies, this.boxes);
      this.physics.add.collider(this.enemies, this.cracks);

      this.physics.add.overlap(p, this.coins, this.collectCoin, null, this);
      this.physics.add.overlap(p, this.enemies, this.onEnemyTouch, null, this);
      this.physics.add.overlap(p, this.spikes, () => this.hurtPlayer(), null, this);
      this.physics.add.overlap(p, this.checkpoints, this.onCheckpoint, null, this);
      this.physics.add.overlap(p, this.projectiles, (pl, ball) => {
        ball.destroy();
        this.hurtPlayer();
      });
      if (this.finishFlag)
        this.physics.add.overlap(p, this.finishFlag, this.onFinishFlag, null, this);
      if (this.boss) {
        this.physics.add.collider(this.boss, this.solids);
        this.physics.add.overlap(p, this.boss, () => {
          if (this.boss.phase !== "dead") this.hurtPlayer();
        });
      }
    }

    setupInput() {
      this.keys = this.input.keyboard.addKeys(
        {
          left: "LEFT",
          right: "RIGHT",
          up: "UP",
          a: "A",
          d: "D",
          w: "W",
          space: "SPACE",
          e: "E",
          shift: "SHIFT",
        },
        false
      );
      this.inp = {};
    }

    readInput() {
      const k = this.keys;
      const touch = E.Touch;
      const just = Phaser.Input.Keyboard.JustDown;
      const jumpPressed = just(k.space) || just(k.up) || just(k.w) || touch.jumpQueued;
      const action = just(k.e) || just(k.shift) || touch.actionQueued;
      touch.jumpQueued = false;
      touch.actionQueued = false;
      this.inp = {
        left: k.left.isDown || k.a.isDown || touch.left,
        right: k.right.isDown || k.d.isDown || touch.right,
        jumpPressed,
        jumpHeld: k.space.isDown || k.up.isDown || k.w.isDown || touch.jump,
        action,
      };
    }

    setupCamera() {
      const cam = this.cameras.main;
      cam.setBounds(0, 0, this.worldW, this.worldH);
      cam.startFollow(this.player, true, 0.12, 0.12);
      cam.setDeadzone(70, 40);
      cam.setZoom(1);
    }

    /* ----------------------------- Ability ----------------------------- */
    setupAbility() {
      const id = this.character.id;
      const level = Save.lv(id);
      this.ability = {
        id,
        level,
        cooldown: this.character.cooldown,
        cdLeft: 0,
        active: 0,
        dash: 0,
        dur: E.ABILITY_DURATION[id](level),
      };
      UI.HUD.initAbility(this.character);
    }

    useAbility() {
      const a = this.ability;
      if (a.cdLeft > 0) return;
      a.cdLeft = a.cooldown;
      if (a.id === "kitty") {
        a.dash = a.dur;
      } else {
        a.active = a.dur;
        if (a.id === "foxy") this.airJumps = 0;
      }
      UI.Toast.show(`✨ ${this.character.ability}!`, 900);
    }

    updateAbility(dt) {
      const a = this.ability;
      a.cdLeft = Math.max(0, a.cdLeft - dt);
      a.active = Math.max(0, a.active - dt);
      a.dash = Math.max(0, a.dash - dt);
    }

    /* ----------------------------- Update ----------------------------- */
    update(time, delta) {
      this.readInput();
      if (this.quizActive || this.finished) return;

      const dt = Math.min(delta, 50) / 1000;
      this.levelTime += dt;
      this.state.time += dt;
      this.invuln = Math.max(0, this.invuln - dt);

      this.updateAbility(dt);
      if (this.inp.action) this.useAbility();
      this.updatePlayer(dt);
      this.updateEnemies(dt);
      this.updateBoss(dt);
      this.updateProjectiles(dt);
      this.updateMagnet();
      this.processBreaks();
      this.updateAccessories();

      this.player.setAlpha(this.invuln > 0 ? (Math.floor(this.levelTime * 12) % 2 ? 0.4 : 1) : 1);
      if (this.player.y > this.worldH + 80) this.hurtPlayer(true);

      this.hudTimer -= dt;
      if (this.hudTimer <= 0) {
        this.hudTimer = 0.1;
        const a = this.ability;
        UI.HUD.setAbility({
          cdRatio: a.cdLeft / a.cooldown,
          cdSec: Math.ceil(a.cdLeft),
          active: a.active > 0 || a.dash > 0,
        });
      }
      this.updateNetwork(dt);
    }

    updatePlayer() {
      const p = this.player;
      const b = p.body;
      const a = this.ability;
      const inp = this.inp;
      const onGround = b.blocked.down || b.touching.down;

      if (onGround) {
        this.coyote = 0.1;
        this.airJumps = 0;
      } else {
        this.coyote -= 1 / 60;
      }

      const dir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
      if (dir !== 0) {
        this.facing = dir;
        p.setFlipX(dir < 0);
      }

      let speed = 200;
      if (a.id === "owl" && a.active > 0) speed *= 1.25;

      if (a.dash > 0) {
        b.setAllowGravity(false);
        b.setVelocity(this.facing * 520, 0);
      } else {
        b.setAllowGravity(true);
        if (a.id === "penguin" && a.active > 0) b.setVelocityX(this.facing * 340);
        else b.setVelocityX(dir * speed);

        if (inp.jumpPressed) this.tryJump(onGround);

        if (a.id === "owl" && a.active > 0 && !onGround && inp.jumpHeld && b.velocity.y > 70) {
          b.setVelocityY(70);
        }
      }
    }

    tryJump(onGround) {
      const a = this.ability;
      const p = this.player;
      let vy = -520;
      if (a.id === "bunny" && a.active > 0) vy *= 1.45 + 0.1 * a.level;

      if (onGround || this.coyote > 0) {
        p.setVelocityY(vy);
        this.coyote = 0;
        return;
      }
      if (a.id === "foxy" && a.active > 0) {
        const max = a.level >= 3 ? 2 : 1;
        if (this.airJumps < max) {
          this.airJumps++;
          p.setVelocityY(-500);
          this.puff(p.x, p.y + 14);
        }
      }
    }

    puff(x, y) {
      for (let i = 0; i < 4; i++) {
        const dot = this.add
          .circle(x + Phaser.Math.Between(-8, 8), y, 4, 0xffffff, 0.8)
          .setDepth(9);
        this.tweens.add({
          targets: dot,
          y: y + 10,
          alpha: 0,
          scale: 0.2,
          duration: 350,
          onComplete: () => dot.destroy(),
        });
      }
    }

    popText(x, y, text) {
      const t = this.add
        .text(x, y, text, {
          fontSize: "16px",
          fontStyle: "bold",
          color: "#fff",
          stroke: "#23324a",
          strokeThickness: 4,
        })
        .setOrigin(0.5)
        .setDepth(20);
      this.tweens.add({
        targets: t,
        y: y - 28,
        alpha: 0,
        duration: 800,
        onComplete: () => t.destroy(),
      });
    }

    /* ----------------------------- Magnet ----------------------------- */
    updateMagnet() {
      const a = this.ability;
      const cheetah = a.id === "cheetah" && a.active > 0;
      const radius =
        (cheetah ? 100 + 40 * a.level : 0) * (1 + this.fx.magnet) + this.fx.magnet * 80;
      if (radius <= 0) return;
      const p = this.player;
      this.coins.getChildren().forEach((coin) => {
        if (!coin.active) return;
        if (Phaser.Math.Distance.Between(coin.x, coin.y, p.x, p.y) < radius)
          this.physics.moveToObject(coin, p, 380);
        else coin.body.setVelocity(0, 0);
      });
    }

    /* ----------------------------- Interaksi ----------------------------- */
    collectCoin(player, coin) {
      const kind = coin.getData("kind");
      coin.destroy();
      if (kind === "treasure") {
        this.state.secrets++;
        Save.data.stats.secrets++;
        this.gainCoins(10);
        UI.Toast.show("🌟 Jalan rahasia ditemukan! +10 koin", 2200);
        this.achievementCheck();
      } else {
        this.gainCoins(1);
      }
    }

    gainCoins(n) {
      this.state.coins += n;
      Save.addCoins(n);
      UI.HUD.setStats(this.hudStats());
    }

    onCheckpoint(player, cp) {
      if (cp.getData("on")) return;
      cp.setData("on", true);
      cp.setTexture("cpOn");
      this.checkpoint = { x: cp.x, y: cp.y + 12 };
      Save.write();
      UI.Toast.show("🚩 Checkpoint tersimpan!", 1400);
    }

    onFinishFlag() {
      if (this.finished) return;
      const ready = this.state.keys >= E.KEYS_REQUIRED && this.bossDefeated;
      if (ready) {
        this.finishLevel();
      } else if (this.levelTime - this.lastFlagToast > 2.5) {
        this.lastFlagToast = this.levelTime;
        const need = [];
        if (this.state.keys < E.KEYS_REQUIRED) need.push(`3 kunci 🔑 (${this.state.keys}/3)`);
        if (!this.bossDefeated) need.push("kalahkan bos 👑");
        UI.Toast.show(`Bendera terkunci! Butuh ${need.join(" dan ")}`, 2200);
      }
    }

    refreshFlag() {
      if (!this.finishFlag) return;
      const ready = this.state.keys >= E.KEYS_REQUIRED && this.bossDefeated;
      this.finishFlag.setTexture(ready ? "flagOn" : "flag");
    }

    onBoxHit(player, box) {
      if (this.quizActive || box.getData("used")) return;
      if (!player.body.touching.up) return;
      box.setData("used", true);
      this.tweens.add({ targets: box, y: box.y - 7, duration: 90, yoyo: true });
      this.openQuiz({ box });
    }

    onCrackTouch(player, crack) {
      const a = this.ability;
      if (a.id === "bear" && a.active > 0 && !this.toBreak.includes(crack))
        this.toBreak.push(crack);
    }

    processBreaks() {
      while (this.toBreak.length) {
        const k = this.toBreak.pop();
        if (!k.active) continue;
        this.grid[k.getData("r")][k.getData("c")] = " ";
        for (let i = 0; i < 5; i++) {
          const piece = this.add
            .rectangle(
              k.x + Phaser.Math.Between(-10, 10),
              k.y + Phaser.Math.Between(-10, 10),
              8,
              8,
              0xa0865f
            )
            .setDepth(9);
          this.tweens.add({
            targets: piece,
            x: piece.x + Phaser.Math.Between(-30, 30),
            y: piece.y + 50,
            alpha: 0,
            angle: 180,
            duration: 500,
            onComplete: () => piece.destroy(),
          });
        }
        k.destroy();
        UI.Toast.show("💥 Blok retak hancur!", 900);
      }
    }

    /* ----------------------------- Musuh ----------------------------- */
    updateEnemies() {
      this.enemies.getChildren().forEach((e) => {
        if (!e.active || e.dead) return;
        if (e.y > this.worldH + 100) {
          if (e.label) e.label.destroy();
          e.destroy();
          return;
        }
        if (e.kind === "walker") {
          if (e.body.blocked.left) e.dir = 1;
          else if (e.body.blocked.right) e.dir = -1;
          else if (e.body.blocked.down && !this.solidAt(e.x + e.dir * 18, e.body.bottom + 6))
            e.dir *= -1;
          e.body.setVelocityX(e.dir * e.speed);
          e.setFlipX(e.dir > 0);
        } else {
          if (e.x - e.baseX > 80) e.dir = -1;
          else if (e.x - e.baseX < -80) e.dir = 1;
          e.body.setVelocity(e.dir * 40, Math.cos(this.levelTime * 2 + e.phase) * 56);
          if (e.label) e.label.setPosition(e.x, e.y + 1);
        }
      });
    }

    onEnemyTouch(player, enemy) {
      if (!enemy.active || enemy.dead) return;
      const a = this.ability;
      const stomp = player.body.velocity.y > 0 && player.body.bottom - enemy.body.top < 18;
      const smashing = a.active > 0 && (a.id === "bear" || a.id === "penguin");

      if (stomp) {
        this.killEnemy(enemy);
        player.setVelocityY(-380);
      } else if (smashing || a.dash > 0) {
        this.killEnemy(enemy);
      } else {
        this.hurtPlayer();
      }
    }

    killEnemy(e) {
      if (e.dead) return;
      e.dead = true;
      e.body.enable = false;
      this.state.enemies++;
      if (e.label) {
        e.label.destroy();
        e.label = null;
      }
      this.popText(e.x, e.y - 16, "+100");
      this.gainCoins(2);
      this.tweens.add({
        targets: e,
        scaleY: 0.2,
        alpha: 0,
        duration: 220,
        onComplete: () => e.destroy(),
      });
    }

    isInvulnerable() {
      const a = this.ability;
      return this.invuln > 0 || a.dash > 0 || (a.id === "panda" && a.active > 0);
    }

    hurtPlayer(force = false) {
      if (this.finished) return;
      if (!force && this.isInvulnerable()) return;
      this.respawn();
    }

    respawn() {
      const p = this.player;
      p.setPosition(this.checkpoint.x, this.checkpoint.y);
      p.body.setVelocity(0, 0);
      this.invuln = 1.6;
      this.state.deaths++;
      this.ability.dash = 0;
      this.projectiles.clear(true, true);
      this.cameras.main.flash(250, 255, 255, 255);
      UI.Toast.show("💫 Kembali ke checkpoint (nyawa tak terbatas)", 1500);
    }

    /* ----------------------------- Bos ----------------------------- */
    spawnBoss(x, y) {
      const b = this.physics.add.sprite(x, y, "boss");
      b.setDepth(8);
      b.body.setSize(80, 84).setOffset(8, 10);
      b.setCollideWorldBounds(true);
      b.hp = 5;
      b.maxHp = 5;
      b.phase = "intro";
      b.timer = 0;
      b.dir = -1;
      b.shootCd = 1.5;
      b.hopCd = 4;
      this.boss = b;
    }

    bossSpeed() {
      return 90 + (this.boss.maxHp - this.boss.hp) * 18;
    }

    updateBoss(dt) {
      const b = this.boss;
      if (!b || !b.active) return;
      const p = this.player;
      const left = (this.arena.x0 + 3) * T;
      const right = (this.arena.x1 - 3) * T;

      switch (b.phase) {
        case "intro":
          if (p.x > this.arena.x0 * T) {
            b.phase = "dodge";
            b.timer = 12;
            UI.HUD.bossBar(true, b.hp / b.maxHp);
            UI.Toast.show("👑 Fase 1: Hindari serangan Raja Angka!", 2500);
          }
          break;

        case "dodge":
          b.timer -= dt;
          if (b.x < left) b.dir = 1;
          else if (b.x > right) b.dir = -1;
          b.body.setVelocityX(b.dir * this.bossSpeed());
          b.shootCd -= dt;
          b.hopCd -= dt;
          if (b.shootCd <= 0) {
            b.shootCd = Math.max(0.8, 1.7 - (b.maxHp - b.hp) * 0.15);
            this.bossShoot(Phaser.Math.Angle.Between(b.x, b.y, p.x, p.y));
          }
          if (b.hopCd <= 0 && (b.body.blocked.down || b.body.touching.down)) {
            b.hopCd = 4;
            b.body.setVelocityY(-520);
          }
          if (b.timer <= 0) {
            b.phase = "charge";
            b.timer = 1.2;
            b.body.setVelocityX(0);
            b.setTint(0xffe066);
            UI.Toast.show("⚡ Fase 2: Quiz Attack! Jawab untuk melukai bos!", 2000);
          }
          break;

        case "charge":
          b.timer -= dt;
          b.body.setVelocityX(0);
          if (b.timer <= 0) {
            b.phase = "quiz";
            b.clearTint();
            this.openQuiz({ boss: true });
          }
          break;

        default:
          break;
      }
    }

    bossShoot(angle) {
      const b = this.boss;
      const ball = this.projectiles.create(b.x, b.y - 8, "ball");
      ball.body.setAllowGravity(false);
      ball.setDepth(9);
      ball.life = 4;
      this.physics.velocityFromRotation(angle, 190, ball.body.velocity);
    }

    updateProjectiles(dt) {
      this.projectiles.getChildren().forEach((ball) => {
        if (!ball.active) return;
        ball.life -= dt;
        if (ball.life <= 0 || this.solidAt(ball.x, ball.y)) ball.destroy();
      });
    }

    damageBoss() {
      const b = this.boss;
      b.hp--;
      UI.HUD.bossBar(true, b.hp / b.maxHp);
      this.cameras.main.shake(250, 0.01);
      b.setTint(0xffffff);
      this.time.delayedCall(200, () => b.active && b.clearTint());
      this.popText(b.x, b.y - 60, "💥 -1");

      if (b.hp <= 0) {
        b.phase = "dead";
        b.body.setVelocity(0, 0);
        b.body.enable = false;
        this.bossDefeated = true;
        UI.HUD.bossBar(false);
        UI.Toast.show("🎉 Raja Angka kalah! Bendera finish menunggu.", 2800);
        this.tweens.add({
          targets: b,
          alpha: 0,
          scale: 0.2,
          angle: 360,
          duration: 700,
          onComplete: () => b.destroy(),
        });
        this.refreshFlag();
      } else {
        b.phase = "dodge";
        b.timer = 10;
      }
    }

    /* ----------------------------- Kuis (Pause Total) ----------------------------- */
    freeze(on) {
      const cam = this.cameras.main;
      if (on) {
        this.physics.pause();
        this.time.paused = true;
        this.tweens.pauseAll();
        this.anims.pauseAll();
        cam.zoomTo(1.25, 300);
      } else {
        this.physics.resume();
        this.time.paused = false;
        this.tweens.resumeAll();
        this.anims.resumeAll();
        cam.zoomTo(1, 300);
      }
    }

    async openQuiz(ctx) {
      if (this.quizActive) return;
      this.quizActive = true;
      this.freeze(true);

      const q = this.ai.pick();
      const forced = this.ai.needHint;
      this.ai.needHint = false;
      const hintMode = Math.max(this.fx.hint, forced ? 2 : 0);

      const res = await UI.QuizUI.show({
        title: ctx.boss ? "👑 Quiz Attack!" : "❓ Kuis Kotak",
        question: q,
        level: this.ai.level,
        hintMode,
        hintPulse: forced,
      });

      this.afterQuiz(ctx, res);
    }

    afterQuiz(ctx, res) {
      const s = this.state;
      const stats = Save.data.stats;

      if (res.correct) {
        s.correct++;
        s.streak++;
        stats.correct++;
        stats.bestStreak = Math.max(stats.bestStreak, s.streak);
        const reward = 5 + this.fx.bonus;
        this.gainCoins(reward);
        this.popText(this.player.x, this.player.y - 30, `+${reward}🪙`);
      } else {
        s.wrong++;
        s.streak = 0;
      }

      const change = this.ai.report(res.correct);
      if (change === "up") UI.Toast.show(`🔥 Soal naik ke ${this.ai.level.toUpperCase()}!`, 2000);
      if (change === "down") UI.Toast.show("💡 Soal disederhanakan + petunjuk visual!", 2200);

      if (ctx.box) {
        if (res.correct) {
          s.keys++;
          ctx.box.setTexture("boxUsed");
          this.refreshFlag();
          UI.Toast.show(`🔑 Kunci Angka didapat (${s.keys}/${E.KEYS_REQUIRED})`, 1800);
        } else {
          ctx.box.setData("used", false);
        }
      }

      this.quizActive = false;
      this.freeze(false);
      Save.write();
      this.achievementCheck();
      UI.HUD.setStats(this.hudStats());

      if (ctx.boss && this.boss && this.boss.active) {
        if (res.correct) {
          this.damageBoss();
        } else {
          UI.Toast.show("❌ Salah! Bos menyerang balik!", 1800);
          const b = this.boss;
          for (let i = -1; i <= 1; i++)
            this.bossShoot(
              Phaser.Math.Angle.Between(b.x, b.y, this.player.x, this.player.y) + i * 0.3
            );
          b.phase = "dodge";
          b.timer = 8;
        }
      }
    }

    achievementCheck() {
      E.checkAchievements().forEach((a) => {
        const c = E.CHARACTERS[a.unlock];
        UI.Toast.show(`🏆 ${a.title}! ${c ? c.name + " terbuka!" : ""}`, 3200);
      });
    }

    /* ----------------------------- HUD & skor ----------------------------- */
    calcScore() {
      const s = this.state;
      return s.coins * 10 + s.correct * 50 + s.enemies * 100;
    }

    hudStats() {
      return { coins: this.state.coins, keys: this.state.keys, score: this.calcScore() };
    }

    /* ----------------------------- Selesai level ----------------------------- */
    finishLevel() {
      if (this.finished) return;
      this.finished = true;
      this.physics.pause();
      const s = this.state;

      const timeBonus = Math.max(0, Math.round(120 - s.time)) * 5;
      const score = this.calcScore() + timeBonus;
      const stars = 1 + (s.correct >= 3 ? 1 : 0) + (s.secrets > 0 ? 1 : 0);

      const prev = Save.data.levels[this.levelIdx] || { stars: 0, best: 0 };
      const gained = Math.max(0, stars - prev.stars);
      Save.data.stars += gained;
      Save.addCoins(gained * 15 + 10);
      Save.data.levels[this.levelIdx] = {
        stars: Math.max(prev.stars, stars),
        best: Math.max(prev.best, score),
      };
      Save.data.stats.levelsDone = Object.keys(Save.data.levels).length;
      Save.write();
      this.achievementCheck();

      const lines = [
        `Skor: ${score} (bonus waktu ${timeBonus})`,
        `🪙 Koin: ${s.coins} · 🔑 Kunci: ${s.keys}`,
        `✅ Benar: ${s.correct} · ❌ Salah: ${s.wrong}`,
        `🌟 Rahasia: ${s.secrets} · 👾 Musuh: ${s.enemies}`,
        `Bonus selesai: +${gained * 15 + 10} 🪙`,
      ];

      if (this.mode === "race" && this.net) {
        const time = Math.round(s.time * 10) / 10;
        this.standings.push({ id: this.net.myId, name: Save.data.name, time });
        this.net.send("finish", { name: Save.data.name, time });
        UI.Result.show({
          title: "🏁 Kamu sampai di finish!",
          stars,
          lines: [`Waktu: ${time}s`, ...lines],
          standings: this.standingList(),
          buttons: [{ label: "Kembali ke Lobi", act: "menu", cls: "alt" }],
          onAction: () => {
            UI.Result.hide();
            E.quitToMenu();
          },
        });
        return;
      }

      const hasNext = this.levelIdx < E.LEVELS.length - 1;
      UI.Result.show({
        title: "🎉 Level Selesai!",
        stars,
        lines,
        buttons: [
          ...(hasNext ? [{ label: "Level Berikutnya ▶", act: "next" }] : []),
          { label: "Ulangi", act: "retry", cls: "alt" },
          { label: "Menu", act: "menu", cls: "danger" },
        ],
        onAction: (act) => {
          UI.Result.hide();
          if (act === "next")
            E.startGame({
              level: this.levelIdx + 1,
              mode: "single",
              seed: 20260101 + this.levelIdx + 1,
            });
          else if (act === "retry") E.startGame(this.opts);
          else E.quitToMenu();
        },
      });
    }

    /* ----------------------------- Multiplayer: balapan ----------------------------- */
    setupNetwork() {
      this.net = null;
      this.remotes = {};
      this.standings = [];
      this.netOffs = [];
      if (this.mode !== "race" || !E.net.connected) return;

      this.net = E.net;
      this.netOffs.push(
        this.net.on("pos", (d, from) => this.onRemotePos(d, from)),
        this.net.on("finish", (d, from) => {
          this.standings.push({ id: from, name: d.name, time: d.time });
          if (this.remotes[from]) this.remotes[from].done = true;
          UI.Result.updateStandings(this.standingList());
          UI.Toast.show(`🏁 ${d.name} sampai di finish (${d.time}s)`, 2000);
        }),
        this.net.on("lobby", () => this.pruneRemotes()),
        this.net.on("playerLeft", (id) => this.removeRemote(id))
      );
    }

    onRemotePos(d, from) {
      let r = this.remotes[from];
      if (!r) {
        const info = (this.net.players && this.net.players[from]) || {};
        const char = E.CHARACTERS[d.ch] ? d.ch : "foxy";
        r = {
          sprite: this.add
            .sprite(d.x, d.y, "char_" + char)
            .setAlpha(0.6)
            .setDepth(9),
          label: this.add
            .text(d.x, d.y - 30, info.name || d.n || "Pemain", {
              fontSize: "12px",
              fontStyle: "bold",
              color: "#fff",
              stroke: "#23324a",
              strokeThickness: 3,
            })
            .setOrigin(0.5)
            .setDepth(9),
          name: info.name || d.n || "Pemain",
          pct: 0,
          done: false,
        };
        this.remotes[from] = r;
      }
      r.tx = d.x;
      r.ty = d.y;
      r.pct = d.p;
      r.sprite.setFlipX(!!d.f);
    }

    removeRemote(id) {
      const r = this.remotes[id];
      if (!r) return;
      r.sprite.destroy();
      r.label.destroy();
      delete this.remotes[id];
    }

    pruneRemotes() {
      Object.keys(this.remotes).forEach((id) => {
        if (!this.net.players[id]) this.removeRemote(id);
      });
    }

    standingList() {
      return this.standings
        .slice()
        .sort((a, b) => a.time - b.time)
        .map((s) => ({ name: s.name, label: `${s.time}s` }));
    }

    updateNetwork(dt) {
      if (!this.net) return;
      Object.values(this.remotes).forEach((r) => {
        if (r.tx === undefined) return;
        r.sprite.x += (r.tx - r.sprite.x) * 0.25;
        r.sprite.y += (r.ty - r.sprite.y) * 0.25;
        r.label.setPosition(r.sprite.x, r.sprite.y - 30);
      });

      this.netTimer -= dt;
      if (this.netTimer <= 0) {
        this.netTimer = 0.1;
        const p = this.player;
        this.net.send("pos", {
          x: Math.round(p.x),
          y: Math.round(p.y),
          f: p.flipX ? 1 : 0,
          ch: this.character.id,
          n: Save.data.name,
          p: Math.min(1, p.x / this.worldW),
        });
      }

      this.raceTimer -= dt;
      if (this.raceTimer <= 0) {
        this.raceTimer = 0.5;
        const list = [
          {
            name: `${Save.data.name} (kamu)`,
            label: `${Math.round(Math.min(1, this.player.x / this.worldW) * 100)}%`,
            me: true,
          },
        ];
        Object.values(this.remotes).forEach((r) =>
          list.push({ name: r.name, label: r.done ? "🏁" : `${Math.round((r.pct || 0) * 100)}%` })
        );
        UI.HUD.setRace(list);
      }
    }
  }

  /* ======================================================================
     MODE DUEL KUIS (Adu cepat menjawab)
     ====================================================================== */
  E.Duel = {
    active: false,
    offs: [],

    start(p) {
      this.cleanup();
      this.active = true;
      this.qs = (p.qids || []).map((id) => E.questions.find((q) => q.id === id)).filter(Boolean);
      this.i = 0;
      this.score = 0;
      this.scores = {};
      UI.HUD.show(false);
      this.offs = [
        E.net.on("duelScore", (d, from) => {
          this.scores[from] = d;
          this.render();
        }),
        E.net.on("lobby", () => this.render()),
      ];
      this.render();
      UI.Toast.show("⚡ Duel dimulai! Jawab secepat mungkin.", 2200);
      this.next();
    },

    list() {
      const net = E.net;
      return Object.values(net.players || {})
        .map((pl) => {
          const s = this.scores[pl.id] || { score: 0, done: 0 };
          const me = pl.id === net.myId;
          return {
            name: me ? `${pl.name} (kamu)` : pl.name,
            label: `${s.score} poin · ${s.done}/${this.qs.length}`,
            score: s.score,
            me,
          };
        })
        .sort((a, b) => b.score - a.score);
    },

    render() {
      if (!this.active) return;
      const list = this.list();
      UI.HUD.setRace(list);
      UI.Result.updateStandings(list);
    },

    async next() {
      if (!this.active) return;
      if (this.i >= this.qs.length) {
        this.end();
        return;
      }
      const q = this.qs[this.i];
      const res = await UI.QuizUI.show({
        title: `⚡ Duel ${this.i + 1}/${this.qs.length}`,
        question: q,
        level: q.level,
        hintMode: 0,
        timeLimit: 15,
        reveal: 900,
      });
      if (!this.active) return;

      const points = res.correct ? 100 + Math.round(res.remaining * 6) : 0;
      this.score += points;
      this.i++;
      const data = { score: this.score, done: this.i };
      this.scores[E.net.myId] = data;
      E.net.send("duelScore", data);
      this.render();
      this.next();
    },

    end() {
      UI.Result.show({
        title: "⚡ Duel Selesai!",
        lines: [
          `Skor kamu: ${this.score} poin`,
          "Papan peringkat diperbarui saat pemain lain selesai.",
        ],
        standings: this.list(),
        buttons: [{ label: "Kembali ke Lobi", act: "menu", cls: "alt" }],
        onAction: () => {
          UI.Result.hide();
          E.quitToMenu();
        },
      });
    },

    cleanup() {
      this.offs.forEach((off) => off());
      this.offs = [];
      this.active = false;
      UI.HUD.setRace(null);
    },
  };

  /* ======================================================================
     TITIK MASUK
     ====================================================================== */
  E.startGame = function (opts) {
    UI.Menu.hide();
    UI.Result.hide();
    UI.HUD.show(true);
    E.game.scene.stop("Game");
    E.game.scene.start("Game", opts);
  };

  E.quitToMenu = function () {
    E.Duel.cleanup();
    E.game.scene.stop("Game");
    UI.HUD.show(false);
    UI.Result.hide();
    UI.QuizUI.hide();
    Save.write();
    UI.Menu.show(E.net.connected ? "lobby" : "home");
  };

  window.addEventListener("beforeunload", () => Save.write());

  E.game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: "game",
    width: E.VIEW.w,
    height: E.VIEW.h,
    backgroundColor: "#8fd3ff",
    input: { keyboard: { capture: [] } },
    physics: { default: "arcade", arcade: { gravity: { y: 1200 }, debug: false } },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [BootScene, GameScene],
  });
})();
