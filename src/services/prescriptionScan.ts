import { invokeEdgeFunction } from './supabase';

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
  return invokeEdgeFunction<ScanPrescriptionResult>('scan-prescription', {
    imageBase64,
    mediaType,
  });
}
