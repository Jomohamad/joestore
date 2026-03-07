import { useEffect, useMemo, useState } from 'react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

const DISMISS_KEY = 'joestore-pwa-install-dismissed';
const VISIT_KEY = 'joestore-pwa-visits';

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const path = window.location.pathname || '/';
    if (path.startsWith('/admin')) return;

    const dismissed = localStorage.getItem(DISMISS_KEY) === '1';
    if (dismissed) return;

    const visits = Number(localStorage.getItem(VISIT_KEY) || '0') + 1;
    localStorage.setItem(VISIT_KEY, String(visits));

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      const promptEvent = event as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      if (visits >= 2) {
        setVisible(true);
      }
    };

    const onAppInstalled = () => {
      setVisible(false);
      setDeferredPrompt(null);
      localStorage.setItem(DISMISS_KEY, '1');
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  const canRender = useMemo(() => visible && deferredPrompt, [visible, deferredPrompt]);
  if (!canRender) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-[60] w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2">
      <div className="rounded-2xl border border-creo-border bg-creo-card/95 backdrop-blur-md px-4 py-3 shadow-2xl shadow-black/40">
        <p className="text-sm font-semibold text-white">Install Joestore App</p>
        <p className="mt-1 text-xs text-creo-text-sec">Get faster access and app-like experience from your home screen.</p>

        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={async () => {
              if (!deferredPrompt) return;
              try {
                setInstalling(true);
                await deferredPrompt.prompt();
                const choice = await deferredPrompt.userChoice;
                if (choice.outcome !== 'accepted') {
                  setVisible(false);
                }
              } finally {
                setInstalling(false);
                setDeferredPrompt(null);
              }
            }}
            className="min-h-11 flex-1 rounded-xl bg-creo-accent px-4 py-2 text-sm font-bold text-black hover:bg-white transition-colors"
            aria-label="Install Joestore app"
          >
            {installing ? 'Installing...' : 'Install App'}
          </button>
          <button
            onClick={() => {
              setVisible(false);
              localStorage.setItem(DISMISS_KEY, '1');
            }}
            className="min-h-11 rounded-xl border border-creo-border bg-creo-bg-sec px-3 py-2 text-sm font-semibold text-creo-text-sec hover:text-white"
            aria-label="Dismiss install suggestion"
          >
            Later
          </button>
        </div>
      </div>
    </div>
  );
}
