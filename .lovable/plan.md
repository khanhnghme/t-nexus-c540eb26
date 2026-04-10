

## Fix: Badge component forwardRef warning trong Checkout

### Vấn đề
Console hiện warning "Function components cannot be given refs" vì `Badge` trong `src/components/ui/badge.tsx` không dùng `React.forwardRef()`, nhưng có chỗ trong Checkout truyền ref vào nó (có thể qua Tooltip hoặc component wrapper).

### Mức độ
Đây chỉ là **warning**, không gây lỗi thanh toán. PayPal hoạt động bình thường. Fix để console sạch hơn.

### Thay đổi
**File: `src/components/ui/badge.tsx`**
- Wrap `Badge` bằng `React.forwardRef` để hỗ trợ nhận ref

```tsx
const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, ...props }, ref) => {
    return <div ref={ref} className={cn(badgeVariants({ variant }), className)} {...props} />;
  }
);
Badge.displayName = "Badge";
```

Chỉ 1 file thay đổi, không ảnh hưởng gì khác.

