"use client";

import * as React from "react";
import {
  AppButton,
  TOPBAR_FONT_SIZE,
  TOPBAR_FONT_SIZE_MOBILE,
} from "@/components/ui";

export type LoyaltyProgramsDraft = {
  offer_steak_credits_to_guests: boolean;
  auto_activate_steak_credits_for_new_accounts: boolean;
};

type Props = {
  isOpen: boolean;
  topOffset: number;
  backgroundStyle?: React.CSSProperties;
  settings: LoyaltyProgramsDraft;
  saving?: boolean;
  error?: string;
  onBack: () => void;
  onChange: (next: LoyaltyProgramsDraft) => Promise<void> | void;
};

const BACK_BTN_W = 68;
const TITLE_GAP = 40;

function ToggleRow({
  label,
  checked,
  disabled,
  onToggle,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onToggle: (next: boolean) => void;
}) {
  return (
    <label style={styles.toggleRow}>
      <span style={styles.toggleLabel}>{label}</span>
      <button
        type="button"
        style={{
          ...styles.toggleBtn,
          ...(checked ? styles.toggleBtnOn : null),
          ...(disabled ? styles.toggleBtnDisabled : null),
        }}
        onClick={() => onToggle(!checked)}
        disabled={disabled}
        aria-pressed={checked}
      >
        <span
          style={{
            ...styles.toggleThumb,
            ...(checked ? styles.toggleThumbOn : null),
          }}
        />
      </button>
    </label>
  );
}

export default function LoyaltyProgramsDrawer({
  isOpen,
  topOffset,
  backgroundStyle,
  settings,
  saving = false,
  error = "",
  onBack,
  onChange,
}: Props) {
  const [isMobileViewport, setIsMobileViewport] = React.useState(false);

  React.useEffect(() => {
    const onResize = () => setIsMobileViewport(window.innerWidth < 768);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

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
            LOYALTY PROGRAMS
          </div>
        </div>

        <div style={{ ...styles.content, ...(isMobileViewport ? styles.contentMobile : null) }}>
          <div style={styles.groupCard}>
            <div style={styles.groupTitle}>STEAK CREDITS</div>
            <div style={styles.groupBody}>
              <ToggleRow
                label="Offer steak credits to guests to encourage account creation"
                checked={settings.offer_steak_credits_to_guests}
                disabled={saving}
                onToggle={(next) =>
                  void onChange({
                    ...settings,
                    offer_steak_credits_to_guests: next,
                  })
                }
              />
              <ToggleRow
                label="Auto-activate steak credits for guests who create an account"
                checked={settings.auto_activate_steak_credits_for_new_accounts}
                disabled={saving}
                onToggle={(next) =>
                  void onChange({
                    ...settings,
                    auto_activate_steak_credits_for_new_accounts: next,
                  })
                }
              />
            </div>
          </div>
          {saving ? <div style={styles.helperText}>Saving loyalty settings...</div> : null}
          {error ? <div style={styles.errorText}>{error}</div> : null}
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
  groupCard: {
    maxWidth: 760,
    border: "1px solid var(--tp-border-color-soft)",
    borderRadius: 18,
    background: "var(--tp-control-bg-soft)",
    padding: "20px 22px",
  },
  groupTitle: {
    fontSize: 13,
    fontWeight: 900,
    letterSpacing: 1.1,
    color: "rgba(255,255,255,0.75)",
    marginBottom: 18,
  },
  groupBody: {
    display: "grid",
    gap: 18,
  },
  toggleRow: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto",
    gap: 16,
    alignItems: "center",
  },
  toggleLabel: {
    fontSize: 16,
    lineHeight: 1.35,
  },
  toggleBtn: {
    width: 48,
    height: 28,
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.22)",
    background: "rgba(255,255,255,0.12)",
    padding: 2,
    position: "relative",
    cursor: "pointer",
  },
  toggleBtnOn: {
    borderColor: "rgba(195,138,40,0.72)",
    background: "rgba(195,138,40,0.24)",
  },
  toggleBtnDisabled: {
    opacity: 0.55,
    cursor: "default",
  },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: "50%",
    background: "#f4f4f4",
    display: "block",
    transition: "transform 140ms ease",
  },
  toggleThumbOn: {
    transform: "translateX(20px)",
    background: "var(--tp-accent)",
  },
  helperText: {
    marginTop: 12,
    fontSize: 14,
    opacity: 0.75,
  },
  errorText: {
    marginTop: 10,
    color: "#ff9a9a",
    fontSize: 14,
  },
};
