import { useState } from 'react';
import { useI18n } from '@/hooks/useI18n';
import { Heart } from 'lucide-react';

export function DonateButton() {
  const { t } = useI18n();
  const [showPopup, setShowPopup] = useState(false);

  return (
    <div className="relative">
      <button
        className="flex items-center gap-1.5 bg-[#1a1a1a] border border-gray-700 rounded-lg px-3 py-1.5 hover:bg-[#222] transition-colors"
        onMouseEnter={() => setShowPopup(true)}
        onMouseLeave={() => setShowPopup(false)}
        onClick={() => setShowPopup(!showPopup)}
      >
        <Heart className="w-4 h-4 text-red-500" />
        <span className="text-xs text-gray-300 hidden sm:inline">{t('support_dev')}</span>
      </button>

      {showPopup && (
        <div
          className="absolute right-0 top-full mt-2 z-50"
          onMouseEnter={() => setShowPopup(true)}
          onMouseLeave={() => setShowPopup(false)}
        >
          <div className="bg-[#1a1a1a] border border-gray-700 rounded-lg p-4 shadow-2xl w-64">
            <p className="text-sm font-medium text-gray-200 text-center mb-2">
              {t('support_dev')}
            </p>
            <p className="text-xs text-gray-500 text-center mb-3">
              {t('support_text')}
            </p>
            <img
              src="/donate-qr-header.png"
              alt="Donate QR"
              className="w-full h-auto rounded"
            />
          </div>
        </div>
      )}
    </div>
  );
}
