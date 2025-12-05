import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import GamePlayer from './components/GamePlayer';
import { GamePlayerProps } from './components/types';

class RetroGamePlayerElement extends HTMLElement {
    private root: Root | null = null;
    private _props: Partial<GamePlayerProps> = {};

    static get observedAttributes() {
        return ['rom-url', 'system', 'title', 'core', 'bios-url', 'system-color'];
    }

    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        if (!this.shadowRoot) return;

        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            :host { 
                display: block; 
                width: 100%; 
                height: 100%; 
                min-height: 400px;
                position: relative;
            }
            /* Import Tailwind styles if needed, or rely on GamePlayer's internal styles being scoped */
        `;
        this.shadowRoot.appendChild(style);

        // Create mount point
        const mountPoint = document.createElement('div');
        mountPoint.style.width = '100%';
        mountPoint.style.height = '100%';
        this.shadowRoot.appendChild(mountPoint);

        this.root = createRoot(mountPoint);
        this.render();
    }

    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
        if (oldValue === newValue) return;
        this.render();
    }

    // Property setters for complex data objects (save handlers, etc.)
    set onSaveState(handler: GamePlayerProps['onSaveState']) {
        this._props.onSaveState = handler;
        this.render();
    }

    set onLoadState(handler: GamePlayerProps['onLoadState']) {
        this._props.onLoadState = handler;
        this.render();
    }

    set retroAchievementsConfig(config: GamePlayerProps['retroAchievementsConfig']) {
        this._props.retroAchievementsConfig = config;
        this.render();
    }

    set cheats(cheats: GamePlayerProps['cheats']) {
        this._props.cheats = cheats;
        this.render();
    }

    private getProps(): GamePlayerProps {
        const romUrl = this.getAttribute('rom-url') || '';
        const system = this.getAttribute('system') || 'nes';
        const title = this.getAttribute('title') || 'Retro Game';
        const core = this.getAttribute('core') || undefined;
        const biosUrl = this.getAttribute('bios-url') || undefined;
        const systemColor = this.getAttribute('system-color') || undefined;

        // Merge attributes and properties
        return {
            romId: romUrl, // Default ID to URL if not provided
            romUrl,
            system,
            title,
            core,
            biosUrl,
            systemColor,
            ...this._props,
        };
    }

    private render() {
        if (!this.root) return;

        const props = this.getProps();

        // We need to inject styles into the shadow DOM because CSS modules/Tailwind 
        // won't automatically penetrate. 
        // Ideally, we supply a style prop or inject a <link> to the CSS.
        // For now, we assume styles are handled or inline.

        this.root.render(
            <React.StrictMode>
                {/* Pass class name or style to ensure full height */}
                <GamePlayer {...props} style={{ width: '100%', height: '100%' }} />
            </React.StrictMode>
        );
    }

    disconnectedCallback() {
        if (this.root) {
            this.root.unmount();
        }
    }
}

// Define the custom element
if (typeof window !== 'undefined' && !customElements.get('retro-game-player')) {
    customElements.define('retro-game-player', RetroGamePlayerElement);
}

export default RetroGamePlayerElement;
