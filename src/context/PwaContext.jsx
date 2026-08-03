import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';

function isStandaloneMode() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

/** iPhone/iPod + iPad (anche iPadOS che si presenta come Mac). */
function detectIos() {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  // iPadOS 13+: desktop UA ma con touch
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
}

/** Safari iOS (non Chrome/Firefox/Edge su iOS). */
function detectIosSafari() {
  if (!detectIos()) return false;
  const ua = window.navigator.userAgent;
  return /Safari/i.test(ua) && !/CriOS|FxiOS|OPiOS|EdgiOS/i.test(ua);
}

const PwaContext = createContext({
  canInstall: false,
  isInstalled: false,
  isIos: false,
  isIosSafari: false,
  promptInstall: async () => false,
});

export function PwaProvider({ children }) {
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(() => isStandaloneMode());
  const [isIos] = useState(() => detectIos());
  const [isIosSafari] = useState(() => detectIosSafari());
  const deferredPromptRef = useRef(null);
  const updateToastId = useRef(null);

  useEffect(() => {
    let cancelled = false;
    let updateSW = null;

    async function register() {
      try {
        const { registerSW } = await import('virtual:pwa-register');
        updateSW = registerSW({
          immediate: true,
          onNeedRefresh() {
            if (cancelled) return;
            if (updateToastId.current) toast.dismiss(updateToastId.current);
            updateToastId.current = toast(
              (t) => (
                <div className="flex flex-col gap-2 text-sm">
                  <span>Nuova versione disponibile</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="px-3 py-1 rounded bg-blue-600 text-white text-xs font-medium"
                      onClick={() => {
                        toast.dismiss(t.id);
                        updateSW?.(true);
                      }}
                    >
                      Ricarica
                    </button>
                    <button
                      type="button"
                      className="px-3 py-1 rounded bg-gray-600 text-white text-xs"
                      onClick={() => toast.dismiss(t.id)}
                    >
                      Dopo
                    </button>
                  </div>
                </div>
              ),
              { duration: Infinity, id: 'pwa-update' }
            );
          },
          onOfflineReady() {
            if (!cancelled) {
              toast.success('App pronta anche offline', { id: 'pwa-offline' });
            }
          },
          onRegisteredSW(swUrl, registration) {
            if (registration) {
              setInterval(() => {
                registration.update().catch(() => {});
              }, 60 * 60 * 1000);
            }
            if (import.meta.env.DEV) {
              console.info('[PWA] SW registered:', swUrl);
            }
          },
        });
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn('[PWA] registerSW non disponibile:', error);
        }
      }
    }

    register();

    // Su iOS non esiste beforeinstallprompt: mostriamo comunque il CTA con istruzioni manuali.
    if (isIos && !isStandaloneMode()) {
      setCanInstall(true);
    }

    const onBeforeInstall = (e) => {
      e.preventDefault();
      deferredPromptRef.current = e;
      setCanInstall(true);
    };

    const onAppInstalled = () => {
      deferredPromptRef.current = null;
      setCanInstall(false);
      setIsInstalled(true);
      toast.success('App installata');
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onAppInstalled);

    return () => {
      cancelled = true;
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onAppInstalled);
      if (updateToastId.current) toast.dismiss(updateToastId.current);
    };
  }, [isIos]);

  const promptInstall = useCallback(async () => {
    const promptEvent = deferredPromptRef.current;
    if (promptEvent) {
      promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      deferredPromptRef.current = null;
      setCanInstall(false);
      return choice.outcome === 'accepted';
    }
    // iOS: nessun prompt nativo — il chiamante mostra le istruzioni.
    if (isIos && !isInstalled) return 'ios-manual';
    return false;
  }, [isIos, isInstalled]);

  const value = useMemo(
    () => ({ canInstall, isInstalled, isIos, isIosSafari, promptInstall }),
    [canInstall, isInstalled, isIos, isIosSafari, promptInstall]
  );

  return <PwaContext.Provider value={value}>{children}</PwaContext.Provider>;
}

export function usePwa() {
  return useContext(PwaContext);
}
