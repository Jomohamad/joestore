import { AuthProvider } from '../context/AuthContext';
import { SsrDataProvider, type SsrDataPayload } from '../context/SsrDataContext';
import { StoreProvider } from '../context/StoreContext';

export default function AppProviders({
  children,
  ssrData,
}: {
  children: React.ReactNode;
  ssrData?: SsrDataPayload;
}) {
  return (
    <SsrDataProvider value={ssrData}>
      <AuthProvider>
        <StoreProvider>{children}</StoreProvider>
      </AuthProvider>
    </SsrDataProvider>
  );
}
