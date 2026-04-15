

# Cập nhật UI hiển thị AI credit trực quan hơn

## Vấn đề hiện tại
- Credit bar không hiển thị đang dùng credit của workspace nào, của ai
- Không phân biệt được mode "Personal credit" vs "Shared pool"
- Khi OFF (không chia sẻ), user không biết mình đang dùng credit cá nhân theo gói riêng

## Thay đổi

### 1. Thêm state tracking workspace/share info
Trong cả `AIAssistant.tsx` và `AIAssistantPanel.tsx`, lưu thêm:
- `shareMode` (boolean) — đang dùng shared pool hay không
- `workspaceName` (string) — tên workspace hiện tại  
- `ownerName` (string) — tên owner workspace (khi share ON)
- `userPlanLabel` (string) — tên gói đang áp dụng (Free/Pro/Business)

Fetch từ `loadUsage()` đã có sẵn workspace query, chỉ cần lưu thêm data.

### 2. Cập nhật Credit Card (Empty State) — `AIAssistant.tsx`
Thay credit bar đơn giản bằng card có thông tin rõ ràng:

**Khi Share ON:**
```
┌─────────────────────────────────────┐
│ 🔗 Shared Pool · [Workspace Name]  │
│ Owner: [Owner Name] · Pro           │
│ ▓▓▓▓▓▓▓░░░  450 / 1,000 credit     │
│ Tất cả thành viên dùng chung pool  │
└─────────────────────────────────────┘
```

**Khi Share OFF:**
```
┌─────────────────────────────────────┐
│ 👤 Personal Credit · [Your Plan]    │
│ Workspace: [Name] · Không chia sẻ  │
│ ▓▓▓░░░░░░░  120 / 1,000 credit     │
│ Credit tính riêng theo gói cá nhân │
└─────────────────────────────────────┘
```

**Khi Free plan (unlimited Gemini):**
```
┌─────────────────────────────────────┐
│ ✨ Miễn phí · Gemini Flash          │
│ Workspace: [Name] · Không chia sẻ  │
│ Không giới hạn (tốc độ có thể giảm)│
└─────────────────────────────────────┘
```

### 3. Cập nhật Compact Credit Bar (Chat Mode) — `AIAssistant.tsx`
Dưới chat input, thêm 1 dòng nhỏ:
- Icon 🔗 hoặc 👤 + label "Shared · [WS Name]" hoặc "Personal · [Plan]"
- Bên phải: progress bar + credit count (giữ nguyên)

### 4. Cập nhật Panel Header — `AIAssistantPanel.tsx`
Trong compact usage row (line 374-408), thêm:
- Label nhỏ: "🔗 Shared" hoặc "👤 Personal"
- Workspace name truncated

### 5. i18n labels mới (EN/VI)
```
aiSharedPool: 'Shared Pool' / 'Pool chung'
aiPersonalCredit: 'Personal Credit' / 'Credit cá nhân'
aiCreditOwner: 'Owner' / 'Chủ sở hữu'
aiNotShared: 'Not shared' / 'Không chia sẻ'
aiSharedDesc: 'All members share the same credit pool' / 'Tất cả thành viên dùng chung pool'
aiPersonalDesc: 'Credit is counted individually by your plan' / 'Credit tính riêng theo gói cá nhân'
aiFreeUnlimited: 'Unlimited (speed may vary under load)' / 'Không giới hạn (tốc độ có thể giảm khi quá tải)'
```

## Files thay đổi
1. `src/pages/AIAssistant.tsx` — thêm state, cập nhật credit card + compact bar
2. `src/components/ai/AIAssistantPanel.tsx` — thêm state, cập nhật header usage row
3. `src/lib/i18n/en.ts` — thêm labels
4. `src/lib/i18n/vi.ts` — thêm labels

## Không thay đổi
- DB, Edge Functions, logic credit
- Các trang khác (WorkspaceSettings, ServicePlan)

