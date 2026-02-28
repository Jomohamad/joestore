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
        <div className="w-12 h-12 border-4 border-creo-accent/20 border-t-creo-accent rounded-full animate-spin"></div>
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
            className="px-6 py-2 bg-creo-bg-sec hover:bg-creo-border text-white rounded-lg transition-colors"
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
      <section className="relative pt-20 pb-24 md:pt-32 md:pb-40 overflow-hidden bg-creo-bg">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1200px] h-[600px] bg-creo-accent/10 blur-[100px] rounded-[100%] opacity-80 pointer-events-none"></div>
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-5xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="inline-block mb-6 px-4 py-1.5 rounded-full border border-creo-accent/30 bg-creo-accent/10 text-creo-accent text-xs md:text-sm font-bold tracking-widest uppercase"
            >
              The Ultimate Gaming Hub
            </motion.div>
            <motion.h1 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" }}
              className="text-6xl md:text-8xl lg:text-9xl font-display font-bold tracking-tighter text-white mb-6 leading-[0.9]"
            >
              LEVEL UP <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-creo-accent to-creo-accent-sec">YOUR GAME</span>
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
              className="text-lg md:text-2xl text-creo-text-sec mb-10 leading-relaxed max-w-3xl mx-auto font-light"
            >
              Instant delivery, secure payments, and the best prices for your favorite game currencies. Top up now and dominate the leaderboard.
            </motion.p>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3, ease: "easeOut" }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <button 
                onClick={() => {
                  document.getElementById('games')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="w-full sm:w-auto px-10 py-5 bg-creo-accent hover:bg-white text-black rounded-full font-bold transition-all duration-300 text-center text-lg hover:scale-105"
              >
                Browse Games
              </button>
              <button 
                onClick={() => {
                  document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="w-full sm:w-auto px-10 py-5 bg-transparent border border-creo-border hover:border-creo-accent text-white rounded-full font-bold transition-all duration-300 text-center text-lg hover:bg-creo-accent/5"
              >
                Learn More
              </button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Marquee Section */}
      <div className="py-6 bg-creo-accent overflow-hidden flex whitespace-nowrap border-y border-creo-border/20">
        <motion.div 
          animate={{ x: [0, -1000] }}
          transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
          className="flex items-center gap-12 text-black font-display font-bold text-2xl md:text-4xl uppercase tracking-wider"
        >
          <span>Instant Delivery</span>
          <span className="w-3 h-3 rounded-full bg-black"></span>
          <span>Secure Payments</span>
          <span className="w-3 h-3 rounded-full bg-black"></span>
          <span>24/7 Support</span>
          <span className="w-3 h-3 rounded-full bg-black"></span>
          <span>Best Prices</span>
          <span className="w-3 h-3 rounded-full bg-black"></span>
          <span>Instant Delivery</span>
          <span className="w-3 h-3 rounded-full bg-black"></span>
          <span>Secure Payments</span>
          <span className="w-3 h-3 rounded-full bg-black"></span>
          <span>24/7 Support</span>
          <span className="w-3 h-3 rounded-full bg-black"></span>
          <span>Best Prices</span>
        </motion.div>
      </div>

      {/* Statistics Section */}
      <section className="py-16 md:py-24 bg-creo-bg border-b border-creo-border">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 text-center">
            {[
              { value: '2M+', label: 'Active Gamers' },
              { value: '50+', label: 'Supported Games' },
              { value: '99.9%', label: 'Uptime' },
              { value: '24/7', label: 'Customer Support' }
            ].map((stat, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="flex flex-col items-center"
              >
                <div className="text-4xl md:text-6xl font-display font-bold text-white mb-2">{stat.value}</div>
                <div className="text-sm md:text-base text-creo-accent font-bold uppercase tracking-widest">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Games Grid Section */}
      <section id="games" className="py-16 md:py-20 bg-creo-bg-sec relative">
        <div className="container mx-auto px-4">
          <div className="flex items-end justify-between mb-8 md:mb-12">
            <div>
              <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-2">Popular Games</h2>
              <p className="text-sm md:text-base text-creo-text-sec">Top up your favorite titles instantly</p>
            </div>
            <Link to="/games" className="text-creo-accent hover:text-white font-bold hidden sm:block transition-colors">
              View All Games &rarr;
            </Link>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 md:gap-4">
            {games.filter(g => g.category === 'game').map((game, index) => (
              <motion.div
                key={game.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
              >
                <Link 
                  to={`/game/${game.id}`}
                  className="group block relative rounded-2xl overflow-hidden bg-creo-card border border-creo-border hover:border-creo-accent transition-all duration-300 hover:shadow-2xl hover:shadow-creo-accent/10 flex flex-col h-full"
                >
                  <div className="aspect-[3/4] relative overflow-hidden bg-creo-bg">
                    <img 
                      src={game.image_url} 
                      alt={game.name}
                      className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                    {/* Wavy/Jagged edge overlay */}
                    <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none z-10">
                      <svg className="relative block w-full h-[10px] md:h-[15px]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 10" preserveAspectRatio="none">
                        <polygon points="0,10 0,0 5,10 10,0 15,10 20,0 25,10 30,0 35,10 40,0 45,10 50,0 55,10 60,0 65,10 70,0 75,10 80,0 85,10 90,0 95,10 100,0 100,10" className="fill-creo-card" />
                      </svg>
                    </div>
                  </div>
                  <div className="p-2 md:p-3 flex flex-col items-center justify-center text-center bg-creo-card flex-1 relative z-20 -mt-1">
                    <h3 className="text-xs md:text-sm font-bold text-white group-hover:text-creo-accent transition-colors line-clamp-2">
                      {game.name}
                    </h3>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
          
          <div className="mt-8 text-center sm:hidden">
            <Link to="/games" className="inline-block px-6 py-3 bg-creo-card border border-creo-border rounded-xl text-creo-accent font-bold w-full">
              View All Games
            </Link>
          </div>
        </div>
      </section>

      {/* Apps Grid Section */}
      <section id="apps" className="py-16 md:py-20 bg-creo-bg relative border-t border-creo-border">
        <div className="container mx-auto px-4">
          <div className="flex items-end justify-between mb-8 md:mb-12">
            <div>
              <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-2">Popular Apps</h2>
              <p className="text-sm md:text-base text-creo-text-sec">Top up your favorite apps instantly</p>
            </div>
            <Link to="/apps" className="text-creo-accent hover:text-white font-bold hidden sm:block transition-colors">
              View All Apps &rarr;
            </Link>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 md:gap-4">
            {games.filter(g => g.category === 'app').map((app, index) => (
              <motion.div
                key={app.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
              >
                <Link 
                  to={`/game/${app.id}`}
                  className="group block relative rounded-2xl overflow-hidden bg-creo-card border border-creo-border hover:border-creo-accent transition-all duration-300 hover:shadow-2xl hover:shadow-creo-accent/10 flex flex-col h-full"
                >
                  <div className="aspect-[3/4] relative overflow-hidden bg-creo-bg">
                    <img 
                      src={app.image_url} 
                      alt={app.name}
                      className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                    {/* Wavy/Jagged edge overlay */}
                    <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none z-10">
                      <svg className="relative block w-full h-[10px] md:h-[15px]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 10" preserveAspectRatio="none">
                        <polygon points="0,10 0,0 5,10 10,0 15,10 20,0 25,10 30,0 35,10 40,0 45,10 50,0 55,10 60,0 65,10 70,0 75,10 80,0 85,10 90,0 95,10 100,0 100,10" className="fill-creo-card" />
                      </svg>
                    </div>
                  </div>
                  <div className="p-2 md:p-3 flex flex-col items-center justify-center text-center bg-creo-card flex-1 relative z-20 -mt-1">
                    <h3 className="text-xs md:text-sm font-bold text-white group-hover:text-creo-accent transition-colors line-clamp-2">
                      {app.name}
                    </h3>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
          
          <div className="mt-8 text-center sm:hidden">
            <Link to="/apps" className="inline-block px-6 py-3 bg-creo-card border border-creo-border rounded-xl text-creo-accent font-bold w-full">
              View All Apps
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 md:py-24 bg-creo-bg-sec border-y border-creo-border">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-12 md:mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-3 md:mb-4">Why Choose Us?</h2>
            <p className="text-sm md:text-base text-creo-text-sec">We provide the best top-up experience for gamers worldwide.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
            {[
              { icon: Zap, title: 'Instant Delivery', desc: 'Your game credits are delivered instantly after successful payment.' },
              { icon: ShieldCheck, title: 'Secure Payments', desc: '100% secure payment processing with multiple payment options.' },
              { icon: Trophy, title: 'Best Prices', desc: 'We offer competitive prices and regular promotional discounts.' },
              { icon: Clock, title: '24/7 Support', desc: 'Our customer support team is available around the clock to help you.' },
            ].map((feature, i) => (
              <div key={i} className="bg-creo-card p-5 md:p-6 rounded-2xl border border-creo-border hover:border-creo-accent/50 transition-colors">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-creo-accent/10 text-creo-accent rounded-xl flex items-center justify-center mb-4 md:mb-6">
                  <feature.icon className="w-5 h-5 md:w-6 md:h-6" />
                </div>
                <h3 className="text-base md:text-lg font-bold text-white mb-2">{feature.title}</h3>
                <p className="text-xs md:text-sm text-creo-text-sec leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
