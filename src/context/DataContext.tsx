import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import type { AcademicStructure, Student, Faculty, AuthState, UserRole, NoDueRecord } from "@/types/academic";
import { api } from "@/lib/api";

interface DataContextType {
  academicStructure: AcademicStructure | null;
  students: Student[];
  faculty: Faculty[];
  noDueRecords: NoDueRecord[];
  auth: AuthState;
  setAcademicStructure: (data: AcademicStructure) => Promise<void>;
  setStudents: (data: Student[]) => Promise<void>;
  setFaculty: (data: Faculty[]) => Promise<void>;
  login: (role: UserRole, id: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateStudents: (updater: (prev: Student[]) => Student[]) => void;
  updateFaculty: (updater: (prev: Faculty[]) => Faculty[]) => void;
  updateAcademicStructure: (updater: (prev: AcademicStructure) => AcademicStructure) => void;
  setNoDueStatus: (studentId: string, facultyId: string, subject: string, dept: string, year: number, section: string, status: "cleared" | "pending", message?: string) => Promise<void>;
  updateNoDueMessage: (studentId: string, subject: string, message: string) => Promise<void>;
  getNoDueRecord: (studentId: string, subject: string) => NoDueRecord | undefined;
  resetAllData: () => Promise<void>;
  isDataLoaded: boolean;
}

const DataContext = createContext<DataContextType | null>(null);

export const useData = () => {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
};

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [academicStructure, setAcademicStructureState] = useState<AcademicStructure | null>(null);
  const [students, setStudentsState] = useState<Student[]>([]);
  const [faculty, setFacultyState] = useState<Faculty[]>([]);
  const [noDueRecords, setNoDueRecordsState] = useState<NoDueRecord[]>([]);
  const [auth, setAuth] = useState<AuthState>(() => {
    const saved = localStorage.getItem("auth");
    return saved ? JSON.parse(saved) : { isLoggedIn: false, role: null, userId: null };
  });

  const fetchData = useCallback(async () => {
    if (!auth.isLoggedIn) return;
    try {
      const structure = await api.get('/academic/structure');
      setAcademicStructureState({ departments: structure });

      if (auth.role === 'admin') {
        const [studentsData, facultyData] = await Promise.all([
          api.get('/academic/students'),
          api.get('/academic/faculty')
        ]);
        setStudentsState(studentsData);
        setFacultyState(facultyData);
      } else if (auth.role === 'student') {
        const [records, profile] = await Promise.all([
          api.get('/nodue/student-records'),
          api.get('/academic/profile')
        ]);
        setNoDueRecordsState(records.map((r: any) => ({
          student_id: auth.userId,
          faculty_id: r.subject.facultyId,
          subject: r.subject.name,
          status: r.status,
          message: r.message
        })));
        setStudentsState([profile]);
      } else if (auth.role === 'faculty') {
        const profile = await api.get('/academic/profile');
        setFacultyState([profile]);
      }
    } catch (err) {
      console.error("Failed to fetch data", err);
    }
  }, [auth]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const login = useCallback(async (role: UserRole, id: string, password: string): Promise<boolean> => {
    try {
      const res = await api.post('/auth/login', { username: id, password, role });
      const newAuth = {
        isLoggedIn: true,
        role: res.user.role.toLowerCase() as UserRole,
        userId: id
      };
      setAuth(newAuth);
      localStorage.setItem("auth", JSON.stringify(newAuth));
      localStorage.setItem("token", res.token);
      return true;
    } catch (err) {
      console.error("Login failed", err);
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    const newAuth = { isLoggedIn: false, role: null, userId: null };
    setAuth(newAuth);
    localStorage.removeItem("auth");
    localStorage.removeItem("token");
    setAcademicStructureState(null);
    setStudentsState([]);
    setFacultyState([]);
    setNoDueRecordsState([]);
  }, []);

  const setAcademicStructure = useCallback(async (data: AcademicStructure) => {
    try {
      await api.post('/academic/upload-structure', data);
      setAcademicStructureState(data);
    } catch (err) {
      console.error("Upload failed", err);
    }
  }, []);

  const setStudents = useCallback(async (data: Student[]) => {
    try {
      await api.post('/academic/upload-students', { students: data });
      setStudentsState(data);
    } catch (err) {
      console.error("Upload failed", err);
    }
  }, []);

  const setFaculty = useCallback(async (data: Faculty[]) => {
    try {
      await api.post('/academic/upload-faculty', { faculty: data });
      setFacultyState(data);
    } catch (err) {
      console.error("Upload failed", err);
    }
  }, []);

  const setNoDueStatus = useCallback(async (
    studentId: string, facultyId: string, subjectName: string,
    dept: string, year: number, section: string,
    status: "cleared" | "pending", message?: string
  ) => {
    try {
      const record = await api.post('/nodue/set-status', { studentId, subjectName, status, message });
      setNoDueRecordsState(prev => {
        const idx = prev.findIndex(r => r.student_id === studentId && r.subject === subjectName);
        const newRecord: NoDueRecord = {
          student_id: studentId,
          faculty_id: facultyId,
          subject: subjectName,
          department: dept,
          year,
          section,
          status,
          message: message ?? prev[idx]?.message,
        };
        return idx >= 0 ? prev.map((r, i) => i === idx ? newRecord : r) : [...prev, newRecord];
      });
    } catch (err) {
      console.error("Update failed", err);
    }
  }, []);

  const updateNoDueMessage = useCallback(async (studentId: string, subject: string, message: string) => {
    try {
      await api.post('/nodue/update-message', { studentId, subjectName: subject, message });
      setNoDueRecordsState(prev => prev.map(r =>
        r.student_id === studentId && r.subject === subject ? { ...r, message } : r
      ));
    } catch (err) {
      console.error("Update failed", err);
    }
  }, []);

  const getNoDueRecord = useCallback((studentId: string, subject: string) => {
    return noDueRecords.find(r => r.student_id === studentId && r.subject === subject);
  }, [noDueRecords]);

  const resetAllData = useCallback(async () => {
    try {
      await api.post('/academic/reset', {});
      setAcademicStructureState(null);
      setStudentsState([]);
      setFacultyState([]);
      setNoDueRecordsState([]);
    } catch (err) {
      console.error("Reset failed", err);
    }
  }, []);

  // Basic update functions (could be migrated to API later if needed)
  const updateStudents = useCallback((updater: (prev: Student[]) => Student[]) => {
    setStudentsState(prev => updater(prev));
  }, []);

  const updateFaculty = useCallback((updater: (prev: Faculty[]) => Faculty[]) => {
    setFacultyState(prev => updater(prev));
  }, []);

  const updateAcademicStructure = useCallback((updater: (prev: AcademicStructure) => AcademicStructure) => {
    setAcademicStructureState(prev => prev ? updater(prev) : null);
  }, []);

  const isDataLoaded = !!academicStructure;

  return (
    <DataContext.Provider value={{
      academicStructure, students, faculty, noDueRecords, auth,
      setAcademicStructure, setStudents, setFaculty,
      login, logout, updateStudents, updateFaculty, updateAcademicStructure,
      setNoDueStatus, updateNoDueMessage, getNoDueRecord, resetAllData,
      isDataLoaded,
    }}>
      {children}
    </DataContext.Provider>
  );
};
