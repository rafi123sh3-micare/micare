'use client';

import { QRCodeSVG } from 'qrcode.react';

interface QRCodeProps {
  value: string;
  size?: number;
  className?: string;
}

export function QRCode({ value, size = 128, className = '' }: QRCodeProps) {
  return (
    <div className={className}>
      <QRCodeSVG value={value} size={size} />
    </div>
  );
}