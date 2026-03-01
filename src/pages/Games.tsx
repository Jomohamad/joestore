import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { fetchGames } from '../services/api';
import { Game } from '../types';
import { Search, Filter, ArrowUpDown } from 'lucide-react';
import { useStore } from '../context/StoreContext';

export default function Games() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [priceRange, setPriceRange] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('popularity');
  const { t, language } = useStore();

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
    const matchesCategory = game.category === 'game';
    const matchesSearch = 
      game.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      game.publisher.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesGenre = selectedGenre === 'all' || (game.genre || 'Action') === selectedGenre;
    
    let matchesPrice = true;
    const price = game.min_price || 0.99;
    if (priceRange === 'low') matchesPrice = price < 5;
    else if (priceRange === 'medium') matchesPrice = price >= 5 && price <= 10;
    else if (priceRange === 'high') matchesPrice = price > 10;

    return matchesCategory && matchesSearch && matchesGenre && matchesPrice;
  }).sort((a, b) => {
    if (sortBy === 'price_asc') return (a.min_price || 0) - (b.min_price || 0);
    if (sortBy === 'price_desc') return (b.min_price || 0) - (a.min_price || 0);
    // Default to popularity
    return (b.popularity || 0) - (a.popularity || 0);
  });

  const genres = ['Action', 'RPG', 'Strategy', 'Sports', 'Adventure'];

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

        {/* Filters Section */}
        <div className="mb-8 flex flex-wrap gap-4 items-center bg-creo-bg-sec/30 p-4 rounded-2xl border border-creo-border/50">
          <div className="flex items-center gap-2 text-creo-text-sec text-sm font-bold uppercase tracking-wider">
            <Filter className="w-4 h-4" />
            <span>{t('filters')}:</span>
          </div>
          
          {/* Genre Filter */}
          <select 
            value={selectedGenre}
            onChange={(e) => setSelectedGenre(e.target.value)}
            className="bg-creo-bg border border-creo-border rounded-lg px-3 py-2 text-sm text-creo-text focus:outline-none focus:border-creo-accent"
          >
            <option value="all">{t('all_genres')}</option>
            {genres.map(genre => (
              <option key={genre} value={genre}>{t(genre) || genre}</option>
            ))}
          </select>

          {/* Price Filter */}
          <select 
            value={priceRange}
            onChange={(e) => setPriceRange(e.target.value)}
            className="bg-creo-bg border border-creo-border rounded-lg px-3 py-2 text-sm text-creo-text focus:outline-none focus:border-creo-accent"
          >
            <option value="all">{t('any_price')}</option>
            <option value="low">{t('under_5')}</option>
            <option value="medium">{t('price_5_10')}</option>
            <option value="high">{t('over_10')}</option>
          </select>

          <div className="flex-1"></div>

          {/* Sort By */}
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-creo-text-sec" />
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-creo-bg border border-creo-border rounded-lg px-3 py-2 text-sm text-creo-text focus:outline-none focus:border-creo-accent"
            >
              <option value="popularity">{t('popularity')}</option>
              <option value="price_asc">{t('price_low_high')}</option>
              <option value="price_desc">{t('price_high_low')}</option>
            </select>
          </div>
        </div>

        {filteredGames.length === 0 ? (
          <div className="text-center py-20 bg-creo-bg-sec/50 rounded-2xl border border-creo-border border-dashed">
            <p className="text-creo-text-sec text-lg">{t('no_games_found')} "{searchQuery}"</p>
            <button 
              onClick={() => {
                setSearchQuery('');
                setSelectedGenre('all');
                setPriceRange('all');
              }}
              className="mt-4 text-creo-accent hover:text-white font-bold transition-colors"
            >
              {t('clear_search')}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 md:gap-4">
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
                  <div className="aspect-[3/4] relative overflow-hidden bg-creo-bg">
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
                    {game.min_price && (
                      <p className="text-[10px] text-creo-text-sec mt-1">
                        From ${game.min_price}
                      </p>
                    )}
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
