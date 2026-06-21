'use client';

import { QRCodeSVG } from 'qrcode.react';

interface AppointmentSlipProps {
  patientId: string;
  patientSerial?: string;
  appointmentDate?: string;
  patientName: string;
  patientGender: string;
  patientAge: number | string;
  patientPhone: string;
  doctorName: string;
  doctorDegree?: string;
  doctorSpecialty?: string;
}

export function AppointmentSlip({
  patientId,
  patientSerial,
  appointmentDate,
  patientName,
  patientGender,
  patientAge,
  patientPhone,
  doctorName,
  doctorDegree,
  doctorSpecialty,
}: AppointmentSlipProps) {
  const qrValue = patientId
    ? `https://carescriptrx.vercel.app/dashboard/doctor/prescribe?patient_id=${patientId}`
    : '';

  return (
    <div className="bg-white rounded-xl p-6 space-y-5" id="appointment-slip">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-shrink-0 bg-white p-2 rounded-lg border border-slate-100">
          {qrValue && (
            <QRCodeSVG
              value={qrValue}
              size={128}
            />
          )}
        </div>
        <div className="flex-shrink-0">
          <img
            src="https://iili.io/Cf3Yo8b.png"
            alt="Logo"
            className="h-16 w-auto object-contain"
          />
        </div>
      </div>

      <div className="space-y-2.5 text-sm">
        <div className="flex gap-2">
          <span className="font-semibold text-slate-600 min-w-[100px]">Patient Serial:</span>
          <span className="text-slate-800 font-mono font-semibold">{patientSerial || '-'}</span>
        </div>
        <div className="flex gap-2">
          <span className="font-semibold text-slate-600 min-w-[100px]">Patient Name:</span>
          <span className="text-slate-800 font-medium">{patientName}</span>
        </div>
        <div className="flex gap-2">
          <span className="font-semibold text-slate-600 min-w-[100px]">Gender:</span>
          <span className="text-slate-800">{patientGender.charAt(0).toUpperCase() + patientGender.slice(1)}</span>
          <span className="font-semibold text-slate-600 ml-4">Age:</span>
          <span className="text-slate-800">{patientAge || '-'}</span>
        </div>
        <div className="flex gap-2">
          <span className="font-semibold text-slate-600 min-w-[100px]">Phone:</span>
          <span className="text-slate-800">{patientPhone || '-'}</span>
        </div>
      </div>

      <div className="pt-3 border-t border-slate-200">
        <div className="flex gap-2">
          <span className="font-semibold text-slate-600 min-w-[100px] shrink-0">Consultant:</span>
          <div className="min-w-0">
            <p className="font-medium text-slate-800">{doctorName}</p>
            {(doctorDegree || doctorSpecialty) && (
              <p className="text-sm text-slate-600 mt-0.5 leading-relaxed whitespace-pre-line break-words">
                {doctorDegree}{doctorDegree && doctorSpecialty ? ', ' : ''}{doctorSpecialty}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
