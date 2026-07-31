// Albion Online GameInfo API client (via Netlify Function proxy)
// Docs: https://www.tools4albion.com/api_info.php

const API_BASE = 'https://gameinfo.albiononline.com/api/gameinfo';
const PROXY_PATH = '/.netlify/functions/albion-proxy';

// Detect if proxy is available (Netlify Functions) or not (drag-and-drop static deploy)
let proxyAvailable: boolean | null = null;

async function apiFetch(url: string): Promise<Response> {
  // If proxy hasn't been tested yet, try it first
  if (proxyAvailable === null) {
    try {
      const test = await fetch(`${PROXY_PATH}?url=${encodeURIComponent(url)}`, { method: 'HEAD' });
      proxyAvailable = test.status !== 404;
    } catch {
      proxyAvailable = false;
    }
  }

  if (proxyAvailable) {
    return fetch(`${PROXY_PATH}?url=${encodeURIComponent(url)}`);
  }

  // Fallback: direct fetch (will likely fail due to CORS in browser)
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
    super('Albion API proxy is unavailable. Deploy via Netlify CLI to enable death checking.');
    this.name = 'ProxyUnavailableError';
  }
}

export async function searchPlayer(name: string): Promise<AlbionPlayer | null> {
  try {
    const res = await apiFetch(`${API_BASE}/search?q=${encodeURIComponent(name)}`);
    if (res.status === 404) throw new ProxyUnavailableError();
    if (!res.ok) return null;
    const data = await res.json();
    const player = data.players?.find(
      (p: AlbionPlayer) => p.Name.toLowerCase() === name.toLowerCase()
    );
    return player || null;
  } catch (e) {
    if (e instanceof ProxyUnavailableError) throw e;
    return null;
  }
}

export async function getPlayerDeaths(playerId: string): Promise<AlbionDeath[]> {
  try {
    const res = await apiFetch(`${API_BASE}/players/${playerId}/deaths`);
    if (res.status === 404) throw new ProxyUnavailableError();
    if (!res.ok) return [];
    return await res.json();
  } catch (e) {
    if (e instanceof ProxyUnavailableError) throw e;
    return [];
  }
}

export async function getEventDetails(eventId: number): Promise<any | null> {
  try {
    const res = await apiFetch(`${API_BASE}/events/${eventId}`);
    if (res.status === 404) throw new ProxyUnavailableError();
    if (!res.ok) return null;
    return await res.json();
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

  return ids;
}

// Extract YYYY-MM-DD from ISO timestamp
function getDatePart(ts: string): string {
  return ts.trim().split(/[T ]/)[0];
}

// Check deaths that happened within 1 hour after looting,
// matching by the SAME DATE as the loot (works even if checked a week later)
export async function checkPlayerDeaths(
  playerName: string,
  items: { item_id: string; timestamp: string }[]
): Promise<Set<string>> {
  const lostItemIds = new Set<string>();

  const searchResult = await searchPlayer(playerName);
  if (!searchResult) return lostItemIds;

  const deaths = await getPlayerDeaths(searchResult.Id);
  if (!deaths.length) return lostItemIds;

  // Group loot items by date and collect timestamps
  const lootByDate = new Map<string, number[]>();
  for (const item of items) {
    const date = getDatePart(item.timestamp);
    const time = new Date(item.timestamp).getTime();
    if (isNaN(time)) continue;
    if (!lootByDate.has(date)) lootByDate.set(date, []);
    lootByDate.get(date)!.push(time);
  }

  if (lootByDate.size === 0) return lostItemIds;

  // Check each death: same date as loot AND within 1h after any loot on that date
  for (const death of deaths) {
    const deathTime = new Date(death.TimeStamp).getTime();
    if (isNaN(deathTime)) continue;

    const deathDate = getDatePart(death.TimeStamp);
    const lootTimes = lootByDate.get(deathDate);
    if (!lootTimes) continue; // No loot on this date

    // Check if death is within 1 hour after ANY loot item on this date
    const isRelevant = lootTimes.some((lootTime) => {
      const diffHours = (deathTime - lootTime) / 1000 / 60 / 60;
      return diffHours >= 0 && diffHours <= 1;
    });

    if (!isRelevant) continue;

    // Small delay to avoid rate limiting
    await new Promise((r) => setTimeout(r, 300));
    const details = await getEventDetails(death.EventId);
    if (details) {
      const ids = extractLostItemIds(details);
      ids.forEach((id) => lostItemIds.add(id));
    }
  }

  return lostItemIds;
}
