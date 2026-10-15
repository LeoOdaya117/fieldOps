<?php

namespace App\Actions\Rbac;

use App\Enums\RegistrationStatus;
use App\Models\User;
use App\Models\UserRegistration;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class RejectRegistration
{
    public function __construct(private readonly RecordAccessAudit $audit) {}

    public function execute(UserRegistration $registration, User $actor): void
    {
        DB::transaction(function () use ($registration, $actor): void {
            $registration = UserRegistration::query()->lockForUpdate()->whereKey($registration->getKey())->firstOrFail();

            if ($registration->status !== RegistrationStatus::Pending) {
                throw ValidationException::withMessages([
                    'registration' => 'This registration has already been reviewed.',
                ]);
            }

            $registration->forceFill([
                'status' => RegistrationStatus::Rejected,
                'reviewed_by' => $actor->getKey(),
                'reviewed_at' => now(),
            ])->save();

            $this->audit->record(
                'registration.rejected',
                $actor,
                $registration,
                null,
                ['email' => $registration->email],
            );
        });
    }
}
