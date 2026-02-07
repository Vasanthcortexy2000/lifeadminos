import { useState } from 'react';
import { Shield, LogOut, LayoutDashboard, Upload, Calendar, Menu, X, FolderOpen, FileBarChart } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

export function Header() {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isDashboard = location.pathname === '/';
  const isCalendar = location.pathname === '/calendar';
  const isVault = location.pathname === '/vault';
  const isDigest = location.pathname === '/digest';

  const navLinks = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard, active: isDashboard && !location.hash },
    { to: '/calendar', label: 'Calendar', icon: Calendar, active: isCalendar },
    { to: '/vault', label: 'Vault', icon: FolderOpen, active: isVault },
    { to: '/digest', label: 'Digest', icon: FileBarChart, active: isDigest },
  ];

  const NavLinkItem = ({ to, label, icon: Icon, active, onClick }: {
    to: string;
    label: string;
    icon: React.ElementType;
    active: boolean;
    onClick?: () => void;
  }) => (
    <Link
      to={to}
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'min-h-[44px]', // WCAG touch target
        active
          ? 'bg-secondary text-foreground'
          : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
      )}
      aria-current={active ? 'page' : undefined}
    >
      <Icon className="w-5 h-5" aria-hidden="true" />
      <span>{label}</span>
    </Link>
  );

  return (
    <header 
      className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50"
      role="banner"
    >
      {/* Skip to main content link for keyboard users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[60] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md"
      >
        Skip to main content
      </a>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Logo */}
          <Link 
            to="/" 
            className="flex items-center gap-2 sm:gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg"
            aria-label="Life Admin OS - Home"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
              <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-semibold text-foreground truncate">Life Admin OS</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">We remember so you don't have to.</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          {user && !isMobile && (
            <nav className="flex items-center gap-1" aria-label="Main navigation">
              {navLinks.map(link => (
                <NavLinkItem key={link.to} {...link} />
              ))}
            </nav>
          )}

          {/* Desktop User Actions */}
          {user && !isMobile && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground hidden md:block truncate max-w-[180px]">
                {user.email}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={signOut}
                className="text-muted-foreground hover:text-foreground min-h-[44px] px-3"
                aria-label="Sign out of your account"
              >
                <LogOut className="w-4 h-4 sm:mr-2" aria-hidden="true" />
                <span className="hidden sm:inline">Sign out</span>
              </Button>
            </div>
          )}

          {/* Mobile Menu */}
          {user && isMobile && (
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="min-h-[44px] min-w-[44px]"
                  aria-label="Open navigation menu"
                  aria-expanded={mobileMenuOpen}
                >
                  <Menu className="w-6 h-6" aria-hidden="true" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] p-0">
                <div className="flex flex-col h-full">
                  {/* Mobile menu header */}
                  <div className="flex items-center justify-between p-4 border-b border-border">
                    <span className="text-sm font-medium text-foreground">Menu</span>
                    <SheetClose asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="min-h-[44px] min-w-[44px]"
                        aria-label="Close navigation menu"
                      >
                        <X className="w-5 h-5" aria-hidden="true" />
                      </Button>
                    </SheetClose>
                  </div>

                  {/* Mobile navigation links */}
                  <nav className="flex flex-col p-4 gap-2" aria-label="Main navigation">
                    {navLinks.map(link => (
                      <NavLinkItem 
                        key={link.to} 
                        {...link} 
                        onClick={() => setMobileMenuOpen(false)} 
                      />
                    ))}
                  </nav>

                  {/* User info and sign out */}
                  <div className="mt-auto p-4 border-t border-border">
                    <p className="text-sm text-muted-foreground mb-3 truncate">{user.email}</p>
                    <Button
                      variant="outline"
                      className="w-full min-h-[44px] gap-2"
                      onClick={() => {
                        signOut();
                        setMobileMenuOpen(false);
                      }}
                      aria-label="Sign out of your account"
                    >
                      <LogOut className="w-4 h-4" aria-hidden="true" />
                      Sign out
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          )}
        </div>
      </div>
    </header>
  );
}
