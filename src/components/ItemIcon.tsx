import { useState } from 'react';
import type { LootItem } from '@/types/loot';
import { useI18n } from '@/hooks/useI18n';
import { Check, X, AlertTriangle } from 'lucide-react';

interface ItemIconProps {
  item: LootItem;
  size?: number;
  showTooltip?: boolean;
}

function getItemIconUrl(itemId: string): string {
  return `https://render.albiononline.com/v1/item/${itemId}.png?size=64`;
}

export function ItemIcon({ item, size = 64, showTooltip = true }: ItemIconProps) {
  const { t } = useI18n();
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const imgUrl = getItemIconUrl(item.item_id);
  const initial = item.item_name ? item.item_name.charAt(0).toUpperCase() : '?';

  // Deposit status indicator
  let depositBadge = null;
  if (item.depositedCount > 0 && item.depositedCount >= item.quantity) {
    depositBadge = (
      <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-emerald-600 rounded-full flex items-center justify-center border border-black">
        <Check className="w-3 h-3 text-white" strokeWidth={3} />
      </div>
    );
  } else if (item.depositedCount > 0) {
    depositBadge = (
      <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center border border-black">
        <AlertTriangle className="w-3 h-3 text-black" strokeWidth={3} />
      </div>
    );
  } else if (item.depositedCount === 0) {
    depositBadge = (
      <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-600 rounded-full flex items-center justify-center border border-black">
        <X className="w-3 h-3 text-white" strokeWidth={3} />
      </div>
    );
  }

  return (
    <div
      className="relative group inline-block"
      style={{ width: size, height: size }}
    >
      <div
        className={`w-full h-full rounded-md overflow-hidden bg-[#1a1a1a] transition-transform group-hover:scale-110 ${item.isLost ? 'grayscale opacity-50' : ''}`}
      >
        {!error ? (
          <img
            src={imgUrl}
            alt={item.item_name}
            className={`w-full h-full object-cover ${loaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setLoaded(true)}
            onError={() => setError(true)}
            loading="lazy"
          />
        ) : null}
        {(!loaded || error) && (
          <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-gray-400 bg-[#1a1a1a]">
            {initial}
          </div>
        )}
      </div>

      {/* Quantity badge */}
      {item.quantity > 1 && (
        <div className="absolute -bottom-1.5 -right-1.5 bg-black/90 text-white text-xs font-bold px-1.5 py-0.5 rounded border border-gray-700 leading-none min-w-[20px] text-center">
          {item.quantity}
        </div>
      )}

      {/* Deposit status badge */}
      {depositBadge}

      {/* Hover tooltip */}
      {showTooltip && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
          <div className="bg-[#1e1e1e] border border-gray-700 rounded px-3 py-2 whitespace-nowrap shadow-2xl">
            <p className="text-sm font-medium text-gray-200">{item.item_name}</p>
            {item.tier > 0 && (
              <p className="text-xs text-amber-400">Tier {item.tier}</p>
            )}
            {item.isLost && (
              <p className="text-xs text-red-400">{t('lost')}</p>
            )}
            <p className="text-xs text-gray-400">
              {item.quantity > 1 ? `${item.quantity}x ` : ''}
              {item.total_value.toLocaleString()} {t('silver')}
            </p>
            {item.depositedCount > 0 ? (
              <p className="text-xs text-emerald-400">
                {t('deposited')}: {item.depositedCount}/{item.quantity}
              </p>
            ) : (
              <p className="text-xs text-red-400">{t('not_deposited')}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
