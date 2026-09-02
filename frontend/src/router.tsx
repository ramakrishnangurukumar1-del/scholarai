import { Navigate, Outlet, createBrowserRouter } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { LandingPage } from '@/features/landing/LandingPage'
import { LoginPage } from '@/features/auth/LoginPage'
import { RegisterPage } from '@/features/auth/RegisterPage'
import { ForgotPasswordPage } from '@/features/auth/ForgotPasswordPage'
import { ResetPasswordPage } from '@/features/auth/ResetPasswordPage'
import { StudentDashboard } from '@/features/student/Dashboard'
import { Scholarships } from '@/features/student/Scholarships'
import { ScholarshipDetail } from '@/features/student/ScholarshipDetail'
import { ApplicationWizard } from '@/features/student/ApplicationWizard'
import { ApplicationsList } from '@/features/student/ApplicationsList'
import { ApplicationDetail } from '@/features/student/ApplicationDetail'
import { Notifications } from '@/features/student/Notifications'
import { ProfilePage } from '@/features/student/ProfilePage'
import { AuthorityDashboard } from '@/features/authority/Dashboard'
import { ApplicationsTable } from '@/features/authority/ApplicationsTable'
import { ReviewPage } from '@/features/authority/ReviewPage'
import { VerificationQueue } from '@/features/authority/VerificationQueue'
import { Analytics } from '@/features/authority/Analytics'
import { AdminScholarships, AdminUsers } from '@/features/admin/AdminPages'
import type { Role } from '@/lib/types'

const LOGIN_PATH: Record<Role, string> = {
  student: '/login',
  authority: '/officer/login',
  admin: '/admin/login',
}
const HOME_PATH: Record<Role, string> = {
  student: '/app',
  authority: '/authority',
  admin: '/admin',
}

function RequireRole({ role }: { role: Role }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-bg-subtle text-sm text-gray-400">
        Loading…
      </div>
    )
  }
  if (!user) return <Navigate to={LOGIN_PATH[role]} replace />
  if (user.role !== role) return <Navigate to={HOME_PATH[user.role]} replace />
  return <Outlet />
}

export const router = createBrowserRouter([
  { path: '/', element: <LandingPage /> },
  { path: '/login', element: <LoginPage portal="student" /> },
  { path: '/officer/login', element: <LoginPage portal="authority" /> },
  { path: '/admin/login', element: <LoginPage portal="admin" /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/reset-password', element: <ResetPasswordPage /> },
  {
    element: <RequireRole role="student" />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          { path: '/app', element: <StudentDashboard /> },
          { path: '/app/scholarships', element: <Scholarships /> },
          { path: '/app/scholarships/:id', element: <ScholarshipDetail /> },
          { path: '/app/apply/:scholarshipId', element: <ApplicationWizard /> },
          { path: '/app/applications', element: <ApplicationsList /> },
          { path: '/app/applications/:id', element: <ApplicationDetail /> },
          { path: '/app/notifications', element: <Notifications /> },
          { path: '/app/profile', element: <ProfilePage /> },
        ],
      },
    ],
  },
  {
    element: <RequireRole role="authority" />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          { path: '/authority', element: <AuthorityDashboard /> },
          { path: '/authority/applications', element: <ApplicationsTable /> },
          { path: '/authority/applications/:id', element: <ReviewPage /> },
          { path: '/authority/verification', element: <VerificationQueue /> },
          { path: '/authority/analytics', element: <Analytics /> },
        ],
      },
    ],
  },
  {
    element: <RequireRole role="admin" />,
    children: [
      {
        element: <DashboardLayout />,
        children: [
          { path: '/admin', element: <Analytics /> },
          { path: '/admin/scholarships', element: <AdminScholarships /> },
          { path: '/admin/users', element: <AdminUsers /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
