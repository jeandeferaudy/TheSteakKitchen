"use client";

import * as React from "react";
import {
  AppButton,
  TOPBAR_FONT_SIZE,
  TOPBAR_FONT_SIZE_MOBILE,
} from "@/components/ui";
import {
  composeCustomerFullName,
  ensureCustomerRecord,
  findCustomerByEmail,
  fetchCustomerById,
  linkProfileToCustomer,
  updateCustomerRecord,
} from "@/lib/customersApi";
import { formatCurrencyPHP } from "@/lib/money";
import { supabase } from "@/lib/supabase";

type Props = {
  isOpen: boolean;
  topOffset: number;
  userId: string | null;
  steakCreditsEnabled?: boolean;
  backgroundStyle?: React.CSSProperties;
  onClose: () => void;
  onProfileSaved?: (firstName: string) => void;
};

type Draft = {
  first_name: string;
  last_name: string;
  phone: string;
  attention_to: string;
  line1: string;
  line2: string;
  barangay: string;
  city: string;
  province: string;
  postal_code: string;
  delivery_note: string;
  country: string;
};

const EMPTY_DRAFT: Draft = {
  first_name: "",
  last_name: "",
  phone: "",
  attention_to: "",
  line1: "",
  line2: "",
  barangay: "",
  city: "",
  province: "",
  postal_code: "",
  delivery_note: "",
  country: "Philippines",
};

export default function MyDetailsDrawer({
  isOpen,
  topOffset,
  userId,
  steakCreditsEnabled: steakCreditsEnabledProp,
  backgroundStyle,
  onClose,
  onProfileSaved,
}: Props) {
  const [draft, setDraft] = React.useState<Draft>(EMPTY_DRAFT);
  const [isWideDesktop, setIsWideDesktop] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [hasLoaded, setHasLoaded] = React.useState(false);
  const [isMobileViewport, setIsMobileViewport] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [availableSteakCredits, setAvailableSteakCredits] = React.useState(0);
  const [steakCreditsEnabled, setSteakCreditsEnabled] = React.useState(false);
  const [linkedCustomerId, setLinkedCustomerId] = React.useState<string | null>(null);
  const [referralCopied, setReferralCopied] = React.useState(false);
  const lastSavedRef = React.useRef<string>("");

  React.useEffect(() => {
    const onResize = () => setIsWideDesktop(window.innerWidth >= 1280);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  React.useEffect(() => {
    const onResize = () => setIsMobileViewport(window.innerWidth < 768);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  React.useEffect(() => {
    if (!isOpen || !userId) return;
    setSaved(false);
    setError("");
    setLoading(true);
    setHasLoaded(false);

    const loadProfile = async () => {
      const { data, error: profileError } = await supabase
        .from("profiles")
        .select(
          "first_name,last_name,phone,attention_to,address_line1,address_line2,barangay,city,province,postal_code,delivery_note,country,customer_id"
        )
        .eq("id", userId)
        .maybeSingle();

      if (profileError) {
        setError(profileError.message);
        setDraft(EMPTY_DRAFT);
        setEmail("");
        setLinkedCustomerId(null);
        setAvailableSteakCredits(0);
        setSteakCreditsEnabled(false);
        setLoading(false);
        return;
      }

      setDraft({
        first_name: data?.first_name ?? "",
        last_name: data?.last_name ?? "",
        phone: data?.phone ?? "",
        attention_to: data?.attention_to ?? "",
        line1: data?.address_line1 ?? "",
        line2: data?.address_line2 ?? "",
        barangay: data?.barangay ?? "",
        city: data?.city ?? "",
        province: data?.province ?? "",
        postal_code: data?.postal_code ?? "",
        delivery_note: data?.delivery_note ?? "",
        country: "Philippines",
      });
      const customerId = data?.customer_id ? String(data.customer_id) : null;
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const authEmailKey = String(user?.email ?? "").trim().toLowerCase();
      let resolvedCustomerId = customerId;
      let resolvedCustomer = customerId
        ? await fetchCustomerById(customerId).catch(() => null)
        : null;
      const linkedEmailKey = String(resolvedCustomer?.email ?? "").trim().toLowerCase();
      if (authEmailKey && authEmailKey !== linkedEmailKey) {
        const emailMatchedCustomer = await findCustomerByEmail(user?.email ?? null).catch(() => null);
        if (emailMatchedCustomer && emailMatchedCustomer.id !== resolvedCustomer?.id) {
          resolvedCustomer = emailMatchedCustomer;
          resolvedCustomerId = emailMatchedCustomer.id;
          await linkProfileToCustomer(userId, emailMatchedCustomer.id).catch(() => null);
        }
      }
      setLinkedCustomerId(resolvedCustomerId);
      if (resolvedCustomer) {
        try {
          setEmail(String(user?.email ?? resolvedCustomer?.email ?? "").trim());
          setAvailableSteakCredits(
            Math.max(0, Number(resolvedCustomer?.available_steak_credits ?? 0))
          );
          setSteakCreditsEnabled(Boolean(resolvedCustomer?.steak_credits_enabled));
        } catch (customerError) {
          console.error("Failed to load linked customer credits", customerError);
          setEmail(String(user?.email ?? "").trim());
          setAvailableSteakCredits(0);
          setSteakCreditsEnabled(false);
        }
      } else {
        setEmail(String(user?.email ?? "").trim());
        setAvailableSteakCredits(0);
        setSteakCreditsEnabled(false);
      }
      const loadedFirstName = String(data?.first_name ?? "").trim();
      if (loadedFirstName && onProfileSaved) {
        onProfileSaved(loadedFirstName);
      }
      lastSavedRef.current = JSON.stringify({
        first_name: data?.first_name ?? "",
        last_name: data?.last_name ?? "",
        phone: data?.phone ?? "",
        attention_to: data?.attention_to ?? "",
        line1: data?.address_line1 ?? "",
        line2: data?.address_line2 ?? "",
        barangay: data?.barangay ?? "",
        city: data?.city ?? "",
        province: data?.province ?? "",
        postal_code: data?.postal_code ?? "",
        delivery_note: data?.delivery_note ?? "",
        country: "Philippines",
      });
      setHasLoaded(true);
      setLoading(false);
    };

    loadProfile();
  }, [isOpen, onProfileSaved, userId]);

  const showSteakCredits =
    typeof steakCreditsEnabledProp === "boolean"
      ? steakCreditsEnabledProp
      : steakCreditsEnabled;
  const referralCode = React.useMemo(() => {
    const baseId = String(linkedCustomerId ?? userId ?? "")
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase();
    if (!baseId) return "";
    return `TSK-${baseId.slice(-8)}`;
  }, [linkedCustomerId, userId]);

  const setField = (k: keyof Draft, v: string) => {
    setSaved(false);
    setDraft((prev) => ({ ...prev, [k]: v }));
  };

  const saveIfChanged = async () => {
    if (!isOpen || !userId || !hasLoaded) return;
    const draftSnapshot = JSON.stringify(draft);
    if (draftSnapshot === lastSavedRef.current) return;

    setError("");
    setLoading(true);

    const payload = {
      first_name: draft.first_name || null,
      last_name: draft.last_name || null,
      phone: draft.phone || null,
      attention_to: draft.attention_to || null,
      address_line1: draft.line1 || null,
      address_line2: draft.line2 || null,
      barangay: draft.barangay || null,
      city: draft.city || null,
      province: draft.province || null,
      postal_code: draft.postal_code || null,
      delivery_note: draft.delivery_note || null,
      country: "Philippines",
    };

    const { error: updateError } = await supabase
      .from("profiles")
      .update(payload)
      .eq("id", userId);

    if (updateError) {
      setError(updateError.message);
      setSaved(false);
    } else {
      setSaved(true);
      lastSavedRef.current = draftSnapshot;
      window.setTimeout(() => setSaved(false), 1200);
      if (onProfileSaved) {
        onProfileSaved(draft.first_name.trim());
      }
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const composedFullName = composeCustomerFullName({
          firstName: draft.first_name,
          lastName: draft.last_name,
        });
        const normalizedPhone = String(draft.phone ?? "").trim();
        if (!composedFullName || !normalizedPhone) {
          setLoading(false);
          return;
        }
        const nextCustomerInput = {
          firstName: draft.first_name,
          lastName: draft.last_name,
          fullName: composedFullName,
          phone: normalizedPhone,
          email: user?.email ?? null,
          address: [
            draft.attention_to,
            draft.line1,
            draft.line2,
            draft.barangay,
            draft.city,
            draft.province,
            draft.postal_code,
            draft.country || "Philippines",
          ]
            .map((value) => String(value ?? "").trim())
            .filter(Boolean)
            .join(", "),
          notes: draft.delivery_note,
          attentionTo: draft.attention_to,
          addressLine1: draft.line1,
          addressLine2: draft.line2,
          barangay: draft.barangay,
          city: draft.city,
          province: draft.province,
          postalCode: draft.postal_code,
          country: draft.country || "Philippines",
          deliveryNote: draft.delivery_note,
        };
        const customer = linkedCustomerId
          ? await updateCustomerRecord(linkedCustomerId, nextCustomerInput)
          : await ensureCustomerRecord(nextCustomerInput);
        if (customer.id !== linkedCustomerId) {
          await linkProfileToCustomer(userId, customer.id);
          setLinkedCustomerId(customer.id);
        }
        setEmail(String(user?.email ?? customer.email ?? "").trim());
        setAvailableSteakCredits(Math.max(0, customer.available_steak_credits));
        setSteakCreditsEnabled(Boolean(customer.steak_credits_enabled));
      } catch (customerError) {
        setError(
          customerError instanceof Error
            ? customerError.message
            : "Failed to sync linked customer."
        );
      }
    }
    setLoading(false);
  };

  const handleEnterCommit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    e.currentTarget.blur();
  };

  React.useEffect(() => {
    if (!referralCopied) return;
    const timer = window.setTimeout(() => setReferralCopied(false), 1200);
    return () => window.clearTimeout(timer);
  }, [referralCopied]);

  if (!isOpen) return null;

  const panelTop = Math.max(topOffset, 0);
  const panelHeight = `calc(100vh - ${panelTop}px)`;
  const rowStyle = isWideDesktop
    ? styles.fieldRowDesktop
    : isMobileViewport
      ? styles.fieldRowMobileAligned
      : styles.fieldRowMobile;
  const labelStyle = isWideDesktop || isMobileViewport ? styles.labelDesktop : styles.label;
  const textAreaRowStyle = isWideDesktop
    ? { ...styles.fieldRowDesktop, alignItems: "start" }
    : isMobileViewport
      ? { ...styles.fieldRowMobileAligned, alignItems: "start" }
      : styles.fieldRowMobile;

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
          ...(isMobileViewport
            ? {
                width: "100vw",
                left: 0,
                transform: "none",
              }
            : null),
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
            PROFILE
          </div>
        </div>

        <div
          style={{
            ...styles.content,
            ...(isMobileViewport ? styles.contentMobile : null),
          }}
        >
          {showSteakCredits ? (
            <div style={{ ...styles.cardRow, ...(isMobileViewport ? styles.cardRowMobile : null) }}>
              <div style={styles.creditsCard}>
                <div style={styles.creditsRow}>
                  <div style={styles.creditsTitle}>
                    Available Steak Credits: {formatCurrencyPHP(availableSteakCredits)}
                  </div>
                  <div style={styles.creditsSubtext}>Available to use for your next order.</div>
                </div>
              </div>
              <div style={styles.creditsCard}>
                <div style={styles.referralHeader}>
                  <div style={styles.referralTitle}>
                    Earn voucher by inviting new customers to use your referral code
                  </div>
                  <div style={styles.referralCodeWrap}>
                    <span style={styles.referralCode}>{referralCode || "—"}</span>
                    <button
                      type="button"
                      style={{
                        ...styles.copyBtn,
                        ...(referralCopied ? styles.copyBtnCopied : null),
                      }}
                      onClick={async () => {
                        if (!referralCode) return;
                        try {
                          await navigator.clipboard.writeText(referralCode);
                          setReferralCopied(true);
                        } catch {
                          // Clipboard may be unavailable in some contexts.
                        }
                      }}
                      aria-label="Copy referral code"
                      title="Copy referral code"
                    >
                      <svg viewBox="0 0 20 20" width="15" height="15" fill="none" aria-hidden>
                        <rect x="7" y="3" width="10" height="10" rx="2.1" stroke="currentColor" strokeWidth="1.7" />
                        <rect x="4" y="6" width="10" height="10" rx="2.1" stroke="currentColor" strokeWidth="1.7" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div style={{ ...styles.creditsSubtext, ...styles.referralSubtext }}>
                  When a new customer uses your referral code during checkout, they get 5% discount on their first order and 5% of their spending will be credited to your account in Steak Credits.
                </div>
              </div>
            </div>
          ) : null}
          <div style={styles.card}>
            <div style={{ ...styles.row2, ...(isMobileViewport ? styles.row2Mobile : null) }}>
              <div style={rowStyle}>
                <label style={labelStyle}>First name</label>
                <input
                  style={styles.input}
                  value={draft.first_name}
                  onChange={(e) => setField("first_name", e.target.value)}
                  onBlur={saveIfChanged}
                  onKeyDown={handleEnterCommit}
                />
              </div>
              <div style={rowStyle}>
                <label style={labelStyle}>Last name</label>
                <input
                  style={styles.input}
                  value={draft.last_name}
                  onChange={(e) => setField("last_name", e.target.value)}
                  onBlur={saveIfChanged}
                  onKeyDown={handleEnterCommit}
                />
              </div>
            </div>

            <div style={rowStyle}>
              <label style={labelStyle}>Email</label>
              <div style={styles.readOnlyValue}>{email || "-"}</div>
            </div>

            <div style={styles.addressSectionLabel}>Delivery address:</div>

            <div style={rowStyle}>
              <label style={labelStyle}>Attention to</label>
              <input
                style={styles.input}
                value={draft.attention_to}
                onChange={(e) => setField("attention_to", e.target.value)}
                onBlur={saveIfChanged}
                onKeyDown={handleEnterCommit}
              />
            </div>

            <div style={rowStyle}>
              <label style={labelStyle}>Phone number</label>
              <input
                style={styles.input}
                value={draft.phone}
                onChange={(e) => setField("phone", e.target.value)}
                onBlur={saveIfChanged}
                onKeyDown={handleEnterCommit}
              />
            </div>

            <div style={rowStyle}>
              <label style={labelStyle}>Line 1</label>
              <input
                style={styles.input}
                value={draft.line1}
                onChange={(e) => setField("line1", e.target.value)}
                onBlur={saveIfChanged}
                onKeyDown={handleEnterCommit}
              />
            </div>

            <div style={rowStyle}>
              <label style={labelStyle}>Line 2</label>
              <input
                style={styles.input}
                value={draft.line2}
                onChange={(e) => setField("line2", e.target.value)}
                onBlur={saveIfChanged}
                onKeyDown={handleEnterCommit}
              />
            </div>

            <div style={{ ...styles.row2, ...(isMobileViewport ? styles.row2Mobile : null) }}>
              <div style={rowStyle}>
                <label style={labelStyle}>Barangay</label>
                <input
                  style={styles.input}
                  value={draft.barangay}
                  onChange={(e) => setField("barangay", e.target.value)}
                  onBlur={saveIfChanged}
                  onKeyDown={handleEnterCommit}
                />
              </div>
              <div style={rowStyle}>
                <label style={labelStyle}>City</label>
                <input
                  style={styles.input}
                  value={draft.city}
                  onChange={(e) => setField("city", e.target.value)}
                  onBlur={saveIfChanged}
                  onKeyDown={handleEnterCommit}
                />
              </div>
            </div>

            <div style={{ ...styles.row2, ...(isMobileViewport ? styles.row2Mobile : null) }}>
              <div style={rowStyle}>
                <label style={labelStyle}>Province</label>
                <input
                  style={styles.input}
                  value={draft.province}
                  onChange={(e) => setField("province", e.target.value)}
                  onBlur={saveIfChanged}
                  onKeyDown={handleEnterCommit}
                />
              </div>
              <div style={rowStyle}>
                <label style={labelStyle}>Postal code</label>
                <input
                  style={styles.input}
                  value={draft.postal_code}
                  onChange={(e) => setField("postal_code", e.target.value)}
                  onBlur={saveIfChanged}
                  onKeyDown={handleEnterCommit}
                />
              </div>
            </div>

            <div style={textAreaRowStyle}>
              <label style={labelStyle}>Delivery note</label>
              <textarea
                style={styles.textarea}
                value={draft.delivery_note}
                onChange={(e) => setField("delivery_note", e.target.value)}
                onBlur={saveIfChanged}
                placeholder="Gate code, landmark, preferred time, etc."
              />
            </div>

            <div style={rowStyle}>
              <label style={labelStyle}>Country</label>
              <input
                style={{ ...styles.input, opacity: 0.8 }}
                value={draft.country}
                disabled
              />
            </div>

            <div style={styles.footer}>
              {error ? <div style={styles.error}>{error}</div> : null}
              <div
                aria-live="polite"
                style={{
                  ...styles.savedToast,
                  opacity: saved ? 1 : 0,
                  transform: saved ? "translateY(0)" : "translateY(6px)",
                }}
              >
                SAVED
              </div>
            </div>
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
    padding: "8px 0 44px 108px",
  },
  contentMobile: {
    padding: "8px 12px 20px",
  },
  card: {
    maxWidth: "min(1120px, 100%)",
    background: "transparent",
    border: "none",
    borderRadius: 0,
    padding: 0,
    color: "var(--tp-text-color)",
  },
  cardRow: {
    maxWidth: "min(1120px, 100%)",
    marginBottom: 20,
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 16,
    alignItems: "stretch",
  },
  cardRowMobile: {
    gridTemplateColumns: "1fr",
  },
  creditsCard: {
    padding: "16px 18px",
    borderRadius: 14,
    border: "1px solid var(--tp-accent)",
    background: "rgba(184, 153, 88, 0.08)",
    color: "var(--tp-accent)",
  },
  creditsRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    flexWrap: "wrap",
  },
  creditsTitle: {
    fontSize: 18,
    fontWeight: 800,
    lineHeight: 1.35,
  },
  creditsSubtext: {
    fontSize: 14,
    opacity: 0.92,
    lineHeight: 1.4,
    textAlign: "right",
    whiteSpace: "nowrap",
  },
  referralHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 14,
    flexWrap: "wrap",
  },
  referralTitle: {
    flex: "1 1 280px",
    fontSize: 17,
    fontWeight: 800,
    lineHeight: 1.35,
  },
  referralCodeWrap: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  referralCode: {
    fontSize: 15,
    fontWeight: 900,
    letterSpacing: 1.1,
    color: "var(--tp-text-color)",
  },
  copyBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    border: "1px solid rgba(184, 153, 88, 0.5)",
    background: "rgba(184, 153, 88, 0.1)",
    color: "var(--tp-accent)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    padding: 0,
  },
  copyBtnCopied: {
    border: "1px solid rgba(103,191,138,0.65)",
    background: "rgba(103,191,138,0.18)",
    color: "#67bf8a",
  },
  referralSubtext: {
    marginTop: 10,
    textAlign: "left",
    whiteSpace: "normal",
    fontSize: 14,
    lineHeight: 1.45,
  },
  addressSectionLabel: {
    marginTop: 20,
    marginBottom: 8,
    fontSize: 15,
    fontWeight: 700,
    opacity: 0.9,
  },
  row2: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    columnGap: 20,
    rowGap: 10,
  },
  row2Mobile: {
    gridTemplateColumns: "1fr",
    rowGap: 8,
  },
  fieldRowMobile: {
    display: "grid",
    gap: 0,
  },
  fieldRowDesktop: {
    display: "grid",
    gridTemplateColumns: "140px 1fr",
    alignItems: "center",
    columnGap: 16,
    marginTop: 4,
  },
  fieldRowMobileAligned: {
    display: "grid",
    gridTemplateColumns: "110px 1fr",
    alignItems: "center",
    columnGap: 12,
    marginTop: 4,
  },
  label: {
    display: "block",
    fontSize: 15,
    opacity: 0.85,
    marginTop: 10,
    marginBottom: 6,
  },
  labelDesktop: {
    display: "block",
    fontSize: 15,
    opacity: 0.85,
    marginTop: 0,
    marginBottom: 0,
    whiteSpace: "nowrap",
  },
  input: {
    width: "100%",
    height: 40,
    borderRadius: 10,
    border: "1px solid var(--tp-border-color)",
    background: "var(--tp-control-bg-soft)",
    color: "var(--tp-text-color)",
    padding: "0 15px",
  },
  readOnlyValue: {
    minHeight: 40,
    display: "flex",
    alignItems: "center",
    color: "var(--tp-text-color)",
    opacity: 0.9,
    lineHeight: 1.35,
    wordBreak: "break-word",
  },
  textarea: {
    width: "100%",
    minHeight: 92,
    borderRadius: 10,
    border: "1px solid var(--tp-border-color)",
    background: "var(--tp-control-bg-soft)",
    color: "var(--tp-text-color)",
    padding: "10px 15px",
    resize: "vertical",
  },
  footer: {
    marginTop: 14,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    minHeight: 54,
  },
  error: {
    fontSize: 15,
    color: "#ff9f9f",
    maxWidth: 420,
    marginBottom: 8,
    textAlign: "center",
  },
  savedToast: {
    minWidth: 84,
    height: 27,
    borderRadius: 7,
    background: "rgba(34, 163, 74, 0.5)",
    color: "var(--tp-text-color)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: 1,
    transition: "opacity 220ms ease, transform 220ms ease",
    pointerEvents: "none",
  },
};
