import PDFDocument from 'pdfkit';
import { Response } from 'express';
import logger from '../config/logger';

export function generateDonationReceiptPDF(res: Response, donation: any): void {
  try {
    const doc = new PDFDocument({ size: 'A5', margin: 40 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Receipt-${donation.receiptNumber}.pdf`);

    doc.pipe(res);

    // Gold/Yellow-colored border representing sacred design
    doc.rect(20, 20, doc.page.width - 40, doc.page.height - 40).stroke('#CFB53B');

    // Header logo text
    doc.fontSize(16).fillColor('#9B2226').text('SRI DURGA MATA TEMPLE', { align: 'center', paragraphGap: 2 });
    doc.fontSize(8).fillColor('#3E2723').text('DEVISTHANAM & CHARITABLE TRUST', { align: 'center', paragraphGap: 10 });
    
    // Devotional quote
    doc.fontSize(8).fillColor('#B7094C').text('శ్రీ శ్రీ శ్రీ దుర్గామాత నల్లపోచమ్మ దేవాలయం, బాపూనగర్', { align: 'center', paragraphGap: 10 });

    // Decorative line separator
    doc.moveTo(40, 80).lineTo(doc.page.width - 40, 80).stroke('#EEDCC1');

    // Title
    doc.moveDown(0.5);
    doc.fontSize(11).fillColor('#9B2226').text('DONATION RECEIPT', { align: 'center', underline: true });
    doc.moveDown(0.8);

    const leftX = 45;
    const rightX = 180;
    let currentY = 120;

    const formattedDate = donation.date ? new Date(donation.date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    }) : new Date().toLocaleDateString('en-IN');

    const rows = [
      { label: 'Receipt Number:', val: donation.receiptNumber },
      { label: 'Receipt Date:', val: formattedDate },
      { label: 'Donor Name:', val: donation.donorName },
      { label: 'Mobile Number:', val: donation.mobile || 'N/A' },
      { label: 'Donation Type:', val: donation.donationType || donation.type || 'Monetary' },
      { label: 'Payment Method:', val: donation.paymentMethod || 'Cash' },
    ];

    if (donation.transactionReference) {
      rows.push({ label: 'Ref / TXN ID:', val: donation.transactionReference });
    }

    const amt = parseFloat(donation.amount);
    if (!isNaN(amt) && amt > 0) {
      rows.push({ label: 'Amount Paid:', val: `INR ${amt.toLocaleString('en-IN')}/-` });
    }

    if (donation.itemDescription || donation.itemDetails) {
      rows.push({ label: 'Item Details:', val: donation.itemDescription || donation.itemDetails });
    }

    rows.push({ label: 'Purpose of Seva:', val: donation.purpose || 'General Temple Fund' });

    rows.forEach((row) => {
      doc.fontSize(9).fillColor('#555555').text(row.label, leftX, currentY);
      doc.fontSize(9).fillColor('#000000').text(row.val, rightX, currentY);
      currentY += 18;
    });

    // Signature Area
    currentY = doc.page.height - 75;
    doc.fontSize(7).fillColor('#000000').text('Issued By: Temple Office', leftX, currentY);
    doc.fontSize(7).text('Authorized Signature', doc.page.width - 150, currentY);

    // Footer
    doc.moveDown(2);
    doc.fontSize(8).fillColor('#9B2226').text('Thank you for your contribution. Donations are tax exempt.', { align: 'center' });
    doc.fontSize(7).fillColor('#777777').text('May the divine blessings of Sri Durga Mata Pochamma protect you.', { align: 'center' });

    doc.end();
  } catch (error: any) {
    logger.error(`Failed to generate receipt PDF: ${error.message}`);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Could not generate PDF receipt' });
    }
  }
}
export default generateDonationReceiptPDF;
