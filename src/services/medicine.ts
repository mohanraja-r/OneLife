import { supabase } from './supabase';

export interface Medicine {
  id: string;
  userId: string;
  name: string;
  dosage: string;
  type: string;
  frequency: string;
  startDate: string;
  endDate?: string;
  time: string;
  notes?: string;
  prescriptionImageUrl?: string;
  doctorName?: string;
  createdAt: string;
}

export interface DoseLog {
  id: string;
  medicineId: string;
  doseDate: string;
  taken: boolean;
  takenAt?: string;
  notes?: string;
}

/**
 * Get medicines scheduled for today with their dose status
 */
export async function getMedicinesForToday(): Promise<Medicine[]> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session?.user?.id) {
      throw new Error('User not authenticated');
    }

    const userId = sessionData.session.user.id;
    const today = new Date().toISOString().split('T')[0];

    // Get all active medicines
    const { data: medicines, error: medicinesError } = await supabase
      .from('medicines')
      .select('*')
      .eq('user_id', userId)
      .or(`end_date.is.null,end_date.gte.${today}`)
      .order('time', { ascending: true });

    if (medicinesError) throw medicinesError;

    // For each medicine, check if taken today
    const medicinesWithStatus = await Promise.all(
      medicines?.map(async (med) => {
        const { data: doseLog } = await supabase
          .from('dose_log')
          .select('taken, taken_at')
          .eq('medicine_id', med.id)
          .eq('dose_date', today)
          .single();

        return {
          ...med,
          taken: doseLog?.taken || false,
          takenAt: doseLog?.taken_at,
        };
      }) || []
    );

    return medicinesWithStatus as Medicine[];
  } catch (err) {
    console.error("Error fetching today's medicines:", err);
    return [];
  }
}

/**
 * Mark a medicine dose as taken or not taken
 */
export async function markDoseTaken(
  medicineId: string,
  taken: boolean
): Promise<boolean> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session?.user?.id) {
      throw new Error('User not authenticated');
    }

    const userId = sessionData.session.user.id;
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();

    // Check if dose log exists for today
    const { data: existingLog } = await supabase
      .from('dose_log')
      .select('id')
      .eq('medicine_id', medicineId)
      .eq('dose_date', today)
      .single();

    if (existingLog) {
      // Update existing log
      const { error } = await supabase
        .from('dose_log')
        .update({
          taken,
          taken_at: taken ? now : null,
        })
        .eq('id', existingLog.id);

      if (error) throw error;
    } else {
      // Create new log
      const { error } = await supabase.from('dose_log').insert({
        medicine_id: medicineId,
        dose_date: today,
        taken,
        taken_at: taken ? now : null,
      });

      if (error) throw error;
    }

    return true;
  } catch (err) {
    console.error('Error marking dose:', err);
    return false;
  }
}

/**
 * Get all medicines for the current user
 */
export async function getAllMedicines(): Promise<Medicine[]> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session?.user?.id) {
      throw new Error('User not authenticated');
    }

    const userId = sessionData.session.user.id;

    const { data: medicines, error } = await supabase
      .from('medicines')
      .select('*')
      .eq('user_id', userId)
      .order('name', { ascending: true });

    if (error) throw error;

    return medicines || [];
  } catch (err) {
    console.error('Error fetching medicines:', err);
    return [];
  }
}

/**
 * Get a single medicine by ID
 */
export async function getMedicineById(
  medicineId: string
): Promise<Medicine | null> {
  try {
    const { data: medicine, error } = await supabase
      .from('medicines')
      .select('*')
      .eq('id', medicineId)
      .single();

    if (error) throw error;

    return medicine || null;
  } catch (err) {
    console.error('Error fetching medicine:', err);
    return null;
  }
}

/**
 * Add a new medicine
 */
export async function addMedicine(
  medicineData: Omit<Medicine, 'id' | 'userId' | 'createdAt'>
): Promise<Medicine | null> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session?.user?.id) {
      throw new Error('User not authenticated');
    }

    const userId = sessionData.session.user.id;

    const { data: medicine, error } = await supabase
      .from('medicines')
      .insert({
        user_id: userId,
        name: medicineData.name,
        dosage: medicineData.dosage,
        type: medicineData.type,
        frequency: medicineData.frequency,
        start_date: medicineData.startDate,
        end_date: medicineData.endDate || null,
        time: medicineData.time,
        notes: medicineData.notes || null,
        prescription_image_url: medicineData.prescriptionImageUrl || null,
        doctor_name: medicineData.doctorName || null,
      })
      .select()
      .single();

    if (error) throw error;

    return medicine || null;
  } catch (err) {
    console.error('Error adding medicine:', err);
    return null;
  }
}

/**
 * Update an existing medicine
 */
export async function updateMedicine(
  medicineId: string,
  medicineData: Partial<Medicine>
): Promise<Medicine | null> {
  try {
    const updateData: any = {};

    if (medicineData.name) updateData.name = medicineData.name;
    if (medicineData.dosage) updateData.dosage = medicineData.dosage;
    if (medicineData.type) updateData.type = medicineData.type;
    if (medicineData.frequency) updateData.frequency = medicineData.frequency;
    if (medicineData.startDate) updateData.start_date = medicineData.startDate;
    if (medicineData.endDate !== undefined)
      updateData.end_date = medicineData.endDate;
    if (medicineData.time) updateData.time = medicineData.time;
    if (medicineData.notes !== undefined) updateData.notes = medicineData.notes;
    if (medicineData.prescriptionImageUrl)
      updateData.prescription_image_url = medicineData.prescriptionImageUrl;
    if (medicineData.doctorName)
      updateData.doctor_name = medicineData.doctorName;

    const { data: medicine, error } = await supabase
      .from('medicines')
      .update(updateData)
      .eq('id', medicineId)
      .select()
      .single();

    if (error) throw error;

    return medicine || null;
  } catch (err) {
    console.error('Error updating medicine:', err);
    return null;
  }
}

/**
 * Delete a medicine
 */
export async function deleteMedicine(medicineId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('medicines')
      .delete()
      .eq('id', medicineId);

    if (error) throw error;

    return true;
  } catch (err) {
    console.error('Error deleting medicine:', err);
    return false;
  }
}

/**
 * Get dose history for a specific medicine
 */
export async function getMedicineDoseHistory(
  medicineId: string,
  daysBack: number = 30
): Promise<DoseLog[]> {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);
    const startDateStr = startDate.toISOString().split('T')[0];

    const { data: logs, error } = await supabase
      .from('dose_log')
      .select('*')
      .eq('medicine_id', medicineId)
      .gte('dose_date', startDateStr)
      .order('dose_date', { ascending: false });

    if (error) throw error;

    return logs || [];
  } catch (err) {
    console.error('Error fetching dose history:', err);
    return [];
  }
}

/**
 * Get medicine adherence percentage for the past N days
 */
export async function getMedicineAdherence(
  medicineId: string,
  daysBack: number = 7
): Promise<number> {
  try {
    const logs = await getMedicineDoseHistory(medicineId, daysBack);

    if (logs.length === 0) return 0;

    const takenCount = logs.filter((log) => log.taken).length;
    return Math.round((takenCount / logs.length) * 100);
  } catch (err) {
    console.error('Error calculating adherence:', err);
    return 0;
  }
}

/**
 * Get overall medication adherence for all medicines
 */
export async function getOverallAdherence(
  daysBack: number = 7
): Promise<number> {
  try {
    const medicines = await getAllMedicines();

    if (medicines.length === 0) return 0;

    const adherencePercentages = await Promise.all(
      medicines.map((med) => getMedicineAdherence(med.id, daysBack))
    );

    const average =
      adherencePercentages.reduce((a, b) => a + b, 0) /
      adherencePercentages.length;
    return Math.round(average);
  } catch (err) {
    console.error('Error calculating overall adherence:', err);
    return 0;
  }
}

/**
 * Get medicines that need to be taken soon (within next 2 hours)
 */
export async function getUpcomingMedicines(): Promise<Medicine[]> {
  try {
    const allMedicines = await getMedicinesForToday();
    const now = new Date();
    const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    return allMedicines.filter((med) => {
      const [hours, minutes] = med.time.split(':').map(Number);
      const medTime = new Date();
      medTime.setHours(hours, minutes, 0);

      return medTime >= now && medTime <= twoHoursLater && !med.taken;
    });
  } catch (err) {
    console.error('Error fetching upcoming medicines:', err);
    return [];
  }
}
