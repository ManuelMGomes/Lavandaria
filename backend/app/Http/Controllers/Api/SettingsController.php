<?php

namespace App\Http\Controllers\Api;

use App\Models\Empresa;
use App\Services\SupportGenOmn\CompanyDirectory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SettingsController extends ApiController
{
    public function __construct(private readonly CompanyDirectory $companyDirectory)
    {
    }

    public function show(): JsonResponse
    {
        $empresa = $this->currentEmpresa();

        if (! $empresa) {
            return response()->json(['message' => 'Empresa não registrada.'], 404);
        }

        return response()->json($this->mapSettings($empresa));
    }

    public function register(Request $request): JsonResponse
    {
        $data = $this->validateSettings($request);

        $empresa = $this->currentEmpresa() ?? new Empresa();
        $empresa = $this->fillEmpresaFromSettings($empresa, $data);
        $this->companyDirectory->syncPrimaryCompanyWithEmpresa($empresa);
        $this->invalidateBootstrapCache();

        return response()->json($this->mapSettings($empresa), 201);
    }

    public function update(Request $request): JsonResponse
    {
        $empresa = $this->currentEmpresa();
        if (! $empresa) {
            return response()->json(['message' => 'Empresa não registrada.'], 404);
        }

        $data = $this->validateSettings($request);
        $empresa = $this->fillEmpresaFromSettings($empresa, $data);
        $this->companyDirectory->syncPrimaryCompanyWithEmpresa($empresa);
        $this->invalidateBootstrapCache();

        return response()->json($this->mapSettings($empresa));
    }

    public function updateInstitutional(Request $request): JsonResponse
    {
        $empresa = $this->currentEmpresa();
        if (! $empresa) {
            return response()->json(['message' => 'Empresa não registrada.'], 404);
        }

        $data = $this->validateInstitutionalSettings($request);
        $aboutTeam = $this->sanitizeAboutTeam($data['aboutTeam'] ?? []);

        $empresa->fill([
            'landing_banner_image' => $data['landingBannerImage'] ?? null,
            'about_story' => $data['aboutStory'] ?? null,
            'about_mission' => $data['aboutMission'] ?? null,
            'about_vision' => $data['aboutVision'] ?? null,
            'about_team_json' => $aboutTeam,
        ]);
        $empresa->save();

        $this->invalidateBootstrapCache();

        return response()->json($this->mapSettings($empresa));
    }

    private function validateSettings(Request $request): array
    {
        $empresaAtualId = $this->currentEmpresa()?->id;

        return $request->validate([
            'logo' => ['nullable', 'string'],
            'landingBannerImage' => ['nullable', 'string'],
            'aboutStory' => ['nullable', 'string'],
            'aboutMission' => ['nullable', 'string'],
            'aboutVision' => ['nullable', 'string'],
            'aboutTeam' => ['nullable', 'array'],
            'aboutTeam.*.name' => ['required_with:aboutTeam', 'string'],
            'aboutTeam.*.role' => ['required_with:aboutTeam', 'string'],
            'aboutTeam.*.photo' => ['nullable', 'string'],
            'companyName' => [
                'required',
                'string',
                'min:3',
                Rule::unique('empresas', 'nome')->ignore($empresaAtualId),
            ],
            'tradeName' => [
                'required',
                'string',
                'min:3',
                Rule::unique('empresas', 'nome_comercial')->ignore($empresaAtualId),
            ],
            'nif' => [
                'required',
                'string',
                'min:5',
                Rule::unique('empresas', 'nif')->ignore($empresaAtualId),
            ],
            'companyType' => [
                'required',
                'string',
                Rule::unique('empresas', 'tipo_empresa')->ignore($empresaAtualId),
            ],
            'country' => ['required', 'string'],
            'province' => ['required', 'string'],
            'municipality' => ['required', 'string'],
            'fullAddress' => ['required', 'string', 'min:5'],
            'postalCode' => ['nullable', 'string'],
            'phone' => ['required', 'string'],
            'email' => [
                'required',
                'email',
                Rule::unique('empresas', 'email')->ignore($empresaAtualId),
            ],
            'website' => ['nullable', 'string'],
            'ivaRegime' => ['required', 'in:geral,nao_sujeicao,isento'],
            'defaultIvaRate' => ['required', 'numeric', 'min:0'],
            'currency' => ['required', 'string'],
            'invoiceSeries' => ['required', 'string'],
            'startInvoiceNumber' => ['required', 'integer', 'min:1'],
            'withholdingTaxPercentage' => ['nullable', 'numeric', 'min:0'],
            'bankName' => ['nullable', 'string'],
            'accountNumber' => ['nullable', 'string'],
            'iban' => ['nullable', 'string'],
            'invoiceModel' => ['required', 'in:A4,thermal'],
            'invoiceNumberFormat' => ['required', 'string'],
            'allowCreditSales' => ['required', 'boolean'],
            'defaultDueDays' => ['required', 'integer', 'min:0'],
            'allowGlobalDiscount' => ['required', 'boolean'],
            'printerName' => ['nullable', 'string'],
            'printerConnectionType' => ['required', 'in:usb,network,bluetooth'],
            'printerIpAddress' => ['nullable', 'string'],
            'autoPrintReceipt' => ['required', 'boolean'],
            'autoDownloadPDF' => ['required', 'boolean'],
        ], [
            'companyName.unique' => 'Já existe uma empresa cadastrada com este nome da empresa.',
            'tradeName.unique' => 'Já existe uma empresa cadastrada com esta razão social.',
            'nif.unique' => 'Já existe uma empresa cadastrada com este NIF.',
            'companyType.unique' => 'Já existe uma empresa cadastrada com este tipo de empresa.',
            'email.unique' => 'Já existe uma empresa cadastrada com este e-mail.',
        ]);
    }

    private function validateInstitutionalSettings(Request $request): array
    {
        return $request->validate([
            'landingBannerImage' => ['nullable', 'string'],
            'aboutStory' => ['nullable', 'string'],
            'aboutMission' => ['nullable', 'string'],
            'aboutVision' => ['nullable', 'string'],
            'aboutTeam' => ['nullable', 'array'],
            'aboutTeam.*.name' => ['required_with:aboutTeam', 'string'],
            'aboutTeam.*.role' => ['required_with:aboutTeam', 'string'],
            'aboutTeam.*.photo' => ['nullable', 'string'],
        ]);
    }

    private function sanitizeAboutTeam(array $team): array
    {
        return collect($team)
            ->map(function (array $member): array {
                return [
                    'name' => trim((string) ($member['name'] ?? '')),
                    'role' => trim((string) ($member['role'] ?? '')),
                    'photo' => trim((string) ($member['photo'] ?? '')),
                ];
            })
            ->filter(fn (array $member): bool => $member['name'] !== '' || $member['role'] !== '' || $member['photo'] !== '')
            ->values()
            ->all();
    }
}
