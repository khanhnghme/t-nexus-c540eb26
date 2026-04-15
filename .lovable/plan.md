

# Mở rộng chiều rộng vùng chat AI Assistant

## Vấn đề
Vùng chat và input hiện tại bị giới hạn `max-w-[48rem]` (768px), empty state `max-w-[44rem]` (704px) — quá hẹp trên màn hình lớn.

## Thay đổi: `src/pages/AIAssistant.tsx`

| Vị trí | Hiện tại | Mới |
|---|---|---|
| Chat messages container (dòng 578) | `max-w-[48rem]` | `max-w-4xl` (896px) |
| Input footer (dòng 631) | `max-w-[48rem]` | `max-w-4xl` |
| Empty state (dòng 668) | `max-w-[44rem]` | `max-w-3xl` (768px) |

Tổng cộng 3 chỗ sửa class trong cùng 1 file, không ảnh hưởng logic hay layout khác.

