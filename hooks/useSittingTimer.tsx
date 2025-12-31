import { useState, useEffect, useRef, useCallback, createContext, useContext, type ReactNode } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

// Timer durations in seconds
// const SIT_DURATION_SECONDS = 60 * 60; // 1 hour
// const STAND_DURATION_SECONDS = 2 * 60; // 2 minutes

// For testing, use shorter durations:
const SIT_DURATION_SECONDS = 10; // 10 seconds
const STAND_DURATION_SECONDS = 5; // 5 seconds

export type TimerStatus = 'idle' | 'sitting' | 'stand_due' | 'standing';

export interface SittingTimerState {
  status: TimerStatus;
  sitStartTime: number | null;    // timestamp when sit timer started
  standStartTime: number | null;  // timestamp when stand exercise started
  timeRemaining: number;          // seconds remaining (sit or stand)
  sitDurationMinutes: number;     // how long the sit session was (for logging)
}

interface SittingTimerContextValue extends SittingTimerState {
  startSitting: () => Promise<void>;
  cancelSitting: () => Promise<void>;
  startStanding: () => void;
  completeStanding: (exercises: string[], autoRestart?: boolean) => Promise<void>;
  cancelStanding: () => void;
}

const SittingTimerContext = createContext<SittingTimerContextValue | null>(null);

// Configure notification handler (call this once in app setup)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export function SittingTimerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SittingTimerState>({
    status: 'idle',
    sitStartTime: null,
    standStartTime: null,
    timeRemaining: 0,
    sitDurationMinutes: 0,
  });

  const appState = useRef<AppStateStatus>(AppState.currentState);
  const notificationId = useRef<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const permissionsRequested = useRef(false);

  // Request notification permissions on mount (Android needs channel setup)
  useEffect(() => {
    if (permissionsRequested.current) return;
    permissionsRequested.current = true;

    const setupNotifications = async () => {
      try {
        // Set up Android notification channel
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('sitting-timer', {
            name: 'Sitting Timer',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            sound: 'default',
          });
        }

        // Request permissions
        const { status } = await Notifications.getPermissionsAsync();
        if (status !== 'granted') {
          await Notifications.requestPermissionsAsync();
        }
      } catch (error) {
        console.warn('Failed to setup notifications:', error);
      }
    };

    setupNotifications();
  }, []);

  // Calculate time remaining based on start time and duration
  const calculateTimeRemaining = useCallback((startTime: number, durationSeconds: number): number => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    return Math.max(0, durationSeconds - elapsed);
  }, []);

  // Update timer state every second when active
  const updateTimer = useCallback(() => {
    setState(prev => {
      if (prev.status === 'sitting' && prev.sitStartTime) {
        const remaining = calculateTimeRemaining(prev.sitStartTime, SIT_DURATION_SECONDS);
        if (remaining <= 0) {
          // Timer expired - transition to stand_due
          return {
            ...prev,
            status: 'stand_due',
            timeRemaining: 0,
            sitDurationMinutes: Math.round(SIT_DURATION_SECONDS / 60),
          };
        }
        return { ...prev, timeRemaining: remaining };
      }

      if (prev.status === 'standing' && prev.standStartTime) {
        const remaining = calculateTimeRemaining(prev.standStartTime, STAND_DURATION_SECONDS);
        return { ...prev, timeRemaining: Math.max(0, remaining) };
      }

      return prev;
    });
  }, [calculateTimeRemaining]);

  // Handle app coming to foreground
  const handleAppStateChange = useCallback((nextAppState: AppStateStatus) => {
    if (
      appState.current.match(/inactive|background/) &&
      nextAppState === 'active'
    ) {
      // App came to foreground - recalculate timer state
      updateTimer();
    }
    appState.current = nextAppState;
  }, [updateTimer]);

  // Set up interval and app state listener
  useEffect(() => {
    // Update every second when timer is active
    if (state.status === 'sitting' || state.status === 'standing') {
      intervalRef.current = setInterval(updateTimer, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [state.status, updateTimer]);

  // Set up app state listener
  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [handleAppStateChange]);

  // Start sitting timer
  const startSitting = useCallback(async () => {
    console.log('[SittingTimer] Starting sit timer');
    const now = Date.now();

    // Schedule notification for when sit time is up
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Time to Stand!',
          body: 'Get up and move for 2 minutes',
          data: { type: 'stand_reminder' },
          ...(Platform.OS === 'android' && { channelId: 'sitting-timer' }),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: SIT_DURATION_SECONDS,
        },
      });
      notificationId.current = id;
      console.log('[SittingTimer] Notification scheduled:', id);
    } catch (error) {
      console.warn('[SittingTimer] Failed to schedule notification:', error);
      // Continue anyway - notification is optional
    }

    setState({
      status: 'sitting',
      sitStartTime: now,
      standStartTime: null,
      timeRemaining: SIT_DURATION_SECONDS,
      sitDurationMinutes: 0,
    });
    console.log('[SittingTimer] State set to sitting');
  }, []);

  // Cancel sitting timer
  const cancelSitting = useCallback(async () => {
    console.log('[SittingTimer] Cancelling sit timer');

    // Cancel scheduled notification
    if (notificationId.current) {
      try {
        await Notifications.cancelScheduledNotificationAsync(notificationId.current);
        console.log('[SittingTimer] Notification cancelled');
      } catch (error) {
        console.warn('[SittingTimer] Failed to cancel notification:', error);
        // Continue anyway - still want to reset state
      }
      notificationId.current = null;
    }

    setState({
      status: 'idle',
      sitStartTime: null,
      standStartTime: null,
      timeRemaining: 0,
      sitDurationMinutes: 0,
    });
    console.log('[SittingTimer] State set to idle');
  }, []);

  // Start standing exercise timer
  const startStanding = useCallback(() => {
    console.log('[SittingTimer] Starting standing timer');
    const now = Date.now();
    setState(prev => ({
      ...prev,
      status: 'standing',
      standStartTime: now,
      timeRemaining: STAND_DURATION_SECONDS,
    }));
  }, []);

  // Complete standing - returns to idle or auto-restarts sitting
  const completeStanding = useCallback(async (exercises: string[], autoRestart = true) => {
    // Note: The actual logging to DB happens in the stand-up screen
    // This just handles state transition

    if (autoRestart) {
      // Auto-start next sitting session
      await startSitting();
    } else {
      setState({
        status: 'idle',
        sitStartTime: null,
        standStartTime: null,
        timeRemaining: 0,
        sitDurationMinutes: 0,
      });
    }
  }, [startSitting]);

  // Cancel standing exercise
  const cancelStanding = useCallback(() => {
    setState({
      status: 'idle',
      sitStartTime: null,
      standStartTime: null,
      timeRemaining: 0,
      sitDurationMinutes: 0,
    });
  }, []);

  const value: SittingTimerContextValue = {
    ...state,
    startSitting,
    cancelSitting,
    startStanding,
    completeStanding,
    cancelStanding,
  };

  return (
    <SittingTimerContext.Provider value={value}>
      {children}
    </SittingTimerContext.Provider>
  );
}

export function useSittingTimer(): SittingTimerContextValue {
  const context = useContext(SittingTimerContext);
  if (!context) {
    throw new Error('useSittingTimer must be used within a SittingTimerProvider');
  }
  return context;
}

// Helper to format seconds as MM:SS
export function formatTimeRemaining(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
