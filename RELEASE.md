# Release and deployment

This project ships as a Three.js and Vite-oriented web game toolkit. The examples are designed to build into static assets and deploy to any static host that can serve browser applications.

## Build flow

From a project or example directory:

```bash
npm install
npm run build
```

The generated output is typically placed in a `dist/` directory. That directory is what you publish to your hosting provider.

## Deployment targets

Examples are intended to work well with:

- Vercel
- Netlify
- Cloudflare Pages
- GitHub Pages
- custom static hosting

## Recommended release pattern

1. install dependencies
2. verify the example runs locally with `npm run dev`
3. create a production build with `npm run build`
4. upload the generated static bundle
5. configure base paths and environment variables if required by the host

## Notes for static hosting

- keep the app serverless-friendly and asset-only
- avoid runtime server dependencies unless the example specifically requires them
- treat the build output as static public content
- prefer CDN-friendly asset paths and cache-busting for browser builds

## Example policy

The repository intentionally favors examples that demonstrate useful browser-game fundamentals:

- camera controllers
- movement and locomotion
- combat and projectile flow
- elemental spell logic
- physics-aware interactions

The examples are meant to be adapted into real games, not treated as a full engine or multi-stack release pipeline.

## Release principle

We ship the useful Three.js stack only: rendering, scene composition, physics, runtime helpers, and gameplay examples that directly support browser game development.
