const { Jimp } = require('jimp');
const path = require('path');

const FILES = ['van_real.png'];
const ICON_DIR = '../admin-web/public/icons';

async function check(filename) {
    try {
        const p = path.join(ICON_DIR, filename);
        const image = await Jimp.read(p);
        console.log(`Checking ${filename} top-left 20x20 area:`);
        for (let y = 0; y < 20; y += 5) {
            for (let x = 0; x < 20; x += 5) {
                const idx = image.getPixelIndex(x, y);
                const r = image.bitmap.data[idx + 0];
                const g = image.bitmap.data[idx + 1];
                const b = image.bitmap.data[idx + 2];
                const a = image.bitmap.data[idx + 3];
                console.log(`(${x},${y}): ${r},${g},${b} A=${a}`);
            }
        }
    } catch (e) {
        console.error(e);
    }
}

async function main() {
    for (const f of FILES) await check(f);
}
main();
