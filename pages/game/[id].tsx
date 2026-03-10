import type { GetServerSideProps } from 'next';
import GameDetails from '../../src/pages/GameDetails';
import { ordersService } from '../../src/lib/server/services/orders';
import type { SsrDataPayload } from '../../src/context/SsrDataContext';

type Props = {
  initialGame?: Record<string, unknown> | null;
  initialPackages?: Array<Record<string, unknown>>;
  initialGameIdentifier?: string;
  ssrData?: SsrDataPayload;
};

export default function Page({ initialGame, initialPackages, initialGameIdentifier }: Props) {
  return (
    <GameDetails
      initialGame={initialGame as any}
      initialPackages={initialPackages as any}
      initialGameIdentifier={initialGameIdentifier}
    />
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async (context) => {
  const identifier = String(context.params?.id || '').trim();
  if (!identifier) return { notFound: true };

  try {
    const [game, { packages }] = await Promise.all([
      ordersService.getGameByIdentifier(identifier),
      ordersService.listPackagesForGame(identifier),
    ]);

    const gameId = String((game as Record<string, unknown>).id || '').trim();
    const slug = String((game as Record<string, unknown>).slug || '').trim();

    const payload = {
      game,
      packages: packages || [],
    };

    const gameDetails: Record<string, typeof payload> = {
      [identifier]: payload,
    };

    if (gameId) gameDetails[gameId] = payload;
    if (slug) gameDetails[slug] = payload;

    context.res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=120, stale-while-revalidate=600');
    context.res.setHeader('Vercel-CDN-Cache-Control', 'public, s-maxage=120, stale-while-revalidate=600');

    return {
      props: {
        initialGame: game as Record<string, unknown>,
        initialPackages: packages as Array<Record<string, unknown>>,
        initialGameIdentifier: identifier,
        ssrData: {
          gameDetails,
        },
      },
    };
  } catch {
    return { notFound: true };
  }
};
