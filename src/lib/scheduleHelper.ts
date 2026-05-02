// Helper function to check if a date matches a schedule's rule
export const isScheduleActiveOnDate = (
  schedule: any,
  checkDate: string // format: YYYY-MM-DD
): boolean => {
  if (!schedule || !checkDate) return false;

  // Check if date is within range
  const startDate = schedule.start_date;
  const endDate = schedule.end_date;

  if (startDate && checkDate < startDate) return false;
  if (endDate && checkDate > endDate) return false;

  // Check if the weekday is in selected_days
  const date = new Date(checkDate);
  const dayOfWeek = date.getDay(); // 0=Sunday, 6=Saturday
  
  const dayMapping: { [key: number]: string } = {
    0: 'রবিবার',
    1: 'সোমবার',
    2: 'মঙ্গলবার',
    3: 'বুধবার',
    4: 'বৃহস্পতিবার',
    5: 'শুক্রবার',
    6: 'শনিবার',
  };

  const dayName = dayMapping[dayOfWeek];
  return schedule.selected_days?.includes(dayName) || false;
};

// Helper to get active schedules for a doctor on a specific date
export const getSchedulesForDoctor = async (
  supabase: any,
  doctorId: string,
  date: string
): Promise<any[]> => {
  const { data, error } = await supabase
    .from('schedules')
    .select('*')
    .eq('doctor_id', doctorId)
    .lte('start_date', date) // start_date <= date
    .or(`end_date.is.null,end_date.gte.${date}`) // end_date >= date OR end_date is null
    .in('status', ['active', 'pending', 'confirmed']);

  if (error) {
    console.error('Error fetching schedules:', error);
    return [];
  }

  // Filter by weekday
  return (data || []).filter((schedule: any) => 
    isScheduleActiveOnDate(schedule, date)
  );
};
