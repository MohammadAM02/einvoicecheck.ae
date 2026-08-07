## Variant: Guided Wizard

### Design stance
A two-step process made explicit: 1) repair format, 2) validate. The user always knows where they are and what's next — progress is shown, not implied.

### Key choices
- Layout: stepper (Repair → Validate) at top, step-1 body below, step-2 panel appears with the result
- Typography: same site stack; step labels small and clear
- Color: stepper dots turn teal as steps complete; progress checklist animates through the repair phases
- Interaction: animated repair progress (parse → chars → namespaces → declaration → fingerprint), then verdict + "Validate repaired invoice →" panel

### Trade-offs
- Strong at: guided hand-holding, shows the engine doing real work, obvious next action
- Weak at: more moving parts; the stepper adds ceremony for the common "just fix it" case

### Best for
- Non-technical users who benefit from reassurance that the tool is checking the right things; also a good demo mode
