'use client'

import { useState } from 'react'

interface CustomCheckboxProps {
  label: string
  name: string
  onChange: (checked: boolean) => void
}

export default function CustomCheckbox({ label, name, onChange }: CustomCheckboxProps) {
  const [isChecked, setIsChecked] = useState(false)

  const handleChange = () => {
    const newCheckedState = !isChecked
    setIsChecked(newCheckedState)
    onChange(newCheckedState)
  }

  return (
    <label className="flex items-center space-x-2 cursor-pointer group">
      <div className="relative">
        <input
          type="checkbox"
          name={name}
          checked={isChecked}
          onChange={handleChange}
          className="sr-only"
        />
        <div className={`w-5 h-5 border-2 rounded transition-colors ${
          isChecked ? 'bg-blue-500 border-blue-500' : 'border-gray-300 group-hover:border-blue-500'
        }`}>
          {isChecked && (
            <svg
              className="w-4 h-4 text-white fill-current"
              viewBox="0 0 20 20"
            >
              <path d="M0 11l2-2 5 5L18 3l2 2L7 18z" />
            </svg>
          )}
        </div>
      </div>
      <span className="text-sm font-medium text-gray-700 group-hover:text-blue-500">
        {label}
      </span>
    </label>
  )
}
