import type { MemoryCategory } from '@/types';

// ============================================================================
// NEUROSAATHI FAMILY MEMORY CHALLENGE — DEMO MEMORY DATASET
//
// These are GENERATED demo memories for the SIH prototype. They are clearly
// fictional and internally consistent: one family, one life story, so the game
// feels like a real photo album rather than random stock pictures.
//
// Every image is a hand-assembled SVG "family photo" rendered as a local data
// URI (no external image API, works fully offline, no text overlays). In
// production, real family photographs would replace these, only with consent.
// ============================================================================

/** A rich, question-generator-ready family memory (superset of FamilyMemory). */
export interface DemoFamilyMemory {
  id: string;
  /** Local static demo image (SVG data URI). */
  image: string;
  title: string;
  people: string[];
  /** relationships[i] describes people[i]. */
  relationships: string[];
  place: string;
  /** Approximate year — used for "when" questions, never an exact claim. */
  year: number;
  event: string;
  description: string;
  category: MemoryCategory;
  /** Base challenge difficulty this memory suits (1..5). */
  difficulty: number;
  /** Names of everyone the elder recognises here (people + relatives). */
  recognisable: string[];
}

// ----------------------------------------------------------------------------
// SVG scene helpers — warm, sepia, "old family photograph" illustrated feel.
// ----------------------------------------------------------------------------

const W = 480;
const H = 320;

/** Person figure: head + body in consistent per-person colours. */
function fig(
  cx: number,
  baseY: number,
  skin: string,
  cloth: string,
  spec?: {
    scale?: number;
    hair?: string;
    width?: number;
  },
): string {
  const s = spec?.scale ?? 1;
  const w = spec?.width ?? 16;
  const headR = 8 * s;
  const dy = baseY - headR * 2;
  return `
    <g>
      <circle cx="${cx}" cy="${dy}" r="${headR}" fill="${skin}" />
      <path d="M${cx - headR * 1.05} ${dy + 3} q${headR * 0.6} ${headR * 1.1} ${headR * 1.05 * 2} 0 l0 ${-headR * 0.5} q${-headR * 0.6} ${-headR * 0.7} ${-headR * 1.05 * 2} 0 z" fill="${spec?.hair ?? '#5a4236'}" />
      <path d="M${cx - w / 2} ${dy + headR * 1.6} q${-w * 0.3} ${baseY - dy - headR * 1.6} ${-w * 0.2} ${baseY - dy - headR * 1.6} l${w} 0 q${w * 0.1} ${-(baseY - dy - headR * 1.6) * 0.4} ${-(w * 0.2)} ${-(baseY - dy - headR * 1.6)} z" fill="${cloth}" />
    </g>`;
}

function clipGroup(inner: string): string {
  return `<clipPath id="mc"><rect x="0" y="0" width="${W}" height="${H}" rx="0"/></clipPath><g clip-path="url(#mc)">${inner}</g>`;
}

/** Wrap inner scene in a warm, sepia-toned, vignetted photographic mat. */
function scene(inner: string): string {
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">
    <defs>
      <radialGradient id="vig" cx="50%" cy="42%" r="75%">
        <stop offset="55%" stop-color="#000" stop-opacity="0"/>
        <stop offset="100%" stop-color="#3d2c1c" stop-opacity="0.42"/>
      </radialGradient>
      <radialGradient id="warm" cx="50%" cy="40%" r="80%">
        <stop offset="0%" stop-color="#fdf3e0"/>
        <stop offset="100%" stop-color="#e8d3ae"/>
      </radialGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#warm)"/>
    ${clipGroup(inner)}
    <rect width="${W}" height="${H}" fill="#f4c98a" opacity="0.16"/>
    <rect width="${W}" height="${H}" fill="url(#vig)"/>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function ground(y: number): string {
  return `<path d="M0 ${y} Q${W / 2} ${y - 26} ${W} ${y} L${W} ${H} L0 ${H} Z" fill="#d9bd8f" opacity="0.85"/>`;
}

function sun(cx: number, cy: number, r: number): string {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#f4c98a" opacity="0.7"/>`;
}

function house(cx: number, baseY: number): string {
  return `
    <rect x="${cx - 46}" y="${baseY - 46}" width="92" height="46" rx="2" fill="#c0885a"/>
    <rect x="${cx - 40}" y="${baseY - 40}" width="86" height="40" fill="#e8c99a"/>
    <path d="M${cx - 56} ${baseY - 46} L${cx} ${baseY - 84} L${cx + 56} ${baseY - 46} Z" fill="#8a5a3b"/>
    <rect x="${cx - 9}" y="${baseY - 26}" width="18" height="26" fill="#7b4f2f"/>
    <rect x="${cx - 34}" y="${baseY - 40}" width="13" height="13" fill="#bfe0df"/>
    <circle cx="${cx}" cy="${baseY - 62}" r="4" fill="#f6e7c8"/>`;
}

function tree(cx: number, baseY: number, s = 1): string {
  return `
    <g>
      <rect x="${cx - 3 * s}" y="${baseY - 34 * s}" width="${6 * s}" height="${34 * s}" fill="#7a5a35"/>
      <circle cx="${cx}" cy="${baseY - 34 * s}" r="${14 * s}" fill="#6f9b52"/>
      <circle cx="${cx - 8 * s}" cy="${baseY - 26 * s}" r="${9 * s}" fill="#81ab62"/>
      <circle cx="${cx + 8 * s}" cy="${baseY - 28 * s}" r="${9 * s}" fill="#689645"/>
    </g>`;
}

function cake(cx: number, baseY: number): string {
  return `
    <rect x="${cx - 26}" y="${baseY - 26}" width="52" height="20" rx="3" fill="#f2b6a0"/>
    <rect x="${cx - 16}" y="${baseY - 12}" width="32" height="12" rx="2" fill="#e8937a"/>
    <rect x="${cx - 4}" y="${baseY - 34}" width="8" height="9" rx="2" fill="#f2c07a"/>
    <path d="M${cx - 8} ${baseY - 34} h16 M${cx - 8} ${baseY - 30} h16" stroke="#fff" stroke-width="1.6"/>
    <circle cx="${cx - 12}" cy="${baseY - 10}" r="2.2" fill="#e8734f"/>
    <circle cx="${cx + 12}" cy="${baseY - 10}" r="2.2" fill="#e8734f"/>`;
}

function balloon(cx: number, baseY: number, color: string): string {
  return `<g>
    <path d="M${cx} ${baseY - 34} q-10 -18 0 -26 q10 8 0 26" fill="${color}" opacity="0.85"/>
    <path d="M${cx} ${baseY - 6} l-1 6 m1 -6 l1 6" stroke="#8a5a3b" stroke-width="1.4" fill="none"/>
  </g>`;
}

function lantern(cx: number, baseY: number, color = '#c96a3d'): string {
  return `
    <rect x="${cx - 7}" y="${baseY - 4}" width="14" height="20" rx="7" fill="${color}" opacity="0.9"/>
    <line x1="${cx - 7}" y1="${baseY - 2}" x2="${cx + 7}" y2="${baseY - 2}" stroke="#8a5a3b" stroke-width="1.6"/>
    <line x1="${cx}" y1="${baseY - 4}" x2="${cx}" y2="${baseY - 12}" stroke="#8a5a3b" stroke-width="1.4"/>`;
}

function book(cx: number, baseY: number, color: string): string {
  return `
    <g>
      <rect x="${cx - 12}" y="${baseY - 7}" width="24" height="7" rx="1.5" fill="${color}"/>
      <rect x="${cx - 12}" y="${baseY - 9}" width="24" height="3" rx="1" fill="${color}" opacity="0.6"/>
      <rect x="${cx - 2}" y="${baseY - 9}" width="3" height="9" fill="#f6e7c8"/>
    </g>`;
}

function cloud(x: number, y: number): string {
  return `<g fill="#fff" opacity="0.9">
    <ellipse cx="${x}" cy="${y}" rx="22" ry="9"/>
    <ellipse cx="${x + 16}" cy="${y - 5}" rx="14" ry="8"/>
    <ellipse cx="${x - 14}" cy="${y - 4}" rx="12" ry="7"/>
  </g>`;
}

function garland(cx: number, baseY: number): string {
  return `
    <path d="M${cx - 40} ${baseY} Q${cx} ${baseY + 18} ${cx + 40} ${baseY}" fill="none" stroke="#c96a3d" stroke-width="2.4"/>
    <circle cx="${cx}" cy="${baseY + 11}" r="5" fill="#e8b93d"/>
    <circle cx="${cx - 24}" cy="${baseY + 6}" r="4" fill="#d98845"/>
    <circle cx="${cx + 24}" cy="${baseY + 6}" r="4" fill="#d98845"/>`;
}

function noise(): string {
  const dots: string[] = [];
  for (let i = 0; i < 60; i += 1) {
    dots.push(`<circle cx="${(i * 137) % W}" cy="${(i * 89) % H}" r="0.7" fill="#3d2c1c" opacity="${(i % 5) * 0.05}"/>`);
  }
  return dots.join('');
}

// ----------------------------------------------------------------------------
// The family — a consistent cast across the whole life story.
// ----------------------------------------------------------------------------

const SKIN = { asha: '#c68f63', ravi: '#b18054', anita: '#c7935f', om: '#b78358', priya: '#d7a575', kavita: '#bb8556', meena: '#c69466' };
const CLOTH = { asha: '#7a5a68', ravi: '#5f6a8a', anita: '#bb7a6a', om: '#6a8a5f', priya: '#e0a35f', kavita: '#8ab3bb', meena: '#aa6a8a' };

// ----------------------------------------------------------------------------
// Demo memories (roughly chronological — one family's story).
// ----------------------------------------------------------------------------

function lightCottage(children: string, people: string): string {
  return scene(`
    ${ground(250)}
    ${sun(410, 70, 40)}
    ${tree(72, 250, 1.1)}
    ${tree(430, 258, 0.9)}
    ${house(250, 250)}
    ${cloud(120, 60)}
    ${cloud(360, 100)}
    ${people}
    ${children}
    ${noise()}
  `);
}

export const DEMO_FAMILY_MEMORIES: DemoFamilyMemory[] = [
  {
    id: 'mem-birthday-priya',
    title: "Priya's birthday at home",
    people: ['Priya', 'Anita', 'Asha'],
    relationships: ['granddaughter', 'daughter', 'you'],
    place: 'Family home',
    year: 2008,
    event: 'Birthday celebration',
    description: "Asha's granddaughter Priya turning eight at home, with a cake and balloons.",
    category: 'birthday',
    difficulty: 1,
    recognisable: ['Priya', 'Anita', 'Asha'],
    image: lightCottage(
      `${cake(300, 240)}${balloon(180, 210, '#e8937a')}${balloon(395, 230, '#8ab3bb')}${garland(250, 230)}${garland(330, 232)}`,
      `${fig(230, 238, SKIN.priya, CLOTH.priya, { scale: 0.7 })}${fig(300, 238, SKIN.anita, CLOTH.anita)}${fig(360, 238, SKIN.asha, CLOTH.asha)}`,
    ),
  },
  {
    id: 'mem-school-priya',
    title: 'Priya at school',
    people: ['Priya'],
    relationships: ['granddaughter'],
    place: 'School',
    year: 2005,
    event: 'A school day',
    description: 'Priya on her first day of primary school, holding a sketchbook.',
    category: 'school',
    difficulty: 1,
    recognisable: ['Priya'],
    image: scene(`
      ${ground(270)}
      ${sun(400, 70, 36)}
      <rect x="120" y="150" width="240" height="120" rx="4" fill="#c98a5a"/>
      <rect x="160" y="110" width="160" height="44" rx="4" fill="#a96f45"/>
      <circle cx="240" cy="132" r="16" fill="#f6e7c8"/>
      <path d="M240 116 v16" stroke="#8a5a3b" stroke-width="3"/>
      <rect x="206" y="208" width="26" height="62" fill="#7b4f2f"/>
      <rect x="248" y="208" width="26" height="62" fill="#7b4f2f"/>
      ${tree(66, 272, 1)}
      ${book(300, 250, '#e0a35f')}
      ${fig(300, 252, SKIN.priya, CLOTH.priya, { scale: 0.72 })}
      ${cloud(120, 60)}
      ${noise()}
    `),
  },
  {
    id: 'mem-festival-lights',
    title: 'Home festival with lamps',
    people: ['Asha', 'Ravi', 'Kavita'],
    relationships: ['you', 'husband', 'daughter-in-law'],
    place: 'Family home',
    year: 2016,
    event: 'Festival of lights',
    description: 'Diwali at home — lamps on the steps and family together.',
    category: 'festival',
    difficulty: 2,
    recognisable: ['Asha', 'Ravi', 'Kavita'],
    image: scene(`
      ${ground(250)}
      <rect x="0" y="250" width="${W}" height="70" fill="#3a2c1e"/>
      <path d="M0 250 L80 218 L160 250 L240 218 L320 250 L400 218 L480 250 Z" fill="#8a5a3b"/>
      ${lantern(120, 240, '#e8b93d')}${lantern(220, 240, '#c96a3d')}${lantern(340, 240, '#e8b93d')}${lantern(430, 240, '#d98845')}
      ${fig(200, 248, SKIN.asha, CLOTH.asha)}${fig(268, 248, SKIN.ravi, CLOTH.ravi)}${fig(336, 248, SKIN.kavita, CLOTH.kavita)}
      <circle cx="360" cy="70" r="34" fill="#e8b93d" opacity="0.5"/>
      ${noise()}
    `),
  },
  {
    id: 'mem-travel-hills',
    title: 'Family trip to the hills',
    people: ['Ravi', 'Asha'],
    relationships: ['husband', 'you'],
    place: 'Hill station',
    year: 2010,
    event: 'Family holiday',
    description: 'A mountain road trip with tea stops — one of the happiest trips.',
    category: 'travel',
    difficulty: 2,
    recognisable: ['Ravi', 'Asha'],
    image: scene(`
      <circle cx="420" cy="70" r="32" fill="#f4c98a" opacity="0.7"/>
      <path d="M0 180 L120 96 L240 180 L360 96 L480 180 Z" fill="#7a9a6a"/>
      <path d="M0 210 L160 130 L320 210 L480 136 Z" fill="#6a8a5a"/>
      ${ground(258)}
      <g>
        <path d="M120 180 L180 180 170 200 130 200 Z" fill="#c0885a"/>
        <circle cx="150" cy="176" r="14" fill="#8a5a3b"/>
        <circle cx="140" cy="176" r="4" fill="#6a5a4a"/>
      </g>
      ${fig(250, 244, SKIN.ravi, CLOTH.ravi)}${fig(320, 244, SKIN.asha, CLOTH.asha)}
      ${cloud(90, 60)}${cloud(300, 40)}
      ${noise()}
    `),
  },
  {
    id: 'mem-wedding-anita',
    title: "Anita's wedding",
    people: ['Anita', 'Om', 'Asha'],
    relationships: ['daughter', 'son', 'you'],
    place: 'Wedding hall',
    year: 1996,
    event: 'Wedding celebration',
    description: 'A family wedding — garlands and music and everyone together.',
    category: 'wedding',
    difficulty: 3,
    recognisable: ['Anita', 'Om', 'Asha'],
    image: scene(`
      ${ground(250)}
      ${lantern(120, 230, '#c96a3d')}${lantern(360, 230, '#e8b93d')}
      <g>
        <path d="M160 250 q70 -40 140 0 Z" fill="#d98845" opacity="0.85"/>
        <rect x="184" y="238" width="92" height="12" rx="3" fill="#a96f45"/>
      </g>
      ${fig(216, 244, SKIN.anita, CLOTH.anita, { hair: '#4a3226' })}${fig(292, 244, SKIN.om, CLOTH.om)}${fig(356, 246, SKIN.asha, CLOTH.asha)}
      ${garland(240, 250)}
      ${noise()}
    `),
  },
  {
    id: 'mem-childhood-home',
    title: 'The old village home',
    people: ['Asha', 'Meena'],
    relationships: ['you', 'sister'],
    place: 'Childhood village home',
    year: 1990,
    event: 'Childhood summers',
    description: 'Summers in the village — Asha and her sister Meena by the courtyard.',
    category: 'childhood',
    difficulty: 2,
    recognisable: ['Asha', 'Meena'],
    image: lightCottage(
      `${fig(210, 238, SKIN.asha, CLOTH.asha, { scale: 0.7 })}${fig(286, 238, SKIN.meena, CLOTH.meena, { scale: 0.72 })}`,
      `${ground(250)}${house(250, 250)}${tree(60, 254, 1)}${tree(430, 256, 0.9)}`,
    ),
  },
  {
    id: 'mem-gathering-wedding',
    title: 'A family group photograph',
    people: ['Ravi', 'Anita', 'Om', 'Kavita'],
    relationships: ['husband', 'daughter', 'son', 'daughter-in-law'],
    place: 'Family gathering',
    year: 2018,
    event: 'Family reunion',
    description: 'A full-family portrait at a reunion — everyone standing together.',
    category: 'family',
    difficulty: 3,
    recognisable: ['Ravi', 'Anita', 'Om', 'Kavita'],
    image: scene(`
      ${ground(250)}
      <rect x="20" y="40" width="140" height="90" rx="3" fill="#c98a5a" opacity="0.9"/>
      <rect x="28" y="48" width="124" height="74" fill="#e8d3ae"/>
      ${fig(150, 246, SKIN.ravi, CLOTH.ravi)}${fig(220, 246, SKIN.anita, CLOTH.anita)}${fig(290, 246, SKIN.om, CLOTH.om)}${fig(360, 246, SKIN.kavita, CLOTH.kavita)}
      ${tree(60, 252, 0.95)}${tree(432, 254, 1)}
      ${noise()}
    `),
  },
  {
    id: 'mem-picnic-park',
    title: 'Family picnic in the park',
    people: ['Kavita', 'Priya', 'Asha'],
    relationships: ['daughter-in-law', 'granddaughter', 'you'],
    place: 'Park',
    year: 2014,
    event: 'A weekend picnic',
    description: 'A summer picnic with a laid-out sheet and home-made snacks.',
    category: 'friends',
    difficulty: 2,
    recognisable: ['Kavita', 'Priya', 'Asha'],
    image: scene(`
      ${ground(248)}
      ${sun(420, 66, 32)}
      ${tree(60, 254, 1.1)}${tree(430, 256, 1)}
      <path d="M150 246 L330 246 L300 276 L180 276 Z" fill="#e0c79a"/>
      ${fig(190, 244, SKIN.kavita, CLOTH.kavita)}${fig(250, 244, SKIN.priya, CLOTH.priya, { scale: 0.72 })}${fig(310, 246, SKIN.asha, CLOTH.asha)}
      ${cloud(120, 60)}${cloud(340, 40)}
      ${noise()}
    `),
  },
  {
    id: 'mem-grandparents',
    title: 'With grandparents at the courtyard',
    people: ['Ravi', 'Asha'],
    relationships: ['husband', 'you'],
    place: 'Grandparents courtyard',
    year: 2002,
    event: 'Afternoon visits',
    description: 'Quiet evenings with tea on the courtyard bench.',
    category: 'place',
    difficulty: 1,
    recognisable: ['Ravi', 'Asha'],
    image: scene(`
      ${ground(240)}
      <rect x="60" y="200" width="360" height="18" rx="8" fill="#a96f45"/>
      <g>
        <rect x="110" y="120" width="260" height="90" rx="4" fill="#c98a5a"/>
        <path d="M110 120 v-20 q0-12 14-12 h232 q14 0 14 12 v20 Z" fill="#8a5a3b"/>
      </g>
      ${fig(190, 240, SKIN.ravi, CLOTH.ravi)}${fig(268, 240, SKIN.asha, CLOTH.asha)}
      <g>
        <circle cx="404" cy="206" r="10" fill="#c68f63"/>
        <rect x="392" y="214" width="24" height="9" rx="2" fill="#b18054"/>
      </g>
      ${tree(70, 250, 1)}${tree(430, 250, 0.9)}${noise()}
    `),
  },
  {
    id: 'mem-temple-festival',
    title: 'Temple visit during a festival',
    people: ['Anita', 'Asha'],
    relationships: ['daughter', 'you'],
    place: 'Village temple',
    year: 2012,
    event: 'Temple festival',
    description: 'A shared visit to the temple during a local festival.',
    category: 'festival',
    difficulty: 3,
    recognisable: ['Anita', 'Asha'],
    image: scene(`
      ${ground(252)}
      ${sun(420, 64, 30)}
      <g>
        <path d="M200 252 L180 252 170 212 196 208 190 180 214 176 228 196 236 150 260 196 256 214 286 208 276 240 252 252 Z" fill="#c98a5a"/>
        <circle cx="226" cy="236" r="7" fill="#c9895a"/>
        <path d="M212 176 L226 158 240 176 Z" fill="#8a5a3b"/>
      </g>
      ${lantern(300, 214, '#e8b93d')}${lantern(340, 214, '#c96a3d')}
      ${fig(190, 246, SKIN.anita, CLOTH.anita)}${fig(270, 246, SKIN.asha, CLOTH.asha)}
      ${noise()}
    `),
  },
  {
    id: 'mem-gardening',
    title: "Asha's garden corner",
    people: ['Asha'],
    relationships: ['you'],
    place: 'Home garden',
    year: 2020,
    event: 'Morning gardening',
    description: 'The vegetable patch and marigolds that Asha tends most mornings.',
    category: 'home',
    difficulty: 1,
    recognisable: ['Asha'],
    image: scene(`
      ${ground(230)}
      <rect x="40" y="150" width="${W - 80}" height="8" fill="#8a5a3b" opacity="0.5"/>
      <rect x="60" y="150" width="60" height="80" fill="#6f9b52" opacity="0.8"/>
      <rect x="120" y="150" width="60" height="90" fill="#5b8a44" opacity="0.8"/>
      <rect x="180" y="150" width="60" height="70" fill="#6f9b52" opacity="0.8"/>
      ${sun(420, 74, 34)}
      ${fig(330, 248, SKIN.asha, CLOTH.asha)}
      <circle cx="90" cy="160" r="6" fill="#f0c05a"/>
      <circle cx="150" cy="155" r="6" fill="#e8937a"/>
      ${cloud(120, 56)}${noise()}
    `),
  },
  {
    id: 'mem-first-moto',
    title: 'Om and the first motorbike',
    people: ['Om', 'Asha'],
    relationships: ['son', 'you'],
    place: 'Outside the family house',
    year: 2004,
    event: "Om's new motorbike",
    description: "The day Om brought his first motorbike home.",
    category: 'home',
    difficulty: 2,
    recognisable: ['Om', 'Asha'],
    image: scene(`
      ${ground(250)}
      ${house(250, 250)}
      <g>
        <rect x="300" y="236" width="90" height="22" rx="8" fill="#5f6a8a"/>
        <circle cx="318" cy="262" r="12" fill="#3a2c1e"/>
        <circle cx="382" cy="262" r="12" fill="#3a2c1e"/>
        <circle cx="318" cy="262" r="5" fill="#8a8a8a"/>
        <circle cx="382" cy="262" r="5" fill="#8a8a8a"/>
      </g>
      ${fig(336, 246, SKIN.om, CLOTH.om)}
      ${tree(60, 252, 1)}${noise()}
    `),
  },
];

export const DEMO_MEMORY_CATEGORIES: MemoryCategory[] = [
  'childhood',
  'family',
  'festival',
  'birthday',
  'school',
  'travel',
  'home',
  'wedding',
  'friends',
  'place',
];

export function demoMemoryById(id: string): DemoFamilyMemory | undefined {
  return DEMO_FAMILY_MEMORIES.find((m) => m.id === id);
}

export function demoMemoriesForDifficulty(d: number): DemoFamilyMemory[] {
  const suitable = DEMO_FAMILY_MEMORIES.filter((m) => m.difficulty <= d);
  return (suitable.length ? suitable : DEMO_FAMILY_MEMORIES).sort(() => Math.random() - 0.5);
}