import React from "react";
import { useData } from "@/context/DataContext";
import LoginPage from "@/pages/LoginPage";
import AdminDashboard from "@/pages/AdminDashboard";
import FacultyDashboard from "@/pages/FacultyDashboard";
import StudentDashboard from "@/pages/StudentDashboard";

const Index: React.FC = () => {
  const { auth } = useData();

  if (!auth.isLoggedIn) return <LoginPage />;
  if (auth.role === "admin") return <AdminDashboard />;
  if (auth.role === "faculty") return <FacultyDashboard />;
  if (auth.role === "student") return <StudentDashboard />;

  return <LoginPage />;
};

export default Index;
