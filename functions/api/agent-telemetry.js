import {
  cleanNumber,
  cleanString,
  isAdminAccount,
  requireEntitledAccount,
} from "./_auth.js";

const TELEMETRY_KEY = "openclaw:telemetry:v1";
const MAX_AGE_SECONDS = 180;

export async function onRequestGet(context) {
  try {
    const access = await requireEntitledAccount(context.request, context.env);
    if (!access.ok)
      return json({ ok: false, error: access.error }, access.status || 401);
    if (!isAdminAccount(access.account))
      return json({ ok: false, error: "Administrator access required." }, 403);

    const telemetry = await readTelemetry(context.env);
    if (!telemetry)
      return json({
        ok: true,
        connected: false,
        stale: true,
        error: "OpenClaw has not sent telemetry yet.",
      });

    const ageSeconds = Math.max(
      0,
      Math.round((Date.now() - Date.parse(telemetry.receivedAt)) / 1000),
    );
    return json({
      ok: true,
      connected: ageSeconds <= MAX_AGE_SECONDS,
      stale: ageSeconds > MAX_AGE_SECONDS,
      ageSeconds,
      telemetry,
    });
  } catch {
    return json({ ok: false, error: "Could not load agent telemetry." }, 500);
  }
}

export async function onRequestPost(context) {
  try {
    const expected = cleanString(context.env.OPENCLAW_TELEMETRY_TOKEN, 300);
    const supplied = cleanString(
      String(context.request.headers.get("authorization") || "").replace(
        /^Bearer\s+/i,
        "",
      ),
      300,
    );
    if (!expected || !supplied || !safeEqual(expected, supplied))
      return json({ ok: false, error: "Invalid telemetry credential." }, 401);
    if (!context.env.RELOCATION_MANAGER_LEADS)
      return json(
        { ok: false, error: "Telemetry storage is unavailable." },
        503,
      );

    const body = await context.request.json();
    const telemetry = sanitizeTelemetry(body);
    telemetry.receivedAt = new Date().toISOString();
    await context.env.RELOCATION_MANAGER_LEADS.put(
      TELEMETRY_KEY,
      JSON.stringify(telemetry),
      { expirationTtl: 60 * 60 * 24 * 7 },
    );
    return json({ ok: true, receivedAt: telemetry.receivedAt });
  } catch {
    return json({ ok: false, error: "Invalid telemetry payload." }, 400);
  }
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

async function readTelemetry(env) {
  if (!env.RELOCATION_MANAGER_LEADS) return null;
  const raw = await env.RELOCATION_MANAGER_LEADS.get(TELEMETRY_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function sanitizeTelemetry(body = {}) {
  const agents = Array.isArray(body.agents) ? body.agents.slice(0, 20) : [];
  const events = Array.isArray(body.events) ? body.events.slice(0, 30) : [];
  const tasks = Array.isArray(body.tasks) ? body.tasks.slice(0, 30) : [];
  return {
    version: 1,
    generatedAt: cleanDate(body.generatedAt) || new Date().toISOString(),
    openclawVersion: cleanString(body.openclawVersion, 60),
    gateway: {
      reachable: Boolean(body.gateway?.reachable),
      latencyMs: Math.min(60_000, cleanNumber(body.gateway?.latencyMs)),
      source: cleanString(body.gateway?.source, 80),
    },
    channel: {
      name: cleanString(body.channel?.name, 40),
      connected:
        typeof body.channel?.connected === "boolean"
          ? body.channel.connected
          : null,
    },
    summary: {
      agents: Math.min(100, cleanNumber(body.summary?.agents)),
      active: Math.min(100, cleanNumber(body.summary?.active)),
      runningTasks: Math.min(10_000, cleanNumber(body.summary?.runningTasks)),
      failedTasks: Math.min(10_000, cleanNumber(body.summary?.failedTasks)),
      sessions: Math.min(100_000, cleanNumber(body.summary?.sessions)),
    },
    agents: agents.map((agent) => ({
      id: cleanString(agent.id, 64),
      name: cleanString(agent.name, 80),
      emoji: cleanString(agent.emoji, 12),
      role: cleanString(agent.role, 120),
      model: cleanString(agent.model, 100),
      status: cleanString(agent.status, 30),
      task: cleanString(agent.task, 240),
      progress: Math.min(100, cleanNumber(agent.progress)),
      sessions: Math.min(100_000, cleanNumber(agent.sessions)),
      errors: Math.min(100_000, cleanNumber(agent.errors)),
      lastActiveAt: cleanDate(agent.lastActiveAt),
    })),
    tasks: tasks.map((task) => ({
      id: cleanString(task.id, 100),
      agentId: cleanString(task.agentId, 64),
      label: cleanString(task.label, 180),
      status: cleanString(task.status, 30),
      updatedAt: cleanDate(task.updatedAt),
      detail: cleanString(task.detail, 300),
    })),
    events: events.map((event) => ({
      severity: cleanString(event.severity, 20),
      title: cleanString(event.title, 120),
      detail: cleanString(event.detail, 300),
      timestamp: cleanDate(event.timestamp),
    })),
  };
}

function cleanDate(value) {
  const text = cleanString(value, 80);
  const timestamp = Date.parse(text);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : "";
}

function safeEqual(left, right) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1)
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
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
    "access-control-allow-origin": "https://relocationmanagerusa.com",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type, authorization",
    "cache-control": "no-store",
  };
}
