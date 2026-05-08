<?php

namespace App\Http\Controllers\Api;

use App\Models\Company;
use App\Models\User;
use App\Services\SupportGenOmn\CompanyDirectory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UsersController extends ApiController
{
    public function __construct(private readonly CompanyDirectory $companyDirectory)
    {
    }

    public function index(): JsonResponse
    {
        $users = User::query()
            ->latest()
            ->get()
            ->map(fn (User $user) => $this->mapUser($user));

        return response()->json($users);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'min:3'],
            'email' => ['required', 'email', 'unique:users,email'],
            'password' => ['required', 'string', 'min:6'],
            'role' => ['required', 'in:admin,cashier'],
            'status' => ['required', 'in:active,inactive'],
        ]);

        $company = $this->companyDirectory->syncPrimaryCompanyWithEmpresa($this->currentEmpresa());

        if (! $company) {
            $company = Company::query()->create([
                'name' => 'Default Company',
                'email' => null,
                'status' => 'active',
                'license_type' => 'annual',
                'license_expiry_date' => now()->addYear()->toDateString(),
            ]);
        }

        $data['company_id'] = $company->id;
        $data['platform_role'] = $data['role'] === 'admin' ? 'client_admin' : 'user';

        $user = User::query()->create($data);
        $this->invalidateBootstrapCache();

        return response()->json($this->mapUser($user), 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $user = User::query()->findOrFail((int) $id);

        $data = $request->validate([
            'name' => ['required', 'string', 'min:3'],
            'email' => ['required', 'email', 'unique:users,email,' . $user->id],
            'password' => ['nullable', 'string', 'min:6'],
            'role' => ['required', 'in:admin,cashier'],
            'status' => ['required', 'in:active,inactive'],
        ]);

        if (empty($data['password'])) {
            unset($data['password']);
        }

        $data['platform_role'] = $data['role'] === 'admin' ? 'client_admin' : ($user->platform_role ?? 'user');

        $user->update($data);
        $this->invalidateBootstrapCache();

        return response()->json($this->mapUser($user->fresh()));
    }

    public function destroy(string $id): JsonResponse
    {
        $user = User::query()->findOrFail((int) $id);

        if ($user->role === 'admin' && User::query()->where('role', 'admin')->count() <= 1) {
            return response()->json(['message' => 'Não é possível remover o último administrador.'], 422);
        }

        $user->delete();
        $this->invalidateBootstrapCache();

        return response()->json(['ok' => true]);
    }
}
