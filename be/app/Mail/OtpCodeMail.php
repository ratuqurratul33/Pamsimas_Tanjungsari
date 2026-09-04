<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class OtpCodeMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly string $code,
        public readonly string $recipientName,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Kode OTP Ganti Password PAMSIMAS Tanjungsari',
        );
    }

    public function content(): Content
    {
        return new Content(
            htmlString: <<<HTML
                <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #1E2D3D;">
                    <h2 style="color: #0070A8;">PAMSIMAS Tanjungsari</h2>
                    <p>Halo {$this->recipientName},</p>
                    <p>Gunakan kode berikut untuk mengganti password akun Anda. Kode berlaku selama 10 menit.</p>
                    <p style="font-size: 32px; font-weight: 700; letter-spacing: 8px; background: #F0F7FC; padding: 16px 20px; text-align: center; border-radius: 8px; color: #0070A8;">{$this->code}</p>
                    <p>Jika Anda tidak meminta perubahan password, abaikan email ini.</p>
                    <p style="color: #64748B; font-size: 12px;">Email otomatis dari sistem PAMSIMAS Desa Tanjungsari. Mohon tidak membalas email ini.</p>
                </div>
                HTML,
        );
    }
}
