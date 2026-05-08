<?php

namespace Tests\Feature;

use App\Models\Company;
use App\Models\Empresa;
use App\Models\ImpersonationSession;
use App\Models\PasswordReset;
use App\Models\SupportTicket;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SupportGenOmnModuleTest extends TestCase
{
    use RefreshDatabase;

    private function makeCompany(array $overrides = []): Company
    {
        return Company::query()->create(array_merge([
            'name' => 'Tenant A',
            'email' => 'tenant@example.com',
            'status' => 'active',
            'license_type' => 'annual',
            'license_expiry_date' => now()->addMonth()->toDateString(),
        ], $overrides));
    }

    private function makeUser(Company $company, array $overrides = []): User
    {
        return User::query()->create(array_merge([
            'company_id' => $company->id,
            'name' => 'User',
            'email' => 'user'.uniqid().'@example.com',
            'password' => 'secret123',
            'role' => 'cashier',
            'platform_role' => 'user',
            'status' => 'active',
            'is_blocked' => false,
        ], $overrides));
    }

    public function test_it_creates_support_ticket(): void
    {
        $company = $this->makeCompany();
        $user = $this->makeUser($company);

        $response = $this
            ->withHeader('X-Actor-Id', (string) $user->id)
            ->postJson('/api/support/tickets', [
                'subject' => 'Erro no fechamento de caixa',
                'message' => 'Não consigo fechar o caixa no final do dia.',
            ]);

        $response->assertCreated();
        $this->assertDatabaseCount('support_tickets', 1);
        $this->assertNotNull(SupportTicket::query()->first());
    }

    public function test_it_generates_secure_password_reset_token(): void
    {
        $company = $this->makeCompany();
        $admin = $this->makeUser($company, [
            'email' => 'superadmin@genomn.local',
            'role' => 'admin',
            'platform_role' => 'super_admin',
        ]);
        $target = $this->makeUser($company, ['email' => 'target@example.com']);

        $login = $this->postJson('/api/admin/auth/login', [
            'email' => $admin->email,
            'password' => 'secret123',
        ])->assertOk()->json();

        $response = $this
            ->withHeader('X-Admin-Token', $login['token'])
            ->postJson('/api/admin/users/'.$target->id.'/reset-password');

        $response->assertOk();
        $token = $response->json('resetToken');

        $this->assertNotEmpty($token);
        $this->assertDatabaseCount('password_resets', 1);
        $reset = PasswordReset::query()->first();
        $this->assertNotSame($token, $reset?->token);
    }

    public function test_it_creates_impersonation_session(): void
    {
        $company = $this->makeCompany();
        $admin = $this->makeUser($company, [
            'email' => 'support@example.com',
            'role' => 'admin',
            'platform_role' => 'support',
        ]);
        $target = $this->makeUser($company);

        $login = $this->postJson('/api/admin/auth/login', [
            'email' => $admin->email,
            'password' => 'secret123',
        ])->assertOk()->json();

        $this
            ->withHeader('X-Admin-Token', $login['token'])
            ->postJson('/api/admin/impersonate/'.$target->id)
            ->assertOk();

        $this->assertDatabaseCount('impersonation_sessions', 1);
        $this->assertNotNull(ImpersonationSession::query()->first());
    }

    public function test_it_blocks_access_when_license_is_expired(): void
    {
        $company = $this->makeCompany([
            'license_expiry_date' => now()->subDay()->toDateString(),
        ]);
        $user = $this->makeUser($company);

        $this
            ->withHeader('X-Actor-Id', (string) $user->id)
            ->getJson('/api/license/check')
            ->assertOk()
            ->assertJson(['valid' => false]);

        $this
            ->withHeader('X-Actor-Id', (string) $user->id)
            ->postJson('/api/support/tickets', [
                'subject' => 'Teste licença',
                'message' => 'Mensagem',
            ])
            ->assertStatus(402);
    }

    public function test_it_syncs_admin_company_listing_with_registered_empresa(): void
    {
        $company = $this->makeCompany([
            'name' => 'Placeholder Company',
            'email' => 'placeholder@example.com',
        ]);
        $admin = $this->makeUser($company, [
            'email' => 'superadmin@genomn.local',
            'role' => 'admin',
            'platform_role' => 'super_admin',
        ]);

        Empresa::query()->create([
            'nome' => 'Lavanderia Central',
            'nome_comercial' => 'Lavanderia Central',
            'nif' => '123456789',
            'tipo_empresa' => 'Lda',
            'pais' => 'Angola',
            'regime_iva' => 'geral',
            'taxa_iva_padrao' => 14,
            'moeda' => 'Kz',
            'serie_fatura' => '2026',
            'numero_inicial_fatura' => 1,
            'modelo_fatura' => 'A4',
            'formato_numero_fatura' => 'SERIE/NUMERO',
            'permitir_venda_credito' => false,
            'dias_vencimento_padrao' => 30,
            'permitir_desconto_global' => true,
            'tipo_conexao_impressora' => 'usb',
            'impressao_automatica' => false,
            'download_pdf_automatico' => false,
            'email' => 'contato@lavanderiacentral.test',
        ]);

        $login = $this->postJson('/api/admin/auth/login', [
            'email' => $admin->email,
            'password' => 'secret123',
        ])->assertOk()->json();

        $response = $this
            ->withHeader('X-Admin-Token', $login['token'])
            ->getJson('/api/admin/companies');

        $response
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.name', 'Lavanderia Central')
            ->assertJsonPath('0.email', 'contato@lavanderiacentral.test');
    }
}
