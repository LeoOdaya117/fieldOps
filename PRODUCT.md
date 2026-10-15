# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

FieldOps serves operational staff and the administrators who configure the application for their organization. Owners and Super Admins control the most sensitive identity assets, while permissioned administrators manage ordinary system settings.

## Product Purpose

FieldOps is an operations application and reusable Laravel/React starter kit. It provides secure organization-wide configuration, access control, reference data, and adaptable application structure so a new web application can be established without rebuilding its administrative foundation.

## Positioning

FieldOps combines a production-oriented Laravel authorization and audit foundation with runtime-managed branding, layout, location, and security controls that remain reusable across derived applications.

## Operating Context

Administrators use the application from desktop and mobile browsers to manage users, permissions, system defaults, Philippine organization location data, map coordinates, and platform imagery. Regular authenticated users work inside the selected application shell and maintain a private library of images they upload through features that adopt the shared picker.

## Capabilities and Constraints

- Laravel owns routing, authentication, authorization, validation, persistence, and server-side page data; React and Inertia own presentation and local interaction state.
- Organization settings include system identity, timezone, pagination, application layout, login throttling, and inactivity logout.
- Five FieldOps-owned application layouts ship initially: Canvas, Atlas, Rail, Navigator, and Horizon. They share one permission-aware navigation manifest while changing shell topology, density, content width, radii, elevation, and active-state treatment.
- Layout selection is organization-wide and takes effect only after saving. Personal Light, Dark, and System appearance remains a separate per-user preference.
- Address reference data uses Philippine regions, provinces, municipalities, and cities. Barangays and runtime geocoding are not part of the initial capability.
- Map coordinates use a reusable Mapbox GL component and a deployer-supplied public token.
- Media libraries are private per uploader. Only Owners and Super Admins assign platform imagery.
- Initial platform slots are compact brand mark, full wordmark, wordmark for dark backgrounds, favicon, and default image placeholder.
- Platform imagery is raster-only. Cropping, image editing, avatar adoption, and global media browsing are deliberately deferred.

## Brand Commitments

FieldOps is the default product name. The incumbent semantic design tokens, workhorse typography, light/dark support, and calm operational voice remain authoritative. Supplied legacy screenshots communicate desired behavior and information, not a visual identity to reproduce.

## Evidence on Hand

The repository contains the working Laravel/Inertia application, the five-layout shell registry, System Settings surfaces, role and permission rules, audit infrastructure, semantic theme tokens, and existing upload behavior. Reference screenshots supplied with the request show the intended settings categories and gallery workflow. The layout comparison board in `.impeccable/mocks/fieldops-layout-themes.png` records the approved structural direction. No production logo set or Mapbox token has been supplied; built-in assets and explicit empty states must remain valid fallbacks.

## Product Principles

- Prefer clear, bounded operational workflows over dense all-purpose administration screens.
- Enforce authorization and validation on the server, regardless of client affordances.
- Make starter-kit capabilities configurable through typed registries and reusable components.
- Preserve safe fallbacks so missing optional assets or external configuration never breaks the application.
- Treat responsive behavior, light/dark appearance, accessibility, and failure states as required behavior.

## Accessibility & Inclusion

All workflows must remain keyboard operable, expose visible focus and labels, avoid color-only meaning, respect reduced-motion preferences, and provide non-canvas alternatives for map coordinate entry. Every screen must remain usable at narrow mobile, tablet, and desktop widths in light and dark appearances.
