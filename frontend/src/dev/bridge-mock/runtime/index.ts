// Mock for @wailsapp/runtime — used when running plain `npm run dev` without Wails backend

type EventCallback = (...data: unknown[]) => void;
const listeners = new Map<string, EventCallback[]>();

export function EventsOn(eventName: string, callback: EventCallback): () => void {
    const existing = listeners.get(eventName) ?? [];
    listeners.set(eventName, [...existing, callback]);
    return () => EventsOff(eventName);
}

export function EventsOff(eventName: string): void {
    listeners.delete(eventName);
}

export function EventsOnce(eventName: string, callback: EventCallback): void {
    const unsub = EventsOn(eventName, (...data) => {
        callback(...data);
        unsub();
    });
}

export function EventsEmit(eventName: string, ...data: unknown[]): void {
    listeners.get(eventName)?.forEach((cb) => cb(...data));
}

// Log stubs
export function LogDebug(_msg: string): void {}
export function LogInfo(_msg: string): void {}
export function LogWarning(_msg: string): void {}
export function LogError(_msg: string): void {}
export function LogFatal(_msg: string): void {}

// Window stubs
export function WindowSetTitle(_title: string): void {}
export function WindowReload(): void {}
export function WindowMinimise(): void {}
export function WindowMaximise(): void {}
export function WindowUnmaximise(): void {}
export function WindowToggleMaximise(): void {}
export function WindowCenter(): void {}
export function WindowSetSize(_width: number, _height: number): void {}
export function WindowSetMinSize(_width: number, _height: number): void {}
export function WindowSetMaxSize(_width: number, _height: number): void {}
export function WindowHide(): void {}
export function WindowShow(): void {}
export function WindowFullscreen(): void {}
export function WindowUnfullscreen(): void {}
export function WindowIsMaximised(): Promise<boolean> { return Promise.resolve(false); }
export function WindowIsMinimised(): Promise<boolean> { return Promise.resolve(false); }
export function WindowIsFullscreen(): Promise<boolean> { return Promise.resolve(false); }
export function WindowIsNormal(): Promise<boolean> { return Promise.resolve(true); }

export function Environment(): Promise<unknown> {
    return Promise.resolve({ buildType: 'dev', platform: 'mac', arch: 'arm64' });
}

export function Quit(): void {}
export function Hide(): void {}
export function Show(): void {}
