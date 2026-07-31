import type { PlayerData, LootItem } from '@/types/loot';
import { findDeposited } from './parseBankLog';

export function parseLootCSV(
  csvText: string,
  bankLog?: Map<string, Map<string, number>>
): PlayerData[] {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const headerLine = lines[0];
  const delimiter = headerLine.includes(';') ? ';' : ',';
  const headers = headerLine.split(delimiter).map(h => h.trim().replace(/^\uFEFF/, ''));

  // Parse loot items. isLost \u043F\u0440\u043E\u0441\u0442\u0430\u0432\u043B\u044F\u0435\u0442\u0441\u044F \u043F\u043E\u0437\u0436\u0435 \u043A\u043D\u043E\u043F\u043A\u043E\u0439 \u00ABCheck deaths\u00BB
  // (\u043F\u043E killboard: \u0441\u043C\u0435\u0440\u0442\u044C \u0432 \u043E\u043A\u043D\u0435 timestamp_utc..+1h \u0441 \u044D\u0442\u0438\u043C \u043F\u0440\u0435\u0434\u043C\u0435\u0442\u043E\u043C)
  const playersMap = new Map<string, { itemsMap: Map<string, LootItem>; total_value: number; total_items: number }>();

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = line.split(delimiter);
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] !== undefined ? values[j].trim() : '';
    }

    const player = row['looted_by__name'] || '';
    if (!player) continue;

    const itemName = row['item_name'] || '';
    const itemId = row['item_id'] || '';
    const quantity = parseInt(row['quantity'] || '1', 10) || 1;
    const value = parseInt(row['average_est_market_value'] || '0', 10) || 0;
    const totalValue = value * quantity;
    const timestamp = row['timestamp_utc'] || '';
    const cluster = row['cluster'] || '';
    const lootedFrom = row['looted_from__name'] || '';
    const killedBy = row['killed_by'] || '';
    const guild = row['looted_by__guild'] || '';
    const alliance = row['looted_by__alliance'] || '';

    // Extract tier from item_id (T4_xxx -> 4, T5_xxx -> 5, etc.)
    const tierMatch = itemId.match(/^T(\d+)_/);
    const tier = tierMatch ? parseInt(tierMatch[1], 10) : 0;

    const depositedCount = bankLog ? findDeposited(bankLog, player, itemName) : 0;

    if (!playersMap.has(player)) {
      playersMap.set(player, { itemsMap: new Map(), total_value: 0, total_items: 0 });
    }
    const p = playersMap.get(player)!;

    const existing = p.itemsMap.get(itemId);
    if (existing) {
      existing.quantity += quantity;
      existing.total_value += totalValue;
      if (timestamp > existing.timestamp) {
        existing.timestamp = timestamp;
      }
      if (depositedCount > 0) {
        existing.depositedCount += depositedCount;
      }
    } else {
      p.itemsMap.set(itemId, {
        item_name: itemName,
        item_id: itemId,
        quantity,
        value,
        total_value: totalValue,
        timestamp,
        cluster,
        looted_from: lootedFrom,
        killed_by: killedBy,
        guild,
        alliance,
        isLost: false,
        depositedCount,
        tier,
      });
    }

    p.total_value += totalValue;
    p.total_items += quantity;
  }

  const result: PlayerData[] = [];
  for (const [player, data] of playersMap) {
    const items = Array.from(data.itemsMap.values());
    items.sort((a, b) => b.total_value - a.total_value);
    result.push({
      player,
      guild: items[0]?.guild || '',
      alliance: items[0]?.alliance || '',
      total_value: data.total_value,
      total_items: data.total_items,
      item_count: items.length,
      items,
    });
  }

  result.sort((a, b) => b.total_value - a.total_value);
  return result;
}
