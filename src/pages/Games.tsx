import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { fetchGames } from '../services/api';
import { Game } from '../types';
import { Search, Heart } from 'lucide-react';
import { useStore } from '../context/StoreContext';

export default function Games() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { t, language, isInWishlist, addToWishlist, removeFromWishlist } = useStore();

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

  const filteredGames = games.filter(game => {
    const matchesCategory = game.category === 'game' || game.category === 'app';
    const matchesSearch = 
      game.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      game.publisher.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesCategory && matchesSearch;
  }).sort((a, b) => {
    // Default to popularity
    return (b.popularity || 0) - (a.popularity || 0);
  });

  const toggleWishlist = (e: React.MouseEvent, game: Game) => {
    e.preventDefault(); // Prevent navigation
    e.stopPropagation();
    if (isInWishlist(game.id)) {
      removeFromWishlist(game.id);
    } else {
      addToWishlist(game);
    }
  };

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
    <div className="flex-1 bg-creo-bg py-12 md:py-16">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 md:mb-12">
          <div>
            <h1 className="text-3xl md:text-5xl font-display font-bold text-white mb-2 md:mb-4">{t('all_games')}</h1>
            <p className="text-sm md:text-base text-creo-text-sec max-w-xl">
              {t('all_games_desc')}
            </p>
          </div>
          
          <div className="relative w-full md:w-80">
            <Search className={`absolute ${language === 'en' ? 'left-4' : 'right-4'} top-1/2 -translate-y-1/2 w-5 h-5 text-creo-muted`} />
            <input 
              type="text" 
              placeholder={t('search_games')} 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full bg-creo-bg-sec border border-creo-border rounded-xl py-3 ${language === 'en' ? 'pl-12 pr-4' : 'pr-12 pl-4'} text-creo-text focus:outline-none focus:ring-1 focus:ring-creo-accent focus:border-creo-accent transition-all`}
            />
          </div>
        </div>

        {filteredGames.length === 0 ? (
          <div className="text-center py-20 bg-creo-bg-sec/50 rounded-2xl border border-creo-border border-dashed">
            <p className="text-creo-text-sec text-lg">{t('no_games_found')} "{searchQuery}"</p>
            <button 
              onClick={() => {
                setSearchQuery('');
              }}
              className="mt-4 text-creo-accent hover:text-white font-bold transition-colors"
            >
              {t('clear_search')}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {filteredGames.map((game, index) => (
              <motion.div
                key={game.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
              >
                <Link 
                  to={`/game/${game.id}`}
                  className="group block relative rounded-2xl overflow-hidden bg-creo-card border border-creo-border hover:border-creo-accent transition-all duration-300 hover:shadow-[0_0_20px_rgba(255,215,0,0.15)] flex flex-col h-full"
                >
                  <div className="aspect-video relative overflow-hidden bg-creo-bg">
                    <img 
                      src={game.image_url} 
                      alt={game.name}
                      className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700 ease-out"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-creo-card via-transparent to-transparent opacity-80"></div>
                    
                    {/* Genre Badge */}
                    {game.genre && (
                      <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] uppercase font-bold text-white/80 border border-white/10">
                        {game.genre}
                      </div>
                    )}

                    {/* Wishlist Button */}
                    <button
                      onClick={(e) => toggleWishlist(e, game)}
                      className="absolute top-2 left-2 p-2 rounded-full bg-black/40 backdrop-blur-sm hover:bg-creo-accent/20 transition-colors group/btn z-20"
                    >
                      <Heart 
                        className={`w-5 h-5 transition-colors ${isInWishlist(game.id) ? 'fill-creo-accent text-creo-accent' : 'text-white group-hover/btn:text-creo-accent'}`} 
                      />
                    </button>
                  </div>
                  <div className="p-4 flex flex-col items-start justify-center bg-creo-card flex-1 relative z-20 -mt-2">
                    <h3 className="text-lg font-bold text-white group-hover:text-creo-accent transition-colors line-clamp-1">
                      {game.name}
                    </h3>
                    <div className="flex items-center justify-between w-full mt-1">
                      <p className="text-xs text-creo-text-sec">
                        {game.publisher}
                      </p>
                      {game.min_price && (
                        <p className="text-xs font-bold text-creo-accent">
                          From ${game.min_price}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
