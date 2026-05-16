type Size = 'sm' | 'md' | 'lg'
const sizes: Record<Size, string> = { sm: 'h-4 w-4 border-2', md: 'h-6 w-6 border-2', lg: 'h-10 w-10 border-4' }

export function Spinner({ size = 'md', className = '' }: { size?: Size; className?: string }) {
  return <div className={`animate-spin rounded-full border-blue-500 border-t-transparent ${sizes[size]} ${className}`} />
}