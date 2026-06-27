import { Component, type ErrorInfo, type ReactNode } from 'react';
import { LogError } from '../../wailsjs/runtime';

interface Props {
    children: ReactNode;
}

interface State {
    failed: boolean;
}

export default class RootErrorBoundary extends Component<Props, State> {
    state: State = { failed: false };

    static getDerivedStateFromError(): State {
        return { failed: true };
    }

    componentDidCatch(err: Error, info: ErrorInfo): void {
        const detail = `${err.message}\n${info.componentStack ?? ''}`;
        LogError(detail);
    }

    render(): ReactNode {
        if (this.state.failed) {
            return (
                <div style={{ padding: '2rem', textAlign: 'center' }}>
                    <p>Something went wrong.</p>
                    <button type="button" onClick={() => location.reload()}>
                        Reload
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}
