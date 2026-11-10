export type ApprovalRule = { max: number | null; role: string };

const DEFAULT_APPROVAL_RULES: ApprovalRule[] = [
  { max: 1000000, role: 'AP_CLERK' },
  { max: 5000000, role: 'AP_MANAGER' },
  { max: 20000000, role: 'FINANCE_MANAGER' },
  { max: null, role: 'FINANCE_DIRECTOR' },
];

export function demoModeEnabled(appEnv?: string, demoMode?: string) {
  return appEnv === 'development' && demoMode === 'true';
}

export function validateRuntimeConfiguration(env: Record<string, string | undefined>) {
  const appEnv = env.APP_ENV;
  const demo = env.DEMO_MODE;
  if (appEnv !== 'development' && appEnv !== 'production') {
    throw new Error('APP_ENV must be explicitly set to development or production.');
  }
  if (demo !== 'true' && demo !== 'false') {
    throw new Error('DEMO_MODE must be explicitly set to true or false.');
  }
  if (appEnv === 'production' && demo !== 'false') {
    throw new Error('DEMO_MODE must be false in production.');
  }
  if (appEnv === 'production' && env.SEED_ON_START !== 'false') {
    throw new Error('SEED_ON_START must be explicitly false in production.');
  }
  if (!env.DATABASE_URL) {
    throw new Error('DATABASE_URL must be configured.');
  }
  if (appEnv === 'production') {
    const configuredOrigin = env.APP_ORIGIN;
    if (!configuredOrigin) throw new Error('APP_ORIGIN must be configured in production.');
    try {
      const parsed = new URL(configuredOrigin);
      if (parsed.protocol !== 'https:' || parsed.origin !== configuredOrigin) throw new Error();
    } catch {
      throw new Error('APP_ORIGIN must be a canonical HTTPS origin without a path or trailing slash.');
    }
  }
}

export function matchesCanonicalOrigin(origin: string | null, canonicalOrigin: string) {
  if (!origin) return false;
  try {
    return new URL(origin).origin === canonicalOrigin;
  } catch {
    return false;
  }
}

const APPROVAL_AUTHORITIES: Record<string, string[]> = {
  AP_CLERK: ['AP_CLERK', 'AP_MANAGER', 'FINANCE_MANAGER', 'FINANCE_DIRECTOR'],
  AP_MANAGER: ['AP_MANAGER', 'FINANCE_MANAGER', 'FINANCE_DIRECTOR'],
  FINANCE_MANAGER: ['FINANCE_MANAGER', 'FINANCE_DIRECTOR'],
  FINANCE_DIRECTOR: ['FINANCE_DIRECTOR'],
  COMPLIANCE: ['COMPLIANCE'],
};

export function canApproveRole(actorRole: string, requiredRole: string) {
  return APPROVAL_AUTHORITIES[requiredRole]?.includes(actorRole) === true;
}

export function resolveApprovalRole(
  exception: { amount: number; riskScore: number; type: string },
  rules: ApprovalRule[] = DEFAULT_APPROVAL_RULES,
) {
  if (exception.type === 'SUSPICIOUS_TRANSACTION') return 'COMPLIANCE';
  if (exception.riskScore >= 76) return 'FINANCE_DIRECTOR';
  return rules.find(rule => rule.max === null || exception.amount <= rule.max)?.role ?? 'FINANCE_DIRECTOR';
}
