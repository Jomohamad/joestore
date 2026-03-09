import { MouseEvent, useEffect, useMemo, useState } from 'react';
import { fetchGames, fetchPromotions } from '../services/api';
import { Game, Promotion } from '../types';
import { useStore } from '../context/StoreContext';
import PromoCarousel from '../components/home/PromoCarousel';
import HorizontalCatalogSection from '../components/home/HorizontalCatalogSection';
import { HorizontalCardsSkeleton, SkeletonBlock } from '../components/skeletons';

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
        .sort((a, b) => a.name.localeCompare(b.name))
        .slice(0, 20),
    [games],
  );

  const appItems = useMemo(
    () =>
      games
        .filter((g) => g.category === 'app' && g.show_on_home !== false)
        .sort((a, b) => a.name.localeCompare(b.name))
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
      <div className="flex-1 bg-creo-bg">
        <section className="relative pt-4 pb-8 md:pt-8 md:pb-12">
          <div className="container mx-auto px-4">
            <SkeletonBlock className="h-[200px] sm:h-[250px] md:h-[360px] lg:h-[400px] rounded-2xl md:rounded-3xl" />
          </div>
        </section>

        <section className="py-6 md:py-8">
          <div className="container mx-auto px-4">
            <div className="mb-6 md:mb-8 flex items-center justify-between">
              <SkeletonBlock className="h-7 w-44" />
              <SkeletonBlock className="h-4 w-20" />
            </div>
            <HorizontalCardsSkeleton count={6} />
          </div>
        </section>

        <section className="py-6 md:py-8 border-t border-creo-border">
          <div className="container mx-auto px-4">
            <div className="mb-6 md:mb-8 flex items-center justify-between">
              <SkeletonBlock className="h-7 w-44" />
              <SkeletonBlock className="h-4 w-20" />
            </div>
            <HorizontalCardsSkeleton count={6} />
          </div>
        </section>
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
        viewMoreLabel="View all >>"
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
        viewMoreLabel="View all >>"
        onToggleWishlist={handleToggleWishlist}
        isInWishlist={(gameId) => isInWishlist(gameId)}
      />
    </div>
  );
}
