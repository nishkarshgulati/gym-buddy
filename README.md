# Gym Buddy

Gym plans, animated form guides, one-tap set logging, progress reports, family/friends groups
and personal-trainer coaching. Installable web app (add to home screen on iPhone/Android).

- **Hosting:** GitHub Pages, deployed from the repository root on the `main` branch.
- **Login + data:** Firebase Authentication (Google) and Cloud Firestore.
- **Access rules:** `firestore.rules` (paste into Firebase console → Firestore → Rules → Publish).

## Roles
- **Member:** own plan, logging, records, report. Optional group (family/friends) to compete.
- **Trainee:** a member linked to a trainer with the trainer's 6-letter code.
- **Trainer:** approved by the admin. Sees own clients, edits their weekly plan, publishes 4 weeks ahead, logs sessions with them, sees flags and reports.
- **Admin:** emails listed in `config.js` and `firestore.rules`. Approves trainers.

## Data layout (Firestore)
- `users/{uid}`: profile, schedule, sets/exercise counts, role, trainerId, circle
- `users/{uid}/logs/{YYYY-MM-DD}`: that day's plan snapshot and logged sets
- `users/{uid}/meta/notes`: per-exercise setup notes
- `codes/{CODE}`: trainer invite codes
- `circles/{CODE}`: family/friends groups
