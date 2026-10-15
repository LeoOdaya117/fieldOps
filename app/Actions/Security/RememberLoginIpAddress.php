<?php

namespace App\Actions\Security;

use App\Models\BlockedIpAddress;
use App\Models\User;
use App\Support\Security\IpAddress;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class RememberLoginIpAddress
{
    public function record(?Request $request = null, ?User $user = null): ?BlockedIpAddress
    {
        $request ??= app()->bound('request') ? request() : null;
        $ipAddress = IpAddress::normalize($request?->ip());

        if ($request === null || $ipAddress === null) {
            return null;
        }

        $now = now();

        return DB::transaction(function () use ($ipAddress, $now, $user): BlockedIpAddress {
            $rule = BlockedIpAddress::query()
                ->withTrashed()
                ->lockForUpdate()
                ->where('ip_address', $ipAddress)
                ->first();

            if ($rule === null) {
                return BlockedIpAddress::query()->create([
                    'ip_address' => $ipAddress,
                    'user_id' => $user?->getKey(),
                    'is_active' => false,
                    'blocked_at' => null,
                    'first_seen_at' => $now,
                    'last_seen_at' => $now,
                ]);
            }

            if ($rule->trashed()) {
                $rule->restore();
                $rule->forceFill([
                    'user_id' => $user?->getKey() ?? $rule->user_id,
                    'is_active' => false,
                    'first_seen_at' => $rule->first_seen_at ?? $now,
                    'last_seen_at' => $now,
                ])->save();

                return $rule;
            }

            $rule->forceFill([
                'user_id' => $user?->getKey() ?? $rule->user_id,
                'first_seen_at' => $rule->first_seen_at ?? $now,
                'last_seen_at' => $now,
            ])->save();

            return $rule;
        });
    }
}
