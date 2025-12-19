import axios from 'axios';

// Sesuaikan URL backend Anda
const API_URL = 'http://192.168.10.172:8000';

// --- TYPE DEFINITIONS ---

export type UserRoleType = 'admin' | 'petugas_monitoring' | 'kepala_dapur' | 'kepala_chef';

export interface Kitchen {
  id: number;
  nama_dapur: string;
  nomor_dapur: string;
  lokasi: string;
}

export interface UserProfile {
  id: number;
  email: string;
  full_name: string;
  role: UserRoleType;
  is_active: boolean;
  dapur_id: number | null;
  dapur?: Kitchen;
}

export interface UserPayload {
  email: string;
  full_name: string;
  password?: string;
  role: string;
  dapur_id?: number | null;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface ScanResult {
  status: string;
  info_zat: string;
  deteksi_warna: {
    H: number;
    S: number;
    V: number;
  };
  hasil_analisa: {
    label: string;
    estimasi_ppm: number | string;
    bahaya: boolean;
    kemiripan_jarak: number;
  };
}

export interface PengujianResult {
  id: number;
  parameter_uji: string;
  tanggal: string;
  jam: string;
  nama_sampel: string;
  baku_mutu: number;
  hasil_interpretasi: number;
  user_id: number;
  dapur_id: number;
  
  // Update Field Baru
  nama_petugas: string; // Nama penginput
  nama_dapur: string;   // Nama dapur (untuk admin)
  
  status_petugas: 'pending' | 'approved' | 'rejected';
  status_chef: 'pending' | 'approved' | 'rejected';
  status_kepala: 'pending' | 'approved' | 'rejected';
  
  approved_by?: string;
  catatan?: string;
}

export interface Kitchen {
  id: number;
  nama_dapur: string;
  nomor_dapur: string;
  lokasi: string;
  // [BARU] Properti Detail (Optional karena tidak selalu ada di list biasa)
  kepala_dapur_nama?: string;
  kepala_chef_nama?: string;
  petugas_monitoring_names?: string[];
}
// --- AXIOS INSTANCE ---

export const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// --- API SERVICE FUNCTIONS ---

// 1. AUTH & USER PROFILE
export const loginService = async (username: string, password: string) => {
  const formData = new FormData();
  formData.append('username', username);
  formData.append('password', password);
  return (await api.post<LoginResponse>('/login', formData)).data;
};

export const fetchUserProfile = async () => (await api.get<UserProfile>('/users/me')).data;

// 2. MANAJEMEN DAPUR (KITCHEN)
export const getKitchens = async () => (await api.get<Kitchen[]>('/dapurs/')).data;
export const createKitchen = async (data: any) => (await api.post<Kitchen>('/dapurs/', data)).data;
export const updateKitchen = async (id: number, data: any) => (await api.put<Kitchen>(`/dapurs/${id}`, data)).data;
export const deleteKitchen = async (id: number) => (await api.delete(`/dapurs/${id}`)).data;

// 3. MANAJEMEN USER
export const getUsers = async () => (await api.get<UserProfile[]>('/users/')).data;
export const createUser = async (data: UserPayload) => (await api.post<UserProfile>('/users/', data)).data;
export const updateUser = async (id: number, data: Partial<UserPayload>) => (await api.put<UserProfile>(`/users/${id}`, data)).data;
export const deleteUser = async (id: number) => (await api.delete(`/users/${id}`)).data;

// 4. DATA PENGUJIAN
export const getPengujianList = async () => (await api.get<PengujianResult[]>('/pengujian/')).data;

export const savePengujianService = async (data: any) => (await api.post('/pengujian/', data)).data;

export const updatePengujianService = async (id: number, nama_sampel: string) => 
  (await api.put(`/pengujian/${id}`, { nama_sampel })).data;

export const deletePengujianService = async (id: number) => (await api.delete(`/pengujian/${id}`)).data;

// 5. APPROVAL SERVICE (INI YANG SEBELUMNYA HILANG)
export const updateApprovalService = async (id: number, status: 'approved' | 'rejected') => {
  const response = await api.put(`/pengujian/${id}/approval`, { status });
  return response.data;
};

// 6. SCANNER SERVICE
export const scanImageService = async (file: Blob, jenisPengujian: string) => {
  const formData = new FormData();
  formData.append('file', file, 'scan.jpg');
  formData.append('jenis_pengujian', jenisPengujian);
  const response = await api.post<ScanResult>('/scan', formData);
  return response.data;
};

export const getKitchenDetail = async (id: number) => {
  const response = await api.get<Kitchen>(`/dapurs/${id}/detail`);
  return response.data;
};