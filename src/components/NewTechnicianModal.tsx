import React, { useState, useEffect } from 'react';
import { 
  UserPlus, 
  X, 
  Save, 
  AlertCircle, 
  FileText, 
  Upload, 
  Plus, 
  Building2, 
  Warehouse, 
  Store, 
  Wrench, 
  CreditCard 
} from 'lucide-react';
import { 
  TechnicianRecord, 
  UserAccount, 
  DocumentType, 
  AttachedDocument, 
  RecordEntityType,
  BankAccountDetails,
  MainCategory,
  PartnerType
} from '../types/dms';
import { StorageService } from '../services/storageService';
import { CryptoService } from '../services/cryptoService';

interface NewTechnicianModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTechnicianCreated: (tech: TechnicianRecord) => void;
  currentUser: UserAccount;
  initialMainCategory?: MainCategory;
  initialPartnerType?: PartnerType;
}

export const NewTechnicianModal: React.FC<NewTechnicianModalProps> = ({
  isOpen,
  onClose,
  onTechnicianCreated,
  currentUser,
  initialMainCategory = 'Technician',
  initialPartnerType = 'Service Center',
}) => {
  // Main Category: 'Technician' or 'Partner'
  const [mainCategory, setMainCategory] = useState<MainCategory>(initialMainCategory);
  
  // Secondary Partner Type if Partner
  const [partnerType, setPartnerType] = useState<PartnerType>(initialPartnerType);

  // Secondary specialization if Technician
  const [specialization, setSpecialization] = useState<string>('AC Installation & Maintenance');

  // Identification & basic details
  const [appNumber, setAppNumber] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');
  const [contactPerson, setContactPerson] = useState<string>('');
  const [fatherName, setFatherName] = useState<string>('');
  const [mobile, setMobile] = useState<string>('');
  const [alternateMobile, setAlternateMobile] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [district, setDistrict] = useState<string>('Moradabad');
  const [address, setAddress] = useState<string>('');
  const [dob, setDob] = useState<string>('');
  const [aadhaar, setAadhaar] = useState<string>('');
  const [panNumber, setPanNumber] = useState<string>('');
  const [gstNumber, setGstNumber] = useState<string>('');
  const [capacityOrCoverage, setCapacityOrCoverage] = useState<string>('');

  // Bank Account details
  const [bankName, setBankName] = useState<string>('');
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [ifscCode, setIfscCode] = useState<string>('');
  const [accountHolderName, setAccountHolderName] = useState<string>('');
  const [branchName, setBranchName] = useState<string>('');
  const [upiId, setUpiId] = useState<string>('');

  // Qualifications / skills (for technician)
  const [skills, setSkills] = useState<string>('Split & Inverter AC Installation, Gas Charging R32/R410A, Copper Piping');
  const [experienceYears, setExperienceYears] = useState<number>(3);
  const [certifications, setCertifications] = useState<string>('HVAC Trade Certification, ITI Refrigeration');
  const [trainingDetails, setTrainingDetails] = useState<string>('Industrial Training Institute');
  
  const [attachedFiles, setAttachedFiles] = useState<{
    file: File;
    docType: DocumentType;
  }[]>([]);

  const [error, setError] = useState<string>('');

  // Sync initial category when opening
  useEffect(() => {
    setMainCategory(initialMainCategory);
    setPartnerType(initialPartnerType);
    if (initialMainCategory === 'Technician') {
      setAppNumber(`TECH-${Math.floor(1000 + Math.random() * 9000)}`);
    } else {
      setAppNumber(`PART-${Math.floor(1000 + Math.random() * 9000)}`);
    }
  }, [initialMainCategory, initialPartnerType, isOpen]);

  if (!isOpen) return null;

  const handleMainCategoryChange = (newCat: MainCategory) => {
    setMainCategory(newCat);
    if (newCat === 'Technician') {
      if (!appNumber || appNumber.startsWith('PART-')) {
        setAppNumber(`TECH-${Math.floor(1000 + Math.random() * 9000)}`);
      }
    } else {
      if (!appNumber || appNumber.startsWith('TECH-')) {
        setAppNumber(`PART-${Math.floor(1000 + Math.random() * 9000)}`);
      }
    }
  };

  const handleFileAdd = (e: React.ChangeEvent<HTMLInputElement>, type: DocumentType) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      setError(`File '${file.name}' exceeds the 25MB limit.`);
      return;
    }

    setAttachedFiles(prev => [...prev, { file, docType: type }]);
  };

  const removeFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanAppNumber = appNumber.trim().toUpperCase();
    if (!cleanAppNumber) {
      setError('Please provide an Application / Dossier Number.');
      return;
    }

    // Check for duplicate application number
    const existing = StorageService.findByApplicationNumber(cleanAppNumber);
    if (existing) {
      setError(`Application number '${cleanAppNumber}' already exists in the system database.`);
      return;
    }

    if (!fullName.trim()) {
      setError(`Please enter the ${mainCategory === 'Technician' ? 'Technician Full Name' : 'Business Firm Name'}.`);
      return;
    }

    if (!mobile.trim() || mobile.trim().length < 10) {
      setError('Please enter a valid 10-digit primary mobile contact number.');
      return;
    }

    // Process attached documents
    const documents: AttachedDocument[] = [];
    for (const item of attachedFiles) {
      const buffer = await item.file.arrayBuffer();
      const checksum = await CryptoService.computeChecksum(buffer);
      
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(item.file);
      });

      documents.push({
        id: `doc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        filename: item.file.name,
        customTitle: item.docType === 'bank_account' 
          ? 'Bank Passbook / Cheque'
          : item.docType === 'gst_certificate' 
          ? 'GST Certificate'
          : item.docType === 'registration' 
          ? `${mainCategory} Registration Form`
          : item.file.name,
        docType: item.docType,
        virtualPath: `Records/${cleanAppNumber}/${item.file.name}`,
        fileSizeKb: Math.max(1, Math.round(item.file.size / 1024)),
        pageCount: 1,
        checksum,
        importDate: new Date().toISOString(),
        isScanned: false,
        ocrConfidence: 99,
        ocrEngine: 'PyMuPDF Direct',
        extractedText: `OFFICIAL RECORD: ${item.file.name}\nRecord ID: ${cleanAppNumber}\nEntity: ${fullName}\nType: ${item.docType}`,
        uploadedBlobData: dataUrl,
        linkedApplicationNumber: cleanAppNumber,
        technicianName: fullName,
        fileMimeType: item.file.type || 'application/pdf',
      });
    }

    const maskedAadhaar = aadhaar ? `XXXX-XXXX-${aadhaar.replace(/\D/g, '').slice(-4) || '0000'}` : undefined;

    const bankDetails: BankAccountDetails | undefined = (bankName || accountNumber || ifscCode) ? {
      bankName: bankName.trim(),
      accountNumber: accountNumber.trim(),
      ifscCode: ifscCode.trim().toUpperCase(),
      accountHolderName: accountHolderName.trim() || fullName.trim(),
      branchName: branchName.trim(),
      upiId: upiId.trim(),
    } : undefined;

    const legacyEntityType: RecordEntityType = mainCategory === 'Technician' 
      ? 'technician' 
      : partnerType === 'Service Center' ? 'service_center' 
      : partnerType === 'Godown / Warehouse' ? 'godown' 
      : 'wholesaler';

    const newRecord: TechnicianRecord = {
      id: `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      mainCategory,
      partnerType: mainCategory === 'Partner' ? partnerType : undefined,
      specialization: mainCategory === 'Technician' ? specialization : undefined,
      entityType: legacyEntityType,
      applicationNumber: cleanAppNumber,
      registrationDate: new Date().toISOString().split('T')[0],
      status: 'verified',
      district,
      category: mainCategory, // 'Technician' or 'Partner'
      fullName: fullName.trim(),
      contactPerson: contactPerson.trim() || undefined,
      fatherName: fatherName.trim() || undefined,
      mobile: mobile.trim(),
      alternateMobile: alternateMobile.trim() || undefined,
      email: email.trim() || undefined,
      address: address.trim(),
      dob: mainCategory === 'Technician' ? (dob || undefined) : undefined,
      aadhaarNumber: mainCategory === 'Technician' ? maskedAadhaar : undefined,
      unmaskedAadhaar: mainCategory === 'Technician' ? (aadhaar || undefined) : undefined,
      panNumber: panNumber.trim().toUpperCase() || undefined,
      gstNumber: mainCategory === 'Partner' ? (gstNumber.trim().toUpperCase() || undefined) : undefined,
      bankDetails,
      skills: mainCategory === 'Technician' ? skills.split(',').map(s => s.trim()).filter(Boolean) : undefined,
      experienceYears: mainCategory === 'Technician' ? (Number(experienceYears) || 0) : undefined,
      certifications: mainCategory === 'Technician' ? certifications.split(',').map(s => s.trim()).filter(Boolean) : undefined,
      trainingDetails: mainCategory === 'Technician' ? trainingDetails : undefined,
      capacityOrCoverage: capacityOrCoverage.trim() || undefined,
      documents,
      folderPath: `ORACLIME_DMS/Records/${cleanAppNumber}/`,
      reviewer: `${currentUser.fullName} (${currentUser.role})`,
      verificationDate: new Date().toISOString(),
      correctedFields: [],
      verificationNotes: `Direct registration recorded by ${currentUser.fullName}.`,
      auditTrail: [
        {
          id: `aud_${Date.now()}`,
          timestamp: new Date().toISOString(),
          actor: `${currentUser.fullName} (${currentUser.username})`,
          action: 'Initial Registration',
          details: `Enrolled ${mainCategory} record: ${cleanAppNumber} (${fullName}) with ${documents.length} attached documents.`,
        }
      ]
    };

    const saved = StorageService.updateTechnician(
      newRecord, 
      `Initial ${mainCategory} Record Created`, 
      `${currentUser.fullName} (${currentUser.username})`
    );

    onTechnicianCreated(saved);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col text-slate-100 my-8 font-sans">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-cyan-400" />
            <div>
              <h2 className="text-base font-bold text-white">
                {mainCategory === 'Technician' ? 'Enroll New Technician' : 'Enroll Business Partner'}
              </h2>
              <p className="text-[11px] text-slate-400 font-mono">
                {mainCategory === 'Technician' 
                  ? 'Technician dossier: personal details, banking information & trade qualifications'
                  : 'Partner dossier: commercial details, partner type, GSTIN & settlement banking'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[82vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-950/80 border border-rose-800 rounded-lg text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Main Category Selection Tabs: Technician vs Partners */}
          <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
              1. Primary Category Selection <span className="text-rose-400">*</span>
            </label>
            
            <div className="grid grid-cols-2 gap-3">
              {/* Category Tab 1: Technician */}
              <button
                type="button"
                onClick={() => handleMainCategoryChange('Technician')}
                className={`p-3.5 rounded-lg border text-left transition-all cursor-pointer flex items-center gap-3 ${
                  mainCategory === 'Technician'
                    ? 'bg-cyan-950/80 border-cyan-500 text-white shadow-md'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className={`p-2 rounded-lg ${mainCategory === 'Technician' ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">Technician</h4>
                  <p className="text-[11px] text-slate-400">AC Installation, Repair & Field Mechanics</p>
                </div>
              </button>

              {/* Category Tab 2: Partners */}
              <button
                type="button"
                onClick={() => handleMainCategoryChange('Partner')}
                className={`p-3.5 rounded-lg border text-left transition-all cursor-pointer flex items-center gap-3 ${
                  mainCategory === 'Partner'
                    ? 'bg-indigo-950/80 border-indigo-500 text-white shadow-md'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className={`p-2 rounded-lg ${mainCategory === 'Partner' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">Partners</h4>
                  <p className="text-[11px] text-slate-400">Service Centers, Godowns, Wholesalers & Dealers</p>
                </div>
              </button>
            </div>

            {/* Secondary Field: Partner Type (if Partner) */}
            {mainCategory === 'Partner' && (
              <div className="pt-2 border-t border-slate-800/80">
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 font-mono">
                  Partner Type (Secondary Classification):
                </label>
                <select
                  value={partnerType}
                  onChange={(e) => setPartnerType(e.target.value as PartnerType)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                >
                  <option value="Service Center">Authorized Service Center</option>
                  <option value="Godown / Warehouse">Godown / Warehouse Facility</option>
                  <option value="Wholesaler / Dealer">Wholesaler / Equipment Dealer</option>
                  <option value="Other AC/HVAC Business">Other AC/HVAC Business & Organization</option>
                </select>
              </div>
            )}

            {/* Secondary Field: Specialization (if Technician) */}
            {mainCategory === 'Technician' && (
              <div className="pt-2 border-t border-slate-800/80">
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 font-mono">
                  Technician Specialization (Secondary Field):
                </label>
                <select
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                >
                  <option value="AC Installation & Maintenance">General AC Installation & Maintenance</option>
                  <option value="Inverter & Split AC Specialist">Inverter & Split AC Specialist</option>
                  <option value="Commercial Chiller Mechanic">Commercial Chiller & Package Units</option>
                  <option value="Copper Piping & Brazing Expert">Copper Piping & Structural Brazing</option>
                  <option value="Senior Diagnostic Lead">Senior Diagnostic Lead Mechanic</option>
                </select>
              </div>
            )}
          </div>

          {/* Section 2: Identification & Basic Info */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider font-mono border-b border-slate-800 pb-2">
              2. Entity Identification & Contact Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
              <div>
                <label className="block text-slate-400 mb-1">
                  Application / Dossier No. <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={appNumber}
                  onChange={(e) => setAppNumber(e.target.value)}
                  placeholder="e.g. TECH-1001"
                  className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-white font-bold focus:outline-none focus:border-cyan-500 uppercase"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-slate-400 mb-1">
                  {mainCategory === 'Technician' ? 'Full Name of Technician' : 'Registered Firm / Entity Name'}{' '}
                  <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={mainCategory === 'Technician' ? 'e.g. Mohd Rashid Khan' : 'e.g. Al-Madina Air Conditioning & Spare Godown'}
                  className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-white font-sans text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>

              {mainCategory === 'Partner' ? (
                <div>
                  <label className="block text-slate-400 mb-1">Contact Person & Designation</label>
                  <input
                    type="text"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder="e.g. Imran Ansari (Proprietor)"
                    className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-white font-sans text-xs focus:outline-none focus:border-cyan-500"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-slate-400 mb-1">Father's Name</label>
                  <input
                    type="text"
                    value={fatherName}
                    onChange={(e) => setFatherName(e.target.value)}
                    placeholder="e.g. Abdul Hameed"
                    className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-white font-sans text-xs focus:outline-none focus:border-cyan-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-slate-400 mb-1">
                  Primary Mobile Number <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="e.g. 9837123456"
                  className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Alternate Phone / WhatsApp</label>
                <input
                  type="text"
                  value={alternateMobile}
                  onChange={(e) => setAlternateMobile(e.target.value)}
                  placeholder="e.g. 9412000000"
                  className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">District / Region</label>
                <input
                  type="text"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  placeholder="e.g. Moradabad"
                  className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Official Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contact@example.com"
                  className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              {mainCategory === 'Partner' ? (
                <div>
                  <label className="block text-slate-400 mb-1">GSTIN Number (Optional)</label>
                  <input
                    type="text"
                    value={gstNumber}
                    onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                    placeholder="e.g. 09ABCDE1234F1Z5"
                    className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-white uppercase focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-slate-400 mb-1">Date of Birth</label>
                    <input
                      type="date"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Aadhaar Card Number</label>
                    <input
                      type="text"
                      value={aadhaar}
                      onChange={(e) => setAadhaar(e.target.value)}
                      placeholder="12 digit number"
                      className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-mono"
                    />
                  </div>
                </>
              )}

              <div className="md:col-span-3">
                <label className="block text-slate-400 mb-1">Full Street Address & Landmark</label>
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Complete address with PIN code..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-white font-sans text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Bank Account Details */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider font-mono border-b border-slate-800 pb-2 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-400" />
              <span>3. Bank Account & Settlement Details</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
              <div>
                <label className="block text-slate-400 mb-1">Bank Name</label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="e.g. State Bank of India"
                  className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-sans"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Account Number</label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="e.g. 30291827364"
                  className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">IFSC Code</label>
                <input
                  type="text"
                  value={ifscCode}
                  onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                  placeholder="e.g. SBIN0001234"
                  className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-white uppercase focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Account Holder Name</label>
                <input
                  type="text"
                  value={accountHolderName}
                  onChange={(e) => setAccountHolderName(e.target.value)}
                  placeholder={fullName || 'Name as in Passbook'}
                  className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-sans"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Branch Name</label>
                <input
                  type="text"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  placeholder="e.g. Civil Lines Branch"
                  className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-sans"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">UPI ID (Optional)</label>
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="e.g. 9837123456@sbi"
                  className="w-full bg-slate-950 border border-slate-700 rounded-md px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Document Attachments */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider font-mono border-b border-slate-800 pb-2 flex items-center gap-2">
              <Upload className="w-4 h-4 text-amber-400" />
              <span>4. Attach Genuine Supporting Files & Passbook</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Passbook / Cheque Upload */}
              <label className="border border-dashed border-slate-700 hover:border-cyan-500 rounded-lg p-3 text-center cursor-pointer bg-slate-950/60 block">
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => handleFileAdd(e, 'bank_account')}
                  className="hidden"
                />
                <CreditCard className="w-5 h-5 mx-auto text-emerald-400 mb-1" />
                <span className="block text-xs font-bold text-white">Bank Passbook / Cheque</span>
                <span className="block text-[10px] text-slate-400">PDF or Scanned Copy</span>
              </label>

              {/* ID / Aadhaar / GST */}
              <label className="border border-dashed border-slate-700 hover:border-cyan-500 rounded-lg p-3 text-center cursor-pointer bg-slate-950/60 block">
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => handleFileAdd(e, mainCategory === 'Technician' ? 'aadhaar' : 'gst_certificate')}
                  className="hidden"
                />
                <FileText className="w-5 h-5 mx-auto text-cyan-400 mb-1" />
                <span className="block text-xs font-bold text-white">
                  {mainCategory === 'Technician' ? 'Aadhaar / ID Card' : 'GST / Trade License'}
                </span>
                <span className="block text-[10px] text-slate-400">Government Certificate</span>
              </label>

              {/* Registration / Agreement */}
              <label className="border border-dashed border-slate-700 hover:border-cyan-500 rounded-lg p-3 text-center cursor-pointer bg-slate-950/60 block">
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => handleFileAdd(e, mainCategory === 'Technician' ? 'registration' : 'agreement')}
                  className="hidden"
                />
                <FileText className="w-5 h-5 mx-auto text-indigo-400 mb-1" />
                <span className="block text-xs font-bold text-white">
                  {mainCategory === 'Technician' ? 'Signed Registration Form' : 'Signed Partner SLA'}
                </span>
                <span className="block text-[10px] text-slate-400">Completed Enrollment PDF</span>
              </label>
            </div>

            {/* Attached files list */}
            {attachedFiles.length > 0 && (
              <div className="space-y-1.5 pt-2">
                <span className="text-[11px] font-mono text-slate-400 block">Attached Documents ({attachedFiles.length}):</span>
                {attachedFiles.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800 text-xs font-mono">
                    <span className="text-cyan-300 font-bold truncate max-w-[320px]">{item.file.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 uppercase">
                        {item.docType}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeFile(idx)}
                        className="text-rose-400 hover:text-rose-300 p-1"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Bar */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save & Register {mainCategory}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
