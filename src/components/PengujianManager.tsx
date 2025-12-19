import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, Trash2, Edit, ChevronLeft, ChevronRight, 
  Calendar, MapPin, Filter, FileText, CheckCircle, AlertTriangle,
  ArrowUp, ArrowDown, ShieldCheck 
} from 'lucide-react';
import { 
  getPengujianList, deletePengujianService, getKitchens, 
  type PengujianResult, type Kitchen, type UserProfile 
} from '../api';
import { Modal } from './Modal';

interface PengujianManagerProps {
  user: UserProfile | null;
  onEdit: (item: PengujianResult) => void; 
}

export const PengujianManager: React.FC<PengujianManagerProps> = ({ user, onEdit }) => {
  const [data, setData] = useState<PengujianResult[]>([]);
  const [kitchens, setKitchens] = useState<Kitchen[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const [search, setSearch] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterDapur, setFilterDapur] = useState('');

  const [sortConfig, setSortConfig] = useState<{ key: 'waktu' | 'status', direction: 'asc' | 'desc' }>({ 
      key: 'waktu', 
      direction: 'desc' 
  });

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [modalType, setModalType] = useState<'none' | 'delete'>('none');
  const [targetItem, setTargetItem] = useState<PengujianResult | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [pengujianRes, dapurRes] = await Promise.all([
        getPengujianList(),
        getKitchens()
      ]);
      setData(pengujianRes);
      setKitchens(dapurRes);
    } catch (error) {
      console.error("Gagal load data", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // --- LOGIC FILTER UTAMA ---
  const processedData = useMemo(() => {
    let result = data.filter(item => {
      // 1. Filter Search
      const matchSearch = 
        item.nama_sampel.toLowerCase().includes(search.toLowerCase()) || 
        item.parameter_uji.toLowerCase().includes(search.toLowerCase());
      
      const matchDate = filterDate ? item.tanggal === filterDate : true;

      // 2. Filter Dapur (Sesuai Role)
      let matchDapur = true;
      if (user?.role !== 'admin' && user?.dapur_id) {
         matchDapur = item.dapur_id === user.dapur_id; 
      } else if (filterDapur) {
         matchDapur = item.dapur_id === Number(filterDapur);
      }

      // 3. FILTER APPROVAL: HANYA TAMPIL JIKA SUDAH APPROVED OLEH SEMUA
      const isFullyApproved = 
          item.status_petugas === 'approved' && 
          item.status_chef === 'approved' && 
          item.status_kepala === 'approved';

      return matchSearch && matchDate && matchDapur && isFullyApproved;
    });

    // Sorting
    return result.sort((a, b) => {
        if (sortConfig.key === 'waktu') {
            const dateA = new Date(`${a.tanggal}T${a.jam}`);
            const dateB = new Date(`${b.tanggal}T${b.jam}`);
            return sortConfig.direction === 'asc' 
                ? dateA.getTime() - dateB.getTime() 
                : dateB.getTime() - dateA.getTime();
        } 
        else if (sortConfig.key === 'status') {
            const isBahayaA = a.hasil_interpretasi > (a.baku_mutu || 0);
            const isBahayaB = b.hasil_interpretasi > (b.baku_mutu || 0);
            const valA = isBahayaA ? 1 : 0;
            const valB = isBahayaB ? 1 : 0;
            return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
        }
        return 0;
    });

  }, [data, search, filterDate, filterDapur, user, sortConfig]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return processedData.slice(start, start + itemsPerPage);
  }, [processedData, currentPage]);

  const totalPages = Math.ceil(processedData.length / itemsPerPage);

  const handleSort = (key: 'waktu' | 'status') => {
      setSortConfig(current => ({
          key,
          direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc'
      }));
  };

  const handleDelete = async () => {
    if (!targetItem) return;
    try {
      await deletePengujianService(targetItem.id);
      await loadData();
      setModalType('none');
    } catch (error) {
      alert("Gagal menghapus data");
    }
  };

  const getDapurName = (id: number) => {
    const k = kitchens.find(k => k.id === id);
    return k ? `${k.nama_dapur} (${k.nomor_dapur})` : 'Dapur Tidak Diketahui';
  };

  const renderSortIcon = (columnKey: 'waktu' | 'status') => {
      if (sortConfig.key !== columnKey) return <ArrowUp size={14} className="text-gray-300 opacity-0 group-hover:opacity-50"/>;
      return sortConfig.direction === 'asc' ? <ArrowUp size={14} className="text-blue-600"/> : <ArrowDown size={14} className="text-blue-600"/>;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6 animate-in fade-in max-w-full">
      
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           {user?.role !== 'admin' ? (
              <div className="space-y-1">
                 <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <FileText className="text-blue-600"/> Laporan Hasil Pengujian
                 </h2>
                 <p className="text-sm text-gray-500 font-medium">
                    Unit: <span className="text-blue-600 font-bold">{user?.dapur?.nama_dapur || 'Dapur Anda'}</span>
                 </p>
              </div>
           ) : (
              <h2 className="text-xl font-bold text-gray-800">Manajemen Data Pengujian</h2>
           )}
           <p className="text-xs text-green-600 mt-1 flex items-center gap-1 font-bold bg-green-50 px-2 py-1 rounded inline-block">
                <ShieldCheck size={12}/> Data Terverifikasi Organisasi
           </p>
        </div>
        
        <div className="text-sm text-gray-500">
           Total Data Valid: <span className="font-bold text-gray-800">{processedData.length}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg border border-gray-100">
          <div className="md:col-span-1 relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
             <input type="text" placeholder="Cari sampel..." className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg outline-none" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="md:col-span-1 relative">
             <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
             <input type="date" className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg outline-none" value={filterDate} onChange={e => setFilterDate(e.target.value)} />
          </div>
          {/* Admin bisa filter dapur */}
          {user?.role === 'admin' && (
            <div className="md:col-span-1 relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <select className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg outline-none bg-white" value={filterDapur} onChange={e => setFilterDapur(e.target.value)}>
                    <option value="">Semua Dapur</option>
                    {kitchens.map(k => (<option key={k.id} value={k.id}>{k.nama_dapur}</option>))}
                </select>
            </div>
          )}
          <div className="md:col-span-1 flex items-center">
             <button onClick={() => { setSearch(''); setFilterDate(''); setFilterDapur(''); }} className="text-sm text-gray-500 hover:text-red-500 flex items-center gap-1 cursor-pointer">
                <Filter size={14}/> Reset Filter
             </button>
          </div>
      </div>

      <div className="w-full overflow-hidden border border-gray-200 rounded-lg mb-4">
        <div className="w-full overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-gray-50 border-b text-gray-600 font-bold uppercase text-xs">
                <tr>
                <th className="p-4 text-center w-12">No</th>
                <th className="p-4">Parameter</th>
                <th className="p-4 cursor-pointer hover:bg-gray-100 transition-colors select-none group" onClick={() => handleSort('waktu')} title="Urutkan Waktu">
                    <div className="flex items-center gap-1">Waktu {renderSortIcon('waktu')}</div>
                </th>
                <th className="p-4">Nama Sampel</th>
                <th className="p-4 text-center">Baku Mutu (mg/L)</th>
                <th className="p-4 text-center">Hasil (mg/L)</th>
                <th className="p-4 text-center cursor-pointer hover:bg-gray-100 transition-colors select-none group" onClick={() => handleSort('status')} title="Urutkan Status">
                    <div className="flex items-center justify-center gap-1">Status {renderSortIcon('status')}</div>
                </th>
                {user?.role === 'admin' && <th className="p-4">Lokasi Dapur</th>}
                <th className="p-4 text-center">Aksi</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
                {isLoading ? (<tr><td colSpan={9} className="p-8 text-center text-gray-400">Memuat data...</td></tr>) : 
                paginatedData.length === 0 ? (<tr><td colSpan={9} className="p-8 text-center text-gray-400">Belum ada data yang disetujui penuh.</td></tr>) : 
                paginatedData.map((item, index) => {
                    const threshold = item.baku_mutu === 0 ? 0 : item.baku_mutu;
                    const isBahaya = item.hasil_interpretasi > threshold;
                    return (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-4 text-center text-gray-500">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                        <td className="p-4 font-bold text-gray-700"><span className="px-2 py-1 bg-gray-100 rounded text-xs border border-gray-200">{item.parameter_uji}</span></td>
                        <td className="p-4 text-gray-600"><div className="font-medium">{item.tanggal}</div><div className="text-xs text-gray-400">{item.jam}</div></td>
                        <td className="p-4 font-medium text-blue-900">{item.nama_sampel}</td>
                        <td className="p-4 text-center text-gray-500">{item.baku_mutu}</td>
                        <td className="p-4 text-center"><span className="font-mono font-bold text-gray-700">{item.hasil_interpretasi}</span></td>
                        <td className="p-4 text-center">
                            {isBahaya ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">
                                    <AlertTriangle size={12} className="fill-red-700 text-red-100"/> POSITIF
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200">
                                    <CheckCircle size={12} className="fill-green-700 text-green-100"/> NEGATIF
                                </span>
                            )}
                        </td>
                        {user?.role === 'admin' && (<td className="p-4 text-xs text-gray-500">{getDapurName(item.dapur_id)}</td>)}
                        <td className="p-4 flex justify-center gap-2">
                            {/* Tombol Edit Dihilangkan karena data final tidak boleh diubah user biasa */}
                            {user?.role === 'admin' && (
                                <button onClick={() => { setTargetItem(item); setModalType('delete'); }} className="p-2 text-red-600 hover:bg-red-50 rounded cursor-pointer" title="Hapus"><Trash2 size={16}/></button>
                            )}
                        </td>
                    </tr>
                    );
                })}
            </tbody>
            </table>
        </div>
      </div>

      <div className="flex justify-between items-center text-sm text-gray-500">
            <span>Halaman {currentPage} dari {totalPages}</span>
            <div className="flex gap-1">
                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1 border rounded disabled:opacity-50 hover:bg-gray-50 cursor-pointer"><ChevronLeft size={16}/></button>
                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-1 border rounded disabled:opacity-50 hover:bg-gray-50 cursor-pointer"><ChevronRight size={16}/></button>
            </div>
      </div>

      <Modal isOpen={modalType === 'delete'} onClose={() => setModalType('none')} title="Hapus Data Final" variant="danger">
         <p>Menghapus data ini bersifat permanen. Lanjutkan?</p>
         <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setModalType('none')} className="px-4 py-2 bg-gray-100 rounded cursor-pointer">Batal</button>
            <button onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white rounded cursor-pointer">Ya, Hapus</button>
         </div>
      </Modal>
    </div>
  );
};