import React, { useState } from "react";
import { useData } from "@/context/DataContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  LogOut,
  BookOpen,
  Users,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Send,
} from "lucide-react";

const FacultyDashboard: React.FC = () => {
  const {
    auth,
    academicStructure,
    students,
    faculty,
    logout,
    noDueRecords,
    setNoDueStatus,
    updateNoDueMessage,
    getNoDueRecord,
  } = useData();

  const currentFaculty = faculty.find((f) => f.faculty_id === auth.userId);

  // Find subjects assigned to this faculty
  const assignments: {
    dept: string;
    year: number;
    section: string;
    subject: string;
  }[] = [];
  if (academicStructure) {
    academicStructure.departments.forEach((dept) => {
      dept.years.forEach((yr) => {
        yr.sections.forEach((sec) => {
          sec.subjects.forEach((sub) => {
            if (sub.faculty_id === auth.userId) {
              assignments.push({
                dept: dept.name,
                year: yr.year,
                section: sec.section,
                subject: sub.subject,
              });
            }
          });
        });
      });
    });
  }

  const [selectedAssignment, setSelectedAssignment] = useState<
    (typeof assignments)[0] | null
  >(null);

  const assignmentStudents = selectedAssignment
    ? students.filter(
      (s) =>
        s.department === selectedAssignment.dept &&
        s.year === selectedAssignment.year &&
        s.section === selectedAssignment.section
    )
    : [];

  return (
    <div className="min-h-screen bg-background">
      <header className="gradient-hero text-primary-foreground">
        <div className="container py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold font-heading">Faculty Dashboard</h1>
            <p className="text-sm opacity-80">
              Welcome, {currentFaculty?.name || auth.userId}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="text-primary-foreground hover:bg-primary-foreground/10"
          >
            <LogOut className="h-4 w-4 mr-2" /> Logout
          </Button>
        </div>
      </header>

      <div className="container py-6 animate-fade-in">
        {assignments.length === 0 ? (
          <Card className="shadow-card p-8 text-center">
            <p className="text-muted-foreground">
              No data available. Please ask admin to upload academic data.
            </p>
          </Card>
        ) : (
          <div className="grid md:grid-cols-4 gap-6">
            {/* Subjects list */}
            <div className="space-y-3">
              <h2 className="text-lg font-semibold font-heading flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" /> My Subjects
              </h2>
              {assignments.map((a, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedAssignment(a)}
                  className={`w-full text-left p-4 rounded-lg border transition-colors shadow-card ${selectedAssignment === a
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card hover:bg-secondary"
                    }`}
                >
                  <p className="font-semibold text-card-foreground">
                    {a.subject}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {a.dept} — Year {a.year}, Section {a.section}
                  </p>
                </button>
              ))}
            </div>

            {/* Student list */}
            <div className="md:col-span-3">
              {selectedAssignment ? (
                <div>
                  <h2 className="text-lg font-semibold font-heading flex items-center gap-2 mb-4">
                    <Users className="h-5 w-5 text-primary" />
                    Students — {selectedAssignment.subject}
                    <Badge variant="secondary" className="ml-2">
                      {assignmentStudents.length} students
                    </Badge>
                  </h2>
                  <Card className="shadow-card overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-muted/50">
                            <th className="text-left p-3 font-medium">Student ID</th>
                            <th className="text-left p-3 font-medium">Status</th>
                            <th className="text-left p-3 font-medium">Feedback / Message</th>
                            <th className="text-left p-3 font-medium">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {assignmentStudents.map((s) => (
                            <StudentRow
                              key={s.student_id}
                              student={s}
                              assignment={selectedAssignment}
                              record={getNoDueRecord(s.student_id, selectedAssignment.subject)}
                              onUpdateStatus={async (status) => {
                                if (auth.userId) {
                                  await setNoDueStatus(
                                    s.student_id,
                                    auth.userId,
                                    selectedAssignment.subject,
                                    s.department,
                                    s.year,
                                    s.section,
                                    status
                                  );
                                }
                              }}
                              onUpdateMessage={async (msg) => {
                                await updateNoDueMessage(s.student_id, selectedAssignment.subject, msg);
                              }}
                            />
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </div>
              ) : (
                <Card className="shadow-card p-12 text-center">
                  <p className="text-muted-foreground">
                    Select a subject to view the student list and manage due status.
                  </p>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const StudentRow: React.FC<{
  student: any;
  assignment: any;
  record: any;
  onUpdateStatus: (status: "cleared" | "pending") => Promise<void>;
  onUpdateMessage: (msg: string) => Promise<void>;
}> = ({ student, assignment, record, onUpdateStatus, onUpdateMessage }) => {
  const status = record?.status || "pending";
  const [msg, setMsg] = useState(record?.message || "");

  return (
    <tr className="border-b last:border-0 hover:bg-muted/30">
      <td className="p-3">
        <p className="font-mono text-xs">{student.student_id}</p>
      </td>
      <td className="p-3">
        {status === "cleared" ? (
          <Badge className="bg-success hover:bg-success/90 text-white flex w-fit items-center gap-1 px-2 py-0.5">
            <CheckCircle2 className="h-3 w-3" /> Cleared
          </Badge>
        ) : (
          <Badge variant="destructive" className="flex w-fit items-center gap-1 px-2 py-0.5">
            <AlertCircle className="h-3 w-3" /> Pending
          </Badge>
        )}
      </td>
      <td className="p-3">
        <div className="flex gap-2 min-w-[200px]">
          <Input
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            placeholder="e.g. Submit lab record"
            className="h-8 text-xs flex-1"
          />
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            onClick={() => onUpdateMessage(msg)}
          >
            <Send className="h-3 w-3" />
          </Button>
        </div>
      </td>
      <td className="p-3">
        {status === "pending" ? (
          <Button
            size="sm"
            className="h-8 bg-success hover:bg-success/90 text-white"
            onClick={() => onUpdateStatus("cleared")}
          >
            Mark Cleared
          </Button>
        ) : (
          <Button
            size="sm"
            variant="destructive"
            className="h-8"
            onClick={() => onUpdateStatus("pending")}
          >
            Mark Pending
          </Button>
        )}
      </td>
    </tr>
  );
};

export default FacultyDashboard;
