import React from "react";
import { useData } from "@/context/DataContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LogOut, BookOpen, User, CheckCircle2, AlertCircle, MessageSquare } from "lucide-react";

const StudentDashboard: React.FC = () => {
  const { auth, academicStructure, students, faculty, loading, logout, getNoDueRecord } = useData();

  // If we are a student, we only fetch our own profile, so it's always students[0]
  const currentStudent = auth.role?.toLowerCase() === 'student' ? students[0] : students.find(s => s.student_id.trim().toUpperCase() === auth.userId?.trim().toUpperCase());

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // Find subjects for this student
  let errorMsg = "No data available. Please ask admin to upload academic data.";
  const subjectsWithFaculty: {
    subject: string;
    facultyName: string;
    facultyId: string;
    status: "cleared" | "pending";
    message?: string;
  }[] = [];

  if (!currentStudent) {
    errorMsg = `Student profile not found for ID: ${auth.userId}. Please contact admin.`;
  } else if (academicStructure) {
    const sDept = currentStudent.department.trim().toUpperCase();
    const sSec = currentStudent.section.trim().toUpperCase();
    const sYear = Number(currentStudent.year);

    const dept = academicStructure.departments.find(d => d.name.trim().toUpperCase() === sDept);

    if (!dept) {
      errorMsg = `Department "${sDept}" not found in academic structure.`;
    } else {
      const yr = dept.years.find(y => Number(y.year) === sYear);
      if (!yr) {
        errorMsg = `Year ${sYear} not found for department ${sDept}.`;
      } else {
        const sec = yr.sections.find(s => s.section.trim().toUpperCase() === sSec);
        if (!sec) {
          errorMsg = `Section "${sSec}" not found for ${sDept} Year ${sYear}.`;
        } else {
          sec.subjects.forEach(sub => {
            const fac = faculty.find(f => f.faculty_id.trim() === (sub.faculty_id || "").trim());
            const record = getNoDueRecord(currentStudent.student_id, sub.subject);
            subjectsWithFaculty.push({
              subject: sub.subject,
              facultyName: fac?.name || sub.faculty_id || "Unassigned",
              facultyId: sub.faculty_id || "None",
              status: record?.status || "pending",
              message: record?.message,
            });
          });
          if (subjectsWithFaculty.length === 0) {
            errorMsg = `No subjects found for ${sDept} Year ${sYear} Section ${sSec}.`;
          }
        }
      }
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="gradient-hero text-primary-foreground">
        <div className="container py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold font-heading">Student Dashboard</h1>
            <p className="text-sm opacity-80">Welcome, {auth.userId}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={logout} className="text-primary-foreground hover:bg-primary-foreground/10">
            <LogOut className="h-4 w-4 mr-2" /> Logout
          </Button>
        </div>
      </header>

      <div className="container py-6 animate-fade-in">
        {/* Student info */}
        {currentStudent && (
          <Card className="shadow-card mb-6">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary">
                <User className="h-6 w-6" />
              </div>
              <div>
                <p className="font-semibold text-card-foreground">{currentStudent.student_id}</p>
                <p className="text-sm text-muted-foreground">
                  {currentStudent.department} — Year {currentStudent.year}, Section {currentStudent.section}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <h2 className="text-lg font-semibold font-heading flex items-center gap-2 mb-4">
          <BookOpen className="h-5 w-5 text-primary" /> My Subjects
        </h2>

        {subjectsWithFaculty.length === 0 ? (
          <Card className="shadow-card p-8 text-center border-destructive/20 bg-destructive/5">
            <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground font-medium">{errorMsg}</p>
            <p className="text-xs text-muted-foreground/60 mt-2">
              Tip: Ensure all data in Excel files is consistent and has been uploaded by the admin.
            </p>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {subjectsWithFaculty.map(s => (
              <Card key={s.subject} className="shadow-card hover:shadow-elevated transition-all overflow-hidden border-t-4 border-t-transparent data-[status=cleared]:border-t-success data-[status=pending]:border-t-destructive" data-status={s.status}>
                <CardContent className="p-5">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="font-semibold text-card-foreground text-lg">{s.subject}</h3>
                    {s.status === "cleared" ? (
                      <Badge className="bg-success text-white border-none flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Cleared
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> Pending
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="h-4 w-4" />
                      <div>
                        <p className="font-medium text-foreground">{s.facultyName}</p>
                        <p className="text-xs">{s.facultyId}</p>
                      </div>
                    </div>

                    {s.message && (
                      <div className="mt-4 p-3 bg-secondary/50 rounded-lg border border-border">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-primary mb-1">
                          <MessageSquare className="h-3 w-3" /> Message
                        </div>
                        <p className="text-sm text-card-foreground italic">"{s.message}"</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentDashboard;
