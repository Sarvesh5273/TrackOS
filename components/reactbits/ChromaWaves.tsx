"use client";

import React, { useRef, useEffect } from "react";
import { Renderer, Program, Mesh, Triangle, Color } from "ogl";
import "./ChromaWaves.css";

const VERT = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FRAG = `#version 300 es
precision highp float;

uniform vec2 uResolution;
uniform float uTime;
uniform vec2 uMouse;
uniform float uSpeed;
uniform float uFrequency;
uniform float uDistortion;
uniform float uGrain;
uniform vec3 uColor1; // #ffffff White crest
uniform vec3 uColor2; // #8B5CF6 Violet chroma
uniform vec3 uColor3; // #06050a Dark velvet base
uniform float uOpacity;

out vec4 fragColor;

// 2D Simplex Noise
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                     -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy) );
  vec2 x0 = v -   i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
  + i.x + vec3(0.0, i1.x, 1.0 ));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m ;
  m = m*m ;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

// Pseudo-random noise for subtle film grain dithering
float random(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution.xy;
  vec2 p = (gl_FragCoord.xy * 2.0 - uResolution.xy) / max(uResolution.x, uResolution.y);
  
  // Smooth mouse ripple
  vec2 mouseDist = uv - uMouse;
  float d = length(mouseDist);
  p += (mouseDist / (d + 0.08)) * sin(d * 10.0 - uTime * 2.0) * exp(-d * 3.5) * 0.08;

  float t = uTime * uSpeed;

  // Domain warping for smooth liquid silk waves
  vec2 q = vec2(0.0);
  q.x = snoise(p * uFrequency + vec2(t * 0.18, t * 0.22));
  q.y = snoise(p * uFrequency + vec2(-t * 0.15, t * 0.2));

  vec2 r = vec2(0.0);
  r.x = snoise(p * uFrequency + uDistortion * q + vec2(1.7, 9.2) + 0.12 * t);
  r.y = snoise(p * uFrequency + uDistortion * q + vec2(8.3, 2.8) + 0.1 * t);

  float f = snoise(p * uFrequency + uDistortion * r);

  // Soft wave bands and crests
  float wave = smoothstep(-0.6, 0.85, f);
  float highlight = smoothstep(0.2, 0.95, f);
  float chromaEdge = smoothstep(-0.2, 0.6, f) * (1.0 - smoothstep(0.4, 0.9, f));

  // Color blending: Dark base -> #8B5CF6 Violet Chroma -> #FFFFFF White Silk
  vec3 col = uColor3;
  col = mix(col, uColor2, chromaEdge * 0.92);
  col = mix(col, uColor1, highlight * 0.95);

  // Film grain dithering as in React Bits Pro
  if (uGrain > 0.0) {
    float grain = (random(uv * uResolution.xy + fract(uTime * 4.0)) - 0.5) * uGrain;
    col += grain;
  }

  // Smooth bottom fade into next section
  float bottomFade = smoothstep(0.0, 0.12, uv.y);
  fragColor = vec4(clamp(col, 0.0, 1.0), uOpacity * bottomFade);
}
`;

export interface ChromaWavesProps {
  speed?: number;
  frequency?: number;
  distortion?: number;
  grain?: number;
  color1?: string;
  color2?: string;
  color3?: string;
  opacity?: number;
  interactive?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export default function ChromaWaves({
  speed = 0.45,
  frequency = 0.35,
  distortion = 1.5,
  grain = 0.06,
  color1 = "#ffffff",
  color2 = "#8B5CF6",
  color3 = "#06050b",
  opacity = 0.9,
  interactive = true,
  className = "",
  style,
}: ChromaWavesProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const propsRef = useRef<any>({});

  propsRef.current = {
    speed,
    frequency,
    distortion,
    grain,
    color1,
    color2,
    color3,
    opacity,
    interactive,
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const dpr = typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 2) : 1;
    let renderer: Renderer | null = null;
    try {
      renderer = new Renderer({ alpha: true, premultipliedAlpha: true, antialias: true, dpr });
    } catch (e) {
      console.warn("WebGL not supported for ChromaWaves:", e);
      return;
    }

    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const geometry = new Triangle(gl);
    if ((geometry.attributes as any).uv) delete (geometry.attributes as any).uv;

    const c1 = new Color(color1);
    const c2 = new Color(color2);
    const c3 = new Color(color3);

    const program = new Program(gl, {
      vertex: VERT,
      fragment: FRAG,
      uniforms: {
        uResolution: { value: [container.clientWidth * dpr, container.clientHeight * dpr] },
        uTime: { value: 0 },
        uMouse: { value: [0.5, 0.5] },
        uSpeed: { value: speed },
        uFrequency: { value: frequency },
        uDistortion: { value: distortion },
        uGrain: { value: grain },
        uColor1: { value: [c1.r, c1.g, c1.b] },
        uColor2: { value: [c2.r, c2.g, c2.b] },
        uColor3: { value: [c3.r, c3.g, c3.b] },
        uOpacity: { value: opacity },
      },
    });

    const mesh = new Mesh(gl, { geometry, program });
    gl.canvas.className = "chroma-waves-canvas";
    container.appendChild(gl.canvas);

    const resize = () => {
      if (!container || !renderer) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      renderer.setSize(w, h);
      program.uniforms.uResolution.value = [w * dpr, h * dpr];
    };

    const ro = new ResizeObserver(resize);
    ro.observe(container);
    resize();

    let targetMouse = [0.5, 0.5];
    let currentMouse = [0.5, 0.5];

    const onMouseMove = (e: MouseEvent) => {
      if (!container || !propsRef.current.interactive) return;
      const rect = container.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = 1.0 - (e.clientY - rect.top) / rect.height;
      targetMouse = [Math.max(0, Math.min(1, x)), Math.max(0, Math.min(1, y))];
    };

    window.addEventListener("mousemove", onMouseMove);

    let lastTime = performance.now();
    let totalTime = 0;
    let raf = 0;

    const update = (now: number) => {
      raf = requestAnimationFrame(update);
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      totalTime += dt;

      const p = propsRef.current;

      // Smooth mouse damping
      currentMouse[0] += (targetMouse[0] - currentMouse[0]) * (1 - Math.exp(-dt * 6));
      currentMouse[1] += (targetMouse[1] - currentMouse[1]) * (1 - Math.exp(-dt * 6));

      c1.set(p.color1);
      c2.set(p.color2);
      c3.set(p.color3);

      program.uniforms.uTime.value = totalTime;
      program.uniforms.uMouse.value = currentMouse;
      program.uniforms.uSpeed.value = p.speed;
      program.uniforms.uFrequency.value = p.frequency;
      program.uniforms.uDistortion.value = p.distortion;
      program.uniforms.uGrain.value = p.grain;
      program.uniforms.uColor1.value = [c1.r, c1.g, c1.b];
      program.uniforms.uColor2.value = [c2.r, c2.g, c2.b];
      program.uniforms.uColor3.value = [c3.r, c3.g, c3.b];
      program.uniforms.uOpacity.value = p.opacity;

      if (renderer) renderer.render({ scene: mesh });
    };

    raf = requestAnimationFrame(update);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("mousemove", onMouseMove);
      if (renderer && gl.canvas.parentNode === container) {
        container.removeChild(gl.canvas);
      }
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`chroma-waves-container ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
}
