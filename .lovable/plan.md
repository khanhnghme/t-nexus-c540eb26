

## Phase 10 — Giai doan 3/4: Styling cho View Mode

### Muc tieu
Them CSS styling cho View mode — an cursor caret, bo padding thua, va lam noi dung hien thi sach se khi o che do xem.

### Hien trang
- Stage 1-2 hoan thanh: toggle Edit/View, an side menu/slash menu/formatting toolbar
- CSS class `view-mode` da duoc them len container div khi `editable=false`
- Chua co CSS rules nao target `.view-mode`

### Hanh dong

**Them CSS rules trong `src/index.css` (hoac file CSS phu hop)**
- `.view-mode` selector:
  - An text cursor/caret: `caret-color: transparent`
  - Bo user-select restriction neu can (cho phep copy text)
  - An cac placeholder text cua BlockNote (e.g. "Type '/' for commands")
  - Dieu chinh padding cho phu hop voi view mode (bo padding du thua tu editor UI)
  - An viền outline khi focus vao block

### Chi tiet ky thuat

```text
.view-mode {
  caret-color: transparent;
}

.view-mode .bn-editor {
  /* An placeholder */
}

.view-mode [data-placeholder]::before {
  display: none;
}

.view-mode .bn-block-content:focus-within {
  outline: none;
  box-shadow: none;
}
```

### Khong lam
- Permission check nang cao (giai doan 4)
- Thay doi logic toggle/props

### Files thay doi

| File | Thay doi |
|------|----------|
| `src/index.css` | Them `.view-mode` CSS rules |

