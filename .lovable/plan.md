

## Plan: Fix 3 vấn đề 🟡 MEDIUM — Tối ưu hiệu năng

### MEDIUM #5: Realtime subscription chỉ re-fetch data liên quan

**Vấn đề:** `GroupDetail.tsx` dòng 219-235 — khi `group_members` thay đổi, gọi lại `fetchGroupData()` toàn bộ (stages, tasks, meetings, members...). Mỗi member join/leave → 7+ queries chạy lại.

**Giải pháp:** Tách `fetchGroupData` thành các hàm nhỏ:
- `fetchMembers()` — chỉ query members + profiles
- `fetchTasks()` — chỉ query tasks + assignments
- `fetchMeetings()` — chỉ query meetings

Realtime callback chỉ gọi `fetchMembers()` thay vì `fetchGroupData()`. Các chỗ khác (thêm task, xóa stage...) vẫn gọi hàm tương ứng thay vì toàn bộ.

**File:** `src/pages/GroupDetail.tsx`
**Impact:** Giảm ~80% API calls khi có realtime update

---

### MEDIUM #6: Dynamic import cho heavy dependencies

**Vấn đề:** `jspdf`, `xlsx`, `recharts` import tĩnh trong các lib/component files. Dù pages đã lazy-loaded, các file lib như `activityLogPdf.ts`, `projectEvidencePdf.ts`, `canvasExport.ts` vẫn import `jsPDF` ở top-level. `ExcelMemberImport.tsx` import `xlsx` trực tiếp. `chart.tsx` import `recharts` trực tiếp.

**Giải pháp:**
- `src/lib/activityLogPdf.ts` — đổi sang `const jsPDF = (await import('jspdf')).default` bên trong function
- `src/lib/projectEvidencePdf.ts` — tương tự
- `src/lib/canvasExport.ts` — tương tự  
- `src/components/ExcelMemberImport.tsx` — đổi `import * as XLSX from 'xlsx'` sang dynamic import khi user click upload
- `src/components/ui/chart.tsx` — giữ nguyên vì recharts đã nằm trong lazy-loaded pages

**Files:** 4 files (3 lib + 1 component)
**Impact:** Loại bỏ jspdf (~300KB) và xlsx (~200KB) khỏi các chunk không cần thiết

---

### MEDIUM #7: Virtualized list cho TaskListView

**Vấn đề:** `TaskListView.tsx` (1756 dòng) render toàn bộ tasks vào DOM. Project có 100+ tasks sẽ tạo hàng trăm DOM nodes không cần thiết.

**Giải pháp:**
- Cài `@tanstack/react-virtual`
- Wrap danh sách tasks trong mỗi stage bằng `useVirtualizer` khi count > 30
- Khi ≤30 tasks, render bình thường (tránh overhead cho list nhỏ)
- Áp dụng tương tự cho `MemberManagementCard` member list

**Files:** `src/components/TaskListView.tsx`, `src/components/MemberManagementCard.tsx`
**Dependencies mới:** `@tanstack/react-virtual`
**Impact:** Giảm ~90% DOM nodes cho list dài

---

### Tổng kết

| # | Task | Files | Impact |
|---|------|-------|--------|
| 5 | Selective realtime re-fetch | `GroupDetail.tsx` | API calls -80% on updates |
| 6 | Dynamic import heavy deps | 4 files (3 lib + 1 component) | Chunk size -500KB |
| 7 | Virtualized lists | 2 component files + dependency | DOM nodes -90% |

**Tổng: ~7 files thay đổi. 1 dependency mới (`@tanstack/react-virtual`). Backward compatible 100%.**

