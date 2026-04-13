

## Nâng cấp mã tham gia — QR gọn + tải ảnh mời

### Đã triển khai

**File: `src/components/ShareSettingsCard.tsx`**

1. Thêm QR code inline 56px bên cạnh mã code (gọn, không chiếm thêm hàng)
2. Thêm nút Download — tải ảnh PNG đầy đủ thông tin (QR 200px, tên dự án, mã code, giới hạn, trạng thái duyệt, hướng dẫn tham gia)
3. Dòng hướng dẫn ngắn: "Quét QR hoặc vào t-nexus.io.vn → Tham gia dự án → Nhập mã"
4. QR encode URL: `https://t-nexus.io.vn/join?code={CODE}`
5. Copy lời mời có kèm link QR + hướng dẫn chi tiết

### Layout trên giao diện

```text
┌──────────────────────────────────────────────────┐
│  [QR 56px]  A B 3 X 7 K     [📋] [🔄] [⬇️]    │
│  📱 Quét QR hoặc vào t-nexus.io.vn → Tham gia   │
└──────────────────────────────────────────────────┘
```

### Ảnh tải về (canvas → PNG)

```text
┌─────────────────────────────────┐
│      Mời tham gia dự án         │
│        🎯 Tên dự án             │
│       ┌────────────┐            │
│       │  QR 200px  │            │
│       └────────────┘            │
│        Mã: AB3X7K              │
│  👥 Giới hạn: 10 người          │
│  🔒 Cần duyệt: Có              │
│  📱 Cách tham gia:              │
│  Quét QR hoặc vào t-nexus.io.vn │
│  → Tham gia dự án → Nhập mã    │
│  📎 t-nexus.io.vn               │
└─────────────────────────────────┘
```
