/**
 * The pregnancy diet chart — North and South Indian, vegetarian and non-veg,
 * across the three trimesters.
 *
 * Held as structured data rather than images so it reflows on a phone, works
 * with screen readers and text scaling, and can be read by other screens.
 *
 * Two content decisions worth knowing about:
 *
 *  - Iron leads every trimester. Anaemia affects roughly half of pregnancies in
 *    India, and the limiting factor in a mostly vegetarian diet is absorption
 *    rather than intake — so iron foods are always paired with a vitamin C
 *    source rather than listed on their own.
 *  - The avoid list separates what has evidence behind it from what is only
 *    custom, and says which is which. Repeating folklore as fact would make the
 *    genuinely important entries easier to ignore.
 *
 * Portion guidance is general. Anyone with gestational diabetes, a thyroid
 * condition or a twin pregnancy needs their doctor's plan, not this one.
 */

/** Which regional chart is being read. */
export type DietRegion = 'north' | 'south';

/** Which foods a plan may suggest. */
export type DietMode = 'veg' | 'eggetarian' | 'non_veg';

/** One eating occasion in the day plan. */
export interface DietMeal {
  /** When in the day, e.g. `Breakfast`. */
  occasion: string;
  /** Rough clock time, for orientation rather than instruction. */
  time: string;
  /** The vegetarian suggestion — always present. */
  veg: string;
  /** An egg-based variant. Shown to eggetarian and non-veg readers alike,
   *  which is why it is kept apart from `nonVeg` rather than folded into it. */
  egg?: string;
  /** The meat or fish variant, when one differs meaningfully. */
  nonVeg?: string;
}

/** A food to favour, with the reason it earns its place. */
export interface DietFood {
  name: string;
  why: string;
}

/** A food to limit or avoid, and how firm the advice actually is. */
export interface AvoidFood {
  name: string;
  why: string;
  /** `avoid` — good evidence of harm. `limit` — fine in moderation.
   *  `custom` — widely believed in India but weakly evidenced; shown as such. */
  strength: 'avoid' | 'limit' | 'custom';
}

/** A macro or micronutrient target for the trimester. */
export interface NutrientGoal {
  label: string;
  amount: string;
  note: string;
}

/** The full chart for one trimester in one region. */
export interface TrimesterDiet {
  trimester: 1 | 2 | 3;
  /** Week range, e.g. `Week 13 – 27`. */
  weeks: string;
  /** The one-line theme of eating in this trimester. */
  focus: string;
  /** Extra energy over the pre-pregnancy requirement, in kcal. */
  extraCalories: number;
  goals: NutrientGoal[];
  meals: DietMeal[];
  eat: DietFood[];
}

// ---------------------------------------------------------------------------
// Nutrient goals — shared across regions, they differ only by trimester
// ---------------------------------------------------------------------------

const GOALS: Record<1 | 2 | 3, NutrientGoal[]> = {
  1: [
    {
      label: 'Folate',
      amount: '400–600 mcg',
      note: 'Most critical now — the neural tube closes by week 6.',
    },
    {
      label: 'Protein',
      amount: '+1 g/day',
      note: 'Barely above normal yet. Focus on keeping food down.',
    },
    {
      label: 'Iron',
      amount: '27 mg',
      note: 'Start early; stores are drawn on hardest later.',
    },
    {
      label: 'Fluids',
      amount: '2.5–3 L',
      note: 'Helps with nausea, constipation and dizziness.',
    },
  ],
  2: [
    {
      label: 'Iron',
      amount: '27 mg',
      note: 'Blood volume is rising fast. Always pair with vitamin C.',
    },
    {
      label: 'Calcium',
      amount: '1000 mg',
      note: 'The skeleton is mineralising through this trimester.',
    },
    {
      label: 'Protein',
      amount: '+10 g/day',
      note: 'Roughly one extra katori of dal plus a glass of milk.',
    },
    {
      label: 'Energy',
      amount: '+340 kcal',
      note: 'About one substantial extra snack, not a second meal.',
    },
  ],
  3: [
    {
      label: 'Iron',
      amount: '27 mg',
      note: 'Demand peaks now, and delivery costs blood.',
    },
    {
      label: 'Calcium',
      amount: '1000 mg',
      note: 'Most of the baby’s bone mass is laid down in these weeks.',
    },
    {
      label: 'Protein',
      amount: '+31 g/day',
      note: 'The largest increase of the pregnancy.',
    },
    {
      label: 'Fibre',
      amount: '28–30 g',
      note: 'Constipation and reflux both peak in the third trimester.',
    },
  ],
};

// ---------------------------------------------------------------------------
// Day plans
// ---------------------------------------------------------------------------

/**
 * Structured as an Indian eating day — seven small occasions rather than three
 * large meals. That matters more in pregnancy than usual: small and frequent is
 * what works against nausea early on and against reflux and a compressed
 * stomach late on.
 */
const NORTH_MEALS: Record<1 | 2 | 3, DietMeal[]> = {
  1: [
    {
      occasion: 'Early morning',
      time: '6:30 am',
      veg: '5 soaked almonds + 2 dry dates. Dry toast or a plain khakhra first if nausea is bad.',
    },
    {
      occasion: 'Breakfast',
      time: '8:30 am',
      veg: 'Methi or palak paratha with curd, or besan chilla with mint chutney.',
      egg: 'Two boiled eggs with a paratha, or an egg bhurji.',
    },
    {
      occasion: 'Mid-morning',
      time: '11:00 am',
      veg: 'A seasonal fruit — amla, guava or orange. Coconut water if nauseous.',
    },
    {
      occasion: 'Lunch',
      time: '1:30 pm',
      veg: '2 rotis + moong dal + a green sabzi + curd + salad with lemon.',
      nonVeg: 'Swap the dal for a light chicken curry twice a week.',
    },
    {
      occasion: 'Evening',
      time: '4:30 pm',
      veg: 'Sprout chaat with lemon, or a glass of lassi.',
    },
    {
      occasion: 'Dinner',
      time: '8:00 pm',
      veg: 'Moong dal khichdi with ghee, or vegetable dalia. Keep it light.',
    },
    {
      occasion: 'Bedtime',
      time: '10:00 pm',
      veg: 'A glass of warm milk with a pinch of haldi.',
    },
  ],
  2: [
    {
      occasion: 'Early morning',
      time: '6:30 am',
      veg: '5 soaked almonds + 2 walnuts + 2 dates.',
    },
    {
      occasion: 'Breakfast',
      time: '8:30 am',
      veg: 'Stuffed paneer or methi paratha with curd, or poha with peanuts and lemon.',
      egg: 'Egg bhurji with two rotis, or an omelette with vegetables.',
    },
    {
      occasion: 'Mid-morning',
      time: '11:00 am',
      veg: 'Fruit + a glass of milk, or a ragi malt.',
    },
    {
      occasion: 'Lunch',
      time: '1:30 pm',
      veg: '2–3 rotis + rajma or chana + a green sabzi + curd + salad with lemon.',
      nonVeg: 'Chicken or fish curry with rice, three times a week.',
    },
    {
      occasion: 'Evening',
      time: '4:30 pm',
      veg: 'Roasted chana + a glass of buttermilk, or a besan chilla.',
    },
    {
      occasion: 'Dinner',
      time: '8:00 pm',
      veg: '2 rotis + palak dal + a vegetable. Finish two hours before lying down.',
    },
    {
      occasion: 'Bedtime',
      time: '10:00 pm',
      veg: 'Warm milk with haldi, or a small bowl of curd.',
    },
  ],
  3: [
    {
      occasion: 'Early morning',
      time: '6:30 am',
      veg: '5 soaked almonds + 2 walnuts + 2 dates + a soaked fig.',
    },
    {
      occasion: 'Breakfast',
      time: '8:30 am',
      veg: 'Paneer paratha with curd, or vegetable upma with a glass of milk.',
      egg: 'Two eggs any way, with a paratha.',
    },
    {
      occasion: 'Mid-morning',
      time: '11:00 am',
      veg: 'Ragi malt or a fruit + nut bowl. Keep portions small.',
    },
    {
      occasion: 'Lunch',
      time: '1:30 pm',
      veg: '2 rotis + dal + paneer sabzi + curd + salad. Smaller plate, eat again sooner.',
      nonVeg: 'Fish curry with rice, or chicken with roti.',
    },
    {
      occasion: 'Evening',
      time: '4:30 pm',
      veg: 'Sprout chaat, or a bowl of dalia with jaggery.',
    },
    {
      occasion: 'Dinner',
      time: '7:30 pm',
      veg: 'Khichdi with ghee, or 2 rotis with a light sabzi. Early, and small.',
    },
    {
      occasion: 'Bedtime',
      time: '9:30 pm',
      veg: 'Warm milk with haldi. Prop yourself up if reflux is troubling you.',
    },
  ],
};

const SOUTH_MEALS: Record<1 | 2 | 3, DietMeal[]> = {
  1: [
    {
      occasion: 'Early morning',
      time: '6:30 am',
      veg: '5 soaked almonds + 2 dates. A plain arisi murukku or dry idli first if nausea is bad.',
    },
    {
      occasion: 'Breakfast',
      time: '8:30 am',
      veg: '3 idlis with sambar, or pesarattu with ginger chutney.',
      egg: 'Two boiled eggs alongside idli or dosa.',
    },
    {
      occasion: 'Mid-morning',
      time: '11:00 am',
      veg: 'Tender coconut water, or a guava or mosambi.',
    },
    {
      occasion: 'Lunch',
      time: '1:30 pm',
      veg: 'Rice + sambar + a poriyal + rasam + curd. Lemon over the rasam.',
      nonVeg: 'Fish curry (small, low-mercury fish) with rice, twice a week.',
    },
    {
      occasion: 'Evening',
      time: '4:30 pm',
      veg: 'Sundal (chana or peanut), or a glass of neer mor.',
    },
    {
      occasion: 'Dinner',
      time: '8:00 pm',
      veg: 'Curd rice, or 2 idlis with a light sambar.',
    },
    {
      occasion: 'Bedtime',
      time: '10:00 pm',
      veg: 'Warm milk with a pinch of haldi.',
    },
  ],
  2: [
    {
      occasion: 'Early morning',
      time: '6:30 am',
      veg: '5 soaked almonds + 2 walnuts + 2 dates.',
    },
    {
      occasion: 'Breakfast',
      time: '8:30 am',
      veg: 'Ragi dosa or adai with avial, or upma with plenty of vegetables.',
      egg: 'Egg dosa, or two eggs with idli.',
    },
    {
      occasion: 'Mid-morning',
      time: '11:00 am',
      veg: 'Ragi kanji with jaggery, or a fruit with a glass of milk.',
    },
    {
      occasion: 'Lunch',
      time: '1:30 pm',
      veg: 'Rice + kootu + drumstick sambar + poriyal + curd + a lemon wedge.',
      nonVeg: 'Fish or chicken curry with rice, three times a week.',
    },
    {
      occasion: 'Evening',
      time: '4:30 pm',
      veg: 'Sundal, or steamed kozhukattai, or a glass of buttermilk.',
    },
    {
      occasion: 'Dinner',
      time: '8:00 pm',
      veg: 'Adai with avial, or chapati with a vegetable kurma.',
    },
    {
      occasion: 'Bedtime',
      time: '10:00 pm',
      veg: 'Warm milk with haldi, or a small bowl of curd.',
    },
  ],
  3: [
    {
      occasion: 'Early morning',
      time: '6:30 am',
      veg: '5 soaked almonds + 2 walnuts + 2 dates + a soaked fig.',
    },
    {
      occasion: 'Breakfast',
      time: '8:30 am',
      veg: 'Ragi dosa with chutney, or pongal with a little ghee.',
      egg: 'Egg dosa, or two eggs with upma.',
    },
    {
      occasion: 'Mid-morning',
      time: '11:00 am',
      veg: 'Ragi malt with jaggery, or a small fruit bowl.',
    },
    {
      occasion: 'Lunch',
      time: '1:30 pm',
      veg: 'Rice + keerai kootu + sambar + poriyal + curd. Smaller plate, eat again sooner.',
      nonVeg: 'Small fish curry with rice, or chicken pepper fry with chapati.',
    },
    {
      occasion: 'Evening',
      time: '4:30 pm',
      veg: 'Sundal, or ragi kanji. Keep it light if reflux is bad.',
    },
    {
      occasion: 'Dinner',
      time: '7:30 pm',
      veg: 'Curd rice with a poriyal, or 2 idlis. Early, and small.',
    },
    {
      occasion: 'Bedtime',
      time: '9:30 pm',
      veg: 'Warm milk with haldi. Prop yourself up if reflux is troubling you.',
    },
  ],
};

// ---------------------------------------------------------------------------
// Foods to favour
// ---------------------------------------------------------------------------

const NORTH_EAT: Record<1 | 2 | 3, DietFood[]> = {
  1: [
    { name: 'Palak, methi, sarson', why: 'Folate — the single most important nutrient in these weeks.' },
    { name: 'Moong and masoor dal', why: 'Folate and protein, and gentle on a queasy stomach.' },
    { name: 'Amla, orange, guava', why: 'Vitamin C, which is what lets your body absorb iron from dal and greens.' },
    { name: 'Curd and buttermilk', why: 'Calcium plus easy protein when nothing else appeals.' },
    { name: 'Ginger and saunf', why: 'Both genuinely help with morning sickness.' },
  ],
  2: [
    { name: 'Bajra and ragi roti', why: 'Iron and calcium together, far more than wheat alone.' },
    { name: 'Rajma, chana, sprouts', why: 'Protein and iron as demand climbs.' },
    { name: 'Paneer and milk', why: 'Calcium while the skeleton is mineralising.' },
    { name: 'Dates and jaggery', why: 'Iron in a form that goes down easily. Jaggery over refined sugar.' },
    { name: 'Walnuts and flaxseed', why: 'Omega-3 for brain development, without needing fish.' },
  ],
  3: [
    { name: 'Ragi and bajra', why: 'Calcium and iron at the point of peak demand.' },
    { name: 'Paneer, milk, curd', why: 'Most of the baby’s bone mass forms in these weeks.' },
    { name: 'Dates', why: 'Several studies link regular dates late on with a shorter first stage of labour.' },
    { name: 'Papaya (ripe only)', why: 'Fibre and vitamin A. Ripe is fine — it is raw papaya that is not.' },
    { name: 'Isabgol, soaked figs', why: 'Constipation is near-universal now, and both are safe.' },
  ],
};

const SOUTH_EAT: Record<1 | 2 | 3, DietFood[]> = {
  1: [
    { name: 'Keerai (amaranth, spinach)', why: 'Folate — the single most important nutrient in these weeks.' },
    { name: 'Moong and toor dal', why: 'Folate and protein, and gentle on a queasy stomach.' },
    { name: 'Amla, mosambi, guava', why: 'Vitamin C, which is what lets your body absorb iron from dal and greens.' },
    { name: 'Curd and neer mor', why: 'Calcium plus easy protein, and cooling in the heat.' },
    { name: 'Ginger and sukku', why: 'Both genuinely help with morning sickness.' },
  ],
  2: [
    { name: 'Ragi (kezhvaragu)', why: 'The richest everyday calcium source in a South Indian kitchen.' },
    { name: 'Drumstick and its leaves', why: 'Exceptionally high in iron and calcium both.' },
    { name: 'Sundal — chana, peanut', why: 'Protein and iron in a snack that already fits the day.' },
    { name: 'Sesame (ellu) and jaggery', why: 'Calcium and iron. Urundai is an easy way to eat both.' },
    { name: 'Small fish — sardine, mackerel', why: 'Omega-3 and calcium. Small fish, not large predatory ones.' },
  ],
  3: [
    { name: 'Ragi kanji', why: 'Calcium and iron at the point of peak demand, and easy to keep down.' },
    { name: 'Keerai varieties', why: 'Iron and fibre, against both anaemia and constipation.' },
    { name: 'Curd rice', why: 'Calcium, probiotics, and it settles reflux better than most dinners.' },
    { name: 'Dates', why: 'Several studies link regular dates late on with a shorter first stage of labour.' },
    { name: 'Tender coconut water', why: 'Hydration and electrolytes, especially in the heat.' },
  ],
};

// ---------------------------------------------------------------------------
// Foods to avoid — the same everywhere, so it is not split by region
// ---------------------------------------------------------------------------

/**
 * Ordered strongest-evidence first. The `custom` entries are included because
 * people will be told about them regardless, and it is more useful to say what
 * the evidence actually is than to leave them off the list entirely.
 */
export const AVOID_FOODS: AvoidFood[] = [
  {
    name: 'Alcohol',
    strength: 'avoid',
    why: 'No amount has been shown to be safe at any stage.',
  },
  {
    name: 'Raw or semi-ripe papaya',
    strength: 'avoid',
    why: 'The latex in unripe papaya can stimulate uterine contractions. Fully ripe papaya is fine.',
  },
  {
    name: 'Unboiled or unpasteurised milk',
    strength: 'avoid',
    why: 'Listeria and brucella risk. Boil loose milk properly, every time.',
  },
  {
    name: 'Raw or runny eggs',
    strength: 'avoid',
    why: 'Salmonella. This includes homemade mayonnaise and raw cake batter.',
  },
  {
    name: 'Undercooked meat and fish',
    strength: 'avoid',
    why: 'Toxoplasma and listeria. Cook through — no pink, no rare.',
  },
  {
    name: 'Large predatory fish',
    strength: 'avoid',
    why: 'Shark, swordfish, king mackerel and tilefish carry high mercury, which affects the developing brain.',
  },
  {
    name: 'Cut fruit and street food',
    strength: 'avoid',
    why: 'Typhoid, hepatitis A and food poisoning. Pregnancy lowers your immunity, and dehydration from a stomach bug is genuinely dangerous.',
  },
  {
    name: 'Raw sprouts',
    strength: 'limit',
    why: 'Safe cooked or steamed, risky raw — bacteria grow in the sprouting process itself.',
  },
  {
    name: 'Caffeine',
    strength: 'limit',
    why: 'Keep under 200 mg a day. Chai and coffee both count — that is roughly two to three cups.',
  },
  {
    name: 'Ajinomoto and packaged snacks',
    strength: 'limit',
    why: 'High sodium worsens swelling and blood pressure in the third trimester.',
  },
  {
    name: 'Pineapple',
    strength: 'custom',
    why: 'Widely avoided in India. The bromelain that the belief rests on exists mostly in the core and in quantities no one eats. Normal amounts are fine.',
  },
  {
    name: 'Sesame seeds (ellu)',
    strength: 'custom',
    why: 'Often avoided early on. There is no good evidence against culinary amounts, and sesame is a useful calcium source later.',
  },
];

// ---------------------------------------------------------------------------
// Assembly
// ---------------------------------------------------------------------------

const FOCUS: Record<1 | 2 | 3, string> = {
  1: 'Folate, and whatever you can keep down',
  2: 'Iron and calcium as demand climbs',
  3: 'Small, frequent meals — and iron for delivery',
};

const WEEKS: Record<1 | 2 | 3, string> = {
  1: 'Week 1 – 12',
  2: 'Week 13 – 27',
  3: 'Week 28 – 40',
};

const EXTRA_CALORIES: Record<1 | 2 | 3, number> = { 1: 0, 2: 340, 3: 450 };

/** The full diet chart for one trimester in one region. */
export function dietFor(
  trimester: 1 | 2 | 3,
  region: DietRegion
): TrimesterDiet {
  return {
    trimester,
    weeks: WEEKS[trimester],
    focus: FOCUS[trimester],
    extraCalories: EXTRA_CALORIES[trimester],
    goals: GOALS[trimester],
    meals: region === 'north' ? NORTH_MEALS[trimester] : SOUTH_MEALS[trimester],
    eat: region === 'north' ? NORTH_EAT[trimester] : SOUTH_EAT[trimester],
  };
}

/** How many extra calories a trimester needs over the pre-pregnancy baseline. */
export function extraCaloriesFor(trimester: 1 | 2 | 3): number {
  return EXTRA_CALORIES[trimester];
}
