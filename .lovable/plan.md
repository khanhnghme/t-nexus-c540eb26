

# Nâng cấp AI: Cho phép trả lời câu hỏi ngoài hệ thống

## Vấn đề hiện tại
System prompt hiện tại ngầm giới hạn AI chỉ trả lời về dữ liệu dự án và hệ thống T-Nexus. Khi người dùng hỏi câu hỏi chung (kiến thức, học tập, code...), AI không có hướng dẫn rõ ràng để trả lời.

## Thay đổi

### Cập nhật System Prompt (`team-assistant/index.ts`)

Thêm một section mới vào system prompt, đặt sau phần giới thiệu và trước các quy tắc bắt buộc:

```
## PHẠM VI TRẢ LỜI
Bạn có thể trả lời các câu hỏi NGOÀI hệ thống T-Nexus một cách bình thường, bao gồm:
- Kiến thức chung, học thuật, khoa học, lịch sử, địa lý...
- Hỗ trợ viết bài, dịch thuật, tóm tắt văn bản
- Giải thích code, lập trình, công nghệ
- Tư vấn, gợi ý, brainstorm ý tưởng
- Toán học, logic, phân tích dữ liệu

Ưu tiên:
1. Nếu câu hỏi liên quan đến dự án/hệ thống → trả lời dựa trên dữ liệu dự án
2. Nếu câu hỏi chung → trả lời bình thường như một trợ lý AI thông minh
3. Vẫn tuân thủ tất cả quy tắc bảo mật và quyền riêng tư bên dưới
```

Đồng thời sửa dòng mở đầu từ:
> "Bạn là trợ lý AI của hệ thống T-Nexus — thân thiện, chuyên nghiệp và hữu ích."

Thành:
> "Bạn là trợ lý AI thông minh, tích hợp trong hệ thống T-Nexus — thân thiện, chuyên nghiệp và hữu ích. Bạn có thể hỗ trợ người dùng cả về dự án lẫn kiến thức chung."

### File thay đổi
1. `supabase/functions/team-assistant/index.ts` — cập nhật system prompt + re-deploy

### Không thay đổi
- DB, RLS, frontend, i18n, billing, file handling logic

