# File management

FieldOps treats uploaded files as private `MediaAsset` records. Browser-facing URLs and upload selections use an opaque file token, never a disk path or numeric database ID. A token is a locator, not an access grant: Laravel checks the signed-in user's permissions and the file's module/owner on every private list, detail, preview, content, and download request.

The central Files workspace is for browsing and managing files in modules an administrator can manage, including another user's uploads within those modules. The existing image gallery remains a personal, uploader-scoped picker. File permissions are enforced by server policies; navigation visibility alone is not an authorization boundary. The shared record-status workflow keeps inactive file bytes for restoration while requiring `view_deleted` to inspect them and `update_deleted` to change status. Files in active use by avatars or platform branding must not be deactivated.

## Storage and upload contract

- New objects are written through Laravel Storage to the configured private disk. Keys are generated server-side under `modules/{module}/{year}/{month}/`; the client cannot supply a key or attach a file to an arbitrary module record.
- The database stores the key and disk, MIME, normalized extension, original display name, byte size, optional image width/height and thumbnail, uploader, module/attachment metadata, audit actors, lifecycle status, and token. Responses omit disk and key.
- Upload Form Requests enforce module-specific MIME and size limits. The Files dropzone defaults to three files per batch, up to 100 MB each; the image gallery keeps its separate 5 MB raster limit and camera option. Files uploads are also capped at 200 records and 1 GB per uploader, including inactive records. Images are checked against dimension and pixel budgets before decoding. A successful upload returns one token-bearing file record. The shared upload hook calls consumers only after each record is saved.
- The physical storage disk can be changed to an S3-compatible private disk without changing browser URLs. Operators must configure Laravel's filesystem disk and retain private object ACLs; no public storage link is needed for managed files.

## Delivery and previews

Private content, thumbnails, previews, and downloads resolve a token through authenticated routes. Image and PDF content may be displayed inline with safe MIME and `nosniff` headers. CSV, XLS, and XLSX previews are bounded tabular data: input bytes, rows, columns and cells are capped. XLSX reads only the first preview rows and their referenced shared strings, with XML byte and visited-node budgets; trailing worksheet content is not parsed into the preview. XLS is read with PhpSpreadsheet's data-only, first-rows filter and only its first worksheet is loaded. Tabular previews are throttled per user. Strings are escaped by React, and spreadsheet formulas are shown as raw text, never evaluated. A file type without a safe preview displays its metadata and a token-based download action. Download responses use a safe attachment disposition and produce an audit event. A missing stored object returns an error without revealing its disk key. Spreadsheet preview requires the PHP extensions declared by PhpSpreadsheet, including ZIP and SimpleXML, in the web runtime; when unavailable it fails safely with a preview error.

Enable ZIP in both the web and CLI PHP runtimes before using spreadsheet previews or running `composer install` or `composer update`. On Laragon, enable `extension=zip` in the active PHP installation's `php.ini` and restart Apache; changing the file alone does not update already-running web workers. The CI workflow requests the required extensions explicitly.

The public platform-branding endpoint is an explicit exception: it may serve only an active image currently assigned to a known branding slot. This does not make the underlying personal gallery publicly browsable. Bundled static assets are outside the managed-upload system.

## Migration and rollback

Existing private media receive tokens without moving their bytes or invalidating platform assignments. Legacy public avatars are copied into managed private records and their references are switched only after the copied bytes are verified. The backfill must be safe to repeat. Retain legacy public avatar files until the cutover has been verified in the deployment environment; deleting them is a separate, deliberate cleanup step. If conversion fails for a particular avatar, preserve that source and report it rather than silently losing the image.

After deploying migrations, run `php artisan files:backfill-avatars` with the configured private disk accessible. Resolve every skipped avatar, verify private token content and reference counts, and then perform a separately approved cleanup of legacy public avatar objects. Until every legacy avatar is converted, the fallback `avatar_path` URL can still appear for that user; the token-only cutover is therefore not complete merely by deploying the code. Configure the web server's upload and request-body limits above 100 MB if the 100 MB Files setting is required in production.

Run migrations and the relevant feature/browser checks from [testing.md](testing.md) before removing any legacy files. Verify both ordinary user and administrator access boundaries, inactive-file behavior, image/PDF/table previews, download headers, gallery/profile/branding compatibility, and mobile/tablet/desktop light and dark presentation.
