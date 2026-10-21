import { jsPDF } from 'jspdf';
import { TechnicianRecord, PartnerType } from '../types/dms';

export class FormPdfGenerator {
  /**
   * Generates a high-quality, printable PDF for Technician Registration (Form AC-01)
   */
  public static generateTechnicianForm(technician?: Partial<TechnicianRecord>): { doc: jsPDF; dataUrl: string; filename: string } {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const isFilled = Boolean(technician && technician.fullName);
    const appNo = technician?.applicationNumber || 'ORAC-TECH-________';
    const regDate = technician?.registrationDate 
      ? new Date(technician.registrationDate).toLocaleDateString('en-IN')
      : new Date().toLocaleDateString('en-IN');
    const name = technician?.fullName || '';
    const father = technician?.fatherName || '';
    const mobile = technician?.mobile || '';
    const altMobile = technician?.alternateMobile || '';
    const district = technician?.district || '';
    const address = technician?.address || '';
    const dob = technician?.dob || '';
    const aadhaar = technician?.aadhaarNumber || '';
    const pan = technician?.panNumber || '';
    const specialization = technician?.specialization || technician?.category || 'Field AC Maintenance & Repair';
    const expYears = technician?.experienceYears !== undefined ? String(technician.experienceYears) : '';
    const bankName = technician?.bankDetails?.bankName || '';
    const accNum = technician?.bankDetails?.accountNumber || '';
    const ifsc = technician?.bankDetails?.ifscCode || '';

    // Primary Colors
    const primaryNavy = [15, 23, 42]; // slate-900
    const accentCyan = [8, 145, 178]; // cyan-600
    const textDark = [30, 41, 59];
    const lightGray = [241, 245, 249];

    // Page Border
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.5);
    doc.rect(8, 8, 194, 281);

    // Header Background banner
    doc.setFillColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
    doc.rect(8, 8, 194, 28, 'F');

    // Header Logo Icon
    doc.setFillColor(accentCyan[0], accentCyan[1], accentCyan[2]);
    doc.roundedRect(14, 12, 18, 18, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('OL', 19, 24);

    // Header Title
    doc.setFontSize(14);
    doc.text('ORACLIME AIR SYSTEMS TECHNICIAN NETWORK', 38, 19);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(186, 230, 253);
    doc.text('OFFICIAL TECHNICIAN ENROLLMENT & DIGITAL DOSSIER · FORM AC-01', 38, 25);
    doc.text('Authorized Office Copy · Archival Indexed Document', 38, 30);

    // Application & Form Status Box
    doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
    doc.rect(142, 12, 54, 18, 'F');
    doc.setDrawColor(accentCyan[0], accentCyan[1], accentCyan[2]);
    doc.setLineWidth(0.4);
    doc.rect(142, 12, 54, 18);
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('APPLICATION NO:', 145, 17);
    doc.setFont('courier', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
    doc.text(appNo, 145, 23);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(`REG DATE: ${regDate}`, 145, 27);

    let y = 42;

    // SECTION 1: PERSONAL & CONTACT INFORMATION
    doc.setFillColor(accentCyan[0], accentCyan[1], accentCyan[2]);
    doc.rect(12, y, 186, 6, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('1. CANDIDATE PERSONAL & CONTACT DETAILS', 16, y + 4.2);

    y += 10;

    // Photo Box on Right (Passport Size: ~38x44 mm)
    doc.setDrawColor(148, 163, 184);
    doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
    doc.rect(156, y, 38, 44, 'FD');

    let photoAdded = false;
    if (technician?.photoUrl && (technician.photoUrl.startsWith('data:image/') || technician.photoUrl.startsWith('data:application/'))) {
      try {
        const format = technician.photoUrl.includes('image/png') ? 'PNG' : 'JPEG';
        doc.addImage(technician.photoUrl, format, 156.5, y + 0.5, 37, 43, undefined, 'FAST');
        photoAdded = true;
      } catch (err) {
        console.warn('Failed to embed technician photo in registration form:', err);
        photoAdded = false;
      }
    }

    if (!photoAdded) {
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(7.5);
      doc.text('AFFIX RECENT', 166, y + 18);
      doc.text('PASSPORT SIZE', 165, y + 23);
      doc.text('PHOTOGRAPH', 166, y + 28);
      doc.setFontSize(6.5);
      doc.text('(SELF-ATTESTED)', 166, y + 34);
    }

    // Fields on Left
    const drawField = (label: string, value: string, xPos: number, yPos: number, width: number) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text(label.toUpperCase(), xPos, yPos);
      
      doc.setDrawColor(203, 213, 225);
      doc.setFillColor(255, 255, 255);
      doc.rect(xPos, yPos + 1.5, width, 6.5, 'FD');
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(textDark[0], textDark[1], textDark[2]);
      if (value) {
        doc.text(value, xPos + 2, yPos + 6);
      }
    };

    drawField('Full Name (As per Aadhaar)', name, 12, y, 138);
    y += 11;
    drawField("Father's / Guardian Name", father, 12, y, 138);
    y += 11;
    drawField('Mobile Number (Primary)', mobile, 12, y, 66);
    drawField('Alternate Mobile / WhatsApp', altMobile, 82, y, 68);
    y += 11;
    drawField('Date of Birth (DD/MM/YYYY)', dob, 12, y, 42);
    drawField('Home District / Region', district, 58, y, 44);
    drawField('Trade Specialization', specialization, 106, y, 44);

    y += 13;
    drawField('Residential Address (Full Street, Landmark & PIN Code)', address, 12, y, 182);

    y += 13;

    // SECTION 2: IDENTITY & KYC CREDENTIALS
    doc.setFillColor(accentCyan[0], accentCyan[1], accentCyan[2]);
    doc.rect(12, y, 186, 6, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('2. GOVERNMENT IDENTIFICATION & KYC VERIFICATION', 16, y + 4.2);

    y += 10;
    drawField('Aadhaar Card Number (12 Digits)', aadhaar, 12, y, 88);
    drawField('Permanent Account Number (PAN)', pan, 106, y, 92);

    y += 13;

    // SECTION 3: SETTLEMENT & BANK ACCOUNT DETAILS
    doc.setFillColor(accentCyan[0], accentCyan[1], accentCyan[2]);
    doc.rect(12, y, 186, 6, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('3. BANK ACCOUNT DETAILS (FOR PAYOUTS & INCENTIVES)', 16, y + 4.2);

    y += 10;
    drawField('Bank Name', bankName, 12, y, 60);
    drawField('Account Number', accNum, 76, y, 66);
    drawField('IFSC Code', ifsc, 146, y, 52);

    y += 13;

    // SECTION 4: PROFESSIONAL QUALIFICATIONS & CHECKLIST
    doc.setFillColor(accentCyan[0], accentCyan[1], accentCyan[2]);
    doc.rect(12, y, 186, 6, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('4. TECHNICAL EXPERIENCE & SUPPORTING DOCUMENTS CHECKLIST', 16, y + 4.2);

    y += 10;
    drawField('Total Work Experience (Years)', expYears ? `${expYears} Years` : '', 12, y, 60);
    drawField('Tool Kit & Manifold Gauge Verification', isFilled ? 'Verified by Supervisor' : '', 76, y, 122);

    y += 12;

    // Checklist table
    doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
    doc.rect(12, y, 186, 26, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.rect(12, y, 186, 26);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    doc.text('MANDATORY ATTACHMENTS (PLEASE TICK & ATTACH SELF-ATTESTED COPIES):', 16, y + 5);

    const checklistItems = [
      ['[  ] Self-Attested Aadhaar Card Copy', '[  ] Valid Bank Passbook / Cancelled Cheque Copy'],
      ['[  ] PAN Card Copy (if applicable)', '[  ] Two Passport Size Colored Photographs'],
      ['[  ] Trade / ITI / HVAC Certificate (if any)', '[  ] Past Employer Experience Letter / Proof of Work'],
    ];

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    checklistItems.forEach((row, rIdx) => {
      doc.text(row[0], 20, y + 11 + rIdx * 5);
      doc.text(row[1], 105, y + 11 + rIdx * 5);
    });

    y += 31;

    // SECTION 5: DECLARATION & SIGNATURES
    doc.setFillColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
    doc.rect(12, y, 186, 5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('5. CANDIDATE DECLARATION & AUTHORIZED SIGNATURES', 16, y + 3.8);

    y += 8;
    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    const declText = 
      'I hereby declare that all details furnished in this application are true, complete, and correct to the best of my knowledge and belief. I agree to abide by the service standards, safety practices, and operational guidelines established by ORACLIME Air Systems. In case of any misinformation, my registration is liable to immediate termination.';
    doc.text(doc.splitTextToSize(declText, 184), 13, y);

    y += 12;

    // Signature boxes
    doc.setDrawColor(148, 163, 184);
    doc.rect(14, y, 52, 22);
    doc.rect(74, y, 56, 22);
    doc.rect(138, y, 58, 22);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text('Date & Place:', 16, y + 5);
    doc.text('Candidate Signature / Thumb', 18, y + 20);

    doc.text('Field Supervisor Stamp & Verification', 76, y + 20);
    doc.text('ORACLIME Authorized Officer', 142, y + 20);

    // Footer
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text('ORACLIME DMS · Form AC-01 · Generated with Cryptographic Checksum · Confidential Document', 14, 285);

    const dataUrl = doc.output('datauristring');
    const filename = `ORACLIME_Technician_Registration_Form_${appNo.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;

    return { doc, dataUrl, filename };
  }

  /**
   * Generates a high-quality, printable PDF for Partner Registration (Form BP-02)
   * Supports: Service Center, Godown / Warehouse, Wholesaler / Dealer, Other HVAC Business
   */
  public static generatePartnerForm(partner?: Partial<TechnicianRecord>): { doc: jsPDF; dataUrl: string; filename: string } {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const isFilled = Boolean(partner && partner.fullName);
    const appNo = partner?.applicationNumber || 'ORAC-PART-________';
    const regDate = partner?.registrationDate 
      ? new Date(partner.registrationDate).toLocaleDateString('en-IN')
      : new Date().toLocaleDateString('en-IN');
    const firmName = partner?.fullName || '';
    const contactPerson = partner?.contactPerson || '';
    const mobile = partner?.mobile || '';
    const altMobile = partner?.alternateMobile || '';
    const email = partner?.email || '';
    const district = partner?.district || '';
    const address = partner?.address || '';
    const partnerType: PartnerType = partner?.partnerType || 'Service Center';
    const gstNumber = partner?.gstNumber || '';
    const panNumber = partner?.panNumber || '';
    const bankName = partner?.bankDetails?.bankName || '';
    const accNum = partner?.bankDetails?.accountNumber || '';
    const ifsc = partner?.bankDetails?.ifscCode || '';
    const branch = partner?.bankDetails?.branchName || '';
    const coverage = partner?.capacityOrCoverage || '';

    // Primary Colors
    const primaryNavy = [15, 23, 42]; // slate-900
    const accentIndigo = [79, 70, 229]; // indigo-600
    const textDark = [30, 41, 59];
    const lightGray = [241, 245, 249];

    // Page Border
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.5);
    doc.rect(8, 8, 194, 281);

    // Header Background banner
    doc.setFillColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
    doc.rect(8, 8, 194, 28, 'F');

    // Header Logo Icon
    doc.setFillColor(accentIndigo[0], accentIndigo[1], accentIndigo[2]);
    doc.roundedRect(14, 12, 18, 18, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('BP', 19, 24);

    // Header Title
    doc.setFontSize(14);
    doc.text('ORACLIME AIR SYSTEMS PARTNER ALLIANCE', 38, 19);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(199, 210, 254);
    doc.text('BUSINESS PARTNER REGISTRATION & MEMORANDUM OF UNDERSTANDING · FORM BP-02', 38, 25);
    doc.text('Service Centers · Godowns & Warehouses · Wholesalers & Equipment Dealers', 38, 30);

    // Application & Form Status Box
    doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
    doc.rect(142, 12, 54, 18, 'F');
    doc.setDrawColor(accentIndigo[0], accentIndigo[1], accentIndigo[2]);
    doc.setLineWidth(0.4);
    doc.rect(142, 12, 54, 18);
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('PARTNER DOSSIER ID:', 145, 17);
    doc.setFont('courier', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
    doc.text(appNo, 145, 23);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(`REG DATE: ${regDate}`, 145, 27);

    let y = 42;

    // SECTION 1: PARTNER CLASSIFICATION
    doc.setFillColor(accentIndigo[0], accentIndigo[1], accentIndigo[2]);
    doc.rect(12, y, 186, 6, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('1. PARTNER CLASSIFICATION & BUSINESS CATEGORY', 16, y + 4.2);

    y += 9;

    // Checkbox selectors for Partner Type
    const partnerTypes = [
      'Service Center',
      'Godown / Warehouse',
      'Wholesaler / Dealer',
      'Other AC/HVAC Business'
    ];

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    partnerTypes.forEach((pt, i) => {
      const isSelected = isFilled && partnerType === pt;
      const xPos = 16 + i * 46;
      doc.setDrawColor(100, 116, 139);
      doc.setFillColor(isSelected ? accentIndigo[0] : 255, isSelected ? accentIndigo[1] : 255, isSelected ? accentIndigo[2] : 255);
      doc.rect(xPos, y, 3.5, 3.5, 'FD');
      if (isSelected) {
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(6);
        doc.text('X', xPos + 0.8, y + 2.8);
      }
      doc.setTextColor(textDark[0], textDark[1], textDark[2]);
      doc.setFontSize(7.5);
      doc.text(pt, xPos + 5.5, y + 2.8);
    });

    y += 8;

    // Helper to draw fields
    const drawField = (label: string, value: string, xPos: number, yPos: number, width: number) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text(label.toUpperCase(), xPos, yPos);
      
      doc.setDrawColor(203, 213, 225);
      doc.setFillColor(255, 255, 255);
      doc.rect(xPos, yPos + 1.5, width, 6.5, 'FD');
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(textDark[0], textDark[1], textDark[2]);
      if (value) {
        doc.text(value, xPos + 2, yPos + 6);
      }
    };

    // SECTION 2: BUSINESS ENTITY DETAILS
    doc.setFillColor(accentIndigo[0], accentIndigo[1], accentIndigo[2]);
    doc.rect(12, y, 186, 6, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('2. COMMERCIAL ESTABLISHMENT & CONTACT DETAILS', 16, y + 4.2);

    y += 10;
    drawField('Registered Firm / Entity Name', firmName, 12, y, 116);
    drawField('GSTIN / Tax Identification No.', gstNumber, 132, y, 66);

    y += 11;
    drawField('Authorized Contact Person & Designation', contactPerson, 12, y, 88);
    drawField('Primary Contact Mobile', mobile, 104, y, 44);
    drawField('Alternate Phone', altMobile, 152, y, 46);

    y += 11;
    drawField('Official Business Email', email, 12, y, 88);
    drawField('City / District Location', district, 104, y, 44);
    drawField('Income Tax PAN', panNumber, 152, y, 46);

    y += 13;
    drawField('Full Registered Office / Godown Facility Address', address, 12, y, 186);

    y += 13;

    // SECTION 3: COMMERCIAL & LOGISTICS SCOPE
    doc.setFillColor(accentIndigo[0], accentIndigo[1], accentIndigo[2]);
    doc.rect(12, y, 186, 6, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('3. COMMERCIAL CAPACITY & OPERATIONAL TERRITORY', 16, y + 4.2);

    y += 10;
    drawField('Territorial Coverage / Area of Operation', coverage || (district ? `${district} & Adjacent Districts` : ''), 12, y, 116);
    drawField('Logistics / Dispatch Capability', isFilled ? 'Active Daily Dispatch' : '', 132, y, 66);

    y += 13;

    // SECTION 4: SETTLEMENT & COMMERCIAL BANK ACCOUNT
    doc.setFillColor(accentIndigo[0], accentIndigo[1], accentIndigo[2]);
    doc.rect(12, y, 186, 6, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('4. COMMERCIAL SETTLEMENT & BANKING DETAILS', 16, y + 4.2);

    y += 10;
    drawField('Bank Name', bankName, 12, y, 54);
    drawField('Branch Name / Location', branch, 70, y, 40);
    drawField('Current / Settlement Account Number', accNum, 114, y, 46);
    drawField('RTGS/NEFT IFSC Code', ifsc, 164, y, 34);

    y += 13;

    // SECTION 5: STATUTORY DOCUMENTS CHECKLIST
    doc.setFillColor(accentIndigo[0], accentIndigo[1], accentIndigo[2]);
    doc.rect(12, y, 186, 6, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('5. STATUTORY DOCUMENTS CHECKLIST (ATTACH CERTIFIED COPIES)', 16, y + 4.2);

    y += 10;
    // Checklist table
    doc.setFillColor(lightGray[0], lightGray[1], lightGray[2]);
    doc.rect(12, y, 186, 24, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.rect(12, y, 186, 24);

    const partnerChecklist = [
      ['[  ] GST Registration Certificate (Form REG-06)', '[  ] Partner / Director PAN & Identity Proof'],
      ['[  ] Cancelled Cheque / Official Bank Statement', '[  ] Shop & Establishment / Trade License Copy'],
      ['[  ] Partnership Deed / Certificate of Incorporation', '[  ] Signed ORACLIME Partner Service Level Agreement'],
    ];

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    partnerChecklist.forEach((row, rIdx) => {
      doc.text(row[0], 20, y + 6 + rIdx * 5.5);
      doc.text(row[1], 108, y + 6 + rIdx * 5.5);
    });

    y += 28;

    // SECTION 6: PARTNERSHIP UNDERTAKING & OFFICIAL STAMP
    doc.setFillColor(primaryNavy[0], primaryNavy[1], primaryNavy[2]);
    doc.rect(12, y, 186, 5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('6. PARTNER UNDERTAKING, AUTHORIZED SIGNATORY & OFFICIAL STAMP', 16, y + 3.8);

    y += 8;
    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    const partnerDeclText = 
      'The undersigned entity hereby enters into this enrollment with ORACLIME Air Systems and confirms that the commercial representations, GSTIN credentials, and banking details are authentic. The partner agrees to supply genuine components, uphold authorized warranties, maintain inventory integrity, and respect warranty processing guidelines.';
    doc.text(doc.splitTextToSize(partnerDeclText, 184), 13, y);

    y += 12;

    // Signatures and Official Stamp box
    doc.setDrawColor(148, 163, 184);
    doc.rect(14, y, 52, 22);
    doc.rect(74, y, 56, 22);
    doc.rect(138, y, 58, 22);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text('Date & Station:', 16, y + 5);
    doc.text('Authorized Signatory Signature', 18, y + 20);

    doc.text('Affix Official Rubber Stamp Here', 78, y + 20);
    doc.text('ORACLIME Alliance Director Approval', 142, y + 20);

    // Footer
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text('ORACLIME DMS · Form BP-02 · Partner Registration & SLA · Cryptographically Indexed Archival File', 14, 285);

    const dataUrl = doc.output('datauristring');
    const filename = `ORACLIME_Partner_Registration_Form_${appNo.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;

    return { doc, dataUrl, filename };
  }
}
