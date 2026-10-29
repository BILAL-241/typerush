/* TypeRush: vanilla JS typing engine. No dependencies, no network requests. */
(() => {
'use strict';
const $ = (id) => document.getElementById(id);
const $$ = (sel) => [...document.querySelectorAll(sel)];

/* ---------- Built-in passages (plain ASCII so every key is easy to type) ---------- */
const PASSAGES = {
  easy: [
    'The sun is up and the sky is blue. We walk to the park with our dog. It is a good day to play outside and have fun.',
    'I like to read a book after dinner. My cat sits on the bed and naps. The house is calm and warm tonight.',
    'Please open the door and come in. Put your bag on the chair and sit down. We can eat lunch when you are ready.',
    'The bus stops near the shop at nine. Tom buys milk, bread and fruit. Then he goes home and cooks a big meal.',
    'Rain falls on the green hill. The birds hide in the trees, and the road is wet. Soon the clouds will move away.'
  ],
  medium: [
    'Yesterday, I finally finished the report my manager asked for; it took longer than expected, but the results were worth it.',
    "If you leave at 7:30, you'll miss the traffic. Otherwise, bring a book, because the highway is usually slow on Fridays.",
    'She said, "Let\'s meet outside the library at noon," and then ran to catch the train before it left the station.',
    "Good habits are built slowly: practise for ten minutes every day, review your mistakes, and don't rush the difficult words.",
    "The cafe on Main Street sells fresh bread, strong coffee, and the best lemon cake in town, so it's always busy by eight."
  ],
  hard: [
    'Despite the unpredictable weather, the committee approved an ambitious proposal to renovate the historic library, which had been neglected for nearly three decades.',
    'Effective programmers write code that is readable, well-documented, and thoroughly tested; they refactor frequently, because maintainability matters more than cleverness.',
    'The archaeologist meticulously catalogued each fragment, hypothesising that the pottery originated from a sophisticated civilisation along the river valley.',
    'Although the quarterly figures were disappointing, the director remained optimistic, emphasising that sustainable growth requires patience, discipline, and consistent investment.',
    "Photosynthesis converts sunlight, water, and carbon dioxide into glucose and oxygen; consequently, forests influence both the climate and the atmosphere's chemical balance."
  ]
};
const MODES = { timed: 'Timed', practice: 'Practice', daily: 'Daily challenge' };

/* ---------- localStorage wrapper (stays safe if storage is blocked) ---------- */
const store = {
  get(k, d) { try { const v = localStorage.getItem('typerush.' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('typerush.' + k, JSON.stringify(v)); } catch (e) { /* ignore */ } },
  del(k) { try { localStorage.removeItem('typerush.' + k); } catch (e) { /* ignore */ } }
};

/* ---------- State ---------- */
const S = { mode: 'timed', diff: 'medium', dur: 60, text: '', status: 'idle', start: 0, elapsed: 0, timer: 0, prevLen: 0, chars: [], last: null };
const input = $('typingInput'), view = $('passage');
let soundOn = false, audio = null;

const fmt = (s) => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

/* ---------- Passage selection ---------- */
function buildText() {
  if (S.mode === 'daily') {                       // same passage for everyone on a given local date
    const pool = [...PASSAGES.medium, ...PASSAGES.hard], d = new Date();
    const day = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5);
    return pool[day % pool.length];
  }
  const pool = PASSAGES[S.diff];
  if (S.mode === 'practice') return pool[Math.floor(Math.random() * pool.length)];
  // Timed: chain passages so even very fast typists cannot run out of text
  const out = []; let len = 0, bag = [];
  while (len < S.dur * 14) { if (!bag.length) bag = shuffle([...pool]); const p = bag.pop(); out.push(p); len += p.length + 1; }
  return out.join(' ');
}

/* ---------- Rendering ---------- */
function render() {
  view.textContent = ''; S.chars = [];
  const words = S.text.split(' ');
  words.forEach((w, i) => {
    const word = document.createElement('span'); word.className = 'word';
    for (const ch of w) { const s = document.createElement('span'); s.textContent = ch; word.append(s); S.chars.push(s); }
    view.append(word);
    if (i < words.length - 1) { const sp = document.createElement('span'); sp.textContent = ' '; view.append(sp); S.chars.push(sp); }
  });
}

function stats() {
  const v = input.value, typed = v.length; let correct = 0;
  for (let i = 0; i < typed; i++) if (v[i] === S.text[i]) correct++;
  const bad = typed - correct, mins = Math.max(S.elapsed, 1) / 60;   // 1s floor avoids early WPM spikes
  const wpm = S.status === 'idle' ? 0 : Math.max(0, Math.round((typed / 5 - bad) / mins)); // net WPM
  return { typed, correct, bad, wpm, acc: typed ? Math.round(correct / typed * 100) : 100 };
}

function updateChars() {
  const v = input.value, n = v.length;
  S.chars.forEach((s, i) => {
    let c = i >= n ? '' : (v[i] === S.text[i] ? 'ok' : 'bad');
    if (i === n) c = 'cur';
    if (s.className !== c) s.className = c;
  });
  const cur = S.chars[Math.min(n, S.chars.length - 1)];
  const lh = parseFloat(getComputedStyle(view).lineHeight) || 44;
  view.scrollTop = Math.max(0, cur.offsetTop - lh);        // keep the current line in the middle row
}

function paint() {
  const s = stats(); let t, p;
  if (S.mode === 'practice') { t = Math.floor(S.elapsed); p = s.typed / S.text.length; }
  else { t = S.status === 'idle' ? S.dur : Math.max(0, Math.ceil(S.dur - S.elapsed)); p = S.status === 'idle' ? 0 : Math.min(1, S.elapsed / S.dur); }
  $('wpm').textContent = s.wpm; $('acc').textContent = s.acc + '%'; $('err').textContent = s.bad; $('time').textContent = fmt(t);
  $('bar').style.width = (p * 100) + '%'; $('bar').parentElement.setAttribute('aria-valuenow', Math.round(p * 100));
}

function syncUI() {
  $$('[data-mode]').forEach(b => b.setAttribute('aria-pressed', b.dataset.mode === S.mode));
  $$('[data-dur]').forEach(b => { b.setAttribute('aria-pressed', +b.dataset.dur === S.dur); b.disabled = S.mode === 'practice'; });
  $$('[data-diff]').forEach(b => { b.setAttribute('aria-pressed', b.dataset.diff === S.diff); b.disabled = S.mode === 'daily'; });
  $('newBtn').disabled = S.mode === 'daily';
  $('endBtn').hidden = S.mode !== 'practice';
  $('timeLabel').textContent = S.mode === 'practice' ? 'Elapsed' : 'Time left';
  const best = store.get('best', 0); $('best').textContent = best || '\u2013';
}

/* ---------- Test lifecycle ---------- */
function reset(newText) {
  clearInterval(S.timer);
  S.status = 'idle'; S.elapsed = 0; S.prevLen = 0; S.last = null;
  if (newText || !S.text) S.text = buildText();
  input.value = ''; input.readOnly = false; input.maxLength = S.text.length;
  $('results').hidden = true;
  render(); updateChars(); paint(); input.focus({ preventScroll: true });
}

function begin() {
  S.status = 'running'; S.start = performance.now();
  S.timer = setInterval(tick, 100);
}

function tick() {
  S.elapsed = (performance.now() - S.start) / 1000;
  if (S.mode !== 'practice' && S.elapsed >= S.dur) return finish(true);
  paint();
}

function finish(timeUp) {
  if (S.status !== 'running') return;
  clearInterval(S.timer);
  S.elapsed = timeUp ? S.dur : (performance.now() - S.start) / 1000;
  S.status = 'done'; input.readOnly = true;
  updateChars(); paint(); showResults();
}

input.addEventListener('input', () => {
  if (S.status === 'done') return;
  if (input.value.length > S.text.length) input.value = input.value.slice(0, S.text.length);
  const n = input.value.length;
  if (S.status === 'idle' && n > 0) begin();           // timer starts on first keystroke only
  if (n > S.prevLen) beep(input.value[n - 1] === S.text[n - 1]);
  S.prevLen = n;
  updateChars(); paint();
  if (n >= S.text.length) finish(false);               // end of passage: finish cleanly
});

/* Fair play and caret control: no paste/drop, no moving the caret, no Enter */
['paste', 'drop', 'cut'].forEach(ev => input.addEventListener(ev, e => e.preventDefault()));
input.addEventListener('beforeinput', e => { if (/Paste|Drop/.test(e.inputType || '')) e.preventDefault(); });
input.addEventListener('keydown', e => { if (['Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) e.preventDefault(); });
input.addEventListener('mouseup', () => input.setSelectionRange(input.value.length, input.value.length));

/* ---------- Results ---------- */
function showResults() {
  const s = stats(), prevBest = store.get('best', 0);
  const isBest = S.mode !== 'practice' && s.wpm > prevBest;
  if (isBest) store.set('best', s.wpm);
  const best = Math.max(prevBest, isBest ? s.wpm : 0);
  if (s.typed > 0) {
    const h = store.get('history', []);
    h.unshift({ t: Date.now(), mode: S.mode, wpm: s.wpm, acc: s.acc, sec: Math.round(S.elapsed) });
    store.set('history', h.slice(0, 10));
  }
  S.last = s;
  $('rWpm').textContent = s.wpm; $('rAcc').textContent = s.acc + '%'; $('rOk').textContent = s.correct;
  $('rBad').textContent = s.bad; $('rTotal').textContent = s.typed; $('rTime').textContent = fmt(Math.round(S.elapsed));
  $('newBest').hidden = !isBest;
  let msg = s.wpm < 20 ? 'A good start. Short, regular practice sessions will build speed quickly.'
    : s.wpm < 40 ? 'Solid progress. Keep your eyes on the screen and aim for steady rhythm.'
    : s.wpm < 60 ? 'Good speed, comfortable for everyday work.'
    : s.wpm < 80 ? 'Fast typing. Well suited to office and programming work.'
    : 'Excellent speed. Keep your accuracy high to stay efficient.';
  if (s.acc < 90) msg += ' Your accuracy was under 90%, so slowing down slightly should raise your net speed.';
  $('rMsg').textContent = msg;
  const okPct = s.typed ? s.correct / s.typed * 100 : 0;
  $('vizOk').style.width = okPct + '%'; $('vizBad').style.width = (s.typed ? 100 - okPct : 0) + '%';
  $('vizOkTxt').textContent = s.correct + ' correct, ' + s.bad + ' incorrect';
  $('vizBest').style.width = (best ? Math.min(100, s.wpm / best * 100) : 0) + '%';
  $('vizBestTxt').textContent = best ? 'This run: ' + s.wpm + ' WPM. Personal best: ' + best + ' WPM.' : 'No personal best yet (practice mode does not count).';
  $('shareMsg').textContent = '';
  $('results').hidden = false; $('results').focus({ preventScroll: true });
  $('results').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  syncUI(); renderHistory();
}

function renderHistory() {
  const h = store.get('history', []), ol = $('historyList');
  ol.textContent = '';
  $('historyEmpty').hidden = h.length > 0;
  $('clearBtn').disabled = !h.length && !store.get('best', 0);
  h.forEach(r => {
    const li = document.createElement('li'), b = document.createElement('strong');
    b.textContent = r.wpm + ' WPM';
    li.append(b, ` at ${r.acc}% accuracy, ${MODES[r.mode] || r.mode}, ${fmt(r.sec)}, ${new Date(r.t).toLocaleDateString()}`);
    ol.append(li);
  });
}

async function copyText(t) {
  try { if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(t); return true; } } catch (e) { /* fall through */ }
  try {
    const ta = document.createElement('textarea'); ta.value = t; ta.style.cssText = 'position:fixed;opacity:0';
    document.body.append(ta); ta.select(); const ok = document.execCommand('copy'); ta.remove(); return ok;
  } catch (e) { return false; }
}

$('shareBtn').addEventListener('click', async () => {
  const s = S.last; if (!s) return;
  const text = `I typed ${s.wpm} WPM with ${s.acc}% accuracy in ${fmt(Math.round(S.elapsed))} (${MODES[S.mode]}) on TypeRush.`;
  const data = { title: 'My TypeRush result', text };
  if (/^https?:/.test(location.protocol)) data.url = location.href;
  if (navigator.share) {
    try { await navigator.share(data); $('shareMsg').textContent = 'Result shared.'; return; }
    catch (e) { if (e.name === 'AbortError') return; }   // user cancelled; otherwise fall back to copy
  }
  $('shareMsg').textContent = (await copyText(text)) ? 'Result copied to clipboard.' : 'Could not copy automatically: ' + text;
});

/* ---------- Controls ---------- */
document.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.mode) S.mode = b.dataset.mode;
  else if (b.dataset.dur) S.dur = +b.dataset.dur;
  else if (b.dataset.diff) S.diff = b.dataset.diff;
  else return;
  syncUI(); reset(true);
});
$('restartBtn').addEventListener('click', () => reset(false));
$('againBtn').addEventListener('click', () => reset(false));
$('newBtn').addEventListener('click', () => reset(true));
$('endBtn').addEventListener('click', () => { if (S.status === 'running') finish(false); });
$('startPractice').addEventListener('click', () => { S.mode = 'practice'; syncUI(); reset(true); $('test').scrollIntoView({ behavior: 'smooth' }); });
$('clearBtn').addEventListener('click', () => {
  if (!confirm('Erase all saved results and your personal best?')) return;
  store.del('history'); store.del('best'); syncUI(); renderHistory();
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') { e.preventDefault(); reset(false); } });   // documented shortcut

/* ---------- Theme and sound ---------- */
function setTheme(t) {
  document.documentElement.dataset.theme = t; store.set('theme', t);
  $('themeBtn').setAttribute('aria-pressed', t === 'dark');
}
$('themeBtn').addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));

function setSound(on) {
  soundOn = on; store.set('sound', on);
  $('soundBtn').setAttribute('aria-pressed', on); $('soundBtn').textContent = 'Sound: ' + (on ? 'on' : 'off');
}
$('soundBtn').addEventListener('click', () => { setSound(!soundOn); input.focus({ preventScroll: true }); });

function beep(ok) {                                     // subtle tick for correct keys, lower tone for mistakes
  if (!soundOn) return;
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    const o = audio.createOscillator(), g = audio.createGain(), t = audio.currentTime;
    o.frequency.value = ok ? 660 : 180; g.gain.setValueAtTime(0.04, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    o.connect(g); g.connect(audio.destination); o.start(t); o.stop(t + 0.06);
  } catch (e) { /* audio unavailable */ }
}

/* ---------- Init ---------- */
setTheme(store.get('theme', 'light'));
setSound(store.get('sound', false) === true);
syncUI(); renderHistory(); reset(true);
})();
