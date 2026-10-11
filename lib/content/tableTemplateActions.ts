"use server";

import { prisma } from "../db";
import { requireUser } from "../auth";
import type { TableTemplate } from "./tableTemplates";

const KEY = "table_templates_custom";

/** Templates saved from the post editor ("Save selected table as template"). */
export async function listCustomTableTemplates(): Promise<TableTemplate[]> {
  try {
    const row = await prisma.appConfig.findUnique({ where: { configKey: KEY } });
    const v = row?.configValue ? JSON.parse(row.configValue) : [];
    return Array.isArray(v) ? v.filter((t) => t && typeof t.html === "string" && typeof t.name === "string") : [];
  } catch {
    return [];
  }
}

async function store(list: TableTemplate[]) {
  await prisma.appConfig.upsert({ where: { configKey: KEY }, create: { configKey: KEY, configValue: JSON.stringify(list) }, update: { configValue: JSON.stringify(list) } });
}

export async function saveTableTemplate(name: string, html: string): Promise<{ ok: boolean; error?: string; template?: TableTemplate }> {
  if (!(await requireUser())) return { ok: false, error: "Please sign in again." };
  const n = name.trim().slice(0, 80);
  const h = html.trim();
  if (!n) return { ok: false, error: "Give the template a name." };
  if (!/^<table[\s>]/i.test(h) || h.length > 60000) return { ok: false, error: "Only a single table can be saved as a template." };
  // no scripts or inline event handlers in saved templates
  const clean = h.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/\son\w+=("[^"]*"|'[^']*')/gi, "");
  const list = await listCustomTableTemplates();
  const t: TableTemplate = { id: `c${Date.now().toString(36)}`, name: n, html: clean };
  await store([...list, t].slice(-50));
  return { ok: true, template: t };
}

export async function deleteTableTemplate(id: string): Promise<{ ok: boolean }> {
  if (!(await requireUser())) return { ok: false };
  await store((await listCustomTableTemplates()).filter((t) => t.id !== id));
  return { ok: true };
}
