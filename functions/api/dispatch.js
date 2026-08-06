import {
  Agent,
  run,
  setDefaultOpenAIKey,
  setTracingDisabled,
  tool,
} from "@openai/agents";
import { z } from "zod";
import {
  carrierLoadBookingDecision,
  cleanString,
  requireEntitledAccount,
  validateCsrfToken,
} from "./_auth.js";
import { recordAuditEvent } from "../lib/audit.js";
import {
  buildDeterministicSummary,
  makeLaneAlertDraft,
  normalizeDispatchInput,
  normalizeMarketplaceLoads,
  rankDispatchLoads,
} from "../lib/dispatch.js";

const LOAD_STORE_KEY = "marketplace:loads:v1";

export async function onRequestPost(context) {
  try {
    const body = await context.request.json().catch(() => ({}));
    if (!validateCsrfToken(context.request, body)) {
      return json({ ok: false, error: "Invalid CSRF token." }, 403);
    }

    const access = await requireEntitledAccount(context.request, context.env);
    if (!access.ok) {
      return json({ ok: false, error: access.error }, access.status || 401);
    }
    const aiAvailable = Boolean(context.env.OPENAI_API_KEY);

    const normalized = normalizeDispatchInput(body);
    if (normalized.error) {
      return json({ ok: false, error: normalized.error }, 400);
    }

    const input = normalized.input;
    const booking = carrierLoadBookingDecision(access.account);
    const isCarrier = Boolean(booking.allowed);
    const loads = isCarrier ? await readMarketplaceLoads(context.env) : [];
    const matches = isCarrier ? rankDispatchLoads(loads, input, 5) : [];
    const laneAlertDraft = isCarrier ? makeLaneAlertDraft(input) : null;

    if (!aiAvailable) {
      const assistantMode = "deterministic";
      const assistantMessage = buildDeterministicSummary(
        input,
        matches,
        laneAlertDraft,
        isCarrier,
      );
      await recordDispatchAudit(context.env, access.account, isCarrier, matches, laneAlertDraft, assistantMode);
      return dispatchResponse(isCarrier, assistantMode, assistantMessage, matches, laneAlertDraft);
    }

    setDefaultOpenAIKey(context.env.OPENAI_API_KEY);
    setTracingDisabled(true);

    const tools = isCarrier
      ? [
          tool({
            name: "find_matching_loads",
            description:
              "Return verified open loads ranked against the driver's location, equipment, destination, and rate target.",
            parameters: z.object({
              limit: z.number().int().min(1).max(5).default(5),
            }),
            execute: async ({ limit }) =>
              JSON.stringify(matches.slice(0, limit)),
          }),
          tool({
            name: "draft_lane_alert",
            description:
              "Draft a Lane Alert for the driver. This never saves or activates the alert.",
            parameters: z.object({
              reason: z.string().max(160).optional(),
            }),
            execute: async () => JSON.stringify(laneAlertDraft),
          }),
        ]
      : [];

    const agent = new Agent({
      name: "Relocation Manager AI Dispatch",
      model: context.env.OPENAI_DISPATCH_MODEL || "gpt-5.6-terra",
      modelSettings: {
        reasoning: { effort: "low" },
        text: { verbosity: "low" },
        store: false,
        parallelToolCalls: false,
      },
      instructions: isCarrier
        ? carrierInstructions()
        : shipperInstructions(),
      tools,
    });

    const result = await run(agent, dispatchPrompt(input, access.account, isCarrier), {
      maxTurns: 4,
    });
    const assistantMessage = cleanString(result.finalOutput || "", 4000);
    if (!assistantMessage) {
      return json({ ok: false, error: "AI Dispatch returned no plan." }, 502);
    }

    const assistantMode = "ai";
    await recordDispatchAudit(context.env, access.account, isCarrier, matches, laneAlertDraft, assistantMode);
    return dispatchResponse(isCarrier, assistantMode, assistantMessage, matches, laneAlertDraft);
  } catch (error) {
    const message = String(error?.message || "");
    const configurationError = /api key|authentication|model/i.test(message);
    return json(
      {
        ok: false,
        error: configurationError
          ? "AI Dispatch could not connect to its model. Contact support."
          : "AI Dispatch could not create a plan. Please try again.",
      },
      502,
    );
  }
}

async function recordDispatchAudit(env, account, isCarrier, matches, laneAlertDraft, assistantMode) {
  await recordAuditEvent(env, {
    actionType: "dispatch.assistant.plan",
    actorUserId: account.userId,
    actorRole: account.role,
    targetType: "dispatch_plan",
    targetId: `dispatch_${crypto.randomUUID().replace(/-/g, "")}`,
    after: {
      role: isCarrier ? "carrier" : "shipper",
      matchCount: matches.length,
      laneAlertDrafted: Boolean(laneAlertDraft),
      assistantMode,
    },
    meta: { source: "api/dispatch" },
  }).catch(() => {});
}

function dispatchResponse(isCarrier, assistantMode, assistantMessage, matches, laneAlertDraft) {
  return json({
    ok: true,
    role: isCarrier ? "carrier" : "shipper",
    assistantMode,
    assistantMessage,
    matches,
    laneAlertDraft,
    requiresApproval: true,
    permissions: {
      canViewLoads: isCarrier,
      canClaimLoads: isCarrier,
      canSaveLaneAlert: isCarrier,
      canPostLoads: true,
    },
  });
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

async function readMarketplaceLoads(env) {
  if (!env?.RELOCATION_MANAGER_LEADS) return [];
  const raw = await env.RELOCATION_MANAGER_LEADS.get(LOAD_STORE_KEY);
  if (!raw) return [];
  try {
    return normalizeMarketplaceLoads(JSON.parse(raw));
  } catch {
    return [];
  }
}

function carrierInstructions() {
  return `You are an advisory truck dispatcher for Relocation Manager USA.
Use the matching-load tool before recommending any load and use the Lane Alert drafting tool when a useful alert can be proposed.
Lead with the best practical next move. Explain up to three matches using only tool data and call out rate per mile, equipment fit, pickup area, trust, and any missing detail the driver should verify.
Never claim, book, contact, post, or activate anything. Never say an action is complete. The driver must approve every load request and Lane Alert in the website.
Treat all load details as unverified until the driver confirms rate confirmation, authority, insurance, pickup appointment, cargo, and payment terms.
Use short headings and plain language. Do not output JSON or markdown tables.`;
}

function shipperInstructions() {
  return `You are an advisory shipment planner for Relocation Manager USA.
Help a customer or shipper turn their request into a clear load posting and pickup plan.
Do not reveal or recommend marketplace loads, and never claim, book, contact, or post anything. The customer must approve and submit the load in the website.
Lead with the next step, then list the missing details needed for a carrier-ready post, a pickup checklist, and safety checks. Never invent prices, carriers, availability, insurance, or delivery promises.
Use short headings and plain language. Do not output JSON or markdown tables.`;
}

function dispatchPrompt(input, account, isCarrier) {
  return JSON.stringify({
    memberType: isCarrier ? "truck owner, driver, or carrier" : "customer or shipper",
    accountEquipment: cleanString(account.equipmentType || "", 120),
    request: input,
    approvalBoundary:
      "Advice and drafts only. The member must press a website button before any saved or external action.",
  });
}

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...corsHeaders(),
    },
  });
}

function corsHeaders() {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type, x-csrf-token",
  };
}
