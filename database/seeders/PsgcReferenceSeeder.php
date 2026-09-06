<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class PsgcReferenceSeeder extends Seeder
{
    public function run(): void
    {
        $path = database_path('data/psgc-q2-2026.json');
        $checksumPath = database_path('data/psgc-q2-2026.sha256');
        $expectedChecksum = strtok(trim((string) file_get_contents($checksumPath)), " \t");
        $actualChecksum = hash_file('sha256', $path);

        if (! is_string($actualChecksum) || ! hash_equals((string) $expectedChecksum, $actualChecksum)) {
            throw new RuntimeException('The bundled PSGC reference payload failed checksum verification.');
        }

        /** @var array{release:string,reference_date:string,source_url:string,regions:list<array{code:string,name:string}>,provinces:list<array{code:string,region_code:string,name:string}>,localities:list<array{code:string,region_code:string,province_code:?string,name:string,type:string,independent:bool}>} $data */
        $data = json_decode((string) file_get_contents($path), true, 512, JSON_THROW_ON_ERROR);

        DB::transaction(static function () use ($data, $actualChecksum): void {
            foreach (array_chunk($data['regions'], 500) as $records) {
                DB::table('psgc_regions')->upsert($records, ['code'], ['name']);
            }

            foreach (array_chunk($data['provinces'], 500) as $records) {
                DB::table('psgc_provinces')->upsert($records, ['code'], ['region_code', 'name']);
            }

            $localities = array_map(static fn (array $record): array => [
                'code' => $record['code'],
                'region_code' => $record['region_code'],
                'province_code' => $record['province_code'],
                'name' => $record['name'],
                'type' => $record['type'],
                'is_independent' => $record['independent'],
            ], $data['localities']);

            foreach (array_chunk($localities, 400) as $records) {
                DB::table('psgc_localities')->upsert(
                    $records,
                    ['code'],
                    ['region_code', 'province_code', 'name', 'type', 'is_independent'],
                );
            }

            DB::table('psgc_reference_releases')->updateOrInsert(
                ['release' => $data['release']],
                [
                    'reference_date' => $data['reference_date'],
                    'source_url' => $data['source_url'],
                    'checksum' => $actualChecksum,
                    'region_count' => count($data['regions']),
                    'province_count' => count($data['provinces']),
                    'locality_count' => count($data['localities']),
                    'imported_at' => now(),
                ],
            );
        });
    }
}
