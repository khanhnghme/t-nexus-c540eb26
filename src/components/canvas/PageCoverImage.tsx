import { useState } from "react";
import { ImageIcon, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import CoverPicker from "./CoverPicker";

interface PageCoverImageProps {
  coverUrl?: string | null;
  editable?: boolean;
  onChangeCover?: (coverUrl: string | null) => void;
}

function isGradientOrColor(url: string) {
  return url.startsWith("linear-gradient") || url.startsWith("radial-gradient") || url.startsWith("#") || url.startsWith("rgb") || url.startsWith("hsl");
}

export default function PageCoverImage({ coverUrl, editable, onChangeCover }: PageCoverImageProps) {
  const [hovered, setHovered] = useState(false);

  if (!coverUrl && !editable) return null;

  if (!coverUrl) {
    // No cover yet — show nothing (the "Add cover" button is in PageHeader)
    return null;
  }

  const isCSS = isGradientOrColor(coverUrl);
  const style = isCSS
    ? { background: coverUrl }
    : { backgroundImage: `url(${coverUrl})`, backgroundSize: "cover", backgroundPosition: "center" };

  return (
    <div
      className="relative w-full h-[180px] group"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="absolute inset-0 rounded-t-lg" style={style} />
      {editable && hovered && (
        <div className="absolute bottom-3 right-3 flex items-center gap-1.5 z-10">
          <CoverPicker currentCover={coverUrl} onSelect={onChangeCover}>
            <Button variant="secondary" size="sm" className="h-7 text-xs gap-1.5 shadow-sm">
              <ImageIcon className="h-3 w-3" />
              Đổi cover
            </Button>
          </CoverPicker>
          <Button
            variant="secondary"
            size="sm"
            className="h-7 text-xs gap-1.5 shadow-sm"
            onClick={() => onChangeCover?.(null)}
          >
            <Trash2 className="h-3 w-3" />
            Xóa
          </Button>
        </div>
      )}
    </div>
  );
}
