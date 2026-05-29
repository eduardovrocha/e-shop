import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import { AdminHeader } from '@/components/AdminHeader'
import { AdminFooter } from '@/components/AdminFooter'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { LoadingState } from '@/components/LoadingState'

export default function AdminLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AdminHeader />
      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto px-4 pb-10 pt-8">
          <ErrorBoundary>
            <Suspense fallback={<LoadingState />}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </div>
      </main>
      <AdminFooter />
    </div>
  )
}
