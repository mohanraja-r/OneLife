/**
 * Week-by-week development highlights for the Baby Growth screen.
 *
 * `BABY_SIZES` in `services/women.ts` already carries the size comparison and a
 * one-line fact; this is the longer list that screen shows underneath. Kept
 * separate so the size chart stays a compact lookup.
 *
 * Head circumference is only listed from week 12 — before that the measurement
 * is not routinely reported, and showing a number nobody's scan will match is
 * worse than showing nothing.
 */

/** What one gestational week adds, for the highlights list. */
export interface WeekDetail {
  week: number;
  /** Three or four short lines, each a complete sentence. */
  highlights: string[];
  /** Head circumference in cm, once it is routinely measured. */
  headCm?: number;
}

const WEEK_DETAILS: WeekDetail[] = [
  { week: 4, highlights: ['The neural tube — the future brain and spine — is forming.', 'The placenta is beginning to develop.', 'Implantation is complete this week.'] },
  { week: 5, highlights: ['The heart begins to beat, though it is too faint to hear yet.', 'The neural tube closes.', 'Early blood vessels are forming.'] },
  { week: 6, highlights: ['Arm and leg buds appear.', 'The heartbeat can often be seen on a scan now.', 'Facial features are just starting to form.'] },
  { week: 7, highlights: ['The brain is growing very fast.', 'Tiny nostrils and eye lenses are forming.', 'Arm buds are lengthening into paddles.'] },
  { week: 8, highlights: ['Fingers and toes are taking shape.', 'The tail from early development disappears.', 'All essential organs have begun to form.'] },
  { week: 9, highlights: ['The baby can make tiny movements you cannot feel.', 'Elbows can bend now.', 'Essential organs are all in place.'] },
  { week: 10, highlights: ['Tiny nails begin to grow.', 'The most critical formation stage is complete.', 'Bones are starting to harden.'] },
  { week: 11, highlights: ['The baby can open and close their fists.', 'Tooth buds are appearing.', 'The head is still about half the body length.'], headCm: 5.5 },
  { week: 12, highlights: ['Reflexes are developing — they will move if you press your belly.', 'Kidneys begin producing urine.', 'The face now looks recognisably human.'], headCm: 6.8 },
  { week: 13, highlights: ['Vocal cords are forming.', 'Fingerprints have appeared.', 'The intestines have moved into the abdomen.'], headCm: 8.2 },
  { week: 14, highlights: ['The baby can squint, frown and grimace.', 'Fine hair called lanugo covers the body.', 'The liver and spleen have started working.'], headCm: 9.6 },
  { week: 15, highlights: ['Legs are now longer than the arms.', 'The baby can sense light through closed eyelids.', 'Bones are becoming visible on a scan.'], headCm: 11 },
  { week: 16, highlights: ['The heart pumps around 25 litres of blood a day.', 'Facial muscles allow expressions.', 'You may feel the first flutters soon.'], headCm: 12.4 },
  { week: 17, highlights: ['Body fat is starting to build up.', 'The umbilical cord is thickening.', 'Sweat glands are developing.'], headCm: 13.6 },
  { week: 18, highlights: ['The ears have reached their final position.', 'Myelin is beginning to coat the nerves.', 'The baby may start hiccupping.'], headCm: 14.9 },
  { week: 19, highlights: ['A protective coating called vernix covers the skin.', 'The brain is developing the senses.', 'Girls already have their lifetime egg supply forming.'], headCm: 16.1 },
  { week: 20, highlights: ['Halfway there — the anomaly scan is due around now.', 'The baby has a regular sleep and wake pattern.', 'Movements are becoming clearer.'], headCm: 17.5 },
  { week: 21, highlights: ['Movements are much easier to feel.', 'The digestive system is practising with swallowed fluid.', 'Bone marrow starts making blood cells.'], headCm: 18.7 },
  { week: 22, highlights: ['The baby can hear sounds from outside now.', 'They can hear your voice and will know it at birth.', 'More fat is forming under the skin.', 'Sleep cycles are becoming regular.'], headCm: 19.8 },
  { week: 23, highlights: ['The lungs are practising breathing movements.', 'Loud noises may make the baby startle.', 'Skin is still wrinkled but filling out.'], headCm: 20.9 },
  { week: 24, highlights: ['Taste buds are developing.', 'The inner ear is fully formed, so balance works now.', 'Lungs are producing surfactant.'], headCm: 22 },
  { week: 25, highlights: ['Hair is growing and gaining colour.', 'The baby responds to your voice and touch.', 'Hands are fully developed.'], headCm: 23.1 },
  { week: 26, highlights: ['The eyes are beginning to open.', 'Brain wave activity for hearing and sight begins.', 'Lungs continue maturing steadily.'], headCm: 24.2 },
  { week: 27, highlights: ['Sleeping and waking now follow a rhythm.', 'The baby may recognise your partner’s voice too.', 'Hiccups are common and normal.'], headCm: 25.3 },
  { week: 28, highlights: ['Third trimester — the brain is growing quickly.', 'Eyes can open and close and sense light.', 'The baby can dream now.'], headCm: 26.4 },
  { week: 29, highlights: ['Muscles and lungs keep maturing.', 'Bones are fully developed but still soft.', 'Kicks are getting noticeably stronger.'], headCm: 27.4 },
  { week: 30, highlights: ['The baby can tell light from dark.', 'Red blood cells are being made in the bone marrow.', 'About half a litre of fluid surrounds them.'], headCm: 28.3 },
  { week: 31, highlights: ['All five senses are working.', 'The baby is gaining weight quickly now.', 'Most of the lanugo has disappeared.'], headCm: 29.2 },
  { week: 32, highlights: ['Most babies have turned head-down by now or will soon.', 'Toenails and fingernails are fully formed.', 'Practising breathing regularly.'], headCm: 30 },
  { week: 33, highlights: ['The skull stays soft and flexible to ease birth.', 'The immune system is developing.', 'The baby can coordinate breathing and sucking.'], headCm: 30.7 },
  { week: 34, highlights: ['Fingernails reach the fingertips.', 'The central nervous system is maturing.', 'Lungs are close to fully developed.'], headCm: 31.4 },
  { week: 35, highlights: ['Weight gain speeds up from here.', 'The kidneys are fully developed.', 'Most of the vernix is still in place.'], headCm: 32.1 },
  { week: 36, highlights: ['The baby is running out of room to stretch.', 'They may drop lower into the pelvis.', 'Sucking muscles are fully ready.'], headCm: 32.8 },
  { week: 37, highlights: ['Early term — the lungs are nearly ready.', 'The baby is practising breathing and swallowing.', 'Firm grasp reflex is in place.'], headCm: 33.4 },
  { week: 38, highlights: ['The grasp reflex is firm now.', 'Organs are ready to function outside.', 'Most lanugo and vernix have gone.'], headCm: 34 },
  { week: 39, highlights: ['Full term — the baby could arrive any day.', 'The brain is still growing rapidly.', 'Enough fat is laid down to hold body heat.'], headCm: 34.6 },
  { week: 40, highlights: ['Due date week — most babies come within a fortnight either side.', 'The baby is fully developed and ready.', 'Only about 4% arrive exactly on the due date.'], headCm: 35 },
];

/**
 * Development detail for a gestational week, clamped to the range the chart
 * covers so an early or overdue week still returns something to show.
 */
export function weekDetail(week: number): WeekDetail {
  const first = WEEK_DETAILS[0];
  const last = WEEK_DETAILS[WEEK_DETAILS.length - 1];
  if (week <= first.week) return first;
  if (week >= last.week) return last;
  return WEEK_DETAILS.find((detail) => detail.week === week) ?? last;
}
