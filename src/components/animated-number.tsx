'use client';

import { useEffect, useState } from 'react';
import { useSpring, useTransform } from 'framer-motion';

export function AnimatedNumber({
  value,
  prefix = '$ ',
  suffix = '',
  className = '',
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const spring = useSpring(0, { mass: 0.5, stiffness: 100, damping: 18 });
  const display = useTransform(spring, (current) =>
    Math.round(current).toLocaleString('es-CO')
  );
  const [displayValue, setDisplayValue] = useState<string>(
    Math.round(value).toLocaleString('es-CO')
  );

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  useEffect(() => {
    return display.on('change', (latest) => {
      setDisplayValue(latest);
    });
  }, [display]);

  return (
    <span className={`inline-flex items-baseline ${className}`}>
      {prefix ? <span className="select-none">{prefix}</span> : null}
      <span>{displayValue}</span>
      {suffix ? <span className="select-none">{suffix}</span> : null}
    </span>
  );
}
