'use client';

import { useRef, useEffect, useState } from 'react';

export default function ScanPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!code.trim()) return;
    window.location.href = `/api/bcode?code=${encodeURIComponent(code.trim())}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white rounded-xl shadow-sm border p-8 w-full max-w-md text-center space-y-6">
        <h1 className="text-xl font-semibold text-slate-800">Scan Barcode</h1>
        <p className="text-sm text-slate-500">Scan the patient barcode to open prescribe page</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            ref={inputRef}
            type="text"
            value={code}
            onChange={e => setCode(e.target.value)}
            placeholder="Scan barcode here..."
            className="input w-full text-center text-lg font-mono tracking-widest"
            autoComplete="off"
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button type="submit" className="btn btn-primary w-full">
            Go to Prescribe
          </button>
        </form>
      </div>
    </div>
  );
}
