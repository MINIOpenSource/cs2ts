"""
CS2 终端机报价与买断制博弈引擎 (Genesis Terminal & Dead Hand Terminal)
======================================================================
包含核心类：
1. Skin              : 武器皮肤与手套饰品基类（封装 7 节点分段线性磨损函数 g(f)、双重向上取整定价与两阶段磨损 RNG）
2. Quote             : 单次终端机刷新报价数据对象
3. Terminal          : 终端机抽象基类（支持自定义稀有度权重、暗金率、第六抽概率、磨损权重、汇率及贝尔曼最优停时求解）
4. GenesisTerminal   : 封装的创世终端机子类（内置全 17 款创世收藏品精确底价与市场价参数）
5. DeadHandTerminal  : 封装的毁灭之手终端机子类（内置全 39 款死手收藏品：17 款武器皮 + 22 款 ★ 手套参数）
"""

from __future__ import annotations
import math
import random
from dataclasses import dataclass, field
from typing import Callable, Dict, List, Optional, Sequence, Tuple


# =============================================================================
# 1. 全局数学常数与磨损档位定义
# =============================================================================

KNOT_FLOATS: Tuple[float, ...] = (0.000, 0.035, 0.115, 0.270, 0.420, 0.725, 1.000)
KNOT_MULTS: Tuple[float, ...]  = (8.38306, 4.54457, 1.64670, 1.00000, 0.65267, 0.54656, 0.44907)
DEFAULT_FX_RATE: float = 0.066929  # 1 美分对应的基準人民币汇率因子 (1 USD = 6.6929 CNY)

WEAR_BUCKETS: Tuple[Dict[str, float | str], ...] = (
    {"name": "崭新出厂", "code": "FN", "prob": 0.03, "min": 0.0005, "max": 0.0700},
    {"name": "略有磨损", "code": "MW", "prob": 0.24, "min": 0.0800, "max": 0.1500},
    {"name": "久经沙场", "code": "FT", "prob": 0.33, "min": 0.1600, "max": 0.3800},
    {"name": "破损不堪", "code": "WW", "prob": 0.24, "min": 0.3900, "max": 0.4500},
    {"name": "战痕累累", "code": "BS", "prob": 0.16, "min": 0.4600, "max": 1.0000},
)


# =============================================================================
# 2. Skin 饰品类与 Quote 报价结果类
# =============================================================================

@dataclass
class Skin:
    """
    CS2 终端机饰品对象（兼容普通武器皮肤与 ★ 罕见特殊手套）。

    Attributes:
        weapon            : 武器或手套类型名称（如 "AK-47"、"运动手套（★）"）
        name              : 涂装中文名称（如 "流金王朝"、"紫外狂潮"）
        en_name           : 英文全称（如 "AK-47 | The Oligarch"）
        rarity            : 品质代号 ("milspec" | "restricted" | "classified" | "covert" | "gold")
        base_cents_normal : 普通版在久经沙场中点 (f=0.270) 处的锚定美分底价 S_{i,0}
        base_cents_st     : 暗金版在久经沙场中点 (f=0.270) 处的锚定美分底价 S_{i,1}（无暗金则为 None）
        float_min         : 磨损最小值（标准武器皮为 0.00，手套为 0.06）
        float_max         : 磨损最大值（标准武器皮为 1.00，手套为 0.80）
        stattrak_allowed  : 是否允许生成 StatTrak™ 暗金属性
        market_normal     : 普通版五档二级市场参考价 (单位: 人民币 ¥)
        market_st         : 暗金版五档二级市场参考价 (单位: 人民币 ¥)
        skin_id           : 皮肤涂装编号 (paint_index)
    """
    weapon: str
    name: str
    en_name: str
    rarity: str
    base_cents_normal: float
    base_cents_st: Optional[float] = None
    float_min: float = 0.00
    float_max: float = 1.00
    stattrak_allowed: bool = True
    market_normal: Dict[str, float] = field(default_factory=dict)
    market_st: Dict[str, float] = field(default_factory=dict)
    skin_id: int = 0

    @property
    def full_name(self) -> str:
        return f"{self.weapon} | {self.name}"

    @staticmethod
    def wear_multiplier(wear_float: float) -> float:
        """计算 7 节点分段线性插值磨损乘数 g(f)。"""
        if wear_float <= KNOT_FLOATS[0]:
            return KNOT_MULTS[0]
        if wear_float >= KNOT_FLOATS[-1]:
            return KNOT_MULTS[-1]
        for i in range(len(KNOT_FLOATS) - 1):
            x0, x1 = KNOT_FLOATS[i], KNOT_FLOATS[i + 1]
            if x0 <= wear_float <= x1:
                weight = (wear_float - x0) / (x1 - x0)
                return KNOT_MULTS[i] + weight * (KNOT_MULTS[i + 1] - KNOT_MULTS[i])
        return 1.0

    @staticmethod
    def classify_wear(wear_float: float) -> Tuple[str, str]:
        """根据磨损浮点值判定所属外观等级名称与英文缩写。"""
        if wear_float < 0.07:
            return "崭新出厂", "FN"
        if wear_float < 0.15:
            return "略有磨损", "MW"
        if wear_float < 0.38:
            return "久经沙场", "FT"
        if wear_float < 0.45:
            return "破损不堪", "WW"
        return "战痕累累", "BS"

    def get_base_cents(self, stattrak: bool = False) -> float:
        """获取指定属性下的基准美分底价 S_i。"""
        if stattrak and self.stattrak_allowed and self.base_cents_st is not None:
            return self.base_cents_st
        return self.base_cents_normal

    def compute_offer_price(
        self,
        wear_float: float,
        stattrak: bool = False,
        fx_rate: float = DEFAULT_FX_RATE,
    ) -> Tuple[int, float, float]:
        """
        根据逆向双重向上取整公式计算终端机官方买断报价：
          1. C = ceil(S_{i,st} * g(f))
          2. Price_CNY = ceil(C * fx_rate * 100) / 100

        Returns:
            (usd_cents, offer_price_usd, offer_price_cny)
        """
        s_i = self.get_base_cents(stattrak)
        g_val = self.wear_multiplier(wear_float)
        usd_cents = math.ceil(s_i * g_val - 1e-9)
        offer_usd = round(usd_cents / 100.0, 2)
        offer_cny = math.ceil(usd_cents * fx_rate * 100.0 - 1e-9) / 100.0
        return usd_cents, offer_usd, round(offer_cny, 2)

    def get_market_price(self, wear_float: float, stattrak: bool = False) -> float:
        """查询对应磨损等级与暗金属性的二级市场阶梯参考价 (¥)。"""
        wear_cn, wear_code = self.classify_wear(wear_float)
        price_map = self.market_st if (stattrak and self.stattrak_allowed and self.market_st) else self.market_normal
        if not price_map:
            return 0.0
        return float(price_map.get(wear_cn, price_map.get(wear_code, 0.0)))

    def sample_wear_float(
        self,
        rng: random.Random,
        wear_weights: Sequence[float] = (0.03, 0.24, 0.33, 0.24, 0.16),
    ) -> Tuple[float, str, str]:
        """
        按照两阶段随机数机制生成磨损值：
          Stage 1: 按 wear_weights 抽取五档区间之一（自带 0.01 边界截断带）
          Stage 2: 在子区间 [a_m, b_m] 内均匀抽样 u，并通过 f = f_min + (f_max - f_min)*u 线性映射
        """
        bucket = rng.choices(WEAR_BUCKETS, weights=wear_weights, k=1)[0]
        u = rng.uniform(float(bucket["min"]), float(bucket["max"]))
        wear_float = round(self.float_min + (self.float_max - self.float_min) * u, 9)
        wear_cn, wear_code = self.classify_wear(wear_float)
        return wear_float, wear_cn, wear_code


@dataclass
class Quote:
    """终端机单次刷新生成的报价单对象。"""
    terminal_index: int
    quote_number: int
    is_final_quote: bool
    skin: Skin
    stattrak: bool
    wear_float: float
    wear_name: str
    wear_code: str
    pattern_seed: int
    usd_cents: int
    offer_price_usd: float
    offer_price_cny: float
    market_price_cny: float

    @property
    def spread_cny(self) -> float:
        """买断即刻净盈亏 (市场价 - 终端报价)。"""
        return round(self.market_price_cny - self.offer_price_cny, 2)

    @property
    def roi(self) -> float:
        """买断回本率 (市场价 / 终端报价)。"""
        return round(self.market_price_cny / self.offer_price_cny, 4) if self.offer_price_cny > 0 else 0.0

    def format_summary(self) -> str:
        st_prefix = "StatTrak™ " if self.stattrak else ""
        final_tag = " [最终报价]" if self.is_final_quote else ""
        return (
            f"[Q{self.quote_number}{final_tag}] [{self.skin.rarity.upper()}] "
            f"{st_prefix}{self.skin.full_name} ({self.wear_name} {self.wear_float:.6f}) | "
            f"终端报价: ¥{self.offer_price_cny:.2f} (${self.offer_price_usd:.2f}) | "
            f"市场价: ¥{self.market_price_cny:.2f} (回本率 {self.roi * 100:.1f}%)"
        )


# =============================================================================
# 3. Terminal 终端机基类
# =============================================================================

class Terminal:
    """
    CS2 终端机通用基类。
    支持自定义生成概率参数、交互式逐抽开箱、买断制策略蒙特卡洛回测与贝尔曼最优停止阈值求解。
    """

    RARITY_NAMES_CN: Dict[str, str] = {
        "milspec": "军规级 (蓝)",
        "restricted": "受限 (紫)",
        "classified": "保密 (粉)",
        "covert": "隐秘 (红)",
        "gold": "罕见特殊★手套 (金)",
    }

    def __init__(
        self,
        name: str,
        skins: Sequence[Skin],
        rarity_weights: Dict[str, float],
        wear_weights: Sequence[float] = (0.03, 0.24, 0.33, 0.24, 0.16),
        stattrak_prob: float = 0.10,
        sixth_quote_prob: float = 0.10,
        base_max_quotes: int = 5,
        fx_rate: float = DEFAULT_FX_RATE,
        seller_discount: float = 0.80,
        terminal_cost_cny: float = 0.3,
        seed: Optional[int] = None,
    ) -> None:
        if len(wear_weights) != 5 or any(w < 0 for w in wear_weights) or sum(wear_weights) <= 0:
            raise ValueError("wear_weights 必须为长度为 5 的非负权重序列（对应 FN/MW/FT/WW/BS）。")

        self.name = name
        self.skins = list(skins)
        self.BuildSkinPools(rarity_weights)

        total_w = sum(wear_weights)
        self.wear_weights: Tuple[float, ...] = tuple(w / total_w for w in wear_weights)
        self.stattrak_prob = float(stattrak_prob)
        self.sixth_quote_prob = float(sixth_quote_prob)
        self.base_max_quotes = int(base_max_quotes)
        self.fx_rate = float(fx_rate)
        self.seller_discount = float(seller_discount)
        self.terminal_cost_cny = float(terminal_cost_cny)
        self.rng = random.Random(seed)

        # 交互式会话状态
        self.session_index: int = 0
        self.current_session_quotes: List[Quote] = []
        self.current_step: int = 0
        self.accepted_quote: Optional[Quote] = None

    def BuildSkinPools(self, rarity_weights: Dict[str, float]) -> None:
        """按品质分组饰品池并归一化品质抽取权重。"""
        self.pools: Dict[str, List[Skin]] = {}
        for s in self.skins:
            self.pools.setdefault(s.rarity, []).append(s)

        active_weights = {r: float(w) for r, w in rarity_weights.items() if r in self.pools and w > 0}
        if not active_weights:
            raise ValueError("rarity_weights 中没有与当前 skins 池匹配的品质。")
        tot = sum(active_weights.values())
        self.rarity_probs: Dict[str, float] = {r: w / tot for r, w in active_weights.items()}
        self._rarity_keys = list(self.rarity_probs.keys())
        self._rarity_vals = [self.rarity_probs[k] for k in self._rarity_keys]

    def roll_single_quote(
        self,
        terminal_index: int = 1,
        quote_number: int = 1,
        is_final_quote: bool = False,
    ) -> Quote:
        """按当前终端机设定参数独立抽取单次报价。"""
        rarity = self.rng.choices(self._rarity_keys, weights=self._rarity_vals, k=1)[0]
        skin = self.rng.choice(self.pools[rarity])
        stattrak = bool(skin.stattrak_allowed and (self.rng.random() < self.stattrak_prob))
        wear_float, wear_cn, wear_code = skin.sample_wear_float(self.rng, self.wear_weights)
        pattern_seed = self.rng.randint(0, 999)
        usd_cents, offer_usd, offer_cny = skin.compute_offer_price(wear_float, stattrak, self.fx_rate)
        mkt_cny = skin.get_market_price(wear_float, stattrak)

        return Quote(
            terminal_index=terminal_index,
            quote_number=quote_number,
            is_final_quote=is_final_quote,
            skin=skin,
            stattrak=stattrak,
            wear_float=wear_float,
            wear_name=wear_cn,
            wear_code=wear_code,
            pattern_seed=pattern_seed,
            usd_cents=usd_cents,
            offer_price_usd=offer_usd,
            offer_price_cny=offer_cny,
            market_price_cny=mkt_cny,
        )

    def generate_session(self, terminal_index: Optional[int] = None) -> List[Quote]:
        """生成整台终端机的完整报价序列（5 抽，或以 sixth_quote_prob 概率生成 6 抽）。"""
        if terminal_index is None:
            self.session_index += 1
            terminal_index = self.session_index
        has_sixth = self.rng.random() < self.sixth_quote_prob
        max_q = self.base_max_quotes + (1 if has_sixth else 0)
        return [
            self.roll_single_quote(terminal_index, q_num, is_final_quote=(q_num == max_q))
            for q_num in range(1, max_q + 1)
        ]

    # -------------------------------------------------------------------------
    # 交互式开箱接口 (start / current / decline / accept)
    # -------------------------------------------------------------------------
    def start_session(self) -> Quote:
        """开启一台新终端机并返回第 1 抽报价。"""
        self.current_session_quotes = self.generate_session()
        self.current_step = 0
        self.accepted_quote = None
        return self.current_session_quotes[0]

    def current_quote(self) -> Quote:
        if not self.current_session_quotes:
            return self.start_session()
        return self.current_session_quotes[self.current_step]

    def decline_and_next(self) -> Optional[Quote]:
        """拒绝当前报价并刷新下一抽；若当前已是最后一抽则返回 None。"""
        if self.accepted_quote is not None:
            raise RuntimeError("当前终端机已买断结束，请调用 start_session() 开启新终端。")
        if self.current_step + 1 >= len(self.current_session_quotes):
            return None
        self.current_step += 1
        return self.current_session_quotes[self.current_step]

    def accept_current(self) -> Quote:
        """接受并买断当前展示的报价。"""
        q = self.current_quote()
        self.accepted_quote = q
        return q

    # -------------------------------------------------------------------------
    # 贝尔曼动态规划精确求解与买断制策略仿真
    # -------------------------------------------------------------------------
    def build_discrete_distribution(
        self, n_float_pts: int = 120
    ) -> Tuple[List[float], List[float], List[float]]:
        """
        构建单次抽取的离散化概率分布 (probs, offer_prices_cny, market_prices_cny)，
        用于精确积分计算数学期望与贝尔曼最优停止方程。
        """
        probs: List[float] = []
        offers_cny: List[float] = []
        markets_cny: List[float] = []

        for rarity, r_prob in self.rarity_probs.items():
            pool = self.pools[rarity]
            skin_prob = r_prob / len(pool)
            for skin in pool:
                st_cases = [(False, 1.0 - self.stattrak_prob), (True, self.stattrak_prob)] if skin.stattrak_allowed else [(False, 1.0)]
                for st_flag, st_prob in st_cases:
                    if st_prob <= 0:
                        continue
                    for wb, w_prob in zip(WEAR_BUCKETS, self.wear_weights):
                        if w_prob <= 0:
                            continue
                        lo, hi = float(wb["min"]), float(wb["max"])
                        step = (hi - lo) / max(1, n_float_pts - 1)
                        pt_prob = skin_prob * st_prob * w_prob / n_float_pts
                        for idx in range(n_float_pts):
                            u = lo + idx * step
                            f_val = skin.float_min + (skin.float_max - skin.float_min) * u
                            _, _, p_cny = skin.compute_offer_price(f_val, st_flag, self.fx_rate)
                            m_cny = skin.get_market_price(f_val, st_flag)
                            probs.append(pt_prob)
                            offers_cny.append(p_cny)
                            markets_cny.append(m_cny)
        return probs, offers_cny, markets_cny

    def solve_bellman_optimal_stopping(
        self, target: str = "offer", n_float_pts: int = 120
    ) -> Dict[str, float | Dict[int, float]]:
        """
        利用贝尔曼逆向归纳法精确求解买断制终端机的最优动态停时阈值：
          target = "offer"  -> 最大化字面支付金额 E[P_tau] (榨干卖家额度)
          target = "market" -> 最大化买家到手二级市场价值 E[M_tau]

        Returns:
            包含单抽期望、最优整机期望、卖家 0.8x 成本以及第 1..5 抽拒绝阈值字典的结果。
        """
        probs, offers_cny, markets_cny = self.build_discrete_distribution(n_float_pts)
        values = offers_cny if target == "offer" else markets_cny

        e_single = sum(p * v for p, v in zip(probs, values))
        q6 = self.sixth_quote_prob
        K = self.base_max_quotes

        # V_{K+1} 为进入隐藏第 6 抽时的期望值
        v_next = e_single
        thresholds: Dict[int, float] = {}

        # 第 K 抽 (默认第 5 抽): 若解锁第 6 抽则以 v_next 为阈值，否则必买
        thresholds[K] = round(v_next, 2)
        e_max_k = sum(p * (v if v >= v_next else v_next) for p, v in zip(probs, values))
        v_curr = (1.0 - q6) * e_single + q6 * e_max_k

        # 逆向递推第 K-1 抽至第 1 抽
        for step in range(K - 1, 0, -1):
            thresholds[step] = round(v_curr, 2)
            v_curr = sum(p * (v if v >= v_curr else v_curr) for p, v in zip(probs, values))

        return {
            "single_draw_expected_cny": round(e_single, 2),
            "optimal_expected_cny": round(v_curr, 2),
            "seller_discounted_cost_cny": round(v_curr * self.seller_discount, 2),
            "thresholds_by_step": thresholds,
        }

    def simulate_buyout_strategy(
        self,
        strategy_fn: Callable[[Quote, int, bool], bool],
        n_terminals: int = 10000,
    ) -> Dict[str, float]:
        """
        在买断制规则（除最终报价必买外，前序轮次由 strategy_fn 决定是否买断）下进行蒙特卡洛模拟。
        strategy_fn(quote, step_number, is_final_quote) -> bool
        """
        total_offer = 0.0
        total_market = 0.0
        total_draws = 0
        early_stops = 0

        for t_idx in range(1, n_terminals + 1):
            session = self.generate_session(t_idx)
            chosen = session[-1]
            for q in session:
                if q.is_final_quote:
                    chosen = q
                    break
                if strategy_fn(q, q.quote_number, q.is_final_quote):
                    chosen = q
                    early_stops += 1
                    break
            total_offer += chosen.offer_price_cny
            total_market += chosen.market_price_cny
            total_draws += chosen.quote_number

        mean_offer = total_offer / n_terminals
        mean_market = total_market / n_terminals
        return {
            "n_terminals": n_terminals,
            "terminal_cost_cny": round(self.terminal_cost_cny, 2),
            "mean_offer_cny": round(mean_offer, 2),
            "mean_total_buyer_cost_cny": round(mean_offer + self.terminal_cost_cny, 2),
            "seller_cost_cny": round(mean_offer * self.seller_discount, 2),
            "mean_market_cny": round(mean_market, 2),
            "early_intercept_rate": round(early_stops / n_terminals, 4),
            "avg_draws_used": round(total_draws / n_terminals, 2),
        }


# =============================================================================
# 4. 子类一：GenesisTerminal (封装的创世终端机)
# =============================================================================

GENESIS_SKINS_DATA: Tuple[Skin, ...] = (
    Skin("MAG-7", "震级", "MAG-7 | MAGnitude", "milspec", 17.9058, 39.5082, 0.0, 1.0, True,
         {"崭新出厂": 4.19, "略有磨损": 1.37, "久经沙场": 0.59, "破损不堪": 0.44, "战痕累累": 0.34},
         {"崭新出厂": 11.85, "略有磨损": 3.37, "久经沙场": 1.58, "破损不堪": 1.22, "战痕累累": 1.00}, 1355),
    Skin("SCAR-20", "牢笼", "SCAR-20 | Caged", "milspec", 18.3484, 44.0845, 0.0, 1.0, True,
         {"崭新出厂": 4.60, "略有磨损": 1.34, "久经沙场": 0.58, "破损不堪": 0.43, "战痕累累": 0.39},
         {"崭新出厂": 10.20, "略有磨损": 2.84, "久经沙场": 1.36, "破损不堪": 1.23, "战痕累累": 1.14}, 1343),
    Skin("MP5-SD", "专注", "MP5-SD | Focus", "milspec", 20.1353, 67.2790, 0.0, 1.0, True,
         {"崭新出厂": 4.40, "略有磨损": 1.31, "久经沙场": 0.58, "破损不堪": 0.43, "战痕累累": 0.34},
         {"崭新出厂": 10.95, "略有磨损": 3.80, "久经沙场": 1.46, "破损不堪": 1.20, "战痕累累": 1.00}, 1344),
    Skin("P250", "牛蛙", "P250 | Bullfrog", "milspec", 22.9673, 120.0987, 0.0, 1.0, True,
         {"崭新出厂": 5.01, "略有磨损": 1.33, "久经沙场": 0.64, "破损不堪": 0.47, "战痕累累": 0.46},
         {"崭新出厂": 10.50, "略有磨损": 3.03, "久经沙场": 1.40, "破损不堪": 1.21, "战痕累累": 1.15}, 1345),
    Skin("MP9", "打口碟", "MP9 | Broken Record", "milspec", 24.6659, 101.1624, 0.0, 1.0, True,
         {"崭新出厂": 4.80, "略有磨损": 1.32, "久经沙场": 0.54, "破损不堪": 0.44, "战痕累累": 0.35},
         {"崭新出厂": 10.12, "略有磨损": 3.38, "久经沙场": 1.35, "破损不堪": 1.21, "战痕累累": 0.96}, 1347),
    Skin("AUG", "后发制人", "AUG | Trigger Discipline", "milspec", 26.1796, 91.4387, 0.0, 1.0, True,
         {"崭新出厂": 4.08, "略有磨损": 1.41, "久经沙场": 0.64, "破损不堪": 0.41, "战痕累累": 0.40},
         {"崭新出厂": 10.53, "略有磨损": 3.53, "久经沙场": 1.56, "破损不堪": 1.36, "战痕累累": 1.01}, 1339),
    Skin("P2000", "红翼", "P2000 | Red Wing", "milspec", 27.5031, 112.7469, 0.0, 1.0, True,
         {"崭新出厂": 4.56, "略有磨损": 1.37, "久经沙场": 0.56, "破损不堪": 0.44, "战痕累累": 0.34},
         {"崭新出厂": 11.62, "略有磨损": 3.10, "久经沙场": 1.55, "破损不堪": 1.22, "战痕累累": 1.08}, 1342),
    Skin("新星", "目镜", "Nova | Ocular", "restricted", 134.0690, 237.9110, 0.0, 1.0, True,
         {"崭新出厂": 17.94, "略有磨损": 6.60, "久经沙场": 3.53, "破损不堪": 3.23, "战痕累累": 2.50},
         {"崭新出厂": 66.10, "略有磨损": 18.00, "久经沙场": 8.81, "破损不堪": 7.05, "战痕累累": 6.20}, 1350),
    Skin("UMP-45", "连续体", "UMP-45 | Continuum", "restricted", 145.6895, 255.6206, 0.0, 1.0, True,
         {"崭新出厂": 26.25, "略有磨损": 6.71, "久经沙场": 3.50, "破损不堪": 3.24, "战痕累累": 2.59},
         {"崭新出厂": 64.50, "略有磨损": 18.49, "久经沙场": 8.60, "破损不堪": 8.30, "战痕累累": 5.76}, 1351),
    Skin("MAC-10", "纸老虎", "MAC-10 | Cat Fight", "restricted", 207.8771, 390.7803, 0.0, 1.0, True,
         {"崭新出厂": 27.98, "略有磨损": 7.15, "久经沙场": 3.73, "破损不堪": 3.21, "战痕累累": 2.71},
         {"崭新出厂": 68.01, "略有磨损": 17.49, "久经沙场": 9.07, "破损不堪": 8.00, "战痕累累": 6.08}, 1349),
    Skin("双持贝瑞塔", "天矢之眼", "Dual Berettas | Angel Eyes", "restricted", 255.0233, 426.3546, 0.0, 1.0, True,
         {"崭新出厂": 27.15, "略有磨损": 7.39, "久经沙场": 3.62, "破损不堪": 3.20, "战痕累累": 2.28},
         {"崭新出厂": 65.10, "略有磨损": 19.00, "久经沙场": 8.68, "破损不堪": 8.27, "战痕累累": 6.29}, 1347),
    Skin("M4A1消音版", "液化", "M4A1-S | Liquidation", "restricted", 654.9365, 1130.8853, 0.0, 1.0, True,
         {"崭新出厂": 93.75, "略有磨损": 27.59, "久经沙场": 12.50, "破损不堪": 7.67, "战痕累累": 5.70},
         {"崭新出厂": 270.00, "略有磨损": 76.60, "久经沙场": 36.00, "破损不堪": 26.00, "战痕累累": 24.12}, 1340),
    Skin("格洛克18型", "镜面马赛克", "Glock-18 | Mirror Mosaic", "classified", 1116.4691, 2066.5376, 0.0, 1.0, True,
         {"崭新出厂": 219.39, "略有磨损": 62.89, "久经沙场": 29.25, "破损不堪": 25.00, "战痕累累": 18.26},
         {"崭新出厂": 642.31, "略有磨损": 184.13, "久经沙场": 85.64, "破损不堪": 68.51, "战痕累累": 57.38}, 1348),
    Skin("MP7", "吸烟有害健康", "MP7 | Smoking Kills", "classified", 1182.5177, 2169.5843, 0.0, 1.0, True,
         {"崭新出厂": 260.40, "略有磨损": 67.78, "久经沙场": 34.72, "破损不堪": 27.78, "战痕累累": 23.26},
         {"崭新出厂": 606.94, "略有磨损": 173.99, "久经沙场": 80.93, "破损不堪": 64.74, "战痕累累": 54.22}, 1354),
    Skin("AWP", "可燃冰", "AWP | Ice Coaled", "classified", 1633.3111, 2620.5364, 0.0, 1.0, True,
         {"崭新出厂": 299.85, "略有磨损": 81.90, "久经沙场": 39.98, "破损不堪": 28.90, "战痕累累": 24.00},
         {"崭新出厂": 659.24, "略有磨损": 189.60, "久经沙场": 87.90, "破损不堪": 70.32, "战痕累累": 58.70}, 1346),
    Skin("M4A4", "破浪狂飙", "M4A4 | Full Throttle", "covert", 6372.7532, 11399.4805, 0.0, 1.0, True,
         {"崭新出厂": 1618.12, "略有磨损": 423.50, "久经沙场": 215.75, "破损不堪": 161.00, "战痕累累": 144.55},
         {"崭新出厂": 3363.77, "略有磨损": 910.00, "久经沙场": 448.50, "破损不堪": 379.00, "战痕累累": 300.50}, 1353),
    Skin("AK-47", "流金王朝", "AK-47 | The Oligarch", "covert", 8310.1600, 15203.6927, 0.0, 1.0, True,
         {"崭新出厂": 2133.36, "略有磨损": 611.56, "久经沙场": 284.45, "破损不堪": 227.56, "战痕累累": 190.58},
         {"崭新出厂": 4011.63, "略有磨损": 1150.00, "久经沙场": 534.88, "破损不堪": 427.91, "战痕累累": 358.37}, 1352),
)


class GenesisTerminal(Terminal):
    """
    封装的创世终端机 (Sealed Genesis Terminal) 子类。
    默认采用官方 5:1 稀有度金字塔 (1250 : 250 : 50 : 10, 无金色手套)、10% 暗金率与 10% 第六抽概率，
    支持通过构造函数参数随时覆盖为实测爆率或自定义参数。
    """

    DEFAULT_RARITY_WEIGHTS: Dict[str, float] = {
        "milspec": 1250.0,
        "restricted": 250.0,
        "classified": 50.0,
        "covert": 10.0,
    }

    def __init__(
        self,
        skins: Sequence[Skin] = GENESIS_SKINS_DATA,
        rarity_weights: Optional[Dict[str, float]] = None,
        wear_weights: Sequence[float] = (0.03, 0.24, 0.33, 0.24, 0.16),
        stattrak_prob: float = 0.10,
        sixth_quote_prob: float = 0.10,
        base_max_quotes: int = 5,
        fx_rate: float = DEFAULT_FX_RATE,
        seller_discount: float = 0.80,
        terminal_cost_cny: float = 0.3,
        seed: Optional[int] = None,
    ) -> None:
        super().__init__(
            name="封装的创世终端机 (Sealed Genesis Terminal)",
            skins=skins,
            rarity_weights=rarity_weights or self.DEFAULT_RARITY_WEIGHTS,
            wear_weights=wear_weights,
            stattrak_prob=stattrak_prob,
            sixth_quote_prob=sixth_quote_prob,
            base_max_quotes=base_max_quotes,
            fx_rate=fx_rate,
            seller_discount=seller_discount,
            terminal_cost_cny=terminal_cost_cny,
            seed=seed,
        )


# =============================================================================
# 5. 子类二：DeadHandTerminal (封装的毁灭之手终端机)
# =============================================================================

DEAD_HAND_SKINS_DATA: Tuple[Skin, ...] = (
    # --- 军规级 (蓝, 7 款) ---
    Skin("截短霰弹枪", "融合", "Sawed-Off | Fusion", "milspec", 3.00, 5.40, 0.0, 1.0, True,
         {"崭新出厂": 2.10, "略有磨损": 0.95, "久经沙场": 0.47, "破损不堪": 0.40, "战痕累累": 0.35}, {}, 1901),
    Skin("FN57", "暗夜聚合", "Five-SeveN | Dark Polymer", "milspec", 5.05, 9.41, 0.0, 1.0, True,
         {"崭新出厂": 2.80, "略有磨损": 1.10, "久经沙场": 0.54, "破损不堪": 0.45, "战痕累累": 0.40}, {}, 1902),
    Skin("PP-野牛", "混音", "PP-Bizon | RMX", "milspec", 5.18, 14.43, 0.0, 1.0, True,
         {"崭新出厂": 2.95, "略有磨损": 1.15, "久经沙场": 0.54, "破损不堪": 0.45, "战痕累累": 0.40}, {}, 1903),
    Skin("UMP-45", "击杀时刻", "UMP-45 | Fragment", "milspec", 5.25, 6.64, 0.0, 1.0, True,
         {"崭新出厂": 2.85, "略有磨损": 1.10, "久经沙场": 0.54, "破损不堪": 0.45, "战痕累累": 0.40}, {}, 1904),
    Skin("M249", "博客积木", "M249 | Bock Blocks", "milspec", 6.61, 5.68, 0.0, 1.0, True,
         {"崭新出厂": 3.62, "略有磨损": 1.00, "久经沙场": 0.47, "破损不堪": 0.40, "战痕累累": 0.33}, {}, 1908),
    Skin("M4A4", "犬牙交错", "M4A4 | Zubastick", "milspec", 6.95, 34.37, 0.0, 1.0, True,
         {"崭新出厂": 3.80, "略有磨损": 1.15, "久经沙场": 0.54, "破损不堪": 0.45, "战痕累累": 0.40}, {}, 1905),
    Skin("USP消音版", "无声一击", "USP-S | Silent Shot", "milspec", 28.20, 150.36, 0.0, 1.0, True,
         {"崭新出厂": 9.80, "略有磨损": 3.40, "久经沙场": 1.74, "破损不堪": 1.35, "战痕累累": 1.10}, {}, 1906),
    # --- 受限级 (紫, 5 款) ---
    Skin("MP9", "都市霸王", "MP9 | Urban Sovereign", "restricted", 85.01, 172.20, 0.0, 1.0, True,
         {"崭新出厂": 19.50, "略有磨损": 8.90, "久经沙场": 4.69, "破损不堪": 4.10, "战痕累累": 3.60}, {}, 1891),
    Skin("加利尔AR", "加利鳄", "Galil AR | Galigator", "restricted", 90.29, 162.52, 0.0, 1.0, True,
         {"崭新出厂": 18.80, "略有磨损": 8.50, "久经沙场": 4.35, "破损不堪": 3.90, "战痕累累": 3.50}, {}, 1892),
    Skin("MP7", "琥珀流光", "MP7 | Amberline", "restricted", 98.10, 175.99, 0.0, 1.0, True,
         {"崭新出厂": 19.80, "略有磨损": 8.80, "久经沙场": 4.62, "破损不堪": 4.10, "战痕累累": 3.60}, {}, 1893),
    Skin("沙漠之鹰", "霜寒之焰", "Desert Eagle | Firebreathing", "restricted", 133.31, 178.64, 0.0, 1.0, True,
         {"崭新出厂": 28.78, "略有磨损": 10.71, "久经沙场": 4.82, "破损不堪": 4.22, "战痕累累": 3.95}, {}, 1895),
    Skin("M4A1消音版", "翠珀金", "M4A1-S | Electrum", "restricted", 154.00, 519.66, 0.0, 1.0, True,
         {"崭新出厂": 34.50, "略有磨损": 13.20, "久经沙场": 6.29, "破损不堪": 5.10, "战痕累累": 4.50}, {}, 1896),
    # --- 保密级 (粉, 3 款) ---
    Skin("P90", "美杜莎之视", "P90 | Deathgaze", "classified", 790.00, 1007.00, 0.0, 1.0, True,
         {"崭新出厂": 142.00, "略有磨损": 62.00, "久经沙场": 31.86, "破损不堪": 26.50, "战痕累累": 22.00}, {}, 1883),
    Skin("P250", "金缮", "P250 | Kintsugi", "classified", 797.00, 1049.00, 0.0, 1.0, True,
         {"崭新出厂": 148.00, "略有磨损": 64.00, "久经沙场": 31.46, "破损不堪": 26.00, "战痕累累": 21.80}, {}, 1884),
    Skin("AK-47", "翔鹤", "AK-47 | Crane Flight", "classified", 3237.00, 4436.00, 0.0, 1.0, True,
         {"崭新出厂": 281.50, "略有磨损": 137.87, "久经沙场": 76.30, "破损不堪": 54.01, "战痕累累": 45.04}, {}, 1885),
    # --- 隐秘级 (红, 2 款) ---
    Skin("格洛克18型", "巅峰状态", "Glock-18 | Fully Tuned", "covert", 8285.00, 8125.00, 0.0, 1.0, True,
         {"崭新出厂": 1080.00, "略有磨损": 540.00, "久经沙场": 302.32, "破损不堪": 245.00, "战痕累累": 198.00}, {}, 1887),
    Skin("AWP", "后翼弃兵", "AWP | Queen's Gambit", "covert", 13116.00, 16724.00, 0.0, 1.0, True,
         {"崭新出厂": 1169.18, "略有磨损": 575.99, "久经沙场": 295.96, "破损不堪": 285.79, "战痕累累": 225.48}, {}, 1888),
    # --- 罕见特殊物品 ★ 手套 (金, 22 款, 磨损区间 [0.06, 0.80], 无暗金) ---
    Skin("驾驶手套（★）", "蓝紫点子", "★ Driver Gloves | Plum Quill", "gold", 9991.0, None, 0.06, 0.80, False,
         {"崭新出厂": 3200.0, "略有磨损": 1150.0, "久经沙场": 595.67, "破损不堪": 490.0, "战痕累累": 380.0}, {}, 1861),
    Skin("驾驶手套（★）", "青海波", "★ Driver Gloves | Seigaiha", "gold", 13547.0, None, 0.06, 0.80, False,
         {"崭新出厂": 2900.0, "略有磨损": 980.0, "久经沙场": 455.12, "破损不堪": 390.0, "战痕累累": 310.0}, {}, 1862),
    Skin("驾驶手套（★）", "针织手套", "★ Driver Gloves | Hand Sweaters", "gold", 14300.0, None, 0.06, 0.80, False,
         {"崭新出厂": 3800.0, "略有磨损": 1280.0, "久经沙场": 624.71, "破损不堪": 510.0, "战痕累累": 410.0}, {}, 1864),
    Skin("运动手套（★）", "奶油细条纹", "★ Sport Gloves | Creme Pinstripe", "gold", 15095.0, None, 0.06, 0.80, False,
         {"崭新出厂": 3100.0, "略有磨损": 1020.0, "久经沙场": 496.81, "破损不堪": 420.0, "战痕累累": 340.0}, {}, 1865),
    Skin("专业手套（★）", "可可伯爵", "★ Specialist Gloves | Chocolate Chesterfield", "gold", 17349.0, None, 0.06, 0.80, False,
         {"崭新出厂": 2950.0, "略有磨损": 960.0, "久经沙场": 486.24, "破损不堪": 410.0, "战痕累累": 330.0}, {}, 1866),
    Skin("驾驶手套（★）", "繁花似锦", "★ Driver Gloves | Brocade Flowers", "gold", 21431.0, None, 0.06, 0.80, False,
         {"崭新出厂": 4800.0, "略有磨损": 1620.0, "久经沙场": 767.68, "破损不堪": 640.0, "战痕累累": 510.0}, {}, 1867),
    Skin("运动手套（★）", "赤色追风", "★ Sport Gloves | Red Racer", "gold", 22836.0, None, 0.06, 0.80, False,
         {"崭新出厂": 4900.0, "略有磨损": 1650.0, "久经沙场": 762.12, "破损不堪": 630.0, "战痕累累": 495.0}, {}, 1868),
    Skin("运动手套（★）", "炽烈之炎", "★ Sport Gloves | Blaze", "gold", 23091.0, None, 0.06, 0.80, False,
         {"崭新出厂": 4500.0, "略有磨损": 1480.0, "久经沙场": 695.19, "破损不堪": 580.0, "战痕累累": 460.0}, {}, 1869),
    Skin("驾驶手套（★）", "龙拳", "★ Driver Gloves | Dragon Fists", "gold", 24651.0, None, 0.06, 0.80, False,
         {"崭新出厂": 3900.0, "略有磨损": 1240.0, "久经沙场": 578.94, "破损不堪": 480.0, "战痕累累": 390.0}, {}, 1870),
    Skin("运动手套（★）", "紫罗兰珠绣", "★ Sport Gloves | Violet Beadwork", "gold", 26027.0, None, 0.06, 0.80, False,
         {"崭新出厂": 7800.0, "略有磨损": 2650.0, "久经沙场": 1320.71, "破损不堪": 1080.0, "战痕累累": 840.0}, {}, 1871),
    Skin("驾驶手套（★）", "深红鹤服", "★ Driver Gloves | Brocade Crane", "gold", 26350.0, None, 0.06, 0.80, False,
         {"崭新出厂": 9226.76, "略有磨损": 2393.25, "久经沙场": 1036.86, "破损不堪": 967.93, "战痕累累": 735.82}, {}, 1863),
    Skin("专业手套（★）", "日芒", "★ Specialist Gloves | Sunburst", "gold", 26394.0, None, 0.06, 0.80, False,
         {"崭新出厂": 5800.0, "略有磨损": 1950.0, "久经沙场": 929.71, "破损不堪": 780.0, "战痕累累": 610.0}, {}, 1872),
    Skin("驾驶手套（★）", "花园", "★ Driver Gloves | Garden", "gold", 27413.0, None, 0.06, 0.80, False,
         {"崭新出厂": 6400.0, "略有磨损": 2180.0, "久经沙场": 1028.77, "破损不堪": 860.0, "战痕累累": 680.0}, {}, 1873),
    Skin("运动手套（★）", "寒霜", "★ Sport Gloves | Frosty", "gold", 29169.0, None, 0.06, 0.80, False,
         {"崭新出厂": 6200.0, "略有磨损": 2100.0, "久经沙场": 1002.19, "破损不堪": 840.0, "战痕累累": 660.0}, {}, 1874),
    Skin("专业手套（★）", "黑皮书", "★ Specialist Gloves | Blackbook", "gold", 30679.0, None, 0.06, 0.80, False,
         {"崭新出厂": 8600.0, "略有磨损": 2950.0, "久经沙场": 1442.18, "破损不堪": 1190.0, "战痕累累": 920.0}, {}, 1875),
    Skin("专业手套（★）", "狂澜", "★ Specialist Gloves | Big Swell", "gold", 33883.0, None, 0.06, 0.80, False,
         {"崭新出厂": 6200.0, "略有磨损": 2120.0, "久经沙场": 1003.33, "破损不堪": 840.0, "战痕累累": 650.0}, {}, 1876),
    Skin("专业手套（★）", "羽袭", "★ Specialist Gloves | Pillow Punchers", "gold", 35116.0, None, 0.06, 0.80, False,
         {"崭新出厂": 12500.0, "略有磨损": 4450.0, "久经沙场": 2235.76, "破损不堪": 1820.0, "战痕累累": 1410.0}, {}, 1877),
    Skin("专业手套（★）", "青柠迷彩", "★ Specialist Gloves | Lime Polycam", "gold", 35588.0, None, 0.06, 0.80, False,
         {"崭新出厂": 8800.0, "略有磨损": 3020.0, "久经沙场": 1469.23, "破损不堪": 1210.0, "战痕累累": 940.0}, {}, 1878),
    Skin("专业手套（★）", "青云狩", "★ Specialist Gloves | Cloud Chaser", "gold", 39144.0, None, 0.06, 0.80, False,
         {"崭新出厂": 14800.0, "略有磨损": 5180.0, "久经沙场": 2573.15, "破损不堪": 2100.0, "战痕累累": 1620.0}, {}, 1879),
    Skin("驾驶手套（★）", "逐沧浪", "★ Driver Gloves | Wave Chaser", "gold", 47493.0, None, 0.06, 0.80, False,
         {"崭新出厂": 5900.0, "略有磨损": 2010.0, "久经沙场": 958.02, "破损不堪": 800.0, "战痕累累": 620.0}, {}, 1880),
    Skin("运动手套（★）", "隐知", "★ Sport Gloves | Occult", "gold", 59133.0, None, 0.06, 0.80, False,
         {"崭新出厂": 15600.0, "略有磨损": 5420.0, "久经沙场": 2703.13, "破损不堪": 2210.0, "战痕累累": 1710.0}, {}, 1881),
    Skin("运动手套（★）", "紫外狂潮", "★ Sport Gloves | Ultra Violent", "gold", 77756.0, None, 0.06, 0.80, False,
         {"崭新出厂": 28500.0, "略有磨损": 9800.0, "久经沙场": 4983.80, "破损不堪": 4050.0, "战痕累累": 3120.0}, {}, 1882),
)


class DeadHandTerminal(Terminal):
    """
    封装的毁灭之手终端机 (Sealed Dead Hand Terminal) 子类。
    默认采用官方含金 5:1 稀有度金字塔 (1250 : 250 : 50 : 10 : 4，含 22 款 ★ 手套)、
    10% 武器暗金率（手套自动无暗金）与 10% 隐藏第六抽概率。
    """

    DEFAULT_RARITY_WEIGHTS: Dict[str, float] = {
        "milspec": 1250.0,
        "restricted": 250.0,
        "classified": 50.0,
        "covert": 10.0,
        "gold": 4.0,
    }

    def __init__(
        self,
        skins: Sequence[Skin] = DEAD_HAND_SKINS_DATA,
        rarity_weights: Optional[Dict[str, float]] = None,
        wear_weights: Sequence[float] = (0.03, 0.24, 0.33, 0.24, 0.16),
        stattrak_prob: float = 0.10,
        sixth_quote_prob: float = 0.10,
        base_max_quotes: int = 5,
        fx_rate: float = DEFAULT_FX_RATE,
        seller_discount: float = 0.80,
        terminal_cost_cny: float = 0.3,
        seed: Optional[int] = None,
    ) -> None:
        super().__init__(
            name="封装的毁灭之手终端机 (Sealed Dead Hand Terminal)",
            skins=skins,
            rarity_weights=rarity_weights or self.DEFAULT_RARITY_WEIGHTS,
            wear_weights=wear_weights,
            stattrak_prob=stattrak_prob,
            sixth_quote_prob=sixth_quote_prob,
            base_max_quotes=base_max_quotes,
            fx_rate=fx_rate,
            seller_discount=seller_discount,
            terminal_cost_cny=terminal_cost_cny,
            seed=seed,
        )


# =============================================================================
# 6. 示例运行与验证入口
# =============================================================================

if __name__ == "__main__":
    # 1. 实例化两款终端机子类（可使用默认官方参数，也可传入自定义生成参数）
    genesis = GenesisTerminal(stattrak_prob=0.10, sixth_quote_prob=0.10, seed=2026)
    dead_hand = DeadHandTerminal(stattrak_prob=0.10, sixth_quote_prob=0.10, seed=2026)

    for term in (genesis, dead_hand):
        print("=" * 78)
        print(f"终端机名称: {term.name}")
        bellman = term.solve_bellman_optimal_stopping(target="offer")
        print(f"  - 单抽无条件期望字面报价 E[P] : ¥{bellman['single_draw_expected_cny']:.2f}")
        print(f"  - 贝尔曼最优买断期望支出 V_1  : ¥{bellman['optimal_expected_cny']:.2f} "
              f"(号商 0.8x 成本: ¥{bellman['seller_discounted_cost_cny']:.2f})")
        print(f"  - 各轮最优拒绝阈值 V_{{k+1}}    : {bellman['thresholds_by_step']}")

        # 演示开启一台终端机完整序列
        sample_session = term.generate_session()
        print(f"  - 示例单台开启序列 (共 {len(sample_session)} 抽):")
        for q in sample_session:
            print("     ", q.format_summary())