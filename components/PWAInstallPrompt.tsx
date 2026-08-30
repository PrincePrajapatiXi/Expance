'use client';

import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed top-16 left-4 right-4 z-40 max-w-md mx-auto bg-indigo-900 text-white rounded-2xl p-3.5 shadow-xl border border-indigo-700 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top duration-300">
      <div className="flex items-center gap-2.5">
        <div className="p-2 rounded-xl bg-white/10 text-white">
          <Smartphone className="w-5 h-5" />
        </div>
        <div>
          <h4 className="font-bold text-xs">Install Expance App</h4>
          <p className="text-[11px] text-indigo-200">Add to home screen for offline access</p>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          onClick={handleInstallClick}
          className="px-3 py-1.5 rounded-xl bg-white text-indigo-950 font-bold text-xs hover:bg-indigo-50 transition-colors flex items-center gap-1 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" /> Install
        </button>
        <button
          onClick={() => setShowPrompt(false)}
          className="p-1.5 rounded-lg text-indigo-300 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
