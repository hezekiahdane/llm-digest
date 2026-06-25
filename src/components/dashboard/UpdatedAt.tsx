'use client';

import { useEffect, useState } from 'react';

interface UpdatedAtProps {
  fetchedAt: string;
}

function getMinutesAgo(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
}

export function UpdatedAt({ fetchedAt }: UpdatedAtProps) {
  const [minutes, setMinutes] = useState(() => getMinutesAgo(fetchedAt));

  useEffect(() => {
    const id = setInterval(() => setMinutes(getMinutesAgo(fetchedAt)), 60_000);
    return () => clearInterval(id);
  }, [fetchedAt]);

  if (minutes === 0)
    return (
      <span className="text-sm text-muted-foreground">Updated just now</span>
    );
  return (
    <span className="text-sm text-muted-foreground">
      Updated {minutes} {minutes === 1 ? 'minute' : 'minutes'} ago
    </span>
  );
}
