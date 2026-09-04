import { Icon } from './Icon'

type PhotoPickerProps = {
  hint?: string
  id: string
  label: string
  onSelect: (file: File) => void
  placeholder: string
  previewSrc?: string
}

/** Consistent photo-selection control shared by the admin's own account photo and the officer (petugas) photo picked by admin — an avatar preview plus a custom button instead of the raw, inconsistently-sized native file input. */
export function PhotoPicker({ hint, id, label, onSelect, placeholder, previewSrc }: PhotoPickerProps) {
  return (
    <div className="photo-picker">
      <div className="photo-picker-preview">
        {previewSrc ? <img alt={label} src={previewSrc} /> : <span>{placeholder}</span>}
      </div>
      <div className="photo-picker-controls">
        <span className="photo-picker-label">{label}</span>
        <label className="photo-picker-button" htmlFor={id}>
          <Icon name="upload" />
          Pilih Foto
        </label>
        <input
          accept="image/*"
          className="photo-picker-input"
          id={id}
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) onSelect(file)
            event.target.value = ''
          }}
          type="file"
        />
        {hint && <small className="photo-picker-hint">{hint}</small>}
      </div>
    </div>
  )
}
