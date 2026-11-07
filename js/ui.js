/* ==========================================================================
   EduPaw Adventure - ui.js
   Antarmuka berbasis DOM: Toast, HUD, kontrol sentuh, Quiz Board, Menu,
   layar hasil. Dipisah dari game.js agar mudah dirawat.
   ========================================================================== */
(function () {
  "use strict";

  const E = window.EduPaw;
  const $ = (sel) => document.querySelector(sel);

  /* ---------- Utilitas ---------- */
  const esc = (s) =>
    String(s).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );

  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const subjectName = (id) => {
    const s = (E.subjects || []).find((x) => x.id === id);
    return s ? `${s.emoji} ${s.name}` : "📚 Campuran";
  };

  E.util = { esc, shuffle, wait, subjectName };

  /* ======================================================================
     TOAST
     ====================================================================== */
  const Toast = {
    timer: null,
    show(msg, ms = 2200) {
      const el = $("#toast");
      el.textContent = msg;
      el.classList.add("show");
      clearTimeout(this.timer);
      this.timer = setTimeout(() => el.classList.remove("show"), ms);
    },
  };

  /* ======================================================================
     HUD
     ====================================================================== */
  const HUD = {
    show(on) {
      $("#hud").classList.toggle("hidden", !on);
      $("#ability").classList.toggle("hidden", !on);
      $("#touch").classList.toggle("hidden", !(on && E.Touch.enabled));
      if (!on) {
        this.bossBar(false);
        this.setRace(null);
      }
    },

    setLevel(name) {
      $("#hud-level").textContent = name;
    },

    setStats({ coins, keys, score }) {
      $("#hud-coins").textContent = coins;
      $("#hud-keys").textContent = keys;
      $("#hud-score").textContent = score;
      $("#hud-keys-chip").classList.toggle("ready", keys >= E.KEYS_REQUIRED);
    },

    initAbility(c) {
      $("#ab-emoji").textContent = c.emoji;
      $("#ab-name").textContent = c.ability;
    },

    setAbility({ cdRatio, cdSec, active }) {
      const b = $("#ability");
      b.style.setProperty("--cd", `${Math.round(cdRatio * 360)}deg`);
      $("#ab-cd").textContent = cdSec > 0 ? cdSec : "";
      b.classList.toggle("active", !!active);
    },

    bossBar(show, ratio) {
      $("#boss-bar").classList.toggle("hidden", !show);
      if (show) $("#boss-fill").style.width = `${Math.max(0, ratio) * 100}%`;
    },

    /** list: [{name, label, me}] atau null untuk menyembunyikan */
    setRace(list) {
      const el = $("#race-panel");
      if (!list) {
        el.classList.add("hidden");
        return;
      }
      el.classList.remove("hidden");
      el.innerHTML = list
        .map(
          (p) =>
            `<div class="row ${p.me ? "me" : ""}"><span>${esc(p.name)}</span><span>${esc(p.label)}</span></div>`,
        )
        .join("");
    },
  };

  /* ======================================================================
     KONTROL SENTUH
     ====================================================================== */
  E.Touch = {
    enabled: false,
    left: false,
    right: false,
    jump: false,
    jumpQueued: false,
    actionQueued: false,
  };

  function initTouch() {
    const T = E.Touch;

    const enable = () => {
      T.enabled = true;
      document.body.classList.add("touch");
      if (!$("#hud").classList.contains("hidden"))
        $("#touch").classList.remove("hidden");
    };

    if (
      window.matchMedia("(pointer: coarse)").matches ||
      "ontouchstart" in window
    )
      enable();
    else window.addEventListener("touchstart", enable, { once: true });

    const bind = (selector, onDown, onUp) => {
      const el = $(selector);
      const down = (e) => {
        e.preventDefault();
        onDown();
        el.classList.add("pressed");
      };
      const up = (e) => {
        e.preventDefault();
        if (onUp) onUp();
        el.classList.remove("pressed");
      };
      el.addEventListener("pointerdown", down);
      ["pointerup", "pointercancel", "pointerleave"].forEach((ev) =>
        el.addEventListener(ev, up),
      );
    };

    bind(
      "#t-left",
      () => (T.left = true),
      () => (T.left = false),
    );
    bind(
      "#t-right",
      () => (T.right = true),
      () => (T.right = false),
    );
    bind(
      "#t-jump",
      () => {
        T.jump = true;
        T.jumpQueued = true;
      },
      () => (T.jump = false),
    );
    bind("#ability", () => (T.actionQueued = true));
  }

  /* ======================================================================
     QUIZ BOARD
     ====================================================================== */
  const QuizUI = {
    timer: null,

    /**
     * Menampilkan kuis. Mengembalikan Promise<{correct, chosen, timeout, remaining, ms}>
     * opts: {title, question, subject, level, hintMode(0|1|2), hintPulse, timeLimit, reveal}
     */
    show(opts) {
      return new Promise((resolve) => {
        const q = opts.question;
        const order = shuffle(q.options.map((_, i) => i));
        let eliminated = [];
        if (opts.hintMode >= 2) {
          eliminated = shuffle(order.filter((i) => i !== q.answer)).slice(0, 1);
        }
        const showHint = opts.hintMode >= 1 && q.hint;
        const letters = ["A", "B", "C", "D", "E"];
        const lvl = opts.level || q.level;

        const el = $("#quiz");
        el.innerHTML = `
          <div class="quiz-board">
            <div class="quiz-head">
              <span class="badge">${esc(opts.title || "Kuis")}</span>
              <span class="badge lvl-${lvl}">${lvl.toUpperCase()}</span>
              <span class="badge">${esc(subjectName(q.subject))}</span>
            </div>
            ${opts.timeLimit ? '<div class="quiz-timer"><i></i></div>' : ""}
            <h2 class="quiz-q">${esc(q.q)}</h2>
            ${showHint ? `<div class="quiz-hint ${opts.hintPulse ? "pulse" : ""}">💡 Petunjuk: ${esc(q.hint)}</div>` : ""}
            <div class="quiz-options">
              ${order
                .map(
                  (idx, pos) => `
                <button class="opt ${eliminated.includes(idx) ? "gone" : ""}" data-i="${idx}" ${
                  eliminated.includes(idx) ? "disabled" : ""
                }>
                  <span class="k">${letters[pos]}</span><span>${esc(q.options[idx])}</span>
                </button>`,
                )
                .join("")}
            </div>
            <div class="quiz-feedback"></div>
          </div>`;
        el.classList.remove("hidden");
        requestAnimationFrame(() => el.classList.add("open"));

        const start = performance.now();
        let done = false;

        const onKey = (e) => {
          const n = parseInt(e.key, 10);
          if (n >= 1 && n <= order.length) {
            const btn = el.querySelectorAll(".opt")[n - 1];
            if (btn && !btn.disabled) btn.click();
          }
        };

        const finish = async (chosen, timeout) => {
          if (done) return;
          done = true;
          clearInterval(this.timer);
          window.removeEventListener("keydown", onKey);
          const correct = chosen === q.answer;
          const remaining = opts.timeLimit
            ? Math.max(0, opts.timeLimit - (performance.now() - start) / 1000)
            : 0;
          el.querySelectorAll(".opt").forEach((b) => {
            b.disabled = true;
            const i = Number(b.dataset.i);
            if (i === q.answer) b.classList.add("right");
            else if (i === chosen) b.classList.add("wrong");
          });
          const fb = el.querySelector(".quiz-feedback");
          fb.textContent = timeout
            ? "⏰ Waktu habis!"
            : correct
              ? "🎉 Benar!"
              : "❌ Kurang tepat, jawaban benar ditandai hijau.";
          fb.style.color = correct ? "#1c7a37" : "#a12a2a";
          await wait(opts.reveal || 1300);
          this.hide();
          resolve({
            correct,
            chosen,
            timeout: !!timeout,
            remaining,
            ms: performance.now() - start,
          });
        };

        el.querySelectorAll(".opt").forEach((b) =>
          b.addEventListener("click", () => finish(Number(b.dataset.i), false)),
        );
        window.addEventListener("keydown", onKey);

        if (opts.timeLimit) {
          const bar = el.querySelector(".quiz-timer i");
          this.timer = setInterval(() => {
            const left = opts.timeLimit - (performance.now() - start) / 1000;
            bar.style.width = `${Math.max(0, (left / opts.timeLimit) * 100)}%`;
            if (left <= 0) finish(-1, true);
          }, 100);
        }
      });
    },

    hide() {
      clearInterval(this.timer);
      const el = $("#quiz");
      el.classList.remove("open");
      el.classList.add("hidden");
    },
  };

  /* ======================================================================
     LAYAR HASIL
     ====================================================================== */
  const Result = {
    handler: null,

    show(o) {
      const el = $("#result");
      const stars =
        o.stars != null
          ? "⭐".repeat(o.stars) + "☆".repeat(Math.max(0, 3 - o.stars))
          : "";
      el.innerHTML = `
        <div class="result-card">
          <h2>${esc(o.title)}</h2>
          ${stars ? `<div class="stars">${stars}</div>` : ""}
          <ul>${(o.lines || []).map((l) => `<li>${esc(l)}</li>`).join("")}</ul>
          ${o.standings ? '<div class="standings" id="standings"></div>' : ""}
          <div class="row">
            ${(o.buttons || []).map((b) => `<button class="btn ${b.cls || ""}" data-act="${b.act}">${esc(b.label)}</button>`).join("")}
          </div>
        </div>`;
      el.classList.remove("hidden");
      if (o.standings) this.updateStandings(o.standings);
      this.handler = o.onAction;
      el.onclick = (e) => {
        const btn = e.target.closest("[data-act]");
        if (btn && this.handler) this.handler(btn.dataset.act);
      };
    },

    updateStandings(list) {
      const el = $("#standings");
      if (!el) return;
      el.innerHTML = list
        .map(
          (p, i) =>
            `<div>${["🥇", "🥈", "🥉"][i] || `${i + 1}.`} ${esc(p.name)} — ${esc(p.label)}</div>`,
        )
        .join("");
    },

    hide() {
      $("#result").classList.add("hidden");
    },
  };

  /* ======================================================================
     MENU
     ====================================================================== */
  const ABILITY_ICON = {
    foxy: "🦘",
    bunny: "🚀",
    kitty: "💨",
    panda: "🛡️",
    owl: "🪂",
    bear: "🔨",
    penguin: "🧊",
    cheetah: "🧲",
  };

  const kbd = (...keys) => keys.map((k) => `<kbd>${k}</kbd>`).join(" ");

  /** Halaman panduan "Cara Bermain". */
  const HOWTO = [
    {
      icon: "🎮",
      title: "Cara Mengontrol",
      html: () => `
        <div class="how-cols">
          <div class="how-box">
            <h4>💻 Komputer</h4>
            <ul class="keys">
              <li>${kbd("A", "D")} atau ${kbd("◀", "▶")}<span>Jalan</span></li>
              <li>${kbd("Spasi")} ${kbd("W")} ${kbd("▲")}<span>Lompat</span></li>
              <li>${kbd("E")} atau ${kbd("Shift")}<span>Skill hewan</span></li>
              <li>${kbd("1")}–${kbd("4")}<span>Jawab kuis</span></li>
            </ul>
          </div>
          <div class="how-box">
            <h4>📱 HP / Tablet</h4>
            <ul class="keys">
              <li><kbd>◀</kbd> <kbd>▶</kbd><span>D-Pad kiri bawah</span></li>
              <li><kbd>⤒</kbd><span>Tombol lompat</span></li>
              <li><kbd>🐾</kbd><span>Action Paw = skill</span></li>
              <li><kbd>👆</kbd><span>Ketuk jawaban kuis</span></li>
            </ul>
          </div>
        </div>
        <p class="how-note">Kontrol otomatis menyesuaikan perangkatmu. Putar HP ke mode landscape.</p>`,
    },
    {
      icon: "🔑",
      title: "Misi: Kumpulkan 3 Kunci",
      html: () => `
        <ol class="how-steps">
          <li><b>Sundul kotak ❓</b> dari bawah dengan melompat.</li>
          <li><b>Jawab kuis</b> yang muncul. Jawaban benar memberi <b>🔑 Kunci Angka</b> dan koin.</li>
          <li>Salah jawab? Tenang, kotaknya <b>bisa dicoba lagi</b>.</li>
          <li>Kumpulkan <b>minimal 3 🔑</b>. Bendera finish baru menyala dan bisa disentuh.</li>
        </ol>
        <div class="how-demo">
          <span class="chip">🔑 <b>2</b>/3</span><span class="arrow">➜</span>
          <span class="chip ok">🔑 <b>3</b>/3</span><span class="arrow">➜</span><span class="big-ico">🏁</span>
        </div>`,
    },
    {
      icon: "🧠",
      title: "Kuis yang Menyesuaikan Kamu",
      html: () => `
        <ul class="how-list">
          <li>⏸️ Saat kuis muncul, <b>seluruh dunia game berhenti</b>. Kamu bebas berpikir.</li>
          <li>✅ <b>3 jawaban benar</b> beruntun: soal naik tingkat.</li>
          <li>❌ <b>2 jawaban salah</b> beruntun: soal dibuat lebih mudah dan muncul <b>💡 petunjuk visual</b>.</li>
          <li>🪙 Setiap jawaban benar memberi <b>+5 koin edukasi</b>.</li>
        </ul>
        <div class="how-demo levels">
          <span class="lv easy">Mudah</span><span class="arrow">⇄</span>
          <span class="lv med">Sedang</span><span class="arrow">⇄</span>
          <span class="lv hard">Sulit</span>
        </div>`,
    },
    {
      icon: "👾",
      title: "Musuh, Bahaya & Checkpoint",
      html: () => `
        <ul class="how-list">
          <li>🦶 <b>Injak musuh dari atas</b> untuk mengalahkannya, termasuk <b>Monster Angka 🔢</b>.</li>
          <li>⚠️ Hindari <b>duri</b>, jangan tertabrak dari samping, dan jangan jatuh ke jurang.</li>
          <li>🚩 Sentuh <b>bendera checkpoint</b> untuk menyimpan titik. Kalau terkena, kamu muncul lagi di sana.</li>
          <li>♾️ <b>Nyawa tak terbatas</b>. Coba lagi sepuasnya!</li>
        </ul>`,
    },
    {
      icon: "⭐",
      title: "Skill Hewan & Jalan Rahasia",
      html: () => `
        <p class="how-lead">Tekan ${kbd("E")} / tombol 🐾 untuk skill. Setelah dipakai ada <b>cooldown 8–12 detik</b> (lingkaran hitung mundur).</p>
        <div class="skill-grid">
          ${E.CHARACTER_ORDER.map((id) => {
            const c = E.CHARACTERS[id];
            return `<div class="skill"><span>${ABILITY_ICON[id]}</span><b>${c.name}</b><small>${c.ability}</small></div>`;
          }).join("")}
        </div>
        <ul class="how-list tight">
          <li>🔓 Bear membobol <b>blok retak</b>, Owl melayang melewati <b>jurang jauh</b>: ada jalur rahasia berisi bintang!</li>
          <li>⬆️ Naikkan skill ke Lv1–3 di menu <b>Karakter</b>, beli aksesori di <b>Lemari</b>.</li>
        </ul>`,
    },
    {
      icon: "👑",
      title: "Melawan Bos Raja Angka",
      html: () => `
        <div class="boss-bar"><span>👑</span><div><i></i></div><b>HP 5</b></div>
        <div class="how-cols">
          <div class="how-box">
            <h4>🏃 Fase 1: Hindari</h4>
            <p>Bos berjalan dan melompat sambil menembakkan bola angka. <b>Hindari selama 12 detik</b>.</p>
          </div>
          <div class="how-box">
            <h4>⚡ Fase 2: Quiz Attack</h4>
            <p>Bos berhenti dan muncul kuis. <b>Benar = bos terluka 💥 (-1 HP)</b>. Salah = bos menembak balik 3 bola.</p>
          </div>
        </div>
        <p class="how-note">Ulangi sampai HP bos habis, lalu pastikan punya 3 🔑 dan sentuh bendera finish 🏁.</p>`,
    },
    {
      icon: "👥",
      title: "Main Bareng (LAN)",
      html: () => `
        <ul class="how-list">
          <li>🏠 Satu pemain pilih <b>Buat Room</b> dan membagikan <b>kode 4 huruf</b>.</li>
          <li>🚪 Teman di Wi-Fi yang sama pilih <b>Gabung</b> dan memasukkan kode.</li>
          <li>🏁 <b>Balapan</b>: yang pertama sampai bendera menang.</li>
          <li>⚡ <b>Adu Cepat Kuis</b>: jawab paling cepat dan benar untuk poin terbanyak.</li>
        </ul>`,
    },
  ];

  const Menu = {
    screen: "title",
    page: 0,
    lan: { mode: "race", level: 0, subject: "mixed", busy: false },

    show(screen) {
      if (screen) this.screen = screen;
      if (!E.Save.data.starterChosen && this.screen === "home")
        this.screen = "starter";
      $("#menu").classList.remove("hidden");
      this.render();
      $("#menu").scrollTop = 0;
    },

    hide() {
      $("#menu").classList.add("hidden");
    },

    render() {
      const build = this["screen_" + this.screen] || this.screen_home;
      const menu = $("#menu");
      menu.dataset.screen = this.screen;
      menu.innerHTML = `${E.scenery ? E.scenery() : ""}<div class="menu-body">${build.call(this)}</div>`;
    },

    header(title) {
      const d = E.Save.data;
      return `
        <div class="topbar">
          <button class="btn small alt" data-act="home">⬅ Kembali</button>
          <h2>${title}</h2>
          <span class="chip">🪙 ${d.coins} · ⭐ ${d.stars}</span>
        </div>`;
    },

    /* ---------- Layar-layar ---------- */
    screen_title() {
      const d = E.Save.data;
      const returning = d.starterChosen;
      return `
        <img class="logo-img hero" src="assets/logo.png" alt="EduPaw Adventure" />
        <p class="tagline">Belajar sambil berpetualang!</p>
        <form class="login-card" data-form="start" autocomplete="off">
          <label for="player-name">${returning ? `Selamat datang kembali, ${esc(d.name)}!` : "Siapa namamu, petualang?"}</label>
          <input id="player-name" maxlength="14" placeholder="Tulis namamu di sini..." value="${d.name === "Pemain" ? "" : esc(d.name)}" />
          <button type="button" class="btn cta" data-act="start">▶ ${returning ? "LANJUTKAN" : "MULAI PETUALANGAN"}</button>
          <div class="mini-row">
            <button type="button" class="btn mini" data-act="howto">📖 Cara Bermain</button>
            <button type="button" class="btn mini" data-act="settings">⚙️ Pengaturan</button>
          </div>
        </form>
        <div class="mascot">${E.avatar(d.selected)}</div>
                <div class="lfoot"><b>Edupaw Adventure</b><br>Dikembangkan oleh Kuslan Wawan © 2026</div>`;
    },

    screen_home() {
      const d = E.Save.data;
      const c = E.CHARACTERS[d.selected];
      return `
        <img class="logo-img" src="assets/logo.png" alt="EduPaw Adventure" />
        <div class="player-bar">
          <div class="player-avatar">${E.avatar(d.selected)}</div>
          <div class="player-info"><b>${esc(d.name)}</b><span>${c.name} · Lv${E.Save.lv(d.selected)}</span></div>
          <span class="chip">🪙 ${d.coins}</span><span class="chip">⭐ ${d.stars}</span>
        </div>
        <div class="menu-buttons">
          <button class="btn cta" data-act="levels">▶ MAIN</button>
          <div class="tile-grid">
            <button class="tile t-blue" data-act="chars"><span>🐾</span>Karakter<br />&amp; Upgrade</button>
            <button class="tile t-purple" data-act="wardrobe"><span>👒</span>Lemari<br />Aksesori</button>
            <button class="tile t-green" data-act="howto"><span>📖</span>Cara<br />Bermain</button>
            <button class="tile t-pink" data-act="lan"><span>👥</span>Multiplayer<br />LAN</button>
          </div>
          <div class="mini-row">
            <button class="btn mini" data-act="settings">⚙️ Pengaturan</button>
            <button class="btn mini" data-act="title">🏠 Layar Awal</button>
          </div>
        </div>`;
    },

    screen_starter() {
      const d = E.Save.data;
      const cards = E.CHARACTER_ORDER.filter((id) => E.CHARACTERS[id].starter)
        .map((id) => {
          const c = E.CHARACTERS[id];
          const dur = E.ABILITY_DURATION[id](1);
          return `
          <article class="pick-card" style="--glow:${E.hex(c.aura)}">
            <div class="pick-avatar">${E.avatar(id)}</div>
            <h3>${c.name}</h3>
            <span class="pill">${ABILITY_ICON[id]} ${c.ability}</span>
            <p>${c.desc}</p>
            <ul class="mini-stats">
              <li><span>Cooldown</span><b>${c.cooldown} dtk</b></li>
              <li><span>Durasi</span><b>${dur.toFixed(1)} dtk</b></li>
            </ul>
            <button class="btn big" data-act="pickStarter" data-id="${id}">Pilih ${c.name}</button>
          </article>`;
        })
        .join("");
      return `
        <img class="logo-img small" src="assets/logo.png" alt="EduPaw Adventure" />
        <h1 class="heading">Pilih Teman Pertamamu!</h1>
        <p class="sub">Halo, <b>${esc(d.name)}</b>! Pilih 1 dari 3 hewan starter. Lima hewan lain bisa dibuka lewat achievement dan koin edukasi.</p>
        <div class="starter-row">${cards}</div>
        <div class="mini-row"><button class="btn mini" data-act="title">⬅ Kembali</button></div>`;
    },

    screen_howto() {
      const pg = HOWTO[this.page];
      const last = this.page === HOWTO.length - 1;
      const dots = HOWTO.map(
        (h, i) =>
          `<button class="dot ${i === this.page ? "on" : ""}" data-act="howGo" data-i="${i}" aria-label="Halaman ${i + 1}"></button>`,
      ).join("");
      return `
        <h1 class="heading small">📖 Cara Bermain</h1>
        <section class="how-card">
          <header><span class="how-ico">${pg.icon}</span><h2>${pg.title}</h2><small>${this.page + 1}/${HOWTO.length}</small></header>
          <div class="how-body">${pg.html()}</div>
        </section>
        <div class="dots">${dots}</div>
        <div class="how-nav">
          <button class="btn alt" data-act="howPrev" ${this.page === 0 ? "disabled" : ""}>◀ Kembali</button>
          <button class="btn mini" data-act="howSkip">Lewati</button>
          <button class="btn big" data-act="howNext">${last ? "Siap Main! ▶" : "Lanjut ▶"}</button>
        </div>`;
    },

    screen_levels() {
      const d = E.Save.data;
      const cards = E.LEVELS.map((lv, i) => {
        const done = d.levels[i];
        const locked = i > 0 && !d.levels[i - 1];
        const stars = done
          ? "⭐".repeat(done.stars) + "☆".repeat(3 - done.stars)
          : "☆☆☆";
        return `
        <div class="card ${locked ? "locked" : ""}">
          <div class="em">${lv.boss ? "👑" : i === 0 ? "🌳" : "💎"}</div>
          <h3>Level ${i + 1}: ${lv.name}</h3>
          <p>${lv.boss ? "Pertarungan bos: fase hindari + fase Quiz Attack." : "Kumpulkan 3 Kunci 🔑 dari kotak ❓ lalu capai bendera finish."}</p>
          <span class="tag">${stars}${done ? ` · Skor ${done.best}` : ""}</span>
          <div class="actions">
            <button class="btn small" data-act="play" data-i="${i}" ${locked ? "disabled" : ""}>${locked ? "🔒 Terkunci" : "Mulai"}</button>
          </div>
        </div>`;
      }).join("");
      return `${this.header("Pilih Level")}<div class="grid">${cards}</div>`;
    },

    screen_chars() {
      const d = E.Save.data;
      const cards = E.CHARACTER_ORDER.map((id) => {
        const c = E.CHARACTERS[id];
        const owned = E.Save.isUnlocked(id);
        const lv = E.Save.lv(id);
        const ach = E.ACHIEVEMENTS.find((a) => a.unlock === id);
        let actions = "";
        let req = "";

        if (owned) {
          actions +=
            d.selected === id
              ? `<button class="btn small" disabled>✔ Dipakai</button>`
              : `<button class="btn small big" data-act="select" data-id="${id}">Pilih</button>`;
          if (lv < 3) {
            const cost = E.UPGRADE_COST[lv + 1];
            actions += `<button class="btn small alt" data-act="upgrade" data-id="${id}" ${d.coins < cost ? "disabled" : ""}>⬆ Lv${lv + 1} (🪙${cost})</button>`;
          }
        } else {
          if (ach)
            req = `🏆 ${ach.title}: ${ach.desc} (${ach.progress(d.stats)})`;
          actions += `<button class="btn small alt" data-act="buyChar" data-id="${id}" ${d.coins < c.price ? "disabled" : ""}>Beli 🪙${c.price}</button>`;
        }

        return `
        <div class="card ${d.selected === id ? "sel" : ""} ${owned ? "" : "locked"}">
          <div class="em-avatar">${E.avatar(id, !owned)}</div>
          <h3>${c.name} ${owned ? `<small>Lv${lv}</small>` : ""}</h3>
          <span class="tag">${c.ability}</span>
          <p>${c.desc}</p>
          ${owned ? `<p class="note">Durasi: ${E.ABILITY_DURATION[id](lv).toFixed(1)}s · Cooldown ${c.cooldown}s</p>` : ""}
          ${req ? `<p class="req">${req}</p>` : ""}
          <div class="actions">${actions}</div>
        </div>`;
      }).join("");
      return `${this.header("Karakter")}<div class="grid">${cards}</div>`;
    },

    screen_wardrobe() {
      const d = E.Save.data;
      const cards = E.WARDROBE.map((it) => {
        const owned = d.wardrobe.owned.includes(it.id);
        const on = d.wardrobe.equipped[it.slot] === it.id;
        let btn;
        if (!owned)
          btn = `<button class="btn small alt" data-act="buyItem" data-id="${it.id}" ${d.coins < it.price ? "disabled" : ""}>Beli 🪙${it.price}</button>`;
        else if (on)
          btn = `<button class="btn small danger" data-act="unequip" data-id="${it.id}">Lepas</button>`;
        else
          btn = `<button class="btn small big" data-act="equip" data-id="${it.id}">Pakai</button>`;
        return `
        <div class="card ${on ? "sel" : ""}">
          <div class="em">${it.emoji}</div>
          <h3>${it.name}</h3>
          <span class="tag">${E.SLOT_LABEL[it.slot]}</span>
          <p>${it.info}</p>
          <div class="actions">${btn}</div>
        </div>`;
      }).join("");
      return `${this.header("Lemari Aksesori")}<div class="grid">${cards}</div>`;
    },

    screen_settings() {
      const d = E.Save.data;
      const subjects = [
        { id: "mixed", name: "Campuran", emoji: "📚" },
        ...(E.subjects || []),
      ];
      return `
        ${this.header("Pengaturan")}
        <div class="panel">
          <label for="set-name">Nama pemain</label>
          <input id="set-name" maxlength="14" value="${esc(d.name)}" />
          <label for="set-subject">Mata pelajaran kuis</label>
          <select id="set-subject">
            ${subjects.map((s) => `<option value="${s.id}" ${d.subject === s.id ? "selected" : ""}>${s.emoji} ${esc(s.name)}</option>`).join("")}
          </select>
          <div class="row">
            <button class="btn" data-act="saveSettings">Simpan</button>
            <button class="btn danger" data-act="resetSave">Hapus Progres</button>
          </div>
        </div>
        <p class="note">Progres disimpan di browser (LocalStorage) pada perangkat ini.</p>`;
    },

    screen_lan() {
      const d = E.Save.data;
      if (!E.net.available) {
        return `${this.header("Multiplayer LAN")}<div class="panel"><b>Library PeerJS tidak termuat.</b><p class="note">Letakkan peerjs.min.js di folder /libs atau sambungkan internet sekali agar CDN termuat.</p></div>`;
      }
      return `
        ${this.header("Multiplayer LAN")}
        <div class="panel">
          <label for="lan-name">Nama</label>
          <input id="lan-name" maxlength="14" value="${esc(d.name)}" />
          <label for="lan-server">Server LAN (opsional, contoh 192.168.1.5:8080)</label>
          <input id="lan-server" value="${esc(this.lan.server || "")}" placeholder="kosong = server signaling bawaan PeerJS" />
          <p class="note" id="lan-detect"></p>
          <div class="row"><button class="btn big" data-act="createRoom" ${this.lan.busy ? "disabled" : ""}>🏠 Buat Room</button></div>
        </div>
        <div class="panel">
          <label for="lan-code">Kode Room</label>
          <input id="lan-code" maxlength="4" placeholder="ABCD" style="text-transform:uppercase" />
          <div class="row"><button class="btn alt" data-act="joinRoom" ${this.lan.busy ? "disabled" : ""}>🚪 Gabung</button></div>
        </div>`;
    },

    screen_lobby() {
      const net = E.net;
      const players = Object.values(net.players || {});
      const subjects = [
        { id: "mixed", name: "Campuran", emoji: "📚" },
        ...(E.subjects || []),
      ];
      const host = net.isHost;
      const l = this.lan;
      const controls = host
        ? `
        <label for="lob-mode">Mode</label>
        <select id="lob-mode" data-field="mode">
          <option value="race" ${l.mode === "race" ? "selected" : ""}>🏁 Balapan ke Bendera</option>
          <option value="duel" ${l.mode === "duel" ? "selected" : ""}>⚡ Adu Cepat Kuis</option>
        </select>
        ${
          l.mode === "race"
            ? `<label for="lob-level">Level</label>
               <select id="lob-level" data-field="level">
                 ${E.LEVELS.slice(0, 2)
                   .map(
                     (lv, i) =>
                       `<option value="${i}" ${Number(l.level) === i ? "selected" : ""}>Level ${i + 1}: ${lv.name}</option>`,
                   )
                   .join("")}
               </select>`
            : ""
        }
        <label for="lob-subject">Mata pelajaran</label>
        <select id="lob-subject" data-field="subject">
          ${subjects.map((s) => `<option value="${s.id}" ${l.subject === s.id ? "selected" : ""}>${s.emoji} ${esc(s.name)}</option>`).join("")}
        </select>
        <div class="row"><button class="btn big" data-act="startMatch" ${players.length < 1 ? "disabled" : ""}>▶ Mulai Pertandingan</button></div>`
        : `<p class="note">Menunggu host memulai pertandingan...</p>`;

      return `
        ${this.header("Lobi Room")}
        <div class="panel">
          <div class="note" style="text-align:center">Kode Room</div>
          <div class="room-code">${esc(net.code || "----")}</div>
          <p class="note" style="text-align:center">Teman di jaringan yang sama memilih “Gabung” dan memasukkan kode ini.</p>
          <ul class="players">
            ${players.map((p) => `<li>${E.CHARACTERS[p.char] ? E.CHARACTERS[p.char].emoji : "🐾"} ${esc(p.name)} ${p.host ? "👑 Host" : ""} ${p.id === net.myId ? "(kamu)" : ""}</li>`).join("")}
          </ul>
          ${controls}
          <div class="row"><button class="btn danger small" data-act="leaveRoom">Keluar Room</button></div>
        </div>`;
    },

    /* ---------- Aksi klik ---------- */
    async act(name, el) {
      const d = E.Save.data;
      const id = el && el.dataset.id;

      switch (name) {
        case "home":
          if (this.screen === "lobby") return;
          this.show("home");
          break;
        case "levels":
        case "chars":
        case "wardrobe":
        case "settings":
          this.show(name);
          break;
        case "lan":
          this.show("lan");
          this.detectServer();
          break;

        case "start": {
          const input = $("#player-name");
          d.name = ((input && input.value.trim()) || "Pemain").slice(0, 14);
          E.Save.write();
          this.show(d.starterChosen ? "home" : "starter");
          break;
        }

        case "title":
          this.show("title");
          break;

        case "howto":
          this.page = 0;
          this.show("howto");
          break;

        case "howPrev":
          this.page = Math.max(0, this.page - 1);
          this.render();
          break;

        case "howGo":
          this.page = Number(el.dataset.i) || 0;
          this.render();
          break;

        case "howNext":
          if (this.page < HOWTO.length - 1) {
            this.page++;
            this.render();
            break;
          }
          this.act("howDone");
          break;

        case "howSkip":
        case "howDone":
          d.seenHowto = true;
          E.Save.write();
          this.show(this.howBack || "home");
          this.howBack = null;
          break;

        case "pickStarter":
          d.starterChosen = true;
          d.selected = id;
          if (!d.unlocked.includes(id)) d.unlocked.push(id);
          E.Save.write();
          if (d.seenHowto) {
            this.show("home");
          } else {
            this.page = 0;
            this.show("howto");
          }
          break;

        case "play":
          E.startGame({
            level: Number(el.dataset.i),
            mode: "single",
            seed: 20260101 + Number(el.dataset.i),
          });
          break;

        case "select":
          d.selected = id;
          E.Save.write();
          this.render();
          break;

        case "upgrade": {
          const next = E.Save.lv(id) + 1;
          const cost = E.UPGRADE_COST[next];
          if (cost && d.coins >= cost) {
            d.coins -= cost;
            d.upgrades[id] = next;
            E.Save.write();
            Toast.show(`⬆ ${E.CHARACTERS[id].name} naik ke Lv${next}!`);
            this.render();
          }
          break;
        }

        case "buyChar": {
          const c = E.CHARACTERS[id];
          if (d.coins >= c.price) {
            d.coins -= c.price;
            d.unlocked.push(id);
            E.Save.write();
            Toast.show(`🎉 ${c.name} terbuka!`);
            this.render();
          }
          break;
        }

        case "buyItem": {
          const it = E.WARDROBE.find((w) => w.id === id);
          if (it && d.coins >= it.price) {
            d.coins -= it.price;
            d.wardrobe.owned.push(id);
            d.wardrobe.equipped[it.slot] = id;
            E.Save.write();
            Toast.show(`${it.emoji} ${it.name} dipakai!`);
            this.render();
          }
          break;
        }

        case "equip": {
          const it = E.WARDROBE.find((w) => w.id === id);
          d.wardrobe.equipped[it.slot] = id;
          E.Save.write();
          this.render();
          break;
        }

        case "unequip": {
          const it = E.WARDROBE.find((w) => w.id === id);
          d.wardrobe.equipped[it.slot] = null;
          E.Save.write();
          this.render();
          break;
        }

        case "saveSettings":
          d.name = ($("#set-name").value.trim() || "Pemain").slice(0, 14);
          d.subject = $("#set-subject").value;
          E.Save.write();
          Toast.show("Pengaturan disimpan ✔");
          this.show("home");
          break;

        case "resetSave":
          if (
            window.confirm(
              "Hapus semua progres? Tindakan ini tidak bisa dibatalkan.",
            )
          ) {
            E.Save.reset();
            this.show("home");
          }
          break;

        case "createRoom":
          await this.connect(true);
          break;
        case "joinRoom":
          await this.connect(false);
          break;
        case "leaveRoom":
          E.net.leave();
          this.show("lan");
          break;
        case "startMatch":
          this.startMatch();
          break;
        default:
          break;
      }
    },

    /* ---------- Multiplayer ---------- */
    async detectServer() {
      const box = $("#lan-detect");
      const found = await E.net.detectLocalServer();
      if (found && this.screen === "lan") {
        $("#lan-server").value = found;
        this.lan.server = found;
        if (box) box.textContent = `✔ Server LAN lokal terdeteksi (${found}).`;
      } else if (box) {
        box.textContent =
          "Tidak ada server LAN lokal terdeteksi. Jalankan 'node lan-server.js' untuk mode offline.";
      }
    },

    async connect(asHost) {
      const name = ($("#lan-name").value.trim() || "Pemain").slice(0, 14);
      const server = $("#lan-server").value.trim();
      const code = ($("#lan-code").value || "").trim().toUpperCase();
      const d = E.Save.data;
      d.name = name;
      E.Save.write();
      this.lan.server = server;

      if (!asHost && code.length < 4) {
        Toast.show("Masukkan 4 karakter kode room.");
        return;
      }

      this.lan.busy = true;
      Toast.show(asHost ? "Membuat room..." : "Menghubungkan...", 8000);
      try {
        const opts = { name, char: d.selected, server };
        if (asHost) await E.net.createRoom(opts);
        else await E.net.joinRoom(code, opts);
        Toast.show("Terhubung ✔");
        this.lan.busy = false;
        this.show("lobby");
      } catch (err) {
        this.lan.busy = false;
        Toast.show(`Gagal: ${err.message || err.type || err}`, 3500);
        this.render();
      }
    },

    startMatch() {
      const net = E.net;
      const l = this.lan;
      const payload = {
        mode: l.mode,
        level: Number(l.level),
        subject: l.subject,
        seed: Math.floor(Math.random() * 1e9),
        qids: null,
      };

      if (l.mode === "duel") {
        const pool = E.questions.filter(
          (q) => l.subject === "mixed" || q.subject === l.subject,
        );
        const pick = (lv, n) =>
          shuffle(pool.filter((q) => q.level === lv)).slice(0, n);
        let chosen = [
          ...pick("easy", 3),
          ...pick("medium", 3),
          ...pick("hard", 2),
        ];
        if (chosen.length < 5) chosen = shuffle(pool).slice(0, 8);
        payload.qids = chosen.map((q) => q.id);
      }

      net.send("start", payload);
      this.beginMatch(payload);
    },

    beginMatch(p) {
      if (p.mode === "duel") {
        this.hide();
        E.Duel.start(p);
      } else {
        E.startGame({
          level: p.level,
          mode: "race",
          seed: p.seed,
          subject: p.subject,
        });
      }
    },

    bindNetwork() {
      const net = E.net;
      net.on("lobby", () => {
        if (this.screen === "lobby" && !$("#menu").classList.contains("hidden"))
          this.render();
      });
      net.on("start", (p) => this.beginMatch(p));
      net.on("disconnected", () => {
        Toast.show("Terputus dari host.", 3000);
        if (E.game && E.game.scene.isActive("Game")) E.quitToMenu();
        this.show("lan");
      });
      net.on("error", (err) =>
        Toast.show(`Jaringan: ${err.type || err.message || err}`, 3000),
      );
    },
  };

  /* ======================================================================
     INISIALISASI
     ====================================================================== */
  function init() {
    initTouch();

    const menuEl = $("#menu");
    menuEl.addEventListener("click", (e) => {
      const el = e.target.closest("[data-act]");
      if (el && !el.disabled) Menu.act(el.dataset.act, el);
    });
    menuEl.addEventListener("change", (e) => {
      const field = e.target.dataset && e.target.dataset.field;
      if (!field) return;
      Menu.lan[field] = e.target.value;
      if (field === "mode") Menu.render();
    });

    menuEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && e.target.id === "player-name") {
        e.preventDefault();
        Menu.act("start");
      }
    });

    $("#btn-home").addEventListener("click", () => E.quitToMenu());
    Menu.bindNetwork();
    Menu.show("title");
  }

  E.UI = { Toast, HUD, QuizUI, Result, Menu, init };
})();
