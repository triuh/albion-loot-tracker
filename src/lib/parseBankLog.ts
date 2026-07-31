

/**
 * Parse bank/chest deposit log (TSV format)
 * Columns: Дата, Игрок, Предмет, Чары, Качество, Количество
 * Returns a Map: player -> itemName -> totalDeposited (only positive quantities)
 */
export function parseBankLog(tsvText: string): Map<string, Map<string, number>> {
  const lines = tsvText.trim().split(/\r?\n/);
  if (lines.length < 2) return new Map();

  const result = new Map<string, Map<string, number>>();

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    // Skip header lines
    if (trimmed.startsWith('"Дата"') || trimmed.startsWith('Дата\t')) continue;

    const values = trimmed.split('\t');
    if (values.length < 6) continue;

    const player = values[1]?.replace(/^"|"$/g, '').trim() || '';
    const itemName = values[2]?.replace(/^"|"$/g, '').trim() || '';
    const quantityStr = values[5]?.replace(/^"|"$/g, '').trim() || '0';
    const quantity = parseInt(quantityStr, 10) || 0;

    if (!player || !itemName) continue;
    // Only count deposits (positive quantities)
    if (quantity <= 0) continue;

    if (!result.has(player)) {
      result.set(player, new Map());
    }
    const playerItems = result.get(player)!;
    const existing = playerItems.get(itemName) || 0;
    playerItems.set(itemName, existing + quantity);
  }

  return result;
}

/**
 * Normalize item name for matching:
 * - lowercase
 * - remove content in parentheses
 * - trim
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Check if two item names match (fuzzy matching between CSV item_name and bank log item name)
 */
export function itemNamesMatch(csvName: string, bankName: string): boolean {
  const normCsv = normalizeName(csvName);
  const normBank = normalizeName(bankName);

  // Direct match after normalization
  if (normCsv === normBank) return true;

  // Check if one contains the other
  if (normBank.includes(normCsv) || normCsv.includes(normBank)) return true;

  // Split into words and check if all words from CSV are in bank name
  const csvWords = normCsv.split(' ').filter(w => w.length > 2);
  const bankWords = normBank.split(' ').filter(w => w.length > 2);

  if (csvWords.length > 0 && bankWords.length > 0) {
    const matchCount = csvWords.filter(w => bankWords.includes(w)).length;
    // If at least 2 words match, or all words match
    if (matchCount >= 2 || matchCount === csvWords.length) return true;
  }

  return false;
}

/**
 * Find deposited quantity for a given player + item from the bank log
 */
export function findDeposited(
  bankLog: Map<string, Map<string, number>>,
  player: string,
  itemName: string
): number {
  const playerItems = bankLog.get(player);
  if (!playerItems) return 0;

  // Try exact match first
  if (playerItems.has(itemName)) {
    return playerItems.get(itemName)!;
  }

  // Try fuzzy match
  for (const [bankItemName, qty] of playerItems) {
    if (itemNamesMatch(itemName, bankItemName)) {
      return qty;
    }
  }

  return 0;
}
