## Variant: Split Diff

### Design stance
Show the change, don't just assert it. Before/after XML side by side with deletions in red and additions in green — maximum visual feedback on exactly what the repairer did.

### Key choices
- Layout: wide split-pane diff under the verdict; technical details below
- Typography: JetBrains Mono at readable size, diff lines highlighted
- Color: red strikethrough for removed, green for added — classic diff semantics on the site palette
- Interaction: drop/paste input, repair → verdict + diff + download/copy/validate actions

### Trade-offs
- Strong at: trust and transparency — users can audit every change visually before downloading
- Weak at: wide layout needs more horizontal room; diff noise can overwhelm a novice

### Best for
- Technical users (IT, ERP, accountants' consultants) who will not trust a "repaired" file they haven't seen
