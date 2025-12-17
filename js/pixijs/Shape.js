import { TWO_PI, HALF_PI, randomColorWithAlpha, hslToHex } from './utils.js';
import { drawShape } from './shapes.js';

// Shape class
export class Shape {
    constructor(app, shapesLayer, sizeScale = 1) {
        this.app = app;
        this.shapesLayer = shapesLayer;
        this.sizeScaleRef = sizeScale;

        // Create all graphics objects once - they will be reused
        this.graphics = new PIXI.Graphics();
        this.shadowGraphics = new PIXI.Graphics();
        // Add to layer (will be shown/hidden as needed)
        shapesLayer.addChild(this.shadowGraphics);
        shapesLayer.addChild(this.graphics);

        this.cachedPos = {x: 0, y: 0};
        this.waypoints = [];

        // Callbacks for particle creation
        this.onSupernova = null;
        this.onExplosionFlash = null;

        // Initialize with random properties
        this.init();
    }

    setSizeScale(scale) {
        this.sizeScaleRef = scale;
    }

    // Initialize/reset all random properties for reuse
    init() {
        this.setupRandomPath();
        this.color = randomColorWithAlpha();
        this.rotation = Math.random() * TWO_PI;
        const baseSpeed = 0.001;
        this.baseRotationSpeed = (Math.random() > 0.5 ? 1 : -1) * (baseSpeed + Math.random() * 0.002);
        this.interactionRotation = 0;

        // Select shape type (40 types: 0-39)
        this.type = Math.floor(Math.random() * 40);

        const smallTypes = [1, 2, 3, 5, 6, 36];
        const isSmallType = smallTypes.includes(this.type);
        this.size = isSmallType
            ? (20 + Math.random() * 40) * this.sizeScaleRef
            : (5 + Math.random() * 130) * this.sizeScaleRef;

        this.progress = 0;
        this.speed = (0.0003 + Math.random() * 0.0005) * 0.25; // Even slower movement
        this.life = 0;
        this.pulsePhase = Math.random() * TWO_PI;
        this.pulseSpeed = 0.01 + Math.random() * 0.02;

        this.shapeVar1 = 0.8 + Math.random() * 0.4;
        this.shapeVar2 = 0.8 + Math.random() * 0.4;
        this.shapeVar3 = 0.8 + Math.random() * 0.4;
        this.shapeVar4 = 0.8 + Math.random() * 0.4;

        this.hasShadow = 1; //Math.random() > 0.25;
        this.shadowBlur = 10 + Math.random() * 30;

        // Shadow color - controlled by trailController preset
        const shadowMode = this.app.trailController?.shadowColorMode || 'offset';
        if (shadowMode === 'offset') {
            const hueOffset = 90 + Math.random() * 180;
            const shadowHue = (this.color.h + hueOffset) % 360;
            const shadowSat = 90 + Math.random() * 10;
            const shadowLight = 40 + Math.random() * 25;
            const shadowHex = hslToHex(shadowHue, shadowSat, shadowLight);
            this.shadowColor = {
                hex: shadowHex,
                r: (shadowHex >> 16) & 0xFF,
                g: (shadowHex >> 8) & 0xFF,
                b: shadowHex & 0xFF,
                h: shadowHue,
                s: shadowSat,
                l: shadowLight,
                a: 1
            };
        } else {
            this.shadowColor = { ...this.color, a: 1 };
        }

        if (this.type === 21 && this.hasShadow) {
            this.shadowBlur = 40 + Math.random() * 60;
        }

        this.lineWidth = 2 + Math.random() * 3;

        // v8: blend modes are strings
        const blendModes = ['normal', 'normal', 'screen'];
        this.blendMode = blendModes[Math.floor(Math.random() * blendModes.length)];

        const canvasBlendModes = ['source-over', 'lighter', 'screen', 'screen'];
        this.trailBlendMode = canvasBlendModes[Math.floor(Math.random() * canvasBlendModes.length)];

        this.offsetX = 0;
        this.offsetY = 0;
        this.velocityX = 0;
        this.velocityY = 0;

        this.isInteractive = Math.random() < 0.6;
        this.cachedPos.x = 0;
        this.cachedPos.y = 0;
        this.explosionCheckInterval = 60;
        this.framesSinceLastExplosionCheck = 0;
        this.shouldExplode = false;
        this.collisionBirthPoint = null;

        this.isVeryTransparent = Math.random() < 0.05;
        this.transparencyMultiplier = this.isVeryTransparent ? 0.05 + Math.random() * 0.25 : 1;

        this.hasStroke = true;
        this.strokeOnly = true;

        this.hasDepthEffect = Math.random() < 0.4;
        if (this.hasDepthEffect) {
            const scaleVariation = Math.random();
            if (scaleVariation < 0.5) {
                this.startScale = 0.5 + Math.random() * 0.4;
                this.endScale = 1.1 + Math.random() * 0.5;
            } else {
                this.startScale = 1.1 + Math.random() * 0.5;
                this.endScale = 0.5 + Math.random() * 0.4;
            }
        } else {
            const constantScale = 0.7 + Math.random() * 0.6;
            this.startScale = constantScale;
            this.endScale = constantScale;
        }

        this.hasMorphing = true;
        this.morphPhase = Math.random() * TWO_PI;
        this.morphSpeed = 0.01 + Math.random() * 0.02;
        this.morphAmount = 0.05 + Math.random() * 0.1;

        // Slow ambient sway
        this.swayPhaseX = Math.random() * TWO_PI;
        this.swayPhaseY = Math.random() * TWO_PI;
        this.swaySpeedX = 0.003 + Math.random() * 0.004;
        this.swaySpeedY = 0.002 + Math.random() * 0.003;
        this.swayAmountX = 3 + Math.random() * 5;
        this.swayAmountY = 2 + Math.random() * 4;
        this.swayX = 0;
        this.swayY = 0;

        // Bubble emission
        this.lastBubbleTime = 0;
        this.bubbleInterval = 15000 + Math.random() * 25000;

        // Show/hide graphics based on current properties
        this.graphics.visible = true;
        this.shadowGraphics.visible = this.hasShadow;

        // Clear any previous drawings
        this.graphics.clear();
        this.shadowGraphics.clear();
    }

    // Hide graphics and prepare for pool return
    deactivate() {
        this.graphics.visible = false;
        this.shadowGraphics.visible = false;
        this.graphics.clear();
        this.shadowGraphics.clear();
        // Move off-screen as extra safeguard
        this.graphics.x = -9999;
        this.graphics.y = -9999;
        this.shadowGraphics.x = -9999;
        this.shadowGraphics.y = -9999;
    }

    triggerSupernovaAt(x, y) {
        // Scale explosion based on shape size
        const sizeScale = Math.max(0.5, Math.min(2.5, this.size / 50));

        // Particle count scales with size
        const baseParticleCount = 10 + Math.floor(Math.random() * 8);
        const particleCount = Math.floor(baseParticleCount * sizeScale);

        // 10% of explosions have varied random colors
        const useVariedColors = Math.random() < 0.1;

        const velocityX = (this.velocityX || 0) * 0.5;
        const velocityY = (this.velocityY || 0) * 0.5;

        const prevProgress = Math.max(0, this.progress - 0.01);
        const prevPos = this.getPosition(prevProgress);
        const currentPos = this.getPosition(this.progress);
        const pathVelocityX = (currentPos.x - prevPos.x) * 2;
        const pathVelocityY = (currentPos.y - prevPos.y) * 2;

        for (let i = 0; i < particleCount; i++) {
            // Spawn particles spread across the shape's area
            const spawnAngle = Math.random() * TWO_PI;
            const spawnRadius = Math.random() * this.size * 0.5;
            const spawnX = x + Math.cos(spawnAngle) * spawnRadius;
            const spawnY = y + Math.sin(spawnAngle) * spawnRadius;

            const particleColor = useVariedColors ? randomColorWithAlpha() : this.color;
            if (this.onSupernova) {
                this.onSupernova(spawnX, spawnY, particleColor, pathVelocityX + velocityX, pathVelocityY + velocityY, sizeScale);
            }
        }

        if (this.onExplosionFlash) {
            this.onExplosionFlash(x, y, this.size);
        }
    }

    explode() {
        const pos = this.cachedPos;
        this.triggerSupernovaAt(pos.x + this.offsetX, pos.y + this.offsetY);
    }

    setupRandomPath() {
        const side = Math.floor(Math.random() * 4);
        const w = this.app.screen.width;
        const h = this.app.screen.height;

        this.waypoints = [];
        const numWaypoints = 3 + Math.floor(Math.random() * 4);

        let entryX, entryY;
        switch(side) {
            case 0: entryX = Math.random() * w; entryY = -100; break;
            case 1: entryX = w + 100; entryY = Math.random() * h; break;
            case 2: entryX = Math.random() * w; entryY = h + 100; break;
            case 3: entryX = -100; entryY = Math.random() * h; break;
        }
        this.waypoints.push({x: entryX, y: entryY});

        const curveAmount = (Math.random() - 0.5) * 0.4;
        const approachDist = 0.15 + Math.random() * 0.15;
        let approachX, approachY;
        switch(side) {
            case 0:
                approachX = entryX + curveAmount * w;
                approachY = approachDist * h;
                break;
            case 1:
                approachX = w - approachDist * w;
                approachY = entryY + curveAmount * h;
                break;
            case 2:
                approachX = entryX + curveAmount * w;
                approachY = h - approachDist * h;
                break;
            case 3:
                approachX = approachDist * w;
                approachY = entryY + curveAmount * h;
                break;
        }
        this.waypoints.push({x: approachX, y: approachY});

        for (let i = 0; i < numWaypoints; i++) {
            this.waypoints.push({
                x: (Math.random() * 0.7 + 0.15) * w,
                y: (Math.random() * 0.7 + 0.15) * h
            });
        }

        const exitSide = (side + 1 + Math.floor(Math.random() * 3)) % 4;
        const exitCurve = (Math.random() - 0.5) * 0.4;
        const exitDist = 0.15 + Math.random() * 0.15;
        let exitApproachX, exitApproachY, exitX, exitY;
        switch(exitSide) {
            case 0:
                exitX = Math.random() * w; exitY = -100;
                exitApproachX = exitX + exitCurve * w;
                exitApproachY = exitDist * h;
                break;
            case 1:
                exitX = w + 100; exitY = Math.random() * h;
                exitApproachX = w - exitDist * w;
                exitApproachY = exitY + exitCurve * h;
                break;
            case 2:
                exitX = Math.random() * w; exitY = h + 100;
                exitApproachX = exitX + exitCurve * w;
                exitApproachY = h - exitDist * h;
                break;
            case 3:
                exitX = -100; exitY = Math.random() * h;
                exitApproachX = exitDist * w;
                exitApproachY = exitY + exitCurve * h;
                break;
        }
        this.waypoints.push({x: exitApproachX, y: exitApproachY});
        this.waypoints.push({x: exitX, y: exitY});
    }

    getPosition(t) {
        const numSegments = this.waypoints.length - 1;
        const segment = Math.min(Math.floor(t * numSegments), numSegments - 1);
        const localT = (t * numSegments) - segment;

        const p0 = this.waypoints[Math.max(0, segment - 1)];
        const p1 = this.waypoints[segment];
        const p2 = this.waypoints[segment + 1];
        const p3 = this.waypoints[Math.min(this.waypoints.length - 1, segment + 2)];

        const t2 = localT * localT;
        const t3 = t2 * localT;

        const x = 0.5 * (
            (2 * p1.x) +
            (-p0.x + p2.x) * localT +
            (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
            (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3
        );

        const y = 0.5 * (
            (2 * p1.y) +
            (-p0.y + p2.y) * localT +
            (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
            (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
        );

        return {x, y};
    }

    applyRepulsion(mouseX, mouseY, radius, strength, isVortex = false, tangentialDir = 1) {
        const adjustedX = this.cachedPos.x + this.offsetX;
        const adjustedY = this.cachedPos.y + this.offsetY;

        const dx = adjustedX - mouseX;
        const dy = adjustedY - mouseY;
        const distSq = dx * dx + dy * dy;
        const radiusSq = radius * radius;

        if (distSq < radiusSq && distSq > 0) {
            const distance = Math.sqrt(distSq);
            const normalizedDist = distance / radius;
            const falloff = 1 - normalizedDist;

            let force;
            if (isVortex) {
                const cubicFalloff = falloff * falloff * falloff;
                const closeRange = 100;
                const inverseSquareBoost = distance < closeRange
                    ? Math.pow(closeRange / distance, 1.5)
                    : 1;
                force = cubicFalloff * strength * 1.5 * inverseSquareBoost;
            } else {
                const smoothFalloff = falloff * falloff;
                force = smoothFalloff * strength;
            }

            const angle = Math.atan2(dy, dx);
            this.velocityX += Math.cos(angle) * force;
            this.velocityY += Math.sin(angle) * force;

            if (isVortex) {
                const tangentialAngle = angle + (HALF_PI * tangentialDir);
                const tangentialFalloff = falloff * falloff * falloff;
                const tangentialStrength = tangentialFalloff * strength * 0.15;
                this.velocityX += Math.cos(tangentialAngle) * tangentialStrength;
                this.velocityY += Math.sin(tangentialAngle) * tangentialStrength;
            }

            if (isVortex) {
                const torque = tangentialDir * force * 0.002;
                this.interactionRotation += torque;
            } else {
                const torque = dx * force * 0.00002;
                this.interactionRotation += torque;
            }
        }

        this.offsetX += this.velocityX;
        this.offsetY += this.velocityY;
        this.velocityX *= 0.92;
        this.velocityY *= 0.92;
    }

    applyParticleRepulsion(otherShapes) {
        const myX = this.cachedPos.x + this.offsetX;
        const myY = this.cachedPos.y + this.offsetY;

        const interactionRadius = 100;
        const interactionRadiusSq = interactionRadius * interactionRadius;
        const interactionStrength = 3;

        for (let i = 0; i < otherShapes.length; i++) {
            const other = otherShapes[i];
            if (other === this) continue;

            const otherX = other.cachedPos.x + other.offsetX;
            const otherY = other.cachedPos.y + other.offsetY;

            const dx = myX - otherX;
            const dy = myY - otherY;
            const distSq = dx * dx + dy * dy;

            const myDepthScale = this.startScale + (this.endScale - this.startScale) * this.progress;
            const otherDepthScale = other.startScale + (other.endScale - other.startScale) * other.progress;
            const collisionDist = (this.size * myDepthScale + other.size * otherDepthScale) / 2;
            const collisionDistSq = collisionDist * collisionDist;

            if (distSq < collisionDistSq && distSq > 0) {
                if (!this.isInteractive || !other.isInteractive) {
                    const birthX = (myX + otherX) / 2;
                    const birthY = (myY + otherY) / 2;
                    this.collisionBirthPoint = { x: birthX, y: birthY };
                    other.collisionBirthPoint = { x: birthX, y: birthY };

                    this.shouldExplode = true;
                    other.shouldExplode = true;
                    return;
                }
            }

            if (this.isInteractive && other.isInteractive && distSq < interactionRadiusSq && distSq > 0) {
                const distance = Math.sqrt(distSq);
                const force = (1 - distance / interactionRadius) * interactionStrength;
                const angle = Math.atan2(dy, dx);

                this.velocityX += Math.cos(angle) * force;
                this.velocityY += Math.sin(angle) * force;
                this.interactionRotation += Math.sign(this.baseRotationSpeed) * force * 0.01;
            }
        }
    }

    update(mouseX, mouseY, repulsionRadius, repulsionStrength, allShapes, agents, shouldCheckCollisions, timestamp) {
        this.progress += this.speed;
        this.life = Math.min(1, this.life + 0.005);
        this.rotation += this.baseRotationSpeed + this.interactionRotation;
        if (this.rotation > TWO_PI) this.rotation -= TWO_PI;
        if (this.rotation < -TWO_PI) this.rotation += TWO_PI;
        this.interactionRotation *= 0.99;
        this.pulsePhase += this.pulseSpeed;
        if (this.pulsePhase > TWO_PI) this.pulsePhase -= TWO_PI;

        if (this.hasMorphing) {
            this.morphPhase += this.morphSpeed;
        }

        this.swayPhaseX += this.swaySpeedX;
        this.swayPhaseY += this.swaySpeedY;
        if (this.swayPhaseX > TWO_PI) this.swayPhaseX -= TWO_PI;
        if (this.swayPhaseY > TWO_PI) this.swayPhaseY -= TWO_PI;
        this.swayX = Math.sin(this.swayPhaseX) * this.swayAmountX;
        this.swayY = Math.sin(this.swayPhaseY) * this.swayAmountY;

        const pos = this.getPosition(this.progress);
        this.cachedPos.x = pos.x;
        this.cachedPos.y = pos.y;

        this.applyRepulsion(mouseX, mouseY, repulsionRadius, repulsionStrength, false, 1);
        agents.forEach(agent => {
            this.applyRepulsion(agent.x, agent.y, agent.radius, agent.strength, true, agent.tangentialDir);
        });

        if (shouldCheckCollisions) {
            this.applyParticleRepulsion(allShapes);
        }

        this.framesSinceLastExplosionCheck++;
        if (this.framesSinceLastExplosionCheck >= this.explosionCheckInterval) {
            this.framesSinceLastExplosionCheck = 0;
            if (Math.random() < 0.01) {
                this.shouldExplode = true;
                // 50% chance to spawn 2 new particles from self-explosion
                if (Math.random() < 0.5) {
                    const x = this.cachedPos.x + this.offsetX;
                    const y = this.cachedPos.y + this.offsetY;
                    // Set two birth points with slight offset
                    this.collisionBirthPoint = { x: x, y: y, spawn2: true };
                }
            }
        }

        if (this.shouldExplode) {
            this.triggerSupernovaAt(this.cachedPos.x + this.offsetX, this.cachedPos.y + this.offsetY);
            return false;
        }

        return this.progress <= 1;
    }

    draw() {
        const pulseIntensity = this.hasDepthEffect ? 0.05 : 0.15;
        const pulse = 1 + Math.sin(this.pulsePhase) * pulseIntensity;
        const fadeIn = Math.min(1, this.life * 3);
        const fadeOut = this.progress > 0.85 ? (1 - this.progress) / 0.15 : 1;
        const opacity = fadeIn * fadeOut * this.transparencyMultiplier;
        const depthScale = this.startScale + (this.endScale - this.startScale) * this.progress;
        const finalScale = pulse * depthScale;

        const morphOffset = this.hasMorphing ? Math.sin(this.morphPhase) * this.morphAmount : 0;
        this.currentMorphVar1 = this.shapeVar1 + morphOffset;
        this.currentMorphVar2 = this.shapeVar2 + Math.sin(this.morphPhase * 1.3) * this.morphAmount;
        this.currentMorphVar3 = this.shapeVar3 + Math.sin(this.morphPhase * 0.7) * this.morphAmount;
        this.currentMorphVar4 = this.shapeVar4 + Math.sin(this.morphPhase * 1.7) * this.morphAmount;

        const size = this.size;
        const halfSize = size / 2;

        // v8 Graphics API: draw path first, then fill/stroke
        if (this.shadowGraphics && this.hasShadow) {
            this.shadowGraphics.clear();
            this.shadowGraphics.x = this.cachedPos.x + this.offsetX + this.swayX;
            this.shadowGraphics.y = this.cachedPos.y + this.offsetY + this.swayY;
            this.shadowGraphics.rotation = this.rotation;
            this.shadowGraphics.scale.set(finalScale);
            this.shadowGraphics.alpha = opacity * this.shadowColor.a * 0.4;
            this.shadowGraphics.blendMode = 'normal';

            this.shadowGraphics.setStrokeStyle({ width: this.lineWidth, color: this.shadowColor.hex });
            this.drawShapeToGraphics(this.shadowGraphics, size, halfSize);
            if (!this.strokeOnly) {
                this.shadowGraphics.fill({ color: this.shadowColor.hex });
            }
            this.shadowGraphics.stroke();
        }

        this.graphics.clear();
        this.graphics.x = this.cachedPos.x + this.offsetX + this.swayX;
        this.graphics.y = this.cachedPos.y + this.offsetY + this.swayY;
        this.graphics.rotation = this.rotation;
        this.graphics.scale.set(finalScale);
        this.graphics.alpha = opacity * this.color.a;
        this.graphics.blendMode = this.blendMode;

        if (this.hasStroke || this.strokeOnly) {
            this.graphics.setStrokeStyle({ width: this.lineWidth, color: this.color.hex });
        }
        this.drawShapeToGraphics(this.graphics, size, halfSize);
        if (!this.strokeOnly) {
            this.graphics.fill({ color: this.color.hex });
        }
        if (this.hasStroke || this.strokeOnly) {
            this.graphics.stroke();
        }
    }

    drawShapeToGraphics(graphics, size, halfSize) {
        const v1 = this.currentMorphVar1 || this.shapeVar1;
        const v2 = this.currentMorphVar2 || this.shapeVar2;
        const v3 = this.currentMorphVar3 || this.shapeVar3;
        const v4 = this.currentMorphVar4 || this.shapeVar4;
        drawShape(this.type, graphics, size, halfSize, v1, v2, v3, v4);
    }

    destroy() {
        this.shadowGraphics.destroy();
        this.graphics.destroy();
    }
}

// Shape pool for object reuse
export class ShapePool {
    constructor(app, shapesLayer, sizeScale) {
        this.app = app;
        this.shapesLayer = shapesLayer;
        this.sizeScale = sizeScale;
        this.pool = [];
        this.active = [];
    }

    get() {
        let shape;
        if (this.pool.length > 0) {
            shape = this.pool.pop();
            shape.setSizeScale(this.sizeScale);
            shape.init();
        } else {
            shape = new Shape(this.app, this.shapesLayer, this.sizeScale);
        }
        this.active.push(shape);
        return shape;
    }

    release(shape) {
        const index = this.active.indexOf(shape);
        if (index !== -1) {
            this.active.splice(index, 1);
        }
        shape.deactivate();
        this.pool.push(shape);
    }

    releaseAll() {
        while (this.active.length > 0) {
            const shape = this.active.pop();
            shape.deactivate();
            this.pool.push(shape);
        }
    }

    destroyAll() {
        this.active.forEach(shape => shape.destroy());
        this.pool.forEach(shape => shape.destroy());
        this.active = [];
        this.pool = [];
    }
}
