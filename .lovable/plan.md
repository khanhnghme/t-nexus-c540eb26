

## Refactor hệ thống mã tham gia: 4 số → 6 ký tự (A-Z + 0-9)

### Tổng quan

Chuyển hoàn toàn từ mã 4 chữ số (`0000`–`9999`) sang mã 6 ký tự chữ hoa + số (`A7K2X9`), áp dụng cho toàn bộ project hiện có và mới.

### 1. Database Migration

```sql
-- Migrate tất cả project có join_code sang mã mới 6 ký tự
-- Sử dụng function để generate + đảm bảo unique
CREATE OR REPLACE FUNCTION public.generate_join_code_6()
RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT;
  i INT;
BEGIN
  LOOP
    result := '';
    FOR i IN 1..6 LOOP
      result := result || substr(chars, floor(random()*36)::int + 1, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.groups WHERE join_code = result);
  END LOOP;
  RETURN result;
END;
$$;

-- Migrate all existing join codes
UPDATE public.groups 
SET join_code = public.generate_join_code_6() 
WHERE join_code IS NOT NULL;
```

### 2. `ShareSettingsCard.tsx` — Generate code mới

- `generateJoinCode()`: đổi từ `Math.floor(random*10000).padStart(4,'0')` → generate 6 ký tự `A-Z0-9`
- UI hiển thị mã: giữ `tracking-[0.5em] font-mono`, format rõ ràng

### 3. `JoinByCodeDialog.tsx` — Input 6 ký tự

- Đổi `digits` state từ `['','','','']` → `['','','','','','']` (6 ô)
- `handleDigitChange`: chấp nhận `A-Z0-9` thay vì chỉ `\d`, auto uppercase
- Validation: `code.length !== 6 || !/^[A-Z0-9]{6}$/.test(code)` thay vì `^\d{4}$`
- `handlePaste`: parse 6 ký tự, uppercase, lọc chỉ `A-Z0-9`
- UI text: "6 ký tự" thay "4 chữ số", `inputMode="text"` thay `numeric`

### 4. i18n updates

- `vi.ts`: `shareCodeDesc` → "Chia sẻ mã 6 ký tự này...", `enableJoinCode` → "Bật để tạo mã 6 ký tự..."
- `en.ts`: `shareCodeDesc` → "Share this 6-character code...", `enableJoinCode` → "Enable to create a 6-character code..."

### 5. Edge function (`team-assistant/index.ts`)

- Cập nhật prompt text: "mã 4 số" → "mã 6 ký tự"

### Files cần sửa

| File | Thay đổi |
|------|----------|
| **Migration SQL** | Tạo `generate_join_code_6()` + migrate data |
| `src/components/ShareSettingsCard.tsx` | `generateJoinCode()` → 6 chars A-Z0-9 |
| `src/components/JoinByCodeDialog.tsx` | 6 input boxes, accept A-Z0-9, auto uppercase, validation |
| `src/lib/i18n/vi.ts` | Cập nhật text mô tả |
| `src/lib/i18n/en.ts` | Cập nhật text mô tả |
| `supabase/functions/team-assistant/index.ts` | Cập nhật prompt text |

