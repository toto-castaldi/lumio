import AsyncStorage from '@react-native-async-storage/async-storage';

const CARDS_PER_SESSION_KEY = '@lumio/cards-per-session';

/**
 * Number of cards to study per session.
 * - 10, 20, 50: Fixed card counts
 * - 'auto': Study all available cards with no cap (default)
 */
export type CardsPerSession = 10 | 20 | 50 | 'auto';

/**
 * Load the user's cards-per-session preference from persistent storage.
 * Returns 'auto' if no preference is stored or the stored value is invalid.
 * Backward-compatible: reads stored 'all' as 'auto' for seamless migration.
 */
export async function loadCardsPerSession(): Promise<CardsPerSession> {
  try {
    const stored = await AsyncStorage.getItem(CARDS_PER_SESSION_KEY);
    if (stored === '10') return 10;
    if (stored === '20') return 20;
    if (stored === '50') return 50;
    if (stored === 'all' || stored === 'auto') return 'auto';
    return 'auto';
  } catch {
    return 'auto';
  }
}

/**
 * Save the user's cards-per-session preference to persistent storage.
 */
export async function saveCardsPerSession(value: CardsPerSession): Promise<void> {
  await AsyncStorage.setItem(CARDS_PER_SESSION_KEY, String(value));
}
