

## Xóa hoàn toàn SplashScreen khỏi dự án

### Thay đổi

**1. Xóa file `src/components/SplashScreen.tsx`**

**2. `src/pages/Landing.tsx`**
- Xóa `import SplashScreen` (dòng 2)
- Xóa state `showSplash` (dòng 328)
- Xóa block `{showSplash && <SplashScreen ... />}` (dòng 530-538)
- Nội dung landing page render ngay lập tức, không delay

Kết quả: Homepage load ngay, không animation, không chờ, crawler thấy nội dung HTML ngay lập tức.

