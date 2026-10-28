import React, { useState } from "react";
import {
  Badge,
  Button,
  Caption1,
  Card,
  CardHeader,
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
import { Checkmark16Regular, Copy16Regular } from "@fluentui/react-icons";
import { RARITY_META } from "../engine";
import { useAppStyles } from "../styles/useAppStyles";
import type { BadgeColor, HistoryRecord } from "../types";

export interface HistoryCardProps {
  records: HistoryRecord[];
  onClearHistory: () => void;
}

const RECORD_TYPE_META: Record<
  HistoryRecord["type"],
  { label: string; color: BadgeColor }
> = {
  buyout: { label: "终端买断", color: "success" },
  tradeup: { label: "汰换合成", color: "brand" },
  declined_all: { label: "放弃整机", color: "subtle" },
  manual_add: { label: "手动添加", color: "informative" },
};

function formatSourceRound(rec: HistoryRecord): string {
  if (rec.terminalName || rec.terminalKey || rec.terminalIndex !== undefined) {
    const isDeadhand =
      rec.terminalKey === "deadhand" ||
      rec.terminalName?.includes("毁灭之手") ||
      rec.skin.collection === "deadhand";
    const prefix = isDeadhand ? "毁手" : "创世";
    const tIdx = rec.terminalIndex ?? 1;
    const qNum = rec.quoteNumber ?? 1;
    return `${prefix}#${tIdx}/${qNum}`;
  }
  return rec.note || "-";
}

export const HistoryCard: React.FC<HistoryCardProps> = ({
  records,
  onClearHistory,
}) => {
  const styles = useAppStyles();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopySeed = (recId: string, seed: number) => {
    const seedStr = String(seed);
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(seedStr).catch(() => {});
    }
    setCopiedId(recId);
    setTimeout(() => {
      setCopiedId((prev) => (prev === recId ? null : prev));
    }, 1500);
  };

  return (
    <Card>
      <CardHeader
        header={<Subtitle2>历史记录（{records.length} 条）</Subtitle2>}
        action={
          records.length > 0 ? (
            <Button size="small" appearance="subtle" onClick={onClearHistory}>
              清空历史记录
            </Button>
          ) : undefined
        }
      />

      {records.length === 0 ? (
        <Caption1 style={{ color: tokens.colorNeutralForeground3 }}>
          暂无历史记录，买断终端机报价、切换终端机或执行汰换合同后将在此记录流水。
        </Caption1>
      ) : (
        <div className={styles.tableScrollWrap}>
          <Table size="small" style={{ tableLayout: "auto", width: "100%" }}>
            <TableHeader>
              <TableRow>
                <TableHeaderCell style={{ width: "auto", whiteSpace: "nowrap" }}>
                  时间
                </TableHeaderCell>
                <TableHeaderCell style={{ width: "auto", whiteSpace: "nowrap" }}>
                  操作类型
                </TableHeaderCell>
                <TableHeaderCell style={{ width: "auto", whiteSpace: "nowrap" }}>
                  来源 / 轮次
                </TableHeaderCell>
                <TableHeaderCell style={{ width: "auto", whiteSpace: "nowrap" }}>
                  种子
                </TableHeaderCell>
                <TableHeaderCell style={{ width: "auto", whiteSpace: "nowrap" }}>
                  品质
                </TableHeaderCell>
                <TableHeaderCell style={{ width: "auto", whiteSpace: "nowrap" }}>
                  饰品名称
                </TableHeaderCell>
                <TableHeaderCell style={{ width: "auto", whiteSpace: "nowrap" }}>
                  磨损
                </TableHeaderCell>
                <TableHeaderCell style={{ width: "auto", whiteSpace: "nowrap" }}>
                  报价
                </TableHeaderCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((rec) => {
                const tMeta = RECORD_TYPE_META[rec.type];
                const rMeta =
                  RARITY_META[rec.skin.rarity] || RARITY_META.milspec;

                return (
                  <TableRow key={rec.id}>
                    <TableCell style={{ width: "auto", whiteSpace: "nowrap" }}>
                      <Caption1 style={{ color: tokens.colorNeutralForeground3 }}>
                        {rec.timestamp}
                      </Caption1>
                    </TableCell>
                    <TableCell style={{ width: "auto", whiteSpace: "nowrap" }}>
                      <Badge appearance="tint" color={tMeta.color}>
                        {tMeta.label}
                      </Badge>
                    </TableCell>
                    <TableCell style={{ width: "auto", whiteSpace: "nowrap" }}>
                      {formatSourceRound(rec)}
                    </TableCell>
                    <TableCell style={{ width: "auto", whiteSpace: "nowrap" }}>
                      {rec.sessionSeed !== undefined ? (
                        <div
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <Caption1>{rec.sessionSeed}</Caption1>
                          <Button
                            size="small"
                            appearance="subtle"
                            icon={
                              copiedId === rec.id ? (
                                <Checkmark16Regular />
                              ) : (
                                <Copy16Regular />
                              )
                            }
                            aria-label="复制种子"
                            title="复制种子"
                            onClick={() =>
                              handleCopySeed(rec.id, rec.sessionSeed!)
                            }
                          />
                        </div>
                      ) : (
                        <Caption1 style={{ color: tokens.colorNeutralForeground3 }}>
                          -
                        </Caption1>
                      )}
                    </TableCell>
                    <TableCell style={{ width: "auto", whiteSpace: "nowrap" }}>
                      <Badge appearance="outline" color={rMeta.badgeColor}>
                        {rMeta.short}
                      </Badge>
                    </TableCell>
                    <TableCell style={{ width: "auto", whiteSpace: "nowrap" }}>
                      {rec.stattrak ? "暗金 " : ""}
                      {rec.skin.full_name}
                    </TableCell>
                    <TableCell style={{ width: "auto", whiteSpace: "nowrap" }}>
                      {rec.wear_name}（{rec.wear_float.toFixed(6)}）
                    </TableCell>
                    <TableCell style={{ width: "auto", whiteSpace: "nowrap" }}>
                      <Text
                        weight="semibold"
                        style={{
                          color:
                            rec.type === "declined_all"
                              ? tokens.colorNeutralForeground3
                              : tokens.colorBrandForeground1,
                        }}
                      >
                        ¥{rec.priceCny.toFixed(2)}
                      </Text>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  );
};

