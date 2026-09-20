import * as THREE from 'three';
import './style.css';
import { createEnvironment } from './world/environment.js';
import { createCharacters } from './world/characters.js';
import { AudioSystem } from './systems/audio.js';
import {
  SUSPECTS,
  EVIDENCE,
  TIMELINE,
  CANON,
  createState,
  loadState,
  importState,
  saveState,
  collectEvidence,
  connectEvidence,
  evaluateTheory,
} from './systems/case.js';
import { respond, AIService } from './systems/dialogue.js';

const $ = (s) => document.querySelector(s),
  app = $('#app');
const esc = (s) =>
  String(s ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
let state = loadState() || createState(),
  mode = 'title',
  tab = 'case',
  target = null,
  activeNPC = null,
  selectedClue = null,
  elapsed = 0,
  lastStep = 0,
  toastTimer,
  inspectRenderer,
  inspectScene,
  inspectCamera,
  inspectObject,
  asking = false;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#0b1416');
scene.fog = new THREE.FogExp2('#101919', 0.018);
const camera = new THREE.PerspectiveCamera(65, innerWidth / innerHeight, 0.05, 170);
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
} catch (e) {
  app.innerHTML =
    '<div class="ending"><h2>WebGL is unavailable</h2><p>Enable hardware acceleration in your browser to board The Last Train.</p></div>';
  throw e;
}
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.35;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = false;
$('#world').append(renderer.domElement);
const environment = createEnvironment(scene),
  characters = createCharacters(scene),
  audio = new AudioSystem();
const interactables = [...environment.interactables, ...characters.interactables];
const roomNames = {
  private: 'The Vale compartment',
  dining: 'The dining carriage',
  passenger: 'Passenger compartments',
  observation: 'The observation lounge',
  luggage: 'Luggage & conductor',
};
const rooms = [
  { id: 'luggage', z: -14 },
  { id: 'private', z: 0 },
  { id: 'dining', z: 14 },
  { id: 'passenger', z: 28 },
  { id: 'observation', z: 42 },
];
const player = { x: 0, y: 1.68, z: 5, yaw: 0, pitch: 0 };
const keys = new Set();
let dragging = false,
  pointerX = 0,
  pointerY = 0,
  introStart = 0;
const raycaster = new THREE.Raycaster();
const occlusionRay = new THREE.Raycaster();
let saveWarningShown = false;
const store = () => {
  if (!saveState(state) && !saveWarningShown) {
    saveWarningShown = true;
    toast('Saving is unavailable. Export your case from Settings to keep it.');
  }
};
function currentRoom() {
  return rooms.reduce((a, b) => (Math.abs(a.z - player.z) < Math.abs(b.z - player.z) ? a : b));
}
function portrait(id) {
  const colors = {
    eleanor: ['#b9a389', '#30241e', '#394536'],
    marcus: ['#bda48d', '#332a22', '#3b4140'],
    clara: ['#c3aa90', '#48311f', '#665d48'],
    thomas: ['#b8a28b', '#77756b', '#263a3b'],
  };
  const [skin, hair, coat] = colors[id] || colors.marcus;
  return `<svg viewBox="0 0 160 160" aria-label="Portrait of ${esc(id)}"><path d="M20 165Q25 112 61 107L98 107Q137 114 142 165" fill="${coat}"/><path d="M67 90L64 114 80 135 96 114 93 90" fill="${skin}"/><path d="M51 51Q48 18 80 16Q114 17 112 57L106 85Q98 108 80 109Q62 104 55 84Z" fill="${skin}"/><path d="M51 67Q39 25 64 16Q98 0 116 32L112 68 101 39Q77 49 59 38Z" fill="${hair}"/><path d="M60 66L72 64M89 64L101 66" stroke="#514334" stroke-width="2"/><path d="M78 68L75 83 83 84M69 93Q81 97 92 91" fill="none" stroke="#806953" stroke-width="1.4"/><circle cx="67" cy="68" r="1.8" fill="#252821"/><circle cx="94" cy="68" r="1.8" fill="#252821"/><path d="M61 110L78 139 58 130 47 117M98 110L81 139 105 131 115 117" fill="#cbc4ae"/>${id === 'thomas' ? '<path d="M45 37L48 19Q80 1 113 19L117 37Z" fill="#243331"/><path d="M43 38Q79 52 118 36L108 31 53 31" fill="#18231f"/><rect x="73" y="23" width="17" height="7" fill="#b5a273"/>' : ''}</svg>`;
}
function title() {
  mode = 'title';
  document.body.classList.remove('playing');
  app.innerHTML = `<header class="topbar"><div class="brand"><span class="monogram">LT</span> THE LAST TRAIN</div><div class="top-right"><span class="smallcaps muted">An interactive murder mystery</span><button class="iconbtn" data-action="settings">Settings ↗</button></div></header><main class="hero"><div class="eyebrow">The night has its secrets</div><h1><span>THE LAST</span><span class="last">TRAIN.</span></h1><p>Five passengers. One final journey.<br>Everyone has something to hide.</p><div class="hero-actions"><button class="primary" data-action="begin">${state.started ? 'Continue investigation' : 'Begin investigation'}<span>↗</span></button><button class="textbtn" data-action="help">How to play</button></div></main><aside class="case-stamp"><span class="smallcaps gold">Case file · 001</span><strong>The Vale murder</strong><p>The Montclair Express<br>23:47 · November 14, 1932</p><span class="smallcaps">Unsolved</span></aside><footer class="footer"><span><i class="status-dot"></i> A journey into the unknown</span><span>First-person investigation · Headphones recommended</span><span>London → Edinburgh</span></footer>`;
}
function hud() {
  mode = 'play';
  target = null;
  document.body.classList.add('playing');
  app.innerHTML = `<div class="hud-location"><span class="smallcaps gold">Montclair Express · 23:47</span><h2 id="room-name">${roomNames[currentRoom().id]}</h2></div><div class="hud-actions"><button class="iconbtn" data-action="notebook">Case <span class="key">J</span></button><button class="iconbtn" data-action="settings">Settings</button></div><div class="crosshair"></div><button id="interact" class="interact" hidden></button><div class="hud-bottom"><div class="objective"><span class="smallcaps gold">Current objective</span><br><span id="objective">${objective()}</span></div><div class="controls-hint">WASD move &nbsp; / &nbsp; Drag to look &nbsp; / &nbsp; E interact &nbsp; / &nbsp; J case</div><span id="count">${state.evidence.length} / 8 clues</span></div><div class="mobile-controls"><button data-move="KeyW">↑</button><button data-move="KeyA">←</button><button data-move="KeyS">↓</button><button data-move="KeyD">→</button></div>`;
}
function objective() {
  return state.evidence.length < 3
    ? 'Examine Daniel’s compartment.'
    : state.evidence.length < 7
      ? 'Search the carriages. Question the passengers.'
      : state.contradictions.length < 1
        ? 'Confront an alibi with your evidence.'
        : 'Reconstruct the crime. Make your accusation.';
}
function openPanel(titleText, subtitle, body, extra = '') {
  document.exitPointerLock?.();
  keys.clear();
  app.innerHTML = `<div class="modal-shade"><section class="panel ${extra}" role="dialog" aria-modal="true" aria-label="${esc(titleText)}"><header class="panel-header"><div><span class="smallcaps gold">${subtitle}</span><h2>${titleText}</h2></div><button class="close" data-action="close" aria-label="Close">×</button></header>${body}</section></div>`;
}
function toast(message) {
  $('.toast')?.remove();
  const t = document.createElement('div');
  t.className = 'toast';
  t.setAttribute('role', 'status');
  t.textContent = message;
  app.append(t);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.remove(), 4200);
}
function notebook(which = tab) {
  mode = 'notebook';
  tab = which;
  const names = [
    'case',
    'suspects',
    'evidence',
    'timeline',
    'locations',
    'notes',
    'board',
    'theory',
  ];
  openPanel(
    'The investigation',
    `Case 001 · ${state.evidence.length} pieces of evidence`,
    `<nav class="tabs">${names.map((t) => `<button data-tab="${t}" class="${tab === t ? 'active' : ''}">${t === 'board' ? 'Case board' : t}</button>`).join('')}</nav><div class="panel-body">${notebookBody()}</div>`,
  );
  if (tab === 'board') requestAnimationFrame(drawConnections);
}
function notebookBody() {
  switch (tab) {
    case 'case':
      return `<div class="two-col"><div><p class="section-title">A death on the night express</p><p class="prose">At 23:47, conductor Thomas Bell found industrialist Daniel Vale dead in his private compartment. The train was already moving. No one has left. Four passengers knew him. Each has a reason to lie.</p><p class="prose">Search the train, inspect objects, and question the passengers. A statement is only as reliable as the evidence behind it.</p><button class="textbtn" data-tab="theory">Reconstruct the crime →</button></div><div><p class="section-title">Your next lead</p><p class="prose">${objective()}</p><div class="timeline-row"><span>Evidence</span><span>${state.evidence.length} of 8 discovered</span></div><div class="timeline-row"><span>Contradictions</span><span>${state.contradictions.length} exposed</span></div><div class="timeline-row"><span>Connections</span><span>${state.connections.length} recorded</span></div><p class="hint">Progress saves automatically on this browser. Your case board and notes belong to you.</p></div></div>`;
    case 'suspects':
      return `<div class="grid">${SUSPECTS.map((s) => `<article class="suspect"><div class="portrait">${portrait(s.id)}</div><h3>${esc(s.name)}</h3><span class="tag">${esc(s.role)}</span><p>${esc(s.description || s.personality)}</p><p class="hint">${(state.npc[s.id]?.history?.length || 0) > 0 ? 'Interviewed · ' + (state.npc[s.id]?.emotion || 'guarded') + ' · Trust ' + state.npc[s.id].trust + '/100' : 'Not yet interviewed'}</p>${state.npc[s.id]?.topics?.includes('alibi') ? `<p class="prose"><span class="gold">Statement</span><br>${esc(s.alibi)}</p>` : ''}${state.npc[s.id]?.secrets?.length ? `<p class="prose"><span class="gold">Revealed</span><br>${esc(state.npc[s.id].secrets.map((id) => ({ will: s.secret, embezzlement: s.secret, source: s.secret, witness: s.secret, meeting: 'Marcus admits attending the private meeting at 23:30.' })[id] || id).join(' '))}</p>` : ''}</article>`).join('')}</div>`;
    case 'evidence':
      return state.evidence.length
        ? `<div class="evidence-list">${EVIDENCE.filter((e) => state.evidence.includes(e.id))
            .map(
              (e, i) =>
                `<button class="evidence-row" data-evidence="${e.id}"><span class="evidence-number">0${i + 1}</span><div><h3>${esc(e.name)}</h3><p>${esc(e.location)}</p></div></button>`,
            )
            .join('')}</div>`
        : '<p class="empty">Nothing collected yet. Look for objects marked with a small brass evidence tag. Approach and press E to examine them.</p>';
    case 'timeline': {
      const entries = TIMELINE.filter(
        (t) =>
          (!t.evidenceId && (!t.requires || t.requires.length === 0)) ||
          state.evidence.includes(t.evidenceId) ||
          (Array.isArray(t.requires) ? t.requires : [t.requires]).some((id) =>
            state.evidence.includes(id),
          ),
      );
      return `<p class="hint">Reconstruct the evening using the times printed on your collected evidence. A suspect’s account may be false.</p>${entries.map((t) => `<div class="timeline-row"><time>${esc(t.time)}</time><span>${esc(t.description || t.event || t.text)}</span></div>`).join('')}`;
    }
    case 'locations':
      return `<p class="section-title">The Montclair Express</p><p class="prose">Walk between the connected carriages, or retrace your steps to a location you have already visited.</p><div class="route">${rooms.map((r) => `<button data-travel="${r.id}" ${!state.visited.includes(r.id) ? 'disabled' : ''}>${esc(roomNames[r.id])} ${state.visited.includes(r.id) ? '↗' : '· unexplored'}</button>`).join('')}</div>`;
    case 'notes':
      return `<p class="section-title">Field notes</p><textarea id="notes" placeholder="What doesn’t add up? Record names, times, and questions…">${esc(state.notes)}</textarea><p class="hint">Saved as you write.</p><p class="section-title" style="margin-top:30px">Working hypothesis</p><textarea id="theories" placeholder="Build your theory before making an accusation…">${esc(state.theories)}</textarea>`;
    case 'board':
      return `<p class="hint">Select two evidence cards to connect them. Gold thread marks a connection you made; it does not prove the theory.</p><div class="board"><svg class="lines"></svg>${EVIDENCE.filter(
        (e) => state.evidence.includes(e.id),
      )
        .map(
          (e) =>
            `<button class="clue ${selectedClue === e.id ? 'selected' : ''}" data-clue="${e.id}"><span>${esc(e.location)}</span><h3>${esc(e.name)}</h3><p>${esc(e.description).slice(0, 105)}…</p></button>`,
        )
        .join(
          '',
        )}</div>${!state.evidence.length ? '<p class="empty">Collected evidence will appear here.</p>' : ''}<p class="section-title" style="margin-top:25px">Exposed contradictions</p>${state.contradictions.length ? state.contradictions.map((c) => `<p class="prose">${esc(typeof c === 'string' ? { 'marcus-alibi': 'Marcus claimed he never left dining. The meeting note and route slip contradict his alibi.', 'thomas-key': 'Thomas denied lending the key. He now admits Marcus borrowed it and returned from Vale’s compartment.' }[c] || c : c.description || c.text || c.id)}</p>`).join('') : '<p class="hint">Present evidence during an interview to challenge a statement.</p>'}`;
    case 'theory':
      return `<p class="prose">An accusation needs more than a name. Explain the motive, the method, and the sequence of events. Your collected evidence and exposed contradictions will support your reasoning. Use clear, affirmative sentences; the assessment checks key facts and evidence.</p><form id="theory-form"><label for="accused">Name the murderer</label><select id="accused" name="suspect">${SUSPECTS.map((s) => `<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select><div class="two-col"><div><label for="motive">Why did they kill Daniel?</label><textarea id="motive" name="motive" required minlength="12" placeholder="Explain the motive and its supporting evidence…"></textarea></div><div><label for="method">How was he killed?</label><textarea id="method" name="method" required minlength="12" placeholder="Name the method and the objects that establish it…"></textarea></div></div><label for="timeline-theory">Reconstruct their movements</label><textarea id="timeline-theory" name="timeline" required minlength="20" placeholder="Describe what happened before 23:47. Include times, access, and the false alibi…"></textarea><p class="hint">Submitting closes your theory and reveals the solution. You can return to the investigation afterwards.</p><button class="primary" type="submit" ${state.evidence.length < 4 ? 'disabled' : ''}>Make the accusation <span>→</span></button>${state.evidence.length < 4 ? '<p class="hint">Find at least four pieces of evidence before making an accusation.</p>' : ''}</form>`;
  }
}
function drawConnections() {
  const board = $('.board'),
    svg = $('.lines');
  if (!board || !svg) return;
  const b = board.getBoundingClientRect();
  svg.innerHTML = state.connections
    .map((c) => {
      const a = board.querySelector(`[data-clue="${c.a || c[0] || c.from}"]`),
        d = board.querySelector(`[data-clue="${c.b || c[1] || c.to}"]`);
      if (!a || !d) return '';
      const x = a.getBoundingClientRect(),
        y = d.getBoundingClientRect();
      return `<line x1="${x.x + x.width / 2 - b.x}" y1="${x.y + 8 - b.y}" x2="${y.x + y.width / 2 - b.x}" y2="${y.y + 8 - b.y}" stroke="#c8a45e" stroke-width="2"/>`;
    })
    .join('');
}
function inspect(id) {
  const e = EVIDENCE.find((x) => x.id === id);
  if (!e) return;
  mode = 'inspect';
  openPanel(
    e.name,
    'Evidence examination',
    `<div class="panel-body inspect-layout"><div class="inspect-model" id="inspect-model" aria-label="Rotating 3D evidence model"></div><div class="inspect-copy"><span class="tag">${esc(e.location)}</span><h3>${esc(e.name)}</h3><p class="prose">${esc(e.description)}</p><p class="hint">Drag the object to rotate it.</p>${state.evidence.includes(id) ? `<p class="gold prose">Recorded in your notebook.</p><p class="prose">${esc(e.significance || 'Compare this object with the passengers’ accounts.')}</p>` : `<button class="primary" data-collect="${id}">Record evidence <span>＋</span></button>`}</div></div>`,
  );
  setupInspection(id);
}
function setupInspection(id) {
  cleanupInspection();
  const root = interactables.find((x) => x.userData.id === id && x.userData.type === 'evidence');
  if (!root) return;
  const host = $('#inspect-model');
  inspectScene = new THREE.Scene();
  inspectScene.background = new THREE.Color('#111a15');
  inspectCamera = new THREE.PerspectiveCamera(40, host.clientWidth / host.clientHeight, 0.01, 100);
  inspectRenderer = new THREE.WebGLRenderer({ antialias: true });
  inspectRenderer.setSize(host.clientWidth, host.clientHeight);
  inspectRenderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  inspectRenderer.toneMapping = THREE.ACESFilmicToneMapping;
  host.append(inspectRenderer.domElement);
  inspectScene.add(new THREE.HemisphereLight(0xfff0ce, 0x738779, 3));
  const light = new THREE.DirectionalLight(0xffffff, 3);
  light.position.set(2, 4, 3);
  inspectScene.add(light);
  inspectObject = root.clone(true);
  inspectObject.position.set(0, 0, 0);
  inspectScene.add(inspectObject);
  const bounds = new THREE.Box3().setFromObject(inspectObject),
    center = bounds.getCenter(new THREE.Vector3()),
    size = bounds.getSize(new THREE.Vector3());
  inspectObject.position.sub(center);
  const max = Math.max(size.x, size.y, size.z, 0.1);
  inspectCamera.position.set(max * 0.7, max * 0.7, max * 2.3);
  inspectCamera.lookAt(0, 0, 0);
  let drag = false,
    last = 0;
  host.onpointerdown = (e) => {
    drag = true;
    last = e.clientX;
    host.setPointerCapture(e.pointerId);
  };
  host.onpointermove = (e) => {
    if (drag) {
      inspectObject.rotation.y += (e.clientX - last) * 0.015;
      last = e.clientX;
    }
  };
  host.onpointerup = () => (drag = false);
}
function cleanupInspection() {
  if (inspectRenderer) {
    inspectRenderer.dispose();
    inspectRenderer = null;
  }
  inspectObject = null;
}
function talk(id) {
  activeNPC = id;
  mode = 'dialogue';
  const npc = SUSPECTS.find((s) => s.id === id);
  openPanel(
    npc.name,
    'Passenger interview',
    `<div class="panel-body dialogue-layout"><aside class="dialogue-profile"><div class="portrait">${portrait(id)}</div><p class="tag">${esc(npc.role)}</p><p class="prose">${esc(npc.description || npc.personality)}</p><p class="hint">Conversation engine: ${AIService.getConfig().endpoint ? 'AI-directed, case-grounded' : 'local narrative engine'}.<br>Previous conversations are remembered.</p></aside><div><div id="dialogue-log" class="dialogue-log" aria-live="polite"></div><label for="present">Present evidence</label><select id="present"><option value="">No evidence selected</option>${EVIDENCE.filter(
      (e) => state.evidence.includes(e.id),
    )
      .map((e) => `<option value="${e.id}">${esc(e.name)}</option>`)
      .join(
        '',
      )}</select><form class="ask-form" id="ask-form"><input id="question" aria-label="Your question" placeholder="Ask a question…" autocomplete="off" maxlength="500" required><button type="submit">Ask →</button></form><div class="prompts"><button data-question="Where were you at 11:30?">Your alibi</button><button data-question="What was your relationship with Daniel?">Daniel Vale</button><button data-question="What do you know about this evidence?">Show evidence</button><button data-question="What are you hiding?">Press further</button></div></div></div>`,
  );
  const history = state.npc[id]?.history || [];
  if (history.length) {
    for (const h of history) {
      if (h.question) addSpeech('You', h.question, true);
      if (h.text || h.answer || h.response) addSpeech(npc.name, h.text || h.answer || h.response);
      if (h.role) addSpeech(h.role === 'user' ? 'You' : npc.name, h.content, h.role === 'user');
    }
  } else
    addSpeech(
      npc.name,
      `${id === 'thomas' ? 'Detective… there’s been a death aboard. I found Mr Vale at 11:47. I haven’t let anyone leave.' : id === 'eleanor' ? 'I would appreciate some discretion, Detective. My husband was a complicated man.' : id === 'marcus' ? 'A terrible business. Ask what you need. I’m certain we can clear this up.' : 'I came aboard looking for a story. I didn’t expect this one.'}`,
    );
}
function addSpeech(name, text, player = false) {
  const log = $('#dialogue-log');
  if (!log) return;
  const div = document.createElement('div');
  div.className = 'speech' + (player ? ' player' : '');
  div.innerHTML = `<strong>${esc(name)}</strong>${esc(text)}`;
  log.append(div);
  log.scrollTop = log.scrollHeight;
}
async function ask(q) {
  if (asking || !q.trim()) return;
  asking = true;
  const id = activeNPC;
  addSpeech('You', q, true);
  $('#question').value = '';
  $('#ask-form button').disabled = true;
  try {
    const before = state.contradictions.length;
    const answer = await respond(state, id, q, $('#present').value || undefined);
    if (mode === 'dialogue' && activeNPC === id) {
      addSpeech(SUSPECTS.find((s) => s.id === id).name, answer.text);
      characters.setEmotion?.(id, answer.emotion || 'talking');
      if (state.contradictions.length > before) {
        audio.cue('discovery');
        toast('Contradiction exposed · added to case board');
      }
    }
    store();
  } catch (e) {
    addSpeech('Interview paused', 'The response could not be completed. Please try again.');
    console.error(e);
  } finally {
    asking = false;
    const b = $('#ask-form button');
    if (b) b.disabled = false;
  }
}
function settings() {
  const previous = mode;
  mode = 'settings';
  openPanel(
    'Preferences',
    'The last train',
    `<div class="panel-body"><div class="setting-row"><label for="quality">Rendering quality</label><select id="quality"><option value="1">Low · best for Raspberry Pi</option><option value="1.5" selected>Balanced</option><option value="2">High</option></select></div><div class="setting-row"><label for="volume">Sound volume</label><input id="volume" type="range" min="0" max="1" step="0.05" value="0.4"></div><button class="textbtn" data-action="mute">Toggle sound</button><p class="hint">The game runs entirely in your browser. Case-grounded dialogue works offline after loading. No account or API key is required.</p><details><summary class="textbtn">Optional AI direction</summary><p class="hint">Connect an OpenAI-compatible chat completions endpoint. Only your question and approved lines are sent. The model selects a delivery; case facts stay locked. Your API key stays in memory. Use a local endpoint or a restricted development key.</p><form id="ai-form"><label for="ai-endpoint">Chat completions URL</label><input id="ai-endpoint" name="endpoint" type="url" placeholder="http://localhost:11434/v1/chat/completions" value="${esc(AIService.getConfig().endpoint || '')}"><label for="ai-model">Model</label><input id="ai-model" name="model" placeholder="Model name" value="${esc(AIService.getConfig().model || '')}"><label for="ai-key">API key, if required</label><input id="ai-key" name="key" type="password" autocomplete="off"><p class="hint">Unreachable services fall back to the local narrative engine.</p><button class="textbtn" type="submit">Save AI configuration</button></form></details><p class="section-title" style="margin-top:24px">Save file</p><div class="route"><button data-action="export">Export case</button><button data-action="import">Import case</button><button data-action="restart">Start a new case</button></div><p class="hint">A new case replaces this browser’s saved investigation. Export it first if you want to keep it.</p><input id="import-file" type="file" accept="application/json" hidden></div>`,
    'settings',
  );
  app.dataset.previous = previous;
}
function help() {
  const previous = mode;
  mode = 'help';
  openPanel(
    'Boarding instructions',
    'How to play',
    `<div class="panel-body"><div class="help-keys"><span class="gold">W A S D</span><span>Walk through the connected train carriages.</span><span class="gold">Drag / arrows</span><span>Look around. Double-click the scene for mouse-look.</span><span class="gold">E / click</span><span>Examine an object or speak to a passenger.</span><span class="gold">J / Tab</span><span>Open your notebook, board, and theory.</span><span class="gold">Esc</span><span>Release mouse-look or close a panel.</span></div><p class="prose">Follow the brass evidence markers. Inspect objects and record them, then show evidence to passengers. Type your own questions to test their alibis. Connect clues in your case board and submit a reasoned accusation.</p><p class="hint">On touch devices, use the arrow controls to walk, drag the scene to look, and tap the interaction prompt. Audio begins with your first interaction.</p><button class="primary" data-action="close">Understood <span>→</span></button></div>`,
    'settings',
  );
  app.dataset.previous = previous;
}
function begin() {
  audio.start();
  audio.setVolume(0.4);
  document.body.classList.add('playing');
  if (state.started) {
    Object.assign(player, state.player || {});
    hud();
    return;
  }
  state.started = true;
  store();
  mode = 'intro';
  introStart = elapsed;
  app.innerHTML =
    '<div class="cinema"><div class="subtitle"><span class="smallcaps gold">Blackthorn Station · 23:49</span><br>“Detective… there’s been a death aboard.”</div><button class="skip" data-action="skip">Skip introduction →</button></div>';
  audio.cue('door');
}
function endIntro() {
  player.x = 0;
  player.z = 4.5;
  player.yaw = 0;
  player.pitch = -0.05;
  state.visited.push('private');
  store();
  hud();
  toast('Examine the compartment. Approach a marked object and press E.');
}
function ending(theory) {
  const result = evaluateTheory(state, theory);
  state.lastTheory = { theory, result };
  store();
  mode = 'ending';
  audio.cue('confrontation');
  openPanel(
    'The last confession',
    'The accusation',
    `<div class="ending"><span class="tag">Your reconstruction · ${result.score ?? 0}%</span><h2>${esc(result.title || 'A case is more than a name.')}</h2><p>${result.solved ? 'Your reconstruction accounts for means, motive, and opportunity.' : 'Your theory needs stronger support. Review the assessment below.'}</p><div>${(result.checks || []).map((c) => `<p class="hint">${c.passed ? 'Established' : 'Not established'} · ${esc(c.label)}</p>`).join('')}</div><p>Marcus Reed stole company money. Daniel discovered the transfers and intended to expose him. At 23:30, Marcus entered the private compartment and poisoned Daniel’s whisky. Daniel died at 23:42; Thomas found him at 23:47.</p><p>The financial ledger establishes the motive. The glass establishes the method. The stopped watch narrows the time of death. The service ticket breaks Marcus’s dining-car alibi, and Thomas’s testimony puts him at the private compartment.</p><p>Eleanor concealed the threatened change to Daniel’s will. Clara hid her investigation into his business. Their secrets gave them motives, but neither explains the poisoned drink and Marcus’s movements. The photograph independently supports Eleanor and Clara’s alibis. The unsigned will is the red herring: motive without opportunity. Thomas lied to conceal lending Marcus the key.</p><p class="gold">Outside, the darkness gives way to the first grey light.<br>The Montclair Express carries one fewer secret.</p><button class="primary" data-action="resume">Return to the case <span>→</span></button></div>`,
  );
}
function close() {
  cleanupInspection();
  if ((mode === 'settings' || mode === 'help') && app.dataset.previous === 'title') {
    title();
    return;
  }
  hud();
}
app.addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  audio.start();
  if (b.dataset.tab) {
    notebook(b.dataset.tab);
    return;
  }
  if (b.dataset.evidence) {
    inspect(b.dataset.evidence);
    return;
  }
  if (b.dataset.collect) {
    const id = b.dataset.collect;
    collectEvidence(state, id);
    store();
    audio.cue('discovery');
    inspect(id);
    toast('Evidence recorded · ' + EVIDENCE.find((x) => x.id === id).name);
    return;
  }
  if (b.dataset.question) {
    ask(b.dataset.question);
    return;
  }
  if (b.dataset.clue) {
    if (selectedClue && selectedClue !== b.dataset.clue) {
      connectEvidence(state, selectedClue, b.dataset.clue);
      selectedClue = null;
      store();
    } else selectedClue = b.dataset.clue;
    notebook('board');
    return;
  }
  if (b.dataset.travel) {
    const r = rooms.find((r) => r.id === b.dataset.travel);
    player.x = 0;
    player.z = r.z + 3;
    player.yaw = 0;
    hud();
    return;
  }
  switch (b.dataset.action) {
    case 'begin':
      begin();
      break;
    case 'close':
      close();
      break;
    case 'notebook':
      notebook();
      break;
    case 'settings':
      settings();
      break;
    case 'help':
      help();
      break;
    case 'skip':
      endIntro();
      break;
    case 'mute':
      audio.toggle();
      toast(audio.muted ? 'Sound muted' : 'Sound on');
      break;
    case 'resume':
      hud();
      break;
    case 'restart':
      if (confirm('Start a new case? Your current local progress will be replaced.')) {
        state = createState();
        selectedClue = null;
        Object.assign(player, { x: 0, y: 1.68, z: 4.5, yaw: 0, pitch: 0 });
        store();
        title();
      }
      break;
    case 'export': {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(
        new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }),
      );
      a.download = 'the-last-train-case.json';
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      break;
    }
    case 'import':
      $('#import-file').click();
      break;
  }
  if (b.id === 'interact') interact();
});
app.addEventListener('submit', (e) => {
  e.preventDefault();
  if (e.target.id === 'ai-form') {
    AIService.configure(Object.fromEntries(new FormData(e.target)));
    toast('AI direction configured. Local fallback remains available.');
  }
  if (e.target.id === 'ask-form') ask($('#question').value);
  if (e.target.id === 'theory-form') ending(Object.fromEntries(new FormData(e.target)));
});
app.addEventListener('input', (e) => {
  if (['notes', 'theories'].includes(e.target.id)) {
    state[e.target.id] = e.target.value;
    store();
  }
  if (e.target.id === 'volume') audio.setVolume(+e.target.value);
});
app.addEventListener('change', async (e) => {
  if (e.target.id === 'quality')
    renderer.setPixelRatio(Math.min(devicePixelRatio, +e.target.value));
  if (e.target.id === 'import-file') {
    try {
      const value = JSON.parse(await e.target.files[0].text());
      if (
        value.version !== 1 ||
        !Array.isArray(value.evidence) ||
        !value.npc ||
        !Array.isArray(value.connections) ||
        !Array.isArray(value.visited) ||
        !Array.isArray(value.contradictions)
      )
        throw Error('invalid');
      if (value.evidence.some((id) => !EVIDENCE.some((e) => e.id === id)))
        throw Error('unknown evidence');
      state = importState(value);
      Object.assign(player, state.player || { x: 0, y: 1.68, z: 4.5, yaw: 0, pitch: 0 });
      store();
      toast('Case imported.');
    } catch {
      toast('This file is not a valid case save.');
    }
  }
});
function interact() {
  if (mode !== 'play' || !target) return;
  if (target.userData.type === 'evidence') inspect(target.userData.id);
  else if (target.userData.type === 'npc') talk(target.userData.id);
}
window.addEventListener('keydown', (e) => {
  if (e.code === 'Escape' && mode !== 'title' && mode !== 'intro') {
    close();
    return;
  }
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
  if (
    mode === 'play' &&
    ['Tab', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)
  )
    e.preventDefault();
  if (e.code === 'KeyJ' || (e.code === 'Tab' && mode === 'play')) {
    mode === 'play' ? notebook() : mode === 'notebook' ? close() : null;
    return;
  }
  if (e.code === 'KeyE') {
    interact();
    return;
  }
  if (mode === 'play') keys.add(e.code);
});
window.addEventListener('keyup', (e) => keys.delete(e.code));
window.addEventListener('blur', () => {
  keys.clear();
  dragging = false;
});
renderer.domElement.addEventListener('pointerdown', (e) => {
  if (mode !== 'play') return;
  dragging = true;
  pointerX = e.clientX;
  pointerY = e.clientY;
  renderer.domElement.setPointerCapture(e.pointerId);
});
window.addEventListener('pointermove', (e) => {
  if (mode !== 'play') return;
  if (document.pointerLockElement === renderer.domElement) {
    player.yaw -= e.movementX * 0.0025;
    player.pitch -= e.movementY * 0.0025;
  } else if (dragging) {
    player.yaw -= (e.clientX - pointerX) * 0.004;
    player.pitch -= (e.clientY - pointerY) * 0.004;
    pointerX = e.clientX;
    pointerY = e.clientY;
  }
  player.pitch = THREE.MathUtils.clamp(player.pitch, -1.2, 1.2);
});
window.addEventListener('pointerup', () => (dragging = false));
renderer.domElement.addEventListener('dblclick', () => {
  if (mode === 'play') renderer.domElement.requestPointerLock?.();
});
app.addEventListener('pointerdown', (e) => {
  const b = e.target.closest('[data-move]');
  if (b) {
    keys.add(b.dataset.move);
    b.setPointerCapture(e.pointerId);
  }
});
app.addEventListener('pointerup', (e) => {
  const b = e.target.closest('[data-move]');
  if (b) keys.delete(b.dataset.move);
});
app.addEventListener('pointercancel', () => keys.clear());
function canMove(x, z) {
  if (Math.abs(x) > 2.55 || z < -20 || z > 48) return false;
  const p = new THREE.Box3(
    new THREE.Vector3(x - 0.2, 0.15, z - 0.2),
    new THREE.Vector3(x + 0.2, 1.55, z + 0.2),
  );
  return (
    !(environment.colliders || []).some((c) => p.intersectsBox(c)) &&
    !characters.interactables.some((c) => Math.hypot(c.position.x - x, c.position.z - z) < 0.43)
  );
}
function updatePlayer(dt) {
  if (keys.has('ArrowLeft')) player.yaw += dt * 1.4;
  if (keys.has('ArrowRight')) player.yaw -= dt * 1.4;
  if (keys.has('ArrowUp')) player.pitch = Math.min(1.2, player.pitch + dt);
  if (keys.has('ArrowDown')) player.pitch = Math.max(-1.2, player.pitch - dt);
  let dx = (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0),
    dz = (keys.has('KeyS') ? 1 : 0) - (keys.has('KeyW') ? 1 : 0);
  const length = Math.hypot(dx, dz) || 1;
  dx /= length;
  dz /= length;
  const speed = keys.has('ShiftLeft') ? 3.6 : 2.4,
    nx = player.x + (dx * Math.cos(player.yaw) + dz * Math.sin(player.yaw)) * speed * dt,
    nz = player.z + (-dx * Math.sin(player.yaw) + dz * Math.cos(player.yaw)) * speed * dt;
  if (canMove(nx, player.z)) player.x = nx;
  if (canMove(player.x, nz)) player.z = nz;
  if ((dx || dz) && elapsed - lastStep > 0.48) {
    audio.cue('footstep');
    lastStep = elapsed;
  }
  camera.position.set(
    player.x,
    player.y + (dx || dz ? Math.sin(elapsed * 10) * 0.018 : 0),
    player.z,
  );
  camera.rotation.set(player.pitch, player.yaw, 0, 'YXZ');
  const r = currentRoom();
  if (!state.visited.includes(r.id)) {
    state.visited.push(r.id);
    state.player = { ...player };
    store();
    audio.cue('door');
  }
  if ($('#room-name')) $('#room-name').textContent = roomNames[r.id];
  if (elapsed - lastTargetCheck > 0.12) {
    findTarget();
    lastTargetCheck = elapsed;
  }
}
function findTarget() {
  camera.updateMatrixWorld();
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  const hits = raycaster.intersectObjects(interactables, true);
  target = null;
  for (const h of hits) {
    if (h.distance > 3.8) break;
    let o = h.object;
    while (o && !o.userData.type) o = o.parent;
    if (o && ['npc', 'evidence'].includes(o.userData.type)) {
      target = o;
      break;
    }
  } // A slight cone makes small physical clues accessible without pixel hunting.
  if (!target) {
    let best = 0.91;
    for (const o of interactables) {
      const p = new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3()),
        v = p.sub(camera.position),
        distance = v.length();
      if (distance > 2.6) continue;
      const dot = v.normalize().dot(camera.getWorldDirection(new THREE.Vector3()));
      if (dot > best) {
        target = o;
        best = dot;
      }
    }
  }
  if (target) {
    const center = new THREE.Box3().setFromObject(target).getCenter(new THREE.Vector3());
    const distance = center.distanceTo(camera.position);
    occlusionRay.set(camera.position, center.sub(camera.position).normalize());
    occlusionRay.far = distance - 0.12;
    const blocked = occlusionRay.intersectObjects(scene.children, true).some((hit) => {
      let o = hit.object;
      while (o) {
        if (o === target || o.userData.type) return false;
        o = o.parent;
      }
      return hit.object.isMesh && !hit.object.material?.transparent;
    });
    if (blocked) target = null;
  }
  const b = $('#interact');
  if (b) {
    b.hidden = !target;
    if (target) {
      const data = target.userData,
        item = (data.type === 'npc' ? SUSPECTS : EVIDENCE).find((x) => x.id === data.id);
      b.innerHTML = `<span class="key">E</span>${data.type === 'npc' ? 'Speak to' : 'Examine'} ${esc(item?.name || data.id)}`;
    }
  }
}
const clock = new THREE.Clock();
let lastSave = 0,
  lastCinematic = -60,
  lastTargetCheck = 0;
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.05);
  elapsed += dt;
  environment.update?.(elapsed, dt);
  characters.update?.(elapsed, dt);
  audio.update?.(dt);
  if (
    mode === 'title' ||
    ((mode === 'settings' || mode === 'help') && app.dataset.previous === 'title')
  ) {
    camera.position.set(0.55, 1.65, 5.5);
    camera.lookAt(-1.3, 1.2, -3.5);
    camera.rotateY(Math.sin(elapsed * 0.12) * 0.025);
  } else if (mode === 'intro') {
    const t = elapsed - introStart;
    if (t < 4) {
      camera.position.set(-9 + t * 0.6, 2, 5 - t);
      camera.lookAt(0, 1.7, 0);
    } else {
      camera.position.set(0, 1.68, 6 - (t - 4) * 0.28);
      camera.lookAt(-1.6, 1.1, 0);
      if ($('.subtitle'))
        $('.subtitle').innerHTML =
          '<span class="smallcaps gold">The Vale compartment</span><br>Four passengers. Eight clues. One version of the truth.';
    }
    if (t > 9) endIntro();
  } else if (mode === 'play') {
    updatePlayer(dt);
    if (elapsed - lastSave > 8) {
      state.player = { ...player };
      store();
      lastSave = elapsed;
    }
    if (elapsed - lastCinematic > 95 && elapsed > 45) {
      lastCinematic = elapsed;
      toast('Blackthorn Tunnel · the carriage lights flicker.');
      audio.cue('thunder');
    }
    if (elapsed - lastCinematic < 3) renderer.toneMappingExposure = 0.65 + Math.random() * 0.12;
    else renderer.toneMappingExposure = 1.35;
  }
  renderer.render(scene, camera);
  if (inspectRenderer && inspectObject) {
    inspectObject.rotation.y += dt * 0.18;
    inspectRenderer.render(inspectScene, inspectCamera);
  }
}
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  if (mode === 'notebook' && tab === 'board') drawConnections();
});
window.addEventListener('beforeunload', () => {
  if (state.started) {
    state.player = { ...player };
    store();
  }
});
// Read-only inspection surface for automated smoke tests and local diagnostics.
window.__LAST_TRAIN__ = {
  get state() {
    return state;
  },
  get mode() {
    return mode;
  },
  get position() {
    return { ...player };
  },
  get renderStats() {
    return renderer.info.render;
  },
};
title();
frame();
