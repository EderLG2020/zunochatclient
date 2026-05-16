import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Spinner } from './Spinner'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode; isLoading?: boolean; variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
}
const variants = {
  primary:   'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300',
  secondary: 'bg-gray-100 text-gray-800 hover:bg-gray-200',
  ghost:     'bg-transparent text-gray-600 hover:bg-gray-100',
  danger:    'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300',
}

export function Button({ children, isLoading = false, variant = 'primary', className = '', disabled, ...props }: ButtonProps) {
  return (
    <button disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed ${variants[variant]} ${className}`}
      {...props}>
      {isLoading && <Spinner size="sm" />}
      {children}
    </button>
  )
}