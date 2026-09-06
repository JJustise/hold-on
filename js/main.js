/* ============================================================
 * Hold On · main.js
 * 场景控制：时间 / 季节 / 姿态 / 小动物
 * 小动物：一律用“走进来 / 飞进来 / 从水里探出”的方式出现，无透明淡入淡出。
 *         测试：URL ?test / 按 T / 连点小白花 3 下
 * 环境 LOCKED：本文件不触碰任何森林/溪流/UI 元素。
 * ============================================================ */
window.HO = window.HO || {};

(function () {
  var util = HO.util;
  var data = HO.data;
  var story = HO.story;

  var scene = {};
  var mode = 'idle';        // 'idle' | 'using'
  var dialogOpen = false;

  /* ---------- 可测试参数：?t=18:30&d=2026-09-06&test ---------- */
  var q = util.parseQuery();
  var OVERRIDE = null;
  if (q.t || q.d) {
    var pNow = HO.beijing.parts(Date.now());
    var parts = { year: pNow.year, month: pNow.month, day: pNow.day, hour: pNow.hour, minute: pNow.minute, second: 0 };
    if (q.d) {
      var dm = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(q.d);
      if (dm) { parts.year = +dm[1]; parts.month = +dm[2]; parts.day = +dm[3]; }
    }
    if (q.t) {
      var tm = /^(\d{1,2}):(\d{1,2})$/.exec(q.t);
      if (tm) { parts.hour = +tm[1]; parts.minute = +tm[2]; }
    }
    OVERRIDE = parts;
  }
  var TEST_MODE = !!(q.test || q.animals);

  function beijingParts() {
    if (OVERRIDE) {
      return {
        year: OVERRIDE.year, month: OVERRIDE.month, day: OVERRIDE.day,
        hour: OVERRIDE.hour, minute: OVERRIDE.minute, second: 0,
        hourFloat: OVERRIDE.hour + OVERRIDE.minute / 60
      };
    }
    return HO.beijing.parts(Date.now());
  }

  /* ---------- 星星 ---------- */
  function buildStars() {
    var g = document.getElementById('starsG');
    if (!g) return;
    var frag = document.createDocumentFragment();
    for (var i = 0; i < 80; i++) {
      var c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      c.setAttribute('cx', Math.random() * 1280);
      c.setAttribute('cy', 10 + Math.random() * 260);
      c.setAttribute('r', (Math.random() * 1.1 + 0.4).toFixed(2));
      c.setAttribute('fill', '#ffffff');
      c.setAttribute('opacity', (Math.random() * 0.5 + 0.3).toFixed(2));
      if (i % 3 === 0) c.setAttribute('class', 'tw');
      frag.appendChild(c);
    }
    g.appendChild(frag);
  }

  /* ---------- 季节：给不规则树冠上色 ---------- */
  function applySeason() {
    var p = beijingParts();
    var doy = HO.beijing.dayOfYear(p);
    var s = HO.theme.seasonAt(doy);
    var palette = [s.leafMain, s.leafDeep, s.leafLight, s.leafMain, s.leafDeep,
                   s.leafLight, s.leafGlow, s.leafGlow, s.leafMain];
    var blobs = document.querySelectorAll('#canopy path');
    blobs.forEach(function (e, i) {
      e.setAttribute('fill', palette[i % palette.length]);
    });
    var dots = document.querySelectorAll('#canopy circle');
    dots.forEach(function (c) {
      c.setAttribute('fill', s.leafLight);
    });
  }

  /* ---------- 一天中的天色 ---------- */
  var skyStop1 = document.getElementById('skyStop1');
  var skyStop2 = document.getElementById('skyStop2');
  var hillsFar = document.getElementById('hillsFar');
  var sunG = document.getElementById('sunG');
  var moonG = document.getElementById('moonG');
  var starsG = document.getElementById('starsG');
  var nightVeil = document.getElementById('nightVeil');
  var warmGlow = document.getElementById('warmGlow');

  function toArr(hex) { var o = util.hexToRgb(hex); return [o.r, o.g, o.b]; }
  function toHex(arr) { return util.rgbToHex({ r: arr[0], g: arr[1], b: arr[2] }); }

  var cur = {
    skyTop: toArr('#aac7e0'), skyBottom: toArr('#e6f0e2'),
    veil: 0, warm: 0, stars: 0,
    sunA: 1, sunX: 840, sunY: 130, moonA: 0, moonX: 860, moonY: 140
  };

  function targetNow() {
    var p = beijingParts();
    var tg = HO.theme.targetForHour(p.hourFloat);
    var t = toArr(tg.skyTop);
    var b = toArr(tg.skyBottom);
    return {
      skyTop: t, skyBottom: b,
      veil: tg.veil, warm: tg.warm, stars: tg.stars,
      sunA: tg.sun.a, sunX: tg.sun.x, sunY: tg.sun.y,
      moonA: tg.moon.a, moonX: tg.moon.x, moonY: tg.moon.y
    };
  }

  var TICK_KEYS = ['skyTop', 'skyBottom', 'veil', 'warm', 'stars',
                   'sunA', 'sunX', 'sunY', 'moonA', 'moonX', 'moonY'];
  var lastTick = performance.now();

  function tick(now) {
    var dt = Math.min(0.5, (now - lastTick) / 1000);
    lastTick = now;
    var t = targetNow();
    var k = 1 - Math.exp(-dt / 240);
    TICK_KEYS.forEach(function (key) {
      var c = cur[key], tt = t[key];
      if (Array.isArray(c)) {
        for (var i = 0; i < 3; i++) c[i] += (tt[i] - c[i]) * k;
      } else {
        cur[key] = c + (tt - c) * k;
      }
    });
    applyVisuals();
    requestAnimationFrame(tick);
  }

  function applyVisuals() {
    skyStop1.setAttribute('stop-color', toHex(cur.skyTop));
    skyStop2.setAttribute('stop-color', toHex(cur.skyBottom));
    var hill = util.mixHex('#b7cdbd', toHex(cur.skyBottom), 0.5);
    hillsFar.setAttribute('fill', hill);

    nightVeil.style.opacity = cur.veil;
    warmGlow.style.opacity = Math.min(0.9, cur.warm * (1 - cur.veil * 0.7));

    starsG.setAttribute('opacity', cur.stars);
    sunG.setAttribute('opacity', cur.sunA);
    sunG.setAttribute('transform', 'translate(' + cur.sunX + ' ' + cur.sunY + ')');
    moonG.setAttribute('opacity', cur.moonA);
    moonG.setAttribute('transform', 'translate(' + cur.moonX + ' ' + cur.moonY + ')');
  }

  /* ---------- 小女孩：姿态（稳定优先） ---------- */
  var IDLE_POSES = ['pose-looksky', 'pose-flower'];
  var USING_POSES = ['pose-sitphone'];

  /* 脑袋隐形区：只覆盖头部位置，随当前姿态微调（不影响外观/交互） */
  function headXYFor(pose) {
    if (pose === 'pose-looksky') return { x: 560, y: 636 };
    if (pose === 'pose-flower') return { x: 552, y: 644 };
    if (pose === 'pose-sitphone') return { x: 585, y: 638 };
    return null;
  }
  function refreshHeadHit() {
    var hh = document.getElementById('girlHeadHit');
    if (!hh) return;
    var p = headXYFor(currentPoseName());
    if (p) {
      hh.setAttribute('cx', p.x);
      hh.setAttribute('cy', p.y);
      hh.style.display = 'block';
    } else {
      hh.style.display = 'none';
    }
  }

  function setPose(pose) {
    var girl = document.getElementById('girl');
    if (!girl) return;
    var poses = girl.querySelectorAll('.pose');
    poses.forEach(function (p) {
      p.classList.toggle('active', p.classList.contains(pose));
    });
    refreshHeadHit();
  }

  function currentPoseName() {
    var curEl = document.querySelector('#girl .pose.active');
    if (!curEl) return '';
    return curEl.getAttribute('class').split(' ').filter(function (c) { return c.indexOf('pose-') === 0; })[0];
  }

  /* ---------- 走路（偶尔）：站起来走几步再回来坐下，禁止“坐着平移” ---------- */
  var walkBusy = false;
  var lastWalkAt = 0;

  function walkMove(node, fx, fy, tx, ty, durMs, easeName, cb) {
    var start = null;
    var ease = EASE[easeName] || easeInOut;
    var s = tx >= fx ? 1 : -1;
    function step(ts) {
      if (start === null) start = ts;
      var t = Math.min(1, (ts - start) / durMs);
      var e = ease(t);
      var x = fx + (tx - fx) * e;
      var y = fy + (ty - fy) * e;
      node.setAttribute('transform', 'translate(' + x + ' ' + y + ') scale(' + s + ' 1)');
      if (t < 1) requestAnimationFrame(step);
      else if (cb) cb();
    }
    requestAnimationFrame(step);
  }

  function startGirlWalk() {
    if (mode !== 'idle' || dialogOpen || story.isBusy() || walkBusy) return;
    var node = document.querySelector('#girl .pose.pose-walk');
    if (!node) return;
    walkBusy = true;
    setPose('pose-walk');
    var WALK_Y = 700;
    node.setAttribute('transform', 'translate(560 ' + WALK_Y + ') scale(1 1)');
    walkMove(node, 560, WALK_Y, 648, WALK_Y, 2700, 'inout', function () {
      pause(1000, function () {
        walkMove(node, 648, WALK_Y, 560, WALK_Y, 2500, 'inout', function () {
          setPose('pose-looksky');
          walkBusy = false;
          lastWalkAt = Date.now();
        });
      });
    });
  }

  function maybeTryWalk() {
    if (mode !== 'idle' || dialogOpen || story.isBusy() || walkBusy || animalBusy) return;
    if (Date.now() - lastWalkAt < 32000) return;
    if (Math.random() < 0.4) startGirlWalk();
  }

  /* 很慢地换姿势（空闲只在同一个位置轻微换，不横向滑动） */
  function cyclePose() {
    if (walkBusy || dialogOpen || story.isBusy()) return;
    var pool = (mode === 'using') ? USING_POSES : IDLE_POSES;
    if (pool.length < 2) return;
    var curName = currentPoseName();
    var next = curName;
    var tries = 0;
    while ((next === curName || pool.indexOf(next) < 0) && tries < 6) {
      next = pool[Math.floor(Math.random() * pool.length)];
      tries++;
    }
    if (pool.indexOf(next) >= 0) setPose(next);
  }

  /* ---------- 场景状态 ---------- */
  scene.setUsing = function (using) {
    mode = using ? 'using' : 'idle';
    var girl = document.getElementById('girl');
    var groundPhone = document.getElementById('groundPhone');
    var usingHint = document.getElementById('usingHint');
    var phoneHint = document.getElementById('phoneHint');

    if (girl) girl.classList.toggle('holding', using);
    document.body.classList.toggle('using', using);
    if (!using && walkBusy) { walkBusy = false; }
    setPose(using ? USING_POSES[0] : 'pose-looksky');
    if (groundPhone) groundPhone.style.display = using ? 'none' : 'block';
    if (usingHint) usingHint.classList.toggle('visible', using);
    if (phoneHint) phoneHint.classList.toggle('visible', !using && !data.hasInteracted());
  };

  scene.setDialogOpen = function (open) { dialogOpen = open; };
  scene.hidePhoneHint = function () {
    var phoneHint = document.getElementById('phoneHint');
    if (phoneHint) phoneHint.classList.remove('visible');
  };

  /* ============================================================
   * 小动物导演：全部用“移动/遮挡”出现与离开，不使用透明度
   * ============================================================ */

  function el(id) { return document.getElementById(id); }

  function setT(node, x, y) {
    node.setAttribute('transform', 'translate(' + x + ' ' + y + ')');
  }

  var HOME = {
    'animal-dog':      [-160, 706],
    'animal-cat':      [-160, 704],
    'animal-mouse':    [50, 708],
    'animal-squirrel': [55, 702],
    'animal-bird':     [1400, 160],
    'animal-frog':     [-400, -400],
    'animal-fish':     [-400, -400],
    'animal-beaver':   [-400, -400]
  };

  function easeOut(t)  { return 1 - Math.pow(1 - t, 3); }
  function easeIn(t)   { return t * t * t; }
  function easeInOut(t){ return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
  function easeLinear(t){ return t; }

  var EASE = { out: easeOut, in: easeIn, inout: easeInOut, linear: easeLinear };

  /* 平滑移动一段 */
  function glide(node, fx, fy, tx, ty, durMs, easeName, cb) {
    var start = null;
    var ease = EASE[easeName] || easeInOut;
    function step(ts) {
      if (start === null) start = ts;
      var t = Math.min(1, (ts - start) / durMs);
      var e = ease(t);
      setT(node, fx + (tx - fx) * e, fy + (ty - fy) * e);
      if (t < 1) requestAnimationFrame(step);
      else if (cb) cb();
    }
    requestAnimationFrame(step);
  }

  function pause(ms, cb) { setTimeout(cb, ms); }

  /* 把动物放回“看不见”的初始位置 */
  function home(id) {
    var node = el(id);
    if (node && HOME[id]) setT(node, HOME[id][0], HOME[id][1]);
  }

  /* 水面小水环（盖住水下部分，不用透明度） */
  var ripple = null;
  function removeRipple() {
    if (ripple && ripple.parentNode) ripple.parentNode.removeChild(ripple);
    ripple = null;
  }
  function addRipple(x, y) {
    var svg = document.getElementById('scene');
    removeRipple();
    var c = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
    c.setAttribute('cx', x);
    c.setAttribute('cy', y);
    c.setAttribute('rx', 32);
    c.setAttribute('ry', 12);
    c.setAttribute('fill', '#aed6e4');
    c.setAttribute('opacity', '0.95');
    svg.appendChild(c);
    ripple = c;
  }

  /* ---------- 动物动作：弧线 / 多段 / 探头，自然进入 ---------- */

  function dogAct(node, done) {
    home('animal-dog');
    glide(node, -160, 706, 60, 690, 2600, 'out', function () {
      pause(300, function () {
        glide(node, 60, 690, 280, 702, 2200, 'out', function () {
          pause(400, function () {
            glide(node, 280, 702, 468, 706, 1600, 'out', function () {
              pause(4200, function () {
                glide(node, 468, 706, 250, 712, 1800, 'in', function () {
                  pause(300, function () {
                    glide(node, 250, 712, -180, 706, 3000, 'in', function () {
                      home('animal-dog'); done();
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  }

  function catAct(node, done) {
    home('animal-cat');
    glide(node, -160, 704, 80, 694, 3500, 'out', function () {
      pause(500, function () {
        glide(node, 80, 694, 250, 700, 2200, 'out', function () {
          pause(500, function () {
            glide(node, 250, 700, 430, 704, 1800, 'out', function () {
              pause(7000, function () {
                glide(node, 430, 704, 180, 710, 2400, 'in', function () {
                  glide(node, 180, 710, -180, 706, 2400, 'in', function () {
                    home('animal-cat'); done();
                  });
                });
              });
            });
          });
        });
      });
    });
  }

  function mouseAct(node, done) {
    home('animal-mouse');
    glide(node, 50, 708, 130, 704, 1100, 'out', function () {
      pause(400, function () {
        glide(node, 130, 704, 198, 706, 700, 'out', function () {
          pause(1600, function () {
            glide(node, 198, 706, 130, 706, 800, 'in', function () {
              glide(node, 130, 706, 46, 708, 900, 'in', function () {
                home('animal-mouse'); done();
              });
            });
          });
        });
      });
    });
  }

  function squirrelAct(node, done) {
    home('animal-squirrel');
    glide(node, 55, 702, 122, 698, 1200, 'out', function () {
      pause(300, function () {
        glide(node, 122, 698, 174, 700, 1000, 'out', function () {
          pause(1800, function () {
            glide(node, 174, 700, 112, 702, 900, 'in', function () {
              glide(node, 112, 702, 52, 702, 1100, 'in', function () {
                home('animal-squirrel'); done();
              });
            });
          });
        });
      });
    });
  }

  function birdAct(node, done) {
    home('animal-bird');
    glide(node, 1400, 160, 1260, 118, 1500, 'inout', function () {
      glide(node, 1260, 118, 1190, 78, 1800, 'inout', function () {
        glide(node, 1190, 78, 1175, 56, 800, 'inout', function () {
          pause(3600, function () {
            glide(node, 1175, 56, 1170, 68, 260, 'inout', function () {
              glide(node, 1170, 68, 1230, 92, 1200, 'inout', function () {
                glide(node, 1230, 92, -160, 160, 4200, 'inout', function () {
                  home('animal-bird'); done();
                });
              });
            });
          });
        });
      });
    });
  }

  /* 青蛙：荷叶 + 青蛙（荷叶在水面上，青蛙坐在荷叶上，安静地顺水漂一小段后离开） */
  function frogAct(node, done) {
    home('animal-frog');
    var fx = 700, fy = 470;
    setT(node, fx, fy);
    pause(1200, function () {
      glide(node, fx, fy, fx + 30, fy + 14, 3200, 'inout', function () {
        pause(4200, function () {
          glide(node, fx + 30, fy + 14, 1150, 612, 17000, 'linear', function () {
            glide(node, 1150, 612, 1380, 700, 6000, 'linear', function () {
              home('animal-frog'); done();
            });
          });
        });
      });
    });
  }

  /* 小鱼：头朝右，缓慢游一小段（微弧线，不横穿整条溪） */
  function fishAct(node, done) {
    home('animal-fish');
    var fx = 430, fy = 448;
    setT(node, fx, fy);
    glide(node, fx, fy, fx + 90, fy - 8, 3400, 'inout', function () {
      pause(700, function () {
        glide(node, fx + 90, fy - 8, fx + 180, fy + 10, 3200, 'inout', function () {
          pause(600, function () {
            glide(node, fx + 180, fy + 10, fx + 290, fy + 40, 3800, 'inout', function () {
              home('animal-fish'); done();
            });
          });
        });
      });
    });
  }

  /* 海狸：水面出现水环 → 浮出头 → 看看 → 潜回水里 */
  function beaverAct(node, done) {
    home('animal-beaver');
    var bx = 780, by = 470;
    addRipple(bx, by + 18);
    setT(node, bx, by + 26);
    glide(node, bx, by + 26, bx, by - 2, 3000, 'out', function () {
      pause(3000, function () {
        glide(node, bx, by - 2, bx, by + 26, 2400, 'in', function () {
          removeRipple();
          home('animal-beaver'); done();
        });
      });
    });
  }

  var ACTS = {
    'animal-dog': dogAct,
    'animal-cat': catAct,
    'animal-mouse': mouseAct,
    'animal-squirrel': squirrelAct,
    'animal-bird': birdAct,
    'animal-frog': frogAct,
    'animal-fish': fishAct,
    'animal-beaver': beaverAct
  };
  var KEYS = ['animal-frog', 'animal-fish', 'animal-beaver'];


  var animalBusy = false;
  var lastAnimalId = '';
  var animalTimer = null;
  var toastTimer = null;

  function nextAnimalDelay() {
    return TEST_MODE ? (3000 + Math.random() * 6000) : (60000 + Math.random() * 140000);
  }

  function pickAnimal() {
    if (KEYS.length <= 1) return KEYS[0];
    var k = KEYS[Math.floor(Math.random() * KEYS.length)];
    if (k === lastAnimalId && KEYS.length > 1) {
      k = KEYS[(KEYS.indexOf(k) + 1) % KEYS.length];
    }
    return k;
  }

  function spawnAnimal() {
    if (animalBusy) { scheduleAnimal(TEST_MODE ? 2000 : 45000); return; }
    var id = pickAnimal();
    lastAnimalId = id;
    var node = el(id);
    if (!node) { scheduleAnimal(nextAnimalDelay()); return; }
    if (TEST_MODE) { try { console.log('[Hold On 小动物测试] 出现：', id); } catch (e) {} }
    animalBusy = true;
    ACTS[id](node, function () {
      animalBusy = false;
      scheduleAnimal(nextAnimalDelay());
    });
  }

  function scheduleAnimal(delay) {
    if (animalTimer) clearTimeout(animalTimer);
    animalTimer = setTimeout(spawnAnimal, delay);
  }

  /* 极简小提示 */
  function toast(text) {
    var old = document.getElementById('animalToast');
    if (old) old.remove();
    var d = document.createElement('div');
    d.id = 'animalToast';
    d.textContent = text;
    d.style.cssText = 'position:fixed;right:18px;bottom:18px;z-index:60;font-size:13px;color:#6d6a5b;' +
      'background:rgba(255,252,244,0.78);padding:7px 14px;border-radius:16px;' +
      'box-shadow:0 2px 10px rgba(90,100,88,0.12);backdrop-filter:blur(4px);' +
      'transition:opacity .6s ease;pointer-events:none;font-family:"PingFang SC",sans-serif;';
    document.body.appendChild(d);
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      d.style.opacity = '0';
      setTimeout(function () { if (d.parentNode) d.parentNode.removeChild(d); }, 700);
    }, 2600);
  }

  /* 按 T / URL ?test / 连点小白花 3 下，开关测试 */
  function setAnimalTest(on) {
    TEST_MODE = on;
    try {
      console.log('[Hold On] 动物测试模式：' + (on ? '开（再按 T 关闭）' : '关（按 T 打开）'));
    } catch (e) {}
    toast(on ? '动物测试中 · 再按 T 或连点小白花关闭' : '已回到安静模式');
    if (animalTimer) clearTimeout(animalTimer);
    scheduleAnimal(on ? 1600 : (60000 + Math.random() * 90000));
  }

  /* ---------- 数据导出（隐藏入口：双击小女孩脑袋） ---------- */
  function showDataPanel(open) {
    var panel = document.getElementById('dataPanel');
    if (!panel) return;
    var note = document.getElementById('dpNote');
    if (note) note.textContent = '';
    panel.hidden = false;
    requestAnimationFrame(function () {
      panel.classList.toggle('open', !!open);
    });
  }
  function closeDataPanel() {
    var panel = document.getElementById('dataPanel');
    showDataPanel(false);
    if (panel) setTimeout(function () { panel.hidden = true; }, 350);
  }
  function panelNote(text) {
    var n = document.getElementById('dpNote');
    if (n) n.textContent = text;
  }
  function exportRecords() {
    var records = HO.data.getRecords() || [];
    if (!records.length) { panelNote('现在还没有可以导出的记录。'); toast('现在还没有可以导出的记录。'); return; }
    var p = beijingParts();
    var filename = 'hold-on-data-' + p.year + '-' + util.pad2(p.month) + '-' + util.pad2(p.day) + '.json';
    var payload = {
      app: 'Hold On',
      kind: 'hold-on-records',
      version: 1,
      exportedAt: new Date().toISOString(),
      records: records
    };
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    var file = null;
    try { file = new File([blob], filename, { type: 'application/json' }); } catch (e) { file = null; }

    /* iPhone / iPad Safari：优先用系统分享菜单，可存到“文件”App / iCloud */
    if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: '我的 Hold On 记录' }).then(function () {
        panelNote('已经帮你保存好了。');
        toast('已经帮你保存好了。');
      }).catch(function (err) {
        if (!err || err.name !== 'AbortError') fallbackDownload(blob, filename);
      });
      return;
    }
    fallbackDownload(blob, filename);
  }
  function fallbackDownload(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 3000);
    panelNote('已经帮你保存好了。');
    toast('已经帮你保存好了。');
  }
  function wireDataPanel() {
    var exportBtn = document.getElementById('exportBtn');
    if (exportBtn) exportBtn.addEventListener('click', exportRecords);
    var closeBtn = document.getElementById('dpClose');
    if (closeBtn) closeBtn.addEventListener('click', closeDataPanel);
  }

  /* ---------- 交互 ---------- */
  function bindEvents() {
    var groundPhone = document.getElementById('groundPhone');
    if (groundPhone) {
      groundPhone.addEventListener('click', function () {
        if (mode === 'idle' && !dialogOpen && !story.isBusy()) story.startFromPhone();
      });
    }
    var girl = document.getElementById('girl');
    var girlHit = document.getElementById('girlHit');
    var hitEls = [girl, girlHit];
    hitEls.forEach(function (item) {
      if (item) {
        item.addEventListener('click', function () {
          if (mode === 'using' && !dialogOpen && !story.isBusy()) story.resumeFromUsing();
        });
      }
    });

    /* 双击小女孩脑袋：打开数据导出（隐藏入口，仅空闲时可触发） */
    var headHit = document.getElementById('girlHeadHit');
    if (headHit) {
      headHit.addEventListener('dblclick', function () {
        if (mode === 'idle' && !dialogOpen && !story.isBusy() && !walkBusy) {
          showDataPanel(true);
        }
      });
    }
    wireDataPanel();

    var flower = document.getElementById('flower');
    var flowerClicks = [];
    var lastFlowerLongAt = 0;
    var flowerPressTimer = null;
    var flowerLonged = false;
    if (flower) {
      flower.addEventListener('click', function () {
        if (Date.now() - lastFlowerLongAt < 1200) { flowerClicks = []; return; }
        var now = Date.now();
        flowerClicks.push(now);
        flowerClicks = flowerClicks.filter(function (t) { return now - t < 1200; });
        if (flowerClicks.length >= 3) {
          flowerClicks = [];
          setAnimalTest(!TEST_MODE);
        }
      });

      /* 长按小白花约 0.7 秒：打开数据导出（触屏友好；不改画面、不影响三击测试） */
      function cancelFlowerLong() {
        if (flowerPressTimer) { clearTimeout(flowerPressTimer); flowerPressTimer = null; }
        flowerLonged = false;
      }
      flower.addEventListener('pointerdown', function () {
        cancelFlowerLong();
        flowerPressTimer = setTimeout(function () {
          flowerPressTimer = null;
          if (mode === 'idle' && !dialogOpen && !story.isBusy() && !walkBusy) {
            flowerLonged = true;
            lastFlowerLongAt = Date.now();
            showDataPanel(true);
          }
        }, 700);
      });
      ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) {
        flower.addEventListener(ev, cancelFlowerLong);
      });
    }

    document.addEventListener('keydown', function (e) {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      var k = (e.key || '').toUpperCase();
      if (k === 'T') {
        e.preventDefault();
        setAnimalTest(!TEST_MODE);
      }
    });

    document.addEventListener('visibilitychange', function () {
      if (!document.hidden && mode === 'using' && !dialogOpen && !story.isBusy()) {
        setTimeout(function () { story.resumeFromUsing(); }, 800);
      }
    });
  }

  /* ---------- 初始化 ---------- */
  function init() {
    story.init();
    buildStars();
    applySeason();
    scene.setUsing(false);

    KEYS.forEach(home);

    var session = data.getSession();
    if (session && session.startedAt) {
      scene.setUsing(true);
      setTimeout(function () { story.resumeFromUsing(); }, 1300);
    }

    bindEvents();

    var t = targetNow();
    TICK_KEYS.forEach(function (key) { cur[key] = t[key]; });
    applyVisuals();
    requestAnimationFrame(tick);

    setInterval(cyclePose, 15000);
    setInterval(maybeTryWalk, 6000);

    scheduleAnimal(TEST_MODE ? 1600 : (70000 + Math.random() * 30000));
    if (TEST_MODE) toast('动物测试中 · 再按 T 或连点小白花关闭');

    setInterval(function () {
      var p = beijingParts();
      if (p.hour === 0 && p.minute < 5) applySeason();
    }, 60000);

    var p = beijingParts();
    console.log('[Hold On] 森林已经醒来。当前北京时间：',
      p.year + '-' + util.pad2(p.month) + '-' + util.pad2(p.day) + ' ' +
      util.pad2(p.hour) + ':' + util.pad2(p.minute));
  }

  HO.scene = scene;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
