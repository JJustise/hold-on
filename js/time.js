/* ============================================================
 * Hold On · time.js
 * 统一使用北京时间（UTC+8）。负责：
 *   - 读取当前真实时间
 *   - 一天内随时间平滑变化的天色（清晨→上午→中午→下午→傍晚→夜晚）
 *   - 按日期自然渐变的季节色调
 * ============================================================ */
window.HO = window.HO || {};

/* ---------- 北京时间 ---------- */
HO.beijing = (function () {
  /* 北京时间 = UTC + 8（无夏令时），用 UTC 字段换算即可 */
  function parts(nowMs) {
    var bjMs = nowMs + 8 * 3600 * 1000;
    var d = new Date(bjMs);
    return {
      year: d.getUTCFullYear(),
      month: d.getUTCMonth() + 1,
      day: d.getUTCDate(),
      hour: d.getUTCHours(),
      minute: d.getUTCMinutes(),
      second: d.getUTCSeconds(),
      hourFloat: d.getUTCHours() + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600
    };
  }

  function dayOfYear(p) {
    var start = Date.UTC(p.year, 0, 1);
    var now = Date.UTC(p.year, p.month - 1, p.day);
    return Math.floor((now - start) / 86400000) + 1;
  }

  return { parts: parts, dayOfYear: dayOfYear };
})();

/* ---------- 一天中的天色（平滑插值） ---------- */
HO.theme = (function () {
  var util = HO.util;

  /* 关键时间点（北京时间的小时数）。字段含义：
     top/bottom : 天空上/下（地平线）颜色
     veil       : 夜晚暗色罩的透明度
     warm       : 清晨/傍晚暖色氛围强度
     stars      : 星星可见度
     sun / moon : 太阳 / 月亮可见度 */
  var STOPS = [
    { h: 0.0,  top: '#131c36', bottom: '#29324f', veil: 0.52, warm: 0.00, stars: 1.00, sun: 0.00, moon: 1.00 },
    { h: 4.5,  top: '#1b2743', bottom: '#3c4b69', veil: 0.42, warm: 0.04, stars: 0.75, sun: 0.00, moon: 0.90 },
    { h: 5.6,  top: '#425170', bottom: '#99817f', veil: 0.26, warm: 0.28, stars: 0.35, sun: 0.10, moon: 0.45 },
    { h: 6.6,  top: '#8296b6', bottom: '#e6c19e', veil: 0.05, warm: 0.50, stars: 0.00, sun: 0.85, moon: 0.00 },
    { h: 8.0,  top: '#aac7e0', bottom: '#e6f0e2', veil: 0.00, warm: 0.08, stars: 0.00, sun: 1.00, moon: 0.00 },
    { h: 11.5, top: '#9dc0de', bottom: '#eef2dd', veil: 0.00, warm: 0.04, stars: 0.00, sun: 1.00, moon: 0.00 },
    { h: 14.0, top: '#93b9da', bottom: '#eef1d8', veil: 0.00, warm: 0.03, stars: 0.00, sun: 1.00, moon: 0.00 },
    { h: 16.2, top: '#97b6d2', bottom: '#e9e2bd', veil: 0.00, warm: 0.16, stars: 0.00, sun: 0.95, moon: 0.00 },
    { h: 17.6, top: '#8b9dbe', bottom: '#efc391', veil: 0.00, warm: 0.55, stars: 0.00, sun: 0.95, moon: 0.00 },
    { h: 18.6, top: '#676d98', bottom: '#df9275', veil: 0.14, warm: 0.85, stars: 0.06, sun: 0.65, moon: 0.20 },
    { h: 19.7, top: '#33405f', bottom: '#6a6177', veil: 0.42, warm: 0.28, stars: 0.65, sun: 0.00, moon: 0.90 },
    { h: 21.5, top: '#1d2843', bottom: '#333d5c', veil: 0.55, warm: 0.00, stars: 0.95, sun: 0.00, moon: 1.00 },
    { h: 24.0, top: '#131c36', bottom: '#29324f', veil: 0.52, warm: 0.00, stars: 1.00, sun: 0.00, moon: 1.00 }
  ];

  function between(stops, h) {
    if (h < stops[0].h) h += 24;
    for (var i = 0; i < stops.length - 1; i++) {
      var a = stops[i], b = stops[i + 1];
      if (h >= a.h && h <= b.h) {
        var t = (h - a.h) / Math.max(0.0001, (b.h - a.h));
        return { a: a, b: b, t: t };
      }
    }
    var last = stops[stops.length - 1];
    return { a: last, b: last, t: 0 };
  }

  function num(a, b, t, key) { return util.lerp(a[key], b[key], t); }

  /* 根据北京时间的小时数，计算这一分钟的天色目标 */
  function targetForHour(hourFloat) {
    var seg = between(STOPS, hourFloat);
    var a = seg.a, b = seg.b, t = seg.t;

    /* 太阳：约 6:10 升起、18:40 落下，走一道弧线 */
    var dayT = util.clamp((hourFloat - 6.1) / 12.5, 0, 1);
    var sunX = util.lerp(560, 1120, dayT);
    var sunY = 430 - Math.sin(dayT * Math.PI) * 300;   // 最高时 y≈140
    var sunA = num(a, b, t, 'sun');

    /* 月亮：约 19:30 升起、次日 5:00 落下 */
    var mh = hourFloat >= 19.5 ? hourFloat : hourFloat + 24;
    var moonT = util.clamp((mh - 19.5) / 9.5, 0, 1);
    var moonX = util.lerp(1000, 720, moonT);
    var moonY = 110 + Math.sin(moonT * Math.PI) * 70; // 午夜时较高
    var moonA = num(a, b, t, 'moon');

    return {
      skyTop: util.mixHex(a.top, b.top, t),
      skyBottom: util.mixHex(a.bottom, b.bottom, t),
      veil: num(a, b, t, 'veil'),
      warm: num(a, b, t, 'warm'),
      stars: num(a, b, t, 'stars'),
      sun: { x: sunX, y: sunY, a: sunA },
      moon: { x: moonX, y: moonY, a: moonA }
    };
  }

  /* ---------- 季节：用一整年的平滑曲线，避免“9月1日突然变黄” ---------- */
  /* 锚点（按一年中的第几天）：冬天枯灰 → 春天嫩绿 → 夏天深绿 → 秋天金黄 → 冬天 */
  var SEASON_ANCHORS = [
    { day: 15,  hue: 82,  sat: 0.10, light: 0.46 },  // 1 月中：冬天，灰绿褐
    { day: 105, hue: 96,  sat: 0.30, light: 0.60 },  // 4 月中：春天，嫩绿
    { day: 197, hue: 102, sat: 0.34, light: 0.47 },  // 7 月中：夏天，深绿
    { day: 290, hue: 62,  sat: 0.40, light: 0.55 },  // 10月中：秋天，金黄绿
    { day: 380, hue: 82,  sat: 0.10, light: 0.46 }   // 回到冬天（15 + 365）
  ];

  function hslToHex(h, s, l) {
    s = util.clamp(s, 0, 1); l = util.clamp(l, 0, 1);
    var c = (1 - Math.abs(2 * l - 1)) * s;
    var hp = (((h % 360) + 360) % 360) / 60;
    var x = c * (1 - Math.abs((hp % 2) - 1));
    var r = 0, g = 0, bl = 0;
    if (hp < 1) { r = c; g = x; }
    else if (hp < 2) { r = x; g = c; }
    else if (hp < 3) { g = c; bl = x; }
    else if (hp < 4) { g = x; bl = c; }
    else if (hp < 5) { r = x; bl = c; }
    else { r = c; bl = x; }
    var m = l - c / 2;
    return util.rgbToHex({
      r: (r + m) * 255, g: (g + m) * 255, b: (bl + m) * 255
    });
  }

  function seasonAt(dayOfYear) {
    var seg = SEASON_ANCHORS[0], seg2 = SEASON_ANCHORS[SEASON_ANCHORS.length - 1], t = 0;
    for (var i = 0; i < SEASON_ANCHORS.length - 1; i++) {
      var a = SEASON_ANCHORS[i], b = SEASON_ANCHORS[i + 1];
      if (dayOfYear >= a.day && dayOfYear <= b.day) {
        seg = a; seg2 = b;
        t = (dayOfYear - a.day) / Math.max(0.0001, (b.day - a.day));
        break;
      }
    }
    var hue = util.lerp(seg.hue, seg2.hue, t);
    var sat = util.lerp(seg.sat, seg2.sat, t);
    var light = util.lerp(seg.light, seg2.light, t);

    /* 由基础色推导一组树冠颜色（深 / 中 / 浅 / 高光） */
    return {
      name: 'season',
      leafDeep:  hslToHex(hue, sat + 0.04, light - 0.11),
      leafMain:  hslToHex(hue, sat, light),
      leafLight: hslToHex(hue, sat + 0.02, light + 0.10),
      leafGlow:  hslToHex(hue, sat - 0.02, light + 0.19),
      trunk: '#8a7057',
      /* 额外叠加在画面上的季节氛围（很淡）：秋天一点点暖，冬天一点点清冷 */
      warmExtra: (hue < 90 && hue > 40) ? Math.max(0, (90 - hue) / 90) * 0.05 : 0
    };
  }

  return { targetForHour: targetForHour, seasonAt: seasonAt };
})();
