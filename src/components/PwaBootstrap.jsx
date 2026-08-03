import { Toaster } from 'react-hot-toast';

/**
 * Toaster globale. Registrazione SW / push vivono nei provider.
 */
export function PwaBootstrap() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        className: 'text-sm',
        style: {
          background: '#0f172a',
          color: '#e2e8f0',
          border: '1px solid rgba(59,130,246,0.35)',
        },
      }}
    />
  );
}
