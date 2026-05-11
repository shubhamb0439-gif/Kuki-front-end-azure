// Supabase compatibility layer - translates supabase-style queries to Azure API calls
const API_URL = import.meta.env.VITE_API_URL || 'https://kuki-api-prod.azurewebsites.net';

function getToken(): string | null {
  return localStorage.getItem('kuki_token');
}

export function setToken(token: string) {
  localStorage.setItem('kuki_token', token);
}

export function clearToken() {
  localStorage.removeItem('kuki_token');
}

// ─── Direct API helpers (for clean new code) ─────────────────────────────────
async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  isFormData = false
): Promise<{ data: T | null; error: string | null }> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!isFormData) headers['Content-Type'] = 'application/json';

  try {
    const res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: isFormData ? (body as FormData) : body ? JSON.stringify(body) : undefined,
    });

    if (res.status === 204) return { data: null, error: null };
    const json = await res.json();
    if (!res.ok) return { data: null, error: json.error || 'Request failed' };
    return { data: json as T, error: null };
  } catch (err: any) {
    return { data: null, error: err.message || 'Network error' };
  }
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────
export const auth = {
  async signUp(email: string, password: string, name: string, role: 'employer' | 'employee') {
    const { data, error } = await request<{ token: string; user: any }>('POST', '/auth/signup', { email, password, name, role });
    if (data?.token) setToken(data.token);
    return { data, error };
  },
  async signIn(emailOrPhone: string, password: string) {
    const { data, error } = await request<{ token: string; user: any }>('POST', '/auth/login', { emailOrPhone, password });
    if (data?.token) setToken(data.token);
    return { data, error };
  },
  async getSession() {
    const token = getToken();
    if (!token) return { data: { session: null } };
    const { data, error } = await request<{ user: any }>('GET', '/auth/me');
    if (error) return { data: { session: null } };
    return { data: { session: { user: data?.user } } };
  },
  async signOut() {
    await request('POST', '/auth/logout');
    clearToken();
  },
};

// ─── Named API exports ───────────────────────────────────────────────────────
export const profiles = {
  get: (id: string) => request<any>('GET', `/profiles/${id}`),
  update: (id: string, updates: Record<string, any>) => request<any>('PATCH', `/profiles/${id}`, updates),
  list: () => request<any[]>('GET', '/profiles'),
  toggleAds: (id: string, ads_enabled: boolean) => request<any>('PATCH', `/profiles/${id}/ads-toggle`, { ads_enabled }),
  uploadPhoto: (id: string, file: File) => {
    const formData = new FormData();
    formData.append('photo', file);
    return request<{ profile_photo: string }>('POST', `/profiles/${id}/photo`, formData, true);
  },
};

export const employees = {
  list: () => request<any[]>('GET', '/employees'),
  add: (data: Record<string, any>) => request<any>('POST', '/employees', data),
  update: (id: string, updates: Record<string, any>) => request<any>('PATCH', `/employees/${id}`, updates),
  remove: (id: string) => request<any>('DELETE', `/employees/${id}`),
};

export const attendance = {
  list: (params?: { employee_id?: string; from?: string; to?: string }) => {
    const qs = new URLSearchParams(params as any).toString();
    return request<any[]>('GET', `/attendance${qs ? '?' + qs : ''}`);
  },
  clockIn: (data: Record<string, any>) => request<any>('POST', '/attendance/clock-in', data),
  clockOut: (id: string) => request<any>('PATCH', `/attendance/${id}/clock-out`, {}),
  manualEntry: (data: Record<string, any>) => request<any>('POST', '/attendance/manual', data),
};

export const wages = {
  list: (employee_id?: string) => request<any[]>('GET', `/wages${employee_id ? '?employee_id=' + employee_id : ''}`),
  create: (data: Record<string, any>) => request<any>('POST', '/wages', data),
  update: (id: string, updates: Record<string, any>) => request<any>('PATCH', `/wages/${id}`, updates),
  loans: { list: () => request<any[]>('GET', '/wages/loans'), create: (data: Record<string, any>) => request<any>('POST', '/wages/loans', data) },
  bonuses: { list: () => request<any[]>('GET', '/wages/bonuses'), create: (data: Record<string, any>) => request<any>('POST', '/wages/bonuses', data) },
  statements: { list: () => request<any[]>('GET', '/wages/statements') },
};

export const messages = {
  list: () => request<any[]>('GET', '/messages'),
  send: (receiver_id: string, content: string) => request<any>('POST', '/messages', { receiver_id, content }),
  markRead: (id: string) => request<any>('PATCH', `/messages/${id}/read`, {}),
  jobs: {
    list: () => request<any[]>('GET', '/messages/jobs'),
    create: (data: Record<string, any>) => request<any>('POST', '/messages/jobs', data),
    apply: (job_id: string) => request<any>('POST', `/messages/jobs/${job_id}/apply`, {}),
  },
};

export const admin = {
  stats: () => request<any>('GET', '/admin/stats'),
  jobRoles: { list: () => request<any[]>('GET', '/admin/job-roles'), create: (data: Record<string, any>) => request<any>('POST', '/admin/job-roles', data), update: (id: string, data: Record<string, any>) => request<any>('PATCH', `/admin/job-roles/${id}`, data), delete: (id: string) => request<any>('DELETE', `/admin/job-roles/${id}`) },
  ads: { list: () => request<any[]>('GET', '/admin/ads'), create: (data: Record<string, any>) => request<any>('POST', '/admin/ads', data), update: (id: string, data: Record<string, any>) => request<any>('PATCH', `/admin/ads/${id}`, data), delete: (id: string) => request<any>('DELETE', `/admin/ads/${id}`), impressions: () => request<Record<string, number>>('GET', '/admin/ad-impressions'), recordView: (ad_id: string) => request<any>('POST', '/admin/ad-impressions', { ad_id }) },
  subscriptions: { list: () => request<any[]>('GET', '/admin/subscriptions'), approve: (id: string) => request<any>('PATCH', `/admin/subscriptions/${id}/approve`, {}) },
  loginLogs: () => request<any[]>('GET', '/admin/login-logs'),
};

// ─── Supabase Compatibility Layer ─────────────────────────────────────────────
// This mimics the supabase.from().select().eq() chain API
// so existing components work without rewriting every query
// All queries go through the Azure backend API

class QueryBuilder {
  private _table: string;
  private _filters: Record<string, any> = {};
  private _select: string = '*';
  private _order: { column: string; ascending: boolean } | null = null;
  private _limit: number | null = null;
  private _single: boolean = false;
  private _maybeSingle: boolean = false;
  private _head: boolean = false;
  private _count: string | null = null;
  private _upsertData: any = null;
  private _insertData: any = null;
  private _updateData: any = null;
  private _deleteMode: boolean = false;
  private _orFilter: string | null = null;
  private _gte: Record<string, any> = {};
  private _lte: Record<string, any> = {};
  private _neq: Record<string, any> = {};
  private _in: Record<string, any[]> = {};
  private _ilike: Record<string, string> = {};

  constructor(table: string) {
    this._table = table;
  }

  select(columns: string = '*', opts?: { count?: string; head?: boolean }) {
    this._select = columns;
    if (opts?.count) this._count = opts.count;
    if (opts?.head) this._head = true;
    return this;
  }

  eq(column: string, value: any) { this._filters[column] = value; return this; }
  neq(column: string, value: any) { this._neq[column] = value; return this; }
  gte(column: string, value: any) { this._gte[column] = value; return this; }
  lte(column: string, value: any) { this._lte[column] = value; return this; }
  in(column: string, values: any[]) { this._in[column] = values; return this; }
  ilike(column: string, value: string) { this._ilike[column] = value; return this; }
  or(filter: string) { this._orFilter = filter; return this; }
  
  order(column: string, opts?: { ascending?: boolean }) {
    this._order = { column, ascending: opts?.ascending ?? true };
    return this;
  }

  limit(n: number) { this._limit = n; return this; }
  single() { this._single = true; return this; }
  maybeSingle() { this._maybeSingle = true; return this; }

  insert(data: any) { this._insertData = data; return this; }
  update(data: any) { this._updateData = data; return this; }
  upsert(data: any) { this._upsertData = data; return this; }
  delete() { this._deleteMode = true; return this; }

  private buildQueryString(): string {
    const params = new URLSearchParams();
    Object.entries(this._filters).forEach(([k, v]) => params.append(`filter_${k}`, String(v)));
    Object.entries(this._gte).forEach(([k, v]) => params.append(`gte_${k}`, String(v)));
    Object.entries(this._lte).forEach(([k, v]) => params.append(`lte_${k}`, String(v)));
    Object.entries(this._neq).forEach(([k, v]) => params.append(`neq_${k}`, String(v)));
    Object.entries(this._in).forEach(([k, v]) => params.append(`in_${k}`, v.join(',')));
    Object.entries(this._ilike).forEach(([k, v]) => params.append(`ilike_${k}`, v));
    if (this._orFilter) params.append('or', this._orFilter);
    if (this._select !== '*') params.append('select', this._select);
    if (this._order) params.append('order', `${this._order.column}.${this._order.ascending ? 'asc' : 'desc'}`);
    if (this._limit) params.append('limit', String(this._limit));
    if (this._single || this._maybeSingle) params.append('single', 'true');
    if (this._head) params.append('head', 'true');
    if (this._count) params.append('count', this._count);
    const qs = params.toString();
    return qs ? `?${qs}` : '';
  }

  async then(resolve: (value: any) => void, reject?: (reason: any) => void) {
    try {
      const result = await this.execute();
      resolve(result);
    } catch (err) {
      if (reject) reject(err);
      else resolve({ data: null, error: err, count: null });
    }
  }

  private async execute(): Promise<any> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const path = `/query/${this._table}`;
    let method = 'GET';
    let body: any = undefined;

    if (this._insertData) {
      method = 'POST';
      body = JSON.stringify({ data: this._insertData, filters: this._filters });
    } else if (this._updateData) {
      method = 'PUT';
      body = JSON.stringify({ data: this._updateData, filters: this._filters, gte: this._gte, lte: this._lte });
    } else if (this._upsertData) {
      method = 'PUT';
      body = JSON.stringify({ data: this._upsertData, upsert: true, filters: this._filters });
    } else if (this._deleteMode) {
      method = 'DELETE';
      body = JSON.stringify({ filters: this._filters });
    }

    try {
      const url = method === 'GET' ? `${API_URL}${path}${this.buildQueryString()}` : `${API_URL}${path}`;
      const res = await fetch(url, { method, headers, body });
      const json = await res.json();

      if (!res.ok) {
        return { data: null, error: { message: json.error || 'Request failed' }, count: null };
      }

      let data = json.data ?? json;
      const count = json.count ?? (Array.isArray(data) ? data.length : null);

      if (this._head) {
        return { data: null, error: null, count };
      }
      if (this._single) {
        data = Array.isArray(data) ? data[0] || null : data;
        if (!data) return { data: null, error: { message: 'Row not found' }, count: 0 };
      }
      if (this._maybeSingle) {
        data = Array.isArray(data) ? data[0] || null : data;
      }

      return { data, error: null, count };
    } catch (err: any) {
      return { data: null, error: { message: err.message || 'Network error' }, count: null };
    }
  }
}

class RpcBuilder {
  private _name: string;
  private _params: any;

  constructor(name: string, params: any) {
    this._name = name;
    this._params = params;
  }

  async then(resolve: (value: any) => void, reject?: (reason: any) => void) {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const token = getToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_URL}/rpc/${this._name}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(this._params),
      });
      const json = await res.json();
      if (!res.ok) resolve({ data: null, error: { message: json.error || 'RPC failed' } });
      else resolve({ data: json.data ?? json, error: null });
    } catch (err: any) {
      resolve({ data: null, error: { message: err.message } });
    }
  }
}

class StorageBucketClient {
  private _bucket: string;

  constructor(bucket: string) {
    this._bucket = bucket;
  }

  async upload(path: string, file: File | Blob, opts?: any) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('path', path);
    formData.append('bucket', this._bucket);

    const headers: Record<string, string> = {};
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const res = await fetch(`${API_URL}/storage/upload`, { method: 'POST', headers, body: formData });
      const json = await res.json();
      if (!res.ok) return { data: null, error: { message: json.error || 'Upload failed' } };
      return { data: { path: json.path || path }, error: null };
    } catch (err: any) {
      return { data: null, error: { message: err.message } };
    }
  }

  getPublicUrl(path: string) {
    return { data: { publicUrl: `${API_URL}/storage/${this._bucket}/${path}` } };
  }
}

class StorageClient {
  from(bucket: string) {
    return new StorageBucketClient(bucket);
  }
}

class ChannelClient {
  on(_event: string, _config: any, _callback: any) { return this; }
  subscribe() { return this; }
}

// The supabase compatibility object
export const supabase = {
  from: (table: string) => new QueryBuilder(table),
  rpc: (name: string, params?: any) => new RpcBuilder(name, params),
  storage: new StorageClient(),
  channel: (_name: string) => new ChannelClient(),
  removeChannel: (_channel: any) => {},
  auth: {
    getUser: async () => {
      const session = await auth.getSession();
      return { data: { user: session.data.session?.user || null }, error: null };
    },
    getSession: async () => {
      const session = await auth.getSession();
      return { data: { session: session.data.session }, error: null };
    },
    signUp: async (opts: { email: string; password: string; options?: any }) => {
      const { data, error } = await auth.signUp(opts.email, opts.password, opts.options?.data?.full_name || 'User', 'employee');
      return { data: { user: data?.user || null }, error: error ? { message: error } : null };
    },
    signInWithPassword: async (opts: { email: string; password: string }) => {
      const { data, error } = await auth.signIn(opts.email, opts.password);
      return { data: { user: data?.user || null }, error: error ? { message: error } : null };
    },
    signOut: async (opts?: any) => {
      await auth.signOut();
      return { error: null };
    },
    onAuthStateChange: (callback: any) => {
      return { data: { subscription: { unsubscribe: () => {} } } };
    },
  },
};
