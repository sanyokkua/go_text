export interface ClipboardState {
    loading: boolean;
    lastActionSuccess: boolean | null; // true = copy success, false = fail
    error: string | null;
}
