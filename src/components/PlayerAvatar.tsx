import { useState } from 'react';

interface PlayerAvatarProps {
  playerName: string;
  size?: number;
}

// Custom avatars map: player name (lowercase) -> path in public/
const CUSTOM_AVATARS: Record<string, string> = {
  'triuh': '/avatars/triuh.png',
  'dipperq': '/avatars/dipperq.png',
};

const DEFAULT_AVATAR = '/avatars/default.png';

export function PlayerAvatar({ playerName, size = 40 }: PlayerAvatarProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const lowerName = playerName.toLowerCase();
  const customPath = CUSTOM_AVATARS[lowerName];

  // Use custom avatar if exists, otherwise use default clown avatar
  const avatarUrl = customPath || DEFAULT_AVATAR;

  const initial = playerName ? playerName.charAt(0).toUpperCase() : '?';

  return (
    <div
      className="relative shrink-0 rounded-full overflow-hidden bg-[#222] border border-gray-700"
      style={{ width: size, height: size }}
    >
      {!error ? (
        <img
          src={avatarUrl}
          alt={playerName}
          className={`w-full h-full object-cover ${loaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          loading="lazy"
        />
      ) : null}
      {(!loaded || error) && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold text-gray-500">{initial}</span>
        </div>
      )}
    </div>
  );
}
