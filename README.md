# TsekAP

TsekAP is a Firebase-backed student health awareness PWA based on the provided capstone brief. It calculates BMI and classifies it with the WHO 2007 BMI-for-age reference for students aged 15–18, using completed age in months and sex-specific LMS data.

## Run locally

Install dependencies and run the complete local app, including Vercel API functions:

```powershell
npm install
npm run dev
```

Then open `http://localhost:3000`. Use `npm run dev:ui` only when you are
working on interface styling and do not need registration, authentication, or
database APIs.

## Bootstrap the first administrator

Download a Firebase service-account JSON outside this repository, set
`FIREBASE_SERVICE_ACCOUNT_PATH` to its local path, and run
`npm run bootstrap:admin`. The script creates or updates the configured
administrator, assigns the server-only custom claim, and creates the protected
Firestore profile. Use the administrator login screen's reset action to send
the initial password-setup email.

## Privacy model

Approved profiles and check-ins are protected by Firebase Authentication, Firestore Security Rules, and trusted Vercel Functions. New student registrations remain pending until an administrator approves them. The legacy AES-GCM local format is recognized only for an explicit one-time import after cloud sign-in.

## Welcome avatar

The interactive doctor welcome avatar is rendered from the supplied Lottie JSON with a locally vendored, pinned copy of `lottie-web` 5.13.0. Both the animation and player are included in the service-worker cache for offline use. The player is MIT-licensed; its license text is stored in `dist/assets/lottie-web-license.md`.

## Motion system

Page entrances, text reveals, scroll-triggered card transitions, metric/chart drawing, and interactive zoom feedback use locally vendored GSAP 3.15.0 with ScrollTrigger. The scripts are cached by the service worker so the motion system remains available offline. Motion automatically simplifies when the device requests reduced motion.

## Brand assets

The official TsekAP logo is stored as `dist/assets/tsekap-logo-transparent.png`. It uses a genuine transparent background and supplies the app brand mark, favicon, Apple touch icon, and PWA icon. The interface primary color is matched to the logo’s teal-blue palette.

## Reference

BMI-for-age calculations use the 2007 WHO growth reference LMS values for ages 15–19. Results are educational screening indicators, not diagnoses or medical advice.
