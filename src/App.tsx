/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { StoreProvider } from './context/StoreContext';
import { AuthProvider } from './context/AuthContext';
import Header from './components/Header';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
import Home from './pages/Home';
import GameDetails from './pages/GameDetails';

import Support from './pages/Support';
import Contact from './pages/Contact';
import FAQ from './pages/FAQ';
import PaymentMethods from './pages/PaymentMethods';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import Refund from './pages/Refund';
import Cart from './pages/Cart';
import Login from './pages/Login';
import SearchPage from './pages/SearchPage';
import Wishlist from './pages/Wishlist';

export default function App() {
  return (
    <AuthProvider>
      <StoreProvider>
        <Router>
          <ScrollToTop />
          <div className="min-h-screen flex flex-col bg-creo-bg text-creo-text font-sans selection:bg-creo-accent/30">
            <Header />
            <main className="flex-1 flex flex-col">
              <Routes>
                <Route path="/" element={<Home />} />

                <Route path="/game/:id" element={<GameDetails />} />
                <Route path="/support" element={<Support />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/faq" element={<FAQ />} />
                <Route path="/payment-methods" element={<PaymentMethods />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/refund" element={<Refund />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/login" element={<Login />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/wishlist" element={<Wishlist />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </Router>
      </StoreProvider>
    </AuthProvider>
  );
}
