import tNexusText from '@/assets/t-nexus-text.png';
import tNexusTextWhite from '@/assets/t-nexus-text-white.png';

interface TNexusLogoProps {
  variant?: 'text';
  className?: string;
  width?: number;
  /** Use white version for dark/colored backgrounds */
  light?: boolean;
}

export function TNexusLogo({ className = '', width = 120, light = false }: TNexusLogoProps) {
  const textSrc = light ? tNexusTextWhite : tNexusText;

  return (
    <img
      src={textSrc}
      alt="T-Nexus"
      className={className}
      style={{ width, height: 'auto' }}
    />
  );
}
