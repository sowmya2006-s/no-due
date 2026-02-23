# NO DUE - Academic Portal

A professional, full-stack application for managing student "No-Due" clearance in academic institutions. Featuring real-time dashboard updates, case-insensitive ID normalization, and bulk Excel data processing.

## 🚀 Tech Stack

- **Frontend**: React 18 (Vite) + TypeScript + Tailwind CSS
- **UI Components**: Shadcn UI + Lucide React (Icons)
- **Backend**: Node.js + Express 5
- **Database**: PostgreSQL + Prisma 6 ORM
- **Authentication**: JWT (JSON Web Tokens) + Bcrypt Hashing
- **Data Management**: XLSX (SheetJS) for sample data processing

## 🛠️ Excel Data Formats

The portal supports bulk uploads via Excel. Ensure your `.xlsx` files follow these column formats:

### 1. Students (`students_sample.xlsx`)
| Student ID | Department | Year | Section | Password |
| :--- | :--- | :--- | :--- | :--- |
| S001 | CSE | 1 | A | stud123 |
| S002 | AIML | 2 | B | stud123 |

### 2. Faculty (`faculty_sample.xlsx`)
| Faculty ID | Name | Password |
| :--- | :--- | :--- |
| F001 | Dr. Kumar | fac123 |
| F002 | Prof. Rao | fac123 |

### 3. Academic Structure (`academic_structure_sample.xlsx`)
| Department | Year | Section | Subject | Faculty ID |
| :--- | :--- | :--- | :--- | :--- |
| CSE | 1 | A | Programming | F001 |
| CSE | 1 | A | Mathematics | F002 |

> [!TIP]
> **Universal ID Normalization**: All IDs are automatically converted to **UPPERCASE**. Students can log in with `s001` or `S001`, and the system will correctly resolve their profile.

## 🔄 User Workflows

### 👑 Admin
- **Setup**: Upload the institutional structure and bulk-import students/faculty.
- **Granular Control**: Add or remove faculty members manually.
- **Maintenance**: Reset system data for new academic cycles.

### 🧑‍🏫 Faculty
- **Clearing Dues**: View assigned subjects and toggle clearance status for students.
- **Communication**: Leave specific messages/requirements (e.g., "Submit lab record").
- **Filtering**: Quick-filter student lists by Department, Year, and Section.

### 🎓 Student
- **Real-time Status**: Instantly see which subjects are cleared or pending.
- **Feedback**: View direct messages from faculty regarding missing requirements.
- **Secure Access**: Profile-based dashboard with JWT security.

## 🚦 Getting Started

1. **Prerequisites**: Node.js (v18+) and a running PostgreSQL instance.
2. **Install Dependencies**:
   ```bash
   npm install && cd server && npm install
   ```
3. **Environment**: Update `server/.env` with your `DATABASE_URL` and `JWT_SECRET`.
4. **Deploy Database**:
   ```bash
   npx prisma migrate dev && node prisma/seed.js
   ```
5. **Run App**: 
   ```bash
   npm run start-all
   ```

Access the portal at **http://localhost:8080**.
