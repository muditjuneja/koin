#!/usr/bin/env node
/**
 * Generates src/components/console-icon-paths.ts — the path data behind <ConsoleIcon>.
 *
 * Each icon has two drawings, both made of `fill-rule="evenodd"` paths filled with
 * currentColor (a subpath inside another punches a hole, a subpath inside a hole is
 * filled again), so icons take the surrounding text colour:
 *
 *   lg — 64×64 grid, full detail, used above 24px.
 *   sm — 20×20 grid, simplified silhouette with whole-unit holes and gaps so it
 *        lands on the pixel grid at 20px; used at 24px and below.
 *
 * Drawn from product photos (Wikimedia Commons). Home consoles are seen from slightly
 * above the front (a foreshortened top face over the front face), handhelds and the
 * arcade cabinet straight on. Framing is kept consistent so icons read at the same
 * weight side by side: home consoles span x 2–62 / y ≈14–50, landscape handhelds
 * x 2–62 / y ≈14–50, portrait handhelds and cabinets y 3–61.
 *
 *   node scripts/generate-console-icons.mjs [output path]
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
/** Outline: outer hole + inner fill (use inside a filled body). */
const ring = (outer, inner) => outer + inner;
/** Four buttons in a diamond around cx, cy. */
const diamond = (cx, cy, d, r) => E(cx, cy - d, r) + E(cx + d, cy, r) + E(cx, cy + d, r) + E(cx - d, cy, r);
/** Dots evenly spaced on a circle. */
const dotRing = (cx, cy, rad, count, r) =>
    rep(count, (i) => E(cx + rad * Math.cos((i * 2 * Math.PI) / count), cy + rad * Math.sin((i * 2 * Math.PI) / count), r));

// Shared bodies
const N64_PAD =
    'M14 12H50C58 12 61 19 61 27L60 44C60 52 57 57 53.5 57C50 57 48 54 47.5 50L45.5 40.5C44.8 37.6 42.2 37 40.6 39.2' +
    'L38.8 49C38.2 55 35.5 58 32 58C28.5 58 25.8 55 25.2 49L23.4 39.2C21.8 37 19.2 37.6 18.5 40.5L16.5 50' +
    'C16 54 14 57 10.5 57C7 57 4 52 4 44L3 27C3 19 6 12 14 12Z';
const GBC_BODY =
    'M18 5H46C47.1 5 48 5.9 48 7V53.5C48 56.5 46 58.6 43 59.1C36 60.3 28 60.3 21 59.1C18 58.6 16 56.5 16 53.5V7C16 5.9 16.9 5 18 5Z';
const GBA_BODY =
    'M12 15C16 15 18 17 21 17H43C46 17 48 15 52 15C58 15 61 22 61 32.5C61 43 58 50 52 50C48 50 46 48 43 48H21' +
    'C18 48 16 50 12 50C6 50 3 43 3 32.5C3 22 6 15 12 15Z';
const LYNX_BODY =
    'M10 18C14 18 16 20 18 21H46C48 20 50 18 54 18C59.5 18 63 24 63 32C63 40 59.5 46 54 46C50 46 48 44 46 43H18' +
    'C16 44 14 46 10 46C4.5 46 1 40 1 32C1 24 4.5 18 10 18Z';
const ARCADE_LG = (screen) => [
    R(15, 2, 34, 10, [1.5, 1.5, 0, 0]) + R(18, 4, 28, 6, 0.5),
    P(17, 12, 47, 12, 47, 36, 17, 36) + screen,
    R(12, 36, 40, 8, 1) + E(19, 40, 2.4) + E(19, 40, 1.2) + E(28, 40, 1.5) + E(33, 40, 1.5) + E(38, 40, 1.5) + E(43, 40, 1.5),
    R(17, 45, 30, 17) + ring(R(25, 48, 14, 11, 1), R(26.4, 49.4, 11.2, 8.2, 0.5)) + R(28.5, 51, 2.2, 4, 0.5) + R(33.3, 51, 2.2, 4, 0.5),
];
const ARCADE_SM = (screen) => [
    R(5, 0, 10, 3, [0.5, 0.5, 0, 0]) + R(6, 1, 8, 1),
    P(5.5, 4, 14.5, 4, 14.5, 11, 5.5, 11) + screen,
    R(4, 12, 12, 2, 0.5),
    R(5.5, 15, 9, 5) + R(8, 16, 4, 3),
];

const ICONS = {
    // ───────────── Nintendo ─────────────
    NES: {
        lg: [
            // Top: lid with the ribbed band (dark ends, ribs between) and the cartridge flap seam
            R(2, 14, 60, 17, [2, 2, 0, 0]) +
                R(42, 14, 12, 17) + R(42, 14, 12, 3.5) + rep(4, (i) => R(42, 19 + i * 2.5, 12, 1.25)) + R(42, 28.6, 12, 2.4) +
                R(4, 27, 37, 1),
            // Front: flap, darker lower strip with power/reset, black band block with the two ports
            R(2, 32, 60, 18, [0, 0, 1.5, 1.5]) +
                R(41, 32, 1.2, 18) + R(54.8, 32, 1.2, 18) + R(2, 41, 39, 1) +
                E(6, 45.5, 0.9) + R(9, 44, 6, 3, 0.6) + R(17, 44, 6, 3, 0.6) +
                R(44, 43.5, 3.6, 4.5, 1) + R(49.2, 43.5, 3.6, 4.5, 1),
        ],
        sm: [
            R(1, 5, 18, 4) + R(12, 5, 1, 4) + R(16, 5, 1, 4),
            R(1, 10, 18, 5) + R(12, 10, 1, 5) + R(16, 10, 1, 5) + R(1, 12, 11, 1) + R(3, 13, 2, 1) + R(6, 13, 2, 1) + R(13, 13, 1, 1) + R(15, 13, 1, 1),
        ],
    },
    SNES: {
        lg: [
            // Super Famicom / PAL: recessed top panel with the slot and power / eject / reset
            R(4, 14, 56, 22, [7, 7, 0, 0]) +
                ring(R(10, 17, 44, 17, 3), R(11.4, 18.4, 41.2, 14.2, 2)) +
                R(15, 20, 34, 3.5, 1.5) + R(15, 27, 7, 4, 1.5) + R(26, 27.5, 12, 3.5, 1.5) + R(42, 27, 7, 4, 1.5),
            R(4, 37, 56, 13, [0, 0, 7, 7]) + R(21, 41, 9, 4.5, [1, 1, 2, 2]) + R(34, 41, 9, 4.5, [1, 1, 2, 2]),
        ],
        sm: [
            R(2, 4, 16, 6, [2, 2, 0, 0]) + R(5, 5, 10, 1) + R(5, 7, 2, 2) + R(9, 7, 2, 2) + R(13, 7, 2, 2),
            R(2, 11, 16, 5, [0, 0, 2, 2]) + R(6, 12, 3, 2) + R(11, 12, 3, 2),
        ],
    },
    N64: {
        lg: [
            // The trident controller
            N64_PAD + plus(13.5, 25, 11, 3.6) + E(32, 24, 1.7) +
                E(32, 34, 4.6) + E(32, 34, 2.8) +
                E(52, 17.5, 1.6) + E(48.5, 21, 1.6) + E(55.5, 21, 1.6) + E(52, 24.5, 1.6) +
                E(47.5, 30, 2.5) + E(42.5, 27, 2.5),
        ],
        sm: [
            'M4.5 3.5H15.5C18.5 3.5 19.5 6 19.5 8.5L19.2 13.5C19.1 16.3 18 17.8 16.7 17.8C15.6 17.8 15 16.8 14.8 15.6L14.2 12.6' +
                'C14 11.8 13.2 11.6 12.8 12.3L12.3 15.3C12 17.6 11.1 18.6 10 18.6C8.9 18.6 8 17.6 7.7 15.3L7.2 12.3C6.8 11.6 6 11.8 5.8 12.6' +
                'L5.2 15.6C5 16.8 4.4 17.8 3.3 17.8C2 17.8 0.9 16.3 0.8 13.5L0.5 8.5C0.5 6 1.5 3.5 4.5 3.5Z' +
                plus(4.5, 7.5, 4, 1.4) + E(10, 10.5, 1.5) + E(15.5, 6.5, 1) + E(14, 9.5, 1),
        ],
    },
    GB: {
        lg: [
            // DMG: curved bottom-right corner, bezel with power LED, slanted A/B and start/select, speaker slots
            R(15, 3, 34, 58, [2, 2, 11, 2]) +
                ring(R(18.5, 7, 27, 23, [1.5, 1.5, 7, 1.5]), R(19.7, 8.2, 24.6, 20.6, [1, 1, 6, 1])) +
                R(24.5, 10.5, 17, 15) + E(21.8, 16.5, 0.9) +
                plus(23.5, 41.5, 10, 3.4) + E(37.5, 44, 2.7) + E(43.5, 40.5, 2.7) +
                rot(27.5, 52, 4.5, 1.6, -28) + rot(33.5, 52, 4.5, 1.6, -28) +
                rep(6, (i) => rot(38.5 + i * 2.2, 54, 1.1, 7, 30)),
        ],
        sm: [R(5, 1, 10, 18, [1, 1, 3, 1]) + R(6, 2, 8, 7, [0.5, 0.5, 2, 0.5]) + R(7, 12, 1, 3) + R(6, 13, 3, 1) + R(11, 13, 1.5, 1.5) + R(13, 11.5, 1.5, 1.5)],
    },
    GBC: {
        lg: [
            // GBC: slimmer, rounded bottom, rectangular bezel, round speaker
            GBC_BODY +
                ring(R(18.5, 8, 27, 25, 2), R(19.8, 9.3, 24.4, 22.4, 1.2)) + R(23.5, 11, 17, 15.5) + E(21.3, 15, 0.8) +
                E(24, 43, 6) + plus(24, 43, 9, 3) +
                E(36.5, 44, 2.5) + E(42, 42.5, 2.5) +
                R(23.5, 52, 4.5, 1.8, 0.9) + R(29.5, 52, 4.5, 1.8, 0.9) +
                dotRing(41, 52.5, 2.8, 8, 0.6) + E(41, 52.5, 0.6),
        ],
        sm: [
            'M5.5 1H14.5C15 1 15 1.5 15 1.5V16.5C15 17.5 14.5 18.4 13.5 18.6C11.2 19 8.8 19 6.5 18.6C5.5 18.4 5 17.5 5 16.5V1.5C5 1.5 5 1 5.5 1Z' +
                R(6, 2, 8, 8, 0.5) + R(7, 12, 1, 3) + R(6, 13, 3, 1) + R(10.5, 13, 1.5, 1.5) + R(12.5, 12.5, 1.5, 1.5),
        ],
    },
    GBA: {
        lg: [
            GBA_BODY +
                ring('M19 19.5H45V41L41.5 45.5H22.5L19 41Z', 'M20.3 20.8H43.7V40.5L40.9 44.2H23.1L20.3 40.5Z') +
                R(22.5, 23, 19, 13.5) +
                plus(11.5, 27.5, 9.5, 3.2) + E(13.5, 36.5, 1.1) + E(12, 40.5, 1.1) +
                E(50, 31, 2.6) + E(56, 30.5, 2.6) + E(53, 23.5, 0.7) +
                rep(4, (i) => R(50, 37.5 + i * 2, 7, 0.9, 0.45)),
        ],
        sm: [
            'M4 4.5C5 4.5 6 5.5 7 5.5H13C14 5.5 15 4.5 16 4.5C18.3 4.5 19.5 6.8 19.5 10C19.5 13.2 18.3 15.5 16 15.5C15 15.5 14 14.5 13 14.5H7' +
                'C6 14.5 5 15.5 4 15.5C1.7 15.5 0.5 13.2 0.5 10C0.5 6.8 1.7 4.5 4 4.5Z' +
                R(6, 6, 8, 7, 0.5) + R(3, 7, 1, 3) + R(2, 8, 3, 1) + R(15, 9, 1.5, 1.5) + R(17, 8.5, 1.5, 1.5),
        ],
    },
    NDS: {
        lg: [
            // DS Lite, opened: top screen between 2×3 speaker dots, hinge bar, touch screen, d-pad, ABXY, start/select
            R(5, 3, 54, 26.5, 4) + R(17, 6, 30, 22, 1) +
                rep(2, (c) => rep(3, (r) => E(9.3 + c * 2.4, 14 + r * 2.4, 0.75) + E(52.3 + c * 2.4, 14 + r * 2.4, 0.75))),
            R(5, 30.5, 54, 3.3, 1.6) + R(31.5, 31.5, 1, 1.3, 0.5),
            R(5, 34.8, 54, 26.2, 4) + R(18, 37.5, 28, 21, 0.5) +
                plus(11, 43, 8.5, 2.8) + diamond(52.5, 45, 3.4, 1.5) + E(50.5, 52.5, 0.9) + E(50.5, 55.5, 0.9),
        ],
        sm: [
            R(2, 1, 16, 8.5, 1.5) + R(6, 2, 8, 6.5),
            R(2, 10.5, 16, 8.5, 1.5) + R(6, 11.5, 8, 6.5) + R(3.5, 12.5, 1, 3) + R(2.5, 13.5, 3, 1) + R(15, 13, 1.5, 1.5),
        ],
    },
    VIRTUAL_BOY: {
        lg: [
            // Visor with the dipped lower edge, focus slider on top, single post on a bipod
            'M10 10H54C58.4 10 61 12.6 61 17V25C61 28 59 30 56 30H40L32 35L24 30H8C5 30 3 28 3 25V17C3 12.6 5.6 10 10 10Z' +
                R(6, 19, 52, 1.2),
            R(24, 6.5, 16, 5, 2) + R(29, 8, 6, 2, 1),
            R(30, 34, 4, 7) + E(32, 43, 3) + rot(24.5, 51, 3, 19, 40) + rot(39.5, 51, 3, 19, -40) +
                R(12, 57.5, 9, 3, 1.5) + R(43, 57.5, 9, 3, 1.5),
        ],
        sm: [
            'M3 3H17C18.5 3 19.5 4 19.5 5.5V8C19.5 9.3 18.8 10 17.5 10H12L10 11.5L8 10H2.5C1.2 10 0.5 9.3 0.5 8V5.5C0.5 4 1.5 3 3 3Z',
            R(9, 11, 2, 4) + rot(6.8, 17, 1.2, 5.6, 40) + rot(13.2, 17, 1.2, 5.6, -40) + R(2.5, 18.5, 3, 1) + R(14.5, 18.5, 3, 1),
        ],
    },
    // ───────────── Sega ─────────────
    GENESIS: {
        lg: [
            // Model 1: vent block at the back left, controls front left, the big round bay on the right
            R(2, 14, 60, 22, [3, 3, 0, 0]) +
                rep(6, (i) => R(5, 16.2 + i * 2.1, 14, 1.05)) +
                R(6, 30.5, 3, 4, 0.8) + R(11, 30.5, 6, 3.5, 1) + R(19, 31, 5, 3, 0.8) +
                ring(E(43, 25, 17, 9.5), E(43, 25, 15.4, 8)) + R(33, 20.5, 20, 3.2, 1) + R(37, 28.5, 12, 2.2, 0.5),
            R(2, 37, 60, 12, [0, 0, 1.5, 1.5]) + E(9, 42.5, 1.2) +
                P(42, 40.5, 49, 40.5, 48.2, 45, 42.8, 45) + P(52, 40.5, 59, 40.5, 58.2, 45, 52.8, 45),
        ],
        sm: [
            R(1, 4.5, 18, 6.5, [1, 1, 0, 0]) + R(2, 5.5, 4, 1) + R(2, 7.5, 4, 1) + E(13, 7.75, 5, 2.75) + E(13, 7.75, 3.5, 1.5) + R(11, 7, 4, 1),
            R(1, 12, 18, 4) + R(13, 13, 2, 1.5) + R(16, 13, 2, 1.5),
        ],
    },
    MASTER_SYSTEM: {
        lg: [
            // Model 1: long flat box with bevelled ends, red panel round the cartridge slot (back right),
            // red line along the front edge
            P(8, 15, 56, 15, 61, 22, 61, 34, 3, 34, 3, 22) +
                ring(R(32, 16.5, 21, 14.5, 1), R(33.3, 17.8, 18.4, 11.9, 0.5)) +
                R(35, 19, 15, 3, 0.8) + R(35, 24.5, 7, 2.2, 0.5) + R(43, 24.5, 7, 2.2, 0.5) +
                R(4, 31.5, 56, 1),
            P(3, 35, 61, 35, 61, 47, 59, 49, 5, 49, 3, 47) +
                R(7, 38, 6, 4, 0.8) + R(22, 41.5, 6, 3.5, 0.8) + R(30, 41.5, 6, 3.5, 0.8) + R(40, 38, 13, 6, 1),
        ],
        sm: [
            P(3, 5, 17, 5, 19, 7, 19, 11, 1, 11, 1, 7) + R(10, 6, 7, 3) + R(11, 6.5, 5, 1.2),
            P(1, 12, 19, 12, 19, 15, 18, 16, 2, 16, 1, 15) + R(2, 13, 2, 1) + R(7, 14, 2, 1) + R(10, 14, 2, 1) + R(13, 13, 4, 2),
        ],
    },
    GAME_GEAR: {
        lg: [
            'M12 16H52C58 16 62 21 62 29V36C62 43 58 48 52 48H12C6 48 2 43 2 36V29C2 21 6 16 12 16Z' +
                ring('M18 18.5H46V40C46 44 44 46 40 46H24C20 46 18 44 18 40Z', 'M19.4 19.9H44.6V39.6C44.6 43 43 44.6 39.6 44.6H24.4C21 44.6 19.4 43 19.4 39.6Z') +
                R(23, 22, 18, 15.5) +
                E(10.5, 31, 5.6) + plus(10.5, 31, 8.4, 2.8) +
                E(50.5, 35, 2.7) + E(56, 30.5, 2.7) + E(55, 21.5, 1.3) +
                rep(2, (r) => rep(4, (c) => E(6.5 + c * 2.2, 41.5 + r * 2.2, 0.65))),
        ],
        sm: [
            R(0.5, 4.5, 19, 11, 4) + 'M6 6H14V12C14 13.4 13.4 14 12 14H8C6.6 14 6 13.4 6 12Z' + E(3.25, 10, 1.75) + R(15, 11, 1.5, 1.5) + R(17, 9, 1.5, 1.5),
        ],
    },
    SATURN: {
        lg: [
            // NA model 1: cartridge slot at the back, rounded lid, power / open / reset along the front, vents right
            R(2, 14, 60, 22, [5, 5, 0, 0]) +
                R(23, 15.5, 18, 2, 1) +
                ring(R(16, 18.5, 32, 14, 6.5), R(17.4, 19.9, 29.2, 11.2, 5.5)) + E(32, 25.5, 3, 1.4) +
                R(6, 31, 7, 2.6, 1.3) + R(28, 33, 8, 1.8, 0.9) + R(51, 31, 7, 2.6, 1.3) +
                rep(4, (i) => R(51 + i * 2.2, 19.5, 1, 7, 0.5)),
            R(2, 37, 60, 12, [0, 0, 4, 4]) + R(18, 40.5, 9, 4.5, [1, 1, 2, 2]) + R(30, 40.5, 9, 4.5, [1, 1, 2, 2]),
        ],
        sm: [
            R(1, 4.5, 18, 6.5, [1.5, 1.5, 0, 0]) + R(5, 5.5, 10, 4.5, 2) + R(6, 6.5, 8, 2.5, 1.2),
            R(1, 12, 18, 4, [0, 0, 1.5, 1.5]) + R(5, 13, 3, 1.5) + R(9, 13, 3, 1.5),
        ],
    },
    // ───────────── Sony ─────────────
    PS1: {
        lg: [
            // SCPH-1001: round lid in the middle, reset + power on the left, OPEN on the right
            R(2, 15, 60, 21, [1.5, 1.5, 0, 0]) +
                ring(E(32, 25.5, 16, 8.5), E(32, 25.5, 14.5, 7.2)) + E(32, 25.5, 2.2, 1.2) +
                R(5.5, 19, 7, 2.4, 1.2) + E(9, 29.5, 3.6, 2.2) + E(55, 29.5, 3.6, 2.2),
            R(2, 37, 60, 11, [0, 0, 1.5, 1.5]) +
                R(19, 39, 10, 1.5, 0.5) + R(35, 39, 10, 1.5, 0.5) + R(19, 42, 10, 3.6, 1.2) + R(35, 42, 10, 3.6, 1.2),
        ],
        sm: [
            R(1, 4.5, 18, 6.5) + E(10, 7.75, 5, 2.75) + E(10, 7.75, 3.6, 1.6) + R(2, 8, 2, 1.5) + R(16, 8, 2, 1.5),
            R(1, 12, 18, 4) + R(6, 13.5, 3, 1.5) + R(11, 13.5, 3, 1.5),
        ],
    },
    // ───────────── NEC ─────────────
    PC_ENGINE: {
        lg: [
            // Small, nearly square: vent across the top, U-shaped HuCard bay at the front,
            // power switch to its left, DIN pad port on the right
            R(11, 12, 42, 24, [2, 2, 0, 0]) + R(18, 17, 28, 2.6, 1) + R(24, 26, 16, 10, [4, 4, 0, 0]),
            R(11, 37, 42, 11, [0, 0, 1.5, 1.5]) + R(24, 37, 16, 4, [0, 0, 2, 2]) + R(15, 40, 5, 4, 0.8) + E(47, 42.5, 2.6) + E(47, 42.5, 1),
        ],
        sm: [
            R(3, 3, 14, 8, [1, 1, 0, 0]) + R(5, 5, 10, 1) + R(8, 8, 4, 3, [1, 1, 0, 0]),
            R(3, 12, 14, 5) + R(8, 12, 4, 1) + R(4, 14, 2, 2) + R(14, 14, 2, 2),
        ],
    },
    // ───────────── SNK ─────────────
    NEOGEO: {
        lg: [
            // AES: long cartridge slot, power + reset on top; pad ports centre front, memory card slot right
            R(2, 15, 60, 21, [2, 2, 0, 0]) +
                ring(R(11, 17.5, 42, 8, 1.5), R(12.4, 18.9, 39.2, 5.2, 1)) + R(15, 20.3, 34, 1.8) +
                R(6, 30, 7, 3, 1.2) + R(15, 30, 4, 3, 1.2),
            R(2, 37, 60, 11, [0, 0, 1.5, 1.5]) +
                P(18, 39.5, 29, 39.5, 28, 44.5, 19, 44.5) + P(32, 39.5, 43, 39.5, 42, 44.5, 33, 44.5) + R(47, 40.5, 11, 2.4, 0.5),
        ],
        sm: [
            R(0.5, 5, 19, 6) + R(3, 6, 14, 3) + R(4, 7, 12, 1),
            R(0.5, 12, 19, 4) + R(6, 13, 3, 2) + R(10, 13, 3, 2) + R(15, 13.5, 3, 1),
        ],
    },
    NEOGEO_POCKET: {
        lg: [
            // Power slider + LED top left, clicky stick, near-square screen, A/B and option on the right
            R(3, 14, 58, 36, 9) +
                R(7, 17.5, 7, 2.6, 1.3) + E(16.5, 18.8, 0.8) +
                ring(R(21, 17, 24, 30, 2.5), R(22.3, 18.3, 21.4, 27.4, 1.5)) + R(24, 20.5, 18, 17.5) +
                E(12, 31, 5.4) + E(12, 31, 3.4) +
                E(49, 37, 2.6) + E(55, 33.5, 2.6) + E(56, 23.5, 1.2) +
                rep(2, (r) => rep(3, (c) => E(8 + c * 2.2, 42 + r * 2.2, 0.65))),
        ],
        sm: [R(1, 4, 18, 12, 3) + R(7, 5, 7, 9) + E(4, 9.5, 2) + E(4, 9.5, 1) + R(15, 11, 1.5, 1.5) + R(17, 9, 1.5, 1.5)],
    },
    NEOGEO_POCKET_COLOR: {
        lg: [
            // Same layout, rounder shell and a larger screen
            R(2, 13, 60, 38, 12) +
                R(7, 17, 7, 2.6, 1.3) + E(16.5, 18.3, 0.8) +
                ring(R(19.5, 16, 26, 32, 2.5), R(20.8, 17.3, 23.4, 29.4, 1.5)) + R(22.5, 19.5, 20, 19.5) +
                E(11.5, 31, 5.4) + E(11.5, 31, 3.4) +
                E(49.5, 37.5, 2.6) + E(55.5, 34, 2.6) + E(56.5, 23.5, 1.2) +
                rep(2, (r) => rep(3, (c) => E(7.5 + c * 2.2, 42.5 + r * 2.2, 0.65))),
        ],
        sm: [R(0.5, 3.5, 19, 13, 4) + R(6.5, 4.5, 8, 10) + E(3.5, 10, 2) + E(3.5, 10, 1) + R(15.5, 11.5, 1.5, 1.5) + R(17.5, 9.5, 1.5, 1.5)],
    },
    // ───────────── Atari ─────────────
    LYNX: {
        lg: [
            // Lynx II: grips at both ends, screen in the middle, d-pad left, two pairs of buttons right, speaker slits
            LYNX_BODY +
                ring(R(18, 20.5, 28, 22, 2), R(19.3, 21.8, 25.4, 19.4, 1.2)) + R(21.5, 24, 21, 13.5) +
                plus(9.5, 29.5, 9, 3) +
                R(48.5, 22.5, 4.2, 4.2, 1) + R(54.8, 22.5, 4.2, 4.2, 1) + R(47.5, 37.5, 4.2, 4.2, 1) + R(53.5, 40, 4.2, 4.2, 1) +
                rep(3, (i) => rot(52 + i * 2.4, 31.5, 0.9, 6, 12)),
        ],
        sm: [
            'M3.5 5.5C5 5.5 5.5 6.5 6 6.5H14C14.5 6.5 15 5.5 16.5 5.5C18.5 5.5 19.5 7.5 19.5 10C19.5 12.5 18.5 14.5 16.5 14.5C15 14.5 14.5 13.5 14 13.5H6' +
                'C5.5 13.5 5 14.5 3.5 14.5C1.5 14.5 0.5 12.5 0.5 10C0.5 7.5 1.5 5.5 3.5 5.5Z' +
                R(6, 7, 8, 6) + R(2.5, 8, 1, 3) + R(1.5, 9, 3, 1) + R(15.5, 7.5, 1.5, 1.5) + R(16, 11, 1.5, 1.5),
        ],
    },
    ATARI_2600: {
        lg: [
            // Four-switch woodgrain: switch panel with cartridge slot at the back, ribbed slope, wood front
            R(9, 16, 46, 8, [1, 1, 0, 0]) + R(25, 17.8, 14, 3.6, 0.8) +
                R(12, 18.3, 3, 3.2, 0.5) + R(18, 18.3, 3, 3.2, 0.5) + R(43, 18.3, 3, 3.2, 0.5) + R(49, 18.3, 3, 3.2, 0.5),
            P(7, 25, 57, 25, 62, 39, 2, 39) +
                rep(5, (i) => P(6.6 - i * 0.75, 26.8 + i * 2.5, 57.4 + i * 0.75, 26.8 + i * 2.5, 57.8 + i * 0.75, 28 + i * 2.5, 6.2 - i * 0.75, 28 + i * 2.5)),
            R(2, 40, 60, 10, [0, 0, 1, 1]) + R(4, 42.2, 56, 0.9) + R(4, 44.8, 56, 0.9) + R(4, 47.3, 56, 0.6),
        ],
        sm: [
            R(3, 4, 14, 3) + R(8, 5, 4, 1),
            P(2, 8, 18, 8, 19.5, 12, 0.5, 12) + R(2, 9.5, 16, 1),
            R(0.5, 13, 19, 3.5) + R(1.5, 14.5, 17, 1),
        ],
    },
    ATARI_5200: {
        lg: [
            // Cartridge slot between back vents, brushed-metal band, vent row, four pad ports along the front
            P(5, 14, 59, 14, 62, 36, 2, 36) +
                rep(7, (i) => R(8.5 + i * 2.2, 16, 1.1, 4.5, 0.4)) + rep(7, (i) => R(40 + i * 2.2, 16, 1.1, 4.5, 0.4)) +
                R(25, 15.5, 13, 5.5, 1) +
                ring(P(4.2, 22.5, 59.8, 22.5, 60.7, 29, 3.3, 29), P(5.5, 23.8, 58.5, 23.8, 59.2, 27.7, 4.8, 27.7)) +
                rep(14, (i) => R(5 + i * 3, 31, 1.4, 3, 0.4)) + R(51, 31, 7, 3, 0.6),
            R(2, 37, 60, 11, [0, 0, 1.5, 1.5]) + rep(4, (i) => R(8 + i * 9, 41, 7, 3.4, 0.8)),
        ],
        sm: [
            P(2, 4.5, 18, 4.5, 19.5, 11, 0.5, 11) + R(8, 5.5, 4, 1.5) + R(1.5, 8, 17, 1.5),
            R(0.5, 12, 19, 4) + R(2, 13.5, 2, 1) + R(5.5, 13.5, 2, 1) + R(9, 13.5, 2, 1) + R(12.5, 13.5, 2, 1),
        ],
    },
    ATARI_7800: {
        lg: [
            // Back vents, cartridge slot right of centre, metal band across the top, button row at the front edge
            R(4, 16, 56, 20, [2, 2, 0, 0]) +
                rep(10, (i) => R(31 + i * 2.6, 17.3, 1.2, 2.2, 0.4)) + R(38, 20.5, 13, 4, 1) +
                R(4, 26, 56, 4.5) +
                R(8, 32.5, 5, 2.2, 0.6) + R(15, 32.5, 5, 2.2, 0.6) + R(44, 32.5, 5, 2.2, 0.6) + R(51, 32.5, 5, 2.2, 0.6),
            P(4, 37, 60, 37, 62, 46, 2, 46) + P(9, 40, 15, 40, 14.4, 43, 9.6, 43) + P(17, 40, 23, 40, 22.4, 43, 17.6, 43),
        ],
        sm: [
            R(1.5, 4.5, 17, 7, [0.5, 0.5, 0, 0]) + R(11, 5.5, 4, 1.5) + R(1.5, 8, 17, 1.5),
            P(1.5, 12.5, 18.5, 12.5, 19.5, 15.5, 0.5, 15.5),
        ],
    },
    // ───────────── Bandai ─────────────
    WONDERSWAN: {
        lg: [
            // Held sideways: Y and X button diamonds on the left, big bezel with sound/start, speaker top right, A/B bottom right
            R(3, 15, 58, 34, [7, 10, 10, 7]) +
                ring(R(16, 16.5, 29, 30, 3), R(17.3, 17.8, 26.4, 27.4, 2)) + R(19.5, 20.5, 21, 15) +
                R(19.5, 39.5, 4, 2, 1) + R(25, 39.5, 4, 2, 1) +
                diamond(9.5, 23, 3.2, 1.5) + diamond(9.5, 37.5, 3.2, 1.5) +
                E(51.5, 43, 2.2) + E(56, 40, 2.2) +
                ring(E(53, 24, 4.5), E(53, 24, 3.3)),
        ],
        sm: [
            R(0.5, 4, 19, 12, [2.5, 3.5, 3.5, 2.5]) + R(6, 5, 8, 7) + R(2, 6, 2, 2) + R(2, 11, 2, 2) + R(15.5, 13, 1.5, 1.5) + E(16.5, 7.5, 1.5),
        ],
    },
    WONDERSWAN_COLOR: {
        lg: [
            // Same layout with circular recesses round the button diamonds, a larger screen and a power button
            R(2, 14, 60, 36, [8, 12, 12, 8]) +
                ring(R(15, 15.5, 31, 32, 3), R(16.3, 16.8, 28.4, 29.4, 2)) + R(18, 19, 25, 17.5) +
                R(18, 40.5, 4, 2, 1) + R(23.5, 40.5, 4, 2, 1) + R(29, 40.4, 4, 2.2, 1.1) +
                ring(E(8.5, 23.5, 5.6), E(8.5, 23.5, 4.4)) + diamond(8.5, 23.5, 2.6, 1.3) +
                ring(E(8.5, 38, 5.6), E(8.5, 38, 4.4)) + diamond(8.5, 38, 2.6, 1.3) +
                E(52.5, 43.5, 2.2) + E(57, 40.5, 2.2) +
                ring(E(53.5, 24, 4.5), E(53.5, 24, 3.3)),
        ],
        sm: [
            R(0.5, 3.5, 19, 13, [3, 4, 4, 3]) + R(5.5, 4.5, 9, 8) + E(3, 7, 1.5) + E(3, 12.5, 1.5) + R(16, 13.5, 1.5, 1.5) + E(16.5, 7.5, 1.5),
        ],
    },
    // ───────────── Others ─────────────
    ARCADE: {
        lg: ARCADE_LG(P(20, 15, 44, 15, 42.5, 32, 21.5, 32)),
        sm: ARCADE_SM(P(6.5, 5, 13.5, 5, 13, 10, 7, 10)),
    },
    C64: {
        lg: [
            // Breadbin: full keyboard with the separate F-key block, power LED top right
            R(2, 18, 60, 25, [5, 5, 0, 0]) +
                [0, 1, 2, 3].map((r) => rep(r === 3 ? 13 : 14, (c) => R(5 + r * 0.8 + c * 3.25, 22 + r * 3.6, 2.6, 2.7, 0.4))).join('') +
                R(16, 36.4, 22, 2.7, 0.4) + rep(4, (i) => R(55, 23.5 + i * 3.4, 4.5, 2.6, 0.4)) + E(57.5, 20.5, 0.8),
            R(2, 44, 60, 6, [0, 0, 2, 2]),
        ],
        sm: [
            R(0.5, 5, 19, 8.5, [1.5, 1.5, 0, 0]) +
                rep(6, (c) => R(2 + c * 2, 7, 1, 1)) + rep(6, (c) => R(2.5 + c * 2, 9, 1, 1)) + R(4.5, 11, 6, 1) + R(16, 7, 2, 1) + R(16, 9, 2, 1),
            R(0.5, 14.5, 19, 2.5, [0, 0, 1, 1]),
        ],
    },
    // ───────────── Non-console icons ─────────────
    KOIN: {
        // Brand mark: arcade cabinet with a K on screen
        lg: ARCADE_LG(R(20, 15, 24, 18, 1) + P(26, 18, 30, 18, 30, 23, 35, 18, 40, 18, 33.5, 24.2, 40, 30, 35, 30, 30, 25.5, 30, 30, 26, 30)),
        sm: ARCADE_SM(R(6.5, 5, 7, 5) + R(8, 5.5, 1.2, 4) + P(9.2, 7.3, 11.5, 5.5, 12.6, 5.5, 10.2, 7.5, 12.6, 9.5, 11.5, 9.5, 9.2, 7.7)),
    },
    FLOPPY: {
        lg: [
            // 3.5" disk: metal shutter with window, label, write-protect hole
            P(6, 8, 53, 8, 58, 13, 58, 56, 6, 56) +
                R(18, 8, 28, 19) + R(19.5, 8, 25, 17.5) + R(36, 11, 6, 12, 0.5) +
                R(13, 32, 38, 24, [1.5, 1.5, 0, 0]) + R(8.5, 51, 3, 3, 0.4),
        ],
        sm: [P(2, 2, 16, 2, 18, 4, 18, 18, 2, 18) + R(6, 2, 8, 6) + R(10, 3, 2, 4) + R(5, 11, 10, 7)],
    },
    MIX: {
        lg: [
            // Cassette: reels in the window, tape-head bridge, screws
            R(3, 13, 58, 38, 3) +
                ring(R(8, 17, 48, 22, 2), R(9.4, 18.4, 45.2, 19.2, 1.5)) +
                R(17, 23.5, 30, 10, 5) + E(23, 28.5, 3.3) + E(23, 28.5, 1.4) + E(41, 28.5, 3.3) + E(41, 28.5, 1.4) +
                ring(P(15, 51, 19, 42.5, 45, 42.5, 49, 51), P(16.8, 51, 20, 44, 44, 44, 47.2, 51)) +
                E(25, 47.5, 1.3) + E(39, 47.5, 1.3) + E(6, 16, 0.9) + E(58, 16, 0.9) + E(6, 48, 0.9) + E(58, 48, 0.9),
        ],
        sm: [R(1, 4, 18, 12, 1) + R(4, 6.5, 12, 4, 2) + E(6.5, 8.5, 1) + E(13.5, 8.5, 1) + P(5, 16, 6, 13, 14, 13, 15, 16)],
    },
    DEFAULT: {
        lg: [
            // Generic cartridge
            P(14, 6, 50, 6, 50, 56, 47, 59, 17, 59, 14, 56) +
                R(19, 11, 26, 25, 1.5) + rep(4, (i) => R(22, 42 + i * 3.4, 20, 1.6, 0.8)),
        ],
        sm: [P(4, 1, 16, 1, 16, 18, 15, 19, 5, 19, 4, 18) + R(6, 3, 8, 8) + R(7, 13, 6, 1) + R(7, 15, 6, 1)],
    },
};

const fmt = (layers) => `[\n${layers.map((d) => `            '${d}',`).join('\n')}\n        ]`;
const lines = Object.entries(ICONS).map(([key, { lg, sm }]) => `    ${key}: {\n        lg: ${fmt(lg)},\n        sm: ${fmt(sm)},\n    },`);
const out = `// Generated by scripts/generate-console-icons.mjs — edit that file and re-run it.
// Each icon is a list of fill-rule="evenodd" paths filled with currentColor:
// lg on a 64×64 grid (used above 24px), sm on a 20×20 grid (24px and below).

export const CONSOLE_ICON_PATHS = {
${lines.join('\n')}
} as const satisfies Record<string, { lg: readonly string[]; sm: readonly string[] }>;

export type ConsoleIconKey = keyof typeof CONSOLE_ICON_PATHS;
`;

const target = process.argv[2] ?? fileURLToPath(new URL('../src/components/console-icon-paths.ts', import.meta.url));
writeFileSync(target, out);
console.log(`Wrote ${Object.keys(ICONS).length} icons to ${target}`);
