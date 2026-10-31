# TsekAP

TsekAP is a static, offline-capable student health awareness PWA based on the provided capstone brief. It calculates BMI and classifies it with the WHO 2007 BMI-for-age reference for students aged 15–18, using completed age in months and sex-specific LMS data.

## Run locally

Serve the `dist` directory with any local static server. For example:

```powershell
python -m http.server 4173 --directory dist
```

Then open `http://localhost:4173`.

## Privacy model

The prototype stores one profile and up to three months of check-ins on the current device. The payload is encrypted with AES-GCM using a key derived from the student's LRN passcode. There is no online database in this static build, and the app never sends profile or health-condition data to a server.

## Welcome avatar

The interactive doctor welcome avatar is rendered from the supplied Lottie JSON with a locally vendored, pinned copy of `lottie-web` 5.13.0. Both the animation and player are included in the service-worker cache for offline use. The player is MIT-licensed; its license text is stored in `dist/assets/lottie-web-license.md`.

## Motion system

Page entrances, text reveals, scroll-triggered card transitions, metric/chart drawing, and interactive zoom feedback use locally vendored GSAP 3.15.0 with ScrollTrigger. The scripts are cached by the service worker so the motion system remains available offline. Motion automatically simplifies when the device requests reduced motion.

## Brand assets

The official TsekAP logo is stored as `dist/assets/tsekap-logo-transparent.png`. It uses a genuine transparent background and supplies the app brand mark, favicon, Apple touch icon, and PWA icon. The interface primary color is matched to the logo’s teal-blue palette.

## Reference

BMI-for-age calculations use the 2007 WHO growth reference LMS values for ages 15–19. Results are educational screening indicators, not diagnoses or medical advice.
