/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import GameDetails from './pages/GameDetails';
import Games from './pages/Games';
import Support from './pages/Support';

export default function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-zinc-950 text-zinc-50 font-sans selection:bg-emerald-500/30">
        <Header />
        <main className="flex-1 flex flex-col">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/games" element={<Games />} />
            <Route path="/game/:id" element={<GameDetails />} />
            <Route path="/support" element={<Support />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}
