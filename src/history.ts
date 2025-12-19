// src/history.ts

export interface ActivityLog {
  id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  module: 'DAPUR' | 'USER';
  description: string;
  timestamp: string;
}

const STORAGE_KEY = 'mbg_activity_logs';
const MAX_LOGS = 5; // <--- UBAH DISINI JADI 5 (Sebelumnya 50)

export const getLogs = (): ActivityLog[] => {
  const logs = localStorage.getItem(STORAGE_KEY);
  return logs ? JSON.parse(logs) : [];
};

export const addLog = (action: 'CREATE' | 'UPDATE' | 'DELETE', module: 'DAPUR' | 'USER', description: string) => {
  const newLog: ActivityLog = {
    id: Date.now().toString(),
    action,
    module,
    description,
    timestamp: new Date().toISOString(),
  };

  const currentLogs = getLogs();
  
  // Logika otomatis: Masukkan yang baru, lalu potong sisanya agar tetap 5
  const updatedLogs = [newLog, ...currentLogs].slice(0, MAX_LOGS);
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedLogs));
  return newLog;
};