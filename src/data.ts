// src/data.ts

export interface Kitchen {
  id: string;
  noId: string;
  name: string;
  head: string;
  location: string;
}

export interface UserData {
  id: number;
  name: string;
  email: string;
  role: string;
  password?: string;
  isHeadKitchen: boolean;
  assignedKitchenId?: string; // ID Dapur jika dia kepala
}

// Generate 20 Dummy Kitchens
export const DUMMY_KITCHENS: Kitchen[] = Array.from({ length: 20 }, (_, i) => ({
  id: `k-${i + 1}`,
  noId: `DPR-${(i + 1).toString().padStart(3, '0')}`,
  name: `Dapur Sehat ${String.fromCharCode(65 + (i % 5))} Cabang ${i + 1}`,
  head: `Chef Budi Ke-${i + 1}`,
  location: i % 2 === 0 ? "Jakarta Pusat" : "Jakarta Selatan",
}));

// Generate 20 Dummy Users
export const DUMMY_USERS: UserData[] = Array.from({ length: 20 }, (_, i) => ({
  id: i + 1,
  name: `User Pegawai ${i + 1}`,
  email: `user${i + 1}@mbg.com`,
  role: i === 0 ? "admin" : "user",
  isHeadKitchen: i % 5 === 0, // Setiap kelipatan 5 adalah kepala dapur
  assignedKitchenId: i % 5 === 0 ? `k-${(i % 5) + 1}` : undefined
}));