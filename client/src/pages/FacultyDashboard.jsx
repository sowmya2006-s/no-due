import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export default function FacultyDashboard() {
    const [faculty, setFaculty] = useState(null);
    const [selectedClass, setSelectedClass] = useState(null);
    const [students, setStudents] = useState([]);
    const { logout } = useAuth();

    useEffect(() => {
        axios.get('http://localhost:3000/api/dashboard/faculty')
            .then(res => setFaculty(res.data));
    }, []);

    const loadStudents = (classId, subjectId) => {
        setSelectedClass({ classId, subjectId });
        axios.get(`http://localhost:3000/api/dashboard/faculty/students?classId=${classId}&subjectId=${subjectId}`)
            .then(res => setStudents(res.data));
    };

    const loadAdvisorStudents = () => {
        setSelectedClass({ isAdvisor: true });
        axios.get(`http://localhost:3000/api/dashboard/advisor/students`)
            .then(res => setStudents(res.data))
            .catch(err => console.error(err));
    };

    const updateStatus = (recordId, currentStatus) => {
        const newStatus = currentStatus === 'APPROVED' ? 'PENDING' : 'APPROVED';
        axios.post('http://localhost:3000/api/dashboard/update-no-due', { recordId, status: newStatus })
            .then(() => {
                setStudents(students.map(s => s.id === recordId ? { ...s, status: newStatus } : s));
            });
    };

    const updateFeeStatus = (studentId, currentStatus) => {
        const newStatus = currentStatus === 'APPROVED' ? 'PENDING' : 'APPROVED';
        axios.post('http://localhost:3000/api/dashboard/update-fees', { studentId, status: newStatus })
            .then(() => {
                setStudents(students.map(s => s.id === studentId ? { ...s, feeStatus: { ...s.feeStatus, status: newStatus } } : s));
            });
    };

    if (!faculty) return <div className="p-8 text-white">Loading...</div>;

    return (
        <div className="min-h-screen bg-[#0f172a] p-8 text-white">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-10">
                    <h1 className="text-4xl font-bold">Faculty Dashboard</h1>
                    <button onClick={logout} className="bg-slate-800 px-6 py-2 rounded-lg border border-slate-700 hover:bg-slate-700 transition">Logout</button>
                </div>

                {faculty.advisorClass && (
                    <div className="mb-10">
                        <h2 className="text-2xl font-semibold mb-4 text-blue-400">Class Advisor Role</h2>
                        <button
                            onClick={loadAdvisorStudents}
                            className={`w-full p-6 rounded-xl border-2 text-left transition ${selectedClass?.isAdvisor ? 'bg-blue-600/20 border-blue-500' : 'bg-slate-800 border-slate-700 hover:border-blue-500/50'
                                }`}
                        >
                            <div className="flex justify-between items-center">
                                <div>
                                    <h3 className="text-xl font-bold">Manage Fees: {faculty.advisorClass.year} - {faculty.advisorClass.section}</h3>
                                    <p className="text-slate-400">Approve/Reject student fees clearance for your class</p>
                                </div>
                                <span className="bg-blue-600 px-4 py-1 rounded-full text-xs font-bold">ADVISOR</span>
                            </div>
                        </button>
                    </div>
                )}

                <h2 className="text-2xl font-semibold mb-6 text-slate-400">Subject No-Due Assignments</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
                    {faculty.assignments.map(asm => (
                        <button
                            key={asm.id}
                            onClick={() => loadStudents(asm.classId, asm.subjectId)}
                            className={`p-6 rounded-xl border text-left transition ${selectedClass?.classId === asm.classId && selectedClass?.subjectId === asm.subjectId
                                    ? 'bg-blue-600 border-blue-400' : 'bg-slate-800 border-slate-700 hover:border-slate-500'
                                }`}
                        >
                            <h3 className="text-xl font-bold">{asm.subject.name}</h3>
                            <p className="text-slate-300">{asm.class.department.name} - Year {asm.class.year} ({asm.class.section})</p>
                        </button>
                    ))}
                </div>

                {selectedClass && (
                    <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-2xl">
                        <div className="p-6 border-b border-slate-700 bg-slate-800/50">
                            <h3 className="text-xl font-bold">{selectedClass.isAdvisor ? 'Advisor - Fees Approval' : 'Student No-Due List'}</h3>
                        </div>
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-900/50 text-slate-400 text-sm uppercase tracking-wider">
                                    <th className="p-4">Roll Number</th>
                                    <th className="p-4">Name</th>
                                    <th className="p-4">Status</th>
                                    <th className="p-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700">
                                {students.map(item => (
                                    <tr key={item.id} className="hover:bg-slate-700/30 transition">
                                        <td className="p-4 font-mono text-blue-300">{selectedClass.isAdvisor ? item.rollNumber : item.student.rollNumber}</td>
                                        <td className="p-4 font-medium">{selectedClass.isAdvisor ? item.user.name : item.student.user.name}</td>
                                        <td className="p-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${(selectedClass.isAdvisor ? item.feeStatus.status : item.status) === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                                                }`}>
                                                {selectedClass.isAdvisor ? item.feeStatus.status : item.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <button
                                                onClick={() => selectedClass.isAdvisor ? updateFeeStatus(item.id, item.feeStatus.status) : updateStatus(item.id, item.status)}
                                                className={`px-4 py-2 rounded-lg text-sm font-bold transition ${(selectedClass.isAdvisor ? item.feeStatus.status : item.status) === 'APPROVED' ? 'bg-rose-600/20 text-rose-400 hover:bg-rose-600/40' : 'bg-emerald-600 text-white hover:bg-emerald-500'
                                                    }`}
                                            >
                                                {(selectedClass.isAdvisor ? item.feeStatus.status : item.status) === 'APPROVED' ? 'Mark Pending' : 'Clear Due'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
