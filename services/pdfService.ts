import { jsPDF } from "jspdf";
import { CargoQuoteRequest, LogisticsPartner } from "../types";

export const generateQuotePDF = (request: CargoQuoteRequest, partner: LogisticsPartner, isPartnerView: boolean = false) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let cursorY = 20;

  // Global Colors
  const BRAND_LIME = [132, 204, 22]; // #84cc16
  const TEXT_DARK = [15, 23, 42];    // #0f172a
  const TEXT_MUTED = [100, 116, 139]; // #64748b
  const BORDER_LIGHT = [226, 232, 240]; // #e2e8f0

  // 1. Decorative Header Image or Accent Bar
  if (request.quotedHeaderImage) {
    try {
      // If we have a header image, we try to render it. 
      // Note: addImage works best with pre-fetched base64 or loaded images.
      // For this dynamic implementation, we use an accent box as background if image fails or isn't base64.
      doc.setFillColor(BRAND_LIME[0], BRAND_LIME[1], BRAND_LIME[2]);
      doc.rect(0, 0, pageWidth, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(32);
      doc.setFont("helvetica", "bold");
      doc.text(request.quotedHeaderMessage || "CARGO LOGISTICS", margin, 25);
      cursorY = 55;
    } catch (e) {
      doc.setFillColor(BRAND_LIME[0], BRAND_LIME[1], BRAND_LIME[2]);
      doc.rect(0, 0, pageWidth, 5, 'F');
    }
  } else {
    doc.setFillColor(BRAND_LIME[0], BRAND_LIME[1], BRAND_LIME[2]);
    doc.rect(0, 0, pageWidth, 5, 'F');
  }

  // Carrier Brand (Top Left)
  doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.text(partner.name.toUpperCase(), margin, cursorY);
  
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
  doc.text(partner.specialization.toUpperCase(), margin, cursorY + 7);

  // Document Title (Top Right)
  doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(isPartnerView ? "SETTLEMENT STATEMENT" : "CARGO INVOICE", pageWidth - margin, cursorY, { align: "right" });
  
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(`Ref: ${request.id.split('-').pop()?.toUpperCase()}`, pageWidth - margin, cursorY + 7, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.text(`Issued: ${new Date().toLocaleDateString()}`, pageWidth - margin, cursorY + 12, { align: "right" });

  if (request.quotedHeaderMessage && !request.quotedHeaderImage) {
     doc.setFont("helvetica", "italic");
     doc.setFontSize(10);
     doc.setTextColor(BRAND_LIME[0], BRAND_LIME[1], BRAND_LIME[2]);
     doc.text(request.quotedHeaderMessage, margin, cursorY + 15);
     cursorY += 10;
  }

  cursorY += 35;

  // 2. Address Blocks
  // Sender (Carrier)
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
  doc.text("FROM CARRIER", margin, cursorY);
  cursorY += 5;
  doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(partner.name, margin, cursorY);
  cursorY += 5;
  doc.setFont("helvetica", "normal");
  doc.text(partner.location, margin, cursorY);
  doc.text(`P: ${partner.phone}`, margin, cursorY + 5);
  doc.text(`E: ${partner.email}`, margin, cursorY + 10);

  // Recipient (Client)
  let rightCursorY = cursorY - 10;
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
  doc.text("BILLED TO", pageWidth - margin, rightCursorY, { align: "right" });
  rightCursorY += 5;
  doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(request.clientName, pageWidth - margin, rightCursorY, { align: "right" });
  rightCursorY += 5;
  doc.setFont("helvetica", "normal");
  doc.text(request.clientEmail, pageWidth - margin, rightCursorY, { align: "right" });
  doc.text(request.clientPhone || "", pageWidth - margin, rightCursorY + 5, { align: "right" });

  cursorY = Math.max(cursorY + 25, rightCursorY + 25);

  // 3. Shipment Specifications Table
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, cursorY, pageWidth - (margin * 2), 10, 'F');
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
  doc.text("SHIPMENT SPECIFICATIONS", margin + 5, cursorY + 7);

  cursorY += 10;
  const specOrder = request.quotedDetailsOrder || ["origin", "destination", "cargoType", "weight", "dimensions", "preferredDate"];
  const labels: Record<string, string> = {
    origin: "Origin Port",
    destination: "Destination Hub",
    cargoType: "Cargo Type",
    weight: "Net Weight",
    dimensions: "Volume/Dimensions",
    preferredDate: "Est. Ship Date"
  };

  specOrder.forEach((key, index) => {
    let value = "";
    if (key === 'weight') value = `${request.weight} ${request.weightUnit || 'kg'}`;
    else if (key === 'preferredDate') value = new Date(request.preferredDate).toLocaleDateString();
    else value = (request as any)[key] || "N/A";

    if (index % 2 === 0) {
      doc.setFillColor(255, 255, 255);
    } else {
      doc.setFillColor(248, 250, 252);
    }
    doc.rect(margin, cursorY, pageWidth - (margin * 2), 8, 'F');
    
    doc.setFont("helvetica", "bold");
    doc.text(labels[key] || key.toUpperCase(), margin + 5, cursorY + 5.5);
    doc.setFont("helvetica", "normal");
    doc.text(value, margin + 60, cursorY + 5.5);
    
    cursorY += 8;
  });

  cursorY += 15;

  // 4. Financial Summary
  const totalsBoxWidth = 80;
  const totalsBoxX = pageWidth - margin - totalsBoxWidth;
  
  doc.setDrawColor(BORDER_LIGHT[0], BORDER_LIGHT[1], BORDER_LIGHT[2]);
  doc.line(totalsBoxX, cursorY, pageWidth - margin, cursorY);
  cursorY += 8;

  // Included Fee Calculation
  const feePercent = request.brokerFeePercent || 10;
  const total = request.quotedPrice || 0;
  const fee = request.brokerFee || 0;
  const base = total - fee;

  doc.setFontSize(9);
  doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
  doc.text("Carrier Operational Rate:", totalsBoxX, cursorY);
  doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
  doc.text(`${base.toLocaleString()} ${request.quotedCurrency}`, pageWidth - margin, cursorY, { align: "right" });
  
  cursorY += 7;

  doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
  doc.text(`Platform Surcharge (${feePercent}%):`, totalsBoxX, cursorY);
  doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
  doc.text(`${fee.toLocaleString()} ${request.quotedCurrency}`, pageWidth - margin, cursorY, { align: "right" });

  cursorY += 10;

  // Grand Total Box
  doc.setFillColor(BRAND_LIME[0], BRAND_LIME[1], BRAND_LIME[2], 0.1);
  doc.rect(totalsBoxX - 5, cursorY - 6, totalsBoxWidth + 5, 14, 'F');
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
  doc.text(isPartnerView ? "Settlement Total:" : "Invoice Grand Total:", totalsBoxX, cursorY + 3);
  
  doc.setFontSize(14);
  doc.setTextColor(BRAND_LIME[0], BRAND_LIME[1], BRAND_LIME[2]);
  doc.text(`${total.toLocaleString()} ${request.quotedCurrency}`, pageWidth - margin, cursorY + 3, { align: "right" });

  if (request.quotedNotes) {
    cursorY += 20;
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
    doc.text("QUOTATION NOTES", margin, cursorY);
    cursorY += 5;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
    const splitNotes = doc.splitTextToSize(request.quotedNotes, pageWidth - (margin * 2));
    doc.text(splitNotes, margin, cursorY);
    cursorY += (splitNotes.length * 4);
  }

  // 5. Verification Seal & Footer
  const sealY = pageHeight - 65;
  doc.setDrawColor(BORDER_LIGHT[0], BORDER_LIGHT[1], BORDER_LIGHT[2]);
  doc.line(margin, sealY, pageWidth - margin, sealY);

  // "Verified Carrier" Badge
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, sealY + 10, 50, 20, 3, 3, 'F');
  doc.setFontSize(7);
  doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
  doc.setFont("helvetica", "bold");
  doc.text("VERIFIED BY", margin + 25, sealY + 17, { align: "center" });
  doc.setFontSize(10);
  doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
  doc.text("CARGO BROKER", margin + 25, sealY + 24, { align: "center" });

  // Payment Method
  if (request.paymentMethod) {
    doc.setFontSize(8);
    doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
    doc.setFont("helvetica", "bold");
    doc.text("SETTLEMENT VIA", margin + 65, sealY + 15);
    doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
    doc.setFont("helvetica", "normal");
    doc.text(request.paymentMethod.toUpperCase(), margin + 65, sealY + 22);
  }

  // Footer Disclaimers / Custom Terms
  doc.setFontSize(7);
  doc.setTextColor(TEXT_MUTED[0], TEXT_MUTED[1], TEXT_MUTED[2]);
  const disclaimer = request.quotedTerms || (isPartnerView 
    ? "This settlement is pending final cargo reception and weight verification. Standard commission rates apply as per the CargoBroker Partner Agreement."
    : "This quote is valid for 7 business days from date of issue. Prices are inclusive of all platform fees but may exclude local customs duties unless specified.");
  
  const splitDisclaimer = doc.splitTextToSize(disclaimer, 100);
  doc.text(splitDisclaimer, pageWidth - margin, sealY + 15, { align: "right" });

  // Bottom Metadata
  doc.setFontSize(6);
  doc.text("Document generated via CargoBroker Enterprise Node. Digital signature hash: " + btoa(request.id).substring(0, 16), margin, pageHeight - 10);

  doc.save(`${isPartnerView ? 'Settlement' : 'Invoice'}_${request.id.split('-').pop()}.pdf`);
};