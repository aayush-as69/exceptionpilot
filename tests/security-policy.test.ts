import test from 'node:test';
import assert from 'node:assert/strict';
import { canApproveRole, demoModeEnabled, matchesCanonicalOrigin, resolveApprovalRole, validateRuntimeConfiguration } from '../src/lib/security-policy';

test('demo mode is enabled only for explicit development configuration', () => {
  assert.equal(demoModeEnabled('development', 'true'), true);
  assert.equal(demoModeEnabled('production', 'true'), false);
  assert.equal(demoModeEnabled('development', undefined), false);
  assert.equal(demoModeEnabled(undefined, undefined), false);
});

test('runtime configuration rejects missing and unsafe production settings', () => {
  assert.throws(() => validateRuntimeConfiguration({}), /APP_ENV/);
  assert.throws(() => validateRuntimeConfiguration({ APP_ENV: 'production', DEMO_MODE: 'true', DATABASE_URL: 'postgres://db', SEED_ON_START: 'false', APP_ORIGIN: 'https://example.com' }), /DEMO_MODE/);
  assert.throws(() => validateRuntimeConfiguration({ APP_ENV: 'production', DEMO_MODE: 'false', DATABASE_URL: 'postgres://db', SEED_ON_START: 'true', APP_ORIGIN: 'https://example.com' }), /SEED_ON_START/);
  assert.throws(() => validateRuntimeConfiguration({ APP_ENV: 'production', DEMO_MODE: 'false', DATABASE_URL: 'postgres://db', SEED_ON_START: 'false' }), /APP_ORIGIN/);
  const safeProduction = { APP_ENV: 'production', DEMO_MODE: 'false', DATABASE_URL: 'postgres://db', SEED_ON_START: 'false', APP_ORIGIN: 'https://example.com', CRON_SECRET: 'a'.repeat(32), RATE_LIMITING_MODE: 'gateway' };
  assert.throws(() => validateRuntimeConfiguration({ ...safeProduction, APP_ORIGIN: 'https://example.com/path' }), /canonical HTTPS origin/);
  assert.throws(() => validateRuntimeConfiguration({ ...safeProduction, CRON_SECRET: 'short' }), /CRON_SECRET/);
  assert.throws(() => validateRuntimeConfiguration({ ...safeProduction, RATE_LIMITING_MODE: 'local' }), /RATE_LIMITING_MODE=gateway/);
  assert.doesNotThrow(() => validateRuntimeConfiguration(safeProduction));
});

test('origin validation compares with the canonical configured origin', () => {
  assert.equal(matchesCanonicalOrigin('https://example.com', 'https://example.com'), true);
  assert.equal(matchesCanonicalOrigin('https://attacker.example', 'https://example.com'), false);
  assert.equal(matchesCanonicalOrigin(null, 'https://example.com'), false);
});

test('approval hierarchy is explicit and compliance remains separate', () => {
  assert.equal(canApproveRole('FINANCE_DIRECTOR', 'AP_CLERK'), true);
  assert.equal(canApproveRole('AP_MANAGER', 'FINANCE_MANAGER'), false);
  assert.equal(canApproveRole('FINANCE_DIRECTOR', 'COMPLIANCE'), false);
  assert.equal(canApproveRole('COMPLIANCE', 'COMPLIANCE'), true);
  assert.equal(canApproveRole('UNKNOWN', 'AP_CLERK'), false);
});

test('approval requirements and authority use one configured role policy', () => {
  assert.equal(resolveApprovalRole({ amount: 500000, riskScore: 10, type: 'PRICE_VARIANCE' }), 'AP_CLERK');
  assert.equal(resolveApprovalRole({ amount: 500000, riskScore: 80, type: 'PRICE_VARIANCE' }), 'FINANCE_DIRECTOR');
  assert.equal(resolveApprovalRole({ amount: 500000, riskScore: 10, type: 'SUSPICIOUS_TRANSACTION' }), 'COMPLIANCE');
  assert.equal(resolveApprovalRole({ amount: 2500000, riskScore: 10, type: 'PRICE_VARIANCE' }, [{ max: 3000000, role: 'AP_MANAGER' }, { max: null, role: 'FINANCE_DIRECTOR' }]), 'AP_MANAGER');
});
