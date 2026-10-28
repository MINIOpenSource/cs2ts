import React from "react";
import { Card, Caption1, Title3, tokens } from "@fluentui/react-components";
import { useAppStyles } from "../styles/useAppStyles";
import type { SimulatorStats } from "../types";

export interface KpiSummaryGridProps {
  terminalIndex: number;
  quoteNumber: number;
  stats: SimulatorStats;
  inventoryCount: number;
}

export const KpiSummaryGrid: React.FC<KpiSummaryGridProps> = ({
  terminalIndex,
  quoteNumber,
  stats,
  inventoryCount,
}) => {
  const styles = useAppStyles();

  return (
    <div className={styles.kpiGrid}>
      <Card className={styles.kpiCard}>
        <Caption1 style={{ color: tokens.colorNeutralForeground3 }}>
          当前终端机 / 报价进度
        </Caption1>
        <Title3 style={{ color: tokens.colorBrandForeground1 }}>
          {terminalIndex}/{quoteNumber}
        </Title3>
      </Card>
      <Card className={styles.kpiCard}>
        <Caption1 style={{ color: tokens.colorNeutralForeground3 }}>
          已开启终端机 / 已买断
        </Caption1>
        <Title3>
          {stats.terminalsOpened} 台 / {stats.itemsBought} 件
        </Title3>
      </Card>
      <Card className={styles.kpiCard}>
        <Caption1 style={{ color: tokens.colorNeutralForeground3 }}>
          累计买断总支出
        </Caption1>
        <Title3>¥{stats.totalOfferSpentCny.toFixed(2)}</Title3>
      </Card>
      <Card className={styles.kpiCard}>
        <Caption1 style={{ color: tokens.colorNeutralForeground3 }}>
          当前库存饰品数
        </Caption1>
        <Title3>{inventoryCount} 件</Title3>
      </Card>
    </div>
  );
};
