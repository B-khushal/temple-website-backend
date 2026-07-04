import PDFDocument from 'pdfkit';
import { Response } from 'express';
import logger from '../config/logger';

export function generateDonationReceiptPDF(res: Response, donation: any): void {
  try {
    const doc = new PDFDocument({ size: 'A5', margin: 40 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Receipt-${donation.receiptNumber}.pdf`);

    doc.pipe(res);

    // Draw background tint (Ivory Cream)
    doc.rect(0, 0, doc.page.width, doc.page.height).fill('#FDFBF7');

    // Double borders
    // Outer border (Maroon)
    doc.rect(15, 15, doc.page.width - 30, doc.page.height - 30).lineWidth(2).stroke('#9B2226');
    // Inner border (Gold)
    doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40).lineWidth(0.8).stroke('#CFB53B');

    // Corner flourishes
    const padding = 20;
    const w = doc.page.width;
    const h = doc.page.height;
    
    // Top-Left corner star/ornament
    doc.moveTo(padding + 5, padding + 10).lineTo(padding + 10, padding + 5).stroke('#CFB53B');
    doc.moveTo(padding + 5, padding + 5).lineTo(padding + 10, padding + 10).stroke('#CFB53B');
    // Top-Right
    doc.moveTo(w - padding - 5, padding + 10).lineTo(w - padding - 10, padding + 5).stroke('#CFB53B');
    doc.moveTo(w - padding - 5, padding + 5).lineTo(w - padding - 10, padding + 10).stroke('#CFB53B');
    // Bottom-Left
    doc.moveTo(padding + 5, h - padding - 10).lineTo(padding + 10, h - padding - 5).stroke('#CFB53B');
    doc.moveTo(padding + 5, h - padding - 5).lineTo(padding + 10, h - padding - 10).stroke('#CFB53B');
    // Bottom-Right
    doc.moveTo(w - padding - 5, h - padding - 10).lineTo(w - padding - 10, h - padding - 5).stroke('#CFB53B');
    doc.moveTo(w - padding - 5, h - padding - 5).lineTo(w - padding - 10, h - padding - 10).stroke('#CFB53B');

    // Spiritual Header shloka (Times-Italic)
    doc.fontSize(9.5).font('Times-BoldItalic').fillColor('#9B2226').text('|| Om Sri Durgayai Namah ||', 30, 34, { align: 'center' });

    // Main Title (Times-Bold)
    doc.fontSize(19).font('Times-Bold').fillColor('#9B2226').text('SRI DURGA MATA TEMPLE', 30, 48, { align: 'center', characterSpacing: 1 });

    // Subtitle (Gold)
    doc.fontSize(7.5).font('Times-Bold').fillColor('#B28B3C').text('SRI DURGA MATA DEVASTHANAM TRUST (REGD.)', { align: 'center', characterSpacing: 0.5 });
    
    // Address (Italic, dark brown)
    doc.fontSize(7.5).font('Times-Italic').fillColor('#5A4632').text('Devasthanam Campus, Hyderabad, India | Tel: +91 40 2345 6789', { align: 'center' });

    // Divider
    doc.moveTo(32, 90).lineTo(w - 32, 90).lineWidth(1).stroke('#CFB53B');

    // Receipt Banner
    doc.rect(32, 96, w - 64, 18).fill('#9B2226');
    doc.fontSize(9.5).font('Times-Bold').fillColor('#FFF9F0').text('SACRED DONATION RECEIPT / దాన పత్రం', 32, 101, { align: 'center' });

    const formattedDate = donation.donationDate || donation.date
      ? new Date(donation.donationDate || donation.date).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        })
      : new Date().toLocaleDateString('en-IN');

    // Receipt metadata row
    doc.fontSize(9).font('Times-Bold').fillColor('#9B2226').text(`Receipt No: ${donation.receiptNumber || 'Pending'}`, 35, 124);
    doc.fontSize(9).font('Times-Bold').fillColor('#5A4632').text(`Date: ${formattedDate}`, 270, 124, { align: 'right', width: 115 });
    
    // Divider
    doc.moveTo(32, 138).lineTo(w - 32, 138).lineWidth(0.5).stroke('#EEDCC1');

    // Render detailed rows (ledger table)
    let currentY = 148;
    const rows = [
      { label: 'Devotee Name', val: donation.donorName || 'Temple Devotee' },
      { label: 'Offering / Seva Mode', val: donation.donationType || donation.type || 'General Donation' },
      { label: 'Payment Method', val: donation.paymentMethod || 'Cash' },
      { label: 'Payment Status', val: donation.paymentStatus || 'Paid' },
    ];

    if (donation.mobile) {
      rows.push({ label: 'Mobile Number', val: donation.mobile });
    }
    if (donation.email) {
      rows.push({ label: 'Email Address', val: donation.email });
    }
    if (donation.transactionId || donation.transactionReference || donation.upiReferenceNumber) {
      rows.push({ label: 'Transaction Reference', val: donation.transactionId || donation.transactionReference || donation.upiReferenceNumber });
    }
    if (donation.purpose) {
      rows.push({ label: 'Purpose of offering', val: donation.purpose });
    }

    rows.forEach((row, idx) => {
      // Background strip for alternate rows
      if (idx % 2 === 0) {
        doc.rect(32, currentY - 4, w - 64, 22).fill('#FFFBF2');
      }
      
      // Label in Gold/Brown
      doc.fontSize(8.5).font('Times-Bold').fillColor('#7C5A10').text(row.label, 38, currentY);
      // Value in dark charcoal
      doc.fontSize(9.5).font('Times-Roman').fillColor('#261A12').text(row.val, 150, currentY, { width: w - 190 });
      
      // Fine bottom line
      doc.moveTo(32, currentY + 16).lineTo(w - 32, currentY + 16).lineWidth(0.4).stroke('#F3E7D3');
      currentY += 23;
    });

    // Premium Gold Amount Box
    doc.roundedRect(32, currentY + 8, w - 64, 34, 6).fillAndStroke('#FFF9F0', '#CFB53B');
    doc.fontSize(11.5).font('Times-Bold').fillColor('#9B2226').text(
      `TOTAL SUM: Rs. ${Number(donation.amount || donation.paidAmount || 0).toLocaleString('en-IN')}/-`,
      32,
      currentY + 19,
      { align: 'center' }
    );

    // Spiritual Durga Mantra Shloka
    const shlokaY = currentY + 54;
    doc.fontSize(8.5).font('Times-BoldItalic').fillColor('#9B2226').text('|| Sarva Mangala Mangalye Sive Sarvartha Sadhike |', 32, shlokaY, { align: 'center' });
    doc.fontSize(8.5).font('Times-BoldItalic').fillColor('#9B2226').text('Saranye Tryambake Gauri Narayani Namostute ||', { align: 'center' });
    
    // Translation/Blessing
    doc.fontSize(8).font('Times-Italic').fillColor('#5A4632').text(
      'May the blessings of Maa Durga fill your home with absolute peace, good health, and success.',
      { align: 'center', paragraphGap: 2 }
    );

    // Signature Block Y
    const sigY = h - 72;
    doc.moveTo(40, sigY).lineTo(150, sigY).lineWidth(0.8).stroke('#CFB53B');
    doc.fontSize(8).font('Times-Bold').fillColor('#9B2226').text('Authorized Trustee', 40, sigY + 6);

    doc.moveTo(w - 150, sigY).lineTo(w - 40, sigY).lineWidth(0.8).stroke('#CFB53B');
    doc.fontSize(8).font('Times-Bold').fillColor('#9B2226').text('Chief Priest (Archaka)', w - 150, sigY + 6, { align: 'right', width: 110 });

    // Legal Footer Note
    doc.fontSize(6.5).font('Times-Italic').fillColor('#8E7660').text(
      'Donations are exempt under Section 80G of the Income Tax Act. This is a system-generated sacred receipt.',
      30,
      h - 26,
      { align: 'center' }
    );

    doc.end();
  } catch (error: any) {
    logger.error(`Failed to generate receipt PDF: ${error.message}`);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Could not generate PDF receipt' });
    }
  }
}

export default generateDonationReceiptPDF;
