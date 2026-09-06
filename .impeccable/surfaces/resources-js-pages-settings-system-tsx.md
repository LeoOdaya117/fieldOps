---
version: 1
slug: "resources-js-pages-settings-system-tsx"
primary_target: "resources/js/pages/settings/system.tsx"
related_targets: ["resources/js/pages/settings/system/layout.tsx","resources/js/pages/settings/system/address.tsx","resources/js/pages/settings/system/map.tsx","resources/js/pages/settings/system/platform-images.tsx","resources/js/layouts/app-layout.tsx"]
---

Scope: System Settings routes for General, Layout Themes, Address, Map, and Platform Images plus the authenticated shell registry. Mode: Operate.

Audience and job: permissioned administrators configure organization defaults quickly; Owners and Super Admins additionally assign platform imagery. The primary task is reviewing current state, changing one bounded group, and saving with clear validation and feedback.

Content and constraints: preserve FieldOps semantic tokens, personal light/dark appearance, server authorization, responsive behavior, and safe built-in fallbacks. Canvas, Atlas, Rail, Navigator, and Horizon must expose the same permission-aware destinations without duplicating page content. Reference screenshots define desired capabilities only. Avoid unrelated legacy settings, card-heavy dashboards, hidden controls, geocoding, cropping, and global media browsing.

Direction: a quiet settings workbench with a compact desktop rail, solid shadcn mobile section selector, one low-chrome content plane, precise dividers, and restrained accent use. General stays limited to three compact groups. Layout Themes owns five faithful miniature shell previews and applies the organization-wide choice only after an explicit save. Each mobile shell uses a branded Sheet while retaining recognizable theme details.

Approved comp: `.impeccable/mocks/fieldops-layout-themes.png`. Concept seed: a five-frame FieldOps operations-shell comparison board using one restrained indigo/cool-neutral language to make topology—not decoration—the memorable distinction. Canvas is the baseline; Atlas, Rail, Navigator, and Horizon progressively change the navigation frame while preserving identical application content and authorization.

Unresolved decisions: none for this delivery.
