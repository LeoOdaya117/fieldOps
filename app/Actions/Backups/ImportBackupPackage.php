<?php

namespace App\Actions\Backups;

use RuntimeException;

class ImportBackupPackage
{
    public function __construct(private BackupStore $store, private BackupPackage $package, private DatabaseBackupEngine $engine) {}

    /** @param array<string, mixed> $context
     * @return array<string, mixed>
     */
    public function handle(string $source, bool $recovery = false, array $context = []): array
    {
        $path = $this->store->temporaryPath('fieldops');
        try {
            if (! is_file($source) || ! @copy($source, $path)) {
                throw new RuntimeException('Unable to stage the package. Check the file, disk space, and storage permissions.');
            }
            @chmod($path, 0600);
            $manifest = $this->package->inspect($path);
            $this->engine->assertCompatible($manifest, $recovery);

            return $this->store->publish($path, $manifest, 'uploaded', $context);
        } finally {
            if (is_file($path)) {
                @unlink($path);
            }
        }
    }
}
