import { DEFAULT_FX_RATE, KNOT_FLOATS, KNOT_MULTS, WEAR_BUCKETS } from "../constants/pricing";
import type { CollectionKey, RarityKey, WearCode } from "../types";
import type { SeededRNG } from "./SeededRNG";

export class Skin {
  public readonly weapon: string;
  public readonly name: string;
  public readonly en_name: string;
  public readonly rarity: RarityKey;
  public readonly base_cents_normal: number;
  public readonly base_cents_st: number | null;
  public readonly float_min: number;
  public readonly float_max: number;
  public readonly stattrak_allowed: boolean;
  public readonly skin_id: number;
  public readonly collection: CollectionKey;

  constructor(
    weapon: string,
    name: string,
    en_name: string,
    rarity: RarityKey,
    base_cents_normal: number,
    base_cents_st: number | null = null,
    float_min = 0.0,
    float_max = 1.0,
    stattrak_allowed = true,
    skin_id = 0,
    collection: CollectionKey = "genesis"
  ) {
    this.weapon = weapon;
    this.name = name;
    this.en_name = en_name;
    this.rarity = rarity;
    this.base_cents_normal = base_cents_normal;
    this.base_cents_st = base_cents_st;
    this.float_min = float_min;
    this.float_max = float_max;
    this.stattrak_allowed = stattrak_allowed;
    this.skin_id = skin_id;
    this.collection = collection;
  }

  get full_name(): string {
    return `${this.weapon} | ${this.name}`;
  }

  static wear_multiplier(wear_float: number): number {
    if (wear_float <= KNOT_FLOATS[0]) return KNOT_MULTS[0];
    if (wear_float >= KNOT_FLOATS[KNOT_FLOATS.length - 1]) {
      return KNOT_MULTS[KNOT_MULTS.length - 1];
    }
    for (let i = 0; i < KNOT_FLOATS.length - 1; i++) {
      const x0 = KNOT_FLOATS[i];
      const x1 = KNOT_FLOATS[i + 1];
      if (wear_float >= x0 && wear_float <= x1) {
        const weight = (wear_float - x0) / (x1 - x0);
        return KNOT_MULTS[i] + weight * (KNOT_MULTS[i + 1] - KNOT_MULTS[i]);
      }
    }
    return 1.0;
  }

  static classify_wear(wear_float: number): [string, WearCode] {
    if (wear_float < 0.07) return ["崭新出厂", "FN"];
    if (wear_float < 0.15) return ["略有磨损", "MW"];
    if (wear_float < 0.38) return ["久经沙场", "FT"];
    if (wear_float < 0.45) return ["破损不堪", "WW"];
    return ["战痕累累", "BS"];
  }

  get_base_cents(stattrak = false): number {
    if (stattrak && this.stattrak_allowed && this.base_cents_st !== null) {
      return this.base_cents_st;
    }
    return this.base_cents_normal;
  }

  compute_offer_price(
    wear_float: number,
    stattrak = false,
    fx_rate = DEFAULT_FX_RATE
  ): [number, number, number] {
    const safe_float = Number.isNaN(Number(wear_float))
      ? 0.27
      : Math.min(this.float_max, Math.max(this.float_min, Number(wear_float)));
    const s_i = this.get_base_cents(stattrak);
    const g_val = Skin.wear_multiplier(safe_float);
    const usd_cents = Math.ceil(s_i * g_val - 1e-9);
    const offer_usd = Number((usd_cents / 100.0).toFixed(2));
    const offer_cny = Number(
      (Math.ceil(usd_cents * fx_rate * 100.0 - 1e-9) / 100.0).toFixed(2)
    );
    return [usd_cents, offer_usd, offer_cny];
  }

  sample_wear_float(
    rng: SeededRNG,
    wear_weights: readonly number[] = [0.03, 0.24, 0.33, 0.24, 0.16]
  ): [number, string, WearCode] {
    const bucket = rng.choices(WEAR_BUCKETS, wear_weights);
    const u = rng.uniform(bucket.min, bucket.max);
    const wear_float = Number(
      (this.float_min + (this.float_max - this.float_min) * u).toFixed(9)
    );
    const [wear_cn, wear_code] = Skin.classify_wear(wear_float);
    return [wear_float, wear_cn, wear_code];
  }
}
