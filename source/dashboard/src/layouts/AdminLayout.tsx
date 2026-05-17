import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import { AdminSidebar } from '@/components/AdminSidebar'
import { AdminHeader } from '@/components/AdminHeader'
import { AdminFooter } from '@/components/AdminFooter'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { LoadingState } from '@/components/LoadingState'

export default function AdminLayout() {
  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />

      <div className="flex flex-1 flex-col lg:ml-64">
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
    </div>
  )
}
