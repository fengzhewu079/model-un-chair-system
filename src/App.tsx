import React, { useEffect } from 'react';
import { useMeetingStore } from './store/useMeetingStore';
import { SetupPage } from './pages/SetupPage';
import { MainSessionPage } from './pages/MainSessionPage';

export const App: React.FC = () => {
  const rollCallCompleted = useMeetingStore((state) => state.rollCall.completed);
  const fontSize = useMeetingStore((state) => state.fontSize);
  const loadFromLocalStorage = useMeetingStore((state) => state.loadFromLocalStorage);
  const saveToLocalStorage = useMeetingStore((state) => state.saveToLocalStorage);

  // Load data from localStorage on mount
  useEffect(() => {
    loadFromLocalStorage();
  }, [loadFromLocalStorage]);

  // Save to localStorage whenever state changes
  useEffect(() => {
    const unsubscribe = useMeetingStore.subscribe(() => {
      saveToLocalStorage();
    });
    return unsubscribe;
  }, [saveToLocalStorage]);

  const fontSizeClass = fontSize === 'small' ? 'text-sm' : fontSize === 'large' ? 'text-lg' : 'text-base';

  return (
    <div className={fontSizeClass}>
      {rollCallCompleted ? <MainSessionPage /> : <SetupPage />}
    </div>
  );
};
