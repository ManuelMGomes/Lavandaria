<?php

namespace App\Services\SupportGenOmn;

use App\Models\Company;
use App\Models\User;
use Illuminate\Http\Request;

class ActorResolver
{
    public function __construct(private readonly CompanyDirectory $companyDirectory)
    {
    }

    public function fromRequest(Request $request): ?User
    {
        $actorId = $request->header('X-Actor-Id');
        if (! $actorId || ! ctype_digit((string) $actorId)) {
            return null;
        }

        return User::query()->find((int) $actorId);
    }

    public function resolveCompany(User $user): Company
    {
        if ($user->company_id) {
            $company = Company::query()->find($user->company_id);
            if ($company) {
                return $company;
            }
        }

        $fallback = $this->companyDirectory->syncPrimaryCompanyWithEmpresa(\App\Models\Empresa::query()->first());
        if ($fallback) {
            return $fallback;
        }

        return Company::query()->create([
            'name' => 'Default Company',
            'email' => null,
            'status' => 'active',
            'license_type' => 'annual',
            'license_expiry_date' => now()->addYear()->toDateString(),
        ]);
    }
}
