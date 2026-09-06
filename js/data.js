/* ============================================================
 * Hold On · data.js —— 浏览器本地保存（localStorage）
 * 不需要服务器、不需要账号。刷新页面后数据仍然存在。
 * ============================================================ */
window.HO = window.HO || {};

HO.data = (function () {
  var RECORDS_KEY = 'holdon.records.v1';
  var SESSION_KEY = 'holdon.session.v1';
  var FLAG_KEY = 'holdon.flag.v1';

  function load(key, def) {
    try {
      var raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : def;
    } catch (e) {
      return def;
    }
  }

  function save(key, val) {
    try {
      window.localStorage.setItem(key, JSON.stringify(val));
    } catch (e) {
      /* 某些隐私模式下无法写入，忽略即可 */
    }
  }

  /* 历史记录 */
  function getRecords() { return load(RECORDS_KEY, []); }

  function addRecord(rec) {
    var list = getRecords();
    list.push(rec);
    save(RECORDS_KEY, list);
    try { console.log('[Hold On] 已保存一条记录：', rec); } catch (e) {}
    return rec;
  }

  /* “使用手机中”的进行中会话（跨刷新保留） */
  function getSession() { return load(SESSION_KEY, null); }
  function setSession(s) { if (s) save(SESSION_KEY, s); else save(SESSION_KEY, null); }

  /* 记录用户是否已经完成过一次互动（用于首页提示） */
  function hasInteracted() { return !!load(FLAG_KEY, false); }
  function markInteracted() { save(FLAG_KEY, true); }

  return {
    getRecords: getRecords,
    addRecord: addRecord,
    getSession: getSession,
    setSession: setSession,
    hasInteracted: hasInteracted,
    markInteracted: markInteracted
  };
})();
