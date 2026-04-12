

## Fix: Public pages (pre-login) bị ảnh hưởng dark mode khi chuyển ngôn ngữ

### Vấn đề
Khi chuyển từ trang EN sang VI (hoặc ngược lại), `ForceLightMode` bị unmount → cleanup restore dark mode → mount lại → set light. Khoảng giữa đó trang flash dark mode.

### Giải pháp
Bỏ logic restore theme trong cleanup của `ForceLightMode`. Thay vào đó, chỉ force light khi mount. Khi user navigate vào protected route (dashboard), theme sẽ được đọc từ `localStorage` bởi `next-themes` tự động (vì `ThemeProvider` dùng `storageKey="theme"`).

### Thay đổi

| File | Nội dung |
|------|----------|
| **`src/components/ForceLightMode.tsx`** | Bỏ cleanup function, chỉ giữ `setTheme('light')` on mount |

### Code mới

```typescript
export function ForceLightMode({ children }: { children: React.ReactNode }) {
  const { setTheme } = useTheme();

  useEffect(() => {
    setTheme('light');
  }, [setTheme]);

  return <>{children}</>;
}
```

Khi user rời public page vào dashboard, `next-themes` sẽ tự restore theme từ `storageKey` — không cần manual restore.

