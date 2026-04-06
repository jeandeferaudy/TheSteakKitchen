"use client";

import * as React from "react";
import {
  AppButton,
  TOPBAR_FONT_SIZE,
  TOPBAR_FONT_SIZE_MOBILE,
} from "@/components/ui";
import type { CustomerAdminItem } from "@/lib/customersApi";

type Props = {
  isOpen: boolean;
  topOffset: number;
  onClose: () => void;
  customers: CustomerAdminItem[];
  onOpenCustomer?: (customerId: string) => void;
  onBulkSetSteakCreditsEnabled?: (customerIds: string[], enabled: boolean) => Promise<void> | void;
  backgroundStyle?: React.CSSProperties;
};

function fmtMoney(v: number) {
  return v.toLocaleString("en-PH");
}

export default function CustomersDrawer({
  isOpen,
  topOffset,
  onClose,
  customers,
  onOpenCustomer,
  onBulkSetSteakCreditsEnabled,
  backgroundStyle,
}: Props) {
  const [search, setSearch] = React.useState("");
  const [isMobileViewport, setIsMobileViewport] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [actionsOpen, setActionsOpen] = React.useState(false);
  const [bulkSaving, setBulkSaving] = React.useState(false);

  React.useEffect(() => {
    const onResize = () => setIsMobileViewport(window.innerWidth < 768);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  React.useEffect(() => {
    if (!isOpen) {
      setSelectedIds([]);
      setActionsOpen(false);
      setBulkSaving(false);
    }
  }, [isOpen]);

  React.useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => customers.some((customer) => customer.id === id)));
  }, [customers]);

  const panelTop = Math.max(topOffset, 0);
  const panelHeight = `calc(100vh - ${panelTop}px)`;

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((customer) => {
      return (
        customer.customer_name.toLowerCase().includes(q) ||
        String(customer.email ?? "").toLowerCase().includes(q)
      );
    });
  }, [customers, search]);

  const selectedCount = selectedIds.length;
  const canUseBulkActions = selectedCount > 0 && !bulkSaving;
  const toggleSelected = (customerId: string) => {
    setSelectedIds((prev) =>
      prev.includes(customerId) ? prev.filter((id) => id !== customerId) : [...prev, customerId]
    );
  };

  const runBulkAction = async (enabled: boolean) => {
    if (!onBulkSetSteakCreditsEnabled || !canUseBulkActions) return;
    setBulkSaving(true);
    try {
      await onBulkSetSteakCreditsEnabled(selectedIds, enabled);
      setSelectedIds([]);
      setActionsOpen(false);
    } catch (error) {
      console.error("Failed to update selected customers", error);
      alert("Failed to update selected customers.");
    } finally {
      setBulkSaving(false);
    }
  };

  if (!isOpen) return null;

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
            onClick={onClose}
          >
            BACK
          </AppButton>
          <div style={{ ...styles.title, ...(isMobileViewport ? styles.titleMobile : null) }}>
            CUSTOMERS
          </div>
        </div>

        <div style={{ ...styles.content, ...(isMobileViewport ? styles.contentMobile : null) }}>
          <div style={styles.toolbarRow}>
            <div style={styles.actionsWrap}>
              <AppButton
                type="button"
                variant="ghost"
                style={{
                  ...styles.actionsButton,
                  ...(canUseBulkActions ? styles.actionsButtonEnabled : styles.actionsButtonDisabled),
                }}
                disabled={!canUseBulkActions}
                onClick={() => setActionsOpen((prev) => !prev)}
              >
                {bulkSaving ? "SAVING..." : "Actions"}
              </AppButton>
              {actionsOpen && canUseBulkActions ? (
                <div style={styles.actionsMenu}>
                  <button
                    type="button"
                    style={styles.actionsMenuItem}
                    onClick={() => {
                      void runBulkAction(true);
                    }}
                  >
                    Activate Steak Credits
                  </button>
                  <button
                    type="button"
                    style={styles.actionsMenuItem}
                    onClick={() => {
                      void runBulkAction(false);
                    }}
                  >
                    Deactivate Steak Credits
                  </button>
                </div>
              ) : null}
            </div>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customer or email..."
              style={styles.searchInput}
            />
          </div>

          {!isMobileViewport ? (
            <div style={styles.listHead}>
              <div />
              <div>CUSTOMER</div>
              <div>EMAIL</div>
              <div>ACCOUNT</div>
              <div>CREDITS</div>
              <div>ORDERS</div>
              <div>TOTAL ORDERED</div>
              <div>CURRENT CREDITS</div>
            </div>
          ) : null}

          {filtered.length === 0 ? (
            <div style={styles.empty}>No customers found.</div>
          ) : (
            filtered.map((customer) =>
              isMobileViewport ? (
                <button
                  key={customer.id}
                  type="button"
                  style={styles.mobileCard}
                  onClick={() => onOpenCustomer?.(customer.id)}
                >
                  <div
                    style={styles.mobileCheckboxWrap}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(customer.id)}
                      onChange={() => toggleSelected(customer.id)}
                      style={styles.rowCheckbox}
                      aria-label={`Select ${customer.customer_name}`}
                    />
                  </div>
                  <div style={styles.mobileName}>{customer.customer_name}</div>
                  <div style={styles.mobileEmail}>{customer.email || "—"}</div>
                  <div style={styles.mobileMeta}>
                    Account:{" "}
                    <span
                      style={
                        customer.has_account ? styles.accountYesText : styles.accountNoText
                      }
                    >
                      {customer.has_account ? "Yes" : "No"}
                    </span>
                  </div>
                  <div style={styles.mobileMeta}>
                    Credits:{" "}
                    <span
                      style={
                        customer.steak_credits_enabled
                          ? styles.accountYesText
                          : styles.accountNoText
                      }
                    >
                      {customer.steak_credits_enabled ? "Yes" : "No"}
                    </span>
                  </div>
                  <div style={styles.mobileMeta}>Orders: {customer.order_count}</div>
                  <div style={styles.mobileMeta}>Total ordered: ₱ {fmtMoney(customer.total_ordered)}</div>
                  <div style={styles.mobileMeta}>Current credits: ₱ {fmtMoney(customer.current_credits)}</div>
                </button>
              ) : (
                <button
                  key={customer.id}
                  type="button"
                  style={styles.listRow}
                  onClick={() => onOpenCustomer?.(customer.id)}
                >
                  <div
                    style={styles.checkboxCell}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(customer.id)}
                      onChange={() => toggleSelected(customer.id)}
                      style={styles.rowCheckbox}
                      aria-label={`Select ${customer.customer_name}`}
                    />
                  </div>
                  <div style={styles.customerCell}>
                    {customer.customer_name}
                  </div>
                  <div style={styles.emailCell}>{customer.email || "—"}</div>
                  <div>
                    <span
                      style={{
                        ...styles.accountPill,
                        ...(customer.has_account ? styles.accountPillYes : styles.accountPillNo),
                      }}
                    >
                      {customer.has_account ? "Yes" : "No"}
                    </span>
                  </div>
                  <div>
                    <span
                      style={{
                        ...styles.accountPill,
                        ...(customer.steak_credits_enabled
                          ? styles.accountPillYes
                          : styles.accountPillNo),
                      }}
                    >
                      {customer.steak_credits_enabled ? "Yes" : "No"}
                    </span>
                  </div>
                  <div>{customer.order_count}</div>
                  <div>₱ {fmtMoney(customer.total_ordered)}</div>
                  <div>₱ {fmtMoney(customer.current_credits)}</div>
                </button>
              )
            )
          )}
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
    padding: "8px 0 44px 108px",
    color: "var(--tp-text-color)",
  },
  contentMobile: {
    padding: "8px 12px 20px",
  },
  toolbarRow: {
    marginBottom: 12,
    display: "grid",
    gridTemplateColumns: "auto minmax(0, 1fr)",
    gap: 12,
    alignItems: "center",
  },
  actionsWrap: {
    position: "relative",
  },
  actionsButton: {
    minWidth: 104,
    height: 40,
    padding: "0 15px",
    borderRadius: 10,
  },
  actionsButtonEnabled: {
    color: "var(--tp-accent)",
    borderColor: "rgba(195,138,40,0.65)",
    background: "rgba(195,138,40,0.08)",
  },
  actionsButtonDisabled: {
    opacity: 0.45,
  },
  actionsMenu: {
    position: "absolute",
    top: "calc(100% + 8px)",
    left: 0,
    minWidth: 230,
    borderRadius: 12,
    border: "1px solid var(--tp-border-color-soft)",
    background: "rgba(15,15,15,0.96)",
    boxShadow: "0 12px 28px rgba(0,0,0,0.28)",
    overflow: "hidden",
    zIndex: 20,
  },
  actionsMenuItem: {
    width: "100%",
    border: "none",
    background: "transparent",
    color: "var(--tp-text-color)",
    textAlign: "left",
    padding: "12px 14px",
    fontSize: 14,
    cursor: "pointer",
  },
  searchWrap: {
    marginBottom: 12,
  },
  searchInput: {
    width: "100%",
    minWidth: 0,
    height: 40,
    borderRadius: 10,
    border: "1px solid var(--tp-border-color)",
    background: "var(--tp-control-bg-soft)",
    color: "var(--tp-text-color)",
    padding: "0 15px",
  },
  listHead: {
    display: "grid",
    gridTemplateColumns: "34px 1.2fr 1.35fr 0.7fr 0.7fr 0.5fr 0.9fr 0.9fr",
    gap: 12,
    padding: "0 10px 10px",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: 1,
    opacity: 0.7,
  },
  listRow: {
    display: "grid",
    gridTemplateColumns: "34px 1.2fr 1.35fr 0.7fr 0.7fr 0.5fr 0.9fr 0.9fr",
    gap: 12,
    alignItems: "center",
    width: "100%",
    padding: "12px 10px",
    borderTop: "1px solid var(--tp-border-color-soft)",
    fontSize: 15,
    background: "transparent",
    color: "var(--tp-text-color)",
    borderLeft: "none",
    borderRight: "none",
    borderBottom: "none",
    textAlign: "left",
    cursor: "pointer",
  },
  checkboxCell: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  rowCheckbox: {
    width: 16,
    height: 16,
    accentColor: "#c38a28",
    cursor: "pointer",
  },
  customerCell: {
    fontWeight: 700,
    minWidth: 0,
  },
  emailCell: {
    minWidth: 0,
    opacity: 0.82,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  accountPill: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 56,
    height: 28,
    padding: "0 10px",
    borderRadius: 999,
    border: "1px solid var(--tp-border-color)",
    fontSize: 13,
    fontWeight: 800,
    letterSpacing: 0.3,
  },
  accountPillYes: {
    color: "#67bf8a",
    borderColor: "rgba(157,228,182,0.75)",
    background: "rgba(157,228,182,0.18)",
  },
  accountPillNo: {
    color: "#d98b2b",
    borderColor: "rgba(255,196,122,0.72)",
    background: "rgba(255,196,122,0.16)",
  },
  empty: {
    opacity: 0.7,
    padding: "18px 0",
  },
  mobileCard: {
    width: "100%",
    borderTop: "1px solid var(--tp-border-color-soft)",
    padding: "14px 0",
    background: "transparent",
    color: "var(--tp-text-color)",
    textAlign: "left",
    borderLeft: "none",
    borderRight: "none",
    borderBottom: "none",
    position: "relative",
  },
  mobileCheckboxWrap: {
    position: "absolute",
    top: 14,
    right: 0,
  },
  mobileName: {
    fontSize: 16,
    fontWeight: 800,
  },
  mobileEmail: {
    marginTop: 4,
    fontSize: 14,
    opacity: 0.8,
  },
  mobileMeta: {
    marginTop: 6,
    fontSize: 14,
  },
  accountYesText: {
    color: "#67bf8a",
    fontWeight: 800,
  },
  accountNoText: {
    color: "#d98b2b",
    fontWeight: 800,
  },
};
