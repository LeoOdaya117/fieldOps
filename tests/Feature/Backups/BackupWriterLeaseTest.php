<?php

namespace Tests\Feature\Backups;

use App\Actions\Backups\BackupStore;
use App\Actions\Backups\ConsoleWriterLease;
use App\Http\Middleware\BackupWriterLease;
use Illuminate\Console\Events\CommandFinished;
use Illuminate\Console\Events\CommandStarting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use RuntimeException;
use Symfony\Component\Console\Input\ArrayInput;
use Symfony\Component\Console\Output\BufferedOutput;
use Tests\TestCase;

class BackupWriterLeaseTest extends TestCase
{
    private string $root;

    protected function setUp(): void
    {
        parent::setUp();
        $this->root = storage_path('framework/testing/backup-leases-'.Str::uuid());
        config(['backups.root' => $this->root]);
    }

    protected function tearDown(): void
    {
        app(BackupWriterLease::class)->release();
        app(ConsoleWriterLease::class)->release();
        File::deleteDirectory($this->root);
        parent::tearDown();
    }

    public function test_http_lease_remains_after_middleware_termination_to_cover_deferred_writers(): void
    {
        $lease = app(BackupWriterLease::class);
        $store = app(BackupStore::class);
        $request = Request::create('/');
        $response = $lease->handle($request, fn () => response('ok'));
        $lease->terminate($request, $response);
        try {
            $store->lock('writers');
            $this->fail('Deferred writers must remain covered.');
        } catch (RuntimeException) {
            $this->assertSame('ok', $response->getContent());
        }
        $lease->release();
        $exclusive = $store->lock('writers');
        $store->unlock($exclusive);
    }

    public function test_nested_artisan_commands_keep_shared_lease_until_outer_command_finishes(): void
    {
        $lease = app(ConsoleWriterLease::class);
        $store = app(BackupStore::class);
        $input = new ArrayInput([]);
        $output = new BufferedOutput;
        $lease->starting(new CommandStarting('schedule:work', $input, $output));
        $lease->starting(new CommandStarting('visits:prune', $input, $output));
        $lease->finished(new CommandFinished('visits:prune', $input, $output, 0));
        try {
            $store->lock('writers');
            $this->fail('The scheduler must still hold its lease.');
        } catch (RuntimeException) {
            $this->assertTrue(true);
        }
        $lease->finished(new CommandFinished('schedule:work', $input, $output, 0));
        try {
            $store->lock('writers');
            $this->fail('Console deferred work must remain covered after CommandFinished.');
        } catch (RuntimeException) {
            $this->assertTrue(true);
        }
        $lease->release();
        $exclusive = $store->lock('writers');
        $store->unlock($exclusive);
        $store->beginMaintenance((string) Str::uuid());
        $this->expectExceptionMessage('maintenance');
        $lease->starting(new CommandStarting('queue:work', $input, $output));
    }
}
