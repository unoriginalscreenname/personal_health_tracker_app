// Database provider and context
export { DatabaseProvider, useSQLiteContext } from './database';

// Hooks
export { useFoods, type Food } from './hooks/useFoods';
export {
  useMealEntries,
  type MealEntry,
  type MealEntryItem,
  type DayTotals,
  type RecentCustomItem,
} from './hooks/useMealEntries';
export {
  useSupplements,
  type Supplement,
  type SupplementWithValue,
} from './hooks/useSupplements';
export {
  useDailyStats,
  type DailyStats,
} from './hooks/useDailyStats';
export {
  useWorkouts,
  type BoxingSession,
  type WeightSession,
  type ExerciseLog,
  type Exercise,
  type LastWeightSessionInfo,
} from './hooks/useWorkouts';
export {
  useSittingSessions,
  type SittingSession,
} from './hooks/useSittingSessions';
