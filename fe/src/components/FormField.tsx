type FormFieldProps = {
  label: string
  value: string
  helper?: string
}

export function FormField({ label, value, helper }: FormFieldProps) {
  return (
    <label>
      {label}
      <input defaultValue={value} />
      {helper && <small className="helper">{helper}</small>}
    </label>
  )
}
