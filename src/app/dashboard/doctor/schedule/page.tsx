'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Clock, Check, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

const days = [
  { index: 0, name: 'রবিবার' },
  { index: 1, name: 'সোমবার' },
  { index: 2, name: 'মঙ্গলবার' },
  { index: 3, name: 'বুধবার' },
  { index: 4, name: 'বৃহস্পতিবার' },
  { index: 5, name: 'শুক্রবার' },
  { index: 6, name: 'শনিবার' }
];

export default function DoctorSchedule() {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [pendingSchedules, setPendingSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSchedules();
    
    const checkRefresh = setInterval(() => {
      const refreshTime = localStorage.getItem('admin_schedules_refresh');
      if (refreshTime) {
        localStorage.removeItem('admin_schedules_refresh');
        loadSchedules();
      }
    }, 2000);
    
    return () => clearInterval(checkRefresh);
  }, []);

  const getLocalDateString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  async function loadSchedules() {
    if (typeof window === 'undefined') {
      setLoading(false);
      return;
    }
    const doctorData = JSON.parse(localStorage.getItem('doctorData') || 'null');
    
    if (!doctorData) {
      setLoading(false);
      return;
    }

    // Fetch ALL active and pending schedules for this doctor (no date filter)
    const { data: allSchedules } = await supabase
      .from('schedules')
      .select('*')
      .eq('doctor_id', doctorData.id)
      .or('status.eq.active,status.eq.pending')
      .order('start_date', { ascending: true });

    if (allSchedules) {
      // For pending schedules - show all
      const pendingSchedulesList = allSchedules.filter(s => 
        s.status === 'pending'
      );

      // For active schedules - show all (weekly routine will filter by day)
      const activeSchedules = allSchedules.filter(s => 
        s.status === 'active'
      );

      setSchedules(activeSchedules);
      setPendingSchedules(pendingSchedulesList);
    }

    setLoading(false);
  }

  async function confirmSchedule(id: string) {
    await supabase
      .from('schedules')
      .update({ status: 'active' })
      .eq('id', id);
    
    toast.success('শিফট নিশ্চিত হয়েছে');
    loadSchedules();
  }

  async function rejectSchedule(id: string) {
    await supabase
      .from('schedules')
      .delete()
      .eq('id', id);
    
    toast.success('শিফট বাতিল হয়েছে');
    loadSchedules();
  }

  const formatTime = (time: string) => {
    return time ? time.substring(0, 5) : '';
  };

  const activeSchedules = schedules.filter(s => s.status === 'active');

  const weeklySchedule = days.map(day => {
    const daySchedules = activeSchedules.filter(s => 
      s.selected_days?.includes(day.name)
    );

    return {
      day: day.name,
      dayIndex: day.index,
      schedules: daySchedules,
      isActive: daySchedules.length > 0
    };
  });

  const todayStr = getLocalDateString();
  const todayDateObj = new Date(todayStr);
  const todayDayName = days[todayDateObj.getDay()]?.name || '';
  const todaysShift = activeSchedules.find(s => 
    s.selected_days?.includes(todayDayName)
  );

  if (loading) {
    return (
      <DashboardLayout role="doctor">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="doctor">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">আমার শিফট</h1>
          <p className="text-gray-500">আপনার সাপ্তাহিক সময়সূচী</p>
        </div>

        {todaysShift && (
          <div className="card bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-500 rounded-lg">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-green-800">আজকের শিফট</h3>
                <p className="text-sm text-green-600">
                  {formatTime(todaysShift.start_time)} - {formatTime(todaysShift.end_time)}
                </p>
              </div>
            </div>
          </div>
        )}

        {pendingSchedules.length > 0 && (
          <div className="card bg-amber-50 border-2 border-amber-200">
            <h2 className="font-semibold text-amber-800 mb-4">অপেক্ষায় শিফট ({pendingSchedules.length})</h2>
            <div className="space-y-3">
              {pendingSchedules.map((schedule) => (
                <div key={schedule.id} className="flex items-center justify-between bg-white p-3 rounded-lg border border-amber-200">
                  <div>
                    <p className="font-medium text-gray-900">
                      {schedule.selected_days?.[0] || 'সব দিন'}
                    </p>
                    <p className="text-sm text-gray-500">{formatTime(schedule.start_time)} - {formatTime(schedule.end_time)}</p>
                    <p className="text-xs text-gray-400">
                      {schedule.start_date} {schedule.end_date ? ` - ${schedule.end_date}` : '(চলমান)'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => confirmSchedule(schedule.id)}
                      className="px-3 py-1.5 bg-emerald-500 text-white text-sm rounded-lg hover:bg-emerald-600 flex items-center gap-1"
                    >
                      <Check className="w-4 h-4" /> নিশ্চিত
                    </button>
                    <button
                      onClick={() => rejectSchedule(schedule.id)}
                      className="px-3 py-1.5 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 flex items-center gap-1"
                    >
                      <X className="w-4 h-4" /> বাতিল
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="card">
            <h2 className="font-semibold text-gray-900 mb-4">সাপ্তাহিক রুটিন</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-500 border-b">
                  <th className="pb-3 font-medium">দিন</th>
                  <th className="pb-3 font-medium">সময়</th>
                </tr>
              </thead>
              <tbody>
                {weeklySchedule.map((weekDay) => (
                  <tr key={weekDay.dayIndex} className="border-b border-gray-100">
                    <td className="py-3 font-medium text-gray-900">{weekDay.day}</td>
                    <td className="py-3">
                      {weekDay.isActive ? (
                        <span className="text-gray-600">
                          {weekDay.schedules.map(s => `${formatTime(s.start_time)} - ${formatTime(s.end_time)}`).join(', ')}
                        </span>
                      ) : (
                        <span className="text-gray-400">অফ</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
