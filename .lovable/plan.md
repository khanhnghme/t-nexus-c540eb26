

## Thêm Chương 2: Chính sách khi hết hạn gói + Mục lục cho trang /docs/pricing

### Tổng quan
Tái cấu trúc trang PricingDocs thành dạng có **Mục lục (Table of Contents)** chia 2 chương, và thêm toàn bộ nội dung **Chương 2: Khi hết hạn gói** với 3 mục con.

### Cấu trúc mới

```text
📑 Mục lục
├── Chương 1: Hướng dẫn Bảng giá
│   ├── 1.1 Mô hình Chủ sở hữu trả tiền
│   ├── 1.2 Suất thành viên duy nhất
│   ├── 1.3 Tổng kho tài nguyên
│   ├── 1.4 Add-ons
│   ├── 1.5 Ví dụ thực tế
│   └── 1.6 Câu hỏi thường gặp
└── Chương 2: Chính sách khi hết hạn
    ├── 2.1 Khóa quyền chỉnh sửa (Read-only)
    ├── 2.2 Thời hạn 30 ngày — Cơ hội cuối
    └── 2.3 Sau 30 ngày — Xóa vĩnh viễn
```

### Các bước thực hiện

#### 1. Cập nhật i18n (`vi.ts` và `en.ts`)
- Thêm key `toc` (Table of Contents) với labels cho 2 chương và các mục con
- Thêm keys `ch2Title`, `ch2Subtitle` cho chương 2
- Thêm `ch2s1Title`, `ch2s1Desc`, `ch2s1Allowed`, `ch2s1Blocked` — nội dung Read-only
- Thêm `ch2s2Title`, `ch2s2Desc`, `ch2s2Options` — 2 lựa chọn (Nâng cấp / Dọn dẹp)
- Thêm `ch2s3Title`, `ch2s3Desc`, `ch2s3Rule` — nguyên tắc xóa (giữ cũ nhất, xóa mới nhất)

#### 2. Cập nhật `PricingDocs.tsx`
- Thêm **Mục lục** (sticky sidebar hoặc inline TOC) ở đầu trang với anchor links
- Wrap sections hiện tại dưới heading "Chương 1"
- Thêm **Chương 2** với 3 section mới:
  - Section 2.1: Icon `Lock`, mô tả trạng thái read-only, bảng 2 cột (Được phép / Bị cấm)
  - Section 2.2: Icon `Clock`, timeline 30 ngày, 2 card cho Lựa chọn A và B
  - Section 2.3: Icon `AlertTriangle`, cảnh báo xóa vĩnh viễn, callout nguyên tắc xóa

### Files cần sửa
| File | Hành động |
|------|-----------|
| `src/pages/PricingDocs.tsx` | Thêm TOC + Chương 2 |
| `src/lib/i18n/vi.ts` | Thêm keys chương 2 |
| `src/lib/i18n/en.ts` | Thêm keys chương 2 |

### Không thay đổi
- Nội dung Chương 1 giữ nguyên 100%
- Routing, layout, các trang khác không bị ảnh hưởng

