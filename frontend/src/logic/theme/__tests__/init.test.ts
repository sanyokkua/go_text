import { applyTheme, initTheme, resolveEffectiveTheme, THEME_STORAGE_KEY, watchSystemTheme } from '../init';
import type { ThemeEffective } from '../../store/theme/types';

// ── matchMedia mock helpers ──────────────────────────────────────────────────

type MQListener = (e: Pick<MediaQueryListEvent, 'matches'>) => void;

interface MockMQ {
    matches: boolean;
    addEventListener: jest.Mock;
    removeEventListener: jest.Mock;
    dispatchEvent: jest.Mock;
    _fire(matches: boolean): void;
}

function createMQMock(isDark: boolean): MockMQ {
    const listeners: MQListener[] = [];
    return {
        matches: isDark,
        addEventListener: jest.fn((ev: string, fn: MQListener) => {
            if (ev === 'change') listeners.push(fn);
        }),
        removeEventListener: jest.fn((ev: string, fn: MQListener) => {
            const i = listeners.indexOf(fn);
            if (i >= 0) listeners.splice(i, 1);
        }),
        dispatchEvent: jest.fn(),
        _fire(matches: boolean) {
            listeners.forEach((l) => l({ matches } as MediaQueryListEvent));
        },
    };
}

function setMQMock(isDark: boolean): MockMQ {
    const mq = createMQMock(isDark);
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn(() => mq),
    });
    return mq;
}

// ── tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
    document.documentElement.classList.remove('dark');
});

describe('THEME_STORAGE_KEY', () => {
    it('is the string "ui.theme"', () => {
        expect(THEME_STORAGE_KEY).toBe('ui.theme');
    });
});

describe('resolveEffectiveTheme', () => {
    it('returns "light" for mode "light" regardless of OS', () => {
        setMQMock(true);
        expect(resolveEffectiveTheme('light')).toBe<ThemeEffective>('light');
    });

    it('returns "dark" for mode "dark" regardless of OS', () => {
        setMQMock(false);
        expect(resolveEffectiveTheme('dark')).toBe<ThemeEffective>('dark');
    });

    it('returns "dark" for mode "auto" when OS prefers dark', () => {
        setMQMock(true);
        expect(resolveEffectiveTheme('auto')).toBe<ThemeEffective>('dark');
    });

    it('returns "light" for mode "auto" when OS prefers light', () => {
        setMQMock(false);
        expect(resolveEffectiveTheme('auto')).toBe<ThemeEffective>('light');
    });

    it('treats empty string as "auto" and follows OS', () => {
        setMQMock(true);
        expect(resolveEffectiveTheme('')).toBe<ThemeEffective>('dark');
    });
});

describe('applyTheme', () => {
    it('adds .dark class to documentElement for "dark"', () => {
        applyTheme('dark');
        expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('removes .dark class from documentElement for "light"', () => {
        document.documentElement.classList.add('dark');
        applyTheme('light');
        expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('is idempotent: adding dark twice leaves one class', () => {
        applyTheme('dark');
        applyTheme('dark');
        expect([...document.documentElement.classList].filter((c) => c === 'dark').length).toBe(1);
    });
});

describe('initTheme', () => {
    it('applies dark class and returns "dark" when mode is "dark"', () => {
        setMQMock(false);
        const result = initTheme('dark');
        expect(result).toBe('dark');
        expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('applies no dark class and returns "light" when mode is "light"', () => {
        const result = initTheme('light');
        expect(result).toBe('light');
        expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('follows OS in auto mode — dark OS', () => {
        setMQMock(true);
        const result = initTheme('auto');
        expect(result).toBe('dark');
        expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('follows OS in auto mode — light OS', () => {
        setMQMock(false);
        const result = initTheme('auto');
        expect(result).toBe('light');
        expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
});

describe('watchSystemTheme', () => {
    it('returns a no-op cleanup for mode "light"', () => {
        const mq = setMQMock(false);
        const onChange = jest.fn();
        const cleanup = watchSystemTheme('light', onChange);
        expect(mq.addEventListener).not.toHaveBeenCalled();
        cleanup();
        expect(mq.removeEventListener).not.toHaveBeenCalled();
    });

    it('returns a no-op cleanup for mode "dark"', () => {
        const mq = setMQMock(true);
        const onChange = jest.fn();
        const cleanup = watchSystemTheme('dark', onChange);
        expect(mq.addEventListener).not.toHaveBeenCalled();
        cleanup();
    });

    it('registers a matchMedia listener for mode "auto"', () => {
        const mq = setMQMock(false);
        const onChange = jest.fn();
        watchSystemTheme('auto', onChange);
        expect(mq.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });

    it('fires onChange with "dark" and applies class when OS flips to dark', () => {
        const mq = setMQMock(false);
        const onChange = jest.fn();
        watchSystemTheme('auto', onChange);
        mq._fire(true);
        expect(onChange).toHaveBeenCalledWith('dark');
        expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('fires onChange with "light" and removes class when OS flips to light', () => {
        const mq = setMQMock(true);
        document.documentElement.classList.add('dark');
        const onChange = jest.fn();
        watchSystemTheme('auto', onChange);
        mq._fire(false);
        expect(onChange).toHaveBeenCalledWith('light');
        expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('cleanup removes the matchMedia listener', () => {
        const mq = setMQMock(false);
        const onChange = jest.fn();
        const cleanup = watchSystemTheme('auto', onChange);
        cleanup();
        expect(mq.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
        mq._fire(true);
        expect(onChange).not.toHaveBeenCalled();
    });
});
