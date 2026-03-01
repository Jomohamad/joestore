import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { fetchGames } from '../services/api';
import { Game } from '../types';
import { Search } from 'lucide-react';
import { useStore } from '../context/StoreContext';

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [results, setResults] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useStore();

  useEffect(() => {
    const loadResults = async () => {
      setLoading(true);
      try {
        const data = await fetchGames();
        const filtered = data.filter(item => 
          item.name.toLowerCase().includes(query.toLowerCase()) ||
          item.publisher.toLowerCase().includes(query.toLowerCase())
        );
        setResults(filtered);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (query) {
      loadResults();
    } else {
      setResults([]);
      setLoading(false);
    }
  }, [query]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-creo-accent/20 border-t-creo-accent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-creo-bg py-12 md:py-16">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl md:text-4xl font-display font-bold text-white mb-8">
          {t('search_results').replace('{query}', query)}
        </h1>

        {results.length === 0 ? (
          <div className="text-center py-20 bg-creo-bg-sec/50 rounded-2xl border border-creo-border border-dashed">
            <p className="text-creo-text-sec text-lg">{t('no_results').replace('{query}', query)}</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 md:gap-4">
            {results.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
              >
                <Link 
                  to={`/game/${item.id}`}
                  className="group block relative rounded-2xl overflow-hidden bg-creo-card border border-creo-border hover:border-creo-accent transition-all duration-300 hover:shadow-[0_0_20px_rgba(255,215,0,0.15)] flex flex-col h-full"
                >
                  <div className="aspect-[3/4] relative overflow-hidden bg-creo-bg">
                    <img 
                      src={item.image_url} 
                      alt={item.name}
                      className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700 ease-out"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-creo-card via-transparent to-transparent opacity-80"></div>
                    
                    {/* Category Badge */}
                    <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] uppercase font-bold text-white/80 border border-white/10">
                      {item.category === 'game' ? t('games') : t('apps')}
                    </div>

                    {/* Wavy/Jagged edge overlay */}
                    <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none z-10">
                      <svg className="relative block w-full h-[10px] md:h-[15px]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 10" preserveAspectRatio="none">
                        <polygon points="0,10 0,0 5,10 10,0 15,10 20,0 25,10 30,0 35,10 40,0 45,10 50,0 55,10 60,0 65,10 70,0 75,10 80,0 85,10 90,0 95,10 100,0 100,10" className="fill-creo-card" />
                      </svg>
                    </div>
                  </div>
                  <div className="p-2 md:p-3 flex flex-col items-center justify-center text-center bg-creo-card flex-1 relative z-20 -mt-1">
                    <h3 className="text-xs md:text-sm font-bold text-white group-hover:text-creo-accent transition-colors line-clamp-2">
                      {item.name}
                    </h3>
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
