import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@fluentui/react-components";
import { HeaderBar } from "./components/HeaderBar";
import { HistoryCard } from "./components/HistoryCard";
import { InventoryCard } from "./components/InventoryCard";
import { KpiSummaryGrid } from "./components/KpiSummaryGrid";
import { PriceCalculatorView } from "./components/PriceCalculatorView";
import { TerminalOpeningCard } from "./components/TerminalOpeningCard";
import { TradeUpContractCard } from "./components/TradeUpContractCard";
import {
  DEFAULT_TERMINAL_COST_CNY,
  RARITY_META,
  Skin,
  createDeadHandTerminal,
  createGenesisTerminal,
  executeTradeUpContract,
} from "./engine";
import type { Quote } from "./models/Quote";
import type { Terminal } from "./models/Terminal";
import {
  loadAppState,
  restoreTerminalSession,
  saveAppState,
  type HydratedAppState,
} from "./services/storageService";
import { useAppStyles } from "./styles/useAppStyles";
import type {
  ActiveTabKey,
  HistoryRecord,
  InventoryItem,
  SimulatorStats,
  TerminalKey,
  WalletMessage,
} from "./types";

export interface AppProps {
  isDark: boolean;
  onToggleTheme: () => void;
}

function formatNowTime(): string {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

export default function App({ isDark, onToggleTheme }: AppProps) {
  const styles = useAppStyles();

  const initialHydratedRef = useRef<HydratedAppState | null | undefined>(
    undefined
  );
  if (initialHydratedRef.current === undefined) {
    initialHydratedRef.current = loadAppState();
  }
  const saved = initialHydratedRef.current;

  const [terminalCostCny, setTerminalCostCny] = useState<number>(
    saved ? saved.terminalCostCny : DEFAULT_TERMINAL_COST_CNY
  );
  const [godMode, setGodMode] = useState<boolean>(
    saved ? saved.godMode : false
  );

  const terminalsRef = useRef<Record<TerminalKey, Terminal> | null>(null);
  if (!terminalsRef.current) {
    const initCost = saved ? saved.terminalCostCny : DEFAULT_TERMINAL_COST_CNY;
    const genesisTerm = createGenesisTerminal({
      sixth_quote_prob: 0.05,
      terminal_cost_cny: initCost,
    });
    const deadhandTerm = createDeadHandTerminal({
      sixth_quote_prob: 0.05,
      terminal_cost_cny: initCost,
    });

    if (saved) {
      restoreTerminalSession(genesisTerm, saved.terminalSessions.genesis);
      restoreTerminalSession(deadhandTerm, saved.terminalSessions.deadhand);
    }

    const activeInitKey: TerminalKey = saved ? saved.terminalKey : "genesis";
    const activeInitTerm =
      activeInitKey === "deadhand" ? deadhandTerm : genesisTerm;
    if (!activeInitTerm.current_session_quotes.length) {
      activeInitTerm.start_session();
    }

    terminalsRef.current = {
      genesis: genesisTerm,
      deadhand: deadhandTerm,
    };
  }

  const [terminalKey, setTerminalKey] = useState<TerminalKey>(
    saved ? saved.terminalKey : "genesis"
  );
  const [activeTab, setActiveTab] = useState<ActiveTabKey>(
    saved ? saved.activeTab : "simulator"
  );
  const [isMobile, setIsMobile] = useState<boolean>(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(max-width: 960px)").matches
      : false
  );
  const [tick, setTick] = useState(0);
  const forceUpdate = () => setTick((t) => t + 1);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 960px)");
    const handler = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
    };
    setIsMobile(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (!isMobile && activeTab === "tradeup") {
      setActiveTab("inventory");
    }
  }, [isMobile, activeTab]);

  const term = terminalsRef.current[terminalKey];

  const [walletBalance, setWalletBalance] = useState<number>(
    saved
      ? saved.walletBalance
      : Number((5000.0 - DEFAULT_TERMINAL_COST_CNY).toFixed(2))
  );
  const [walletPopoverOpen, setWalletPopoverOpen] = useState<boolean>(false);
  const [rechargeInput, setRechargeInput] = useState<string>("1000");
  const [walletMsg, setWalletMsg] = useState<WalletMessage | null>(null);

  const [inventory, setInventory] = useState<InventoryItem[]>(
    saved ? saved.inventory : []
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [tradeUpResult, setTradeUpResult] = useState<InventoryItem | null>(null);
  const [tradeUpError, setTradeUpError] = useState<string | null>(null);

  const [historyRecords, setHistoryRecords] = useState<HistoryRecord[]>(
    saved ? saved.historyRecords : []
  );

  const [stats, setStats] = useState<SimulatorStats>(
    saved
      ? saved.stats
      : {
          terminalsOpened: 1,
          itemsBought: 0,
          totalOfferSpentCny: 0,
          totalTerminalCostCny: DEFAULT_TERMINAL_COST_CNY,
        }
  );

  const [calcSkinIdx, setCalcSkinIdx] = useState<number>(0);
  const [calcWear, setCalcWear] = useState<number | string>(0.27);
  const [calcSt, setCalcSt] = useState<boolean>(false);

  useEffect(() => {
    if (!term.current_session_quotes.length) {
      term.start_session();
      forceUpdate();
    }
  }, [term]);

  useEffect(() => {
    if (!terminalsRef.current) return;
    saveAppState({
      terminalKey,
      activeTab,
      terminalCostCny,
      godMode,
      walletBalance,
      stats,
      inventory,
      historyRecords,
      terminals: terminalsRef.current,
    });
  }, [
    terminalKey,
    activeTab,
    terminalCostCny,
    godMode,
    walletBalance,
    stats,
    inventory,
    historyRecords,
    tick,
  ]);

  const handleChangeTerminalCostCny = (newCost: number) => {
    const cleanCost = Math.max(0, Number(newCost.toFixed(2)));
    setTerminalCostCny(cleanCost);
    terminalsRef.current!.genesis.updateConfig({ terminal_cost_cny: cleanCost });
    terminalsRef.current!.deadhand.updateConfig({ terminal_cost_cny: cleanCost });
    forceUpdate();
  };

  const bellman = useMemo(() => {
    return term.solve_bellman_optimal_stopping(100);
  }, [terminalKey, term]);

  const handleSwitchTerminal = (newKey: TerminalKey) => {
    if (newKey === terminalKey) return;
    const targetTerm = terminalsRef.current![newKey];
    if (!targetTerm.current_session_quotes.length) {
      if (walletBalance < terminalCostCny) {
        setWalletMsg({
          intent: "error",
          text: `钱包余额不足以支付终端机成本 ¥${terminalCostCny.toFixed(2)}！当前余额 ¥${walletBalance.toFixed(2)}，请先充值。`,
        });
        setWalletPopoverOpen(true);
        return;
      }
      targetTerm.start_session();
      setWalletBalance((b) => Number((b - terminalCostCny).toFixed(2)));
      setStats((s) => ({
        ...s,
        terminalsOpened: s.terminalsOpened + 1,
        totalTerminalCostCny: Number(
          (s.totalTerminalCostCny + terminalCostCny).toFixed(2)
        ),
      }));
    }
    setTerminalKey(newKey);
    setCalcSkinIdx(0);
    forceUpdate();
  };

  const handleStartNewSession = () => {
    if (walletBalance < terminalCostCny) {
      setWalletMsg({
        intent: "error",
        text: `钱包余额不足以开启新终端机！开启需终端机成本 ¥${terminalCostCny.toFixed(2)}，当前余额为 ¥${walletBalance.toFixed(2)}，请先充值。`,
      });
      setWalletPopoverOpen(true);
      return;
    }

    if (
      term.current_session_quotes.length > 0 &&
      term.accepted_quote === null
    ) {
      const lastQuote = term.current_quote();
      const declinedRecord: HistoryRecord = {
        id: `hist-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        timestamp: formatNowTime(),
        type: "declined_all",
        terminalKey,
        terminalName: terminalKey === "genesis" ? "创世终端机" : "毁灭之手终端机",
        terminalIndex: lastQuote.terminal_index,
        quoteNumber: lastQuote.quote_number,
        sessionSeed: term.current_session_seed,
        skin: lastQuote.skin,
        stattrak: lastQuote.stattrak,
        wear_float: lastQuote.wear_float,
        wear_name: lastQuote.wear_name,
        wear_code: lastQuote.wear_code,
        priceCny: lastQuote.offer_price_cny,
        note: "未买断开启新机",
      };
      setHistoryRecords((prev) => [declinedRecord, ...prev]);
    }

    term.start_session();
    setWalletBalance((b) => Number((b - terminalCostCny).toFixed(2)));
    setWalletMsg(null);
    setStats((s) => ({
      ...s,
      terminalsOpened: s.terminalsOpened + 1,
      totalTerminalCostCny: Number(
        (s.totalTerminalCostCny + terminalCostCny).toFixed(2)
      ),
    }));
    forceUpdate();
  };

  const handleRestoreSessionSeed = (
    customSeed: number | string,
    targetKey: TerminalKey = terminalKey
  ) => {
    const targetTerm = terminalsRef.current![targetKey];
    targetTerm.start_session(customSeed);
    if (targetKey !== terminalKey) {
      setTerminalKey(targetKey);
      setCalcSkinIdx(0);
    }
    if (activeTab !== "simulator") {
      setActiveTab("simulator");
    }
    setWalletMsg(null);
    forceUpdate();
  };

  const completeBuyoutQuote = (q: Quote) => {
    setWalletBalance((b) => Number((b - q.offer_price_cny).toFixed(2)));
    setWalletMsg(null);

    const termLabel =
      terminalKey === "genesis" ? "创世终端机" : "毁灭之手终端机";

    const newItem: InventoryItem = {
      id: `item-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      source: termLabel,
      skin: q.skin,
      stattrak: q.stattrak,
      wear_float: q.wear_float,
      wear_name: q.wear_name,
      wear_code: q.wear_code,
      pattern_seed: q.pattern_seed,
      usd_cents: q.usd_cents,
      offer_price_usd: q.offer_price_usd,
      offer_price_cny: q.offer_price_cny,
    };

    const newHist: HistoryRecord = {
      id: `hist-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      timestamp: formatNowTime(),
      type: "buyout",
      terminalKey,
      terminalName: termLabel,
      terminalIndex: q.terminal_index,
      quoteNumber: q.quote_number,
      sessionSeed: term.current_session_seed,
      skin: q.skin,
      stattrak: q.stattrak,
      wear_float: q.wear_float,
      wear_name: q.wear_name,
      wear_code: q.wear_code,
      priceCny: q.offer_price_cny,
    };

    setInventory((prev) => [newItem, ...prev]);
    setHistoryRecords((prev) => [newHist, ...prev]);
    setStats((s) => ({
      ...s,
      itemsBought: s.itemsBought + 1,
      totalOfferSpentCny: Number(
        (s.totalOfferSpentCny + q.offer_price_cny).toFixed(2)
      ),
    }));
    forceUpdate();
  };

  const handleAcceptQuote = () => {
    if (term.accepted_quote !== null) return;
    const q = term.current_quote();
    if (walletBalance < q.offer_price_cny) {
      setWalletMsg({
        intent: "error",
        text: `钱包余额不足！当前买断需 ¥${q.offer_price_cny.toFixed(2)}，您的余额为 ¥${walletBalance.toFixed(2)}，请先充值。`,
      });
      setWalletPopoverOpen(true);
      return;
    }

    term.accept_current();
    completeBuyoutQuote(q);
  };

  const handleAcceptQuoteAt = (index: number) => {
    if (term.accepted_quote !== null) return;
    const targetQuote = term.current_session_quotes[index];
    if (!targetQuote) return;
    if (walletBalance < targetQuote.offer_price_cny) {
      setWalletMsg({
        intent: "error",
        text: `钱包余额不足！买断第 ${targetQuote.quote_number} 抽需 ¥${targetQuote.offer_price_cny.toFixed(2)}，您的余额为 ¥${walletBalance.toFixed(2)}，请先充值。`,
      });
      setWalletPopoverOpen(true);
      return;
    }

    const q = term.accept_quote_at(index);
    completeBuyoutQuote(q);
  };

  const handleDeclineQuote = () => {
    if (term.accepted_quote !== null) return;
    const q = term.current_quote();
    if (q.is_final_quote) return;
    setWalletMsg(null);
    term.decline_and_next();
    forceUpdate();
  };

  const handleRecharge = (amount: number | string) => {
    const val = Number(amount);
    if (Number.isNaN(val) || val <= 0) return;
    setWalletBalance((b) => Number((b + val).toFixed(2)));
    setWalletMsg({
      intent: "success",
      text: `成功充值 ¥${val.toFixed(2)}。`,
    });
  };

  const handleResetWallet = () => {
    setWalletBalance(0);
    setWalletMsg({
      intent: "info",
      text: "钱包余额已重置为 ¥0.00。",
    });
  };

  const handleAddManualItem = (
    skin: Skin,
    wearFloat: number,
    stattrak: boolean
  ) => {
    const effectiveSt = Boolean(stattrak && skin.stattrak_allowed);
    const clampedWear = Math.min(
      skin.float_max,
      Math.max(skin.float_min, wearFloat)
    );
    const [wearCn, wearCode] = Skin.classify_wear(clampedWear);
    const [usdCents, offerUsd, offerCny] = skin.compute_offer_price(
      clampedWear,
      effectiveSt,
      term.fx_rate
    );

    const newItem: InventoryItem = {
      id: `manual-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      source: "手动添加",
      skin,
      stattrak: effectiveSt,
      wear_float: clampedWear,
      wear_name: wearCn,
      wear_code: wearCode,
      pattern_seed: Math.floor(Math.random() * 1000),
      usd_cents: usdCents,
      offer_price_usd: offerUsd,
      offer_price_cny: offerCny,
    };

    const newHist: HistoryRecord = {
      id: `hist-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      timestamp: formatNowTime(),
      type: "manual_add",
      skin,
      stattrak: effectiveSt,
      wear_float: clampedWear,
      wear_name: wearCn,
      wear_code: wearCode,
      priceCny: offerCny,
      note: "手动添加至库存",
    };

    setInventory((prev) => [newItem, ...prev]);
    setHistoryRecords((prev) => [newHist, ...prev]);
  };

  const handleBuyCalculatorItem = (
    skin: Skin,
    wearFloat: number,
    stattrak: boolean
  ): boolean => {
    const effectiveSt = Boolean(stattrak && skin.stattrak_allowed);
    const clampedWear = Math.min(
      skin.float_max,
      Math.max(skin.float_min, wearFloat)
    );
    const [wearCn, wearCode] = Skin.classify_wear(clampedWear);
    const [usdCents, offerUsd, offerCny] = skin.compute_offer_price(
      clampedWear,
      effectiveSt,
      term.fx_rate
    );

    if (walletBalance < offerCny) {
      setWalletMsg({
        intent: "error",
        text: `钱包余额不足！购买「${effectiveSt ? "暗金 " : ""}${skin.full_name}」需 ¥${offerCny.toFixed(2)}，您的余额为 ¥${walletBalance.toFixed(2)}，请先充值。`,
      });
      setWalletPopoverOpen(true);
      return false;
    }

    setWalletBalance((b) => Number((b - offerCny).toFixed(2)));
    setWalletMsg(null);

    const newItem: InventoryItem = {
      id: `calc-buy-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      source: "计算器购买",
      skin,
      stattrak: effectiveSt,
      wear_float: clampedWear,
      wear_name: wearCn,
      wear_code: wearCode,
      pattern_seed: Math.floor(Math.random() * 1000),
      usd_cents: usdCents,
      offer_price_usd: offerUsd,
      offer_price_cny: offerCny,
    };

    const newHist: HistoryRecord = {
      id: `hist-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      timestamp: formatNowTime(),
      type: "buyout",
      skin,
      stattrak: effectiveSt,
      wear_float: clampedWear,
      wear_name: wearCn,
      wear_code: wearCode,
      priceCny: offerCny,
      note: "计算器购买",
    };

    setInventory((prev) => [newItem, ...prev]);
    setHistoryRecords((prev) => [newHist, ...prev]);
    setStats((s) => ({
      ...s,
      itemsBought: s.itemsBought + 1,
      totalOfferSpentCny: Number((s.totalOfferSpentCny + offerCny).toFixed(2)),
    }));
    return true;
  };

  const handleToggleSelectInv = (item: InventoryItem) => {
    setTradeUpError(null);
    if (selectedIds.includes(item.id)) {
      setSelectedIds((prev) => prev.filter((id) => id !== item.id));
      return;
    }

    const rMeta = RARITY_META[item.skin.rarity];
    if (!rMeta || !rMeta.nextRarity || !rMeta.tradeCount) {
      setTradeUpError("罕见特殊手套已是最高品质，无法参与汰换合同。");
      return;
    }
    if (item.skin.rarity === "covert" && item.skin.collection === "genesis") {
      setTradeUpError(
        "创世收藏品没有金色手套池，仅毁灭之手隐秘级饰品可 5 合 1 汰换手套。"
      );
      return;
    }

    const currentSelectedItems = inventory.filter((x) =>
      selectedIds.includes(x.id)
    );
    if (currentSelectedItems.length > 0) {
      const first = currentSelectedItems[0];
      if (first.skin.rarity !== item.skin.rarity) {
        setTradeUpError("汰换合同要求投入的所有饰品必须为相同品质。");
        return;
      }
      if (first.stattrak !== item.stattrak) {
        setTradeUpError(
          "汰换合同要求投入的所有饰品必须同为普通版或同为暗金版。"
        );
        return;
      }
      if (currentSelectedItems.length >= rMeta.tradeCount) {
        setTradeUpError(`该品质汰换合同最多投入 ${rMeta.tradeCount} 件材料。`);
        return;
      }
    }

    setSelectedIds((prev) => [...prev, item.id]);
  };

  const handleExecuteTradeUp = () => {
    setTradeUpError(null);
    const inputItems = inventory.filter((x) => selectedIds.includes(x.id));
    try {
      const outputItem = executeTradeUpContract(inputItems, term.fx_rate);
      setInventory((prev) => [
        outputItem,
        ...prev.filter((x) => !selectedIds.includes(x.id)),
      ]);
      setSelectedIds([]);
      setTradeUpResult(outputItem);

      const newHist: HistoryRecord = {
        id: `hist-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        timestamp: formatNowTime(),
        type: "tradeup",
        skin: outputItem.skin,
        stattrak: outputItem.stattrak,
        wear_float: outputItem.wear_float,
        wear_name: outputItem.wear_name,
        wear_code: outputItem.wear_code,
        priceCny: outputItem.offer_price_cny,
        note: `${inputItems.length} 合 1 汰换产出`,
      };
      setHistoryRecords((prev) => [newHist, ...prev]);
    } catch (err) {
      setTradeUpError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleSellInventoryItem = (item: InventoryItem) => {
    setInventory((prev) => prev.filter((x) => x.id !== item.id));
    setSelectedIds((prev) => prev.filter((id) => id !== item.id));
    setWalletBalance((b) => Number((b + item.offer_price_cny).toFixed(2)));
  };

  const handleSellAllInventory = () => {
    const totalRefund = inventory.reduce((acc, x) => acc + x.offer_price_cny, 0);
    setWalletBalance((b) => Number((b + totalRefund).toFixed(2)));
    setInventory([]);
    setSelectedIds([]);
  };

  const selectedTradeItems = inventory.filter((x) => selectedIds.includes(x.id));
  const requiredTradeCount =
    selectedTradeItems.length > 0
      ? RARITY_META[selectedTradeItems[0].skin.rarity]?.tradeCount || 10
      : 10;

  const currentQuote = term.current_quote();

  return (
    <div className={styles.page}>
      <HeaderBar
        terminalKey={terminalKey}
        onSwitchTerminal={handleSwitchTerminal}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isMobile={isMobile}
        isDark={isDark}
        onToggleTheme={onToggleTheme}
        terminalCostCny={terminalCostCny}
        onChangeTerminalCostCny={handleChangeTerminalCostCny}
        godMode={godMode}
        onToggleGodMode={() => setGodMode((v) => !v)}
        walletBalance={walletBalance}
        walletPopoverOpen={walletPopoverOpen}
        onWalletPopoverOpenChange={setWalletPopoverOpen}
        rechargeInput={rechargeInput}
        onRechargeInputChange={setRechargeInput}
        onRecharge={handleRecharge}
        onResetWallet={handleResetWallet}
        walletMsg={walletMsg}
      />

      <main className={styles.container}>
        {terminalKey === "deadhand" && (
          <div className={styles.deadhandNotice}>
            毁灭之手终端机的价格模型来源于 Oki 的公共报价，无法验证真实性和可靠性，仅作参考。
          </div>
        )}

        {activeTab === "simulator" && (
          <>
            <KpiSummaryGrid
              terminalIndex={currentQuote.terminal_index}
              quoteNumber={currentQuote.quote_number}
              stats={stats}
              inventoryCount={inventory.length}
            />

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <TerminalOpeningCard
                term={term}
                godMode={godMode}
                onAcceptQuote={handleAcceptQuote}
                onAcceptQuoteAt={handleAcceptQuoteAt}
                onDeclineQuote={handleDeclineQuote}
                onStartNewSession={handleStartNewSession}
                onRestoreSessionSeed={(seedStr) =>
                  handleRestoreSessionSeed(seedStr, terminalKey)
                }
              />

              <HistoryCard
                records={historyRecords}
                onClearHistory={() => setHistoryRecords([])}
              />
            </div>
          </>
        )}

        {activeTab === "inventory" &&
          (isMobile ? (
            <InventoryCard
              inventory={inventory}
              selectedIds={selectedIds}
              onToggleSelectInv={handleToggleSelectInv}
              onSellInventoryItem={handleSellInventoryItem}
              onSellAllInventory={handleSellAllInventory}
              onAddManualItem={handleAddManualItem}
            />
          ) : (
            <div className={styles.inventoryTradeLayout}>
              <InventoryCard
                inventory={inventory}
                selectedIds={selectedIds}
                onToggleSelectInv={handleToggleSelectInv}
                onSellInventoryItem={handleSellInventoryItem}
                onSellAllInventory={handleSellAllInventory}
                onAddManualItem={handleAddManualItem}
              />

              <TradeUpContractCard
                selectedIds={selectedIds}
                selectedTradeItems={selectedTradeItems}
                requiredTradeCount={requiredTradeCount}
                tradeUpError={tradeUpError}
                tradeUpResult={tradeUpResult}
                fxRate={term.fx_rate}
                onClearSelected={() => setSelectedIds([])}
                onExecuteTradeUp={handleExecuteTradeUp}
              />
            </div>
          ))}

        {activeTab === "tradeup" && (
          <TradeUpContractCard
            selectedIds={selectedIds}
            selectedTradeItems={selectedTradeItems}
            requiredTradeCount={requiredTradeCount}
            tradeUpError={tradeUpError}
            tradeUpResult={tradeUpResult}
            fxRate={term.fx_rate}
            onClearSelected={() => setSelectedIds([])}
            onExecuteTradeUp={handleExecuteTradeUp}
          />
        )}

        {activeTab === "calculator" && (
          <PriceCalculatorView
            term={term}
            bellman={bellman}
            calcSkinIdx={calcSkinIdx}
            onCalcSkinIdxChange={setCalcSkinIdx}
            calcWear={calcWear}
            onCalcWearChange={setCalcWear}
            calcSt={calcSt}
            onCalcStChange={setCalcSt}
            onAddItemToInventory={handleAddManualItem}
            onBuyItemToInventory={handleBuyCalculatorItem}
          />
        )}

        {activeTab === "history" && (
          <HistoryCard
            records={historyRecords}
            onClearHistory={() => setHistoryRecords([])}
          />
        )}
      </main>

      <footer className={styles.footer}>
        {terminalKey === "deadhand" && (
          <div>
            毁灭之手终端机的价格模型来源于 Oki 的公共报价，无法验证真实性和可靠性，仅作参考。
          </div>
        )}
        <div>皮肤编号不在本次研究范围内，不具备参考价值。</div>
        <div>
          模拟器仅供参考，请以实际报价为准，不构成参考，也不倡导或支持相关行为。
        </div>
        <div>交流加群：706066207</div>
        <div>
          <Link
            href="https://github.com/MINIOpenSource/cs2ts"
            target="_blank"
            rel="noreferrer noopener"
          >
            GitHub 仓库
          </Link>
        </div>
      </footer>
    </div>
  );
}
