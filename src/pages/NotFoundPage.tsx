import { Link } from 'react-router-dom'
export function NotFoundPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center bg-gray-50 dark:bg-gray-950">
      <h1 className="text-6xl font-bold text-gray-200 dark:text-gray-800">404</h1>
      <p className="mt-2 text-gray-500 dark:text-gray-400">Página no encontrada</p>
      <Link to="/chat" className="mt-4 text-sm text-blue-500 hover:underline dark:text-blue-400">Volver al chat</Link>
    </div>
  )
}