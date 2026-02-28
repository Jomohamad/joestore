import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { fetchGames } from '../services/api';
import { Game } from '../types';
import { Zap, ShieldCheck, Clock, Trophy, ShoppingCart } from 'lucide-react';
import { useStore } from '../context/StoreContext';

export default function Home() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { t } = useStore();

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
          {/* Gaming Grid Pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-5xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="inline-block mb-6 px-4 py-1.5 rounded-full border border-creo-accent/30 bg-creo-accent/10 text-creo-accent text-xs md:text-sm font-bold tracking-widest uppercase shadow-[0_0_15px_rgba(255,215,0,0.2)]"
            >
              {t('hero_badge')}
            </motion.div>
            <motion.h1 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" }}
              className="text-6xl md:text-8xl lg:text-9xl font-display font-bold tracking-tighter text-white mb-6 leading-[0.9]"
            >
              {t('hero_title_1')} <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-creo-accent to-creo-accent-sec drop-shadow-sm">{t('hero_title_2')}</span>
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
              className="text-lg md:text-2xl text-creo-text-sec mb-10 leading-relaxed max-w-3xl mx-auto font-light"
            >
              {t('hero_desc')}
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
                className="w-full sm:w-auto px-10 py-5 bg-gradient-to-r from-creo-accent to-creo-accent-sec hover:from-white hover:to-white text-black rounded-full font-bold transition-all duration-300 text-center text-lg hover:scale-105 shadow-[0_0_20px_rgba(255,215,0,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.5)]"
              >
                {t('browse_games')}
              </button>
              <button 
                onClick={() => {
                  document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="w-full sm:w-auto px-10 py-5 bg-transparent border border-creo-border hover:border-creo-accent text-white rounded-full font-bold transition-all duration-300 text-center text-lg hover:bg-creo-accent/5"
              >
                {t('learn_more')}
              </button>
            </motion.div>
          </div>
        </div>

        {/* Marquee */}
        <div className="absolute bottom-0 left-0 w-full overflow-hidden border-y border-creo-border bg-creo-bg-sec/50 backdrop-blur-sm py-3">
          <div className="flex whitespace-nowrap animate-marquee-slow">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-8 px-4">
                <span className="text-creo-text-sec font-display font-bold tracking-widest uppercase text-sm flex items-center gap-2">
                  <Zap className="w-4 h-4 text-creo-accent" /> {t('feat_instant')}
                </span>
                <span className="text-creo-border text-xl">•</span>
                <span className="text-creo-text-sec font-display font-bold tracking-widest uppercase text-sm flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-creo-accent" /> {t('feat_secure')}
                </span>
                <span className="text-creo-border text-xl">•</span>
                <span className="text-creo-text-sec font-display font-bold tracking-widest uppercase text-sm flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-creo-accent" /> {t('feat_prices')}
                </span>
                <span className="text-creo-border text-xl">•</span>
                <span className="text-creo-text-sec font-display font-bold tracking-widest uppercase text-sm flex items-center gap-2">
                  <Clock className="w-4 h-4 text-creo-accent" /> {t('feat_support')}
                </span>
                <span className="text-creo-border text-xl">•</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Games Grid Section */}
      <section id="games" className="py-16 md:py-20 bg-creo-bg-sec relative">
        <div className="container mx-auto px-4">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="flex items-end justify-between mb-8 md:mb-12"
          >
            <div>
              <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-2">{t('popular_games')}</h2>
              <p className="text-sm md:text-base text-creo-text-sec">{t('popular_games_desc')}</p>
            </div>
            <Link to="/games" className="text-creo-accent hover:text-white font-bold hidden sm:block transition-colors">
              {t('view_all')} &rarr;
            </Link>
          </motion.div>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 md:gap-4">
            {games.filter(g => g.category === 'game').map((game, index) => (
              <motion.div
                key={game.id}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: index * 0.05, ease: "easeOut" }}
              >
                <Link 
                  to={`/game/${game.id}`}
                  className="group block relative rounded-2xl overflow-hidden bg-creo-card border border-creo-border hover:border-creo-accent transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(255,215,0,0.15)] flex flex-col h-full"
                >
                  <div className="aspect-[3/4] relative overflow-hidden bg-creo-bg">
                    <img 
                      src={game.image_url} 
                      alt={game.name}
                      className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500 ease-out"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-creo-card via-black/40 to-transparent opacity-60 group-hover:opacity-40 transition-opacity"></div>
                    
                    {/* Hover Overlay with Action */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/20 backdrop-blur-[2px] z-10">
                      <div className="w-10 h-10 md:w-12 md:h-12 bg-creo-accent rounded-full flex items-center justify-center shadow-lg transform scale-50 group-hover:scale-100 transition-transform duration-300">
                        <ShoppingCart className="w-5 h-5 md:w-6 md:h-6 text-black" />
                      </div>
                    </div>

                    {/* Wavy/Jagged edge overlay */}
                    <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none z-20 pointer-events-none">
                      <svg className="relative block w-full h-[10px] md:h-[15px]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 10" preserveAspectRatio="none">
                        <polygon points="0,10 0,0 5,10 10,0 15,10 20,0 25,10 30,0 35,10 40,0 45,10 50,0 55,10 60,0 65,10 70,0 75,10 80,0 85,10 90,0 95,10 100,0 100,10" className="fill-creo-card" />
                      </svg>
                    </div>
                  </div>
                  <div className="p-3 md:p-4 flex flex-col items-center justify-center text-center bg-creo-card flex-1 relative z-20 -mt-1 border-t border-creo-border/50">
                    <h3 className="text-sm md:text-base font-bold text-white group-hover:text-creo-accent transition-colors line-clamp-1 mb-1">
                      {game.name}
                    </h3>
                    <p className="text-xs text-creo-text-sec group-hover:text-white/80 transition-colors">
                      {game.currency_name}
                    </p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
          
          <div className="mt-8 text-center sm:hidden">
            <Link to="/games" className="inline-block px-6 py-3 bg-creo-card border border-creo-border rounded-xl text-creo-accent font-bold w-full">
              {t('view_all')}
            </Link>
          </div>
        </div>
      </section>

      {/* Apps Grid Section */}
      <section id="apps" className="py-16 md:py-20 bg-creo-bg relative border-t border-creo-border">
        <div className="container mx-auto px-4">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="flex items-end justify-between mb-8 md:mb-12"
          >
            <div>
              <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-2">{t('popular_apps')}</h2>
              <p className="text-sm md:text-base text-creo-text-sec">{t('popular_apps_desc')}</p>
            </div>
            <Link to="/apps" className="text-creo-accent hover:text-white font-bold hidden sm:block transition-colors">
              {t('view_all')} &rarr;
            </Link>
          </motion.div>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 md:gap-4">
            {games.filter(g => g.category === 'app').map((app, index) => (
              <motion.div
                key={app.id}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: index * 0.05, ease: "easeOut" }}
              >
                <Link 
                  to={`/game/${app.id}`}
                  className="group block relative rounded-2xl overflow-hidden bg-creo-card border border-creo-border hover:border-creo-accent transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(255,215,0,0.15)] flex flex-col h-full"
                >
                  <div className="aspect-[3/4] relative overflow-hidden bg-creo-bg">
                    <img 
                      src={app.image_url} 
                      alt={app.name}
                      className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500 ease-out"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-creo-card via-black/40 to-transparent opacity-60 group-hover:opacity-40 transition-opacity"></div>
                    
                    {/* Hover Overlay with Action */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/20 backdrop-blur-[2px] z-10">
                      <div className="w-10 h-10 md:w-12 md:h-12 bg-creo-accent rounded-full flex items-center justify-center shadow-lg transform scale-50 group-hover:scale-100 transition-transform duration-300">
                        <ShoppingCart className="w-5 h-5 md:w-6 md:h-6 text-black" />
                      </div>
                    </div>

                    {/* Wavy/Jagged edge overlay */}
                    <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none z-20 pointer-events-none">
                      <svg className="relative block w-full h-[10px] md:h-[15px]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 10" preserveAspectRatio="none">
                        <polygon points="0,10 0,0 5,10 10,0 15,10 20,0 25,10 30,0 35,10 40,0 45,10 50,0 55,10 60,0 65,10 70,0 75,10 80,0 85,10 90,0 95,10 100,0 100,10" className="fill-creo-card" />
                      </svg>
                    </div>
                  </div>
                  <div className="p-3 md:p-4 flex flex-col items-center justify-center text-center bg-creo-card flex-1 relative z-20 -mt-1 border-t border-creo-border/50">
                    <h3 className="text-sm md:text-base font-bold text-white group-hover:text-creo-accent transition-colors line-clamp-1 mb-1">
                      {app.name}
                    </h3>
                    <p className="text-xs text-creo-text-sec group-hover:text-white/80 transition-colors">
                      {app.currency_name}
                    </p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
          
          <div className="mt-8 text-center sm:hidden">
            <Link to="/apps" className="inline-block px-6 py-3 bg-creo-card border border-creo-border rounded-xl text-creo-accent font-bold w-full">
              {t('view_all')}
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 md:py-24 bg-creo-bg-sec border-y border-creo-border relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-creo-accent/5 blur-[100px] rounded-full pointer-events-none"></div>
        <div className="container mx-auto px-4 relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="text-center max-w-2xl mx-auto mb-12 md:mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-3 md:mb-4">{t('features_title')}</h2>
            <p className="text-sm md:text-base text-creo-text-sec">{t('features_desc')}</p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
            {[
              { icon: Zap, title: t('feat_instant'), desc: t('feat_instant_desc') },
              { icon: ShieldCheck, title: t('feat_secure'), desc: t('feat_secure_desc') },
              { icon: Trophy, title: t('feat_prices'), desc: t('feat_prices_desc') },
              { icon: Clock, title: t('feat_support'), desc: t('feat_support_desc') },
            ].map((feature, i) => (
              <motion.div 
                key={i} 
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.5, delay: i * 0.1, ease: "easeOut" }}
                className="bg-creo-card p-5 md:p-6 rounded-2xl border border-creo-border hover:border-creo-accent/50 transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_10px_30px_rgba(255,215,0,0.1)]"
              >
                <div className="w-10 h-10 md:w-12 md:h-12 bg-creo-accent/10 text-creo-accent rounded-xl flex items-center justify-center mb-4 md:mb-6 shadow-[inset_0_0_10px_rgba(255,215,0,0.2)]">
                  <feature.icon className="w-5 h-5 md:w-6 md:h-6" />
                </div>
                <h3 className="text-base md:text-lg font-bold text-white mb-2">{feature.title}</h3>
                <p className="text-xs md:text-sm text-creo-text-sec leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
