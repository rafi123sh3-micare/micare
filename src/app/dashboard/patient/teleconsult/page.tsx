'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Video, AlertCircle, ArrowLeft, Clock, User, Calendar, ExternalLink, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface TeleconsultAppointment {
  id: string;
  doctor_name: string;
  specialty: string;
  time: string;
  reason: string;
  teleconsult_link: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
}

export default function PatientTeleconsult() {
  const [appointments, setAppointments] = useState<TeleconsultAppointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTeleconsults();
    const interval = setInterval(loadTeleconsults, 30000);
    return () => clearInterval(interval);
  }, []);

  async function loadTeleconsults() {
    if (typeof window === 'undefined') return;
    
    const patientData = JSON.parse(localStorage.getItem('patientData') || 'null');
    if (!patientData) {
      setLoading(false);
      return;
    }

    const getLocalDateString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = getLocalDateString();

    const { data: teleconsults, error } = await supabase
      .from('appointments')
      .select('*, doctors(name, specialization, zoom_link)')
      .eq('patient_id', patientData.id)
      .eq('type', 'teleconsult')
      .eq('date', todayStr)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading teleconsults:', error);
      setLoading(false);
      return;
    }

    const mapped = (teleconsults || []).map((a: any) => ({
      id: a.id,
      doctor_name: a.doctors?.name || 'ডাক্তার',
      specialty: a.doctors?.specialization || '',
      time: a.time,
      reason: a.reason || '',
      teleconsult_link: a.teleconsult_link || a.doctors?.zoom_link || '',
      status: a.status,
    }));

    setAppointments(mapped);
    setLoading(false);
  }

  const joinCall = (link: string) => {
    if (link) {
      window.open(link, '_blank', 'noopener,noreferrer');
    } else {
      toast.error('কল লিংক পাওয়া যায়নি');
    }
  };

  const confirmedCount = appointments.filter(a => a.status === 'confirmed').length;
  const pendingCount = appointments.filter(a => a.status === 'pending').length;

  return (
    <DashboardLayout role="patient">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/patient" className="p-2 hover:bg-slate-100 rounded-xl">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">টেলিকনসাল্ট</h1>
            <p className="text-gray-500">ভিডিও কলে ডাক্তারের সাথে কথা বলুন</p>
          </div>
        </div>

        {loading ? (
          <div className="animate-pulse space-y-3">
            <div className="h-24 bg-slate-200 rounded-xl" />
            <div className="h-24 bg-slate-200 rounded-xl" />
          </div>
        ) : appointments.length === 0 ? (
          <div className="card bg-gradient-to-br from-purple-50 to-purple-100">
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Video className="w-10 h-10 text-purple-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">কোনো টেলিকনসাল্ট নেই</h2>
              <p className="text-gray-600 mb-6 max-w-sm mx-auto">
                আপনার কোনো টেলিকনসাল্ট অ্যাপয়েন্টমেন্ট নেই। অ্যাপয়েন্টমেন্ট বুক করুন।
              </p>
              <Link
                href="/dashboard/patient/book"
                className="btn-primary px-8 py-3 flex items-center gap-2 mx-auto inline-block"
              >
                <Calendar className="w-5 h-5" /> অ্যাপয়েন্টমেন্ট বুক করুন
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {confirmedCount > 0 && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle className="w-4 h-4" />
                {confirmedCount}টি নিশ্চিত টেলিকনসাল্ট
              </div>
            )}
            {pendingCount > 0 && (
              <div className="flex items-center gap-2 text-sm text-amber-600">
                <Clock className="w-4 h-4" />
                {pendingCount}টি অপেক্ষায়
              </div>
            )}
            
            {appointments.map((apt) => (
              <div key={apt.id} className="card">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center text-white font-bold">
                      {apt.doctor_name?.charAt(2) || 'ডা'}
                    </div>
                    <div>
                      <h2 className="font-semibold text-gray-900">{apt.doctor_name}</h2>
                      <p className="text-sm text-purple-600">{apt.specialty}</p>
                    </div>
                  </div>
                  {apt.status === 'confirmed' ? (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-sm font-medium">নিশ্চিত</span>
                    </div>
                  ) : apt.status === 'pending' ? (
                    <div className="flex items-center gap-2 text-amber-600">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm font-medium">অপেক্ষায়</span>
                    </div>
                  ) : apt.status === 'cancelled' ? (
                    <div className="flex items-center gap-2 text-red-600">
                      <XCircle className="w-4 h-4" />
                      <span className="text-sm font-medium">বাতিল</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-sm font-medium">সম্পন্ন</span>
                    </div>
                  )}
                </div>

                <div className="bg-purple-50 rounded-xl p-4 mb-4 space-y-2">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span>সময়: {apt.time}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <User className="w-4 h-4" />
                    <span>সমস্যা: {apt.reason}</span>
                  </div>
                </div>

                {apt.status === 'confirmed' && (
                  <button
                    onClick={() => joinCall(apt.teleconsult_link)}
                    className="w-full btn-primary py-3 flex items-center justify-center gap-2"
                  >
                    <Video className="w-5 h-5" /> কলে যোগ দিন
                  </button>
                )}
                {apt.status === 'pending' && (
                  <div className="w-full py-3 text-center text-amber-600 bg-amber-50 rounded-xl">
                    অপেক্ষায় আছে, সময় হলে যোগ দিন
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">সাধারণ প্রশ্ন</h2>
          <div className="space-y-3">
            <details className="group">
              <summary className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer">
                <span className="font-medium">টেলিকনসাল্ট কী?</span>
                <span className="transform group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <p className="p-3 text-gray-600 text-sm">
                টেলিকনসাল্ট হলো ভিডিও কলের মাধ্যমে ডাক্তারের সাথে কথা বলা। 
                বাড়ি বসে চিকিৎসা পেতে পারেন।
              </p>
            </details>
            <details className="group">
              <summary className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer">
                <span className="font-medium">কী কী লাগবে?</span>
                <span className="transform group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <p className="p-3 text-gray-600 text-sm">
                স্মার্টফোন বা কম্পিউটার, ইন্টারনেট সংযোগ, ক্যামেরা ও মাইক।
              </p>
            </details>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}