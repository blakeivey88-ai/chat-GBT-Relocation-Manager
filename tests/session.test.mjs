import test from 'node:test';
import assert from 'node:assert/strict';

import { createSession } from '../functions/api/_auth.js';

function workingD1() {
  const rows = [];
  return {
    rows,
    prepare(sql) {
      return {
        bind(...params) {
          return {
            async run() {
              if (/INSERT INTO sessions/i.test(sql)) rows.push(params);
              return { success: true, meta: { changes: 1 } };
            },
          };
        },
      };
    },
  };
}

test('creates a login session when D1 succeeds and the legacy KV mirror fails', async () => {
  const database = workingD1();
  const env = {
    RELOCATION_MANAGER_DB: database,
    RELOCATION_MANAGER_LEADS: {
      async put() {
        throw new Error('Simulated KV outage.');
      },
    },
  };

  const session = await createSession(
    env,
    'usr_test',
    { email: 'member@example.com' },
    { rememberMe: false },
  );

  assert.equal(typeof session, 'string');
  assert.ok(session.length > 20);
  assert.equal(database.rows.length, 1);
  assert.equal(database.rows[0][1], 'usr_test');
});

test('fails loudly only when neither D1 nor KV can save the login session', async () => {
  const env = {
    RELOCATION_MANAGER_DB: {
      prepare() {
        return {
          bind() {
            return {
              async run() {
                throw new Error('Simulated D1 outage.');
              },
            };
          },
        };
      },
    },
    RELOCATION_MANAGER_LEADS: {
      async put() {
        throw new Error('Simulated KV outage.');
      },
    },
  };

  await assert.rejects(
    createSession(env, 'usr_test', { email: 'member@example.com' }),
    /Simulated D1 outage/,
  );
});
