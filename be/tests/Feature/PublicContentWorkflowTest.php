<?php

namespace Tests\Feature;

use Database\Seeders\PamsimasSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicContentWorkflowTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_form_payloads_update_account_map_and_public_profile(): void
    {
        $this->seed(PamsimasSeeder::class);

        $login = $this->postJson('/api/auth/login', [
            'login' => 'admin',
            'password' => 'password',
        ])->assertOk();
        $headers = ['Authorization' => 'Bearer '.$login->json('token')];

        $this->withHeaders($headers)->post('/api/admin/account', [
            '_method' => 'PATCH',
            'avatar' => 'AT',
            'email' => 'admin@pamsimas.local',
            'gender' => 'perempuan',
            'name' => 'Admin Tanjungsari',
            'username' => 'admin',
        ])->assertOk()
            ->assertJsonPath('data.name', 'Admin Tanjungsari');

        $this->withHeaders($headers)->post('/api/admin/public-map', [
            '_method' => 'PATCH',
            'contact_label' => 'Hubungi petugas untuk sambungan baru',
            'contact_whatsapp' => 'https://wa.me/6281234567890',
            'coverage' => 'Dusun 2 dan Dusun 3',
            'description' => 'Peta jaringan resmi yang dikelola Admin.',
            'guide_steps' => ['Hubungi petugas.', 'Tunggu survei lokasi.'],
            'guide_title' => 'Panduan pemasangan',
            'map_note' => 'Peta diperbarui sesuai kondisi lapangan.',
            'status' => 'normal',
            'title' => 'Jalur Air PAMSIMAS',
        ])->assertOk()
            ->assertJsonPath('data.guide_steps.1', 'Tunggu survei lokasi.')
            ->assertJsonPath('data.title', 'Jalur Air PAMSIMAS');

        $this->withHeaders($headers)->post('/api/admin/profile', [
            '_method' => 'PATCH',
            'address' => 'Balai Desa Tanjungsari',
            'contact_whatsapp' => 'https://wa.me/6281234567890',
            'description' => 'Layanan air bersih berbasis masyarakat.',
            'established' => '2019',
            'footer_contact_label' => 'Hubungi PAMSIMAS',
            'members' => [
                [
                    'description' => 'Mengkoordinasikan layanan.',
                    'name' => 'Ketua Baru',
                    'position' => 'Ketua PAMSIMAS',
                    'sort_order' => 1,
                ],
                [
                    'description' => 'Mengelola administrasi.',
                    'name' => 'Sekretaris Baru',
                    'position' => 'Sekretaris',
                    'sort_order' => 2,
                ],
            ],
            'name' => 'PAMSIMAS Desa Tanjungsari',
            'office_hours_days' => 'Senin - Sabtu',
            'office_hours_time' => '08.00 - 16.00 WIB',
            'service_cards' => [
                ['desc' => 'Distribusi air bersih.', 'icon' => 'drop', 'title' => 'Air Bersih'],
                ['desc' => 'Pencatatan teratur.', 'icon' => 'receipt', 'title' => 'Penagihan'],
                ['desc' => 'Kas dapat dipantau.', 'icon' => 'chart', 'title' => 'Transparansi'],
            ],
            'title' => 'Membangun Kemandirian Air Desa',
        ])->assertOk()
            ->assertJsonCount(2, 'data.members')
            ->assertJsonPath('data.members.0.description', 'Mengkoordinasikan layanan.');

        $this->getJson('/api/publik/map')
            ->assertOk()
            ->assertJsonPath('data.title', 'Jalur Air PAMSIMAS');
        $this->getJson('/api/publik/profile')
            ->assertOk()
            ->assertJsonCount(2, 'data.members')
            ->assertJsonPath('data.office_hours_time', '08.00 - 16.00 WIB');
    }
}
