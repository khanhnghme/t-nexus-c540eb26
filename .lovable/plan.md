

## Thiết kế lại section "Data & Privacy" gọn hơn & sửa lỗi màu chữ

### Vấn đề hiện tại
- Section quá dài với grid 2x2 cards + badge + heading + subtitle + 2 buttons
- Màu chữ `--landing-hero-muted` (xám nhạt) trên nền `--landing-night` (navy đậm) có thể bị trùng/khó đọc ở một số chỗ

### Giải pháp: Thu gọn thành 1 dải compact

Thay vì grid 4 cards, thiết kế lại thành **1 dải ngang đơn giản**:
- Một hàng ngang chứa icon Shield + tiêu đề ngắn + mô tả 1 dòng tóm tắt + 2 link (Privacy Policy & Terms)
- Padding giảm từ `py-16 md:py-20` xuống `py-8 md:py-10`
- Có border-top nhẹ để phân tách với phần trên
- Bỏ grid 4 cards, bỏ badge "Privacy & Security"
- Màu chữ dùng `--landing-hero-foreground` (trắng) cho tiêu đề, `--landing-hero-muted` cho mô tả nhưng tăng opacity
- Link dùng `--landing-blue` để nổi bật

### Layout mới
```text
─────────────────────────────────────────────────
🛡 Your data, your control
   We use Google Sign-In solely for authentication...
   Privacy Policy · Terms of Service
─────────────────────────────────────────────────
```

### Files chỉnh sửa
- `src/pages/Landing.tsx` — thay section Data & Privacy bằng layout compact

