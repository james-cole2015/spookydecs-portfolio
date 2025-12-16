import { Link } from 'react-router-dom'
import { Settings } from 'lucide-react'

export function Header() {
  return (
    <header className="bg-gradient-to-r from-slate-700 to-slate-600 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-6">
          <Link to="/" className="flex items-center">
            <h1 className="text-2xl font-bold text-white">
              SpookyDecs - Item Management
            </h1>
          </Link>
          
          <nav className="flex items-center space-x-4">
            <Link
              to="/admin"
              className="flex items-center gap-2 px-4 py-2 rounded-full border-2 border-white/30 text-white hover:bg-white/10 transition-colors font-medium"
            >
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Admin</span>
            </Link>
            <Link
              to="/items"
              className="text-white/80 hover:text-white font-medium transition-colors"
            >
              Items
            </Link>
          </nav>
        </div>
      </div>
    </header>
  )
}
