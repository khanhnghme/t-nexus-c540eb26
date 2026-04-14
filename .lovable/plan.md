

## Plan: Tích hợp đầy đủ shadcn/ui Components — 4 Phases

### Hiện trạng

Project đã có **42/52 components** từ danh sách yêu cầu. Cần thêm **10 components mới** + trang demo.

### Components đã có (không cần cài lại)
accordion, alert, alert-dialog, aspect-ratio, avatar, badge, breadcrumb, button, calendar, card, carousel, chart, checkbox, collapsible, command, context-menu, dialog, drawer, dropdown-menu, form, hover-card, input, input-otp, label, menubar, navigation-menu, pagination, popover, progress, radio-group, resizable, scroll-area, select, separator, sheet, sidebar, skeleton, slider, sonner, switch, table, tabs, textarea, toast, toggle, toggle-group, tooltip

### Components cần thêm mới

| Component | Mô tả |
|-----------|-------|
| `spinner.tsx` | Loading spinner animation |
| `kbd.tsx` | Keyboard shortcut badge |
| `typography.tsx` | Heading/paragraph/code typography primitives |
| `native-select.tsx` | Native HTML select với styling |
| `button-group.tsx` | Group nhiều button liền nhau |
| `input-group.tsx` | Input với prefix/suffix addon |
| `field.tsx` | Form field wrapper (label + input + error) |
| `combobox.tsx` | Searchable select (dùng Command + Popover) |
| `date-picker.tsx` | Date picker (dùng Calendar + Popover) |
| `data-table.tsx` | Table với sorting/filtering (dùng @tanstack/react-table) |

---

### Phase 1: Utility Components (4 files mới)
- `spinner.tsx` — SVG spinner với size variants
- `kbd.tsx` — Keyboard key display component
- `typography.tsx` — H1-H4, P, Code, Blockquote, Lead
- `native-select.tsx` — Styled native `<select>`

### Phase 2: Composite Form Components (3 files mới)
- `button-group.tsx` — Flex container cho grouped buttons
- `input-group.tsx` — Input với prefix/suffix slots
- `field.tsx` — Label + control + description + error wrapper

### Phase 3: Complex Interactive Components (3 files mới)
- `combobox.tsx` — Searchable dropdown (Command + Popover)
- `date-picker.tsx` — Date selection (Calendar + Popover)
- `data-table.tsx` — Full-featured data table (cài thêm `@tanstack/react-table`)

### Phase 4: Demo Page
- Tạo `/ui-preview` page hiển thị toàn bộ components theo nhóm
- Thêm route vào `App.tsx`

---

### Dependencies cần cài thêm
- `@tanstack/react-table` (cho data-table)

### Files thay đổi tổng hợp

| Loại | Files |
|------|-------|
| **Mới** | 10 component files + 1 demo page |
| **Sửa** | `App.tsx` (thêm route), `package.json` (thêm dependency) |

### Rủi ro
- **Thấp** — tất cả component mới, không ảnh hưởng code cũ
- Các composite component (combobox, date-picker) dùng lại component đã có

