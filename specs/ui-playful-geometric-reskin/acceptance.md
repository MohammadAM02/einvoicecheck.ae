# Acceptance Scenarios

Task: `ui-playful-geometric-reskin`

| ID | Given | When | Then | Verification |
|---|---|---|---|---|
| A-001 | The app is rendered through the root layout | A user opens the homepage or any content/tool route | The shared styles load the playful geometric treatment while retaining the cream page background | Source regression test + `npm run build` |
| A-002 | A user views shared navigation, buttons, cards, forms, and validator/result panels | The user scans or interacts with them | Surfaces use the spike’s rounded pop, navy outlines, teal accents, sticker/hard-shadow treatment without changing markup behavior | Source regression test + manual browser review |
| A-003 | A user opens the site on a narrow viewport | The user navigates or uses the validator | Layout remains readable, interactive controls remain usable, and no horizontal overflow is introduced by the reskin | Existing responsive tests + manual 375px review |
| A-004 | A user tabs to controls or uses keyboard navigation | Focus moves through the page | Focus remains visibly outlined and semantics/labels are preserved | Existing accessibility tests + manual keyboard review |
| A-005 | A user enables reduced motion | The page loads and interactive states change | Decorative animations/transitions are disabled or reduced | Source regression test |
| A-006 | The frontend is built and tested | CI-like commands run from `app/web` | Existing behavior remains intact: all existing tests pass and production build succeeds | `npm test && npm run build` |

## Failure and security scenarios

- Styling must not alter auth, API, billing, validation, or data persistence behavior.
- Existing privacy/guardrail copy and navigation destinations remain present.
- No `.env`, token, credential, or backend file is added or modified.
