<?php

namespace App\Actions\Backups;

use RuntimeException;
use ZipArchive;

/** Signed, bounded packages. SQL is never parsed or executed on upload. */
class BackupPackage
{
    /** @param array<string, mixed> $databaseInfo
     * @return array<string, mixed>
     */
    public function create(string $sqlPath, array $databaseInfo, string $outputPath): array
    {
        $gzipPath = $outputPath.'.gz';
        $input = fopen($sqlPath, 'rb');
        $gzip = gzopen($gzipPath, 'wb6');
        if ($input === false || $gzip === false) {
            throw new RuntimeException('Unable to write the backup payload. Check private storage permissions.');
        }
        chmod($gzipPath, 0600);
        $size = 0;
        $hash = hash_init('sha256');
        try {
            while (! feof($input)) {
                $chunk = fread($input, 1024 * 1024);
                if ($chunk === false) {
                    throw new RuntimeException('Unable to read the database dump.');
                }
                $size += strlen($chunk);
                $this->assertExpandedSize($size);
                hash_update($hash, $chunk);
                if (gzwrite($gzip, $chunk) !== strlen($chunk)) {
                    throw new RuntimeException('Unable to write the backup payload. Check available disk space.');
                }
            }
        } finally {
            fclose($input);
            gzclose($gzip);
        }
        $manifest = [
            'format_version' => isset($databaseInfo['scope']) ? 2 : 1,
            'engine' => $databaseInfo['engine'],
            'server_version' => $databaseInfo['server_version'],
            'server_major' => $databaseInfo['server_major'],
            'migration_fingerprint' => $databaseInfo['migration_fingerprint'],
            'created_at' => now()->toIso8601String(),
            'payload_bytes' => $size,
            'payload_sha256' => hash_final($hash),
            'compressed_bytes' => filesize($gzipPath),
            'compressed_sha256' => hash_file('sha256', $gzipPath),
        ];
        if ($manifest['format_version'] === 2) {
            foreach (['scope', 'requested_tables', 'tables', 'dependency_edges', 'created_by', 'audit_note'] as $field) {
                $manifest[$field] = $databaseInfo[$field] ?? match ($field) {
                    'created_by' => null,
                    'audit_note' => '',
                    default => [],
                };
            }
        }
        $manifest['signature'] = $this->signature($manifest);
        $archive = new ZipArchive;
        try {
            if ($archive->open($outputPath, ZipArchive::CREATE | ZipArchive::EXCL) !== true) {
                throw new RuntimeException('Unable to create the backup package.');
            }
            if (! $archive->addFromString('manifest.json', json_encode($manifest, JSON_THROW_ON_ERROR))
                || ! $archive->addFile($gzipPath, 'payload.sql.gz')
                || ! $archive->setCompressionName('payload.sql.gz', ZipArchive::CM_STORE)) {
                $archive->close();
                throw new RuntimeException('Unable to package the database dump.');
            }
            if (! $archive->close()) {
                throw new RuntimeException('Unable to finish the backup package. Check available disk space.');
            }
            chmod($outputPath, 0600);
            $this->inspect($outputPath);

            return $manifest;
        } finally {
            if (is_file($gzipPath)) {
                unlink($gzipPath);
            }
        }
    }

    /** @return array<string, mixed> */
    public function inspect(string $packagePath): array
    {
        return $this->read($packagePath, null);
    }

    /** @return array<string, mixed> */
    public function extract(string $packagePath, string $sqlOutputPath): array
    {
        try {
            return $this->read($packagePath, $sqlOutputPath);
        } catch (\Throwable $exception) {
            if (is_file($sqlOutputPath)) {
                unlink($sqlOutputPath);
            }
            throw $exception;
        }
    }

    /** @return array<string, mixed> */
    private function read(string $path, ?string $outputPath): array
    {
        if (! is_file($path) || filesize($path) > (int) config('backups.upload_max_bytes')) {
            throw new RuntimeException('The backup package is missing or exceeds the configured size limit.');
        }
        $archive = new ZipArchive;
        if ($archive->open($path, ZipArchive::RDONLY) !== true) {
            throw new RuntimeException('Choose a valid FieldOps backup package.');
        }
        $output = null;
        try {
            if ($archive->numFiles !== 2) {
                throw new RuntimeException('The package contains unexpected entries.');
            }
            $names = [];
            for ($i = 0; $i < $archive->numFiles; $i++) {
                $names[] = $archive->getNameIndex($i);
            }
            sort($names);
            if ($names !== ['manifest.json', 'payload.sql.gz']) {
                throw new RuntimeException('The package contains unexpected entries.');
            }
            $stat = $archive->statName('manifest.json');
            // Scope metadata is bounded independently of the compressed SQL payload.
            if ($stat === false || $stat['size'] > 2 * 1024 * 1024) {
                throw new RuntimeException('The backup manifest is invalid.');
            }
            try {
                $manifest = json_decode((string) $archive->getFromName('manifest.json'), true, 16, JSON_THROW_ON_ERROR);
            } catch (\JsonException) {
                throw new RuntimeException('The backup manifest is invalid.');
            }
            $this->validateManifest($manifest);
            $payloadStat = $archive->statName('payload.sql.gz');
            if ($payloadStat === false || $payloadStat['comp_method'] !== ZipArchive::CM_STORE
                || $payloadStat['size'] !== $manifest['compressed_bytes']) {
                throw new RuntimeException('The backup payload is invalid.');
            }
            $input = $archive->getStream('payload.sql.gz');
            if ($input === false) {
                throw new RuntimeException('Unable to read the backup payload.');
            }
            $inflate = inflate_init(ZLIB_ENCODING_GZIP);
            if ($inflate === false) {
                fclose($input);
                throw new RuntimeException('Unable to decompress the backup payload.');
            }
            $hash = hash_init('sha256');
            $compressedHash = hash_init('sha256');
            $size = 0;
            if ($outputPath !== null) {
                $output = fopen($outputPath, 'xb');
                if ($output === false) {
                    fclose($input);
                    throw new RuntimeException('Unable to stage the backup. Check disk space and permissions.');
                }
                chmod($outputPath, 0600);
            }
            try {
                while (! feof($input)) {
                    // Small compressed chunks bound each inflation allocation even for hostile input.
                    $chunk = fread($input, 4096);
                    if ($chunk === false) {
                        throw new RuntimeException('Unable to read the backup payload.');
                    }
                    if ($chunk === '') {
                        break;
                    }
                    hash_update($compressedHash, $chunk);
                    $decoded = @inflate_add($inflate, $chunk, ZLIB_SYNC_FLUSH);
                    if ($decoded === false) {
                        throw new RuntimeException('The compressed backup payload is corrupt.');
                    }
                    $size += strlen($decoded);
                    $this->assertExpandedSize($size);
                    hash_update($hash, $decoded);
                    if (is_resource($output) && fwrite($output, $decoded) !== strlen($decoded)) {
                        throw new RuntimeException('Unable to stage the backup. Check available disk space.');
                    }
                }
            } finally {
                fclose($input);
            }
            if (inflate_get_status($inflate) !== ZLIB_STREAM_END
                || inflate_get_read_len($inflate) !== $manifest['compressed_bytes']
                || $size !== $manifest['payload_bytes']
                || ! hash_equals($manifest['payload_sha256'], hash_final($hash))
                || ! hash_equals($manifest['compressed_sha256'], hash_final($compressedHash))) {
                throw new RuntimeException('The backup payload checksum or size does not match.');
            }

            return $manifest;
        } finally {
            if (is_resource($output)) {
                fclose($output);
            }
            $archive->close();
        }
    }

    private function assertExpandedSize(int $size): void
    {
        if ($size > (int) config('backups.expanded_max_bytes')) {
            throw new RuntimeException('The expanded backup exceeds the configured size limit.');
        }
    }

    /**
     *  @phpstan-assert array<string, mixed> $manifest
     */
    private function validateManifest(mixed $manifest): void
    {
        if (! is_array($manifest) || ! in_array($manifest['format_version'] ?? null, [1, 2], true)
            || count($manifest) !== ($manifest['format_version'] === 2 ? 17 : 11)
            || ! in_array($manifest['engine'] ?? null, ['mysql', 'mariadb'], true)
            || ! is_string($manifest['server_version'] ?? null)
            || ! is_int($manifest['server_major'] ?? null)
            || ! is_string($manifest['created_at'] ?? null)
            || ! is_int($manifest['payload_bytes'] ?? null)
            || $manifest['payload_bytes'] <= 0
            || ! is_int($manifest['compressed_bytes'] ?? null)
            || $manifest['compressed_bytes'] <= 0) {
            throw new RuntimeException('The backup manifest is invalid.');
        }
        foreach (['migration_fingerprint', 'payload_sha256', 'compressed_sha256', 'signature'] as $key) {
            if (! is_string($manifest[$key] ?? null) || ! preg_match('/\A[a-f0-9]{64}\z/', $manifest[$key])) {
                throw new RuntimeException('The backup manifest is invalid.');
            }
        }
        $expectedKeys = [
            'format_version', 'engine', 'server_version', 'server_major', 'migration_fingerprint', 'created_at',
            'payload_bytes', 'payload_sha256', 'compressed_bytes', 'compressed_sha256', 'signature',
        ];
        if ($manifest['format_version'] === 2) {
            $expectedKeys = [...$expectedKeys, 'scope', 'requested_tables', 'tables', 'dependency_edges', 'created_by', 'audit_note'];
        }
        $actualKeys = array_keys($manifest);
        sort($expectedKeys);
        sort($actualKeys);
        if ($actualKeys !== $expectedKeys) {
            throw new RuntimeException('The backup manifest contains unexpected metadata.');
        }
        if ($manifest['format_version'] === 2) {
            $this->validateScope($manifest);
        }
        $this->assertExpandedSize($manifest['payload_bytes']);
        $signature = $manifest['signature'];
        unset($manifest['signature']);
        if (! hash_equals($this->signature($manifest), $signature)) {
            throw new RuntimeException('The backup signature is invalid. Use the original trusted backup signing key.');
        }
    }

    /** @param array<string, mixed> $manifest */
    private function validateScope(array $manifest): void
    {
        if (! in_array($manifest['scope'] ?? null, ['database', 'tables'], true)
            || ! is_string($manifest['audit_note'] ?? null) || mb_strlen($manifest['audit_note']) > 1000
            || ! is_array($manifest['dependency_edges'] ?? null) || ! array_is_list($manifest['dependency_edges'])
            || count($manifest['dependency_edges']) > 10000) {
            throw new RuntimeException('The backup scope metadata is invalid.');
        }
        foreach (['tables', 'requested_tables'] as $field) {
            $tables = $manifest[$field] ?? null;
            if (! is_array($tables) || ! array_is_list($tables) || count($tables) > 1000) {
                throw new RuntimeException('The backup table inventory is invalid.');
            }
            foreach ($tables as $table) {
                if (! is_string($table) || ! preg_match('/\A[a-zA-Z_][a-zA-Z0-9_]{0,63}\z/', $table)) {
                    throw new RuntimeException('The backup table inventory is invalid.');
                }
            }
            $canonical = array_values(array_unique($tables));
            sort($canonical);
            if ($tables !== $canonical) {
                throw new RuntimeException('The backup table inventory must be unique and ordered.');
            }
        }
        if ($manifest['tables'] === [] || ($manifest['scope'] === 'tables' && $manifest['requested_tables'] === [])
            || array_diff($manifest['requested_tables'], $manifest['tables']) !== []) {
            throw new RuntimeException('The backup table selection is incomplete.');
        }
        $edgeKeys = [];
        foreach ($manifest['dependency_edges'] as $edge) {
            if (! is_array($edge) || count($edge) !== 2
                || ! is_string($edge['table'] ?? null) || ! is_string($edge['related_table'] ?? null)
                || ! in_array($edge['table'], $manifest['tables'], true)
                || ! in_array($edge['related_table'], $manifest['tables'], true)) {
                throw new RuntimeException('The backup table relationships are invalid.');
            }
            $edgeKeys[] = $edge['table'].'\0'.$edge['related_table'];
        }
        if (count(array_unique($edgeKeys)) !== count($edgeKeys)) {
            throw new RuntimeException('The backup table relationships are invalid.');
        }
        $actor = $manifest['created_by'] ?? null;
        if ($actor !== null && (! is_array($actor) || count($actor) !== 3
            || ! array_key_exists('id', $actor) || ($actor['id'] !== null && (! is_string($actor['id']) || strlen($actor['id']) > 128))
            || ! is_string($actor['name'] ?? null) || mb_strlen($actor['name']) > 255 || trim($actor['name']) === ''
            || ! in_array($actor['source'] ?? null, ['web', 'cli', 'system'], true))) {
            throw new RuntimeException('The backup creator metadata is invalid.');
        }
    }

    /** @param array<string, mixed> $manifest */
    private function signature(array $manifest): string
    {
        $key = (string) config('backups.signing_key');
        if (strlen($key) < 32) {
            throw new RuntimeException('Configure a dedicated backup signing key of at least 32 characters.');
        }
        ksort($manifest);

        return hash_hmac('sha256', json_encode($manifest, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES), $key);
    }
}
