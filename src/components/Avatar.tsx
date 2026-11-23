import { useState } from 'react';
import { getInitials } from '../utils/apparelFormatters';

interface AvatarProps {
  name: string;
  src?: string;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_CLASSES = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-9 w-9 text-xs',
  lg: 'h-12 w-12 text-sm',
};

export function Avatar({ name, src, size = 'md' }: AvatarProps) {
  const [imgFailed, setImgFailed] = useState(false);

  if (src && !imgFailed) {
    return (
      <img
        src={src}
        alt={name}
        referrerPolicy="no-referrer"
        onError={() => setImgFailed(true)}
        className={`${SIZE_CLASSES[size]} shrink-0 rounded-full object-cover border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800`}
      />
    );
  }

  return (
    <div
      aria-label={name}
      className={`${SIZE_CLASSES[size]} shrink-0 rounded-full flex items-center justify-center font-display font-semibold tracking-tight bg-slate-200/80 text-slate-700 border border-slate-300/70 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700`}
    >
      {getInitials(name)}
    </div>
  );
}
