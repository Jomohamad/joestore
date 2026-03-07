import type { GetServerSideProps, InferGetServerSidePropsType } from 'next';
import { ServerRenderedApp } from '../src/App';

type Props = {
  ssrLocation: string;
};

export default function OrdersSsrPage({ ssrLocation }: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return <ServerRenderedApp ssrLocation={ssrLocation} />;
}

export const getServerSideProps: GetServerSideProps<Props> = async (context) => {
  // Orders are user-specific; do not allow shared CDN caching.
  context.res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  context.res.setHeader('Vercel-CDN-Cache-Control', 'private, no-store');

  return {
    props: {
      ssrLocation: '/orders',
    },
  };
};

