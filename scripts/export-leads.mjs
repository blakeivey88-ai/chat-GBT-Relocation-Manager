#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';

const namespaceId = '59046e24e3cd4d56b409dc3a70f02e3e';
const outPath = process.argv[2] || `launch/leads-${new Date().toISOString().slice(0, 10)}.csv`;
const columns = [
  'created_at', 'updated_at', 'name', 'email', 'type', 'phone', 'company', 'equipment',
  'pickup_area', 'preferred_lane', 'min_rate', 'instagram', 'consent_to_communications',
  'verification_status', 'payment_status', 'tags', 'submission_count', 'notes', 'id', 'source'
];

function wrangler(args) {
  return execFileSync('npx', ['wrangler', ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
}

const keys = JSON.parse(wrangler(['kv', 'key', 'list', '--namespace-id', namespaceId, '--remote']));
const records = [];
for (const key of keys) {
  const raw = wrangler(['kv', 'key', 'get', key.name, '--namespace-id', namespaceId, '--remote', '--text']);
  try {
    records.push(JSON.parse(raw));
  } catch {
    records.push({ id: key.name, notes: raw.trim() });
  }
}
records.sort((a, b) => String(a.created_at || '').localeCompare(String(b.created_at || '')));

function csvCell(value) {
  if (Array.isArray(value)) return csvCell(value.join('|'));
  const text = value == null ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

const csv = [columns.join(','), ...records.map(record => columns.map(column => csvCell(record[column])).join(','))].join('\n') + '\n';
mkdirSync(outPath.split('/').slice(0, -1).join('/') || '.', { recursive: true });
writeFileSync(outPath, csv);
console.log(`Exported ${records.length} leads to ${outPath}`);
