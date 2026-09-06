---
name: FieldOps
description: A quiet, precise operations workbench with five interchangeable authenticated shells.
colors:
  background: "var(--background)"
  foreground: "var(--foreground)"
  card: "var(--card)"
  card-foreground: "var(--card-foreground)"
  popover: "var(--popover)"
  popover-foreground: "var(--popover-foreground)"
  primary: "var(--primary)"
  primary-foreground: "var(--primary-foreground)"
  link: "var(--link)"
  secondary: "var(--secondary)"
  secondary-foreground: "var(--secondary-foreground)"
  muted: "var(--muted)"
  muted-foreground: "var(--muted-foreground)"
  accent: "var(--accent)"
  accent-foreground: "var(--accent-foreground)"
  destructive: "var(--destructive)"
  destructive-foreground: "var(--destructive-foreground)"
  success: "var(--success)"
  success-foreground: "var(--success-foreground)"
  warning: "var(--warning)"
  warning-foreground: "var(--warning-foreground)"
  info: "var(--info)"
  info-foreground: "var(--info-foreground)"
  brand: "var(--brand)"
  brand-foreground: "var(--brand-foreground)"
  border: "var(--border)"
  input: "var(--input)"
  ring: "var(--ring)"
  sidebar: "var(--sidebar)"
  sidebar-foreground: "var(--sidebar-foreground)"
  sidebar-primary: "var(--sidebar-primary)"
  sidebar-primary-foreground: "var(--sidebar-primary-foreground)"
  sidebar-accent: "var(--sidebar-accent)"
  sidebar-accent-foreground: "var(--sidebar-accent-foreground)"
  sidebar-border: "var(--sidebar-border)"
typography:
  headline:
    fontFamily: "Instrument Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.5rem, 1.25rem + 0.75vw, 1.875rem)"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Instrument Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.5
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Instrument Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Instrument Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.25
rounded:
  sm: "0.5rem"
  md: "0.625rem"
  lg: "0.75rem"
  panel-canvas: "0.875rem"
  panel-atlas: "0.375rem"
  panel-rail: "0.75rem"
  panel-navigator: "0.625rem"
  panel-horizon: "0.625rem"
spacing:
  xs: "0.25rem"
  sm: "0.5rem"
  md: "1rem"
  lg: "1.5rem"
  section-canvas: "1.75rem"
  section-atlas: "1.5rem"
  section-rail: "1.625rem"
  section-navigator: "1.5rem"
  section-horizon: "1.5rem"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.sm}"
    height: "2.25rem"
    padding: "0.5rem 1rem"
  button-outline:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.sm}"
    height: "2.25rem"
    padding: "0.5rem 1rem"
  input:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.sm}"
    height: "var(--platform-control-height)"
    padding: "0.25rem 0.75rem"
  select-trigger:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.sm}"
    height: "2.5rem"
    padding: "0.5rem 0.75rem"
  settings-workspace:
    backgroundColor: "{colors.card}"
    textColor: "{colors.card-foreground}"
    rounded: "var(--platform-panel-radius)"
---

# Design System: FieldOps

## Overview

**Creative North Star: "The Operations Workbench"**

FieldOps is an Operate interface: calm, compact, and built for repeated administrative work. Structure, scanability, and predictable state changes outrank decoration. Brand character comes from restrained indigo accents, exact alignment, useful metadata, and well-resolved fallbacks—not from ornamental dashboards or novelty effects.

The authenticated application is one product expressed through five materially distinct shells. Canvas, Atlas, Rail, Navigator, and Horizon change the navigation frame, density, content width, radius, elevation, and active-state treatment while preserving the same permission-aware destinations and page content. System Settings is the reference surface: one low-chrome content plane, clear dividers, a compact section rail on desktop, and a labeled selector at smaller widths.

**Key Characteristics:**

- Quiet cool-neutral surfaces with sparse indigo emphasis.
- Five recognizable shell topologies over one shared navigation and content contract.
- Workhorse typography, short labels, and explanatory copy at a readable rhythm.
- Fine borders, restrained depth, and shell-specific density rather than decorative chrome.
- Built-in fallback states that remain complete and trustworthy.

## Colors

All application color is semantic and theme-aware. `resources/css/theme.css` is the only palette source; components consume background, foreground, surface, action, status, brand, and sidebar roles. Every role has coordinated light and dark values and is exposed through Tailwind's semantic theme mapping.

**The Semantic Role Rule.** Use a role for its meaning, never a raw hex, RGB, OKLCH value, or generic neutral utility inside a component.

**The Restrained Accent Rule.** Primary is for decisive actions and selected controls; accent is for active navigation and icon wells; brand is for identity. Do not flood ordinary settings surfaces with any of them.

Status must pair color with text or an icon. Destructive actions use the destructive role; success, warning, and info keep their dedicated roles. Borders divide structure quietly and must not become the dominant visual signal. Atlas and Navigator may use the foreground surface as dark structural chrome, but retain semantic foreground/background pairing rather than introducing a separate palette.

## Typography

**Display and Body Font:** Instrument Sans, with the system sans-serif stack.

The type system is practical and compact. Page headings use a semibold 24px mobile / 30px desktop scale with tight tracking; section titles are semibold 16px; body copy and controls are normally 14px with 24px explanatory line-height. Metadata may use 12px; numeric values use tabular figures. Atlas alone uses small tracked uppercase labels for navigation group headings to reinforce its denser enterprise register.

**The Workhorse Type Rule.** Do not introduce a decorative display face, oversized dashboard typography, or pervasive all-caps chrome into the application shell. Hierarchy comes from weight, spacing, and restrained size changes.

## Layout

The organization-wide layout registry exposes exactly five authenticated shells through `data-platform-theme="canvas|atlas|rail|navigator|horizon"`. Canvas is the default. The registry chooses the shell once around shared FlashAlert and page children; every shell derives its visible destinations from the same permission-aware navigation manifest. A layout may reorganize navigation, but it must not fork page content or authorization behavior.

- **Canvas:** the baseline inset shadcn sidebar, collapsible to icons, with a soft workspace inset and breadcrumb header. It uses a 96rem content maximum, 1.75rem page gutter, 0.875rem panel radius, 1.75rem section padding, and 2.5rem control minimum.
- **Atlas:** a dark enterprise masthead above a docked 15rem sidebar and separate breadcrumb strip. It is the densest, squarest shell: full-width content, 1.25rem page gutter, 0.375rem panel radius, 1.5rem section padding, and 2.5rem controls.
- **Rail:** a 4.5rem icon-only rail with tooltips and a 4rem utility header. It preserves the widest operating canvas at 104rem, with a 2rem gutter, 0.75rem panel radius, 1.625rem section padding, and 2.5rem controls.
- **Navigator:** a dark 4rem global group rail plus a 14rem contextual navigation column for the active group, followed by a utility header and content. It uses a 92rem content maximum, 1.75rem gutter, 0.625rem panel radius, 1.5rem section padding, and 2.375rem controls.
- **Horizon:** a brand-and-utility header with grouped horizontal navigation, dropdowns for multi-item groups, and a separate breadcrumb row when needed. It has no desktop sidebar and uses an 82rem focused content maximum, 1.5rem gutter, 0.625rem panel radius, 1.5rem section padding, and 2.25rem controls.

The `--platform-*` variables are the contract for content maximum, page gutter, panel radius, panel shadow, section padding, and control height. Canvas values live at the root; each other theme overrides only those layout variables. Personal Light, Dark, and System appearance is independent, user-scoped, and must work with all five shells.

At widths below the large breakpoint, every shell replaces its desktop navigation with a branded left drawer built on the shared Sheet primitive. Canvas uses the responsive shadcn sidebar; Atlas, Rail, and Navigator share a wordmark-led Sheet no wider than 20rem or 88vw with grouped permission-aware links, 44px rows, and an active chevron; Horizon uses its compact 18rem header Sheet with the same grouped destinations. Theme-specific desktop columns disappear instead of being squeezed, while the mobile trigger and surviving header treatment keep the selected shell recognizable.

Settings pages use the current shell's centered platform container with 1rem mobile and 1.5rem small-screen horizontal padding. At large widths, use a sticky 12rem section rail, a fluid content column, and a 3rem gap. Below large, replace the rail with a labeled Radix/shadcn Select. Field grids may become two columns from the small breakpoint, but return to one column on mobile. Keep forms linear, use section dividers inside one workspace, and place save actions in a distinct footer.

**The Shared Content Rule.** Shells may change topology and density, never page markup, destinations, permissions, or business behavior.

**The One Workspace Rule.** A related settings flow is one content plane with divided sections, not a dashboard of unrelated cards.

## Elevation & Depth

FieldOps is flat by default. Borders and subtle tonal changes establish hierarchy; the settings workspace receives only shallow ambient depth. Canvas uses a two-layer soft panel shadow, Rail a quieter two-layer variant, and Atlas, Navigator, and Horizon use restrained single shadows. Small controls may use an extra-small shadow, while popovers and dialogs own stronger separation.

**The Low-Chrome Rule.** If a border and a tonal surface communicate grouping, do not add another shadow.

## Shapes

Gently rounded geometry is the default, but density varies intentionally by shell. Controls and navigation generally use 0.5rem corners; standard surfaces use 0.75rem. Canvas is softest at 0.875rem, Atlas is deliberately square at 0.375rem, and Navigator and Horizon settle at 0.625rem. Prominent media and drop zones may use 0.75rem.

Pills are reserved for circular avatars, selection indicators, or genuinely compact status—not ordinary labels and buttons. Controls stay dense but operable: standard buttons are 2.25rem high, platform fields inherit the active shell minimum, mobile navigation rows are at least 2.75rem, and all interactive elements preserve a visible focus ring.

## Components

### Authenticated shell registry

Canvas, Atlas, Rail, Navigator, and Horizon are the only shipped shell identities. Each consumes the shared permission-aware navigation groups, runtime brand assets, user menu, breadcrumbs, and unchanged page children. The root document carries the chosen `data-platform-theme` value so semantic platform variables apply consistently. Legacy stored `sidebar` maps to `canvas`, legacy `header` maps to `horizon`, and any unknown value resolves to `canvas`.

### Layout Themes

`/settings/system/layout` is the sole organization-wide shell chooser. It presents all five options as faithful 16:10 miniature topology previews with a name, description, and two or three compact traits. Selection uses a radio control with a checkmark and primary outline; the saved option also carries a textual Current badge, so neither state depends on color. Choosing an option does not live-switch the surrounding shell. A hidden `theme` value submits only when the administrator activates the explicit Apply layout action; the action is disabled when the selection still matches the current layout, and the footer states that the new layout appears after saving.

General System Settings contains only three compact groups—organization identity, regional defaults, and sign-in protection—and never duplicates the layout chooser.

### Settings workspace and selectors

Lead with one page title and short purpose statement. Within the workspace, pair a 2.25rem accent icon well with a section title when the section benefits from wayfinding. Use precise dividers, shell-driven responsive padding, and a muted footer for save or permission context. Disabled and view-only states explain why.

Settings selectors use the solid Radix/shadcn Select: semantic background, input border, moderate corners, extra-small shadow, chevron, visible three-pixel focus ring, checkmarked options, and collision-aware popover placement. Use hidden inputs to submit the selected value with Inertia forms. Native select styling is not part of this settings language.

### Navigation and appearance

Active navigation uses accent plus accent-foreground or the shell's deliberate inverse treatment, always with `aria-current="page"` and a non-color cue where space permits. Icon-only navigation has an accessible label and tooltip. Hover changes color only and motion is removed under reduced-motion preferences.

Organization-wide shell layout and personal appearance are separate controls. Light, Dark, and System remain an independent user-scoped segmented control with `aria-pressed`; changing appearance never changes layout, and selecting a layout never changes appearance.

### Runtime branding

Support exactly five typed slots: compact brand mark (1:1), full wordmark (4:1), wordmark for dark backgrounds (4:1), favicon (1:1), and default image placeholder (4:3). Show a contained preview, slot purpose, recommended aspect ratio, built-in/custom status, and available asset metadata. Only authorized Owners and Super Admins receive Change/Reset actions. Reset restores the starter-kit fallback without deleting the uploader's library asset. Missing custom assets must never break navigation, auth, landing, browser, or record imagery.

### MapboxMap

Keep the map lazy-loaded and reusable, with a named region, attribution, responsive resize handling, click-to-place and draggable-marker behavior when interactive, and a stable minimum height. Respect reduced motion by eliminating the map fade. Missing token, unavailable WebGL, or service-load failure must render a bordered status panel with actionable copy. Latitude and longitude fields remain visible, keyboard operable, validated, and savable as the non-canvas alternative; the map is an enhancement, never the only input.

### ImageGalleryPicker

Use a modal with three explicit source tabs—Library, Upload, Camera—and a persistent Cancel/Use selected image footer. Library provides debounced search, loading, empty/search-empty states, responsive thumbnail grid, pressed selection state, pagination, and a metadata detail pane that moves below the grid on narrow screens. Keep contained previews so logos are never cropped. Upload supports click and drag/drop, states accepted raster formats and bounds before selection, shows progress, and reports errors inline. Camera handles permission, unsupported context, capture, retake, upload progress, device selection, and a direct Upload fallback. Deletion requires confirmation and is disabled for assigned assets.

### Motion and accessibility

Transitions are brief color or small-scale feedback, never layout spectacle. Spinners and thumbnail hover zoom stop under `prefers-reduced-motion`. Every interactive icon has an accessible name; every field has a persistent label; invalid fields connect to their message; selected states use ARIA plus a visible non-color cue. Preserve the global focus-visible ring and keyboard operation across sheets, dialogs, tabs, galleries, maps, menus, and responsive selectors.

## Do's and Don'ts

### Do:

- **Do** use semantic tokens and verify every surface in Light, Dark, and System appearance under Canvas, Atlas, Rail, Navigator, and Horizon.
- **Do** source every shell's destinations from the shared permission-aware navigation manifest and render the same page content inside each shell.
- **Do** keep settings responsive at mobile, tablet, and desktop widths with labels, actions, and fallbacks visible.
- **Do** treat Current, selected, disabled, error, and active states as non-color information as well as visual styling.
- **Do** use built-in branding and manual-coordinate fallbacks as first-class states.
- **Do** reuse the typed MapboxMap and ImageGalleryPicker contracts instead of creating page-specific substitutes.
- **Do** write calm, specific operational copy that explains scope, consequence, and recovery.

### Don't:

- **Don't** add a sixth shell, duplicate shell-specific page content, or branch authorization by layout.
- **Don't** live-switch the authenticated shell from the Layout Themes cards; require the explicit Apply layout action.
- **Don't** place the layout chooser back in General System Settings or combine it with personal appearance.
- **Don't** reproduce legacy screenshots as a visual identity; they are capability references only.
- **Don't** introduce raw colors, gradients, glass effects, decorative illustration, isolated dark-mode patches, fixed-width forms, or horizontal overflow.
- **Don't** add card-heavy dashboards, ornamental animation, global media browsing, crop/edit tools, or geocoding to these workflows.
- **Don't** hide authorization, validation, upload, camera, map, empty, loading, or failure states.
