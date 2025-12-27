// Database provider and context
export { DatabaseProvider, useSQLiteContext } from './database';

// Hooks
export { useFoods, type Food } from './hooks/useFoods';
export {
  useMealEntries,
  type MealEntry,
  type MealEntryItem,
  type DayTotals,
} from './hooks/useMealEntries';
export {
  useSupplements,
  type Supplement,
  type SupplementWithValue,
} from './hooks/useSupplements';
