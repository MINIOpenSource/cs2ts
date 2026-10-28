import React, { useState } from "react";
import {
  Badge,
  Button,
  Caption1,
  Card,
  Input,
  Subtitle1,
  Subtitle2,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
  Text,
  Title2,
  tokens,
} from "@fluentui/react-components";
import { Checkmark16Regular, Copy16Regular } from "@fluentui/react-icons";
import { RARITY_META } from "../engine";
import type { Terminal } from "../models/Terminal";
import { useAppStyles } from "../styles/useAppStyles";

export interface TerminalOpeningCardProps {
  term: Terminal;
  godMode: boolean;
  onAcceptQuote: () => void;
  onAcceptQuoteAt: (index: number) => void;
  onDeclineQuote: () => void;
  onStartNewSession: () => void;
  onRestoreSessionSeed: (seedInput: string) => void;
}

export const TerminalOpeningCard: React.FC<TerminalOpeningCardProps> = ({
  term,
  godMode,
  onAcceptQuote,
  onAcceptQuoteAt,
  onDeclineQuote,
  onStartNewSession,
  onRestoreSessionSeed,
}) => {
  const styles = useAppStyles();
  const [seedInput, setSeedInput] = useState<string>("");
  const [copiedSeed, setCopiedSeed] = useState<boolean>(false);

  const q = term.current_quote();
  const session = term.current_session_quotes;
  const rMeta = RARITY_META[q.skin.rarity] || RARITY_META.milspec;

  const showAllQuotes = godMode || term.accepted_quote !== null;
  const displayedQuotes = showAllQuotes
    ? session
    : session.slice(0, term.current_step + 1);

  const handleCopyCurrentSeed = () => {
    const seedStr = String(term.current_session_seed);
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(seedStr).catch(() => {});
    }
    setCopiedSeed(true);
    setTimeout(() => setCopiedSeed(false), 1500);
  };

  const handleTriggerRestore = () => {
    const digitsOnly = seedInput.replace(/\D/g, "");
    if (!digitsOnly) return;
    onRestoreSessionSeed(digitsOnly);
  };

  return (
    <Card>
      <div
        className={styles.quoteHero}
        style={{ borderLeft: `6px solid ${rMeta.color}` }}
      >
        <div className={styles.skinHeaderRow}>
          <Title2>
            {q.stattrak ? "暗金 " : ""}
            {q.skin.full_name}
          </Title2>
          <Subtitle1 style={{ color: tokens.colorNeutralForeground2 }}>
            第 {q.quote_number} 次报价 · 编号 #{q.skin.skin_id} · 图案模板 {q.pattern_seed}
          </Subtitle1>
        </div>

        <div className={styles.subCard}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "6px",
              flexWrap: "wrap",
              gap: "4px",
            }}
          >
            <Text weight="semibold">外观：{q.wear_name}</Text>
            <Text weight="semibold">磨损值：{q.wear_float.toFixed(9)}</Text>
          </div>

          <div
            style={{
              position: "relative",
              height: "8px",
              borderRadius: "4px",
              display: "flex",
              overflow: "visible",
              marginBottom: "0",
            }}
          >
            <div style={{ width: "7%", background: "#0078D4" }} />
            <div style={{ width: "8%", background: "#107C10" }} />
            <div style={{ width: "23%", background: "#CA5010" }} />
            <div style={{ width: "7%", background: "#D83B01" }} />
            <div style={{ width: "55%", background: "#A4262C" }} />
            <div
              style={{
                position: "absolute",
                left: `${Math.min(100, Math.max(0, q.wear_float * 100))}%`,
                top: "-4px",
                width: "4px",
                height: "16px",
                background: tokens.colorNeutralForeground1,
                transform: "translateX(-50%)",
                borderRadius: "2px",
              }}
            />
          </div>
        </div>

        <div className={styles.quoteOfferActionRow}>
          {term.accepted_quote === null ? (
            <>
              <div className={styles.actionRow}>
                <Button
                  appearance="primary"
                  size="large"
                  onClick={onAcceptQuote}
                >
                  接受报价 ¥{q.offer_price_cny.toFixed(2)}
                </Button>
                <Button
                  appearance="secondary"
                  size="large"
                  onClick={
                    q.is_final_quote ? onStartNewSession : onDeclineQuote
                  }
                >
                  {q.is_final_quote
                    ? "拒绝最终报价"
                    : `拒绝第 ${q.quote_number} 次报价`}
                </Button>
              </div>
              <div className={styles.actionRow}>
                <Button
                  appearance="outline"
                  size="large"
                  onClick={onStartNewSession}
                >
                  开启新终端机
                </Button>
              </div>
            </>
          ) : (
            <div
              className={styles.actionRow}
              style={{ marginLeft: "auto", justifyContent: "flex-end" }}
            >
              <Text
                weight="semibold"
                style={{
                  color: tokens.colorPaletteGreenForeground1,
                  textAlign: "center",
                }}
              >
                已入库
              </Text>
              <Button
                appearance="primary"
                size="large"
                onClick={onStartNewSession}
              >
                开启新终端机
              </Button>
            </div>
          )}
        </div>
      </div>

      <div
        className={styles.subCard}
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "8px",
          marginBottom: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "4px", flexWrap: "wrap" }}>
          <Caption1 style={{ color: tokens.colorNeutralForeground2 }}>
            当前终端机种子：{term.current_session_seed}
          </Caption1>
          <Button
            size="small"
            appearance="subtle"
            icon={copiedSeed ? <Checkmark16Regular /> : <Copy16Regular />}
            aria-label="复制种子"
            title="复制种子"
            onClick={handleCopyCurrentSeed}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <Input
            size="small"
            inputMode="numeric"
            placeholder="终端机种子"
            value={seedInput}
            onChange={(_, d) => setSeedInput(d.value.replace(/\D/g, ""))}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleTriggerRestore();
            }}
            style={{ width: "160px" }}
          />
          <Button
            size="small"
            appearance="secondary"
            disabled={!seedInput.trim()}
            onClick={handleTriggerRestore}
          >
            加载终端机
          </Button>
        </div>
      </div>

      <Subtitle2 block style={{ marginBottom: "8px" }}>
        本台终端机报价列表
      </Subtitle2>
      <div className={styles.tableScrollWrap}>
        <Table size="small" style={{ minWidth: "480px" }}>
          <TableHeader>
            <TableRow>
              <TableHeaderCell>轮次</TableHeaderCell>
              <TableHeaderCell>品质</TableHeaderCell>
              <TableHeaderCell>饰品名称</TableHeaderCell>
              <TableHeaderCell>磨损</TableHeaderCell>
              <TableHeaderCell>终端买断价</TableHeaderCell>
              {godMode && <TableHeaderCell>操作</TableHeaderCell>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayedQuotes.map((item, idx) => {
              const itemMeta = RARITY_META[item.skin.rarity] || RARITY_META.milspec;
              const isAcceptedRow =
                term.accepted_quote?.quote_number === item.quote_number;
              const isUnrevealedRow = idx > term.current_step;

              return (
                <TableRow key={item.quote_number}>
                  <TableCell>
                    第 {item.quote_number} 抽
                    {item.is_final_quote ? "（终）" : ""}
                    {isAcceptedRow ? "（已买断）" : ""}
                    {!isAcceptedRow && isUnrevealedRow ? "（未揭晓）" : ""}
                  </TableCell>
                  <TableCell>
                    <Badge appearance="outline" color={itemMeta.badgeColor}>
                      {itemMeta.short}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {item.stattrak ? "暗金 " : ""}
                    {item.skin.full_name}
                  </TableCell>
                  <TableCell>
                    {item.wear_name}（{item.wear_float.toFixed(6)}）
                  </TableCell>
                  <TableCell>¥{item.offer_price_cny.toFixed(2)}</TableCell>
                  {godMode && (
                    <TableCell>
                      {term.accepted_quote === null ? (
                        <Button
                          size="small"
                          appearance={
                            idx === term.current_step ? "primary" : "secondary"
                          }
                          onClick={() => onAcceptQuoteAt(idx)}
                        >
                          买断此项
                        </Button>
                      ) : isAcceptedRow ? (
                        <Text
                          size={200}
                          weight="semibold"
                          style={{ color: tokens.colorPaletteGreenForeground1 }}
                        >
                          已入库
                        </Text>
                      ) : null}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
};

