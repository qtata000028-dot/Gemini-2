
import React, { useState, useEffect, ErrorInfo, ReactNode, Component } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import StudentDashboard from './components/StudentDashboard';
import { Teacher, Student, UserRole } from './types';
import { AlertTriangle } from 'lucide-react';

interface ErrorBoundaryProps { children?: ReactNode; }
interface ErrorBoundaryState { hasError: boolean; }

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError(_: Error) { return { hasError: true }; }
  componentDidCatch(error: Error, errorInfo: ErrorInfo) { console.error("Error:", error, errorInfo); }
  render() {
    if (this.state.hasError) return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-8 text-center">
        <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2">系统遇到问题</h1>
        <button onClick={() => window.location.reload()} className="px-6 py-2 bg-blue-600 text-white rounded-lg">刷新</button>
      </div>
    );
    return this.props.children;
  }
}

const App: React.FC = () => {
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [currentTeacher, setCurrentTeacher] = useState<Teacher | null>(null);
  const [currentStudent, setCurrentStudent] = useState<Student | null>(null);

  useEffect(() => {
    // Check LocalStorage for persistent session
    const storedTeacher = localStorage.getItem('teacher_session');
    const storedStudent = localStorage.getItem('student_session');

    if (storedTeacher) {
      setCurrentTeacher(JSON.parse(storedTeacher));
      setUserRole('teacher');
    } else if (storedStudent) {
      setCurrentStudent(JSON.parse(storedStudent));
      setUserRole('student');
    }
  }, []);

  const handleTeacherLogin = (teacher: Teacher) => {
     setCurrentTeacher(teacher);
     setUserRole('teacher');
     localStorage.setItem('teacher_session', JSON.stringify(teacher));
     localStorage.removeItem('student_session');
  };
  
  const handleUpdateTeacher = (updates: Partial<Teacher>) => {
      if (!currentTeacher) return;
      const updated = { ...currentTeacher, ...updates };
      setCurrentTeacher(updated);
      localStorage.setItem('teacher_session', JSON.stringify(updated));
  };

  const handleStudentLogin = (student: Student) => {
     setCurrentStudent(student);
     setUserRole('student');
     localStorage.setItem('student_session', JSON.stringify(student));
     localStorage.removeItem('teacher_session');
  };

  const handleLogout = () => {
    setCurrentTeacher(null);
    setCurrentStudent(null);
    setUserRole(null);
    localStorage.removeItem('teacher_session');
    localStorage.removeItem('student_session');
  };

  return (
    <ErrorBoundary>
      <div className="antialiased text-slate-900 font-sans">
        {!userRole && (
           <Login onTeacherLogin={handleTeacherLogin} onStudentLogin={handleStudentLogin} />
        )}

        {userRole === 'teacher' && currentTeacher && (
           <Dashboard 
             teacher={currentTeacher} 
             onLogout={handleLogout} 
             onUpdateTeacher={handleUpdateTeacher} 
           />
        )}

        {userRole === 'student' && currentStudent && (
           <StudentDashboard student={currentStudent} onLogout={handleLogout} />
        )}
      </div>
    </ErrorBoundary>
  );
};

export default App;
