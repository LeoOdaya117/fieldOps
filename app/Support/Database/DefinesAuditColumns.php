<?php

namespace App\Support\Database;

use Illuminate\Database\Schema\Blueprint;

/**
 * Reusable schema definition for auditable application records.
 *
 * Use this in new table migrations when the table needs the standard actor,
 * lifecycle, soft-delete, and timestamp columns.
 */
trait DefinesAuditColumns
{
    protected function auditColumns(
        Blueprint $table,
        bool $includeStatus = true,
        bool $includeTimestamps = true,
    ): void {
        $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
        $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();

        if ($includeStatus) {
            $table->string('status')->default('active')->index();
        }

        $table->unsignedTinyInteger('record_status')->default(1)->index();
        if ($includeTimestamps) {
            $table->timestamps();
        }
    }
}
