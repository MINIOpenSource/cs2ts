import { ALL_SKINS_BY_COLLECTION } from "../constants/skins";
import { Quote } from "../models/Quote";
import type { Skin } from "../models/Skin";
import type { Terminal } from "../models/Terminal";
import type {
  ActiveTabKey,
  CollectionKey,
  HistoryRecord,
  InventoryItem,
  SimulatorStats,
  TerminalKey,
  WearCode,
} from "../types";

const STORAGE_KEYS = {
  THEME_DARK: "cs2_terminal_sim_is_dark",
  APP_STATE: "cs2_terminal_sim_app_state",
} as const;

export interface SerializedSkinRef {
  skin_id: number;
  collection: CollectionKey;
  en_name?: string;
}

export interface SerializedQuote {
  terminal_index: number;
  quote_number: number;
  is_final_quote: boolean;
  skin_ref: SerializedSkinRef;
  stattrak: boolean;
  wear_float: number;
  wear_name: string;
  wear_code: WearCode;
  pattern_seed: number;
  usd_cents: number;
  offer_price_usd: number;
  offer_price_cny: number;
}

export interface SerializedTerminalSession {
  session_index: number;
  current_session_seed?: number;
  current_step: number;
  accepted_quote_index: number | null;
  current_session_quotes: SerializedQuote[];
}

export interface SerializedInventoryItem {
  id: string;
  source: string;
  skin_ref: SerializedSkinRef;
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

export interface SerializedHistoryRecord {
  id: string;
  timestamp: string;
  type: "buyout" | "tradeup" | "declined_all" | "manual_add";
  terminalKey?: TerminalKey;
  terminalName?: string;
  terminalIndex?: number;
  quoteNumber?: number;
  sessionSeed?: number;
  skin_ref: SerializedSkinRef;
  stattrak: boolean;
  wear_float: number;
  wear_name: string;
  wear_code: WearCode;
  priceCny: number;
  note?: string;
}

export interface PersistedAppState {
  terminalKey: TerminalKey;
  activeTab: ActiveTabKey;
  terminalCostCny: number;
  godMode: boolean;
  walletBalance: number;
  stats: SimulatorStats;
  inventory: SerializedInventoryItem[];
  historyRecords: SerializedHistoryRecord[];
  terminalSessions: Record<TerminalKey, SerializedTerminalSession>;
}

export interface HydratedAppState {
  terminalKey: TerminalKey;
  activeTab: ActiveTabKey;
  terminalCostCny: number;
  godMode: boolean;
  walletBalance: number;
  stats: SimulatorStats;
  inventory: InventoryItem[];
  historyRecords: HistoryRecord[];
  terminalSessions: Record<TerminalKey, SerializedTerminalSession>;
}

function serializeSkinRef(skin: Skin): SerializedSkinRef {
  return {
    skin_id: skin.skin_id,
    collection: skin.collection,
    en_name: skin.en_name,
  };
}

function rehydrateSkin(ref: SerializedSkinRef | undefined | null): Skin | null {
  if (!ref) return null;
  const col: CollectionKey =
    ref.collection === "deadhand" ? "deadhand" : "genesis";
  const pool = ALL_SKINS_BY_COLLECTION[col] || [];
  if (ref.en_name) {
    const exactMatch = pool.find(
      (s) => s.skin_id === ref.skin_id && s.en_name === ref.en_name
    );
    if (exactMatch) return exactMatch;
  }
  const byId = pool.find((s) => s.skin_id === ref.skin_id);
  if (byId) return byId;
  return pool[0] || null;
}

function serializeQuote(q: Quote): SerializedQuote {
  return {
    terminal_index: q.terminal_index,
    quote_number: q.quote_number,
    is_final_quote: q.is_final_quote,
    skin_ref: serializeSkinRef(q.skin),
    stattrak: q.stattrak,
    wear_float: q.wear_float,
    wear_name: q.wear_name,
    wear_code: q.wear_code,
    pattern_seed: q.pattern_seed,
    usd_cents: q.usd_cents,
    offer_price_usd: q.offer_price_usd,
    offer_price_cny: q.offer_price_cny,
  };
}

function rehydrateQuote(sq: SerializedQuote): Quote | null {
  const skin = rehydrateSkin(sq.skin_ref);
  if (!skin) return null;
  return new Quote({
    terminal_index: Number(sq.terminal_index) || 1,
    quote_number: Number(sq.quote_number) || 1,
    is_final_quote: Boolean(sq.is_final_quote),
    skin,
    stattrak: Boolean(sq.stattrak),
    wear_float: Number(sq.wear_float) || 0,
    wear_name: sq.wear_name || "久经沙场",
    wear_code: sq.wear_code || "FT",
    pattern_seed: Number(sq.pattern_seed) || 0,
    usd_cents: Number(sq.usd_cents) || 0,
    offer_price_usd: Number(sq.offer_price_usd) || 0,
    offer_price_cny: Number(sq.offer_price_cny) || 0,
  });
}

export function serializeTerminalSession(
  term: Terminal
): SerializedTerminalSession {
  const acceptedIdx =
    term.accepted_quote !== null
      ? term.current_session_quotes.findIndex(
          (q) => q.quote_number === term.accepted_quote?.quote_number
        )
      : -1;

  return {
    session_index: term.session_index,
    current_session_seed: term.current_session_seed,
    current_step: term.current_step,
    accepted_quote_index: acceptedIdx >= 0 ? acceptedIdx : null,
    current_session_quotes: term.current_session_quotes.map(serializeQuote),
  };
}

export function restoreTerminalSession(
  term: Terminal,
  session: SerializedTerminalSession | undefined | null
): boolean {
  if (
    !session ||
    !Array.isArray(session.current_session_quotes) ||
    session.current_session_quotes.length === 0
  ) {
    return false;
  }

  const quotes: Quote[] = [];
  for (const sq of session.current_session_quotes) {
    const q = rehydrateQuote(sq);
    if (q) quotes.push(q);
  }
  if (quotes.length === 0) return false;

  term.session_index = Math.max(1, Number(session.session_index) || 1);
  term.current_session_seed =
    typeof session.current_session_seed === "number" &&
    !Number.isNaN(session.current_session_seed)
      ? session.current_session_seed >>> 0
      : (term.rng.random() * 0xffffffff) >>> 0;
  term.current_session_quotes = quotes;
  const maxIdx = quotes.length - 1;
  term.current_step = Math.max(
    0,
    Math.min(maxIdx, Number(session.current_step) || 0)
  );
  if (
    session.accepted_quote_index !== null &&
    session.accepted_quote_index !== undefined &&
    session.accepted_quote_index >= 0 &&
    session.accepted_quote_index <= maxIdx
  ) {
    term.accepted_quote = quotes[session.accepted_quote_index];
  } else {
    term.accepted_quote = null;
  }
  return true;
}

export function loadThemeIsDark(defaultVal = true): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.THEME_DARK);
    if (raw === null) return defaultVal;
    return JSON.parse(raw) === true;
  } catch {
    return defaultVal;
  }
}

export function saveThemeIsDark(isDark: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEYS.THEME_DARK, JSON.stringify(isDark));
  } catch {
    return;
  }
}

const VALID_TABS: ActiveTabKey[] = [
  "simulator",
  "inventory",
  "tradeup",
  "calculator",
  "history",
];

export function loadAppState(): HydratedAppState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.APP_STATE);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedAppState>;
    if (!parsed || typeof parsed !== "object") return null;

    const terminalKey: TerminalKey =
      parsed.terminalKey === "deadhand" ? "deadhand" : "genesis";
    const activeTab: ActiveTabKey =
      parsed.activeTab && VALID_TABS.includes(parsed.activeTab)
        ? parsed.activeTab
        : "simulator";

    const terminalCostCny =
      typeof parsed.terminalCostCny === "number" &&
      !Number.isNaN(parsed.terminalCostCny) &&
      parsed.terminalCostCny >= 0
        ? parsed.terminalCostCny
        : 2.5;

    const godMode = Boolean(parsed.godMode);

    const walletBalance =
      typeof parsed.walletBalance === "number" &&
      !Number.isNaN(parsed.walletBalance)
        ? parsed.walletBalance
        : Number((5000.0 - terminalCostCny).toFixed(2));

    const stats: SimulatorStats = {
      terminalsOpened:
        typeof parsed.stats?.terminalsOpened === "number"
          ? parsed.stats.terminalsOpened
          : 1,
      itemsBought:
        typeof parsed.stats?.itemsBought === "number"
          ? parsed.stats.itemsBought
          : 0,
      totalOfferSpentCny:
        typeof parsed.stats?.totalOfferSpentCny === "number"
          ? parsed.stats.totalOfferSpentCny
          : 0,
      totalTerminalCostCny:
        typeof parsed.stats?.totalTerminalCostCny === "number"
          ? parsed.stats.totalTerminalCostCny
          : terminalCostCny,
    };

    const inventory: InventoryItem[] = [];
    if (Array.isArray(parsed.inventory)) {
      for (const item of parsed.inventory) {
        const skin = rehydrateSkin(item?.skin_ref);
        if (!skin) continue;
        inventory.push({
          id: String(item.id || `item-${Date.now()}-${Math.random()}`),
          source: String(item.source || "创世终端机"),
          skin,
          stattrak: Boolean(item.stattrak),
          wear_float: Number(item.wear_float) || 0,
          wear_name: item.wear_name || "久经沙场",
          wear_code: item.wear_code || "FT",
          pattern_seed: Number(item.pattern_seed) || 0,
          usd_cents: Number(item.usd_cents) || 0,
          offer_price_usd: Number(item.offer_price_usd) || 0,
          offer_price_cny: Number(item.offer_price_cny) || 0,
          ...(item.avg_norm_float !== undefined
            ? { avg_norm_float: Number(item.avg_norm_float) }
            : {}),
        });
      }
    }

    const historyRecords: HistoryRecord[] = [];
    if (Array.isArray(parsed.historyRecords)) {
      for (const rec of parsed.historyRecords) {
        const skin = rehydrateSkin(rec?.skin_ref);
        if (!skin) continue;
        historyRecords.push({
          id: String(rec.id || `hist-${Date.now()}-${Math.random()}`),
          timestamp: String(rec.timestamp || "00:00:00"),
          type: rec.type || "buyout",
          ...(rec.terminalKey !== undefined
            ? { terminalKey: rec.terminalKey }
            : {}),
          ...(rec.terminalName !== undefined
            ? { terminalName: rec.terminalName }
            : {}),
          ...(rec.terminalIndex !== undefined
            ? { terminalIndex: Number(rec.terminalIndex) }
            : {}),
          ...(rec.quoteNumber !== undefined
            ? { quoteNumber: Number(rec.quoteNumber) }
            : {}),
          ...(rec.sessionSeed !== undefined
            ? { sessionSeed: Number(rec.sessionSeed) >>> 0 }
            : {}),
          skin,
          stattrak: Boolean(rec.stattrak),
          wear_float: Number(rec.wear_float) || 0,
          wear_name: rec.wear_name || "久经沙场",
          wear_code: rec.wear_code || "FT",
          priceCny: Number(rec.priceCny) || 0,
          ...(rec.note !== undefined ? { note: rec.note } : {}),
        });
      }
    }

    const emptySession: SerializedTerminalSession = {
      session_index: 0,
      current_session_seed: 0,
      current_step: 0,
      accepted_quote_index: null,
      current_session_quotes: [],
    };

    const terminalSessions: Record<TerminalKey, SerializedTerminalSession> = {
      genesis: parsed.terminalSessions?.genesis || emptySession,
      deadhand: parsed.terminalSessions?.deadhand || emptySession,
    };

    return {
      terminalKey,
      activeTab,
      terminalCostCny,
      godMode,
      walletBalance,
      stats,
      inventory,
      historyRecords,
      terminalSessions,
    };
  } catch {
    return null;
  }
}

export function saveAppState(params: {
  terminalKey: TerminalKey;
  activeTab: ActiveTabKey;
  terminalCostCny: number;
  godMode: boolean;
  walletBalance: number;
  stats: SimulatorStats;
  inventory: InventoryItem[];
  historyRecords: HistoryRecord[];
  terminals: Record<TerminalKey, Terminal>;
}): void {
  try {
    const serializedInventory: SerializedInventoryItem[] = params.inventory.map(
      (item) => ({
        id: item.id,
        source: item.source,
        skin_ref: serializeSkinRef(item.skin),
        stattrak: item.stattrak,
        wear_float: item.wear_float,
        wear_name: item.wear_name,
        wear_code: item.wear_code,
        pattern_seed: item.pattern_seed,
        usd_cents: item.usd_cents,
        offer_price_usd: item.offer_price_usd,
        offer_price_cny: item.offer_price_cny,
        ...(item.avg_norm_float !== undefined
          ? { avg_norm_float: item.avg_norm_float }
          : {}),
      })
    );

    const serializedHistory: SerializedHistoryRecord[] =
      params.historyRecords.map((rec) => ({
        id: rec.id,
        timestamp: rec.timestamp,
        type: rec.type,
        ...(rec.terminalKey !== undefined
          ? { terminalKey: rec.terminalKey }
          : {}),
        ...(rec.terminalName !== undefined
          ? { terminalName: rec.terminalName }
          : {}),
        ...(rec.terminalIndex !== undefined
          ? { terminalIndex: rec.terminalIndex }
          : {}),
        ...(rec.quoteNumber !== undefined
          ? { quoteNumber: rec.quoteNumber }
          : {}),
        ...(rec.sessionSeed !== undefined
          ? { sessionSeed: rec.sessionSeed }
          : {}),
        skin_ref: serializeSkinRef(rec.skin),
        stattrak: rec.stattrak,
        wear_float: rec.wear_float,
        wear_name: rec.wear_name,
        wear_code: rec.wear_code,
        priceCny: rec.priceCny,
        ...(rec.note !== undefined ? { note: rec.note } : {}),
      }));

    const stateToPersist: PersistedAppState = {
      terminalKey: params.terminalKey,
      activeTab: params.activeTab,
      terminalCostCny: params.terminalCostCny,
      godMode: params.godMode,
      walletBalance: params.walletBalance,
      stats: params.stats,
      inventory: serializedInventory,
      historyRecords: serializedHistory,
      terminalSessions: {
        genesis: serializeTerminalSession(params.terminals.genesis),
        deadhand: serializeTerminalSession(params.terminals.deadhand),
      },
    };

    localStorage.setItem(
      STORAGE_KEYS.APP_STATE,
      JSON.stringify(stateToPersist)
    );
  } catch {
    return;
  }
}
