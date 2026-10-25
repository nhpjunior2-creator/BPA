import React, { useState, useEffect } from 'react';
import { Smartphone, Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const InstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  useEffect(() => {
    // Check if dismissed before in session
    if (sessionStorage.getItem('bpa_install_dismissed') === 'true') {
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      alert('Para instalar no Android: Abra as opções do Chrome (⋮) e selecione "Instalar aplicativo" ou "Adicionar à tela inicial".');
      return;
    }
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setIsVisible(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    sessionStorage.setItem('bpa_install_dismissed', 'true');
  };

  if (!isVisible || isDismissed) return null;

  return (
    <div className="bg-gradient-to-r from-teal-800 to-teal-900 text-white p-3 rounded-2xl shadow-lg border border-teal-600/50 flex items-center justify-between gap-3 animate-fade-in my-3">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-teal-600 flex items-center justify-center shrink-0">
          <Smartphone className="w-5 h-5 text-teal-100" />
        </div>
        <div>
          <h4 className="font-bold text-xs leading-tight">Instalar App no Android</h4>
          <p className="text-[11px] text-teal-200">Acesse em tela cheia direto da tela inicial</p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={handleInstallClick}
          className="bg-white text-teal-900 hover:bg-teal-50 font-bold text-xs py-1.5 px-3 rounded-xl shadow-sm transition active:scale-95 flex items-center gap-1"
        >
          <Download className="w-3.5 h-3.5 text-teal-700" />
          <span>Instalar</span>
        </button>
        <button
          onClick={handleDismiss}
          className="text-teal-300 hover:text-white p-1 rounded-lg"
          title="Fechar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
