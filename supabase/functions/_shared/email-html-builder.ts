/**
 * Shared email HTML builder for T-Nexus
 * Used by signup-email-otp, password-reset-otp, and email-digest edge functions
 *
 * Design: Clean, minimal, white-background email templates
 * - White background, no gradients, no images
 * - Single accent blue for links and highlights
 * - Simple header / body / footer
 * - Readable, professional, compatible with all email clients
 */

// ─── Design Tokens ───────────────────────────────────────────────────────────
const C = {
  accent:      "#2563eb",   // blue-600 — primary accent (links, highlights)
  accentLight: "#eff6ff",   // blue-50 — light accent background
  accentBorder:"#bfdbfe",   // blue-200 — accent border
  text:        "#111827",   // gray-900
  textSub:     "#374151",   // gray-700
  muted:       "#6b7280",   // gray-500
  subtle:      "#9ca3af",   // gray-400
  border:      "#e5e7eb",   // gray-200
  borderLight: "#f3f4f6",   // gray-100
  bg:          "#ffffff",   // white — email background
  bgLight:     "#f9fafb",   // gray-50 — section background
  warning:     "#92400e",   // amber-800 text
  warningBg:   "#fffbeb",   // amber-50
  warningBdr:  "#fcd34d",   // amber-300
  danger:      "#b91c1c",   // red-700
  dangerBg:    "#fef2f2",   // red-50
  dangerBdr:   "#fca5a5",   // red-300
  success:     "#065f46",   // emerald-800
  successBdr:  "#6ee7b7",   // emerald-300
} as const;

const SITE_URL = "https://t-nexus.io.vn";

// ─── Shared Parts ─────────────────────────────────────────────────────────────

function emailDoctype(): string {
  return `<!DOCTYPE html>
<html lang="vi" dir="ltr" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    * { box-sizing: border-box; }
    body, table, td, p, a, li { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; max-width: 100% !important; }
      .email-padding { padding-left: 24px !important; padding-right: 24px !important; }
      .otp-digit { width: 40px !important; height: 52px !important; font-size: 22px !important; line-height: 52px !important; }
    }
  </style>`;
}

/** Minimal text-only header — brand name + divider */
function emailHeader(subtitle: string): string {
  return `
  <!-- Header -->
  <tr>
    <td style="padding:32px 40px 24px;border-bottom:1px solid ${C.border};">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
        <tr>
          <td style="vertical-align:middle;">
            <span style="font-size:18px;font-weight:700;color:${C.text};font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif;letter-spacing:-0.3px;">T-Nexus</span>
          </td>
          <td style="text-align:right;vertical-align:middle;">
            <span style="font-size:12px;color:${C.muted};font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif;">${subtitle}</span>
          </td>
        </tr>
      </table>
    </td>
  </tr>`;
}

/** Simple footer — copyright + website link */
function emailFooter(year: number): string {
  return `
  <!-- Footer -->
  <tr>
    <td style="padding:24px 40px;border-top:1px solid ${C.border};text-align:center;">
      <p style="margin:0 0 8px;color:${C.subtle};font-size:11px;font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif;line-height:1.6;">
        &copy; ${year} T-Nexus. All rights reserved.
      </p>
      <a href="${SITE_URL}" style="color:${C.accent};font-size:11px;text-decoration:none;font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif;">
        t-nexus.io.vn
      </a>
    </td>
  </tr>`;
}

/** Sub-footer note below the card */
function emailSubFooter(noteText: string): string {
  return `
  <!-- Sub-footer -->
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:540px;margin-top:16px;">
    <tr>
      <td style="text-align:center;padding:0 20px;">
        <p style="margin:0;color:${C.subtle};font-size:10px;line-height:1.7;font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif;">
          ${noteText}
        </p>
      </td>
    </tr>
  </table>`;
}

// ─── OTP Email ─────────────────────────────────────────────────────────────────

interface EmailOptions {
  title: string;
  subtitle: string;
  otpCode: string;
  expiryText: string;
  warningText: string;
  ignoreText: string;
}

export function buildBrandedOtpEmail(options: EmailOptions): string {
  const { title, subtitle, otpCode, expiryText, warningText, ignoreText } = options;
  const year = new Date().getFullYear();

  const digitBoxes = otpCode
    .split("")
    .map(
      (d) =>
        `<td style="padding:0 4px;">
          <div class="otp-digit" style="width:46px;height:58px;background-color:${C.accentLight};border:1.5px solid ${C.accentBorder};border-radius:8px;line-height:58px;text-align:center;font-size:26px;font-weight:700;color:${C.accent};font-family:'Courier New',Courier,monospace;">
            ${d}
          </div>
        </td>`
    )
    .join("");

  return `${emailDoctype()}
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:${C.bg};font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:${C.bg};padding:32px 16px;">
    <tr><td align="center">

      <!-- Main Card -->
      <table class="email-container" width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:540px;background-color:${C.bg};border:1px solid ${C.border};border-radius:12px;overflow:hidden;">

        ${emailHeader(subtitle)}

        <!-- Body -->
        <tr>
          <td class="email-padding" style="padding:36px 40px 28px;">

            <!-- Title -->
            <h1 style="margin:0 0 8px;color:${C.text};font-size:20px;font-weight:700;line-height:1.3;font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif;">
              ${title}
            </h1>
            <p style="margin:0 0 28px;color:${C.muted};font-size:14px;line-height:1.6;font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif;">
              ${expiryText}
            </p>

            <!-- OTP Digits -->
            <table cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 8px;">
              <tr>${digitBoxes}</tr>
            </table>
            <p style="margin:0 0 28px;color:${C.subtle};font-size:11px;font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif;">
              Nhập mã trên vào ứng dụng để tiếp tục
            </p>

            <!-- Divider -->
            <div style="height:1px;background-color:${C.border};margin-bottom:20px;"></div>

            <!-- Security note -->
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:20px;">
              <tr>
                <td style="background-color:${C.warningBg};border:1px solid ${C.warningBdr};border-radius:8px;padding:12px 16px;">
                  <p style="margin:0;color:${C.warning};font-size:12px;line-height:1.6;font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif;">
                    ${warningText}
                  </p>
                </td>
              </tr>
            </table>

            <!-- Ignore note -->
            <p style="margin:0;color:${C.subtle};font-size:12px;line-height:1.5;font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif;">
              ${ignoreText}
            </p>

          </td>
        </tr>

        ${emailFooter(year)}

      </table>

      ${emailSubFooter("Email này được gửi tự động từ hệ thống T-Nexus.<br/>Vui lòng không trả lời email này.")}

    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Digest Email ──────────────────────────────────────────────────────────────

interface DigestTask {
  title: string;
  project: string;
  deadline?: string;
  hoursLeft?: number;
  deadlineDisplay?: string;
}

interface DigestEmailOptions {
  recipientName: string;
  deadlineTasks: DigestTask[];
  newTasks: DigestTask[];
}

export function buildBrandedDigestEmail(options: DigestEmailOptions): string {
  const { recipientName, deadlineTasks, newTasks } = options;
  const year = new Date().getFullYear();

  let sectionsHtml = "";

  // ── Deadline tasks section ─────────────────────────────────────
  if (deadlineTasks.length > 0) {
    let taskRows = "";
    for (const task of deadlineTasks) {
      const urgencyColor =
        task.hoursLeft !== undefined
          ? task.hoursLeft <= 6
            ? C.danger
            : task.hoursLeft <= 12
            ? "#d97706"   // amber-600
            : "#b45309"   // amber-700
          : C.danger;
      const hoursText = task.hoursLeft !== undefined ? `còn ${task.hoursLeft}h` : "";

      taskRows += `
        <tr>
          <td style="padding:12px 16px;border-bottom:1px solid ${C.borderLight};">
            <p style="margin:0 0 2px;color:${C.text};font-size:14px;font-weight:600;line-height:1.4;font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif;">${task.title}</p>
            <p style="margin:0;color:${C.muted};font-size:12px;line-height:1.4;font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif;">
              ${task.project}${hoursText ? ` &mdash; <span style="color:${urgencyColor};font-weight:600;">${hoursText}</span>` : ""}
            </p>
          </td>
        </tr>`;
    }

    sectionsHtml += `
      <!-- Deadline Section -->
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:24px;">
        <tr>
          <td style="padding-bottom:10px;">
            <span style="font-size:13px;font-weight:600;color:${C.danger};font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif;">
              Deadline sắp hết
            </span>
            <span style="font-size:12px;color:${C.muted};margin-left:6px;font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif;">
              (${deadlineTasks.length} task)
            </span>
          </td>
        </tr>
        <tr>
          <td style="border:1px solid ${C.dangerBdr};border-left:3px solid ${C.danger};border-radius:8px;overflow:hidden;background-color:${C.bg};">
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
              ${taskRows}
            </table>
          </td>
        </tr>
      </table>`;
  }

  // ── New tasks section ──────────────────────────────────────────
  if (newTasks.length > 0) {
    let taskRows = "";
    for (const task of newTasks) {
      const deadlineStr = task.deadlineDisplay || "Chưa có";

      taskRows += `
        <tr>
          <td style="padding:12px 16px;border-bottom:1px solid ${C.borderLight};">
            <p style="margin:0 0 2px;color:${C.text};font-size:14px;font-weight:600;line-height:1.4;font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif;">${task.title}</p>
            <p style="margin:0;color:${C.muted};font-size:12px;line-height:1.4;font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif;">
              ${task.project} &mdash; ${deadlineStr}
            </p>
          </td>
        </tr>`;
    }

    sectionsHtml += `
      <!-- New Tasks Section -->
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:24px;">
        <tr>
          <td style="padding-bottom:10px;">
            <span style="font-size:13px;font-weight:600;color:${C.accent};font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif;">
              Task mới được giao
            </span>
            <span style="font-size:12px;color:${C.muted};margin-left:6px;font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif;">
              (${newTasks.length} task)
            </span>
          </td>
        </tr>
        <tr>
          <td style="border:1px solid ${C.accentBorder};border-left:3px solid ${C.accent};border-radius:8px;overflow:hidden;background-color:${C.bg};">
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
              ${taskRows}
            </table>
          </td>
        </tr>
      </table>`;
  }

  return `${emailDoctype()}
  <title>Cập nhật hàng ngày - T-Nexus</title>
</head>
<body style="margin:0;padding:0;background-color:${C.bg};font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:${C.bg};padding:32px 16px;">
    <tr><td align="center">

      <!-- Main Card -->
      <table class="email-container" width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:560px;background-color:${C.bg};border:1px solid ${C.border};border-radius:12px;overflow:hidden;">

        ${emailHeader("Cập nhật dự án hàng ngày")}

        <!-- Body -->
        <tr>
          <td class="email-padding" style="padding:32px 40px 24px;">

            <!-- Greeting -->
            <h1 style="margin:0 0 6px;color:${C.text};font-size:18px;font-weight:700;line-height:1.3;font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif;">
              Xin chào ${recipientName},
            </h1>
            <p style="margin:0 0 24px;color:${C.muted};font-size:14px;line-height:1.5;font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif;">
              Đây là tóm tắt hoạt động dự án hôm nay của bạn.
            </p>

            <!-- Divider -->
            <div style="height:1px;background-color:${C.border};margin-bottom:24px;"></div>

            ${sectionsHtml}

            <!-- Summary note -->
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
              <tr>
                <td style="background-color:${C.bgLight};border:1px solid ${C.border};border-radius:8px;padding:12px 16px;text-align:center;">
                  <p style="margin:0;color:${C.muted};font-size:13px;line-height:1.5;font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif;">
                    Truy cập
                    <a href="${SITE_URL}" style="color:${C.accent};text-decoration:none;font-weight:600;">t-nexus.io.vn</a>
                    để xem chi tiết và cập nhật tiến độ.
                  </p>
                </td>
              </tr>
            </table>

          </td>
        </tr>

        ${emailFooter(year)}

      </table>

      ${emailSubFooter("Email tự động từ T-Nexus &middot; Bạn có thể tắt trong phần Thông tin cá nhân.")}

    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Payment Confirmation Email ───────────────────────────────────────────────

interface PaymentConfirmationOptions {
  recipientName: string;
  planName: string;
  amount: number;
  orderCode: string;
  paidAt: string;
  billingCycle: string;
}

export function buildPaymentConfirmationEmail(options: PaymentConfirmationOptions): string {
  const { recipientName, planName, amount, orderCode, paidAt, billingCycle } = options;
  const year = new Date().getFullYear();
  const cycleLabel = billingCycle === "yearly" ? "Năm" : "Tháng";

  const formatDate = (d: string) => {
    const date = new Date(d);
    return `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1).toString().padStart(2, "0")}/${date.getFullYear()} ${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
  };

  return `${emailDoctype()}
  <title>Xác nhận thanh toán - T-Nexus</title>
</head>
<body style="margin:0;padding:0;background-color:${C.bg};font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:${C.bg};padding:32px 16px;">
    <tr><td align="center">

      <!-- Main Card -->
      <table class="email-container" width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:540px;background-color:${C.bg};border:1px solid ${C.border};border-radius:12px;overflow:hidden;">

        ${emailHeader("Xác nhận thanh toán")}

        <!-- Body -->
        <tr>
          <td class="email-padding" style="padding:36px 40px 28px;">

            <!-- Success Icon -->
            <div style="text-align:center;margin-bottom:20px;">
              <div style="display:inline-block;width:56px;height:56px;border-radius:50%;background-color:#ecfdf5;line-height:56px;text-align:center;font-size:28px;">
                ✓
              </div>
            </div>

            <!-- Title -->
            <h1 style="margin:0 0 8px;color:${C.text};font-size:20px;font-weight:700;line-height:1.3;text-align:center;font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif;">
              Thanh toán thành công!
            </h1>
            <p style="margin:0 0 24px;color:${C.muted};font-size:14px;line-height:1.6;text-align:center;font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif;">
              Xin chào <strong>${recipientName}</strong>, giao dịch của bạn đã được xác nhận.
            </p>

            <!-- Order Summary Table -->
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:${C.bgLight};border:1px solid ${C.border};border-radius:8px;overflow:hidden;margin-bottom:20px;">
              <tr>
                <td style="padding:12px 16px;border-bottom:1px solid ${C.border};">
                  <span style="color:${C.muted};font-size:12px;font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif;">Gói dịch vụ</span><br/>
                  <span style="color:${C.text};font-size:14px;font-weight:600;font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif;">${planName}</span>
                </td>
                <td style="padding:12px 16px;border-bottom:1px solid ${C.border};text-align:right;">
                  <span style="color:${C.muted};font-size:12px;font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif;">Chu kỳ</span><br/>
                  <span style="color:${C.text};font-size:14px;font-weight:600;font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif;">${cycleLabel}</span>
                </td>
              </tr>
              <tr>
                <td style="padding:12px 16px;border-bottom:1px solid ${C.border};">
                  <span style="color:${C.muted};font-size:12px;font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif;">Mã đơn hàng</span><br/>
                  <span style="color:${C.text};font-size:14px;font-weight:600;font-family:'Courier New',Courier,monospace;">${orderCode}</span>
                </td>
                <td style="padding:12px 16px;border-bottom:1px solid ${C.border};text-align:right;">
                  <span style="color:${C.muted};font-size:12px;font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif;">Thời gian</span><br/>
                  <span style="color:${C.text};font-size:13px;font-weight:600;font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif;">${formatDate(paidAt)}</span>
                </td>
              </tr>
              <tr>
                <td colspan="2" style="padding:14px 16px;text-align:center;">
                  <span style="color:${C.muted};font-size:12px;font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif;">Tổng thanh toán</span><br/>
                  <span style="color:${C.accent};font-size:22px;font-weight:700;font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif;">$${amount.toFixed(2)} USD</span>
                </td>
              </tr>
            </table>

            <!-- Attachment note -->
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:20px;">
              <tr>
                <td style="background-color:${C.accentLight};border:1px solid ${C.accentBorder};border-radius:8px;padding:12px 16px;">
                  <p style="margin:0;color:${C.accent};font-size:12px;line-height:1.6;font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif;">
                    📎 Biên lai chi tiết được đính kèm trong email này dưới dạng file PDF.
                  </p>
                </td>
              </tr>
            </table>

            <!-- Divider -->
            <div style="height:1px;background-color:${C.border};margin-bottom:16px;"></div>

            <!-- Help note -->
            <p style="margin:0;color:${C.subtle};font-size:12px;line-height:1.5;font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif;">
              Nếu bạn có thắc mắc, vui lòng liên hệ <a href="mailto:support@t-nexus.io.vn" style="color:${C.accent};text-decoration:none;">support@t-nexus.io.vn</a>.
            </p>

          </td>
        </tr>

        ${emailFooter(year)}

      </table>

      ${emailSubFooter("Email này được gửi tự động từ hệ thống T-Nexus.<br/>Vui lòng không trả lời email này.")}

    </td></tr>
  </table>
</body>
</html>`;
}
