import { articleFor, normalizeUserId, selectFrom } from './util';

export const flood = (user_id: string): string => {
  console.debug({user_id});

  if (Math.random() < 0.1 || !user_id) return selectFrom(OneOffs);

  return chilify(user_id);
};

export const chilify = (user_id: string): string => {
  const appetizer = `gives ${normalizeUserId(user_id)}`;

  let entree = `chili ${selectFrom(DeliveryDevices)}`;
  if (Math.random() < 0.5) {
    entree = `${selectFrom(Adjectives)} ${entree}`;
  }
  entree = `${articleFor(entree)} ${entree}`;

  if (Math.random() < 0.2) {
    const side = selectFrom(Sides);
    entree = `${entree} with ${side}`;
  }

  return `_${appetizer} ${entree}_` ?? selectFrom(OneOffs);
}

const Adjectives = [
  'animal style',
  'appreciative',
  'canadian',
  'cheetah',
  'cold',
  'double',
  'east coast',
  'elastic',
  'emergency',
  'evening',
  'frothy',
  'golden',
  'late',
  'late night',
  'morning',
  'pink',
  'power',
  'quantum',
  'red',
  'saturday',
  'standing',
  'value',
  'virtual',
];

const DeliveryDevices = [
  'amoeba',
  'animal',
  'anteater',
  'bear',
  'blue whale',
  'brontosaurus',
  'bug',
  'canal',
  'cat',
  'chicken',
  'chinchilla',
  'coelecanth',
  'dire wolf',
  'dog',
  'doge',
  'donut',
  'dragon',
  'elephant',
  'enchilada',
  'ferret',
  'ghost',
  'godzilla',
  'hug',
  'jellyfish',
  'kangaroo',
  'mammoth',
  'monkey',
  'monster',
  'moose',
  'nuke',
  'opossum',
  'owl',
  'pangolin',
  'penis',
  'pig',
  'platypus',
  'polar bear',
  'pufferfish',
  'puma',
  'saint bernard',
  'skunk',
  'snake',
  'sock',
  'space reptile',
  'sperm whale',
  'sundae',
  'tapir',
  'troll',
  'unicorn',
  'vat',
  'walrus',
  'warthog',
  'weasel',
  'whale',
  'wolf',
  'wolverine',
];

const OneOffs = [
  'My hobbies include splitting wood and giving chili dogs.',
  'Tis better to give than receive chili dogs!',
  '_reads the latest chilizoological report_',
];

const Sides = [
  'a blue sock',
  'a coco dongle',
  'cold semen',
  'mayo',
  'muppet sauce',
  'mustard',
  'a pink sock',
  'a red sock',
];

