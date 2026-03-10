import type { ComponentProps } from 'react';
import NextLink from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useMemo } from 'react';

type LinkProps = ComponentProps<typeof NextLink> & {
  to?: string;
};

export function Link({ to, href, ...props }: LinkProps) {
  const target = (href || to || '/') as string;
  return <NextLink href={target} {...props} />;
}

export const useNavigate = () => {
  const router = useRouter();
  return (to: string | number, options?: { replace?: boolean }) => {
    if (typeof to === 'number') {
      if (to < 0) {
        router.back();
      }
      return;
    }

    if (options?.replace) {
      void router.replace(to);
      return;
    }
    void router.push(to);
  };
};

export const useLocation = () => {
  const router = useRouter();
  return useMemo(() => {
    const asPath = router.asPath || '/';
    const [path, searchHash] = asPath.split('?');
    const search = searchHash ? `?${searchHash.split('#')[0]}` : '';
    const hash = asPath.includes('#') ? `#${asPath.split('#')[1]}` : '';
    return {
      pathname: path || '/',
      search,
      hash,
    };
  }, [router.asPath]);
};

export const useParams = <T extends Record<string, string>>() => {
  const router = useRouter();
  return router.query as T;
};

export const useSearchParams = (): [URLSearchParams, (next: URLSearchParams) => void] => {
  const router = useRouter();
  const params = useMemo(() => {
    const query = router.asPath.split('?')[1] || '';
    return new URLSearchParams(query);
  }, [router.asPath]);

  const setSearchParams = (next: URLSearchParams) => {
    const queryString = next.toString();
    const href = queryString ? `${router.pathname}?${queryString}` : router.pathname;
    void router.replace(href);
  };

  return [params, setSearchParams];
};

export function Navigate({ to, replace = false }: { to: string; replace?: boolean }) {
  const navigate = useNavigate();

  useEffect(() => {
    navigate(to, { replace });
  }, [navigate, replace, to]);

  return null;
}
