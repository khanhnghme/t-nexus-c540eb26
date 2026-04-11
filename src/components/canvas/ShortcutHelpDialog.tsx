import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Keyboard } from "lucide-react";

interface ShortcutHelpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const isMac = typeof navigator !== "undefined" && /Mac/.test(navigator.userAgent);
const mod = isMac ? "⌘" : "Ctrl";

const shortcuts = [
  { category: "Canvas", items: [
    { keys: `${mod}+S`, desc: "Lưu ngay lập tức" },
    { keys: `${mod}+N`, desc: "Tạo trang mới" },
    { keys: `${mod}+E`, desc: "Chuyển chế độ Sửa/Xem" },
    { keys: `${mod}+\\`, desc: "Ẩn/hiện sidebar" },
    { keys: `${mod}+?`, desc: "Mở bảng phím tắt" },
  ]},
  { category: "Định dạng (BlockNote)", items: [
    { keys: `${mod}+B`, desc: "In đậm" },
    { keys: `${mod}+I`, desc: "In nghiêng" },
    { keys: `${mod}+U`, desc: "Gạch chân" },
    { keys: `${mod}+K`, desc: "Chèn link" },
    { keys: `${mod}+Shift+S`, desc: "Gạch ngang" },
    { keys: "/", desc: "Mở menu lệnh" },
  ]},
];

export default function ShortcutHelpDialog({ open, onOpenChange }: ShortcutHelpDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-4 w-4" />
            Phím tắt
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {shortcuts.map((group) => (
            <div key={group.category}>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                {group.category}
              </h4>
              <div className="space-y-1">
                {group.items.map((s) => (
                  <div key={s.keys} className="flex items-center justify-between py-1.5 px-1">
                    <span className="text-sm">{s.desc}</span>
                    <kbd className="inline-flex items-center gap-0.5 rounded border bg-muted px-2 py-0.5 text-xs font-mono text-muted-foreground">
                      {s.keys}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
