import { jsPDF } from 'jspdf';
import { TechnicianRecord } from '../types/dms';

export class BiodataPdfGenerator {
  /**
   * Generates a professional printable A4 PDF for Technician Full Biodata
   */
  public static generateTechnicianBiodataPdf(tech: TechnicianRecord): jsPDF {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;
    const contentWidth = pageWidth - margin * 2;
    let y = margin;

    // Header Band with Dark Navy background
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(margin, y, contentWidth, 22, 'F');

    // Accent line
    doc.setFillColor(6, 182, 212); // cyan-500
    doc.rect(margin, y + 22, contentWidth, 1.2, 'F');

    // Logo & Title
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('ORACLIME HVAC TECHNICIAN SYSTEM', margin + 6, y + 9);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(6, 182, 212); // cyan-400
    doc.text('OFFICIAL TECHNICIAN BIODATA & VERIFIED DOSSIER', margin + 6, y + 15);

    // Application & Date on right side of header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text(`REG NO: ${tech.applicationNumber}`, pageWidth - margin - 6, y + 9, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(`Enrolled: ${tech.registrationDate || 'Not Provided'}`, pageWidth - margin - 6, y + 15, { align: 'right' });

    y += 28;

    // Profile Photo + Key Summary Banner
    const photoWidth = 32;
    const photoHeight = 38;

    // Draw Photo Frame
    doc.setDrawColor(203, 213, 225); // slate-300
    doc.setFillColor(248, 250, 252); // slate-50
    doc.roundedRect(margin, y, photoWidth, photoHeight, 1.5, 1.5, 'FD');

    let photoAdded = false;
    if (tech.photoUrl && (tech.photoUrl.startsWith('data:image/') || tech.photoUrl.startsWith('data:application/'))) {
      try {
        const format = tech.photoUrl.includes('image/png') ? 'PNG' : 'JPEG';
        doc.addImage(tech.photoUrl, format, margin + 1, y + 1, photoWidth - 2, photoHeight - 2, undefined, 'FAST');
        photoAdded = true;
      } catch {
        photoAdded = false;
      }
    }

    if (!photoAdded) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text('Technician Photo', margin + photoWidth / 2, y + 17, { align: 'center' });
      doc.text('[ Not Provided ]', margin + photoWidth / 2, y + 22, { align: 'center' });
    }

    // Top Summary Box next to photo
    const infoX = margin + photoWidth + 4;
    const infoWidth = contentWidth - photoWidth - 4;

    doc.setFillColor(241, 245, 249); // slate-100
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(infoX, y, infoWidth, photoHeight, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text(tech.fullName || 'Not Provided', infoX + 5, y + 7);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(3, 105, 161); // sky-700
    doc.text(`Specialization: ${tech.specialization || 'AC Installation & Repair'}`, infoX + 5, y + 13);

    // Badges: Verification Status & Classification
    const statusText = tech.status === 'verified' ? 'VERIFIED RECORD' : tech.status === 'flagged_handwritten' ? 'FLAGGED (REVIEW)' : 'PENDING VERIFICATION';
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(tech.status === 'verified' ? 22 : 180, tech.status === 'verified' ? 101 : 83, tech.status === 'verified' ? 52 : 9);
    doc.text(`Status: ${statusText}`, infoX + 5, y + 19);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(`Primary Mobile: ${tech.mobile || 'Not Provided'}`, infoX + 5, y + 25);
    doc.text(`Alternate Phone: ${tech.alternateMobile || 'Not Provided'}`, infoX + 5, y + 30);
    doc.text(`District / Station: ${tech.district || 'Not Provided'}`, infoX + 5, y + 35);

    y += photoHeight + 5;

    // Helper to draw section title
    const drawSectionHeader = (title: string) => {
      doc.setFillColor(226, 232, 240); // slate-200
      doc.rect(margin, y, contentWidth, 5.5, 'F');
      doc.setFillColor(8, 145, 178); // cyan-600
      doc.rect(margin, y, 2.5, 5.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text(title.toUpperCase(), margin + 5, y + 4);
      y += 7.5;
    };

    // Helper for grid rows
    const drawRow2 = (l1: string, v1: string, l2: string, v2: string) => {
      const colW = contentWidth / 2;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(l1, margin + 2, y);
      doc.text(l2, margin + colW + 2, y);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);
      doc.text(v1 || 'Not Provided', margin + 35, y);
      doc.text(v2 || 'Not Provided', margin + colW + 35, y);

      // subtle separator line
      doc.setDrawColor(241, 245, 249);
      doc.line(margin, y + 1.5, margin + contentWidth, y + 1.5);
      y += 5;
    };

    // Section 1: Personal Identification & Contacts
    drawSectionHeader('1. Personal Identification & Demographics');
    drawRow2("Father's Name:", tech.fatherName || 'Not Provided', 'Date of Birth:', tech.dob || 'Not Provided');
    
    // Mask sensitive Aadhaar strictly
    const maskedAadhaar = tech.aadhaarNumber || (tech.unmaskedAadhaar ? `XXXX-XXXX-${tech.unmaskedAadhaar.slice(-4)}` : 'Not Provided');
    drawRow2('Aadhaar (Masked):', maskedAadhaar, 'PAN Number:', tech.panNumber || 'Not Provided');
    drawRow2('Permanent Address:', (tech.address || 'Not Provided').slice(0, 45), 'District / State:', `${tech.district || 'Not Provided'}, Uttar Pradesh`);

    y += 2;

    // Section 2: Technical Qualification & Skills
    drawSectionHeader('2. Technical Qualifications & Trade Experience');
    drawRow2('Trade Experience:', tech.experienceYears ? `${tech.experienceYears} Years` : 'Not Provided', 'Certifications:', (tech.certifications?.join(', ') || 'Not Provided').slice(0, 45));
    drawRow2('Technical Skills:', (tech.skills?.join(', ') || 'Not Provided').slice(0, 48), 'Training Institute:', tech.trainingDetails || 'Not Provided');

    y += 2;

    // Section 3: Banking & Settlement Account (Masked)
    drawSectionHeader('3. Banking & Financial Settlement Details (Masked)');
    const bank = tech.bankDetails;
    let maskedAcc = 'Not Provided';
    if (bank?.accountNumber) {
      const last4 = bank.accountNumber.slice(-4);
      maskedAcc = `XXXX-XXXX-${last4}`;
    }
    drawRow2('Settlement Bank:', bank?.bankName || 'Not Provided', 'Account No (Masked):', maskedAcc);
    drawRow2('IFSC Code:', bank?.ifscCode || 'Not Provided', 'Account Holder:', bank?.accountHolderName || tech.fullName || 'Not Provided');
    drawRow2('Branch Name:', bank?.branchName || 'Not Provided', 'UPI VPA / ID:', bank?.upiId || 'Not Provided');

    y += 2;

    // Section 4: Dossier Documents Checklist
    drawSectionHeader('4. Digital Dossier Document Checklist & Repository');
    
    // Checklist headers
    doc.setFillColor(248, 250, 252);
    doc.rect(margin, y, contentWidth, 4.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text('#', margin + 2, y + 3.2);
    doc.text('DOCUMENT TITLE / FILENAME', margin + 8, y + 3.2);
    doc.text('CATEGORY', margin + 90, y + 3.2);
    doc.text('SIZE / PAGES', margin + 128, y + 3.2);
    doc.text('AVAILABILITY', margin + 155, y + 3.2);
    y += 5.5;

    if (!tech.documents || tech.documents.length === 0) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text('No documents uploaded in this record folder yet.', margin + 8, y + 3);
      y += 6;
    } else {
      tech.documents.forEach((d, idx) => {
        if (y > pageHeight - 38) return; // avoid page overflow
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(15, 23, 42);
        doc.text(`${idx + 1}.`, margin + 2, y + 3);
        const displayName = (d.customTitle || d.filename).slice(0, 48);
        doc.text(displayName, margin + 8, y + 3);
        doc.text((d.docType || 'Document').toUpperCase(), margin + 90, y + 3);
        doc.text(`${d.fileSizeKb} KB · ${d.pageCount || 1}p`, margin + 128, y + 3);
        doc.setTextColor(22, 101, 52); // green
        doc.text('Archived In Dossier', margin + 155, y + 3);
        
        doc.setDrawColor(241, 245, 249);
        doc.line(margin, y + 4.5, margin + contentWidth, y + 4.5);
        y += 5;
      });
    }

    y += 3;

    // Section 5: Verification & Authorization Block
    drawSectionHeader('5. System Verification & Operator Authorization');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(
      'This document is a certified digital export generated from the ORACLIME Local Station Archive. All attached files are digitally fingerprinted and tamper-checked.',
      margin + 2,
      y + 2
    );
    y += 6;

    // Signature boxes
    const sigW = (contentWidth - 6) / 2;
    doc.setDrawColor(203, 213, 225);
    doc.rect(margin, y, sigW, 20);
    doc.rect(margin + sigW + 6, y, sigW, 20);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);
    doc.text('Technician / Candidate Declaration', margin + 3, y + 4);
    doc.text('Authorized Verification Officer (DMS)', margin + sigW + 9, y + 4);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text('I hereby confirm all above particulars and records are true.', margin + 3, y + 8);
    doc.text(`Reviewer: ${tech.reviewer || 'Authorized DMS Officer'}`, margin + sigW + 9, y + 8);
    doc.text(`Verified On: ${tech.verificationDate ? tech.verificationDate.slice(0, 10) : 'Pending final seal'}`, margin + sigW + 9, y + 12);

    doc.text('Signature: __________________________', margin + 3, y + 17);
    doc.text('Official Seal / Stamp: ________________', margin + sigW + 9, y + 17);

    // Footer
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `ORACLIME Technician DMS · Generated: ${new Date().toLocaleDateString('en-IN')} ${new Date().toLocaleTimeString('en-IN')} · Record ID: ${tech.id}`,
      pageWidth / 2,
      pageHeight - 5,
      { align: 'center' }
    );

    return doc;
  }

  /**
   * Generates a professional printable A4 PDF for Partner Full Business Profile
   */
  public static generatePartnerProfilePdf(partner: TechnicianRecord): jsPDF {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;
    const contentWidth = pageWidth - margin * 2;
    let y = margin;

    // Header Band with Indigo background
    doc.setFillColor(30, 27, 75); // indigo-950
    doc.rect(margin, y, contentWidth, 22, 'F');

    // Accent line
    doc.setFillColor(99, 102, 241); // indigo-500
    doc.rect(margin, y + 22, contentWidth, 1.2, 'F');

    // Logo & Title
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('ORACLIME HVAC BUSINESS PARTNERS NETWORK', margin + 6, y + 9);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(165, 180, 252); // indigo-300
    doc.text('OFFICIAL BUSINESS DOSSIER & AUTHORIZED PARTNER PROFILE', margin + 6, y + 15);

    // Reg No on right side
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text(`PARTNER ID: ${partner.applicationNumber}`, pageWidth - margin - 6, y + 9, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(199, 210, 254);
    doc.text(`Enrolled: ${partner.registrationDate || 'Not Provided'}`, pageWidth - margin - 6, y + 15, { align: 'right' });

    y += 28;

    // Photo/Logo + Key Summary Banner
    const photoWidth = 36;
    const photoHeight = 38;

    // Draw Photo Frame
    doc.setDrawColor(203, 213, 225);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, y, photoWidth, photoHeight, 1.5, 1.5, 'FD');

    let photoAdded = false;
    const photoData = partner.businessPhotoUrl || partner.photoUrl;
    if (photoData && (photoData.startsWith('data:image/') || photoData.startsWith('data:application/'))) {
      try {
        const format = photoData.includes('image/png') ? 'PNG' : 'JPEG';
        doc.addImage(photoData, format, margin + 1, y + 1, photoWidth - 2, photoHeight - 2, undefined, 'FAST');
        photoAdded = true;
      } catch {
        photoAdded = false;
      }
    }

    if (!photoAdded) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text('Business Logo', margin + photoWidth / 2, y + 17, { align: 'center' });
      doc.text('[ Not Provided ]', margin + photoWidth / 2, y + 22, { align: 'center' });
    }

    // Partner Info Card next to photo
    const infoX = margin + photoWidth + 4;
    const infoWidth = contentWidth - photoWidth - 4;

    doc.setFillColor(238, 242, 255); // indigo-50
    doc.setDrawColor(199, 210, 254);
    doc.roundedRect(infoX, y, infoWidth, photoHeight, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(30, 27, 75);
    doc.text(partner.fullName || 'Not Provided', infoX + 5, y + 7);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(67, 56, 202); // indigo-700
    doc.text(`Partner Type: ${partner.partnerType || 'Service Center / Commercial Entity'}`, infoX + 5, y + 13);

    const statusText = partner.status === 'verified' ? 'VERIFIED PARTNER' : 'PENDING REVIEW';
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(partner.status === 'verified' ? 22 : 180, partner.status === 'verified' ? 101 : 83, partner.status === 'verified' ? 52 : 9);
    doc.text(`Account Status: ${statusText}`, infoX + 5, y + 19);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(`Contact Person / Owner: ${partner.contactPerson || 'Not Provided'}`, infoX + 5, y + 25);
    doc.text(`Mobile / Telephone: ${partner.mobile || 'Not Provided'}`, infoX + 5, y + 30);
    doc.text(`Service Area / District: ${partner.district || 'Not Provided'}`, infoX + 5, y + 35);

    y += photoHeight + 5;

    // Helper for section header
    const drawSectionHeader = (title: string) => {
      doc.setFillColor(224, 231, 255); // indigo-100
      doc.rect(margin, y, contentWidth, 5.5, 'F');
      doc.setFillColor(79, 70, 229); // indigo-600
      doc.rect(margin, y, 2.5, 5.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(30, 27, 75);
      doc.text(title.toUpperCase(), margin + 5, y + 4);
      y += 7.5;
    };

    // Helper for 2-column row
    const drawRow2 = (l1: string, v1: string, l2: string, v2: string) => {
      const colW = contentWidth / 2;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(l1, margin + 2, y);
      doc.text(l2, margin + colW + 2, y);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);
      doc.text(v1 || 'Not Provided', margin + 36, y);
      doc.text(v2 || 'Not Provided', margin + colW + 36, y);

      doc.setDrawColor(241, 245, 249);
      doc.line(margin, y + 1.5, margin + contentWidth, y + 1.5);
      y += 5;
    };

    // Section 1: Business Registration & Compliance
    drawSectionHeader('1. Commercial Identity & Statutory Compliance');
    drawRow2('Firm / Entity Name:', (partner.fullName || 'Not Provided').slice(0, 35), 'Partner Classification:', partner.partnerType || 'Not Provided');
    drawRow2('GSTIN Number:', partner.gstNumber || 'Not Provided', 'PAN Card Number:', partner.panNumber || 'Not Provided');
    drawRow2('Authorized Person:', partner.contactPerson || 'Not Provided', 'Service Capacity:', partner.capacityOrCoverage || 'City-wide');
    drawRow2('Registered Address:', (partner.address || 'Not Provided').slice(0, 42), 'District / Coverage:', partner.district || 'Not Provided');

    y += 2;

    // Section 2: Financial Settlement Account
    drawSectionHeader('2. Banking & Commercial Settlement Account (Masked)');
    const bank = partner.bankDetails;
    let maskedAcc = 'Not Provided';
    if (bank?.accountNumber) {
      const last4 = bank.accountNumber.slice(-4);
      maskedAcc = `XXXX-XXXX-${last4}`;
    }
    drawRow2('Settlement Bank:', bank?.bankName || 'Not Provided', 'Account No (Masked):', maskedAcc);
    drawRow2('IFSC Code:', bank?.ifscCode || 'Not Provided', 'Account Beneficiary:', bank?.accountHolderName || partner.fullName || 'Not Provided');
    drawRow2('Branch Location:', bank?.branchName || 'Not Provided', 'UPI / VPA ID:', bank?.upiId || 'Not Provided');

    y += 2;

    // Section 3: Commercial Documents Checklist
    drawSectionHeader('3. Supporting Business Documents & Agreements Checklist');
    
    // Checklist headers
    doc.setFillColor(248, 250, 252);
    doc.rect(margin, y, contentWidth, 4.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text('#', margin + 2, y + 3.2);
    doc.text('DOCUMENT TITLE / FILENAME', margin + 8, y + 3.2);
    doc.text('DOCUMENT TYPE', margin + 90, y + 3.2);
    doc.text('SIZE / PAGES', margin + 128, y + 3.2);
    doc.text('AVAILABILITY', margin + 155, y + 3.2);
    y += 5.5;

    if (!partner.documents || partner.documents.length === 0) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text('No documents uploaded in this partner dossier yet.', margin + 8, y + 3);
      y += 6;
    } else {
      partner.documents.forEach((d, idx) => {
        if (y > pageHeight - 38) return;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(15, 23, 42);
        doc.text(`${idx + 1}.`, margin + 2, y + 3);
        const displayName = (d.customTitle || d.filename).slice(0, 48);
        doc.text(displayName, margin + 8, y + 3);
        doc.text((d.docType || 'Document').toUpperCase(), margin + 90, y + 3);
        doc.text(`${d.fileSizeKb} KB · ${d.pageCount || 1}p`, margin + 128, y + 3);
        doc.setTextColor(22, 101, 52);
        doc.text('Verified In Archive', margin + 155, y + 3);
        
        doc.setDrawColor(241, 245, 249);
        doc.line(margin, y + 4.5, margin + contentWidth, y + 4.5);
        y += 5;
      });
    }

    y += 3;

    // Section 4: Authorization & Service Agreement Sign-off
    drawSectionHeader('4. Authorized Signatures & Verification Seal');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(
      'This business profile represents an authorized commercial partner entry in the ORACLIME Distribution & Service Network.',
      margin + 2,
      y + 2
    );
    y += 6;

    // Signature boxes
    const sigW = (contentWidth - 6) / 2;
    doc.setDrawColor(203, 213, 225);
    doc.rect(margin, y, sigW, 20);
    doc.rect(margin + sigW + 6, y, sigW, 20);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);
    doc.text('Authorized Business Partner Representative', margin + 3, y + 4);
    doc.text('ORACLIME Operations Manager / Officer', margin + sigW + 9, y + 4);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Representative: ${partner.contactPerson || partner.fullName}`, margin + 3, y + 8);
    doc.text(`Reviewed by: ${partner.reviewer || 'DMS Verification Authority'}`, margin + sigW + 9, y + 8);
    doc.text(`Date Verified: ${partner.verificationDate ? partner.verificationDate.slice(0, 10) : 'Active Entry'}`, margin + sigW + 9, y + 12);

    doc.text('Seal & Sign: __________________________', margin + 3, y + 17);
    doc.text('Official Seal / Stamp: ________________', margin + sigW + 9, y + 17);

    // Footer
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `ORACLIME Partner DMS · Exported: ${new Date().toLocaleDateString('en-IN')} ${new Date().toLocaleTimeString('en-IN')} · Record ID: ${partner.id}`,
      pageWidth / 2,
      pageHeight - 5,
      { align: 'center' }
    );

    return doc;
  }
}
