'use client';

import React from 'react';

interface TimePickerProps {
  value: string;
  onChange: (time: string) => void;
  className?: string;
}

export default function TimePicker({ value, onChange, className = '' }: TimePickerProps) {
  const parseTime = (time: string) => {
    if (!time) return { hours: '09', minutes: '00', period: 'AM' };
    
    const upperTime = time.toUpperCase();
    const hasAM = upperTime.includes('AM');
    const hasPM = upperTime.includes('PM');
    
    let h: string, m: string, period: string;
    
    if (hasAM || hasPM) {
      period = hasPM ? 'PM' : 'AM';
      const parts = time.replace(/[APap][Mm]/, '').split(':');
      h = parts[0]?.padStart(2, '0') || '09';
      m = parts[1]?.slice(0, 2).padStart(2, '0') || '00';
    } else {
      const parts = time.split(':');
      h = parts[0]?.padStart(2, '0') || '09';
      m = parts[1]?.slice(0, 2).padStart(2, '0') || '00';
      const hourNum = parseInt(h);
      if (hourNum === 0) {
        h = '12';
        period = 'AM';
      } else if (hourNum === 12) {
        h = '12';
        period = 'PM';
      } else if (hourNum > 12) {
        h = String(hourNum - 12).padStart(2, '0');
        period = 'PM';
      } else {
        period = 'AM';
      }
    }
    
    return { hours: h, minutes: m, period };
  };

  const { hours, minutes, period } = parseTime(value);

  const handleChange = (h: string, m: string, p: string) => {
    let hour24 = parseInt(h);
    if (p === 'PM' && hour24 !== 12) hour24 += 12;
    if (p === 'AM' && hour24 === 12) hour24 = 0;
    const hourStr = String(hour24).padStart(2, '0');
    onChange(`${hourStr}:${m}`);
  };

  const hourOptions = [];
  for (let i = 1; i <= 12; i++) {
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
        onChange={(e) => handleChange(e.target.value, minutes, period)}
        className="input py-2 px-2 text-center appearance-none cursor-pointer"
      >
        {hourOptions}
      </select>
      <span className="text-slate-600 font-medium">:</span>
      <select
        value={minutes}
        onChange={(e) => handleChange(hours, e.target.value, period)}
        className="input py-2 px-2 text-center appearance-none cursor-pointer"
      >
        {minuteOptions}
      </select>
      <select
        value={period}
        onChange={(e) => handleChange(hours, minutes, e.target.value)}
        className="input py-2 px-2 text-center appearance-none cursor-pointer ml-1"
      >
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </div>
  );
}