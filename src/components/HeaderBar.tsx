import React, { useState } from "react";
import {
  Button,
  Caption1,
  Divider,
  Input,
  MessageBar,
  MessageBarBody,
  Popover,
  PopoverSurface,
  PopoverTrigger,
  Subtitle2,
  Switch,
  Tab,
  TabList,
  Title3,
  tokens,
} from "@fluentui/react-components";
import { Settings24Regular } from "@fluentui/react-icons";
import { DEFAULT_TERMINAL_COST_CNY } from "../constants/pricing";
import { useAppStyles } from "../styles/useAppStyles";
import type { ActiveTabKey, TerminalKey, WalletMessage } from "../types";

export interface HeaderBarProps {
  terminalKey: TerminalKey;
  onSwitchTerminal: (key: TerminalKey) => void;
  activeTab: ActiveTabKey;
  onTabChange: (tab: ActiveTabKey) => void;
  isMobile: boolean;
  isDark: boolean;
  onToggleTheme: () => void;
  terminalCostCny: number;
  onChangeTerminalCostCny: (cost: number) => void;
  godMode: boolean;
  onToggleGodMode: () => void;
  walletBalance: number;
  walletPopoverOpen: boolean;
  onWalletPopoverOpenChange: (open: boolean) => void;
  rechargeInput: string;
  onRechargeInputChange: (val: string) => void;
  onRecharge: (amount: number | string) => void;
  onResetWallet: () => void;
  walletMsg: WalletMessage | null;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  terminalKey,
  onSwitchTerminal,
  activeTab,
  onTabChange,
  isMobile,
  isDark,
  onToggleTheme,
  terminalCostCny,
  onChangeTerminalCostCny,
  godMode,
  onToggleGodMode,
  walletBalance,
  walletPopoverOpen,
  onWalletPopoverOpenChange,
  rechargeInput,
  onRechargeInputChange,
  onRecharge,
  onResetWallet,
  walletMsg,
}) => {
  const styles = useAppStyles();
  const [costInput, setCostInput] = useState<string>(String(terminalCostCny));

  const applyCost = (raw: string) => {
    setCostInput(raw);
    const trimmed = raw.trim();
    if (trimmed === "") return;
    const parsed = Number(trimmed);
    if (!Number.isNaN(parsed) && parsed >= 0) {
      onChangeTerminalCostCny(Number(parsed.toFixed(2)));
    }
  };

  const handleCostBlur = () => {
    const trimmed = costInput.trim();
    const parsed = Number(trimmed);
    if (trimmed === "" || Number.isNaN(parsed) || parsed < 0) {
      setCostInput(String(terminalCostCny));
    } else {
      const normalized = Number(parsed.toFixed(2));
      setCostInput(String(normalized));
      if (normalized !== terminalCostCny) {
        onChangeTerminalCostCny(normalized);
      }
    }
  };

  const renderSettingsPopover = () => (
    <Popover withArrow trapFocus positioning="below-end">
      <PopoverTrigger disableButtonEnhancement>
        <Button
          size="small"
          appearance="secondary"
          icon={<Settings24Regular />}
          aria-label="设置"
        >
          设置
        </Button>
      </PopoverTrigger>
      <PopoverSurface
        style={{
          width: "280px",
          maxWidth: "calc(100vw - 24px)",
          padding: "16px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <Subtitle2>全局与终端机设置</Subtitle2>
          <Divider />

          <div className={styles.fieldBlock}>
            <Caption1>单台终端机成本</Caption1>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <Input
                type="number"
                step="0.1"
                min="0"
                value={costInput}
                onChange={(_, d) => applyCost(d.value)}
                onBlur={handleCostBlur}
                contentBefore={<Caption1>¥</Caption1>}
                style={{ flex: 1 }}
              />
              <Button
                size="small"
                appearance="subtle"
                onClick={() => {
                  setCostInput(String(DEFAULT_TERMINAL_COST_CNY));
                  onChangeTerminalCostCny(DEFAULT_TERMINAL_COST_CNY);
                }}
              >
                重置
              </Button>
            </div>
            <Caption1 style={{ color: tokens.colorNeutralForeground3 }}>
              默认定义为 {DEFAULT_TERMINAL_COST_CNY} 元
            </Caption1>
          </div>

          <Divider />

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <Caption1 block>上帝模式</Caption1>
              <Caption1 style={{ color: tokens.colorNeutralForeground3 }}>
                揭晓全部报价并允许买断任意一抽
              </Caption1>
            </div>
            <Switch
              checked={godMode}
              onChange={onToggleGodMode}
              label={godMode ? "开启" : "关闭"}
            />
          </div>

          <Divider />

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Caption1>界面深色主题</Caption1>
            <Switch
              checked={isDark}
              onChange={onToggleTheme}
              label={isDark ? "深色" : "浅色"}
            />
          </div>
        </div>
      </PopoverSurface>
    </Popover>
  );

  return (
    <header className={styles.topBar}>
      <div className={styles.topBarInner}>
        <div className={styles.headerBrandRow}>
          <div className={styles.headerLeftTitleWallet}>
            <Title3>CS2 终端机模拟器</Title3>

            <Popover
              withArrow
              trapFocus
              positioning="below-start"
              open={walletPopoverOpen}
              onOpenChange={(_, data) => onWalletPopoverOpenChange(data.open)}
            >
              <PopoverTrigger disableButtonEnhancement>
                <Button size="small" appearance="secondary">
                  钱包：
                  <span
                    style={{
                      color: tokens.colorPaletteGreenForeground1,
                      fontWeight: 600,
                      marginLeft: "4px",
                    }}
                  >
                    ¥{walletBalance.toFixed(2)}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverSurface
                style={{
                  width: "320px",
                  maxWidth: "calc(100vw - 24px)",
                  padding: "16px",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <Subtitle2>我的钱包</Subtitle2>
                    <Title3 style={{ color: tokens.colorPaletteGreenForeground1 }}>
                      ¥{walletBalance.toFixed(2)}
                    </Title3>
                  </div>

                  <Caption1 style={{ color: tokens.colorNeutralForeground3 }}>
                    用于支付终端机买断报价，库存饰品也可按终端报价回收变现
                  </Caption1>

                  {walletMsg && (
                    <MessageBar layout="multiline" intent={walletMsg.intent}>
                      <MessageBarBody
                        style={{
                          whiteSpace: "normal",
                          wordBreak: "break-word",
                          overflowWrap: "anywhere",
                        }}
                      >
                        {walletMsg.text}
                      </MessageBarBody>
                    </MessageBar>
                  )}

                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                      flexWrap: "wrap",
                    }}
                  >
                    <Button
                      size="small"
                      appearance="secondary"
                      onClick={() => onRecharge(100)}
                    >
                      +¥100
                    </Button>
                    <Button
                      size="small"
                      appearance="secondary"
                      onClick={() => onRecharge(1000)}
                    >
                      +¥1,000
                    </Button>
                    <Button
                      size="small"
                      appearance="secondary"
                      onClick={() => onRecharge(10000)}
                    >
                      +¥10,000
                    </Button>
                    <Button
                      size="small"
                      appearance="outline"
                      onClick={onResetWallet}
                    >
                      重置为 0
                    </Button>
                  </div>

                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <Input
                      size="small"
                      type="number"
                      value={rechargeInput}
                      onChange={(_, d) => onRechargeInputChange(d.value)}
                      placeholder="自定义充值金额"
                      style={{ flex: "1 1 140px", minWidth: 0 }}
                    />
                    <Button
                      size="small"
                      appearance="primary"
                      onClick={() => onRecharge(rechargeInput)}
                    >
                      充值
                    </Button>
                  </div>
                </div>
              </PopoverSurface>
            </Popover>
          </div>

          {isMobile && renderSettingsPopover()}
        </div>

        <div className={styles.headerTerminalSwitch}>
          <Button
            size="small"
            appearance={terminalKey === "genesis" ? "primary" : "secondary"}
            onClick={() => onSwitchTerminal("genesis")}
          >
            创世终端机
          </Button>
          <Button
            size="small"
            appearance={terminalKey === "deadhand" ? "primary" : "secondary"}
            onClick={() => onSwitchTerminal("deadhand")}
          >
            毁灭之手终端机
          </Button>
        </div>

        <div className={styles.headerNavGroup}>
          <div style={{ overflowX: "auto", maxWidth: "100%" }}>
            <TabList
              size="small"
              selectedValue={activeTab}
              onTabSelect={(_, d) => onTabChange(d.value as ActiveTabKey)}
            >
              <Tab value="simulator">模拟器</Tab>
              <Tab value="inventory">库存</Tab>
              {isMobile && <Tab value="tradeup">汰换合同</Tab>}
              <Tab value="calculator">计算器</Tab>
              <Tab value="history">历史记录</Tab>
            </TabList>
          </div>

          {!isMobile && renderSettingsPopover()}
        </div>
      </div>
    </header>
  );
};
