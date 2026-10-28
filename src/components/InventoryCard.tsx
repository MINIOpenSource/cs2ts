import React, { useState } from "react";
import {
  Button,
  Caption1,
  Card,
  Checkbox,
  Input,
  Select,
  Subtitle2,
  Switch,
  Text,
  Title3,
  tokens,
} from "@fluentui/react-components";
import { ALL_SKINS_BY_COLLECTION, RARITY_META, Skin } from "../engine";
import { useAppStyles } from "../styles/useAppStyles";
import type { CollectionKey, InventoryItem } from "../types";

export interface InventoryCardProps {
  inventory: InventoryItem[];
  selectedIds: string[];
  onToggleSelectInv: (item: InventoryItem) => void;
  onSellInventoryItem: (item: InventoryItem) => void;
  onSellAllInventory: () => void;
  onAddManualItem: (skin: Skin, wearFloat: number, stattrak: boolean) => void;
}

export const InventoryCard: React.FC<InventoryCardProps> = ({
  inventory,
  selectedIds,
  onToggleSelectInv,
  onSellInventoryItem,
  onSellAllInventory,
  onAddManualItem,
}) => {
  const styles = useAppStyles();
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [addCollection, setAddCollection] = useState<CollectionKey>("genesis");
  const [addSkinIdx, setAddSkinIdx] = useState<number>(0);
  const [addWearInput, setAddWearInput] = useState<string>("0.15");
  const [addStattrak, setAddStattrak] = useState<boolean>(false);
  const [confirmSellId, setConfirmSellId] = useState<string | null>(null);

  const collectionSkins =
    ALL_SKINS_BY_COLLECTION[addCollection] || ALL_SKINS_BY_COLLECTION.genesis;
  const currentAddSkin = collectionSkins[addSkinIdx] || collectionSkins[0];
  const rawAddWear = addWearInput.trim();
  const parsedWear = rawAddWear === "" ? Number.NaN : Number(rawAddWear);
  const clampedAddWear = Math.min(
    currentAddSkin.float_max,
    Math.max(
      currentAddSkin.float_min,
      Number.isNaN(parsedWear) ? 0.15 : parsedWear
    )
  );
  const effectiveAddSt = addStattrak && currentAddSkin.stattrak_allowed;
  const [previewWearCn] = Skin.classify_wear(clampedAddWear);
  const [, , previewCny] = currentAddSkin.compute_offer_price(
    clampedAddWear,
    effectiveAddSt
  );

  const handleRandomWear = () => {
    const rnd =
      currentAddSkin.float_min +
      Math.random() * (currentAddSkin.float_max - currentAddSkin.float_min);
    setAddWearInput(rnd.toFixed(6));
  };

  const handleConfirmAdd = () => {
    onAddManualItem(currentAddSkin, Number(clampedAddWear.toFixed(9)), effectiveAddSt);
  };

  return (
    <Card>
      <div className={styles.cardTitleBar}>
        <Subtitle2>我的库存（{inventory.length} 件）</Subtitle2>
        <div
          style={{
            display: "flex",
            gap: "8px",
            flexWrap: "wrap",
          }}
        >
          <Button
            size="small"
            appearance={showAddForm ? "primary" : "secondary"}
            onClick={() => setShowAddForm((v) => !v)}
          >
            {showAddForm ? "收起手动添加" : "手动添加饰品"}
          </Button>
          {inventory.length > 0 && (
            <Button
              size="small"
              appearance="subtle"
              onClick={onSellAllInventory}
            >
              全部回收变现
            </Button>
          )}
        </div>
      </div>

      {showAddForm && (
        <div className={styles.subCard} style={{ marginBottom: "14px" }}>
          <Text weight="semibold" block style={{ marginBottom: "10px" }}>
            手动添加饰品至库存
          </Text>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "10px",
              alignItems: "end",
              marginBottom: "10px",
            }}
          >
            <div className={styles.fieldBlock}>
              <Caption1>所属终端机收藏品</Caption1>
              <Select
                value={addCollection}
                onChange={(_, d) => {
                  setAddCollection(d.value as CollectionKey);
                  setAddSkinIdx(0);
                }}
              >
                <option value="genesis">创世终端机收藏品</option>
                <option value="deadhand">毁灭之手终端机收藏品</option>
              </Select>
            </div>

            <div className={styles.fieldBlock}>
              <Caption1>选择饰品或手套</Caption1>
              <Select
                value={String(addSkinIdx)}
                onChange={(_, d) => setAddSkinIdx(Number(d.value))}
              >
                {collectionSkins.map((s, idx) => (
                  <option key={s.skin_id} value={idx}>
                    [{RARITY_META[s.rarity]?.short}] {s.full_name}
                  </option>
                ))}
              </Select>
            </div>

            <div className={styles.fieldBlock}>
              <Caption1>
                磨损值（[{currentAddSkin.float_min.toFixed(2)},{" "}
                {currentAddSkin.float_max.toFixed(2)}]）
              </Caption1>
              <div style={{ display: "flex", gap: "6px" }}>
                <Input
                  type="number"
                  step="0.001"
                  min={currentAddSkin.float_min}
                  max={currentAddSkin.float_max}
                  value={addWearInput}
                  onChange={(_, d) => setAddWearInput(d.value)}
                  style={{ flex: 1, minWidth: 0 }}
                />
                <Button
                  size="small"
                  appearance="secondary"
                  onClick={handleRandomWear}
                >
                  随机
                </Button>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "8px",
                flexWrap: "wrap",
              }}
            >
              <Switch
                disabled={!currentAddSkin.stattrak_allowed}
                checked={effectiveAddSt}
                onChange={(_, d) => setAddStattrak(d.checked)}
                label="暗金"
              />
              <Button appearance="primary" onClick={handleConfirmAdd}>
                添加至库存
              </Button>
            </div>
          </div>

          <Caption1 style={{ color: tokens.colorNeutralForeground3 }}>
            预览：{effectiveAddSt ? "暗金 " : ""}
            {currentAddSkin.full_name} · 外观：{previewWearCn}（
            {clampedAddWear.toFixed(6)}） · 终端报价：¥{previewCny.toFixed(2)}
          </Caption1>
        </div>
      )}

      {inventory.length === 0 ? (
        <Caption1 style={{ color: tokens.colorNeutralForeground3 }}>
          库存为空，买断终端机报价、手动添加饰品或执行汰换合同后饰品将存入此处。
        </Caption1>
      ) : (
        <div className={styles.inventoryGrid}>
          {inventory.map((item) => {
            const im = RARITY_META[item.skin.rarity] || RARITY_META.milspec;
            const isSelected = selectedIds.includes(item.id);
            const canTradeUp = Boolean(
              im.nextRarity &&
                !(
                  item.skin.rarity === "covert" &&
                  item.skin.collection === "genesis"
                )
            );
            const isConfirmingSell = confirmSellId === item.id;

            return (
              <Card
                key={item.id}
                onClick={() => {
                  if (isConfirmingSell) {
                    setConfirmSellId(null);
                  }
                  if (canTradeUp) {
                    onToggleSelectInv(item);
                  }
                }}
                style={{
                  borderLeft: `4px solid ${im.color}`,
                  outline: isSelected
                    ? `2px solid ${tokens.colorBrandStroke1}`
                    : undefined,
                  padding: "12px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: "8px",
                  cursor: canTradeUp ? "pointer" : "default",
                  userSelect: "none",
                }}
              >
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "4px",
                      gap: "4px",
                    }}
                  >
                    <Text weight="semibold">
                      {item.stattrak ? "暗金 " : ""}
                      {item.skin.full_name}
                    </Text>
                    {canTradeUp && (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleSelectInv(item);
                        }}
                        style={{ display: "flex", alignItems: "center" }}
                      >
                        <Checkbox checked={isSelected} />
                      </div>
                    )}
                  </div>

                  <Caption1 block style={{ color: tokens.colorNeutralForeground3 }}>
                    外观：{item.wear_name} · 磨损值：{item.wear_float.toFixed(6)}
                  </Caption1>
                  <Caption1 block style={{ color: tokens.colorNeutralForeground3 }}>
                    编号 #{item.skin.skin_id} · 图案模板：{item.pattern_seed}
                  </Caption1>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginTop: "4px",
                  }}
                >
                  <Title3 style={{ color: tokens.colorBrandForeground1 }}>
                    ¥{item.offer_price_cny.toFixed(2)}
                  </Title3>
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{ display: "flex", gap: "6px" }}
                  >
                    <Button
                      size="small"
                      appearance={isConfirmingSell ? "primary" : "subtle"}
                      onClick={() => {
                        if (isConfirmingSell) {
                          setConfirmSellId(null);
                          onSellInventoryItem(item);
                        } else {
                          setConfirmSellId(item.id);
                        }
                      }}
                      onBlur={() => {
                        if (isConfirmingSell) {
                          setConfirmSellId(null);
                        }
                      }}
                    >
                      {isConfirmingSell ? "确认回收" : "回收"}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </Card>
  );
};
