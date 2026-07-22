import { boardKey, cleanString, requireEntitledAccount } from './_auth.js';

export async function onRequestGet(context) {
  try {
    const { request, env } = context;
    const access = await requireEntitledAccount(request, env);
    if (!access.ok) {
      return json({ ok: false, error: access.error }, access.status || 401);
    }

    const board = await readBoard(env);
    return json({ ok: true, posts: board.posts || [] });
  } catch {
    return json({ ok: false, error: 'Bulletin lookup failed.' }, 500);
  }
}

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const access = await requireEntitledAccount(request, env);
    if (!access.ok) {
      return json({ ok: false, error: access.error }, access.status || 401);
    }

    const body = await request.json().catch(() => ({}));
    const action = String(body.action || 'post');
    const board = await readBoard(env);
    const posts = Array.isArray(board.posts) ? board.posts : [];

    if (action === 'post') {
      const post = normalizePost(body.post || body);
      if (!post.body) return json({ ok: false, error: 'Message is required.' }, 400);
      const saved = {
        id: crypto.randomUUID(),
        authorName: post.authorName || access.account.name || 'Community',
        authorRole: post.authorRole || access.account.role || 'Member',
        authorEmail: access.account.email,
        language: post.language || 'en',
        subject: post.subject || 'Board update',
        body: post.body,
        translations: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      posts.unshift(saved);
      await writeBoard(env, { posts: posts.slice(0, 40) });
      return json({ ok: true, post: saved, posts: posts.slice(0, 40) });
    }

    if (action === 'translate') {
      const id = String(body.id || '').trim();
      const language = String(body.language || '').trim().toLowerCase();
      if (!id || !language) return json({ ok: false, error: 'Post id and language are required.' }, 400);
      const translation = String(body.translation || '').trim();
      const idx = posts.findIndex((item) => item.id === id);
      if (idx === -1) return json({ ok: false, error: 'Post not found.' }, 404);
      posts[idx].translations = Object.assign({}, posts[idx].translations || {}, { [language]: translation });
      posts[idx].updatedAt = new Date().toISOString();
      await writeBoard(env, { posts: posts.slice(0, 40) });
      return json({ ok: true, post: posts[idx], posts: posts.slice(0, 40) });
    }

    if (action === 'delete') {
      const id = String(body.id || '').trim();
      if (!id) return json({ ok: false, error: 'Post id is required.' }, 400);
      const nextPosts = posts.filter((item) => item.id !== id);
      await writeBoard(env, { posts: nextPosts.slice(0, 40) });
      return json({ ok: true, posts: nextPosts.slice(0, 40) });
    }

    return json({ ok: false, error: 'Unsupported bulletin action.' }, 400);
  } catch {
    return json({ ok: false, error: 'Bulletin update failed.' }, 500);
  }
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

async function readBoard(env) {
  if (env?.RELOCATION_MANAGER_DB?.prepare) {
    try {
      const row = await env.RELOCATION_MANAGER_DB.prepare(
        'SELECT payload_json FROM bulletin_boards WHERE board_key = ? LIMIT 1'
      ).bind(boardKey()).first();
      if (row?.payload_json) return JSON.parse(row.payload_json);
    } catch {
      // Fall back to KV below.
    }
  }

  const raw = await env.RELOCATION_MANAGER_LEADS.get(boardKey());
  return raw ? JSON.parse(raw) : { posts: [] };
}

async function writeBoard(env, board) {
  const payload = JSON.stringify(board);
  if (env?.RELOCATION_MANAGER_DB?.prepare) {
    try {
      await env.RELOCATION_MANAGER_DB.prepare(
        `INSERT INTO bulletin_boards (board_key, payload_json, updated_at)
         VALUES (?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(board_key) DO UPDATE SET payload_json = excluded.payload_json, updated_at = CURRENT_TIMESTAMP`
      ).bind(boardKey(), payload).run();
    } catch {
      // Fall back to KV below.
    }
  }
  await env.RELOCATION_MANAGER_LEADS.put(boardKey(), payload);
}

function normalizePost(input) {
  return {
    authorName: cleanString(input.authorName, 80),
    authorRole: cleanString(input.authorRole, 40),
    authorEmail: cleanString(input.authorEmail, 120).toLowerCase(),
    language: cleanString(input.language, 10).toLowerCase() || 'en',
    subject: cleanString(input.subject, 120),
    body: cleanString(input.body, 1500),
  };
}

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...corsHeaders(),
    },
  });
}

function corsHeaders() {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
  };
}
