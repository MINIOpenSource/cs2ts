import type { Skin } from "../models/Skin";

export type RarityKey = "milspec" | "restricted" | "classified" | "covert" | "gold";

export type CollectionKey = "genesis" | "deadhand";

export type TerminalKey = CollectionKey;

export type ActiveTabKey =
  | "simulator"
  | "inventory"
  | "tradeup"
  | "calculator"
  | "history";

export type WearCode = "FN" | "MW" | "FT" | "WW" | "BS";

export type BadgeColor =
  | "brand"
  | "danger"
  | "important"
  | "informative"
  | "severe"
  | "subtle"
  | "success"
  | "warning";

export interface WearBucket {
  name: string;
  code: WearCode;
  prob: number;
  min: number;
  max: number;
  color: string;
}

export interface RarityMetaInfo {
  name: string;
  short: string;
  color: string;
  badgeColor: BadgeColor;
  nextRarity: RarityKey | null;
  tradeCount: number | null;
}

export interface QuoteData {
  terminal_index: number;
  quote_number: number;
  is_final_quote: boolean;
  skin: Skin;
  stattrak: boolean;
  wear_float: number;
  wear_name: string;
  wear_code: WearCode;
  pattern_seed: number;
  usd_cents: number;
  offer_price_usd: number;
  offer_price_cny: number;
}

export interface BellmanSolution {
  single_draw_expected_cny: number;
  optimal_expected_cny: number;
  thresholds_by_step: Record<number, number>;
}

export interface InventoryItem {
  id: string;
  source: string;
  skin: Skin;
  stattrak: boolean;
  wear_float: number;
  wear_name: string;
  wear_code: WearCode;
  pattern_seed: number;
  usd_cents: number;
  offer_price_usd: number;
  offer_price_cny: number;
  avg_norm_float?: number;
}

export interface TradeUpOutcomePreview {
  skin: Skin;
  probability: number;
  stattrak: boolean;
  wear_float: number;
  wear_name: string;
  wear_code: WearCode;
  usd_cents: number;
  offer_price_usd: number;
  offer_price_cny: number;
  avg_norm_float: number;
}

export interface HistoryRecord {
  id: string;
  timestamp: string;
  type: "buyout" | "tradeup" | "declined_all" | "manual_add";
  terminalKey?: TerminalKey;
  terminalName?: string;
  terminalIndex?: number;
  quoteNumber?: number;
  sessionSeed?: number;
  skin: Skin;
  stattrak: boolean;
  wear_float: number;
  wear_name: string;
  wear_code: WearCode;
  priceCny: number;
  note?: string;
}

export interface WalletMessage {
  intent: "success" | "error" | "warning" | "info";
  text: string;
}

export interface SimulatorStats {
  terminalsOpened: number;
  itemsBought: number;
  totalOfferSpentCny: number;
  totalTerminalCostCny: number;
}

export interface TerminalConfigOptions {
  rarity_weights?: Partial<Record<RarityKey, number>>;
  wear_weights?: number[];
  stattrak_prob?: number;
  sixth_quote_prob?: number;
  base_max_quotes?: number;
  fx_rate?: number;
  terminal_cost_cny?: number;
  seed?: number | string | null;
}

export interface TerminalConstructorParams extends TerminalConfigOptions {
  id?: string;
  name: string;
  skins: Skin[];
  rarity_weights: Partial<Record<RarityKey, number>>;
}
