# Role-based access control

FieldOps uses a single-enterprise RBAC model. Users receive exactly one role, roles contain source-controlled permissions, and the server enforces access through Laravel Gates and Policies. The Owner role is protected and receives the permission catalog through the Gate `before` rule.

## Roles

The first-setup role templates are User, Admin, and Super Admin. The enterprise catalog also retains the protected Owner, Administrator, Dispatcher, Supervisor, Technician, and Auditor templates for existing deployments and more granular operating teams. Administrators can create custom roles from the permission catalog, but cannot grant permissions they do not possess. Direct user permissions, explicit denies, tenant switching, and role inheritance are intentionally not enabled.

## Account lifecycle

Public registration is disabled. An authorized administrator invites a user, selects one role, and sends a single-use seven-day invitation. Accepted invitations create an active, verified account. Accounts are suspended and retained rather than deleted. Suspended sessions are invalidated and suspended users cannot authenticate.

Users who manage access must have a verified email and active account. State-changing access operations require recent password confirmation. The application prevents self-escalation, self-suspension, deleting assigned roles, and removing the last active Owner. Standard administrators see system role templates as read-only; Super Admins can manage every role template.

## Deployment

After deploying the migrations, seed the role catalog and three first-setup accounts:

```powershell
php artisan migrate --force
php artisan db:seed --force
```

The default accounts are:

| Role | Email | Password |
| --- | --- | --- |
| User | `user@example.com` | `password` |
| Admin | `admin@example.com` | `password` |
| Super Admin | `superadmin@example.com` | `password` |

Set `RBAC_DEFAULT_ACCOUNT_PASSWORD` before seeding to use a different first-setup password. Existing accounts are not overwritten or re-passworded by a repeat seed. Change or remove these accounts before exposing a production environment. Two-factor authentication remains available as an account security feature but is not required to open access management.

For an installation that already has users but no owner-level account, the explicit bootstrap command remains available:

```powershell
php artisan rbac:bootstrap-owner owner@example.com
```

The bootstrap command refuses missing, unverified, suspended, or ambiguous owners, and refuses to run when an active Owner or Super Admin already exists.

Access changes generate append-only `access_audit_events` records with actor, subject, event, redacted before/after values, and request metadata. Credentials and invitation tokens are never recorded.

## Record audit columns and soft deletion

Auditable application tables use `created_by`, `updated_by`, `status`, `record_status`, `created_at`, and `updated_at` where those fields apply. New migrations can opt into the shared `App\Support\Database\DefinesAuditColumns` trait:

```php
use App\Support\Database\DefinesAuditColumns;

return new class extends Migration
{
    use DefinesAuditColumns;

    public function up(): void
    {
        Schema::create('work_orders', function (Blueprint $table): void {
            $table->id();
            $table->string('title');
            $this->auditColumns($table);
        });
    }
};
```

Models that use `App\Models\Concerns\HasRecordStatus` automatically populate the actor fields when an authenticated user is available, hide `record_status = 0` rows from normal queries, and convert model and bulk Eloquent `delete()` calls into soft deletes. A deleted record is retained for audit and can only be queried explicitly with `withTrashed()` or `onlyTrashed()`; application delete actions never physically remove it. The immutable `access_audit_events` log remains a separate event store and cannot be updated or deleted.

## Declarative access tables

Access catalog pages use the shared `DataTable` as a GridView-style renderer. Feature table-model modules (`resources/js/features/access/*-table-model.tsx`) own the column definitions. A page supplies its row data and a `tableColumns` function; the table owns the header, body, row keys, serial cells, filters, badges, and action cells defined by that function.

```tsx
<DataTable
    data={roles.data}
    tableColumns={tableColumns}
    getRowKey={(role) => role.id}
/>
```

The standard audit columns are opt-in so compact tables do not gain unexpected fields. Set `addDefaultColumns` to append `created_at`, `updated_at`, `created_by`, `updated_by`, `status`, and `record_status`; a custom column with the same key takes precedence:

```tsx
<DataTable
    data={workOrders.data}
    tableColumns={tableColumns}
    addDefaultColumns
    getRowKey={(workOrder) => workOrder.id}
/>
```

Each column may provide a static `accessor`, an `accessor(row, index)` callback, or a `cell(row, index)` renderer for details and actions. This keeps table markup reusable while allowing controller-backed actions, bulk controls, and column filters to remain declarative.

Sortable columns use the same header control for ascending/descending links. The access controllers validate sort keys against an allowlist before applying them to the query, so table sorting cannot introduce arbitrary SQL ordering.
