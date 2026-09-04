import { useState } from 'react'
import { Icon } from './Icon'

type PasswordInputProps = {
  onChange: (value: string) => void
  placeholder?: string
  value: string
}

export function PasswordInput({ onChange, placeholder, value }: PasswordInputProps) {
  const [isVisible, setIsVisible] = useState(false)

  return (
    <div className="password-field-wrapper">
      <input
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type={isVisible ? 'text' : 'password'}
        value={value}
      />
      <button
        aria-label={isVisible ? 'Sembunyikan password' : 'Lihat password'}
        className="password-toggle-btn"
        onClick={() => setIsVisible((current) => !current)}
        tabIndex={-1}
        type="button"
      >
        <Icon name={isVisible ? 'eye-off' : 'eye'} />
      </button>
    </div>
  )
}
