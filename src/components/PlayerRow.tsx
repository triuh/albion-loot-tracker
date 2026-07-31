import type { PlayerData } from '@/types/loot';
import { ItemIcon } from './ItemIcon';
import { PlayerAvatar } from './PlayerAvatar';
import { Crown, ExternalLink } from 'lucide-react';

interface PlayerRowProps {
  player: PlayerData;
  rank: number;
  tierFilter?: number[];
}

function getItemCategory(itemId: string): number {
  const id = itemId.toUpperCase();
  
  if (id.includes('MAIN_') || id.includes('2H_') || id.includes('OFF_')) return 0;
  if (id.includes('ARMOR_') || id.includes('CAPE')) return 1;
  if (id.includes('HEAD_')) return 2;
  if (id.includes('SHOES_')) return 3;
  if (id.includes('MOUNT_')) return 4;
  if (id.includes('MEAL_')) return 5;
  if (id.includes('POTION_')) return 6;
  return 7;
}

export function PlayerRow({ player, rank, tierFilter }: PlayerRowProps) {
  const formatValue = (v: number) => {
    if (v >= 1000000) return `${(v / 1000000).toFixed(2)}M`;
    if (v >= 1000) return `${(v / 1000).toFixed(1)}K`;
    return v.toString();
  };

  const getRankColor = (r: number) => {
    if (r === 0) return 'text-yellow-400';
    if (r === 1) return 'text-gray-300';
    if (r === 2) return 'text-amber-600';
    return 'text-gray-500';
  };

  const activeTiers = tierFilter && tierFilter.length > 0 ? tierFilter : null;

  const filteredItems = activeTiers
    ? player.items.filter(item => activeTiers.includes(item.tier))
    : player.items;

  const sortedItems = [...filteredItems].sort((a, b) => {
    const catA = getItemCategory(a.item_id);
    const catB = getItemCategory(b.item_id);
    if (catA !== catB) return catA - catB;
    if (a.isLost !== b.isLost) return a.isLost ? 1 : -1;
    return b.total_value - a.total_value;
  });

  const visibleCount = sortedItems.length;
  const hiddenCount = player.items.length - visibleCount;

  return (
    <div className="py-4 border-b border-gray-800/60">
      <div className="flex items-start gap-5">
        <div className="w-64 shrink-0 flex items-start gap-4">
          <PlayerAvatar playerName={player.player} size={64} />
          <div className="pt-1">
            <div className="flex items-center gap-1.5">
              {rank < 3 && <Crown className={`w-3.5 h-3.5 ${getRankColor(rank)}`} />}
              <a
                href={`https://murderledger-europe.albiononline2d.com/players/${encodeURIComponent(player.player)}/ledger`}
                target="_blank"
                rel="noopener noreferrer"
                className={`text-base font-bold hover:underline ${rank < 3 ? 'text-amber-400' : 'text-amber-500/80'}`}
                title="Открыть профиль на Murderledger"
              >
                {player.player}
              </a>
              <ExternalLink className="w-3 h-3 text-gray-600" />
              <span className="text-sm text-gray-500">({visibleCount}{hiddenCount > 0 ? ` / ${player.items.length}` : ''})</span>
            </div>
            {player.guild && (
              <p className="text-sm text-gray-500 mt-0.5 truncate">{player.guild}</p>
            )}
            <p className="text-sm text-emerald-500/70 mt-0.5">{formatValue(player.total_value)}</p>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          {visibleCount === 0 ? (
            <p className="text-sm text-gray-600 italic">Нет предметов выбранного тира</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {sortedItems.map((item, idx) => (
                <ItemIcon key={`${player.player}-${item.item_id}-${idx}`} item={item} size={64} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
