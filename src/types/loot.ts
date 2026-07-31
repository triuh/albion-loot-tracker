export interface LootItem {
  item_name: string;
  item_id: string;
  quantity: number;
  value: number;
  total_value: number;
  timestamp: string;
  cluster: string;
  looted_from: string;
  killed_by: string;
  guild: string;
  alliance: string;
  isLost: boolean;
  depositedCount: number; // сколько положил в сундук
  tier: number; // тир предмета (4, 5, 6, 7, 8...) или 0 если без тира
}

export interface PlayerData {
  player: string;
  guild: string;
  alliance: string;
  total_value: number;
  total_items: number;
  item_count: number;
  items: LootItem[];
}

export type SortMode = 'value' | 'items' | 'name';

// Bank log entry
export interface BankEntry {
  player: string;
  itemName: string;
  quantity: number; // positive = deposited, negative = withdrawn
}
