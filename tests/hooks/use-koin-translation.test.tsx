// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderHook } from '@testing-library/react';
import { useKoinTranslation, KoinI18nProvider } from '../../src/hooks/useKoinTranslation';
import { es } from '../../src/locales/es';

describe('useKoinTranslation Hook & KoinI18nProvider', () => {
    it('returns default English translations when rendered without a provider', () => {
        const { result } = renderHook(() => useKoinTranslation());
        expect(result.current.controls.play).toBe('Play');
        expect(result.current.controls.pause).toBe('Pause');
        expect(result.current.settings.title).toBe('Settings');
    });

    it('returns provided full language translations (e.g. Spanish)', () => {
        const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
            <KoinI18nProvider translations={es}>{children}</KoinI18nProvider>
        );

        const { result } = renderHook(() => useKoinTranslation(), { wrapper });
        expect(result.current.controls.play).toBe(es.controls.play);
        expect(result.current.settings.title).toBe(es.settings.title);
    });

    it('supports partial overrides without losing sibling translations', () => {
        const customPartial = {
            controls: {
                play: 'Start Emulation',
            },
            settings: {
                title: 'Retro Config',
            },
        };

        const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
            <KoinI18nProvider translations={customPartial}>{children}</KoinI18nProvider>
        );

        const { result } = renderHook(() => useKoinTranslation(), { wrapper });

        // Overridden keys
        expect(result.current.controls.play).toBe('Start Emulation');
        expect(result.current.settings.title).toBe('Retro Config');

        // Preserved defaults from en
        expect(result.current.controls.pause).toBe('Pause');
        expect(result.current.controls.reset).toBe('Reset');
        expect(result.current.settings.general).toBe('General');
    });
});
