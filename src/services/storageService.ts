import { 
  TechnicianRecord, 
  SystemSettings, 
  BackupSnapshot, 
  AttachedDocument, 
  AuditEntry, 
  UserAccount,
  MainCategory,
  PartnerType,
  UserRole,
  UserPermissions
} from '../types/dms';
import { 
  INITIAL_TECHNICIANS, 
  DEFAULT_SETTINGS, 
  INITIAL_USERS, 
  DEFAULT_PIN_HASH, 
  DEFAULT_PIN_SALT,
  DEFAULT_ADMIN_HASH,
  DEFAULT_ADMIN_SALT,
  DEFAULT_OPERATOR_HASH,
  DEFAULT_OPERATOR_SALT
} from '../data/initialData';
import { CryptoService } from './cryptoService';

export interface AuthResult {
  success: boolean;
  user?: UserAccount;
  error?: string;
  mustChangePassword?: boolean;
}

export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, UserPermissions> = {
  super_admin: {
    canManageUsers: true,
    canEditRecords: true,
    canDeleteRecords: true,
    canVerifyDocuments: true,
    canExportBackup: true,
    canUnmaskAadhaar: true,
  },
  administrator: {
    canManageUsers: true,
    canEditRecords: true,
    canDeleteRecords: true,
    canVerifyDocuments: true,
    canExportBackup: true,
    canUnmaskAadhaar: true,
  },
  operator: {
    canManageUsers: false,
    canEditRecords: true,
    canDeleteRecords: false,
    canVerifyDocuments: true,
    canExportBackup: false,
    canUnmaskAadhaar: false,
  },
};

const STORAGE_KEYS = {
  TECHNICIANS: 'oraclime_dms_technicians_v2',
  SETTINGS: 'oraclime_dms_settings_v2',
  USERS: 'oraclime_dms_users_v2',
  SESSION: 'oraclime_dms_session_v2',
  STANDALONE_DOCS: 'oraclime_dms_standalone_docs_v2',
  AUDIT_LOG: 'oraclime_dms_audit_log_v2',
};

// Known demo IDs to purge
const DEMO_TECH_IDS = new Set(['tech_001', 'tech_002', 'tech_003', 'tech_004', 'tech_005']);
const DEMO_APP_NUMS = new Set(['UPMBD260001', 'UPMBD260002', 'DEL260003', 'LKO260004', 'UPMBD260005']);

export class StorageService {
  // Legacy mismatched placeholder hashes from initial scaffold to migrate automatically
  private static readonly LEGACY_ADMIN_HASH = 'a7463f25d97f56b5cb56ea8804618e7e1efca23aebfe46e91ea6b6ca43419fc7';
  private static readonly LEGACY_OP_HASH = '8b3c9a2d6190209c13b3eef93dcbb4822e118029517e45e903bc374d47158ca1';
  private static readonly LEGACY_PIN_HASH = 'e7b2330a1bfb0e3dd0a20cb6b6276b5df9620ca671607ef94c6f5053c2a647d6';

  /**
   * One-time cleanup to ensure old demo records are purged while keeping genuine user records
   */
  private static cleanOldDemoRecords(techs: TechnicianRecord[]): TechnicianRecord[] {
    return techs.filter(t => !DEMO_TECH_IDS.has(t.id) && !DEMO_APP_NUMS.has(t.applicationNumber));
  }

  // --- SETTINGS ---
  public static getSettings(): SystemSettings {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (raw) {
        const parsed = JSON.parse(raw);
        let pinHash = parsed.securityPinHash || DEFAULT_PIN_HASH;
        let pinSalt = parsed.securityPinSalt || DEFAULT_PIN_SALT;
        if (pinHash === StorageService.LEGACY_PIN_HASH) {
          pinHash = DEFAULT_PIN_HASH;
          pinSalt = DEFAULT_PIN_SALT;
          parsed.securityPinHash = pinHash;
          parsed.securityPinSalt = pinSalt;
          localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(parsed));
        }
        return {
          ...DEFAULT_SETTINGS,
          ...parsed,
          securityPinHash: pinHash,
          securityPinSalt: pinSalt,
        };
      }
    } catch {
      // ignore
    }
    return DEFAULT_SETTINGS;
  }

  public static saveSettings(settings: SystemSettings): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch {
      // ignore
    }
  }

  // --- USERS & AUTHENTICATION ---
  public static getUsers(): UserAccount[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.USERS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          let hasMigration = false;
          const migratedUsers = parsed.map((u: UserAccount) => {
            const cleanUsername = (u.username || '').trim().toLowerCase();
            let newHash = u.passwordHash;
            let newSalt = u.salt;
            const usernameChanged = u.username !== cleanUsername;

            if (u.passwordHash === StorageService.LEGACY_ADMIN_HASH) {
              newHash = DEFAULT_ADMIN_HASH;
              newSalt = DEFAULT_ADMIN_SALT;
              hasMigration = true;
            } else if (u.passwordHash === StorageService.LEGACY_OP_HASH) {
              newHash = DEFAULT_OPERATOR_HASH;
              newSalt = DEFAULT_OPERATOR_SALT;
              hasMigration = true;
            }

            if (usernameChanged) {
              hasMigration = true;
            }

            // Normalize role
            let role: UserRole = u.role;
            if (role as any === 'admin') role = 'administrator';
            if (cleanUsername === 'admin' && role !== 'super_admin') {
              role = 'super_admin';
              hasMigration = true;
            }

            // Ensure permissions
            const permissions: UserPermissions = u.permissions || {
              ...DEFAULT_ROLE_PERMISSIONS[role] || DEFAULT_ROLE_PERMISSIONS.operator,
            };

            return {
              ...u,
              username: cleanUsername,
              role,
              permissions,
              passwordHash: newHash,
              salt: newSalt,
            };
          });

          if (hasMigration) {
            this.saveUsers(migratedUsers);
          }
          return migratedUsers;
        }
      }
    } catch {
      // ignore
    }
    this.saveUsers(INITIAL_USERS);
    return INITIAL_USERS;
  }

  public static saveUsers(users: UserAccount[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    } catch {
      // ignore
    }
  }

  public static getUserById(id: string): UserAccount | undefined {
    return this.getUsers().find(u => u.id === id);
  }

  public static getUserByUsername(username: string): UserAccount | undefined {
    const clean = (username || '').trim().toLowerCase();
    return this.getUsers().find(u => u.username.toLowerCase() === clean);
  }

  public static hasAdminUser(): boolean {
    const users = this.getUsers();
    return users.some(u => (u.role === 'super_admin' || u.role === 'administrator') && u.status === 'active');
  }

  public static canPerform(user: UserAccount | null | undefined, permission: keyof UserPermissions): boolean {
    if (!user || user.status === 'deactivated') return false;
    if (user.role === 'super_admin') return true;
    if (user.permissions && user.permissions[permission] !== undefined) {
      return Boolean(user.permissions[permission]);
    }
    const def = DEFAULT_ROLE_PERMISSIONS[user.role];
    return def ? Boolean(def[permission]) : false;
  }

  public static async setupFirstRunAdministrator(data: {
    username: string;
    fullName: string;
    password: string;
    pin?: string;
  }): Promise<{ success: boolean; message: string; user?: UserAccount }> {
    const cleanUsername = (data.username || '').trim().toLowerCase();
    if (!cleanUsername || cleanUsername.length < 3) {
      return { success: false, message: 'Administrator username must be at least 3 characters.' };
    }
    if (!data.fullName.trim()) {
      return { success: false, message: 'Please enter the administrator full name.' };
    }
    if (!data.password || data.password.length < 8) {
      return { success: false, message: 'Administrator password must be at least 8 characters long.' };
    }

    const salt = CryptoService.generateSalt();
    const passwordHash = await CryptoService.hashWithSalt(data.password, salt);

    const newAdmin: UserAccount = {
      id: `admin_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      username: cleanUsername,
      fullName: data.fullName.trim(),
      role: 'administrator',
      status: 'active',
      passwordHash,
      salt,
      createdAt: new Date().toISOString(),
    };

    const users = this.getUsers().filter(u => u.username.toLowerCase() !== cleanUsername);
    users.unshift(newAdmin);
    this.saveUsers(users);

    // Update settings with PIN if provided
    const settings = this.getSettings();
    if (data.pin && data.pin.length >= 4 && /^\d+$/.test(data.pin)) {
      const pinSalt = CryptoService.generateSalt();
      const pinHash = await CryptoService.hashWithSalt(data.pin, pinSalt);
      settings.securityPinHash = pinHash;
      settings.securityPinSalt = pinSalt;
    }
    settings.initialSetupCompleted = true;
    settings.operatorName = newAdmin.fullName;
    this.saveSettings(settings);

    this.logAudit(
      `${newAdmin.fullName} (${newAdmin.username})`,
      'System Initialized',
      'First-run setup completed. Primary administrator account provisioned.'
    );

    return { 
      success: true, 
      message: `Administrator '${newAdmin.username}' created successfully.`, 
      user: newAdmin 
    };
  }

  public static async authenticateUserDetailed(username: string, plainPassword: string): Promise<AuthResult> {
    const cleanUsername = (username || '').trim().toLowerCase();
    if (!cleanUsername || !plainPassword) {
      return { success: false, error: 'Please enter both username and password.' };
    }

    const user = this.getUserByUsername(cleanUsername);
    if (!user) {
      this.logAudit(
        'Anonymous',
        'Failed Login Attempt',
        `Authentication failed for username '${cleanUsername}': user record not found.`
      );
      return { success: false, error: 'Invalid username or password.' };
    }

    if (user.status === 'deactivated') {
      this.logAudit(
        `${user.fullName} (${user.username})`,
        'Failed Login Attempt',
        `Authentication blocked: user account '${user.username}' is deactivated.`
      );
      return { 
        success: false, 
        error: 'This account has been deactivated. Please contact your system administrator.' 
      };
    }

    const isValid = await CryptoService.verifyHash(plainPassword, user.salt, user.passwordHash);
    if (!isValid) {
      this.logAudit(
        `${user.fullName} (${user.username})`,
        'Failed Login Attempt',
        `Authentication failed: incorrect password entered for user '${user.username}'.`
      );
      return { success: false, error: 'Invalid username or password.' };
    }

    // update last login
    const updatedUser: UserAccount = {
      ...user,
      lastLogin: new Date().toISOString(),
    };
    this.updateUser(updatedUser);
    this.setCurrentUser(updatedUser);
    this.logAudit(
      `${updatedUser.fullName} (${updatedUser.username})`,
      'User Logged In',
      `Authenticated successfully as ${updatedUser.role}.`
    );
    return { success: true, user: updatedUser };
  }

  public static async authenticateUser(username: string, plainPassword: string): Promise<UserAccount | null> {
    const res = await this.authenticateUserDetailed(username, plainPassword);
    return res.user || null;
  }

  public static getCurrentUser(): UserAccount | null {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEYS.SESSION);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch {
      // ignore
    }
    return null;
  }

  public static setCurrentUser(user: UserAccount | null): void {
    try {
      if (user) {
        sessionStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(user));
      } else {
        sessionStorage.removeItem(STORAGE_KEYS.SESSION);
      }
    } catch {
      // ignore
    }
  }

  public static logout(): void {
    const user = this.getCurrentUser();
    if (user) {
      this.logAudit(`${user.fullName} (${user.username})`, 'User Logged Out', 'Session terminated by user.');
    }
    this.setCurrentUser(null);
  }

  public static async createUser(
    userData: { 
      username: string; 
      fullName: string; 
      role: UserRole; 
      password: string;
      permissions?: UserPermissions;
      mustChangePassword?: boolean;
    },
    actor: UserAccount
  ): Promise<{ success: boolean; message: string; user?: UserAccount }> {
    const users = this.getUsers();
    const cleanUsername = userData.username.trim().toLowerCase();

    if (!cleanUsername || cleanUsername.length < 3) {
      return { success: false, message: 'Username must be at least 3 characters.' };
    }
    if (users.some(u => u.username.toLowerCase() === cleanUsername)) {
      return { success: false, message: `Username '${cleanUsername}' already exists.` };
    }
    if (!userData.password || userData.password.length < 6) {
      return { success: false, message: 'Password must be at least 6 characters.' };
    }

    const salt = CryptoService.generateSalt();
    const passwordHash = await CryptoService.hashWithSalt(userData.password, salt);

    const role = userData.role || 'operator';
    const permissions = userData.permissions || DEFAULT_ROLE_PERMISSIONS[role] || DEFAULT_ROLE_PERMISSIONS.operator;

    const newUser: UserAccount = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      username: cleanUsername,
      fullName: userData.fullName.trim(),
      role,
      status: 'active',
      permissions,
      mustChangePassword: Boolean(userData.mustChangePassword),
      passwordHash,
      salt,
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    this.saveUsers(users);
    this.logAudit(
      `${actor.fullName} (${actor.username})`,
      'User Created',
      `Created user account '${newUser.username}' with role '${newUser.role}'.`
    );

    return { success: true, message: `User '${newUser.username}' created successfully.`, user: newUser };
  }

  public static updateUser(updated: UserAccount, actor?: UserAccount): void {
    const users = this.getUsers();
    const idx = users.findIndex(u => u.id === updated.id);
    if (idx >= 0) {
      users[idx] = updated;
      this.saveUsers(users);
      if (actor) {
        this.logAudit(
          `${actor.fullName} (${actor.username})`,
          'User Updated',
          `Modified profile / permissions for user '${updated.username}'.`
        );
      }
    }
  }

  public static async resetUserPassword(
    userId: string,
    newPassword: string,
    actor: UserAccount,
    mustChangePassword?: boolean
  ): Promise<{ success: boolean; message: string }> {
    if (newPassword.length < 6) {
      return { success: false, message: 'New password must be at least 6 characters long.' };
    }

    const users = this.getUsers();
    const target = users.find(u => u.id === userId);
    if (!target) return { success: false, message: 'User not found.' };

    const newSalt = CryptoService.generateSalt();
    const newHash = await CryptoService.hashWithSalt(newPassword, newSalt);

    target.salt = newSalt;
    target.passwordHash = newHash;
    target.mustChangePassword = Boolean(mustChangePassword);

    this.saveUsers(users);
    this.logAudit(
      `${actor.fullName} (${actor.username})`,
      'Password Reset',
      `Administrative password reset performed for user '${target.username}' (mustChangePassword: ${Boolean(mustChangePassword)}).`
    );

    return { success: true, message: `Password for '${target.username}' has been updated.` };
  }

  public static async changeUserPassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string }> {
    if (newPassword.length < 6) {
      return { success: false, message: 'New password must be at least 6 characters long.' };
    }
    const users = this.getUsers();
    const target = users.find(u => u.id === userId);
    if (!target) return { success: false, message: 'User not found.' };

    const isValid = await CryptoService.verifyHash(currentPassword, target.salt, target.passwordHash);
    if (!isValid) {
      return { success: false, message: 'Current password is incorrect.' };
    }

    const newSalt = CryptoService.generateSalt();
    const newHash = await CryptoService.hashWithSalt(newPassword, newSalt);

    target.salt = newSalt;
    target.passwordHash = newHash;
    target.mustChangePassword = false;

    this.saveUsers(users);
    this.logAudit(
      `${target.fullName} (${target.username})`,
      'Password Changed',
      'User successfully changed their password.'
    );

    return { success: true, message: 'Password updated successfully.' };
  }

  public static toggleUserStatus(userId: string, actor: UserAccount): { success: boolean; message: string } {
    const users = this.getUsers();
    const target = users.find(u => u.id === userId);
    if (!target) return { success: false, message: 'User not found.' };

    // Prevent deactivating the last active administrator
    if (target.role === 'administrator' && target.status === 'active') {
      const activeAdmins = users.filter(u => u.role === 'administrator' && u.status === 'active');
      if (activeAdmins.length <= 1) {
        return { success: false, message: 'Cannot deactivate the only active Administrator account.' };
      }
    }

    target.status = target.status === 'active' ? 'deactivated' : 'active';
    this.saveUsers(users);
    this.logAudit(
      `${actor.fullName} (${actor.username})`,
      'User Status Changed',
      `User '${target.username}' status set to '${target.status}'.`
    );

    return { success: true, message: `User '${target.username}' is now ${target.status}.` };
  }

  // --- OPERATOR SECURITY PIN ---
  public static async verifySecurityPin(enteredPin: string): Promise<boolean> {
    const settings = this.getSettings();
    return CryptoService.verifyHash(enteredPin, settings.securityPinSalt, settings.securityPinHash);
  }

  public static async changeSecurityPin(
    currentPin: string,
    newPin: string,
    actor: UserAccount
  ): Promise<{ success: boolean; message: string }> {
    const isCurrentValid = await this.verifySecurityPin(currentPin);
    if (!isCurrentValid) {
      return { success: false, message: 'Current Operator PIN is incorrect.' };
    }
    if (!newPin || newPin.length < 4 || newPin.length > 8 || !/^\d+$/.test(newPin)) {
      return { success: false, message: 'New PIN must be 4 to 8 numeric digits.' };
    }

    const newSalt = CryptoService.generateSalt();
    const newHash = await CryptoService.hashWithSalt(newPin, newSalt);

    const settings = this.getSettings();
    settings.securityPinHash = newHash;
    settings.securityPinSalt = newSalt;
    this.saveSettings(settings);

    this.logAudit(
      `${actor.fullName} (${actor.username})`,
      'Operator PIN Changed',
      'Operator security PIN was successfully changed. PIN value securely hashed.'
    );

    return { success: true, message: 'Operator Security PIN updated successfully.' };
  }

  public static async adminResetSecurityPin(
    newPin: string,
    adminUser: UserAccount
  ): Promise<{ success: boolean; message: string }> {
    if (adminUser.role !== 'administrator') {
      return { success: false, message: 'Administrative privilege required.' };
    }
    if (!newPin || newPin.length < 4 || newPin.length > 8 || !/^\d+$/.test(newPin)) {
      return { success: false, message: 'New PIN must be 4 to 8 numeric digits.' };
    }

    const newSalt = CryptoService.generateSalt();
    const newHash = await CryptoService.hashWithSalt(newPin, newSalt);

    const settings = this.getSettings();
    settings.securityPinHash = newHash;
    settings.securityPinSalt = newSalt;
    this.saveSettings(settings);

    this.logAudit(
      `${adminUser.fullName} (${adminUser.username})`,
      'Operator PIN Admin Reset',
      'Administrator authorized recovery reset of Operator Security PIN.'
    );

    return { success: true, message: 'Security PIN has been reset by Administrator.' };
  }

  // --- TECHNICIANS & DOCUMENTS ---
  public static getTechnicians(): TechnicianRecord[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.TECHNICIANS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const cleaned = this.cleanOldDemoRecords(parsed);
          let hasMigration = cleaned.length !== parsed.length;

          const normalized: TechnicianRecord[] = cleaned.map(t => {
            let mainCategory: MainCategory = t.mainCategory;
            let partnerType: PartnerType | undefined = t.partnerType;
            let specialization: string | undefined = t.specialization;

            // Detect if this record was stored as a partner type
            const isPartnerEntity = 
              t.entityType === 'service_center' || 
              t.entityType === 'godown' || 
              t.entityType === 'wholesaler';

            const catLower = (t.category || '').toLowerCase();
            const isPartnerCat = 
              catLower.includes('service center') || 
              catLower.includes('godown') || 
              catLower.includes('warehouse') || 
              catLower.includes('wholesaler') ||
              catLower === 'partner';

            if (!mainCategory) {
              hasMigration = true;
              if (isPartnerEntity || isPartnerCat) {
                mainCategory = 'Partner';
              } else {
                mainCategory = 'Technician';
              }
            }

            if (mainCategory === 'Partner') {
              if (!partnerType) {
                hasMigration = true;
                if (t.entityType === 'service_center' || catLower.includes('service center')) {
                  partnerType = 'Service Center';
                } else if (t.entityType === 'godown' || catLower.includes('godown') || catLower.includes('warehouse')) {
                  partnerType = 'Godown / Warehouse';
                } else if (t.entityType === 'wholesaler' || catLower.includes('wholesaler')) {
                  partnerType = 'Wholesaler / Dealer';
                } else {
                  partnerType = 'Other AC/HVAC Business';
                }
              }
            } else {
              // Technician
              if (!specialization && t.category && t.category !== 'Technician' && t.category !== 'Normal AC Technician') {
                specialization = t.category;
              } else if (!specialization) {
                specialization = 'AC Installation & Repair';
              }
            }

            const normalizedCategory = mainCategory; // 'Technician' or 'Partner'
            if (t.category !== normalizedCategory) {
              hasMigration = true;
            }

            return {
              ...t,
              mainCategory,
              category: normalizedCategory,
              partnerType: mainCategory === 'Partner' ? partnerType : undefined,
              specialization: mainCategory === 'Technician' ? specialization : undefined,
              gstNumber: mainCategory === 'Partner' ? t.gstNumber : undefined,
              entityType: mainCategory === 'Partner' 
                ? (t.entityType || (partnerType === 'Service Center' ? 'service_center' : partnerType === 'Godown / Warehouse' ? 'godown' : 'wholesaler')) 
                : 'technician',
            };
          });

          if (hasMigration) {
            this.saveTechnicians(normalized);
          }
          return normalized;
        }
      }
    } catch {
      // ignore
    }
    return [];
  }

  public static saveTechnicians(techs: TechnicianRecord[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.TECHNICIANS, JSON.stringify(techs));
    } catch {
      // ignore
    }
  }

  public static findByApplicationNumber(appNumber: string): TechnicianRecord | undefined {
    const trimmed = appNumber.trim().toUpperCase();
    const techs = this.getTechnicians();
    return techs.find(t => t.applicationNumber.toUpperCase() === trimmed);
  }

  public static updateTechnician(
    updatedTech: TechnicianRecord, 
    auditNote?: string, 
    actorName?: string
  ): TechnicianRecord {
    const techs = this.getTechnicians();
    const index = techs.findIndex(
      t => t.id === updatedTech.id || t.applicationNumber.toUpperCase() === updatedTech.applicationNumber.toUpperCase()
    );
    
    const actor = actorName || 'System';
    const auditEntry: AuditEntry = {
      id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      actor,
      action: auditNote || 'Record Updated',
      details: `Saved changes for ${updatedTech.applicationNumber} (${updatedTech.fullName})`,
    };

    const mainCategory: MainCategory = updatedTech.mainCategory || (updatedTech.partnerType ? 'Partner' : 'Technician');
    const category = mainCategory;

    const techWithAudit: TechnicianRecord = {
      ...updatedTech,
      mainCategory,
      category,
      partnerType: mainCategory === 'Partner' ? (updatedTech.partnerType || 'Service Center') : undefined,
      applicationNumber: updatedTech.applicationNumber.trim().toUpperCase(),
      auditTrail: [auditEntry, ...(updatedTech.auditTrail || [])],
    };

    if (index >= 0) {
      techs[index] = techWithAudit;
    } else {
      techs.unshift(techWithAudit);
    }

    this.saveTechnicians(techs);
    return techWithAudit;
  }

  public static appendDocumentToTechnician(
    appNumber: string, 
    newDoc: AttachedDocument, 
    actorName: string
  ): TechnicianRecord | undefined {
    const techs = this.getTechnicians();
    const index = techs.findIndex(t => t.applicationNumber.toUpperCase() === appNumber.trim().toUpperCase());
    if (index === -1) return undefined;

    const existingTech = techs[index];
    const docWithMeta: AttachedDocument = {
      ...newDoc,
      linkedApplicationNumber: existingTech.applicationNumber,
      technicianName: existingTech.fullName,
    };

    const updatedDocs = [...existingTech.documents, docWithMeta];

    const auditEntry: AuditEntry = {
      id: `aud_${Date.now()}`,
      timestamp: new Date().toISOString(),
      actor: actorName,
      action: 'Document Appended',
      details: `Appended ${newDoc.filename} (${newDoc.docType}) to folder ${existingTech.folderPath}`,
    };

    const updatedTech: TechnicianRecord = {
      ...existingTech,
      documents: updatedDocs,
      auditTrail: [auditEntry, ...existingTech.auditTrail],
    };

    techs[index] = updatedTech;
    this.saveTechnicians(techs);
    return updatedTech;
  }

  public static attachDocumentToRecord(
    appNumber: string,
    newDoc: AttachedDocument,
    actorName: string
  ): { success: boolean; updatedRecord?: TechnicianRecord; message: string } {
    const techs = this.getTechnicians();
    const index = techs.findIndex(t => t.applicationNumber.toUpperCase() === appNumber.trim().toUpperCase());
    if (index === -1) {
      return { success: false, message: `Record with Dossier ID ${appNumber} not found.` };
    }

    const existingTech = techs[index];

    // Check duplicate attachments:
    const isDuplicate = existingTech.documents.some(doc => {
      if (doc.id === newDoc.id) return true;
      if (doc.filename.toLowerCase() === newDoc.filename.toLowerCase()) return true;
      if (doc.docType === 'registration' && newDoc.docType === 'registration' && doc.filename === newDoc.filename) return true;
      return false;
    });

    if (isDuplicate) {
      return {
        success: false,
        message: `This registration form / document is already attached to ${existingTech.applicationNumber}.`,
      };
    }

    const docWithMeta: AttachedDocument = {
      ...newDoc,
      linkedApplicationNumber: existingTech.applicationNumber,
      technicianName: existingTech.fullName,
      virtualPath: `Records/${existingTech.applicationNumber}/${newDoc.filename}`,
    };

    const updatedDocs = [...existingTech.documents, docWithMeta];

    const auditEntry: AuditEntry = {
      id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      actor: actorName,
      action: 'Document Attached to Dossier',
      details: `Attached official document '${docWithMeta.customTitle || docWithMeta.filename}' (${docWithMeta.docType}) to dossier folder`,
    };

    const updatedTech: TechnicianRecord = {
      ...existingTech,
      documents: updatedDocs,
      auditTrail: [auditEntry, ...existingTech.auditTrail],
    };

    techs[index] = updatedTech;
    this.saveTechnicians(techs);
    return {
      success: true,
      updatedRecord: updatedTech,
      message: `Document '${docWithMeta.customTitle || docWithMeta.filename}' attached to ${updatedTech.applicationNumber} successfully.`,
    };
  }

  public static deleteDocumentFromRecord(
    appNumber: string,
    docId: string,
    actorName: string
  ): { success: boolean; updatedRecord?: TechnicianRecord; message: string } {
    const techs = this.getTechnicians();
    const index = techs.findIndex(t => t.applicationNumber.toUpperCase() === appNumber.trim().toUpperCase());
    if (index === -1) {
      return { success: false, message: `Record ${appNumber} not found.` };
    }

    const tech = techs[index];
    const docToDelete = tech.documents.find(d => d.id === docId);
    if (!docToDelete) {
      return { success: false, message: `Document ID '${docId}' not found in record ${appNumber}.` };
    }

    const remainingDocs = tech.documents.filter(d => d.id !== docId);
    const auditEntry: AuditEntry = {
      id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      actor: actorName,
      action: 'Document Deleted',
      details: `Deleted file '${docToDelete.filename}' [${docToDelete.docType}${docToDelete.customTitle ? ` - ${docToDelete.customTitle}` : ''}] from record ${tech.applicationNumber}`,
    };

    const updatedTech: TechnicianRecord = {
      ...tech,
      documents: remainingDocs,
      auditTrail: [auditEntry, ...tech.auditTrail],
    };

    techs[index] = updatedTech;
    this.saveTechnicians(techs);
    this.logAudit(actorName, 'Document Deleted', `Deleted file '${docToDelete.filename}' from record ${tech.applicationNumber}`);

    return { 
      success: true, 
      updatedRecord: updatedTech, 
      message: `Document '${docToDelete.filename}' removed from record ${tech.applicationNumber}.` 
    };
  }

  public static replaceDocumentInRecord(
    appNumber: string,
    oldDocId: string,
    replacementDoc: AttachedDocument,
    actorName: string
  ): { success: boolean; updatedRecord?: TechnicianRecord; message: string } {
    const techs = this.getTechnicians();
    const index = techs.findIndex(t => t.applicationNumber.toUpperCase() === appNumber.trim().toUpperCase());
    if (index === -1) {
      return { success: false, message: `Record ${appNumber} not found.` };
    }

    const tech = techs[index];
    const docIndex = tech.documents.findIndex(d => d.id === oldDocId);
    if (docIndex === -1) {
      return { success: false, message: `Target document ID '${oldDocId}' not found in record ${appNumber}.` };
    }

    const oldDoc = tech.documents[docIndex];
    const updatedDoc: AttachedDocument = {
      ...replacementDoc,
      id: oldDoc.id, // maintain consistent document id
      linkedApplicationNumber: tech.applicationNumber,
      technicianName: tech.fullName,
      virtualPath: `TechnicianFiles/${tech.applicationNumber}/${replacementDoc.filename}`,
    };

    const updatedDocs = [...tech.documents];
    updatedDocs[docIndex] = updatedDoc;

    const auditEntry: AuditEntry = {
      id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      actor: actorName,
      action: 'Document Replaced',
      details: `Replaced file '${oldDoc.filename}' with corrected/updated version '${replacementDoc.filename}' in record ${tech.applicationNumber}`,
    };

    const updatedTech: TechnicianRecord = {
      ...tech,
      documents: updatedDocs,
      auditTrail: [auditEntry, ...tech.auditTrail],
    };

    techs[index] = updatedTech;
    this.saveTechnicians(techs);
    this.logAudit(actorName, 'Document Replaced', `Replaced '${oldDoc.filename}' with '${replacementDoc.filename}' in record ${tech.applicationNumber}`);

    return { 
      success: true, 
      updatedRecord: updatedTech, 
      message: `Document successfully replaced with '${replacementDoc.filename}'.` 
    };
  }

  public static updateProfilePhoto(
    appNumber: string,
    photoDataUrl: string | undefined,
    isBusiness: boolean,
    actorName: string
  ): { success: boolean; updatedRecord?: TechnicianRecord; message: string } {
    const techs = this.getTechnicians();
    const index = techs.findIndex(t => t.applicationNumber.toUpperCase() === appNumber.trim().toUpperCase());
    if (index === -1) {
      return { success: false, message: `Record ${appNumber} not found.` };
    }

    const tech = techs[index];
    const fieldName = isBusiness ? 'businessPhotoUrl' : 'photoUrl';
    const actionLabel = photoDataUrl 
      ? (isBusiness ? 'Business Photo/Logo Uploaded' : 'Profile Photograph Uploaded')
      : (isBusiness ? 'Business Photo/Logo Removed' : 'Profile Photograph Removed');

    const auditEntry: AuditEntry = {
      id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      actor: actorName,
      action: actionLabel,
      details: `${actionLabel} for ${tech.mainCategory || 'record'} ${tech.applicationNumber} (${tech.fullName})`,
    };

    const updatedTech: TechnicianRecord = {
      ...tech,
      [fieldName]: photoDataUrl || undefined,
      auditTrail: [auditEntry, ...tech.auditTrail],
    };

    techs[index] = updatedTech;
    this.saveTechnicians(techs);
    this.logAudit(actorName, actionLabel, `Updated visual media for ${tech.applicationNumber}`);

    return {
      success: true,
      updatedRecord: updatedTech,
      message: photoDataUrl ? 'Photograph updated successfully.' : 'Photograph removed.',
    };
  }

  public static deleteTechnician(
    idOrAppNumber: string, 
    actorName: string, 
    permanent: boolean = false, 
    reason?: string
  ): { success: boolean; message: string; recordName?: string } {
    const techs = this.getTechnicians();
    const index = techs.findIndex(
      t => t.id === idOrAppNumber || t.applicationNumber.toUpperCase() === idOrAppNumber.trim().toUpperCase()
    );
    if (index === -1) return { success: false, message: 'Record not found.' };

    const target = techs[index];
    const docCount = target.documents?.length || 0;

    if (permanent) {
      // Permanent removal
      const filtered = techs.filter((_, i) => i !== index);
      this.saveTechnicians(filtered);
      this.logAudit(
        actorName, 
        `${target.mainCategory || 'Technician'} Permanently Deleted`, 
        `Permanently deleted record ${target.applicationNumber} (${target.fullName}) with ${docCount} associated documents.`
      );
      return { 
        success: true, 
        message: `Permanently removed record ${target.applicationNumber} (${target.fullName}).`, 
        recordName: target.fullName 
      };
    } else {
      // Archive / Soft delete (preserves audit history and records compliance)
      const auditEntry: AuditEntry = {
        id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        timestamp: new Date().toISOString(),
        actor: actorName,
        action: 'Record Archived / Deactivated',
        details: `Record placed in inactive archive. Reason: ${reason || 'Administrative archiving'}.`,
      };
      target.isArchived = true;
      target.archivedAt = new Date().toISOString();
      target.archivedReason = reason || 'Administrative archival';
      target.auditTrail = [auditEntry, ...(target.auditTrail || [])];
      techs[index] = target;
      this.saveTechnicians(techs);
      this.logAudit(
        actorName,
        `${target.mainCategory || 'Technician'} Archived`,
        `Archived record ${target.applicationNumber} (${target.fullName}).`
      );
      return { 
        success: true, 
        message: `Record ${target.applicationNumber} (${target.fullName}) has been archived.`,
        recordName: target.fullName
      };
    }
  }

  // --- EXISTING FILES REPOSITORY ---
  public static getStandaloneDocuments(): AttachedDocument[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.STANDALONE_DOCS);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch {
      // ignore
    }
    return [];
  }

  public static saveStandaloneDocuments(docs: AttachedDocument[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.STANDALONE_DOCS, JSON.stringify(docs));
    } catch {
      // ignore
    }
  }

  public static getAllDocuments(): AttachedDocument[] {
    const techs = this.getTechnicians();
    const allLinkedDocs = techs.flatMap(t => 
      (t.documents || []).map(d => ({
        ...d,
        linkedApplicationNumber: t.applicationNumber,
        technicianName: t.fullName,
      }))
    );
    const standalone = this.getStandaloneDocuments();
    return [...allLinkedDocs, ...standalone];
  }

  public static detectDuplicateDocument(checksum: string, filename: string): AttachedDocument | undefined {
    const all = this.getAllDocuments();
    return all.find(d => d.checksum === checksum || d.filename.toLowerCase() === filename.toLowerCase());
  }

  public static linkExistingDocumentToTechnician(
    doc: AttachedDocument,
    targetAppNumber: string,
    actorName: string
  ): { success: boolean; message: string } {
    const tech = this.findByApplicationNumber(targetAppNumber);
    if (!tech) {
      return { success: false, message: `Technician ${targetAppNumber} not found.` };
    }

    // Check if doc is already in technician's documents
    const exists = tech.documents.some(d => d.checksum === doc.checksum || d.filename === doc.filename);
    if (exists) {
      return { success: false, message: `Document '${doc.filename}' is already linked to ${targetAppNumber}.` };
    }

    const updatedDoc: AttachedDocument = {
      ...doc,
      linkedApplicationNumber: tech.applicationNumber,
      technicianName: tech.fullName,
      virtualPath: `TechnicianFiles/${tech.applicationNumber}/${doc.filename}`,
    };

    this.appendDocumentToTechnician(tech.applicationNumber, updatedDoc, actorName);

    // Remove from standalone if it was there
    const standalone = this.getStandaloneDocuments().filter(d => d.id !== doc.id && d.checksum !== doc.checksum);
    this.saveStandaloneDocuments(standalone);

    return { success: true, message: `Document '${doc.filename}' successfully linked to ${tech.applicationNumber}.` };
  }

  // --- AUDIT LOGS ---
  public static getAuditLog(): AuditEntry[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.AUDIT_LOG);
      if (raw) return JSON.parse(raw);
    } catch {
      // ignore
    }
    return [];
  }

  public static logAudit(actor: string, action: string, details: string): void {
    const entry: AuditEntry = {
      id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      actor,
      action,
      details,
    };
    try {
      const existing = this.getAuditLog();
      const updated = [entry, ...existing.slice(0, 499)];
      localStorage.setItem(STORAGE_KEYS.AUDIT_LOG, JSON.stringify(updated));
    } catch {
      // ignore
    }
  }

  // --- BACKUP & RESTORE ---
  public static createBackup(): BackupSnapshot {
    const techs = this.getTechnicians();
    const standaloneDocs = this.getStandaloneDocuments();
    const users = this.getUsers();
    const settings = this.getSettings();
    const totalDocs = techs.reduce((acc, t) => acc + (t.documents?.length || 0), 0) + standaloneDocs.length;
    const totalKb = techs.reduce((acc, t) => acc + (t.documents?.reduce((dAcc, d) => dAcc + d.fileSizeKb, 0) || 0), 0);
    
    const snapshot: BackupSnapshot = {
      version: '2.0.0-win64-production',
      createdAt: new Date().toISOString(),
      systemName: 'ORACLIME Technician DMS',
      technicianCount: techs.length,
      totalDocumentsCount: totalDocs,
      totalStorageKb: totalKb + 2048,
      technicians: techs,
      standaloneDocuments: standaloneDocs,
      users,
      settings,
      checksum: `sha256-bkp-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`,
    };

    settings.lastBackupDate = snapshot.createdAt;
    this.saveSettings(settings);

    return snapshot;
  }

  public static restoreBackup(
    snapshot: BackupSnapshot, 
    actorName: string
  ): { success: boolean; message: string; count: number } {
    if (!snapshot || !Array.isArray(snapshot.technicians)) {
      return { success: false, message: 'Invalid backup file structure: missing technician records array.', count: 0 };
    }

    // Merge or replace
    this.saveTechnicians(snapshot.technicians);

    if (Array.isArray(snapshot.standaloneDocuments)) {
      this.saveStandaloneDocuments(snapshot.standaloneDocuments);
    }

    if (Array.isArray(snapshot.users) && snapshot.users.length > 0) {
      this.saveUsers(snapshot.users);
    }

    if (snapshot.settings) {
      this.saveSettings({
        ...this.getSettings(),
        ...snapshot.settings,
      });
    }

    this.logAudit(
      actorName, 
      'System Restore Completed', 
      `Restored ${snapshot.technicians.length} technician records and indexed documents from backup.`
    );

    return {
      success: true,
      message: `Successfully restored ${snapshot.technicians.length} technician records and indexed documents.`,
      count: snapshot.technicians.length,
    };
  }
}
