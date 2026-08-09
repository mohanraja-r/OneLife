import type { Medicine, MedicineScope } from './medicine';
import { getMedicinesForMember } from './medicine';
import { supabase } from './supabase';

/**
 * Medical information data access — the record behind the Medical Info screen.
 *
 * Mirrors `migrations/006_medical.sql`:
 *
 *   medical_profiles    blood_type, organ_donor, notes, updated_at
 *   allergies           name, allergy_type, severity, reaction, treatment,
 *                       doctor_confirmed, last_verified
 *   health_conditions   name, diagnosed_year, status, notes
 *   medical_procedures  name, performed_year, notes
 *   emergency_contacts  name, relationship, phone, is_primary
 *   care_providers      name, specialty, facility, phone, is_primary
 *
 * Every table carries the same `owner_id` + `member_id` pair as `medicines`, so
 * one `MedicalScope` addresses a whole record: your own (`memberId: null`) or a
 * managed family member's. Current medications are not stored here — they are
 * read back out of `medicines`, which already owns them.
 */

/** Whose medical record a call is about — the same pair `medicines` uses. */
export type MedicalScope = MedicineScope;

export type AllergyType = 'medicine' | 'food' | 'environmental' | 'other';
export type AllergySeverity = 'mild' | 'moderate' | 'severe';
export type ConditionStatus = 'active' | 'managed' | 'controlled' | 'resolved';

/** The eight ABO/Rh groups, in the order the picker shows them. */
export const BLOOD_TYPES = [
  'A+',
  'A-',
  'B+',
  'B-',
  'AB+',
  'AB-',
  'O+',
  'O-',
] as const;

export type BloodType = (typeof BLOOD_TYPES)[number];

export interface Allergy {
  id: string;
  name: string;
  allergyType: AllergyType;
  severity: AllergySeverity;
  /** What happens on exposure, e.g. "Anaphylaxis — difficulty breathing". */
  reaction: string | null;
  /** What to do about it, shown to caregivers in an emergency. */
  treatment: string | null;
  doctorConfirmed: boolean;
  /** `YYYY-MM-DD` the allergy was last confirmed, or null. */
  lastVerified: string | null;
}

export interface HealthCondition {
  id: string;
  name: string;
  /** Year of diagnosis — people remember the year, not the appointment. */
  diagnosedYear: number | null;
  status: ConditionStatus;
  notes: string | null;
}

export interface MedicalProcedure {
  id: string;
  name: string;
  performedYear: number | null;
  notes: string | null;
}

export interface EmergencyContact {
  id: string;
  name: string;
  relationship: string | null;
  phone: string;
  isPrimary: boolean;
}

export interface CareProvider {
  id: string;
  name: string;
  specialty: string | null;
  facility: string | null;
  phone: string | null;
  isPrimary: boolean;
}

/** One person's whole medical record — the Medical Info screen's single read. */
export interface MedicalRecord {
  bloodType: BloodType | null;
  organDonor: boolean;
  /** ISO instant of the last edit, or null when nothing has been saved yet. */
  updatedAt: string | null;
  allergies: Allergy[];
  conditions: HealthCondition[];
  procedures: MedicalProcedure[];
  contacts: EmergencyContact[];
  providers: CareProvider[];
  /** Read from `medicines`, so the two lists can never disagree. */
  medicines: Medicine[];
}

/** The writable half of each record type — what the forms collect. */
export type AllergyInput = Omit<Allergy, 'id'>;
export type ConditionInput = Omit<HealthCondition, 'id'>;
export type ProcedureInput = Omit<MedicalProcedure, 'id'>;
export type ContactInput = Omit<EmergencyContact, 'id'>;
export type ProviderInput = Omit<CareProvider, 'id'>;

/**
 * What every medical row carries. `created_at` is read on all of them so the
 * shared view's "last updated" can mean the record as a whole, rather than the
 * one table that happens to hold a timestamp.
 */
interface ScopedRow {
  id: string;
  created_at: string | null;
}

interface MedicalProfileRow extends ScopedRow {
  blood_type: BloodType | null;
  organ_donor: boolean | null;
  notes: string | null;
  updated_at: string | null;
}

interface AllergyRow extends ScopedRow {
  name: string;
  allergy_type: AllergyType | null;
  severity: AllergySeverity | null;
  reaction: string | null;
  treatment: string | null;
  doctor_confirmed: boolean | null;
  last_verified: string | null;
}

interface ConditionRow extends ScopedRow {
  name: string;
  diagnosed_year: number | null;
  status: ConditionStatus | null;
  notes: string | null;
}

interface ProcedureRow extends ScopedRow {
  name: string;
  performed_year: number | null;
  notes: string | null;
}

interface ContactRow extends ScopedRow {
  name: string;
  relationship: string | null;
  phone: string | null;
  is_primary: boolean | null;
}

interface ProviderRow extends ScopedRow {
  name: string;
  specialty: string | null;
  facility: string | null;
  phone: string | null;
  is_primary: boolean | null;
}

const PROFILE_COLUMNS =
  'id, blood_type, organ_donor, notes, created_at, updated_at';
const ALLERGY_COLUMNS =
  'id, name, allergy_type, severity, reaction, treatment, doctor_confirmed, last_verified, created_at';
const CONDITION_COLUMNS =
  'id, name, diagnosed_year, status, notes, created_at';
const PROCEDURE_COLUMNS = 'id, name, performed_year, notes, created_at';
const CONTACT_COLUMNS =
  'id, name, relationship, phone, is_primary, created_at';
const PROVIDER_COLUMNS =
  'id, name, specialty, facility, phone, is_primary, created_at';

/** Returns the signed-in user's id, or throws when there is no session. */
async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;

  const userId = data.session?.user.id;
  if (!userId) throw new Error('You need to be signed in to view medical info.');
  return userId;
}

/** The scope addressing the signed-in user's own medical record. */
export async function selfScope(): Promise<MedicalScope> {
  return { ownerId: await requireUserId(), memberId: null };
}

/**
 * Reads one scope's rows from a table, oldest first.
 *
 * `member_id` is null for your own rows, and null is never equal to null in
 * SQL, so the filter has to switch between `eq` and `is` rather than passing
 * the value straight through.
 */
async function listScoped<Row>(
  table: string,
  columns: string,
  scope: MedicalScope
): Promise<Row[]> {
  const owned = supabase
    .from(table)
    .select(columns)
    .eq('owner_id', scope.ownerId)
    .order('created_at', { ascending: true });

  const { data, error } = await (scope.memberId
    ? owned.eq('member_id', scope.memberId)
    : owned.is('member_id', null));

  if (error) throw error;
  return data as unknown as Row[];
}

/** Inserts a row into a scope, or updates it in place when `id` is given. */
async function saveScoped(
  table: string,
  scope: MedicalScope,
  row: Record<string, unknown>,
  id?: string
): Promise<string> {
  if (id) {
    const { error } = await supabase.from(table).update(row).eq('id', id);
    if (error) throw error;
    return id;
  }

  const { data, error } = await supabase
    .from(table)
    .insert({ ...row, owner_id: scope.ownerId, member_id: scope.memberId })
    .select('id')
    .single()
    .overrideTypes<{ id: string }>();

  if (error) throw error;
  return data.id;
}

/** Deletes one medical row by id. */
async function deleteScoped(table: string, id: string): Promise<void> {
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) throw error;
}

/** The most recent of a set of ISO timestamps, ignoring the missing ones. */
function latestTimestamp(values: (string | null | undefined)[]): string | null {
  const stamps = values.filter((value): value is string => !!value);
  if (stamps.length === 0) return null;

  // ISO-8601 sorts correctly as text, so there is nothing to parse here.
  return stamps.reduce((latest, value) => (value > latest ? value : latest));
}

/** Trims a form field down to what should be stored: text, or nothing at all. */
function textOrNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

// ---------------------------------------------------------------------------
// Row mapping
// ---------------------------------------------------------------------------

/** Maps an `allergies` row onto the shape the screens consume. */
function toAllergy(row: AllergyRow): Allergy {
  return {
    id: row.id,
    name: row.name,
    allergyType: row.allergy_type ?? 'other',
    severity: row.severity ?? 'moderate',
    reaction: row.reaction,
    treatment: row.treatment,
    doctorConfirmed: row.doctor_confirmed ?? false,
    lastVerified: row.last_verified,
  };
}

/** Maps a `health_conditions` row onto the shape the screens consume. */
function toCondition(row: ConditionRow): HealthCondition {
  return {
    id: row.id,
    name: row.name,
    diagnosedYear: row.diagnosed_year,
    status: row.status ?? 'managed',
    notes: row.notes,
  };
}

/** Maps a `medical_procedures` row onto the shape the screens consume. */
function toProcedure(row: ProcedureRow): MedicalProcedure {
  return {
    id: row.id,
    name: row.name,
    performedYear: row.performed_year,
    notes: row.notes,
  };
}

/** Maps an `emergency_contacts` row onto the shape the screens consume. */
function toContact(row: ContactRow): EmergencyContact {
  return {
    id: row.id,
    name: row.name,
    relationship: row.relationship,
    phone: row.phone ?? '',
    isPrimary: row.is_primary ?? false,
  };
}

/** Maps a `care_providers` row onto the shape the screens consume. */
function toProvider(row: ProviderRow): CareProvider {
  return {
    id: row.id,
    name: row.name,
    specialty: row.specialty,
    facility: row.facility,
    phone: row.phone,
    isPrimary: row.is_primary ?? false,
  };
}

// ---------------------------------------------------------------------------
// The record
// ---------------------------------------------------------------------------

/**
 * Reads a whole medical record in one pass.
 *
 * The six reads are independent, so they go out together — the screen shows
 * everything or nothing, and waiting for them in series would be six round
 * trips of latency for no benefit.
 */
export async function getMedicalRecord(
  scope: MedicalScope
): Promise<MedicalRecord> {
  const [profiles, allergies, conditions, procedures, contacts, providers, medicines] =
    await Promise.all([
      listScoped<MedicalProfileRow>('medical_profiles', PROFILE_COLUMNS, scope),
      listScoped<AllergyRow>('allergies', ALLERGY_COLUMNS, scope),
      listScoped<ConditionRow>('health_conditions', CONDITION_COLUMNS, scope),
      listScoped<ProcedureRow>('medical_procedures', PROCEDURE_COLUMNS, scope),
      listScoped<ContactRow>('emergency_contacts', CONTACT_COLUMNS, scope),
      listScoped<ProviderRow>('care_providers', PROVIDER_COLUMNS, scope),
      getMedicinesForMember(scope),
    ]);

  const profile = profiles[0];
  const rows: ScopedRow[] = [
    ...allergies,
    ...conditions,
    ...procedures,
    ...contacts,
    ...providers,
  ];

  return {
    bloodType: profile?.blood_type ?? null,
    organDonor: profile?.organ_donor ?? false,
    // The newest thing in the record, whichever table it came from — the shared
    // view leads with this, and "last updated" has to mean the whole record.
    updatedAt: latestTimestamp([
      profile?.updated_at,
      ...rows.map((row) => row.created_at),
    ]),
    allergies: allergies.map(toAllergy),
    conditions: conditions.map(toCondition),
    procedures: procedures.map(toProcedure),
    contacts: contacts.map(toContact),
    providers: providers.map(toProvider),
    // Only what is still being taken: a finished course belongs to history, not
    // to "current medications".
    medicines: medicines.filter((medicine) => medicine.active),
  };
}

/**
 * Sets the blood type, creating the profile row on first use.
 *
 * Written as read-then-write rather than an upsert: the uniqueness of a record
 * is enforced by two partial indexes (one for your own row, one per member),
 * and PostgREST's `on_conflict` cannot name a partial index.
 */
export async function saveBloodType(
  scope: MedicalScope,
  bloodType: BloodType | null
): Promise<void> {
  const existing = await listScoped<MedicalProfileRow>(
    'medical_profiles',
    PROFILE_COLUMNS,
    scope
  );

  await saveScoped(
    'medical_profiles',
    scope,
    { blood_type: bloodType },
    existing[0]?.id
  );
}

// ---------------------------------------------------------------------------
// Allergies
// ---------------------------------------------------------------------------

/** Fetches one allergy by id, or null when it no longer exists. */
export async function getAllergy(id: string): Promise<Allergy | null> {
  const { data, error } = await supabase
    .from('allergies')
    .select(ALLERGY_COLUMNS)
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data ? toAllergy(data) : null;
}

/** Creates an allergy, or updates the one `id` names. */
export async function saveAllergy(
  scope: MedicalScope,
  input: AllergyInput,
  id?: string
): Promise<string> {
  const name = input.name.trim();
  if (!name) throw new Error('Please enter what the allergy is to.');

  return saveScoped(
    'allergies',
    scope,
    {
      name,
      allergy_type: input.allergyType,
      severity: input.severity,
      reaction: textOrNull(input.reaction),
      treatment: textOrNull(input.treatment),
      doctor_confirmed: input.doctorConfirmed,
      last_verified: input.lastVerified,
    },
    id
  );
}

/** Deletes an allergy. */
export async function deleteAllergy(id: string): Promise<void> {
  return deleteScoped('allergies', id);
}

// ---------------------------------------------------------------------------
// Conditions
// ---------------------------------------------------------------------------

/** Fetches one condition by id, or null when it no longer exists. */
export async function getCondition(id: string): Promise<HealthCondition | null> {
  const { data, error } = await supabase
    .from('health_conditions')
    .select(CONDITION_COLUMNS)
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data ? toCondition(data) : null;
}

/** Creates a chronic condition, or updates the one `id` names. */
export async function saveCondition(
  scope: MedicalScope,
  input: ConditionInput,
  id?: string
): Promise<string> {
  const name = input.name.trim();
  if (!name) throw new Error('Please enter the condition.');

  return saveScoped(
    'health_conditions',
    scope,
    {
      name,
      diagnosed_year: input.diagnosedYear,
      status: input.status,
      notes: textOrNull(input.notes),
    },
    id
  );
}

/** Deletes a chronic condition. */
export async function deleteCondition(id: string): Promise<void> {
  return deleteScoped('health_conditions', id);
}

// ---------------------------------------------------------------------------
// Procedures
// ---------------------------------------------------------------------------

/** Fetches one procedure by id, or null when it no longer exists. */
export async function getProcedure(id: string): Promise<MedicalProcedure | null> {
  const { data, error } = await supabase
    .from('medical_procedures')
    .select(PROCEDURE_COLUMNS)
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data ? toProcedure(data) : null;
}

/** Creates a surgery or procedure, or updates the one `id` names. */
export async function saveProcedure(
  scope: MedicalScope,
  input: ProcedureInput,
  id?: string
): Promise<string> {
  const name = input.name.trim();
  if (!name) throw new Error('Please enter the procedure.');

  return saveScoped(
    'medical_procedures',
    scope,
    {
      name,
      performed_year: input.performedYear,
      notes: textOrNull(input.notes),
    },
    id
  );
}

/** Deletes a surgery or procedure. */
export async function deleteProcedure(id: string): Promise<void> {
  return deleteScoped('medical_procedures', id);
}

// ---------------------------------------------------------------------------
// Emergency contacts
// ---------------------------------------------------------------------------

/** Fetches one emergency contact by id, or null when it no longer exists. */
export async function getContact(id: string): Promise<EmergencyContact | null> {
  const { data, error } = await supabase
    .from('emergency_contacts')
    .select(CONTACT_COLUMNS)
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data ? toContact(data) : null;
}

/**
 * Creates an emergency contact, or updates the one `id` names. Marking one as
 * primary demotes the rest: "who do we call first" has one answer.
 */
export async function saveContact(
  scope: MedicalScope,
  input: ContactInput,
  id?: string
): Promise<string> {
  const name = input.name.trim();
  if (!name) throw new Error('Please enter their name.');
  if (!input.phone.trim()) throw new Error('Please enter a phone number.');

  const savedId = await saveScoped(
    'emergency_contacts',
    scope,
    {
      name,
      relationship: textOrNull(input.relationship),
      phone: input.phone.trim(),
      is_primary: input.isPrimary,
    },
    id
  );

  if (input.isPrimary) await demoteOtherPrimaries('emergency_contacts', scope, savedId);
  return savedId;
}

/** Deletes an emergency contact. */
export async function deleteContact(id: string): Promise<void> {
  return deleteScoped('emergency_contacts', id);
}

// ---------------------------------------------------------------------------
// Providers
// ---------------------------------------------------------------------------

/** Fetches one healthcare provider by id, or null when it no longer exists. */
export async function getProvider(id: string): Promise<CareProvider | null> {
  const { data, error } = await supabase
    .from('care_providers')
    .select(PROVIDER_COLUMNS)
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data ? toProvider(data) : null;
}

/** Creates a healthcare provider, or updates the one `id` names. */
export async function saveProvider(
  scope: MedicalScope,
  input: ProviderInput,
  id?: string
): Promise<string> {
  const name = input.name.trim();
  if (!name) throw new Error("Please enter the doctor's name.");

  const savedId = await saveScoped(
    'care_providers',
    scope,
    {
      name,
      specialty: textOrNull(input.specialty),
      facility: textOrNull(input.facility),
      phone: textOrNull(input.phone),
      is_primary: input.isPrimary,
    },
    id
  );

  if (input.isPrimary) await demoteOtherPrimaries('care_providers', scope, savedId);
  return savedId;
}

/** Deletes a healthcare provider. */
export async function deleteProvider(id: string): Promise<void> {
  return deleteScoped('care_providers', id);
}

/** Clears `is_primary` on every row in a scope except the one just saved. */
async function demoteOtherPrimaries(
  table: string,
  scope: MedicalScope,
  keepId: string
): Promise<void> {
  const others = supabase
    .from(table)
    .update({ is_primary: false })
    .eq('owner_id', scope.ownerId)
    .neq('id', keepId);

  const { error } = await (scope.memberId
    ? others.eq('member_id', scope.memberId)
    : others.is('member_id', null));

  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

/** Sentence-cases a stored enum value for display, e.g. `food` → `Food`. */
export function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** The one-line summary under an allergy's name, e.g. "Anaphylaxis risk". */
export function allergySummary(allergy: Allergy): string {
  return allergy.reaction ?? `${titleCase(allergy.severity)} reaction`;
}

/** The one-line summary under a condition's name, e.g. "Since 2019 · Managed". */
export function conditionSummary(condition: HealthCondition): string {
  const since = condition.diagnosedYear ? `Since ${condition.diagnosedYear}` : null;
  return [since, titleCase(condition.status)].filter(Boolean).join(' · ');
}

/** The one-line summary under a procedure's name, e.g. "2015 · Recovered well". */
export function procedureSummary(procedure: MedicalProcedure): string {
  return (
    [procedure.performedYear?.toString(), procedure.notes]
      .filter(Boolean)
      .join(' · ') || 'No details recorded'
  );
}

/**
 * How long ago an edit happened, in the coarse form the shared view leads with
 * ("2 hours ago"). Anything older than a week falls back to a date.
 */
export function relativeTime(iso: string | null): string | null {
  if (!iso) return null;

  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;

  const minutes = Math.round((Date.now() - then) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;

  const days = Math.round(hours / 24);
  if (days <= 7) return `${days} day${days === 1 ? '' : 's'} ago`;

  return new Date(iso).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
