import type { ReactNode } from 'react'

// Layout de dos columnas: sidebar fijo (320px) + panel principal flexible
export function AppLayout({ sidebar, main }: { sidebar: ReactNode; main: ReactNode }) {
  return (
    <div className="flex h-full overflow-hidden bg-white">
      <aside className="flex w-80 flex-shrink-0 flex-col border-r border-gray-200">{sidebar}</aside>
      <main className="flex flex-1 flex-col overflow-hidden">{main}</main>
    </div>
  )
}