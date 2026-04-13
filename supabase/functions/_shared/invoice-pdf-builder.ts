/**
 * Server-side PDF invoice builder using pdf-lib (Deno-compatible)
 */
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";

/**
 * Strip Vietnamese diacritics so pdf-lib StandardFonts (WinAnsi) can render the text.
 */
function stripVietnamese(str: string): string {
  if (!str) return str;
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0111/g, "d")
    .replace(/\u0110/g, "D")
    .replace(/[^\x00-\x7F]/g, "");
}

const ADDON_TYPES = [
  { type: "projects", emoji: "📁", unitLabel: "+5 du an" },
  { type: "storage", emoji: "💾", unitLabel: "+5 GB luu tru" },
  { type: "members", emoji: "👥", unitLabel: "+10 thanh vien" },
];
const ADDON_PRICE_MONTHLY = 2.49;

const PLAN_LABELS: Record<string, string> = {
  plan_free: "Free",
  plan_plus: "Plus",
  plan_pro: "Pro",
  plan_business: "Business",
  plan_custom: "Custom",
};

function formatDate(d: string | null): string {
  if (!d) return "—";
  const date = new Date(d);
  return `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1).toString().padStart(2, "0")}/${date.getFullYear()} ${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
}

// Color helpers
const gray900 = rgb(17 / 255, 24 / 255, 39 / 255);
const gray700 = rgb(55 / 255, 65 / 255, 81 / 255);
const gray500 = rgb(107 / 255, 114 / 255, 128 / 255);
const gray400 = rgb(156 / 255, 163 / 255, 175 / 255);
const gray200 = rgb(229 / 255, 231 / 255, 235 / 255);
const green700 = rgb(21 / 255, 128 / 255, 61 / 255);
const green600 = rgb(22 / 255, 163 / 255, 74 / 255);
const blue600 = rgb(37 / 255, 99 / 255, 235 / 255);

interface InvoicePdfParams {
  order: any;
  profile: any;
}

export async function buildInvoicePdf(params: InvoicePdfParams): Promise<Uint8Array> {
  const { order, profile } = params;
  const addons: Array<{ type: string; quantity: number }> = Array.isArray(order.addons) ? order.addons : [];
  const cycle = order.billing_cycle;
  const isCompleted = order.status === "completed";
  const planLabel = PLAN_LABELS[order.plan] || order.plan || "Add-on";
  const invoiceNumber = order.order_code ? `INV-${order.order_code}` : `INV-${order.id?.slice(0, 8)?.toUpperCase()}`;

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const { width: pageW, height: pageH } = page.getSize();

  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const courier = await pdfDoc.embedFont(StandardFonts.Courier);

  const margin = 56.7; // ~20mm
  const contentW = pageW - margin * 2;
  let y = pageH - margin;

  // Helper: draw text (auto-strips Vietnamese diacritics for WinAnsi compatibility)
  const drawText = (rawText: string, x: number, yPos: number, opts: {
    font?: any; size?: number; color?: any; align?: "left" | "right" | "center";
  } = {}) => {
    const text = stripVietnamese(rawText);
    const font = opts.font || helvetica;
    const size = opts.size || 8;
    const color = opts.color || gray900;
    const tw = font.widthOfTextAtSize(text, size);
    let finalX = x;
    if (opts.align === "right") finalX = x - tw;
    else if (opts.align === "center") finalX = x - tw / 2;
    page.drawText(text, { x: finalX, y: yPos, size, font, color });
    return tw;
  };

  const drawLine = (x1: number, yPos: number, x2: number, thickness = 0.5) => {
    page.drawLine({ start: { x: x1, y: yPos }, end: { x: x2, y: yPos }, thickness, color: gray200 });
  };

  // ─── Header ────────────────────────────────────────────────────
  drawText("HOA DON", margin, y, { font: helveticaBold, size: 22, color: gray900 });
  y -= 10;
  drawText("Bien nhan thanh toan dien tu", margin, y, { size: 8, color: gray500 });
  y -= 8;
  drawText(invoiceNumber, margin, y, { font: courier, size: 9, color: gray700 });

  // Right side — brand
  drawText("T-Nexus", pageW - margin, y + 18, { font: helveticaBold, size: 18, color: blue600, align: "right" });
  drawText("Dich vu quan ly du an so", pageW - margin, y + 8, { size: 7, color: gray400, align: "right" });

  y -= 10;

  // Divider
  drawLine(margin, y, pageW - margin);
  y -= 12;

  // ─── Invoice Info + Customer (2 columns) ───────────────────────
  const colW = contentW / 2;

  // Left: Invoice Details
  drawText("THONG TIN HOA DON", margin, y, { font: helveticaBold, size: 7, color: gray400 });
  y -= 8;

  const infoLines: [string, string][] = [
    ["Ma don hang:", order.order_code || "—"],
    ["Ngay tao:", formatDate(order.created_at)],
  ];
  if (isCompleted && order.completed_at) {
    infoLines.push(["Ngay thanh toan:", formatDate(order.completed_at)]);
  }
  infoLines.push(["Phuong thuc:", (order.payment_method || "PayPal").toUpperCase()]);
  infoLines.push(["Trang thai:", isCompleted ? "Da thanh toan" : "That bai"]);

  const infoStartY = y;
  for (const [label, value] of infoLines) {
    const labelW = drawText(label, margin, y, { size: 8, color: gray500 });
    drawText(` ${value}`, margin + labelW + 2, y, {
      font: helveticaBold,
      size: 8,
      color: label === "Trang thai:" && isCompleted ? green700 : gray900,
    });
    y -= 12;
  }

  // Right: Customer Info
  let yRight = infoStartY + 8;
  drawText("THONG TIN KHACH HANG", margin + colW, yRight, { font: helveticaBold, size: 7, color: gray400 });
  yRight -= 8;

  drawText(profile?.full_name || "—", margin + colW, yRight, { font: helveticaBold, size: 9, color: gray900 });
  yRight -= 12;

  drawText(profile?.email || "—", margin + colW, yRight, { size: 8, color: gray700 });
  yRight -= 12;

  if (profile?.student_id) {
    drawText(`MSSV: ${profile.student_id}`, margin + colW, yRight, { size: 8, color: gray700 });
    yRight -= 12;
  }
  if (profile?.institution) {
    drawText(`Truong: ${profile.institution}`, margin + colW, yRight, { size: 8, color: gray700 });
    yRight -= 12;
  }

  y = Math.min(y, yRight) - 8;

  // ─── Billing Period ────────────────────────────────────────────
  if (isCompleted && order.plan && (profile?.plan_started_at || profile?.plan_expires_at)) {
    page.drawRectangle({
      x: margin, y: y - 28, width: contentW, height: 32,
      color: rgb(249 / 255, 250 / 255, 251 / 255),
      borderColor: gray200, borderWidth: 0.5,
    });

    drawText("CHU KY THANH TOAN", margin + 8, y - 4, { font: helveticaBold, size: 7, color: gray400 });

    const parts: string[] = [];
    if (profile?.plan_started_at) parts.push(`Kich hoat: ${formatDate(profile.plan_started_at)}`);
    if (profile?.plan_expires_at) parts.push(`Het han: ${formatDate(profile.plan_expires_at)}`);
    parts.push(`Chu ky: ${cycle === "yearly" ? "12 thang" : "1 thang"}`);
    drawText(parts.join("    "), margin + 8, y - 18, { size: 8, color: gray700 });

    y -= 40;
  }

  y -= 4;

  // ─── Line Items Table ──────────────────────────────────────────
  const colEnd = pageW - margin;

  // Header row
  drawLine(margin, y, pageW - margin);
  y -= 12;

  drawText("#", margin, y, { font: helveticaBold, size: 8, color: gray700 });
  drawText("Mo ta", margin + 16, y, { font: helveticaBold, size: 8, color: gray700 });
  drawText("Don gia", margin + contentW * 0.5, y, { font: helveticaBold, size: 8, color: gray700 });
  drawText("SL", margin + contentW * 0.65, y, { font: helveticaBold, size: 8, color: gray700 });
  drawText("Thanh tien", colEnd, y, { font: helveticaBold, size: 8, color: gray700, align: "right" });
  y -= 6;

  drawLine(margin, y, pageW - margin);
  y -= 14;

  let itemNum = 0;

  // Plan row
  if (order.plan) {
    itemNum++;
    drawText(String(itemNum), margin, y, { font: helveticaBold, size: 8, color: gray900 });
    drawText(`${planLabel} Plan`, margin + 16, y, { font: helveticaBold, size: 8, color: gray900 });
    drawText(`$${(order.base_amount || 0).toFixed(2)}`, margin + contentW * 0.5, y, { size: 8, color: gray900 });
    drawText("1", margin + contentW * 0.65, y, { size: 8, color: gray900 });
    drawText(`$${(order.base_amount || 0).toFixed(2)}`, colEnd, y, { font: helveticaBold, size: 8, color: gray900, align: "right" });
    y -= 10;

    drawText(cycle === "yearly" ? "Goi nam (12 thang)" : "Goi thang (1 thang)", margin + 16, y, { size: 7, color: gray500 });
    y -= 10;

    page.drawLine({ start: { x: margin, y }, end: { x: pageW - margin, y }, thickness: 0.3, color: rgb(243 / 255, 244 / 255, 246 / 255) });
    y -= 10;
  }

  // Addon rows
  for (const addon of addons) {
    const meta = ADDON_TYPES.find((a) => a.type === addon.type);
    if (!meta || addon.quantity <= 0) continue;
    itemNum++;
    const unitPrice = cycle === "yearly" ? ADDON_PRICE_MONTHLY * 10 : ADDON_PRICE_MONTHLY;
    const lineTotal = unitPrice * addon.quantity;

    drawText(String(itemNum), margin, y, { font: helveticaBold, size: 8, color: gray900 });
    drawText(meta.unitLabel, margin + 16, y, { font: helveticaBold, size: 8, color: gray900 });
    drawText(`$${unitPrice.toFixed(2)}`, margin + contentW * 0.5, y, { size: 8, color: gray900 });
    drawText(String(addon.quantity), margin + contentW * 0.65, y, { size: 8, color: gray900 });
    drawText(`$${lineTotal.toFixed(2)}`, colEnd, y, { font: helveticaBold, size: 8, color: gray900, align: "right" });
    y -= 10;

    drawText("Goi bo sung", margin + 16, y, { size: 7, color: gray500 });
    y -= 10;

    page.drawLine({ start: { x: margin, y }, end: { x: pageW - margin, y }, thickness: 0.3, color: rgb(243 / 255, 244 / 255, 246 / 255) });
    y -= 10;
  }

  // Subtotal
  drawLine(margin, y, pageW - margin);
  y -= 14;

  drawText("Tam tinh", colEnd - 60, y, { size: 8, color: gray500, align: "right" });
  drawText(`$${((order.base_amount || 0) + (order.addon_amount || 0)).toFixed(2)}`, colEnd, y, { size: 8, color: gray900, align: "right" });
  y -= 14;

  // Discounts
  if ((order.discount_amount || 0) > 0) {
    const discLabel = order.coupon_code ? `Ma giam gia (${order.coupon_code})` : "Giam gia";
    drawText(discLabel, colEnd - 60, y, { size: 8, color: green700, align: "right" });
    drawText(`-$${order.discount_amount.toFixed(2)}`, colEnd, y, { size: 8, color: green700, align: "right" });
    y -= 14;
  }

  if ((order.welcome_discount || 0) > 0) {
    drawText("Uu dai chao mung", colEnd - 60, y, { size: 8, color: green700, align: "right" });
    drawText(`-$${order.welcome_discount.toFixed(2)}`, colEnd, y, { size: 8, color: green700, align: "right" });
    y -= 14;
  }

  // Total
  page.drawLine({ start: { x: margin, y }, end: { x: pageW - margin, y }, thickness: 0.8, color: gray700 });
  y -= 16;

  drawText("TONG CONG", colEnd - 80, y, { font: helveticaBold, size: 11, color: gray900, align: "right" });
  drawText(`$${(order.total_amount || 0).toFixed(2)} USD`, colEnd, y, { font: helveticaBold, size: 11, color: gray900, align: "right" });
  y -= 20;

  // ─── Notes ─────────────────────────────────────────────────────
  drawText("Ghi chu", margin, y, { font: helveticaBold, size: 8, color: gray700 });
  y -= 10;

  const notes = [
    "Thanh toan duoc xu ly qua cong PayPal quoc te.",
    "Goi dich vu se tu dong kich hoat sau khi thanh toan thanh cong.",
    "Moi thac mac vui long lien he support@t-nexus.io.vn.",
  ];
  for (const note of notes) {
    drawText(`- ${note}`, margin, y, { size: 7, color: gray500 });
    y -= 10;
  }
  y -= 4;

  // ─── Signature & Stamp ─────────────────────────────────────────
  drawLine(margin, y, pageW - margin);
  y -= 16;

  // PAID stamp (left)
  if (isCompleted) {
    page.drawRectangle({
      x: margin, y: y - 6, width: 120, height: 24,
      borderColor: green600, borderWidth: 1.2,
    });
    drawText("DA THANH TOAN", margin + 8, y, { font: helveticaBold, size: 14, color: green600 });
  }

  // Signature (right)
  const sigX = pageW - margin - 100;
  drawText("Chu ky dien tu", sigX + 50, y + 10, { size: 7, color: gray400, align: "center" });

  y -= 14;
  page.drawLine({ start: { x: sigX + 10, y }, end: { x: sigX + 90, y }, thickness: 0.4, color: gray400 });
  y -= 10;

  drawText("T-Nexus System", sigX + 50, y, { font: helveticaBold, size: 9, color: gray900, align: "center" });
  y -= 10;
  drawText(formatDate(order.completed_at || order.created_at), sigX + 50, y, { size: 7, color: gray400, align: "center" });
  y -= 16;

  // ─── Footer ────────────────────────────────────────────────────
  drawLine(margin, y, pageW - margin);
  y -= 10;

  drawText("Day la hoa don dien tu duoc tao tu dong boi he thong T-Nexus.", pageW / 2, y, { size: 7, color: gray500, align: "center" });
  y -= 10;
  drawText("Ho tro: support@t-nexus.io.vn | https://t-nexus.io.vn", pageW / 2, y, { size: 7, color: gray400, align: "center" });

  // Return as Uint8Array
  const pdfBytes = await pdfDoc.save();
  return new Uint8Array(pdfBytes);
}
