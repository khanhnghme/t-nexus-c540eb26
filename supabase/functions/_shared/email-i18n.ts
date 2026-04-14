/**
 * Email & PDF Invoice i18n translations
 * Used by all email edge functions and PDF invoice builder
 */

export type EmailLocale = 'vi' | 'en';

const texts = {
  vi: {
    // ─── OTP Email ───
    otpSignupTitle: 'Xác minh tài khoản',
    otpSignupSubtitle: 'Hệ thống quản lý dự án nhóm',
    otpSignupExpiry: 'Sử dụng mã bên dưới để xác minh email của bạn. Mã có hiệu lực trong <strong>5 phút</strong>.',
    otpSignupWarning: '<strong>Không chia sẻ mã này cho bất kỳ ai.</strong> T-Nexus sẽ không bao giờ yêu cầu bạn cung cấp mã OTP qua tin nhắn hay điện thoại.',
    otpSignupIgnore: 'Nếu bạn không yêu cầu tạo tài khoản, vui lòng bỏ qua email này.',
    otpSignupSubject: (code: string) => `Mã xác minh tài khoản T-Nexus: ${code}`,

    otpResetTitle: 'Đặt lại mật khẩu',
    otpResetSubtitle: 'Yêu cầu khôi phục tài khoản',
    otpResetExpiry: 'Mã xác minh bên dưới có hiệu lực trong <strong>10 phút</strong>.',
    otpResetWarning: '<strong>Không chia sẻ mã này cho bất kỳ ai.</strong> T-Nexus sẽ không bao giờ yêu cầu bạn cung cấp mã OTP qua tin nhắn hay điện thoại.',
    otpResetIgnore: 'Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.',
    otpResetSubject: (code: string) => `Mã xác minh đặt lại mật khẩu: ${code}`,

    otpEnterCode: 'Nhập mã trên vào ứng dụng để tiếp tục',

    // ─── Payment Email ───
    paymentSubject: (orderCode: string) => `Xác nhận thanh toán — T-Nexus (${orderCode})`,
    paymentHeaderSubtitle: 'Xác nhận thanh toán',
    paymentSuccessTitle: '✓ Thanh toán thành công',
    paymentGreeting: (name: string) => `Xin chào <strong style="color:#111827;">${name}</strong>, giao dịch của bạn đã được xác nhận.`,
    paymentPlan: 'Gói dịch vụ',
    paymentCycle: 'Chu kỳ',
    paymentOrderCode: 'Mã đơn hàng',
    paymentTime: 'Thời gian',
    paymentTotal: 'Tổng thanh toán',
    paymentPdfNote: '📎 Biên lai chi tiết được đính kèm dưới dạng file PDF.',
    paymentHelp: (email: string) => `Thắc mắc? Liên hệ <a href="mailto:${email}" style="color:#2563eb;text-decoration:none;">${email}</a>`,
    cycleYearly: 'Năm',
    cycleMonthly: 'Tháng',

    // ─── Digest Email ───
    digestTitle: 'Cập nhật hàng ngày - T-Nexus',
    digestSubtitle: 'Cập nhật dự án hàng ngày',
    digestGreeting: (name: string) => `Xin chào ${name},`,
    digestSummary: 'Đây là tóm tắt hoạt động dự án hôm nay của bạn.',
    digestDeadlineSection: 'Deadline sắp hết',
    digestNewTaskSection: 'Task mới được giao',
    digestHoursLeft: (h: number) => `còn ${h}h`,
    digestNoDeadline: 'Chưa có',
    digestVisitNote: 'Truy cập',
    digestVisitAction: 'để xem chi tiết và cập nhật tiến độ.',
    digestSubject: (deadlines: number, newTasks: number) => {
      let s = '📊 Cập nhật hàng ngày';
      if (deadlines > 0) s += ` - ${deadlines} deadline sắp hết`;
      if (newTasks > 0) s += ` + ${newTasks} task mới`;
      return s;
    },

    // ─── Shared email parts ───
    footerCopyright: (year: number) => `© ${year} T-Nexus. All rights reserved.`,
    subFooterAutoEmail: 'Email này được gửi tự động từ hệ thống T-Nexus.<br/>Vui lòng không trả lời email này.',
    subFooterDigest: 'Email tự động từ T-Nexus · Bạn có thể tắt trong phần Thông tin cá nhân.',

    // ─── PDF Invoice ───
    pdfHeader: 'HÓA ĐƠN',
    pdfSubHeader: 'Biên nhận thanh toán điện tử',
    pdfBrandDesc: 'Dịch vụ quản lý dự án số',
    pdfInfoSection: 'THÔNG TIN HÓA ĐƠN',
    pdfCustomerSection: 'THÔNG TIN KHÁCH HÀNG',
    pdfOrderCode: 'Mã đơn hàng:',
    pdfCreatedAt: 'Ngày tạo:',
    pdfPaidAt: 'Ngày thanh toán:',
    pdfPaymentMethod: 'Phương thức:',
    pdfStatus: 'Trạng thái:',
    pdfStatusPaid: 'Đã thanh toán',
    pdfStatusFailed: 'Thất bại',
    pdfStudentId: 'MSSV:',
    pdfInstitution: 'Trường:',
    pdfBillingPeriod: 'CHU KỲ THANH TOÁN',
    pdfActivated: 'Kích hoạt:',
    pdfExpires: 'Hết hạn:',
    pdfCycleYearly: '12 tháng',
    pdfCycleMonthly: '1 tháng',
    pdfCycleLabel: 'Chu kỳ:',
    pdfColNum: '#',
    pdfColDesc: 'Mô tả',
    pdfColUnit: 'Đơn giá',
    pdfColQty: 'SL',
    pdfColTotal: 'Thành tiền',
    pdfPlanYearly: 'Gói năm (12 tháng)',
    pdfPlanMonthly: 'Gói tháng (1 tháng)',
    pdfAddonLabel: 'Gói bổ sung',
    pdfSubtotal: 'Tạm tính',
    pdfDiscount: 'Giảm giá',
    pdfDiscountCode: (code: string) => `Mã giảm giá (${code})`,
    pdfWelcomeDiscount: 'Ưu đãi chào mừng',
    pdfAddonSavings: (rate?: number) => `Tiết kiệm add-on${rate ? ` (${rate}%)` : ''}`,
    pdfTax: 'Thuế VAT (0%)',
    pdfTotal: 'TỔNG CỘNG',
    pdfNotes: 'Ghi chú',
    pdfNote1: 'Thanh toán được xử lý qua cổng PayPal quốc tế.',
    pdfNote2: 'Gói dịch vụ sẽ tự động kích hoạt sau khi thanh toán thành công.',
    pdfNote3: 'Mọi thắc mắc vui lòng liên hệ support@t-nexus.io.vn.',
    pdfPaidStamp: 'ĐÃ THANH TOÁN',
    pdfSignatureLabel: 'Chữ ký điện tử',
    pdfFooter1: 'Đây là hóa đơn điện tử được tạo tự động bởi hệ thống T-Nexus.',
    pdfFooter2: 'Hỗ trợ: support@t-nexus.io.vn | https://t-nexus.io.vn',
    pdfAddonProjects: '+5 dự án',
    pdfAddonStorage: '+5 GB lưu trữ',
    pdfAddonMembers: '+10 thành viên',
  },

  en: {
    // ─── OTP Email ───
    otpSignupTitle: 'Verify your account',
    otpSignupSubtitle: 'Team Project Management System',
    otpSignupExpiry: 'Use the code below to verify your email. The code is valid for <strong>5 minutes</strong>.',
    otpSignupWarning: '<strong>Do not share this code with anyone.</strong> T-Nexus will never ask you to provide an OTP code via message or phone.',
    otpSignupIgnore: 'If you did not request account creation, please ignore this email.',
    otpSignupSubject: (code: string) => `T-Nexus verification code: ${code}`,

    otpResetTitle: 'Reset your password',
    otpResetSubtitle: 'Account recovery request',
    otpResetExpiry: 'The verification code below is valid for <strong>10 minutes</strong>.',
    otpResetWarning: '<strong>Do not share this code with anyone.</strong> T-Nexus will never ask you to provide an OTP code via message or phone.',
    otpResetIgnore: 'If you did not request a password reset, please ignore this email.',
    otpResetSubject: (code: string) => `Password reset verification code: ${code}`,

    otpEnterCode: 'Enter the code above in the application to continue',

    // ─── Payment Email ───
    paymentSubject: (orderCode: string) => `Payment confirmation — T-Nexus (${orderCode})`,
    paymentHeaderSubtitle: 'Payment confirmation',
    paymentSuccessTitle: '✓ Payment successful',
    paymentGreeting: (name: string) => `Hello <strong style="color:#111827;">${name}</strong>, your transaction has been confirmed.`,
    paymentPlan: 'Service plan',
    paymentCycle: 'Billing cycle',
    paymentOrderCode: 'Order code',
    paymentTime: 'Date & time',
    paymentTotal: 'Total paid',
    paymentPdfNote: '📎 A detailed receipt is attached as a PDF file.',
    paymentHelp: (email: string) => `Questions? Contact <a href="mailto:${email}" style="color:#2563eb;text-decoration:none;">${email}</a>`,
    cycleYearly: 'Yearly',
    cycleMonthly: 'Monthly',

    // ─── Digest Email ───
    digestTitle: 'Daily Update - T-Nexus',
    digestSubtitle: 'Daily project update',
    digestGreeting: (name: string) => `Hello ${name},`,
    digestSummary: "Here's a summary of today's project activity.",
    digestDeadlineSection: 'Upcoming deadlines',
    digestNewTaskSection: 'Newly assigned tasks',
    digestHoursLeft: (h: number) => `${h}h left`,
    digestNoDeadline: 'No deadline',
    digestVisitNote: 'Visit',
    digestVisitAction: 'to view details and update progress.',
    digestSubject: (deadlines: number, newTasks: number) => {
      let s = '📊 Daily update';
      if (deadlines > 0) s += ` - ${deadlines} upcoming deadline${deadlines > 1 ? 's' : ''}`;
      if (newTasks > 0) s += ` + ${newTasks} new task${newTasks > 1 ? 's' : ''}`;
      return s;
    },

    // ─── Shared email parts ───
    footerCopyright: (year: number) => `© ${year} T-Nexus. All rights reserved.`,
    subFooterAutoEmail: 'This email was sent automatically by the T-Nexus system.<br/>Please do not reply to this email.',
    subFooterDigest: 'Automated email from T-Nexus · You can turn this off in Personal Info settings.',

    // ─── PDF Invoice ───
    pdfHeader: 'INVOICE',
    pdfSubHeader: 'Electronic payment receipt',
    pdfBrandDesc: 'Digital project management service',
    pdfInfoSection: 'INVOICE DETAILS',
    pdfCustomerSection: 'CUSTOMER INFORMATION',
    pdfOrderCode: 'Order code:',
    pdfCreatedAt: 'Created:',
    pdfPaidAt: 'Paid at:',
    pdfPaymentMethod: 'Method:',
    pdfStatus: 'Status:',
    pdfStatusPaid: 'Paid',
    pdfStatusFailed: 'Failed',
    pdfStudentId: 'Student ID:',
    pdfInstitution: 'Institution:',
    pdfBillingPeriod: 'BILLING PERIOD',
    pdfActivated: 'Activated:',
    pdfExpires: 'Expires:',
    pdfCycleYearly: '12 months',
    pdfCycleMonthly: '1 month',
    pdfCycleLabel: 'Cycle:',
    pdfColNum: '#',
    pdfColDesc: 'Description',
    pdfColUnit: 'Unit price',
    pdfColQty: 'Qty',
    pdfColTotal: 'Amount',
    pdfPlanYearly: 'Annual plan (12 months)',
    pdfPlanMonthly: 'Monthly plan (1 month)',
    pdfAddonLabel: 'Add-on package',
    pdfSubtotal: 'Subtotal',
    pdfDiscount: 'Discount',
    pdfDiscountCode: (code: string) => `Coupon (${code})`,
    pdfWelcomeDiscount: 'Welcome discount',
    pdfAddonSavings: (rate?: number) => `Add-on savings${rate ? ` (${rate}%)` : ''}`,
    pdfTotal: 'TOTAL',
    pdfNotes: 'Notes',
    pdfNote1: 'Payment processed via PayPal international gateway.',
    pdfNote2: 'Service plan will be activated automatically after successful payment.',
    pdfNote3: 'For inquiries, please contact support@t-nexus.io.vn.',
    pdfPaidStamp: 'PAID',
    pdfSignatureLabel: 'Digital signature',
    pdfFooter1: 'This is an electronic invoice automatically generated by the T-Nexus system.',
    pdfFooter2: 'Support: support@t-nexus.io.vn | https://t-nexus.io.vn',
    pdfAddonProjects: '+5 projects',
    pdfAddonStorage: '+5 GB storage',
    pdfAddonMembers: '+10 members',
  },
} as const;

export type EmailTexts = typeof texts['vi'];

export function getEmailTexts(locale: EmailLocale = 'vi'): EmailTexts {
  return texts[locale] ?? texts.vi;
}
