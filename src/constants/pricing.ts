import type { RarityKey, RarityMetaInfo, WearBucket } from "../types";

export const KNOT_FLOATS: readonly number[] = [0.000, 0.035, 0.115, 0.270, 0.420, 0.725, 1.000];
export const KNOT_MULTS: readonly number[] = [8.38306, 4.54457, 1.64670, 1.00000, 0.65267, 0.54656, 0.44907];
export const DEFAULT_FX_RATE = 0.066929;
export const DEFAULT_TERMINAL_COST_CNY = 0.3;

export const WEAR_BUCKETS: readonly WearBucket[] = [
  { name: "崭新出厂", code: "FN", prob: 0.03, min: 0.0005, max: 0.0700, color: "#0078D4" },
  { name: "略有磨损", code: "MW", prob: 0.24, min: 0.0800, max: 0.1500, color: "#107C10" },
  { name: "久经沙场", code: "FT", prob: 0.33, min: 0.1600, max: 0.3800, color: "#CA5010" },
  { name: "破损不堪", code: "WW", prob: 0.24, min: 0.3900, max: 0.4500, color: "#D83B01" },
  { name: "战痕累累", code: "BS", prob: 0.16, min: 0.4600, max: 1.0000, color: "#A4262C" },
];

export const RARITY_META: Record<RarityKey, RarityMetaInfo> = {
  milspec: {
    name: "军规级",
    short: "军规",
    color: "#4b69ff",
    badgeColor: "informative",
    nextRarity: "restricted",
    tradeCount: 10,
  },
  restricted: {
    name: "受限",
    short: "受限",
    color: "#8847ff",
    badgeColor: "important",
    nextRarity: "classified",
    tradeCount: 10,
  },
  classified: {
    name: "保密",
    short: "保密",
    color: "#d32ce6",
    badgeColor: "severe",
    nextRarity: "covert",
    tradeCount: 10,
  },
  covert: {
    name: "隐秘",
    short: "隐秘",
    color: "#eb4b4b",
    badgeColor: "danger",
    nextRarity: "gold",
    tradeCount: 5,
  },
  gold: {
    name: "罕见特殊",
    short: "罕见特殊",
    color: "#d4a017",
    badgeColor: "warning",
    nextRarity: null,
    tradeCount: null,
  },
};
