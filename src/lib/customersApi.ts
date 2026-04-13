import { supabase } from "@/lib/supabase";
import { fetchOrders, type OrderListItem } from "@/lib/ordersApi";

const CUSTOMER_SELECT =
  "id,first_name,last_name,full_name,phone,email,address,notes,attention_to,address_line1,address_line2,barangay,city,province,postal_code,country,delivery_note,created_at,available_steak_credits,steak_credits_enabled,referral_code";
const CUSTOMER_SELECT_LEGACY =
  "id,first_name,last_name,full_name,phone,email,address,notes,created_at,available_steak_credits";

export type CustomerAdminItem = {
  id: string;
  customer_name: string;
  email: string | null;
  has_account: boolean;
  order_count: number;
  total_ordered: number;
  current_credits: number;
  steak_credits_enabled: boolean;
};

export type CustomerIdentityInput = {
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  attentionTo?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  barangay?: string | null;
  city?: string | null;
  province?: string | null;
  postalCode?: string | null;
  country?: string | null;
  deliveryNote?: string | null;
};

export type CustomerRecord = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string;
  phone: string;
  email: string | null;
  address: string;
  notes: string | null;
  attention_to: string;
  address_line1: string;
  address_line2: string;
  barangay: string;
  city: string;
  province: string;
  postal_code: string;
  country: string;
  delivery_note: string;
  created_at?: string | null;
  available_steak_credits: number;
  steak_credits_enabled: boolean;
  referral_code?: string | null;
};

export type CustomerAdminDetail = {
  customer: CustomerRecord;
  has_account: boolean;
  order_count: number;
  total_ordered: number;
  orders: OrderListItem[];
};

export type AdminProfileOption = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  customer_id: string | null;
};

function normalizeText(value: string | null | undefined): string {
  return String(value ?? "").trim();
}

function normalizeKey(value: string | null | undefined): string {
  return normalizeText(value).toLowerCase();
}

function normalizePhone(value: string | null | undefined): string {
  return normalizeText(value).replace(/\D/g, "");
}

function normalizeAddressLine1(value: string | null | undefined): string {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isMissingSteakCreditsEnabledColumn(error: unknown): boolean {
  const message =
    typeof error === "object" && error !== null && "message" in error
      ? String((error as { message?: unknown }).message ?? "").toLowerCase()
      : "";
  return message.includes("steak_credits_enabled");
}

export function composeCustomerFullName(input: CustomerIdentityInput): string {
  const first = normalizeText(input.firstName);
  const last = normalizeText(input.lastName);
  const full = normalizeText(input.fullName);
  return [first, last].filter(Boolean).join(" ").trim() || full;
}

function composeCustomerAddress(input: CustomerIdentityInput): string {
  const structured = [
    input.attentionTo,
    input.addressLine1,
    input.addressLine2,
    input.barangay,
    input.city,
    input.province,
    input.postalCode,
    input.country,
  ]
    .map((value) => normalizeText(value))
    .filter(Boolean)
    .join(", ");
  return structured || normalizeText(input.address);
}

function mapCustomerRecord(row: Record<string, unknown>): CustomerRecord {
  return {
    id: String(row.id ?? ""),
    first_name: row.first_name == null ? null : String(row.first_name),
    last_name: row.last_name == null ? null : String(row.last_name),
    full_name: String(row.full_name ?? ""),
    phone: String(row.phone ?? ""),
    email: row.email == null ? null : String(row.email),
    address: String(row.address ?? ""),
    notes: row.notes == null ? null : String(row.notes),
    attention_to: String(row.attention_to ?? ""),
    address_line1: String(row.address_line1 ?? ""),
    address_line2: String(row.address_line2 ?? ""),
    barangay: String(row.barangay ?? ""),
    city: String(row.city ?? ""),
    province: String(row.province ?? ""),
    postal_code: String(row.postal_code ?? ""),
    country: String(row.country ?? ""),
    delivery_note: String(row.delivery_note ?? ""),
    created_at: row.created_at == null ? null : String(row.created_at),
    available_steak_credits: Number(row.available_steak_credits ?? 0),
    steak_credits_enabled: Boolean(row.steak_credits_enabled),
    referral_code: row.referral_code == null ? null : String(row.referral_code),
  };
}

async function selectCustomerRows<T>(
  build: (columns: string) => unknown
): Promise<{ data: T | null; error: unknown }> {
  const primary = (await build(CUSTOMER_SELECT)) as { data: T | null; error: unknown };
  if (primary.error && isMissingSteakCreditsEnabledColumn(primary.error)) {
    return (await build(CUSTOMER_SELECT_LEGACY)) as { data: T | null; error: unknown };
  }
  return primary;
}

export async function fetchCustomerById(customerId: string): Promise<CustomerRecord | null> {
  const { data, error } = await selectCustomerRows<Record<string, unknown>>((columns) =>
    supabase.from("customers").select(columns).eq("id", customerId).maybeSingle()
  );
  if (error) throw error;
  if (!data) return null;
  return mapCustomerRecord(data as Record<string, unknown>);
}

export async function findExactCustomerMatch(
  input: CustomerIdentityInput
): Promise<CustomerRecord | null> {
  const fullName = composeCustomerFullName(input);
  const phoneKey = normalizePhone(input.phone);
  const emailKey = normalizeKey(input.email);
  if (!fullName || !phoneKey) return null;

  const { data, error } = await selectCustomerRows<Record<string, unknown>[]>((columns) =>
    supabase.from("customers").select(columns).eq("full_name", fullName).limit(20)
  );
  if (error) throw error;

  const matches = (data ?? [])
    .map((row) => mapCustomerRecord(row as Record<string, unknown>))
    .filter((row) => normalizePhone(row.phone) === phoneKey)
    .filter((row) => (emailKey ? normalizeKey(row.email) === emailKey : true));

  return matches.length === 1 ? matches[0] : null;
}

export async function findCustomerByEmail(email: string | null | undefined): Promise<CustomerRecord | null> {
  const emailKey = normalizeKey(email);
  if (!emailKey) return null;

  const { data, error } = await selectCustomerRows<Record<string, unknown>[]>((columns) =>
    supabase.from("customers").select(columns).ilike("email", emailKey).limit(20)
  );
  if (error) throw error;

  const matches = (data ?? [])
    .map((row) => mapCustomerRecord(row as Record<string, unknown>))
    .filter((row) => normalizeKey(row.email) === emailKey);

  return matches.length === 1 ? matches[0] : null;
}

export async function findCustomerByReferralCode(
  referralCode: string | null | undefined
): Promise<CustomerRecord | null> {
  const code = normalizeText(referralCode).toUpperCase();
  if (!code) return null;

  const { data, error } = await selectCustomerRows<Record<string, unknown>[]>((columns) =>
    supabase.from("customers").select(columns).ilike("referral_code", code).limit(20)
  );
  if (error) throw error;

  const matches = (data ?? [])
    .map((row) => mapCustomerRecord(row as Record<string, unknown>))
    .filter((row) => normalizeText(row.referral_code).toUpperCase() === code);

  return matches.length === 1 ? matches[0] : null;
}

export async function countCustomerOrders(customerId: string): Promise<number> {
  const { count, error } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("customer_id", customerId);
  if (error) throw error;
  return Number(count ?? 0);
}

export type ReferralReuseConflict = {
  orderId: string;
  customerId: string | null;
  matchedOn: "email" | "phone" | "address";
};

export async function findReferralReuseConflict(input: {
  email?: string | null;
  phone?: string | null;
  addressLine1?: string | null;
}): Promise<ReferralReuseConflict | null> {
  const emailKey = normalizeKey(input.email);
  const phoneDigits = normalizePhone(input.phone);
  const phoneSuffix = phoneDigits.length >= 10 ? phoneDigits.slice(-10) : phoneDigits;
  const addressKey = normalizeAddressLine1(input.addressLine1);

  if (!emailKey && !phoneSuffix && !addressKey) return null;

  if (emailKey) {
    const { data, error } = await supabase
      .from("orders")
      .select("id,customer_id,email")
      .not("referral_code", "is", null)
      .ilike("email", emailKey)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw error;

    const match = (data ?? []).find(
      (row) => normalizeKey(String((row as Record<string, unknown>).email ?? "")) === emailKey
    ) as Record<string, unknown> | undefined;
    if (match) {
      return {
        orderId: String(match.id ?? ""),
        customerId: match.customer_id == null ? null : String(match.customer_id),
        matchedOn: "email",
      };
    }
  }

  if (phoneSuffix) {
    const { data, error } = await supabase
      .from("orders")
      .select("id,customer_id,phone")
      .not("referral_code", "is", null)
      .ilike("phone", `%${phoneSuffix}`)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;

    const match = (data ?? []).find((row) => {
      const rowPhone = normalizePhone(String((row as Record<string, unknown>).phone ?? ""));
      return rowPhone === phoneDigits || rowPhone.endsWith(phoneSuffix);
    }) as Record<string, unknown> | undefined;
    if (match) {
      return {
        orderId: String(match.id ?? ""),
        customerId: match.customer_id == null ? null : String(match.customer_id),
        matchedOn: "phone",
      };
    }
  }

  if (addressKey) {
    const searchTerm = addressKey.split(" ").filter(Boolean).slice(0, 4).join("%");
    const { data, error } = await supabase
      .from("orders")
      .select("id,customer_id,address")
      .not("referral_code", "is", null)
      .ilike("address", `%${searchTerm}%`)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;

    const match = (data ?? []).find((row) => {
      const rowAddress = normalizeAddressLine1(String((row as Record<string, unknown>).address ?? ""));
      return rowAddress.includes(addressKey);
    }) as Record<string, unknown> | undefined;
    if (match) {
      return {
        orderId: String(match.id ?? ""),
        customerId: match.customer_id == null ? null : String(match.customer_id),
        matchedOn: "address",
      };
    }
  }

  return null;
}

export async function ensureCustomerForAccountSignup(input: {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  phone?: string | null;
}): Promise<CustomerRecord> {
  const email = normalizeText(input.email).toLowerCase();
  if (!email) throw new Error("Email is required.");

  const existingByEmail = await findCustomerByEmail(email);
  if (existingByEmail) {
    const payload: Record<string, unknown> = {};
    const firstName = normalizeText(input.firstName) || null;
    const lastName = normalizeText(input.lastName) || null;
    const fullName =
      composeCustomerFullName({
        firstName,
        lastName,
        fullName: normalizeText(input.fullName) || email,
      }) || email;
    const phone = normalizeText(input.phone);

    if (fullName && fullName !== existingByEmail.full_name) payload.full_name = fullName;
    if (firstName && normalizeText(existingByEmail.first_name) !== firstName) {
      payload.first_name = firstName;
    }
    if (lastName && normalizeText(existingByEmail.last_name) !== lastName) {
      payload.last_name = lastName;
    }
    if (!normalizeText(existingByEmail.phone) && phone) payload.phone = phone;
    if (normalizeKey(existingByEmail.email) !== email) payload.email = email;
    payload.country = existingByEmail.country || "Philippines";

    if (Object.keys(payload).length === 0) return existingByEmail;

    const { data, error } = await selectCustomerRows<Record<string, unknown>>((columns) =>
      supabase.from("customers").update(payload).eq("id", existingByEmail.id).select(columns).single()
    );
    if (error) throw error;
    return mapCustomerRecord(data as Record<string, unknown>);
  }

  const firstName = normalizeText(input.firstName) || null;
  const lastName = normalizeText(input.lastName) || null;
  const fullName =
    composeCustomerFullName({
      firstName,
      lastName,
      fullName: normalizeText(input.fullName) || email,
    }) || email;
  const phone = normalizeText(input.phone);

  const { data, error } = await selectCustomerRows<Record<string, unknown>>((columns) =>
    supabase
      .from("customers")
      .insert({
        first_name: firstName,
        last_name: lastName,
        full_name: fullName,
        phone,
        email,
        address: "",
        attention_to: null,
        address_line1: null,
        address_line2: null,
        barangay: null,
        city: null,
        province: null,
        postal_code: null,
        country: "Philippines",
        delivery_note: null,
        notes: null,
      })
      .select(columns)
      .single()
  );
  if (error) throw error;
  return mapCustomerRecord(data as Record<string, unknown>);
}

export async function ensureCustomerRecord(input: CustomerIdentityInput): Promise<CustomerRecord> {
  const fullName = composeCustomerFullName(input);
  const phone = normalizeText(input.phone);
  if (!fullName) throw new Error("Customer full name is required.");
  if (!phone) throw new Error("Customer phone is required.");

  const existing = await findExactCustomerMatch(input);
  if (existing) {
    const payload: Record<string, unknown> = {};
    const firstName = normalizeText(input.firstName);
    const lastName = normalizeText(input.lastName);
    const email = normalizeText(input.email) || null;
    const address = normalizeText(input.address);
    const notes = normalizeText(input.notes) || null;
    const attentionTo = normalizeText(input.attentionTo) || null;
    const addressLine1 = normalizeText(input.addressLine1) || null;
    const addressLine2 = normalizeText(input.addressLine2) || null;
    const barangay = normalizeText(input.barangay) || null;
    const city = normalizeText(input.city) || null;
    const province = normalizeText(input.province) || null;
    const postalCode = normalizeText(input.postalCode) || null;
    const country = normalizeText(input.country) || "Philippines";
    const deliveryNote = normalizeText(input.deliveryNote) || null;

    if (firstName && firstName !== normalizeText(existing.first_name)) payload.first_name = firstName;
    if (lastName && lastName !== normalizeText(existing.last_name)) payload.last_name = lastName;
    if (email && normalizeKey(existing.email) !== normalizeKey(email)) payload.email = email;
    if (address && address !== existing.address) payload.address = address;
    if (notes && normalizeText(existing.notes) !== notes) payload.notes = notes;
    if (attentionTo !== existing.attention_to) payload.attention_to = attentionTo;
    if (addressLine1 !== (existing.address_line1 || null)) payload.address_line1 = addressLine1;
    if (addressLine2 !== (existing.address_line2 || null)) payload.address_line2 = addressLine2;
    if (barangay !== (existing.barangay || null)) payload.barangay = barangay;
    if (city !== (existing.city || null)) payload.city = city;
    if (province !== (existing.province || null)) payload.province = province;
    if (postalCode !== (existing.postal_code || null)) payload.postal_code = postalCode;
    if (country !== existing.country) payload.country = country;
    if (deliveryNote !== (existing.delivery_note || null)) payload.delivery_note = deliveryNote;

    if (Object.keys(payload).length > 0) {
      const { data, error } = await selectCustomerRows<Record<string, unknown>>((columns) =>
        supabase.from("customers").update(payload).eq("id", existing.id).select(columns).maybeSingle()
      );
      if (error) throw error;
      return mapCustomerRecord((data ?? existing) as Record<string, unknown>);
    }

    return existing;
  }

  const { data, error } = await selectCustomerRows<Record<string, unknown>>((columns) =>
    supabase
      .from("customers")
      .insert({
        first_name: normalizeText(input.firstName) || null,
        last_name: normalizeText(input.lastName) || null,
      full_name: fullName,
      phone,
      email: normalizeText(input.email) || null,
      address: composeCustomerAddress(input),
      attention_to: normalizeText(input.attentionTo) || null,
      address_line1: normalizeText(input.addressLine1) || null,
      address_line2: normalizeText(input.addressLine2) || null,
      barangay: normalizeText(input.barangay) || null,
      city: normalizeText(input.city) || null,
      province: normalizeText(input.province) || null,
      postal_code: normalizeText(input.postalCode) || null,
      country: normalizeText(input.country) || "Philippines",
      delivery_note: normalizeText(input.deliveryNote) || null,
      notes: normalizeText(input.notes) || null,
    })
      .select(columns)
      .single()
  );
  if (error) throw error;
  return mapCustomerRecord(data as Record<string, unknown>);
}

export async function createCustomerRecord(input: CustomerIdentityInput): Promise<CustomerRecord> {
  const fullName = composeCustomerFullName(input);
  const phone = normalizeText(input.phone);
  if (!fullName) throw new Error("Customer full name is required.");
  if (!phone) throw new Error("Customer phone is required.");
  const rawAddress = normalizeText(input.address);

  const { data, error } = await selectCustomerRows<Record<string, unknown>>((columns) =>
    supabase
      .from("customers")
      .insert({
        first_name: normalizeText(input.firstName) || null,
        last_name: normalizeText(input.lastName) || null,
        full_name: fullName,
        phone,
        email: normalizeText(input.email) || null,
        address: rawAddress || composeCustomerAddress(input),
        attention_to: normalizeText(input.attentionTo) || null,
        address_line1: normalizeText(input.addressLine1) || null,
        address_line2: normalizeText(input.addressLine2) || null,
        barangay: normalizeText(input.barangay) || null,
        city: normalizeText(input.city) || null,
        province: normalizeText(input.province) || null,
        postal_code: normalizeText(input.postalCode) || null,
        country: normalizeText(input.country) || "Philippines",
        delivery_note: normalizeText(input.deliveryNote) || null,
        notes: normalizeText(input.notes) || null,
      })
      .select(columns)
      .single()
  );
  if (error) throw error;
  return mapCustomerRecord(data as Record<string, unknown>);
}

export async function linkProfileToCustomer(profileId: string, customerId: string): Promise<void> {
  const { error } = await supabase.rpc("tp_admin_link_customer_to_profile", {
    p_profile_id: profileId,
    p_customer_id: customerId,
  });
  if (error) throw error;
}

export async function updateCustomerRecord(
  customerId: string,
  input: CustomerIdentityInput
): Promise<CustomerRecord> {
  const { data, error } = await selectCustomerRows<Record<string, unknown>>((columns) =>
    supabase
      .from("customers")
    .update({
      first_name: normalizeText(input.firstName) || null,
      last_name: normalizeText(input.lastName) || null,
      full_name: composeCustomerFullName(input),
      phone: normalizeText(input.phone),
      email: normalizeText(input.email) || null,
      address: composeCustomerAddress(input),
      attention_to: normalizeText(input.attentionTo) || null,
      address_line1: normalizeText(input.addressLine1) || null,
      address_line2: normalizeText(input.addressLine2) || null,
      barangay: normalizeText(input.barangay) || null,
      city: normalizeText(input.city) || null,
      province: normalizeText(input.province) || null,
      postal_code: normalizeText(input.postalCode) || null,
      country: normalizeText(input.country) || "Philippines",
      delivery_note: normalizeText(input.deliveryNote) || null,
      notes: normalizeText(input.notes) || null,
    })
      .eq("id", customerId)
      .select(columns)
      .single()
  );
  if (error) throw error;
  return mapCustomerRecord(data as Record<string, unknown>);
}

export async function fetchAdminCustomers(): Promise<CustomerAdminItem[]> {
  const { data, error } = await supabase.rpc("tp_admin_customer_overview");
  if (error) throw error;

  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: String(row.id ?? ""),
    customer_name: String(row.customer_name ?? "Unnamed customer"),
    email: row.email == null ? null : String(row.email),
    has_account: Boolean(row.has_account),
    order_count: Number(row.order_count ?? 0),
    total_ordered: Number(row.total_ordered ?? 0),
    current_credits: Number(row.current_credits ?? 0),
    steak_credits_enabled: Boolean(row.steak_credits_enabled),
  }));
}

export async function fetchAdminProfilesForCustomerLink(): Promise<AdminProfileOption[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id,first_name,last_name,customer_id");
  if (error) throw error;

  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: String(row.id ?? ""),
    first_name: row.first_name == null ? null : String(row.first_name),
    last_name: row.last_name == null ? null : String(row.last_name),
    customer_id: row.customer_id == null ? null : String(row.customer_id),
  }));
}

export async function fetchAdminCustomerDetail(customerId: string): Promise<CustomerAdminDetail | null> {
  let customer = await fetchCustomerById(customerId).catch(() => null);
  const overviewRows = customer ? null : await fetchAdminCustomers().catch(() => []);
  const overview = overviewRows?.find((row) => row.id === customerId) ?? null;

  if (!customer && overview) {
    customer = {
      id: overview.id,
      first_name: null,
      last_name: null,
      full_name: overview.customer_name,
      phone: "",
      email: overview.email,
      address: "",
      notes: null,
      attention_to: "",
      address_line1: "",
      address_line2: "",
      barangay: "",
      city: "",
      province: "",
      postal_code: "",
      country: "Philippines",
      delivery_note: "",
      created_at: null,
      available_steak_credits: overview.current_credits,
      steak_credits_enabled: overview.steak_credits_enabled,
    };
  }

  if (!customer) return null;

  const [profileResult, orders] = await Promise.all([
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("customer_id", customerId),
    fetchOrders({ all: true, customerId }),
  ]);

  const hasAccount =
    profileResult.error == null
      ? Number(profileResult.count ?? 0) > 0
      : Boolean(overview?.has_account);
  const firstOrderCreatedAt =
    orders.length > 0
      ? orders
          .map((row) => String(row.created_at ?? "").trim())
          .filter(Boolean)
          .slice()
          .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0] ?? null
      : null;

  return {
    customer: {
      ...customer,
      created_at: firstOrderCreatedAt ?? customer.created_at ?? null,
    },
    has_account: hasAccount,
    order_count: overview ? overview.order_count : orders.length,
    total_ordered: overview
      ? overview.total_ordered
      : orders.reduce((sum, row) => sum + Math.max(0, Number(row.total_selling_price ?? 0)), 0),
    orders,
  };
}

export async function adjustCustomerSteakCredits(
  customerId: string,
  delta: number
): Promise<number> {
  const { data, error } = await supabase.rpc("tp_admin_adjust_steak_credits", {
    p_customer_id: customerId,
    p_delta: delta,
  });
  if (error) throw error;
  return Number(data ?? 0);
}

export async function updateCustomerSteakCreditsEnabled(
  customerId: string,
  enabled: boolean
): Promise<boolean> {
  const { data, error } = await supabase
    .from("customers")
    .update({ steak_credits_enabled: enabled })
    .eq("id", customerId)
    .select("steak_credits_enabled")
    .single();
  if (error) throw error;
  return Boolean(data?.steak_credits_enabled);
}

export async function transferCustomerOrders(
  fromCustomerId: string,
  toCustomerId: string
): Promise<void> {
  const { error } = await supabase
    .from("orders")
    .update({ customer_id: toCustomerId })
    .eq("customer_id", fromCustomerId);
  if (error) throw error;
}

export async function transferCustomerReviews(
  fromCustomerId: string,
  toCustomerId: string
): Promise<void> {
  const { error } = await supabase
    .from("product_reviews")
    .update({ customer_id: toCustomerId })
    .eq("customer_id", fromCustomerId);
  if (error) throw error;
}

export async function relinkProfilesFromCustomer(
  fromCustomerId: string,
  toCustomerId: string
): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ customer_id: toCustomerId })
    .eq("customer_id", fromCustomerId);
  if (error) throw error;
}

export async function deleteCustomerById(customerId: string): Promise<void> {
  const { error } = await supabase.rpc("tp_admin_delete_customer", {
    p_customer_id: customerId,
  });
  if (error) throw error;
}

export async function mergeCustomers(
  keepCustomerId: string,
  removeCustomerId: string
): Promise<string> {
  const { data, error } = await supabase.rpc("tp_admin_merge_customers", {
    p_keep_customer_id: keepCustomerId,
    p_remove_customer_id: removeCustomerId,
  });
  if (error) throw error;
  return String(data ?? keepCustomerId);
}
