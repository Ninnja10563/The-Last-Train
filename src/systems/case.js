// Canon is immutable. Player discoveries never rewrite the crime.
const freeze = (object) => {
  Object.freeze(object);
  Object.values(object).forEach((v) => {
    if (v && typeof v === 'object' && !Object.isFrozen(v)) freeze(v);
  });
  return object;
};
export const SUSPECTS = freeze([
  {
    id: 'eleanor',
    name: 'Eleanor Vale',
    role: 'The wife',
    personality: 'Elegant, controlled, guarded',
    description: 'A composed passenger traveling with her husband of twenty years.',
    secret: 'Daniel intended to disinherit her.',
    alibi: 'Observation carriage from 23:20 until 23:45; Clara saw her there.',
    relationship: 'Daniel’s estranged wife',
    motive: 'Inheritance',
    color: '#a8767f',
  },
  {
    id: 'marcus',
    name: 'Marcus Reed',
    role: 'The business partner',
    personality: 'Charming, confident, increasingly defensive',
    description: 'Daniel’s long-standing business partner, accustomed to first-class travel.',
    secret: 'He diverted £84,000 into the Ashford account.',
    alibi: 'Claims he never left the dining carriage between 23:15 and 23:45.',
    relationship: 'Daniel’s business partner',
    motive: 'Exposure of embezzlement',
    color: '#c5a874',
  },
  {
    id: 'clara',
    name: 'Clara Shaw',
    role: 'The journalist',
    personality: 'Intelligent, persistent, protective of her source',
    description: 'She boarded with a camera and a story worth hiding.',
    secret: 'Daniel was her source for a report on company fraud.',
    alibi: 'Observation carriage 23:20–23:45; independently corroborates Eleanor.',
    relationship: 'Journalist investigating Daniel’s company',
    motive: 'Initially appears to want revenge for a suppressed story',
    color: '#81a3a5',
  },
  {
    id: 'thomas',
    name: 'Thomas Bell',
    role: 'The conductor',
    personality: 'Quiet, observant, afraid of losing his position',
    description: 'Every door aboard the train opens for him. Every secret has a cost.',
    secret: 'He lent Marcus the service key, then saw him leave Daniel’s carriage.',
    alibi: 'Checked passenger tickets at 23:28 and was in the conductor office at 23:42.',
    relationship: 'Long-serving employee whom Marcus threatened',
    motive: 'Apparently concealed a breach of duty',
    color: '#a8adb6',
  },
]);
export const EVIDENCE = freeze([
  {
    id: 'watch',
    name: 'Daniel’s pocket watch',
    location: 'private',
    description:
      'The glass is fractured. The hands stopped at 11:42. Its chain is caught beneath Daniel’s chair.',
    significance: 'Daniel collapsed at 23:42; the broken watch marks his fall, not the poisoning.',
    relatedSuspects: ['marcus'],
    time: '23:42',
    discoveryConditions: 'Examine beside Daniel’s chair.',
  },
  {
    id: 'glass',
    name: 'The whisky glass',
    location: 'private',
    description:
      'One glass bears a dark medicinal residue below the whisky line. A folded label beneath the tray reads “Vale cardiac drops — oral preparation”. The bottle of whisky is clean.',
    significance:
      'An overdose of Daniel’s cardiac medicine was put into his individual whisky glass before he drank. The residue implicates poisoning, not a wound.',
    relatedSuspects: ['marcus'],
    time: '23:30',
    discoveryConditions: 'Examine the private carriage table.',
  },
  {
    id: 'letter',
    name: 'An unsigned will',
    location: 'private',
    description:
      '“Eleanor: tomorrow my solicitor will alter the settlement.” A draft is unsigned, dated the following morning.',
    significance:
      'Eleanor had an apparent motive, but the will had not changed. Clara corroborates her absence from the crime scene.',
    relatedSuspects: ['eleanor'],
    time: '22:50',
    discoveryConditions: 'Examine Daniel’s desk.',
  },
  {
    id: 'ledger',
    name: 'The Ashford ledger',
    location: 'luggage',
    description:
      'Daniel’s annotated accounts show £84,000 diverted into Ashford Holdings. The authorization initials are M.R. A margin note: “Reed — repayment or police at dawn.”',
    significance:
      'Marcus was embezzling company money. Daniel planned to expose him in the morning.',
    relatedSuspects: ['marcus'],
    time: '23:05',
    discoveryConditions: 'Examine the luggage writing case.',
  },
  {
    id: 'ticket',
    name: 'The conductor’s route slip',
    location: 'dining',
    description:
      'Thomas’s service log: “23:28 Reed, north vestibule, requested service key. 23:32 Reed returning from Vale.” The ink is fresh.',
    significance:
      'Contradicts Marcus’s claim that he remained in the dining carriage. Thomas can explain the record.',
    relatedSuspects: ['marcus', 'thomas'],
    time: '23:28–23:32',
    discoveryConditions: 'Examine the dining sideboard.',
  },
  {
    id: 'photograph',
    name: 'A journalist’s photograph',
    location: 'observation',
    description:
      'A time-stamped photograph shows Eleanor and Clara reflected in the observation window at 23:31. A handwritten caption reads “My source is Vale, not his enemy.”',
    significance:
      'Corroborates Eleanor and Clara’s presence away from Daniel at the poisoning time. Clara was protecting a source.',
    relatedSuspects: ['eleanor', 'clara'],
    time: '23:31',
    discoveryConditions: 'Examine the observation table.',
  },
  {
    id: 'key',
    name: 'The brass service key',
    location: 'luggage',
    description:
      'A service key lies inside a folded dining napkin marked M.R. Its tag reads PRIVATE / SERVICE. There is no sign of forced entry to Daniel’s carriage.',
    significance:
      'Marcus borrowed this key from Thomas. Showing it to Thomas encourages him to admit what he witnessed.',
    relatedSuspects: ['marcus', 'thomas'],
    time: '23:28',
    discoveryConditions: 'Examine the luggage shelf.',
  },
  {
    id: 'note',
    name: 'A meeting note',
    location: 'passenger',
    description:
      'In Daniel’s hand: “Reed. My compartment. 11:30. Bring the Ashford accounts. This ends tonight.”',
    significance:
      'Daniel arranged a private meeting with Marcus at 23:30, despite Marcus claiming to stay in dining.',
    relatedSuspects: ['marcus'],
    time: '23:30',
    discoveryConditions: 'Examine the passenger writing table.',
  },
]);
export const TIMELINE = freeze([
  { time: '22:50', text: 'Daniel drafts a change to his will.', requires: ['letter'] },
  {
    time: '23:05',
    text: 'Daniel annotates the missing £84,000 and threatens police action.',
    requires: ['ledger'],
  },
  {
    time: '23:28',
    text: 'Marcus borrows the service key from Thomas.',
    requires: ['ticket', 'key'],
    any: true,
  },
  {
    time: '23:30',
    text: 'Daniel has scheduled Marcus in his private carriage.',
    requires: ['note'],
  },
  {
    time: '23:31',
    text: 'Clara’s photograph places her with Eleanor in observation.',
    requires: ['photograph'],
  },
  {
    time: '23:32',
    text: 'Thomas records Marcus returning from Daniel’s carriage.',
    requires: ['ticket'],
  },
  { time: '23:42', text: 'Daniel collapses. His pocket watch stops.', requires: ['watch'] },
  {
    time: '23:47',
    text: 'Thomas discovers Daniel’s body and summons the detective.',
    requires: [],
  },
]);
export const CANON = freeze({
  murderer: 'marcus',
  victim: 'Daniel Vale',
  motive: 'Conceal £84,000 embezzlement before Daniel reports him to police.',
  method: 'An overdose of Daniel’s cardiac drops in his individual whisky glass.',
  poisonedAt: '23:30',
  deathAt: '23:42',
  foundAt: '23:47',
  timeline: TIMELINE,
  locations: ['station', 'private', 'dining', 'observation', 'passenger', 'luggage', 'conductor'],
  suspectPositions: {
    eleanor: 'passenger',
    marcus: 'dining',
    clara: 'observation',
    thomas: 'luggage',
  },
  suspectPositionsAt:
    'Current positions during the investigation, after discovery of the body; earlier whereabouts are documented in the timeline and alibis.',
  lies: {
    marcus: 'I stayed in dining from 23:15 to 23:45.',
    thomas: 'Nobody used the service key.',
  },
  witnesses: {
    thomas: 'Saw Marcus leave Daniel’s carriage at 23:32.',
    clara: 'Was with Eleanor at 23:31.',
  },
  contradictions: { 'marcus-alibi': ['ticket', 'note'], 'thomas-key': ['key', 'ticket'] },
  redHerrings: ['letter'],
  relationships: SUSPECTS.map((s) => ({ id: s.id, relationship: s.relationship })),
  secrets: SUSPECTS.map((s) => ({ id: s.id, secret: s.secret })),
  ending:
    'At 23:28, Marcus borrowed the service key from Thomas. At 23:30 he met Daniel over the missing £84,000. Faced with police at dawn, he slipped an overdose of Daniel’s own cardiac drops into a single whisky glass. Thomas saw him return at 23:32. Daniel collapsed at 23:42, breaking his watch, and was found at 23:47. Marcus lied about remaining in dining; Thomas concealed lending the key out of fear. Eleanor’s will was a motive without opportunity. Clara was protecting Daniel, her source.',
});
export const SAVE_KEY = 'the-last-train.case.v1';
export function createState() {
  return {
    version: 1,
    started: false,
    evidence: [],
    visited: [],
    notes: '',
    theories: '',
    connections: [],
    contradictions: [],
    npc: Object.fromEntries(
      SUSPECTS.map((s) => [
        s.id,
        { trust: 40, history: [], shown: [], topics: [], secrets: [], emotion: 'guarded' },
      ]),
    ),
    ending: null,
    playTime: 0,
  };
}
const ids = new Set(EVIDENCE.map((e) => e.id));
const EMOTIONS = new Set(['guarded', 'defensive', 'nervous', 'relieved', 'hurt', 'cooperative']);
const CHECK_LABELS = [
  'Correct suspect',
  'Motive explains concealment of fraud',
  'Method identifies poison in a single drink',
  'Timeline distinguishes 23:30 poisoning from 23:42 collapse',
  'Collected evidence supports means, motive and opportunity',
];
const clamp = (value, min, max, fallback) =>
  Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
const strings = (value, limit = 100) =>
  (Array.isArray(value) ? value : [])
    .filter((x) => typeof x === 'string')
    .map((x) => x.slice(0, 200))
    .slice(-limit);
/** Validate untrusted imported JSON using exactly the same rules as local saves. */
export function importState(raw) {
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw);
    } catch {
      return createState();
    }
  }
  if (!raw || typeof raw !== 'object' || raw.version !== 1) return createState();
  const s = createState();
  s.started = raw.started === true;
  s.evidence = [...new Set(strings(raw.evidence).filter((id) => ids.has(id)))];
  s.visited = [...new Set(strings(raw.visited, 30).filter((id) => CANON.locations.includes(id)))];
  for (const key of ['notes', 'theories'])
    s[key] = typeof raw[key] === 'string' ? raw[key].slice(0, 12000) : '';
  for (const pair of Array.isArray(raw.connections) ? raw.connections : []) {
    if (
      Array.isArray(pair) &&
      pair.length === 2 &&
      pair.every((id) => s.evidence.includes(id)) &&
      pair[0] !== pair[1] &&
      !s.connections.some((p) => p.includes(pair[0]) && p.includes(pair[1]))
    )
      s.connections.push([...pair]);
  }
  s.contradictions = [
    ...new Set(strings(raw.contradictions).filter((x) => Object.hasOwn(CANON.contradictions, x))),
  ];
  for (const person of SUSPECTS) {
    const n = raw.npc?.[person.id];
    if (!n || typeof n !== 'object') continue;
    const dest = s.npc[person.id];
    dest.trust = clamp(n.trust, 0, 100, 40);
    for (const field of ['shown', 'topics', 'secrets']) dest[field] = strings(n[field]);
    dest.shown = dest.shown.filter((id) => s.evidence.includes(id));
    dest.emotion = EMOTIONS.has(n.emotion) ? n.emotion : 'guarded';
    dest.history = (Array.isArray(n.history) ? n.history : [])
      .filter((x) => x && typeof x.question === 'string' && typeof x.text === 'string')
      .slice(-60)
      .map((x) => ({
        question: x.question.slice(0, 1000),
        text: x.text.slice(0, 2500),
        topic: typeof x.topic === 'string' ? x.topic.slice(0, 200) : 'general',
        evidence: s.evidence.includes(x.evidence) ? x.evidence : null,
      }));
  }
  s.playTime = clamp(raw.playTime, 0, 31536000, 0);
  if (raw.player && typeof raw.player === 'object')
    s.player = {
      x: clamp(raw.player.x, -2.55, 2.55, 0),
      y: clamp(raw.player.y, 1.5, 1.8, 1.68),
      z: clamp(raw.player.z, -20, 48, 5),
      yaw: clamp(raw.player.yaw, -Math.PI * 2, Math.PI * 2, 0),
      pitch: clamp(raw.player.pitch, -1.2, 1.2, 0),
    };
  const end = raw.ending;
  if (
    end &&
    Array.isArray(end.checks) &&
    end.checks.length === 5 &&
    end.checks.every((c, i) => c && c.label === CHECK_LABELS[i] && typeof c.passed === 'boolean')
  ) {
    const checks = end.checks.map((c) => ({ label: c.label, passed: c.passed })),
      score = checks.filter((c) => c.passed).length * 20;
    if (end.score === score && end.correct === checks[0].passed && end.solved === (score === 100))
      s.ending = {
        score,
        correct: end.correct,
        solved: score === 100,
        checks,
        missing: checks.filter((c) => !c.passed).map((c) => c.label),
        title:
          score === 100
            ? 'The truth, at last'
            : end.correct
              ? 'The right suspect. An incomplete case.'
              : 'A verdict the evidence cannot support.',
        summary: CANON.ending,
        explanation: CANON.ending,
      };
  }
  return s;
}
export function loadState(storage = globalThis.localStorage) {
  try {
    return importState(storage?.getItem(SAVE_KEY) || null);
  } catch {
    return createState();
  }
}
export function saveState(state, storage = globalThis.localStorage) {
  try {
    storage?.setItem(SAVE_KEY, JSON.stringify(state));
    return !!storage;
  } catch {
    return false;
  }
}
export function collectEvidence(state, id) {
  if (!ids.has(id) || state.evidence.includes(id)) return false;
  state.evidence.push(id);
  saveState(state);
  return EVIDENCE.find((e) => e.id === id);
}
export function connectEvidence(state, a, b) {
  if (a === b || ![a, b].every((id) => state.evidence.includes(id))) return false;
  if (state.connections.some((pair) => pair.includes(a) && pair.includes(b))) return false;
  state.connections.push([a, b]);
  saveState(state);
  return true;
}
// Deliberately conservative, deterministic English heuristic, not semantic proof.
// Score only affirmative clauses; contrast clauses let players rule out a weapon
// ("not a knife, but poison in whisky") without treating that denial as evidence.
// Unusual phrasing may need restating in short, direct affirmative sentences.
function affirmativeClauses(value) {
  return String(value || '')
    .replace(/[’‘]/g, "'")
    .split(/(?:[.;!?](?=\s|$)|,(?!\d)|\bbut\b|\bhowever\b|\binstead\b)/i)
    .filter(
      (clause) =>
        !/\b(?:not(?!\s+only\b)|no|never|neither|nor|without|nothing|cannot|can't|won't|[a-z]+n't|deny|denies|denied|false|untrue)\b/i.test(
          clause,
        ),
    )
    .join(' ');
}
export function evaluateTheory(
  state,
  { suspect = '', motive = '', method = '', timeline = '' } = {},
) {
  motive = affirmativeClauses(motive);
  method = affirmativeClauses(method);
  timeline = affirmativeClauses(timeline);
  const motiveOK =
    /embezz|fraud|stole|stolen|steal|divert|missing.{0,20}money|84[,.]?000|ashford|financial|company.{0,20}money/i.test(
      motive,
    ) &&
    /expos|police|conceal|hid|cover|report|silenc|protect|avoid|prevent|discov|caught/i.test(
      motive,
    );
  const methodOK =
    /poison|overdose|cardiac|medicine|drops|medication/i.test(method) &&
    /whisk[ey]*|drink|glass/i.test(method);
  const opportunity =
    /23[:.]30|11[:.]30|eleven.thirty/i.test(timeline) &&
    /23[:.]42|11[:.]42|eleven.forty.two/i.test(timeline) &&
    /key|meeting|private|compartment|carriage/i.test(timeline);
  const physical =
    ['glass', 'ledger'].every((id) => state.evidence.includes(id)) &&
    ['ticket', 'key', 'note'].some((id) => state.evidence.includes(id));
  const checks = [
    { label: 'Correct suspect', passed: suspect === 'marcus' },
    { label: 'Motive explains concealment of fraud', passed: motiveOK },
    { label: 'Method identifies poison in a single drink', passed: methodOK },
    { label: 'Timeline distinguishes 23:30 poisoning from 23:42 collapse', passed: opportunity },
    { label: 'Collected evidence supports means, motive and opportunity', passed: physical },
  ];
  const score = checks.filter((c) => c.passed).length * 20;
  const result = {
    score,
    correct: suspect === 'marcus',
    solved: score === 100,
    checks,
    missing: checks.filter((c) => !c.passed).map((c) => c.label),
    title:
      score === 100
        ? 'The truth, at last'
        : suspect === 'marcus'
          ? 'The right suspect. An incomplete case.'
          : 'A verdict the evidence cannot support.',
    summary: CANON.ending,
    explanation: CANON.ending,
  };
  state.ending = result;
  saveState(state);
  return result;
}
