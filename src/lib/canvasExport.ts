import type jsPDFType from "jspdf";

// Use `any` for blocks since our custom block types (taskList, memberList, etc.)
// are not part of BlockNote's default Block type union.
type AnyBlock = any;

// ─── Markdown Export ───

function blockToMarkdown(block: AnyBlock, depth = 0): string {
  const indent = "  ".repeat(depth);
  const type = block.type;
  let text = "";

  // Extract inline text content
  const inlineText = Array.isArray(block.content)
    ? (block.content as any[])
        .map((c: any) => {
          if (typeof c === "string") return c;
          if (c?.type === "text") return c.text ?? "";
          if (c?.type === "link") return `[${c.content?.map((t: any) => t.text).join("") ?? ""}](${c.href ?? ""})`;
          return "";
        })
        .join("")
    : (typeof block.content === "string" ? block.content : "");

  switch (type) {
    case "heading": {
      const level = (block.props as any)?.level ?? 1;
      text = `${"#".repeat(level)} ${inlineText}`;
      break;
    }
    case "paragraph":
      text = inlineText;
      break;
    case "bulletListItem":
      text = `${indent}- ${inlineText}`;
      break;
    case "numberedListItem":
      text = `${indent}1. ${inlineText}`;
      break;
    case "checkListItem": {
      const checked = (block.props as any)?.checked ? "x" : " ";
      text = `${indent}- [${checked}] ${inlineText}`;
      break;
    }
    case "image":
      text = `![${(block.props as any)?.caption ?? "image"}](${(block.props as any)?.url ?? ""})`;
      break;
    case "table": {
      const rows = (block.content as any)?.rows;
      if (rows?.length) {
        const headerRow = rows[0].cells?.map((c: any) => c?.map((t: any) => t?.text ?? "").join("")).join(" | ");
        const separator = rows[0].cells?.map(() => "---").join(" | ");
        const bodyRows = rows.slice(1).map((r: any) =>
          r.cells?.map((c: any) => c?.map((t: any) => t?.text ?? "").join("")).join(" | ")
        );
        text = `| ${headerRow} |\n| ${separator} |\n${bodyRows.map((r: string) => `| ${r} |`).join("\n")}`;
      }
      break;
    }
    // Column blocks
    case "columnList": {
      const cols = ((block.children as AnyBlock[]) ?? []).filter(
        (col) => (col.children as AnyBlock[])?.length > 0
      );
      if (cols.length <= 1) {
        // Single or empty column — render children as normal blocks
        const children = cols[0]?.children ?? [];
        return (children as AnyBlock[]).map((child) => blockToMarkdown(child, depth)).join("\n");
      }
      return cols.map((col, idx) => {
        const label = `**Cột ${idx + 1}:**`;
        const children = (col.children as AnyBlock[]) ?? [];
        const content = children.map((child) => blockToMarkdown(child, depth)).join("\n");
        return `${label}\n${content}`;
      }).join("\n\n---\n\n");
    }
    case "column": {
      return (block.children as AnyBlock[])
        ?.map((child) => blockToMarkdown(child, depth))
        .join("\n") ?? "";
    }
    // Custom blocks
    case "taskList":
      text = `> 📋 **Task Block** _(interactive block — not exportable to markdown)_`;
      break;
    case "memberList":
      text = `> 👥 **Member Block** _(interactive block)_`;
      break;
    case "calendarView":
      text = `> 📅 **Calendar Block** _(interactive block)_`;
      break;
    case "noteCallout": {
      const noteText = inlineText || (block.props as any)?.text || "";
      const icon = (block.props as any)?.icon || "💡";
      text = `> ${icon} ${noteText}`;
      break;
    }
    case "toggleBlock": {
      const toggleTitle = inlineText || (block.props as any)?.title || "Toggle";
      text = `<details>\n<summary>${toggleTitle}</summary>\n\n</details>`;
      break;
    }
    default:
      text = inlineText;
  }

  // Process children
  const childrenMd = (block.children as AnyBlock[])
    ?.map((child) => blockToMarkdown(child, depth + 1))
    .join("\n") ?? "";

  return [text, childrenMd].filter(Boolean).join("\n");
}

export function blocksToMarkdown(blocks: AnyBlock[], title?: string): string {
  const lines: string[] = [];
  if (title) {
    lines.push(`# ${title}`, "");
  }
  for (const block of blocks) {
    lines.push(blockToMarkdown(block));
    lines.push("");
  }
  return lines.join("\n");
}

export function downloadMarkdown(blocks: AnyBlock[], title = "Untitled") {
  const md = blocksToMarkdown(blocks, title);
  const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title.replace(/[^a-zA-Z0-9\u00C0-\u024F\u1E00-\u1EFF ]/g, "_")}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── PDF Export ───

function getInlineText(block: AnyBlock): string {
  if (!Array.isArray(block.content)) {
    return typeof block.content === "string" ? block.content : "";
  }
  return (block.content as any[])
    .map((c: any) => {
      if (typeof c === "string") return c;
      if (c?.type === "text") return c.text ?? "";
      if (c?.type === "link") return c.content?.map((t: any) => t.text).join("") ?? "";
      return "";
    })
    .join("");
}

export function downloadPdf(blocks: AnyBlock[], title = "Untitled") {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const maxWidth = pageWidth - margin * 2;
  let y = margin;

  const checkPageBreak = (needed: number) => {
    if (y + needed > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage();
      y = margin;
    }
  };

  // Title
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  const titleLines = doc.splitTextToSize(title, maxWidth);
  checkPageBreak(titleLines.length * 8 + 10);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 8 + 4;

  // Date
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(128, 128, 128);
  doc.text(`Exported: ${new Date().toLocaleDateString("vi-VN")}`, margin, y);
  y += 10;
  doc.setTextColor(0, 0, 0);

  // Separator
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  const renderBlock = (block: AnyBlock, depth = 0) => {
    const text = getInlineText(block);
    const indent = depth * 6;
    const contentWidth = maxWidth - indent;

    switch (block.type) {
      case "heading": {
        const level = (block.props as any)?.level ?? 1;
        const sizes = [16, 14, 12];
        const size = sizes[Math.min(level - 1, 2)];
        doc.setFontSize(size);
        doc.setFont("helvetica", "bold");
        const lines = doc.splitTextToSize(text, contentWidth);
        checkPageBreak(lines.length * (size * 0.5) + 6);
        y += 3;
        doc.text(lines, margin + indent, y);
        y += lines.length * (size * 0.5) + 4;
        doc.setFont("helvetica", "normal");
        break;
      }
      case "paragraph": {
        if (!text) { y += 4; break; }
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        const lines = doc.splitTextToSize(text, contentWidth);
        checkPageBreak(lines.length * 4.5 + 2);
        doc.text(lines, margin + indent, y);
        y += lines.length * 4.5 + 2;
        break;
      }
      case "bulletListItem": {
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        const lines = doc.splitTextToSize(`• ${text}`, contentWidth);
        checkPageBreak(lines.length * 4.5 + 1);
        doc.text(lines, margin + indent, y);
        y += lines.length * 4.5 + 1;
        break;
      }
      case "numberedListItem": {
        doc.setFontSize(10);
        const lines = doc.splitTextToSize(text, contentWidth - 8);
        checkPageBreak(lines.length * 4.5 + 1);
        doc.text(`1.`, margin + indent, y);
        doc.text(lines, margin + indent + 8, y);
        y += lines.length * 4.5 + 1;
        break;
      }
      case "checkListItem": {
        doc.setFontSize(10);
        const checked = (block.props as any)?.checked;
        const prefix = checked ? "☑" : "☐";
        const lines = doc.splitTextToSize(`${prefix} ${text}`, contentWidth);
        checkPageBreak(lines.length * 4.5 + 1);
        doc.text(lines, margin + indent, y);
        y += lines.length * 4.5 + 1;
        break;
      }
      case "noteCallout": {
        const noteText = text || (block.props as any)?.text || "";
        const icon = (block.props as any)?.icon || "Note";
        doc.setFontSize(10);
        doc.setFont("helvetica", "italic");
        const lines = doc.splitTextToSize(`${icon} ${noteText}`, contentWidth - 4);
        checkPageBreak(lines.length * 4.5 + 6);
        doc.setFillColor(245, 245, 245);
        doc.roundedRect(margin + indent, y - 3, contentWidth, lines.length * 4.5 + 6, 2, 2, "F");
        doc.text(lines, margin + indent + 4, y + 1);
        y += lines.length * 4.5 + 6;
        doc.setFont("helvetica", "normal");
        break;
      }
      case "taskList": {
        doc.setFontSize(9);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(128, 128, 128);
        checkPageBreak(8);
        doc.text("📋 [Task Block — view in app]", margin + indent, y);
        y += 6;
        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "normal");
        break;
      }
      case "memberList": {
        doc.setFontSize(9);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(128, 128, 128);
        checkPageBreak(8);
        doc.text("👥 [Member Block — view in app]", margin + indent, y);
        y += 6;
        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "normal");
        break;
      }
      case "calendarView": {
        doc.setFontSize(9);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(128, 128, 128);
        checkPageBreak(8);
        doc.text("📅 [Calendar Block — view in app]", margin + indent, y);
        y += 6;
        doc.setTextColor(0, 0, 0);
        doc.setFont("helvetica", "normal");
        break;
      }
      case "columnList": {
        // Render columns side-by-side in PDF
        const cols = ((block.children as AnyBlock[]) ?? []).filter(
          (col) => (col.children as AnyBlock[])?.length > 0
        );
        if (cols.length <= 1) {
          (cols[0]?.children as AnyBlock[])?.forEach((child) => renderBlock(child, depth));
          return;
        }

        const colCount = cols.length;
        const colGap = 6;
        const totalGap = colGap * (colCount - 1);
        const colWidth = (contentWidth - totalGap) / colCount;

        // Save starting Y, render each column, track max Y
        const startY = y;
        let maxY = y;

        cols.forEach((col, idx) => {
          y = startY;
          const colX = margin + indent + idx * (colWidth + colGap);

          // Draw separator line between columns
          if (idx > 0) {
            const sepX = colX - colGap / 2;
            doc.setDrawColor(200, 200, 200);
            doc.line(sepX, startY - 2, sepX, startY + 60);
          }

          // Render children with constrained width via temporary override
          const origRenderBlock = (child: AnyBlock) => {
            const childText = getInlineText(child);
            doc.setFontSize(10);
            doc.setFont("helvetica", "normal");

            switch (child.type) {
              case "heading": {
                const level = (child.props as any)?.level ?? 1;
                const sizes = [14, 12, 11];
                const size = sizes[Math.min(level - 1, 2)];
                doc.setFontSize(size);
                doc.setFont("helvetica", "bold");
                const lines = doc.splitTextToSize(childText, colWidth - 4);
                checkPageBreak(lines.length * (size * 0.5) + 4);
                doc.text(lines, colX + 2, y);
                y += lines.length * (size * 0.5) + 3;
                doc.setFont("helvetica", "normal");
                break;
              }
              case "bulletListItem": {
                const lines = doc.splitTextToSize(`• ${childText}`, colWidth - 4);
                checkPageBreak(lines.length * 4.5 + 1);
                doc.text(lines, colX + 2, y);
                y += lines.length * 4.5 + 1;
                break;
              }
              default: {
                if (childText) {
                  const lines = doc.splitTextToSize(childText, colWidth - 4);
                  checkPageBreak(lines.length * 4.5 + 2);
                  doc.text(lines, colX + 2, y);
                  y += lines.length * 4.5 + 2;
                }
              }
            }
          };

          (col.children as AnyBlock[])?.forEach(origRenderBlock);
          if (y > maxY) maxY = y;
        });

        y = maxY + 4;
        return;
      }
      case "column": {
        (block.children as AnyBlock[])?.forEach((child) => renderBlock(child, depth));
        return;
      }
      default: {
        if (text) {
          doc.setFontSize(10);
          const lines = doc.splitTextToSize(text, contentWidth);
          checkPageBreak(lines.length * 4.5 + 2);
          doc.text(lines, margin + indent, y);
          y += lines.length * 4.5 + 2;
        }
      }
    }

    // Render children
    (block.children as AnyBlock[])?.forEach((child) => renderBlock(child, depth + 1));
  };

  blocks.forEach((block) => renderBlock(block));

  const filename = `${title.replace(/[^a-zA-Z0-9\u00C0-\u024F\u1E00-\u1EFF ]/g, "_")}.pdf`;
  doc.save(filename);
}
