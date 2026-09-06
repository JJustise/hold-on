/* ============================================================
 * Hold On · story.js —— 与小白花的完整对话流程
 * ============================================================ */
window.HO = window.HO || {};

HO.story = (function () {
  var util = HO.util;
  var data = HO.data;

  var el = {};
  var busy = false;        // 对话进行中

  var ENDING_LINES = [
    '回来啦。',
    '好，我知道了。',
    '嗯，记下来了。',
    '谢谢你回来告诉我。',
    '那我们继续待在这里吧。'
  ];

  /* ---------- 最初目的选项（A–K） ---------- */
  var PURPOSE_OPTIONS = [
    { value: 'shopping', label: '🛒 网购' },
    { value: 'social',   label: '📱 刷社交媒体' },
    { value: 'audio',    label: '📖 听小说' },
    { value: 'food',     label: '🍜 刷外卖' },
    { value: 'search',   label: '🔍 想马上搜一个东西' },
    { value: 'chat',     label: '😊 和朋友家人聊天' },
    { value: 'reply',    label: '💬 回复正事' },
    { value: 'video',    label: '🎬 看小视频' },
    { value: 'browse',   label: '🫧 没什么具体目的，就是想玩会儿手机' },
    { value: 'custom',   label: '✏️ 其他', custom: true }
  ];

  var DONE_OPTIONS = [
    { value: 'done',   label: '✅ 完成了原本想做的事情' },
    { value: 'drift',  label: '🌀 做着做着跑去看别的了' },
    { value: 'not',    label: '📱 根本没做原来的事情' },
    { value: 'custom', label: '✏️ 其他', custom: true }
  ];

  var FEEL_OPTIONS = [
    { value: 'relaxed', label: '😌 放松了一点' },
    { value: 'nothing', label: '😐 没什么特别的感觉' },
    { value: 'regret',  label: '😔 有点后悔，又累又烦、有点焦虑' },
    { value: 'more',    label: '📱 还想继续玩' },
    { value: 'custom',  label: '✏️ 我想自己说', custom: true }
  ];

  function init() {
    el.dialog = document.getElementById('dialog');
    el.bubbleText = document.getElementById('bubbleText');
    el.options = document.getElementById('options');
  }

  /* ---------- 显示文字，等待片刻（像小白花慢慢说话） ---------- */
  function say(text, ms) {
    return new Promise(function (resolve) {
      el.options.innerHTML = '';
      el.bubbleText.textContent = text;
      var wait = ms || Math.min(2600, 1200 + text.length * 45);
      setTimeout(resolve, wait);
    });
  }

  function clearOptions() { el.options.innerHTML = ''; }

  /* ---------- 给出选项，等用户点选 ---------- */
  function ask(text, opts) {
    return new Promise(function (resolve) {
      el.bubbleText.textContent = text;
      el.options.innerHTML = '';
      opts.forEach(function (opt) {
        var btn = document.createElement('button');
        btn.className = 'opt';
        btn.textContent = opt.label;
        btn.addEventListener('click', function () {
          if (opt.custom) { customAsk(text, opt, resolve); return; }
          resolve({ value: opt.value, label: opt.label, note: '' });
        });
        el.options.appendChild(btn);
      });
    });
  }

  /* 选择“其他 / 我想自己说”时，出现一个小输入框 */
  function customAsk(text, opt, resolve) {
    el.bubbleText.textContent = text + '\n\n' + opt.label.replace(/^✏️\s*/, '') + '：';
    el.options.innerHTML = '';
    var row = document.createElement('div');
    row.className = 'custom-row';
    var input = document.createElement('input');
    input.type = 'text';
    input.maxLength = 60;
    input.placeholder = '写点什么都可以…';
    var ok = document.createElement('button');
    ok.className = 'opt';
    ok.textContent = '好了';
    row.appendChild(input);
    row.appendChild(ok);
    el.options.appendChild(row);
    input.focus();

    function finish() {
      var v = input.value.trim();
      if (!v) { input.focus(); return; }
      resolve({ value: opt.value, label: opt.label, note: v, customText: v });
    }
    ok.addEventListener('click', finish);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') finish(); });
  }

  function showDialog() {
    el.dialog.classList.add('show');
    if (HO.scene) HO.scene.setDialogOpen(true);
  }
  function hideDialog() {
    el.dialog.classList.remove('show');
    if (HO.scene) HO.scene.setDialogOpen(false);
  }

  function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  /* ---------- 场景辅助 ---------- */
  function sceneIdle() {
    if (HO.scene) HO.scene.setUsing(false);
  }
  function sceneUsing() {
    if (HO.scene) HO.scene.setUsing(true);
  }

  /* ============ 完整流程 ============ */

  /* 首页点击草地上的手机 */
  function startFromPhone() {
    if (busy) return;
    busy = true;
    data.markInteracted();
    if (HO.scene) HO.scene.hidePhoneHint();

    showDialog();

    (async function () {
      var first = await ask('你现在想玩手机吗？', [
        { value: 'yes', label: '是的' },
        { value: 'no', label: '不了' }
      ]);

      if (first.value === 'no') {
        await say('好呀。');
        await say('那我们就继续待在这里吧。', 1600);
        hideDialog();
        sceneIdle();
        busy = false;
        return;
      }

      /* 记录最初目的 */
      var purpose = await ask('那你本来想用手机做什么呢？', PURPOSE_OPTIONS);

      /* 决定是否真的开始玩 */
      var decide = await ask('那你现在真的要开始玩了吗？', [
        { value: 'notnow', label: '🌿 算了，先不玩' },
        { value: 'play', label: '📱 好，我要玩' }
      ]);

      if (decide.value === 'notnow') {
        /* 一次“想用手机，但最终没有用”的行为 —— 只记录，不评价 */
        var now = Date.now();
        var p = HO.beijing.parts(now);
        data.addRecord({
          date: p.year + '-' + util.pad2(p.month) + '-' + util.pad2(p.day),
          startTime: util.pad2(p.hour) + ':' + util.pad2(p.minute),
          endTime: util.pad2(p.hour) + ':' + util.pad2(p.minute),
          durationMin: 0,
          initialPurpose: purpose,
          usedPhone: false,
          completed: null,
          feeling: null,
          note: ''
        });
        await say('好呀。');
        await say('不玩也没关系。想待在这里，就待在这里吧。', 2200);
        hideDialog();
        sceneIdle();
        busy = false;
        return;
      }

      /* 真的要玩：开始计时，场景里的小女孩拿起手机 */
      var session = {
        startedAt: Date.now(),
        initialPurpose: purpose,
        date: (function () {
          var pp = HO.beijing.parts(Date.now());
          return pp.year + '-' + util.pad2(pp.month) + '-' + util.pad2(pp.day);
        })()
      };
      data.setSession(session);
      sceneUsing();
      await say('好，那就去吧。');
      await say('我在这里等你回来。', 2000);
      hideDialog();
      busy = false;
    })();
  }

  /* 用户回来（重新打开网页 / 回到这个标签页 / 点了手机） */
  function resumeFromUsing() {
    if (busy) return;
    var session = data.getSession();
    if (!session) return;
    busy = true;
    showDialog();

    (async function () {
      await say('回来啦。', 900);
      var ans = await ask('你现在想放下手机了吗？', [
        { value: 'done', label: '是的，我玩完了' },
        { value: 'more', label: '再玩一会儿' }
      ]);

      if (ans.value === 'more') {
        await say('好，我在这里等你。', 1700);
        hideDialog();
        sceneUsing();          // 继续计时
        busy = false;
        return;
      }

      /* 玩完了：计算时长，记录 */
      var endAt = Date.now();
      var durationMs = endAt - session.startedAt;
      if (durationMs < 0) durationMs = 0;

      await say('好呀。');
      await say('你刚刚用了 ' + util.humanizeDuration(durationMs) + '。', 2400);

      var completed = await ask('刚才你原本想做的事情，有完成吗？', DONE_OPTIONS);
      var feeling = await ask('那现在呢？\n玩了一会儿手机之后，你心里是什么感觉？', FEEL_OPTIONS);

      var endParts = HO.beijing.parts(endAt);
      var startParts = HO.beijing.parts(session.startedAt);
      data.addRecord({
        date: session.date || (endParts.year + '-' + util.pad2(endParts.month) + '-' + util.pad2(endParts.day)),
        startTime: util.pad2(startParts.hour) + ':' + util.pad2(startParts.minute),
        endTime: util.pad2(endParts.hour) + ':' + util.pad2(endParts.minute),
        durationMin: Math.round(durationMs / 60000),
        initialPurpose: session.initialPurpose,
        usedPhone: true,
        completed: completed,
        feeling: feeling,
        note: (feeling.customText || completed.customText || '')
      });

      data.setSession(null);
      sceneIdle();

      await say(pickRandom(ENDING_LINES), 2000);
      hideDialog();
      busy = false;
    })();
  }

  function isBusy() { return busy; }

  return {
    init: init,
    startFromPhone: startFromPhone,
    resumeFromUsing: resumeFromUsing,
    isBusy: isBusy
  };
})();
