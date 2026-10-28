import { DEFAULT_FX_RATE, RARITY_META } from "../constants/pricing";
import { ALL_SKINS_BY_COLLECTION, GENESIS_SKINS_DATA } from "../constants/skins";
import { Skin } from "../models/Skin";
import type { InventoryItem, TradeUpOutcomePreview } from "../types";

export function previewTradeUpOutcomes(
  inputItems: InventoryItem[],
  fxRate = DEFAULT_FX_RATE
): TradeUpOutcomePreview[] {
  if (!inputItems || inputItems.length === 0) {
    return [];
  }
  const firstRarity = inputItems[0].skin.rarity;
  const rInfo = RARITY_META[firstRarity];
  if (!rInfo || !rInfo.nextRarity) {
    return [];
  }
  const nextRarity = rInfo.nextRarity;

  const validCandidates: Skin[][] = [];
  for (const item of inputItems) {
    const colSkins =
      ALL_SKINS_BY_COLLECTION[item.skin.collection] || GENESIS_SKINS_DATA;
    const nextPool = colSkins.filter((s) => s.rarity === nextRarity);
    if (nextPool.length > 0) {
      validCandidates.push(nextPool);
    }
  }
  if (validCandidates.length === 0) {
    return [];
  }

  let sumNormFloat = 0;
  for (const item of inputItems) {
    const span = Math.max(1e-9, item.skin.float_max - item.skin.float_min);
    const u = (item.wear_float - item.skin.float_min) / span;
    sumNormFloat += u;
  }
  const avgNormFloat = sumNormFloat / inputItems.length;

  const probMap = new Map<number, { skin: Skin; prob: number }>();
  const slotWeight = 1.0 / validCandidates.length;

  for (const pool of validCandidates) {
    const eachProb = slotWeight / pool.length;
    for (const s of pool) {
      const existing = probMap.get(s.skin_id);
      if (existing) {
        existing.prob += eachProb;
      } else {
        probMap.set(s.skin_id, { skin: s, prob: eachProb });
      }
    }
  }

  const outStattrakBase = Boolean(inputItems[0].stattrak);
  const outcomes: TradeUpOutcomePreview[] = [];

  for (const { skin: outSkin, prob } of probMap.values()) {
    const outStattrak = Boolean(outSkin.stattrak_allowed && outStattrakBase);
    const outFloat = Number(
      (
        outSkin.float_min +
        (outSkin.float_max - outSkin.float_min) * avgNormFloat
      ).toFixed(9)
    );
    const [wearCn, wearCode] = Skin.classify_wear(outFloat);
    const [usdCents, offerUsd, offerCny] = outSkin.compute_offer_price(
      outFloat,
      outStattrak,
      fxRate
    );
    outcomes.push({
      skin: outSkin,
      probability: prob,
      stattrak: outStattrak,
      wear_float: outFloat,
      wear_name: wearCn,
      wear_code: wearCode,
      usd_cents: usdCents,
      offer_price_usd: offerUsd,
      offer_price_cny: offerCny,
      avg_norm_float: Number(avgNormFloat.toFixed(6)),
    });
  }

  return outcomes.sort(
    (a, b) => b.probability - a.probability || b.offer_price_cny - a.offer_price_cny
  );
}

export function executeTradeUpContract(
  inputItems: InventoryItem[],
  fxRate = DEFAULT_FX_RATE
): InventoryItem {
  if (!inputItems || inputItems.length === 0) {
    throw new Error("请先投入汰换材料。");
  }
  const firstRarity = inputItems[0].skin.rarity;
  const rInfo = RARITY_META[firstRarity];
  if (!rInfo || !rInfo.nextRarity || !rInfo.tradeCount) {
    throw new Error("当前品质无法继续向上汰换。");
  }
  const requiredCount = rInfo.tradeCount;
  if (inputItems.length !== requiredCount) {
    throw new Error(`该品质汰换需要投入 ${requiredCount} 件同品质饰品。`);
  }

  const nextRarity = rInfo.nextRarity;
  const validCandidates: Skin[][] = [];
  for (const item of inputItems) {
    const colSkins =
      ALL_SKINS_BY_COLLECTION[item.skin.collection] || GENESIS_SKINS_DATA;
    const nextPool = colSkins.filter((s) => s.rarity === nextRarity);
    if (nextPool.length > 0) {
      validCandidates.push(nextPool);
    }
  }
  if (validCandidates.length === 0) {
    throw new Error(
      "所选材料的收藏品池中没有更高一级的产出物（创世收藏品无金色手套，仅毁灭之手隐秘可合手套）。"
    );
  }

  let sumNormFloat = 0;
  for (const item of inputItems) {
    const span = Math.max(1e-9, item.skin.float_max - item.skin.float_min);
    const u = (item.wear_float - item.skin.float_min) / span;
    sumNormFloat += u;
  }
  const avgNormFloat = sumNormFloat / inputItems.length;

  const chosenPool =
    validCandidates[Math.floor(Math.random() * validCandidates.length)];
  const outSkin = chosenPool[Math.floor(Math.random() * chosenPool.length)];
  const outStattrak = Boolean(
    outSkin.stattrak_allowed && inputItems[0].stattrak
  );
  const outFloat = Number(
    (
      outSkin.float_min +
      (outSkin.float_max - outSkin.float_min) * avgNormFloat
    ).toFixed(9)
  );
  const [wearCn, wearCode] = Skin.classify_wear(outFloat);
  const [usdCents, offerUsd, offerCny] = outSkin.compute_offer_price(
    outFloat,
    outStattrak,
    fxRate
  );

  return {
    id: `tu-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    source: "汰换合同",
    skin: outSkin,
    stattrak: outStattrak,
    wear_float: outFloat,
    wear_name: wearCn,
    wear_code: wearCode,
    pattern_seed: Math.floor(Math.random() * 1000),
    usd_cents: usdCents,
    offer_price_usd: offerUsd,
    offer_price_cny: offerCny,
    avg_norm_float: Number(avgNormFloat.toFixed(6)),
  };
}
