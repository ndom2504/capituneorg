import React, { useState } from 'react';

type BrandMarkProps = {
  sizeClassName?: string;
  className?: string;
  alt?: string;
  src?: string;
};

export default function BrandMark({
  sizeClassName = 'w-20 h-20',
  className = '',
  alt = 'Capitune',
  src = '/brand-mark.png',
}: BrandMarkProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={`${sizeClassName} mauve-gradient rounded-3xl flex items-center justify-center text-white font-black text-4xl shadow-2xl shadow-purple-200 ${className}`}
        aria-label={alt}
      >
        C
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={`${sizeClassName} rounded-3xl object-cover shadow-2xl shadow-purple-200 ${className}`}
      onError={() => setFailed(true)}
      draggable={false}
    />
  );
}
