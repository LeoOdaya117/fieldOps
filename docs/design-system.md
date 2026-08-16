# FieldOps design system

## Single palette source

`resources/css/theme.css` is the only source for application color values. It defines semantic light and dark roles and maps them to Tailwind utilities through `@theme` in the imported stylesheet.

Use semantic roles, not visual guesses:

| Role | Purpose |
| --- | --- |
| `background` / `foreground` | Page surfaces and primary text |
| `card` / `popover` | Elevated or temporary surfaces |
| `primary` / `secondary` | Main and supporting actions |
| `muted` / `accent` | Low-emphasis content and selected states |
| `destructive` / `success` / `warning` / `info` | Status and feedback |
| `border` / `input` / `ring` | Structure and focus |
| `brand` | Product identity and illustrations |
| `sidebar` | Navigation surfaces |
| `chart-*` | Data visualization series |

Every role has a light and dark value. New roles must be added to both modes and exposed through a semantic utility name.

## UI rules

- Use mobile-first responsive utilities.
- Provide visible focus and disabled states.
- Keep touch targets usable on small screens.
- Do not rely on color alone to communicate status.
- Provide meaningful loading, empty, and error states.
- Prefer `currentColor` for icons and SVG strokes.
- Avoid raw `dark:` overrides when a semantic token can express the same state.
- Keep product-specific visual identity in brand tokens so it can change without editing components.
