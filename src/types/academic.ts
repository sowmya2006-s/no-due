export interface SubjectMapping {
  id: string;
  subject: string;
  faculty_id: string;
}

export interface Section {
  section: string;
  subjects: SubjectMapping[];
}

export interface Year {
  year: number;
  sections: Section[];
}

export interface Department {
  name: string;
  years: Year[];
}

export interface AcademicStructure {
  departments: Department[];
}

export interface Student {
  student_id: string;
  password: string;
  department: string;
  year: number;
  section: string;
}

export interface Faculty {
  faculty_id: string;
  name: string;
  password: string;
}

export interface NoDueRecord {
  student_id: string;
  faculty_id: string;
  subject: string;
  department: string;
  year: number;
  section: string;
  status: "cleared" | "pending";
  message?: string;
}

export type UserRole = "admin" | "faculty" | "student";

export interface AuthState {
  isLoggedIn: boolean;
  role: UserRole | null;
  userId: string | null;
}
