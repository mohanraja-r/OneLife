/**
 * The antenatal test and scan schedule, as followed in India.
 *
 * Windows are gestational weeks, so every date the screen shows is derived from
 * the due date rather than stored. Protocols vary between hospitals and between
 * pregnancies — this is the common baseline, not a prescription, which is why
 * the screen carries a "consult your doctor" note beside it.
 */

/** What kind of appointment an entry is, for the icon and the grouping. */
export type TestKind = 'scan' | 'blood' | 'vaccine' | 'checkup';

/** One scheduled test, scan or shot in the antenatal schedule. */
export interface TestTemplate {
  /** Stable id — the key user state is filed under, so never renumber these. */
  key: string;
  title: string;
  kind: TestKind;
  /** First gestational week it is normally done. */
  fromWeek: number;
  /** Last gestational week it is normally done. */
  toWeek: number;
  /** One or two lines explaining what it is and why it is done. */
  description: string;
  /** Set when the entry is scheduled off another entry rather than the due
   *  date — the tetanus booster is due four weeks after the first dose. */
  afterKey?: string;
  /** Weeks after `afterKey` was completed. */
  afterWeeks?: number;
}

/**
 * The schedule, in week order. `key` values are permanent: they are what a
 * completed test is recorded against in `pregnancy_data.tests`.
 */
export const TEST_SCHEDULE: TestTemplate[] = [
  {
    key: 'confirm-upt',
    title: 'Pregnancy confirmation (beta hCG)',
    kind: 'blood',
    fromWeek: 4,
    toWeek: 6,
    description:
      'A urine or blood test confirming the pregnancy after a missed period. Blood beta hCG also gives a rough idea of how far along you are.',
  },
  {
    key: 'booking-bloods',
    title: 'Booking bloods',
    kind: 'blood',
    fromWeek: 6,
    toWeek: 10,
    description:
      'The first full panel — CBC, blood group and Rh, HIV, HBsAg, VDRL, TSH, blood sugar and a urine routine. Establishes your baseline for the rest of the pregnancy.',
  },
  {
    key: 'dating-scan',
    title: 'Dating scan',
    kind: 'scan',
    fromWeek: 6,
    toWeek: 9,
    description:
      'Confirms the heartbeat, the number of babies, and fixes your due date more accurately than the last period date does.',
  },
  {
    key: 'nt-scan',
    title: 'NT scan + double marker',
    kind: 'scan',
    fromWeek: 11,
    toWeek: 13,
    description:
      'Measures the fluid at the back of the baby’s neck alongside a blood test, screening for chromosomal conditions. The window is strict — it cannot be done late.',
  },
  {
    key: 'quad-marker',
    title: 'Quadruple marker test',
    kind: 'blood',
    fromWeek: 16,
    toWeek: 18,
    description:
      'A second screening blood test. Usually skipped if you have already had NIPT or the double marker.',
  },
  {
    key: 'tiffa',
    title: 'TIFFA / anomaly scan',
    kind: 'scan',
    fromWeek: 18,
    toWeek: 22,
    description:
      'The detailed anatomy scan, checking every organ as it has formed. The single most important scan of the pregnancy.',
  },
  {
    key: 'tt-1',
    title: 'Tetanus / Td — 1st dose',
    kind: 'vaccine',
    fromWeek: 16,
    toWeek: 24,
    description:
      'Protects both you and the baby against tetanus at delivery. Given early enough that the second dose still fits before term.',
  },
  {
    key: 'tt-2',
    title: 'Tetanus / Td — 2nd dose',
    kind: 'vaccine',
    fromWeek: 20,
    toWeek: 28,
    // Scheduled off the first dose rather than the due date — the gap between
    // the two is what matters, not where they land in the pregnancy.
    afterKey: 'tt-1',
    afterWeeks: 4,
    description:
      'Given four weeks after the first shot. If you have been vaccinated within the last five years, a single booster may be enough — ask your doctor.',
  },
  {
    key: 'ogtt',
    title: 'Glucose challenge test (GCT / OGTT)',
    kind: 'blood',
    fromWeek: 24,
    toWeek: 28,
    description:
      'Screens for gestational diabetes. You drink a measured glucose solution and blood sugar is checked afterwards.',
  },
  {
    key: 'hb-repeat',
    title: 'Haemoglobin repeat',
    kind: 'blood',
    fromWeek: 26,
    toWeek: 30,
    description:
      'Anaemia is common in the second half of pregnancy. This repeat catches a drop early enough to correct it with diet or supplements.',
  },
  {
    key: 'anti-d',
    title: 'Anti-D injection',
    kind: 'vaccine',
    fromWeek: 28,
    toWeek: 30,
    description:
      'Only if your blood group is Rh negative. Prevents your body forming antibodies against the baby’s blood.',
  },
  {
    key: 'growth-scan-1',
    title: 'Growth scan',
    kind: 'scan',
    fromWeek: 28,
    toWeek: 32,
    description:
      'Checks the baby is growing on track, along with the fluid level and the position of the placenta.',
  },
  {
    key: 'growth-doppler',
    title: 'Growth scan + colour Doppler',
    kind: 'scan',
    fromWeek: 32,
    toWeek: 36,
    description:
      'A Doppler measures blood flow through the cord and the baby’s brain and heart, showing how well the placenta is still supplying oxygen and nutrients.',
  },
  {
    key: 'term-checks',
    title: 'Weekly checks + presentation scan',
    kind: 'checkup',
    fromWeek: 36,
    toWeek: 40,
    description:
      'Weekly visits from here. The presentation scan confirms whether the baby has turned head-down ahead of delivery.',
  },
];

/** Looks up a scheduled test by its stable key. */
export function testByKey(key: string): TestTemplate | undefined {
  return TEST_SCHEDULE.find((test) => test.key === key);
}
