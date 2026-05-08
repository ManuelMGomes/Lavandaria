<?php

namespace App\Services\SupportGenOmn;

use App\Models\Company;
use App\Models\Empresa;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;

class CompanyDirectory
{
    public function resolvePrimaryCompany(): ?Company
    {
        $referencedCompanyId = User::query()
            ->whereNotNull('company_id')
            ->orderByRaw('CASE WHEN platform_role = ? THEN 0 WHEN platform_role = ? THEN 1 ELSE 2 END', ['client_admin', 'super_admin'])
            ->latest('id')
            ->value('company_id');

        if ($referencedCompanyId) {
            return Company::query()->find($referencedCompanyId);
        }

        return Company::query()->latest('id')->first();
    }

    public function syncPrimaryCompanyWithEmpresa(?Empresa $empresa): ?Company
    {
        $company = $this->resolvePrimaryCompany();

        if (! $company && ! $empresa) {
            return null;
        }

        if (! $company) {
            $company = Company::query()->create([
                'name' => $empresa?->nome ?: 'Default Company',
                'email' => $empresa?->email,
                'status' => 'active',
                'license_type' => 'annual',
                'license_expiry_date' => now()->addYear()->toDateString(),
            ]);
        }

        if ($empresa) {
            $company->fill([
                'name' => $empresa->nome ?: $company->name,
                'email' => $empresa->email ?: $company->email,
            ]);
            $company->save();
        }

        return $company;
    }

    public function listVisibleCompanies(): Collection
    {
        $referencedCompanyIds = User::query()
            ->whereNotNull('company_id')
            ->pluck('company_id')
            ->filter()
            ->unique()
            ->values();

        $query = Company::query()->latest('id');

        if ($referencedCompanyIds->isNotEmpty()) {
            $query->whereIn('id', $referencedCompanyIds);
        }

        $companies = $query->get();

        if ($companies->isEmpty()) {
            $primary = $this->resolvePrimaryCompany();
            if ($primary) {
                $companies = new Collection([$primary]);
            }
        }

        return $companies;
    }
}
