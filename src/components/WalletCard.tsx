import React from "react";
import {
  Button,
  Caption1,
  Card,
  Input,
  Subtitle2,
  Title3,
  tokens,
} from "@fluentui/react-components";

export interface WalletCardProps {
  walletBalance: number;
  rechargeInput: string;
  onRechargeInputChange: (val: string) => void;
  onRecharge: (amount: number | string) => void;
  onResetWallet: () => void;
}

export const WalletCard: React.FC<WalletCardProps> = ({
  walletBalance,
  rechargeInput,
  onRechargeInputChange,
  onRecharge,
  onResetWallet,
}) => {
  return (
    <Card>
      <div style={{ marginBottom: "8px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
            gap: "12px",
            flexWrap: "wrap",
            marginBottom: "4px",
          }}
        >
          <Subtitle2>我的钱包</Subtitle2>
          <Title3 style={{ color: tokens.colorPaletteGreenForeground1 }}>
            ¥{walletBalance.toFixed(2)}
          </Title3>
        </div>
        <Caption1 block style={{ color: tokens.colorNeutralForeground3 }}>
          用于支付终端机买断报价，库存饰品也可按终端报价回收变现
        </Caption1>
      </div>

      <div
        style={{
          display: "flex",
          gap: "8px",
          flexWrap: "wrap",
          marginBottom: "10px",
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
          重置钱包
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
    </Card>
  );
};

