import { TWO_PI } from './utils.js';

const vertexShader = /* glsl */ `
in vec2 aPosition;
out vec2 vTextureCoord;

uniform vec4 uInputSize;
uniform vec4 uOutputFrame;
uniform vec4 uOutputTexture;

vec4 filterVertexPosition( void )
{
    vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;
    position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;
    position.y = position.y * (2.0*uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;
    return vec4(position, 0.0, 1.0);
}

vec2 filterTextureCoord( void )
{
    return aPosition * (uOutputFrame.zw * uInputSize.zw);
}

void main(void)
{
    gl_Position = filterVertexPosition();
    vTextureCoord = filterTextureCoord();
}
`;

const fragmentShader = /* glsl */ `
out vec4 finalColor;

uniform vec2 uCenterNorm;
uniform float uBlackoutIntensity;
uniform vec2 uResolution;

void main(void) {
    vec2 swayOffset = (uCenterNorm - 0.5) * uResolution;
    vec2 pos = gl_FragCoord.xy - uResolution * 0.5 - swayOffset;

    float minDim = min(uResolution.x, uResolution.y);
    pos /= minDim * 0.5;

    float dist = length(pos);
    float vignetteAlpha = smoothstep(1.1, 2.1, dist) * 0.9;

    float outAlpha = uBlackoutIntensity + vignetteAlpha * (1.0 - uBlackoutIntensity);

    finalColor = vec4(0.0, 0.0, 0.0, outAlpha);
}
`;

export class VignetteControllerGPU {
    constructor(app, layer) {
        this.app = app;
        this.swaySpeed = 0.0002;
        this.swayAmount = 60;
        this.phaseX = Math.random() * TWO_PI;
        this.phaseY = Math.random() * TWO_PI;

        this.blackoutIntensity = 0;
        this.blackoutSpeed = 0;
        this.onPeakCallback = null;

        this.sprite = new PIXI.Sprite(PIXI.Texture.WHITE);
        this.sprite.width = app.screen.width;
        this.sprite.height = app.screen.height;

        this.filter = new PIXI.Filter({
            glProgram: PIXI.GlProgram.from({
                vertex: vertexShader,
                fragment: fragmentShader,
                name: 'vignette-filter'
            }),
            resources: {
                vignetteUniforms: {
                    uCenterNorm: { value: new Float32Array([0.5, 0.5]), type: 'vec2<f32>' },
                    uBlackoutIntensity: { value: 0, type: 'f32' },
                    uResolution: { value: new Float32Array([app.screen.width, app.screen.height]), type: 'vec2<f32>' }
                }
            }
        });

        this.sprite.filters = [this.filter];
        layer.addChild(this.sprite);
    }

    triggerBlackout(onPeakCallback = null) {
        this.blackoutIntensity = 0;
        this.blackoutSpeed = 0.022;
        this.onPeakCallback = onPeakCallback;
    }

    update(timestamp) {
        const width = this.app.screen.width;
        const height = this.app.screen.height;

        const swayNormX = Math.sin(timestamp * this.swaySpeed + this.phaseX) * (this.swayAmount / width);
        const swayNormY = Math.cos(timestamp * this.swaySpeed * 0.7 + this.phaseY) * (this.swayAmount / height);

        const cx = 0.5 + swayNormX;
        const cy = 0.5 + swayNormY;

        if (this.blackoutSpeed !== 0) {
            this.blackoutIntensity += this.blackoutSpeed;

            if (this.blackoutIntensity >= 1) {
                this.blackoutIntensity = 1;
                this.blackoutSpeed = -0.03;
                this.onPeakCallback?.();
                this.onPeakCallback = null;
            } else if (this.blackoutIntensity <= 0) {
                this.blackoutIntensity = 0;
                this.blackoutSpeed = 0;
            }
        }

        const uniforms = this.filter.resources.vignetteUniforms.uniforms;
        uniforms.uCenterNorm[0] = cx;
        uniforms.uCenterNorm[1] = cy;
        uniforms.uBlackoutIntensity = this.blackoutIntensity;
        uniforms.uResolution[0] = width;
        uniforms.uResolution[1] = height;
    }

    resize(width, height) {
        this.sprite.width = width;
        this.sprite.height = height;
    }
}
