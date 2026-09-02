import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { useAuth } from '@/lib/auth'
import { Icon, type IconName } from '@/components/ui/icons'
import type { Role } from '@/lib/types'

type NavItem = { to: string; label: string; icon: IconName }

const NAV: Record<Role, NavItem[]> = {
  student: [
    { to: '/app', label: 'Dashboard', icon: 'dashboard' },
    { to: '/app/applications', label: 'My Applications', icon: 'file' },
    { to: '/app/scholarships', label: 'Scholarships', icon: 'grad' },
    { to: '/app/notifications', label: 'Notifications', icon: 'bell' },
    { to: '/app/profile', label: 'Profile', icon: 'user' },
  ],
  authority: [
    { to: '/authority', label: 'Dashboard', icon: 'dashboard' },
    { to: '/authority/applications', label: 'Applications', icon: 'file' },
    { to: '/authority/verification', label: 'Verification Queue', icon: 'shield' },
    { to: '/authority/analytics', label: 'Analytics', icon: 'chart' },
  ],
  admin: [
    { to: '/admin', label: 'Analytics', icon: 'chart' },
    { to: '/admin/scholarships', label: 'Scholarships', icon: 'grad' },
    { to: '/admin/users', label: 'Users', icon: 'users' },
  ],
}

export function DashboardLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  if (!user) return null
  const items = NAV[user.role]
  const home = `/${user.role === 'student' ? 'app' : user.role}`
  const initials = user.fullName.split(' ').map((p) => p[0]).join('')
  const dark = user.role !== 'student'

  return (
    <div className="flex min-h-screen bg-bg-subtle">
      <aside
        className={cn(
          'fixed inset-y-0 left-0 hidden w-64 flex-col px-4 py-5 md:flex',
          dark ? 'bg-primary text-white' : 'border-r border-gray-200 bg-white',
        )}
      >
        <div
          className={cn(
            'mb-8 flex items-center gap-2.5 px-2 text-lg font-bold',
            dark ? 'text-white' : 'text-primary',
          )}
        >
          <span
            className={cn(
              'grid h-8 w-8 place-items-center rounded-lg text-sm',
              dark ? 'bg-white/15 text-white' : 'bg-primary text-white',
            )}
          >
            ◆
          </span>
          ScholarAI
        </div>
        <nav className="flex-1 space-y-1">
          {items.map((it) => {
            const IconCmp = Icon[it.icon]
            return (
              <NavLink
                key={it.to}
                to={it.to}
                end={it.to === home}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition',
                    dark
                      ? isActive
                        ? 'bg-white/15 text-white'
                        : 'text-white/60 hover:bg-white/10 hover:text-white'
                      : isActive
                        ? 'bg-ai-soft text-ai'
                        : 'text-gray-500 hover:bg-gray-50 hover:text-primary',
                  )
                }
              >
                <IconCmp />
                {it.label}
              </NavLink>
            )
          })}
        </nav>
        <button
          onClick={() => {
            logout()
            navigate('/')
          }}
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium',
            dark
              ? 'text-white/60 hover:bg-white/10 hover:text-white'
              : 'text-gray-500 hover:bg-gray-50 hover:text-primary',
          )}
        >
          <Icon.logout />
          Logout
        </button>
      </aside>

      <div className="flex flex-1 flex-col md:pl-64">
        <header className="sticky top-0 z-10 flex items-center gap-4 border-b border-gray-200 bg-white/90 px-6 py-3 backdrop-blur">
          <div className="relative hidden max-w-sm flex-1 md:block">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <Icon.search />
            </span>
            <input
              placeholder={dark ? 'Search applications…' : 'Search scholarships…'}
              className="w-full rounded-lg border border-gray-200 bg-bg-subtle py-2 pl-9 pr-3 text-sm outline-none focus:border-ai focus:bg-white"
            />
          </div>
          <div className="ml-auto flex items-center gap-4">
            <button className="relative text-gray-400 hover:text-primary">
              <Icon.bell />
              <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-danger" />
            </button>
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-ai-soft text-xs font-semibold text-ai">
                {initials}
              </span>
              <div className="hidden text-sm leading-tight sm:block">
                <p className="font-medium text-primary">{user.fullName}</p>
                <p className="text-xs capitalize text-gray-400">
                  {user.role === 'authority' ? 'Administrator' : user.role}
                </p>
              </div>
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
