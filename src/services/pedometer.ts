/**
 * Step-count access, wrapping the `expo-pedometer` native module.
 *
 * The module reads HealthKit on iOS and Health Connect on Android, falling
 * back to the hardware step counter where Health Connect is missing. None of
 * that exists in Expo Go — it is a third-party native module, so it is only
 * present in a development or production build. Every entry point here is
 * therefore guarded: in Expo Go the module resolves to `null` and the caller
 * gets `available: false` rather than a crash, so the rest of the app still
 * runs.
 *
 * The device only reports *today*. Past days come from whatever was written to
 * `health_entries` at the time, which is why `readTodaySteps` is explicitly
 * today-only and the screens fall back to the stored figure for other dates.
 */

/** How the step count for a day was obtained. */
export type StepSource = 'device' | 'stored' | 'unavailable';

/** Why the device count is not being shown, when it is not. */
export type StepBlocker =
  | 'unsupported'
  | 'permission-denied'
  | 'permission-undetermined'
  | null;

export interface StepReading {
  /** Steps the device reported, or null when it could not be read. */
  steps: number | null;
  /** True when the native module is present and the platform supports it. */
  available: boolean;
  /** What is standing between us and a reading, if anything. */
  blocker: StepBlocker;
  /** True when the permission prompt can still be shown. */
  canAskAgain: boolean;
}

/** The shape of `expo-pedometer` this module uses. */
interface PedometerModule {
  isAvailableAsync: () => Promise<boolean>;
  getPermissionsAsync: () => Promise<{ status: string; canAskAgain: boolean }>;
  requestPermissionsAsync: () => Promise<{
    status: string;
    canAskAgain: boolean;
  }>;
  getTodayStepCountAsync: () => Promise<number>;
}

/**
 * Resolves the native module once, or null where it is absent.
 *
 * `require` rather than a static import, deliberately. The package's
 * `ExpoPedometerModule` calls `requireNativeModule("ExpoPedometer")` at the top
 * level of its own module, and that throws — rather than returning null — when
 * the native side is missing, which is the case in Expo Go. A static import is
 * hoisted, so it would throw while the module graph is still evaluating, before
 * any try/catch here could contain it, and take the whole screen down with it.
 */
function loadPedometer(): PedometerModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-pedometer') as PedometerModule;
  } catch {
    return null;
  }
}

const pedometer = loadPedometer();

/** The reading returned whenever the device cannot supply a step count. */
const UNSUPPORTED: StepReading = {
  steps: null,
  available: false,
  blocker: 'unsupported',
  canAskAgain: false,
};

/** Maps the module's permission status onto the blocker the UI reacts to. */
function blockerForStatus(status: string): StepBlocker {
  if (status === 'granted') return null;
  if (status === 'denied') return 'permission-denied';
  return 'permission-undetermined';
}

/** True when the native module is present and this platform can count steps. */
export async function isPedometerAvailable(): Promise<boolean> {
  if (!pedometer) return false;
  try {
    return await pedometer.isAvailableAsync();
  } catch {
    return false;
  }
}

/**
 * Reads today's step count from the device without prompting.
 *
 * Returns the current permission state instead of throwing when access has not
 * been granted, so the screen can render an explanation and a request button.
 */
export async function readTodaySteps(): Promise<StepReading> {
  if (!pedometer) return UNSUPPORTED;

  try {
    if (!(await pedometer.isAvailableAsync())) return UNSUPPORTED;

    const permission = await pedometer.getPermissionsAsync();
    if (permission.status !== 'granted') {
      return {
        steps: null,
        available: true,
        blocker: blockerForStatus(permission.status),
        canAskAgain: permission.canAskAgain,
      };
    }

    return {
      steps: await pedometer.getTodayStepCountAsync(),
      available: true,
      blocker: null,
      canAskAgain: true,
    };
  } catch {
    // A native throw here means the module is present but unusable on this
    // device — treated the same as it not being there at all.
    return UNSUPPORTED;
  }
}

/** Prompts for step access, then reads today's count if it was granted. */
export async function requestStepsPermission(): Promise<StepReading> {
  if (!pedometer) return UNSUPPORTED;

  try {
    const permission = await pedometer.requestPermissionsAsync();
    if (permission.status !== 'granted') {
      return {
        steps: null,
        available: true,
        blocker: blockerForStatus(permission.status),
        canAskAgain: permission.canAskAgain,
      };
    }

    return {
      steps: await pedometer.getTodayStepCountAsync(),
      available: true,
      blocker: null,
      canAskAgain: true,
    };
  } catch {
    return UNSUPPORTED;
  }
}

/** The line shown under the step count explaining why it is not live. */
export function blockerMessage(blocker: StepBlocker): string | null {
  switch (blocker) {
    case 'unsupported':
      return 'Step tracking needs a development build — it is not available in Expo Go.';
    case 'permission-denied':
      return 'Step access was denied. Enable it in your device settings to track steps.';
    case 'permission-undetermined':
      return 'Allow access to your step data to track your daily activity.';
    default:
      return null;
  }
}
