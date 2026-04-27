'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Search, Calendar, Clock, Video, CheckCircle, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/Card';
import { StatusPill } from '@/components/ui/StatusPill';
import DatePicker from '@/components/ui/DatePicker';
import toast from 'react-hot-toast';
import { sendNotification, requestPushPermission } from '@/lib/notifications';

const statusConfig = {
  pending: { value: 'pending', label: 'অপেক্ষায়' },
  confirmed: { value: 'confirmed', label: 'নিশ্চিত' },
  upcoming: { value: 'upcoming', label: 'আসন্ন' },
  completed: { value: 'completed', label: 'সম্পন্ন' },
  cancelled: { value: 'cancelled', label: 'বাতিল' },
};
const getLocalDateString = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60000);
  return local.toISOString().split('T')[0];
};

export default function DoctorAppointments() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState(getLocalDateString());
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadAppointments();
  }, []);
useEffect(() => {
  const interval = setInterval(() => {
    setFilterDate(getLocalDateString());
  }, 60000);

  return () => clearInterval(interval);
}, []);
  const getStatusFromDate = (dateStr: string, currentStatus: string) => {
    if (currentStatus === 'cancelled') return 'cancelled';
    if (currentStatus === 'completed') return 'completed';
    if (currentStatus === 'pending') return 'pending';
    if (currentStatus === 'confirmed') return 'confirmed';
    const appointmentDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (appointmentDate < today) return 'completed';
    return 'upcoming';
  };

  async function loadAppointments() {
    const doctorData = JSON.parse(localStorage.getItem('doctorData') || 'null');

    if (!doctorData) {
      toast.error('ডাক্তার সেশন শেষ হয়ে গেছে। দয়া করে আবার লগইন করুন।');
      setLoading(false);
      return;
    }

    const { data: apts, error: aptError } = await supabase
      .from('appointments')
      .select('*, patients(name, phone)')
      .eq('doctor_id', doctorData.id)
      .order('date', { ascending: false });

    if (aptError) {
      console.error('Error fetching appointments:', aptError);
      toast.error('অ্যাপয়েন্টমেন্ট লোড করতে সমস্যা হয়েছে');
    }

    if (apts) {
      const mapped = apts.map((apt: any) => {
        const timeRange = apt.time 
          ? formatTime(apt.time)
          : '';

        return {
          ...apt,
          patientName: apt.patients?.name || 'রোগী',
          patientPhone: apt.patients?.phone || '',
          time_display: timeRange,
          displayStatus: getStatusFromDate(apt.date, apt.status),
        };
      });

const statusOrder: Record<string, number> = {
        pending: 1,
        confirmed: 2,
        completed: 3,
        upcoming: 2, // Treat upcoming as confirmed for sorting
        cancelled: 4,
      };

      const sorted = mapped.sort((a, b) => {
        const aStatus = a.displayStatus;
        const bStatus = b.displayStatus;
        return (statusOrder[aStatus] || 99) - (statusOrder[bStatus] || 99);
      });

      setAppointments(sorted);
    }
    setLoading(false);
  }

  const filteredAppointments = appointments.filter(apt => {
    if (filterDate && apt.date !== filterDate) return false;
    if (filterStatus && apt.displayStatus !== filterStatus) return false;
    if (filterType && apt.type !== filterType) return false;
    if (search) {
      const searchLower = search.toLowerCase();
      if (!apt.patientName?.toLowerCase().includes(searchLower)) return false;
    }
    return true;
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('bn-BD', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatTime = (timeStr: string) => timeStr ? timeStr.substring(0, 5) : '';

  async function updateStatus(aptId: string, newStatus: string) {
    const { data: apt } = await supabase
      .from('appointments')
      .select('*, patients(name), doctors(name)')
      .eq('id', aptId)
      .single();

    let updateData: any = { status: newStatus };

    if (newStatus === 'confirmed' && !apt?.serial_number) {
      const { data: doctor } = await supabase
        .from('doctors')
        .select('doctor_code')
        .eq('id', apt.doctor_id)
        .single();

      const doctorCode = doctor?.doctor_code || 'DR01';
      const typeSuffix = apt.type === 'teleconsult' ? 'T' : 'A';

      const { data: existingApts } = await supabase
        .from('appointments')
        .select('id')
        .eq('doctor_id', apt.doctor_id)
        .eq('date', apt.date)
        .neq('id', aptId)
        .in('status', ['confirmed', 'completed']);

      const count = existingApts?.length || 0;
      const nextNumber = count + 1;
      const serialNumber = `${doctorCode}-${String(nextNumber).padStart(3, '0')}${typeSuffix}`;
      
      updateData.serial_number = serialNumber;
    }

    const { error } = await supabase
      .from('appointments')
      .update(updateData)
      .eq('id', aptId);

    if (!error && apt) {
      requestPushPermission();

      const doctorData = JSON.parse(localStorage.getItem('doctorData') || 'null');

      if (newStatus === 'confirmed') {
        try {
          await sendNotification('appointment_confirmed_patient', {
            patientId: apt.patient_id,
          }, {
            patientName: apt.patients?.name,
            doctorName: apt.doctors?.name,
            date: apt.date,
          });
        } catch (e) {}

        try {
          await sendNotification('appointment_confirmed_doctor', {
            doctorId: doctorData?.id,
          }, {
            patientName: apt.patients?.name,
            date: apt.date,
          });
        } catch (e) {}

        if (apt.type === 'teleconsult') {
          try {
            await sendNotification('teleconsult_ready_patient', {
              patientId: apt.patient_id,
            }, {
              doctorName: apt.doctors?.name,
            });
          } catch (e) {}
        }
      } else if (newStatus === 'cancelled') {
        try {
          await sendNotification('appointment_cancelled_patient', {
            patientId: apt.patient_id,
          }, {
            patientName: apt.patients?.name,
            doctorName: apt.doctors?.name,
          });
        } catch (e) {}

        try {
          await sendNotification('appointment_cancelled_doctor', {
            doctorId: doctorData?.id,
          }, {
            patientName: apt.patients?.name,
            date: apt.date,
          });
        } catch (e) {}

        try {
          await sendNotification('appointment_cancelled_admin', {
            adminIds: [],
          }, {
            patientName: apt.patients?.name,
            doctorName: apt.doctors?.name,
          });
        } catch (e) {}

        if (apt.type === 'teleconsult') {
          try {
            await sendNotification('teleconsult_cancelled_patient', {
              patientId: apt.patient_id,
            }, {
              doctorName: apt.doctors?.name,
            });
          } catch (e) {}

          try {
            await sendNotification('teleconsult_cancelled_doctor', {
              doctorId: doctorData?.id,
            }, {
              patientName: apt.patients?.name,
              date: apt.date,
            });
          } catch (e) {}
        }
      }

      toast.success('স্ট্যাটাস আপডেট হয়েছে');
      loadAppointments();
    }
  }

  if (loading) {
    return (
      <DashboardLayout role="doctor">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="doctor">
      <div className="space-y-6 page-enter">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">অ্যাপয়েন্টমেন্ট</h1>
          <p className="text-slate-500 mt-1">রোগীদের অ্যাপয়েন্টমেন্ট দেখুন</p>
        </div>

        <Card className="bg-white/80 backdrop-blur-xl border border-slate-200/60 shadow-lg shadow-slate-200/20">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="min-w-[140px]">
              <label className="text-sm font-medium text-slate-600 mb-2 block">তারিখ</label>
              <DatePicker
                value={filterDate}
                onChange={setFilterDate}
                className="!w-full"
              />
            </div>

            <div className="min-w-[140px]">
              <label className="text-sm font-medium text-slate-600 mb-2 block">ধরন</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="input"
              >
                <option value="">সব ধরন</option>
                <option value="walkin">সরাসরি ভিজিট</option>
                <option value="teleconsult">ভিডিও কল</option>
              </select>
            </div>

            <div className="min-w-[140px]">
              <label className="text-sm font-medium text-slate-600 mb-2 block">স্ট্যাটাস</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="input"
              >
                <option value="">সব স্ট্যাটাস</option>
                {Object.values(statusConfig).map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium text-slate-600 mb-2 block">খুঁজুন</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="রোগী খুঁজুন..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="input pl-10"
                />
              </div>
            </div>

            {(filterStatus || filterType || search || filterDate !== getLocalDateString()) && (
              <button
                onClick={() => {
                  setFilterStatus('');
                  setFilterType('');
                  setSearch('');
                  setFilterDate(getLocalDateString());
                }}
                className="px-4 py-2 text-sm text-red-500 hover:bg-red-50 rounded-lg transition-colors"
              >
                রিসেট
              </button>
            )}
          </div>
        </Card>

        {filteredAppointments.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-slate-500">নির্বাচিত তারিখে কোনো অ্যাপয়েন্টমেন্ট নেই</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAppointments.map((apt) => (
              <Card key={apt.id} className="hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-slate-900">{apt.patientName}</h3>
                    <p className="text-sm text-slate-500">{apt.patientPhone}</p>
                  </div>
                  {apt.status === 'pending' && (apt.displayStatus === 'upcoming' || apt.displayStatus === 'pending') ? (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">অপেক্ষায়</span>
                  ) : apt.status === 'confirmed' && (apt.displayStatus === 'upcoming' || apt.displayStatus === 'pending') ? (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">নিশ্চিত</span>
                  ) : (
                    <StatusPill status={apt.displayStatus as any} />
                  )}
                </div>

                <div className="flex items-center gap-4 text-sm text-slate-600 mb-4">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" /> {formatDate(apt.date)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" /> {apt.time_display}
                  </span>
                  <span className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-md font-mono text-xs">
                    সিরিয়াল: {(apt.status === 'confirmed' || apt.status === 'completed') && apt.serial_number ? apt.serial_number : '-'}
                  </span>
                  <span className={`flex items-center gap-1 ${apt.type === 'teleconsult' ? 'text-purple-600' : ''}`}>
                    {apt.type === 'teleconsult' && <Video className="w-4 h-4" />}
                    {apt.type === 'teleconsult' ? 'ভিডিও কল' : 'সরাসরি'}
                  </span>
                </div>

                {apt.reason && (
                  <div className="p-3 bg-slate-50 rounded-lg mb-4">
                    <p className="text-sm"><span className="font-medium">সমস্যা:</span> {apt.reason}</p>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  {apt.status === 'pending' && (apt.displayStatus === 'upcoming' || apt.displayStatus === 'pending') && (
                    <>
                      <button
                        onClick={() => updateStatus(apt.id, 'confirmed')}
                        className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="গ্রহণ"
                      >
                        <CheckCircle className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => updateStatus(apt.id, 'cancelled')}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="বাতিল"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </>
                  )}
                  {apt.status === 'confirmed' && (apt.displayStatus === 'upcoming' || apt.displayStatus === 'pending') && (
                    <div className="flex items-center gap-2">
                      {apt.type === 'teleconsult' && (
                        <button className="btn-primary flex items-center justify-center gap-2 py-2">
                          <Video className="w-4 h-4" /> কল শুরু
                        </button>
                      )}
                      <button
                        onClick={() => updateStatus(apt.id, 'completed')}
                        className="btn-secondary flex items-center justify-center gap-2 py-2"
                      >
                        <CheckCircle className="w-4 h-4" /> সম্পন্ন
                      </button>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}