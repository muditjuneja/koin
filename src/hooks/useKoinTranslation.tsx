import React, { createContext, useContext, useMemo } from 'react';
import { KoinTranslations, RecursivePartial } from '../locales/types';
import { en } from '../locales/en';

// -- Context --
// koin.js and koin.js/netplay are separate bundles that each include this
// module. Keep one context per page so a KoinI18nProvider from either bundle
// reaches components from both.
const CONTEXT_KEY = Symbol.for('koin.js/i18n-context');
const globalScope = globalThis as unknown as Record<symbol, React.Context<KoinTranslations> | undefined>;
const KoinI18nContext = globalScope[CONTEXT_KEY] ?? (globalScope[CONTEXT_KEY] = createContext<KoinTranslations>(en));

// -- Helper: Simple Deep Merge --
function deepMerge<T extends object>(target: T, source: RecursivePartial<T>): T {
    const result: any = { ...target };
    for (const key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
            const sourceValue = source[key];
            const targetValue = result[key];

            if (
                sourceValue &&
                typeof sourceValue === 'object' &&
                targetValue &&
                typeof targetValue === 'object' &&
                !Array.isArray(sourceValue)
            ) {
                result[key] = deepMerge(targetValue, sourceValue as any);
            } else if (sourceValue !== undefined) {
                result[key] = sourceValue;
            }
        }
    }
    return result as T;
}

// -- Provider --
interface KoinI18nProviderProps {
    children: React.ReactNode;
    translations?: RecursivePartial<KoinTranslations>;
}

export const KoinI18nProvider: React.FC<KoinI18nProviderProps> = ({ children, translations }) => {
    const value = useMemo(() => {
        if (!translations) return en;
        return deepMerge(en, translations);
    }, [translations]);

    return (
        <KoinI18nContext.Provider value={value}>
            {children}
        </KoinI18nContext.Provider>
    );
};

// -- Hook --
export function useKoinTranslation() {
    return useContext(KoinI18nContext);
}
