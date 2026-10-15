<?php

namespace Tests\Feature\Backups;

use App\Actions\Backups\BackupPackage;
use Illuminate\Support\Facades\File;
use RuntimeException;
use Tests\TestCase;
use ZipArchive;

class BackupPackageTest extends TestCase
{
    private string $directory;

    protected function setUp(): void
    {
        parent::setUp();
        $this->directory = storage_path('framework/testing/backup-package-'.bin2hex(random_bytes(8)));
        File::makeDirectory($this->directory, 0700, true);
        config(['backups.signing_key' => str_repeat('k', 48)]);
    }

    protected function tearDown(): void
    {
        File::deleteDirectory($this->directory);
        parent::tearDown();
    }

    public function test_signed_package_round_trips_binary_and_large_text_without_extracting_archive_paths(): void
    {
        $sql = "INSERT INTO example VALUES ('π 日本語', X'00FF01');\n".str_repeat('some data ', 10000);
        $path = $this->create($sql);
        $manifest = app(BackupPackage::class)->extract($path, $this->directory.'/restored.sql');
        $this->assertSame($sql, file_get_contents($this->directory.'/restored.sql'));
        $this->assertSame(strlen($sql), $manifest['payload_bytes']);
        $this->assertSame(hash('sha256', $sql), $manifest['payload_sha256']);
        $this->assertSame('mysql', $manifest['engine']);
    }

    public function test_unknown_signing_key_is_rejected_and_staged_sql_is_removed(): void
    {
        $path = $this->create('SELECT 1;');
        config(['backups.signing_key' => str_repeat('x', 48)]);
        try {
            app(BackupPackage::class)->extract($path, $this->directory.'/restored.sql');
            $this->fail('An untrusted package was accepted.');
        } catch (RuntimeException $exception) {
            $this->assertStringContainsString('signature', $exception->getMessage());
            $this->assertFileDoesNotExist($this->directory.'/restored.sql');
        }
    }

    public function test_modified_payload_is_rejected(): void
    {
        $path = $this->create('SELECT 1;');
        $zip = new ZipArchive;
        $zip->open($path);
        $zip->addFromString('payload.sql.gz', gzencode('SELECT 2;'));
        $zip->setCompressionName('payload.sql.gz', ZipArchive::CM_STORE);
        $zip->close();
        $this->expectException(RuntimeException::class);
        app(BackupPackage::class)->inspect($path);
    }

    public function test_extra_entries_and_path_traversal_are_rejected(): void
    {
        $path = $this->create('SELECT 1;');
        $zip = new ZipArchive;
        $zip->open($path);
        $zip->addFromString('../outside.sql', 'SELECT 1;');
        $zip->close();
        $this->expectExceptionMessage('unexpected entries');
        app(BackupPackage::class)->inspect($path);
    }

    public function test_compressed_and_expanded_limits_are_enforced(): void
    {
        $path = $this->create(str_repeat('SELECT 1; ', 500));
        config(['backups.expanded_max_bytes' => 100]);
        try {
            app(BackupPackage::class)->inspect($path);
            $this->fail('Expanded limit not enforced.');
        } catch (RuntimeException $exception) {
            $this->assertStringContainsString('expanded', $exception->getMessage());
        }
        config(['backups.expanded_max_bytes' => 10000, 'backups.upload_max_bytes' => 10]);
        $this->expectExceptionMessage('size limit');
        app(BackupPackage::class)->inspect($path);
    }

    public function test_plain_sql_and_malformed_manifest_are_rejected(): void
    {
        file_put_contents($this->directory.'/plain.sql', 'DROP TABLE users;');
        try {
            app(BackupPackage::class)->inspect($this->directory.'/plain.sql');
            $this->fail('Plain SQL was accepted.');
        } catch (RuntimeException $exception) {
            $this->assertStringContainsString('FieldOps', $exception->getMessage());
        }
        $path = $this->create('SELECT 1;');
        $zip = new ZipArchive;
        $zip->open($path);
        $zip->addFromString('manifest.json', '{"format_version":1}');
        $zip->close();
        $this->expectExceptionMessage('manifest is invalid');
        app(BackupPackage::class)->inspect($path);
    }

    public function test_version_two_signs_table_scope_creator_and_audit_note(): void
    {
        $path = $this->createScoped();
        $manifest = app(BackupPackage::class)->inspect($path);
        $this->assertSame(2, $manifest['format_version']);
        $this->assertSame('tables', $manifest['scope']);
        $this->assertSame(['child', 'parent'], $manifest['tables']);
        $this->assertSame(['child'], $manifest['requested_tables']);
        $this->assertSame('Original operator', $manifest['created_by']['name']);
        $this->assertSame('Before reference import', $manifest['audit_note']);
        $manifest['scope'] = 'database';
        $this->replaceManifest($path, $manifest);
        $this->expectExceptionMessage('signature');
        app(BackupPackage::class)->inspect($path);
    }

    public function test_scoped_package_rejects_duplicate_or_outside_dependency_tables_even_with_trusted_signature(): void
    {
        $path = $this->createScoped();
        $manifest = app(BackupPackage::class)->inspect($path);
        $manifest['dependency_edges'][] = ['table' => 'child', 'related_table' => 'outside'];
        unset($manifest['signature']);
        ksort($manifest);
        $manifest['signature'] = hash_hmac('sha256', json_encode($manifest, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES), (string) config('backups.signing_key'));
        $this->replaceManifest($path, $manifest);
        $this->expectExceptionMessage('relationships');
        app(BackupPackage::class)->inspect($path);
    }

    public function test_existing_version_one_has_no_invented_table_or_creator_metadata(): void
    {
        $manifest = app(BackupPackage::class)->inspect($this->create('SELECT 1;'));
        $this->assertSame(1, $manifest['format_version']);
        $this->assertArrayNotHasKey('scope', $manifest);
        $this->assertArrayNotHasKey('created_by', $manifest);
        $this->assertArrayNotHasKey('tables', $manifest);
    }

    public function test_creator_name_supports_the_application_name_length_limit(): void
    {
        $name = str_repeat('名', 255);
        $manifest = app(BackupPackage::class)->inspect($this->createScoped($name));
        $this->assertSame($name, $manifest['created_by']['name']);
        $this->expectExceptionMessage('creator metadata');
        app(BackupPackage::class)->inspect($this->createScoped($name.'名'));
    }

    public function test_manifest_supports_a_large_bounded_table_inventory(): void
    {
        $tables = [];
        $edges = [];
        for ($i = 0; $i < 250; $i++) {
            $tables[] = sprintf('table_%04d_', $i).str_repeat('x', 40);
            if ($i > 0) {
                $edges[] = ['table' => $tables[$i - 1], 'related_table' => $tables[$i]];
            }
        }
        file_put_contents($this->directory.'/dump.sql', 'SELECT 1;');
        $path = $this->directory.'/large-inventory.fieldops';
        app(BackupPackage::class)->create($this->directory.'/dump.sql', [
            'engine' => 'mysql', 'server_version' => '8.4.0', 'server_major' => 8,
            'migration_fingerprint' => str_repeat('a', 64), 'scope' => 'database',
            'tables' => $tables, 'requested_tables' => [], 'dependency_edges' => $edges,
            'created_by' => null, 'audit_note' => '',
        ], $path);
        $manifest = app(BackupPackage::class)->inspect($path);
        $this->assertSame($tables, $manifest['tables']);
        $this->assertSame($edges, $manifest['dependency_edges']);
    }

    private function createScoped(string $creatorName = 'Original operator'): string
    {
        file_put_contents($this->directory.'/dump.sql', 'CREATE TABLE child (id int);');
        $path = $this->directory.'/scoped-'.bin2hex(random_bytes(4)).'.fieldops';
        app(BackupPackage::class)->create($this->directory.'/dump.sql', [
            'engine' => 'mysql', 'server_version' => '8.4.0', 'server_major' => 8,
            'migration_fingerprint' => str_repeat('a', 64), 'scope' => 'tables',
            'tables' => ['child', 'parent'], 'requested_tables' => ['child'],
            'dependency_edges' => [['table' => 'child', 'related_table' => 'parent']],
            'created_by' => ['id' => '42', 'name' => $creatorName, 'source' => 'web'],
            'audit_note' => 'Before reference import',
        ], $path);

        return $path;
    }

    /** @param array<string, mixed> $manifest */
    private function replaceManifest(string $path, array $manifest): void
    {
        $zip = new ZipArchive;
        $zip->open($path);
        $zip->addFromString('manifest.json', json_encode($manifest, JSON_THROW_ON_ERROR));
        $zip->close();
    }

    private function create(string $sql): string
    {
        file_put_contents($this->directory.'/dump.sql', $sql);
        $path = $this->directory.'/backup.zip';
        app(BackupPackage::class)->create($this->directory.'/dump.sql', [
            'engine' => 'mysql', 'server_version' => '8.4.0', 'server_major' => 8,
            'migration_fingerprint' => str_repeat('a', 64),
        ], $path);

        return $path;
    }
}
