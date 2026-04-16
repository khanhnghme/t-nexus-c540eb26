

# Nguyên nhân: Service Worker cache phiên bản cũ

## Vấn đề chính xác

Service Worker (`public/sw.js`) đang dùng chiến lược **cache-first** cho static assets (JS, CSS, images):

```javascript
// Dòng 40-43: Cache-first → trả về bản cũ từ cache, KHÔNG BAO GIỜ tải bản mới
caches.match(request).then((cached) => cached || fetch(request))
```

Khi user đã truy cập lần đầu, SW cache lại toàn bộ file JS/CSS. Khi bạn publish phiên bản mới, Vite tạo file mới với hash khác (ví dụ `index-abc123.js` → `index-def456.js`), nhưng:

1. **Navigation (HTML)**: Dùng network-first → lấy được `index.html` mới
2. **Nhưng `index.html` cũ vẫn nằm trong cache `/`** (STATIC_ASSETS line 3) → SW có thể trả về HTML cũ chứa link đến JS/CSS cũ
3. **CACHE_NAME không bao giờ thay đổi** (`tnexus-v1`) → cache cũ không bao giờ bị xóa

## Giải pháp

### 1. Đổi SW sang **network-first cho tất cả** (ưu tiên bản mới)

Thay đổi `public/sw.js`:
- Bỏ cache `/` trong STATIC_ASSETS (vì Vite hash file names, cache-first cho HTML gây lỗi)
- Đổi static assets sang **stale-while-revalidate** (trả cache ngay + tải bản mới ngầm)
- Bump `CACHE_NAME` lên `tnexus-v2` để xóa cache cũ

### 2. Force unregister SW cũ cho user hiện tại

Thêm logic trong `src/main.tsx`: Nếu SW đang active và cache version cũ, tự động unregister + reload trang 1 lần.

## Files thay đổi

1. **`public/sw.js`** — Chuyển sang stale-while-revalidate, bump cache version, không cache `/` (index.html)
2. **`src/main.tsx`** — Thêm logic force-update SW cho user đang dùng bản cũ

