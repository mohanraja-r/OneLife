/**
 * The hospital bag checklist, written for an Indian hospital admission.
 *
 * Two bags at the top level, categories inside each. The catalogue lives here
 * rather than in the database because it is the same for everyone — only the
 * ticks are per-user, and those are a set of ids in `pregnancy_data.bag`.
 *
 * The document list is the part that generic checklists get wrong. Indian
 * hospitals commonly ask for the marriage certificate and both PAN cards at
 * admission, and passport photos are needed for the birth certificate
 * application afterwards — none of which appear on international lists.
 */

/** Which of the two bags an item belongs to. */
export type BagSide = 'mom' | 'baby';

/** One packable item. */
export interface BagItem {
  /** Stable id — what a ticked item is stored as, so never renumber these. */
  id: string;
  name: string;
  /** One line on why it is worth packing. */
  note: string;
  /** How many to pack, when a number is genuinely useful. */
  quantity?: string;
}

/** A collapsible group of items within one bag. */
export interface BagCategory {
  id: string;
  title: string;
  side: BagSide;
  items: BagItem[];
}

/** Every category, in display order, both bags. */
export const BAG_CATEGORIES: BagCategory[] = [
  // -------------------------------------------------------------- Mom
  {
    id: 'documents',
    title: 'Documents',
    side: 'mom',
    items: [
      {
        id: 'doc-anc-card',
        name: 'ANC card',
        note: 'Your antenatal card with every visit recorded. The first thing admissions will ask for.',
      },
      {
        id: 'doc-aadhaar',
        name: 'Aadhaar cards',
        note: 'Yours and your husband’s. Needed for admission and for the birth certificate.',
        quantity: 'Both',
      },
      {
        id: 'doc-pan',
        name: 'PAN cards',
        note: 'Commonly asked for at admission alongside Aadhaar.',
        quantity: 'Both',
      },
      {
        id: 'doc-marriage',
        name: 'Marriage certificate',
        note: 'Required by many Indian hospitals at admission. Carry a photocopy too.',
      },
      {
        id: 'doc-insurance',
        name: 'Insurance card + policy papers',
        note: 'Cashless admission stalls without the policy number to hand.',
      },
      {
        id: 'doc-tpa',
        name: 'TPA pre-authorisation forms',
        note: 'Get these started before you go in, not from the admission desk.',
      },
      {
        id: 'doc-govt-scheme',
        name: 'Ayushman Bharat / ESI card',
        note: 'If you are covered under either scheme.',
      },
      {
        id: 'doc-file',
        name: 'Doctor’s file',
        note: 'Every prescription and note from the whole pregnancy, in one folder.',
      },
      {
        id: 'doc-reports',
        name: 'Blood test reports',
        note: 'Especially your blood group, Rh status and the most recent haemoglobin.',
      },
      {
        id: 'doc-scans',
        name: 'Scan reports',
        note: 'All of them, with the last ultrasound on top.',
      },
      {
        id: 'doc-photos',
        name: 'Passport-size photos',
        note: 'For the birth certificate application. Nobody remembers these.',
        quantity: '4–6',
      },
    ],
  },
  {
    id: 'mom-clothing',
    title: 'Mom clothing',
    side: 'mom',
    items: [
      {
        id: 'mom-nighties',
        name: 'Front-open nighties',
        note: 'Front opening matters — you cannot feed in a regular kurta.',
        quantity: '3–4',
      },
      {
        id: 'mom-nursing-bras',
        name: 'Nursing bras',
        note: 'A size up from now. You will change them often.',
        quantity: '2–3',
      },
      {
        id: 'mom-underwear',
        name: 'Disposable underwear',
        note: 'Worth it for the first few days. Regular ones will not survive.',
        quantity: '1 pack',
      },
      {
        id: 'mom-pads',
        name: 'Maternity pads',
        note: 'Maternity, not sanitary — the flow after delivery is much heavier.',
        quantity: '2 packs',
      },
      {
        id: 'mom-shawl',
        name: 'Dupatta or shawl',
        note: 'Hospital ACs run cold, and it doubles as a feeding cover.',
      },
      {
        id: 'mom-slippers',
        name: 'Slippers with grip',
        note: 'Floors are wet and you will be unsteady on your feet.',
      },
      {
        id: 'mom-going-home',
        name: 'Going-home outfit',
        note: 'Loose. You will still look about six months pregnant.',
      },
      {
        id: 'mom-socks',
        name: 'Warm socks',
        note: 'Feet get very cold during and after labour.',
      },
    ],
  },
  {
    id: 'mom-essentials',
    title: 'Essentials',
    side: 'mom',
    items: [
      {
        id: 'mom-bedsheet',
        name: 'Bedsheet + towel',
        note: 'Most Indian hospitals expect you to bring your own.',
      },
      {
        id: 'mom-thermos',
        name: 'Thermos flask',
        note: 'Warm water on demand, at 3am, without asking anyone.',
      },
      {
        id: 'mom-containers',
        name: 'Food containers + steel tumbler',
        note: 'For the food that will arrive from home.',
      },
      {
        id: 'mom-hot-bag',
        name: 'Hot water bag',
        note: 'For after-pains and for engorgement in the first week.',
      },
      {
        id: 'mom-charger',
        name: 'Phone + long charging cable',
        note: 'Sockets are never near the bed. Get the long one.',
      },
      {
        id: 'mom-cash',
        name: 'Cash + cards',
        note: 'Some hospital counters and the pharmacy still want cash.',
      },
      {
        id: 'mom-snacks',
        name: 'Dry snacks',
        note: 'Dates, nuts, biscuits. Labour is long and canteens close.',
      },
      {
        id: 'mom-pillow',
        name: 'Feeding pillow',
        note: 'Saves your back and shoulders in the first difficult days.',
      },
    ],
  },
  {
    id: 'mom-toiletries',
    title: 'Toiletries',
    side: 'mom',
    items: [
      {
        id: 'mom-toothbrush',
        name: 'Toothbrush + toothpaste',
        note: 'Travel size is enough for the stay.',
      },
      {
        id: 'mom-facewash',
        name: 'Face wash + moisturiser',
        note: 'Hospital AC is drying, and so is the IV.',
      },
      {
        id: 'mom-lipbalm',
        name: 'Lip balm',
        note: 'You will be breathing through your mouth for hours.',
      },
      {
        id: 'mom-hairties',
        name: 'Hair ties + clip',
        note: 'Hair out of your face, for labour and for feeding.',
      },
      {
        id: 'mom-wipes',
        name: 'Wet wipes + tissues',
        note: 'For everything, constantly.',
      },
      {
        id: 'mom-comb',
        name: 'Comb, soap, shampoo',
        note: 'That first shower afterwards is worth preparing for.',
      },
    ],
  },

  // ------------------------------------------------------------- Baby
  {
    id: 'baby-feeding',
    title: 'Feeding',
    side: 'baby',
    items: [
      {
        id: 'baby-burp-cloths',
        name: 'Burp cloths / soft napkins',
        note: 'You will get through more than you expect.',
        quantity: '5–6',
      },
      {
        id: 'baby-nipple-cream',
        name: 'Nipple cream',
        note: 'Start using it before it hurts, not after.',
      },
      {
        id: 'baby-bottles',
        name: 'Sterilised bottles',
        note: 'Only if you are planning to use them — ask your paediatrician first.',
      },
      {
        id: 'baby-bibs',
        name: 'Cotton bibs',
        note: 'For dribbles between feeds.',
        quantity: '2–3',
      },
      {
        id: 'baby-katori',
        name: 'Small steel katori + spoon',
        note: 'Some hospitals use paladai feeding in the first days.',
      },
    ],
  },
  {
    id: 'baby-diapering',
    title: 'Diapering',
    side: 'baby',
    items: [
      {
        id: 'baby-newborn-diapers',
        name: 'Newborn diapers',
        note: 'One small pack. Babies outgrow the newborn size quickly.',
        quantity: '1 pack',
      },
      {
        id: 'baby-langot',
        name: 'Cotton langot / nappies',
        note: 'Gentler on new skin than diapers, and what most families use at home.',
        quantity: '10–12',
      },
      {
        id: 'baby-wipes',
        name: 'Baby wipes',
        note: 'Fragrance-free, alcohol-free.',
      },
      {
        id: 'baby-rash-cream',
        name: 'Diaper rash cream',
        note: 'Better to have it before you need it.',
      },
      {
        id: 'baby-changing-sheet',
        name: 'Waterproof changing sheet',
        note: 'For the hospital bed and the journey home.',
        quantity: '2',
      },
      {
        id: 'baby-cotton',
        name: 'Cotton wool',
        note: 'Warm water and cotton is what most hospitals use for the first few days.',
      },
    ],
  },
  {
    id: 'baby-clothing',
    title: 'Baby clothing',
    side: 'baby',
    items: [
      {
        id: 'baby-jhablas',
        name: 'Cotton jhablas / onesies',
        note: 'Front-tie cotton is easiest over a fresh cord stump.',
        quantity: '4–5',
      },
      {
        id: 'baby-swaddle',
        name: 'Swaddle cloths',
        note: 'Soft muslin. Being wrapped settles a newborn faster than anything.',
        quantity: '3–4',
      },
      {
        id: 'baby-mittens',
        name: 'Mittens + booties',
        note: 'Newborn nails are sharp and they scratch their own faces.',
        quantity: '2 pairs',
      },
      {
        id: 'baby-caps',
        name: 'Caps',
        note: 'Most heat is lost through the head in the first weeks.',
        quantity: '2',
      },
      {
        id: 'baby-towel',
        name: 'Hooded towel',
        note: 'Soft, and large enough to wrap completely.',
      },
      {
        id: 'baby-blanket',
        name: 'Soft blanket',
        note: 'For the AC ward and the drive home.',
      },
      {
        id: 'baby-going-home',
        name: 'Going-home outfit',
        note: 'Weather-appropriate. Photos will be taken.',
      },
    ],
  },
  {
    id: 'baby-care',
    title: 'Baby care',
    side: 'baby',
    items: [
      {
        id: 'baby-oil',
        name: 'Massage oil',
        note: 'Coconut or a mild baby oil. A daily massage is worth keeping up.',
      },
      {
        id: 'baby-soap',
        name: 'Baby soap + shampoo',
        note: 'Mild and fragrance-free for new skin.',
      },
      {
        id: 'baby-pillow',
        name: 'Mustard-seed pillow',
        note: 'Traditional, and it does keep the head from flattening on one side.',
      },
      {
        id: 'baby-nail-file',
        name: 'Baby nail file',
        note: 'A file, not clippers — their nails are far too soft to cut.',
      },
      {
        id: 'baby-thermometer',
        name: 'Digital thermometer',
        note: 'Any fever in a newborn needs a doctor the same day.',
      },
    ],
  },
];

/** Every category belonging to one bag. */
export function categoriesFor(side: BagSide): BagCategory[] {
  return BAG_CATEGORIES.filter((category) => category.side === side);
}

/** How many items one bag holds in total. */
export function totalItemsFor(side: BagSide): number {
  return categoriesFor(side).reduce(
    (total, category) => total + category.items.length,
    0
  );
}

/** Every item id in the catalogue, for validating stored state. */
export function allItemIds(): string[] {
  return BAG_CATEGORIES.flatMap((category) =>
    category.items.map((item) => item.id)
  );
}
