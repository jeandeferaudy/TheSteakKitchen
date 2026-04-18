"use client";

import * as React from "react";
import { AppButton, TOPBAR_FONT_SIZE, TOPBAR_FONT_SIZE_MOBILE } from "@/components/ui";
import {
  createEmptyLogisticsDraftRule,
  fetchLogisticsConfig,
  saveLogisticsConfig,
  type LogisticsDraftRule,
} from "@/lib/logisticsApi";

type Props = {
  isOpen: boolean;
  topOffset: number;
  backgroundStyle?: React.CSSProperties;
  onBack: () => void;
};

const BACK_BTN_W = 68;
const TITLE_GAP = 40;

export default function LogisticsDrawer({
  isOpen,
  topOffset,
  backgroundStyle,
  onBack,
}: Props) {
  const [isMobileViewport, setIsMobileViewport] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const [rules, setRules] = React.useState<LogisticsDraftRule[]>([]);
  const [otherEnabled, setOtherEnabled] = React.useState(false);
  const [otherPrice, setOtherPrice] = React.useState("");
  const [otherFreeDeliveryMoq, setOtherFreeDeliveryMoq] = React.useState("");

  React.useEffect(() => {
    const onResize = () => setIsMobileViewport(window.innerWidth < 768);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  React.useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setError("");
    fetchLogisticsConfig()
      .then((config) => {
        setRules(
          config.rules.length > 0
            ? config.rules.map((rule) => ({
                id: rule.id,
                postal_from: rule.postal_from,
                postal_to: rule.postal_to ?? "",
                price_php: String(rule.price_php || ""),
                free_delivery_moq_php: String(rule.free_delivery_moq_php || ""),
              }))
            : [createEmptyLogisticsDraftRule()]
        );
        setOtherEnabled(config.other_enabled);
        setOtherPrice(config.other_price_php > 0 ? String(config.other_price_php) : "");
        setOtherFreeDeliveryMoq(
          config.other_free_delivery_moq_php > 0 ? String(config.other_free_delivery_moq_php) : ""
        );
      })
      .catch((nextError) => {
        const message =
          nextError instanceof Error ? nextError.message : "Failed to load logistics rules.";
        setError(message);
      })
      .finally(() => setLoading(false));
  }, [isOpen]);

  const handleRuleChange = React.useCallback(
    (ruleId: string, key: keyof LogisticsDraftRule, value: string) => {
      setRules((prev) =>
        prev.map((rule) =>
          rule.id === ruleId
            ? {
                ...rule,
                [key]:
                  key === "price_php" || key === "free_delivery_moq_php"
                    ? value.replace(/[^\d.]/g, "")
                    : value.replace(/\D/g, "").slice(0, 4),
              }
            : rule
        )
      );
    },
    []
  );

  const handleSave = React.useCallback(async () => {
    setSaving(true);
    setError("");
    try {
      const nextConfig = await saveLogisticsConfig({
        rules: rules.filter(
          (rule) =>
            rule.postal_from.trim() ||
            rule.postal_to.trim() ||
            rule.price_php.trim() ||
            rule.free_delivery_moq_php.trim()
        ),
        other_enabled: otherEnabled,
        other_price_php: Number(otherPrice || 0),
        other_free_delivery_moq_php: Number(otherFreeDeliveryMoq || 0),
      });
      setRules(
        nextConfig.rules.length > 0
          ? nextConfig.rules.map((rule) => ({
              id: rule.id,
              postal_from: rule.postal_from,
              postal_to: rule.postal_to ?? "",
              price_php: String(rule.price_php || ""),
              free_delivery_moq_php: String(rule.free_delivery_moq_php || ""),
            }))
          : [createEmptyLogisticsDraftRule()]
      );
      setOtherEnabled(nextConfig.other_enabled);
      setOtherPrice(nextConfig.other_price_php > 0 ? String(nextConfig.other_price_php) : "");
      setOtherFreeDeliveryMoq(
        nextConfig.other_free_delivery_moq_php > 0
          ? String(nextConfig.other_free_delivery_moq_php)
          : ""
      );
    } catch (nextError) {
      const message =
        nextError instanceof Error ? nextError.message : "Failed to save logistics rules.";
      setError(message);
    } finally {
      setSaving(false);
    }
  }, [otherEnabled, otherFreeDeliveryMoq, otherPrice, rules]);

  if (!isOpen) return null;

  const panelTop = Math.max(topOffset, 0);
  const panelHeight = `calc(100vh - ${panelTop}px)`;

  return (
    <>
      <div
        style={{
          ...styles.backdrop,
          ...(backgroundStyle ?? null),
          top: panelTop,
          height: panelHeight,
        }}
      />
      <aside
        className={isMobileViewport ? "tp-sheet-slide-up" : "tp-drawer-slide-up"}
        style={{
          ...styles.panel,
          ...(backgroundStyle ?? null),
          top: panelTop,
          height: panelHeight,
          ...(isMobileViewport ? { width: "100vw", left: 0, transform: "none" } : null),
        }}
      >
        <div style={{ ...styles.topRow, ...(isMobileViewport ? styles.topRowMobile : null) }}>
          <AppButton
            variant="ghost"
            style={{ ...styles.backBtn, ...(isMobileViewport ? styles.backBtnMobile : null) }}
            onClick={onBack}
          >
            BACK
          </AppButton>
          <div style={{ ...styles.title, ...(isMobileViewport ? styles.titleMobile : null) }}>
            LOGISTICS
          </div>
        </div>

        <div style={{ ...styles.content, ...(isMobileViewport ? styles.contentMobile : null) }}>
          <div style={styles.card}>
            <div style={styles.sectionTitle}>AUTHORIZED POSTAL CODES</div>
            <div style={styles.helperText}>
              Set delivery prices by postal code range. Leave <strong>To</strong> blank to apply the
              rule to just one postal code.
            </div>

            <div style={styles.headerRow}>
              <div>From</div>
              <div>To</div>
              <div>Price</div>
              <div>MOQ free delivery</div>
              <div />
            </div>

            {rules.map((rule) => (
              <div key={rule.id} style={styles.ruleRow}>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="1700"
                  value={rule.postal_from}
                  onChange={(event) => handleRuleChange(rule.id, "postal_from", event.target.value)}
                  style={styles.input}
                />
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="1702"
                  value={rule.postal_to}
                  onChange={(event) => handleRuleChange(rule.id, "postal_to", event.target.value)}
                  style={styles.input}
                />
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="100"
                  value={rule.price_php}
                  onChange={(event) => handleRuleChange(rule.id, "price_php", event.target.value)}
                  style={styles.input}
                />
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="2000"
                  value={rule.free_delivery_moq_php}
                  onChange={(event) =>
                    handleRuleChange(rule.id, "free_delivery_moq_php", event.target.value)
                  }
                  style={styles.input}
                />
                <AppButton
                  type="button"
                  variant="ghost"
                  style={styles.deleteBtn}
                  onClick={() =>
                    setRules((prev) => (prev.length > 1 ? prev.filter((entry) => entry.id !== rule.id) : prev))
                  }
                  disabled={rules.length <= 1}
                >
                  DELETE
                </AppButton>
              </div>
            ))}

            <div style={styles.rowActions}>
              <AppButton
                type="button"
                variant="ghost"
                style={styles.addBtn}
                onClick={() => setRules((prev) => [...prev, createEmptyLogisticsDraftRule()])}
              >
                ADD ROW
              </AppButton>
            </div>

            <div style={styles.otherRow}>
              <label style={styles.checkboxRow}>
                <input
                  type="checkbox"
                  checked={otherEnabled}
                  onChange={(event) => setOtherEnabled(event.target.checked)}
                />
                <span>Other</span>
              </label>
              <div style={styles.otherInputs}>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="Price"
                  value={otherPrice}
                  onChange={(event) => setOtherPrice(event.target.value.replace(/[^\d.]/g, ""))}
                  style={{ ...styles.input, ...(otherEnabled ? null : styles.inputDisabled) }}
                  disabled={!otherEnabled}
                />
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="MOQ free delivery"
                  value={otherFreeDeliveryMoq}
                  onChange={(event) =>
                    setOtherFreeDeliveryMoq(event.target.value.replace(/[^\d.]/g, ""))
                  }
                  style={{ ...styles.input, ...(otherEnabled ? null : styles.inputDisabled) }}
                  disabled={!otherEnabled}
                />
              </div>
            </div>

            <div style={styles.footerRow}>
              <div style={styles.helperText}>
                Saving here replaces the old postal code matrix and checkout uses these logistics rules
                directly.
              </div>
              <AppButton type="button" style={styles.saveBtn} onClick={() => void handleSave()} disabled={saving || loading}>
                {saving ? "SAVING..." : "SAVE"}
              </AppButton>
            </div>
            {loading ? <div style={styles.helperText}>Loading logistics rules...</div> : null}
            {error ? <div style={styles.errorText}>{error}</div> : null}
          </div>
        </div>
      </aside>
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: "fixed",
    left: 0,
    right: 0,
    background: "transparent",
    zIndex: 860,
  },
  panel: {
    position: "fixed",
    left: "50%",
    transform: "translateX(-50%)",
    width: "var(--tp-rail-width)",
    background: "transparent",
    zIndex: 910,
    display: "flex",
    flexDirection: "column",
    boxShadow: "none",
    border: "none",
  },
  topRow: {
    minHeight: 64,
    display: "flex",
    alignItems: "center",
    gap: 40,
    padding: "18px 0 15px",
  },
  topRowMobile: {
    minHeight: 52,
    gap: 10,
    padding: "8px 10px 8px",
  },
  backBtn: {
    width: 68,
    minWidth: 68,
    height: 36,
    padding: 0,
    borderRadius: 8,
    fontSize: TOPBAR_FONT_SIZE,
    fontWeight: 700,
    letterSpacing: 1,
    border: "none",
    background: "transparent",
    justifyContent: "flex-start",
    textAlign: "left",
  },
  backBtnMobile: {
    fontSize: TOPBAR_FONT_SIZE_MOBILE,
    height: 40,
    padding: "0 15px 0 0",
  },
  title: {
    fontSize: TOPBAR_FONT_SIZE,
    fontWeight: 900,
    letterSpacing: 2,
    color: "var(--tp-text-color)",
  },
  titleMobile: {
    fontSize: TOPBAR_FONT_SIZE_MOBILE,
    fontWeight: 700,
    letterSpacing: 0.2,
  },
  content: {
    flex: 1,
    overflowY: "auto",
    padding: `8px 0 44px ${BACK_BTN_W + TITLE_GAP}px`,
    color: "var(--tp-text-color)",
  },
  contentMobile: {
    padding: "8px 12px 20px",
  },
  card: {
    maxWidth: 820,
    border: "1px solid var(--tp-border-color-soft)",
    borderRadius: 18,
    background: "var(--tp-control-bg-soft)",
    padding: "20px 22px",
    display: "grid",
    gap: 14,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 900,
    letterSpacing: 1.1,
    color: "rgba(255,255,255,0.75)",
  },
  helperText: {
    fontSize: 14,
    lineHeight: 1.45,
    opacity: 0.82,
  },
  headerRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr 1.2fr 120px",
    gap: 12,
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: 0.8,
    opacity: 0.72,
  },
  ruleRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr 1.2fr 120px",
    gap: 12,
    alignItems: "center",
  },
  input: {
    width: "100%",
    height: 42,
    borderRadius: 12,
    border: "1px solid var(--tp-border-color-soft)",
    background: "rgba(255,255,255,0.04)",
    color: "var(--tp-text-color)",
    padding: "0 12px",
    fontSize: 15,
  },
  inputDisabled: {
    opacity: 0.45,
  },
  deleteBtn: {
    height: 42,
    borderRadius: 12,
    justifyContent: "center",
  },
  rowActions: {
    display: "flex",
    justifyContent: "flex-start",
  },
  addBtn: {
    height: 40,
    borderRadius: 12,
  },
  otherRow: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) minmax(0, 360px)",
    gap: 12,
    alignItems: "center",
    paddingTop: 8,
    borderTop: "1px solid rgba(255,255,255,0.08)",
  },
  otherInputs: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
  },
  checkboxRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    fontSize: 15,
    fontWeight: 700,
  },
  footerRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    paddingTop: 8,
  },
  saveBtn: {
    minWidth: 120,
    height: 42,
    borderRadius: 12,
    justifyContent: "center",
  },
  errorText: {
    fontSize: 14,
    lineHeight: 1.4,
    color: "#ff9f9f",
  },
};
