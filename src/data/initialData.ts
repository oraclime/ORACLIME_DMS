import { TechnicianRecord, SystemSettings, UserAccount } from '../types/dms';

/**
 * Clean production initial state - ZERO demo or mock technician records.
 * All records and statistics are dynamically populated from real user data.
 */
export const INITIAL_TECHNICIANS: TechnicianRecord[] = [];

// Cryptographic salt and SHA-256 hash for Operator Security PIN
export const DEFAULT_PIN_SALT = 'oraclime_pin_salt_2026';
export const DEFAULT_PIN_HASH = 'c867d824951480ee20283fc562f75bdd39a1beba2154e5fedeba596e5c2c1baf';

// Cryptographic salt and SHA-256 hash for Administrator
export const DEFAULT_ADMIN_SALT = 'oraclime_admin_salt_2026';
export const DEFAULT_ADMIN_HASH = '9ae8a3b8383de81eb30f7ce0adefc931c541445de7bbd9f653d6038e2329ce3a';

// Cryptographic salt and SHA-256 hash for Operator
export const DEFAULT_OPERATOR_SALT = 'oraclime_op_salt_2026';
export const DEFAULT_OPERATOR_HASH = '5563e2b95c24ecfcb379db0bcb8feeec287bb33945000dcd488dbeaa75e7ea40';

export const DEFAULT_SETTINGS: SystemSettings = {
  operatorName: 'System Administrator',
  operatorId: 'ADM-001',
  securityPinHash: DEFAULT_PIN_HASH,
  securityPinSalt: DEFAULT_PIN_SALT,
  baseStoragePath: 'C:/ORACLIME_DMS',
  ocrLanguages: ['eng', 'hin'],
  autoLockMinutes: 15,
  isLocked: false,
  backupAutoSchedule: 'daily',
  initialSetupCompleted: true,
};

export const INITIAL_USERS: UserAccount[] = [
  {
    id: 'user_admin_001',
    username: 'admin',
    fullName: 'System Administrator',
    role: 'administrator',
    status: 'active',
    passwordHash: DEFAULT_ADMIN_HASH,
    salt: DEFAULT_ADMIN_SALT,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'user_operator_001',
    username: 'aman',
    fullName: 'Aman (Verification Officer)',
    role: 'operator',
    status: 'active',
    passwordHash: DEFAULT_OPERATOR_HASH,
    salt: DEFAULT_OPERATOR_SALT,
    createdAt: new Date().toISOString(),
  }
];
