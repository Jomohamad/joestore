import type { GetServerSideProps } from 'next';
import { supabaseAdmin } from '../../src/lib/server/supabaseAdmin';

export default function ProductAliasPage() {
  return null;
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const productId = String(context.params?.id || '').trim();
  if (!productId) {
    return { notFound: true };
  }

  const lookup = await supabaseAdmin
    .from('products')
    .select('id, game_id')
    .eq('id', productId)
    .maybeSingle();

  if (lookup.error || !lookup.data?.game_id) {
    return { notFound: true };
  }

  return {
    redirect: {
      destination: `/game/${encodeURIComponent(String(lookup.data.game_id))}`,
      permanent: false,
    },
  };
};

