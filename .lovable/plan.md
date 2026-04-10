

## Xóa hoàn toàn LoadingScreen

LoadingScreen đang được dùng ở **8 file**. Sẽ xóa component và thay thế tất cả references:

### 1. Xóa file `src/components/LoadingScreen.tsx`

### 2. Thay thế tại các file sử dụng

| File | Hiện tại | Thay bằng |
|------|----------|-----------|
| `src/pages/Landing.tsx` | Overlay LoadingScreen khi `isChecking` | Xóa hoàn toàn block overlay, bỏ import |
| `src/App.tsx` (ProtectedRoute + AdminRoute) | `if (isLoading) return <LoadingScreen />` | `return null` hoặc render trống |
| `src/pages/Auth.tsx` | `if (authLoading) return <LoadingScreen />` | `return null` |
| `src/pages/Onboarding.tsx` | `if (isLoading) return <LoadingScreen />` | `return null` |
| `src/pages/PublicProfile.tsx` | `if (loading) return <LoadingScreen />` | `return null` |
| `src/pages/PublicProjectView.tsx` | `if (isLoading) return <LoadingScreen />` | `return null` |
| `src/pages/GroupDetail.tsx` | `if (isLoading) return <LoadingScreen />` | `return null` |

Tất cả `return null` sẽ render trang trắng trong lúc loading (rất ngắn), không ảnh hưởng UX và crawler sẽ thấy nội dung thật ngay.

