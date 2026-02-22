import React, { useState } from "react";
import { useData } from "@/context/DataContext";
import type { UserRole } from "@/types/academic";
import { GraduationCap, User, Shield, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const roles: { role: UserRole; label: string; icon: React.ReactNode; desc: string }[] = [
  { role: "admin", label: "Admin", icon: <Shield className="h-6 w-6" />, desc: "Manage departments, faculty & students" },
  { role: "faculty", label: "Faculty", icon: <User className="h-6 w-6" />, desc: "View subjects & student lists" },
  { role: "student", label: "Student", icon: <GraduationCap className="h-6 w-6" />, desc: "View subjects & faculty info" },
];

const LoginPage: React.FC = () => {
  const { login } = useData();
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) return;
    const success = login(selectedRole, id, password);
    if (!success) {
      setError("Invalid credentials. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl gradient-hero mb-4">
            <GraduationCap className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground font-heading">Academic Portal</h1>
          <p className="text-muted-foreground mt-1 text-sm">Select your role and sign in</p>
        </div>

        {!selectedRole ? (
          <div className="space-y-3">
            {roles.map(r => (
              <button
                key={r.role}
                onClick={() => { setSelectedRole(r.role); setError(""); setId(""); setPassword(""); }}
                className="w-full flex items-center gap-4 p-4 rounded-lg border border-border bg-card hover:bg-secondary transition-colors shadow-card text-left"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary">
                  {r.icon}
                </div>
                <div>
                  <div className="font-semibold text-card-foreground">{r.label}</div>
                  <div className="text-sm text-muted-foreground">{r.desc}</div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <Card className="shadow-elevated">
            <CardHeader className="pb-4">
              <button
                onClick={() => { setSelectedRole(null); setError(""); }}
                className="text-sm text-muted-foreground hover:text-foreground mb-2 inline-flex items-center gap-1"
              >
                ← Back to roles
              </button>
              <CardTitle className="text-lg">
                {roles.find(r => r.role === selectedRole)?.label} Login
              </CardTitle>
              <CardDescription>
                Enter your {selectedRole === "admin" ? "username" : `${selectedRole} ID`} and password
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="id">
                    {selectedRole === "admin" ? "Username" : selectedRole === "faculty" ? "Faculty ID" : "Student ID"}
                  </Label>
                  <Input
                    id="id"
                    value={id}
                    onChange={e => { setId(e.target.value); setError(""); }}
                    placeholder={selectedRole === "admin" ? "admin" : selectedRole === "faculty" ? "F101" : "S001"}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError(""); }}
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="w-full gap-2">
                  <LogIn className="h-4 w-4" /> Sign In
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default LoginPage;
