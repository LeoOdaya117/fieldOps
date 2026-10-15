<?php

namespace App\Actions\Security;

use App\Actions\Rbac\RecordAccessAudit;
use App\Models\BlockedIpAddress;
use App\Models\User;
use App\Support\Security\IpAddress;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ManageBlockedIpAddress
{
    public function __construct(private readonly RecordAccessAudit $audit) {}

    public function block(string $ipAddress, ?string $reason, User $actor): BlockedIpAddress
    {
        $normalizedIp = IpAddress::normalize($ipAddress);

        if ($normalizedIp === null) {
            throw ValidationException::withMessages([
                'ip_address' => 'Enter a valid IPv4 or IPv6 address.',
            ]);
        }

        return DB::transaction(function () use ($normalizedIp, $reason, $actor): BlockedIpAddress {
            $rule = BlockedIpAddress::query()
                ->withTrashed()
                ->lockForUpdate()
                ->where('ip_address', $normalizedIp)
                ->first();

            if ($rule === null) {
                $rule = BlockedIpAddress::query()->create([
                    'ip_address' => $normalizedIp,
                    'reason' => $reason,
                    'is_active' => true,
                    'blocked_at' => now(),
                    'blocked_by' => $actor->getKey(),
                    'first_seen_at' => now(),
                    'last_seen_at' => null,
                ]);

                $this->audit->record(
                    'ip_block.created',
                    $actor,
                    $rule,
                    null,
                    ['ip_address' => $normalizedIp, 'is_active' => true, 'reason' => $reason],
                );

                return $rule;
            }

            if ($rule->trashed()) {
                $rule->restore();
                $rule->forceFill([
                    'reason' => $reason,
                    'is_active' => true,
                    'blocked_at' => now(),
                    'blocked_by' => $actor->getKey(),
                    'unblocked_at' => null,
                    'unblocked_by' => null,
                    'first_seen_at' => $rule->first_seen_at ?? now(),
                ])->save();

                $this->audit->record(
                    'ip_block.activated',
                    $actor,
                    $rule,
                    ['record_status' => 0, 'is_active' => false],
                    ['ip_address' => $normalizedIp, 'is_active' => true, 'reason' => $reason],
                );

                return $rule;
            }

            if ($rule->is_active) {
                return $rule;
            }

            $before = [
                'ip_address' => $rule->ip_address,
                'is_active' => false,
                'reason' => $rule->reason,
            ];
            $rule->fill([
                'reason' => $reason,
                'is_active' => true,
                'blocked_at' => now(),
                'blocked_by' => $actor->getKey(),
                'unblocked_at' => null,
                'unblocked_by' => null,
                'first_seen_at' => $rule->first_seen_at ?? now(),
            ]);
            $rule->save();

            $this->audit->record(
                'ip_block.activated',
                $actor,
                $rule,
                $before,
                ['ip_address' => $normalizedIp, 'is_active' => true, 'reason' => $reason],
            );

            return $rule;
        });
    }

    public function activate(BlockedIpAddress $rule, User $actor): void
    {
        DB::transaction(function () use ($rule, $actor): void {
            $rule = BlockedIpAddress::query()->lockForUpdate()->whereKey($rule->getKey())->firstOrFail();

            if ($rule->is_active) {
                return;
            }

            $before = ['is_active' => false, 'reason' => $rule->reason];
            $rule->fill([
                'is_active' => true,
                'blocked_at' => now(),
                'blocked_by' => $actor->getKey(),
                'unblocked_at' => null,
                'unblocked_by' => null,
                'first_seen_at' => $rule->first_seen_at ?? now(),
            ]);
            $rule->save();

            $this->audit->record(
                'ip_block.activated',
                $actor,
                $rule,
                $before,
                ['is_active' => true, 'reason' => $rule->reason],
            );
        });
    }

    public function deactivate(BlockedIpAddress $rule, User $actor): void
    {
        DB::transaction(function () use ($rule, $actor): void {
            $rule = BlockedIpAddress::query()->lockForUpdate()->whereKey($rule->getKey())->firstOrFail();

            if (! $rule->is_active) {
                return;
            }

            $before = ['is_active' => true, 'reason' => $rule->reason];
            $rule->fill([
                'is_active' => false,
                'unblocked_at' => now(),
                'unblocked_by' => $actor->getKey(),
            ]);
            $rule->save();

            $this->audit->record(
                'ip_block.deactivated',
                $actor,
                $rule,
                $before,
                ['is_active' => false, 'reason' => $rule->reason],
            );
        });
    }

    public function updateReason(BlockedIpAddress $rule, ?string $reason, User $actor): void
    {
        DB::transaction(function () use ($rule, $reason, $actor): void {
            $rule = BlockedIpAddress::query()->lockForUpdate()->whereKey($rule->getKey())->firstOrFail();

            if ($rule->reason === $reason) {
                return;
            }

            $before = ['reason' => $rule->reason];
            $rule->forceFill(['reason' => $reason])->save();

            $this->audit->record(
                'ip_block.updated',
                $actor,
                $rule,
                $before,
                ['reason' => $rule->reason],
            );
        });
    }

    public function delete(BlockedIpAddress $rule, User $actor): void
    {
        DB::transaction(function () use ($rule, $actor): void {
            $rule = BlockedIpAddress::query()->lockForUpdate()->whereKey($rule->getKey())->firstOrFail();
            $before = [
                'ip_address' => $rule->ip_address,
                'user_id' => $rule->user_id,
                'is_active' => $rule->is_active,
                'reason' => $rule->reason,
                'first_seen_at' => $rule->first_seen_at?->toIso8601String(),
                'last_seen_at' => $rule->last_seen_at?->toIso8601String(),
            ];

            $rule->delete();

            $this->audit->record('ip_block.deleted', $actor, $rule, $before, null);
        });
    }
}
