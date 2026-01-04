import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export default function AdminDashboard() {
    const [stats, setStats] = useState(null);
    const { logout } = useAuth();

    useEffect(() => {
        axios.get('http://localhost:3000/api/dashboard/admin/stats')
            .then(res => setStats(res.data))
            .catch(err => console.error(err));
    }, []);

    return (
        <div className="min-h-screen bg-[#0f172a] p-8 text-white">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-10">
                    <div>
                        <h1 className="text-4xl font-bold mb-2">Admin Control Center</h1>
                        <p className="text-slate-400">Manage Departments, Faculties, and Student Clearances</p>
                    </div>
                    <button onClick={logout} className="bg-slate-800 text-white px-6 py-2 rounded-lg hover:bg-slate-700 border border-slate-700 transition">Logout</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
                    {[
                        { label: 'Total Students', value: stats?.totalStudents, color: 'blue' },
                        { label: 'Total Faculty', value: stats?.totalFaculty, color: 'emerald' },
                        { label: 'Departments', value: stats?.departments, color: 'amber' },
                        { label: 'Clearance Rate', value: stats?.clearanceRate, color: 'rose' }
                    ].map((stat, i) => (
                        <div key={i} className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-xl">
                            <p className="text-slate-400 text-sm font-medium mb-1">{stat.label}</p>
                            <h3 className="text-3xl font-bold">{stat.value || '...'}</h3>
                        </div>
                    ))}
                </div>

                <div className="bg-slate-800 rounded-2xl border border-slate-700 p-8 text-center">
                    <h3 className="text-xl font-semibold mb-4 text-slate-300">Global Overview</h3>
                    <p className="text-slate-500 max-w-lg mx-auto mb-8">
                        The management interface for Departments, Classes, and Subjects is available to provide a holistic view of the college's no-due status.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <button className="p-4 bg-slate-900 border border-slate-700 rounded-xl hover:bg-slate-700 transition">Manage Departments</button>
                        <button className="p-4 bg-slate-900 border border-slate-700 rounded-xl hover:bg-slate-700 transition">Manage Faculty</button>
                        <button className="p-4 bg-slate-900 border border-slate-700 rounded-xl hover:bg-slate-700 transition">View All No-Dues</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
