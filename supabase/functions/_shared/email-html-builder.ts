/**
 * Shared email HTML builder for T-Nexus
 * Used by signup-email-otp, password-reset-otp, and email-digest edge functions
 *
 * Design: Clean, minimal, white-background email templates
 */

import { getEmailTexts, type EmailLocale } from "./email-i18n.ts";

// ─── Design Tokens ───────────────────────────────────────────────────────────
const C = {
  accent:      "#2563eb",
  accentLight: "#eff6ff",
  accentBorder:"#bfdbfe",
  text:        "#111827",
  textSub:     "#374151",
  muted:       "#6b7280",
  subtle:      "#9ca3af",
  border:      "#e5e7eb",
  borderLight: "#f3f4f6",
  bg:          "#ffffff",
  bgLight:     "#f9fafb",
  warning:     "#92400e",
  warningBg:   "#fffbeb",
  warningBdr:  "#fcd34d",
  danger:      "#b91c1c",
  dangerBg:    "#fef2f2",
  dangerBdr:   "#fca5a5",
  success:     "#065f46",
  successBdr:  "#6ee7b7",
} as const;

const SITE_URL = "https://t-nexus.io.vn";

// ─── Shared Parts ─────────────────────────────────────────────────────────────

function emailDoctype(locale: EmailLocale = 'vi'): string {
  return `<!DOCTYPE html>
<html lang="${locale}" dir="ltr" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
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
      .otp-digit { width: 34px !important; height: 44px !important; font-size: 20px !important; line-height: 44px !important; }
      .otp-table { margin: 0 auto !important; }
    }
  </style>`;
}

const LOGO_URL = "https://xrlczmzgxlmdavhbwsah.supabase.co/storage/v1/object/public/system-assets/t-nexus-text.png";

function emailHeader(subtitle: string): string {
  return `
  <!-- Header -->
  <tr>
    <td style="padding:32px 40px 24px;border-bottom:1px solid ${C.border};">
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
        <tr>
          <td style="vertical-align:middle;">
            <img src="${LOGO_URL}" alt="T-Nexus" width="120" height="auto" style="display:block;border:0;outline:none;max-width:120px;height:auto;" />
          </td>
          <td style="text-align:right;vertical-align:middle;">
            <span style="font-size:12px;color:${C.muted};font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif;">${subtitle}</span>
          </td>
        </tr>
      </table>
    </td>
  </tr>`;
}

function emailFooter(year: number, locale: EmailLocale = 'vi'): string {
  const t = getEmailTexts(locale);
  return `
  <!-- Footer -->
  <tr>
    <td style="padding:24px 40px;border-top:1px solid ${C.border};text-align:center;">
      <p style="margin:0 0 8px;color:${C.subtle};font-size:11px;font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif;line-height:1.6;">
        ${t.footerCopyright(year)}
      </p>
      <a href="${SITE_URL}" style="color:${C.accent};font-size:11px;text-decoration:none;font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif;">
        t-nexus.io.vn
      </a>
    </td>
  </tr>`;
}

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

function avatarHtml(avatarUrl?: string, name?: string, size = 48): string {
  if (avatarUrl) {
    return `<img src="${avatarUrl}" alt="${name || ''}" width="${size}" height="${size}" style="display:block;width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;border:2px solid ${C.border};" />`;
  }
  const initials = (name || '?').split(' ').map(w => w[0] || '').join('').slice(0, 2).toUpperCase();
  return `<div style="width:${size}px;height:${size}px;border-radius:50%;background-color:${C.accentLight};border:2px solid ${C.accentBorder};display:inline-block;text-align:center;line-height:${size}px;font-size:${Math.round(size * 0.4)}px;font-weight:700;color:${C.accent};font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif;">${initials}</div>`;
}

// ─── OTP Email ─────────────────────────────────────────────────────────────────

interface EmailOptions {
  title: string;
  subtitle: string;
  otpCode: string;
  expiryText: string;
  warningText: string;
  ignoreText: string;
  locale?: EmailLocale;
}

export function buildBrandedOtpEmail(options: EmailOptions): string {
  const { title, subtitle, otpCode, expiryText, warningText, ignoreText, locale = 'vi' } = options;
  const year = new Date().getFullYear();
  const t = getEmailTexts(locale);

  const otpDisplay = `<div style="text-align:center;margin:0 0 8px;">
              <span style="display:inline-block;padding:14px 28px;background-color:${C.accentLight};border:1.5px solid ${C.accentBorder};border-radius:8px;font-size:28px;font-weight:700;letter-spacing:10px;color:${C.accent};font-family:'Courier New',Courier,monospace;">${otpCode}</span>
            </div>
            <p style="margin:0 0 28px;color:${C.subtle};font-size:11px;text-align:center;font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif;">
              ${t.otpEnterCode}
            </p>`;

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

        ${emailFooter(year, locale)}

      </table>

      ${emailSubFooter(t.subFooterAutoEmail)}

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
  locale?: EmailLocale;
  avatarUrl?: string;
}

export function buildBrandedDigestEmail(options: DigestEmailOptions): string {
  const { recipientName, deadlineTasks, newTasks, locale = 'vi', avatarUrl } = options;
  const year = new Date().getFullYear();
  const t = getEmailTexts(locale);

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
            ? "#d97706"
            : "#b45309"
          : C.danger;
      const hoursText = task.hoursLeft !== undefined ? t.digestHoursLeft(task.hoursLeft) : "";

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
              ${t.digestDeadlineSection}
            </span>
            <span style="font-size:12px;color:${C.muted};margin-left:6px;font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif;">
              (${deadlineTasks.length} task${locale === 'en' && deadlineTasks.length > 1 ? 's' : ''})
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
      const deadlineStr = task.deadlineDisplay || t.digestNoDeadline;

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
              ${t.digestNewTaskSection}
            </span>
            <span style="font-size:12px;color:${C.muted};margin-left:6px;font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif;">
              (${newTasks.length} task${locale === 'en' && newTasks.length > 1 ? 's' : ''})
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

  return `${emailDoctype(locale)}
  <title>${t.digestTitle}</title>
</head>
<body style="margin:0;padding:0;background-color:${C.bg};font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:${C.bg};padding:32px 16px;">
    <tr><td align="center">

      <!-- Main Card -->
      <table class="email-container" width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:560px;background-color:${C.bg};border:1px solid ${C.border};border-radius:12px;overflow:hidden;">

        ${emailHeader(t.digestSubtitle)}

        <!-- Body -->
        <tr>
          <td class="email-padding" style="padding:32px 40px 24px;">

            <!-- Greeting with avatar -->
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:24px;">
              <tr>
                <td style="width:56px;vertical-align:top;padding-right:14px;">
                  ${avatarHtml(avatarUrl, recipientName, 48)}
                </td>
                <td style="vertical-align:middle;">
                  <h1 style="margin:0 0 4px;color:${C.text};font-size:18px;font-weight:700;line-height:1.3;font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif;">
                    ${t.digestGreeting(recipientName)}
                  </h1>
                  <p style="margin:0;color:${C.muted};font-size:14px;line-height:1.5;font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif;">
                    ${t.digestSummary}
                  </p>
                </td>
              </tr>
            </table>

            <!-- Divider -->
            <div style="height:1px;background-color:${C.border};margin-bottom:24px;"></div>

            ${sectionsHtml}

            <!-- Summary note -->
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
              <tr>
                <td style="background-color:${C.bgLight};border:1px solid ${C.border};border-radius:8px;padding:12px 16px;text-align:center;">
                  <p style="margin:0;color:${C.muted};font-size:13px;line-height:1.5;font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif;">
                    ${t.digestVisitNote}
                    <a href="${SITE_URL}" style="color:${C.accent};text-decoration:none;font-weight:600;">t-nexus.io.vn</a>
                    ${t.digestVisitAction}
                  </p>
                </td>
              </tr>
            </table>

          </td>
        </tr>

        ${emailFooter(year, locale)}

      </table>

      ${emailSubFooter(t.subFooterDigest)}

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
  locale?: EmailLocale;
  avatarUrl?: string;
}

export function buildPaymentConfirmationEmail(options: PaymentConfirmationOptions): string {
  const { recipientName, planName, amount, orderCode, paidAt, billingCycle, locale = 'vi', avatarUrl } = options;
  const year = new Date().getFullYear();
  const t = getEmailTexts(locale);
  const cycleLabel = billingCycle === "yearly" ? t.cycleYearly : t.cycleMonthly;

  const formatDate = (d: string) => {
    const date = new Date(d);
    return `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1).toString().padStart(2, "0")}/${date.getFullYear()} ${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
  };

  const font = "'Segoe UI','Helvetica Neue',Arial,sans-serif";

  const infoRow = (label: string, value: string, isLast = false) => `
    <tr>
      <td style="padding:10px 16px;${isLast ? "" : `border-bottom:1px solid ${C.borderLight};`}font-size:13px;color:${C.muted};font-family:${font};">${label}</td>
      <td style="padding:10px 16px;${isLast ? "" : `border-bottom:1px solid ${C.borderLight};`}font-size:13px;font-weight:600;color:${C.text};text-align:right;font-family:${font};">${value}</td>
    </tr>`;

  return `${emailDoctype(locale)}
  <title>${t.paymentHeaderSubtitle} - T-Nexus</title>
</head>
<body style="margin:0;padding:0;background-color:${C.bg};font-family:${font};-webkit-font-smoothing:antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:${C.bg};padding:32px 16px;">
    <tr><td align="center">

      <!-- Main Card -->
      <table class="email-container" width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:540px;background-color:${C.bg};border:1px solid ${C.border};border-radius:12px;overflow:hidden;">

        ${emailHeader(t.paymentHeaderSubtitle)}

        <!-- Body -->
        <tr>
          <td class="email-padding" style="padding:32px 40px 28px;">

            <!-- Title + Avatar -->
            <h1 style="margin:0 0 12px;color:${C.success};font-size:18px;font-weight:700;line-height:1.3;font-family:${font};">
              ${t.paymentSuccessTitle}
            </h1>
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:24px;">
              <tr>
                <td style="width:56px;vertical-align:top;padding-right:14px;">
                  ${avatarHtml(avatarUrl, recipientName, 48)}
                </td>
                <td style="vertical-align:middle;">
                  <p style="margin:0;color:${C.muted};font-size:14px;line-height:1.6;font-family:${font};">
                    ${t.paymentGreeting(recipientName)}
                  </p>
                </td>
              </tr>
            </table>

            <!-- Order Info — stacked rows -->
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:${C.bgLight};border:1px solid ${C.border};border-radius:8px;overflow:hidden;margin-bottom:16px;">
              ${infoRow(t.paymentPlan, planName)}
              ${infoRow(t.paymentCycle, cycleLabel)}
              ${infoRow(t.paymentOrderCode, `<span style="font-family:'Courier New',Courier,monospace;">${orderCode}</span>`)}
              ${infoRow(t.paymentTime, formatDate(paidAt), true)}
            </table>

            <!-- Total -->
            <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:20px;">
              <tr>
                <td style="padding:14px 16px;background-color:${C.accentLight};border:1px solid ${C.accentBorder};border-radius:8px;text-align:center;">
                  <span style="color:${C.muted};font-size:12px;display:block;margin-bottom:4px;font-family:${font};">${t.paymentTotal}</span>
                  <span style="color:${C.accent};font-size:22px;font-weight:700;font-family:${font};">$${amount.toFixed(2)} USD</span>
                </td>
              </tr>
            </table>

            <!-- PDF note -->
            <p style="margin:0 0 16px;color:${C.textSub};font-size:12px;line-height:1.6;font-family:${font};">
              ${t.paymentPdfNote}
            </p>

            <!-- Divider -->
            <div style="height:1px;background-color:${C.border};margin-bottom:16px;"></div>

            <!-- Help -->
            <p style="margin:0;color:${C.subtle};font-size:12px;line-height:1.5;font-family:${font};">
              ${t.paymentHelp("support@t-nexus.io.vn")}
            </p>

          </td>
        </tr>

        ${emailFooter(year, locale)}

      </table>

      ${emailSubFooter(t.subFooterAutoEmail)}

    </td></tr>
  </table>
</body>
</html>`;
}
