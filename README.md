# GameFactory 3A

A browser-first game toolkit built around the stack that actually matters for playable web experiences:

- three.js
- React Three Fiber
- Rapier physics
- scriptable gameplay systems
- Vite-based example apps and static deployment

This repository keeps only the useful tooling for a three.js game studio. We removed the broader, non-core engine distractions and focused on the pieces that help us build and ship browser games.

## What we build with

- 3D rendering and scene composition in three.js
- declarative scene graphs with React Three Fiber
- physics, collisions, and dynamic interaction with Rapier
- camera systems, controller logic, combat, and spell patterns
- reusable gameplay modules that can be adapted per project
- deployment patterns for static hosting and local browser play

## Studio direction

GameFactory 3A is for web-native gameplay, not for multi-engine asset-generation churn. The repo is structured around the practical production loop:

1. prototype gameplay in the browser
2. reuse the runtime contracts and helper systems
3. assemble example scenes and mechanics quickly
4. ship as static Three.js apps

## Active runtime and examples

The active toolchain is under `engine_adapters/three_js/`.

Important directories:

- `engine_adapters/three_js/plugin/A3GamePlayable/` — reusable runtime contracts and gameplay helpers
- `engine_adapters/three_js/examples/` — reference example projects for gameplay patterns
- `scripts/engine_install/three_js/` — project / local toolchain setup for the Three.js stack
- `engine_adapters/browser_serving/` — local browser serving and execution examples

Example packages include:

- `fps-example` — first-person movement and aiming
- `arena-fighter-example` — arena combat and duel logic
- `explorer-example` — third-person movement, terrain, stamina, and follow camera
- `racing-example` — chase camera and driving gameplay
- `motion-vfx-example` — motion and visual effect patterns

These are examples to reuse and adapt, not a separate engine or dependency layer.

## Quick start

```bash
# inside a generated or example project
npm install
npm run dev
```

For a production build:

```bash
npm run build
```

The built output is usually served as static assets from Vite-compatible hosting.

## Deployment

Examples in this repository are designed for static web deployment. Build the app, then publish the generated `dist/` directory to any static host or CDN.

Supported deployment patterns include:

- Vercel
- Netlify
- Cloudflare Pages
- GitHub Pages
- any static file host that serves a Vite build

For release notes and deployment guidance, see [RELEASE.md](RELEASE.md).

## Project framing

This project intentionally keeps only the useful pieces:

- three.js rendering
- R3F scene composition
- Rapier physics and collision
- scriptable gameplay loops
- examples and runtime helpers that are directly useful to gameplay work

Everything outside that practical browser-game focus is intentionally not part of this slice of the repo.

- About this project: [ABOUT.md](ABOUT.md)
- Release and deployment notes: [RELEASE.md](RELEASE.md)
