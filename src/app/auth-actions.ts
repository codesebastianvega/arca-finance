"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { bootstrapWorkspaceForUser, getCurrentWorkspaceContext } from "@/lib/auth";
import { ensureScheduledEventsForWorkspace } from "@/lib/template-generation";
import { createSupabaseServerActionClient } from "@/lib/supabase";

const onboardingSchema = z.object({
  workspaceName: z.string().trim().min(2).max(80),
  fullName: z.string().trim().min(2).max(120).optional(),
  accountName: z.string().trim().min(2).max(80),
  accountType: z.enum(["cash", "bank", "wallet", "savings", "other"]),
  accountColor: z.string().trim().min(2).max(40),
  businessUnitName: z.string().trim().min(2).max(80),
  incomeSourceName: z.string().trim().min(2).max(80),
  templateName: z.string().trim().min(2).max(80),
  templateAmount: z.coerce.number().positive(),
  templateFrequency: z.enum(["weekly", "biweekly", "monthly", "bimonthly", "custom_days_of_month"]),
  templateDaysOfMonth: z.string().trim().optional(),
  templateStartDate: z.string().trim().min(10),
  templateRecurrenceMode: z.enum(["open_recurring", "date_bounded", "occurrence_bounded"]).default("open_recurring"),
  templateEndDate: z.string().trim().optional(),
  templateOccurrenceLimit: z.coerce.number().int().min(1).optional(),
});

function slugifyBusinessUnitKey(value: string) {
  const normalized = value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return normalized || "unidad";
}

function parseDaysOfMonth(value?: string) {
  if (!value?.trim()) return [];

  return [...new Set(
    value
      .split(",")
      .map((item) => Number(item.trim()))
      .filter((item) => Number.isInteger(item) && item >= 1 && item <= 31)
  )].sort((left, right) => left - right);
}

export async function signOutAction() {
  const supabase = await createSupabaseServerActionClient();

  if (supabase) {
    await supabase.auth.signOut();
  }

  redirect("/");
}

export async function bootstrapWorkspaceAction(formData: FormData) {
  const input = onboardingSchema.parse({
    workspaceName: formData.get("workspaceName"),
    fullName: formData.get("fullName") || undefined,
    accountName: formData.get("accountName"),
    accountType: formData.get("accountType"),
    accountColor: formData.get("accountColor"),
    businessUnitName: formData.get("businessUnitName"),
    incomeSourceName: formData.get("incomeSourceName"),
    templateName: formData.get("templateName"),
    templateAmount: formData.get("templateAmount"),
    templateFrequency: formData.get("templateFrequency"),
    templateDaysOfMonth: formData.get("templateDaysOfMonth") || undefined,
    templateStartDate: formData.get("templateStartDate"),
    templateRecurrenceMode: formData.get("templateRecurrenceMode") || "open_recurring",
    templateEndDate: formData.get("templateEndDate") || undefined,
    templateOccurrenceLimit: formData.get("templateOccurrenceLimit") || undefined,
  });

  const supabase = await createSupabaseServerActionClient();

  if (!supabase) {
    redirect("/onboarding?error=access");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const workspaceId = await bootstrapWorkspaceForUser({
    userId: user.id,
    email: user.email,
    fullName: input.fullName ?? user.user_metadata?.full_name,
    workspaceName: input.workspaceName,
  });

  const { data: account, error: accountError } = await supabase
    .from("accounts")
    .insert({
      workspace_id: workspaceId,
      name: input.accountName,
      type: input.accountType,
      balance: 0,
      color: input.accountColor,
      active: true,
    })
    .select("id")
    .single();

  if (accountError || !account) {
    redirect("/onboarding?error=access");
  }

  const businessKey = slugifyBusinessUnitKey(input.businessUnitName);

  const { error: businessError } = await supabase.from("business_units").insert({
    workspace_id: workspaceId,
    key: businessKey,
    name: input.businessUnitName,
    income: 0,
    expense: 0,
    pending: 0,
  });

  if (businessError) {
    redirect("/onboarding?error=access");
  }

  const { data: incomeSource, error: sourceError } = await supabase
    .from("income_sources")
    .insert({
      workspace_id: workspaceId,
      name: input.incomeSourceName,
      business_unit_key: businessKey,
      type: "manual",
      active: true,
    })
    .select("id")
    .single();

  if (sourceError || !incomeSource) {
    redirect("/onboarding?error=access");
  }

  const { error: templateError } = await supabase.from("income_templates").insert({
    workspace_id: workspaceId,
    name: input.templateName,
    kind: "income",
    status: "active",
    recurrence_mode: input.templateRecurrenceMode,
    frequency: input.templateFrequency,
    days_of_month: input.templateFrequency === "custom_days_of_month" ? parseDaysOfMonth(input.templateDaysOfMonth) : [],
    start_date: input.templateStartDate,
    end_date: input.templateEndDate || null,
    occurrence_limit: input.templateRecurrenceMode === "occurrence_bounded" ? input.templateOccurrenceLimit ?? null : null,
    default_amount: input.templateAmount,
    default_account_id: account.id,
    business_unit_key: businessKey,
    income_source_id: incomeSource.id,
  });

  if (templateError) {
    redirect("/onboarding?error=access");
  }

  await ensureScheduledEventsForWorkspace(supabase as never, workspaceId);

  const context = await getCurrentWorkspaceContext();

  if (context.context) {
    redirect("/app/hoy?welcome=1");
  }

  redirect("/onboarding?error=access");
}
