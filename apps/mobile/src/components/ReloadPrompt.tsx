import { useRegisterSW } from 'virtual:pwa-register/react';

const UPDATE_CHECK_INTERVAL = 60 * 60 * 1000; // 1 ora in millisecondi

function ReloadPrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(registration) {
      if (registration) {
        // Controllo periodico degli aggiornamenti ogni ora
        setInterval(() => {
          registration.update();
        }, UPDATE_CHECK_INTERVAL);
      }
    },
    onRegisterError(error) {
      console.error('SW registration error:', error);
    },
  });

  const close = () => {
    setNeedRefresh(false);
  };

  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 animate-in slide-in-from-bottom duration-300">
      <div className="bg-indigo-600 text-white rounded-lg shadow-lg p-4">
        <p className="text-sm mb-3">
          Nuova versione disponibile!
        </p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={() => updateServiceWorker(true)}
            className="bg-white text-indigo-600 px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-50 transition-colors"
          >
            Aggiorna
          </button>
          <button
            onClick={close}
            className="text-white/80 px-4 py-2 text-sm hover:text-white transition-colors"
          >
            Dopo
          </button>
        </div>
      </div>
    </div>
  );
}

export default ReloadPrompt;
