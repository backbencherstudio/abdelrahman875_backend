import { Injectable } from '@nestjs/common';
import { Mission, User } from '@prisma/client';
import * as PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';
import appConfig from 'src/config/app.config';
import { SojebStorage } from '../lib/Disk/SojebStorage';

@Injectable()
export class PdfService {
  async generateAffreightmentConfirmationPdf(
    mission: Mission,
    shipper: User,
    carrier: User,
  ): Promise<string> {
    // Generate filename and path within your documents directory
    const fileName = `affreightment_confirmation_${mission.id}.pdf`;
    const filePath = path.join(process.cwd(), 'temp', fileName);

    // Ensure temp directory exists
    const tempDir = path.dirname(filePath);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    //  Create a new PDF document
    const doc = new PDFDocument();

    // pipe to file
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // Add PDF content
    doc
      .fontSize(18)
      .text('Affreightment Confirmation', { align: 'center' })
      .moveDown(0.5);
    doc.fontSize(10).text(`Mission ID: ${mission.id}`, { align: 'center' });
    doc.text(`Created: ${mission.created_at.toLocaleString()}`, {
      align: 'center',
    });
    doc.moveDown(2);

    // Parties
    doc
      .fontSize(14)
      .text('Parties Involved', { underline: true })
      .moveDown(0.5);
    doc.fontSize(11);
    doc.text(`Shipper: ${shipper.name}`);
    doc.text(`Email: ${shipper.email}`);
    doc.text(`Phone: ${shipper.phone_number || 'N/A'}`).moveDown();
    doc.text(`Carrier: ${carrier.name}`);
    doc.text(`Email: ${carrier.email}`);
    doc.text(`Phone: ${carrier.phone_number || 'N/A'}`).moveDown(2);

    // Pickup Information
    doc
      .fontSize(14)
      .text('Pickup Information', { underline: true })
      .moveDown(0.5);
    doc.fontSize(11);
    doc.text(`Address: ${mission.pickup_address}, ${mission.pickup_city}`);
    doc.text(`Postal Code: ${mission.pickup_postal_code}`);
    doc.text(
      `Contact: ${mission.pickup_contact_name} (${mission.pickup_contact_phone})`,
    );
    doc.text(
      `Date/Time: ${mission.pickup_date.toDateString()} ${mission.pickup_time}`,
    );
    if (mission.pickup_instructions)
      doc.text(`Instructions: ${mission.pickup_instructions}`);
    doc.moveDown(1.5);

    // Delivery Information
    doc
      .fontSize(14)
      .text('Delivery Information', { underline: true })
      .moveDown(0.5);
    doc.fontSize(11);
    doc.text(`Address: ${mission.delivery_address}, ${mission.delivery_city}`);
    doc.text(`Postal Code: ${mission.delivery_postal_code}`);
    doc.text(
      `Contact: ${mission.delivery_contact_name} (${mission.delivery_contact_phone})`,
    );
    if (mission.delivery_date)
      doc.text(
        `Date/Time: ${mission.delivery_date.toDateString()} ${mission.delivery_time || ''}`,
      );
    if (mission.delivery_instructions)
      doc.text(`Instructions: ${mission.delivery_instructions}`);
    doc.moveDown(1.5);

    // Goods Information
    doc.fontSize(14).text('Goods Details', { underline: true }).moveDown(0.5);
    doc.fontSize(11);
    doc.text(`Goods Type: ${mission.goods_type}`);
    doc.text(`Weight: ${mission.weight_kg} kg`);
    doc.text(`Volume: ${mission.volume_m3} m³`);
    doc.text(
      `Dimensions: ${mission.package_length}m × ${mission.package_width}m × ${mission.package_height}m`,
    );
    if (mission.fragile) doc.text(`⚠️ Fragile goods`);
    if (mission.temperature_required)
      doc.text(`Temperature Required: ${mission.temperature_required}`);
    doc.moveDown(1.5);

    // Financials
    doc
      .fontSize(14)
      .text('Financial Summary', { underline: true })
      .moveDown(0.5);
    doc.fontSize(11);
    doc.text(`Distance: ${mission.distance_km} km`);
    doc.text(`Base Price: $${mission.base_price.toFixed(2)}`);
    doc.text(`Final Price: $${mission.final_price.toFixed(2)}`);
    doc.text(`Commission: ${mission.commission_rate * 100}%`);
    if (mission.vat_amount) doc.text(`VAT: $${mission.vat_amount.toFixed(2)}`);
    doc.moveDown(1.5);

    // Footer
    doc
      .fontSize(10)
      .text('Both parties agree to the terms outlined above.', {
        align: 'center',
      })
      .moveDown(2);
    doc.text(`Signed by Shipper: ______________________`, { align: 'left' });
    doc.text(`Signed by Carrier: ______________________`, { align: 'left' });

    doc.moveDown(2);
    doc.text('Generated automatically by Deliver App System', {
      align: 'center',
      italics: true,
    });

    doc.end();

    await new Promise<void>((resolve, reject) => {
      stream.on('finish', () => resolve());
      stream.on('error', reject);
    });

    const fileBuffer = await fs.promises.readFile(filePath);

    const storagePath = `${appConfig().storageUrl.documents}/${fileName}`;

    await SojebStorage.put(storagePath, fileBuffer);

    // Get the public URL
    const fileUrl = SojebStorage.url(storagePath);

    // Delete temporary local file
    await fs.promises.unlink(filePath);

    return fileUrl;
  }
}
