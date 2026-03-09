/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, StaticRouter, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { StoreProvider } from './context/StoreContext';
import { AuthProvider } from './context/AuthContext';
import { SsrDataPayload, SsrDataProvider } from './context/SsrDataContext';
import Header from './components/Header';
import MobileBottomNav from './components/MobileBottomNav';
import ErrorBoundary from './components/ErrorBoundary';
import OrderToast from './components/OrderToast';
import Footer from './components/Footer';
// footer removed per design
// import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
import Home from './pages/Home';
import { useHapticFeedback } from './hooks/useHapticFeedback';
import { useMobileGestures } from './hooks/useMobileGestures';
import { useSmartPrefetch } from './hooks/useSmartPrefetch';

const GameDetails = lazy(() => import('./pages/GameDetails'));
const EditProfile = lazy(() => import('./pages/EditProfile'));
const CompleteProfile = lazy(() => import('./pages/CompleteProfile'));
const Support = lazy(() => import('./pages/Support'));
const FAQ = lazy(() => import('./pages/FAQ'));
const PaymentMethods = lazy(() => import('./pages/PaymentMethods'));
const Terms = lazy(() => import('./pages/Terms'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Refund = lazy(() => import('./pages/Refund'));
const Cart = lazy(() => import('./pages/Cart'));
const Login = lazy(() => import('./pages/Login'));
const SignUp = lazy(() => import('./pages/SignUp'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const Wishlist = lazy(() => import('./pages/Wishlist'));
const WhyChooseUs = lazy(() => import('./pages/WhyChooseUs'));
const Orders = lazy(() => import('./pages/Orders'));
const GamesCatalog = lazy(() => import('./pages/GamesCatalog'));
const AppsCatalog = lazy(() => import('./pages/AppsCatalog'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const PaymentCallback = lazy(() => import('./pages/PaymentCallback'));

function RouteLoader() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[40vh]">
      <div className="w-10 h-10 border-4 border-creo-accent/20 border-t-creo-accent rounded-full animate-spin" />
    </div>
  );
}

function AppShell() {
  const location = useLocation();
  useSmartPrefetch();
  const hideChrome = location.pathname === '/login' || location.pathname === '/signup' || location.pathname === '/complete-profile';
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
              key={`${location.pathname}${location.search}`}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="flex-1 flex flex-col"
            >
              <Suspense fallback={<RouteLoader />}>
                <Routes location={location}>
                  <Route path="/" element={<Home />} />

                  <Route path="/game/:id" element={<GameDetails />} />
                  <Route path="/edit-profile" element={<EditProfile />} />
                  <Route path="/complete-profile" element={<CompleteProfile />} />
                  <Route path="/support" element={<Support />} />
                  <Route path="/contact" element={<Support />} />
                  <Route path="/faq" element={<FAQ />} />
                  <Route path="/payment-methods" element={<PaymentMethods />} />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/privacy" element={<Privacy />} />
                  <Route path="/refund" element={<Refund />} />
                  <Route path="/cart" element={<Cart />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<SignUp />} />
                  <Route path="/search" element={<SearchPage />} />
                  <Route path="/wishlist" element={<Wishlist />} />
                  <Route path="/why-choose-us" element={<WhyChooseUs />} />
                  <Route path="/orders" element={<Orders />} />
                  <Route path="/payment/callback/:provider" element={<PaymentCallback />} />
                  <Route path="/games" element={<GamesCatalog />} />
                  <Route path="/apps" element={<AppsCatalog />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                </Routes>
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </main>
        {!hideChrome && <MobileBottomNav />}
      </ErrorBoundary>
      {!hideChrome && <Footer />}
    </div>
  );
}

function AppProviders({ children, ssrData }: { children: React.ReactNode; ssrData?: SsrDataPayload }) {
  return (
    <SsrDataProvider value={ssrData}>
      <AuthProvider>
        <StoreProvider>{children}</StoreProvider>
      </AuthProvider>
    </SsrDataProvider>
  );
}

export default function App() {
  return (
    <AppProviders>
      <Router>
        <ScrollToTop />
        <AppShell />
      </Router>
    </AppProviders>
  );
}

export function ServerRenderedApp({
  ssrLocation,
  ssrData,
}: {
  ssrLocation: string;
  ssrData?: SsrDataPayload;
}) {
  const isServer = typeof window === 'undefined';

  return (
    <AppProviders ssrData={ssrData}>
      {isServer ? (
        <StaticRouter location={ssrLocation}>
          <ScrollToTop />
          <AppShell />
        </StaticRouter>
      ) : (
        <Router>
          <ScrollToTop />
          <AppShell />
        </Router>
      )}
    </AppProviders>
  );
}
