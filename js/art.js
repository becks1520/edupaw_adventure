/* ==========================================================================
   EduPaw Adventure - art.js
   Ilustrasi vektor (SVG) untuk antarmuka: potret hewan chibi dan latar
   pemandangan. Dibuat dari data E.CHARACTERS sehingga warna selalu sinkron.
   ========================================================================== */
(function () {
  "use strict";

  const E = (window.EduPaw = window.EduPaw || {});

  const hex = (n) => `#${n.toString(16).padStart(6, "0")}`;

  /** Gelapkan/terangkan warna integer. f < 1 = lebih gelap. */
  function shade(n, f) {
    const ch = (v) => Math.max(0, Math.min(255, Math.round(v * f)));
    const r = ch((n >> 16) & 255);
    const g = ch((n >> 8) & 255);
    const b = ch(n & 255);
    return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
  }

  const INK = "#2a1c18";

  /* ----------------------------- Telinga ----------------------------- */
  function ears(c, body, line) {
    const earFill = c.earColor ? hex(c.earColor) : body;
    const inner = c.patch ? "#555" : "#ff9fb4";
    const mirror = (svg) => `<g transform="translate(200 0) scale(-1 1)">${svg}</g>`;
    let one = "";

    switch (c.ear) {
      case "point":
        one = `<path d="M46,74 L56,14 L98,52 Z" fill="${earFill}" stroke="${line}" stroke-width="4" stroke-linejoin="round"/>
               <path d="M58,62 L61,32 L82,52 Z" fill="#3b2418"/>`;
        break;
      case "tri":
        one = `<path d="M48,74 L54,26 L94,54 Z" fill="${earFill}" stroke="${line}" stroke-width="4" stroke-linejoin="round"/>
               <path d="M58,64 L60,40 L80,54 Z" fill="${inner}"/>`;
        break;
      case "long":
        one = `<g transform="rotate(-10 70 38)">
                 <ellipse cx="70" cy="38" rx="16" ry="40" fill="${earFill}" stroke="${line}" stroke-width="4"/>
                 <ellipse cx="70" cy="42" rx="8" ry="28" fill="${inner}"/></g>`;
        break;
      case "tuft":
        one = `<path d="M44,70 L50,22 L88,50 Z" fill="${earFill}" stroke="${line}" stroke-width="4" stroke-linejoin="round"/>`;
        break;
      case "round":
        one = `<circle cx="56" cy="58" r="21" fill="${earFill}" stroke="${line}" stroke-width="4"/>
               <circle cx="56" cy="60" r="10" fill="${c.patch ? "#444" : shade(c.body, 0.8)}"/>`;
        break;
      default:
        return "";
    }
    return one + mirror(one);
  }

  /* ----------------------------- Ekor ----------------------------- */
  function tail(id, body, line) {
    switch (id) {
      case "foxy":
        return `<ellipse cx="166" cy="140" rx="34" ry="17" transform="rotate(-38 166 140)" fill="${body}" stroke="${line}" stroke-width="4"/>
                <ellipse cx="184" cy="116" rx="15" ry="11" transform="rotate(-38 184 116)" fill="#fff"/>`;
      case "kitty":
      case "cheetah":
        return `<path d="M136,164 C190,176 196,122 172,110" fill="none" stroke="${line}" stroke-width="20" stroke-linecap="round"/>
                <path d="M136,164 C190,176 196,122 172,110" fill="none" stroke="${body}" stroke-width="13" stroke-linecap="round"/>`;
      case "bunny":
        return `<circle cx="148" cy="170" r="13" fill="#fff" stroke="#d7cdea" stroke-width="3"/>`;
      default:
        return "";
    }
  }

  /* ----------------------------- Potret ----------------------------- */
  /**
   * Potret setengah badan hewan (viewBox 200x200).
   * @param {string} id  kunci karakter, mis. "foxy"
   */
  E.portrait = function (id) {
    const c = E.CHARACTERS[id];
    if (!c) return "";
    const body = hex(c.body);
    const belly = hex(c.belly);
    const line = c.patch ? "#2b2b2b" : shade(c.body, 0.62);
    const isOwl = id === "owl";
    const isPenguin = id === "penguin";
    const isPanda = !!c.patch;

    /* --- badan --- */
    let torso = `<ellipse cx="100" cy="154" rx="42" ry="38" fill="${body}" stroke="${line}" stroke-width="4"/>
                 <ellipse cx="100" cy="162" rx="26" ry="24" fill="${belly}"/>`;
    if (isPanda) {
      torso += `<ellipse cx="60" cy="150" rx="14" ry="24" transform="rotate(15 60 150)" fill="#2b2b2b"/>
                <ellipse cx="140" cy="150" rx="14" ry="24" transform="rotate(-15 140 150)" fill="#2b2b2b"/>`;
    }
    const feetFill = isPenguin ? "#f59a23" : isPanda ? "#2b2b2b" : body;
    const feet = `<ellipse cx="74" cy="187" rx="17" ry="9" fill="${feetFill}" stroke="${line}" stroke-width="3.5"/>
                  <ellipse cx="126" cy="187" rx="17" ry="9" fill="${feetFill}" stroke="${line}" stroke-width="3.5"/>`;
    const spotsBody = c.spots
      ? `<g fill="#4a3217"><circle cx="70" cy="150" r="4"/><circle cx="82" cy="170" r="3.5"/><circle cx="130" cy="148" r="4"/><circle cx="118" cy="172" r="3.5"/></g>`
      : "";

    /* --- kepala --- */
    const head = `<ellipse cx="100" cy="100" rx="64" ry="54" fill="${body}" stroke="${line}" stroke-width="4"/>`;

    /* --- wajah --- */
    let face = "";
    if (isPenguin) {
      face += `<ellipse cx="100" cy="108" rx="46" ry="38" fill="#fff"/>`;
    }
    if (isPanda) {
      face += `<ellipse cx="75" cy="100" rx="17" ry="21" transform="rotate(-20 75 100)" fill="#2b2b2b"/>
               <ellipse cx="125" cy="100" rx="17" ry="21" transform="rotate(20 125 100)" fill="#2b2b2b"/>`;
    }
    if (isOwl) {
      face += `<circle cx="76" cy="98" r="24" fill="${belly}" stroke="${line}" stroke-width="3.5"/>
               <circle cx="124" cy="98" r="24" fill="${belly}" stroke="${line}" stroke-width="3.5"/>`;
    }
    if (id === "foxy") {
      face += `<path d="M34,110 L66,104 L54,134 Z" fill="#fff"/><path d="M166,110 L134,104 L146,134 Z" fill="#fff"/>`;
    }
    if (!isOwl && !isPenguin) {
      face += `<ellipse cx="100" cy="119" rx="26" ry="17" fill="${belly}"/>`;
    }
    if (c.spots) {
      face += `<g fill="#4a3217"><circle cx="58" cy="76" r="4"/><circle cx="82" cy="64" r="3.5"/><circle cx="118" cy="64" r="3.5"/><circle cx="142" cy="76" r="4"/><circle cx="100" cy="70" r="3.5"/></g>`;
    }
    if (id === "kitty") {
      const st = shade(c.body, 0.6);
      face += `<g stroke="${st}" stroke-width="4" stroke-linecap="round"><path d="M100,50 L100,64"/><path d="M86,53 L89,65"/><path d="M114,53 L111,65"/></g>`;
    }

    const eyeR = isOwl ? 11 : 9;
    const eyeRy = isOwl ? 13 : 11;
    const eyes = `<ellipse cx="76" cy="100" rx="${eyeR}" ry="${eyeRy}" fill="${INK}"/>
                  <ellipse cx="124" cy="100" rx="${eyeR}" ry="${eyeRy}" fill="${INK}"/>
                  <circle cx="72.5" cy="95" r="3.8" fill="#fff"/><circle cx="120.5" cy="95" r="3.8" fill="#fff"/>
                  <circle cx="79" cy="105" r="1.9" fill="#fff"/><circle cx="127" cy="105" r="1.9" fill="#fff"/>`;

    let nose = "";
    let mouth = "";
    if (isOwl || isPenguin) {
      nose = `<path d="M90,110 L110,110 L100,128 Z" fill="#f59a23" stroke="#c56f0c" stroke-width="2.5" stroke-linejoin="round"/>`;
    } else {
      const noseColor = id === "kitty" || id === "bunny" ? "#ff7f9c" : INK;
      nose = `<ellipse cx="100" cy="112" rx="7.5" ry="5.5" fill="${noseColor}"/>`;
      mouth = `<path d="M100,117 L100,123 M100,123 Q93,131 86,124 M100,123 Q107,131 114,124" fill="none" stroke="${INK}" stroke-width="2.8" stroke-linecap="round"/>`;
    }

    let extras = "";
    if (id === "bunny") {
      extras += `<rect x="95.5" y="124" width="9" height="9" rx="2.5" fill="#fff" stroke="#cfc5e0" stroke-width="2"/>`;
    }
    if (id === "kitty") {
      extras += `<g stroke="#fff" stroke-width="2.5" stroke-linecap="round" opacity=".9"><path d="M38,114 L64,117"/><path d="M38,124 L64,121"/><path d="M162,114 L136,117"/><path d="M162,124 L136,121"/></g>`;
    }
    if (id === "cheetah") {
      extras += `<g fill="none" stroke="#3b2a1a" stroke-width="3.5" stroke-linecap="round"><path d="M74,112 Q69,128 74,136"/><path d="M126,112 Q131,128 126,136"/></g>`;
    }

    const cheeks =
      isOwl || isPenguin
        ? ""
        : `<circle cx="58" cy="120" r="10" fill="#ff8fa3" opacity=".5"/><circle cx="142" cy="120" r="10" fill="#ff8fa3" opacity=".5"/>`;

    return `<svg class="portrait" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${c.name}">
      <ellipse cx="100" cy="193" rx="62" ry="7" fill="#000" opacity=".16"/>
      ${tail(id, body, line)}
      ${ears(c, body, line)}
      ${torso}${spotsBody}${feet}
      ${head}${face}${eyes}${cheeks}${nose}${mouth}${extras}
    </svg>`;
  };

  /** Potret dibungkus lingkaran berwarna aura karakter. */
  E.avatar = function (id, locked) {
    const c = E.CHARACTERS[id];
    const glow = c ? hex(c.aura) : "#9cf";
    return `<div class="avatar ${locked ? "locked" : ""}" style="--glow:${glow}">${E.portrait(id)}${locked ? '<span class="lock">🔒</span>' : ""}</div>`;
  };

  /* ----------------------------- Latar pemandangan ----------------------------- */
  const tree = (x, y, s) => `
    <g transform="translate(${x} ${y}) scale(${s})">
      <rect x="-14" y="-10" width="28" height="120" rx="12" fill="#8a5a2b"/>
      <circle cx="0" cy="-40" r="80" fill="#3fa84a"/><circle cx="-62" cy="-5" r="56" fill="#4cbb54"/>
      <circle cx="62" cy="-5" r="56" fill="#46b24f"/><circle cx="-10" cy="-70" r="48" fill="#5acb61"/>
    </g>`;

  const tower = (x, y, w, h, roof) => `
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#e9dcc6"/>
    <rect x="${x}" y="${y}" width="${w * 0.35}" height="${h}" fill="#d6c6aa"/>
    <path d="M${x - 10},${y} L${x + w / 2},${y - roof} L${x + w + 10},${y} Z" fill="#8e5bd6"/>
    <path d="M${x + w / 2},${y - roof} L${x + w / 2},${y - roof - 30}" stroke="#6b4a2b" stroke-width="3"/>
    <path d="M${x + w / 2},${y - roof - 30} l26,8 l-26,8 z" fill="#ff5a5a"/>
    <rect x="${x + w / 2 - 6}" y="${y + 24}" width="12" height="20" rx="6" fill="#6e5a8a"/>`;

  E.scenery = function () {
    return `
    <div class="scenery" aria-hidden="true">
      <div class="sun"></div>
      <i class="cloud c1"></i><i class="cloud c2"></i><i class="cloud c3"></i>
      <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" xmlns="http://www.w3.org/2000/svg">
        <path d="M0,620 L180,470 L330,590 L520,430 L700,600 L900,480 L1100,610 L1300,450 L1600,600 L1600,900 L0,900Z" fill="#b8e2f3" opacity=".75"/>
        <!-- pulau melayang -->
        <g transform="translate(1390 250)">
          <ellipse cx="0" cy="0" rx="90" ry="20" fill="#6fd26a"/>
          <path d="M-86,6 Q0,110 86,6 Z" fill="#a8743d"/>
          <circle cx="-20" cy="-26" r="24" fill="#3fa84a"/><rect x="-24" y="-8" width="8" height="12" fill="#7a4a22"/>
        </g>
        <g transform="translate(470 210) scale(.7)">
          <ellipse cx="0" cy="0" rx="90" ry="20" fill="#6fd26a"/>
          <path d="M-86,6 Q0,110 86,6 Z" fill="#a8743d"/>
        </g>
        <!-- kastil -->
        <g transform="translate(1130 270)">
          <path d="M-190,330 Q-90,270 0,280 Q120,270 230,330 L230,430 L-190,430Z" fill="#7bd27a"/>
          ${tower(-90, 40, 60, 210, 70)}
          ${tower(40, 10, 70, 240, 84)}
          ${tower(-10, 100, 56, 150, 62)}
          ${tower(130, 80, 54, 170, 60)}
          <rect x="-40" y="190" width="150" height="70" fill="#efe3cf"/>
          <path d="M20,260 L20,222 Q47,196 74,222 L74,260Z" fill="#7a5230"/>
        </g>
        <!-- bukit -->
        <path d="M0,720 Q260,610 560,690 T1160,680 T1600,700 L1600,900 L0,900Z" fill="#8ede7a"/>
        <path d="M0,790 Q300,700 640,770 T1280,760 T1600,790 L1600,900 L0,900Z" fill="#62cc62"/>
        <path d="M0,850 Q400,790 820,840 T1600,830 L1600,900 L0,900Z" fill="#46b457"/>
        ${tree(110, 650, 0.9)}${tree(1480, 690, 0.75)}
        <g fill="#ff7fa8"><circle cx="300" cy="830" r="7"/><circle cx="360" cy="850" r="6"/><circle cx="1200" cy="840" r="7"/></g>
        <g fill="#ffe14d"><circle cx="330" cy="842" r="6"/><circle cx="1240" cy="852" r="6"/></g>
      </svg>
    </div>`;
  };

  E.hex = hex;
})();
