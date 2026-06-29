import type { ThemeEffective, ThemeMode } from '../store/theme/types';

export function resolveEffectiveTheme(mode: ThemeMode | string): ThemeEffective {
    if (mode === 'dark') return 'dark';
    if (mode === 'light') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme(effective: ThemeEffective): void {
    if (effective === 'dark') {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
}

export function initTheme(mode: ThemeMode | string): ThemeEffective {
    const effective = resolveEffectiveTheme(mode);
    applyTheme(effective);
    return effective;
}

export function watchSystemTheme(mode: ThemeMode | string, onChange: (effective: ThemeEffective) => void): () => void {
    if (mode !== 'auto' && mode !== '') return () => {};

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = (e: MediaQueryListEvent): void => {
        const effective: ThemeEffective = e.matches ? 'dark' : 'light';
        applyTheme(effective);
        onChange(effective);
    };
    mq.addEventListener('change', listener);
    return () => mq.removeEventListener('change', listener);
}
