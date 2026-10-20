import React, { useState } from 'react';
import { UserPlus, X, Save, AlertCircle, FileText, Upload, Plus } from 'lucide-react';
import { TechnicianCategory, TechnicianRecord, UserAccount, DocumentType, AttachedDocument } from '../types/dms';
import { StorageService } from '../services/storageService';
import { CryptoService } from '../services/cryptoService';

interface NewTechnicianModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTechnicianCreated: (tech: TechnicianRecord) => void;
  currentUser: UserAccount;
}

export const NewTechnicianModal: React.FC<NewTechnicianModalProps> = ({
  isOpen,
  onClose,
  onTechnicianCreated,
  currentUser,
}) => {
  const [appNumber, setAppNumber] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');
  const [fatherName, setFatherName] = useState<string>('');
  const [mobile, setMobile] = useState<string>('');
  const [district, setDistrict] = useState<string>('Moradabad');
  const [category, setCategory] = useState<TechnicianCategory>('HVAC & RAC Technician');
  const [address, setAddress] = useState<string>('');
  const [dob, setDob] = useState<string>('');
  const [aadhaar, setAadhaar] = useState<string>('');
  const [skills, setSkills] = useState<string>('Split & Window AC Installation, Inverter Diagnostics, Gas Charging R32');
  const [experienceYears, setExperienceYears] = useState<number>(3);
  const [certifications, setCertifications] = useState<string>('ITI RAC Trade Certificate');
  const [trainingDetails, setTrainingDetails] = useState<string>('Industrial Training Institute');
  
  const [attachedFiles, setAttachedFiles] = useState<{
    file: File;
    docType: DocumentType;
  }[]>([]);

  const [error, setError] = useState<string>('');

  if (!isOpen) return null;

  const handleAddFile = (e: React.ChangeEvent<HTMLInputElement>, docType: DocumentType) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAttachedFiles(prev => [...prev, { file, docType }]);
  };

  const handleRemoveFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanAppNumber = appNumber.trim().toUpperCase();
    if (!cleanAppNumber || cleanAppNumber.length < 4) {
      setError('Please provide a valid Application Number (e.g. UPMBD260001).');
      return;
    }

    // Check unique application number constraint
    const existing = StorageService.findByApplicationNumber(cleanAppNumber);
    if (existing) {
      setError(`Application Number '${cleanAppNumber}' already exists in database under technician '${existing.fullName}'.`);
      return;
    }

    if (!fullName.trim()) {
      setError('Technician Full Name is required.');
      return;
    }

    if (!mobile.trim() || !/^[6-9]\d{9}$/.test(mobile.trim())) {
      setError('Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    // Process attached files
    const documents: AttachedDocument[] = [];
    for (const item of attachedFiles) {
      const buffer = await item.file.arrayBuffer();
      const checksum = await CryptoService.computeChecksum(buffer);
      
      // Read data URL
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(item.file);
      });

      documents.push({
        id: `doc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        filename: item.file.name,
        docType: item.docType,
        virtualPath: `ORACLIME_DMS/TechnicianFiles/${cleanAppNumber}/${item.file.name}`,
        fileSizeKb: Math.max(1, Math.round(item.file.size / 1024)),
        pageCount: 1,
        checksum,
        importDate: new Date().toISOString(),
        isScanned: false,
        ocrConfidence: 98,
        ocrEngine: 'PyMuPDF Direct',
        extractedText: `OFFICIAL RECORD: ${item.file.name}\nApplication Number: ${cleanAppNumber}\nCandidate: ${fullName}`,
        uploadedBlobData: dataUrl,
        linkedApplicationNumber: cleanAppNumber,
        technicianName: fullName,
        fileMimeType: item.file.type || 'application/pdf',
      });
    }

    const maskedAadhaar = aadhaar ? `XXXX-XXXX-${aadhaar.replace(/\D/g, '').slice(-4) || '0000'}` : 'XXXX-XXXX-0000';

    const newRecord: TechnicianRecord = {
      id: `tech_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      applicationNumber: cleanAppNumber,
      registrationDate: new Date().toISOString().split('T')[0],
      status: 'verified',
      district,
      category,
      fullName: fullName.trim(),
      fatherName: fatherName.trim(),
      mobile: mobile.trim(),
      address: address.trim(),
      dob: dob || '1995-01-01',
      aadhaarNumber: maskedAadhaar,
      unmaskedAadhaar: aadhaar || '5482-0000-0000',
      skills: skills.split(',').map(s => s.trim()).filter(Boolean),
      experienceYears: Number(experienceYears) || 0,
      certifications: certifications.split(',').map(s => s.trim()).filter(Boolean),
      trainingDetails,
      documents,
      folderPath: `ORACLIME_DMS/TechnicianFiles/${cleanAppNumber}/`,
      reviewer: `${currentUser.fullName} (${currentUser.role})`,
      verificationDate: new Date().toISOString(),
      correctedFields: [],
      verificationNotes: 'Direct registration recorded by authorized operator.',
      auditTrail: [
        {
          id: `aud_${Date.now()}`,
          timestamp: new Date().toISOString(),
          actor: `${currentUser.fullName} (${currentUser.username})`,
          action: 'Initial Registration',
          details: `Registered technician ${cleanAppNumber} (${fullName}) with ${documents.length} attached documents.`,
        }
      ]
    };

    const saved = StorageService.updateTechnician(
      newRecord, 
      'Initial Technician Registration Created', 
      `${currentUser.fullName} (${currentUser.username})`
    );

    onTechnicianCreated(saved);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col text-slate-100 my-8 font-sans">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-white">
              Register New Technician Record
            </h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[75vh] space-y-5 text-xs font-mono">
          {error && (
            <div className="p-3 bg-rose-950/70 border border-rose-800 rounded-lg text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Section A: Registration & Identification */}
          <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 space-y-3">
            <span className="font-bold text-slate-300 uppercase tracking-wide block">
              1. Registration & Identification (Required)
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">Application Number (Unique Primary Key) *</label>
                <input
                  type="text"
                  required
                  value={appNumber}
                  onChange={(e) => setAppNumber(e.target.value.toUpperCase())}
                  placeholder="e.g. UPMBD260001"
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-cyan-300 font-bold focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Technician Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as TechnicianCategory)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-sans"
                >
                  <option value="HVAC & RAC Technician">HVAC & RAC Technician</option>
                  <option value="Commercial Chiller Specialist">Commercial Chiller Specialist</option>
                  <option value="Inverter AC & VRF Expert">Inverter AC & VRF Expert</option>
                  <option value="Cold Chain & Refrigeration">Cold Chain & Refrigeration</option>
                  <option value="Electrical & Controls">Electrical & Controls</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Operating District</label>
                <input
                  type="text"
                  required
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  placeholder="e.g. Moradabad"
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-sans"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Date of Birth</label>
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-sans"
                />
              </div>
            </div>
          </div>

          {/* Section B: Personal Details */}
          <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 space-y-3">
            <span className="font-bold text-slate-300 uppercase tracking-wide block">
              2. Personal & Contact Details
            </span>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">Full Legal Name *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Rajesh Kumar"
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white font-bold focus:outline-none focus:border-cyan-500 font-sans"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Father's Full Name</label>
                <input
                  type="text"
                  value={fatherName}
                  onChange={(e) => setFatherName(e.target.value)}
                  placeholder="e.g. Ram Kishan Sharma"
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-sans"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">10-Digit Mobile Number *</label>
                <input
                  type="text"
                  required
                  maxLength={10}
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 9876543210"
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-slate-400 mb-1">Permanent Address</label>
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="House number, street, landmark, PIN code"
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-sans"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Aadhaar Number (12 digits)</label>
                <input
                  type="text"
                  maxLength={14}
                  value={aadhaar}
                  onChange={(e) => setAadhaar(e.target.value)}
                  placeholder="XXXX-XXXX-XXXX"
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
                <span className="text-[10px] text-slate-500 block mt-1">
                  Protected and masked in UI. Operator PIN required to view unmasked.
                </span>
              </div>
            </div>
          </div>

          {/* Section C: Technical Qualifications */}
          <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 space-y-3">
            <span className="font-bold text-slate-300 uppercase tracking-wide block">
              3. Professional Competencies & Experience
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">Skills (comma separated)</label>
                <input
                  type="text"
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500 font-sans"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Experience (Years)</label>
                <input
                  type="number"
                  min={0}
                  value={experienceYears}
                  onChange={(e) => setExperienceYears(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          </div>

          {/* Section D: Attach Original PDF Documents */}
          <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-300 uppercase tracking-wide">
                4. Attach Original Documents (Optional)
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                {attachedFiles.length} files staged
              </span>
            </div>

            <div className="flex flex-wrap gap-2 pt-1 font-sans">
              <label className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold cursor-pointer flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-cyan-400" />
                <span>+ Registration Form PDF</span>
                <input
                  type="file"
                  accept=".pdf,image/*"
                  onChange={(e) => handleAddFile(e, 'registration')}
                  className="hidden"
                />
              </label>

              <label className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold cursor-pointer flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-cyan-400" />
                <span>+ Aadhaar Document PDF</span>
                <input
                  type="file"
                  accept=".pdf,image/*"
                  onChange={(e) => handleAddFile(e, 'aadhaar')}
                  className="hidden"
                />
              </label>

              <label className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold cursor-pointer flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-cyan-400" />
                <span>+ Trade Certificate PDF</span>
                <input
                  type="file"
                  accept=".pdf,image/*"
                  onChange={(e) => handleAddFile(e, 'certificates')}
                  className="hidden"
                />
              </label>
            </div>

            {attachedFiles.length > 0 && (
              <div className="space-y-1.5 pt-2">
                {attachedFiles.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2 bg-slate-900 border border-slate-800 rounded flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-cyan-400" />
                      <span className="font-bold text-white">{item.file.name}</span>
                      <span className="text-[10px] text-slate-500 uppercase">({item.docType})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(idx)}
                      className="text-slate-500 hover:text-rose-400"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-3 font-sans">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 text-slate-300 rounded text-xs font-semibold hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-semibold shadow-sm"
            >
              <Save className="w-4 h-4" />
              <span>Save & Index Technician</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
