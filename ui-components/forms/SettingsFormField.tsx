import React from 'react'
import { Label, TextInput } from '../../ui'

export interface SettingsFormFieldProps {
  id: string
  label: string
  name?: string
  type?: 'text' | 'email' | 'password' | 'number'
  placeholder?: string
  defaultValue?: string
  value?: string
  required?: boolean
  disabled?: boolean
  className?: string
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  min?: string | number
  max?: string | number
}

export const SettingsFormField: React.FC<SettingsFormFieldProps> = ({
  id,
  label,
  name = id,
  type = 'text',
  placeholder,
  defaultValue,
  value,
  required = false,
  disabled = false,
  className = '',
  onChange,
  min,
  max,
  ...props
}) => {
  return (
    <div className={`grid grid-cols-1 gap-y-3 ${className}`}>
      <Label htmlFor={id}>{label}</Label>
      <TextInput
        id={id}
        name={name}
        type={type}
        placeholder={placeholder}
        defaultValue={defaultValue}
        value={value}
        required={required}
        disabled={disabled}
        onChange={onChange}
        min={min}
        max={max}
        {...props}
      />
    </div>
  )
}
