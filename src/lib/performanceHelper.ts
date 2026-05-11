// supabase removed - using api.ts

export async function getEmployeeAverageRating(employeeId: string): Promise<number> {
  const { data, error } = await supabase
    .from('performance_ratings')
    .select('rating')
    .eq('employee_id', employeeId);

  if (error || !data || data.length === 0) {
    return 0;
  }

  const total = data.reduce((sum, record) => sum + record.rating, 0);
  const average = total / data.length;

  return Math.round(average * 10) / 10;
}

export async function getEmployeeMonthlyRating(employeeId: string, year: number, month: number): Promise<number> {
  const startDateObj = new Date(year, month - 1, 1);
  const endDateObj = new Date(year, month, 0);
  const startDate = `${startDateObj.getFullYear()}-${String(startDateObj.getMonth() + 1).padStart(2, '0')}-${String(startDateObj.getDate()).padStart(2, '0')}`;
  const endDate = `${endDateObj.getFullYear()}-${String(endDateObj.getMonth() + 1).padStart(2, '0')}-${String(endDateObj.getDate()).padStart(2, '0')}`;

  const { data, error } = await supabase
    .from('performance_ratings')
    .select('rating')
    .eq('employee_id', employeeId)
    .gte('rating_date', startDate)
    .lte('rating_date', endDate);

  if (error || !data || data.length === 0) {
    return 0;
  }

  const total = data.reduce((sum, record) => sum + record.rating, 0);
  const average = total / data.length;

  return Math.round(average * 10) / 10;
}
