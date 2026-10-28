import { DEFAULT_FX_RATE, DEFAULT_TERMINAL_COST_CNY } from "../constants/pricing";
import { DEAD_HAND_SKINS_DATA, GENESIS_SKINS_DATA } from "../constants/skins";
import { Terminal } from "../models/Terminal";
import type { TerminalConfigOptions } from "../types";

export function createGenesisTerminal(customOpts: TerminalConfigOptions = {}): Terminal {
  return new Terminal({
    id: "genesis",
    name: "封装的创世终端机",
    skins: GENESIS_SKINS_DATA,
    rarity_weights: { milspec: 1250, restricted: 250, classified: 50, covert: 10 },
    wear_weights: [0.03, 0.24, 0.33, 0.24, 0.16],
    stattrak_prob: 0.10,
    sixth_quote_prob: 0.05,
    base_max_quotes: 5,
    fx_rate: DEFAULT_FX_RATE,
    terminal_cost_cny: DEFAULT_TERMINAL_COST_CNY,
    ...customOpts,
  });
}

export function createDeadHandTerminal(customOpts: TerminalConfigOptions = {}): Terminal {
  return new Terminal({
    id: "deadhand",
    name: "封装的毁灭之手终端机",
    skins: DEAD_HAND_SKINS_DATA,
    rarity_weights: { milspec: 1250, restricted: 250, classified: 50, covert: 10, gold: 4 },
    wear_weights: [0.03, 0.24, 0.33, 0.24, 0.16],
    stattrak_prob: 0.10,
    sixth_quote_prob: 0.05,
    base_max_quotes: 5,
    fx_rate: DEFAULT_FX_RATE,
    terminal_cost_cny: DEFAULT_TERMINAL_COST_CNY,
    ...customOpts,
  });
}
