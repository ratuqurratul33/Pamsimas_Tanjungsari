<?php

namespace Database\Seeders;

use App\Models\ActivityLog;
use App\Models\Bill;
use App\Models\CashAccount;
use App\Models\Customer;
use App\Models\DocumentTemplate;
use App\Models\Expense;
use App\Models\Faq;
use App\Models\MeterReading;
use App\Models\OfficerDeposit;
use App\Models\OrganizationMember;
use App\Models\OrganizationProfile;
use App\Models\Payment;
use App\Models\PublicMapSetting;
use App\Models\Receipt;
use App\Models\Region;
use App\Models\Setting;
use App\Models\Tariff;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class PamsimasSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::create([
            'avatar' => 'AU',
            'email' => 'admin@pamsimas.local',
            'gender' => 'perempuan',
            'name' => 'Admin Utama',
            'password' => Hash::make('password'),
            'role' => 'admin',
            'status' => 'aktif',
            'username' => 'admin',
        ]);

        $petugas = User::create([
            'avatar' => 'BS',
            'email' => 'petugas@pamsimas.local',
            'gender' => 'laki-laki',
            'name' => 'Budi Santoso',
            'password' => Hash::make('0812-3456-7890'),
            'phone' => '0812-3456-7890',
            'role' => 'petugas',
            'status' => 'aktif',
            'username' => 'budisantoso',
        ]);

        [$dusun1, $dusun3, $rtDusun1, $rtDusun3] = $this->seedRegions();
        $petugas->assignedRegions()->sync($rtDusun3->pluck('id'));

        $tariff = Tariff::create([
            'admin_fee' => 5000,
            'created_by' => $admin->id,
            'effective_from' => '2026-07-01',
            'is_active' => true,
            'water_rate_per_m3' => 3000,
        ]);

        $customers = $this->seedCustomers($dusun1, $dusun3, $rtDusun1, $rtDusun3);
        $accounts = $this->seedCashAccounts($admin);
        $this->seedBillingFlow($customers, $petugas, $admin, $tariff, $accounts);
        $this->seedPublicContent($admin);
        $this->seedSystemSettings($admin);

        $admin->tokens()->delete();
        $petugas->tokens()->delete();
    }

    private function seedRegions(): array
    {
        $dusun1 = Region::create(['household_count' => 62, 'name' => 'Dusun 1', 'type' => 'dusun']);
        $dusun3 = Region::create(['household_count' => 104, 'name' => 'Dusun 3', 'type' => 'dusun']);

        $rwDusun1 = Region::create([
            'code' => 'RW 05',
            'household_count' => 62,
            'name' => 'RW 05',
            'parent_id' => $dusun1->id,
            'type' => 'rw',
        ]);

        $rwDusun3 = Region::create([
            'code' => 'RW 06',
            'household_count' => 104,
            'name' => 'RW 06',
            'parent_id' => $dusun3->id,
            'type' => 'rw',
        ]);

        $rtDusun1 = collect([
            ['RT 01', 'Cikadu', 20],
            ['RT 02', 'Pasir Jati', 21],
            ['RT 03', 'Sukamaju', 21],
        ])->map(fn ($row) => Region::create([
            'code' => $row[0],
            'household_count' => $row[2],
            'kampung' => $row[1],
            'name' => "{$row[0]} - {$row[1]}",
            'parent_id' => $rwDusun1->id,
            'type' => 'rt',
        ]))->values();

        $rtDusun3 = collect([
            ['RT 01', 'Banceuy', 18],
            ['RT 02', 'Pasir Peucang', 16],
            ['RT 03', 'Bobojong', 17],
            ['RT 04', 'Babakan Sari', 17],
            ['RT 05', 'Sukaasih', 16],
            ['RT 06', 'Banceuy Kulon', 20],
        ])->map(fn ($row) => Region::create([
            'code' => $row[0],
            'household_count' => $row[2],
            'kampung' => $row[1],
            'name' => "{$row[0]} - {$row[1]}",
            'parent_id' => $rwDusun3->id,
            'type' => 'rt',
        ]))->values();

        return [$dusun1, $dusun3, $rtDusun1, $rtDusun3];
    }

    private function seedCustomers(Region $dusun1, Region $dusun3, $rtDusun1, $rtDusun3)
    {
        $customers = collect([
            ['PEL-2026-001', 'Budi Santoso', 'Jl. Mawar No. 12', $dusun3->id, $rtDusun3[0]->id, 'aktif'],
            ['PEL-2026-002', 'Siti Aminah', 'Jl. Melati No. 5', $dusun3->id, $rtDusun3[1]->id, 'menunggak'],
            ['PEL-2026-003', 'Agus Pranoto', 'Gg. Kenanga II', $dusun3->id, $rtDusun3[2]->id, 'aktif'],
            ['PEL-2026-004', 'Dewi Lestari', 'Jl. Anggrek No. 8B', $dusun3->id, $rtDusun3[3]->id, 'aktif'],
            ['PEL-2026-005', 'Neng Fitri', 'Kp. Cikadu No. 4', $dusun1->id, $rtDusun1[0]->id, 'aktif'],
            ['PEL-2026-006', 'Ujang Solihin', 'Kp. Pasir Jati No. 7', $dusun1->id, $rtDusun1[1]->id, 'nonaktif'],
        ])->map(fn ($row) => Customer::create([
            'address' => $row[2],
            'customer_code' => $row[0],
            'dusun_id' => $row[3],
            'joined_at' => '2026-01-12',
            'name' => $row[1],
            'rt_id' => $row[4],
            'status' => $row[5],
        ]));

        $targets = collect([
            [$dusun1, $rtDusun1[0], 20],
            [$dusun1, $rtDusun1[1], 21],
            [$dusun1, $rtDusun1[2], 21],
            [$dusun3, $rtDusun3[0], 18],
            [$dusun3, $rtDusun3[1], 16],
            [$dusun3, $rtDusun3[2], 17],
            [$dusun3, $rtDusun3[3], 17],
            [$dusun3, $rtDusun3[4], 16],
            [$dusun3, $rtDusun3[5], 20],
        ]);

        $sequence = 7;
        foreach ($targets as [$dusun, $rt, $targetTotal]) {
            $existing = Customer::where('rt_id', $rt->id)->count();

            for ($number = $existing + 1; $number <= $targetTotal; $number++) {
                $status = $sequence % 41 === 0 ? 'nonaktif' : ($sequence % 17 === 0 ? 'menunggak' : 'aktif');
                $customers->push(Customer::create([
                    'address' => "Kp. {$rt->kampung} No. {$number}",
                    'customer_code' => 'PEL-2026-'.str_pad((string) $sequence, 3, '0', STR_PAD_LEFT),
                    'dusun_id' => $dusun->id,
                    'joined_at' => '2026-01-12',
                    'name' => 'Pelanggan '.$rt->kampung.' '.str_pad((string) $number, 2, '0', STR_PAD_LEFT),
                    'rt_id' => $rt->id,
                    'status' => $status,
                ]));
                $sequence++;
            }
        }

        return $customers->values();
    }

    private function seedCashAccounts(User $admin): array
    {
        $cash = CashAccount::firstOrCreate(['type' => 'tunai'], [
            'code' => 'KAS-TUNAI',
            'current_balance' => 0,
            'currency' => 'IDR',
            'name' => 'Kas Tunai',
            'opening_balance' => 0,
            'opening_balance_locked_at' => null,
            'opening_balance_locked_by' => null,
            'opening_balance_period' => null,
            'type' => 'tunai',
        ]);

        $qris = CashAccount::firstOrCreate(['type' => 'qris'], [
            'code' => 'KAS-QRIS',
            'current_balance' => 0,
            'currency' => 'IDR',
            'name' => 'Kas QRIS',
            'opening_balance' => 0,
            'opening_balance_locked_at' => null,
            'opening_balance_locked_by' => null,
            'opening_balance_period' => null,
            'type' => 'qris',
        ]);

        return ['tunai' => $cash, 'qris' => $qris];
    }

    private function seedBillingFlow($customers, User $petugas, User $admin, Tariff $tariff, array $accounts): void
    {
        $periodMonth = 8;
        $periodYear = 2026;

        $deposit = OfficerDeposit::create([
            'cash_total' => 0,
            'deposit_number' => 'SET-202608-001',
            'officer_id' => $petugas->id,
            'period_month' => $periodMonth,
            'period_year' => $periodYear,
            'received_amount' => null,
            'received_at' => Carbon::parse('2026-08-12 13:30:00'),
            'qris_total' => 0,
            'discrepancy_amount' => 0,
            'status' => 'pending',
            'submitted_at' => Carbon::parse('2026-08-12 13:30:00'),
            'total_amount' => 0,
        ]);

        $cashTotal = 0;
        $qrisTotal = 0;

        foreach ($customers->take(4)->values() as $index => $customer) {
            $previous = [120, 110, 95, 82][$index];
            $current = [135, 124, 112, 97][$index];
            $usage = $current - $previous;
            $amount = ($usage * (float) $tariff->water_rate_per_m3) + (float) $tariff->admin_fee;

            $reading = MeterReading::create([
                'current_meter' => $current,
                'customer_id' => $customer->id,
                'officer_id' => $petugas->id,
                'period_month' => $periodMonth,
                'period_year' => $periodYear,
                'previous_meter' => $previous,
                'recorded_at' => '2026-08-12',
                'usage' => $usage,
            ]);

            $bill = Bill::create([
                'admin_fee' => $tariff->admin_fee,
                'customer_id' => $customer->id,
                'due_date' => '2026-08-25',
                'invoice_number' => 'INV-202608-'.str_pad((string) ($index + 1), 3, '0', STR_PAD_LEFT),
                'meter_reading_id' => $reading->id,
                'payment_status' => $index === 1 ? 'belum_lunas' : 'menunggu_verifikasi',
                'period_month' => $periodMonth,
                'period_year' => $periodYear,
                'print_status' => 'sudah_dicetak',
                'tariff_id' => $tariff->id,
                'total_amount' => $amount,
                'usage' => $usage,
                'water_rate' => $tariff->water_rate_per_m3,
            ]);

            Receipt::create([
                'bill_id' => $bill->id,
                'customer_address_snapshot' => $customer->address,
                'customer_id' => $customer->id,
                'customer_name_snapshot' => $customer->name,
                'officer_id' => $petugas->id,
                'period_month' => $periodMonth,
                'period_year' => $periodYear,
                'printed_at' => '2026-08-10 09:00:00',
                'printed_by' => $admin->id,
                'receipt_number' => 'KWT-202608-'.str_pad((string) ($index + 1), 3, '0', STR_PAD_LEFT),
                'status' => 'printed',
                'template_snapshot' => ['template' => 'kwitansi-resmi-pamsimas'],
            ]);

            if ($index !== 1) {
                $method = $index === 2 ? 'qris' : 'tunai';
                Payment::create([
                    'amount' => $amount,
                    'bill_id' => $bill->id,
                    'method' => $method,
                    'officer_deposit_id' => $deposit->id,
                    'officer_id' => $petugas->id,
                    'paid_at' => '2026-08-12 13:00:00',
                    'status' => 'pending',
                ]);

                if ($method === 'tunai') {
                    $cashTotal += $amount;
                } else {
                    $qrisTotal += $amount;
                }
            }
        }

        $deposit->update([
            'cash_total' => $cashTotal,
            'qris_total' => $qrisTotal,
            'total_amount' => $cashTotal + $qrisTotal,
        ]);

        $expense = Expense::create([
            'amount' => 450000,
            'cash_account_id' => $accounts['tunai']->id,
            'category' => 'Perbaikan Pipa',
            'created_by' => $admin->id,
            'description' => 'Beli paralon 3 inch dan lem untuk perbaikan bocor di RT 02',
            'expense_date' => '2026-08-12',
            'is_public' => true,
            'payment_method' => 'cash',
            'quantity' => 5,
            'unit' => 'Pcs',
            'unit_price' => 90000,
            'status' => 'draft',
        ]);
    }

    private function seedSystemSettings(User $admin): void
    {
        Setting::insert([
            ['key' => 'billing_period', 'value' => json_encode(['month' => 8, 'year' => 2026, 'due_day' => 25]), 'created_at' => now(), 'updated_at' => now()],
            ['key' => 'base_tariff', 'value' => json_encode(['water_rate_per_m3' => 3000, 'admin_fee' => 5000]), 'created_at' => now(), 'updated_at' => now()],
            ['key' => 'receipt_format', 'value' => json_encode(['template' => 'Kwitansi Formal PAMSIMAS', 'paper' => 'A4 portrait', 'slots_per_page' => 3]), 'created_at' => now(), 'updated_at' => now()],
            ['key' => 'receipt_signatory', 'value' => json_encode(['name' => 'ADE SOPIAN', 'title' => 'Ketua KPSPAMS TIRTA SARI']), 'created_at' => now(), 'updated_at' => now()],
            ['key' => 'report_format', 'value' => json_encode(['font' => 'Times New Roman', 'size' => 12, 'template' => 'Template_Laporan_Formal_PAMSIMAS_Desa']), 'created_at' => now(), 'updated_at' => now()],
        ]);

        DocumentTemplate::insert([
            ['file_path' => 'templates/kwitansi-pamsimas.docx', 'is_active' => true, 'name' => 'Format Kwitansi PAMSIMAS', 'type' => 'receipt_word', 'uploaded_by' => $admin->id, 'created_at' => now(), 'updated_at' => now()],
            ['file_path' => 'templates/laporan-formal-pamsimas.docx', 'is_active' => true, 'name' => 'Format Laporan Formal PAMSIMAS Desa', 'type' => 'report_word', 'uploaded_by' => $admin->id, 'created_at' => now(), 'updated_at' => now()],
            ['file_path' => 'templates/panduan-pemasangan.pdf', 'is_active' => true, 'name' => 'Panduan Pemasangan Sambungan Baru', 'type' => 'install_guide_pdf', 'uploaded_by' => $admin->id, 'created_at' => now(), 'updated_at' => now()],
        ]);

        ActivityLog::insert([
            ['action' => 'login', 'actor_name' => 'Admin Utama', 'description' => 'Admin masuk ke dashboard.', 'ip_address' => '127.0.0.1', 'logged_at' => '2026-08-12 08:00:00', 'user_id' => $admin->id, 'created_at' => now(), 'updated_at' => now()],
            ['action' => 'seed', 'actor_name' => 'System Seeder', 'description' => 'Data dummy awal PAMSIMAS dibuat untuk pengujian fitur.', 'ip_address' => '127.0.0.1', 'logged_at' => '2026-08-12 08:05:00', 'user_id' => $admin->id, 'created_at' => now(), 'updated_at' => now()],
        ]);
    }

    private function seedPublicContent(User $admin): void
    {
        Faq::insert([
            ['answer' => 'Pembayaran bisa dilakukan kepada petugas melalui tunai atau QRIS.', 'category' => 'Pembayaran', 'question' => 'Bagaimana cara bayar tagihan air?', 'sort_order' => 1, 'created_at' => now(), 'updated_at' => now()],
            ['answer' => 'Laporkan melalui menu pengaduan publik atau hubungi layanan PAMSIMAS.', 'category' => 'Pengaduan', 'question' => 'Bagaimana melaporkan pipa bocor?', 'sort_order' => 2, 'created_at' => now(), 'updated_at' => now()],
        ]);

        $profile = OrganizationProfile::create([
            'address' => 'Desa Tanjungsari, Kecamatan Sukaluyu',
            'contact' => '0812-3456-7890',
            'contact_whatsapp' => 'https://wa.me/6281234567890',
            'description' => 'PAMSIMAS Desa Tanjungsari mengelola layanan air bersih berbasis masyarakat dengan transparansi dan pencatatan digital.',
            'email' => 'layanan@pamsimas-tanjungsari.local',
            'established' => '2019',
            'footer_contact_label' => 'Hubungi petugas untuk pendaftaran sambungan baru',
            'mission' => 'Meningkatkan kualitas layanan, transparansi iuran, dan respons gangguan.',
            'name' => 'PAMSIMAS Desa Tanjungsari',
            'office_hours_days' => 'Senin - Sabtu',
            'office_hours_time' => '08.00 - 16.00 WIB',
            'service_cards' => [
                ['desc' => 'Distribusi air bersih berbasis masyarakat untuk wilayah layanan.', 'icon' => 'drop', 'title' => 'Layanan Air Bersih'],
                ['desc' => 'Pencatatan meter dan pembayaran dilakukan secara teratur oleh petugas.', 'icon' => 'receipt', 'title' => 'Penagihan Teratur'],
                ['desc' => 'Ringkasan pembayaran dan pengeluaran dapat dipantau oleh warga.', 'icon' => 'chart', 'title' => 'Transparansi Publik'],
            ],
            'title' => 'Tentang Kami: Membangun Kemandirian Air Desa',
            'vision' => 'Layanan air bersih desa yang sehat, mandiri, dan transparan.',
        ]);

        OrganizationMember::insert([
            ['description' => 'Mengkoordinasikan operasional dan keputusan layanan PAMSIMAS.', 'name' => 'Budi Santoso', 'organization_profile_id' => $profile->id, 'position' => 'Ketua PAMSIMAS', 'sort_order' => 1, 'created_at' => now(), 'updated_at' => now()],
            ['description' => 'Mengelola administrasi, pencatatan kas, dan dokumen organisasi.', 'name' => 'Siti Aminah', 'organization_profile_id' => $profile->id, 'position' => 'Sekretaris & Bendahara', 'sort_order' => 2, 'created_at' => now(), 'updated_at' => now()],
            ['description' => 'Memelihara aplikasi dan mendukung digitalisasi proses layanan.', 'name' => 'Raty', 'organization_profile_id' => $profile->id, 'position' => 'Developer Sistem', 'sort_order' => 3, 'created_at' => now(), 'updated_at' => now()],
        ]);

        PublicMapSetting::create([
            'contact_label' => 'Hubungi petugas untuk pendaftaran sambungan baru',
            'contact_whatsapp' => 'https://wa.me/6281234567890',
            'coverage' => 'Dusun 2 dan Dusun 3',
            'description' => 'Peta jaringan ditampilkan sebagai gambar resmi yang diperbarui Admin mengikuti kondisi lapangan.',
            'guide_description' => null,
            'guide_steps' => [
                'Hubungi petugas atau pengurus wilayah melalui WhatsApp untuk menyampaikan nama dan alamat rumah.',
                'Petugas mengecek lokasi rumah terhadap jalur pipa pada peta jaringan resmi PAMSIMAS.',
                'Admin dan petugas menyiapkan jadwal survei atau pemasangan sesuai kebutuhan lapangan.',
                'Warga menunggu konfirmasi lanjutan dari petugas sampai sambungan siap dikerjakan.',
            ],
            'guide_title' => 'Panduan pemasangan instalasi air',
            'map_image_path' => 'public-maps/jalur-air-dusun-2-dan-3.png',
            'map_note' => 'Gambar peta publik dikelola Admin dan diperbarui mengikuti kondisi jaringan lapangan terbaru.',
            'status' => 'normal',
            'title' => 'Jalur air dan Panduan Pemasangan',
        ]);
    }
}
