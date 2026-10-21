/**
 * ORACLIME Technician & Partner Digital File Management System
 * Core Data Models & Types - Production Edition
 */

export type VerificationStatus = 'verified' | 'pending_review' | 'flagged_handwritten' | 'rejected';

// Primary categories strictly conform to requirements: Technician or Partners
export type MainCategory = 'Technician' | 'Partner';

// Secondary types for business partners
export type PartnerType = 
  | 'Service Center' 
  | 'Godown / Warehouse' 
  | 'Wholesaler / Dealer' 
  | 'Other AC/HVAC Business';

export type RecordEntityType = 'technician' | 'service_center' | 'godown' | 'wholesaler';

export type DocumentType = 
  | 'bank_account'
  | 'aadhaar' 
  | 'pan_card'
  | 'gst_certificate'
  | 'agreement'
  | 'registration' 
  | 'certificates' 
  | 'photo' 
  | 'experience' 
  | 'police_verification'
  | 'other';

export type TechnicianCategory = 
  | 'Technician'
  | 'Partner'
  | 'Normal AC Technician'
  | 'AC Installation & Repair'
  | 'Senior AC Technician'
  | 'Authorized Service Center'
  | 'Godown & Warehouse'
  | 'AC Parts & Equipment Wholesaler'
  | string;

export interface BankAccountDetails {
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  accountHolderName: string;
  branchName?: string;
  upiId?: string;
}

export interface BoundingBox {
  id: string;
  field: string;
  label: string;
  value: string;
  confidence: number;
  isHandwritten?: boolean;
  box: {
    top: number; // percentage
    left: number; // percentage
    width: number; // percentage
    height: number; // percentage
  };
}

export interface AttachedDocument {
  id: string;
  filename: string;
  customTitle?: string; // User-defined display name e.g. "Technician Trade Certificate"
  docType: DocumentType;
  virtualPath: string; // e.g. "TechnicianFiles/UPMBD260001/bank_passbook.pdf"
  fileSizeKb: number;
  pageCount: number;
  checksum: string; // SHA-256
  importDate: string;
  isScanned: boolean;
  ocrConfidence: number; // 0-100
  ocrEngine: 'PyMuPDF Direct' | 'Tesseract OCR v5';
  extractedText: string;
  isRestricted?: boolean; // For Aadhaar / Identity
  boundingBoxes?: BoundingBox[];
  uploadedBlobData?: string; // Data URL or Base64 of original file
  linkedApplicationNumber?: string;
  technicianName?: string;
  fileMimeType?: string;
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  details: string;
}

export interface TechnicianRecord {
  id: string;
  // A. Entity & Registration
  mainCategory: MainCategory; // Primary: 'Technician' or 'Partner'
  partnerType?: PartnerType;   // Secondary: If Partner ('Service Center', 'Godown / Warehouse', etc.)
  specialization?: string;     // Secondary: If Technician ('Installation & Repair', 'Commercial Chillers', etc.)
  entityType?: RecordEntityType; // Legacy compatibility
  applicationNumber: string; // Unique primary search key
  registrationDate: string;
  status: VerificationStatus;
  district: string;
  category: string; // 'Technician' or 'Partner' (normalized)

  // B. Personal / Firm Details
  fullName: string; // Technician Name OR Business/Shop/Godown Name
  contactPerson?: string; // For Service Center, Godown, Wholesaler
  fatherName?: string;
  mobile: string;
  alternateMobile?: string;
  email?: string;
  address: string;
  dob?: string;
  aadhaarNumber?: string; // Masked e.g. "XXXX-XXXX-1234"
  unmaskedAadhaar?: string; // Secure identifier
  panNumber?: string;
  gstNumber?: string;

  // C. Bank Account Details (Net Banking / Passbook / Cancelled Cheque)
  bankDetails?: BankAccountDetails;

  // D. Professional / Facility Details
  skills?: string[];
  experienceYears?: number;
  certifications?: string[];
  trainingDetails?: string;
  capacityOrCoverage?: string;

  // E. Documents
  documents: AttachedDocument[];
  folderPath: string; // e.g. "ORACLIME_DMS/Records/UPMBD260001/"

  // F. Verification Metadata
  reviewer?: string;
  verificationDate?: string;
  correctedFields?: string[];
  verificationNotes?: string;
  auditTrail: AuditEntry[];

  // G. Visual Media & Archival Lifecycle
  photoUrl?: string; // Base64 data URL for technician profile photo
  businessPhotoUrl?: string; // Base64 data URL for partner store/logo image
  isArchived?: boolean; // Soft-delete / deactivated archive flag
  archivedAt?: string;
  archivedReason?: string;
}

export type UserRole = 'super_admin' | 'administrator' | 'operator';
export type UserStatus = 'active' | 'deactivated';

export interface UserPermissions {
  canManageUsers: boolean;
  canEditRecords: boolean;
  canDeleteRecords: boolean;
  canVerifyDocuments: boolean;
  canExportBackup: boolean;
  canUnmaskAadhaar: boolean;
}

export interface UserAccount {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  status: UserStatus;
  permissions?: UserPermissions;
  mustChangePassword?: boolean;
  passwordHash: string; // SHA-256 hash
  salt: string;
  createdAt: string;
  lastLogin?: string;
}

export interface SystemSettings {
  operatorName: string;
  operatorId: string;
  securityPinHash: string; // SHA-256 hash
  securityPinSalt: string;
  baseStoragePath: string; // "C:/ORACLIME_DMS"
  ocrLanguages: string[]; // ["eng", "hin"]
  autoLockMinutes: number;
  isLocked: boolean;
  backupAutoSchedule: 'daily' | 'weekly' | 'manual';
  lastBackupDate?: string;
  initialSetupCompleted: boolean;
}

export interface BackupSnapshot {
  version: string;
  createdAt: string;
  systemName: string;
  technicianCount: number;
  totalDocumentsCount: number;
  totalStorageKb: number;
  technicians: TechnicianRecord[];
  users?: UserAccount[];
  settings?: SystemSettings;
  standaloneDocuments?: AttachedDocument[];
  checksum: string;
}
