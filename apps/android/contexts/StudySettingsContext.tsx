import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import {
  loadCardsPerSession,
  saveCardsPerSession,
  type CardsPerSession,
} from '../lib/studySettings';

interface StudySettingsContextType {
  cardsPerSession: CardsPerSession;
  setCardsPerSession: (value: CardsPerSession) => void;
}

const StudySettingsContext = createContext<StudySettingsContextType | null>(null);

interface StudySettingsProviderProps {
  children: ReactNode;
}

/**
 * StudySettingsProvider manages study session configuration state.
 *
 * - Loads persisted cards-per-session preference from AsyncStorage on mount
 * - Provides current cardsPerSession value and setter to children
 */
export function StudySettingsProvider({ children }: StudySettingsProviderProps) {
  const [cardsPerSession, setCardsPerSessionState] = useState<CardsPerSession>('all');

  // Load persisted preference on mount
  useEffect(() => {
    loadCardsPerSession().then((stored) => {
      setCardsPerSessionState(stored);
    });
  }, []);

  const setCardsPerSession = useCallback((value: CardsPerSession) => {
    setCardsPerSessionState(value);
    saveCardsPerSession(value);
  }, []);

  const contextValue: StudySettingsContextType = {
    cardsPerSession,
    setCardsPerSession,
  };

  return (
    <StudySettingsContext.Provider value={contextValue}>
      {children}
    </StudySettingsContext.Provider>
  );
}

/**
 * Hook to access study settings context.
 * Must be used within a StudySettingsProvider.
 *
 * @returns cardsPerSession, setCardsPerSession
 * @throws Error if used outside of StudySettingsProvider
 */
export function useStudySettings(): StudySettingsContextType {
  const context = useContext(StudySettingsContext);

  if (!context) {
    throw new Error('useStudySettings must be used within StudySettingsProvider');
  }

  return context;
}
