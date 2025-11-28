import { supabase } from "./db";

export interface LeadSettings {
  id: number;
  telegramId: string;
  phone: string | null;
  groups: string[];
  keywords: string[];
  createdAt: string;
}

function mapRow(row: any): LeadSettings {
  return {
    id: row.id,
    telegramId: row.telegram_id,
    phone: row.phone ?? null,
    groups: Array.isArray(row.groups) ? row.groups.map(String) : [],
    keywords: Array.isArray(row.keywords) ? row.keywords.map(String) : [],
    createdAt: row.created_at,
  };
}

export async function getByTelegramId(telegramId: string): Promise<LeadSettings | null> {
  const { data, error } = await supabase
    .from("lead_settings")
    .select("*")
    .eq("telegram_id", telegramId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapRow(data) : null;
}

export async function upsertUser(
  telegramId: string,
  phone?: string | null
): Promise<LeadSettings> {
  const payload: Record<string, any> = { telegram_id: telegramId };
  if (phone) payload.phone = phone;
  const { data, error } = await supabase.from("lead_settings").upsert(payload).select().single();
  if (error) throw error;
  return mapRow(data);
}

export async function updatePhone(telegramId: string, phone: string): Promise<void> {
  const { error } = await supabase
    .from("lead_settings")
    .update({ phone })
    .eq("telegram_id", telegramId);
  if (error) throw error;
}

export async function updateGroups(telegramId: string, groups: string[]): Promise<void> {
  const uniqueGroups = Array.from(new Set(groups.map((g) => g.trim()).filter(Boolean)));
  const { error } = await supabase
    .from("lead_settings")
    .update({ groups: uniqueGroups })
    .eq("telegram_id", telegramId);
  if (error) throw error;
}

export async function updateKeywords(telegramId: string, keywords: string[]): Promise<void> {
  const normalized = Array.from(
    new Set(keywords.map((k) => k.trim().toLowerCase()).filter(Boolean))
  );
  const { error } = await supabase
    .from("lead_settings")
    .update({ keywords: normalized })
    .eq("telegram_id", telegramId);
  if (error) throw error;
}

export async function getAll(): Promise<LeadSettings[]> {
  const { data, error } = await supabase.from("lead_settings").select("*");
  if (error) throw error;
  return (data || []).map(mapRow);
}
