import path from 'path';
// @ts-expect-error — @vitejs/plugin-react has no default-export type declaration in this version
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

function bridgeMockPlugin(): Plugin {
    return {
        name: 'vite-plugin-bridge-mock',
        enforce: 'pre',
        resolveId(id: string) {
            // ApplicationContextHolder doesn't end in "Handler" but mocks as AppHandler
            if (/wailsjs\/go\/application\/ApplicationContextHolder$/.test(id)) {
                return path.resolve(__dirname, 'src/dev/bridge-mock/go/main/AppHandler.ts');
            }
            // Redirect any wailsjs handler import to bridge mock
            const handlerMatch = id.match(/wailsjs\/go\/(?:[^/]+)\/(\w+Handler)$/);
            if (handlerMatch) {
                return path.resolve(__dirname, `src/dev/bridge-mock/go/main/${handlerMatch[1]}.ts`);
            }
            // Redirect Wails runtime
            if (id === '@wailsapp/runtime' || /wailsjs\/runtime$/.test(id)) {
                return path.resolve(__dirname, 'src/dev/bridge-mock/runtime/index.ts');
            }
            return undefined;
        },
    };
}

export default defineConfig(({ mode }) => {
    // Bridge mock is active only when running plain `npm run dev` (not `npm run dev -- --mode wails`)
    const isMockMode = mode !== 'wails' && mode !== 'production';
    return {
        plugins: [react(), ...(isMockMode ? [bridgeMockPlugin()] : [])],
    };
});
