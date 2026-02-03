import { Shield, LogOut, LayoutDashboard, Upload } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function Header() {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const isDashboard = location.pathname === '/';

  return (
    <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-foreground">Life Admin OS</h1>
                <p className="text-xs text-muted-foreground">Your responsibility guardian</p>
              </div>
            </Link>

            {user && (
              <nav className="flex items-center gap-1" aria-label="Main">
                <Link
                  to="/"
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    isDashboard && !location.hash
                      ? 'bg-secondary text-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                  )}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </Link>
                <Link
                  to="/#add-documents"
                  className={cn(
                    'inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    isDashboard && location.hash === '#add-documents'
                      ? 'bg-secondary text-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                  )}
                >
                  <Upload className="w-4 h-4" />
                  Upload documents
                </Link>
              </nav>
            )}
          </div>

          {user && (
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground hidden sm:block">
                {user.email}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={signOut}
                className="text-muted-foreground hover:text-foreground"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign out
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
