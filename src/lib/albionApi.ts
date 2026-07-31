// Albion Online GameInfo API client — EUROPE SERVER ONLY
// Europe (Amsterdam): gameinfo-ams.albiononline.com
// (gameinfo.albiononline.com — это сервер Americas, там другие персонажи!)
// Docs: https://www.tools4albion.com/api_info.php

const EU_API_BASE = 'https://gameinfo-ams.albiononline.com/api/gameinfo';
const PROXY_PATH = '/.netlify/functions/albion-proxy';

// Detect if proxy is available (Netlify Functions) or not (drag-and-drop static deploy)
let proxyAvailable: boolean | null = null;

async function apiFetch(url: string): Promise<Response> {
  // Vite dev-сервер (npm run dev): запросы идут через server.proxy из vite.config.ts,
  // т.к. Albion API не отдаёт CORS-заголовки для браузера
  if (import.meta.env.DEV) {
    const devUrl = url.replace('https://gameinfo-ams.albiononline.com', '');
    console.log(`[AlbionAPI] Using Vite dev proxy: ${devUrl}`);
    return fetch(devUrl);
  }

  if (proxyAvailable === null) {
    try {
      const test = await fetch(`${PROXY_PATH}?url=${encodeURIComponent(url)}`, { method: 'HEAD' });
      proxyAvailable = test.status !== 404;
      console.log(`[AlbionAPI] Proxy test: ${proxyAvailable ? 'AVAILABLE' : 'NOT AVAILABLE'} (status: ${test.status})`);
    } catch (err) {
      console.log(`[AlbionAPI] Proxy test failed:`, err);
      proxyAvailable = false;
    }
  }

  if (proxyAvailable) {
    const proxyUrl = `${PROXY_PATH}?url=${encodeURIComponent(url)}`;
    console.log(`[AlbionAPI] Using proxy: ${proxyUrl}`);
    return fetch(proxyUrl);
  }

  // Без прокси прямой запрос блокируется CORS — не глотаем это молча,
  // а сообщаем, что проверка в этом режиме недоступна
  try {
    console.log(`[AlbionAPI] Direct fetch (no proxy): ${url}`);
    return await fetch(url);
  } catch {
    throw new ProxyUnavailableError();
  }
}

export interface AlbionPlayer {
  Id: string;
  Name: string;
  GuildId: string;
  GuildName: string;
  AllianceId: string;
  AllianceName: string;
  Avatar: string;
  AvatarRing: string;
  KillFame: number;
  DeathFame: number;
  FameRatio: number;
  totalKills: number;
  totalDeaths: number;
  gvgKills: number;
  gvgWins: number;
}

export interface AlbionDeath {
  EventId: number;
  TimeStamp: string;
  Version: number;
  Killer: any;
  Victim: any;
  TotalVictimKillFame: number;
  Location: string | null;
  NumberOfParticipants: number;
  GroupMemberCount: number;
}

export class ProxyUnavailableError extends Error {
  constructor() {
    super('Albion API proxy is unavailable. Deploy via Netlify CLI or GitHub to enable death checking.');
    this.name = 'ProxyUnavailableError';
  }
}

export async function searchPlayer(name: string): Promise<AlbionPlayer | null> {
  const url = `${EU_API_BASE}/search?q=${encodeURIComponent(name)}`;
  console.log(`[AlbionAPI] [EU] Searching player: "${name}"`);
  try {
    const res = await apiFetch(url);
    console.log(`[AlbionAPI] Search response status: ${res.status}`);
    if (res.status === 404) throw new ProxyUnavailableError();
    if (!res.ok) {
      console.log(`[AlbionAPI] Search failed with status ${res.status}`);
      return null;
    }
    const data = await res.json();
    const player = data.players?.find(
      (p: AlbionPlayer) => p.Name.toLowerCase() === name.toLowerCase()
    );
    if (player) {
      console.log(`[AlbionAPI] Found player: ${player.Name} (ID: ${player.Id})`);
    } else {
      console.log(`[AlbionAPI] Player "${name}" not found in search results`);
      console.log(`[AlbionAPI] Results:`, data.players?.slice(0, 5).map((p: AlbionPlayer) => p.Name));
    }
    return player || null;
  } catch (e) {
    if (e instanceof ProxyUnavailableError) throw e;
    console.error(`[AlbionAPI] Search error for "${name}":`, e);
    return null;
  }
}

export async function getPlayerDeaths(playerId: string): Promise<AlbionDeath[]> {
  const url = `${EU_API_BASE}/players/${playerId}/deaths`;
  console.log(`[AlbionAPI] [EU] Fetching deaths for player ID: ${playerId}`);
  try {
    const res = await apiFetch(url);
    if (res.status === 404) throw new ProxyUnavailableError();
    if (!res.ok) {
      console.log(`[AlbionAPI] Deaths fetch failed: ${res.status}`);
      return [];
    }
    const deaths = await res.json();
    console.log(`[AlbionAPI] Found ${deaths.length} deaths`);
    if (deaths.length > 0) {
      console.log(`[AlbionAPI] Latest death:`, deaths[0].TimeStamp);
    }
    return deaths;
  } catch (e) {
    if (e instanceof ProxyUnavailableError) throw e;
    console.error(`[AlbionAPI] Deaths error:`, e);
    return [];
  }
}

export async function getEventDetails(eventId: number): Promise<any | null> {
  const url = `${EU_API_BASE}/events/${eventId}`;
  console.log(`[AlbionAPI] [EU] Fetching event details: ${eventId}`);
  try {
    const res = await apiFetch(url);
    if (res.status === 404) throw new ProxyUnavailableError();
    if (!res.ok) return null;
    const data = await res.json();
    const eq = Object.values(data?.Victim?.Equipment || {}).filter((x: any) => x?.Type).length;
    const inv = (data?.Victim?.Inventory || []).filter((x: any) => x?.Type).length;
    console.log(`[AlbionAPI] Event ${eventId}: ${eq} equipment + ${inv} inventory items`);
    return data;
  } catch (e) {
    if (e instanceof ProxyUnavailableError) throw e;
    return null;
  }
}

// Только ИНВЕНТАРЬ жертвы: залутанное лежит в сумке.
// Equipment не смотрим — это собственная одежда игрока, она даёт ложные совпадения.
export function extractLostItemIds(eventDetails: any): Set<string> {
  const ids = new Set<string>();

  const inventory = eventDetails?.Victim?.Inventory || [];
  for (const item of inventory) {
    if (item && item.Type) {
      ids.add(item.Type);
    }
  }

  console.log(`[AlbionAPI] Extracted ${ids.size} lost item IDs (inventory only):`, Array.from(ids));
  return ids;
}

// Окно поиска смерти: от времени лута (timestamp_utc) до +1 часа
const DEATH_WINDOW_MS = 60 * 60 * 1000;

// timestamp_utc из файла может быть без таймзоны ("2026-07-29 12:00:12") —
// new Date() распарсил бы его как локальное время, поэтому явно считаем UTC
export function parseUtcMs(ts: string): number {
  if (!ts) return NaN;
  let s = ts.trim().replace(' ', 'T');
  if (!/(?:Z|[+-]\d{2}:?\d{2})$/i.test(s)) s += 'Z';
  return new Date(s).getTime();
}

export async function checkPlayerDeaths(
  playerName: string,
  items: { item_id: string; timestamp: string }[]
): Promise<Set<string>> {
  console.log(`\n========== [EU] CHECKING DEATHS FOR: ${playerName} ==========`);
  console.log(`[AlbionAPI] Loot items count: ${items.length}`);

  const lostItemIds = new Set<string>();

  const searchResult = await searchPlayer(playerName);
  if (!searchResult) {
    console.log(`[AlbionAPI] ABORT: Player "${playerName}" not found`);
    return lostItemIds;
  }

  const deaths = await getPlayerDeaths(searchResult.Id);
  if (!deaths.length) {
    console.log(`[AlbionAPI] ABORT: No deaths found for ${playerName}`);
    return lostItemIds;
  }

  const lootItems = items
    .map((it) => ({ id: it.item_id, time: parseUtcMs(it.timestamp) }))
    .filter((it) => !isNaN(it.time));

  if (!lootItems.length) {
    console.log(`[AlbionAPI] ABORT: No valid loot timestamps`);
    return lostItemIds;
  }

  for (const death of deaths) {
    const deathTime = parseUtcMs(death.TimeStamp);
    if (isNaN(deathTime)) continue;

    // Предметы, залутанные в пределах часа ДО этой смерти
    const relevant = lootItems.filter((it) => {
      const diff = deathTime - it.time;
      return diff >= 0 && diff <= DEATH_WINDOW_MS;
    });

    console.log(`[AlbionAPI] Death at ${death.TimeStamp}: ${relevant.length} loot items in window`);
    if (!relevant.length) continue;

    console.log(`[AlbionAPI]   -> MATCH! Fetching event details...`);
    await new Promise((r) => setTimeout(r, 300));
    const details = await getEventDetails(death.EventId);
    if (!details) continue;

    const droppedIds = extractLostItemIds(details);
    for (const it of relevant) {
      if (droppedIds.has(it.id)) lostItemIds.add(it.id);
    }
  }

  console.log(`[AlbionAPI] RESULT for ${playerName}: ${lostItemIds.size} lost items`);
  console.log(`========== END ${playerName} ==========\n`);

  return lostItemIds;
}
