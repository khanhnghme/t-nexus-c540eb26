

## Fix: Giữ đúng step onboarding khi quay lại từ checkout

### Nguyên nhân

`currentStepIndex` dùng `useState(0)` — khi navigate đi `/checkout` rồi bấm Back, component `FirstTimeOnboarding` bị remount → state reset về `0` → quay lại bước "language".

### Giải pháp

Lưu `currentStepIndex` vào `sessionStorage` mỗi khi step thay đổi. Khi component mount, đọc lại giá trị đã lưu thay vì mặc định `0`.

### Thay đổi

**File: `src/components/FirstTimeOnboarding.tsx`**

1. Khởi tạo `currentStepIndex` từ sessionStorage:
```typescript
const [currentStepIndex, setCurrentStepIndex] = useState(() => {
  const saved = sessionStorage.getItem('onboarding_step_index');
  return saved ? parseInt(saved, 10) : 0;
});
```

2. Thêm useEffect đồng bộ step vào sessionStorage:
```typescript
useEffect(() => {
  sessionStorage.setItem('onboarding_step_index', String(currentStepIndex));
}, [currentStepIndex]);
```

3. Khi onboarding hoàn tất (bước finish → complete), xóa key:
```typescript
sessionStorage.removeItem('onboarding_step_index');
sessionStorage.removeItem('checkout_from');
```

Chỉ sửa 1 file, không ảnh hưởng checkout hay layout.

