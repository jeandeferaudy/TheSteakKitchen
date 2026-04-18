import { supabase } from "@/lib/supabase";

export type LogisticsPostalRule = {
  id: string;
  postal_from: string;
  postal_to: string | null;
  price_php: number;
  free_delivery_moq_php: number;
  sort_order: number;
};

export type LogisticsConfig = {
  rules: LogisticsPostalRule[];
  other_enabled: boolean;
  other_price_php: number;
  other_free_delivery_moq_php: number;
};

export type LogisticsPricingRow = {
  id: string;
  label: string;
  pricePhp: number;
  freeDeliveryMoqPhp: number;
  isOther: boolean;
};

export type LogisticsDraftRule = {
  id: string;
  postal_from: string;
  postal_to: string;
  price_php: string;
  free_delivery_moq_php: string;
};

export function normalizePostalCode(value: string | null | undefined): string {
  return String(value ?? "").replace(/\D/g, "").slice(0, 4);
}

export function formatPostalRuleLabel(postalFrom: string, postalTo: string | null | undefined): string {
  const from = normalizePostalCode(postalFrom);
  const to = normalizePostalCode(postalTo);
  if (!from) return "";
  if (!to || to === from) return from;
  return `${from}-${to}`;
}

export function buildLogisticsPricingRows(config: LogisticsConfig): LogisticsPricingRow[] {
  const rows = config.rules.map((rule) => ({
    id: rule.id,
    label: formatPostalRuleLabel(rule.postal_from, rule.postal_to),
    pricePhp: Math.max(0, Number(rule.price_php) || 0),
    freeDeliveryMoqPhp: Math.max(0, Number(rule.free_delivery_moq_php) || 0),
    isOther: false,
  }));

  if (config.other_enabled) {
    rows.push({
      id: "other",
      label: "Other",
      pricePhp: Math.max(0, Number(config.other_price_php) || 0),
      freeDeliveryMoqPhp: Math.max(0, Number(config.other_free_delivery_moq_php) || 0),
      isOther: true,
    });
  }

  return rows;
}

export function resolveLogisticsPrice(
  postalCode: string,
  config: LogisticsConfig,
  subtotal = 0
): {
  supported: boolean;
  pricePhp: number | null;
  matchedLabel: string | null;
  freeDeliveryMoqPhp: number | null;
} {
  const normalized = normalizePostalCode(postalCode);
  if (!normalized) {
    return { supported: false, pricePhp: null, matchedLabel: null, freeDeliveryMoqPhp: null };
  }

  for (const rule of config.rules) {
    const from = normalizePostalCode(rule.postal_from);
    const to = normalizePostalCode(rule.postal_to) || from;
    if (!from) continue;
    const moq = Math.max(0, Number(rule.free_delivery_moq_php) || 0);
    if (normalized >= from && normalized <= to) {
      return {
        supported: true,
        pricePhp: moq > 0 && subtotal >= moq ? 0 : Math.max(0, Number(rule.price_php) || 0),
        matchedLabel: formatPostalRuleLabel(from, to),
        freeDeliveryMoqPhp: moq,
      };
    }
  }

  if (config.other_enabled) {
    const moq = Math.max(0, Number(config.other_free_delivery_moq_php) || 0);
    return {
      supported: true,
      pricePhp: moq > 0 && subtotal >= moq ? 0 : Math.max(0, Number(config.other_price_php) || 0),
      matchedLabel: "Other",
      freeDeliveryMoqPhp: moq,
    };
  }

  return { supported: false, pricePhp: null, matchedLabel: null, freeDeliveryMoqPhp: null };
}

export function createEmptyLogisticsDraftRule(): LogisticsDraftRule {
  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `rule-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    postal_from: "",
    postal_to: "",
    price_php: "",
    free_delivery_moq_php: "",
  };
}

export async function fetchLogisticsConfig(): Promise<LogisticsConfig> {
  const [rulesResult, settingsResult] = await Promise.all([
    supabase
      .from("logistics_postal_rules")
      .select("id,postal_from,postal_to,price_php,free_delivery_moq_php,sort_order")
      .order("sort_order", { ascending: true })
      .order("postal_from", { ascending: true }),
    supabase
      .from("logistics_settings")
      .select("other_enabled,other_price_php,other_free_delivery_moq_php")
      .eq("id", 1)
      .maybeSingle(),
  ]);

  if (rulesResult.error) throw rulesResult.error;
  if (settingsResult.error) throw settingsResult.error;

  const rules = (rulesResult.data ?? []).map((row) => ({
    id: String(row.id ?? ""),
    postal_from: normalizePostalCode((row as Record<string, unknown>).postal_from as string),
    postal_to: normalizePostalCode((row as Record<string, unknown>).postal_to as string) || null,
    price_php: Math.max(0, Number((row as Record<string, unknown>).price_php ?? 0)),
    free_delivery_moq_php: Math.max(
      0,
      Number((row as Record<string, unknown>).free_delivery_moq_php ?? 0)
    ),
    sort_order: Math.max(0, Number((row as Record<string, unknown>).sort_order ?? 0)),
  }));

  return {
    rules,
    other_enabled: Boolean(settingsResult.data?.other_enabled),
    other_price_php: Math.max(0, Number(settingsResult.data?.other_price_php ?? 0)),
    other_free_delivery_moq_php: Math.max(
      0,
      Number(settingsResult.data?.other_free_delivery_moq_php ?? 0)
    ),
  };
}

export async function saveLogisticsConfig(input: {
  rules: LogisticsDraftRule[];
  other_enabled: boolean;
  other_price_php: number;
  other_free_delivery_moq_php: number;
}): Promise<LogisticsConfig> {
  const normalizedRules = input.rules.map((rule, index) => {
    const postalFrom = normalizePostalCode(rule.postal_from);
    const postalTo = normalizePostalCode(rule.postal_to);
    const pricePhp = Math.max(0, Number(rule.price_php) || 0);
    const freeDeliveryMoqPhp = Math.max(0, Number(rule.free_delivery_moq_php) || 0);

    if (!postalFrom) {
      throw new Error(`Row ${index + 1}: Postal code "from" is required.`);
    }
    if (postalTo && postalTo < postalFrom) {
      throw new Error(`Row ${index + 1}: Postal code "to" must be greater than or equal to "from".`);
    }

    return {
      postal_from: postalFrom,
      postal_to: postalTo || null,
      price_php: pricePhp,
      free_delivery_moq_php: freeDeliveryMoqPhp,
      sort_order: index,
    };
  });

  const settingsPayload = {
    id: 1,
    other_enabled: Boolean(input.other_enabled),
    other_price_php: Math.max(0, Number(input.other_price_php) || 0),
    other_free_delivery_moq_php: Math.max(0, Number(input.other_free_delivery_moq_php) || 0),
  };

  const settingsSave = await supabase
    .from("logistics_settings")
    .upsert(settingsPayload, { onConflict: "id" });
  if (settingsSave.error) throw settingsSave.error;

  const deleteResult = await supabase
    .from("logistics_postal_rules")
    .delete()
    .not("id", "is", null);
  if (deleteResult.error) throw deleteResult.error;

  if (normalizedRules.length > 0) {
    const insertResult = await supabase
      .from("logistics_postal_rules")
      .insert(normalizedRules);
    if (insertResult.error) throw insertResult.error;
  }

  return fetchLogisticsConfig();
}
