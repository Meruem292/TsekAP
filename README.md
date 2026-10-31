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

## Reference

BMI-for-age calculations use the 2007 WHO growth reference LMS values for ages 15–19. Results are educational screening indicators, not diagnoses or medical advice.
