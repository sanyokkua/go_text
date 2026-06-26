import '@testing-library/jest-dom';
import { toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

// Radix UI primitives (e.g. Slider) call ResizeObserver internally; jsdom doesn't provide it.
globalThis.ResizeObserver = class ResizeObserver {
    observe(): void { return; }
    unobserve(): void { return; }
    disconnect(): void { return; }
};
