# AURELION R1 — Inside the Machine

An original, interactive automotive concept built with Next.js App Router, TypeScript, Tailwind CSS, React Three Fiber, Three.js, Drei, Framer Motion, and Lucide.

## Run

From this workspace root:

```sh
npm install
npm run dev
```

Open the local address printed by Next.js (http://127.0.0.1:3010).

The AURELION app lives in `aurelion/`. The existing `FraudShield_FIXED/` project is independent and has not been changed by this implementation.

## Explore

- Drag the car to orbit; use the camera toolbar to zoom, reset, rotate automatically, or enter focus view.
- Switch between Exterior, X-Ray, and Exploded views.
- Choose four original paint finishes.
- Enable hotspots and select any of six mechanical systems.
- Open the powertrain hotspot to run the illustrative engine animation and adjust RPM, which changes the piston animation speed. Sound is off by default; the speaker button enables locally synthesized engine audio.
- Explore the aerodynamic system to deploy the active rear wing.
- The Engineering section offers keyboard-accessible system tabs and explanations; each links back into the 3D model.
- Compare Road and Track behavior and open the complete specification dialog.

## Checks

```sh
npm run typecheck
npm run build
```

Next.js exports a static site to `aurelion/out/`. Runtime API keys, databases, external 3D downloads, and paid services are not required.

## Architecture

- `src/components/experience.tsx`: experience state, navigation, system stories, controls, specifications, and optional synthesized sound.
- `src/components/car-scene.tsx`: client-only Canvas, studio environment, camera, shadows, and 3D hotspots.
- `src/components/car-model.tsx`: original procedural coupe body and internal mechanical assemblies.
- `src/lib/vehicle.ts`: model specifications, finishes, system descriptions, and hotspot coordinates.
- `src/app/globals.css`: responsive typography, layouts, materials, and reduced-motion styles.

## Design and accessibility

All vehicle geometry and branding are original. The model is a stylized engineering visualization, not a CAD or physics simulation. Performance values are the fictional specifications provided in the brief. Engine sound is synthesized and is not a recording of a real vehicle.

The interface includes keyboard navigation, visible focus rings, reduced-motion support, a trapped-focus specification dialog, labeled controls, and a textual system guide if WebGL is unavailable. The scene does not depend on remotely hosted models or textures.

