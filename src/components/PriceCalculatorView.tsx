import React, { useMemo, useRef, useState } from "react";
import {
  Button,
  Caption1,
  Card,
  CardHeader,
  Input,
  Select,
  Subtitle2,
  Switch,
  Text,
  Title3,
  tokens,
} from "@fluentui/react-components";
import { KNOT_FLOATS, RARITY_META, Skin } from "../engine";
import type { Terminal } from "../models/Terminal";
import { useAppStyles } from "../styles/useAppStyles";
import type { BellmanSolution } from "../types";

export interface PriceCalculatorViewProps {
  term: Terminal;
  bellman: BellmanSolution;
  calcSkinIdx: number;
  onCalcSkinIdxChange: (idx: number) => void;
  calcWear: number | string;
  onCalcWearChange: (wear: number | string) => void;
  calcSt: boolean;
  onCalcStChange: (st: boolean) => void;
  onAddItemToInventory: (
    skin: Skin,
    wearFloat: number,
    stattrak: boolean
  ) => void;
  onBuyItemToInventory: (
    skin: Skin,
    wearFloat: number,
    stattrak: boolean
  ) => boolean;
}

export const PriceCalculatorView: React.FC<PriceCalculatorViewProps> = ({
  term,
  bellman,
  calcSkinIdx,
  onCalcSkinIdxChange,
  calcWear,
  onCalcWearChange,
  calcSt,
  onCalcStChange,
  onAddItemToInventory,
  onBuyItemToInventory,
}) => {
  const styles = useAppStyles();
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const calcSkin = term.skins[calcSkinIdx] || term.skins[0];
  const rawWearStr = String(calcWear).trim();
  const parsedCalcWear = rawWearStr === "" ? Number.NaN : Number(rawWearStr);
  const clampedCalcWear = Math.min(
    calcSkin.float_max,
    Math.max(
      calcSkin.float_min,
      Number.isNaN(parsedCalcWear) ? 0.27 : parsedCalcWear
    )
  );
  const effectiveCalcSt = calcSt && calcSkin.stattrak_allowed;
  const [, , calcCny] = calcSkin.compute_offer_price(
    clampedCalcWear,
    effectiveCalcSt,
    term.fx_rate
  );
  const [calcWearCn] = Skin.classify_wear(clampedCalcWear);

  const curveData = useMemo(() => {
    const fMin = calcSkin.float_min;
    const fMax = calcSkin.float_max;
    const sampleFloats = new Set<number>([fMin, fMax]);
    for (const kf of KNOT_FLOATS) {
      if (kf >= fMin && kf <= fMax) {
        sampleFloats.add(kf);
      }
    }
    const steps = 120;
    for (let i = 0; i <= steps; i++) {
      const f = Number((fMin + ((fMax - fMin) * i) / steps).toFixed(6));
      sampleFloats.add(f);
    }
    const sortedFloats = Array.from(sampleFloats).sort((a, b) => a - b);
    const points = sortedFloats.map((f) => {
      const [, , price] = calcSkin.compute_offer_price(
        f,
        effectiveCalcSt,
        term.fx_rate
      );
      return { f, price };
    });

    const knotPoints = KNOT_FLOATS.filter((kf) => kf >= fMin && kf <= fMax).map(
      (kf) => {
        const [, , price] = calcSkin.compute_offer_price(
          kf,
          effectiveCalcSt,
          term.fx_rate
        );
        return { f: kf, price };
      }
    );

    const prices = points.map((p) => p.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    return { points, knotPoints, minPrice, maxPrice };
  }, [calcSkin, effectiveCalcSt, term.fx_rate]);

  const svgWidth = 760;
  const svgHeight = 250;
  const padLeft = 64;
  const padRight = 24;
  const padTop = 20;
  const padBottom = 38;
  const plotW = svgWidth - padLeft - padRight;
  const plotH = svgHeight - padTop - padBottom;

  const toX = (f: number) => padLeft + Math.min(1, Math.max(0, f)) * plotW;
  const priceSpan = Math.max(0.01, curveData.maxPrice - curveData.minPrice);
  const toY = (p: number) =>
    padTop + plotH - ((p - curveData.minPrice) / priceSpan) * plotH;

  const polylinePoints = curveData.points
    .map((pt) => `${toX(pt.f).toFixed(1)},${toY(pt.price).toFixed(1)}`)
    .join(" ");

  const areaPoints =
    curveData.points.length > 0
      ? `${toX(curveData.points[0].f).toFixed(1)},${(padTop + plotH).toFixed(1)} ${polylinePoints} ${toX(
          curveData.points[curveData.points.length - 1].f
        ).toFixed(1)},${(padTop + plotH).toFixed(1)}`
      : "";

  const curX = toX(clampedCalcWear);
  const curY = toY(calcCny);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const updateWearFromClientX = (clientX: number) => {
    const svgEl = svgRef.current;
    if (!svgEl) return;
    const rect = svgEl.getBoundingClientRect();
    if (rect.width <= 0) return;
    const svgX = ((clientX - rect.left) / rect.width) * svgWidth;
    const rawFloat = (svgX - padLeft) / plotW;
    const clampedFloat = Math.min(
      calcSkin.float_max,
      Math.max(calcSkin.float_min, rawFloat)
    );
    onCalcWearChange(Number(clampedFloat.toFixed(6)));
  };

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    updateWearFromClientX(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDragging) return;
    updateWearFromClientX(e.clientX);
  };

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDragging) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    setIsDragging(false);
  };

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => {
    const val = curveData.minPrice + priceSpan * t;
    return { val, y: toY(val) };
  });

  const xBoundaries = [0.0, 0.07, 0.15, 0.38, 0.45, 1.0];

  const handleAddClick = () => {
    onAddItemToInventory(
      calcSkin,
      Number(clampedCalcWear.toFixed(9)),
      effectiveCalcSt
    );
    setActionFeedback("已添加至库存");
    setTimeout(() => setActionFeedback(null), 1500);
  };

  const handleBuyClick = () => {
    const ok = onBuyItemToInventory(
      calcSkin,
      Number(clampedCalcWear.toFixed(9)),
      effectiveCalcSt
    );
    if (ok) {
      setActionFeedback("已购买入库");
      setTimeout(() => setActionFeedback(null), 1500);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <Card>
        <div className={styles.cardTitleBar}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Subtitle2>终端机官方报价计算器</Subtitle2>
            {actionFeedback && (
              <Caption1
                style={{
                  color: tokens.colorPaletteGreenForeground1,
                  fontWeight: 600,
                }}
              >
                {actionFeedback}
              </Caption1>
            )}
          </div>
          <div className={styles.cardTitleActions}>
            <Button
              size="small"
              appearance="secondary"
              onClick={handleAddClick}
            >
              添加该饰品到库存
            </Button>
            <Button
              size="small"
              appearance="primary"
              onClick={handleBuyClick}
            >
              购买该饰品到库存
            </Button>
          </div>
        </div>

        <div className={styles.calcFormGrid}>
          <div className={styles.fieldBlock}>
            <Caption1>选择饰品或手套</Caption1>
            <Select
              value={String(calcSkinIdx)}
              onChange={(_, d) => onCalcSkinIdxChange(Number(d.value))}
            >
              {term.skins.map((s, idx) => (
                <option key={s.skin_id} value={idx}>
                  [{RARITY_META[s.rarity]?.short}] {s.full_name}
                </option>
              ))}
            </Select>
          </div>

          <div className={styles.fieldBlock}>
            <Caption1>
              磨损值（[{calcSkin.float_min.toFixed(2)},{" "}
              {calcSkin.float_max.toFixed(2)}]）
            </Caption1>
            <Input
              type="number"
              step="0.001"
              min={calcSkin.float_min}
              max={calcSkin.float_max}
              value={String(calcWear)}
              onChange={(_, d) => onCalcWearChange(d.value)}
            />
          </div>

          <Switch
            disabled={!calcSkin.stattrak_allowed}
            checked={effectiveCalcSt}
            onChange={(_, d) => onCalcStChange(d.checked)}
            label="暗金"
          />
        </div>

        <div className={styles.subCard} style={{ marginBottom: "14px" }}>
          <Caption1>有效人民币报价</Caption1>
          <Title3 block style={{ color: tokens.colorBrandForeground1 }}>
            ¥{calcCny.toFixed(2)}（{calcWearCn}）
          </Title3>
        </div>

        <div className={styles.subCard}>
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
            <Text weight="semibold">
              {effectiveCalcSt ? "暗金 " : ""}
              {calcSkin.full_name} · 报价磨损曲线
            </Text>
            <Caption1 style={{ color: tokens.colorNeutralForeground3 }}>
              报价范围：¥{curveData.minPrice.toFixed(2)} ~ ¥
              {curveData.maxPrice.toFixed(2)}
            </Caption1>
          </div>

          <svg
            ref={svgRef}
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            style={{
              width: "100%",
              height: "auto",
              display: "block",
              cursor: isDragging ? "grabbing" : "ew-resize",
              userSelect: "none",
              touchAction: "none",
            }}
          >
            {yTicks.map((tk, i) => (
              <g key={i}>
                <line
                  x1={padLeft}
                  y1={tk.y}
                  x2={padLeft + plotW}
                  y2={tk.y}
                  stroke={tokens.colorNeutralStroke2}
                  strokeDasharray="3 3"
                />
                <text
                  x={padLeft - 8}
                  y={tk.y + 4}
                  textAnchor="end"
                  fontSize="11"
                  fill={tokens.colorNeutralForeground3}
                >
                  ¥{tk.val.toFixed(2)}
                </text>
              </g>
            ))}

            {xBoundaries.map((xb, i) => {
              const xPos = toX(xb);
              return (
                <g key={i}>
                  <line
                    x1={xPos}
                    y1={padTop}
                    x2={xPos}
                    y2={padTop + plotH}
                    stroke={tokens.colorNeutralStroke2}
                    strokeDasharray="2 3"
                  />
                  <text
                    x={xPos}
                    y={padTop + plotH + 18}
                    textAnchor="middle"
                    fontSize="11"
                    fill={tokens.colorNeutralForeground3}
                  >
                    {xb.toFixed(2)}
                  </text>
                </g>
              );
            })}

            <rect
              x={toX(0)}
              y={padTop + plotH + 24}
              width={plotW * 0.07}
              height={4}
              fill="#0078D4"
            />
            <rect
              x={toX(0.07)}
              y={padTop + plotH + 24}
              width={plotW * 0.08}
              height={4}
              fill="#107C10"
            />
            <rect
              x={toX(0.15)}
              y={padTop + plotH + 24}
              width={plotW * 0.23}
              height={4}
              fill="#CA5010"
            />
            <rect
              x={toX(0.38)}
              y={padTop + plotH + 24}
              width={plotW * 0.07}
              height={4}
              fill="#D83B01"
            />
            <rect
              x={toX(0.45)}
              y={padTop + plotH + 24}
              width={plotW * 0.55}
              height={4}
              fill="#A4262C"
            />

            {areaPoints && (
              <polygon
                points={areaPoints}
                fill={tokens.colorBrandBackground2}
                opacity="0.35"
              />
            )}

            <polyline
              fill="none"
              stroke={tokens.colorBrandStroke1}
              strokeWidth="2.5"
              points={polylinePoints}
            />

            {curveData.knotPoints.map((kp, i) => (
              <circle
                key={i}
                cx={toX(kp.f)}
                cy={toY(kp.price)}
                r="3.5"
                fill={tokens.colorNeutralBackground1}
                stroke={tokens.colorBrandStroke1}
                strokeWidth="2"
              />
            ))}

            <line
              x1={curX}
              y1={padTop}
              x2={curX}
              y2={padTop + plotH}
              stroke={tokens.colorPaletteRedBorder2}
              strokeWidth="1.5"
              strokeDasharray="4 2"
            />
            <circle
              cx={curX}
              cy={curY}
              r="5"
              fill={tokens.colorBrandForeground1}
              stroke={tokens.colorNeutralBackground1}
              strokeWidth="2"
            />
          </svg>
        </div>
      </Card>

      <Card>
        <CardHeader header={<Subtitle2>开机建议</Subtitle2>} />
        <div className={styles.formGrid5} style={{ marginBottom: 0 }}>
          {[1, 2, 3, 4, 5].map((step) => (
            <div
              key={step}
              className={styles.subCard}
              style={{ textAlign: "center" }}
            >
              <Caption1
                block
                style={{ color: tokens.colorNeutralForeground3 }}
              >
                第 {step} 抽保留阈值
              </Caption1>
              <Title3>¥{bellman.thresholds_by_step[step].toFixed(2)}</Title3>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
