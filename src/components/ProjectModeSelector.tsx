import { ListChecks, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProjectModeSelectorProps {
  onSelectBasic: () => void;
  onSelectCustom: () => void;
}

const modes = [
  {
    key: 'basic' as const,
    icon: ListChecks,
    title: 'Basic',
    description: 'Quản lý task, stage, deadline theo flow chuẩn',
  },
  {
    key: 'custom' as const,
    icon: Palette,
    title: 'Custom',
    description: 'Canvas tự do với block editor',
  },
];

export default function ProjectModeSelector({ onSelectBasic, onSelectCustom }: ProjectModeSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-4 p-2">
      {modes.map((mode) => {
        const Icon = mode.icon;
        const handler = mode.key === 'basic' ? onSelectBasic : onSelectCustom;
        return (
          <button
            key={mode.key}
            onClick={handler}
            className={cn(
              'flex flex-col items-center gap-3 rounded-xl border-2 border-border p-6 text-center transition-all duration-200',
              'hover:border-primary hover:bg-primary/5 hover:shadow-md hover:scale-[1.02]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              'cursor-pointer'
            )}
          >
            <div className="rounded-xl bg-primary/10 p-3">
              <Icon className="h-7 w-7 text-primary" />
            </div>
            <div>
              <p className="text-base font-semibold text-foreground">{mode.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{mode.description}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
