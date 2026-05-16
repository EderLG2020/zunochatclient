import { Link } from 'react-router-dom'
export function NotFoundPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center bg-gray-50">
      <h1 className="text-6xl font-bold text-gray-200">404</h1>
      <p className="mt-2 text-gray-500">Página no encontrada</p>
      <Link to="/chat" className="mt-4 text-sm text-blue-500 hover:underline">Volver al chat</Link>
    </div>
  )
}