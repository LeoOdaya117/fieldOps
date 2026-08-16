# FieldOps architecture

## Request flow

```text
Route -> Middleware -> Form Request -> Controller -> Action/Model -> Inertia response
                                              |
                                              -> Policy / authorization
```

Laravel is the source of truth for authentication, authorization, validation, persistence, and server-side data. Inertia transports page data to React without creating a second API contract for normal web pages.

## Backend boundaries

- Routes define URLs, names, middleware, and controller actions.
- Controllers coordinate the request and response only.
- Form Requests validate input and authorize request-level access.
- Policies authorize access to a model or resource.
- Actions contain reusable or multi-step business workflows.
- Models contain persistence relationships, casts, scopes, and small model-local behavior.
- Database constraints protect invariants that must hold regardless of the caller.

Use a feature namespace when a feature has more than one controller, request, policy, action, or test. Avoid speculative abstractions.

## Frontend boundaries

Inertia pages are route entry points. Feature components, hooks, and types live under `resources/js/features/<feature>`. Shared primitives live under `resources/js/components/ui`; shared application components live directly under `resources/js/components`.

Pages should compose components and handle page-specific wiring, not contain reusable business logic. Server mutations use Inertia forms and named Wayfinder routes. Local state is reserved for view state such as open dialogs, filters, and optimistic interaction state.

## Cross-cutting requirements

Every feature must document its user-visible behavior, protect server-side authorization, include tests, use the semantic theme tokens, and be checked at mobile, tablet, desktop, light, and dark states.
