// Albion Online GameInfo API client — EUROPE SERVER ONLY
// Europe (Frankfurt): gameinfo.albiononline.com
// Docs: https://www.tools4albion.com/api_info.php

const EU_API_BASE = 'https://gameinfo.albiononline.com/api/gameinfo';
const PROXY_PATH = '/.netlify/functions/albion-proxy';

// Detect if proxy is available (Netlify Functions) or not (drag-and-drop static deploy)
let proxyAvailable: boolean | null = null;

async function apiFetch(url: string): Promise<Response> {
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

  console.log(`[AlbionAPI] Direct fetch (will likely fail CORS): ${url}`);
  return fetch(url);
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

export function extractLostItemIds(eventDetails: any): Set<string> {
  const ids = new Set<string>();

  const equipment = eventDetails?.Victim?.Equipment || {};
  for (const [, item] of Object.entries(equipment)) {
    const it = item as any;
    if (it && it.Type) {
      ids.add(it.Type);
    }
  }

  const inventory = eventDetails?.Victim?.Inventory || [];
  for (const item of inventory) {
    if (item && item.Type) {
      ids.add(item.Type);
    }
  }

  console.log(`[AlbionAPI] Extracted ${ids.size} lost item IDs:`, Array.from(ids));
  return ids;
}

function getDatePart(ts: string): string {
  return ts.trim().split(/[T ]/)[0];
}

export async function checkPlayerDeaths(
  playerName: string,
  items: { item_id: string; timestamp: string }[]
): Promise<Set<string>> {
  console.log(`\n========== [EU] CHECKING DEATHS FOR: ${playerName} ==========`);
  console.log(`[AlbionAPI] Loot items count: ${items.length}`);
  console.log(`[AlbionAPI] Loot timestamps:`, items.map(i => i.timestamp));

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

  const lootByDate = new Map<string, number[]>();
  for (const item of items) {
    const date = getDatePart(item.timestamp);
    const time = new Date(item.timestamp).getTime();
    if (isNaN(time)) continue;
    if (!lootByDate.has(date)) lootByDate.set(date, []);
    lootByDate.get(date)!.push(time);
  }

  console.log(`[AlbionAPI] Loot dates:`, Array.from(lootByDate.keys()));

  if (lootByDate.size === 0) {
    console.log(`[AlbionAPI] ABORT: No valid loot timestamps`);
    return lostItemIds;
  }

  for (const death of deaths) {
    const deathTime = new Date(death.TimeStamp).getTime();
    if (isNaN(deathTime)) continue;

    const deathDate = getDatePart(death.TimeStamp);
    const lootTimes = lootByDate.get(deathDate);

    console.log(`[AlbionAPI] Checking death at ${death.TimeStamp} (date: ${deathDate})`);

    if (!lootTimes) {
      console.log(`[AlbionAPI]   -> SKIP: No loot on this date`);
      continue;
    }

    const isRelevant = lootTimes.some((lootTime) => {
      const diffHours = (deathTime - lootTime) / 1000 / 60 / 60;
      console.log(`[AlbionAPI]   -> Loot at ${new Date(lootTime).toISOString()}, diff: ${diffHours.toFixed(2)}h`);
      return diffHours >= 0 && diffHours <= 1;
    });

    if (!isRelevant) {
      console.log(`[AlbionAPI]   -> SKIP: Death not within 1h after loot`);
      continue;
    }

    console.log(`[AlbionAPI]   -> MATCH! Fetching event details...`);
    await new Promise((r) => setTimeout(r, 300));
    const details = await getEventDetails(death.EventId);
    if (details) {
      const ids = extractLostItemIds(details);
      ids.forEach((id) => lostItemIds.add(id));
    }
  }

  console.log(`[AlbionAPI] RESULT for ${playerName}: ${lostItemIds.size} lost items`);
  console.log(`========== END ${playerName} ==========\n`);

  return lostItemIds;
}
