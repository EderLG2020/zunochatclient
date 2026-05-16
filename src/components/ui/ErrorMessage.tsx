export function ErrorMessage({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-2 p-4 text-center">
      <span className="text-sm text-red-500">{message}</span>
      {onRetry && <button onClick={onRetry} className="text-xs text-blue-500 underline">Reintentar</button>}
    </div>
  )
}