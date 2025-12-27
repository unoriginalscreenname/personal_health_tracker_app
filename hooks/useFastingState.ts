import { useState, useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';

const FAST_END_HOUR = 12;   // Noon - eating window opens
const FAST_START_HOUR = 18; // 6 PM - fasting begins

interface FastingState {
  isFasting: boolean;
  hours: number;
  minutes: number;
  progress: number; // 0-1
}

function calculateFastingState(now: Date): FastingState {
  const hour = now.getHours();
  const minute = now.getMinutes();

  // Eating window: 12:00 PM - 5:59 PM (hour >= 12 && hour < 18)
  const isEating = hour >= FAST_END_HOUR && hour < FAST_START_HOUR;

  if (isEating) {
    // Calculate time remaining until 6 PM (eating window close)
    const remainingMinutes = (FAST_START_HOUR - hour - 1) * 60 + (60 - minute);
    const remainingHours = Math.floor(remainingMinutes / 60);
    const remainingMins = remainingMinutes % 60;

    // Progress: how much of the eating window has passed (0 = just started, 1 = about to end)
    const totalEatingMinutes = 6 * 60; // 6 hours
    const elapsedEatingMinutes = (hour - FAST_END_HOUR) * 60 + minute;
    const progress = elapsedEatingMinutes / totalEatingMinutes;

    return {
      isFasting: false,
      hours: remainingHours,
      minutes: remainingMins,
      progress,
    };
  } else {
    // Fasting: 6 PM - 11:59 AM
    // Calculate time elapsed since 6 PM
    let elapsedMinutes: number;

    if (hour >= FAST_START_HOUR) {
      // Evening: 6 PM - 11:59 PM (same day)
      elapsedMinutes = (hour - FAST_START_HOUR) * 60 + minute;
    } else {
      // Morning: 12:00 AM - 11:59 AM (next day, fast started yesterday)
      // Hours from 6 PM to midnight = 6 hours
      // Plus hours from midnight to now
      elapsedMinutes = (24 - FAST_START_HOUR + hour) * 60 + minute;
    }

    const elapsedHours = Math.floor(elapsedMinutes / 60);
    const elapsedMins = elapsedMinutes % 60;

    // Progress: how much of the 18-hour fast has passed
    const totalFastingMinutes = 18 * 60;
    const progress = Math.min(elapsedMinutes / totalFastingMinutes, 1);

    return {
      isFasting: true,
      hours: elapsedHours,
      minutes: elapsedMins,
      progress,
    };
  }
}

export function useFastingState(): FastingState {
  const [state, setState] = useState<FastingState>(() =>
    calculateFastingState(new Date())
  );
  const appState = useRef<AppStateStatus>(AppState.currentState);

  const updateState = useCallback(() => {
    setState(calculateFastingState(new Date()));
  }, []);

  useEffect(() => {
    // Update immediately
    updateState();

    // Update every minute
    const interval = setInterval(updateState, 60 * 1000);

    // Also update when app comes to foreground
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        updateState();
      }
      appState.current = nextAppState;
    });

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [updateState]);

  return state;
}
