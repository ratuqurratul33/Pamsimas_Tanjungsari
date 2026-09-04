<?php

namespace Database\Seeders;

use App\Models\CashAccount;
use App\Models\DocumentTemplate;
use App\Models\OrganizationProfile;
use App\Models\PublicMapSetting;
use App\Models\Region;
use App\Models\Setting;
use App\Models\Tariff;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class PamsimasCoreSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::updateOrCreate([
            'username' => 'admin',
        ], [
            'avatar' => 'AU',
            'email' => 'admin@pamsimas.local',
            'gender' => 'perempuan',
            'name' => 'Admin Utama',
            'password' => Hash::make((string) env('INITIAL_ADMIN_PASSWORD', 'password')),
            'role' => 'admin',
            'status' => 'aktif',
        ]);

        User::updateOrCreate([
            'username' => 'budisantoso',
        ], [
            'avatar' => 'BS',
            'email' => 'petugas@pamsimas.local',
            'gender' => 'laki-laki',
            'name' => 'Budi Santoso',
            'password' => Hash::make('0812-3456-7890'),
            'phone' => '0812-3456-7890',
            'role' => 'petugas',
            'status' => 'aktif',
        ]);

        $this->seedRegionMaster();

        Tariff::updateOrCreate([
            'effective_from' => now()->startOfMonth()->toDateString(),
        ], [
            'admin_fee' => 5000,
            'created_by' => $admin->id,
            'is_active' => true,
            'water_rate_per_m3' => 3000,
        ]);

        collect([
            ['code' => 'KAS-TUNAI', 'currency' => 'IDR', 'current_balance' => 0, 'name' => 'Kas Tunai', 'opening_balance' => 0, 'type' => 'tunai'],
            ['code' => 'KAS-QRIS', 'currency' => 'IDR', 'current_balance' => 0, 'name' => 'Kas QRIS', 'opening_balance' => 0, 'type' => 'qris'],
        ])->each(fn (array $account) => CashAccount::firstOrCreate(['type' => $account['type']], $account));

        OrganizationProfile::updateOrCreate(['id' => 1], [
            'address' => 'Desa Tanjungsari, Kecamatan Sukaluyu',
            'contact_whatsapp' => 'https://wa.me/62',
            'description' => 'Profil PAMSIMAS Desa Tanjungsari dapat diperbarui melalui dashboard admin.',
            'footer_contact_label' => 'Hubungi petugas untuk pendaftaran sambungan baru',
            'name' => 'PAMSIMAS Desa Tanjungsari',
            'office_hours_days' => 'Senin - Sabtu',
            'office_hours_time' => '08.00 - 16.00 WIB',
            'service_cards' => [
                ['desc' => 'Distribusi air bersih berbasis masyarakat untuk wilayah layanan.', 'icon' => 'drop', 'title' => 'Layanan Air Bersih'],
                ['desc' => 'Pencatatan meter dan pembayaran dilakukan secara teratur oleh petugas.', 'icon' => 'receipt', 'title' => 'Penagihan Teratur'],
                ['desc' => 'Ringkasan pembayaran dan pengeluaran dapat dipantau oleh warga.', 'icon' => 'chart', 'title' => 'Transparansi Publik'],
            ],
            'title' => 'Tentang PAMSIMAS Desa Tanjungsari',
        ]);

        PublicMapSetting::updateOrCreate(['id' => 1], [
            'contact_label' => 'Hubungi petugas untuk pendaftaran sambungan baru',
            'contact_whatsapp' => 'https://wa.me/62',
            'description' => 'Peta jaringan air resmi yang dikelola oleh admin.',
            'guide_steps' => [
                'Hubungi petugas atau pengurus wilayah melalui WhatsApp untuk menyampaikan nama dan alamat rumah.',
                'Petugas mengecek lokasi rumah terhadap jalur pipa pada peta jaringan resmi PAMSIMAS.',
                'Admin dan petugas menyiapkan jadwal survei atau pemasangan sesuai kebutuhan lapangan.',
                'Warga menunggu konfirmasi lanjutan sampai sambungan siap dikerjakan.',
            ],
            'guide_title' => 'Panduan pemasangan instalasi air',
            'map_image_path' => 'public-maps/jalur-air-dusun-2-dan-3.png',
            'map_note' => 'Gambar peta diperbarui mengikuti kondisi jaringan lapangan.',
            'status' => 'normal',
            'title' => 'Peta Jaringan Air PAMSIMAS',
        ]);

        collect([
            ['key' => 'billing_period', 'value' => json_encode(['month' => now()->month, 'year' => now()->year, 'due_day' => 25])],
            ['key' => 'base_tariff', 'value' => json_encode(['water_rate_per_m3' => 3000, 'admin_fee' => 5000])],
            ['key' => 'late_fee', 'value' => json_encode(2000)],
            ['key' => 'receipt_format', 'value' => json_encode(['template' => 'Kwitansi Formal PAMSIMAS', 'paper' => 'A4 portrait', 'slots_per_page' => 3])],
            ['key' => 'report_format', 'value' => json_encode(['font' => 'Times New Roman', 'size' => 12, 'template' => 'Template_Laporan_Formal_PAMSIMAS_Desa'])],
        ])->each(fn (array $setting) => Setting::updateOrCreate(['key' => $setting['key']], $setting));

        collect([
            ['file_path' => 'templates/kwitansi-pamsimas.docx', 'is_active' => true, 'name' => 'Format Kwitansi PAMSIMAS', 'type' => 'receipt_word', 'uploaded_by' => $admin->id],
            ['file_path' => 'templates/laporan-formal-pamsimas.docx', 'is_active' => true, 'name' => 'Format Laporan Formal PAMSIMAS Desa', 'type' => 'report_word', 'uploaded_by' => $admin->id],
        ])->each(fn (array $template) => DocumentTemplate::updateOrCreate(['type' => $template['type']], $template));
    }

    private function seedRegionMaster(): void
    {
        $dusun1 = Region::firstOrCreate(['name' => 'Dusun 1', 'type' => 'dusun'], ['household_count' => 0]);
        $dusun3 = Region::firstOrCreate(['name' => 'Dusun 3', 'type' => 'dusun'], ['household_count' => 0]);
        $rwDusun1 = Region::firstOrCreate(['code' => 'RW 05', 'parent_id' => $dusun1->id, 'type' => 'rw'], ['household_count' => 0, 'name' => 'RW 05']);
        $rwDusun3 = Region::firstOrCreate(['code' => 'RW 06', 'parent_id' => $dusun3->id, 'type' => 'rw'], ['household_count' => 0, 'name' => 'RW 06']);

        collect([
            [$rwDusun1, 'RT 01', 'Cikadu'],
            [$rwDusun1, 'RT 02', 'Pasir Jati'],
            [$rwDusun1, 'RT 03', 'Sukamaju'],
            [$rwDusun3, 'RT 01', 'Banceuy'],
            [$rwDusun3, 'RT 02', 'Pasir Peucang'],
            [$rwDusun3, 'RT 03', 'Bobojong'],
            [$rwDusun3, 'RT 04', 'Babakan Sari'],
            [$rwDusun3, 'RT 05', 'Sukaasih'],
            [$rwDusun3, 'RT 06', 'Banceuy Kulon'],
        ])->each(fn (array $row) => Region::firstOrCreate([
            'code' => $row[1],
            'parent_id' => $row[0]->id,
            'type' => 'rt',
        ], [
            'household_count' => 0,
            'kampung' => $row[2],
            'name' => "{$row[1]} - {$row[2]}",
        ]));
    }
}
