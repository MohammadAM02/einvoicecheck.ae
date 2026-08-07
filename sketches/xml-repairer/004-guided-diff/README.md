## Variant: Guided Diff

### Design stance
The chosen hybrid: variant 002's guided wizard structure with variant 003's split before/after diff as the result. The wizard builds trust through visible progress; the diff pays it off with proof of exactly what changed.

### Key choices
- Layout: stepper (Repair → Validate) → input card → animated repair progress → verdict + split diff → validate panel
- Typography: site stack; JetBrains Mono carries the diff
- Color: teal stepper dots complete as steps progress; red strikethrough / green add in the diff
- Interaction: two-step flow, animated progress checklist, before/after diff with per-line highlighting, download/copy, validate-next handoff

### Trade-offs
- Strong at: guided reassurance + transparent audit — the trust loop closes on both sides
- Weak at: slightly more vertical space than 001; the diff needs horizontal room (acceptable on desktop, worth a mobile pass)

### Best for
- The winner for production: non-technical users get the guide, technical users get the diff
