import AsyncStorage from '@react-native-async-storage/async-storage';

const CARDS_PER_SESSION_KEY = '@lumio/cards-per-session';

/**
 * Number of cards to study per session.
 * - 10, 20, 50: Fixed card counts
 * - 'all': Study all available cards (default)
 */
export type CardsPerSession = 10 | 20 | 50 | 'all';

/**
 * Load the user's cards-per-session preference from persistent storage.
 * Returns 'all' if no preference is stored or the stored value is invalid.
 */
export async function loadCardsPerSession(): Promise<CardsPerSession> {
  try {
    const stored = await AsyncStorage.getItem(CARDS_PER_SESSION_KEY);
    if (stored === '10') return 10;
    if (stored === '20') return 20;
    if (stored === '50') return 50;
    if (stored === 'all') return 'all';
    return 'all';
  } catch {
    return 'all';
  }
}

/**
 * Save the user's cards-per-session preference to persistent storage.
 */
export async function saveCardsPerSession(value: CardsPerSession): Promise<void> {
  await AsyncStorage.setItem(CARDS_PER_SESSION_KEY, String(value));
}
