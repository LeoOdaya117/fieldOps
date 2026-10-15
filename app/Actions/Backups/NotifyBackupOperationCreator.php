<?php

namespace App\Actions\Backups;

use App\Models\User;
use App\Notifications\BackupNotification;
use Throwable;

class NotifyBackupOperationCreator
{
    public function __construct(private BackupStore $store) {}

    /** @param array<string, mixed> $operation */
    public function notifyOperation(array $operation): void
    {
        $actor = $operation['actor'] ?? null;
        if (! $this->isCompletedWebBackup($operation) || ! is_array($actor)) {
            return;
        }

        $userId = filter_var($actor['id'] ?? null, FILTER_VALIDATE_INT, FILTER_NULL_ON_FAILURE);
        if (! is_int($userId) || $userId < 1) {
            return;
        }

        $creator = User::query()->find($userId);
        if ($creator !== null) {
            $this->deliver($creator, [$operation]);
        }
    }

    public function reconcileFor(User $user): void
    {
        $operations = array_values(array_filter(
            $this->store->operations(),
            fn (array $operation): bool => $this->isCompletedWebBackup($operation)
                && (string) ($operation['actor']['id'] ?? '') === (string) $user->getKey(),
        ));

        $this->deliver($user, $operations);
    }

    /** @param list<array<string, mixed>> $operations */
    private function deliver(User $user, array $operations): void
    {
        if ($operations === []) {
            return;
        }

        try {
            $this->store->synchronized(function () use ($user, $operations): void {
                $operationIds = array_values(array_unique(array_map(
                    static fn (array $operation): string => (string) $operation['id'],
                    $operations,
                )));
                $alreadyNotified = $user->notifications()
                    ->whereIn('data->operationId', $operationIds)
                    ->get(['data'])
                    ->mapWithKeys(static fn ($notification): array => [
                        (string) ($notification->data['operationId'] ?? '') => true,
                    ])
                    ->all();

                foreach ($operations as $operation) {
                    $operationId = (string) $operation['id'];
                    if (isset($alreadyNotified[$operationId])) {
                        continue;
                    }

                    $succeeded = $operation['status'] === 'succeeded';
                    $user->notify(new BackupNotification(
                        $succeeded ? 'backup.ready' : 'backup.failed',
                        $succeeded ? 'Database backup ready' : 'Database backup failed',
                        $succeeded
                            ? 'Your backup has completed and is available in Backup & Restore.'
                            : 'Your backup could not be completed. Review the operation status in Backup & Restore.',
                        $succeeded && is_string($operation['backup_id'] ?? null) ? $operation['backup_id'] : null,
                        $operationId,
                    ));
                    $alreadyNotified[$operationId] = true;
                }
            });
        } catch (Throwable $exception) {
            // The notification inbox can retry delivery when it is next refreshed.
            report($exception);
        }
    }

    /** @param array<string, mixed> $operation */
    private function isCompletedWebBackup(array $operation): bool
    {
        return ($operation['type'] ?? null) === 'backup'
            && in_array($operation['status'] ?? null, ['succeeded', 'failed', 'interrupted'], true)
            && is_array($operation['actor'] ?? null)
            && ($operation['actor']['source'] ?? null) === 'web'
            && is_string($operation['id'] ?? null);
    }
}
