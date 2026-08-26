import type { ReactNode } from 'react'

interface Props {
  sidebar: ReactNode
  main: ReactNode
  /** En móvil solo se ve un panel a la vez: true → panel principal, false → sidebar. En md+ ambos son visibles. */
  showMainOnMobile: boolean
}

// Layout de dos columnas: sidebar fijo (320px en desktop) + panel principal flexible.
// En móvil colapsa a una sola columna, alternando según showMainOnMobile.
export function AppLayout({ sidebar, main, showMainOnMobile }: Props) {
  return (
    <div className="flex h-full overflow-hidden bg-white dark:bg-gray-950">
      <aside className={`${showMainOnMobile ? 'hidden' : 'flex'} w-full flex-shrink-0 flex-col border-r border-gray-200 dark:border-gray-800 md:flex md:w-80`}>
        {sidebar}
      </aside>
      <main className={`${showMainOnMobile ? 'flex' : 'hidden'} flex-1 flex-col overflow-hidden md:flex`}>
        {main}
      </main>
    </div>
  )
}