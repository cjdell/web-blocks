Web Blocks
==========

A WebGL application for building worlds and learning programming. Inspired by Minecraft Pi Edition.

See it in action here: [http://webblocks.uk/]

Controls
--------

Move forwards / backwards: W and S

Move sideways: A and D

Look around: Arrow keys or press Shift to toggle using mouse to look around

Code editor: Escape key

Notes
-----

This app will only work on modern web browsers (Chrome, Firefox, Safari) and on computers with 3D graphics chips. This is only a demo at the moment so there will be bugs. I hope to eventually grow it into a useful educational tool. Help is always welcome.

Building
--------

Requires Node.js 20.11 or newer. The repo pins yarn via the
`packageManager` field, so Corepack will use the matching version
automatically (install it with `corepack enable` if you want that).
Once installed, run these commands.

  - yarn
  - yarn build
  - yarn start

Then point your browser at: http://localhost:8888/

Other scripts:

  - yarn typecheck — type-check the project without emitting
  - yarn test — run the test suite (vitest): the world simulation tests
    plus the headless-browser UI sanity checks (Playwright)
  - yarn test:ui — run just the headless-browser UI sanity checks
    set HEADED=1 to launch a visible (headed) browser so you can watch the
    checks run in real time — e.g. `HEADED=1 yarn test:ui`
  - yarn lint — run ESLint
  - yarn size — check the post-gzip bundle size budgets
  - yarn format — format the codebase with Prettier
  - yarn format:check — check Prettier formatting without writing
  - yarn profile — time world init/visibility/block reads (manual benchmark)

The UI sanity checks run the built app in a headless Chromium (WebGL via
SwiftShader), so build first (`yarn build`) before `yarn test` or
`yarn test:ui`. If Chromium is missing, install it with
`yarn playwright install chromium`.
