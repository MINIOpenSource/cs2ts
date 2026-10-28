import React from "react";
import {
  Badge,
  Button,
  Caption1,
  Card,
  CardHeader,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Subtitle2,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  Text,
  tokens,
} from "@fluentui/react-components";
import { RARITY_META, previewTradeUpOutcomes } from "../engine";
import { useAppStyles } from "../styles/useAppStyles";
import type { InventoryItem } from "../types";

export interface TradeUpContractCardProps {
  selectedIds: string[];
  selectedTradeItems: InventoryItem[];
  requiredTradeCount: number;
  tradeUpError: string | null;
  tradeUpResult: InventoryItem | null;
  fxRate?: number;
  onClearSelected: () => void;
  onExecuteTradeUp: () => void;
}

export const TradeUpContractCard: React.FC<TradeUpContractCardProps> = ({
  selectedIds,
  selectedTradeItems,
  requiredTradeCount,
  tradeUpError,
  tradeUpResult,
  fxRate,
  onClearSelected,
  onExecuteTradeUp,
}) => {
  const styles = useAppStyles();
  const outcomes = previewTradeUpOutcomes(selectedTradeItems, fxRate);

  return (
    <Card>
      <CardHeader
        header={<Subtitle2>汰换合同模拟器</Subtitle2>}
        action={
          selectedIds.length > 0 ? (
            <Button size="small" appearance="subtle" onClick={onClearSelected}>
              清空已选（{selectedIds.length}）
            </Button>
          ) : undefined
        }
      />

      {tradeUpError && (
        <MessageBar
          layout="multiline"
          intent="error"
          style={{ marginBottom: "12px" }}
        >
          <MessageBarBody
            style={{
              whiteSpace: "normal",
              wordBreak: "break-word",
              overflowWrap: "anywhere",
            }}
          >
            {tradeUpError}
          </MessageBarBody>
        </MessageBar>
      )}

      {tradeUpResult && (
        <MessageBar
          layout="multiline"
          intent="success"
          style={{ marginBottom: "12px" }}
        >
          <MessageBarBody
            style={{
              whiteSpace: "normal",
              wordBreak: "break-word",
              overflowWrap: "anywhere",
            }}
          >
            <MessageBarTitle>汰换成功！</MessageBarTitle>
            获得「{tradeUpResult.stattrak ? "暗金 " : ""}
            {tradeUpResult.skin.full_name}」（外观：{tradeUpResult.wear_name}，磨损值：
            {tradeUpResult.wear_float.toFixed(7)}，报价 ¥
            {tradeUpResult.offer_price_cny.toFixed(2)}），已存入库存。
          </MessageBarBody>
        </MessageBar>
      )}

      {outcomes.length > 0 && (
        <div className={styles.subCard} style={{ marginBottom: "12px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "8px",
              marginBottom: "8px",
            }}
          >
            <Text weight="semibold">产出预览</Text>
            <Caption1 style={{ color: tokens.colorNeutralForeground3 }}>
              {outcomes[0].wear_name}：{outcomes[0].wear_float.toFixed(6)}
            </Caption1>
          </div>
          <div className={styles.tableScrollWrap}>
            <Table size="small" style={{ tableLayout: "auto", width: "100%" }}>
              <TableHeader>
                <TableRow>
                  <TableHeaderCell>产出饰品</TableHeaderCell>
                  <TableHeaderCell>产出概率</TableHeaderCell>
                  <TableHeaderCell>对应终端报价</TableHeaderCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {outcomes.map((o) => {
                  const oMeta = RARITY_META[o.skin.rarity] || RARITY_META.milspec;
                  return (
                    <TableRow key={o.skin.skin_id}>
                      <TableCell>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            flexWrap: "wrap",
                          }}
                        >
                          <Badge appearance="outline" color={oMeta.badgeColor}>
                            {oMeta.short}
                          </Badge>
                          <span>
                            {o.stattrak ? "暗金 " : ""}
                            {o.skin.full_name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Text weight="semibold">
                          {(o.probability * 100).toFixed(1)}%
                        </Text>
                      </TableCell>
                      <TableCell>
                        <Text
                          weight="semibold"
                          style={{ color: tokens.colorBrandForeground1 }}
                        >
                          ¥{o.offer_price_cny.toFixed(2)}
                        </Text>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <div
        className={styles.subCard}
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div>
          <Text weight="semibold" block>
            已投入汰换材料：{selectedTradeItems.length} / {requiredTradeCount} 件
          </Text>
          <Caption1 style={{ color: tokens.colorNeutralForeground3 }}>
            {selectedTradeItems.length > 0
              ? `当前选中品质：${
                  RARITY_META[selectedTradeItems[0].skin.rarity]?.name
                } · 平均磨损值：${(
                  selectedTradeItems.reduce((acc, x) => acc + x.wear_float, 0) /
                  selectedTradeItems.length
                ).toFixed(6)}`
              : "请点击库存卡片（或右上角复选框）选择汰换材料"}
          </Caption1>
        </div>
        <Button
          appearance="primary"
          disabled={selectedTradeItems.length !== requiredTradeCount}
          onClick={onExecuteTradeUp}
        >
          执行汰换合同（{selectedTradeItems.length}/{requiredTradeCount}）
        </Button>
      </div>
    </Card>
  );
};
