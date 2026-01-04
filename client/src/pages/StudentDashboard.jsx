import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export default function StudentDashboard() {
    const [data, setData] = useState(null);
    const { logout } = useAuth();

    useEffect(() => {
        axios.get('http://localhost:3000/api/dashboard/student')
            .then(res => setData(res.data))
            .catch(err => console.error(err));
    }, []);

    if (!data) return <div className="p-8 text-white">Loading...</div>;

    return (
        <div className="min-h-screen bg-[#0f172a] p-8">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-10">
                    <div>
                        <h1 className="text-4xl font-bold text-white mb-2">Student Dashboard</h1>
                        <p className="text-slate-400">{data.user.name} | {data.class.department.name} - Year {data.class.year} - {data.class.section}</p>
                    </div>
                    <button onClick={logout} className="bg-slate-800 text-white px-6 py-2 rounded-lg hover:bg-slate-700 transition">Logout</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {data.noDueRecords.map(record => (
                        <div key={record.id} className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-xl">
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="text-xl font-semibold text-white">{record.subject.name}</h3>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${record.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400' :
                                        record.status === 'PENDING' ? 'bg-amber-500/10 text-amber-400' : 'bg-rose-500/10 text-rose-400'
                                    }`}>
                                    {record.status}
                                </span>
                            </div>
                            <p className="text-slate-400 text-sm">Type: {record.subject.type}</p>
                        </div>
                    ))}

                    <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-xl ring-2 ring-blue-500/30">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-xl font-semibold text-white">Fees Status</h3>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${data.feeStatus.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                                }`}>
                                {data.feeStatus.status}
                            </span>
                        </div>
                        <p className="text-slate-400 text-sm">Controlled by Class Advisor</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
