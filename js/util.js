/* ============================================================
 * Hold On · util.js —— 小工具函数
 * ============================================================ */
window.HO = window.HO || {};

HO.util = (function () {
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function hexToRgb(hex) {
    hex = String(hex).replace('#', '');
    if (hex.length === 3) {
      hex = hex.split('').map(function (c) { return c + c; }).join('');
    }
    var n = parseInt(hex, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  function rgbToHex(o) {
    function p(v) {
      return Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
    }
    return '#' + p(o.r) + p(o.g) + p(o.b);
  }

  function mixHex(a, b, t) {
    t = clamp(t, 0, 1);
    var ca = hexToRgb(a), cb = hexToRgb(b);
    return rgbToHex({
      r: ca.r + (cb.r - ca.r) * t,
      g: ca.g + (cb.g - ca.g) * t,
      b: ca.b + (cb.b - ca.b) * t
    });
  }

  function lerp(a, b, t) { return a + (b - a) * t; }

  function parseQuery() {
    var out = {};
    var q = window.location.search.replace(/^\?/, '');
    if (!q) return out;
    q.split('&').forEach(function (pair) {
      var kv = pair.split('=');
      if (kv[0]) out[decodeURIComponent(kv[0])] = decodeURIComponent(kv.slice(1).join('='));
    });
    return out;
  }

  /* 把毫秒时长变成温柔的描述，例如 “23 分钟” */
  function humanizeDuration(ms) {
    var minutes = Math.floor(ms / 60000);
    var seconds = Math.floor((ms % 60000) / 1000);
    if (minutes <= 0) return '不到 1 分钟';
    if (minutes < 60) {
      if (seconds >= 30) return (minutes + 1) + ' 分钟';
      return minutes + ' 分钟';
    }
    var h = Math.floor(minutes / 60);
    var m = minutes % 60;
    if (m === 0) return h + ' 小时';
    return h + ' 小时 ' + m + ' 分钟';
  }

  function pad2(n) { return String(n).padStart(2, '0'); }

  return {
    clamp: clamp,
    hexToRgb: hexToRgb,
    rgbToHex: rgbToHex,
    mixHex: mixHex,
    lerp: lerp,
    parseQuery: parseQuery,
    humanizeDuration: humanizeDuration,
    pad2: pad2
  };
})();
