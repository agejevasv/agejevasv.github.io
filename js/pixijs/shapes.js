import { TWO_PI, HALF_PI } from './utils.js';

function drawCircle(graphics, halfSize) {
    graphics.circle(0, 0, halfSize);
}

function drawRectangle(graphics, size, halfSize, v1, v2) {
    graphics.rect(-halfSize * v1, -halfSize * v2, size * v1, size * v2);
}

function drawTriangle(graphics, halfSize, v1, v2, v3, v4) {
    graphics.moveTo(0, -halfSize * v1);
    graphics.lineTo(halfSize * v2, halfSize * v3);
    graphics.lineTo(-halfSize * v4, halfSize * v3);
    graphics.closePath();
}

function drawDiamond(graphics, size, halfSize, v1, v2, v3, v4) {
    graphics.moveTo(0, -halfSize * v1);
    graphics.lineTo(size / 3 * v2, 0);
    graphics.lineTo(0, halfSize * v3);
    graphics.lineTo(-size / 3 * v4, 0);
    graphics.closePath();
}

function drawCross(graphics, halfSize, v1, v2, v3, v4) {
    graphics.moveTo(-halfSize * v1, 0);
    graphics.lineTo(halfSize * v2, 0);
    graphics.moveTo(0, -halfSize * v3);
    graphics.lineTo(0, halfSize * v4);
}

function drawCrescent(graphics, size, halfSize) {
    // Crescent using bezier curves - guaranteed symmetric
    const r = halfSize;

    // Horn points (top and bottom)
    const hornX = r * 0.5;
    const hornY = r * 0.95;

    // Both curves bulge LEFT, outer more than inner
    const outerCx = -r * 1.0;  // Outer bulges far left
    const innerCx = -r * 0.1;  // Inner bulges slightly left

    // Start at top horn
    graphics.moveTo(hornX, -hornY);

    // Outer curve (big left bulge)
    graphics.quadraticCurveTo(outerCx, 0, hornX, hornY);

    // Inner curve (small left bulge - less than outer = crescent shape)
    graphics.quadraticCurveTo(innerCx, 0, hornX, -hornY);

    graphics.closePath();
}

function drawVortex(graphics, halfSize) {
    // Swirling vortex with curved arms
    const arms = 4;
    const segments = 25;
    const maxAngle = Math.PI * 1.5; // How far each arm spirals

    for (let arm = 0; arm < arms; arm++) {
        const armOffset = (arm * TWO_PI / arms);

        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const angle = armOffset + t * maxAngle;
            const r = halfSize * (1 - t * 0.85); // Spiral inward
            const x = Math.cos(angle) * r;
            const y = Math.sin(angle) * r;

            if (i === 0) graphics.moveTo(x, y);
            else graphics.lineTo(x, y);
        }
    }
    // Center dot
    graphics.circle(0, 0, halfSize * 0.08);
}

function drawSpiral(graphics, size, v1, v2) {
    for (let i = 0; i < 30; i++) {
        const t = i / 30;
        const angle = t * TWO_PI * 2 * v1;
        const r = (size / 4) + t * (size / 4) * v2;
        const x = Math.cos(angle) * r;
        const y = Math.sin(angle) * r;
        if (i === 0) graphics.moveTo(x, y);
        else graphics.lineTo(x, y);
    }
}

function drawFlower(graphics, halfSize, v1, v2, v3, v4) {
    const petalRadius = halfSize * 0.4;
    for (let i = 0; i < 6; i++) {
        const angle = (i * TWO_PI / 6);
        const cx = Math.cos(angle) * petalRadius * v1;
        const cy = Math.sin(angle) * petalRadius * v2;
        const r = petalRadius * (i % 2 === 0 ? v3 : v4);
        graphics.circle(cx, cy, r);
    }
    graphics.circle(0, 0, petalRadius * 0.3 * v1);
}

function drawAsterisk(graphics, halfSize, v1, v2) {
    for (let i = 0; i < 6; i++) {
        const angle = (i * TWO_PI / 6) - HALF_PI;
        const length = halfSize * (i % 2 === 0 ? v1 : v2);
        graphics.moveTo(0, 0);
        graphics.lineTo(Math.cos(angle) * length, Math.sin(angle) * length);
    }
}

function drawInfinity(graphics, halfSize, v1, v2, v3, v4) {
    graphics.moveTo(-halfSize * v1, -halfSize * v1);
    graphics.quadraticCurveTo(-halfSize * 1.3 * v2, 0, 0, 0);
    graphics.quadraticCurveTo(0, halfSize * 1.3 * v2, halfSize * v1, halfSize * v1);
    graphics.quadraticCurveTo(halfSize * 1.3 * v3, 0, 0, 0);
    graphics.quadraticCurveTo(0, -halfSize * 1.3 * v3, -halfSize * v1, -halfSize * v1);
    graphics.moveTo(halfSize * v4, -halfSize * v4);
    graphics.quadraticCurveTo(halfSize * 1.3 * v1, 0, 0, 0);
    graphics.quadraticCurveTo(0, halfSize * 1.3 * v1, -halfSize * v4, halfSize * v4);
    graphics.quadraticCurveTo(-halfSize * 1.3 * v2, 0, 0, 0);
    graphics.quadraticCurveTo(0, -halfSize * 1.3 * v2, halfSize * v4, -halfSize * v4);
}

function drawRing(graphics, halfSize, v1, v2) {
    graphics.circle(0, 0, halfSize * v1);
    graphics.moveTo(halfSize * 0.6 * v2, 0);  // Move to start of inner circle
    graphics.circle(0, 0, halfSize * 0.6 * v2);
}

function drawWave(graphics, halfSize, v1, v2, v3, v4) {
    graphics.moveTo(0, -halfSize);
    graphics.bezierCurveTo(halfSize * v1, -halfSize, halfSize * v2, halfSize, 0, halfSize);
    graphics.bezierCurveTo(-halfSize * v3, halfSize, -halfSize * v4, -halfSize, 0, -halfSize);
}

function drawStar14(graphics, halfSize, v1, v2) {
    const outerRadius = halfSize * v1;
    const innerRadius = halfSize * 0.4 * v2;
    for (let i = 0; i < 14; i++) {
        const angle = (i * TWO_PI / 14) - HALF_PI;
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        if (i === 0) graphics.moveTo(x, y);
        else graphics.lineTo(x, y);
    }
    graphics.closePath();
}

function drawHourglass(graphics, halfSize, v1, v2, v3, v4) {
    graphics.moveTo(-halfSize * 0.6 * v1, -halfSize * v2);
    graphics.lineTo(halfSize * 0.6 * v1, -halfSize * v2);
    graphics.lineTo(-halfSize * 0.2 * v3, 0);
    graphics.lineTo(halfSize * 0.6 * v1, halfSize * v4);
    graphics.lineTo(-halfSize * 0.6 * v1, halfSize * v4);
    graphics.lineTo(halfSize * 0.2 * v3, 0);
    graphics.closePath();
}

function drawClover(graphics, halfSize, v1, v2, v3, v4) {
    const r = halfSize * 0.35;
    graphics.circle(0, -r * v1, r * v1);
    graphics.circle(r * v2, 0, r * v2);
    graphics.circle(0, r * v3, r * v3);
    graphics.circle(-r * v4, 0, r * v4);
}

function drawLemniscate(graphics, halfSize, v1, v2) {
    for (let i = 0; i <= 100; i++) {
        const t = (i / 100) * TWO_PI;
        const sinT = Math.sin(t);
        const cosT = Math.cos(t);
        const denom = 1 + sinT * sinT;
        const x = halfSize * 0.8 * cosT / denom * v1;
        const y = halfSize * 0.8 * sinT * cosT / denom * v2;
        if (i === 0) graphics.moveTo(x, y);
        else graphics.lineTo(x, y);
    }
    graphics.closePath();
}

function drawYinYang(graphics, halfSize) {
    graphics.circle(0, 0, halfSize);
    graphics.moveTo(0, -halfSize);
    graphics.arc(0, -halfSize / 2, halfSize / 2, -HALF_PI, HALF_PI, false);
    graphics.moveTo(0, 0);
    graphics.arc(0, halfSize / 2, halfSize / 2, -HALF_PI, HALF_PI, true);
    const smallRadius = halfSize * 0.15;
    graphics.moveTo(smallRadius, -halfSize / 2);
    graphics.circle(0, -halfSize / 2, smallRadius);
    graphics.moveTo(smallRadius, halfSize / 2);
    graphics.circle(0, halfSize / 2, smallRadius);
}

function drawSpiralTight(graphics, halfSize, v1, v2) {
    const turns = 3.5 * v1;
    for (let i = 0; i <= 120; i++) {
        const angle = (i / 120) * TWO_PI * turns;
        const radius = (i / 120) * halfSize * v2;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        if (i === 0) graphics.moveTo(x, y);
        else graphics.lineTo(x, y);
    }
}

function drawEye(graphics, halfSize) {
    graphics.moveTo(-halfSize, 0);
    graphics.bezierCurveTo(-halfSize, -halfSize * 0.6, halfSize, -halfSize * 0.6, halfSize, 0);
    graphics.bezierCurveTo(halfSize, halfSize * 0.6, -halfSize, halfSize * 0.6, -halfSize, 0);
    const pupilRadius = halfSize * 0.2;
    graphics.moveTo(pupilRadius, 0);
    graphics.circle(0, 0, pupilRadius);
}

function drawSnowflake(graphics, halfSize) {
    const branchLength = halfSize * 0.9;
    const sideBranchLength = branchLength * 0.4;
    const sideBranchPos = 0.55;
    const tipLength = branchLength * 0.25;

    for (let i = 0; i < 6; i++) {
        const angle = (i * TWO_PI / 6) - HALF_PI;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        graphics.moveTo(0, 0);
        const endX = cos * branchLength;
        const endY = sin * branchLength;
        graphics.lineTo(endX, endY);

        const midX = cos * branchLength * sideBranchPos;
        const midY = sin * branchLength * sideBranchPos;

        const leftAngle = angle - Math.PI / 4;
        graphics.moveTo(midX, midY);
        graphics.lineTo(midX + Math.cos(leftAngle) * sideBranchLength, midY + Math.sin(leftAngle) * sideBranchLength);

        const rightAngle = angle + Math.PI / 4;
        graphics.moveTo(midX, midY);
        graphics.lineTo(midX + Math.cos(rightAngle) * sideBranchLength, midY + Math.sin(rightAngle) * sideBranchLength);

        const tipLeftAngle = angle - Math.PI / 5;
        const tipRightAngle = angle + Math.PI / 5;
        graphics.moveTo(endX, endY);
        graphics.lineTo(endX + Math.cos(tipLeftAngle) * tipLength, endY + Math.sin(tipLeftAngle) * tipLength);
        graphics.moveTo(endX, endY);
        graphics.lineTo(endX + Math.cos(tipRightAngle) * tipLength, endY + Math.sin(tipRightAngle) * tipLength);
    }
    graphics.circle(0, 0, halfSize * 0.08);
}

function drawHeart(graphics, halfSize) {
    const s = halfSize * 0.85;
    graphics.moveTo(0, s * 0.9);
    graphics.bezierCurveTo(-s * 0.1, s * 0.6, -s * 0.9, s * 0.2, -s * 0.9, -s * 0.2);
    graphics.bezierCurveTo(-s * 0.9, -s * 0.7, -s * 0.4, -s * 0.9, 0, -s * 0.5);
    graphics.bezierCurveTo(s * 0.4, -s * 0.9, s * 0.9, -s * 0.7, s * 0.9, -s * 0.2);
    graphics.bezierCurveTo(s * 0.9, s * 0.2, s * 0.1, s * 0.6, 0, s * 0.9);
    graphics.closePath();
}

function drawMandala(graphics, halfSize) {
    const symmetry = 8;
    for (let i = 0; i < symmetry; i++) {
        const angle = (i * TWO_PI / symmetry) - HALF_PI;
        const petalLength = halfSize * 0.9;
        const petalWidth = halfSize * 0.25;
        const tipX = Math.cos(angle) * petalLength;
        const tipY = Math.sin(angle) * petalLength;
        const leftAngle = angle - HALF_PI;
        const rightAngle = angle + HALF_PI;
        const midDist = petalLength * 0.5;

        graphics.moveTo(0, 0);
        graphics.quadraticCurveTo(
            Math.cos(angle) * midDist + Math.cos(leftAngle) * petalWidth,
            Math.sin(angle) * midDist + Math.sin(leftAngle) * petalWidth,
            tipX, tipY
        );
        graphics.quadraticCurveTo(
            Math.cos(angle) * midDist + Math.cos(rightAngle) * petalWidth,
            Math.sin(angle) * midDist + Math.sin(rightAngle) * petalWidth,
            0, 0
        );
    }
    for (let i = 0; i < symmetry; i++) {
        const angle = (i * TWO_PI / symmetry) + (Math.PI / symmetry) - HALF_PI;
        const diaLength = halfSize * 0.5;
        graphics.moveTo(0, 0);
        graphics.lineTo(Math.cos(angle) * diaLength, Math.sin(angle) * diaLength);
    }
    graphics.circle(0, 0, halfSize * 0.15);
    graphics.circle(0, 0, halfSize * 0.95);
}

function drawFractalTree(graphics, halfSize) {
    const drawBranch = (startX, startY, angle, length, depth) => {
        if (depth <= 0 || length < 3) return;
        const endX = startX + Math.cos(angle) * length;
        const endY = startY + Math.sin(angle) * length;
        graphics.moveTo(startX, startY);
        graphics.lineTo(endX, endY);
        const branchAngle = Math.PI / 5;
        const lengthRatio = 0.67;
        drawBranch(endX, endY, angle - branchAngle, length * lengthRatio, depth - 1);
        drawBranch(endX, endY, angle + branchAngle, length * lengthRatio, depth - 1);
    };
    const trunkLength = halfSize * 0.4;
    graphics.moveTo(0, halfSize * 0.5);
    graphics.lineTo(0, halfSize * 0.5 - trunkLength);
    drawBranch(0, halfSize * 0.5 - trunkLength, -HALF_PI, trunkLength * 0.8, 4);
}

function drawLotusFlower(graphics, halfSize) {
    const layers = 3;
    const petalsPerLayer = [6, 8, 10];
    const layerScales = [0.35, 0.6, 0.9];

    for (let layer = 0; layer < layers; layer++) {
        const numPetals = petalsPerLayer[layer];
        const layerRadius = halfSize * layerScales[layer];
        const petalH = layerRadius * 0.7;
        const petalW = layerRadius * 0.3;
        const angleOffset = layer * (Math.PI / 12);

        for (let i = 0; i < numPetals; i++) {
            const angle = (i * TWO_PI / numPetals) + angleOffset - HALF_PI;
            const baseX = Math.cos(angle) * layerRadius * 0.2;
            const baseY = Math.sin(angle) * layerRadius * 0.2;
            const tipX = Math.cos(angle) * layerRadius;
            const tipY = Math.sin(angle) * layerRadius;
            const perpAngle = angle + HALF_PI;

            graphics.moveTo(baseX, baseY);
            graphics.quadraticCurveTo(
                Math.cos(angle) * petalH + Math.cos(perpAngle) * petalW + baseX,
                Math.sin(angle) * petalH + Math.sin(perpAngle) * petalW + baseY,
                tipX, tipY
            );
            graphics.quadraticCurveTo(
                Math.cos(angle) * petalH - Math.cos(perpAngle) * petalW + baseX,
                Math.sin(angle) * petalH - Math.sin(perpAngle) * petalW + baseY,
                baseX, baseY
            );
        }
    }
    graphics.circle(0, 0, halfSize * 0.08);
}

function drawChrysanthemum(graphics, halfSize) {
    const numRays = 24;
    const rayVariation = 0.3;

    for (let i = 0; i < numRays; i++) {
        const angle = (i * TWO_PI / numRays) - HALF_PI;
        const rayLength = halfSize * (0.7 + Math.sin(i * 3) * rayVariation);

        graphics.moveTo(0, 0);
        const tipX = Math.cos(angle) * rayLength;
        const tipY = Math.sin(angle) * rayLength;
        graphics.lineTo(tipX, tipY);

        const tipSize = rayLength * 0.15;
        const leftTipAngle = angle - Math.PI / 6;
        const rightTipAngle = angle + Math.PI / 6;
        graphics.moveTo(tipX, tipY);
        graphics.lineTo(tipX + Math.cos(leftTipAngle) * tipSize, tipY + Math.sin(leftTipAngle) * tipSize);
        graphics.moveTo(tipX, tipY);
        graphics.lineTo(tipX + Math.cos(rightTipAngle) * tipSize, tipY + Math.sin(rightTipAngle) * tipSize);
    }
    graphics.circle(0, 0, halfSize * 0.1);
}

function drawFlowerOfLife(graphics, halfSize) {
    const r = halfSize * 0.32;
    graphics.circle(0, 0, r);
    for (let i = 0; i < 6; i++) {
        const angle = (i * TWO_PI / 6);
        graphics.circle(Math.cos(angle) * r, Math.sin(angle) * r, r);
    }
    for (let i = 0; i < 6; i++) {
        const angle = (i * TWO_PI / 6) + (Math.PI / 6);
        graphics.circle(Math.cos(angle) * r * 1.732, Math.sin(angle) * r * 1.732, r);
    }
    for (let i = 0; i < 6; i++) {
        const angle = (i * TWO_PI / 6);
        graphics.circle(Math.cos(angle) * r * 2, Math.sin(angle) * r * 2, r);
    }
}

function drawGeometricRose(graphics, halfSize) {
    const arcs = 6;
    const r = halfSize * 0.7;

    for (let i = 0; i < arcs; i++) {
        const angle = (i * TWO_PI / arcs);
        const cx = Math.cos(angle) * r * 0.3;
        const cy = Math.sin(angle) * r * 0.3;

        graphics.moveTo(
            cx + Math.cos(angle + Math.PI) * r * 0.5,
            cy + Math.sin(angle + Math.PI) * r * 0.5
        );
        graphics.arc(cx, cy, r * 0.5, angle + Math.PI, angle + Math.PI * 2);
    }

    for (let i = 0; i < arcs; i++) {
        const angle = (i * TWO_PI / arcs) + (Math.PI / arcs);
        graphics.circle(Math.cos(angle) * r * 0.15, Math.sin(angle) * r * 0.15, r * 0.1);
    }
    graphics.circle(0, 0, halfSize * 0.08);
}

function drawAtom(graphics, halfSize) {
    const orbitCount = 3;
    const nucleusRadius = halfSize * 0.12;
    const orbitRadiusX = halfSize * 0.85;
    const orbitRadiusY = halfSize * 0.35;

    for (let orbit = 0; orbit < orbitCount; orbit++) {
        const orbitAngle = (orbit * Math.PI / orbitCount);
        const points = 40;
        for (let i = 0; i <= points; i++) {
            const t = (i / points) * TWO_PI;
            const ex = Math.cos(t) * orbitRadiusX;
            const ey = Math.sin(t) * orbitRadiusY;
            const rx = ex * Math.cos(orbitAngle) - ey * Math.sin(orbitAngle);
            const ry = ex * Math.sin(orbitAngle) + ey * Math.cos(orbitAngle);
            if (i === 0) graphics.moveTo(rx, ry);
            else graphics.lineTo(rx, ry);
        }
    }
    graphics.circle(0, 0, nucleusRadius);
}

function drawStarburstMandala(graphics, halfSize) {
    const points = 8;
    const outerR = halfSize * 0.9;
    const innerR = halfSize * 0.4;
    const webR = halfSize * 0.6;

    for (let i = 0; i < points * 2; i++) {
        const angle = (i * Math.PI / points) - HALF_PI;
        const r = i % 2 === 0 ? outerR : innerR;
        const x = Math.cos(angle) * r;
        const y = Math.sin(angle) * r;
        if (i === 0) graphics.moveTo(x, y);
        else graphics.lineTo(x, y);
    }
    graphics.closePath();

    for (let i = 0; i < points; i++) {
        const angle1 = (i * TWO_PI / points) - HALF_PI;
        const angle2 = ((i + 2) % points * TWO_PI / points) - HALF_PI;
        graphics.moveTo(Math.cos(angle1) * webR, Math.sin(angle1) * webR);
        graphics.lineTo(Math.cos(angle2) * webR, Math.sin(angle2) * webR);
    }

    graphics.circle(0, 0, halfSize * 0.1);
    graphics.circle(0, 0, innerR);
}

function drawGalaxySpiral(graphics, halfSize) {
    const arms = 3;
    const points = 50;
    const turns = 1.2;
    const maxR = halfSize * 0.9;

    for (let arm = 0; arm < arms; arm++) {
        const armOffset = (arm * TWO_PI / arms);

        for (let i = 0; i <= points; i++) {
            const t = i / points;
            const angle = armOffset + t * TWO_PI * turns;
            const r = t * maxR;
            const x = Math.cos(angle) * r;
            const y = Math.sin(angle) * r;
            if (i === 0) graphics.moveTo(x, y);
            else graphics.lineTo(x, y);
        }

        for (let s = 0; s < 4; s++) {
            const t = 0.3 + s * 0.18;
            const angle = armOffset + t * TWO_PI * turns;
            const r = t * maxR;
            graphics.circle(Math.cos(angle) * r, Math.sin(angle) * r, halfSize * 0.03);
        }
    }

    graphics.circle(0, 0, halfSize * 0.12);
    graphics.circle(0, 0, halfSize * 0.06);
}

function drawEnergyField(graphics, halfSize) {
    // Abstract flowing energy ribbons
    const ribbons = 5;
    const r = halfSize * 0.85;

    for (let ribbon = 0; ribbon < ribbons; ribbon++) {
        const phase = (ribbon / ribbons) * TWO_PI;
        const freq = 2.5 + ribbon * 0.3;
        const amp = 0.35;

        for (let i = 0; i <= 90; i++) {
            const t = i / 90;
            const angle = t * TWO_PI * 1.1 + phase;
            const wobble = Math.sin(angle * freq) * amp;
            const radius = r * (0.35 + t * 0.65) * (1 + wobble * 0.25);
            const flowAngle = angle + Math.sin(angle * 2) * 0.15;

            const x = Math.cos(flowAngle) * radius;
            const y = Math.sin(flowAngle) * radius;

            if (i === 0) graphics.moveTo(x, y);
            else graphics.lineTo(x, y);
        }
    }

    graphics.circle(0, 0, halfSize * 0.1);
}

function drawCosmicString(graphics, halfSize) {
    // Twisted dimensional tear
    const loops = 3;
    const segments = 50;

    for (let loop = 0; loop < loops; loop++) {
        const loopOffset = loop * 0.4;
        const loopScale = 1 - loop * 0.25;

        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            const angle = t * TWO_PI;

            // Figure-8 / lemniscate base with twist
            const scale = halfSize * loopScale;
            const twist = Math.sin(angle * 2 + loop) * 0.5;
            const x = Math.sin(angle) * scale * (0.9 + twist * 0.3);
            const y = Math.sin(angle * 2) * scale * 0.5;

            if (i === 0) graphics.moveTo(x, y);
            else graphics.lineTo(x, y);
        }
    }

    // Core spark
    graphics.circle(0, 0, halfSize * 0.06);
}

function drawStar3(graphics, halfSize) {
    // 3-pointed star with 120 degree spacing
    const outerR = halfSize;
    const innerR = halfSize * 0.2;
    for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI / 3) - HALF_PI; // 60 deg steps, 6 points total
        const r = i % 2 === 0 ? outerR : innerR;
        const x = Math.cos(angle) * r;
        const y = Math.sin(angle) * r;
        if (i === 0) graphics.moveTo(x, y);
        else graphics.lineTo(x, y);
    }
    graphics.closePath();
}

function drawCShape(graphics, halfSize) {
    // Ring segment - "C" letter shape
    const r = halfSize;
    const thickness = 0.3;
    const startAngle = Math.PI * 0.21;
    const endAngle = Math.PI * 1.79;
    const sx = Math.cos(startAngle) * r;
    const sy = Math.sin(startAngle) * r;
    graphics.moveTo(sx, sy);
    graphics.arc(0, 0, r, startAngle, endAngle);
    const innerR = r * (1 - thickness);
    graphics.arc(0, 0, innerR, endAngle, startAngle, true);
    graphics.closePath();
}

function drawButterfly(graphics, halfSize) {
    const wingSpan = halfSize * 0.95;
    const wingHeight = halfSize * 0.7;

    graphics.moveTo(0, 0);
    graphics.bezierCurveTo(wingSpan * 0.3, -wingHeight * 0.2, wingSpan * 0.9, -wingHeight * 0.8, wingSpan * 0.7, -wingHeight);
    graphics.bezierCurveTo(wingSpan * 0.4, -wingHeight * 0.9, wingSpan * 0.1, -wingHeight * 0.3, 0, 0);

    graphics.moveTo(0, 0);
    graphics.bezierCurveTo(wingSpan * 0.4, wingHeight * 0.1, wingSpan * 0.95, wingHeight * 0.3, wingSpan * 0.6, wingHeight * 0.7);
    graphics.bezierCurveTo(wingSpan * 0.3, wingHeight * 0.5, wingSpan * 0.1, wingHeight * 0.2, 0, 0);

    graphics.moveTo(0, 0);
    graphics.bezierCurveTo(-wingSpan * 0.3, -wingHeight * 0.2, -wingSpan * 0.9, -wingHeight * 0.8, -wingSpan * 0.7, -wingHeight);
    graphics.bezierCurveTo(-wingSpan * 0.4, -wingHeight * 0.9, -wingSpan * 0.1, -wingHeight * 0.3, 0, 0);

    graphics.moveTo(0, 0);
    graphics.bezierCurveTo(-wingSpan * 0.4, wingHeight * 0.1, -wingSpan * 0.95, wingHeight * 0.3, -wingSpan * 0.6, wingHeight * 0.7);
    graphics.bezierCurveTo(-wingSpan * 0.3, wingHeight * 0.5, -wingSpan * 0.1, wingHeight * 0.2, 0, 0);

    graphics.moveTo(0, 0);
    graphics.lineTo(wingSpan * 0.5, -wingHeight * 0.6);
    graphics.moveTo(0, 0);
    graphics.lineTo(-wingSpan * 0.5, -wingHeight * 0.6);

    graphics.moveTo(0, 0);
    graphics.lineTo(wingSpan * 0.4, wingHeight * 0.4);
    graphics.moveTo(0, 0);
    graphics.lineTo(-wingSpan * 0.4, wingHeight * 0.4);

    graphics.ellipse(0, 0, halfSize * 0.06, halfSize * 0.25);

    graphics.moveTo(0, -halfSize * 0.2);
    graphics.quadraticCurveTo(halfSize * 0.1, -halfSize * 0.35, halfSize * 0.15, -halfSize * 0.4);
    graphics.moveTo(0, -halfSize * 0.2);
    graphics.quadraticCurveTo(-halfSize * 0.1, -halfSize * 0.35, -halfSize * 0.15, -halfSize * 0.4);
}

function drawPolygon(graphics, sides, radius, v1, v2, v3, v4) {
    const variations = [v1, v2, v3, v4];
    for (let i = 0; i < sides; i++) {
        const angle = (i * TWO_PI) / sides - HALF_PI;
        const x = Math.cos(angle) * radius * variations[i % 4];
        const y = Math.sin(angle) * radius * variations[i % 4];
        if (i === 0) graphics.moveTo(x, y);
        else graphics.lineTo(x, y);
    }
    graphics.closePath();
}

function drawStar(graphics, points, radius, v1, v2, v3, v4) {
    const variations = [v1, v2, v3, v4];
    for (let i = 0; i < points; i++) {
        const angle = (i * TWO_PI) / points - HALF_PI;
        const v = variations[i % 4];
        const r = i % 2 === 0 ? radius * v : radius / 2 * v;
        const x = Math.cos(angle) * r;
        const y = Math.sin(angle) * r;
        if (i === 0) graphics.moveTo(x, y);
        else graphics.lineTo(x, y);
    }
    graphics.closePath();
}

// Shape drawer lookup table
const shapeDrawers = [
    (g, s, h, v1, v2, v3, v4) => drawCircle(g, h),
    (g, s, h, v1, v2, v3, v4) => drawRectangle(g, s, h, v1, v2),
    (g, s, h, v1, v2, v3, v4) => drawTriangle(g, h, v1, v2, v3, v4),
    (g, s, h, v1, v2, v3, v4) => drawPolygon(g, 5, h, v1, v2, v3, v4),
    (g, s, h, v1, v2, v3, v4) => drawStar(g, 10, h, v1, v2, v3, v4),
    (g, s, h, v1, v2, v3, v4) => drawPolygon(g, 6, h, v1, v2, v3, v4),
    (g, s, h, v1, v2, v3, v4) => drawDiamond(g, s, h, v1, v2, v3, v4),
    (g, s, h, v1, v2, v3, v4) => drawCross(g, h, v1, v2, v3, v4),
    (g, s, h, v1, v2, v3, v4) => drawCrescent(g, s, h, v1, v2, v3),
    (g, s, h, v1, v2, v3, v4) => drawPolygon(g, 8, h, v1, v2, v3, v4),
    (g, s, h, v1, v2, v3, v4) => drawVortex(g, h),
    (g, s, h, v1, v2, v3, v4) => drawSpiral(g, s, v1, v2),
    (g, s, h, v1, v2, v3, v4) => drawFlower(g, h, v1, v2, v3, v4),
    (g, s, h, v1, v2, v3, v4) => drawAsterisk(g, h, v1, v2),
    (g, s, h, v1, v2, v3, v4) => drawInfinity(g, h, v1, v2, v3, v4),
    (g, s, h, v1, v2, v3, v4) => drawRing(g, h, v1, v2),
    (g, s, h, v1, v2, v3, v4) => drawWave(g, h, v1, v2, v3, v4),
    (g, s, h, v1, v2, v3, v4) => drawStar14(g, h, v1, v2),
    (g, s, h, v1, v2, v3, v4) => drawHourglass(g, h, v1, v2, v3, v4),
    (g, s, h, v1, v2, v3, v4) => drawClover(g, h, v1, v2, v3, v4),
    (g, s, h, v1, v2, v3, v4) => drawLemniscate(g, h, v1, v2),
    (g, s, h, v1, v2, v3, v4) => drawYinYang(g, h),
    (g, s, h, v1, v2, v3, v4) => drawSpiralTight(g, h, v1, v2),
    (g, s, h, v1, v2, v3, v4) => drawEye(g, h),
    (g, s, h, v1, v2, v3, v4) => drawSnowflake(g, h),
    (g, s, h, v1, v2, v3, v4) => drawHeart(g, h),
    (g, s, h, v1, v2, v3, v4) => drawMandala(g, h),
    (g, s, h, v1, v2, v3, v4) => drawFractalTree(g, h),
    (g, s, h, v1, v2, v3, v4) => drawLotusFlower(g, h),
    (g, s, h, v1, v2, v3, v4) => drawChrysanthemum(g, h),
    (g, s, h, v1, v2, v3, v4) => drawFlowerOfLife(g, h),
    (g, s, h, v1, v2, v3, v4) => drawGeometricRose(g, h),
    (g, s, h, v1, v2, v3, v4) => drawAtom(g, h),
    (g, s, h, v1, v2, v3, v4) => drawStarburstMandala(g, h),
    (g, s, h, v1, v2, v3, v4) => drawGalaxySpiral(g, h),
    (g, s, h, v1, v2, v3, v4) => drawButterfly(g, h),
    (g, s, h, v1, v2, v3, v4) => drawCShape(g, h),
    (g, s, h, v1, v2, v3, v4) => drawStar3(g, h),
    (g, s, h, v1, v2, v3, v4) => drawCosmicString(g, h),
    (g, s, h, v1, v2, v3, v4) => drawEnergyField(g, h),
];

export function drawShape(type, graphics, size, halfSize, v1, v2, v3, v4) {
    shapeDrawers[type](graphics, size, halfSize, v1, v2, v3, v4);
}
