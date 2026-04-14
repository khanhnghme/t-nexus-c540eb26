

## Plan: Xóa toàn bộ google-mode khỏi CSS

### Phạm vi thay đổi

Chỉ **1 file**: `src/index.css` — không có file JS/TS nào tham chiếu đến google-mode.

### Các block CSS cần xóa

1. **Lines 214-258**: `html.google-mode { ... }` — Light mode tokens (CellphoneS-inspired)
2. **Lines 357-399**: `html.google-mode.dark { ... }` — Dark mode tokens
3. **Lines 496-504**: `html:not(.google-mode)` border-radius overrides — xóa luôn vì không còn cần phân biệt mode
4. **Lines 507-594**: Tất cả rules `html.google-mode` — typography, glass-effect, card enhancements, focus ring, scrollbar

### Chi tiết kỹ thuật

| Dòng | Nội dung | Hành động |
|------|----------|-----------|
| 214-258 | `html.google-mode` light tokens | Xóa |
| 357-399 | `html.google-mode.dark` dark tokens | Xóa |
| 496-504 | `html:not(.google-mode)` radius rules | Xóa (hoặc giữ logic radius nhưng bỏ selector `.not(.google-mode)`) |
| 507-594 | `html.google-mode` typography, cards, scrollbar | Xóa |

### Lưu ý về border-radius overrides (lines 496-504)

Block `html:not(.google-mode)` hiện đang áp dụng `border-radius: 1rem` và `1.25rem` cho các phần tử `rounded-xl`/`rounded-2xl` khi **không** ở google-mode. Sau khi xóa google-mode, nếu muốn giữ style này thì chuyển thành rule không có selector điều kiện. Nếu không cần thì xóa luôn (Tailwind classes sẽ tự quản lý radius).

### Rủi ro
- **Rất thấp** — không có code JS/TS nào toggle class `google-mode`
- Hệ thống chỉ còn light (`:root`) và dark (`.dark`) như mong muốn

