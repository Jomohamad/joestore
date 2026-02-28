import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { fetchGames } from '../services/api';
import { Game } from '../types';
import { Zap, ShieldCheck, Clock, Trophy } from 'lucide-react';

export default function Home() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadGames = async () => {
      try {
        const data = await fetchGames();
        setGames(data);
      } catch (err) {
        setError('Failed to load games. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    loadGames();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1">
      {/* Hero Section */}
      <section className="relative pt-24 pb-32 overflow-hidden">
        <div className="absolute inset-0 bg-zinc-950">
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/10 via-zinc-950 to-zinc-950"></div>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-emerald-500/20 blur-[120px] rounded-full opacity-50 pointer-events-none"></div>
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-6"
            >
              Level Up Your <span className="text-emerald-500">Gaming</span> Experience
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-lg md:text-xl text-zinc-400 mb-10 leading-relaxed"
            >
              Instant delivery, secure payments, and the best prices for your favorite game currencies. Top up now and dominate the leaderboard.
            </motion.p>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex flex-wrap items-center justify-center gap-4"
            >
              <a href="#games" className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full font-semibold transition-colors shadow-lg shadow-emerald-500/25">
                Browse Games
              </a>
              <a href="#features" className="px-8 py-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-full font-semibold transition-colors">
                Learn More
              </a>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Games Grid Section */}
      <section id="games" className="py-20 bg-zinc-950 relative">
        <div className="container mx-auto px-4">
          <div className="flex items-end justify-between mb-12">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">Popular Games</h2>
              <p className="text-zinc-400">Top up your favorite titles instantly</p>
            </div>
            <Link to="/games" className="text-emerald-500 hover:text-emerald-400 font-medium hidden sm:block">
              View All Games &rarr;
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {games.map((game, index) => (
              <motion.div
                key={game.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
              >
                <Link 
                  to={`/game/${game.id}`}
                  className="group block relative rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800 hover:border-emerald-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-500/10"
                >
                  <div className="aspect-[4/3] relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/20 to-transparent z-10"></div>
                    <img 
                      src={game.image_url} 
                      alt={game.name}
                      className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute bottom-4 left-4 z-20">
                      <span className="px-2 py-1 bg-zinc-800/80 backdrop-blur-sm text-xs font-medium text-zinc-300 rounded mb-2 inline-block">
                        {game.publisher}
                      </span>
                      <h3 className="text-xl font-bold text-white group-hover:text-emerald-400 transition-colors">
                        {game.name}
                      </h3>
                    </div>
                  </div>
                  <div className="p-4 flex items-center justify-between border-t border-zinc-800/50">
                    <span className="text-sm text-zinc-400">Top up {game.currency_name}</span>
                    <span className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center group-hover:bg-emerald-500/20 group-hover:text-emerald-500 transition-colors">
                      &rarr;
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-zinc-900 border-y border-zinc-800">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">Why Choose Us?</h2>
            <p className="text-zinc-400">We provide the best top-up experience for gamers worldwide.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: Zap, title: 'Instant Delivery', desc: 'Your game credits are delivered instantly after successful payment.' },
              { icon: ShieldCheck, title: 'Secure Payments', desc: '100% secure payment processing with multiple payment options.' },
              { icon: Trophy, title: 'Best Prices', desc: 'We offer competitive prices and regular promotional discounts.' },
              { icon: Clock, title: '24/7 Support', desc: 'Our customer support team is available around the clock to help you.' },
            ].map((feature, i) => (
              <div key={i} className="bg-zinc-950 p-6 rounded-2xl border border-zinc-800">
                <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center justify-center mb-6">
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
