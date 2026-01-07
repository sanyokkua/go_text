# 🎯 Redux Toolkit + TypeScript AI Agent Rules

## 📚 1. Project Setup & Type Definitions

### Rule 1.1: Store Configuration & Type Inference
- **Always** use `configureStore` from `@reduxjs/toolkit` to create the store.
- **Always** infer `RootState` and `AppDispatch` types from the store instance itself 【turn0search5】【turn0search13】:
  ```typescript
  // app/store.ts
  import { configureStore } from '@reduxjs/toolkit';
  import { rootReducer } from './rootReducer';

  export const store = configureStore({
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(/* custom middleware */),
  });

  // Infer types from the store
  export type AppStore = typeof store;
  export type RootState = ReturnType<typeof store.getState>;
  export type AppDispatch = typeof store.dispatch;
  ```
- **Never** manually define `RootState` or `AppDispatch` - always infer them to maintain synchronization with actual store structure.

### Rule 1.2: Typed Hooks Creation
- **Always** create pre-typed versions of React-Redux hooks in a separate file (e.g., `app/hooks.ts`) to avoid circular imports and provide type safety 【turn0search5】【turn0search13】:
  ```typescript
  // app/hooks.ts
  import { useDispatch, useSelector, useStore } from 'react-redux';
  import type { AppDispatch, AppStore, RootState } from './store';

  export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
  export const useAppSelector = useSelector.withTypes<RootState>();
  export const useAppStore = useStore.withTypes<AppStore>();
  ```
- **Never** use the default `useDispatch` and `useSelector` hooks directly in components - always use the typed versions.

### Rule 1.3: Type Organization & File Structure
- **Always** organize types in dedicated files/modules. For each feature slice, create a corresponding types file (e.g., `features/settings/types.ts`).
- **Never** define inline types in component files, thunk files, or action creators. Always extract them to named interfaces or types:
  ```typescript
  // ❌ AVOID: Inline types
  const fetchSettings = createAsyncThunk(
    'settings/fetch',
    async ({ providerConfig, modelName }: { providerConfig: FrontProviderConfig; modelName?: string }) => {
      // ...
    }
  );

  // ✅ PREFER: Extracted interfaces
  interface FetchSettingsArgs {
    providerConfig: FrontProviderConfig;
    modelName?: string;
  }

  const fetchSettings = createAsyncThunk(
    'settings/fetch',
    async (args: FetchSettingsArgs, { rejectWithValue }) => {
      // ...
    }
  );
  ```

## 🔧 2. Redux Slices & State Management

### Rule 2.1: Slice Definition & Typing
- **Always** use `createSlice` from `@reduxjs/toolkit` for reducer logic.
- **Always** explicitly type the state interface for each slice:
  ```typescript
  // features/settings/types.ts
  export interface SettingsState {
    currentSettings: FrontSettings | null;
    loading: boolean;
    error: string | null;
  }

  // features/settings/slice.ts
  import { createSlice } from '@reduxjs/toolkit';
  import type { SettingsState } from './types';

  const initialState: SettingsState = {
    currentSettings: null,
    loading: false,
    error: null,
  };

  const settingsSlice = createSlice({
    name: 'settings',
    initialState,
    reducers: {
      // ... synchronous reducers
    },
    extraReducers: (builder) => {
      // ... async thunks handling
    },
  });

  export const { actions } = settingsSlice;
  export default settingsSlice.reducer;
  ```

### Rule 2.2: Reducer Composition
- **Always** combine reducers using `combineReducers` in a `rootReducer.ts` file to avoid circular type dependencies 【turn0search8】:
  ```typescript
  // app/rootReducer.ts
  import { combineReducers } from '@reduxjs/toolkit';
  import settingsReducer from '../features/settings/slice';
  import stateReducer from '../features/state/slice';

  const rootReducer = combineReducers({
    settingsState: settingsReducer,
    state: stateReducer,
  });

  export type RootState = ReturnType<typeof rootReducer>;
  export default rootReducer;
  ```
- **Never** define reducers inline in `configureStore` - always combine them separately for better type inference.

## ⚡ 3. Async Thunks with `createAsyncThunk`

### Rule 3.1: Basic Thunk Typing
- **Always** use `createAsyncThunk` for async logic with proper type parameters.
- **Always** define the payload type as the first generic parameter if it cannot be inferred 【turn0search0】【turn0search19】:
  ```typescript
  // features/settings/thunks.ts
  import { createAsyncThunk } from '@reduxjs/toolkit';
  import type { RootState, AppDispatch } from '../../../app/store';
  import type { FrontSettings } from './types';

  export const settingsGetCurrentSettings = createAsyncThunk<
    FrontSettings,  // Return type of the payload creator
    void,          // First argument to the payload creator
    {
      dispatch: AppDispatch;
      state: RootState;
      rejectValue: string;  // Type for rejected error payload
    }
  >(
    'settingsState/settingsGetCurrentSettings',
    async (_, { rejectWithValue }) => {
      try {
        return await settingsService.getCurrentSettings();
      } catch (error: unknown) {
        const msg = parseError(error);
        return rejectWithValue(msg.message);
      }
    }
  );
  ```

### Rule 3.2: AsyncThunkConfig Type Definition
- **Always** define the third generic parameter (`AsyncThunkConfig`) with only the fields you actually need 【turn0search0】:
  ```typescript
  interface AsyncThunkConfig {
    /** return type for `thunkApi.getState` */
    state?: RootState;
    /** type for `thunkApi.dispatch` */
    dispatch?: AppDispatch;
    /** type of the `extra` argument for the thunk middleware */
    extra?: unknown;
    /** type to be passed into `rejectWithValue`'s first argument */
    rejectValue?: string;
    /** type to be passed into `fulfillWithValue`'s second argument */
    fulfilledMeta?: unknown;
    /** type to be passed into `rejectWithValue`'s second argument */
    rejectedMeta?: unknown;
  }
  ```
- **Never** omit the `rejectValue` type if you plan to use `rejectWithValue`, as it provides type safety for error handling.

### Rule 3.3: Error Handling with `rejectWithValue`
- **Always** define a known error interface for structured error handling 【turn0search0】:
  ```typescript
  // features/settings/types.ts
  export interface KnownError {
    errorMessage: string;
    field?: string;
    code?: string;
  }

  // features/settings/thunks.ts
  export const updateSettings = createAsyncThunk<
    FrontSettings,
    Partial<FrontSettings>,
    {
      rejectValue: KnownError;
    }
  >(
    'settings/update',
    async (settings: Partial<FrontSettings>, { rejectWithValue }) => {
      try {
        return await settingsService.updateSettings(settings);
      } catch (error) {
        if (error.response?.status === 400) {
          return rejectWithValue(error.response.data as KnownError);
        }
        throw error;
      }
    }
  );
  ```
- **Always** use `rejectWithValue` for expected errors and throw for unexpected errors.

### Rule 3.4: Thunk API Parameter Typing
- **Always** type the `thunkApi` parameter when using its properties:
  ```typescript
  export const fetchWithAuth = createAsyncThunk<
    ResponseData,
    RequestData,
    {
      extra: { authService: AuthService };
      state: RootState;
      dispatch: AppDispatch;
    }
  >(
    'api/fetchWithAuth',
    async (data: RequestData, { extra, getState, dispatch, rejectWithValue }) => {
      const state = getState();
      const token = selectAuthToken(state);
      
      if (!token) {
        return rejectWithValue({ errorMessage: 'Not authenticated' });
      }

      try {
        return await extra.authService.fetchWithToken(data, token);
      } catch (error) {
        return rejectWithValue(parseAuthError(error));
      }
    }
  );
  ```
- **Never** access `thunkApi` properties without properly typing the generic parameter.

## 🎣 4. Selectors & Data Access

### Rule 4.1: Typed Selectors Creation
- **Always** create typed selector functions using the `RootState` type:
  ```typescript
  // features/settings/selectors.ts
  import type { RootState } from '../../../app/store';
  import type { SettingsState } from './types';

  export const selectCurrentSettings = (state: RootState): FrontSettings | null =>
    state.settingsState.currentSettings;

  export const selectSettingsLoading = (state: RootState): boolean =>
    state.settingsState.loading;

  export const selectSettingsError = (state: RootState): string | null =>
    state.settingsState.error;

  // Memoized selectors for derived data
  export const selectSettingsProcessedData = createSelector(
    [selectCurrentSettings],
    (settings) => {
      // Process and return derived data
      return settings ? processSettings(settings) : null;
    }
  );
  ```

### Rule 4.2: Selector Usage in Components
- **Always** use the typed `useAppSelector` hook instead of `useSelector`:
  ```typescript
  // components/SettingsDisplay.tsx
  import { useAppSelector } from '../../../app/hooks';
  import { selectCurrentSettings, selectSettingsLoading } from '../settings/selectors';

  export const SettingsDisplay = () => {
    const currentSettings = useAppSelector(selectCurrentSettings);
    const isLoading = useAppSelector(selectSettingsLoading);

    // ... component logic
  };
  ```
- **Never** write inline selectors in components. Always extract them to the selector file for reusability and testing.

### Rule 4.3: Selector Best Practices
- **Always** use `createSelector` from `@reduxjs/toolkit` for memoized selectors when deriving data.
- **Never** perform expensive computations or data transformations in the component - always move them to selectors.
- **Always** structure selectors to follow the principle of least surprise - each selector should do one thing well.

## 🚀 5. Advanced Patterns & Best Practices

### Rule 5.1: Thunk Composition
- **Always** compose thunks by dispatching other thunks when needed:
  ```typescript
  export const initializeApp = createAsyncThunk<
    void,
    void,
    { dispatch: AppDispatch }
  >('app/initialize', async (_, { dispatch }) => {
    await dispatch(settingsGetCurrentSettings());
    await dispatch(userFetchProfile());
    await dispatch(loadInitialData());
  });
  ```
- **Never** mix business logic with UI logic - keep thunks focused on state management.

### Rule 5.2: Type Exports & Barrel Files
- **Always** create barrel files (`index.ts`) for clean imports:
  ```typescript
  // features/settings/index.ts
  export { default as settingsReducer } from './slice';
  export * from './slice';
  export * from './thunks';
  export * from './selectors';
  export * from './types';
  ```

### Rule 5.3: Testing Considerations
- **Always** design thunks and slices for testability:
    - Make thunks pure by allowing service dependencies to be injected via `extra` parameter.
    - Use selectors for all state access to enable easy testing.
    - Keep reducers pure and focused on state transitions.

### Rule 5.4: Performance Optimization
- **Always** use RTK's built-in Immer for state updates instead of manual spreading.
- **Always** structure state to minimize re-renders by normalizing data where appropriate.
- **Never** put non-serializable data in Redux state (e.g., functions, Promises, class instances).

## ⛔ 6. Anti-Patterns & Things to Avoid

### Rule 6.1: Type Anti-Patterns
- **Never** use `any` type in Redux code. Always provide specific types.
- **Never** use type assertions (`as`) unless absolutely necessary for complex external API integrations.
- **Never** define types inline in function parameters or return types.

### Rule 6.2: Architecture Anti-Patterns
- **Never** put business logic in components - always move it to thunks or services.
- **Never** access the store directly in components - always use hooks.
- **Never** create circular dependencies between slices - use the store's state structure appropriately.

### Rule 6.3: Async Handling Anti-Patterns
- **Never** handle async logic with manual action creators - always use `createAsyncThunk`.
- **Never** ignore the `pending` and `rejected` action types in `extraReducers` - always handle all lifecycle states.
- **Never** mix callback-based APIs with thunks - always use Promise-based APIs.

## 📋 7. Compliance Checklist for AI Agent

When generating Redux-related code, the AI agent should verify:

- [ ] Store properly configured with inferred `RootState` and `AppDispatch` types
- [ ] Typed hooks (`useAppDispatch`, `useAppSelector`) used in all components
- [ ] All types defined in separate files/modules with proper exports
- [ ] Thunks properly typed with explicit generic parameters for return value, arguments, and AsyncThunkConfig
- [ ] `rejectValue` type defined and used for all error handling
- [ ] Selectors extracted to separate files with proper `RootState` typing
- [ ] No inline types or `any` types used anywhere
- [ ] Proper error handling with structured error interfaces
- [ ] Async logic handled exclusively with `createAsyncThunk`
- [ ] All imports follow the barrel file pattern where appropriate
- [ ] State updates using Immer (built into RTK) without manual spreading
- [ ] No non-serializable data in Redux state

## 🎨 8. Example Complete Implementation

Here's a complete example following all rules:

```typescript
// features/settings/types.ts
export interface FrontSettings {
  id: string;
  theme: 'light' | 'dark';
  language: string;
  notifications: boolean;
}

export interface SettingsState {
  currentSettings: FrontSettings | null;
  loading: boolean;
  error: string | null;
}

export interface KnownError {
  errorMessage: string;
  code?: string;
}

// features/settings/selectors.ts
import type { RootState } from '../../../app/store';
import type { SettingsState } from './types';

export const selectCurrentSettings = (state: RootState): FrontSettings | null =>
  state.settingsState.currentSettings;

export const selectSettingsLoading = (state: RootState): boolean =>
  state.settingsState.loading;

export const selectSettingsError = (state: RootState): string | null =>
  state.settingsState.error;

// features/settings/thunks.ts
import { createAsyncThunk } from '@reduxjs/toolkit';
import type { RootState, AppDispatch } from '../../../app/store';
import type { FrontSettings, KnownError } from './types';
import * as settingsService from './service';

export const settingsGetCurrentSettings = createAsyncThunk<
  FrontSettings,
  void,
  {
    dispatch: AppDispatch;
    state: RootState;
    rejectValue: KnownError;
  }
>(
  'settingsState/settingsGetCurrentSettings',
  async (_, { rejectWithValue }) => {
    try {
      return await settingsService.getCurrentSettings();
    } catch (error: unknown) {
      const knownError = parseError(error);
      return rejectWithValue(knownError);
    }
  }
);

export const updateSettings = createAsyncThunk<
  FrontSettings,
  Partial<FrontSettings>,
  {
    dispatch: AppDispatch;
    state: RootState;
    rejectValue: KnownError;
  }
>(
  'settingsState/updateSettings',
  async (settings: Partial<FrontSettings>, { rejectWithValue }) => {
    try {
      return await settingsService.updateSettings(settings);
    } catch (error: unknown) {
      const knownError = parseError(error);
      return rejectWithValue(knownError);
    }
  }
);

// features/settings/slice.ts
import { createSlice, isPending, isRejected } from '@reduxjs/toolkit';
import type { SettingsState } from './types';
import { settingsGetCurrentSettings, updateSettings } from './thunks';

const initialState: SettingsState = {
  currentSettings: null,
  loading: false,
  error: null,
};

const settingsSlice = createSlice({
  name: 'settingsState',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(settingsGetCurrentSettings.fulfilled, (state, action) => {
        state.currentSettings = action.payload;
        state.loading = false;
        state.error = null;
      })
      .addCase(updateSettings.fulfilled, (state, action) => {
        state.currentSettings = action.payload;
        state.loading = false;
        state.error = null;
      })
      .addMatcher(isPending(settingsGetCurrentSettings, updateSettings), (state) => {
        state.loading = true;
        state.error = null;
      })
      .addMatcher(isRejected(settingsGetCurrentSettings, updateSettings), (state, action) => {
        state.loading = false;
        state.error = action.payload?.errorMessage || 'An error occurred';
      });
  },
});

export const { clearError } = settingsSlice.actions;
export default settingsSlice.reducer;
```