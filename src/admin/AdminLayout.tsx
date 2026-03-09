import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { ReactNode, useState } from 'react';

const menu = [
  { href: '/admin/dashboard', label: 'Dashboard' },
  { href: '/admin/orders', label: 'Orders' },
  { href: '/admin/products', label: 'Products' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/payments', label: 'Payments' },
  { href: '/admin/transactions', label: 'Transactions' },
  { href: '/admin/providers', label: 'Game Providers' },
  { href: '/admin/pricing', label: 'Pricing System' },
  { href: '/admin/fraud', label: 'Fraud Detection' },
  { href: '/admin/api-monitor', label: 'API Monitoring' },
  { href: '/admin/logs', label: 'Logs' },
  { href: '/admin/settings', label: 'Settings' },
];

export function AdminLayout(props: {
  title: string;
  currentPath: string;
  userLabel: string;
  onSignOut: () => Promise<void>;
  children: ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="flex min-h-screen">
        <aside className="hidden lg:block w-72 border-r border-slate-800 bg-slate-900/80 backdrop-blur-sm">
          <div className="px-6 py-6 border-b border-slate-800">
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-400">JOESTORE ADMIN</p>
            <h1 className="text-2xl font-semibold mt-2">Control Center</h1>
          </div>
          <nav className="p-4 space-y-1">
            {menu.map((item) => {
              const active = props.currentPath === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block rounded-xl px-4 py-3 text-sm font-medium transition ${
                    active ? 'bg-cyan-500 text-slate-950' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              aria-label="Close menu overlay"
              onClick={() => setMobileMenuOpen(false)}
              className="absolute inset-0 bg-black/70"
            />
            <aside className="absolute left-0 top-0 h-full w-[min(20rem,88vw)] border-r border-slate-800 bg-slate-900 shadow-2xl">
              <div className="px-5 py-5 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-400">JOESTORE ADMIN</p>
                  <h1 className="text-xl font-semibold mt-2">Control Center</h1>
                </div>
                <button
                  aria-label="Close menu"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-lg border border-slate-700 p-2 text-slate-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <nav className="p-4 space-y-1 overflow-y-auto h-[calc(100%-84px)]">
                {menu.map((item) => {
                  const active = props.currentPath === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`block rounded-xl px-4 py-3 text-sm font-medium transition ${
                        active ? 'bg-cyan-500 text-slate-950' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </aside>
          </div>
        )}

        <div className="flex-1 min-w-0">
          <header className="min-h-20 border-b border-slate-800 bg-slate-900/60 backdrop-blur-sm px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setMobileMenuOpen(true)}
                  className="lg:hidden rounded-lg border border-slate-700 p-2 text-slate-300"
                  aria-label="Open admin menu"
                >
                  <Menu className="w-4 h-4" />
                </button>
                <h2 className="text-lg sm:text-xl font-semibold">{props.title}</h2>
              </div>
              <p className="text-xs text-slate-400">Realtime ecommerce operations</p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="hidden md:block rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-300">
                {props.userLabel}
              </div>
              <button
                onClick={() => void props.onSignOut()}
                className="rounded-xl bg-red-500/90 hover:bg-red-500 px-3 sm:px-4 py-2 text-sm font-semibold text-white min-h-11"
              >
                Sign Out
              </button>
            </div>
          </header>

          <main className="p-4 sm:p-6 lg:p-8">{props.children}</main>
        </div>
      </div>
    </div>
  );
}
