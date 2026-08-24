# About GameFactory 3A

GameFactory 3A is a browser-first game development toolkit centered on the stack we actually use for shipping playable web experiences:

- three.js
- React Three Fiber
- Rapier physics
- scriptable gameplay systems
- Vite-based example projects and deployment flows

We are not trying to be a generalized multi-engine toolchain. The project focuses on the practical web game loop: build scenes, tune movement and combat, prototype interactions, and deploy static example apps that run in the browser.

## Purpose

The repo exists to support fast iteration on game systems that are useful in a Three.js runtime:

- camera and controller patterns
- third-person and first-person movement logic
- physics-backed collisions and motion
- elemental, spell, and projectile systems
- composable gameplay building blocks for game projects

## What is intentionally in scope

- three.js rendering and scene composition
- R3F hosted scene graphs
- Rapier collision and simulation
- gameplay helpers and runtime contracts
- browser deployment patterns for example apps

## What is intentionally out of scope

- unrelated engine adapters and non-web production pipelines
- generalized asset generation systems that do not directly support gameplay work
- heavy platform-specific abstractions that are not needed for browser-native game development

## Studio position

This project is a lean, useful subset of the full GameFactory ecosystem. We keep the runtime and examples that improve development speed for gameplay work in the browser and remove the rest.
