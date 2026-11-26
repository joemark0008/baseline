import { Outlet } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { BrandMark } from '@/components/BrandMark'

/** The frame every public screen shares: muted background, the brand, a centred column. */
export function PublicLayout({ children }: { children?: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-muted/40 px-4 py-10">
      <BrandMark className="text-xl" />
      <main className="flex w-full max-w-sm flex-col gap-4">{children ?? <Outlet />}</main>
    </div>
  )
}
