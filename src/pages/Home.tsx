import { MouseEvent, useEffect, useMemo, useState } from 'react';
import { fetchGames, fetchPromotions } from '../services/api';
import { Game, Promotion } from '../types';
import { useStore } from '../context/StoreContext';
import PromoCarousel from '../components/home/PromoCarousel';
import HorizontalCatalogSection from '../components/home/HorizontalCatalogSection';

export default function Home() {
  const [games, setGames] = useState<Game[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { language, t, isInWishlist, addToWishlist, removeFromWishlist } = useStore();

  const gameItems = useMemo(
    () =>
      games
        .filter((g) => g.category === 'game' && g.show_on_home !== false)
        .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
        .slice(0, 20),
    [games],
  );

  const appItems = useMemo(
    () =>
      games
        .filter((g) => g.category === 'app' && g.show_on_home !== false)
        .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
        .slice(0, 20),
    [games],
  );

  useEffect(() => {
    const loadData = async () => {
      try {
        const [gamesData, promosData] = await Promise.all([fetchGames(), fetchPromotions()]);
        setGames(gamesData);
        setPromotions(promosData);
      } catch {
        setError('Failed to load data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleToggleWishlist = (e: MouseEvent, game: Game) => {
    e.preventDefault();
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
        <div className="w-12 h-12 border-4 border-creo-accent/20 border-t-creo-accent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button onClick={() => window.location.reload()} className="px-6 py-2 bg-creo-bg-sec hover:bg-creo-border text-white rounded-lg transition-colors">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1">
      <PromoCarousel promotions={promotions} language={language} />

      <HorizontalCatalogSection
        id="games"
        title={t('popular_games')}
        items={gameItems}
        language={language}
        viewMoreTo="/games"
        viewMoreLabel="View more >>"
        onToggleWishlist={handleToggleWishlist}
        isInWishlist={(gameId) => isInWishlist(gameId)}
      />

      <HorizontalCatalogSection
        id="apps"
        title={t('popular_apps')}
        items={appItems}
        language={language}
        bordered
        viewMoreTo="/apps"
        viewMoreLabel="View more >>"
        onToggleWishlist={handleToggleWishlist}
        isInWishlist={(gameId) => isInWishlist(gameId)}
      />
    </div>
  );
}
