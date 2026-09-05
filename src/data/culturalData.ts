import type { Region } from '@/types';

// Culturally familiar objects/scenes per NER region.
// Kept respectful and non-stereotypical — everyday objects a person might know.
export interface RegionInfo {
  code: Region;
  name: string;
  emoji: string;
  tagline: string;
  // objects used for memory-match style games
  objects: string[];
  // scene elements + question templates used in "Remember the Scene"
  scene: string[];
}

export const REGIONS: RegionInfo[] = [
  {
    code: 'assam',
    name: 'Assam',
    emoji: '🍃',
    tagline: 'Tea gardens, rivers and warm homes',
    objects: ['Gamusa', 'Tea cup', 'Bamboo basket', 'Rice bowl', 'Umbrella', 'Traditional home', 'Flower', 'Bicycle'],
    scene: ['a bamboo house', 'a gamusa hanging by the door', 'tea cups on the table', 'a fruit basket', 'a bicycle near the gate', 'a school bag', 'pots of plants', 'a shawl on the chair'],
  },
  {
    code: 'arunachal',
    name: 'Arunachal Pradesh',
    emoji: '🏔️',
    tagline: 'Hills, rivers and forest homes',
    objects: ['Bamboo basket', 'Shawl', 'Tea cup', 'Rice bowl', 'Umbrella', 'Flower', 'Water bottle', 'House'],
    scene: ['a hillside home', 'a bamboo basket', 'warm shawls', 'tea cups', 'a fruit basket', 'plants by the window', 'a school bag', 'a bicycle'],
  },
  {
    code: 'manipur',
    name: 'Manipur',
    emoji: '🎭',
    tagline: 'Lakes, crafts and warm households',
    objects: ['Tea cup', 'Rice bowl', 'Traditional clothing', 'Bamboo basket', 'Umbrella', 'Flower', 'Bicycle', 'House'],
    scene: ['a home by the lake', 'traditional clothing folded', 'tea cups on a low table', 'a fruit basket', 'a bamboo basket', 'plants', 'a bicycle', 'a school bag'],
  },
  {
    code: 'meghalaya',
    name: 'Meghalaya',
    emoji: '🌧️',
    tagline: 'Green hills and bustling markets',
    objects: ['Bamboo basket', 'Umbrella', 'Local market basket', 'Shawl', 'Tea cup', 'Rice bowl', 'Flower', 'Bicycle'],
    scene: ['a market stall', 'bamboo baskets', 'umbrellas', 'a fruit basket', 'a shawl', 'tea cups', 'plants', 'a school bag'],
  },
  {
    code: 'mizoram',
    name: 'Mizoram',
    emoji: '🏡',
    tagline: 'Hillside homes and close communities',
    objects: ['Bamboo basket', 'Tea cup', 'Shawl', 'Rice bowl', 'Umbrella', 'Traditional clothing', 'Flower', 'House'],
    scene: ['a hillside home', 'a bamboo basket', 'tea cups', 'a fruit basket', 'a shawl', 'traditional clothing', 'plants', 'a bicycle'],
  },
  {
    code: 'nagaland',
    name: 'Nagaland',
    emoji: '🧶',
    tagline: 'Textiles, craft and warm homes',
    objects: ['Traditional textile', 'Bamboo basket', 'Tea cup', 'Rice bowl', 'Shawl', 'Umbrella', 'Flower', 'House'],
    scene: ['traditional textiles', 'a bamboo basket', 'tea cups', 'a fruit basket', 'a shawl', 'woven cloth', 'plants', 'a school bag'],
  },
  {
    code: 'sikkim',
    name: 'Sikkim',
    emoji: '❄️',
    tagline: 'Mountains, monasteries and home',
    objects: ['Tea cup', 'Rice bowl', 'Shawl', 'Bamboo basket', 'Umbrella', 'Flower', 'Bicycle', 'Water bottle'],
    scene: ['a mountain home', 'tea cups', 'a fruit basket', 'a shawl', 'bamboo basket', 'plants', 'a school bag', 'a bicycle'],
  },
  {
    code: 'tripura',
    name: 'Tripura',
    emoji: '🛕',
    tagline: 'Forests, rivers and warm homes',
    objects: ['Bamboo basket', 'Tea cup', 'Rice bowl', 'Shawl', 'Umbrella', 'Traditional clothing', 'Flower', 'House'],
    scene: ['a forest-side home', 'a bamboo basket', 'tea cups', 'a fruit basket', 'a shawl', 'plants', 'a bicycle', 'a school bag'],
  },
];

export function getRegion(code: Region): RegionInfo {
  return REGIONS.find((r) => r.code === code) ?? REGIONS[0];
}

// Emoji rendering map for object names (demo-friendly illustrations).
export const OBJECT_EMOJI: Record<string, string> = {
  Gamusa: '🧣',
  'Tea cup': '🍵',
  'Bamboo basket': '🧺',
  'Rice bowl': '🍚',
  Umbrella: '☂️',
  'Traditional home': '🏠',
  Flower: '🌸',
  Bicycle: '🚲',
  'Water bottle': '💧',
  Shawl: '🧥',
  House: '🏠',
  'Traditional clothing': '👘',
  'Local market basket': '🧺',
  'Traditional textile': '🧶',
  'Woven cloth': '🪢',
  'Fruit basket': '🍇',
  Schoolbag: '🎒',
};

export function emojiFor(name: string): string {
  return OBJECT_EMOJI[name] ?? '🌿';
}
