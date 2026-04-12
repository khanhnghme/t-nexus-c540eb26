import { useEffect } from 'react';
import { useTheme } from 'next-themes';

/**
 * Forces light mode while this component is mounted.
 * When user navigates to a protected route, next-themes restores theme from localStorage.
 */
export function ForceLightMode({ children }: { children: React.ReactNode }) {
  const { setTheme } = useTheme();

  useEffect(() => {
    setTheme('light');
  }, [setTheme]);

  return <>{children}</>;
}
