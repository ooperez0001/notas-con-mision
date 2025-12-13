import React, { useState } from 'react';
import { X, Check, Star, Zap, Crown, Shield } from 'lucide-react';
import { Language } from '../types';
import { translations } from '../services/translations';

interface PremiumModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  language: Language;
}

export const PremiumModal: React.FC<PremiumModalProps> = ({ isOpen, onClose, onUpgrade, language }) => {
  const [loading, setLoading] = useState(false);
  const t = translations[language];

  if (!isOpen) return null;

  const handleSubscribe = () => {
    setLoading(true);
    // Simular proceso de pago (Stripe, Google Play, etc.)
    setTimeout(() => {
      onUpgrade();
      setLoading(false);
      onClose();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-end sm:items-center p-0 sm:p-4 animate-fade-in" onClick={onClose}>
      <div 
        className="bg-white dark:bg-gray-900 w-full max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]" 
        onClick={e => e.stopPropagation()}
      >
        {/* Header con gradiente */}
        <div className="bg-gradient-to-br from-yellow-400 to-orange-500 p-6 text-center relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white bg-black/10 rounded-full p-1 transition-colors"
          >
            <X size={20} />
          </button>
          <div className="bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 backdrop-blur-md shadow-lg">
            <Crown size={32} className="text-white" fill="currentColor" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-1">{t.premium_modal_title}</h2>
          <p className="text-yellow-100 text-sm font-medium">{t.premium_modal_subtitle}</p>
        </div>

        {/* Contenido Scrollable */}
        <div className="p-6 overflow-y-auto">
          <div className="space-y-4 mb-8">
            <FeatureRow icon={<Zap className="text-yellow-500" />} text={t.feat_devotional} />
            <FeatureRow icon={<Star className="text-yellow-500" />} text={t.feat_exegesis} />
            <FeatureRow icon={<Shield className="text-yellow-500" />} text={t.feat_backup} />
            <FeatureRow icon={<Check className="text-green-500" />} text={t.feat_ads} />
          </div>

          {/* Planes */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="border-2 border-transparent bg-gray-50 dark:bg-gray-800 p-4 rounded-xl text-center hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-all opacity-60">
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">{t.plan_monthly}</span>
              <div className="text-xl font-bold text-gray-800 dark:text-white my-1">$1.99</div>
              <span className="text-[10px] text-gray-400">{t.per_month}</span>
            </div>
            
            <div className="border-2 border-yellow-500 bg-yellow-50 dark:bg-yellow-900/10 p-4 rounded-xl text-center relative cursor-pointer shadow-sm">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-yellow-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
                {t.best_value}
              </div>
              <span className="text-xs font-bold text-gray-800 dark:text-yellow-500 uppercase">{t.plan_yearly}</span>
              <div className="text-xl font-bold text-gray-900 dark:text-white my-1">$15.99</div>
              <span className="text-[10px] text-gray-500 dark:text-gray-400">{t.per_year}</span>
            </div>
          </div>

          <button 
            onClick={handleSubscribe}
            disabled={loading}
            className="w-full bg-gradient-to-r from-gray-900 to-gray-800 dark:from-yellow-500 dark:to-orange-600 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <>
                <span>{t.start_trial}</span>
                <span className="text-xs font-normal opacity-80">{t.trial_text}</span>
              </>
            )}
          </button>
          
          <p className="text-center text-[10px] text-gray-400 mt-4">
            {t.cancel_anytime}
          </p>
        </div>
      </div>
    </div>
  );
};

const FeatureRow = ({ icon, text }: { icon: React.ReactNode, text: string }) => (
  <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
    <div className="flex-shrink-0">{icon}</div>
    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{text}</span>
  </div>
);