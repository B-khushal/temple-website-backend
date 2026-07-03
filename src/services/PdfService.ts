import PDFDocument from 'pdfkit';
import { Response } from 'express';
import logger from '../config/logger';

export function generateDonationReceiptPDF(res: Response, donation: any): void {
  try {
    const doc = new PDFDocument({ size: 'A5', margin: 40 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Receipt-${donation.receiptNumber}.pdf`);

    doc.pipe(res);

    doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40).lineWidth(1.2).stroke('#CFB53B');
    doc.roundedRect(32, 32, doc.page.width - 64, 54, 12).fillAndStroke('#FFF7EA', '#E7C67A');

    doc.fontSize(16).fillColor('#7C5A10').text('Sri Durga Mata Temple', 40, 44, { align: 'center' });
    doc.fontSize(9).fillColor('#5A4632').text('Premium Donation Receipt', { align: 'center' });

    const formattedDate = donation.donationDate || donation.date
      ? new Date(donation.donationDate || donation.date).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        })
      : new Date().toLocaleDateString('en-IN');

    doc.fontSize(10).fillColor('#9B2226').text(`Receipt No: ${donation.receiptNumber}`, 40, 102);
    doc.moveTo(40, 122).lineTo(doc.page.width - 40, 122).stroke('#EEDCC1');

    const leftX = 46;
    const rightX = 185;
    let currentY = 144;

    const rows = [
      { label: 'Received From', val: donation.donorName || 'Temple Donor' },
      { label: 'Donation Type', val: donation.donationType || donation.type || 'General Donation' },
      { label: 'Amount', val: `Rs. ${Number(donation.amount || 0).toLocaleString('en-IN')}` },
      { label: 'Payment Status', val: donation.paymentStatus || 'Paid' },
      { label: 'Date', val: formattedDate },
      { label: 'Payment Method', val: donation.paymentMethod || 'Cash' },
    ];

    if (donation.transactionId || donation.transactionReference) {
      rows.push({ label: 'Transaction ID', val: donation.transactionId || donation.transactionReference });
    }

    if (donation.upiReferenceNumber) {
      rows.push({ label: 'UPI Reference', val: donation.upiReferenceNumber });
    }

    if (donation.purpose) {
      rows.push({ label: 'Purpose', val: donation.purpose });
    }

    rows.forEach((row) => {
      doc.fontSize(8).fillColor('#907454').text(`${row.label}:`, leftX, currentY);
      doc.fontSize(10).fillColor('#1F1A17').text(row.val, rightX, currentY, {
        width: doc.page.width - rightX - 42,
      });
      currentY += 24;
    });

    doc.fontSize(8).fillColor('#6D5844').text('Issued By: Temple Office', leftX, doc.page.height - 92);
    doc.fontSize(8).fillColor('#6D5844').text('Authorized Signature', doc.page.width - 150, doc.page.height - 92);
    doc.moveTo(40, doc.page.height - 54).lineTo(doc.page.width - 40, doc.page.height - 54).stroke('#EEDCC1');
    doc.fontSize(8).fillColor('#9B2226').text('Thank you for your contribution to the trust.', 40, doc.page.height - 44, {
      align: 'center',
    });

    doc.end();
  } catch (error: any) {
    logger.error(`Failed to generate receipt PDF: ${error.message}`);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Could not generate PDF receipt' });
    }
  }
}

export default generateDonationReceiptPDF;
