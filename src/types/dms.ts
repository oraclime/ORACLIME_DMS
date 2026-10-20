/**
 * ORACLIME Technician Digital File Management System
 * Core Data Models & Types - Production Edition
 */

export type VerificationStatus = 'verified' | 'pending_review' | 'flagged_handwritten' | 'rejected';

export type DocumentType = 
  | 'registration' 
  | 'aadhaar' 
  | 'certificates' 
  | 'photo' 
  | 'experience' 
  | 'police_verification'
  | 'other';

export type TechnicianCategory = 
  | 'HVAC & RAC Technician'
  | 'Commercial Chiller Specialist'
  | 'Inverter AC & VRF Expert'
  | 'Cold Chain & Refrigeration'
  | 'Electrical & Controls'
  | 'General Appliances & RAC';

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
  docType: DocumentType;
  virtualPath: string; // e.g. "TechnicianFiles/UPMBD260001/registration.pdf"
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
  // A. Registration
  applicationNumber: string; // Unique primary search key
  registrationDate: string;
  status: VerificationStatus;
  district: string;
  category: TechnicianCategory;

  // B. Personal Details
  fullName: string;
  fatherName: string;
  mobile: string;
  email?: string;
  address: string;
  dob: string;
  aadhaarNumber: string; // Masked e.g. "XXXX-XXXX-1234"
  unmaskedAadhaar?: string; // Secure identifier

  // C. Professional Details
  skills: string[];
  experienceYears: number;
  certifications: string[];
  trainingDetails: string;

  // D. Documents
  documents: AttachedDocument[];
  folderPath: string; // e.g. "ORACLIME_DMS/TechnicianFiles/UPMBD260001/"

  // E. Verification Metadata
  reviewer?: string;
  verificationDate?: string;
  correctedFields: string[];
  verificationNotes?: string;
  auditTrail: AuditEntry[];
}

export type UserRole = 'administrator' | 'operator';
export type UserStatus = 'active' | 'deactivated';

export interface UserAccount {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  status: UserStatus;
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
