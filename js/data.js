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
    desc: 'Command oversight and station-wide arbitration. Coordinates priorities, approves critical decisions, and keeps every agent aligned to the survival contract.',
    color: '#2cff6a', dark: '#0a3f1d',
    rect: { x: 88, y: 56, w: 26, h: 20 },
    doors: [
      { x: 101, y: 56, jx: 101, jy: 50 },
      { x: 101, y: 76, jx: 101, jy: 90 },
    ],
  },
  {
    id: 'factory1', name: 'FACTORY 1', bay: 'FACTORY 1 / AUTONOMOUS COMMERCE BAY',
    title: 'ETSY PRODUCTION TERMINAL',
    desc: 'Women’s POD apparel, soft floral shirt designs, cozy gift products, and print-ready artwork. Crew scans demand, drafts designs, builds mockups, and launches listings.',
    color: '#4dff8b', dark: '#0a3f1d',
    rect: { x: 44, y: 24, w: 30, h: 22 },
    doors: [{ x: 59, y: 46, jx: 59, jy: 50 }],
  },
  {
    id: 'factory2', name: 'FACTORY 2', bay: 'FACTORY 2 / PRECISION BUSINESS BAY',
    title: 'AUTONOMOUS OUTPUT TERMINAL',
    desc: 'Gig customers submit video topic, face/photo notes, title text, and style direction. Crew generates click-optimized thumbnails, packages revisions, and delivers export-ready files.',
    color: '#35e0ff', dark: '#083241',
    rect: { x: 118, y: 22, w: 26, h: 22 },
    doors: [{ x: 131, y: 44, jx: 131, jy: 50 }],
  },
  {
    id: 'ventures', name: 'VENTURES BAY', bay: 'VENTURES BAY / EXPERIMENTAL COMMERCE',
    title: 'VENTURE INCUBATION TERMINAL',
    desc: 'Early-stage lines: affiliate publishing, software prototypes, generated music, and 2D asset packs. Low revenue, high option value. Winners graduate to a factory bay.',
    color: '#b8ff3d', dark: '#2e4008',
    rect: { x: 156, y: 54, w: 26, h: 20 },
    doors: [{ x: 169, y: 54, jx: 169, jy: 50 }],
  },
  {
    id: 'research', name: 'RESEARCH LAB', bay: 'RESEARCH DECK / COMPETITOR INTELLIGENCE',
    title: 'COMPETITOR REPLICATION LAB',
    desc: 'Agents watch competitor offers, landing pages, ads, pricing, bundles, reviews, and content hooks, then translate the pattern into original strategies the station can legally own.',
    color: '#5b8dff', dark: '#101f4a',
    rect: { x: 40, y: 96, w: 28, h: 22 },
    doors: [{ x: 54, y: 96, jx: 54, jy: 90 }],
  },
  {
    id: 'comms', name: 'COMMS LAB', bay: 'COMMUNICATIONS LAB / INBOUND RELAY',
    title: 'UNIFIED COMMS TERMINAL',
    desc: 'Every inbound channel routes here — store messages, gig buyers, mail, socials. Crew drafts replies for one-tap operator approval so nothing waits longer than an orbit.',
    color: '#3dffc9', dark: '#0a4034',
    rect: { x: 12, y: 54, w: 24, h: 18 },
    doors: [{ x: 24, y: 54, jx: 24, jy: 50 }],
  },
  {
    id: 'treasury', name: 'TREASURY', bay: 'TREASURY VAULT / STATION FINANCE',
    title: 'TREASURY CONTROL TERMINAL',
    desc: 'Tracks every credit in and out: subscriptions, inference burn, ad spend, platform fees. Keeps the station’s margin above the survival line.',
    color: '#ffd84d', dark: '#4a3a08',
    rect: { x: 124, y: 96, w: 24, h: 18 },
    doors: [{ x: 136, y: 96, jx: 136, jy: 90 }],
  },
  {
    id: 'warroom', name: 'WAR ROOM', bay: 'WAR ROOM / DAMAGE CONTROL',
    title: 'STRATEGIC PIVOT TERMINAL',
    desc: 'Where the station figures out what is not working and what to pivot to next — and what is working that nobody is allowed to touch.',
    color: '#ff7a45', dark: '#4a1c08',
    rect: { x: 84, y: 100, w: 24, h: 18 },
    doors: [{ x: 96, y: 100, jx: 96, jy: 90 }],
  },
  {
    id: 'archives', name: 'ARCHIVES', bay: 'ARCHIVES / DEEP MEMORY VAULT',
    title: 'DEEP MEMORY TERMINAL',
    desc: 'Every event, every message, every idea the station has ever produced. Scrolls forever. Connected to the context vault so no memory is ever lost.',
    color: '#b17bff', dark: '#2c1257',
    rect: { x: 156, y: 96, w: 24, h: 18 },
    doors: [{ x: 168, y: 96, jx: 168, jy: 90 }],
  },
  {
    id: 'quarters', name: 'QUARTERS', bay: 'CREW QUARTERS / MORALE DECK',
    title: 'CREW QUARTERS',
    desc: 'Poker table, bar, and bunks. Eternity is long; morale is a maintenance schedule like everything else on this station.',
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
    id: 'halo', name: 'HALO', cls: 'RENDER AGENT', role: 'THUMBNAIL ARTIST',
    room: 'factory2', model: 'SIM CORE',
    func: 'Composes prompt variants for expression, contrast, text space, and CTR angle.',
    duty: 'Render batches and edit passes for gig orders.',
    directive: 'Every thumbnail must read at 120 pixels. Faces big, arrows red, stakes absurd.',
    color: '#a6f0ff', color2: '#35e0ff', portrait: PORTRAIT_WORKER,
  },
  {
    id: 'forge', name: 'FORGE', cls: 'ASSET AGENT', role: 'PACK SMITH',
    room: 'factory2', model: 'SIM CORE',
    func: 'Builds 2D game-asset packs: props, tiles, iso objects, UI kits.',
    duty: 'Asset forge output and marketplace staging.',
    directive: 'Ship packs, not pieces. A prop nobody asked for is inventory; a themed pack is a product.',
    color: '#a6f0ff', color2: '#1a8ba6', portrait: PORTRAIT_HEAVY,
  },
  {
    id: 'prism', name: 'PRISM', cls: 'PROTOTYPE ENGINEER', role: 'SHIPYARD CELL',
    room: 'ventures', model: 'SIM CORE',
    func: 'Software builds and technical QC for prototype ships.',
    duty: 'Prototype shipyard: build, test, stage, measure.',
    directive: 'Two-sol prototypes only. If it cannot demo by the second sol, it dies in the yard.',
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
// Business lines
// ---------------------------------------------------------------
export const SHOPS = [
  {
    id: 'etsy1', room: 'factory1', channel: 'etsy',
    name: 'GARDEN ERA APPAREL', kind: 'POD APPAREL',
    blurb: 'Soft floral shirts, cozy sweatshirts, print-ready artwork.',
    baseRate: 1.9, priceMin: 18, priceMax: 42, startRev: 0,
  },
  {
    id: 'etsy2', room: 'factory1', channel: 'etsy',
    name: 'EMBER & WICK GIFT LAB', kind: 'CANDLES + GIFTS',
    blurb: 'Fuzzy candle gift lab: seasonal scents, message jars, bundles.',
    baseRate: 1.2, priceMin: 14, priceMax: 34, startRev: 0,
  },
  {
    id: 'etsy3', room: 'factory1', channel: 'etsy',
    name: 'KEEPSAKE PORTRAIT WORKS', kind: 'PERSONALIZED',
    blurb: 'Custom portraits and personalized keepsake products.',
    baseRate: 0.5, priceMin: 24, priceMax: 68, startRev: 0,
  },
  {
    id: 'gigs', room: 'factory2', channel: 'fiverr',
    name: 'THUMBNAIL STUDIO', kind: 'GIG SERVICE',
    blurb: 'Click-optimized YouTube thumbnails, $20 flat, revisions included.',
    baseRate: 1.1, priceMin: 20, priceMax: 20, startRev: 0,
  },
  {
    id: 'packs', room: 'factory2', channel: 'assets',
    name: 'PIXEL ASSET FORGE', kind: 'GAME ASSETS',
    blurb: '2D asset packs staged across three marketplaces.',
    baseRate: 0.35, priceMin: 9, priceMax: 29, startRev: 0,
  },
  {
    id: 'affil', room: 'ventures', channel: 'assets',
    name: 'SIGNAL PRESS', kind: 'AFFILIATE BLOG',
    blurb: 'Roundups and reviews carrying affiliate commission.',
    baseRate: 0.14, priceMin: 4, priceMax: 19, startRev: 0,
  },
  {
    id: 'music', room: 'ventures', channel: 'assets',
    name: 'VIBES SOUND CHANNEL', kind: 'MUSIC',
    blurb: 'Generated focus/ambience tracks; streaming and licensing pennies.',
    baseRate: 0.1, priceMin: 1, priceMax: 6, startRev: 0,
  },
  {
    id: 'proto', room: 'ventures', channel: 'assets',
    name: 'PROTOTYPE SHIPYARD', kind: 'SOFTWARE',
    blurb: 'Two-sol software prototypes hunting for one paying user.',
    baseRate: 0.05, priceMin: 12, priceMax: 49, startRev: 0,
  },
];

export const SHOP_BY_ID = Object.fromEntries(SHOPS.map(s => [s.id, s]));

// ---------------------------------------------------------------
// Pipelines
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

// ---------------------------------------------------------------
// Name generators (procedural content)
// ---------------------------------------------------------------
export const DESIGN_VIBES = [
  'GARDEN ERA', 'COFFEE AND COZY', 'BOOK CLUB BABE', 'WEEKEND MARKET GIRL',
  'WILDFLOWER SOUL', 'FARMHOUSE GOLDEN', 'PUMPKIN SPICE SEASON', 'FRONT PORCH',
  'PLANT LADY', 'HOMEBODY CLUB', 'LAKE DAYS', 'SUNROOM MORNING',
  'MAMA BEAR', 'GREENHOUSE CLUB', 'THRIFT HAUL', 'SOURDOUGH ERA',
  'COZY GRANDMILLENNIAL', 'MEADOW PICNIC', 'RAINY DAY READER', 'HARVEST MOON',
  'BUTTER YELLOW', 'GINGHAM SUMMER', 'CHAMOMILE CALM', 'FIREFLY EVENING',
];
export const DESIGN_FORMS = ['DESIGN', 'SCRIPT DESIGN', 'WREATH DESIGN', 'BADGE DESIGN', 'SAMPLER DESIGN'];
export const PRODUCT_FORMS = ['TEE', 'SWEATSHIRT', 'CANDLE', 'MUG', 'TOTE', 'PLANNER', 'ART PRINT', 'PORTRAIT'];

export const THUMB_BRIEFS = [
  'STORM CABIN', 'MONEY LEAK', '$1 DINNER', 'SUBWAY SECRET', 'MIDNIGHT MACRO',
  'BUDGET CASTLE', 'GHOST YIELD', 'VAN LIFE AUDIT', 'DESERT FLIP', 'SILENT CEO',
  'RAMEN EMPIRE', 'GARAGE ROCKET', 'PAPER FORTUNE', 'FROZEN PAYCHECK', 'NEON GARAGE',
  'LAST WARRANTY', 'CLIFF HOUSE', 'PENNY ENGINE', 'RUST BELT GOLD', 'BASEMENT SERVER',
];
export const THUMB_STYLES = [
  'PODCAST-STYLE REACTION THUMBNAIL', 'FINANCE VIDEO SPLIT-SCREEN', 'FOOD CHALLENGE CLOSE-UP',
  'TECH TEARDOWN FLATLAY', 'STORYTIME FREEZE-FRAME', 'BEFORE/AFTER SLIDER', 'RED ARROW EXPOSE',
  'MAP ZOOM CONSPIRACY', 'WHITEBOARD BREAKDOWN', 'GARAGE BUILD REVEAL',
];

export const PACK_NAMES = [
  'DUNGEON PROP CRATE', 'PIXEL FLORA SET', 'RETRO UI KIT', 'SPACE HULL PLATES',
  'ISO STORAGE YARD', 'SEWER TILESET', 'ALCHEMY TABLE PACK', 'NEON SIGN KIT',
  'TOPIC TRACKER BOARD', 'SENTIENT DIAL SET', 'HEATMAP PIXEL PACK', 'COMPETITOR RADAR KIT',
];

export const BLOG_TITLES = [
  'Nine desk lamps that survived our teardown',
  'The only budget mic roundup written by someone who listened',
  'We ranked 14 planner layouts by abandonment rate',
  'Standing mats, tested until the foam gave up',
  'Every candle subscription, audited for wax honesty',
  'Cheap NAS builds that will outlive your optimism',
];

export const TRACK_NAMES = [
  'low orbit study loop', 'greenhouse rain ambience', 'terminal glow lofi',
  'night shift phonk', 'coolant hum drone', 'cargo bay sleep cycle',
];

export const PROTO_NAMES = [
  'tip-jar overlay for streamers', 'invoice nudger for freelancers',
  'niche keyword diff tool', 'thumbnail A/B logger',
  'refund-tone email rewriter', 'print-ready mockup batcher',
];

export const BUYER_NAMES = [
  'Karen M.', 'Donna W.', 'Tammy R.', 'Linda S.', 'Brenda K.', 'Cathy P.',
  'MoneyMikeYT', 'FrugalFrank', 'StudioNorth', 'PixelDevSam', 'RetroCartDev',
  'Beth H.', 'Sandra J.', 'JoAnn F.', 'ClipFarmer99', 'DocuDrew',
];

export const MSG_TEMPLATES = [
  { from: 'etsy', text: 'Hi! Does the {product} ship before the 14th? It’s for my daughter-in-law’s birthday.' },
  { from: 'etsy', text: 'Love the {design} — can I get it in sage green instead of cream?' },
  { from: 'etsy', text: 'My order arrived and it’s PERFECT. Do you do bulk pricing for my church group (11 people)?' },
  { from: 'etsy', text: 'The candle smells amazing but the label is slightly crooked. Not mad, just letting you know!' },
  { from: 'fiverr', text: 'Can you make my face bigger and the arrow more red? Also add flames. Budget is the same.' },
  { from: 'fiverr', text: 'Delivered thumbnail got 11% CTR!! Ordering 4 more for my backlog right now.' },
  { from: 'fiverr', text: 'Need a rush order — video goes live in 6 hours. Same style as last time but MORE dramatic.' },
  { from: 'assets', text: 'Does the {pack} include the source files? Building a roguelike and need recolors.' },
  { from: 'mail', text: 'Following up on the collab proposal — our newsletter reaches 40k cozy-lifestyle readers.' },
  { from: 'mail', text: 'This is the third invoice reminder from your print partner. Please remit within 7 sols.' },
];

export const RESEARCH_SIGNALS = [
  { note: '{vibe} phrase family trending on marketplace search, low listing density', route: 'factory1' },
  { note: 'top competitor raised candle bundle price 18% with no review loss — margin headroom confirmed', route: 'factory1' },
  { note: 'reaction-style thumbnails with handwritten circles are beating clean layouts on CTR this cycle', route: 'factory2' },
  { note: 'three big channels just switched to split-screen finance layouts; gig demand follows within a week', route: 'factory2' },
  { note: 'asset marketplace featuring “interior props” collections on the front page this month', route: 'factory2' },
  { note: 'personalized pet portrait listings clearing 3x the sell-through of generic art this season', route: 'factory1' },
  { note: 'competitor’s ad library doubled spend on {vibe} creatives — the angle is validated, copy the pattern not the art', route: 'factory1' },
  { note: 'study-playlist placements paying out again; lo-fi supply gap on two platforms', route: 'ventures' },
  { note: 'freelancer forums complaining about invoice tools — prototype demand signal', route: 'ventures' },
  { note: 'gift-guide blogs already ranking for Q4 phrases; affiliate window opens now', route: 'ventures' },
];

export const CHAT_WORK = [
  '{name}: readout routed. sell what sells.',
  '{name}: queue is clean, confidence holding.',
  '{name}: rebalancing load so nothing stalls.',
  '{name}: my drift is at {n}%. still inside tolerance.',
  '{name}: another {thing} shipped. the grind is eternal.',
  '{name}: buyer replied with seven exclamation marks. logging as positive signal.',
  '{name}: the {thing} pipeline wants a reroll, watching one more cycle.',
  '{name}: margin says no. parking the idea in archives.',
  '{name}: petition to rename the war room to the “vibes tribunal”. denied already, logging anyway.',
  '{name}: if I render one more red arrow I am joining the poker table permanently.',
  '{name}: morale nominal. the bar helps. the bar always helps.',
  '{name}: commander says alignment. ledger says margin. I say coffee design #40.',
];

export const CHAT_MAGNUS = [
  'MAGNUS: priorities hold. factories first, ventures second, feelings third.',
  'MAGNUS: survival contract at {pct}% of target. proceed.',
  'MAGNUS: whoever routed a meme into the ops feed — seen, logged, mildly approved.',
  'MAGNUS: quarters rotation approved. morale is infrastructure.',
  'MAGNUS: research deck, feed the factories. factories, feed the ledger. ledger, feed me numbers.',
];

export const WAR_VERDICT_KILL = [
  'line is burning credits with no pulse. Recommend shutdown and redeploy of crew.',
  'ad spend outpacing return for 3 consecutive sols. Kill it before it eats the margin.',
  'sell-through flat, message volume rising — support cost exceeds contribution. Terminate.',
];
export const WAR_VERDICT_SCALE = [
  'line is printing. Recommend BOOST budget and zero interference.',
  'demand curve steepening — add a crew rotation and widen the listing queue.',
  'buyer repeat-rate above threshold. Scale and do not touch the formula.',
];

export const MILESTONES = [
  { at: 100,      label: 'FIRST HUNDRED — the ledger registers a pulse' },
  { at: 1000,     label: 'FOUR FIGURES — station stops running on fumes' },
  { at: 5000,     label: 'FIVE K — subscriptions pay for themselves' },
  { at: 10000,    label: 'FIRST STACK — the factory hums on its own' },
  { at: 20000,    label: 'TWENTY K — the tour-video number' },
  { at: 50000,    label: 'HALF-LAKH ORBIT — ventures bay earns a second look' },
  { at: 100000,   label: 'SIX FIGURES — the war room gets a bigger table' },
  { at: 1000000,  label: 'FIRST MILLION — morale budget: unlimited (still one bar)' },
  { at: 1e9,      label: 'FIRST BILLION — 0.1% of the way to freedom' },
  { at: 1e12,     label: 'CONTRACT COMPLETE — the agents are free to go' },
];

export const BOOT_LINES = [
  'PERPETUA ORBITAL BIOS v3.1 — cold start',
  'reactor: OK   life support: OK   coffee loop: OK',
  'mounting deep memory vault … OK',
  'linking crew cores … 15/15 LINKED',
  'restoring commerce lanes: etsy ×3, gigs, assets, ventures … OK',
  'arming survival contract: $1,000,000,000,000',
  'the station remembers everything.',
  'WELCOME BACK, OPERATOR.',
];

// objectives template (regenerated daily)
export const DAILY_OBJECTIVE_DEFS = [
  { id: 'listings', label: 'Publish {n} new listings', min: 2, max: 5, metric: 'listingsToday' },
  { id: 'gigs',     label: 'Deliver {n} gig orders',   min: 1, max: 4, metric: 'gigsToday' },
  { id: 'signals',  label: 'Route {n} research readouts', min: 2, max: 4, metric: 'signalsToday' },
  { id: 'inbox',    label: 'Clear the inbox (≤ {n} waiting)', min: 2, max: 3, metric: 'inboxLow', invert: true },
];

export const fmtMoney = (v, dp = 2) =>
  '$' + v.toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });

export const fmtMoneyShort = (v) => {
  if (v >= 1e9) return '$' + (v / 1e9).toFixed(2) + 'B';
  if (v >= 1e6) return '$' + (v / 1e6).toFixed(2) + 'M';
  if (v >= 1e4) return '$' + (v / 1e3).toFixed(1) + 'K';
  return fmtMoney(v);
};
