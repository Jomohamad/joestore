import type { GetServerSideProps } from 'next';

export default function OrderAliasPage() {
  return null;
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const id = String(context.params?.id || '').trim();
  if (!id) {
    return { notFound: true };
  }

  return {
    redirect: {
      destination: `/orders?orderId=${encodeURIComponent(id)}`,
      permanent: false,
    },
  };
};

