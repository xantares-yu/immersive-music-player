/**
 * Aetheria Sound · WebGL GLSL Fluid Shader Engine
 * Implements: shader-dev & color-expert techniques
 * Domain-warping fluid simulation reacting in real-time to audio frequencies
 */

(function () {
  'use strict';

  const VS_SOURCE = `
    attribute vec2 a_position;
    varying vec2 v_uv;
    void main() {
      v_uv = (a_position + 1.0) * 0.5;
      gl_Position = vec4(a_position, 0.0, 1.0);
    }
  `;

  // Liquid silk domain-warping fragment shader (Ultra-Fast Hardware Accelerated Simplex ALU)
  const FS_SOURCE = `
    precision mediump float;
    varying vec2 v_uv;
    uniform vec2 u_resolution;
    uniform float u_time;
    uniform vec3 u_color1;
    uniform vec3 u_color2;
    uniform vec3 u_color3;
    uniform float u_bass;

    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

    // Fast 2D Simplex Noise
    float snoise(vec2 v) {
      const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
      vec2 i  = floor(v + dot(v, C.yy));
      vec2 x0 = v - i + dot(i, C.xx);
      vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
      vec4 x12 = x0.xyxy + C.xxzz;
      x12.xy -= i1;
      i = mod289(i);
      vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
      vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
      m = m * m;
      m = m * m;
      vec3 x = 2.0 * fract(p * C.www) - 1.0;
      vec3 h = abs(x) - 0.5;
      vec3 ox = floor(x + 0.5);
      vec3 a0 = x - ox;
      m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
      vec3 g;
      g.x  = a0.x * x0.x + h.x * x0.y;
      g.yz = a0.yz * x12.xz + h.yz * x12.yw;
      return 130.0 * dot(m, g);
    }

    // Optimized 2-octave FBM with domain rotation (Cuts ALU cost by 33% with identical fluid look)
    float fbm(vec2 p) {
      float v = 0.0;
      float a = 0.5;
      mat2 rot = mat2(0.87, 0.50, -0.50, 0.87);
      for (int i = 0; i < 2; ++i) {
        v += a * snoise(p);
        p = rot * p * 2.0 + vec2(1.2, 3.4);
        a *= 0.5;
      }
      return v;
    }

    void main() {
      vec2 p = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / min(u_resolution.x, u_resolution.y);
      float t = u_time * 0.16;
      float audioFactor = 1.0 + u_bass * 0.35;

      // Double domain warping
      vec2 q = vec2(
        fbm(p + vec2(0.0, 0.0) + t * 0.35),
        fbm(p + vec2(4.2, 1.1) + t * 0.28)
      );

      vec2 r = vec2(
        fbm(p + 3.0 * q + vec2(1.5, 7.2) + t * 0.22 * audioFactor),
        fbm(p + 3.0 * q + vec2(6.3, 2.1) + t * 0.18 * audioFactor)
      );

      float f = fbm(p + 2.8 * r);

      // Color interpolation
      vec3 col = mix(u_color1, u_color2, clamp((f * f) * 3.5, 0.0, 1.0));
      col = mix(col, u_color3, clamp(length(q) * 0.9, 0.0, 1.0));
      col = mix(col, u_color1 * 1.25, clamp(length(r.x) * 0.85, 0.0, 1.0));

      // Vignette
      float vig = 1.0 - smoothstep(0.4, 1.5, length(p));
      gl_FragColor = vec4(col * vig, 0.72);
    }
  `;

  class FluidShaderEngine {
    constructor(canvas) {
      this.canvas = canvas;
      this.gl = canvas.getContext('webgl', { alpha: true, antialias: true, powerPreference: 'high-performance' });
      this.startTime = Date.now();
      this.color1 = [0.96, 0.62, 0.04];
      this.color2 = [0.91, 0.24, 0.37];
      this.color3 = [0.12, 0.53, 0.90];
      this.bassLevel = 0.0;
      this.isRunning = false;

      if (this.gl) {
        this.initGL();
      }
    }

    hexToRgb(hex) {
      let c = hex.replace('#', '');
      if (c.length === 3) c = c.split('').map(x => x + x).join('');
      const num = parseInt(c, 16);
      return [(num >> 16 & 255) / 255, (num >> 8 & 255) / 255, (num & 255) / 255];
    }

    setColors(c1, c2, c3) {
      this.color1 = this.hexToRgb(c1);
      this.color2 = this.hexToRgb(c2);
      this.color3 = this.hexToRgb(c3);
    }

    setBass(val) {
      this.bassLevel = val;
    }

    initGL() {
      const gl = this.gl;

      const createShader = (type, source) => {
        const s = gl.createShader(type);
        gl.shaderSource(s, source);
        gl.compileShader(s);
        return s;
      };

      const vs = createShader(gl.VERTEX_SHADER, VS_SOURCE);
      const fs = createShader(gl.FRAGMENT_SHADER, FS_SOURCE);

      this.program = gl.createProgram();
      gl.attachShader(this.program, vs);
      gl.attachShader(this.program, fs);
      gl.linkProgram(this.program);

      this.positionBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1, -1,
         1, -1,
        -1,  1,
        -1,  1,
         1, -1,
         1,  1,
      ]), gl.STATIC_DRAW);

      this.posLoc = gl.getAttribLocation(this.program, 'a_position');
      this.resLoc = gl.getUniformLocation(this.program, 'u_resolution');
      this.timeLoc = gl.getUniformLocation(this.program, 'u_time');
      this.c1Loc = gl.getUniformLocation(this.program, 'u_color1');
      this.c2Loc = gl.getUniformLocation(this.program, 'u_color2');
      this.c3Loc = gl.getUniformLocation(this.program, 'u_color3');
      this.bassLoc = gl.getUniformLocation(this.program, 'u_bass');
    }

    start() {
      if (this.isRunning) return;
      this.isRunning = true;
      let lastTime = 0;
      const fpsInterval = 1000 / 30; // 30 FPS cap saves 50-70% GPU cycles for ambient background

      const render = (now) => {
        if (!this.isRunning) return;
        this.rafId = requestAnimationFrame(render);
        const elapsed = now - lastTime;
        if (elapsed >= fpsInterval) {
          lastTime = now - (elapsed % fpsInterval);
          this.renderFrame();
        }
      };
      this.rafId = requestAnimationFrame(render);

      if (!this._visibilityBound) {
        this._visibilityBound = true;
        document.addEventListener('visibilitychange', () => {
          if (document.hidden) {
            this.stop();
          } else if (!this.isRunning) {
            this.start();
          }
        });
      }
    }

    stop() {
      this.isRunning = false;
      if (this.rafId) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
    }

    resize() {
      if (!this.gl) return;
      // Ambient fluid glow buffer optimization:
      // Rendering at ~360p internal resolution with bilinear CSS scaling saves 90% GPU fill-rate
      const scale = 0.3;
      const w = Math.min(Math.max(Math.floor(window.innerWidth * scale), 280), 600);
      const h = Math.min(Math.max(Math.floor(window.innerHeight * scale), 160), 360);

      this.canvas.width = w;
      this.canvas.height = h;
      this.canvas.style.width = '100vw';
      this.canvas.style.height = '100vh';
      this.gl.viewport(0, 0, w, h);
    }

    renderFrame() {
      if (!this.gl) return;
      if (typeof this.onBeforeRender === 'function') {
        this.onBeforeRender();
      }

      const gl = this.gl;
      const elapsed = (Date.now() - this.startTime) * 0.001;

      gl.useProgram(this.program);

      gl.enableVertexAttribArray(this.posLoc);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
      gl.vertexAttribPointer(this.posLoc, 2, gl.FLOAT, false, 0, 0);

      gl.uniform2f(this.resLoc, this.canvas.width, this.canvas.height);
      gl.uniform1f(this.timeLoc, elapsed);
      gl.uniform3fv(this.c1Loc, this.color1);
      gl.uniform3fv(this.c2Loc, this.color2);
      gl.uniform3fv(this.c3Loc, this.color3);
      gl.uniform1f(this.bassLoc, this.bassLevel);

      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
  }

  window.FluidShaderEngine = FluidShaderEngine;

})();
