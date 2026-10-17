const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const babel = require('@babel/core');

const root = path.join(__dirname, '..');
function load(file, imports = {}, globals = {}) {
  const code = babel.transformSync(fs.readFileSync(path.join(root, file), 'utf8'), {
    configFile: false, babelrc: false, presets: [require('babel-preset-expo')], filename: path.join(root, file),
  }).code;
  const module = { exports: {} };
  vm.runInNewContext(code, { module, exports: module.exports,
    require(name) {
      if (name in imports) return imports[name];
      try { return require(name); } catch (e) { throw new Error(`Unexpected import ${name}`); }
    },
    console, AbortController, setTimeout, clearTimeout, ...globals,
  }, { filename: file });
  return module.exports;
}
const errors = load('src/utils/apiErrors.js');
let fetchImplementation;
let session = 'test-session';
const storage = { getItem: async () => null, setItem: async () => {}, removeItem: async () => {}, multiRemove: async () => {} };
const imports = {
  '@react-native-async-storage/async-storage': storage,
  'expo-secure-store': { getItemAsync: async () => session, setItemAsync: async () => {} },
  'react-native': { Platform: { OS: 'android' } }, '../utils/apiErrors': errors,
};
const client = load('src/api/client.js', imports, { fetch: (...args) => fetchImplementation(...args) });
const response = (status, body, type = 'application/json') => ({ status, ok: status >= 200 && status < 300,
  headers: { get: key => key === 'content-type' ? type : key === 'x-request-id' ? 'test-request' : null },
  text: async () => typeof body === 'string' ? body : JSON.stringify(body),
});
let checks = 0;
async function run(name, fn) { await fn(); checks++; console.log(`PASS ${name}`); }

(async () => {
  for (const [status, type] of [[400,'validation'],[401,'auth'],[403,'forbidden'],[404,'request'],[408,'timeout'],[409,'validation'],[422,'validation'],[429,'rate_limit'],[500,'server'],[503,'server'],[504,'timeout']]) {
    await run(`HTTP ${status} keeps its category, status, endpoint, and server detail`, async () => {
      fetchImplementation = async () => response(status, {error:'Test server detail'});
      await assert.rejects(client.getItems(), error => error.type === type && error.status === status
        && error.code === `HTTP_${status}` && error.diagnostics.serverMessage === 'Test server detail'
        && error.diagnostics.url.endsWith('/api/shop/items') && error.diagnostics.hasSession === true);
    });
  }
  await run('Missing session is reported without including credentials', async () => {
    session = null;
    fetchImplementation = async () => response(401, {error:'Token missing'});
    await assert.rejects(client.getItems(), error => error.diagnostics.hasSession === false);
    session = 'test-session';
  });
  await run('Shop association errors are distinct from a network failure', async () => {
    fetchImplementation = async () => response(403, {error:'No shop context'});
    await assert.rejects(client.getItems(), error => error.title === 'Shop account not linked');
  });
  for (const [body, type] of [['<html>Backend unavailable</html>','text/html'],['invalid JSON','application/json'],['','application/json'],['null','application/json']]) {
    await run(`Invalid successful response (${type}, ${body.slice(0,15) || 'empty'}) is visible`, async () => {
      fetchImplementation = async () => response(200, body, type);
      await assert.rejects(client.getItems(), error => error.code === 'INVALID_RESPONSE' && error.status === 200);
    });
  }
  await run('Non-JSON HTTP errors keep their real HTTP status', async () => {
    fetchImplementation = async () => response(502, '<html>Bad gateway</html>', 'text/html');
    await assert.rejects(client.getItems(), error => error.status === 502 && error.type === 'server');
  });
  await run('Unexpected JSON list shape does not become an empty catalog', async () => {
    fetchImplementation = async () => response(200, {unexpected:true});
    await assert.rejects(client.getItems(), error => error.code === 'INVALID_RESPONSE');
  });
  await run('Array and wrapped-list responses still load, including empty catalogs', async () => {
    for (const value of [[], [{id:1}], {items:[{id:1}]}, {data:[{id:1}]}, {results:[{id:1}]}]) {
      fetchImplementation = async () => response(200, value);
      const items = await client.getItems();
      assert.ok(Array.isArray(items));
      assert.equal(items.length, Array.isArray(value) ? value.length : 1);
    }
  });
  await run('Empty 204 success responses remain supported', async () => {
    fetchImplementation = async () => response(204, '');
    assert.equal(JSON.stringify(await client.fetchWithAuth('/api/test', {method:'DELETE'})), '{}');
  });
  await run('Native connection errors have no invented HTTP status', async () => {
    fetchImplementation = async () => { throw new TypeError('Network request failed'); };
    await assert.rejects(client.getItems(), error => error.code === 'NETWORK_ERROR' && error.status === 0);
  });
  await run('Request timeout has its own category and still records the request', async () => {
    const timeoutClient = load('src/api/client.js', imports, {
      setTimeout: fn => { queueMicrotask(fn); return 0; }, clearTimeout: () => {},
      fetch: (_url, options) => new Promise((_resolve, reject) => options.signal.addEventListener('abort', () => {
        const error = new Error('Aborted'); error.name = 'AbortError'; reject(error);
      })),
    });
    await assert.rejects(timeoutClient.getItems(), error => error.code === 'REQUEST_TIMEOUT' && error.type === 'timeout'
      && error.diagnostics.url.endsWith('/api/shop/items'));
  });
  await run('Support report removes URL credentials, queries, bearer tokens, JWTs and passwords', async () => {
    const error = errors.createApiError({ status:500, url:'https://username:password@example.com/api/items?token=query-secret',
      serverMessage:'password="secret with spaces" token=opaque-secret Bearer another-secret eyJtest.payload.signature https://example.com/path?token=url-secret', hasSession:true });
    const report = errors.formatApiErrorReport(error, {context:'POS',app:'test-build'});
    for (const value of ['username','password@','query-secret','secret with spaces','opaque-secret','another-secret','eyJtest.payload.signature','url-secret']) {
      assert.ok(!report.includes(value), `Report leaked ${value}`);
    }
    assert.ok(report.includes('HTTP_500'));
    assert.ok(report.includes('GET https://example.com/api/items'));
    assert.ok(!report.includes('test-session'));
  });
  await run('Customer phone numbers and email addresses in request paths are redacted', async () => {
    assert.equal(errors.safeRequestUrl('https://example.com/api/shop/ledger/%2B919876543210'), 'https://example.com/api/shop/ledger/[redacted]');
    assert.equal(errors.safeRequestUrl('https://example.com/api/customer/person%40example.com'), 'https://example.com/api/customer/[redacted]');
  });
  console.log(`\n${checks} error-reporting checks passed.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
