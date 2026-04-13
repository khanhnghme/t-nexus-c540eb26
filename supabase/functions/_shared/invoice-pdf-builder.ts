/**
 * Server-side PDF invoice builder using jsPDF
 * Generates a professional invoice matching the PrintableInvoice component layout
 */
import { jsPDF } from "https://esm.sh/jspdf@2.5.2";

const ADDON_TYPES = [
  { type: "projects", emoji: "📁", unitLabel: "+5 dự án" },
  { type: "storage", emoji: "💾", unitLabel: "+5 GB lưu trữ" },
  { type: "members", emoji: "👥", unitLabel: "+10 thành viên" },
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

interface InvoicePdfParams {
  order: any;
  profile: any;
}

export function buildInvoicePdf(params: InvoicePdfParams): Uint8Array {
  const { order, profile } = params;
  const addons: Array<{ type: string; quantity: number }> = Array.isArray(order.addons) ? order.addons : [];
  const cycle = order.billing_cycle;
  const isCompleted = order.status === "completed";
  const planLabel = PLAN_LABELS[order.plan] || order.plan || "Add-on";
  const invoiceNumber = order.order_code ? `INV-${order.order_code}` : `INV-${order.id?.slice(0, 8)?.toUpperCase()}`;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentW = pageW - margin * 2;
  let y = margin;

  // Colors
  const gray900 = [17, 24, 39];
  const gray700 = [55, 65, 81];
  const gray500 = [107, 114, 128];
  const gray400 = [156, 163, 175];
  const gray200 = [229, 231, 235];
  const green700 = [21, 128, 61];
  const green600 = [22, 163, 74];
  const red600 = [220, 38, 38];
  const blue600 = [37, 99, 235];

  // ─── Header ────────────────────────────────────────────────────
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...gray900);
  doc.text("HÓA ĐƠN", margin, y + 7);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...gray500);
  doc.text("Biên nhận thanh toán điện tử", margin, y + 13);

  doc.setFontSize(9);
  doc.setFont("courier", "bold");
  doc.setTextColor(...gray700);
  doc.text(invoiceNumber, margin, y + 19);

  // Right side — brand
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...blue600);
  doc.text("T-Nexus", pageW - margin, y + 8, { align: "right" });

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...gray400);
  doc.text("Dịch vụ quản lý dự án số", pageW - margin, y + 14, { align: "right" });

  y += 24;

  // Divider
  doc.setDrawColor(...gray200);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  // ─── Invoice Info + Customer (2 columns) ───────────────────────
  const colW = contentW / 2;

  // Left: Invoice Details
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...gray400);
  doc.text("THÔNG TIN HÓA ĐƠN", margin, y);
  y += 5;

  const infoLines: [string, string][] = [
    ["Mã đơn hàng:", order.order_code || "—"],
    ["Ngày tạo:", formatDate(order.created_at)],
  ];
  if (isCompleted && order.completed_at) {
    infoLines.push(["Ngày thanh toán:", formatDate(order.completed_at)]);
  }
  infoLines.push(["Phương thức:", (order.payment_method || "PayPal").toUpperCase()]);
  infoLines.push(["Trạng thái:", isCompleted ? "Đã thanh toán" : "Thất bại"]);

  const infoStartY = y;
  for (const [label, value] of infoLines) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...gray500);
    doc.text(label, margin, y);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(isCompleted && label === "Trạng thái:" ? [...green700] : [...gray900]);
    doc.text(` ${value}`, margin + doc.getTextWidth(label) + 1, y);
    y += 4.5;
  }

  // Right: Customer Info
  let yRight = infoStartY - 5;
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...gray400);
  doc.text("THÔNG TIN KHÁCH HÀNG", margin + colW, yRight);
  yRight += 5;

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...gray900);
  doc.text(profile?.full_name || "—", margin + colW, yRight);
  yRight += 4.5;

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...gray700);
  doc.text(profile?.email || "—", margin + colW, yRight);
  yRight += 4.5;

  if (profile?.student_id) {
    doc.text(`MSSV: ${profile.student_id}`, margin + colW, yRight);
    yRight += 4.5;
  }
  if (profile?.institution) {
    doc.text(`Trường: ${profile.institution}`, margin + colW, yRight);
    yRight += 4.5;
  }

  y = Math.max(y, yRight) + 6;

  // ─── Billing Period ────────────────────────────────────────────
  if (isCompleted && order.plan && (profile?.plan_started_at || profile?.plan_expires_at)) {
    doc.setFillColor(249, 250, 251);
    doc.setDrawColor(...gray200);
    doc.roundedRect(margin, y, contentW, 14, 2, 2, "FD");
    y += 4;

    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...gray400);
    doc.text("CHU KỲ THANH TOÁN", margin + 4, y);
    y += 4.5;

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...gray700);
    const parts: string[] = [];
    if (profile?.plan_started_at) parts.push(`Kích hoạt: ${formatDate(profile.plan_started_at)}`);
    if (profile?.plan_expires_at) parts.push(`Hết hạn: ${formatDate(profile.plan_expires_at)}`);
    parts.push(`Chu kỳ: ${cycle === "yearly" ? "12 tháng" : "1 tháng"}`);
    doc.text(parts.join("    "), margin + 4, y);
    y += 8;
  }

  y += 2;

  // ─── Line Items Table ──────────────────────────────────────────
  const cols = [margin, margin + 8, margin + 8 + contentW * 0.45, margin + 8 + contentW * 0.65, margin + 8 + contentW * 0.78];
  const colEnd = pageW - margin;

  // Header row
  doc.setDrawColor(...gray200);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageW - margin, y);
  y += 4;

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...gray700);
  doc.text("#", cols[0], y);
  doc.text("Mô tả", cols[1], y);
  doc.text("Đơn giá", cols[2], y);
  doc.text("SL", cols[3], y);
  doc.text("Thành tiền", colEnd, y, { align: "right" });
  y += 2;

  doc.setLineWidth(0.4);
  doc.line(margin, y, pageW - margin, y);
  y += 5;

  let itemNum = 0;

  // Plan row
  if (order.plan) {
    itemNum++;
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...gray900);
    doc.text(String(itemNum), cols[0], y);
    doc.text(`${planLabel} Plan`, cols[1], y);
    doc.setFont("helvetica", "normal");
    doc.text(`$${(order.base_amount || 0).toFixed(2)}`, cols[2], y);
    doc.text("1", cols[3], y);
    doc.setFont("helvetica", "bold");
    doc.text(`$${(order.base_amount || 0).toFixed(2)}`, colEnd, y, { align: "right" });
    y += 3.5;

    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...gray500);
    doc.text(cycle === "yearly" ? "Gói năm (12 tháng)" : "Gói tháng (1 tháng)", cols[1], y);
    y += 4;

    doc.setDrawColor(243, 244, 246);
    doc.line(margin, y, pageW - margin, y);
    y += 4;
  }

  // Addon rows
  for (const addon of addons) {
    const meta = ADDON_TYPES.find((a) => a.type === addon.type);
    if (!meta || addon.quantity <= 0) continue;
    itemNum++;
    const unitPrice = cycle === "yearly" ? ADDON_PRICE_MONTHLY * 10 : ADDON_PRICE_MONTHLY;
    const lineTotal = unitPrice * addon.quantity;

    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...gray900);
    doc.text(String(itemNum), cols[0], y);
    doc.text(`${meta.unitLabel}`, cols[1], y);
    doc.setFont("helvetica", "normal");
    doc.text(`$${unitPrice.toFixed(2)}`, cols[2], y);
    doc.text(String(addon.quantity), cols[3], y);
    doc.setFont("helvetica", "bold");
    doc.text(`$${lineTotal.toFixed(2)}`, colEnd, y, { align: "right" });
    y += 3.5;

    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...gray500);
    doc.text("Gói bổ sung", cols[1], y);
    y += 4;

    doc.setDrawColor(243, 244, 246);
    doc.line(margin, y, pageW - margin, y);
    y += 4;
  }

  // Subtotal
  doc.setDrawColor(...gray200);
  doc.line(margin, y, pageW - margin, y);
  y += 5;

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...gray500);
  doc.text("Tạm tính", colEnd - 30, y, { align: "right" });
  doc.setTextColor(...gray900);
  doc.text(`$${((order.base_amount || 0) + (order.addon_amount || 0)).toFixed(2)}`, colEnd, y, { align: "right" });
  y += 5;

  // Discounts
  if ((order.discount_amount || 0) > 0) {
    doc.setTextColor(...green700);
    const discLabel = order.coupon_code ? `Mã giảm giá (${order.coupon_code})` : "Giảm giá";
    doc.text(discLabel, colEnd - 30, y, { align: "right" });
    doc.text(`-$${order.discount_amount.toFixed(2)}`, colEnd, y, { align: "right" });
    y += 5;
  }

  if ((order.welcome_discount || 0) > 0) {
    doc.setTextColor(...green700);
    doc.text("Ưu đãi chào mừng", colEnd - 30, y, { align: "right" });
    doc.text(`-$${order.welcome_discount.toFixed(2)}`, colEnd, y, { align: "right" });
    y += 5;
  }

  // Total
  doc.setDrawColor(...gray700);
  doc.setLineWidth(0.6);
  doc.line(margin, y, pageW - margin, y);
  y += 6;

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...gray900);
  doc.text("TỔNG CỘNG", colEnd - 40, y, { align: "right" });
  doc.text(`$${(order.total_amount || 0).toFixed(2)} USD`, colEnd, y, { align: "right" });
  y += 10;

  // ─── Notes ─────────────────────────────────────────────────────
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...gray700);
  doc.text("Ghi chú", margin, y);
  y += 4;

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...gray500);
  const notes = [
    "Thanh toán được xử lý qua cổng PayPal quốc tế.",
    "Gói dịch vụ sẽ tự động kích hoạt sau khi thanh toán thành công.",
    "Mọi thắc mắc vui lòng liên hệ support@t-nexus.io.vn.",
  ];
  for (const note of notes) {
    doc.text(`• ${note}`, margin, y);
    y += 3.5;
  }
  y += 4;

  // ─── Signature & Stamp ─────────────────────────────────────────
  doc.setDrawColor(...gray200);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageW - margin, y);
  y += 6;

  // PAID stamp (left)
  if (isCompleted) {
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...green600);
    doc.setDrawColor(...green600);
    doc.setLineWidth(0.8);
    doc.roundedRect(margin, y - 2, 40, 12, 2, 2, "S");
    doc.text("ĐÃ THANH TOÁN", margin + 3, y + 6);
  }

  // Signature (right)
  const sigX = pageW - margin - 40;
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...gray400);
  doc.text("Chữ ký điện tử", sigX + 20, y, { align: "center" });

  y += 12;
  doc.setDrawColor(...gray400);
  doc.line(sigX, y, sigX + 40, y);
  y += 4;

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...gray900);
  doc.text("T-Nexus System", sigX + 20, y, { align: "center" });
  y += 3.5;

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...gray400);
  doc.text(formatDate(order.completed_at || order.created_at), sigX + 20, y, { align: "center" });
  y += 8;

  // ─── Footer ────────────────────────────────────────────────────
  doc.setDrawColor(...gray200);
  doc.line(margin, y, pageW - margin, y);
  y += 4;

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...gray500);
  doc.text("Đây là hóa đơn điện tử được tạo tự động bởi hệ thống T-Nexus.", pageW / 2, y, { align: "center" });
  y += 3.5;
  doc.setTextColor(...gray400);
  doc.text("Hỗ trợ: support@t-nexus.io.vn | https://t-nexus.io.vn", pageW / 2, y, { align: "center" });

  // Return as Uint8Array
  const arrayBuf = doc.output("arraybuffer");
  return new Uint8Array(arrayBuf);
}
