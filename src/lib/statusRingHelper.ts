// supabase removed - using api.ts
import { supabase } from './supabase';

/**
 * Calculate the dynamic status ring for a profile based on job posting activity
 *
 * Rules:
 * 1. Employer viewing own profile: Green if they have active job postings
 * 2. Employee viewing employer: Red if employer has job posting matching employee's profession
 * 3. Employer viewing employee: Green if employee has recent job applications
 */

interface StatusRingResult {
  showRing: boolean;
  color: string;
  text: string;
}

/**
 * Get status ring for employer's own profile
 */
export async function getEmployerOwnStatus(employerId: string): Promise<StatusRingResult> {
  const { data: jobPostings } = await supabase
    .from('job_postings')
    .select('id')
    .eq('employer_id', employerId)
    .eq('status', 'active')
    .limit(1);

  if (jobPostings && jobPostings.length > 0) {
    return {
      showRing: true,
      color: '#16a34a', // Green
      text: 'Hiring'
    };
  }

  return {
    showRing: false,
    color: '',
    text: ''
  };
}

/**
 * Get status ring when employee views an employer
 * Returns red if employer is looking for replacement in employee's profession
 * Returns no ring (neutral) if employer has job postings for other roles
 */
export async function getEmployerStatusForEmployee(
  employerId: string,
  employeeProfession: string
): Promise<StatusRingResult> {
  const { data: jobPostings } = await supabase
    .from('job_postings')
    .select('id, profession')
    .eq('employer_id', employerId)
    .eq('profession', employeeProfession)
    .eq('status', 'active')
    .limit(1);

  if (jobPostings && jobPostings.length > 0) {
    return {
      showRing: true,
      color: '#dc2626', // Red
      text: 'Seeking Replacement'
    };
  }

  // For any other job postings, show no status ring (neutral)
  return {
    showRing: false,
    color: '',
    text: ''
  };
}

/**
 * Get status ring for employee's own profile
 * Returns GREEN ring if employee has applied to any ACTIVE jobs OR posted job requests
 */
export async function getEmployeeOwnStatus(employeeUserId: string): Promise<StatusRingResult> {
  // Check if employee has applied to any ACTIVE jobs
  const { data: applications } = await supabase
    .from('job_applications')
    .select('id, job_postings!inner(status)')
    .eq('applicant_id', employeeUserId)
    .eq('job_postings.status', 'active')
    .limit(1);

  if (applications && applications.length > 0) {
    return {
      showRing: true,
      color: '#16a34a', // Green
      text: 'Job Seeking'
    };
  }

  // Check if employee has posted any job requests (as employer_id in job_postings)
  const { data: jobPosts } = await supabase
    .from('job_postings')
    .select('id')
    .eq('employer_id', employeeUserId)
    .eq('status', 'active')
    .limit(1);

  if (jobPosts && jobPosts.length > 0) {
    return {
      showRing: true,
      color: '#16a34a', // Green
      text: 'Seeking Work'
    };
  }

  return {
    showRing: false,
    color: '',
    text: ''
  };
}

/**
 * Get status ring when employer views an employee
 * Returns RED if employee has recent job applications to ACTIVE jobs OR has posted job requests (and already has a job)
 */
export async function getEmployeeStatusForEmployer(employeeUserId: string): Promise<StatusRingResult> {
  // Check if employee has applied to any ACTIVE jobs in the last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: applications } = await supabase
    .from('job_applications')
    .select('id, job_postings!inner(status)')
    .eq('applicant_id', employeeUserId)
    .eq('job_postings.status', 'active')
    .gte('created_at', thirtyDaysAgo.toISOString())
    .limit(1);

  if (applications && applications.length > 0) {
    return {
      showRing: true,
      color: '#dc2626', // Red - employee is looking for other opportunities
      text: 'Job Seeking'
    };
  }

  // Check if employee has posted any job requests (as employer_id in job_postings)
  const { data: jobPosts } = await supabase
    .from('job_postings')
    .select('id')
    .eq('employer_id', employeeUserId)
    .eq('status', 'active')
    .limit(1);

  if (jobPosts && jobPosts.length > 0) {
    return {
      showRing: true,
      color: '#dc2626', // Red - employee is seeking work
      text: 'Seeking Work'
    };
  }

  return {
    showRing: false,
    color: '',
    text: ''
  };
}

/**
 * Batch version: Get status rings for multiple employees at once
 * Much more efficient than calling getEmployeeStatusForEmployer repeatedly
 */
export async function getBatchEmployeeStatusForEmployer(
  employeeUserIds: string[]
): Promise<Record<string, StatusRingResult>> {
  if (employeeUserIds.length === 0) {
    return {};
  }

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Batch query for all job applications
  const { data: applications } = await supabase
    .from('job_applications')
    .select('applicant_id, job_postings!inner(status)')
    .in('applicant_id', employeeUserIds)
    .eq('job_postings.status', 'active')
    .gte('created_at', thirtyDaysAgo.toISOString());

  // Batch query for all job postings by employees
  const { data: jobPosts } = await supabase
    .from('job_postings')
    .select('employer_id')
    .in('employer_id', employeeUserIds)
    .eq('status', 'active');

  // Build result map
  const results: Record<string, StatusRingResult> = {};

  // Track which employees have applications
  const employeesWithApplications = new Set(
    applications?.map(app => app.applicant_id) || []
  );

  // Track which employees have job postings
  const employeesWithJobPosts = new Set(
    jobPosts?.map(post => post.employer_id) || []
  );

  // Build status for each employee
  employeeUserIds.forEach(userId => {
    if (employeesWithApplications.has(userId)) {
      results[userId] = {
        showRing: true,
        color: '#dc2626',
        text: 'Job Seeking'
      };
    } else if (employeesWithJobPosts.has(userId)) {
      results[userId] = {
        showRing: true,
        color: '#dc2626',
        text: 'Seeking Work'
      };
    } else {
      results[userId] = {
        showRing: false,
        color: '',
        text: ''
      };
    }
  });

  return results;
}
