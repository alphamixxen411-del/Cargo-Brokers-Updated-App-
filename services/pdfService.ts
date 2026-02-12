
import { jsPDF } from "jspdf";
import { CargoQuoteRequest, LogisticsPartner } from "../types";

export const generateQuotePDF = (request: CargoQuoteRequest, partner: LogisticsPartner, isPartnerView: boolean = false) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let cursorY = 20;

  // Header - Carrier Brand
  doc.setFillColor(132, 204, 22); // #84cc16
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text(isPartnerView ? "SETTLEMENT STATEMENT" : partner.name.toUpperCase(), margin, 25);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(isPartnerView ? "COMMISSION BREAKDOWN" : partner.specialization.toUpperCase(), margin, 32);

  // Optional Partner Logo in header
  if (request.includePartnerLogo && !isPartnerView) {
    doc.setDrawColor(0, 0, 0);
    doc.setFillColor(255, 255, 255);
    doc.rect(margin + 120, 8, 24, 24, 'F');
    doc.setFontSize(6);
    doc.setTextColor(150, 150, 150);
    doc.text("CARRIER LOGO", margin + 122, 21);
  }

  // Quote Info
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(`REF: ${request.id.toUpperCase()}`, pageWidth - margin, 25, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.text(`DATE: ${new Date().toLocaleDateString()}`, pageWidth - margin, 32, { align: "right" });

  cursorY = 55;

  // Partner Info (Left)
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("FROM (CARRIER)", margin, cursorY);
  cursorY += 7;
  doc.setFont("helvetica", "normal");
  doc.text(partner.name, margin, cursorY);
  cursorY += 5;
  doc.text(partner.location, margin, cursorY);
  cursorY += 5;
  doc.text(`P: ${partner.phone}`, margin, cursorY);
  cursorY += 5;
  doc.text(`E: ${partner.email}`, margin, cursorY);

  // Client Info (Right)
  let rightCursorY = 55;
  doc.setFont("helvetica", "bold");
  doc.text("TO (CLIENT)", pageWidth - margin, rightCursorY, { align: "right" });
  rightCursorY += 7;
  doc.setFont("helvetica", "normal");
  doc.text(request.clientName, pageWidth - margin, rightCursorY, { align: "right" });
  rightCursorY += 5;
  doc.text(request.clientEmail, pageWidth - margin, rightCursorY, { align: "right" });
  rightCursorY += 5;
  doc.text(request.clientPhone, pageWidth - margin, rightCursorY, { align: "right" });

  cursorY = Math.max(cursorY, rightCursorY) + 20;

  // Shipment Details Section
  doc.setDrawColor(230, 230, 230);
  doc.line(margin, cursorY, pageWidth - margin, cursorY);
  cursorY += 15;

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("SHIPMENT DETAILS", margin, cursorY);
  cursorY += 10;

  const allDetails: Record<string, [string, string]> = {
    origin: ["Origin:", request.origin],
    destination: ["Destination:", request.destination],
    cargoType: ["Cargo Type:", request.cargoType],
    weight: ["Weight:", `${request.weight} ${request.weightUnit || 'kg'}`],
    dimensions: ["Dimensions:", request.dimensions || "N/A"],
    preferredDate: ["Preferred Date:", new Date(request.preferredDate).toLocaleDateString()],
  };

  const order = request.quotedDetailsOrder || ["origin", "destination", "cargoType", "weight", "dimensions", "preferredDate"];
  const details = order.map(key => allDetails[key]).filter(Boolean);

  doc.setFontSize(10);
  details.forEach(([label, value]) => {
    doc.setFont("helvetica", "bold");
    doc.text(label, margin, cursorY);
    doc.setFont("helvetica", "normal");
    doc.text(value, margin + 45, cursorY);
    cursorY += 7;
  });

  cursorY += 10;

  // Totals Area
  cursorY = Math.max(cursorY, pageHeight - 110);
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, cursorY, pageWidth - margin, cursorY);
  cursorY += 15;

  // Pricing Breakdown (Now shown for both client and partner for full transparency)
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.setFont("helvetica", "normal");
  
  doc.text("BASE SERVICE PRICE:", margin, cursorY);
  doc.text(`${request.quotedBasePrice?.toLocaleString()} ${request.quotedCurrency}`, pageWidth - margin, cursorY, { align: "right" });
  cursorY += 8;

  doc.text(`LOGISTICS SERVICE FEE (${request.brokerFeePercent || 10}%):`, margin, cursorY);
  doc.text(`${request.brokerFee?.toLocaleString()} ${request.quotedCurrency}`, pageWidth - margin, cursorY, { align: "right" });
  cursorY += 5;
  
  doc.setDrawColor(240, 240, 240);
  doc.line(margin + 100, cursorY, pageWidth - margin, cursorY);
  cursorY += 10;

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(isPartnerView ? "TOTAL SETTLEMENT VALUE" : "TOTAL INVOICE AMOUNT", margin, cursorY);
  doc.setTextColor(132, 204, 22);
  doc.text(`${request.quotedPrice?.toLocaleString()} ${request.quotedCurrency}`, pageWidth - margin, cursorY, { align: "right" });

  cursorY += 15;

  // Terms and Conditions
  doc.setTextColor(100, 100, 100);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text("TERMS & CONDITIONS:", margin, cursorY);
  cursorY += 4;
  doc.setFont("helvetica", "normal");
  
  const baseTerms = isPartnerView 
    ? "Settlement will be processed upon proof of delivery. Commission is non-refundable." 
    : "Quote valid for 7 days. Final price subject to verification of cargo weight and volume at origin.";
  const customTerms = request.quotedTerms ? `\n${request.quotedTerms}` : "";
  const fullTerms = baseTerms + customTerms;
  
  const splitTerms = doc.splitTextToSize(fullTerms, pageWidth - (margin * 2));
  doc.text(splitTerms, margin, cursorY);

  // Platform Branding Footer
  if (request.quotedLogo === 'Cargo Brokers') {
    doc.setFillColor(241, 245, 249);
    doc.rect(0, pageHeight - 15, pageWidth, 15, 'F');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.setFont("helvetica", "bold");
    doc.text("CARGO BROKERS LOGISTICS NETWORK | SECURE FINANCIAL CLEARING", margin, pageHeight - 6);
  }

  doc.save(`${isPartnerView ? 'PartnerSettlement' : 'CargoInvoice'}_${request.id}.pdf`);
};
