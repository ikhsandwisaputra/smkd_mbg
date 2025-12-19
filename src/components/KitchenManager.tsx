import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, Edit, Search, ChevronLeft, ChevronRight, Save, ArrowLeft, RefreshCw } from 'lucide-react';
import { type Kitchen, getKitchens, createKitchen, updateKitchen, deleteKitchen } from '../api';
import { Modal } from './Modal';
import { addLog } from '../history';

export const KitchenManager: React.FC = () => {
  const [view, setView] = useState<'list' | 'form'>('list');
  const [data, setData] = useState<Kitchen[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [formData, setFormData] = useState<Partial<Kitchen>>({});
  const [isEditMode, setIsEditMode] = useState(false);
  const [modalType, setModalType] = useState<'none' | 'delete'>('none');
  const [targetItem, setTargetItem] = useState<Kitchen | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
        const result = await getKitchens();
        setData(result);
    } catch (error) {
        console.error("Gagal ambil data dapur:", error);
    } finally {
        setIsLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
        if (isEditMode && formData.id) {
            await updateKitchen(formData.id, {
                nama_dapur: formData.nama_dapur!,
                nomor_dapur: formData.nomor_dapur!,
                lokasi: formData.lokasi!
            });
            addLog('UPDATE', 'DAPUR', `Mengubah data dapur: ${formData.nama_dapur}`);
        } else {
            await createKitchen({
                nama_dapur: formData.nama_dapur!,
                nomor_dapur: formData.nomor_dapur!,
                lokasi: formData.lokasi!
            });
            addLog('CREATE', 'DAPUR', `Menambahkan dapur baru: ${formData.nama_dapur}`);
        }
        await loadData();
        setView('list');
    } catch (error) {
        alert("Gagal menyimpan data");
    }
  };

  const handleDelete = async () => {
    if (targetItem) {
        try {
            await deleteKitchen(targetItem.id);
            addLog('DELETE', 'DAPUR', `Menghapus dapur: ${targetItem.nama_dapur}`);
            await loadData();
            setModalType('none');
        } catch (error) {
            alert("Gagal menghapus data");
        }
    }
  };

  const openCreate = () => { setFormData({ nama_dapur: '', nomor_dapur: '', lokasi: '' }); setIsEditMode(false); setView('form'); };
  const openEdit = (item: Kitchen) => { setFormData(item); setIsEditMode(true); setView('form'); };

  const filteredData = useMemo(() => {
    return data.filter(item => item.nama_dapur.toLowerCase().includes(search.toLowerCase()) || item.nomor_dapur.toLowerCase().includes(search.toLowerCase()));
  }, [data, search]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage]);
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6 animate-in fade-in max-w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h2 className="text-xl font-bold text-gray-800">
          {view === 'list' ? 'Daftar Dapur' : (isEditMode ? 'Edit Dapur' : 'Tambah Dapur')}
        </h2>
        {view === 'list' && (
            <div className="flex gap-2 w-full md:w-auto">
                <button onClick={loadData} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg cursor-pointer"><RefreshCw size={18}/></button>
                <button onClick={openCreate} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex gap-2 items-center flex-1 md:flex-none justify-center cursor-pointer"><Plus size={16}/> Tambah</button>
            </div>
        )}
        {view === 'form' && <button onClick={() => setView('list')} className="text-gray-500 flex gap-2 cursor-pointer"><ArrowLeft size={16}/> Kembali</button>}
      </div>

      {view === 'list' ? (
        <>
            <div className="mb-4 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input type="text" placeholder="Cari dapur..." className="w-full pl-10 pr-4 py-2 border rounded-lg" value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            {/* --- FIX RESPONSIVE TABLE --- */}
            <div className="w-full overflow-hidden rounded-lg">
                <div className="w-full overflow-x-auto">
                    <table className="w-full text-sm text-left whitespace-nowrap">
                        <thead className="bg-gray-100 border-b">
                            <tr>
                                <th className="p-4 w-16 text-center">No</th>
                                <th className="p-4">No ID</th>
                                <th className="p-4">Nama Dapur</th>
                                <th className="p-4">Lokasi</th>
                                <th className="p-4 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (<tr><td colSpan={5} className="p-8 text-center text-gray-500">Memuat data...</td></tr>) : 
                            paginatedData.map((item, index) => (
                                <tr key={item.id} className="hover:bg-gray-50">
                                    <td className="p-4 text-center text-gray-500">{(currentPage - 1) * itemsPerPage + index + 1}</td>
                                    <td className="p-4 font-mono text-blue-600">{item.nomor_dapur}</td>
                                    <td className="p-4 font-medium">{item.nama_dapur}</td>
                                    <td className="p-4 text-gray-500">{item.lokasi}</td>
                                    <td className="p-4 flex justify-center gap-2">
                                        <button onClick={() => openEdit(item)} className="p-2 text-yellow-600 hover:bg-yellow-50 rounded cursor-pointer"><Edit size={16}/></button>
                                        <button onClick={() => { setTargetItem(item); setModalType('delete'); }} className="p-2 text-red-600 hover:bg-red-50 rounded cursor-pointer"><Trash2 size={16}/></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            
             <div className="flex justify-between items-center mt-4 text-sm text-gray-500">
                <span>Total {filteredData.length} Data</span>
                <div className="flex gap-1">
                     <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1 border rounded disabled:opacity-50 cursor-pointer"><ChevronLeft size={16}/></button>
                     <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-1 border rounded disabled:opacity-50 cursor-pointer"><ChevronRight size={16}/></button>
                </div>
            </div>
        </>
      ) : (
        <form onSubmit={handleSave} className="max-w-xl mx-auto space-y-4">
             {/* Form Input Dapur (Sama seperti sebelumnya) */}
             <div>
                <label className="block text-sm font-medium mb-1">Nomor ID Dapur</label>
                <input required type="text" className="w-full p-2 border rounded-lg" value={formData.nomor_dapur || ''} onChange={e => setFormData({...formData, nomor_dapur: e.target.value})} />
            </div>
            <div>
                <label className="block text-sm font-medium mb-1">Nama Dapur</label>
                <input required type="text" className="w-full p-2 border rounded-lg" value={formData.nama_dapur || ''} onChange={e => setFormData({...formData, nama_dapur: e.target.value})} />
            </div>
            <div>
                <label className="block text-sm font-medium mb-1">Lokasi</label>
                <input required type="text" className="w-full p-2 border rounded-lg" value={formData.lokasi || ''} onChange={e => setFormData({...formData, lokasi: e.target.value})} />
            </div>
            <div className="flex justify-end pt-4">
                <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex gap-2 cursor-pointer"><Save size={16}/> Simpan</button>
            </div>
        </form>
      )}

      <Modal isOpen={modalType === 'delete'} onClose={() => setModalType('none')} title="Hapus Dapur" variant="danger">
        <p>Yakin ingin menghapus dapur <b>{targetItem?.nama_dapur}</b>?</p>
        <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setModalType('none')} className="px-4 py-2 bg-gray-100 rounded cursor-pointer">Batal</button>
            <button onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white rounded cursor-pointer">Hapus</button>
        </div>
      </Modal>
    </div>
  );
};