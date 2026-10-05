#!/usr/bin/env node
/**
 * Generates src/components/console-icon-paths.ts — the path data behind <ConsoleIcon>.
 *
 * Every icon is drawn on a 64×64 grid as one or more `fill-rule="evenodd"` paths
 * filled with currentColor: a subpath inside another one punches a hole (screens,
 * slots, buttons), a subpath inside a hole is filled again. Icons therefore take
 * the surrounding text colour and stay sharp at any size.
 *
 * Views: home consoles are drawn from slightly above the front (a foreshortened
 * top face over the front face), handhelds and the arcade cabinet straight on.
 *
 *   node scripts/generate-console-icons.mjs
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const n = (v) => +v.toFixed(2);

/** Rectangle, optionally rounded: r is a radius or [tl, tr, br, bl]. */
const R = (x, y, w, h, r = 0) => {
    const [tl, tr, br, bl] = Array.isArray(r) ? r : [r, r, r, r];
    const arc = (rad, ex, ey) => (rad ? `A${n(rad)} ${n(rad)} 0 0 1 ${n(ex)} ${n(ey)}` : '');
    return (
        `M${n(x + tl)} ${n(y)}H${n(x + w - tr)}${arc(tr, x + w, y + tr)}` +
        `V${n(y + h - br)}${arc(br, x + w - br, y + h)}` +
        `H${n(x + bl)}${arc(bl, x, y + h - bl)}` +
        `V${n(y + tl)}${arc(tl, x + tl, y)}Z`
    );
};
const E = (cx, cy, rx, ry = rx) =>
    `M${n(cx - rx)} ${n(cy)}a${n(rx)} ${n(ry)} 0 1 0 ${n(2 * rx)} 0a${n(rx)} ${n(ry)} 0 1 0 ${n(-2 * rx)} 0Z`;
/** Polygon from a flat list of x, y pairs. */
const P = (...c) => {
    let d = '';
    for (let i = 0; i < c.length; i += 2) d += `${i ? 'L' : 'M'}${n(c[i])} ${n(c[i + 1])}`;
    return d + 'Z';
};
/** Rectangle of w×h centred on cx, cy, rotated by deg. */
const rot = (cx, cy, w, h, deg) => {
    const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
    const pts = [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]];
    return P(...pts.flatMap(([x, y]) => [cx + x * c - y * s, cy + x * s + y * c]));
};
/** D-pad: a plus of overall size s and arm thickness t. */
const plus = (cx, cy, s, t) => {
    const a = s / 2, b = t / 2;
    return P(cx - b, cy - a, cx + b, cy - a, cx + b, cy - b, cx + a, cy - b, cx + a, cy + b, cx + b, cy + b,
        cx + b, cy + a, cx - b, cy + a, cx - b, cy + b, cx - a, cy + b, cx - a, cy - b, cx - b, cy - b);
};
/** Repeat a shape: fn(i) for i in [0, count). */
const rep = (count, fn) => Array.from({ length: count }, (_, i) => fn(i)).join('');
/** Outline of a shape `inset` units thick: outer hole + inner fill (use inside a filled body). */
const ring = (outer, inner) => outer + inner;
/** Four buttons in a diamond around cx, cy. */
const diamond = (cx, cy, d, r) => E(cx, cy - d, r) + E(cx + d, cy, r) + E(cx, cy + d, r) + E(cx - d, cy, r);

const ICONS = {
    // ───────────── Nintendo ─────────────
    NES: [
        // Top face: grey lid with the black ribbed band on the right
        R(2, 15, 60, 15, [2, 2, 0, 0]) +
            R(42, 15, 12, 15) + rep(5, (i) => R(42, 16.5 + i * 2.8, 12, 1.4)),
        // Front face: cartridge door, ribbed band, power/reset, two controller ports
        R(2, 31, 60, 19, [0, 0, 1.5, 1.5]) +
            ring(R(5, 33, 35, 9, 0.5), R(6.5, 34.5, 32, 6)) +
            R(42, 31, 12, 11) + rep(4, (i) => R(42, 32.5 + i * 2.6, 12, 1.3)) +
            E(7, 46.5, 1) + R(10, 45, 5, 3, 0.5) + R(17, 45, 5, 3, 0.5) +
            R(41, 44.5, 5, 4, 1) + R(49, 44.5, 5, 4, 1),
    ],
    SNES: [
        // Super Famicom / PAL: rounded shell, flared cartridge bay, power + eject + reset in front of the slot
        R(4, 15, 56, 22, [7, 7, 0, 0]) +
            P(16, 15, 17.4, 15, 13.4, 37, 12, 37) + P(46.6, 15, 48, 15, 52, 37, 50.6, 37) +
            R(21, 18.5, 22, 4.5, 1.5) +
            R(17.5, 28, 7, 4, 2) + R(29, 28.5, 6, 3.5, 1.5) + R(39.5, 28, 7, 4, 2),
        R(4, 38, 56, 11, [0, 0, 6, 6]) + R(21, 41.5, 9, 4.5, [1, 1, 2, 2]) + R(34, 41.5, 9, 4.5, [1, 1, 2, 2]),
    ],
    N64: [
        // The trident controller
        'M14 12H50C58 12 61 19 61 27L60 44C60 52 57 57 53.5 57C50 57 48 54 47.5 50L45.5 40.5C44.8 37.6 42.2 37 40.6 39.2' +
            'L38.8 49C38.2 55 35.5 58 32 58C28.5 58 25.8 55 25.2 49L23.4 39.2C21.8 37 19.2 37.6 18.5 40.5L16.5 50' +
            'C16 54 14 57 10.5 57C7 57 4 52 4 44L3 27C3 19 6 12 14 12Z' +
            plus(13.5, 25, 11, 3.6) + E(32, 23, 1.7) +
            E(32, 33.5, 4.6) + E(32, 33.5, 2.8) +
            E(52, 17.5, 1.6) + E(48.5, 21, 1.6) + E(55.5, 21, 1.6) + E(52, 24.5, 1.6) +
            E(47, 30.5, 2.5) + E(42.5, 26.5, 2.5),
    ],
    GB: [
        // DMG: the curved bottom-right corner, bezel with power LED, slanted A/B, speaker slots
        R(15, 4, 34, 56, [2, 2, 11, 2]) +
            ring(R(18.5, 8, 27, 23, [1.5, 1.5, 7, 1.5]), R(19.7, 9.2, 24.6, 20.6, [1, 1, 6, 1])) +
            R(24.5, 11.5, 17, 15) + E(21.8, 17.5, 0.9) +
            plus(23.5, 41.5, 10, 3.4) + E(37.5, 44, 2.7) + E(43.5, 40.5, 2.7) +
            rot(27.5, 51.5, 4.5, 1.6, -28) + rot(33.5, 51.5, 4.5, 1.6, -28) +
            rep(6, (i) => rot(38.5 + i * 2.2, 53.5, 1.1, 7, 30)),
    ],
    GBC: [
        // GBC: slimmer, rounded bottom, bezel with a curved lower edge, dot speaker
        'M18 5H46C47.1 5 48 5.9 48 7V53.5C48 56.5 46 58.6 43 59.1C36 60.3 28 60.3 21 59.1C18 58.6 16 56.5 16 53.5V7C16 5.9 16.9 5 18 5Z' +
            'M18.5 8H45.5V31C38.5 34 25.5 34 18.5 31Z' + 'M20 9.5H44V30C37.5 32.5 26.5 32.5 20 30Z' +
            R(23, 11.5, 18, 16) +
            plus(24, 42, 9.5, 3.2) + E(36.5, 44.5, 2.5) + E(42, 41, 2.5) +
            R(26, 51, 4, 1.6, 0.8) + R(32, 51, 4, 1.6, 0.8) +
            rep(3, (r) => rep(3, (c) => E(40 + c * 2.4 + r * 0.6, 51.5 + r * 2.2, 0.7))),
    ],
    GBA: [
        'M12 15C16 15 18 17 21 17H43C46 17 48 15 52 15C58 15 61 22 61 32.5C61 43 58 50 52 50C48 50 46 48 43 48H21' +
            'C18 48 16 50 12 50C6 50 3 43 3 32.5C3 22 6 15 12 15Z' +
            ring(R(19, 19.5, 26, 26, 3), R(20.3, 20.8, 23.4, 23.4, 2)) + R(22, 23, 20, 13.5) +
            plus(11.5, 28.5, 9.5, 3.2) + E(10, 39, 1.1) + E(10, 43, 1.1) +
            E(55.5, 29, 2.6) + E(50.5, 33, 2.6) +
            rep(3, (i) => rot(52 + i * 2, 42.5, 1, 5, 25)),
    ],
    NDS: [
        // DS Lite, opened: two screens, speaker dots, d-pad, ABXY, start/select
        R(6, 3, 52, 28, 4) + R(18, 7, 28, 21) + rep(3, (i) => E(11.5, 13 + i * 2.6, 0.8) + E(52.5, 13 + i * 2.6, 0.8)),
        R(6, 33, 52, 28, 4) + ring(R(16.5, 35.5, 31, 23, 1), R(17.7, 36.7, 28.6, 20.6, 0.5)) + R(19, 38, 26, 18) +
            plus(11, 42.5, 8, 2.7) + diamond(52.5, 42.5, 3.4, 1.5) + E(51, 51.5, 0.9) + E(51, 54.5, 0.9),
        // hinge
        R(6, 30.5, 6, 3) + R(52, 30.5, 6, 3),
    ],
    VIRTUAL_BOY: [
        // Visor
        'M11 12H53C58 12 61 15 61 20V26C61 31 58 34 53 34H11C6 34 3 31 3 26V20C3 15 6 12 11 12Z' +
            ring(R(7, 19, 50, 10, 4), R(8.5, 20.5, 47, 7, 3)) + R(29, 22.5, 6, 3, 1.5),
        E(32, 12, 9, 3.2) + R(23.5, 7.5, 17, 3, 1.5),
        // Bipod stand
        R(30, 33, 4, 9) + E(32, 43, 3.2) + rot(24.5, 51, 3, 19, 40) + rot(39.5, 51, 3, 19, -40) +
            R(12, 57.5, 9, 3, 1.5) + R(43, 57.5, 9, 3, 1.5),
    ],
    // ───────────── Sega ─────────────
    GENESIS: [
        // Model 1: the circular cartridge bay, vent fins, power + reset
        R(3, 16, 58, 20, [3, 3, 0, 0]) +
            ring(E(38, 26, 14, 8.5), E(38, 26, 12.4, 7)) + R(29, 24.3, 18, 3.4, 1) +
            rep(4, (i) => R(6, 18.5 + i * 2.6, 13, 1.3)) +
            R(6, 30, 6, 3.5, 1) + R(14, 30, 4, 3.5, 1),
        R(3, 37, 58, 12, [0, 0, 1.5, 1.5]) +
            P(9, 40.5, 16, 40.5, 15.2, 45, 9.8, 45) + P(19, 40.5, 26, 40.5, 25.2, 45, 19.8, 45) +
            R(48, 41.5, 8, 1.6, 0.8),
    ],
    MASTER_SYSTEM: [
        // Model 1: raised cartridge bay on a bevelled slope, pause/reset, vent grille, card slot on the front
        P(23, 19, 41, 19, 44, 26, 20, 26) + R(25, 20.8, 14, 2.5, 0.8),
        P(9, 27, 55, 27, 62, 39, 2, 39) + R(8, 32.5, 5, 2.6, 0.8) + R(15, 32.5, 5, 2.6, 0.8) +
            rep(4, (i) => R(44 + i * 3.2, 30, 1.6, 6.5, 0.5)),
        R(2, 40, 60, 10, [0, 0, 1.5, 1.5]) + R(4, 42, 56, 1) + E(6.5, 46, 0.9) + R(38, 45, 18, 2, 0.6),
    ],
    GAME_GEAR: [
        'M12 16H52C58 16 62 21 62 29V36C62 43 58 48 52 48H12C6 48 2 43 2 36V29C2 21 6 16 12 16Z' +
            ring('M18 18.5H46V40C46 44 44 46 40 46H24C20 46 18 44 18 40Z', 'M19.4 19.9H44.6V39.6C44.6 43 43 44.6 39.6 44.6H24.4C21 44.6 19.4 43 19.4 39.6Z') +
            R(23, 22, 18, 15.5) +
            E(10.5, 31, 5.6) + plus(10.5, 31, 8.4, 2.8) +
            E(50.5, 35, 2.7) + E(56, 30.5, 2.7) + E(55, 21.5, 1.3) +
            rep(2, (r) => rep(4, (c) => E(6.5 + c * 2.2, 41.5 + r * 2.2, 0.65))),
    ],
    SATURN: [
        // Oval lid, cartridge slot at the back, power / open / reset along the front edge
        R(3, 15, 58, 21, [5, 5, 0, 0]) +
            ring(E(32, 25.5, 16, 8), E(32, 25.5, 14.4, 6.6)) + E(32, 25.5, 3, 1.6) +
            R(20, 16.5, 24, 2.2, 1) +
            R(29, 33.3, 6, 2, 1) + R(7, 30, 6, 3, 1.5) + R(51, 30, 6, 3, 1.5),
        R(3, 37, 58, 12, [0, 0, 4, 4]) + R(18, 40.5, 10, 4.5, [1, 1, 2, 2]) + R(36, 40.5, 10, 4.5, [1, 1, 2, 2]),
    ],
    // ───────────── Sony ─────────────
    PS1: [
        // Round disc lid, OPEN button, power + reset at the back right
        R(3, 17, 58, 19, [1.5, 1.5, 0, 0]) +
            ring(E(27, 26.5, 15, 8), E(27, 26.5, 13.5, 6.7)) + E(27, 26.5, 2.4, 1.3) +
            E(51.5, 29.5, 4.5, 2.8) + R(45, 19.5, 5, 2.5, 1.2) + R(53, 19.5, 5, 2.5, 1.2),
        R(3, 37, 58, 11, [0, 0, 1.5, 1.5]) +
            R(13, 39, 10, 1.6, 0.5) + R(13, 42, 10, 3.6, 1.2) + R(41, 39, 10, 1.6, 0.5) + R(41, 42, 10, 3.6, 1.2),
    ],
    // ───────────── NEC ─────────────
    PC_ENGINE: [
        // Small, nearly square box: rear vents, HuCard slot with its power slider, DIN pad port
        R(13, 12, 38, 24, [2, 2, 0, 0]) +
            rep(4, (i) => R(16, 14.5 + i * 2.4, 32, 1.2)) +
            R(19, 26.5, 26, 2.8, 1) + R(28, 31, 8, 2.6, 1),
        R(13, 37, 38, 11, [0, 0, 1.5, 1.5]) + R(17, 40.5, 20, 2.6, 0.5) + E(45, 42.5, 2.6) + E(45, 42.5, 1),
    ],
    // ───────────── SNK ─────────────
    NEOGEO: [
        // AES: huge cartridge slot, memory card slot, two wide DA-15 pad ports
        R(2, 16, 60, 20, [2, 2, 0, 0]) +
            ring(R(9, 18, 46, 7.5, 1.5), R(10.4, 19.4, 43.2, 4.7, 1)) + R(12, 20.8, 40, 1.9) +
            R(6, 30, 8, 3, 1.2) + R(16, 30, 5, 3, 1.2),
        R(2, 37, 60, 11, [0, 0, 1.5, 1.5]) + R(7, 40.5, 15, 2.4, 0.5) +
            P(31, 39.5, 42, 39.5, 41, 44.5, 32, 44.5) + P(46, 39.5, 57, 39.5, 56, 44.5, 47, 44.5),
    ],
    NEOGEO_POCKET: [
        // Clicky stick, small square screen, A/B, option button
        R(4, 15, 56, 34, 9) +
            ring(R(20, 18, 24, 28, 3), R(21.3, 19.3, 21.4, 25.4, 2)) + R(24, 22, 16, 15.5) +
            E(12, 30, 5.4) + E(12, 30, 3.4) + E(12, 30, 1.2) +
            E(50, 34, 2.5) + E(55.2, 29.5, 2.5) + E(52.5, 20.5, 1.1) +
            rep(3, (i) => E(9 + i * 2.4, 42.5, 0.7)),
    ],
    NEOGEO_POCKET_COLOR: [
        // Same layout as the original with a larger screen and rounder shell
        R(3, 14, 58, 36, 12) +
            ring(R(18, 17, 28, 30, 4), R(19.3, 18.3, 25.4, 27.4, 3)) + R(21.5, 20, 21, 20) +
            E(11.5, 30, 5.4) + E(11.5, 30, 3.4) + E(11.5, 30, 1.2) +
            E(50.5, 34, 2.5) + E(55.7, 29.5, 2.5) + E(53, 20.5, 1.1) +
            rep(3, (i) => E(8.5 + i * 2.4, 42.5, 0.7)),
    ],
    // ───────────── Atari ─────────────
    LYNX: [
        // Lynx II: very wide, screen left of centre, two pairs of buttons
        'M11 20H53C59 20 63 26 63 32.5C63 39 59 45 53 45H11C5 45 1 39 1 32.5C1 26 5 20 11 20Z' +
            ring(R(17, 22, 29, 21, 2), R(18.3, 23.3, 26.4, 18.4, 1.2)) + R(20, 25, 23, 14.6) +
            plus(9.5, 32.5, 9, 3) +
            E(53, 28.5, 2.4) + E(57.5, 34, 2.4) + E(50, 39.5, 1) + E(54, 40.5, 1) +
            rep(3, (i) => R(49, 23 + i * 1.8, 6, 0.9, 0.45)),
    ],
    ATARI_2600: [
        // Woodgrain front under a ribbed black slope; switches and cartridge slot on top
        R(9, 17, 46, 7, [1, 1, 0, 0]) + R(25, 18.5, 14, 3.4, 0.8) +
            R(11.5, 19, 3, 3, 0.5) + R(16.5, 19, 3, 3, 0.5) + R(44.5, 19, 3, 3, 0.5) + R(49.5, 19, 3, 3, 0.5),
        P(7, 25, 57, 25, 62, 39, 2, 39) + rep(4, (i) => P(5.5 - i * 0.9, 28.5 + i * 2.8, 58.5 + i * 0.9, 28.5 + i * 2.8, 59 + i * 0.9, 30 + i * 2.8, 5 - i * 0.9, 30 + i * 2.8)),
        R(2, 40, 60, 9, [0, 0, 1, 1]) + R(4, 42.2, 56, 0.9) + R(4, 44.6, 56, 0.9) + R(4, 47, 56, 0.6),
    ],
    ATARI_5200: [
        // Wide sloped body, brushed-metal strip, cartridge slot, four pad ports along the front
        P(6, 18, 58, 18, 62, 37, 2, 37) +
            R(24, 21.5, 16, 4, 1) + ring(P(4.6, 29, 59.4, 29, 60.5, 34, 3.5, 34), P(5.5, 30.2, 58.5, 30.2, 59.3, 32.8, 4.7, 32.8)),
        R(2, 38, 60, 11, [0, 0, 1.5, 1.5]) + rep(4, (i) => E(9 + i * 7, 43.5, 1.9)) + R(48, 42, 9, 3, 1),
    ],
    ATARI_7800: [
        // Low wedge: cartridge slot behind the button row, sloped front with joystick ports
        R(6, 19, 52, 16, [2, 2, 0, 0]) + R(24, 22, 16, 3.4, 0.8) +
            R(9, 29.5, 5, 2.6, 1) + R(16, 29.5, 5, 2.6, 1) + R(43, 29.5, 5, 2.6, 1) + R(50, 29.5, 5, 2.6, 1),
        P(6, 36, 58, 36, 62, 47, 2, 47) + R(5, 38, 54, 0.9) + R(4.3, 40.3, 55.4, 0.9) +
            P(9, 42.5, 15, 42.5, 14.4, 45.5, 9.6, 45.5) + P(17, 42.5, 23, 42.5, 22.4, 45.5, 17.6, 45.5),
    ],
    // ───────────── Bandai ─────────────
    WONDERSWAN: [
        // Held sideways: X and Y button crosses on the left, A/B on the right
        R(3, 15, 58, 34, [6, 9, 9, 6]) +
            ring(R(18, 18, 30, 26, 2), R(19.3, 19.3, 27.4, 23.4, 1.2)) + R(20.5, 21.5, 25, 16) +
            diamond(10, 22, 2.6, 1.1) + diamond(10, 34.5, 3.4, 1.5) +
            E(52.5, 36, 2.4) + E(56.5, 30.5, 2.4) + E(54, 44, 0.9) +
            rep(3, (i) => E(51 + i * 2.4, 20.5, 0.7)),
    ],
    WONDERSWAN_COLOR: [
        R(2, 14, 60, 36, [8, 12, 12, 8]) +
            ring(R(16, 17, 33, 29, 3), R(17.3, 18.3, 30.4, 26.4, 2)) + R(18.5, 20, 28, 19) +
            diamond(9.5, 22.5, 2.6, 1.1) + diamond(9.5, 35, 3.4, 1.5) +
            E(53.5, 36.5, 2.4) + E(57.5, 31, 2.4) + E(55, 44.5, 0.9) +
            rep(3, (i) => E(52 + i * 2.4, 20.5, 0.7)),
    ],
    // ───────────── Others ─────────────
    ARCADE: [
        // Upright cabinet: lit marquee, tilted monitor, control panel, coin door
        R(15, 2, 34, 10, [1.5, 1.5, 0, 0]) + R(18, 4, 28, 6, 0.5),
        P(17, 12, 47, 12, 47, 36, 17, 36) + P(20, 15, 44, 15, 42.5, 32, 21.5, 32),
        R(12, 36, 40, 8, 1) + E(19, 40, 2.4) + E(19, 40, 1.2) + E(28, 40, 1.5) + E(33, 40, 1.5) + E(38, 40, 1.5) + E(43, 40, 1.5),
        R(17, 45, 30, 17) + ring(R(25, 48, 14, 11, 1), R(26.4, 49.4, 11.2, 8.2, 0.5)) + R(28.5, 51, 2.2, 4, 0.5) + R(33.3, 51, 2.2, 4, 0.5),
    ],
    C64: [
        // Breadbin: full keyboard with the F-key column, power LED on the front
        R(2, 18, 60, 25, [5, 5, 0, 0]) +
            [0, 1, 2, 3].map((r) => rep(r === 3 ? 13 : 15, (c) => R(5 + r * 0.8 + c * 3.25, 22 + r * 3.6, 2.6, 2.7, 0.4))).join('') +
            R(16, 36.4, 22, 2.7, 0.4) + rep(4, (i) => R(55.5, 22 + i * 3.6, 4.5, 2.7, 0.4)),
        R(2, 44, 60, 6, [0, 0, 2, 2]) + R(6, 46, 3, 1.6, 0.8) + R(12, 46.2, 10, 1.2),
    ],
    // ───────────── Non-console icons ─────────────
    KOIN: [
        // Brand mark: arcade cabinet with a K on screen
        R(15, 2, 34, 10, [1.5, 1.5, 0, 0]) + R(18, 4, 28, 6, 0.5),
        P(17, 12, 47, 12, 47, 36, 17, 36) + R(20, 15, 24, 18, 1) +
            P(26, 18, 30, 18, 30, 23, 35, 18, 40, 18, 33.5, 24.2, 40, 30, 35, 30, 30, 25.5, 30, 30, 26, 30),
        R(12, 36, 40, 8, 1) + E(19, 40, 2.4) + E(19, 40, 1.2) + E(28, 40, 1.5) + E(33, 40, 1.5) + E(38, 40, 1.5) + E(43, 40, 1.5),
        R(17, 45, 30, 17) + ring(R(25, 48, 14, 11, 1), R(26.4, 49.4, 11.2, 8.2, 0.5)) + R(28.5, 51, 2.2, 4, 0.5) + R(33.3, 51, 2.2, 4, 0.5),
    ],
    FLOPPY: [
        // 3.5" disk: metal shutter with window, label, write-protect hole
        P(6, 8, 53, 8, 58, 13, 58, 56, 6, 56) +
            R(18, 8, 28, 19) + R(19.5, 8, 25, 17.5) + R(36, 11, 6, 12, 0.5) +
            R(13, 32, 38, 24, [1.5, 1.5, 0, 0]) + R(8.5, 51, 3, 3, 0.4),
    ],
    MIX: [
        // Cassette: reels in the window, tape-head bridge, screws
        R(3, 13, 58, 38, 3) +
            ring(R(8, 17, 48, 22, 2), R(9.4, 18.4, 45.2, 19.2, 1.5)) +
            R(17, 23.5, 30, 10, 5) + E(23, 28.5, 3.3) + E(23, 28.5, 1.4) + E(41, 28.5, 3.3) + E(41, 28.5, 1.4) +
            ring(P(15, 51, 19, 42.5, 45, 42.5, 49, 51), P(16.8, 51, 20, 44, 44, 44, 47.2, 51)) +
            E(25, 47.5, 1.3) + E(39, 47.5, 1.3) + E(6, 16, 0.9) + E(58, 16, 0.9) + E(6, 48, 0.9) + E(58, 48, 0.9),
    ],
    DEFAULT: [
        // Generic cartridge
        P(14, 6, 50, 6, 50, 56, 47, 59, 17, 59, 14, 56) +
            R(19, 11, 26, 25, 1.5) + rep(4, (i) => R(22, 42 + i * 3.4, 20, 1.6, 0.8)),
    ],
};

const lines = Object.entries(ICONS).map(
    ([key, layers]) => `    ${key}: [\n${layers.map((d) => `        '${d}',`).join('\n')}\n    ],`
);
const out = `// Generated by scripts/generate-console-icons.mjs — edit that file and re-run it.
// Each icon is a list of fill-rule="evenodd" paths on a 64×64 grid, filled with currentColor.

export const CONSOLE_ICON_PATHS = {
${lines.join('\n')}
} as const satisfies Record<string, readonly string[]>;

export type ConsoleIconKey = keyof typeof CONSOLE_ICON_PATHS;
`;

const target = process.argv[2] ?? fileURLToPath(new URL('../src/components/console-icon-paths.ts', import.meta.url));
writeFileSync(target, out);
console.log(`Wrote ${Object.keys(ICONS).length} icons to ${target}`);
