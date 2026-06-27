import '@testing-library/jest-dom';
import { toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

// Radix UI primitives (e.g. Slider) call ResizeObserver internally; jsdom doesn't provide it.
globalThis.ResizeObserver = class ResizeObserver {
    observe(): void {
        return;
    }
    unobserve(): void {
        return;
    }
    disconnect(): void {
        return;
    }
};

// Radix Select calls hasPointerCapture/releasePointerCapture on pointer events;
// jsdom does not implement these on HTMLElement.
if (!HTMLElement.prototype.hasPointerCapture) {
    HTMLElement.prototype.hasPointerCapture = (_pointerId: number): boolean => false;
}
if (!HTMLElement.prototype.setPointerCapture) {
    HTMLElement.prototype.setPointerCapture = (_pointerId: number): void => {
        return;
    };
}
if (!HTMLElement.prototype.releasePointerCapture) {
    HTMLElement.prototype.releasePointerCapture = (_pointerId: number): void => {
        return;
    };
}

// Radix Select scrolls items into view when the dropdown opens; jsdom stubs this.
if (!HTMLElement.prototype.scrollIntoView) {
    HTMLElement.prototype.scrollIntoView = (): void => {
        return;
    };
}
