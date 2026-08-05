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
        authorUserId: access.account.userId,
        authorName: post.authorName || access.account.name || 'Community',
        authorRole: post.authorRole || access.account.role || 'Member',
        authorEmail: access.account.email,
        authorLogoUrl: normalizeLogoUrl(access.account.logoUrl || access.account.avatarUrl),
        accentColor: normalizeAccentColor(post.accentColor || access.account.bulletinColor),
        language: post.language || 'en',
        subject: post.subject || 'Board update',
        body: post.body,
        likedBy: [],
        replies: [],
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

    if (action === 'reply') {
      const id = String(body.id || body.postId || '').trim();
      const replyBody = cleanString(body.body || body.reply?.body, 800);
      if (!id || !replyBody) return json({ ok: false, error: 'Post id and reply are required.' }, 400);
      const idx = posts.findIndex((item) => item.id === id);
      if (idx === -1) return json({ ok: false, error: 'Post not found.' }, 404);
      const reply = {
        id: crypto.randomUUID(),
        authorUserId: access.account.userId,
        authorName: access.account.name || 'Community member',
        authorRole: access.account.role || 'Member',
        authorLogoUrl: normalizeLogoUrl(access.account.logoUrl || access.account.avatarUrl),
        accentColor: normalizeAccentColor(body.accentColor || access.account.bulletinColor),
        body: replyBody,
        language: cleanString(body.language, 10).toLowerCase() || 'en',
        createdAt: new Date().toISOString(),
      };
      posts[idx].replies = [...(Array.isArray(posts[idx].replies) ? posts[idx].replies : []), reply].slice(-50);
      posts[idx].updatedAt = new Date().toISOString();
      await writeBoard(env, { posts: posts.slice(0, 40) });
      return json({ ok: true, reply, post: posts[idx], posts: posts.slice(0, 40) });
    }

    if (action === 'react') {
      const id = String(body.id || body.postId || '').trim();
      if (!id) return json({ ok: false, error: 'Post id is required.' }, 400);
      const idx = posts.findIndex((item) => item.id === id);
      if (idx === -1) return json({ ok: false, error: 'Post not found.' }, 404);
      const likedBy = new Set(Array.isArray(posts[idx].likedBy) ? posts[idx].likedBy : []);
      if (likedBy.has(access.account.userId)) likedBy.delete(access.account.userId);
      else likedBy.add(access.account.userId);
      posts[idx].likedBy = [...likedBy].slice(-500);
      posts[idx].updatedAt = new Date().toISOString();
      await writeBoard(env, { posts: posts.slice(0, 40) });
      return json({ ok: true, post: posts[idx], posts: posts.slice(0, 40) });
    }

    if (action === 'delete') {
      const id = String(body.id || '').trim();
      if (!id) return json({ ok: false, error: 'Post id is required.' }, 400);
      const target = posts.find((item) => item.id === id);
      const isOwner = target?.authorUserId && target.authorUserId === access.account.userId;
      const isAdmin = /admin/i.test(String(access.account.role || ''));
      if (!target || (!isOwner && !isAdmin)) {
        return json({ ok: false, error: 'Only the post owner or an administrator can delete this post.' }, 403);
      }
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
    accentColor: normalizeAccentColor(input.accentColor),
  };
}

export function normalizeAccentColor(value) {
  const color = String(value || '').trim().toLowerCase();
  return ['#1d4ed8', '#0f766e', '#7c3aed', '#b42318', '#9a6700', '#334155'].includes(color)
    ? color
    : '#1d4ed8';
}

export function normalizeLogoUrl(value) {
  const raw = cleanString(value, 280);
  if (!raw) return '';
  try {
    const parsed = new URL(raw);
    return ['https:', 'http:'].includes(parsed.protocol) ? parsed.toString() : '';
  } catch {
    return '';
  }
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
