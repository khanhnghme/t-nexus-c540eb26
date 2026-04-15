

# Fix thiếu renderer cho AI output (chart/diagram/table)

## Vấn đề
Cả 2 nơi hiển thị AI response (`AIAssistant.tsx` và `AIAssistantPanel.tsx`) đều dùng `ReactMarkdown` **không có plugins** — thiếu `remarkGfm` (tables, strikethrough) và `rehypeRaw`. Code blocks không có syntax highlighting. Không có renderer cho Mermaid diagrams.

Packages `remark-gfm`, `rehype-raw`, `recharts` **đã cài sẵn** trong project.

## Giải pháp

### 1. Tạo shared component `src/components/ai/AIMessageRenderer.tsx`
Component dùng chung cho cả 2 nơi, tránh duplicate code:

- **Markdown**: `ReactMarkdown` + `remarkGfm` + `rehypeRaw`
- **GFM Tables**: Custom `table/thead/tbody/tr/th/td` components map sang `Table` UI components đã có
- **Code blocks**: Custom `code` component phát hiện ngôn ngữ, hiển thị header (language label + copy button), styled block
- **Mermaid diagrams**: Custom `code` component detect `language-mermaid` → render diagram inline bằng dynamic import `mermaid` library
- **Inline code**: Giữ style hiện tại

### 2. Install thêm package `mermaid`
Cần cài `mermaid` để render diagrams. Sử dụng dynamic import (`React.lazy` / `useEffect`) để không ảnh hưởng bundle size.

### 3. Cập nhật `AIAssistant.tsx` (dòng 601-609)
Thay block `<ReactMarkdown components={...}>` bằng `<AIMessageRenderer content={message.content} />`

### 4. Cập nhật `AIAssistantPanel.tsx` (dòng 446-459)
Tương tự — thay bằng `<AIMessageRenderer content={message.content} compact />`
(prop `compact` cho smaller font/spacing trong panel)

## Chi tiết kỹ thuật

### AIMessageRenderer component structure:
```
AIMessageRenderer
├── ReactMarkdown (remarkGfm, rehypeRaw)
│   ├── table → shadcn Table component
│   ├── code (block) → CodeBlock component
│   │   ├── language === 'mermaid' → MermaidRenderer
│   │   └── other → styled pre/code + copy button
│   ├── code (inline) → styled inline code
│   ├── p, ul, ol, li, strong → styled elements
│   └── a → external link with icon
```

### MermaidRenderer:
- `useEffect` load mermaid library dynamically
- Render SVG inline from mermaid syntax
- Dark mode support via mermaid theme config
- Error fallback: show raw code if parse fails

### CodeBlock:
- Language label header bar
- Copy-to-clipboard button
- Overflow-x scroll
- Monospace font styling

## Không thay đổi
- Backend / Edge Functions
- DB schema
- Existing UI components (Table, Chart)
- Logic gửi/nhận message

