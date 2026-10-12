import type { Prisma } from "@prisma/client";

/** Segment conditions: all must match; several values = any of them. "Unknown" = subscribers without that detail. */
export const SEGMENT_FIELDS = {
  country: "Country",
  region: "State / Region",
  city: "City",
  device: "Device",
  os: "Operating system",
  browser: "Browser",
} as const;
export type SegmentField = keyof typeof SEGMENT_FIELDS;
export interface SegmentRule {
  field: SegmentField;
  op: "is" | "is_not";
  values: string[];
}

export function cleanRules(input: unknown): SegmentRule[] {
  if (!Array.isArray(input)) return [];
  const out: SegmentRule[] = [];
  for (const r of input) {
    if (!r || typeof r !== "object") continue;
    const f = String((r as { field?: unknown }).field ?? "") as SegmentField;
    if (!(f in SEGMENT_FIELDS)) continue;
    const raw = (r as { values?: unknown }).values;
    let vals = (Array.isArray(raw) ? raw : String(raw ?? "").split(",")).map((v) => String(v).trim().slice(0, 80)).filter(Boolean);
    if (f === "country") vals = vals.map((v) => (/^unknown$/i.test(v) ? "Unknown" : v.toUpperCase()));
    if (f === "device") vals = vals.map((v) => (/^unknown$/i.test(v) ? "Unknown" : v.toLowerCase()));
    vals = [...new Set(vals)].slice(0, 100);
    if (!vals.length) continue;
    out.push({ field: f, op: (r as { op?: unknown }).op === "is_not" ? "is_not" : "is", values: vals });
  }
  return out.slice(0, 20);
}

export function parseRules(json: string | null | undefined): SegmentRule[] {
  try {
    return cleanRules(JSON.parse(json || "[]"));
  } catch {
    return [];
  }
}

/** The subscribers a set of rules selects (Prisma filter). */
export function rulesToWhere(rules: SegmentRule[]): Prisma.PushSubscriptionWhereInput {
  const and: Prisma.PushSubscriptionWhereInput[] = [];
  for (const r of rules) {
    const known = r.values.filter((v) => !/^unknown$/i.test(v));
    const unknown = known.length !== r.values.length;
    // country is nullable; the other details are "" when unknown
    const blank: Prisma.PushSubscriptionWhereInput = r.field === "country" ? { OR: [{ country: null }, { country: "" }] } : { [r.field]: "" };
    const inKnown: Prisma.PushSubscriptionWhereInput = { [r.field]: { in: known } };
    const match: Prisma.PushSubscriptionWhereInput = unknown && known.length ? { OR: [inKnown, blank] } : unknown ? blank : inKnown;
    and.push(r.op === "is" ? match : { NOT: match });
  }
  return and.length ? { AND: and } : {};
}

export function rulesText(rules: SegmentRule[]): string {
  return rules.length ? rules.map((r) => `${SEGMENT_FIELDS[r.field]} ${r.op === "is_not" ? "is not" : "is"} ${r.values.join(", ")}`).join(" · ") : "All subscribers";
}
