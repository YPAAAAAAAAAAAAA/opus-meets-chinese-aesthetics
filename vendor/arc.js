/* Arc of ten thousand things. Procedural Canvas2D, no assets. */
(function () {
  "use strict";

  var TAU = Math.PI * 2;
  var SONG = '"Songti SC","STSong","Noto Serif CJK SC","Source Han Serif SC",Palatino,"Palatino Linotype","Times New Roman",Times,serif';
  var INK = "#1c1814";
  var VERM = "#c23a2e";
  var PAPER = "#f3eee4";
  var HOLD = 0.78;
  var N = 10;

  var SCENES = [
    { zh: "咫尺有日", en: "a sun within arm's reach" },
    { zh: "墨生万象", en: "ink gives birth to everything" },
    { zh: "一胞成川", en: "one cell, then a river" },
    { zh: "釉里藏光", en: "light kept inside the glaze" },
    { zh: "一拱如月", en: "one arch, the shape of a moon" },
    { zh: "檐角问天", en: "the eave lifts to ask the sky" },
    { zh: "中虚而容", en: "empty at the center, it holds" },
    { zh: "团扇纳风", en: "a round fan gathers the wind" },
    { zh: "月门为界", en: "the moon gate is the edge" },
    { zh: "镜中复地", en: "the mirror returns the earth" }
  ];

  var NOTES = [130.81, 146.83, 164.81, 196, 220, 261.63, 293.66, 329.63, 349.23, 392];

  function mulberry(seed) {
    var s = seed >>> 0;
    return function () {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  function clamp(v, a, b) {
    return v < a ? a : v > b ? b : v;
  }

  var fibers = [];
  var specks = [];
  (function () {
    var rnd = mulberry(11);
    var i;
    for (i = 0; i < 120; i++) {
      fibers.push({
        x: rnd(),
        y: rnd(),
        len: 3 + rnd() * 14,
        rot: rnd() * Math.PI,
        a: 0.018 + rnd() * 0.045,
        w: rnd() < 0.8 ? 0.6 : 1
      });
    }
    for (i = 0; i < 50; i++) {
      specks.push({ x: rnd(), y: rnd(), r: 0.3 + rnd() * 0.7, a: 0.03 + rnd() * 0.05 });
    }
  })();

  var INK_DROPS = [
    { x: -0.22, y: -0.08, s: 0.34, ph: 0.4, tend: 1 },
    { x: 0.28, y: 0.16, s: 0.26, ph: 2.1, tend: 1 },
    { x: -0.05, y: 0.32, s: 0.2, ph: 4.2, tend: 0 },
    { x: 0.1, y: -0.36, s: 0.16, ph: 1.2, tend: 1 },
    { x: -0.4, y: 0.22, s: 0.13, ph: 3.3, tend: 0 },
    { x: 0.38, y: -0.28, s: 0.09, ph: 5.1, tend: 0, red: 1 }
  ];

  var CELLS = [
    { x: -0.22, y: -0.16, r: 0.3, nuc: 0.075, split: 0 },
    { x: 0.24, y: 0.02, r: 0.22, nuc: 0.055, split: 1 },
    { x: -0.06, y: 0.3, r: 0.18, nuc: 0.048, split: 0 },
    { x: 0.34, y: 0.32, r: 0.12, nuc: 0.032, split: 0 },
    { x: -0.4, y: 0.18, r: 0.13, nuc: 0.034, split: 0, red: 1 },
    { x: 0.02, y: -0.42, r: 0.11, nuc: 0.03, split: 0 },
    { x: -0.16, y: 0.05, r: 0.09, nuc: 0.024, split: 0 },
    { x: 0.46, y: -0.28, r: 0.08, nuc: 0.02, split: 0 }
  ];

  var crackle = [];
  (function () {
    var rnd = mulberry(42);
    var k, i, x, y, a, life, len, x2, y2, b, bl;
    for (k = 0; k < 18; k++) {
      x = (rnd() - 0.5) * 1.15;
      y = -0.05 + (rnd() - 0.5) * 0.85;
      a = rnd() * TAU;
      life = 3 + ((rnd() * 7) | 0);
      for (i = 0; i < life; i++) {
        len = 0.06 + rnd() * 0.14;
        a += (rnd() - 0.5) * 1.15;
        x2 = x + Math.cos(a) * len;
        y2 = y + Math.sin(a) * len;
        crackle.push(x, y, x2, y2);
        if (rnd() < 0.4) {
          b = a + (rnd() < 0.5 ? 0.8 : -0.8) * (0.6 + rnd());
          bl = 0.04 + rnd() * 0.1;
          crackle.push(x2, y2, x2 + Math.cos(b) * bl, y2 + Math.sin(b) * bl);
        }
        x = x2;
        y = y2;
      }
    }
  })();

  var stars = [];
  (function () {
    var rnd = mulberry(3);
    var i;
    for (i = 0; i < 16; i++) {
      stars.push({ x: (rnd() - 0.5) * 1.5, y: -0.85 + rnd() * 0.55, r: 0.5 + rnd() * 0.8, a: 0.25 + rnd() * 0.55 });
    }
  })();

  var canvas, ctx2;
  var view = { w: 1, h: 1, cx: 0, cy: 0, r: 1, tall: true };
  var p = 0.24;
  var auto = true;
  var goal = null;
  var pid = null;
  var dragX = 0;
  var dragY = 0;
  var moved = 0;
  var angular = false;
  var pressing = false;
  var heard = 0;
  var audio = null;
  var sent = false;
  var painted = false;
  var t0 = 0;
  var last = 0;

  function layoutOf(w, h) {
    var tall = h > 640;
    var top = tall ? Math.max(86, h * 0.1) : 54;
    var cap = tall ? Math.min(360, h * 0.42) : 88;
    var side = tall ? 34 : 12;
    var r = Math.min((w - side * 2) / 2, (h - top - cap) / 2);
    if (tall) r = Math.min(r, w * 0.405);
    return { w: w, h: h, cx: w * 0.5, cy: top + r, r: r, tall: tall };
  }

  function modp(v) {
    var m = v % N;
    if (m < 0) m += N;
    return m;
  }

  function phase(v) {
    var m = modp(v);
    var i = m | 0;
    var f = m - i;
    var morph = f > HOLD ? (f - HOLD) / (1 - HOLD) : 0;
    var k = morph > 0 ? 1 : f / HOLD;
    return { i: i, m: m, morph: morph, k: k };
  }

  function entryAngle(i) {
    return -Math.PI * 0.5 + (i + 0.35) * (TAU / N);
  }

  function paintPaper(ctx, w, h) {
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, w, h);
    var g = ctx.createRadialGradient(w * 0.5, h * 0.34, w * 0.1, w * 0.5, h * 0.42, h * 0.72);
    g.addColorStop(0, "rgba(255,252,246,0.7)");
    g.addColorStop(0.55, "rgba(243,238,228,0)");
    g.addColorStop(1, "rgba(196,176,148,0.28)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    var i, f, x, y;
    ctx.lineCap = "round";
    for (i = 0; i < fibers.length; i++) {
      f = fibers[i];
      x = f.x * w;
      y = f.y * h;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(f.rot) * f.len, y + Math.sin(f.rot) * f.len);
      ctx.strokeStyle = "rgba(92,64,36," + f.a + ")";
      ctx.lineWidth = f.w;
      ctx.stroke();
    }
    for (i = 0; i < specks.length; i++) {
      f = specks[i];
      ctx.fillStyle = "rgba(70,48,28," + f.a + ")";
      ctx.beginPath();
      ctx.arc(f.x * w, f.y * h, f.r, 0, TAU);
      ctx.fill();
    }
  }

  function clipWindow(ctx) {
    ctx.beginPath();
    ctx.arc(view.cx, view.cy, view.r, 0, TAU);
    ctx.clip();
  }

  function horizonY(x, cx, cy, r) {
    var nx = (x - cx) / r;
    return cy + r * 0.08 + nx * nx * r * 0.1;
  }

  function drawEarth(ctx, t, k) {
    var cx = view.cx;
    var cy = view.cy;
    var r = view.r;
    var sky = ctx.createLinearGradient(cx, cy - r, cx, cy + r * 0.2);
    sky.addColorStop(0, "#c5d9d2");
    sky.addColorStop(0.28, "#f4efe6");
    sky.addColorStop(0.62, "#f3cbb6");
    sky.addColorStop(0.84, "#e7a088");
    sky.addColorStop(1, "#d97862");
    ctx.fillStyle = sky;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

    var starA = clamp(0.85 - k * 1.15, 0, 1);
    var i;
    if (starA > 0.02) {
      for (i = 0; i < stars.length; i++) {
        var s = stars[i];
        ctx.fillStyle = "rgba(255,250,244," + s.a * starA + ")";
        ctx.beginPath();
        ctx.arc(cx + s.x * r, cy + s.y * r, s.r, 0, TAU);
        ctx.fill();
      }
    }

    var hy = cy + r * 0.08;
    var sx = cx + r * (-0.02 + k * 0.18);
    var sr = r * 0.145;
    var sy = horizonY(sx, cx, cy, r) + sr * (0.58 - k * 1.5);
    var glow = ctx.createRadialGradient(sx, sy, sr * 0.15, sx, sy, r * 0.92);
    glow.addColorStop(0, "rgba(255,246,236,0.95)");
    glow.addColorStop(0.14, "rgba(255,186,140,0.55)");
    glow.addColorStop(0.32, "rgba(206,72,48,0.22)");
    glow.addColorStop(0.62, "rgba(194,58,46,0.06)");
    glow.addColorStop(1, "rgba(194,58,46,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

    var sun = ctx.createRadialGradient(sx - sr * 0.28, sy - sr * 0.3, sr * 0.08, sx, sy, sr);
    sun.addColorStop(0, "#fff8f1");
    sun.addColorStop(0.42, "#f6c2a4");
    sun.addColorStop(1, "#e4533a");
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, TAU);
    ctx.fillStyle = sun;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(cx - r * 0.98, hy + r * 0.25);
    ctx.quadraticCurveTo(cx - r * 0.62, hy - r * 0.2, cx - r * 0.28, hy + r * 0.01);
    ctx.quadraticCurveTo(cx - r * 0.08, hy - r * 0.09, cx + r * 0.02, hy + r * 0.06);
    ctx.lineTo(cx + r * 0.02, hy + r * 0.3);
    ctx.lineTo(cx - r, hy + r * 0.3);
    ctx.closePath();
    ctx.fillStyle = "rgba(42,36,30,0.88)";
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + r * 0.2, hy + r * 0.22);
    ctx.quadraticCurveTo(cx + r * 0.48, hy - r * 0.1, cx + r * 0.8, hy + r * 0.02);
    ctx.lineTo(cx + r, hy + r * 0.26);
    ctx.lineTo(cx + r * 0.2, hy + r * 0.26);
    ctx.closePath();
    ctx.fillStyle = "rgba(30,26,24,0.72)";
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(cx - r - 2, cy + r + 2);
    ctx.lineTo(cx - r - 2, horizonY(cx - r, cx, cy, r));
    var steps = 28;
    for (i = 0; i <= steps; i++) {
      var x = cx - r + (2 * r * i) / steps;
      ctx.lineTo(x, horizonY(x, cx, cy, r));
    }
    ctx.lineTo(cx + r + 2, cy + r + 2);
    ctx.closePath();
    var land = ctx.createLinearGradient(cx, hy - 4, cx, cy + r);
    land.addColorStop(0, "#4a463f");
    land.addColorStop(0.07, "#24211e");
    land.addColorStop(0.35, "#16181a");
    land.addColorStop(1, "#101312");
    ctx.fillStyle = land;
    ctx.fill();

    ctx.beginPath();
    for (i = 0; i <= steps; i++) {
      x = cx - r + (2 * r * i) / steps;
      var yy = horizonY(x, cx, cy, r);
      if (i === 0) ctx.moveTo(x, yy);
      else ctx.lineTo(x, yy);
    }
    ctx.strokeStyle = "rgba(244,214,196,0.7)";
    ctx.lineWidth = 1.15;
    ctx.stroke();

    var breathe = 0.75 + 0.25 * Math.sin(t * 0.8);
    ctx.save();
    for (i = 0; i < 7; i++) {
      var y0 = hy + r * (0.08 + i * 0.055);
      var half = (1 - i / 8) * r * 0.055 * breathe;
      var shift = Math.sin(t * 1.1 + i) * r * 0.012;
      ctx.globalAlpha = 0.34 - i * 0.04;
      ctx.fillStyle = i % 3 === 0 ? "rgba(226,120,86,0.9)" : "rgba(180,150,130,0.7)";
      ctx.fillRect(sx - half + shift, y0, half * 2, Math.max(1.2, r * 0.008));
    }
    ctx.restore();

    for (i = 0; i < 3; i++) {
      var wy = hy - r * (0.16 + i * 0.09) + Math.sin(t * 0.35 + i) * 2;
      ctx.beginPath();
      ctx.moveTo(cx - r, wy);
      ctx.quadraticCurveTo(cx, wy + 8, cx + r, wy - 3);
      ctx.strokeStyle = "rgba(255,250,244," + (0.16 - i * 0.035) + ")";
      ctx.lineWidth = r * 0.045;
      ctx.stroke();
    }

    var limb = ctx.createRadialGradient(cx, cy - r * 0.15, r * 0.55, cx, cy, r);
    limb.addColorStop(0, "rgba(180,210,200,0)");
    limb.addColorStop(0.72, "rgba(180,210,200,0)");
    limb.addColorStop(0.9, "rgba(232,168,140,0.12)");
    limb.addColorStop(1, "rgba(176,206,196,0.38)");
    ctx.fillStyle = limb;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  }

  function drawInk(ctx, t, k) {
    var cx = view.cx;
    var cy = view.cy;
    var r = view.r;
    var wash = ctx.createRadialGradient(cx, cy, r * 0.1, cx, cy, r);
    wash.addColorStop(0, "#f7f4ee");
    wash.addColorStop(0.7, "#e7eee9");
    wash.addColorStop(1, "#d5e0da");
    ctx.fillStyle = wash;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

    var i, d, rad, gx, gy, g, a, steps, u, px, py, j, ang, len, width;
    for (i = 0; i < INK_DROPS.length; i++) {
      d = INK_DROPS[i];
      rad = r * d.s * (0.82 + 0.28 * k) * (1 + 0.04 * Math.sin(t * 0.7 + d.ph));
      gx = cx + d.x * r + Math.sin(t * 0.25 + d.ph) * r * 0.015;
      gy = cy + d.y * r + Math.cos(t * 0.22 + d.ph) * r * 0.012;
      g = ctx.createRadialGradient(gx, gy, rad * 0.05, gx, gy, rad);
      if (d.red) {
        g.addColorStop(0, "rgba(194,58,46,0.72)");
        g.addColorStop(0.35, "rgba(194,58,46,0.22)");
        g.addColorStop(1, "rgba(194,58,46,0)");
      } else {
        g.addColorStop(0, "rgba(16,14,12,0.82)");
        g.addColorStop(0.22, "rgba(22,20,18,0.4)");
        g.addColorStop(0.55, "rgba(36,58,52,0.12)");
        g.addColorStop(1, "rgba(36,58,52,0)");
      }
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(gx, gy, rad, 0, TAU);
      ctx.fill();

      if (!d.tend) continue;
      for (j = 0; j < 3; j++) {
        ang = d.ph + j * (TAU / 3) + k * 0.35;
        len = rad * (1.35 + j * 0.22);
        steps = 9;
        for (a = 0; a < steps; a++) {
          u = a / (steps - 1);
          var wob = Math.sin(u * 3.2 + d.ph + j + t * 0.55) * 0.55;
          var aa = ang + wob * u;
          px = gx + Math.cos(aa) * len * u;
          py = gy + Math.sin(aa) * len * u * 0.9;
          var br = rad * (0.42 - u * 0.32);
          var tg = ctx.createRadialGradient(px, py, 0, px, py, Math.max(2, br));
          var al = 0.28 * (1 - u);
          tg.addColorStop(0, "rgba(14,12,10," + al + ")");
          tg.addColorStop(1, "rgba(14,12,10,0)");
          ctx.fillStyle = tg;
          ctx.beginPath();
          ctx.arc(px, py, Math.max(2, br), 0, TAU);
          ctx.fill();
        }
      }
    }

    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.96, 0, TAU);
    ctx.strokeStyle = "rgba(28,40,36,0.18)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function cellBlob(ctx, x, y, rad, nuc, red, t, ph) {
    var g = ctx.createRadialGradient(x - rad * 0.25, y - rad * 0.3, rad * 0.1, x, y, rad);
    g.addColorStop(0, "rgba(255,252,246,0.95)");
    g.addColorStop(0.55, red ? "rgba(244,220,210,0.9)" : "rgba(214,232,222,0.92)");
    g.addColorStop(1, red ? "rgba(190,120,108,0.55)" : "rgba(90,150,130,0.45)");
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, TAU);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = "rgba(31,77,69,0.55)";
    ctx.lineWidth = Math.max(0.8, rad * 0.045);
    ctx.stroke();
    var pulse = 1 + 0.06 * Math.sin(t * 1.4 + ph);
    ctx.beginPath();
    ctx.arc(x + rad * 0.08, y + rad * 0.04, nuc * pulse, 0, TAU);
    ctx.fillStyle = red ? "rgba(194,58,46,0.85)" : "rgba(28,32,30,0.78)";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + rad * 0.02, y - nuc * 0.15, nuc * 0.38, 0, TAU);
    ctx.fillStyle = "rgba(255,250,244,0.7)";
    ctx.fill();
  }

  function drawCells(ctx, t, k) {
    var cx = view.cx;
    var cy = view.cy;
    var r = view.r;
    var bg = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r);
    bg.addColorStop(0, "#f7f3ea");
    bg.addColorStop(1, "#e4efe8");
    ctx.fillStyle = bg;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.9, 0, TAU);
    ctx.strokeStyle = "rgba(47,109,92,0.18)";
    ctx.lineWidth = 1;
    ctx.stroke();

    var i, c, x, y, rad, sep, dx, dy;
    for (i = 0; i < CELLS.length; i++) {
      c = CELLS[i];
      x = cx + c.x * r;
      y = cy + c.y * r + Math.sin(t * 0.4 + i) * r * 0.008;
      rad = c.r * r * (1 + 0.025 * Math.sin(t * 0.9 + i));
      if (c.split) {
        sep = rad * (0.35 + k * 0.85 + 0.15 * Math.sin(t * 0.8));
        dx = sep;
        dy = sep * 0.18;
        cellBlob(ctx, x - dx, y - dy, rad * 0.92, c.nuc * r, c.red, t, i);
        cellBlob(ctx, x + dx, y + dy, rad * 0.88, c.nuc * r * 0.85, 0, t, i + 2);
      } else {
        cellBlob(ctx, x, y, rad, c.nuc * r, c.red, t, i);
      }
    }
  }

  function bowlOuter(ctx, cx, cy, r) {
    var rimY = cy - r * 0.04;
    var rx = r * 0.64;
    var footY = cy + r * 0.42;
    var fw = r * 0.2;
    ctx.beginPath();
    ctx.moveTo(cx - rx, rimY);
    ctx.bezierCurveTo(cx - rx - r * 0.01, rimY + r * 0.26, cx - r * 0.46, footY - r * 0.12, cx - fw, footY);
    ctx.lineTo(cx - fw * 0.7, footY + r * 0.04);
    ctx.lineTo(cx + fw * 0.7, footY + r * 0.04);
    ctx.lineTo(cx + fw, footY);
    ctx.bezierCurveTo(cx + r * 0.46, footY - r * 0.12, cx + rx + r * 0.01, rimY + r * 0.26, cx + rx, rimY);
    ctx.closePath();
  }

  function drawCeladon(ctx, t, k) {
    var cx = view.cx;
    var cy = view.cy;
    var r = view.r;
    var bg = ctx.createLinearGradient(cx, cy - r, cx, cy + r);
    bg.addColorStop(0, "#f6f3ec");
    bg.addColorStop(1, "#e7e2d6");
    ctx.fillStyle = bg;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

    ctx.save();
    ctx.translate(cx, cy + r * 0.5);
    ctx.scale(1, 0.28);
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.48, 0, TAU);
    ctx.fillStyle = "rgba(40,50,44,0.13)";
    ctx.fill();
    ctx.restore();

    var rimY = cy - r * 0.04;
    var rx = r * 0.64;
    var glaze = ctx.createLinearGradient(cx, rimY - r * 0.1, cx, cy + r * 0.48);
    glaze.addColorStop(0, "#f4faf6");
    glaze.addColorStop(0.18, "#d5ebe3");
    glaze.addColorStop(0.45, "#8fbfae");
    glaze.addColorStop(0.75, "#3e7d6a");
    glaze.addColorStop(1, "#1b4338");
    ctx.fillStyle = glaze;
    bowlOuter(ctx, cx, cy, r);
    ctx.fill();

    ctx.save();
    bowlOuter(ctx, cx, cy, r);
    ctx.clip();
    var i;
    ctx.lineCap = "round";
    for (i = 0; i < crackle.length; i += 4) {
      var x1 = cx + crackle[i] * r * 0.7;
      var y1 = cy + crackle[i + 1] * r * 0.55;
      var x2 = cx + crackle[i + 2] * r * 0.7;
      var y2 = cy + crackle[i + 3] * r * 0.55;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = "rgba(28,62,52,0.38)";
      ctx.lineWidth = 0.7;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x1 + 0.6, y1 + 0.6);
      ctx.lineTo(x2 + 0.6, y2 + 0.6);
      ctx.strokeStyle = "rgba(255,252,246,0.22)";
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }
    var sheenX = cx - r * (0.22 - k * 0.18);
    var sheen = ctx.createLinearGradient(sheenX - r * 0.08, rimY, sheenX + r * 0.18, cy + r * 0.3);
    sheen.addColorStop(0, "rgba(255,255,255,0)");
    sheen.addColorStop(0.45, "rgba(255,255,255,0.28)");
    sheen.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = sheen;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    ctx.restore();

    ctx.beginPath();
    ctx.ellipse(cx, rimY, rx, r * 0.11, 0, 0, TAU);
    var mouth = ctx.createLinearGradient(cx, rimY - r * 0.12, cx, rimY + r * 0.12);
    mouth.addColorStop(0, "#1e4a3e");
    mouth.addColorStop(0.5, "#6eaa98");
    mouth.addColorStop(1, "#14382e");
    ctx.fillStyle = mouth;
    ctx.fill();
    ctx.strokeStyle = "rgba(18,48,40,0.65)";
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(cx - rx * 0.15, rimY - r * 0.01, rx * 0.72, r * 0.045, -0.15, Math.PI * 1.05, Math.PI * 1.9);
    ctx.strokeStyle = "rgba(255,252,246,0.55)";
    ctx.lineWidth = Math.max(1, r * 0.012);
    ctx.stroke();

    ctx.beginPath();
    bowlOuter(ctx, cx, cy, r);
    ctx.strokeStyle = "rgba(16,40,34,0.45)";
    ctx.lineWidth = 1;
    ctx.stroke();

    var hi = 0.35 + 0.15 * Math.sin(t * 0.6);
    ctx.beginPath();
    ctx.ellipse(cx - r * 0.22, cy + r * 0.08, r * 0.08, r * 0.16, -0.4, 0, TAU);
    ctx.fillStyle = "rgba(255,252,246," + (0.1 + hi * 0.08) + ")";
    ctx.fill();
  }

  function lowerSemi(ctx, cx, springY, archR) {
    var i;
    ctx.beginPath();
    ctx.moveTo(cx - archR, springY);
    for (i = 0; i <= 28; i++) {
      var a = Math.PI - (i / 28) * Math.PI;
      ctx.lineTo(cx + Math.cos(a) * archR, springY + Math.sin(a) * archR);
    }
    ctx.closePath();
  }

  function drawBridge(ctx, t, k) {
    var cx = view.cx;
    var cy = view.cy;
    var r = view.r;
    var sky = ctx.createLinearGradient(cx, cy - r, cx, cy + r);
    sky.addColorStop(0, "#dce8e3");
    sky.addColorStop(0.45, "#f4f0e6");
    sky.addColorStop(1, "#c9d2cc");
    ctx.fillStyle = sky;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

    var deckY = cy - r * 0.02;
    function hill(x, y, w, h, col) {
      ctx.beginPath();
      ctx.moveTo(x - w, y);
      ctx.quadraticCurveTo(x - w * 0.25, y - h, x + w * 0.05, y - h * 0.15);
      ctx.quadraticCurveTo(x + w * 0.45, y - h * 0.95, x + w, y);
      ctx.lineTo(x + w, y + h);
      ctx.lineTo(x - w, y + h);
      ctx.closePath();
      ctx.fillStyle = col;
      ctx.fill();
    }
    hill(cx - r * 0.05, deckY + r * 0.02, r * 0.95, r * 0.34, "rgba(48,62,56,0.16)");
    hill(cx + r * 0.28, deckY + r * 0.04, r * 0.7, r * 0.22, "rgba(32,44,40,0.22)");

    var springY = deckY + r * 0.015;
    var archR = r * 0.4;
    var moonY = springY + archR * (0.42 + k * 0.22);
    ctx.beginPath();
    ctx.arc(cx + Math.sin(t * 0.2) * 2, moonY, r * 0.1, 0, TAU);
    ctx.fillStyle = "rgba(247,244,236,0.95)";
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(40,36,30,0.28)";
    ctx.stroke();

    var i;
    for (i = 0; i < 6; i++) {
      var wy = cy + r * (0.42 + i * 0.07);
      ctx.beginPath();
      ctx.moveTo(cx - r, wy);
      ctx.bezierCurveTo(cx - r * 0.3, wy + Math.sin(t * 0.8 + i) * 2, cx + r * 0.4, wy - 2, cx + r, wy + 1);
      ctx.strokeStyle = "rgba(30,44,40," + (0.1 + i * 0.025) + ")";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    var left = cx - r * 0.86;
    var right = cx + r * 0.86;
    var foot = springY + archR;
    ctx.fillStyle = "#e4ddd0";
    ctx.fillRect(left, deckY, right - left, foot - deckY);
    var course;
    ctx.strokeStyle = "rgba(24,20,16,0.18)";
    ctx.lineWidth = 1;
    for (course = 1; course <= 3; course++) {
      var cyLine = deckY + (foot - deckY) * (course / 4);
      ctx.beginPath();
      ctx.moveTo(left, cyLine);
      ctx.lineTo(right, cyLine);
      ctx.stroke();
    }
    ctx.save();
    lowerSemi(ctx, cx, springY, archR);
    ctx.clip();
    ctx.fillStyle = sky;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    ctx.beginPath();
    ctx.arc(cx, moonY, r * 0.1, 0, TAU);
    ctx.fillStyle = "rgba(247,244,236,0.96)";
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(40,36,30,0.28)";
    ctx.stroke();
    ctx.restore();

    ctx.strokeStyle = "rgba(24,20,16,0.85)";
    ctx.lineWidth = 1.35;
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(left, deckY);
    ctx.lineTo(right, deckY);
    ctx.moveTo(left, deckY);
    ctx.lineTo(left, foot);
    ctx.moveTo(right, deckY);
    ctx.lineTo(right, foot);
    ctx.stroke();
    lowerSemi(ctx, cx, springY, archR);
    ctx.lineWidth = 1.6;
    ctx.stroke();

    var railY = deckY - r * 0.055;
    ctx.beginPath();
    ctx.moveTo(left + r * 0.02, railY);
    ctx.lineTo(right - r * 0.02, railY);
    ctx.strokeStyle = "rgba(24,20,16,0.75)";
    ctx.lineWidth = 1.2;
    ctx.stroke();
    for (i = 0; i < 9; i++) {
      var px = left + r * 0.08 + i * ((right - left - r * 0.12) / 8);
      ctx.beginPath();
      ctx.moveTo(px, railY);
      ctx.lineTo(px, deckY);
      ctx.stroke();
    }

    ctx.save();
    lowerSemi(ctx, cx, springY, archR * 0.92);
    ctx.clip();
    ctx.beginPath();
    ctx.moveTo(left, deckY + r * 0.08);
    ctx.lineTo(right, deckY + r * 0.08);
    ctx.strokeStyle = "rgba(24,20,16,0.25)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    ctx.beginPath();
    ctx.moveTo(left, deckY + 3);
    ctx.lineTo(right, deckY + 3);
    ctx.strokeStyle = "rgba(24,20,16,0.35)";
    ctx.stroke();
  }

  function eaveEdge(u, lift) {
    var x = -0.62 + u * 1.36;
    var y = 0.12 - Math.pow(u, 1.7) * (0.68 + lift);
    return [view.cx + x * view.r, view.cy + y * view.r];
  }

  function eaveRidge(u, lift) {
    var x = -0.46 + u * 1.12;
    var y = -0.1 - Math.pow(u, 1.45) * (0.46 + lift * 0.45);
    return [view.cx + x * view.r, view.cy + y * view.r];
  }

  function drawEaves(ctx, t, k) {
    var cx = view.cx;
    var cy = view.cy;
    var r = view.r;
    var sky = ctx.createLinearGradient(cx, cy - r, cx, cy + r);
    sky.addColorStop(0, "#d7e4df");
    sky.addColorStop(0.5, "#f3efe6");
    sky.addColorStop(1, "#e4ddd0");
    ctx.fillStyle = sky;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

    ctx.beginPath();
    ctx.arc(cx + r * 0.18, cy - r * 0.46, r * 0.07, 0, TAU);
    ctx.fillStyle = "rgba(247,244,236,0.88)";
    ctx.fill();
    ctx.strokeStyle = "rgba(28,24,20,0.22)";
    ctx.lineWidth = 1;
    ctx.stroke();

    var lift = k * 0.14;
    var i, p;
    ctx.beginPath();
    p = eaveEdge(0, lift);
    ctx.moveTo(p[0], p[1]);
    for (i = 1; i <= 32; i++) {
      p = eaveEdge(i / 32, lift);
      ctx.lineTo(p[0], p[1]);
    }
    p = eaveRidge(1, lift);
    ctx.lineTo(p[0], p[1]);
    for (i = 31; i >= 0; i--) {
      p = eaveRidge(i / 32, lift);
      ctx.lineTo(p[0], p[1]);
    }
    ctx.closePath();
    var roof = ctx.createLinearGradient(cx, cy - r * 0.55, cx, cy + r * 0.15);
    roof.addColorStop(0, "#3c352f");
    roof.addColorStop(1, "#161311");
    ctx.fillStyle = roof;
    ctx.fill();

    ctx.beginPath();
    p = eaveRidge(0, lift);
    ctx.moveTo(p[0], p[1]);
    for (i = 1; i <= 32; i++) {
      p = eaveRidge(i / 32, lift);
      ctx.lineTo(p[0], p[1]);
    }
    ctx.strokeStyle = "rgba(243,236,224,0.82)";
    ctx.lineWidth = 1.2;
    ctx.stroke();

    for (i = 0; i <= 15; i++) {
      p = eaveEdge(i / 15, lift);
      ctx.beginPath();
      ctx.arc(p[0], p[1] + r * 0.01, Math.max(2.1, r * 0.018), 0.2, Math.PI - 0.2);
      ctx.strokeStyle = "rgba(243,236,224,0.8)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    var tip = eaveEdge(1, lift);
    ctx.beginPath();
    ctx.moveTo(tip[0] - r * 0.045, tip[1] + r * 0.055);
    ctx.quadraticCurveTo(tip[0] + r * 0.015, tip[1] - r * 0.02, tip[0] + r * 0.012, tip[1] + r * 0.06);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.25;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(tip[0] + r * 0.008, tip[1] + r * 0.012, r * 0.015, 0, TAU);
    ctx.fillStyle = VERM;
    ctx.fill();

    var root = eaveEdge(0.16, lift);
    var armsW = [r * 0.3, r * 0.18, r * 0.09];
    var ah = r * 0.042;
    for (i = 0; i < armsW.length; i++) {
      var ay = root[1] + r * 0.02 + i * (ah + r * 0.012);
      ctx.fillStyle = "#f6f1e6";
      ctx.strokeStyle = "rgba(24,20,16,0.78)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.rect(root[0] - armsW[i] / 2, ay, armsW[i], ah);
      ctx.fill();
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(28,24,20,0.85)";
    ctx.fillRect(root[0] - r * 0.02, root[1] + r * 0.16, r * 0.04, r * 0.28);

    ctx.beginPath();
    for (i = 0; i <= 20; i++) {
      var eu = i / 20;
      var pe = eaveEdge(eu, lift);
      var pr = eaveRidge(Math.min(0.94, eu * 0.92), lift);
      var mx = pe[0] * 0.78 + pr[0] * 0.22;
      var my = pe[1] * 0.78 + pr[1] * 0.22;
      if (i === 0) ctx.moveTo(mx, my);
      else ctx.lineTo(mx, my);
    }
    ctx.strokeStyle = "rgba(110,158,142,0.75)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  function drawBi(ctx, t, k) {
    var cx = view.cx;
    var cy = view.cy;
    var r = view.r;
    ctx.fillStyle = "#efe8dc";
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

    var outer = r * 0.9;
    var inner = r * (0.22 + k * 0.08);
    var jade = ctx.createRadialGradient(cx - outer * 0.15, cy - outer * 0.2, outer * 0.1, cx, cy, outer);
    jade.addColorStop(0, "#e7f3ee");
    jade.addColorStop(0.35, "#b7d5c8");
    jade.addColorStop(0.7, "#6fa892");
    jade.addColorStop(1, "#2c5c4e");
    ctx.beginPath();
    ctx.arc(cx, cy, outer, 0, TAU);
    ctx.fillStyle = jade;
    ctx.fill();

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, outer, 0, TAU);
    ctx.clip();
    var spots = [
      [-0.3, -0.2, 0.28, 0.08],
      [0.25, 0.15, 0.22, 0.06],
      [0.05, 0.32, 0.18, 0.05],
      [-0.2, 0.2, 0.16, 0.05]
    ];
    var i;
    for (i = 0; i < spots.length; i++) {
      var s = spots[i];
      var g = ctx.createRadialGradient(cx + s[0] * r, cy + s[1] * r, 2, cx + s[0] * r, cy + s[1] * r, s[2] * r);
      g.addColorStop(0, "rgba(40,90,74," + s[3] + ")");
      g.addColorStop(1, "rgba(40,90,74,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx + s[0] * r, cy + s[1] * r, s[2] * r, 0, TAU);
      ctx.fill();
    }
    var ang = t * 0.25 + k * 1.4;
    var sx = cx + Math.cos(ang) * outer * 0.15;
    var sy = cy + Math.sin(ang) * outer * 0.15;
    var sheen = ctx.createLinearGradient(sx - outer, sy - outer, sx + outer, sy + outer);
    sheen.addColorStop(0, "rgba(255,255,255,0)");
    sheen.addColorStop(0.48, "rgba(255,255,255,0.22)");
    sheen.addColorStop(0.52, "rgba(255,255,255,0)");
    sheen.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = sheen;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    ctx.restore();

    ctx.beginPath();
    ctx.arc(cx, cy, inner, 0, TAU);
    ctx.fillStyle = "#efe8dc";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx, cy, outer, 0, TAU);
    ctx.strokeStyle = "rgba(20,50,42,0.55)";
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, outer - Math.max(3, r * 0.02), 0, TAU);
    ctx.strokeStyle = "rgba(255,252,246,0.45)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, inner, 0, TAU);
    ctx.strokeStyle = "rgba(20,50,42,0.5)";
    ctx.lineWidth = 1.3;
    ctx.stroke();

    ctx.strokeStyle = "rgba(255,252,246,0.28)";
    ctx.lineWidth = 0.6;
    for (i = 1; i <= 4; i++) {
      ctx.beginPath();
      ctx.arc(cx, cy, inner + (outer - inner) * (i / 5), 0, TAU);
      ctx.stroke();
    }
  }

  function drawFan(ctx, t, k) {
    var cx = view.cx;
    var cy = view.cy;
    var r = view.r;
    var bg = ctx.createLinearGradient(cx, cy - r, cx, cy + r);
    bg.addColorStop(0, "#f7f4ee");
    bg.addColorStop(1, "#e6e0d4");
    ctx.fillStyle = bg;
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

    var fr = r * 0.62;
    var fy = cy - r * 0.08;
    var silk = ctx.createRadialGradient(cx - fr * 0.2, fy - fr * 0.2, fr * 0.1, cx, fy, fr);
    silk.addColorStop(0, "#fffaf2");
    silk.addColorStop(0.7, "#f3ead8");
    silk.addColorStop(1, "#e4d7c2");
    ctx.beginPath();
    ctx.arc(cx, fy, fr, 0, TAU);
    ctx.fillStyle = silk;
    ctx.fill();

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, fy, fr - 1, 0, TAU);
    ctx.clip();
    ctx.beginPath();
    ctx.moveTo(cx - fr * 0.7, fy + fr * 0.35);
    ctx.quadraticCurveTo(cx - fr * 0.1, fy - fr * 0.15, cx + fr * 0.05, fy + fr * 0.1);
    ctx.quadraticCurveTo(cx + fr * 0.35, fy - fr * 0.35, cx + fr * 0.7, fy + fr * 0.22);
    ctx.lineTo(cx + fr, fy + fr);
    ctx.lineTo(cx - fr, fy + fr);
    ctx.closePath();
    ctx.fillStyle = "rgba(40,56,50,0.13)";
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx - fr * 0.55, fy + fr * 0.42);
    ctx.quadraticCurveTo(cx - fr * 0.2, fy + fr * 0.05, cx + fr * 0.1, fy + fr * 0.28);
    ctx.strokeStyle = "rgba(28,32,28,0.35)";
    ctx.lineWidth = 1.1;
    ctx.stroke();

    var mx = cx + fr * (0.18 + k * 0.12);
    var my = fy - fr * 0.28;
    ctx.beginPath();
    ctx.arc(mx, my, fr * 0.1, 0, TAU);
    ctx.strokeStyle = "rgba(28,24,20,0.55)";
    ctx.lineWidth = 1;
    ctx.stroke();

    var bx = cx - fr * 0.32;
    ctx.strokeStyle = "rgba(31,77,69,0.75)";
    ctx.lineWidth = 1.4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(bx, fy + fr * 0.15);
    ctx.lineTo(bx, fy - fr * 0.22);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(bx, fy - fr * 0.05);
    ctx.quadraticCurveTo(bx + fr * 0.12, fy - fr * 0.18, bx + fr * 0.02, fy - fr * 0.28);
    ctx.moveTo(bx, fy - fr * 0.12);
    ctx.quadraticCurveTo(bx - fr * 0.1, fy - fr * 0.22, bx - fr * 0.02, fy - fr * 0.32);
    ctx.stroke();
    ctx.restore();

    ctx.beginPath();
    ctx.arc(cx, fy, fr, 0, TAU);
    ctx.strokeStyle = "rgba(36,28,20,0.85)";
    ctx.lineWidth = Math.max(1.4, r * 0.012);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, fy, fr - 3.5, 0, TAU);
    ctx.strokeStyle = "rgba(36,28,20,0.35)";
    ctx.lineWidth = 0.7;
    ctx.stroke();

    var i;
    ctx.strokeStyle = "rgba(80,60,40,0.12)";
    ctx.lineWidth = 0.7;
    var pivotY = fy + fr - r * 0.02;
    for (i = -3; i <= 3; i++) {
      var a = -Math.PI / 2 + i * 0.28;
      ctx.beginPath();
      ctx.moveTo(cx, pivotY - fr * 0.15);
      ctx.lineTo(cx + Math.cos(a) * fr * 0.92, fy + Math.sin(a) * fr * 0.92);
      ctx.stroke();
    }

    var hy = fy + fr;
    var hlen = r * 0.22;
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.018, hy - 2);
    ctx.lineTo(cx + r * 0.018, hy - 2);
    ctx.lineTo(cx + r * 0.022, hy + hlen);
    ctx.quadraticCurveTo(cx, hy + hlen + r * 0.03, cx - r * 0.022, hy + hlen);
    ctx.closePath();
    ctx.fillStyle = "#6b4e36";
    ctx.fill();
    ctx.strokeStyle = "rgba(28,18,12,0.7)";
    ctx.lineWidth = 1;
    ctx.stroke();

    var sway = Math.sin(t * 1.2) * r * 0.015;
    ctx.strokeStyle = VERM;
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(cx, hy + r * 0.02);
    ctx.quadraticCurveTo(cx + r * 0.06 + sway, hy + r * 0.08, cx + r * 0.02 + sway, hy + r * 0.14);
    ctx.stroke();
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.moveTo(cx, hy + r * 0.02);
    ctx.quadraticCurveTo(cx - r * 0.05 - sway, hy + r * 0.07, cx - r * 0.015 - sway, hy + r * 0.12);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function drawGate(ctx, t, k) {
    var cx = view.cx;
    var cy = view.cy;
    var r = view.r;
    ctx.fillStyle = "#f4f1ea";
    ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    var rnd = mulberry(9);
    var i;
    for (i = 0; i < 40; i++) {
      ctx.fillStyle = "rgba(80,60,40," + (0.03 + rnd() * 0.04) + ")";
      ctx.fillRect(cx + (rnd() - 0.5) * r * 2, cy + (rnd() - 0.5) * r * 2, 1.2, 1.2);
    }

    var gr = r * (0.6 + k * 0.04);
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy + r * 0.02, gr, 0, TAU);
    ctx.clip();

    var sky = ctx.createLinearGradient(cx, cy - gr, cx, cy + gr);
    sky.addColorStop(0, "#d5e3de");
    sky.addColorStop(0.55, "#f6f1e6");
    sky.addColorStop(1, "#d9d3c6");
    ctx.fillStyle = sky;
    ctx.fillRect(cx - gr, cy - gr, gr * 2, gr * 2);

    ctx.beginPath();
    ctx.moveTo(cx - gr, cy + gr * 0.15);
    ctx.quadraticCurveTo(cx - gr * 0.2, cy - gr * 0.05, cx + gr * 0.15, cy + gr * 0.08);
    ctx.quadraticCurveTo(cx + gr * 0.5, cy - gr * 0.2, cx + gr, cy + gr * 0.12);
    ctx.lineTo(cx + gr, cy + gr);
    ctx.lineTo(cx - gr, cy + gr);
    ctx.closePath();
    ctx.fillStyle = "rgba(40,52,46,0.16)";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx + gr * 0.28, cy - gr * 0.32, gr * 0.1, 0, TAU);
    ctx.fillStyle = "rgba(247,244,236,0.95)";
    ctx.fill();
    ctx.strokeStyle = "rgba(28,24,20,0.35)";
    ctx.lineWidth = 1;
    ctx.stroke();

    var sway = Math.sin(t * 0.9) * gr * 0.02;
    ctx.strokeStyle = "rgba(28,48,36,0.82)";
    ctx.lineWidth = 1.6;
    ctx.lineCap = "round";
    var bx = cx - gr * 0.3;
    ctx.beginPath();
    ctx.moveTo(bx, cy + gr * 0.48);
    ctx.quadraticCurveTo(bx + sway, cy + gr * 0.05, bx + sway * 0.4, cy - gr * 0.22);
    ctx.stroke();
    var leafY = [cy + gr * 0.02, cy - gr * 0.08, cy - gr * 0.16];
    var li;
    ctx.lineWidth = 1.15;
    for (li = 0; li < leafY.length; li++) {
      var ly = leafY[li];
      var dir = li % 2 === 0 ? 1 : -1;
      ctx.beginPath();
      ctx.moveTo(bx + sway * 0.5, ly);
      ctx.quadraticCurveTo(bx + dir * gr * 0.12, ly - gr * 0.1, bx + dir * gr * 0.2, ly - gr * 0.02);
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.moveTo(cx + gr * 0.05, cy + gr * 0.42);
    ctx.quadraticCurveTo(cx + gr * 0.28, cy + gr * 0.05, cx + gr * 0.18, cy + gr * 0.15);
    ctx.quadraticCurveTo(cx + gr * 0.42, cy + gr * 0.22, cx + gr * 0.34, cy + gr * 0.42);
    ctx.closePath();
    ctx.fillStyle = "rgba(36,40,38,0.28)";
    ctx.fill();
    ctx.strokeStyle = "rgba(24,22,20,0.45)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx + gr * 0.22, cy + gr * 0.2, gr * 0.035, 0, TAU);
    ctx.fillStyle = "#f4f1ea";
    ctx.fill();

    ctx.restore();

    ctx.beginPath();
    ctx.arc(cx, cy + r * 0.02, gr, 0, TAU);
    ctx.strokeStyle = "rgba(28,24,20,0.4)";
    ctx.lineWidth = Math.max(2, r * 0.016);
    ctx.stroke();

    var shade = ctx.createRadialGradient(cx - gr * 0.3, cy - gr * 0.2, gr * 0.4, cx, cy, gr);
    shade.addColorStop(0, "rgba(40,30,20,0)");
    shade.addColorStop(0.75, "rgba(40,30,20,0)");
    shade.addColorStop(1, "rgba(40,30,20,0.18)");
    ctx.fillStyle = shade;
    ctx.beginPath();
    ctx.arc(cx, cy + r * 0.02, gr, 0, TAU);
    ctx.fill();
  }

  function drawMirror(ctx, t, k) {
    var cx = view.cx;
    var cy = view.cy;
    var r = view.r;
    var outer = r * 0.94;
    var bronze = ctx.createRadialGradient(cx - outer * 0.2, cy - outer * 0.25, outer * 0.1, cx, cy, outer);
    bronze.addColorStop(0, "#e6d3b0");
    bronze.addColorStop(0.4, "#b89162");
    bronze.addColorStop(0.78, "#7a5a38");
    bronze.addColorStop(1, "#3e2c1c");
    ctx.beginPath();
    ctx.arc(cx, cy, outer, 0, TAU);
    ctx.fillStyle = bronze;
    ctx.fill();

    var spots = [
      [-0.35, 0.2, 0.2],
      [0.3, -0.25, 0.16],
      [0.15, 0.32, 0.12]
    ];
    var i;
    for (i = 0; i < spots.length; i++) {
      var g = ctx.createRadialGradient(cx + spots[i][0] * r, cy + spots[i][1] * r, 2, cx + spots[i][0] * r, cy + spots[i][1] * r, spots[i][2] * r);
      g.addColorStop(0, "rgba(70,120,100,0.28)");
      g.addColorStop(1, "rgba(70,120,100,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx + spots[i][0] * r, cy + spots[i][1] * r, spots[i][2] * r, 0, TAU);
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(cx, cy, outer * 0.9, 0, TAU);
    ctx.strokeStyle = "rgba(246,232,204,0.35)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, outer * 0.78, 0, TAU);
    ctx.strokeStyle = "rgba(62,44,28,0.45)";
    ctx.stroke();

    for (i = 0; i < 28; i++) {
      var a = (i / 28) * TAU;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * outer * 0.84, cy + Math.sin(a) * outer * 0.84, Math.max(1.1, r * 0.012), 0, TAU);
      ctx.fillStyle = "rgba(246,232,204,0.55)";
      ctx.fill();
    }

    var refR = r * (0.26 + k * 0.34);
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, refR, 0, TAU);
    ctx.clip();
    ctx.translate(cx, cy);
    ctx.scale(refR / r, refR / r);
    ctx.translate(-cx, -cy);
    drawEarth(ctx, t, 0.45 + k * 0.4);
    ctx.restore();

    ctx.beginPath();
    ctx.arc(cx, cy, refR, 0, TAU);
    ctx.strokeStyle = "rgba(62,44,28,0.55)";
    ctx.lineWidth = 1.2;
    ctx.stroke();

    var knob = r * 0.055;
    var kg = ctx.createRadialGradient(cx - knob * 0.3, cy - knob * 0.35, knob * 0.1, cx, cy, knob);
    kg.addColorStop(0, "#f0e2c8");
    kg.addColorStop(1, "#6a4c30");
    ctx.beginPath();
    ctx.arc(cx, cy, knob, 0, TAU);
    ctx.fillStyle = kg;
    ctx.fill();
    ctx.strokeStyle = "rgba(40,26,14,0.45)";
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }

  var DRAW = [drawEarth, drawInk, drawCells, drawCeladon, drawBridge, drawEaves, drawBi, drawFan, drawGate, drawMirror];

  function moonCenter(i, morph) {
    var offset = (1 - morph) * view.r * 2;
    var ang = entryAngle(i);
    return {
      x: view.cx + Math.cos(ang) * offset,
      y: view.cy + Math.sin(ang) * offset
    };
  }

  function paintVignette(ctx) {
    var cx = view.cx;
    var cy = view.cy;
    var r = view.r;
    var g = ctx.createRadialGradient(cx, cy, r * 0.72, cx, cy, r);
    g.addColorStop(0, "rgba(20,16,12,0)");
    g.addColorStop(1, "rgba(20,16,12,0.16)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, TAU);
    ctx.fill();
  }

  function paintRing(ctx) {
    var cx = view.cx;
    var cy = view.cy;
    var r = view.r;
    var rr = r + Math.max(9, r * 0.07);
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, TAU);
    ctx.strokeStyle = "rgba(28,24,20,0.72)";
    ctx.lineWidth = 1.15;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, r - 4, 0, TAU);
    ctx.strokeStyle = "rgba(28,24,20,0.16)";
    ctx.lineWidth = 0.7;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, rr, 0, TAU);
    ctx.strokeStyle = "rgba(28,24,20,0.28)";
    ctx.lineWidth = 0.9;
    ctx.stroke();

    var ph = phase(p);
    var i, a, inner, outer;
    for (i = 0; i < N; i++) {
      a = -Math.PI / 2 + (i / N) * TAU;
      inner = rr - 3;
      outer = rr + (i === ph.i ? 7 : 4);
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
      ctx.lineTo(cx + Math.cos(a) * outer, cy + Math.sin(a) * outer);
      ctx.strokeStyle = i === ph.i ? "rgba(194,58,46,0.9)" : "rgba(28,24,20,0.4)";
      ctx.lineWidth = i === ph.i ? 1.4 : 0.8;
      ctx.stroke();
    }
    a = -Math.PI / 2 + (ph.m / N) * TAU;
    var bx = cx + Math.cos(a) * rr;
    var by = cy + Math.sin(a) * rr;
    var br = pressing ? 6.2 : 4.6;
    ctx.beginPath();
    ctx.arc(bx, by, br, 0, TAU);
    ctx.fillStyle = VERM;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(bx - 1, by - 1, br * 0.35, 0, TAU);
    ctx.fillStyle = "rgba(255,244,236,0.85)";
    ctx.fill();
  }

  function trackText(ctx, text, x, y, size, color, tracking) {
    ctx.font = size + "px " + SONG;
    ctx.fillStyle = color;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    var chars = Array.from(text);
    var widths = [];
    var total = 0;
    var i;
    for (i = 0; i < chars.length; i++) {
      widths[i] = ctx.measureText(chars[i]).width;
      total += widths[i];
    }
    total += tracking * (chars.length - 1);
    var x0 = x - total / 2;
    for (i = 0; i < chars.length; i++) {
      ctx.fillText(chars[i], x0, y);
      x0 += widths[i] + tracking;
    }
  }

  function vtext(ctx, text, x, y, size, color, gap, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.font = size + "px " + SONG;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    var chars = Array.from(text);
    var i;
    for (i = 0; i < chars.length; i++) {
      ctx.fillText(chars[i], x, y + i * (size + gap));
    }
    ctx.restore();
  }

  function paintWords(ctx) {
    var ph = phase(p);
    var a = SCENES[ph.i];
    var b = SCENES[(ph.i + 1) % N];
    var fade = ph.morph;
    var base = view.cy + view.r;
    var cx = view.cx;
    var shown = fade < 0.5 ? a : b;
    var alpha = fade < 0.5 ? 1 - fade * 2 : (fade - 0.5) * 2;
    if (view.tall) {
      trackText(ctx, "咫尺万象", cx, view.cy - view.r - 36, 13, "rgba(28,24,20,0.55)", 8);
    }
    var zhY = base + (view.tall ? 46 : 26);
    var enY = base + (view.tall ? 80 : 50);
    ctx.save();
    ctx.globalAlpha = alpha;
    trackText(ctx, shown.zh, cx, zhY, view.tall ? 26 : 18, INK, view.tall ? 8 : 5);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "italic " + (view.tall ? 13 : 11) + "px " + SONG;
    ctx.fillStyle = "rgba(28,24,20,0.62)";
    ctx.fillText(shown.en, cx, enY);
    ctx.restore();
    if (!view.tall) return;
    ctx.strokeStyle = "rgba(28,24,20,0.25)";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(cx - 70, base + 108);
    ctx.lineTo(cx + 46, base + 108);
    ctx.stroke();
    trackText(ctx, "目力所及，即是咫尺", cx - 16, base + 136, 14, "rgba(28,24,20,0.78)", 2);
    trackText(ctx, "边内万象，尚未穷尽", cx - 16, base + 162, 14, "rgba(28,24,20,0.78)", 2);
    ctx.font = "italic 12px " + SONG;
    ctx.fillStyle = "rgba(28,24,20,0.48)";
    ctx.textAlign = "center";
    ctx.fillText("as far as the eye can reach", cx - 16, base + 192);
    ctx.fillText("inside the edge, not yet exhausted", cx - 16, base + 212);

    ctx.save();
    ctx.translate(view.w - 64, base + 128);
    ctx.rotate(-0.08);
    var s = 52;
    ctx.fillStyle = VERM;
    ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = "rgba(246,241,230,0.88)";
    ctx.lineWidth = 1.1;
    ctx.strokeRect(3.5, 3.5, s - 7, s - 7);
    ctx.fillStyle = PAPER;
    ctx.font = "18px " + SONG;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("万", s * 0.5, s * 0.34);
    ctx.fillText("象", s * 0.5, s * 0.68);
    ctx.restore();

    ctx.beginPath();
    ctx.arc(view.cx, view.cy - 6, view.r + Math.max(48, view.r * 0.42), Math.PI * 1.12, Math.PI * 1.88);
    ctx.strokeStyle = "rgba(28,24,20,0.14)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function render(now) {
    var w = canvas.clientWidth || window.innerWidth;
    var h = canvas.clientHeight || window.innerHeight;
    if (w < 2 || h < 2) return false;
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var bw = Math.max(1, Math.round(w * dpr));
    var bh = Math.max(1, Math.round(h * dpr));
    if (canvas.width !== bw || canvas.height !== bh) {
      canvas.width = bw;
      canvas.height = bh;
    }
    view = layoutOf(w, h);
    var ctx = ctx2;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
    last = now;
    var t = (now - t0) / 1000;

    if (auto) p += dt * 0.04;
    if (goal != null && !pressing) {
      var diff = goal - p;
      p += diff * Math.min(1, dt * 2.8);
      if (Math.abs(goal - p) < 0.003) {
        p = goal;
        goal = null;
      }
    }
    var idx = phase(p).i;
    if (audio && idx !== heard) {
      pluck(NOTES[idx]);
      heard = idx;
    }

    paintPaper(ctx, w, h);
    var sh = ctx.createRadialGradient(view.cx, view.cy + 8, view.r * 0.72, view.cx, view.cy + 12, view.r * 1.12);
    sh.addColorStop(0, "rgba(90,60,30,0)");
    sh.addColorStop(0.75, "rgba(90,60,30,0.08)");
    sh.addColorStop(1, "rgba(90,60,30,0)");
    ctx.fillStyle = sh;
    ctx.beginPath();
    ctx.arc(view.cx, view.cy, view.r * 1.12, 0, TAU);
    ctx.fill();

    var ph = phase(p);
    ctx.save();
    clipWindow(ctx);
    DRAW[ph.i](ctx, t, ph.k);
    if (ph.morph > 0.004) {
      var mc = moonCenter(ph.i, ph.morph);
      ctx.save();
      ctx.beginPath();
      ctx.arc(mc.x, mc.y, view.r + 0.5, 0, TAU);
      ctx.clip();
      DRAW[(ph.i + 1) % N](ctx, t, 0);
      ctx.restore();
      var dx = mc.x - view.cx;
      var dy = mc.y - view.cy;
      var dist = Math.hypot(dx, dy) || 0.0001;
      if (dist < view.r * 2) {
        var mid = dist / 2;
        var hh = Math.sqrt(Math.max(0, view.r * view.r - mid * mid));
        var mx = (view.cx + mc.x) / 2;
        var my = (view.cy + mc.y) / 2;
        var px = (-dy / dist) * hh;
        var py = (dx / dist) * hh;
        var a1 = Math.atan2(my + py - mc.y, mx + px - mc.x);
        var a2 = Math.atan2(my - py - mc.y, mx - px - mc.x);
        ctx.beginPath();
        ctx.arc(mc.x, mc.y, view.r, a1, a2, false);
        ctx.strokeStyle = "rgba(194,58,46,0.75)";
        ctx.lineWidth = 1.25;
        ctx.stroke();
      }
    }
    paintVignette(ctx);
    ctx.restore();
    paintRing(ctx);
    paintWords(ctx);
    return true;
  }

  function localPoint(e) {
    var rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function startAudio() {
    if (audio) {
      if (audio.ac.state === "suspended") audio.ac.resume();
      return;
    }
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    var ac = new AC();
    var master = ac.createGain();
    master.gain.setValueAtTime(0.0001, ac.currentTime);
    master.gain.exponentialRampToValueAtTime(0.04, ac.currentTime + 1.4);
    var filter = ac.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 720;
    master.connect(filter);
    filter.connect(ac.destination);
    var o1 = ac.createOscillator();
    o1.type = "sine";
    o1.frequency.value = 82.41;
    var o2 = ac.createOscillator();
    o2.type = "sine";
    o2.frequency.value = 123.47;
    o2.detune.value = 7;
    var g2 = ac.createGain();
    g2.gain.value = 0.45;
    o1.connect(master);
    o2.connect(g2);
    g2.connect(master);
    o1.start();
    o2.start();
    audio = { ac: ac, master: master };
    if (ac.state === "suspended") ac.resume();
  }

  function pluck(freq) {
    if (!audio) return;
    var ac = audio.ac;
    var o = ac.createOscillator();
    var g = ac.createGain();
    o.type = "sine";
    o.frequency.value = freq;
    var now = ac.currentTime;
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(0.09, now + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 1.15);
    o.connect(g);
    g.connect(audio.master);
    o.start(now);
    o.stop(now + 1.2);
  }

  function onDown(e) {
    if (pid != null) return;
    if (e.target && e.target.closest && e.target.closest("#info,#gb-ui-toggle")) return;
    pid = e.pointerId;
    pressing = true;
    auto = false;
    goal = null;
    moved = 0;
    var pt = localPoint(e);
    dragX = pt.x;
    dragY = pt.y;
    var dx = pt.x - view.cx;
    var dy = pt.y - view.cy;
    var dist = Math.hypot(dx, dy);
    var rr = view.r + Math.max(9, view.r * 0.07);
    angular = Math.abs(dist - rr) < 36 || (dist > view.r * 0.82 && dist < rr + 28);
    startAudio();
    try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    if (e.cancelable) e.preventDefault();
  }

  function onMove(e) {
    if (e.pointerId !== pid) return;
    var pt = localPoint(e);
    var dx = pt.x - dragX;
    var dy = pt.y - dragY;
    moved += Math.abs(dx) + Math.abs(dy);
    dragX = pt.x;
    dragY = pt.y;
    if (angular) {
      var ang = Math.atan2(pt.y - view.cy, pt.x - view.cx);
      var u = (ang + Math.PI / 2) / TAU;
      if (u < 0) u += 1;
      if (u >= 1) u -= 1;
      var base = Math.round((p - u * N) / N) * N;
      var next = base + u * N;
      if (next - p > N * 0.5) next -= N;
      if (p - next > N * 0.5) next += N;
      p = next;
    } else {
      p += -dy / (view.r * 0.9);
    }
    if (e.cancelable) e.preventDefault();
  }

  function onUp(e) {
    if (e.pointerId !== pid) return;
    pid = null;
    pressing = false;
    if (moved < 12) goal = Math.floor(p + 0.001) + 1;
  }

  function stopBubble(e) {
    e.stopPropagation();
  }

  function installToggle() {
    if (document.getElementById("gb-ui-toggle")) return;
    var b = document.createElement("button");
    b.id = "gb-ui-toggle";
    b.type = "button";
    b.setAttribute("aria-label", "About");
    b.setAttribute("aria-expanded", "false");
    b.textContent = "印";
    var evs = ["pointerdown", "pointerup", "pointermove", "mousedown", "mouseup", "touchstart", "touchend", "touchmove", "wheel", "click"];
    var i;
    for (i = 0; i < evs.length; i++) b.addEventListener(evs[i], stopBubble);
    b.addEventListener("click", function (e) {
      stopBubble(e);
      var on = document.documentElement.classList.toggle("gb-ui-open");
      b.setAttribute("aria-expanded", on ? "true" : "false");
      b.setAttribute("aria-label", on ? "Close" : "About");
    });
    document.body.appendChild(b);
    var info = document.getElementById("info");
    if (info) {
      for (i = 0; i < evs.length; i++) info.addEventListener(evs[i], stopBubble);
    }
  }

  function frame(now) {
    if (!t0) t0 = now;
    var drew = false;
    try { drew = render(now); } catch (err) { drew = false; }
    if (drew && !painted) painted = true;
    else if (painted && !sent && window.__gbSandbox && typeof window.__gbSandbox.ready === "function") {
      sent = true;
      window.__gbSandbox.ready();
    }
    requestAnimationFrame(frame);
  }

  function boot() {
    canvas = document.getElementById("canvas");
    ctx2 = canvas.getContext("2d", { alpha: false });
    canvas.addEventListener("pointerdown", onDown, { passive: false });
    canvas.addEventListener("pointermove", onMove, { passive: false });
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);
    canvas.addEventListener("touchmove", function (e) { e.preventDefault(); }, { passive: false });
    installToggle();
    heard = phase(p).i;
    requestAnimationFrame(frame);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
