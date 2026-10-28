import { DEFAULT_FX_RATE, DEFAULT_TERMINAL_COST_CNY, WEAR_BUCKETS } from "../constants/pricing";
import type {
  BellmanSolution,
  RarityKey,
  TerminalConfigOptions,
  TerminalConstructorParams,
} from "../types";
import { Quote } from "./Quote";
import { SeededRNG } from "./SeededRNG";
import type { Skin } from "./Skin";

export class Terminal {
  public readonly id: string;
  public readonly name: string;
  public readonly skins: Skin[];
  public readonly rng: SeededRNG;

  public raw_rarity_weights: Partial<Record<RarityKey, number>> = {};
  public pools: Partial<Record<RarityKey, Skin[]>> = {};
  public rarity_probs: Partial<Record<RarityKey, number>> = {};
  private _rarity_keys: RarityKey[] = [];
  private _rarity_vals: number[] = [];

  public wear_weights: number[] = [0.03, 0.24, 0.33, 0.24, 0.16];
  public stattrak_prob = 0.10;
  public sixth_quote_prob = 0.05;
  public base_max_quotes = 5;
  public fx_rate = DEFAULT_FX_RATE;
  public terminal_cost_cny = DEFAULT_TERMINAL_COST_CNY;

  public session_index = 0;
  public current_session_seed = 0;
  public current_session_quotes: Quote[] = [];
  public current_step = 0;
  public accepted_quote: Quote | null = null;

  constructor({
    id = "custom",
    name,
    skins,
    rarity_weights,
    wear_weights = [0.03, 0.24, 0.33, 0.24, 0.16],
    stattrak_prob = 0.10,
    sixth_quote_prob = 0.05,
    base_max_quotes = 5,
    fx_rate = DEFAULT_FX_RATE,
    terminal_cost_cny = DEFAULT_TERMINAL_COST_CNY,
    seed = null,
  }: TerminalConstructorParams) {
    this.id = id;
    this.name = name;
    this.skins = [...skins];
    this.rng = new SeededRNG(seed);
    this.updateConfig({
      rarity_weights,
      wear_weights,
      stattrak_prob,
      sixth_quote_prob,
      base_max_quotes,
      fx_rate,
      terminal_cost_cny,
    });
  }

  updateConfig({
    rarity_weights,
    wear_weights,
    stattrak_prob,
    sixth_quote_prob,
    base_max_quotes,
    fx_rate,
    terminal_cost_cny,
  }: TerminalConfigOptions): void {
    if (rarity_weights) {
      this.raw_rarity_weights = { ...rarity_weights };
      this.buildSkinPools(rarity_weights);
    }
    if (wear_weights) {
      const total_w = wear_weights.reduce((a, b) => a + b, 0) || 1;
      this.wear_weights = wear_weights.map((w) => w / total_w);
    }
    if (stattrak_prob !== undefined) this.stattrak_prob = Number(stattrak_prob);
    if (sixth_quote_prob !== undefined) this.sixth_quote_prob = Number(sixth_quote_prob);
    if (base_max_quotes !== undefined) this.base_max_quotes = Number(base_max_quotes);
    if (fx_rate !== undefined) this.fx_rate = Number(fx_rate);
    if (terminal_cost_cny !== undefined) this.terminal_cost_cny = Number(terminal_cost_cny);
  }

  buildSkinPools(rarity_weights: Partial<Record<RarityKey, number>>): void {
    this.pools = {};
    for (const s of this.skins) {
      if (!this.pools[s.rarity]) this.pools[s.rarity] = [];
      this.pools[s.rarity]!.push(s);
    }
    const active: Partial<Record<RarityKey, number>> = {};
    let tot = 0;
    for (const [r, w] of Object.entries(rarity_weights) as [RarityKey, number | undefined][]) {
      if (this.pools[r] && w !== undefined && w > 0) {
        active[r] = Number(w);
        tot += Number(w);
      }
    }
    this.rarity_probs = {};
    this._rarity_keys = [];
    this._rarity_vals = [];
    for (const [r, w] of Object.entries(active) as [RarityKey, number][]) {
      const p = w / tot;
      this.rarity_probs[r] = p;
      this._rarity_keys.push(r);
      this._rarity_vals.push(p);
    }
  }

  roll_single_quote(terminal_index = 1, quote_number = 1, is_final_quote = false): Quote {
    const rarity = this.rng.choices(this._rarity_keys, this._rarity_vals);
    const pool = this.pools[rarity]!;
    const skin = this.rng.choice(pool);
    const stattrak = Boolean(skin.stattrak_allowed && this.rng.random() < this.stattrak_prob);
    const [wear_float, wear_cn, wear_code] = skin.sample_wear_float(this.rng, this.wear_weights);
    const pattern_seed = this.rng.randint(0, 999);
    const [usd_cents, offer_usd, offer_cny] = skin.compute_offer_price(
      wear_float,
      stattrak,
      this.fx_rate
    );

    return new Quote({
      terminal_index,
      quote_number,
      is_final_quote,
      skin,
      stattrak,
      wear_float,
      wear_name: wear_cn,
      wear_code,
      pattern_seed,
      usd_cents,
      offer_price_usd: offer_usd,
      offer_price_cny: offer_cny,
    });
  }

  generate_session(terminal_index: number | null = null): Quote[] {
    if (terminal_index === null) {
      this.session_index += 1;
      terminal_index = this.session_index;
    }
    const has_sixth = this.rng.random() < this.sixth_quote_prob;
    const max_q = this.base_max_quotes + (has_sixth ? 1 : 0);
    const quotes: Quote[] = [];
    for (let q_num = 1; q_num <= max_q; q_num++) {
      quotes.push(this.roll_single_quote(terminal_index, q_num, q_num === max_q));
    }
    return quotes;
  }

  start_session(customSeed?: number | string | null): Quote {
    const hasCustom =
      customSeed !== undefined &&
      customSeed !== null &&
      String(customSeed).trim() !== "";
    const sessionSeed = hasCustom
      ? SeededRNG.normalizeSeed(customSeed)
      : (this.rng.random() * 0xffffffff) >>> 0;
    this.current_session_seed = sessionSeed;
    this.rng.setState(sessionSeed);
    this.current_session_quotes = this.generate_session();
    this.current_step = 0;
    this.accepted_quote = null;
    return this.current_session_quotes[0];
  }

  current_quote(): Quote {
    if (!this.current_session_quotes.length) return this.start_session();
    return this.current_session_quotes[this.current_step];
  }

  decline_and_next(): Quote | null {
    if (this.accepted_quote !== null) return null;
    if (this.current_step + 1 >= this.current_session_quotes.length) return null;
    this.current_step += 1;
    return this.current_session_quotes[this.current_step];
  }

  accept_current(): Quote {
    const q = this.current_quote();
    this.accepted_quote = q;
    return q;
  }

  accept_quote_at(index: number): Quote {
    if (!this.current_session_quotes.length) {
      this.start_session();
    }
    const clampedIdx = Math.max(
      0,
      Math.min(this.current_session_quotes.length - 1, index)
    );
    this.current_step = clampedIdx;
    const q = this.current_session_quotes[clampedIdx];
    this.accepted_quote = q;
    return q;
  }

  build_discrete_distribution(n_float_pts = 100): { probs: number[]; offers_cny: number[] } {
    const probs: number[] = [];
    const offers_cny: number[] = [];

    for (const [rarity, r_prob] of Object.entries(this.rarity_probs) as [RarityKey, number][]) {
      const pool = this.pools[rarity];
      if (!pool || !r_prob) continue;
      const skin_prob = r_prob / pool.length;
      for (const skin of pool) {
        const st_cases: [boolean, number][] = skin.stattrak_allowed
          ? [
              [false, 1.0 - this.stattrak_prob],
              [true, this.stattrak_prob],
            ]
          : [[false, 1.0]];

        for (const [st_flag, st_prob] of st_cases) {
          if (st_prob <= 0) continue;
          for (let w_idx = 0; w_idx < WEAR_BUCKETS.length; w_idx++) {
            const wb = WEAR_BUCKETS[w_idx];
            const w_prob = this.wear_weights[w_idx];
            if (w_prob <= 0) continue;
            const lo = wb.min;
            const hi = wb.max;
            const step = (hi - lo) / Math.max(1, n_float_pts - 1);
            const pt_prob = (skin_prob * st_prob * w_prob) / n_float_pts;
            for (let idx = 0; idx < n_float_pts; idx++) {
              const u = lo + idx * step;
              const f_val = skin.float_min + (skin.float_max - skin.float_min) * u;
              const [, , p_cny] = skin.compute_offer_price(f_val, st_flag, this.fx_rate);
              probs.push(pt_prob);
              offers_cny.push(p_cny);
            }
          }
        }
      }
    }
    return { probs, offers_cny };
  }

  solve_bellman_optimal_stopping(n_float_pts = 100): BellmanSolution {
    const { probs, offers_cny } = this.build_discrete_distribution(n_float_pts);
    const values = offers_cny;

    let e_single = 0;
    for (let i = 0; i < probs.length; i++) {
      e_single += probs[i] * values[i];
    }

    const q6 = this.sixth_quote_prob;
    const K = this.base_max_quotes;
    const v_next = e_single;
    const thresholds: Record<number, number> = {};

    thresholds[K] = Number(v_next.toFixed(2));
    let e_max_k = 0;
    for (let i = 0; i < probs.length; i++) {
      e_max_k += probs[i] * (values[i] >= v_next ? values[i] : v_next);
    }
    let v_curr = (1.0 - q6) * e_single + q6 * e_max_k;

    for (let step = K - 1; step >= 1; step--) {
      thresholds[step] = Number(v_curr.toFixed(2));
      let next_v = 0;
      for (let i = 0; i < probs.length; i++) {
        next_v += probs[i] * (values[i] >= v_curr ? values[i] : v_curr);
      }
      v_curr = next_v;
    }

    return {
      single_draw_expected_cny: Number(e_single.toFixed(2)),
      optimal_expected_cny: Number(v_curr.toFixed(2)),
      thresholds_by_step: thresholds,
    };
  }
}
