/**
 * Server-side PDF invoice builder using pdf-lib (Deno-compatible)
 * Uses embedded Roboto font for full Vietnamese Unicode support
 */
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";
import { getEmailTexts, type EmailLocale } from "./email-i18n.ts";

const LOGO_URL = "https://xrlczmzgxlmdavhbwsah.supabase.co/storage/v1/object/public/system-assets/t-nexus-text.png";

// Google Fonts CDN - Roboto supports full Vietnamese Unicode
const ROBOTO_REGULAR_URL = "https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxP.ttf";
const ROBOTO_BOLD_URL = "https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmWUlfBBc9.ttf";

function stripVietnamese(str: string): string {
  if (!str) return str;
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0111/g, "d")
    .replace(/\u0110/g, "D")
    .replace(/[^\x00-\x7F]/g, "");
}

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
  locale?: EmailLocale;
}

export async function buildInvoicePdf(params: InvoicePdfParams): Promise<Uint8Array> {
  const { order, profile, locale = 'vi' } = params;
  const t = getEmailTexts(locale);
  const addons: Array<{ type: string; quantity: number }> = Array.isArray(order.addons) ? order.addons : [];
  const cycle = order.billing_cycle;
  const isCompleted = order.status === "completed";
  const planLabel = PLAN_LABELS[order.plan] || order.plan || "Add-on";
  const invoiceNumber = order.order_code ? `INV-${order.order_code}` : `INV-${order.id?.slice(0, 8)?.toUpperCase()}`;

  const ADDON_TYPES = [
    { type: "projects", emoji: "📁", unitLabel: t.pdfAddonProjects },
    { type: "storage", emoji: "💾", unitLabel: t.pdfAddonStorage },
    { type: "members", emoji: "👥", unitLabel: t.pdfAddonMembers },
  ];

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]);
  const { width: pageW, height: pageH } = page.getSize();

  // Try to embed Roboto for Vietnamese support, fallback to Helvetica
  let fontRegular: any;
  let fontBold: any;
  let useCustomFont = false;

  try {
    const [regBytes, boldBytes] = await Promise.all([
      fetch(ROBOTO_REGULAR_URL).then(r => {
        if (!r.ok) throw new Error(`Font fetch failed: ${r.status}`);
        return r.arrayBuffer();
      }),
      fetch(ROBOTO_BOLD_URL).then(r => {
        if (!r.ok) throw new Error(`Font fetch failed: ${r.status}`);
        return r.arrayBuffer();
      }),
    ]);
    fontRegular = await pdfDoc.embedFont(regBytes, { subset: true });
    fontBold = await pdfDoc.embedFont(boldBytes, { subset: true });
    useCustomFont = true;
    console.log("[invoice-pdf] Roboto fonts embedded successfully");
  } catch (fontErr: any) {
    console.warn("[invoice-pdf] Custom font failed, falling back to Helvetica:", fontErr.message);
    fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  }

  const courier = await pdfDoc.embedFont(StandardFonts.Courier);

  const margin = 56.7;
  const contentW = pageW - margin * 2;
  let y = pageH - margin;

  const drawText = (rawText: string, x: number, yPos: number, opts: {
    font?: any; size?: number; color?: any; align?: "left" | "right" | "center";
  } = {}) => {
    // Only strip Vietnamese if using Helvetica fallback
    const text = useCustomFont ? rawText : stripVietnamese(rawText);
    const font = opts.font || fontRegular;
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

  // ─── Fetch and embed logo ─────────────────────────────────────
  let logoImage: any = null;
  try {
    const logoRes = await fetch(LOGO_URL);
    if (logoRes.ok) {
      const logoBytes = new Uint8Array(await logoRes.arrayBuffer());
      logoImage = await pdfDoc.embedPng(logoBytes);
    }
  } catch (_e) { /* fallback to text */ }

  // ─── Header ────────────────────────────────────────────────────
  const headerTopY = y;
  drawText(t.pdfHeader, margin, y, { font: fontBold, size: 22, color: gray900 });
  y -= 12;
  drawText(t.pdfSubHeader, margin, y, { size: 8, color: gray500 });
  y -= 10;
  drawText(invoiceNumber, margin, y, { font: courier, size: 9, color: gray700 });

  if (logoImage) {
    const logoDisplayW = 90;
    const logoDisplayH = (logoImage.height / logoImage.width) * logoDisplayW;
    const logoTopY = headerTopY + 14;
    page.drawImage(logoImage, {
      x: pageW - margin - logoDisplayW,
      y: logoTopY - logoDisplayH,
      width: logoDisplayW,
      height: logoDisplayH,
    });
  } else {
    drawText("T-Nexus", pageW - margin, headerTopY - 4, { font: fontBold, size: 18, color: blue600, align: "right" });
  }
  drawText(t.pdfBrandDesc, pageW - margin, y - 4, { size: 7, color: gray400, align: "right" });

  y -= 12;
  drawLine(margin, y, pageW - margin);
  y -= 12;

  // ─── Invoice Info + Customer (2 columns) ───────────────────────
  const colW = contentW / 2;

  drawText(t.pdfInfoSection, margin, y, { font: fontBold, size: 7, color: gray400 });
  y -= 8;

  const infoLines: [string, string][] = [
    [t.pdfOrderCode, order.order_code || "—"],
    [t.pdfCreatedAt, formatDate(order.created_at)],
  ];
  if (isCompleted && order.completed_at) {
    infoLines.push([t.pdfPaidAt, formatDate(order.completed_at)]);
  }
  infoLines.push([t.pdfPaymentMethod, (order.payment_method || "PayPal").toUpperCase()]);
  infoLines.push([t.pdfStatus, isCompleted ? t.pdfStatusPaid : t.pdfStatusFailed]);

  const infoStartY = y;
  for (const [label, value] of infoLines) {
    const labelW = drawText(label, margin, y, { size: 8, color: gray500 });
    drawText(` ${value}`, margin + labelW + 2, y, {
      font: fontBold,
      size: 8,
      color: label === t.pdfStatus && isCompleted ? green700 : gray900,
    });
    y -= 12;
  }

  let yRight = infoStartY + 8;
  drawText(t.pdfCustomerSection, margin + colW, yRight, { font: fontBold, size: 7, color: gray400 });
  yRight -= 8;

  drawText(profile?.full_name || "—", margin + colW, yRight, { font: fontBold, size: 9, color: gray900 });
  yRight -= 12;

  drawText(profile?.email || "—", margin + colW, yRight, { size: 8, color: gray700 });
  yRight -= 12;

  if (profile?.student_id) {
    drawText(`${t.pdfStudentId} ${profile.student_id}`, margin + colW, yRight, { size: 8, color: gray700 });
    yRight -= 12;
  }
  if (profile?.institution) {
    drawText(`${t.pdfInstitution} ${profile.institution}`, margin + colW, yRight, { size: 8, color: gray700 });
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

    drawText(t.pdfBillingPeriod, margin + 8, y - 4, { font: fontBold, size: 7, color: gray400 });

    const parts: string[] = [];
    if (profile?.plan_started_at) parts.push(`${t.pdfActivated} ${formatDate(profile.plan_started_at)}`);
    if (profile?.plan_expires_at) parts.push(`${t.pdfExpires} ${formatDate(profile.plan_expires_at)}`);
    parts.push(`${t.pdfCycleLabel} ${cycle === "yearly" ? t.pdfCycleYearly : t.pdfCycleMonthly}`);
    drawText(parts.join("    "), margin + 8, y - 18, { size: 8, color: gray700 });

    y -= 40;
  }

  y -= 4;

  // ─── Line Items Table ──────────────────────────────────────────
  const colEnd = pageW - margin;

  drawLine(margin, y, pageW - margin);
  y -= 12;

  drawText(t.pdfColNum, margin, y, { font: fontBold, size: 8, color: gray700 });
  drawText(t.pdfColDesc, margin + 16, y, { font: fontBold, size: 8, color: gray700 });
  drawText(t.pdfColUnit, margin + contentW * 0.5, y, { font: fontBold, size: 8, color: gray700 });
  drawText(t.pdfColQty, margin + contentW * 0.65, y, { font: fontBold, size: 8, color: gray700 });
  drawText(t.pdfColTotal, colEnd, y, { font: fontBold, size: 8, color: gray700, align: "right" });
  y -= 6;

  drawLine(margin, y, pageW - margin);
  y -= 14;

  let itemNum = 0;

  if (order.plan) {
    itemNum++;
    drawText(String(itemNum), margin, y, { font: fontBold, size: 8, color: gray900 });
    drawText(`${planLabel} Plan`, margin + 16, y, { font: fontBold, size: 8, color: gray900 });
    drawText(`$${(order.base_amount || 0).toFixed(2)}`, margin + contentW * 0.5, y, { size: 8, color: gray900 });
    drawText("1", margin + contentW * 0.65, y, { size: 8, color: gray900 });
    drawText(`$${(order.base_amount || 0).toFixed(2)}`, colEnd, y, { font: fontBold, size: 8, color: gray900, align: "right" });
    y -= 10;

    drawText(cycle === "yearly" ? t.pdfPlanYearly : t.pdfPlanMonthly, margin + 16, y, { size: 7, color: gray500 });
    y -= 10;

    page.drawLine({ start: { x: margin, y }, end: { x: pageW - margin, y }, thickness: 0.3, color: rgb(243 / 255, 244 / 255, 246 / 255) });
    y -= 10;
  }

  for (const addon of addons) {
    const meta = ADDON_TYPES.find((a) => a.type === addon.type);
    if (!meta || addon.quantity <= 0) continue;
    itemNum++;
    const unitPrice = cycle === "yearly" ? ADDON_PRICE_MONTHLY * 10 : ADDON_PRICE_MONTHLY;
    const lineTotal = unitPrice * addon.quantity;

    drawText(String(itemNum), margin, y, { font: fontBold, size: 8, color: gray900 });
    drawText(meta.unitLabel, margin + 16, y, { font: fontBold, size: 8, color: gray900 });
    drawText(`$${unitPrice.toFixed(2)}`, margin + contentW * 0.5, y, { size: 8, color: gray900 });
    drawText(String(addon.quantity), margin + contentW * 0.65, y, { size: 8, color: gray900 });
    drawText(`$${lineTotal.toFixed(2)}`, colEnd, y, { font: fontBold, size: 8, color: gray900, align: "right" });
    y -= 10;

    drawText(t.pdfAddonLabel, margin + 16, y, { size: 7, color: gray500 });
    y -= 10;

    page.drawLine({ start: { x: margin, y }, end: { x: pageW - margin, y }, thickness: 0.3, color: rgb(243 / 255, 244 / 255, 246 / 255) });
    y -= 10;
  }

  // Subtotal
  drawLine(margin, y, pageW - margin);
  y -= 14;

  drawText(t.pdfSubtotal, colEnd - 60, y, { size: 8, color: gray500, align: "right" });
  drawText(`$${((order.base_amount || 0) + (order.addon_amount || 0)).toFixed(2)}`, colEnd, y, { size: 8, color: gray900, align: "right" });
  y -= 14;

  if ((order.discount_amount || 0) > 0) {
    const discLabel = order.coupon_code ? t.pdfDiscountCode(order.coupon_code) : t.pdfDiscount;
    drawText(discLabel, colEnd - 60, y, { size: 8, color: green700, align: "right" });
    drawText(`-$${order.discount_amount.toFixed(2)}`, colEnd, y, { size: 8, color: green700, align: "right" });
    y -= 14;
  }

  if ((order.welcome_discount || 0) > 0) {
    drawText(t.pdfWelcomeDiscount, colEnd - 60, y, { size: 8, color: green700, align: "right" });
    drawText(`-$${order.welcome_discount.toFixed(2)}`, colEnd, y, { size: 8, color: green700, align: "right" });
    y -= 14;
  }

  // Total
  page.drawLine({ start: { x: margin, y }, end: { x: pageW - margin, y }, thickness: 0.8, color: gray700 });
  y -= 16;

  drawText(t.pdfTotal, colEnd - 80, y, { font: fontBold, size: 11, color: gray900, align: "right" });
  drawText(`$${(order.total_amount || 0).toFixed(2)} USD`, colEnd, y, { font: fontBold, size: 11, color: gray900, align: "right" });
  y -= 20;

  // ─── Notes ─────────────────────────────────────────────────────
  drawText(t.pdfNotes, margin, y, { font: fontBold, size: 8, color: gray700 });
  y -= 10;

  const notes = [t.pdfNote1, t.pdfNote2, t.pdfNote3];
  for (const note of notes) {
    drawText(`- ${note}`, margin, y, { size: 7, color: gray500 });
    y -= 10;
  }
  y -= 4;

  // ─── Signature & Stamp ─────────────────────────────────────────
  drawLine(margin, y, pageW - margin);
  y -= 16;

  if (isCompleted) {
    page.drawRectangle({
      x: margin, y: y - 6, width: 120, height: 24,
      borderColor: green600, borderWidth: 1.2,
    });
    drawText(t.pdfPaidStamp, margin + 8, y, { font: fontBold, size: 14, color: green600 });
  }

  const sigX = pageW - margin - 100;
  drawText(t.pdfSignatureLabel, sigX + 50, y + 10, { size: 7, color: gray400, align: "center" });

  y -= 14;
  page.drawLine({ start: { x: sigX + 10, y }, end: { x: sigX + 90, y }, thickness: 0.4, color: gray400 });
  y -= 10;

  drawText("T-Nexus System", sigX + 50, y, { font: fontBold, size: 9, color: gray900, align: "center" });
  y -= 10;
  drawText(formatDate(order.completed_at || order.created_at), sigX + 50, y, { size: 7, color: gray400, align: "center" });
  y -= 16;

  // ─── Footer ────────────────────────────────────────────────────
  drawLine(margin, y, pageW - margin);
  y -= 10;

  drawText(t.pdfFooter1, pageW / 2, y, { size: 7, color: gray500, align: "center" });
  y -= 10;
  drawText(t.pdfFooter2, pageW / 2, y, { size: 7, color: gray400, align: "center" });

  const pdfBytes = await pdfDoc.save();
  return new Uint8Array(pdfBytes);
}
