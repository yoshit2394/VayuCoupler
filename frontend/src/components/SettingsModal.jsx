import React, { useState, useEffect } from 'react';
import { X, Moon, Sun, Globe, Check, Settings } from 'lucide-react';
import { t } from '../utils/i18n';

export default function SettingsModal({
  isOpen,
  onClose,
  theme,
  setTheme,
  language,
  setLanguage
}) {
  // Local draft states (only applied when user clicks "Save & Apply")
  const [draftTheme, setDraftTheme] = useState(theme);
  const [draftLanguage, setDraftLanguage] = useState(language);

  // Sync draft state whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setDraftTheme(theme);
      setDraftLanguage(language);
    }
  }, [isOpen, theme, language]);

  if (!isOpen) return null;

  const hasChanges = draftTheme !== theme || draftLanguage !== language;
  const isLight = theme === 'light'; // Modal uses current active theme until saved

  const handleSave = () => {
    // 1. Commit theme
    setTheme(draftTheme);
    localStorage.setItem('vayucoupler_theme', draftTheme);
    if (draftTheme === 'light') {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
    }

    // 2. Commit language
    setLanguage(draftLanguage);
    localStorage.setItem('vayucoupler_lang', draftLanguage);

    // 3. Close modal
    onClose();
  };

  const getCardStyle = (isSelected) => {
    if (isLight) {
      return isSelected
        ? 'bg-blue-50/90 border-2 border-blue-600 text-slate-900 shadow-md ring-2 ring-blue-500/20'
        : 'bg-slate-100/90 hover:bg-slate-200 border border-slate-300 text-slate-800 hover:border-slate-400';
    }
    return isSelected
      ? 'bg-cyan-500/15 border-2 border-cyan-400 text-white shadow-[0_0_15px_rgba(0,240,255,0.25)] ring-1 ring-cyan-400/40'
      : 'bg-[#030608]/70 hover:bg-white/5 border border-white/8 text-slate-300 hover:border-cyan-500/30';
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-[fadeIn_0.15s_ease]">
      {/* Backdrop - Cancel on click outside */}
      <div className="fixed inset-0" onClick={onClose} />

      <div className={`relative w-full max-w-md rounded-3xl p-6 flex flex-col gap-6 z-10 transition-colors duration-200 border ${
        isLight 
          ? 'bg-white text-slate-900 border-slate-200 shadow-xl shadow-slate-300/40' 
          : 'glass-pod hud-corners bg-[#090d16]/95 text-white border-cyan-500/30 shadow-[0_0_50px_rgba(0,0,0,0.9)]'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between pb-3 border-b ${isLight ? 'border-slate-200' : 'border-white/8'}`}>
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              isLight 
                ? 'bg-blue-100 text-blue-600 border border-blue-300' 
                : 'bg-cyan-500/10 text-[#00F0FF] border border-cyan-500/30 shadow-[0_0_15px_rgba(0,240,255,0.2)]'
            }`}>
              <Settings className="w-5 h-5 animate-[spin-slow_12s_linear_infinite]" />
            </div>
            <div>
              <h2 className={`text-base font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {t('settings_title', language)}
              </h2>
              <p className={`text-[11px] ${isLight ? 'text-slate-500 font-medium' : 'text-slate-400 font-mono'}`}>
                MoES Coupled Forecasting System • Preferences
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 rounded-lg transition cursor-pointer active:scale-95 ${
              isLight 
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900' 
                : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10'
            }`}
            title="Close without saving"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 1. Theme Selection */}
        <div className="flex flex-col gap-2.5">
          <label className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 font-mono ${
            isLight ? 'text-slate-700' : 'text-slate-300'
          }`}>
            <span>🎨 {t('theme_section', language)}</span>
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            {/* Dark Mode */}
            <button
              type="button"
              onClick={() => setDraftTheme('dark')}
              className={`p-3.5 rounded-2xl transition-all text-left flex flex-col gap-2.5 cursor-pointer active:scale-95 ${getCardStyle(draftTheme === 'dark')}`}
            >
              <div className="flex items-center justify-between">
                <Moon className={`w-5 h-5 ${draftTheme === 'dark' ? (isLight ? 'text-blue-600' : 'text-cyan-400') : (isLight ? 'text-slate-500' : 'text-slate-400')}`} />
                {draftTheme === 'dark' && <Check className={`w-4 h-4 font-bold ${isLight ? 'text-blue-600' : 'text-cyan-400'}`} />}
              </div>
              <div>
                <div className={`text-xs font-bold ${isLight ? (draftTheme === 'dark' ? 'text-blue-900' : 'text-slate-800') : 'text-white'}`}>
                  Dark Mode
                </div>
                <div className={`text-[10px] leading-tight mt-0.5 ${
                  isLight ? 'text-slate-600 font-medium' : 'text-slate-400'
                }`}>
                  MoES Atmospheric Midnight
                </div>
              </div>
            </button>

            {/* Light Mode */}
            <button
              type="button"
              onClick={() => setDraftTheme('light')}
              className={`p-3.5 rounded-2xl transition-all text-left flex flex-col gap-2.5 cursor-pointer active:scale-95 ${getCardStyle(draftTheme === 'light')}`}
            >
              <div className="flex items-center justify-between">
                <Sun className={`w-5 h-5 ${draftTheme === 'light' ? (isLight ? 'text-blue-600' : 'text-cyan-400') : (isLight ? 'text-slate-500' : 'text-slate-400')}`} />
                {draftTheme === 'light' && <Check className={`w-4 h-4 font-bold ${isLight ? 'text-blue-600' : 'text-cyan-400'}`} />}
              </div>
              <div>
                <div className={`text-xs font-bold ${isLight ? (draftTheme === 'light' ? 'text-blue-900' : 'text-slate-800') : 'text-white'}`}>
                  Light Mode
                </div>
                <div className={`text-[10px] leading-tight mt-0.5 ${
                  isLight ? 'text-slate-600 font-medium' : 'text-slate-400'
                }`}>
                  Clean Government Portal
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* 2. Language Selection (3 Choices) */}
        <div className="flex flex-col gap-2.5">
          <label className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 font-mono ${
            isLight ? 'text-slate-700' : 'text-slate-300'
          }`}>
            <Globe className={`w-3.5 h-3.5 ${isLight ? 'text-blue-600' : 'text-cyan-400'}`} />
            <span>{t('lang_section', language)}</span>
          </label>
          <div className="flex flex-col gap-2">
            {/* English */}
            <button
              type="button"
              onClick={() => setDraftLanguage('en')}
              className={`p-3 rounded-2xl transition-all text-left flex items-center justify-between gap-3 cursor-pointer active:scale-[0.98] ${getCardStyle(draftLanguage === 'en')}`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">🇬🇧</span>
                <div>
                  <div className={`text-xs font-bold ${isLight ? (draftLanguage === 'en' ? 'text-blue-900' : 'text-slate-900') : 'text-white'}`}>
                    English
                  </div>
                  <div className={`text-[10px] ${isLight ? 'text-slate-600 font-medium' : 'text-slate-400'}`}>
                    Strict formal English across UI, Telemetry, and AI
                  </div>
                </div>
              </div>
              {draftLanguage === 'en' && (
                <Check className={`w-4 h-4 font-bold shrink-0 ${isLight ? 'text-blue-600' : 'text-cyan-400'}`} />
              )}
            </button>

            {/* Hindi */}
            <button
              type="button"
              onClick={() => setDraftLanguage('hi')}
              className={`p-3 rounded-2xl transition-all text-left flex items-center justify-between gap-3 cursor-pointer active:scale-[0.98] ${getCardStyle(draftLanguage === 'hi')}`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">🇮🇳</span>
                <div>
                  <div className={`text-xs font-bold ${isLight ? (draftLanguage === 'hi' ? 'text-blue-900' : 'text-slate-900') : 'text-white'}`}>
                    हिन्दी (Hindi)
                  </div>
                  <div className={`text-[10px] ${isLight ? 'text-slate-600 font-medium' : 'text-slate-400'}`}>
                    संपूर्ण इंटरफ़ेस और एआई शुद्ध देवनागरी हिन्दी में
                  </div>
                </div>
              </div>
              {draftLanguage === 'hi' && (
                <Check className={`w-4 h-4 font-bold shrink-0 ${isLight ? 'text-blue-600' : 'text-emerald-400'}`} />
              )}
            </button>

            {/* Hinglish */}
            <button
              type="button"
              onClick={() => setDraftLanguage('hinglish')}
              className={`p-3 rounded-2xl transition-all text-left flex items-center justify-between gap-3 cursor-pointer active:scale-[0.98] ${getCardStyle(draftLanguage === 'hinglish')}`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">🌐</span>
                <div>
                  <div className={`text-xs font-bold ${isLight ? (draftLanguage === 'hinglish' ? 'text-blue-900' : 'text-slate-900') : 'text-white'}`}>
                    Hinglish
                  </div>
                  <div className={`text-[10px] ${isLight ? 'text-slate-600 font-medium' : 'text-slate-400'}`}>
                    Delhi NCR natural conversational blend
                  </div>
                </div>
              </div>
              {draftLanguage === 'hinglish' && (
                <Check className={`w-4 h-4 font-bold shrink-0 ${isLight ? 'text-blue-600' : 'text-cyan-400'}`} />
              )}
            </button>
          </div>
        </div>

        {/* Footer with Explicit Cancel and Save Buttons */}
        <div className={`pt-3 border-t flex items-center justify-between ${isLight ? 'border-slate-200' : 'border-white/8'}`}>
          <button
            type="button"
            onClick={onClose}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer active:scale-95 ${
              isLight 
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900' 
                : 'bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white font-mono uppercase tracking-wider'
            }`}
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            {hasChanges && (
              <span className={`text-[10px] font-mono hidden sm:inline ${
                isLight ? 'text-blue-600 font-bold' : 'text-[#00F0FF] font-bold'
              }`}>
                ● Unsaved Changes
              </span>
            )}
            <button
              type="button"
              onClick={handleSave}
              className={`px-4 py-2 rounded-xl font-bold text-xs shadow-md transition cursor-pointer active:scale-95 flex items-center gap-1.5 ${
                isLight
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20'
                  : 'bg-[#00F0FF]/20 hover:bg-[#00F0FF]/30 border border-[#00F0FF]/50 text-[#00F0FF] font-mono uppercase tracking-wider shadow-[0_0_20px_rgba(0,240,255,0.25)]'
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save &amp; Apply</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
