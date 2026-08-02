import { supabase } from './supabase';

export interface ScannedMedicine {
  name: string;
  dosage: string;
  frequency: string;
  foodRelation: 'before' | 'after' | 'any';
  durationDays: number | null;
}

export interface ScanPrescriptionResult {
  medicines: ScannedMedicine[];
  error?: string;
}

export async function scanPrescription(
  imageBase64: string,
  mediaType: string
): Promise<ScanPrescriptionResult> {
  const { data, error } = await supabase.functions.invoke('scan-prescription', {
    body: { imageBase64, mediaType },
  });

  if (error) throw error;
  return data as ScanPrescriptionResult;
}
