<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\ApiController;
use App\Models\Company;
use App\Models\Empresa;
use App\Services\SupportGenOmn\AuditLogger;
use App\Services\SupportGenOmn\CompanyDirectory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CompanyManagementController extends ApiController
{
    public function __construct(
        private readonly AuditLogger $auditLogger,
        private readonly CompanyDirectory $companyDirectory,
    )
    {
    }

    public function index(): JsonResponse
    {
        $empresa = Empresa::query()->first();
        $primaryCompany = $this->companyDirectory->syncPrimaryCompanyWithEmpresa($empresa);

        $companies = $this->companyDirectory->listVisibleCompanies()->map(function (Company $company) use ($primaryCompany, $empresa) {
            $displayName = $company->name;
            $displayEmail = $company->email;

            if ($empresa && $primaryCompany && $company->is($primaryCompany)) {
                $displayName = $empresa->nome ?: $displayName;
                $displayEmail = $empresa->email ?: $displayEmail;
            }

            return [
            'id' => $company->id,
            'name' => $displayName,
            'email' => $displayEmail,
            'status' => $company->status,
            'licenseType' => $company->license_type,
            'licenseExpiryDate' => optional($company->license_expiry_date)->toDateString(),
            'createdAt' => $company->created_at?->toJSON(),
            ];
        });

        return response()->json($companies);
    }

    public function suspend(Request $request, int $id): JsonResponse
    {
        $actor = $request->attributes->get('actorUser');
        $company = Company::query()->findOrFail($id);

        $data = $request->validate([
            'status' => ['required', 'in:active,suspended'],
            'licenseType' => ['nullable', 'in:annual,semiannual'],
            'licenseExpiryDate' => ['nullable', 'date'],
        ]);

        $company->update([
            'status' => $data['status'],
            'license_type' => $data['licenseType'] ?? $company->license_type,
            'license_expiry_date' => $data['licenseExpiryDate'] ?? $company->license_expiry_date,
        ]);

        $this->auditLogger->log($request, $actor->id, 'company_status_change', (string) $company->id, $company->id);

        return response()->json(['ok' => true]);
    }
}
