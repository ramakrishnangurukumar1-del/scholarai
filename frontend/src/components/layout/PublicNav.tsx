import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui'
import { Logo } from '@/components/ui/Logo'

export function PublicNav() {
  const [menu, setMenu] = useState(false)

  return (
    <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link to="/"><Logo /></Link>
        <nav className="hidden items-center gap-7 text-sm font-medium text-gray-600 md:flex">
          <a href="#how" className="hover:text-primary">Problem</a>
          <a href="#tools" className="hover:text-primary">Tools</a>
          <a href="#ai" className="hover:text-primary">Automation</a>
        </nav>
        <div className="flex items-center gap-3">
          <div
            className="relative"
            onMouseLeave={() => setMenu(false)}
          >
            <Button variant="ghost" size="sm" onClick={() => setMenu((m) => !m)}>
              Login ▾
            </Button>
            {menu && (
              <div className="absolute right-0 mt-1 w-48 rounded-lg border border-gray-200 bg-white p-1 shadow-lg">
                <Link to="/login" className="block rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                  Student login
                </Link>
                <Link to="/officer/login" className="block rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                  Officer login
                </Link>
                <Link to="/admin/login" className="block rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                  Administrator login
                </Link>
              </div>
            )}
          </div>
          <Link to="/register">
            <Button size="sm">Get Started</Button>
          </Link>
        </div>
      </div>
    </header>
  )
}
