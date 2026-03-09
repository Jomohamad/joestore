import type { ComponentType } from 'react';
import { Gamepad2, Grid3X3, Home, ShoppingBag, User } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';

interface NavItem {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  isActive: (pathname: string) => boolean;
}

export default function MobileBottomNav() {
  const { pathname } = useLocation();
  const { user } = useAuth();

  const profilePath = user ? '/dashboard' : '/login';

  const items: NavItem[] = [
    {
      to: '/',
      label: 'Home',
      icon: Home,
      isActive: (path) => path === '/',
    },
    {
      to: '/games',
      label: 'Games',
      icon: Gamepad2,
      isActive: (path) => path.startsWith('/games') || path.startsWith('/game/'),
    },
    {
      to: '/apps',
      label: 'Apps',
      icon: Grid3X3,
      isActive: (path) => path.startsWith('/apps'),
    },
    {
      to: '/orders',
      label: 'Orders',
      icon: ShoppingBag,
      isActive: (path) => path.startsWith('/orders') || path.startsWith('/order/'),
    },
    {
      to: profilePath,
      label: 'Profile',
      icon: User,
      isActive: (path) => path.startsWith('/dashboard') || path.startsWith('/edit-profile'),
    },
  ];

  return (
    <nav className="md:hidden fixed left-0 right-0 bottom-0 z-40 border-t border-creo-border bg-creo-bg/95 backdrop-blur-md">
      <div
        className="grid grid-cols-5 items-stretch px-2 pt-1 pb-2"
        style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
      >
        {items.map((item) => {
          const Icon = item.icon;
          const active = item.isActive(pathname);

          return (
            <Link
              key={item.label}
              to={item.to}
              data-haptic
              className={cn(
                'min-h-11 rounded-xl flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors',
                active
                  ? 'text-creo-accent bg-creo-card border border-creo-border'
                  : 'text-creo-text-sec hover:text-white',
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
