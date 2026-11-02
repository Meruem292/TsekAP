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

Approved profiles and check-ins are protected by Firebase Authentication, Firestore Security Rules, and trusted Vercel Functions. New student registrations remain pending until an administrator approves them. Each check-in receives a 90-day expiry timestamp and a secured daily Vercel Cron Job removes expired records. The application also excludes expired records from student history, administrator views, and exports before cleanup runs. The legacy AES-GCM local format is recognized only for an explicit one-time import after cloud sign-in.

## Student flow and offline use

Students begin at a dedicated welcome screen, acknowledge the educational disclaimer, and then sign in or request an account. The PWA shell, WHO LMS reference data, BMI calculator, and educational recommendation logic are bundled for limited offline use. Offline calculations remain in memory only: they are not written to device storage or uploaded to Firestore.

Recommendations adapt to the result category and the optional health conditions in the student's profile. The data-driven catalog contains 14 movement and 12 Filipino food ideas, filters unsuitable matches before ranking, and shows the three safest matches before an optional expanded list. It remains general educational guidance and links to official WHO, Philippine DOH, CDC, ADA, AAP, AHA, NIDDK, NHLBI, and Epilepsy Foundation sources.

Exercise and food guidance is presented with a project-local ImageGen illustration set in `dist/assets/recommendations`. The condition logic prioritizes safety notes for asthma, diabetes, cardiovascular or seizure conditions, joint conditions or injury, and food allergy or celiac needs. These examples do not replace an individualized activity, treatment, or nutrition plan.

Each recommendation illustration also has a reproducible five-second looping MP4 generated with `npm run assets:animate`. The app displays muted inline video and automatically falls back to the original still image when the user has enabled reduced-motion preferences. Recommendation media is cached only after it is viewed instead of being included in the initial PWA installation, keeping the larger library from delaying first load.

## Welcome avatar

The interactive doctor welcome avatar is rendered from the supplied Lottie JSON with a locally vendored, pinned copy of `lottie-web` 5.13.0. Both the animation and player are included in the service-worker cache for offline use. The player is MIT-licensed; its license text is stored in `dist/assets/lottie-web-license.md`.

## Motion system

Page transitions use the View Transitions API when available, with a CSS/Web Animations fallback. Scroll-triggered card entrances use `IntersectionObserver`, and every transition simplifies when the device requests reduced motion.

## Brand assets

The official TsekAP logo is stored as `dist/assets/tsekap-logo-transparent.png`. It uses a genuine transparent background and supplies the app brand mark, favicon, Apple touch icon, and PWA icon. The interface primary color is matched to the logo’s teal-blue palette.

## Reference

BMI-for-age calculations use the 2007 WHO growth reference LMS values for supported ages 15–18. Results are educational screening indicators, not diagnoses or medical advice. Official source links are available from the in-app Learn and About pages.
