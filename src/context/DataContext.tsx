import React, { createContext, useContext, useState, useCallback } from "react";
import type { AcademicStructure, Student, Faculty, AuthState, UserRole, NoDueRecord } from "@/types/academic";

const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "admin123";

interface DataContextType {
  academicStructure: AcademicStructure | null;
  students: Student[];
  faculty: Faculty[];
  noDueRecords: NoDueRecord[];
  auth: AuthState;
  setAcademicStructure: (data: AcademicStructure) => void;
  setStudents: (data: Student[]) => void;
  setFaculty: (data: Faculty[]) => void;
  login: (role: UserRole, id: string, password: string) => boolean;
  logout: () => void;
  updateStudents: (updater: (prev: Student[]) => Student[]) => void;
  updateFaculty: (updater: (prev: Faculty[]) => Faculty[]) => void;
  updateAcademicStructure: (updater: (prev: AcademicStructure) => AcademicStructure) => void;
  setNoDueStatus: (studentId: string, facultyId: string, subject: string, dept: string, year: number, section: string, status: "cleared" | "pending", message?: string) => void;
  updateNoDueMessage: (studentId: string, subject: string, message: string) => void;
  getNoDueRecord: (studentId: string, subject: string) => NoDueRecord | undefined;
  isDataLoaded: boolean;
}

const DataContext = createContext<DataContextType | null>(null);

export const useData = () => {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
};

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [academicStructure, setAcademicStructureState] = useState<AcademicStructure | null>(() => {
    const saved = localStorage.getItem("academic_structure");
    return saved ? JSON.parse(saved) : null;
  });

  const [students, setStudentsState] = useState<Student[]>(() => {
    const saved = localStorage.getItem("students");
    return saved ? JSON.parse(saved) : [];
  });

  const [faculty, setFacultyState] = useState<Faculty[]>(() => {
    const saved = localStorage.getItem("faculty");
    return saved ? JSON.parse(saved) : [];
  });

  const [noDueRecords, setNoDueRecordsState] = useState<NoDueRecord[]>(() => {
    const saved = localStorage.getItem("no_due_records");
    return saved ? JSON.parse(saved) : [];
  });

  const [auth, setAuth] = useState<AuthState>(() => {
    const saved = localStorage.getItem("auth");
    return saved ? JSON.parse(saved) : { isLoggedIn: false, role: null, userId: null };
  });

  const setAcademicStructure = useCallback((data: AcademicStructure) => {
    setAcademicStructureState(data);
    localStorage.setItem("academic_structure", JSON.stringify(data));
  }, []);

  const setStudents = useCallback((data: Student[]) => {
    setStudentsState(data);
    localStorage.setItem("students", JSON.stringify(data));
  }, []);

  const setFaculty = useCallback((data: Faculty[]) => {
    setFacultyState(data);
    localStorage.setItem("faculty", JSON.stringify(data));
  }, []);

  const updateStudents = useCallback((updater: (prev: Student[]) => Student[]) => {
    setStudentsState(prev => {
      const updated = updater(prev);
      localStorage.setItem("students", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const updateFaculty = useCallback((updater: (prev: Faculty[]) => Faculty[]) => {
    setFacultyState(prev => {
      const updated = updater(prev);
      localStorage.setItem("faculty", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const updateAcademicStructure = useCallback((updater: (prev: AcademicStructure) => AcademicStructure) => {
    setAcademicStructureState(prev => {
      if (!prev) return prev;
      const updated = updater(prev);
      localStorage.setItem("academic_structure", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const setNoDueStatus = useCallback((
    studentId: string, facultyId: string, subject: string,
    dept: string, year: number, section: string,
    status: "cleared" | "pending", message?: string
  ) => {
    setNoDueRecordsState(prev => {
      const idx = prev.findIndex(r => r.student_id === studentId && r.subject === subject);
      const record: NoDueRecord = {
        student_id: studentId,
        faculty_id: facultyId,
        subject,
        department: dept,
        year,
        section,
        status,
        message: message ?? prev[idx]?.message,
      };
      const updated = idx >= 0
        ? prev.map((r, i) => i === idx ? record : r)
        : [...prev, record];
      localStorage.setItem("no_due_records", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const updateNoDueMessage = useCallback((studentId: string, subject: string, message: string) => {
    setNoDueRecordsState(prev => {
      const updated = prev.map(r =>
        r.student_id === studentId && r.subject === subject
          ? { ...r, message }
          : r
      );
      localStorage.setItem("no_due_records", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const getNoDueRecord = useCallback((studentId: string, subject: string) => {
    return noDueRecords.find(r => r.student_id === studentId && r.subject === subject);
  }, [noDueRecords]);

  const login = useCallback((role: UserRole, id: string, password: string): boolean => {
    if (role === "admin") {
      if (id === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        const newAuth = { isLoggedIn: true, role: "admin" as UserRole, userId: "admin" };
        setAuth(newAuth);
        localStorage.setItem("auth", JSON.stringify(newAuth));
        return true;
      }
      return false;
    }
    if (role === "faculty") {
      const f = faculty.find(f => f.faculty_id === id && f.password === password);
      if (f) {
        const newAuth = { isLoggedIn: true, role: "faculty" as UserRole, userId: f.faculty_id };
        setAuth(newAuth);
        localStorage.setItem("auth", JSON.stringify(newAuth));
        return true;
      }
      return false;
    }
    if (role === "student") {
      const s = students.find(s => s.student_id === id && s.password === password);
      if (s) {
        const newAuth = { isLoggedIn: true, role: "student" as UserRole, userId: s.student_id };
        setAuth(newAuth);
        localStorage.setItem("auth", JSON.stringify(newAuth));
        return true;
      }
      return false;
    }
    return false;
  }, [faculty, students]);

  const logout = useCallback(() => {
    const newAuth = { isLoggedIn: false, role: null, userId: null };
    setAuth(newAuth);
    localStorage.setItem("auth", JSON.stringify(newAuth));
  }, []);

  const isDataLoaded = !!academicStructure && students.length > 0 && faculty.length > 0;

  return (
    <DataContext.Provider value={{
      academicStructure, students, faculty, noDueRecords, auth,
      setAcademicStructure, setStudents, setFaculty,
      login, logout, updateStudents, updateFaculty, updateAcademicStructure,
      setNoDueStatus, updateNoDueMessage, getNoDueRecord,
      isDataLoaded,
    }}>
      {children}
    </DataContext.Provider>
  );
};
