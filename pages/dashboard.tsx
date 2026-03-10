import type { GetServerSideProps } from 'next';
import Dashboard from '../src/pages/Dashboard';

export default function Page() {
  return <Dashboard />;
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  context.res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  context.res.setHeader('Vercel-CDN-Cache-Control', 'private, no-store');
  return { props: {} };
};

