import * as Haptics from 'expo-haptics';

/**
 * Haptic feedback abstraction for quiz interactions.
 * Provides differentiated feedback for correct vs incorrect answers.
 *
 * - correctFeedback: Light success tap
 * - incorrectFeedback: Heavier error buzz
 */
export function useHaptics() {
  const correctFeedback = async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // Haptics may not work on emulator or some devices — fail silently
    }
  };

  const incorrectFeedback = async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch {
      // Haptics may not work on emulator or some devices — fail silently
    }
  };

  return { correctFeedback, incorrectFeedback };
}
