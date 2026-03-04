/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { StoreProvider } from './context/StoreContext';
import { AuthProvider } from './context/AuthContext';
import Header from './components/Header';
import ErrorBoundary from './components/ErrorBoundary';
import OrderToast from './components/OrderToast';
import Footer from './components/Footer';
// footer removed per design
// import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
import Home from './pages/Home';

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

function RouteLoader() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[40vh]">
      <div className="w-10 h-10 border-4 border-creo-accent/20 border-t-creo-accent rounded-full animate-spin" />
    </div>
  );
}

function AppShell() {
  const location = useLocation();
  const hideChrome = location.pathname === '/login' || location.pathname === '/signup' || location.pathname === '/complete-profile';

  return (
    <div className="min-h-screen flex flex-col bg-creo-bg text-creo-text font-sans selection:bg-creo-accent/30">
      <OrderToast />
      <ErrorBoundary>
        {!hideChrome && <Header />}
        <main className="flex-1 flex flex-col">
          <Suspense fallback={<RouteLoader />}>
            <Routes>
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
              <Route path="/games" element={<GamesCatalog />} />
              <Route path="/apps" element={<AppsCatalog />} />
              <Route path="/dashboard" element={<Dashboard />} />
            </Routes>
          </Suspense>
        </main>
      </ErrorBoundary>
      {!hideChrome && <Footer />}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <StoreProvider>
        <Router>
          <ScrollToTop />
          <AppShell />
        </Router>
      </StoreProvider>
    </AuthProvider>
  );
}
