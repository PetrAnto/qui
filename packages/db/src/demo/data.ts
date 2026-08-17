import type {
  AgeBand,
  GeoAttachmentKind,
  SignalType,
} from '@indenoi/core';
import type { CITY_IDS } from '@indenoi/geo';

/**
 * The demo cast and content.
 *
 * Every person here is invented. Nothing in this file is a real individual, a
 * real business, a real testimonial or a real event, and every record it
 * produces is flagged `demo: true` and labelled as such in the interface
 * (§28 of the brief). The dataset exists to prove the product works in more
 * than one city — hence eight cities in three countries, and not one line of
 * behaviour that depends on which one.
 */

export type CityKey = keyof typeof CITY_IDS;

export const DEMO_NOW = '2026-08-16T12:00:00.000Z';

export interface DemoPerson {
  readonly key: string;
  readonly displayName: string;
  readonly ageBand: AgeBand;
  readonly role: 'member' | 'moderator';
  readonly accountState: 'active' | 'distribution_restricted';
  readonly bio: string;
  readonly avatarMotif: string;
  readonly practices: readonly string[];
  readonly interests: readonly string[];
  readonly canHelpWith: readonly string[];
  readonly wantsToLearn: readonly string[];
  readonly places: readonly { readonly city: CityKey; readonly kind: GeoAttachmentKind }[];
}

export const DEMO_PEOPLE: readonly DemoPerson[] = [
  {
    key: 'lea',
    displayName: 'Léa',
    ageBand: 'adult_18_plus',
    role: 'member',
    accountState: 'active',
    bio: 'Freediving most mornings before work. I photograph what the sea gives back.',
    avatarMotif: 'sea',
    practices: ['freediving', 'film photography'],
    interests: ['freediving', 'beach clean-ups', 'film photography'],
    canHelpWith: ['first freedive', 'developing film'],
    wantsToLearn: ['boat maintenance'],
    places: [
      { city: 'ajaccio', kind: 'resident' },
      { city: 'porto', kind: 'second_home' },
    ],
  },
  {
    key: 'marc',
    displayName: 'Marc',
    ageBand: 'adult_18_plus',
    role: 'member',
    accountState: 'active',
    bio: 'Luthier. I repair guitars in a workshop that smells of hot hide glue.',
    avatarMotif: 'workshop',
    practices: ['lutherie', 'woodworking'],
    interests: ['lutherie', 'traditional music'],
    canHelpWith: ['instrument repair', 'sharpening tools'],
    wantsToLearn: ['polyphonic singing'],
    places: [{ city: 'ajaccio', kind: 'resident' }],
  },
  {
    key: 'ines',
    displayName: 'Inès',
    ageBand: 'minor_15_17',
    role: 'member',
    accountState: 'active',
    bio: 'I draw the harbour and I skate badly. Both are improving.',
    avatarMotif: 'street',
    practices: ['illustration', 'skateboarding'],
    interests: ['illustration', 'skateboarding', 'zines'],
    canHelpWith: ['digital colouring'],
    wantsToLearn: ['screen printing'],
    places: [{ city: 'ajaccio', kind: 'resident' }],
  },
  {
    key: 'paul',
    displayName: 'Paul',
    ageBand: 'adult_18_plus',
    role: 'member',
    accountState: 'active',
    bio: 'I coach the under-13s on Saturdays. The rest of the week I run the hills.',
    avatarMotif: 'court',
    practices: ['football coaching', 'trail running'],
    interests: ['football coaching', 'trail running'],
    canHelpWith: ['training plans', 'kit repairs'],
    wantsToLearn: ['physiotherapy basics'],
    places: [{ city: 'bastia', kind: 'resident' }],
  },
  {
    key: 'sofia',
    displayName: 'Sofia',
    ageBand: 'adult_18_plus',
    role: 'member',
    accountState: 'active',
    bio: 'Ceramics. Two kilns, too many mugs, always looking for shelf neighbours.',
    avatarMotif: 'studio',
    practices: ['ceramics'],
    interests: ['ceramics', 'glazing', 'studio shares'],
    canHelpWith: ['throwing on the wheel', 'kiln firing'],
    wantsToLearn: ['wood firing'],
    places: [{ city: 'marseille', kind: 'resident' }],
  },
  {
    key: 'yanis',
    displayName: 'Yanis',
    ageBand: 'minor_15_17',
    role: 'member',
    accountState: 'active',
    bio: 'Beats made on a laptop in a kitchen. Looking for a room with less echo.',
    avatarMotif: 'stage',
    practices: ['beatmaking'],
    interests: ['beatmaking', 'sampling'],
    canHelpWith: ['mixing a demo'],
    wantsToLearn: ['recording vocals properly'],
    places: [{ city: 'marseille', kind: 'resident' }],
  },
  {
    key: 'claire',
    displayName: 'Claire',
    ageBand: 'adult_18_plus',
    role: 'member',
    accountState: 'active',
    bio: 'Bike mechanic by trade. I fix wheels on the pavement on Sundays.',
    avatarMotif: 'street',
    practices: ['bike repair'],
    interests: ['bike repair', 'cycling', 'repair cafés'],
    canHelpWith: ['truing a wheel', 'brake bleeding'],
    wantsToLearn: ['frame building'],
    places: [{ city: 'paris', kind: 'resident' }],
  },
  {
    key: 'tom',
    displayName: 'Tom',
    ageBand: 'adult_18_plus',
    role: 'member',
    accountState: 'active',
    bio: 'Climber. Mostly plastic in winter, mostly limestone in summer.',
    avatarMotif: 'trail',
    practices: ['climbing'],
    interests: ['climbing', 'bouldering'],
    canHelpWith: ['belay basics', 'route reading'],
    wantsToLearn: ['multi-pitch'],
    places: [
      { city: 'lyon', kind: 'resident' },
      // Follows a city he has no tie to: exploring grants no local capability.
      { city: 'porto', kind: 'exploring' },
    ],
  },
  {
    key: 'nour',
    displayName: 'Nour',
    ageBand: 'adult_18_plus',
    role: 'member',
    accountState: 'active',
    bio: 'Botany student. I can tell you what is edible on your own street.',
    avatarMotif: 'garden',
    practices: ['botany', 'urban foraging'],
    interests: ['botany', 'urban foraging', 'seed swaps'],
    canHelpWith: ['plant identification'],
    wantsToLearn: ['grafting'],
    places: [{ city: 'montpellier', kind: 'work_study' }],
  },
  {
    key: 'eoin',
    displayName: 'Eoin',
    ageBand: 'adult_18_plus',
    role: 'member',
    accountState: 'active',
    bio: 'Concertina and bad jokes. Tuesday sessions in the back room.',
    avatarMotif: 'stage',
    practices: ['trad music'],
    interests: ['trad music', 'sessions'],
    canHelpWith: ['finding a session', 'tuning a concertina'],
    wantsToLearn: ['step dancing'],
    places: [{ city: 'kilrush', kind: 'resident' }],
  },
  {
    key: 'rita',
    displayName: 'Rita',
    ageBand: 'adult_18_plus',
    role: 'member',
    accountState: 'active',
    bio: 'Surf and repair. I would rather fix a board than sell you a new one.',
    avatarMotif: 'sea',
    practices: ['surfing', 'board repair'],
    interests: ['surfing', 'board repair', 'repair cafés'],
    canHelpWith: ['ding repair', 'first waves'],
    wantsToLearn: ['shaping'],
    places: [{ city: 'porto', kind: 'resident' }],
  },
  {
    key: 'hugo',
    displayName: 'Hugo',
    ageBand: 'adult_18_plus',
    role: 'member',
    accountState: 'active',
    bio: 'Paris during the week. Half my family is Corsican and I am there often.',
    avatarMotif: 'market',
    practices: ['running'],
    interests: ['running', 'freediving', 'markets'],
    canHelpWith: ['translation', 'moving furniture'],
    wantsToLearn: ['freediving'],
    places: [
      { city: 'paris', kind: 'resident' },
      { city: 'ajaccio', kind: 'origin_family' },
    ],
  },
  {
    key: 'noa',
    displayName: 'Noa',
    ageBand: 'adult_18_plus',
    // Demonstrates the distribution-restricted state: still present, not amplified.
    role: 'member',
    accountState: 'distribution_restricted',
    bio: 'Posting a lot lately. Currently limited while a report is reviewed.',
    avatarMotif: 'market',
    practices: ['street photography'],
    interests: ['street photography'],
    canHelpWith: [],
    wantsToLearn: ['portraiture'],
    places: [{ city: 'montpellier', kind: 'repeated_presence' }],
  },
  {
    key: 'maya',
    displayName: 'Maya',
    ageBand: 'adult_18_plus',
    role: 'moderator',
    accountState: 'active',
    bio: 'Community safety. I read reports so that nobody else has to.',
    avatarMotif: 'garden',
    practices: ['community safety'],
    interests: ['community safety'],
    canHelpWith: ['reporting a problem'],
    wantsToLearn: [],
    places: [
      { city: 'paris', kind: 'resident' },
      { city: 'ajaccio', kind: 'visitor' },
    ],
  },
];

export interface DemoPost {
  readonly key: string;
  readonly author: string;
  readonly city: CityKey;
  readonly caption: string;
  readonly practice: string | null;
  readonly motif: string;
  readonly hoursAgo: number;
  readonly appreciatedBy: readonly string[];
}

export const DEMO_POSTS: readonly DemoPost[] = [
  {
    key: 'ajaccio-1',
    author: 'lea',
    city: 'ajaccio',
    caption: 'Six in the morning at Capo di Feno. Twelve metres, no fins, no hurry.',
    practice: 'freediving',
    motif: 'sea',
    hoursAgo: 5,
    appreciatedBy: ['marc', 'ines', 'hugo', 'rita'],
  },
  {
    key: 'ajaccio-2',
    author: 'marc',
    city: 'ajaccio',
    caption: 'A neck reset that took three weeks. It plays again, and it will outlive me.',
    practice: 'lutherie',
    motif: 'workshop',
    hoursAgo: 20,
    appreciatedBy: ['lea', 'eoin'],
  },
  {
    key: 'ajaccio-3',
    author: 'ines',
    city: 'ajaccio',
    caption: 'The harbour at closing time, drawn from the wall I always sit on.',
    practice: 'illustration',
    motif: 'street',
    hoursAgo: 30,
    appreciatedBy: ['lea', 'marc'],
  },
  {
    key: 'bastia-1',
    author: 'paul',
    city: 'bastia',
    caption: 'Under-13s training in the rain. Nobody asked to go home.',
    practice: 'football coaching',
    motif: 'court',
    hoursAgo: 14,
    appreciatedBy: ['lea', 'tom'],
  },
  {
    key: 'bastia-2',
    author: 'paul',
    city: 'bastia',
    caption: 'The hill route above the port, before the heat arrives.',
    practice: 'trail running',
    motif: 'trail',
    hoursAgo: 52,
    appreciatedBy: ['hugo'],
  },
  {
    key: 'marseille-1',
    author: 'sofia',
    city: 'marseille',
    caption: 'Opened the kiln at seven. Two survivors, one spectacular failure.',
    practice: 'ceramics',
    motif: 'studio',
    hoursAgo: 9,
    appreciatedBy: ['yanis', 'nour', 'claire'],
  },
  {
    key: 'marseille-2',
    author: 'yanis',
    city: 'marseille',
    caption: 'Kitchen session. The fridge is on every take and I have made peace with it.',
    practice: 'beatmaking',
    motif: 'stage',
    hoursAgo: 26,
    appreciatedBy: ['sofia'],
  },
  {
    key: 'paris-1',
    author: 'claire',
    city: 'paris',
    caption: 'Sunday pavement workshop. Eleven bikes, one very tired floor pump.',
    practice: 'bike repair',
    motif: 'street',
    hoursAgo: 11,
    appreciatedBy: ['hugo', 'maya', 'tom'],
  },
  {
    key: 'paris-2',
    author: 'hugo',
    city: 'paris',
    caption: 'Canal loop before work. Still slower than last year, still going.',
    practice: 'running',
    motif: 'trail',
    hoursAgo: 33,
    appreciatedBy: ['claire'],
  },
  {
    key: 'lyon-1',
    author: 'tom',
    city: 'lyon',
    caption: 'New set at the gym. The blue one is a lie and I will prove it.',
    practice: 'climbing',
    motif: 'trail',
    hoursAgo: 16,
    appreciatedBy: ['claire', 'paul'],
  },
  {
    key: 'montpellier-1',
    author: 'nour',
    city: 'montpellier',
    caption: 'Wild fennel growing out of a car park wall. Dinner is sorted.',
    practice: 'urban foraging',
    motif: 'garden',
    hoursAgo: 22,
    appreciatedBy: ['sofia', 'rita'],
  },
  {
    key: 'montpellier-2',
    author: 'noa',
    city: 'montpellier',
    caption: 'Market light, six in the evening.',
    practice: 'street photography',
    motif: 'market',
    hoursAgo: 40,
    appreciatedBy: [],
  },
  {
    key: 'kilrush-1',
    author: 'eoin',
    city: 'kilrush',
    caption: 'Tuesday session ran to midnight. Four tunes I had never heard.',
    practice: 'trad music',
    motif: 'stage',
    hoursAgo: 19,
    appreciatedBy: ['marc', 'rita'],
  },
  {
    key: 'porto-1',
    author: 'rita',
    city: 'porto',
    caption: 'Three dings, one afternoon, one very grateful stranger.',
    practice: 'board repair',
    motif: 'workshop',
    hoursAgo: 7,
    appreciatedBy: ['lea', 'nour', 'eoin'],
  },
  {
    key: 'porto-2',
    author: 'lea',
    city: 'porto',
    caption: 'The other half of my year. Same sea, different accent.',
    practice: 'freediving',
    motif: 'sea',
    hoursAgo: 60,
    appreciatedBy: ['rita'],
  },
];

export interface DemoSignal {
  readonly key: string;
  readonly creator: string;
  readonly city: CityKey;
  readonly type: SignalType;
  readonly title: string;
  readonly body: string;
  readonly practice: string | null;
  readonly placeLabel: string | null;
  readonly hoursAgo: number;
  readonly startsInHours: number | null;
  readonly capacity: number | null;
  readonly linkedPost: string | null;
  readonly participants: readonly string[];
}

export const DEMO_SIGNALS: readonly DemoSignal[] = [
  {
    key: 'ajaccio-event',
    creator: 'lea',
    city: 'ajaccio',
    type: 'event',
    title: 'Sunday morning freedive and beach clean',
    body: 'Two hours in the water, one bag each on the way out. Beginners welcome, we stay shallow.',
    practice: 'freediving',
    placeLabel: 'Plage de Capo di Feno, car park end',
    hoursAgo: 28,
    startsInHours: 60,
    capacity: 12,
    linkedPost: 'ajaccio-1',
    participants: ['marc', 'hugo'],
  },
  {
    key: 'ajaccio-offer',
    creator: 'marc',
    city: 'ajaccio',
    type: 'offer',
    title: 'I will look at your instrument for free',
    body: 'Bring it by the workshop. If it needs real work I will tell you honestly what it costs.',
    practice: 'lutherie',
    placeLabel: null,
    hoursAgo: 44,
    startsInHours: null,
    capacity: null,
    linkedPost: 'ajaccio-2',
    participants: [],
  },
  {
    key: 'ajaccio-ask',
    creator: 'ines',
    city: 'ajaccio',
    type: 'ask',
    title: 'Where can I get stickers printed cheaply?',
    body: 'Small run, my own drawings. Ideally somewhere I can walk to.',
    practice: 'illustration',
    placeLabel: null,
    hoursAgo: 8,
    startsInHours: null,
    capacity: null,
    linkedPost: 'ajaccio-3',
    participants: [],
  },
  {
    key: 'bastia-event',
    creator: 'paul',
    city: 'bastia',
    type: 'event',
    title: 'Saturday kids football, spare hands welcome',
    body: 'Two adults short for the session. No coaching experience needed, just patience.',
    practice: 'football coaching',
    placeLabel: 'Stade municipal, gate 2',
    hoursAgo: 36,
    startsInHours: 80,
    capacity: 6,
    linkedPost: 'bastia-1',
    participants: ['nour'],
  },
  {
    key: 'marseille-join',
    creator: 'sofia',
    city: 'marseille',
    type: 'join',
    title: 'Two shelves free in the ceramics studio',
    body: 'Shared kiln, shared electricity bill, shared washing-up arguments.',
    practice: 'ceramics',
    placeLabel: 'Studio near Notre-Dame-du-Mont',
    hoursAgo: 15,
    startsInHours: null,
    capacity: 4,
    linkedPost: 'marseille-1',
    participants: ['yanis'],
  },
  {
    key: 'marseille-ask',
    creator: 'yanis',
    city: 'marseille',
    type: 'ask',
    title: 'Anywhere quiet to record vocals?',
    body: 'My kitchen has a fridge with opinions. Any room with curtains would do.',
    practice: 'beatmaking',
    placeLabel: null,
    hoursAgo: 21,
    startsInHours: null,
    capacity: null,
    linkedPost: 'marseille-2',
    participants: [],
  },
  {
    key: 'paris-offer',
    creator: 'claire',
    city: 'paris',
    type: 'offer',
    title: 'Free bike repairs Sunday morning',
    body: 'Bring the bike and a coffee. I will show you how to do it yourself next time.',
    practice: 'bike repair',
    placeLabel: 'Corner of the canal, by the bench',
    hoursAgo: 12,
    startsInHours: 40,
    capacity: null,
    linkedPost: 'paris-1',
    participants: [],
  },
  {
    key: 'paris-ask',
    creator: 'hugo',
    city: 'paris',
    type: 'ask',
    title: 'Looking for a slow running partner',
    body: 'Six in the morning, canal loop, no talking required for the first kilometre.',
    practice: 'running',
    placeLabel: null,
    hoursAgo: 30,
    startsInHours: null,
    capacity: null,
    linkedPost: null,
    participants: [],
  },
  {
    key: 'lyon-join',
    creator: 'tom',
    city: 'lyon',
    type: 'join',
    title: 'Thursday climbing session, two spots',
    body: 'Indoor, 6a-ish. I will belay you if you belay me.',
    practice: 'climbing',
    placeLabel: 'Gym on the east bank',
    hoursAgo: 18,
    startsInHours: 50,
    capacity: 4,
    linkedPost: 'lyon-1',
    participants: [],
  },
  {
    key: 'montpellier-event',
    creator: 'nour',
    city: 'montpellier',
    type: 'event',
    title: 'Edible plants walk, one hour',
    body: 'We will not leave the neighbourhood. Bring a bag and scepticism.',
    practice: 'urban foraging',
    placeLabel: 'Meet at the tram stop',
    hoursAgo: 25,
    startsInHours: 70,
    capacity: 10,
    linkedPost: 'montpellier-1',
    participants: [],
  },
  {
    key: 'kilrush-join',
    creator: 'eoin',
    city: 'kilrush',
    type: 'join',
    title: 'Tuesday session needs a bodhrán',
    body: 'Back room, half eight. Slow set first so nobody is thrown in the deep end.',
    practice: 'trad music',
    placeLabel: 'Back room, the pub with the green door',
    hoursAgo: 23,
    startsInHours: 90,
    capacity: 8,
    linkedPost: 'kilrush-1',
    participants: [],
  },
  {
    key: 'porto-offer',
    creator: 'rita',
    city: 'porto',
    type: 'offer',
    title: 'Board repairs, materials at cost',
    body: 'I would rather fix your board than watch you buy another one.',
    practice: 'board repair',
    placeLabel: null,
    hoursAgo: 10,
    startsInHours: null,
    capacity: null,
    linkedPost: 'porto-1',
    participants: [],
  },
];

/** A seeded, already-accepted exchange so the threads surface is not empty. */
export const DEMO_THREAD = {
  signal: 'ajaccio-offer',
  responder: 'tom',
  responseMessage: 'I inherited a guitar with a cracked heel. Is that worth looking at?',
  reply: 'Very much so. Bring it Thursday afternoon and we will see what it wants.',
} as const;

export const DEMO_BLOCKS: readonly { readonly blocker: string; readonly blocked: string }[] = [
  { blocker: 'claire', blocked: 'noa' },
  { blocker: 'rita', blocked: 'noa' },
];

export const DEMO_VOUCHES: readonly {
  readonly voucher: string;
  readonly subject: string;
  readonly city: CityKey;
  readonly statement: string;
}[] = [
  { voucher: 'lea', subject: 'hugo', city: 'ajaccio', statement: 'Here every summer since we were children.' },
  { voucher: 'paul', subject: 'hugo', city: 'ajaccio', statement: 'Known him for years through the club.' },
  { voucher: 'marc', subject: 'ines', city: 'ajaccio', statement: 'She is in the workshop most Wednesdays.' },
];

export const DEMO_INVITES: readonly {
  readonly key: string;
  readonly inviter: string;
  readonly city: CityKey;
  readonly acceptedBy: string | null;
}[] = [
  { key: 'ajaccio-1', inviter: 'lea', city: 'ajaccio', acceptedBy: null },
  { key: 'kilrush-1', inviter: 'eoin', city: 'kilrush', acceptedBy: 'rita' },
];
