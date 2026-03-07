import type { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import { ServerRenderedApp } from '../../src/App';
import { ordersService } from '../../src/lib/server/services/orders';
import type { SsrDataPayload } from '../../src/context/SsrDataContext';

type Props = {
  ssrLocation: string;
  ssrData: SsrDataPayload;
};

export default function GameSsrPage({ ssrLocation, ssrData }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return <ServerRenderedApp ssrLocation={ssrLocation} ssrData={ssrData} />;
}

export const getServerSideProps: GetServerSideProps<Props> = async (context) => {
  const identifier = String(context.params?.id || '').trim();
  if (!identifier) {
    return { notFound: true };
  }

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
        ssrLocation: `/game/${encodeURIComponent(identifier)}`,
        ssrData: {
          gameDetails,
        },
      },
    };
  } catch {
    return { notFound: true };
  }
};

