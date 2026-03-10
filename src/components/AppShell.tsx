import { AnimatePresence, motion } from 'motion/react';
import { useRouter } from 'next/router';
import ErrorBoundary from './ErrorBoundary';
import Footer from './Footer';
import Header from './Header';
import MobileBottomNav from './MobileBottomNav';
import OrderToast from './OrderToast';
import ScrollToTop from './ScrollToTop';
import { useHapticFeedback } from '../hooks/useHapticFeedback';
import { useMobileGestures } from '../hooks/useMobileGestures';
import { useSmartPrefetch } from '../hooks/useSmartPrefetch';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = router.pathname || '/';
  const hideChrome = pathname === '/login' || pathname === '/signup' || pathname === '/complete-profile';

  useSmartPrefetch();
  useHapticFeedback(!hideChrome);
  useMobileGestures(!hideChrome);

  return (
    <div className="min-h-screen flex flex-col bg-creo-bg text-creo-text font-sans selection:bg-creo-accent/30">
      <OrderToast />
      <ErrorBoundary>
        {!hideChrome && <Header />}
        <main className="flex-1 flex flex-col pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={router.asPath || pathname}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="flex-1 flex flex-col"
            >
              <ScrollToTop />
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
        {!hideChrome && <MobileBottomNav />}
      </ErrorBoundary>
      {!hideChrome && <Footer />}
    </div>
  );
}
