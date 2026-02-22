import React, { useState, useRef } from "react";
import { useData } from "@/context/DataContext";
import type { AcademicStructure, Student, Faculty } from "@/types/academic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  LogOut, Upload, Building2, Users, UserCog, Search, ArrowUpCircle,
  ChevronDown, ChevronRight, Edit2, Save, X, Plus, Trash2, FileSpreadsheet
} from "lucide-react";
import * as XLSX from "xlsx";

const AdminDashboard: React.FC = () => {
  const {
    academicStructure, students, faculty, logout, isDataLoaded,
    setAcademicStructure, setStudents, setFaculty,
    updateStudents, updateFaculty, updateAcademicStructure,
    resetAllData
  } = useData();

  const [activeTab, setActiveTab] = useState<"upload" | "departments" | "students" | "faculty">(
    isDataLoaded ? "departments" : "upload"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedDept, setExpandedDept] = useState<string | null>(null);
  const [expandedYear, setExpandedYear] = useState<string | null>(null);

  // Upload refs
  const acRef = useRef<HTMLInputElement>(null);
  const stRef = useRef<HTMLInputElement>(null);
  const fcRef = useRef<HTMLInputElement>(null);
  const [uploadStatus, setUploadStatus] = useState<Record<string, string>>({});

  const parseExcelStudents = (sheet: XLSX.WorkSheet): Student[] => {
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
    return rows.map(r => ({
      student_id: String(r["student_id"] ?? r["Student ID"] ?? r["StudentID"] ?? ""),
      password: String(r["password"] ?? r["Password"] ?? "default123"),
      department: String(r["department"] ?? r["Department"] ?? r["Dept"] ?? ""),
      year: Number(r["year"] ?? r["Year"] ?? 1),
      section: String(r["section"] ?? r["Section"] ?? "A"),
    })).filter(s => s.student_id && s.department);
  };

  const parseExcelFaculty = (sheet: XLSX.WorkSheet): Faculty[] => {
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
    return rows.map(r => ({
      faculty_id: String(r["faculty_id"] ?? r["Faculty ID"] ?? r["FacultyID"] ?? ""),
      name: String(r["name"] ?? r["Name"] ?? ""),
      password: String(r["password"] ?? r["Password"] ?? "default123"),
    })).filter(f => f.faculty_id && f.name);
  };

  const parseExcelAcademic = (workbook: XLSX.WorkBook): AcademicStructure => {
    // Expects a sheet with columns: department, year, section, subject, faculty_id
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);
    const deptMap: Record<string, Record<number, Record<string, { subject: string; faculty_id: string }[]>>> = {};
    rows.forEach(r => {
      const dept = String(r["department"] ?? r["Department"] ?? "");
      const year = Number(r["year"] ?? r["Year"] ?? 1);
      const section = String(r["section"] ?? r["Section"] ?? "A");
      const subject = String(r["subject"] ?? r["Subject"] ?? "");
      const faculty_id = String(r["faculty_id"] ?? r["Faculty ID"] ?? r["FacultyID"] ?? "");
      if (!dept || !subject) return;
      if (!deptMap[dept]) deptMap[dept] = {};
      if (!deptMap[dept][year]) deptMap[dept][year] = {};
      if (!deptMap[dept][year][section]) deptMap[dept][year][section] = [];
      deptMap[dept][year][section].push({ subject, faculty_id });
    });
    return {
      departments: Object.entries(deptMap).map(([name, years]) => ({
        name,
        years: Object.entries(years).map(([y, sections]) => ({
          year: Number(y),
          sections: Object.entries(sections).map(([section, subjects]) => ({ section, subjects })),
        })),
      })),
    };
  };

  const handleFileUpload = (type: "academic" | "students" | "faculty", file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    const isExcel = ext === "xlsx" || ext === "xls" || ext === "csv";

    if (isExcel) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          if (type === "students") setStudents(parseExcelStudents(sheet));
          else if (type === "faculty") setFaculty(parseExcelFaculty(sheet));
          else setAcademicStructure(parseExcelAcademic(workbook));
          setUploadStatus(prev => ({ ...prev, [type]: "✓ Uploaded (Excel)" }));
        } catch {
          setUploadStatus(prev => ({ ...prev, [type]: "✗ Invalid Excel file" }));
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const jsonData = JSON.parse(e.target?.result as string);
          if (type === "academic") setAcademicStructure(jsonData as AcademicStructure);
          else if (type === "students") setStudents(jsonData as Student[]);
          else setFaculty(jsonData as Faculty[]);
          setUploadStatus(prev => ({ ...prev, [type]: "✓ Uploaded" }));
        } catch {
          setUploadStatus(prev => ({ ...prev, [type]: "✗ Invalid JSON" }));
        }
      };
      reader.readAsText(file);
    }
  };

  const promoteStudents = (dept: string, fromYear: number) => {
    updateStudents(prev =>
      prev.map(s => s.department === dept && s.year === fromYear ? { ...s, year: s.year + 1 } : s)
    );
  };

  const updateStudentSection = (studentId: string, newSection: string) => {
    updateStudents(prev =>
      prev.map(s => s.student_id === studentId ? { ...s, section: newSection } : s)
    );
  };

  const resetPassword = (type: "student" | "faculty", id: string) => {
    if (type === "student") {
      updateStudents(prev =>
        prev.map(s => s.student_id === id ? { ...s, password: "reset123" } : s)
      );
    } else {
      updateFaculty(prev =>
        prev.map(f => f.faculty_id === id ? { ...f, password: "reset123" } : f)
      );
    }
  };

  const changeFaculty = (dept: string, year: number, section: string, subject: string, newFacultyId: string) => {
    updateAcademicStructure(prev => ({
      ...prev,
      departments: prev.departments.map(d =>
        d.name === dept ? {
          ...d,
          years: d.years.map(y =>
            y.year === year ? {
              ...y,
              sections: y.sections.map(sec =>
                sec.section === section ? {
                  ...sec,
                  subjects: sec.subjects.map(sub =>
                    sub.subject === subject ? { ...sub, faculty_id: newFacultyId } : sub
                  )
                } : sec
              )
            } : y
          )
        } : d
      )
    }));
  };

  const addSubject = (dept: string, year: number, section: string, subject: string, facultyId: string) => {
    updateAcademicStructure(prev => ({
      ...prev,
      departments: prev.departments.map(d =>
        d.name === dept ? {
          ...d,
          years: d.years.map(y =>
            y.year === year ? {
              ...y,
              sections: y.sections.map(sec =>
                sec.section === section ? {
                  ...sec,
                  subjects: [...sec.subjects, { subject, faculty_id: facultyId }]
                } : sec
              )
            } : y
          )
        } : d
      )
    }));
  };

  const addFaculty = (id: string, name: string) => {
    updateFaculty(prev => [...prev, { faculty_id: id, name, password: "default123" }]);
  };

  const removeFaculty = (id: string) => {
    updateFaculty(prev => prev.filter(f => f.faculty_id !== id));
  };

  const getFacultyName = (id: string) => faculty.find(f => f.faculty_id === id)?.name || id;

  const filteredStudents = students.filter(s =>
    !searchQuery || s.student_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFaculty = faculty.filter(f =>
    !searchQuery || f.faculty_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const tabs = [
    { key: "upload" as const, label: "Upload", icon: Upload },
    { key: "departments" as const, label: "Departments", icon: Building2 },
    { key: "students" as const, label: "Students", icon: Users },
    { key: "faculty" as const, label: "Faculty", icon: UserCog },
  ];

  // New faculty form state
  const [newFacultyId, setNewFacultyId] = useState("");
  const [newFacultyName, setNewFacultyName] = useState("");

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="gradient-hero text-primary-foreground">
        <div className="container py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold font-heading">Admin Dashboard</h1>
            <p className="text-sm opacity-80">Academic Management System</p>
          </div>
          <Button variant="ghost" size="sm" onClick={logout} className="text-primary-foreground hover:bg-primary-foreground/10">
            <LogOut className="h-4 w-4 mr-2" /> Logout
          </Button>
        </div>
      </header>

      {/* Tabs */}
      <div className="container mt-4">
        <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => { setActiveTab(t.key); setSearchQuery(""); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === t.key ? "bg-card text-foreground shadow-card" : "text-muted-foreground hover:text-foreground"
                }`}
            >
              <t.icon className="h-4 w-4" /> {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="container py-6 animate-fade-in">
        {/* Upload Tab */}
        {activeTab === "upload" && (
          <div className="max-w-lg space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold font-heading">Upload Data Files</h2>
              {isDataLoaded && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    if (window.confirm("Are you sure? This will delete all academic structure, student, and faculty data!")) {
                      resetAllData();
                    }
                  }}
                  className="h-8"
                >
                  <Trash2 className="h-4 w-4 mr-2" /> Reset All Data
                </Button>
              )}
            </div>
            {(["academic", "students", "faculty"] as const).map(type => (
              <Card key={type} className="shadow-card">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium capitalize">{type === "academic" ? "Academic Structure" : type}</p>
                    <p className="text-sm text-muted-foreground">.json, .xlsx, .xls, or .csv</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {uploadStatus[type] && (
                      <span className={`text-sm ${uploadStatus[type].startsWith("✓") ? "text-success" : "text-destructive"}`}>
                        {uploadStatus[type]}
                      </span>
                    )}
                    <input
                      type="file"
                      accept=".json,.xlsx,.xls,.csv"
                      className="hidden"
                      ref={type === "academic" ? acRef : type === "students" ? stRef : fcRef}
                      onChange={e => {
                        const f = e.target.files?.[0];
                        if (f) handleFileUpload(type, f);
                      }}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const ref = type === "academic" ? acRef : type === "students" ? stRef : fcRef;
                        ref.current?.click();
                      }}
                    >
                      <Upload className="h-4 w-4 mr-1" /> Choose File
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Departments Tab */}
        {activeTab === "departments" && academicStructure && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold font-heading">Departments</h2>
            {academicStructure.departments.map(dept => (
              <Card key={dept.name} className="shadow-card">
                <CardHeader className="pb-2 cursor-pointer" onClick={() => setExpandedDept(expandedDept === dept.name ? null : dept.name)}>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      {expandedDept === dept.name ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      <Badge variant="secondary">{dept.name}</Badge>
                      <span className="text-muted-foreground font-normal text-sm">
                        {dept.years.length} year(s)
                      </span>
                    </CardTitle>
                  </div>
                </CardHeader>
                {expandedDept === dept.name && (
                  <CardContent className="pt-0 space-y-3">
                    {dept.years.map(yr => (
                      <div key={yr.year} className="border rounded-lg p-3">
                        <div
                          className="flex items-center justify-between cursor-pointer"
                          onClick={() => setExpandedYear(expandedYear === `${dept.name}-${yr.year}` ? null : `${dept.name}-${yr.year}`)}
                        >
                          <span className="font-medium text-sm">Year {yr.year}</span>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => { e.stopPropagation(); promoteStudents(dept.name, yr.year); }}
                            >
                              <ArrowUpCircle className="h-3 w-3 mr-1" /> Promote
                            </Button>
                          </div>
                        </div>
                        {expandedYear === `${dept.name}-${yr.year}` && (
                          <div className="mt-3 space-y-2">
                            {yr.sections.map(sec => (
                              <div key={sec.section} className="bg-muted rounded-md p-3">
                                <p className="text-sm font-medium mb-2">Section {sec.section}</p>
                                <div className="space-y-2">
                                  {sec.subjects.map(sub => (
                                    <div key={sub.subject} className="flex items-center justify-between text-sm bg-card rounded p-2">
                                      <span>{sub.subject}</span>
                                      <div className="flex items-center gap-2">
                                        <span className="text-muted-foreground">{getFacultyName(sub.faculty_id)}</span>
                                        <Select
                                          value={sub.faculty_id}
                                          onValueChange={(val) => changeFaculty(dept.name, yr.year, sec.section, sub.subject, val)}
                                        >
                                          <SelectTrigger className="w-32 h-7 text-xs">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {faculty.map(f => (
                                              <SelectItem key={f.faculty_id} value={f.faculty_id}>
                                                {f.name} ({f.faculty_id})
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    </div>
                                  ))}
                                  {/* Add Subject Form */}
                                  <AddSubjectForm
                                    dept={dept.name}
                                    year={yr.year}
                                    section={sec.section}
                                    faculty={faculty}
                                    onAdd={addSubject}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}

        {/* Students Tab */}
        {activeTab === "students" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold font-heading">Students</h2>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search students..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Card className="shadow-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium">ID</th>
                      <th className="text-left p-3 font-medium">Department</th>
                      <th className="text-left p-3 font-medium">Year</th>
                      <th className="text-left p-3 font-medium">Section</th>
                      <th className="text-left p-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map(s => (
                      <tr key={s.student_id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="p-3 font-mono text-xs">{s.student_id}</td>
                        <td className="p-3"><Badge variant="outline">{s.department}</Badge></td>
                        <td className="p-3">{s.year}</td>
                        <td className="p-3">
                          <Input
                            className="w-16 h-7 text-xs"
                            defaultValue={s.section}
                            onBlur={e => updateStudentSection(s.student_id, e.target.value)}
                          />
                        </td>
                        <td className="p-3">
                          <Button size="sm" variant="ghost" onClick={() => resetPassword("student", s.student_id)}>
                            Reset PW
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* Faculty Tab */}
        {activeTab === "faculty" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold font-heading">Faculty</h2>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search faculty..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Add faculty form */}
            <Card className="shadow-card">
              <CardContent className="p-4">
                <p className="text-sm font-medium mb-2">Add New Faculty</p>
                <div className="flex gap-2">
                  <Input placeholder="Faculty ID" value={newFacultyId} onChange={e => setNewFacultyId(e.target.value)} className="w-32" />
                  <Input placeholder="Name" value={newFacultyName} onChange={e => setNewFacultyName(e.target.value)} />
                  <Button
                    size="sm"
                    onClick={() => {
                      if (newFacultyId && newFacultyName) {
                        addFaculty(newFacultyId, newFacultyName);
                        setNewFacultyId("");
                        setNewFacultyName("");
                      }
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" /> Add
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium">ID</th>
                      <th className="text-left p-3 font-medium">Name</th>
                      <th className="text-left p-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFaculty.map(f => (
                      <tr key={f.faculty_id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="p-3 font-mono text-xs">{f.faculty_id}</td>
                        <td className="p-3">{f.name}</td>
                        <td className="p-3 flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => resetPassword("faculty", f.faculty_id)}>
                            Reset PW
                          </Button>
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => removeFaculty(f.faculty_id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {(activeTab !== "upload" && !isDataLoaded) && (
          <Card className="shadow-card p-8 text-center">
            <p className="text-muted-foreground">No data loaded yet. Please upload files first.</p>
            <Button variant="outline" className="mt-4" onClick={() => setActiveTab("upload")}>
              Go to Upload
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;

const AddSubjectForm: React.FC<{
  dept: string;
  year: number;
  section: string;
  faculty: Faculty[];
  onAdd: (dept: string, year: number, section: string, subject: string, facultyId: string) => void;
}> = ({ dept, year, section, faculty, onAdd }) => {
  const [subject, setSubject] = useState("");
  const [facultyId, setFacultyId] = useState("");

  return (
    <div className="flex gap-2 mt-2 p-2 bg-secondary/30 rounded-md border border-dashed border-border">
      <Input
        placeholder="New Subject"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        className="h-8 text-xs flex-1"
      />
      <Select value={facultyId} onValueChange={setFacultyId}>
        <SelectTrigger className="w-32 h-8 text-xs">
          <SelectValue placeholder="Faculty" />
        </SelectTrigger>
        <SelectContent>
          {faculty.map((f) => (
            <SelectItem key={f.faculty_id} value={f.faculty_id}>
              {f.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        size="sm"
        className="h-8 px-2"
        disabled={!subject || !facultyId}
        onClick={() => {
          onAdd(dept, year, section, subject, facultyId);
          setSubject("");
          setFacultyId("");
        }}
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
};
