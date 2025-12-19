import React, { useMemo } from 'react';
import { 
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid 
} from 'recharts';
import { type PengujianResult } from '../api';

interface DashboardChartsProps {
  data: PengujianResult[];
}

export const DashboardCharts: React.FC<DashboardChartsProps> = ({ data }) => {
  
  // 1. DATA PIE CHART: Hitung Total Aman vs Bahaya
  const pieData = useMemo(() => {
    let aman = 0;
    let bahaya = 0;

    data.forEach(item => {
      const threshold = item.baku_mutu === 0 ? 0 : item.baku_mutu;
      if (item.hasil_interpretasi > threshold) bahaya++;
      else aman++;
    });

    return [
      { name: 'Aman (Negatif)', value: aman, color: '#10B981' }, // Emerald-500
      { name: 'Bahaya (Positif)', value: bahaya, color: '#EF4444' }, // Red-500
    ];
  }, [data]);

  // 2. DATA BAR CHART: Grouping per Tanggal (7 Hari Terakhir)
  const barData = useMemo(() => {
    const last7Days = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toISOString().split('T')[0]; // YYYY-MM-DD
    }).reverse();

    return last7Days.map(date => {
      // Filter data pada tanggal tersebut
      const dailyData = data.filter(item => item.tanggal === date);
      
      let aman = 0;
      let bahaya = 0;

      dailyData.forEach(item => {
        const threshold = item.baku_mutu === 0 ? 0 : item.baku_mutu;
        if (item.hasil_interpretasi > threshold) bahaya++;
        else aman++;
      });

      // Format tanggal ke DD/MM biar pendek
      const shortDate = new Date(date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });

      return {
        date: shortDate,
        Aman: aman,
        Bahaya: bahaya
      };
    });
  }, [data]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      
      {/* GRAFIK 1: BAR CHART (TREN HARIAN) */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Tren Pengujian (7 Hari Terakhir)</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 12}} />
              <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12}} allowDecimals={false} />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                cursor={{ fill: '#F3F4F6' }}
              />
              <Legend wrapperStyle={{ paddingTop: '10px' }}/>
              <Bar dataKey="Aman" fill="#10B981" radius={[4, 4, 0, 0]} stackId="a" barSize={30} />
              <Bar dataKey="Bahaya" fill="#EF4444" radius={[4, 4, 0, 0]} stackId="a" barSize={30} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* GRAFIK 2: PIE CHART (PERSENTASE KUALITAS) */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Distribusi Kualitas Sampel</h3>
        <div className="h-64 w-full relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                ))}
              </Pie>
              <Tooltip />
              <Legend verticalAlign="bottom" height={36}/>
            </PieChart>
          </ResponsiveContainer>
          
          {/* Label Tengah Donat */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none pb-8">
             <span className="text-3xl font-bold text-gray-800">{data.length}</span>
             <p className="text-xs text-gray-500">Total Uji</p>
          </div>
        </div>
      </div>

    </div>
  );
};