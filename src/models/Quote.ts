import type { QuoteData, WearCode } from "../types";
import type { Skin } from "./Skin";

export class Quote implements QuoteData {
  public readonly terminal_index: number;
  public readonly quote_number: number;
  public readonly is_final_quote: boolean;
  public readonly skin: Skin;
  public readonly stattrak: boolean;
  public readonly wear_float: number;
  public readonly wear_name: string;
  public readonly wear_code: WearCode;
  public readonly pattern_seed: number;
  public readonly usd_cents: number;
  public readonly offer_price_usd: number;
  public readonly offer_price_cny: number;

  constructor(params: QuoteData) {
    this.terminal_index = params.terminal_index;
    this.quote_number = params.quote_number;
    this.is_final_quote = params.is_final_quote;
    this.skin = params.skin;
    this.stattrak = params.stattrak;
    this.wear_float = params.wear_float;
    this.wear_name = params.wear_name;
    this.wear_code = params.wear_code;
    this.pattern_seed = params.pattern_seed;
    this.usd_cents = params.usd_cents;
    this.offer_price_usd = params.offer_price_usd;
    this.offer_price_cny = params.offer_price_cny;
  }
}
