import {
  cleanString,
  carrierLoadBookingDecision,
  carrierLoadBookingPayload,
  emailVerified,
  ensureAccountShape,
  isEntitled,
  normalizeCommunicationPrivacy,
  publicProfile,
  readAccountByUserId,
  requireEntitledAccount,
  upsertAccount,
} from './_auth.js';

const HUB_KEY = 'communication:hub';
const DEFAULT_CHANNELS = [
  { id: 'general-trucking', title: 'General Trucking', description: 'General trucking talk and verified updates.', topic: 'topic', equipmentTypes: ['all'], locations: ['all'], languages: ['all'], roles: ['all'] },
  { id: 'available-trucks', title: 'Available Trucks', description: 'Post available trucks and open capacity.', topic: 'equipment', equipmentTypes: ['box truck', 'dry van', 'reefer', 'flatbed', 'hot shot'], locations: ['all'], languages: ['all'], roles: ['driver', 'carrier', 'owner-operator'] },
  { id: 'available-loads', title: 'Available Loads', description: 'Verified freight opportunities and coverage requests.', topic: 'topic', equipmentTypes: ['all'], locations: ['all'], languages: ['all'], roles: ['broker', 'shipper', 'dispatcher'] },
  { id: 'dry-van', title: 'Dry Van', description: 'Dry van freight, load matching, and tips.', topic: 'equipment', equipmentTypes: ['dry van'], locations: ['all'], languages: ['all'], roles: ['driver', 'carrier', 'broker'] },
  { id: 'reefer', title: 'Reefer', description: 'Temperature-controlled freight and equipment help.', topic: 'equipment', equipmentTypes: ['reefer'], locations: ['all'], languages: ['all'], roles: ['driver', 'carrier', 'broker'] },
  { id: 'flatbed', title: 'Flatbed', description: 'Flatbed, step deck, securement, and oversize notes.', topic: 'equipment', equipmentTypes: ['flatbed', 'step deck', 'conestoga'], locations: ['all'], languages: ['all'], roles: ['driver', 'carrier', 'broker'] },
  { id: 'hot-shot', title: 'Hot Shot', description: 'Hot shot freight, urgent runs, and light equipment.', topic: 'equipment', equipmentTypes: ['hot shot', 'power only'], locations: ['all'], languages: ['all'], roles: ['driver', 'carrier', 'broker'] },
  { id: 'box-trucks', title: 'Box Trucks', description: 'Box truck loads, liftgates, and local freight.', topic: 'equipment', equipmentTypes: ['box truck', 'liftgate', 'ramp'], locations: ['all'], languages: ['all'], roles: ['driver', 'carrier', 'broker'] },
  { id: 'owner-operators', title: 'Owner-Operators', description: 'Independent truckers sharing work and advice.', topic: 'role', equipmentTypes: ['all'], locations: ['all'], languages: ['all'], roles: ['owner-operator', 'driver', 'carrier'] },
  { id: 'new-authorities', title: 'New Authorities', description: 'Help for new authorities, setup, and first loads.', topic: 'role', equipmentTypes: ['all'], locations: ['all'], languages: ['all'], roles: ['new authority', 'driver', 'carrier'] },
  { id: 'mechanics', title: 'Mechanics', description: 'Repair tips, service recommendations, and maintenance.', topic: 'topic', equipmentTypes: ['all'], locations: ['all'], languages: ['all'], roles: ['driver', 'carrier', 'mechanic'] },
  { id: 'fuel-prices', title: 'Fuel Prices', description: 'Fuel pricing updates and route cost talk.', topic: 'topic', equipmentTypes: ['all'], locations: ['all'], languages: ['all'], roles: ['all'] },
  { id: 'road-conditions', title: 'Road Conditions', description: 'Weather, closures, detours, and road reports.', topic: 'location', equipmentTypes: ['all'], locations: ['all'], languages: ['all'], roles: ['all'] },
  { id: 'parking', title: 'Parking', description: 'Truck parking availability and safe stops.', topic: 'location', equipmentTypes: ['all'], locations: ['all'], languages: ['all'], roles: ['all'] },
  { id: 'safety', title: 'Safety', description: 'Safety tips, incidents, and best practices.', topic: 'topic', equipmentTypes: ['all'], locations: ['all'], languages: ['all'], roles: ['all'] },
  { id: 'jobs', title: 'Jobs', description: 'Jobs, dispatch help, and hiring opportunities.', topic: 'topic', equipmentTypes: ['all'], locations: ['all'], languages: ['all'], roles: ['all'] },
  { id: 'equipment-for-sale', title: 'Equipment for Sale', description: 'Buy and sell trucks, trailers, and gear.', topic: 'topic', equipmentTypes: ['all'], locations: ['all'], languages: ['all'], roles: ['all'] },
  { id: 'california-truckers', title: 'California Truckers', description: 'California local lanes, ports, and regional work.', topic: 'location', equipmentTypes: ['all'], locations: ['California'], languages: ['all'], roles: ['all'] },
  { id: 'texas-truckers', title: 'Texas Truckers', description: 'Texas freight, lanes, and regional advice.', topic: 'location', equipmentTypes: ['all'], locations: ['Texas'], languages: ['all'], roles: ['all'] },
  { id: 'spanish-speaking-truckers', title: 'Spanish-Speaking Truckers', description: 'Español-friendly conversation and support.', topic: 'language', equipmentTypes: ['all'], locations: ['all'], languages: ['es', 'Spanish'], roles: ['all'] },
];

export async function onRequestGet(context) {
  try {
    const access = await requireEntitledAccount(context.request, context.env);
    if (!access.ok) return json({ ok: false, error: access.error }, access.status || 401);

    const account = ensureAccountShape(access.account);
    const url = new URL(context.request.url);
    const q = cleanString(url.searchParams.get('q') || '', 120).toLowerCase();
    const threadId = cleanString(url.searchParams.get('threadId') || '', 120);

    const hub = await readHub(context.env);
    const visibleThreads = await Promise.all(hub.threads.filter((thread) => threadVisible(thread, account)).map((thread) => hydrateThreadForAccount(context.env, thread, account)));
    const activeThread = threadId ? visibleThreads.find((thread) => thread.id === threadId) || null : visibleThreads[0] || null;
    const notifications = visibleNotifications(account);

    return json({
      ok: true,
      profile: publicProfile(account),
      communicationPrivacy: normalizeCommunicationPrivacy(account.communicationPrivacy || {}),
      memberAccess: {
        emailVerified: emailVerified(account),
        entitled: isEntitled(account),
        subscriptionStatus: account.subscriptionStatus || 'unpaid',
        carrierLoadBookingAccess: carrierLoadBookingPayload(account),
      },
      hub: {
        updatedAt: hub.updatedAt || '',
        seedChannels: DEFAULT_CHANNELS,
        threads: visibleThreads,
        activeThread,
        notifications,
      },
      contacts: q ? await searchContacts(context.env, account, q) : [],
      mentionSuggestions: q ? await searchContacts(context.env, account, q) : [],
    });
  } catch {
    return json({ ok: false, error: 'Communication hub lookup failed.' }, 500);
  }
}

export async function onRequestPost(context) {
  try {
    const access = await requireEntitledAccount(context.request, context.env);
    if (!access.ok) return json({ ok: false, error: access.error }, access.status || 401);

    const account = ensureAccountShape(access.account);
    const body = await context.request.json().catch(() => ({}));
    const action = cleanString(body.action || 'send', 24).toLowerCase();
    const hub = await readHub(context.env);

    if (action === 'send') {
      const result = await sendMessage(context.env, hub, account, body);
      if (result.error) return json({ ok: false, error: result.error }, 400);
      await saveHub(context.env, hub);
      return json({ ok: true, thread: result.thread, message: result.message, notifications: result.notifications || [] });
    }

    if (action === 'ensure-load-thread') {
      const bookingDecision = carrierLoadBookingDecision(account);
      if (!bookingDecision.allowed) {
        return json({ ok: false, error: bookingDecision.message || 'Load booking is available only to verified carrier accounts with an active $29.99-or-higher subscription.' }, 403);
      }
      const thread = ensureLoadThread(hub, account, body);
      await saveHub(context.env, hub);
      return json({ ok: true, thread });
    }

    if (action === 'load-event') {
      const thread = findVisibleThread(hub.threads, account, body.threadId || body.id || '');
      if (!thread || thread.type !== 'load') return json({ ok: false, error: 'Load conversation not found.' }, 404);
      const bookingDecision = carrierLoadBookingDecision(account);
      if (!bookingDecision.allowed) {
        return json({ ok: false, error: bookingDecision.message || 'Load booking is available only to verified carrier accounts with an active $29.99-or-higher subscription.' }, 403);
      }
      const event = appendThreadEvent(thread, account, {
        kind: cleanString(body.kind || 'status', 24),
        label: cleanString(body.label || body.status || 'Update', 120),
        note: cleanString(body.note || '', 400),
        status: cleanString(body.status || '', 80),
        location: normalizeLocation(body.location || body.checkIn || body.checkInLocation),
        document: normalizeAttachments(body.document || body.documents),
        photos: normalizeAttachments(body.photos || []),
        pod: normalizeAttachments(body.pod || body.proofOfDelivery || []),
        timestamp: isoNow(),
      });
      thread.loadStatus = event.status || thread.loadStatus || '';
      thread.loadActivity = Array.isArray(thread.loadActivity) ? thread.loadActivity : [];
      thread.loadActivity.unshift(event);
      thread.auditTrail = Array.isArray(thread.auditTrail) ? thread.auditTrail : [];
      thread.auditTrail.unshift(event);
      if (String(body.startDispute || '').toLowerCase() === 'true' || /problem|dispute/i.test(event.kind + ' ' + event.label)) {
        thread.disputeStartedAt = thread.disputeStartedAt || event.timestamp;
        thread.auditTrail.unshift({ id: `audit_${crypto.randomUUID().replace(/-/g, '')}`, kind: 'dispute-started', label: 'Dispute started', actorUserId: account.userId, actorName: account.name || 'Member', createdAt: event.timestamp, immutable: true });
      }
      thread.updatedAt = isoNow();
      thread.lastMessageAt = thread.updatedAt;
      thread.lastMessage = `${event.label}${event.note ? ` · ${event.note}` : ''}`;
      await saveHub(context.env, hub);
      return json({ ok: true, thread, event });
    }

    if (action === 'company-admin') {
      const thread = findVisibleThread(hub.threads, account, body.threadId || body.id || '');
      if (!thread || thread.type !== 'company') return json({ ok: false, error: 'Company workspace not found.' }, 404);
      if (!isCompanyAdmin(thread, account)) return json({ ok: false, error: 'Admin access required.' }, 403);
      const result = updateCompanyWorkspace(thread, account, body);
      thread.updatedAt = isoNow();
      thread.auditTrail = Array.isArray(thread.auditTrail) ? thread.auditTrail : [];
      thread.auditTrail.unshift({ id: `audit_${crypto.randomUUID().replace(/-/g, '')}`, kind: 'company-admin', label: cleanString(body.label || body.action || 'Company admin action', 120), actorUserId: account.userId, actorName: account.name || 'Member', createdAt: thread.updatedAt, details: cleanString(body.details || '', 400), immutable: true });
      await saveHub(context.env, hub);
      return json({ ok: true, thread, workspace: thread.companyWorkspace, result });
    }

    if (action === 'follow-channel' || action === 'leave-channel') {
      const thread = findVisibleThread(hub.threads, account, body.threadId || body.id || '');
      if (!thread || thread.type !== 'channel') return json({ ok: false, error: 'Community channel not found.' }, 404);
      thread.followersByUserId = thread.followersByUserId && typeof thread.followersByUserId === 'object' ? thread.followersByUserId : {};
      thread.members = Array.isArray(thread.members) ? thread.members : [];
      if (action === 'follow-channel') {
        thread.followersByUserId[account.userId] = isoNow();
        if (!thread.members.includes(account.userId)) thread.members.unshift(account.userId);
      } else {
        delete thread.followersByUserId[account.userId];
        thread.members = thread.members.filter((id) => id !== account.userId);
      }
      thread.updatedAt = isoNow();
      thread.auditTrail = Array.isArray(thread.auditTrail) ? thread.auditTrail : [];
      thread.auditTrail.unshift({ id: `audit_${crypto.randomUUID().replace(/-/g, '')}`, kind: action, label: action === 'follow-channel' ? 'Follow channel' : 'Leave channel', actorUserId: account.userId, actorName: account.name || 'Member', createdAt: thread.updatedAt, immutable: true });
      await saveHub(context.env, hub);
      return json({ ok: true, thread });
    }

    if (action === 'archive' || action === 'restore' || action === 'read') {
      const thread = findVisibleThread(hub.threads, account, body.threadId || body.id || '');
      if (!thread) return json({ ok: false, error: 'Conversation not found.' }, 404);
      thread.updatedAt = isoNow();
      thread.lastReadAtByUserId = thread.lastReadAtByUserId || {};
      if (action === 'archive') thread.archivedBy = thread.archivedBy || {}, thread.archivedBy[account.userId] = isoNow();
      if (action === 'restore' && thread.archivedBy) delete thread.archivedBy[account.userId];
      if (action === 'read') thread.lastReadAtByUserId[account.userId] = isoNow();
      await saveHub(context.env, hub);
      return json({ ok: true, thread });
    }

    if (action === 'save' || action === 'unsave') {
      const thread = findVisibleThread(hub.threads, account, body.threadId || body.id || '');
      if (!thread) return json({ ok: false, error: 'Conversation not found.' }, 404);
      const message = (thread.messages || []).find((item) => item.id === cleanString(body.messageId || '', 120));
      if (!message) return json({ ok: false, error: 'Message not found.' }, 404);
      message.savedBy = Array.isArray(message.savedBy) ? message.savedBy : [];
      const index = message.savedBy.indexOf(account.userId);
      if (action === 'save' && index === -1) message.savedBy.push(account.userId);
      if (action === 'unsave' && index !== -1) message.savedBy.splice(index, 1);
      message.updatedAt = isoNow();
      thread.updatedAt = isoNow();
      appendThreadEvent(thread, account, { kind: action, label: action === 'save' ? 'Message saved' : 'Message unsaved', note: previewMessage(message), messageId: message.id });
      await saveHub(context.env, hub);
      return json({ ok: true, thread, message });
    }

    if (action === 'react') {
      const thread = findVisibleThread(hub.threads, account, body.threadId || body.id || '');
      if (!thread) return json({ ok: false, error: 'Conversation not found.' }, 404);
      const message = (thread.messages || []).find((item) => item.id === cleanString(body.messageId || '', 120));
      if (!message) return json({ ok: false, error: 'Message not found.' }, 404);
      const emoji = cleanString(body.emoji || '👍', 12);
      message.reactions = Array.isArray(message.reactions) ? message.reactions : [];
      const existing = message.reactions.find((reaction) => reaction.emoji === emoji && reaction.userId === account.userId);
      if (existing) {
        message.reactions = message.reactions.filter((reaction) => !(reaction.emoji === emoji && reaction.userId === account.userId));
      } else {
        message.reactions.push({ emoji, userId: account.userId, userName: account.name || 'Member', createdAt: isoNow() });
      }
      message.updatedAt = isoNow();
      thread.updatedAt = isoNow();
      appendThreadEvent(thread, account, { kind: 'reaction', label: `Reaction ${emoji}`, note: previewMessage(message), messageId: message.id, emoji });
      await saveHub(context.env, hub);
      return json({ ok: true, thread, message });
    }

    if (action === 'translate') {
      const thread = findVisibleThread(hub.threads, account, body.threadId || body.id || '');
      if (!thread) return json({ ok: false, error: 'Conversation not found.' }, 404);
      const message = (thread.messages || []).find((item) => item.id === cleanString(body.messageId || '', 120));
      if (!message) return json({ ok: false, error: 'Message not found.' }, 404);
      const language = cleanString(body.language || 'en', 10).toLowerCase();
      message.translations = message.translations || {};
      message.translations[language] = cleanString(body.translation || '', 4000);
      message.updatedAt = isoNow();
      thread.updatedAt = isoNow();
      appendThreadEvent(thread, account, { kind: 'translate', label: `Translated to ${language.toUpperCase()}`, note: previewMessage(message), messageId: message.id, language });
      await saveHub(context.env, hub);
      return json({ ok: true, thread, message });
    }

    if (action === 'privacy') {
      const nextPrivacy = normalizeCommunicationPrivacy(body.communicationPrivacy || body.privacy || body);
      const updated = ensureAccountShape({ ...account, communicationPrivacy: nextPrivacy, updatedAt: isoNow() }, account);
      const saved = await upsertAccount(context.env, updated);
      return json({ ok: true, communicationPrivacy: normalizeCommunicationPrivacy(saved.communicationPrivacy || {}) });
    }

    return json({ ok: false, error: 'Unsupported communication action.' }, 400);
  } catch {
    return json({ ok: false, error: 'Communication update failed.' }, 500);
  }
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

async function sendMessage(env, hub, account, body) {
  const now = isoNow();
  const type = normalizeType(body.type || body.threadType || 'dm');
  if (type === 'channel') {
    const violation = communityPostViolation(body);
    if (violation) return { error: violation };
  }
  if (type === 'load') {
    const bookingDecision = carrierLoadBookingDecision(account);
    const bookingText = [body.kind, body.label, body.status, body.note, body.action, body.body, body.message].join(' ');
    if (/\b(accept|accepted|assign|assigned|book|booked|reserve|reserved|claim|claimed|pickup|picked up|deliv|dispatch|cover|covered)\b/i.test(bookingText) && !bookingDecision.allowed) {
      return { error: bookingDecision.message || 'Load booking is available only to verified carrier accounts with an active $29.99-or-higher subscription.' };
    }
  }
  const threadId = cleanString(body.threadId || body.id || makeThreadId(type, body), 120);
  const text = cleanString(body.body || body.message || '', 4000);
  if (!text && !(Array.isArray(body.attachments) && body.attachments.length)) return { thread: null, message: null, notifications: [] };

  let thread = hub.threads.find((item) => item.id === threadId);
  if (!thread) {
    thread = createThread(account, threadId, type, body);
    hub.threads.unshift(thread);
  }

  thread.members = uniqueStrings([...(thread.members || []), account.userId, ...normalizeMembers(body.members), ...normalizeMembers(body.participants)]);
  thread.public = Boolean(body.public || thread.public || type === 'channel');
  thread.title = cleanString(body.title || thread.title || fallbackThreadTitle(thread, account), 140);
  thread.description = cleanString(body.description || thread.description || '', 240);
  thread.loadId = cleanString(body.loadId || thread.loadId || '', 120);
  thread.company = cleanString(body.company || thread.company || account.company || '', 160);
  thread.channel = cleanString(body.channel || thread.channel || '', 80);
  thread.approvedParticipantIds = uniqueStrings([...(thread.approvedParticipantIds || []), ...normalizeMembers(body.approvedParticipantIds)]);
  thread.approvedParticipantRoles = uniqueStrings([...(thread.approvedParticipantRoles || []), ...normalizeMembers(body.approvedParticipantRoles)]);
  thread.updatedAt = now;
  thread.lastMessageAt = now;
  thread.lastMessage = text || attachmentSummary(body.attachments) || 'Shared content';
  thread.lastSender = account.name || 'You';
  thread.lastReadAtByUserId = thread.lastReadAtByUserId || {};
  thread.archivedBy = thread.archivedBy || {};
  thread.messages = Array.isArray(thread.messages) ? thread.messages : [];
  thread.auditTrail = Array.isArray(thread.auditTrail) ? thread.auditTrail : [];

  const mentions = await resolveMentions(env, account, thread, text, body);
  const attachments = normalizeAttachments(body.attachments);
  const location = normalizeLocation(body.location || body.shareLocation || body.locationText);
  const contactCard = normalizeContactCard(body.contactCard || body.shareContactCard);
  const loadShare = normalizeLoadShare(body.loadShare || body.shareLoad);
  const replyToMessageId = cleanString(body.replyToMessageId || body.replyTo || '', 120);
  const replyToMessage = replyToMessageId ? thread.messages.find((msg) => msg.id === replyToMessageId) || null : null;

  const message = {
    id: `msg_${crypto.randomUUID().replace(/-/g, '')}`,
    senderUserId: account.userId,
    senderName: account.name || 'You',
    senderCompany: account.company || '',
    senderRole: account.role || 'Member',
    body: text,
    language: cleanString(body.language || account.preferredLanguage || 'en', 10).toLowerCase() || 'en',
    tags: Array.isArray(body.tags) ? body.tags.slice(0, 8).map((item) => cleanString(item, 40)).filter(Boolean) : [],
    mentions: mentions.map((item) => ({ userId: item.userId, handle: item.handle, name: item.name, company: item.company, role: item.role })),
    createdAt: now,
    updatedAt: now,
    translations: {},
    savedBy: [],
    flags: [],
    attachments,
    location,
    contactCard,
    loadShare,
    replyToMessageId,
    replyToPreview: replyToMessage ? previewMessage(replyToMessage) : '',
    reactions: [],
    timestampedAt: now,
  };

  thread.messages.push(message);
  thread.lastMessage = text || attachmentSummary(attachments) || 'Shared content';

  if (thread.type === 'load' || thread.type === 'company') {
    appendThreadEvent(thread, account, {
      kind: 'message',
      label: thread.type === 'load' ? 'Load message' : 'Company message',
      note: previewMessage(message),
      messageId: message.id,
      timestamp: now,
    });
  }

  if (thread.type === 'load') {
    thread.loadActivity = Array.isArray(thread.loadActivity) ? thread.loadActivity : [];
    if (body.status || body.checkIn || body.checkOut) {
      const bookingDecision = carrierLoadBookingDecision(account);
      const bookingText = [body.kind, body.label, body.status, body.note].join(' ');
      if (/\b(accept|accepted|assign|assigned|book|booked|reserve|reserved|claim|claimed|pickup|picked up|deliv|dispatch|cover|covered)\b/i.test(bookingText) && !bookingDecision.allowed) {
        return { thread, message: null, notifications: [], error: bookingDecision.message || 'Load booking is available only to verified carrier accounts with an active $29.99-or-higher subscription.' };
      }
      thread.loadActivity.unshift({
        id: `event_${crypto.randomUUID().replace(/-/g, '')}`,
        kind: 'status',
        label: cleanString(body.status || 'Status update', 120),
        note: cleanString(body.note || '', 400),
        status: cleanString(body.status || '', 80),
        location: normalizeLocation(body.checkIn || body.checkOut || body.location),
        actorUserId: account.userId,
        actorName: account.name || 'Member',
        createdAt: now,
      });
    }
  }

  if (thread.type === 'company') {
    ensureCompanyWorkspace(thread, account, body);
  }

  const recipients = await collectRecipients(env, account, thread, mentions);
  const notifications = await sendNotifications(env, recipients, account, thread, message, body);
  return { thread, message, notifications };
}

function communityPostViolation(body = {}) {
  const text = [body.body, body.message, body.title, body.description, body.note, body.transcript].filter(Boolean).join(' ');
  const lowered = text.toLowerCase();
  if (body.contactCard || body.loadShare) return 'Community channels cannot share private load or contact details.';
  if (/(password|passcode|pin|routing|account number|bank|wire|cvv|ssn|social security|credit card|card number)/i.test(lowered)) return 'Community posts cannot include passwords, banking information, or card details.';
  if (/\d{3}[\s.-]?\d{3}[\s.-]?\d{4}/.test(lowered) || /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(lowered)) return 'Community posts cannot expose personal contact information.';
  if (/(load\s*#|bol|po\s*number|pickup\s*address|delivery\s*address|appointment\s*time)/i.test(lowered) && /(private|confidential|customer|broker|shipper)/i.test(lowered)) return 'Community posts cannot expose private load or customer information.';
  return '';
}

function ensureLoadThread(hub, account, body) {
  const loadId = cleanString(body.loadId || body.id || '', 120);
  const origin = cleanString(body.origin || '', 80);
  const destination = cleanString(body.destination || '', 80);
  const equipment = cleanString(body.equipment || body.loadEquipment || '', 120);
  const title = cleanString(body.title || [origin, destination].filter(Boolean).join(' → ') || 'Load conversation', 140);
  const threadId = cleanString(body.threadId || makeThreadId('load', { loadId, title, origin, destination }), 120);
  let thread = hub.threads.find((item) => item.id === threadId);
  const participants = uniqueStrings([account.userId, ...normalizeMembers(body.participants), ...normalizeMembers(body.approvedParticipantIds)]);
  const approvedRoles = uniqueStrings(normalizeMembers(body.approvedParticipantRoles || body.roles));
  const now = isoNow();
  if (!thread) {
    thread = {
      id: threadId,
      type: 'load',
      title,
      description: cleanString(body.description || body.details || '', 240),
      public: false,
      members: participants,
      approvedParticipantIds: participants.slice(),
      approvedParticipantRoles: approvedRoles,
      company: cleanString(body.company || account.company || '', 160),
      loadId,
      origin,
      destination,
      scheduledPickupTime: cleanString(body.scheduledPickupTime || body.pickupTime || '', 80),
      scheduledDeliveryTime: cleanString(body.scheduledDeliveryTime || body.deliveryTime || '', 80),
      assignedDriver: cleanString(body.assignedDriver || '', 120),
      assignedCarrier: cleanString(body.assignedCarrier || body.company || account.company || '', 160),
      currentStatus: cleanString(body.currentStatus || 'Booked', 80),
      contactSummary: normalizeContactSummary(body.contactSummary || body.contacts || {}),
      documents: normalizeAttachments(body.documents || []),
      photos: normalizeAttachments(body.photos || []),
      proofOfDelivery: normalizeAttachments(body.proofOfDelivery || body.pod || []),
      checkIns: Array.isArray(body.checkIns) ? body.checkIns : [],
      statusUpdates: Array.isArray(body.statusUpdates) ? body.statusUpdates : [],
      auditTrail: [],
      loadActivity: [],
      channel: '',
      createdBy: account.userId,
      createdAt: now,
      updatedAt: now,
      lastMessageAt: now,
      lastMessage: '',
      lastSender: '',
      messages: [],
      archivedBy: {},
      lastReadAtByUserId: {},
    };
    hub.threads.unshift(thread);
    return thread;
  }

  thread.type = 'load';
  thread.public = false;
  thread.title = title || thread.title || 'Load conversation';
  thread.description = cleanString(body.description || body.details || thread.description || '', 240);
  thread.members = uniqueStrings([...(thread.members || []), ...participants]);
  thread.approvedParticipantIds = uniqueStrings([...(thread.approvedParticipantIds || []), ...participants]);
  thread.approvedParticipantRoles = uniqueStrings([...(thread.approvedParticipantRoles || []), ...approvedRoles]);
  thread.company = cleanString(body.company || thread.company || account.company || '', 160);
  thread.loadId = loadId || thread.loadId || '';
  thread.origin = origin || thread.origin || '';
  thread.destination = destination || thread.destination || '';
  thread.scheduledPickupTime = cleanString(body.scheduledPickupTime || body.pickupTime || thread.scheduledPickupTime || '', 80);
  thread.scheduledDeliveryTime = cleanString(body.scheduledDeliveryTime || body.deliveryTime || thread.scheduledDeliveryTime || '', 80);
  thread.assignedDriver = cleanString(body.assignedDriver || thread.assignedDriver || '', 120);
  thread.assignedCarrier = cleanString(body.assignedCarrier || thread.assignedCarrier || thread.company || account.company || '', 160);
  thread.currentStatus = cleanString(body.currentStatus || thread.currentStatus || 'Booked', 80);
  thread.contactSummary = normalizeContactSummary(body.contactSummary || body.contacts || thread.contactSummary || {});
  thread.documents = normalizeAttachments(body.documents || thread.documents || []);
  thread.photos = normalizeAttachments(body.photos || thread.photos || []);
  thread.proofOfDelivery = normalizeAttachments(body.proofOfDelivery || body.pod || thread.proofOfDelivery || []);
  thread.checkIns = Array.isArray(body.checkIns) ? body.checkIns : Array.isArray(thread.checkIns) ? thread.checkIns : [];
  thread.statusUpdates = Array.isArray(body.statusUpdates) ? body.statusUpdates : Array.isArray(thread.statusUpdates) ? thread.statusUpdates : [];
  thread.updatedAt = now;
  return thread;
}

function normalizeContactSummary(value) {
  if (!value || typeof value !== 'object') return { email: '', phone: '', notes: '' };
  return {
    email: cleanString(value.email || '', 120),
    phone: cleanString(value.phone || '', 40),
    notes: cleanString(value.notes || '', 240),
  };
}

function appendThreadEvent(thread, account, event) {
  const record = {
    id: `audit_${crypto.randomUUID().replace(/-/g, '')}`,
    threadId: thread.id,
    threadType: thread.type,
    actorUserId: account.userId,
    actorName: account.name || 'Member',
    createdAt: event.timestamp || isoNow(),
    kind: cleanString(event.kind || 'event', 24),
    label: cleanString(event.label || 'Event', 120),
    note: cleanString(event.note || '', 400),
    status: cleanString(event.status || '', 80),
    messageId: cleanString(event.messageId || '', 120),
    emoji: cleanString(event.emoji || '', 12),
    location: event.location || null,
    immutable: true,
  };
  thread.auditTrail = Array.isArray(thread.auditTrail) ? thread.auditTrail : [];
  thread.auditTrail.unshift(record);
  return record;
}

function isCompanyAdmin(thread, account) {
  const workspace = thread.companyWorkspace || {};
  const companyMatch = normalizeToken(account.company || '') && normalizeToken(thread.company || '') && normalizeToken(account.company || '') === normalizeToken(thread.company || '');
  const adminIds = Array.isArray(workspace.adminIds) ? workspace.adminIds : [];
  return companyMatch && (adminIds.includes(account.userId) || normalizeToken(account.role).includes('admin') || normalizeToken(account.role).includes('owner') || thread.createdBy === account.userId);
}

function ensureCompanyWorkspace(thread, account, body = {}) {
  const now = isoNow();
  const company = cleanString(thread.company || account.company || body.company || '', 160);
  thread.company = company;
  thread.companyWorkspace = thread.companyWorkspace || {
    companyName: company,
    companySlug: normalizeToken(company || thread.id),
    adminIds: [thread.createdBy || account.userId],
    memberIds: uniqueStrings([account.userId, ...(thread.members || [])]),
    rolesByUserId: { [thread.createdBy || account.userId]: 'admin' },
    channels: companyChannels(),
    postingPolicy: { whoCanPost: 'admins_and_staff', privateByDefault: true },
    pinnedMessageIds: [],
    moderationLog: [],
    activityLog: [],
    createdAt: now,
    updatedAt: now,
  };
  thread.companyWorkspace.companyName = company;
  thread.companyWorkspace.memberIds = uniqueStrings([...(thread.companyWorkspace.memberIds || []), account.userId, ...(thread.members || [])]);
  thread.companyWorkspace.adminIds = uniqueStrings([...(thread.companyWorkspace.adminIds || []), thread.createdBy || account.userId]);
  thread.companyWorkspace.channels = normalizeCompanyChannels(body.channels || thread.companyWorkspace.channels || companyChannels());
  thread.companyWorkspace.updatedAt = now;
  return thread.companyWorkspace;
}

function companyChannels() {
  const now = isoNow();
  return [
    { id: 'general', title: 'General', private: false, canPost: 'members', createdAt: now },
    { id: 'dispatch', title: 'Dispatch', private: true, canPost: 'dispatch', createdAt: now },
    { id: 'drivers', title: 'Drivers', private: true, canPost: 'drivers', createdAt: now },
    { id: 'accounting', title: 'Accounting', private: true, canPost: 'admins', createdAt: now },
    { id: 'safety', title: 'Safety', private: true, canPost: 'admins', createdAt: now },
    { id: 'maintenance', title: 'Maintenance', private: true, canPost: 'admins', createdAt: now },
    { id: 'available-loads', title: 'Available Loads', private: false, canPost: 'dispatch', createdAt: now },
    { id: 'human-resources', title: 'Human Resources', private: true, canPost: 'admins', createdAt: now },
    { id: 'announcements', title: 'Announcements', private: false, canPost: 'admins', createdAt: now, pinnedMessageIds: [] },
  ];
}

function normalizeCompanyChannels(channels) {
  const items = Array.isArray(channels) ? channels : [];
  return items.map((channel) => ({
    id: cleanString(channel.id || channel.title || '', 80).toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    title: cleanString(channel.title || 'Channel', 80),
    private: Boolean(channel.private),
    canPost: cleanString(channel.canPost || 'members', 40),
    pinnedMessageIds: Array.isArray(channel.pinnedMessageIds) ? channel.pinnedMessageIds.map((id) => cleanString(id, 120)).filter(Boolean) : [],
    createdAt: cleanString(channel.createdAt || isoNow(), 80),
  }));
}

async function hydrateThreadForAccount(env, thread, account) {
  const next = JSON.parse(JSON.stringify(thread));
  if (next.type === 'load') {
    next.memberDirectory = await hydrateThreadDirectory(env, thread, account);
  }
  if (next.type === 'company') {
    next.companyWorkspace = ensureCompanyWorkspace(next, account);
    next.memberDirectory = await hydrateThreadDirectory(env, thread, account);
  }
  return next;
}

async function hydrateThreadDirectory(env, thread, account) {
  const ids = uniqueStrings([...(thread.members || []), ...(thread.approvedParticipantIds || [])]);
  const list = [];
  for (const userId of ids.slice(0, 24)) {
    const summary = await hydrateMemberSummary(env, account, userId);
    if (summary) list.push(summary);
  }
  return list;
}

async function hydrateMemberSummary(env, viewer, userId) {
  if (!userId) return null;
  const raw = await readAccountByUserId(env, userId);
  if (!raw) return { userId, name: 'Member', company: '', role: '', city: '', state: '', handle: '', email: '', phone: '', visible: false };
  const peer = ensureAccountShape(raw);
  const profile = publicProfile(peer);
  const privacy = normalizeCommunicationPrivacy(peer.communicationPrivacy || {});
  const allowed = userId === viewer.userId || normalizeToken(peer.company || '') === normalizeToken(viewer.company || '');
  return {
    userId,
    name: profile.name || peer.name || 'Member',
    company: profile.company || peer.company || '',
    role: profile.role || peer.role || '',
    city: profile.city || peer.city || '',
    state: profile.state || peer.state || '',
    handle: `@${cleanHandle(profile.username || peer.username || peer.name || peer.company || userId)}`,
    avatarUrl: profile.avatarUrl || peer.avatarUrl || '',
    logoUrl: profile.logoUrl || peer.logoUrl || '',
    verificationBadge: profile.verification || peer.verification || 'Verified member',
    email: privacy.emailVisible || allowed ? peer.email || '' : '',
    phone: privacy.phoneVisible || allowed ? peer.phone || '' : '',
    equipmentType: profile.equipmentType || peer.equipmentType || '',
    equipmentTypes: Array.isArray(peer.equipmentTypes) ? peer.equipmentTypes : [],
    communicationPrivacy: privacy,
    visible: true,
  };
}

function updateCompanyWorkspace(thread, account, body = {}) {
  const workspace = ensureCompanyWorkspace(thread, account, body);
  const action = cleanString(body.companyAction || body.actionType || body.subaction || body.action || '', 40).toLowerCase();
  const targetUserId = cleanString(body.targetUserId || body.userId || '', 120);
  const targetChannelId = cleanString(body.channelId || body.targetChannelId || '', 120);
  const note = cleanString(body.note || body.reason || body.details || '', 400);
  workspace.activityLog = Array.isArray(workspace.activityLog) ? workspace.activityLog : [];
  workspace.moderationLog = Array.isArray(workspace.moderationLog) ? workspace.moderationLog : [];
  workspace.pinnedMessageIds = Array.isArray(workspace.pinnedMessageIds) ? workspace.pinnedMessageIds : [];
  workspace.rolesByUserId = workspace.rolesByUserId && typeof workspace.rolesByUserId === 'object' ? workspace.rolesByUserId : {};
  workspace.memberIds = uniqueStrings([...(workspace.memberIds || []), account.userId]);

  if (action === 'invite') {
    if (targetUserId) workspace.memberIds = uniqueStrings([...workspace.memberIds, targetUserId]);
    if (body.role && targetUserId) workspace.rolesByUserId[targetUserId] = cleanString(body.role, 40);
    workspace.activityLog.unshift({ id: `log_${crypto.randomUUID().replace(/-/g, '')}`, kind: 'invite', label: 'Invite approved employee', actorUserId: account.userId, actorName: account.name || 'Member', targetUserId, note, createdAt: isoNow() });
  } else if (action === 'remove') {
    workspace.memberIds = workspace.memberIds.filter((id) => id !== targetUserId);
    delete workspace.rolesByUserId[targetUserId];
    workspace.activityLog.unshift({ id: `log_${crypto.randomUUID().replace(/-/g, '')}`, kind: 'remove', label: 'Remove employee', actorUserId: account.userId, actorName: account.name || 'Member', targetUserId, note, createdAt: isoNow() });
  } else if (action === 'role') {
    if (targetUserId) workspace.rolesByUserId[targetUserId] = cleanString(body.role || 'member', 40);
    workspace.activityLog.unshift({ id: `log_${crypto.randomUUID().replace(/-/g, '')}`, kind: 'role', label: 'Assign role', actorUserId: account.userId, actorName: account.name || 'Member', targetUserId, note: `${targetUserId} → ${body.role || 'member'}`, createdAt: isoNow() });
  } else if (action === 'create-channel') {
    const channel = {
      id: cleanString(body.channelName || body.title || body.channelId || `channel-${crypto.randomUUID().slice(0, 6)}`, 80).toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      title: cleanString(body.channelName || body.title || 'Channel', 80),
      private: Boolean(body.private),
      canPost: cleanString(body.canPost || 'members', 40),
      pinnedMessageIds: [],
      createdAt: isoNow(),
    };
    workspace.channels = normalizeCompanyChannels([...(workspace.channels || []), channel]);
    workspace.activityLog.unshift({ id: `log_${crypto.randomUUID().replace(/-/g, '')}`, kind: 'channel', label: 'Create channel', actorUserId: account.userId, actorName: account.name || 'Member', details: channel.title, createdAt: isoNow() });
  } else if (action === 'toggle-channel') {
    workspace.channels = normalizeCompanyChannels((workspace.channels || []).map((channel) => (channel.id === targetChannelId ? { ...channel, private: body.private === undefined ? channel.private : Boolean(body.private), canPost: cleanString(body.canPost || channel.canPost || 'members', 40) } : channel)));
    workspace.activityLog.unshift({ id: `log_${crypto.randomUUID().replace(/-/g, '')}`, kind: 'channel', label: 'Update channel', actorUserId: account.userId, actorName: account.name || 'Member', targetChannelId, note, createdAt: isoNow() });
  } else if (action === 'pin') {
    if (body.messageId) workspace.pinnedMessageIds = uniqueStrings([...(workspace.pinnedMessageIds || []), cleanString(body.messageId, 120)]);
    workspace.activityLog.unshift({ id: `log_${crypto.randomUUID().replace(/-/g, '')}`, kind: 'pin', label: 'Pin announcement', actorUserId: account.userId, actorName: account.name || 'Member', messageId: cleanString(body.messageId || '', 120), note, createdAt: isoNow() });
  } else if (action === 'moderate') {
    workspace.moderationLog.unshift({ id: `log_${crypto.randomUUID().replace(/-/g, '')}`, kind: 'moderate', label: 'Moderation action', actorUserId: account.userId, actorName: account.name || 'Member', targetUserId, note, createdAt: isoNow() });
  } else if (action === 'post-policy') {
    workspace.postingPolicy = { whoCanPost: cleanString(body.whoCanPost || workspace.postingPolicy?.whoCanPost || 'admins_and_staff', 40), privateByDefault: Boolean(body.privateByDefault ?? workspace.postingPolicy?.privateByDefault ?? true) };
    workspace.activityLog.unshift({ id: `log_${crypto.randomUUID().replace(/-/g, '')}`, kind: 'policy', label: 'Update posting policy', actorUserId: account.userId, actorName: account.name || 'Member', note, createdAt: isoNow() });
  }

  workspace.updatedAt = isoNow();
  thread.companyWorkspace = workspace;
  return { action, workspace };
}

async function collectRecipients(env, account, thread, mentions) {
  const ids = new Set();
  for (const mention of mentions) {
    if (mention?.userId && mention.userId !== account.userId) ids.add(mention.userId);
  }

  if (thread.type === 'dm') {
    for (const memberId of thread.members || []) {
      if (memberId !== account.userId) ids.add(memberId);
    }
  } else if (thread.type === 'load') {
    for (const memberId of thread.members || []) {
      if (memberId !== account.userId) ids.add(memberId);
    }
  } else if (thread.type === 'company') {
    for (const memberId of thread.members || []) {
      if (memberId !== account.userId) ids.add(memberId);
    }
  } else if (thread.type === 'channel') {
    for (const memberId of thread.members || []) {
      if (memberId !== account.userId) ids.add(memberId);
    }
  }

  const recipients = [];
  for (const userId of ids) {
    const raw = await readAccountByUserId(env, userId);
    if (!raw) continue;
    const peer = ensureAccountShape(raw);
    if (!emailVerified(peer) || !isEntitled(peer)) continue;
    recipients.push(peer);
  }
  return recipients;
}

async function sendNotifications(env, recipients, sender, thread, message, body) {
  const now = isoNow();
  const out = [];
  for (const recipient of recipients) {
    const privacy = normalizeCommunicationPrivacy(recipient.communicationPrivacy || {});
    const mentionTriggered = Array.isArray(message.mentions) && message.mentions.some((item) => item.userId === recipient.userId);
    const threadTriggered = thread.type === 'dm'
      ? privacy.directMessages
      : thread.type === 'load'
        ? privacy.loadMessages
        : thread.type === 'company'
          ? privacy.companyMessages
          : privacy.channelMessages;
    if (!mentionTriggered && !threadTriggered) continue;

    const notification = {
      id: `note_${crypto.randomUUID().replace(/-/g, '')}`,
      type: mentionTriggered ? 'mention' : 'message',
      threadId: thread.id,
      threadType: thread.type,
      threadTitle: thread.title || 'Conversation',
      messageId: message.id,
      senderUserId: sender.userId,
      senderName: sender.name || 'Member',
      senderCompany: sender.company || '',
      senderRole: sender.role || 'Member',
      body: message.body || attachmentSummary(message.attachments) || 'New message',
      createdAt: now,
      readAt: '',
      channels: {
        inApp: true,
        push: Boolean((mentionTriggered ? privacy.notifications?.push : privacy.notifications?.push) && (mentionTriggered || threadTriggered)),
        email: Boolean(privacy.notifications?.email && recipient.email),
        sms: Boolean(privacy.notifications?.sms && recipient.phone),
      },
      mentionHandles: Array.isArray(message.mentions) ? message.mentions.map((item) => item.handle).filter(Boolean) : [],
      replyToMessageId: message.replyToMessageId || '',
      loadId: thread.loadId || '',
      company: thread.company || '',
    };

    const next = ensureAccountShape({
      ...recipient,
      notifications: [notification, ...(Array.isArray(recipient.notifications) ? recipient.notifications : [])].slice(0, 30),
      updatedAt: now,
    }, recipient);
    await upsertAccount(env, next);
    out.push(notification);
  }
  return out;
}

function visibleNotifications(account) {
  const list = Array.isArray(account.notifications) ? account.notifications : [];
  return list.map((item) => ({
    ...item,
    channels: item.channels || { inApp: true, push: false, email: false, sms: false },
  }));
}

function previewMessage(message) {
  const parts = [cleanString(message.body || '', 120)];
  if (Array.isArray(message.attachments) && message.attachments.length) parts.push(`${message.attachments.length} attachment${message.attachments.length === 1 ? '' : 's'}`);
  if (message.location?.label) parts.push(message.location.label);
  if (message.replyToPreview) parts.push(`Replying to ${message.replyToPreview}`);
  return parts.filter(Boolean).join(' · ');
}

async function searchContacts(env, account, query) {
  const keyPage = await env.RELOCATION_MANAGER_LEADS.list({ prefix: 'user:', limit: 1000 });
  const keys = Array.isArray(keyPage?.keys) ? keyPage.keys : [];
  const results = [];
  for (const key of keys) {
    const name = String(key?.name || '');
    if (!/^user:[^:]/.test(name) || name.startsWith('user:email:')) continue;
    const userId = name.slice(5);
    if (!userId || userId === account.userId) continue;
    const raw = await readAccountByUserId(env, userId);
    if (!raw) continue;
    const peer = ensureAccountShape(raw);
    if (!emailVerified(peer) || !isEntitled(peer)) continue;
    const privacy = normalizeCommunicationPrivacy(peer.communicationPrivacy || {});
    const searchable = [
      peer.name,
      peer.company,
      peer.username,
      peer.role,
      peer.city,
      peer.state,
      peer.equipmentType,
      Array.isArray(peer.equipmentTypes) ? peer.equipmentTypes.join(' ') : '',
      peer.mc_dot,
      peer.userId,
    ].join(' ').toLowerCase();
    if (!searchable.includes(query)) continue;
    results.push({
      userId: peer.userId,
      name: peer.name,
      company: peer.company,
      username: peer.username || peer.userId,
      handle: `@${cleanHandle(peer.username || peer.name || peer.company || peer.userId)}`,
      role: peer.role,
      city: peer.city,
      state: peer.state,
      locationLabel: [peer.city, peer.state].filter(Boolean).join(', '),
      equipmentType: peer.equipmentType || '',
      equipmentTypes: Array.isArray(peer.equipmentTypes) ? peer.equipmentTypes : [],
      mc_dot: peer.mc_dot,
      avatarUrl: peer.avatarUrl || '',
      logoUrl: peer.logoUrl || '',
      verificationBadge: peer.verification || (isEntitled(peer) ? 'Verified member' : 'Member'),
      emailVisible: privacy.emailVisible,
      phoneVisible: privacy.phoneVisible,
      communicationPrivacy: privacy,
    });
    if (results.length >= 20) break;
  }
  return results;
}

async function resolveMentions(env, account, thread, text, body) {
  const rawTokens = new Set();
  const mentionTokens = String(text || '').match(/@([a-z0-9._-]+)/gi) || [];
  mentionTokens.forEach((token) => rawTokens.add(token.slice(1)));
  if (Array.isArray(body.mentions)) body.mentions.forEach((token) => rawTokens.add(cleanString(token, 80).replace(/^@/, '')));
  const candidates = await mentionCandidatePool(env, account, thread);
  const resolved = [];
  for (const token of rawTokens) {
    const normalized = normalizeToken(token);
    if (!normalized) continue;
    const direct = candidates.find((candidate) => candidate.handles.includes(normalized) || candidate.slug === normalized);
    if (direct) {
      resolved.push(direct);
      continue;
    }
    const roleMatch = candidates.find((candidate) => candidate.roles.includes(normalized));
    if (roleMatch) {
      resolved.push(roleMatch);
      continue;
    }
    const groupMatch = candidates.find((candidate) => candidate.groups.includes(normalized));
    if (groupMatch) {
      resolved.push(groupMatch);
      continue;
    }
  }
  return uniqueMentionTargets(resolved);
}

async function mentionCandidatePool(env, account, thread) {
  const keyPage = await env.RELOCATION_MANAGER_LEADS.list({ prefix: 'user:', limit: 1000 });
  const keys = Array.isArray(keyPage?.keys) ? keyPage.keys : [];
  const pool = [];
  for (const key of keys) {
    const name = String(key?.name || '');
    if (!/^user:[^:]/.test(name) || name.startsWith('user:email:')) continue;
    const userId = name.slice(5);
    const raw = await readAccountByUserId(env, userId);
    if (!raw) continue;
    const peer = ensureAccountShape(raw);
    if (!emailVerified(peer) || !isEntitled(peer)) continue;
    pool.push(buildMentionCandidate(peer));
  }

  if (thread?.type === 'channel' && thread.channel) {
    pool.push({
      userId: `channel:${thread.channel}`,
      name: thread.title,
      company: '',
      role: 'Channel group',
      handles: [normalizeToken(thread.channel), normalizeToken(thread.title)],
      slug: normalizeToken(thread.channel),
      roles: ['channel', normalizeToken(thread.channel)],
      groups: [normalizeToken(thread.channel), normalizeToken(thread.title)],
    });
  }

  if (thread?.type === 'load') {
    pool.push({
      userId: `load:${thread.loadId || thread.id}`,
      name: thread.title || 'Load participants',
      company: thread.company || '',
      role: 'Load participants',
      handles: [normalizeToken(thread.loadId), normalizeToken(thread.title)],
      slug: normalizeToken(thread.loadId || thread.id),
      roles: ['load', 'participants'],
      groups: ['loadparticipants', normalizeToken(thread.loadId), normalizeToken(thread.title)],
    });
  }

  return pool;
}

function buildMentionCandidate(peer) {
  const handles = [peer.username, peer.name, peer.company, peer.userId].map(normalizeToken).filter(Boolean);
  const groups = [peer.company, peer.city, peer.state, peer.role, peer.equipmentType, ...(Array.isArray(peer.equipmentTypes) ? peer.equipmentTypes : [])].map(normalizeToken).filter(Boolean);
  const role = normalizeToken(peer.role);
  const roleAliases = roleAliasesFor(peer);
  const slug = handles[0] || normalizeToken(peer.name) || normalizeToken(peer.company) || normalizeToken(peer.userId);
  return {
    userId: peer.userId,
    name: peer.name,
    company: peer.company,
    role: peer.role,
    city: peer.city,
    state: peer.state,
    handles: [...new Set(handles)],
    slug,
    roles: [...new Set([role, ...roleAliases])],
    groups: [...new Set(groups)],
  };
}

function roleAliasesFor(peer) {
  const role = normalizeToken(peer.role);
  const equipment = normalizeToken(peer.equipmentType || (Array.isArray(peer.equipmentTypes) ? peer.equipmentTypes.join(' ') : ''));
  const aliases = [];
  if (role.includes('driver') || role.includes('owneroperator') || role.includes('owner-operator')) aliases.push('driver', 'owneroperator', 'owner-operator');
  if (role.includes('carrier')) aliases.push('carrier', 'carriers');
  if (role.includes('broker')) aliases.push('broker', 'brokers');
  if (role.includes('dispatcher')) aliases.push('dispatcher', 'dispatch', 'dispatchteam');
  if (role.includes('loader')) aliases.push('loader', 'loaders');
  if (role.includes('shipper')) aliases.push('shipper', 'customer', 'customers');
  if (role.includes('facility')) aliases.push('facility', 'warehouse', 'warehouses');
  if (equipment.includes('flatbed')) aliases.push('flatbeddrivers', 'flatbed');
  if (equipment.includes('reefer')) aliases.push('reeferdrivers', 'reefer');
  if (equipment.includes('lowboy') || equipment.includes('rgn')) aliases.push('heavyhaul', 'lowboydrivers');
  return aliases;
}

function uniqueMentionTargets(list) {
  const seen = new Set();
  const out = [];
  for (const item of list) {
    if (!item?.userId || seen.has(item.userId)) continue;
    seen.add(item.userId);
    out.push(item);
  }
  return out;
}

function normalizeAttachments(value) {
  const items = Array.isArray(value) ? value : value ? [value] : [];
  return items.map((item) => {
    if (!item || typeof item !== 'object') return null;
    return {
      id: cleanString(item.id || `att_${crypto.randomUUID().replace(/-/g, '')}`, 120),
      kind: cleanString(item.kind || inferAttachmentKind(item.type || item.mimeType || ''), 24),
      name: cleanString(item.name || item.filename || 'Attachment', 160),
      type: cleanString(item.type || item.mimeType || '', 80),
      url: cleanString(item.url || item.dataUrl || item.content || '', 8000),
      size: Number(item.size || 0) || 0,
    };
  }).filter(Boolean).slice(0, 8);
}

function normalizeLocation(value) {
  if (!value) return null;
  if (typeof value === 'string') {
    const text = cleanString(value, 160);
    return text ? { label: text } : null;
  }
  if (typeof value !== 'object') return null;
  const label = cleanString(value.label || [value.city, value.state, value.address].filter(Boolean).join(', '), 160);
  const lat = Number(value.lat || value.latitude || 0);
  const lng = Number(value.lng || value.lon || value.longitude || 0);
  return { label, lat: Number.isFinite(lat) ? lat : 0, lng: Number.isFinite(lng) ? lng : 0 };
}

function normalizeContactCard(value) {
  if (!value) return null;
  if (typeof value !== 'object') return null;
  return {
    userId: cleanString(value.userId || '', 80),
    name: cleanString(value.name || '', 120),
    company: cleanString(value.company || '', 160),
    role: cleanString(value.role || '', 80),
    city: cleanString(value.city || '', 80),
    state: cleanString(value.state || '', 40),
    handle: cleanString(value.handle || '', 80),
  };
}

function normalizeLoadShare(value) {
  if (!value) return null;
  if (typeof value !== 'object') return null;
  return {
    loadId: cleanString(value.loadId || '', 120),
    title: cleanString(value.title || '', 140),
    company: cleanString(value.company || '', 160),
    origin: cleanString(value.origin || '', 80),
    destination: cleanString(value.destination || '', 80),
    equipment: cleanString(value.equipment || '', 120),
    rate: cleanString(value.rate || '', 60),
  };
}

function attachmentSummary(attachments) {
  const count = Array.isArray(attachments) ? attachments.length : 0;
  if (!count) return '';
  return `${count} attachment${count === 1 ? '' : 's'}`;
}

function inferAttachmentKind(type = '') {
  const text = String(type || '').toLowerCase();
  if (text.startsWith('image/')) return 'photo';
  if (text.startsWith('audio/')) return 'voice';
  if (text.startsWith('video/')) return 'video';
  if (/pdf|document|msword|officedocument/.test(text)) return 'document';
  return 'file';
}

function makeThreadId(type, body) {
  const parts = [body.threadId, body.loadId, body.company, body.channel, body.recipientUserId, body.recipientEmail, body.title]
    .map((item) => cleanString(item, 40).toLowerCase())
    .filter(Boolean)
    .join('-')
    .replace(/[^a-z0-9]+/g, '-');
  return `conv_${type}_${parts || crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
}

function createThread(account, id, type, body) {
  const now = isoNow();
  const channelMeta = type === 'channel' ? lookupChannelMeta(body.channel || body.title || id) : null;
  return {
    id,
    type,
    title: cleanString(body.title || fallbackThreadTitle({ type, ...body }, account), 140),
    description: cleanString(body.description || '', 240),
    public: Boolean(body.public || type === 'channel'),
    members: uniqueStrings([account.userId, ...normalizeMembers(body.members), ...normalizeMembers(body.participants)]),
    approvedParticipantIds: uniqueStrings([...normalizeMembers(body.approvedParticipantIds), account.userId]),
    approvedParticipantRoles: uniqueStrings(normalizeMembers(body.approvedParticipantRoles || body.roles)),
    company: cleanString(body.company || account.company || '', 160),
    loadId: cleanString(body.loadId || '', 120),
    channel: cleanString(body.channel || '', 80),
    channelMeta,
    createdBy: account.userId,
    createdAt: now,
    updatedAt: now,
    lastMessageAt: now,
    lastMessage: '',
    lastSender: '',
    messages: [],
    archivedBy: {},
    lastReadAtByUserId: {},
  };
}

function lookupChannelMeta(value = '') {
  const token = normalizeToken(value);
  return DEFAULT_CHANNELS.find((channel) => normalizeToken(channel.id) === token || normalizeToken(channel.title) === token) || null;
}

function normalizeType(value) {
  const text = String(value || '').toLowerCase();
  if (text.includes('channel') || text.includes('community')) return 'channel';
  if (text.includes('company')) return 'company';
  if (text.includes('load')) return 'load';
  return 'dm';
}

function normalizeMembers(value) {
  if (Array.isArray(value)) return value.map((item) => cleanString(item, 80)).filter(Boolean);
  if (typeof value === 'string') return value.split(',').map((item) => cleanString(item, 80)).filter(Boolean);
  return [];
}

function uniqueStrings(values) {
  return [...new Set((values || []).map((value) => cleanString(value, 80)).filter(Boolean))];
}

function fallbackThreadTitle(thread, account) {
  if (thread.type === 'channel') return thread.channel || '# community';
  if (thread.type === 'company') return cleanString(thread.company || account.company || 'Company conversation', 140);
  if (thread.type === 'load') return cleanString(thread.loadId || 'Load conversation', 140);
  return cleanString(account.name || 'Direct message', 140);
}

function threadVisible(thread, account) {
  if (!thread) return false;
  if (thread.public) return true;
  if (Array.isArray(thread.members) && thread.members.includes(account.userId)) return true;
  if (thread.type === 'company') {
    const workspace = thread.companyWorkspace || {};
    if (Array.isArray(workspace.memberIds) && workspace.memberIds.includes(account.userId)) return true;
    if (Array.isArray(workspace.adminIds) && workspace.adminIds.includes(account.userId)) return true;
    return false;
  }
  if (thread.type === 'load') {
    if (Array.isArray(thread.approvedParticipantIds) && thread.approvedParticipantIds.includes(account.userId)) return true;
    if (Array.isArray(thread.approvedParticipantRoles) && thread.approvedParticipantRoles.includes(normalizeToken(account.role))) return true;
    if (normalizeToken(account.role).includes('support')) return true;
    if (carrierLoadBookingDecision(account).allowed) return true;
  }
  return false;
}

function findVisibleThread(threads, account, threadId) {
  const id = cleanString(threadId || '', 120);
  return (Array.isArray(threads) ? threads : []).find((thread) => thread.id === id && threadVisible(thread, account)) || null;
}

async function readHub(env) {
  if (env?.RELOCATION_MANAGER_DB?.prepare) {
    try {
      const row = await env.RELOCATION_MANAGER_DB.prepare(
        'SELECT payload_json FROM communication_hubs WHERE hub_key = ? LIMIT 1'
      ).bind(HUB_KEY).first();
      if (row?.payload_json) {
        const hub = safeJsonParse(row.payload_json) || null;
        const next = hub && typeof hub === 'object' ? hub : { threads: [], updatedAt: isoNow() };
        next.threads = Array.isArray(next.threads) ? next.threads : [];
        next.notifications = Array.isArray(next.notifications) ? next.notifications : [];
        ensureSeedChannels(next);
        return next;
      }
    } catch {
      // Fall back to KV below.
    }
  }

  const raw = await env.RELOCATION_MANAGER_LEADS.get(HUB_KEY);
  const hub = raw ? safeJsonParse(raw) : null;
  const next = hub && typeof hub === 'object' ? hub : { threads: [], updatedAt: isoNow() };
  next.threads = Array.isArray(next.threads) ? next.threads : [];
  next.notifications = Array.isArray(next.notifications) ? next.notifications : [];
  ensureSeedChannels(next);
  return next;
}

async function saveHub(env, hub) {
  hub.updatedAt = isoNow();
  const payload = JSON.stringify(hub);
  if (env?.RELOCATION_MANAGER_DB?.prepare) {
    try {
      await env.RELOCATION_MANAGER_DB.prepare(
        `INSERT INTO communication_hubs (hub_key, payload_json, updated_at)
         VALUES (?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(hub_key) DO UPDATE SET payload_json = excluded.payload_json, updated_at = CURRENT_TIMESTAMP`
      ).bind(HUB_KEY, payload).run();
    } catch {
      // Fall back to KV below.
    }
  }
  await env.RELOCATION_MANAGER_LEADS.put(HUB_KEY, payload);
}

function ensureSeedChannels(hub) {
  const now = isoNow();
  for (const channel of DEFAULT_CHANNELS) {
    if (hub.threads.some((thread) => thread.id === `channel:${channel.id}`)) continue;
    hub.threads.unshift({
      id: `channel:${channel.id}`,
      type: 'channel',
      title: channel.title,
      description: channel.description,
      public: true,
      members: [],
      followersByUserId: {},
      approvedParticipantIds: [],
      approvedParticipantRoles: ['driver', 'carrier', 'broker', 'dispatcher', 'loader', 'shipper', 'customer'],
      createdBy: 'system',
      createdAt: now,
      updatedAt: now,
      lastMessageAt: now,
      lastMessage: '',
      lastSender: '',
      messages: [],
      archivedBy: {},
      lastReadAtByUserId: {},
      channel: channel.id,
      channelMeta: channel,
    });
  }
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
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

function isoNow() {
  return new Date().toISOString();
}

function normalizeToken(value = '') {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function cleanHandle(value = '') {
  return normalizeToken(value).slice(0, 24) || 'member';
}
