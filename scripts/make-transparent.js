const { Jimp } = require('jimp');
const fs = require('fs');
const path = require('path');

const ICON_DIR = path.join(__dirname, '../admin-web/public/icons');
const FILES = ['van_source_v3.png', 'box_van_source.png'];

async function processImage(filename) {
    const inputPath = path.join(ICON_DIR, filename);
    const outputFilename = filename.replace('_source', '').replace('v3', 'final');
    const outputPath = path.join(ICON_DIR, outputFilename);

    if (!fs.existsSync(inputPath)) {
        console.error(`File not found: ${inputPath}`);
        return;
    }

    try {
        const image = await Jimp.read(inputPath);
        const width = image.bitmap.width;
        const height = image.bitmap.height;

        // Get background color from top-left pixel
        const startIdx = 0;
        const bgR = image.bitmap.data[startIdx + 0];
        const bgG = image.bitmap.data[startIdx + 1];
        const bgB = image.bitmap.data[startIdx + 2];

        // Helper: Check if pixel matches background within tolerance
        const isBackground = (x, y) => {
            const idx = (y * width + x) * 4;
            const r = image.bitmap.data[idx + 0];
            const g = image.bitmap.data[idx + 1];
            const b = image.bitmap.data[idx + 2];

            // DUAL-TARGET STRATEGY
            // 1. Pure White (Background) - Tolerance 2 for JPG artifacts
            const isWhite = r >= 253 && g >= 253 && b >= 253;

            // 2. Checkerboard Grey (Background) - 241, 243, 244 detected
            const isGrey = Math.abs(r - 241) < 5 && Math.abs(g - 243) < 5 && Math.abs(b - 244) < 5;

            return isWhite || isGrey;
        };

        // Flood Fill BFS
        const queue = [[0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1]]; // Start from all corners
        const visited = new Set();

        // Mark corners as visited immediately
        queue.forEach(([x, y]) => visited.add(`${x},${y}`));

        while (queue.length > 0) {
            const [x, y] = queue.shift();
            const idx = (y * width + x) * 4;

            // Make transparent
            image.bitmap.data[idx + 3] = 0;

            // Check neighbors
            const neighbors = [
                [x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]
            ];

            for (const [nx, ny] of neighbors) {
                if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                    const key = `${nx},${ny}`;
                    if (!visited.has(key) && isBackground(nx, ny)) {
                        visited.add(key);
                        queue.push([nx, ny]);
                    }
                }
            }
        }

        const buffer = await image.getBuffer("image/png");
        await fs.promises.writeFile(outputPath, buffer);
        console.log(`Processed: ${outputPath} (Bg: ${bgR},${bgG},${bgB})`);
    } catch (err) {
        console.error(`Error processing ${filename}:`, err);
    }
}

async function main() {
    for (const file of FILES) {
        console.log(`Starting ${file}...`);
        await processImage(file);
        console.log(`Finished ${file}.`);
    }
}

main();
