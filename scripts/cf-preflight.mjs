#!/usr/bin/env node
/**
 * Read-only Cloudflare preflight for the public synthetic demo (ADR-0015).
 *
 * Run by the host's deploy wrapper before `wrangler deploy`, with the account
 * id and API token already in the environment. It never prints either value.
 * It fails closed — so nothing is deployed — when:
 *   - the zone for the custom domain is not an active zone of this account;
 *   - the hostname is already a Custom Domain of a different Worker;
 *   - a Worker route on the hostname belongs to a different Worker.
 *
 * Existing DNS records on that exact hostname (e.g. a registrar parking page)
 * are reported, then replaced by the Custom Domain at deploy. Records on other
 * names (MX, TXT, subdomains) are listed and untouched.
 *
 * Usage: node scripts/cf-preflight.mjs --hostname qui.social --worker qui-demo
 */

/* global process, console, fetch */

const API = 'https://api.cloudflare.com/client/v4';

function arg(name) {
  const index = process.argv.indexOf(`--${name}`);
  const value = index === -1 ? undefined : process.argv[index + 1];
  if (value === undefined || value.startsWith('--')) fail(`missing --${name}`);
  return value;
}

function fail(message) {
  console.error(`QUI_PREFLIGHT_BLOCKED: ${message}`);
  process.exit(2);
}

const hostname = arg('hostname');
const worker = arg('worker');
const account = process.env.CLOUDFLARE_ACCOUNT_ID;
const token = process.env.CLOUDFLARE_API_TOKEN;
if (!account || !token) fail('Cloudflare credentials are not in the environment');

async function call(path) {
  const response = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  const body = await response.json().catch(() => null);
  if (!response.ok || body === null || body.success !== true) {
    const codes = (body?.errors ?? []).map((error) => `${error.code}:${error.message}`).join('; ');
    fail(`GET ${path.replace(account, '<account>')} → HTTP ${response.status} ${codes}`);
  }
  return body.result;
}

const zones = await call(`/zones?name=${encodeURIComponent(hostname)}&account.id=${account}`);
if (!Array.isArray(zones) || zones.length !== 1) fail(`zone ${hostname} is not in this Cloudflare account`);
const zone = zones[0];
if (zone.status !== 'active') fail(`zone ${hostname} is ${zone.status}, not active`);

const records = await call(`/zones/${zone.id}/dns_records?per_page=100`);
const atHost = records.filter((record) => record.name === hostname);
const elsewhere = records.filter((record) => record.name !== hostname);

const domains = await call(`/accounts/${account}/workers/domains?hostname=${encodeURIComponent(hostname)}`);
const foreignDomain = domains.find((domain) => domain.hostname === hostname && domain.service !== worker);
if (foreignDomain) fail(`${hostname} is already the Custom Domain of another Worker (${foreignDomain.service})`);

const routes = await call(`/zones/${zone.id}/workers/routes`);
const foreignRoute = routes.find((route) => route.pattern.split('/')[0].replace(/^\*\.?/, '') === hostname && route.script && route.script !== worker);
if (foreignRoute) fail(`route ${foreignRoute.pattern} belongs to another Worker (${foreignRoute.script})`);

const summary = {
  zone: { name: zone.name, status: zone.status, plan: zone.plan?.name ?? null },
  recordsReplacedAtHostname: atHost.map((r) => ({ type: r.type, name: r.name, content: r.content, proxied: r.proxied })),
  recordsUntouched: elsewhere.map((r) => ({ type: r.type, name: r.name, proxied: r.proxied })),
  existingCustomDomainForWorker: domains.filter((d) => d.service === worker).map((d) => d.hostname),
  workerRoutesOnHostname: routes.filter((r) => r.pattern.includes(hostname)).map((r) => ({ pattern: r.pattern, script: r.script })),
};
process.stdout.write(`QUI_PREFLIGHT_OK ${JSON.stringify(summary)}\n`);
