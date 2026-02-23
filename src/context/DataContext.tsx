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
  promoteStudents: (dept: string, fromYear: number) => Promise<void>;
  updateStudentSection: (studentId: string, section: string) => Promise<void>;
  resetPassword: (username: string) => Promise<void>;
  addFaculty: (id: string, name: string) => Promise<void>;
  removeFaculty: (id: string) => Promise<void>;
  addSubject: (dept: string, year: number, section: string, name: string, facultyId: string) => Promise<void>;
  changeFaculty: (subjectId: string, facultyId: string) => Promise<void>;
  setNoDueStatus: (studentId: string, facultyId: string, subject: string, dept: string, year: number, section: string, status: "cleared" | "pending", message?: string) => Promise<void>;
  updateNoDueMessage: (studentId: string, subject: string, message: string) => Promise<void>;
  getNoDueRecord: (studentId: string, subject: string) => NoDueRecord | undefined;
  resetAllData: () => Promise<void>;
  removeStructure: () => Promise<void>;
  removeStudents: () => Promise<void>;
  removeFacultyAll: () => Promise<void>;
  isDataLoaded: boolean;
  loading: boolean;
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
  const [loading, setLoading] = useState(() => {
    const saved = localStorage.getItem("auth");
    if (!saved) return false;
    const authData = JSON.parse(saved);
    return authData.isLoggedIn;
  });
  const [auth, setAuth] = useState<AuthState>(() => {
    const saved = localStorage.getItem("auth");
    return saved ? JSON.parse(saved) : { isLoggedIn: false, role: null, userId: null };
  });

  const fetchData = useCallback(async () => {
    if (!auth.isLoggedIn) return;
    setLoading(true);
    try {
      const structure = await api.get('/academic/structure');
      setAcademicStructureState({ departments: structure });

      const userRole = auth.role?.toLowerCase();

      if (userRole === 'admin') {
        const [studentsData, facultyData, allRecords] = await Promise.all([
          api.get('/academic/students'),
          api.get('/academic/faculty'),
          api.get('/nodue/all-records')
        ]);
        setStudentsState(studentsData);
        setFacultyState(facultyData);
        setNoDueRecordsState(allRecords);
      } else if (userRole === 'student') {
        try {
          const [records, profile, facultyData] = await Promise.all([
            api.get('/nodue/student-records'),
            api.get('/academic/profile'),
            api.get('/academic/faculty') // Need faculty names
          ]);
          setNoDueRecordsState(records);
          setStudentsState([profile]);
          setFacultyState(facultyData);
        } catch (err: any) {
          if (err.status === 404 || err.status === 401) {
            console.error("Profile not found or session stale, logging out", err);
            logout();
          } else {
            throw err;
          }
        }
      } else if (userRole === 'faculty') {
        const [profile, allRecords, studentsData, facultyData] = await Promise.all([
          api.get('/academic/profile'),
          api.get('/nodue/all-records'),
          api.get('/academic/students'),
          api.get('/academic/faculty')
        ]);
        setFacultyState(facultyData);
        setNoDueRecordsState(allRecords);
        setStudentsState(studentsData);
      }
    } catch (err) {
      console.error("Failed to fetch data", err);
    } finally {
      setLoading(false);
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
      setLoading(true);
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
    setLoading(false);
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
      await fetchData();
    } catch (err) {
      console.error("Upload failed", err);
    }
  }, [fetchData]);

  const setStudents = useCallback(async (data: Student[]) => {
    try {
      await api.post('/academic/upload-students', { students: data });
      await fetchData();
    } catch (err) {
      console.error("Upload failed", err);
    }
  }, [fetchData]);

  const setFaculty = useCallback(async (data: Faculty[]) => {
    try {
      await api.post('/academic/upload-faculty', { faculty: data });
      await fetchData();
    } catch (err) {
      console.error("Upload failed", err);
    }
  }, [fetchData]);

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

  const removeStructure = useCallback(async () => {
    try {
      await api.delete('/academic/remove-structure');
      setAcademicStructureState(null);
    } catch (err) {
      console.error("Remove structure failed", err);
    }
  }, []);

  const removeStudents = useCallback(async () => {
    try {
      await api.delete('/academic/remove-students');
      setStudentsState([]);
    } catch (err) {
      console.error("Remove students failed", err);
    }
  }, []);

  const removeFacultyAll = useCallback(async () => {
    try {
      await api.delete('/academic/remove-faculty-all');
      setFacultyState([]);
    } catch (err) {
      console.error("Remove faculty all failed", err);
    }
  }, []);

  const promoteStudents = useCallback(async (department: string, fromYear: number) => {
    try {
      await api.post('/academic/promote-students', { department, fromYear });
      await fetchData();
    } catch (err) {
      console.error("Promotion failed", err);
    }
  }, [fetchData]);

  const updateStudentSection = useCallback(async (studentId: string, section: string) => {
    try {
      await api.patch('/academic/update-student-section', { studentId, section });
      await fetchData();
    } catch (err) {
      console.error("Section update failed", err);
    }
  }, [fetchData]);

  const resetPassword = useCallback(async (username: string) => {
    try {
      await api.post('/academic/reset-password', { username });
      alert("Password reset to reset123");
    } catch (err) {
      console.error("Reset failed", err);
    }
  }, []);

  const addFaculty = useCallback(async (facultyId: string, name: string) => {
    try {
      await api.post('/academic/add-faculty', { facultyId, name });
      await fetchData();
    } catch (err) {
      console.error("Add faculty failed", err);
    }
  }, [fetchData]);

  const removeFaculty = useCallback(async (id: string) => {
    try {
      await api.delete(`/academic/remove-faculty/${id}`);
      await fetchData();
    } catch (err) {
      console.error("Remove faculty failed", err);
    }
  }, [fetchData]);

  const addSubject = useCallback(async (department: string, year: number, section: string, name: string, facultyId: string) => {
    try {
      await api.post('/academic/add-subject', { department, year, section, name, facultyId });
      await fetchData();
    } catch (err) {
      console.error("Add subject failed", err);
    }
  }, [fetchData]);

  const changeFaculty = useCallback(async (subjectId: string, facultyId: string) => {
    try {
      await api.patch('/academic/change-faculty', { subjectId, facultyId });
      await fetchData();
    } catch (err) {
      console.error("Change faculty failed", err);
    }
  }, [fetchData]);

  // Legacy update functions for local state management
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
      promoteStudents, updateStudentSection, resetPassword, addFaculty, removeFaculty,
      addSubject, changeFaculty,
      setNoDueStatus, updateNoDueMessage, getNoDueRecord, resetAllData,
      removeStructure, removeStudents, removeFacultyAll,
      isDataLoaded, loading
    }}>
      {children}
    </DataContext.Provider>
  );
};
