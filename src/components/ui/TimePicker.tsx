'use client';

import React from 'react';

interface TimePickerProps {
  value: string;
  onChange: (time: string) => void;
  className?: string;
}

export default function TimePicker({ value, onChange, className = '' }: TimePickerProps) {
  const parseTime = (time: string) => {
    if (!time) return { hours: '09', minutes: '00' };
    const [h, m] = time.split(':');
    return { hours: h || '09', minutes: m || '00' };
  };

  const { hours, minutes } = parseTime(value);

  const handleChange = (h: string, m: string) => {
    onChange(`${h}:${m}`);
  };

  const hourOptions = [];
  for (let i = 0; i < 24; i++) {
    hourOptions.push(
      <option key={i} value={String(i).padStart(2, '0')}>
        {String(i).padStart(2, '0')}
      </option>
    );
  }

  const minuteOptions = [];
  for (let i = 0; i < 60; i += 5) {
    minuteOptions.push(
      <option key={i} value={String(i).padStart(2, '0')}>
        {String(i).padStart(2, '0')}
      </option>
    );
  }

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <select
        value={hours}
        onChange={(e) => handleChange(e.target.value, minutes)}
        className="input py-2 px-2 text-center appearance-none cursor-pointer"
      >
        {hourOptions}
      </select>
      <span className="text-slate-600 font-medium">:</span>
      <select
        value={minutes}
        onChange={(e) => handleChange(hours, e.target.value)}
        className="input py-2 px-2 text-center appearance-none cursor-pointer"
      >
        {minuteOptions}
      </select>
    </div>
  );
}