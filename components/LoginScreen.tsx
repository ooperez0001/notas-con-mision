import React, { useState } from 'react';
import { BookOpen, CheckCircle } from 'lucide-react';

interface LoginScreenProps {
  onLogin: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleLoginClick = () => {
    setIsLoading(true);
    // Simulamos una demora de red para dar realismo
    setTimeout(() => {
      onLogin();
      setIsLoading(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-6 animate-fade-in transition-colors">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-100 dark:border-gray-700 text-center">
        
        <div className="bg-blue-100 dark:bg-blue-900/30 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
          <BookOpen size={40} className="text-blue-600 dark:text-blue-400" />
        </div>

        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-2 tracking-tight">
          Notas con Misión
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8">
          Tu compañero inteligente para el estudio bíblico y la predicación.
        </p>

        <div className="space-y-4 mb-8 text-left">
           <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
              <CheckCircle size={20} className="text-green-500 flex-shrink-0" />
              <span className="text-sm">IA para devocionales y exégesis</span>
           </div>
           <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
              <CheckCircle size={20} className="text-green-500 flex-shrink-0" />
              <span className="text-sm">Editor de sermones avanzado</span>
           </div>
           <div className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
              <CheckCircle size={20} className="text-green-500 flex-shrink-0" />
              <span className="text-sm">Búsqueda bíblica en múltiples versiones</span>
           </div>
        </div>

        <button
          onClick={handleLoginClick}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-white font-bold py-3 px-4 rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <div className="h-5 w-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <>
               {/* Google Icon SVG */}
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  className="text-blue-500" // Usually Google colors, keeping simple here or using specific colors via style
                  style={{ color: '#4285F4' }}
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  style={{ color: '#34A853' }}
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.26.81-.58z"
                  style={{ color: '#FBBC05' }}
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  style={{ color: '#EA4335' }}
                />
              </svg>
              <span>Continuar con Google</span>
            </>
          )}
        </button>
        
        <p className="mt-6 text-xs text-gray-400 dark:text-gray-500">
          Al continuar, aceptas nuestros Términos de Servicio y Política de Privacidad.
        </p>
      </div>
    </div>
  );
};
