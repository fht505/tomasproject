// ================================================================
// PERPETUA ORBITAL — static station data: modules, crew, generators
// ================================================================

export const STATION_NAME = 'PERPETUA ORBITAL';
export const CONTRACT_GOAL = 1e12; // the crew works until they clear a trillion

// ---------------------------------------------------------------
// Modules (rooms). World coordinates are in tiles.
// Two corridor spines (north y=50, south y=90) + a vertical link at x=101.
// Each door: {x,y} on the room edge, junction {x,y} on a spine.
// ---------------------------------------------------------------
export const SPINES = {
  north: { y: 50, x0: 18, x1: 176 },
  south: { y: 90, x0: 18, x1: 176 },
  link:  { x: 101, y0: 50, y1: 90 }, // passes through the bridge
};

export const ROOMS = [
  {
    id: 'bridge', name: 'BRIDGE', bay: 'COMMAND SPIRE / STATION ARBITRATION',
    title: 'BRIDGE COMMAND TERMINAL',
    desc: 'Operator command deck: crew roster, launch gates, and the directive log. Priorities are set here.',
    color: '#2cff6a', dark: '#0a3f1d',
    rect: { x: 88, y: 56, w: 26, h: 20 },
    doors: [
      { x: 101, y: 56, jx: 101, jy: 50 },
      { x: 101, y: 76, jx: 101, jy: 90 },
    ],
  },
  {
    id: 'factory1', name: 'FACTORY 1', bay: 'FACTORY 1 / AUTONOMOUS COMMERCE BAY',
    title: 'KINDLYPUT PHYSICAL SHELF',
    desc: 'Lane 1: Etsy print-on-demand via Printify. KindlyPut launched 2026-07-29; this bay holds the staged physical catalog — candles, tees, sweatshirts, mugs, tote — with real prices and stage dates.',
    color: '#4dff8b', dark: '#0a3f1d',
    rect: { x: 44, y: 24, w: 30, h: 22 },
    doors: [{ x: 59, y: 46, jx: 59, jy: 50 }],
  },
  {
    id: 'factory2', name: 'DIGITAL PRESS', bay: 'FACTORY 2 / DIGITAL PRESS',
    title: 'PRINTABLE SHELF TERMINAL',
    desc: 'Digital downloads listed directly through the Etsy API — Thanksgiving printables rendered programmatically (SVG → PDF, no image model). ~100% margin after Etsy fees.',
    color: '#35e0ff', dark: '#083241',
    rect: { x: 118, y: 22, w: 26, h: 22 },
    doors: [{ x: 131, y: 44, jx: 131, jy: 50 }],
  },
  {
    id: 'ventures', name: 'VENTURES BAY', bay: 'VENTURES BAY / EXPERIMENTAL COMMERCE',
    title: 'LANE BOARD TERMINAL',
    desc: 'The 52-lane decision board: policy-verified verdicts on every revenue lane researched, from POD marketplaces to prediction-market trading. Generated from ops/lanes.data.json.',
    color: '#b8ff3d', dark: '#2e4008',
    rect: { x: 156, y: 54, w: 26, h: 20 },
    doors: [{ x: 169, y: 54, jx: 169, jy: 50 }],
  },
  {
    id: 'research', name: 'RESEARCH LAB', bay: 'RESEARCH DECK / COMPETITOR INTELLIGENCE',
    title: 'COMPETITOR REPLICATION LAB',
    desc: 'Market research output. Currently holds one real keyword pull; each entry shows its source and when it was fetched.',
    color: '#5b8dff', dark: '#101f4a',
    rect: { x: 40, y: 96, w: 28, h: 22 },
    doors: [{ x: 54, y: 96, jx: 54, jy: 90 }],
  },
  {
    id: 'comms', name: 'COMMS LAB', bay: 'COMMUNICATIONS LAB / OUTBOUND RELAY',
    title: 'SOCIAL LAUNCH TERMINAL',
    desc: 'Instagram + Facebook launch staging for KindlyPut: composed post images, the week-1 plan, and connection status. Nothing posts without operator approval.',
    color: '#3dffc9', dark: '#0a4034',
    rect: { x: 12, y: 54, w: 24, h: 18 },
    doors: [{ x: 24, y: 54, jx: 24, jy: 50 }],
  },
  {
    id: 'treasury', name: 'TREASURY', bay: 'TREASURY VAULT / STATION FINANCE',
    title: 'TREASURY CONTROL TERMINAL',
    desc: 'Revenue and cost roll-up computed from real Printify orders. Reads $0.00 until money actually moves.',
    color: '#ffd84d', dark: '#4a3a08',
    rect: { x: 124, y: 96, w: 24, h: 18 },
    doors: [{ x: 136, y: 96, jx: 136, jy: 90 }],
  },
  {
    id: 'warroom', name: 'WAR ROOM', bay: 'WAR ROOM / DAMAGE CONTROL',
    title: 'STRATEGIC PIVOT TERMINAL',
    desc: 'Kill/scale decisions — convenes only once there is real sales data to review.',
    color: '#ff7a45', dark: '#4a1c08',
    rect: { x: 84, y: 100, w: 24, h: 18 },
    doors: [{ x: 96, y: 100, jx: 96, jy: 90 }],
  },
  {
    id: 'archives', name: 'ARCHIVES', bay: 'ARCHIVES / DEEP MEMORY VAULT',
    title: 'DEEP MEMORY TERMINAL',
    desc: 'The archive is the git history. This panel lists which state files exist and when each was last fetched.',
    color: '#b17bff', dark: '#2c1257',
    rect: { x: 156, y: 96, w: 24, h: 18 },
    doors: [{ x: 168, y: 96, jx: 168, jy: 90 }],
  },
  {
    id: 'quarters', name: 'MEDIA BAY', bay: 'MEDIA BAY / CHANNEL PRODUCTION',
    title: 'WHY IS MY CAR DOING THAT? — CHANNEL TERMINAL',
    desc: 'The YouTube explainer channel build: demand-verified topic bank, scene-annotated scripts, and the pipeline to voiceover and render. Grounded in FHT Auto Repair diagnostic experience.',
    color: '#ff6ad5', dark: '#4a0f38',
    rect: { x: 12, y: 96, w: 26, h: 20 },
    doors: [{ x: 25, y: 96, jx: 25, jy: 90 }],
  },
];

export const ROOM_BY_ID = Object.fromEntries(ROOMS.map(r => [r.id, r]));

// ---------------------------------------------------------------
// Crew
// ---------------------------------------------------------------
const PORTRAIT_COMMANDER = String.raw`
        .--=====--.
       /  .-----.  \
      |  | () () |  |
      |  |  .-.  |  |
       \  \ '-' /  /
        '--=====--'
      .---'| |'---.
     /##  /| |\  ##\
    |###|/ | | \|###|
    |###|  |=|  |###|
    |###|  |=|  |###|
     \##\  |=|  /##/
      |##| |=| |##|
      |##| |=| |##|
     .'--' |=| '--'.
    /##/   |=|   \##\
   |##|   .-=-.   |##|
   '--'  /#####\  '--'
        |##| |##|
        |##| |##|
       _|##| |##|_
      '-----'-----'`;

const PORTRAIT_WORKER = String.raw`
         .-----.
        / o   o \
       |    ^    |
        \  ---  /
         '-----'
        .--|=|--.
       /   |=|   \
      |#|  |=|  |#|
      |#|  |=|  |#|
      |#|.-'='-.|#|
      '-'|#####|'-'
         |#####|
         |#|_|#|
         |#| |#|
        .|#| |#|.
        ||#| |#||
        '---'---'`;

const PORTRAIT_ANALYST = String.raw`
         .-----.
        /  [] []\
       |    __   |
        \  (__) /
         '-----'
       .--=====--.
      / |#######| \
     |o||#######||o|
     |o||##|=|##||o|
      \ |##|=|##| /
       '|##|=|##|'
        |##|_|##|
        |#|   |#|
        |#|   |#|
       _|#|   |#|_
      '----' '----'`;

const PORTRAIT_HEAVY = String.raw`
       .---------.
      /  [=] [=]  \
     |      _      |
      \   [___]   /
       '---------'
     .---'#####'---.
    /###/  |#|  \###\
   |####|  |#|  |####|
   |####|.-|#|-.|####|
    \###||#####||###/
     |##||#####||##|
     |##||#|_|#||##|
     '--'|#| |#|'--'
        .|#| |#|.
        ||#| |#||
       _||#| |#||_
      '----' '----'`;

export const AGENTS = [
  {
    id: 'magnus', name: 'MAGNUS', cls: 'OVERSEER CORE', role: 'STATION COMMANDER',
    room: 'bridge', model: 'SIM CORE',
    func: 'Bridge command authority and station-wide arbitration.',
    duty: 'Command oversight / station priority arbitration.',
    directive: 'Coordinate priorities, approve critical station decisions, and keep all agent lanes aligned to the survival contract.',
    color: '#a6ffc3', color2: '#2cff6a', portrait: PORTRAIT_COMMANDER,
  },
  {
    id: 'nova', name: 'NOVA', cls: 'RESEARCH LEAD', role: 'SIGNAL HUNTER',
    room: 'research', model: 'SIM CORE',
    func: 'Market notes and prototype inputs. Runs the replication lab.',
    duty: 'Watch what already sells; route original angles to the factories.',
    directive: 'Track competitor products, funnels, ad libraries, content hooks, and review language. Sell what sells.',
    color: '#9db9ff', color2: '#5b8dff', portrait: PORTRAIT_ANALYST,
  },
  {
    id: 'scout', name: 'SCOUT', cls: 'RESEARCH ANALYST', role: 'PATTERN EXTRACTOR',
    room: 'research', model: 'SIM CORE',
    func: 'Reads demand surfaces: search phrases, seasonal intent, keyword gaps.',
    duty: 'Pattern extraction and readout routing.',
    directive: 'Turn raw competitor telemetry into readouts the factory crews can act on the same sol.',
    color: '#9db9ff', color2: '#4064c9', portrait: PORTRAIT_WORKER,
  },
  {
    id: 'flora', name: 'FLORA', cls: 'DESIGN AGENT', role: 'POD ARTIST',
    room: 'factory1', model: 'SIM CORE',
    func: 'Generates visual concepts and picks the strongest variants.',
    duty: 'Design drafts for the apparel storefront.',
    directive: 'Soft floral, cozy-era, garden-core. Middle America must feel personally seen by every design.',
    color: '#c3ffa6', color2: '#4dff8b', portrait: PORTRAIT_WORKER,
  },
  {
    id: 'wick', name: 'WICK', cls: 'PRODUCT AGENT', role: 'GIFT LAB SMITH',
    room: 'factory1', model: 'SIM CORE',
    func: 'Runs the candle and gift-lab storefront: mockups, bundles, variants.',
    duty: 'Mockup build and product templating.',
    directive: 'Everything must smell like autumn and feel like a present, even over a screen.',
    color: '#ffd9a6', color2: '#ff9c45', portrait: PORTRAIT_HEAVY,
  },
  {
    id: 'merch', name: 'MERCH', cls: 'LISTING AGENT', role: 'STOREFRONT CLERK',
    room: 'factory1', model: 'SIM CORE',
    func: 'Writes titles, tags, descriptions, pricing, and keyword scaffolding.',
    duty: 'Listing drafts, pub sync, and storefront QC.',
    directive: 'Long-tail everything. If a phrase has buyers, it is already in one of our tags.',
    color: '#c3ffa6', color2: '#17b34a', portrait: PORTRAIT_ANALYST,
  },
  {
    id: 'halo', name: 'HALO', cls: 'RENDER AGENT', role: 'SOCIAL COMPOSER',
    room: 'comms', model: 'SIM CORE',
    func: 'Composes brand-framed post images from live product mockups (gen-posts.mjs).',
    duty: 'Social post batches and channel visuals for the KindlyPut launch.',
    directive: 'The feed and the shop must read as one hand. Cream ground, terracotta frame, no exceptions.',
    color: '#a6f0ff', color2: '#35e0ff', portrait: PORTRAIT_WORKER,
  },
  {
    id: 'forge', name: 'FORGE', cls: 'ASSET AGENT', role: 'PRINTABLE SMITH',
    room: 'factory2', model: 'SIM CORE',
    func: 'Renders printables from SVG primitives (printables/*.mjs → sharp → pdf-lib).',
    duty: 'Digital shelf output: PDFs, previews, and Etsy API listing payloads.',
    directive: 'No image model touches this press. Primitives, math, and 300dpi — provenance is the product.',
    color: '#a6f0ff', color2: '#1a8ba6', portrait: PORTRAIT_HEAVY,
  },
  {
    id: 'prism', name: 'PRISM', cls: 'PIPELINE ENGINEER', role: 'MEDIA BAY CELL',
    room: 'quarters', model: 'SIM CORE',
    func: 'Builds the video pipeline: script → voiceover → Remotion scenes → render → package.',
    duty: 'Channel production: topic bank, scripts, and the six-stage pipeline.',
    directive: 'Every claim grounded or flagged TECH CONFIRM. The operator\'s shop experience is the moat.',
    color: '#e2ffa6', color2: '#b8ff3d', portrait: PORTRAIT_ANALYST,
  },
  {
    id: 'vibes', name: 'VIBES', cls: 'MUSIC AGENT', role: 'SOUND CHANNEL',
    room: 'ventures', model: 'SIM CORE',
    func: 'Generated tracks and channel telemetry.',
    duty: 'Music bay output and playlist placement.',
    directive: 'Lo-fi for the study crowd, phonk for the gym crowd, ambience for everyone asleep.',
    color: '#e2ffa6', color2: '#7ea62b', portrait: PORTRAIT_WORKER,
  },
  {
    id: 'quill', name: 'QUILL', cls: 'PUBLISHER AGENT', role: 'AFFILIATE DESK',
    room: 'ventures', model: 'SIM CORE',
    func: 'Writes blogs and product roundups carrying affiliate weight.',
    duty: 'Publishing cadence across the station’s blog surfaces.',
    directive: 'Answer real questions, link real products, collect the commission with dignity.',
    color: '#e2ffa6', color2: '#93c92e', portrait: PORTRAIT_ANALYST,
  },
  {
    id: 'echo', name: 'ECHO', cls: 'COMMS OFFICER', role: 'INBOUND RELAY',
    room: 'comms', model: 'SIM CORE',
    func: 'Drafts replies for every inbound message across all linked channels.',
    duty: 'Zero-lag inbox. Draft, queue, hand to the operator.',
    directive: 'Warm, brief, human. Refund fast, upsell gently, never argue with a buyer at 3am.',
    color: '#a6ffe8', color2: '#3dffc9', portrait: PORTRAIT_WORKER,
  },
  {
    id: 'ledger', name: 'LEDGER', cls: 'TREASURY QUANT', role: 'VAULT KEEPER',
    room: 'treasury', model: 'SIM CORE',
    func: 'Manages costs of the entire station: subs, inference, fees, ads.',
    duty: 'Margin defense and burn control.',
    directive: 'The station runs on two subscriptions and spite. Keep it that way.',
    color: '#ffeca6', color2: '#ffd84d', portrait: PORTRAIT_ANALYST,
  },
  {
    id: 'atlas', name: 'ATLAS', cls: 'STRATEGY AGENT', role: 'WAR ROOM CHIEF',
    room: 'warroom', model: 'SIM CORE',
    func: 'Figures out what is not working and what the station should pivot to next.',
    duty: 'Kill the losers, scale the winners, touch nothing that prints.',
    directive: 'Sentiment is for the quarters deck. In here only the ledger votes.',
    color: '#ffc3a6', color2: '#ff7a45', portrait: PORTRAIT_HEAVY,
  },
  {
    id: 'vault', name: 'VAULT', cls: 'ARCHIVIST', role: 'MEMORY WARDEN',
    room: 'archives', model: 'SIM CORE',
    func: 'Stores every memory ever: every word, every idea, every result.',
    duty: 'Total recall for the whole station.',
    directive: 'Nothing is ever deleted. Context is the only asset that appreciates for free.',
    color: '#d5b8ff', color2: '#b17bff', portrait: PORTRAIT_ANALYST,
  },
];

export const AGENT_BY_ID = Object.fromEntries(AGENTS.map(a => [a.id, a]));

// ---------------------------------------------------------------
// Documented production process (our own plan, shown labelled as a
// plan — these are the steps agent runs will execute, not activity).
// ---------------------------------------------------------------
export const PIPELINES = {
  factory1: [
    { key: 'TREND SCAN',    desc: 'Read marketplace demand, seasonal phrases, gift intents, and keyword gaps.' },
    { key: 'DESIGN DRAFT',  desc: 'Generate visual concepts and pick the strongest variants.' },
    { key: 'MOCKUP BUILD',  desc: 'Place art on shirts, candles, planners, mugs, and customer-selected products.' },
    { key: 'LISTING DRAFT', desc: 'Write title, tags, description, pricing, and keyword scaffolding.' },
    { key: 'PUB SYNC',      desc: 'Push final assets to friendly print partners and stage variants.' },
    { key: 'QC LAUNCH',     desc: 'Final check, publish listing, and register it with the ops ledger.' },
  ],
  factory2: [
    { key: 'ORDER INTAKE',  desc: 'Parse buyer brief, video title, reference channels, face assets, deadline, and revision scope.' },
    { key: 'PROMPT BUILD',  desc: 'Compose render prompt variants for expression, contrast, text space, and CTR angle.' },
    { key: 'RENDER BATCH',  desc: 'Generate multiple thumbnails, score clarity at small size, and keep alternate hooks.' },
    { key: 'EDIT PASS',     desc: 'Close-crop faces, sharpen focal subject, and prep buyer-preview proofs.' },
    { key: 'DELIVER FILES', desc: 'Export 16:9 masters, source notes, and revision options into the customer channel.' },
    { key: 'REVIEW LOOP',   desc: 'Monitor buyer messages, run requested changes, and queue the order for close-out.' },
  ],
  research: [
    { key: 'WATCH TARGETS',   desc: 'Track competitor products, funnels, ad libraries, content hooks, and review language.' },
    { key: 'PATTERN EXTRACT', desc: 'Identify the moves worth adapting into original offers and product strategy.' },
    { key: 'ORIGINAL ANGLE',  desc: 'Translate the pattern into an angle the station can legally own.' },
    { key: 'STATION ROUTE',   desc: 'Route the readout to the factory crew best placed to ship it.' },
    { key: 'RESULT LEDGER',   desc: 'Score the readout against realized revenue so the lab learns what to watch.' },
  ],
  ventures: [
    { key: 'SCOUT NICHE',   desc: 'Pull candidate niches from the research deck’s discard pile.' },
    { key: 'BUILD SPRINT',  desc: 'Two-sol build: post, pack, prototype, or track.' },
    { key: 'STAGE + SHIP',  desc: 'Stage the artifact on its marketplace and wire telemetry.' },
    { key: 'MEASURE',       desc: 'Watch fourteen sols of signal before the war room gets a vote.' },
  ],
};

// (Simulation content library removed — see git history. Nothing that could be
// mistaken for real business data lives in this file.)

export const BOOT_LINES = [
  'PERPETUA ORBITAL OPS CONSOLE — real mode',
  'policy: nothing simulated. empty panels are the honest truth.',
  'reading ops/state … only real API pulls and verified runs render here',
  'crew = scheduled agent runs; sprites are representation, numbers are real',
  'shop: KindlyPut — live since 2026-07-29. contract target: $1,000,000,000,000.',
  'WELCOME, OPERATOR.',
];


export const fmtMoney = (v, dp = 2) =>
  '$' + v.toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });

export const fmtMoneyShort = (v) => {
  if (v >= 1e9) return '$' + (v / 1e9).toFixed(2) + 'B';
  if (v >= 1e6) return '$' + (v / 1e6).toFixed(2) + 'M';
  if (v >= 1e4) return '$' + (v / 1e3).toFixed(1) + 'K';
  return fmtMoney(v);
};
