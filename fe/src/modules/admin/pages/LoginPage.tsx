import { useState } from 'react'
import { Icon } from '../../../components/Icon'
import { login, requestOtp, resetPasswordWithOtp, type AppRole } from '../../../app/services/authService'

type LoginPageProps = {
  onLogin: (role: AppRole) => void
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isForgotOpen, setIsForgotOpen] = useState(false)
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)

  async function submitLogin() {
    setIsLoading(true)
    setError('')
    try {
      const session = await login(email, password)
      onLogin(session.role)
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Login gagal.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--page)] px-4 py-10 font-sans">
      <section className="login-card w-full max-w-md p-8 sm:p-10">
        <div className="mb-8 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] bg-[#0070A8] text-white">
            <Icon name="drop" />
          </span>
          <div>
            <h1 className="text-lg font-black text-[#0070A8]">PAMSIMAS</h1>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Tanjungsari</p>
          </div>
        </div>

        <h2 className="text-2xl font-black tracking-tight text-slate-800">Masuk ke sistem</h2>
        <p className="mt-2 text-sm font-medium leading-relaxed text-slate-500">
          Gunakan akun admin atau petugas yang sudah terdaftar untuk mengakses panel operasional.
        </p>

        <form
          className="mt-8 grid gap-5"
          onSubmit={(event) => {
            event.preventDefault()
            void submitLogin()
          }}
        >
          <label className="grid gap-2 text-sm font-bold text-slate-700">
            Email atau Username
            <input
              autoComplete="username"
              className="h-11 rounded-[var(--radius-sm)] border border-[var(--border)] bg-white px-4 text-sm font-medium text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-[#0070A8]"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="admin atau nama@pamsimas.local"
              type="text"
              value={email}
            />
          </label>

          <div className="grid gap-2 text-sm font-bold text-slate-700">
            <span className="flex items-center justify-between gap-3">
              <label htmlFor="login-password">Password</label>
              <button className="text-xs font-bold text-[#0070A8] hover:underline" onClick={() => setIsForgotOpen(true)} type="button">
                Lupa password?
              </button>
            </span>
            <div className="relative">
              <input
                autoComplete="current-password"
                className="h-11 w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-white px-4 pr-11 text-sm font-medium text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-[#0070A8]"
                id="login-password"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Masukkan password"
                type={isPasswordVisible ? 'text' : 'password'}
                value={password}
              />
              <button
                aria-label={isPasswordVisible ? 'Sembunyikan password' : 'Lihat password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                onClick={() => setIsPasswordVisible((current) => !current)}
                tabIndex={-1}
                type="button"
              >
                <Icon name={isPasswordVisible ? 'eye-off' : 'eye'} />
              </button>
            </div>
            <small className="font-medium text-slate-500">Petugas menggunakan nomor HP yang tercatat oleh Admin sebagai password.</small>
          </div>

          {error && (
            <p className="rounded-[var(--radius-sm)] bg-[var(--tone-danger-bg)] px-4 py-3 text-sm font-semibold text-[var(--tone-danger-fg)]">
              {error}
            </p>
          )}

          <button
            className="mt-1 inline-flex h-11 items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-[#0070A8] px-6 text-sm font-bold text-white transition-colors hover:bg-[#005e8c] disabled:opacity-70"
            disabled={isLoading}
            type="submit"
          >
            {isLoading && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true" />
            )}
            {isLoading ? 'Memeriksa...' : 'Masuk'}
          </button>
        </form>
      </section>
      {isForgotOpen && <ForgotPasswordModal onClose={() => setIsForgotOpen(false)} />}
    </main>
  )
}

function ForgotPasswordModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<'request' | 'reset'>('request')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [info, setInfo] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)

  async function sendCode() {
    if (!email.trim()) {
      setError('Masukkan email akun yang terdaftar.')
      return
    }
    setIsSubmitting(true)
    setError('')
    try {
      const message = await requestOtp(email.trim())
      setInfo(message)
      setStep('reset')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Kode OTP gagal dikirim.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function submitReset() {
    if (newPassword.length < 8) {
      setError('Password baru minimal 8 karakter.')
      return
    }
    if (newPassword !== confirmation) {
      setError('Konfirmasi password baru tidak sesuai.')
      return
    }
    setIsSubmitting(true)
    setError('')
    try {
      const message = await resetPasswordWithOtp(email.trim(), code.trim(), newPassword, confirmation)
      setInfo(message)
      setStep('request')
      setCode('')
      setNewPassword('')
      setConfirmation('')
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : 'Password gagal diperbarui.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <div className="modal compact-modal">
        <div className="modal-head">
          <div>
            <h2>Lupa Password</h2>
            <p>{step === 'request' ? 'Masukkan email akun untuk menerima kode OTP.' : 'Masukkan kode OTP dan password baru Anda.'}</p>
          </div>
          <button className="icon-btn" onClick={onClose} type="button"><Icon name="close" /></button>
        </div>
        <div className="modal-body grid gap-4">
          <label className="grid gap-2 text-sm font-bold text-slate-700">
            Email
            <input
              className="h-11 rounded-[var(--radius-sm)] border border-[var(--border)] bg-white px-4 text-sm font-medium text-slate-800 outline-none focus:border-[#0070A8] disabled:bg-slate-100"
              disabled={step === 'reset'}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="nama@pamsimas.local"
              type="email"
              value={email}
            />
          </label>

          {step === 'reset' && (
            <>
              <label className="grid gap-2 text-sm font-bold text-slate-700">
                Kode OTP
                <input
                  className="h-11 rounded-[var(--radius-sm)] border border-[var(--border)] bg-white px-4 text-sm font-medium tracking-[0.3em] text-slate-800 outline-none focus:border-[#0070A8]"
                  inputMode="numeric"
                  maxLength={6}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  value={code}
                />
              </label>
              <label className="grid gap-2 text-sm font-bold text-slate-700">
                Password Baru
                <div className="relative">
                  <input
                    className="h-11 w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-white px-4 pr-11 text-sm font-medium text-slate-800 outline-none focus:border-[#0070A8]"
                    onChange={(event) => setNewPassword(event.target.value)}
                    placeholder="Minimal 8 karakter"
                    type={isPasswordVisible ? 'text' : 'password'}
                    value={newPassword}
                  />
                  <button
                    aria-label={isPasswordVisible ? 'Sembunyikan password' : 'Lihat password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    onClick={() => setIsPasswordVisible((current) => !current)}
                    tabIndex={-1}
                    type="button"
                  >
                    <Icon name={isPasswordVisible ? 'eye-off' : 'eye'} />
                  </button>
                </div>
              </label>
              <label className="grid gap-2 text-sm font-bold text-slate-700">
                Konfirmasi Password
                <input
                  className="h-11 rounded-[var(--radius-sm)] border border-[var(--border)] bg-white px-4 text-sm font-medium text-slate-800 outline-none focus:border-[#0070A8]"
                  onChange={(event) => setConfirmation(event.target.value)}
                  placeholder="Ulangi password baru"
                  type={isPasswordVisible ? 'text' : 'password'}
                  value={confirmation}
                />
              </label>
              <button className="text-xs font-bold text-[#0070A8] hover:underline" disabled={isSubmitting} onClick={() => void sendCode()} type="button">
                Kirim ulang kode
              </button>
            </>
          )}

          {info && <p className="rounded-[var(--radius-sm)] bg-[var(--tone-success-bg)] px-4 py-3 text-sm font-semibold text-[var(--tone-success-fg)]">{info}</p>}
          {error && <p className="rounded-[var(--radius-sm)] bg-[var(--tone-danger-bg)] px-4 py-3 text-sm font-semibold text-[var(--tone-danger-fg)]">{error}</p>}

          <button
            className="mt-1 inline-flex h-11 items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-[#0070A8] px-6 text-sm font-bold text-white transition-colors hover:bg-[#005e8c] disabled:opacity-70"
            disabled={isSubmitting}
            onClick={() => void (step === 'request' ? sendCode() : submitReset())}
            type="button"
          >
            {step === 'request' ? 'Kirim Kode' : 'Simpan Password Baru'}
          </button>
        </div>
      </div>
    </div>
  )
}
