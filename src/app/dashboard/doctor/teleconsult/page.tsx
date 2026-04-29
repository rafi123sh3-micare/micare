'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Video, Phone, Mic, MicOff, VideoOff, PhoneOff, Monitor, ArrowLeft, Clock, ExternalLink, Save, Link as LinkIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { sendNotification, requestPushPermission } from '@/lib/notifications';

interface WaitingPatient {
  id: string;
  name: string;
  time: string;
  reason: string;
  waiting: number;
  teleconsult_link: string;
}

export default function DoctorTeleconsult() {
  const [inCall, setInCall] = useState(false);
  const [videoOn, setVideoOn] = useState(true);
  const [audioOn, setAudioOn] = useState(true);
  const [waitingPatients, setWaitingPatients] = useState<WaitingPatient[]>([]);
  const [currentPatient, setCurrentPatient] = useState<WaitingPatient | null>(null);
  const [loading, setLoading] = useState(true);
  const [zoomLink, setZoomLink] = useState('');
  const [savingZoom, setSavingZoom] = useState(false);
  const [doctorData, setDoctorData] = useState<any>(null);

  useEffect(() => {
    loadTeleconsults();
    loadDoctorZoomLink();
  }, []);

  async function loadDoctorZoomLink() {
    if (typeof window === 'undefined') return;
    const data = JSON.parse(localStorage.getItem('doctorData') || 'null');
    if (data) {
      setDoctorData(data);
      setZoomLink(data.zoom_link || '');
    }
  }

  async function saveZoomLink() {
    if (!doctorData || !zoomLink) {
      toast.error('Zoom লিংক দিন');
      return;
    }
    
    const doctorId = doctorData?.id || doctorData?.doctor_id;
    if (!doctorId) {
      toast.error('ডাক্তারের আইডি পাওয়া যায়নি');
      return;
    }
    
    setSavingZoom(true);
    
    const updateData: any = { zoom_link: zoomLink };
    if (doctorData?.passcode) {
      updateData.passcode = doctorData.passcode;
    }
    
    const { error } = await supabase
      .from('doctors')
      .update({ zoom_link: zoomLink })
      .eq('id', doctorId)
      .select();
      
    if (error) {
      console.error('Save error:', error);
      toast.error('সেভ করতে ব্যর্থ: ' + error.message);
    } else {
      console.log('Saved successfully!');
      localStorage.setItem('doctorData', JSON.stringify({ ...doctorData, zoom_link: zoomLink }));
      toast.success('Zoom লিংক সেভ হয়েছে!');
    }
    setSavingZoom(false);
  }

  const getLocalDateString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  async function loadTeleconsults() {
    if (typeof window === 'undefined') return;
    
    const doctorData = JSON.parse(localStorage.getItem('doctorData') || 'null');
    if (!doctorData) return;

    const todayStr = getLocalDateString();
    const now = new Date();

    const { data: teleconsults } = await supabase
      .from('appointments')
      .select('*, patients(name)')
      .eq('doctor_id', doctorData.id)
      .eq('type', 'teleconsult')
      .eq('status', 'confirmed')
      .eq('date', todayStr);

    if (teleconsults && teleconsults.length > 0) {
      const mapped = teleconsults.map((apt: any) => ({
        id: apt.id,
        name: apt.patients?.name || 'রোগী',
        time: apt.time,
        reason: apt.reason || 'সাধারণ সমস্যা',
        waiting: Math.floor((now.getTime() - new Date(apt.created_at).getTime()) / 60000),
        teleconsult_link: apt.teleconsult_link,
      }));
      setWaitingPatients(mapped);
    }
    setLoading(false);
  }

  const startCall = async (patient: WaitingPatient) => {
    setCurrentPatient(patient);
    setInCall(true);
    
    const { data: apt } = await supabase
      .from('appointments')
      .select('patient_id, patients(name)')
      .eq('id', patient.id)
      .single();
    
    const meetingLink = patient.teleconsult_link || doctorData?.zoom_link || zoomLink;
    
    if (apt) {
      requestPushPermission();
      
      try {
        await sendNotification('teleconsult_ready_patient', {
          patientId: apt.patient_id,
        }, {
          doctorName: doctorData?.name,
        });
      } catch (e) {}
      
      if (meetingLink) {
        window.open(meetingLink, '_blank');
      }
    }
  };

  const endCall = async () => {
    if (currentPatient) {
      await supabase
        .from('appointments')
        .update({ status: 'completed' })
        .eq('id', currentPatient.id);
      
      toast.success('কল সম্পন্ন হয়েছে');
    }
    setInCall(false);
    setCurrentPatient(null);
    loadTeleconsults();
  };

  if (inCall && currentPatient) {
    return (
      <DashboardLayout role="doctor">
        <div className="space-y-6">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-gray-900">{currentPatient.name}</h2>
                <p className="text-sm text-gray-500">{currentPatient.reason}</p>
              </div>
              <div className="flex items-center gap-2 text-green-600">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                সক্রিয়
              </div>
            </div>
            <div className="aspect-video bg-gray-900 rounded-xl flex items-center justify-center mb-4">
              <div className="text-center text-white">
                <Video className="w-16 h-16 mx-auto mb-2 opacity-50" />
                <p>ভিডিও কল চলছে</p>
                {currentPatient.teleconsult_link && (
                  <a 
                    href={currentPatient.teleconsult_link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300"
                  >
                    <ExternalLink className="w-4 h-4" /> নতুন ট্যাবে খুলুন
                  </a>
                )}
              </div>
            </div>
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => setAudioOn(!audioOn)}
                className={`p-4 rounded-full ${audioOn ? 'bg-gray-100' : 'bg-red-100 text-red-600'}`}
              >
                {audioOn ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
              </button>
              <button
                onClick={() => setVideoOn(!videoOn)}
                className={`p-4 rounded-full ${videoOn ? 'bg-gray-100' : 'bg-red-100 text-red-600'}`}
              >
                {videoOn ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
              </button>
              {currentPatient.teleconsult_link && (
                <a 
                  href={currentPatient.teleconsult_link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-4 rounded-full bg-purple-100 text-purple-600"
                >
                  <ExternalLink className="w-6 h-6" />
                </a>
              )}
              <button
                onClick={endCall}
                className="p-4 rounded-full bg-red-500 text-white hover:bg-red-600"
              >
                <PhoneOff className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="doctor">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/doctor" className="p-2 hover:bg-slate-100 rounded-xl">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">টেলিকনসাল্ট</h1>
            <p className="text-gray-500">ভিডিও কলে রোগী দেখুন</p>
          </div>
        </div>

        {/* Zoom Link Settings */}
        <div className="card bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200">
          <div className="flex items-center gap-2 mb-3">
            <LinkIcon className="w-5 h-5 text-purple-600" />
            <h2 className="font-semibold text-gray-900">Zoom মিটিং সেটিংস</h2>
          </div>
          <p className="text-sm text-gray-600 mb-3">
            আপনার Zoom মিটিং লিংক সেট করুন। এই লিংক রোগীদের সাথে শেয়ার হবে।
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={zoomLink}
              onChange={(e) => setZoomLink(e.target.value)}
              placeholder="https://zoom.us/j/xxxxxxxxx"
              className="input flex-1"
            />
            <button
              onClick={saveZoomLink}
              disabled={savingZoom}
              className="btn-primary flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {savingZoom ? 'সেভ হচ্ছে...' : 'সেভ'}
            </button>
          </div>
        </div>

        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-purple-500" />
            অপেক্ষায় ({ waitingPatients.length })
          </h2>
          {loading ? (
            <div className="space-y-3">
              <div className="h-20 bg-slate-200 rounded-xl animate-pulse" />
              <div className="h-20 bg-slate-200 rounded-xl animate-pulse" />
            </div>
          ) : waitingPatients.length === 0 ? (
            <div className="text-center py-8">
              <Video className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p className="text-slate-500">আজ কোনো টেলিকনসাল্ট নেই</p>
            </div>
          ) : (
            <div className="space-y-3">
              {waitingPatients.map((patient) => (
                <div key={patient.id} className="flex items-center justify-between p-4 bg-purple-50 rounded-xl border border-purple-100">
                  <div>
                    <p className="font-semibold text-gray-900">{patient.name}</p>
                    <p className="text-sm text-gray-500">{patient.reason}</p>
                    <p className="text-xs text-purple-600 mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {patient.time}
                    </p>
                  </div>
                  <button
                    onClick={() => startCall(patient)}
                    className="btn-primary flex items-center gap-2"
                  >
                    <Video className="w-4 h-4" /> কল শুরু
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="font-semibold text-gray-900 mb-4">কিভাবে ব্যবহার করবেন</h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-600">
            <li>উপরের তালিকা থেকে রোগী নির্বাচন করুন</li>
            <li>"কল শুরু" বাটনে ট্যাপ করুন</li>
            <li>ভিডিও কল নতুন ট্যাবে খুলবে</li>
            <li>রোগীর সাথে কথা বলুন</li>
            <li>কল শেষে লাল বাটনে চাপুন</li>
          </ol>
        </div>
      </div>
    </DashboardLayout>
  );
}