export const TWO_PI = Math.PI * 2;
export const HALF_PI = Math.PI / 2;

export function randomColor() {
    return {
        h: Math.random() * 360,
        s: 60 + Math.random() * 40,
        l: 25 + Math.random() * 30
    };
}

export function hslToHex(h, s, l) {
    s /= 100;
    l /= 100;
    const k = n => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return ((Math.round(255 * f(0)) << 16) | (Math.round(255 * f(8)) << 8) | Math.round(255 * f(4))) | 0;
}

export function hslToRgb(h, s, l) {
    s /= 100;
    l /= 100;
    const k = n => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return [f(0), f(8), f(4)]; // RGB in 0-1 range for shader
}

export function randomColorWithAlpha() {
    const h = Math.random() * 360;
    const s = 95 + Math.random() * 5;
    const l = 45 + Math.random() * 20;
    const hex = hslToHex(h, s, l);
    return {
        hex,
        r: (hex >> 16) & 0xFF,
        g: (hex >> 8) & 0xFF,
        b: hex & 0xFF,
        h, s, l,
        a: 1
    };
}
