import React, { useState, useEffect, ErrorInfo, ReactNode, Component } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import { Teacher } from './types';
import { TEACHERS } from './constants';
import { AlertTriangle } from 'lucide-react';

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

// Error Boundary to prevent white screen crashes
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-800 p-8 text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
          <h1 className="text-2xl font-bold mb-2">系统遇到了一点小问题</h1>
          <p className="text-slate-500 mb-4">请尝试刷新页面</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors"
          >
            刷新页面
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const App: React.FC = () => {
  // Load teachers from localStorage or use default
  const [teachers, setTeachers] = useState<Teacher[]>(() => {
    try {
      const saved = localStorage.getItem('smart_edu_teachers');
      return saved ? JSON.parse(saved) : TEACHERS;
    } catch (e) {
      return TEACHERS;
    }
  });

  const [currentTeacher, setCurrentTeacher] = useState<Teacher | null>(null);

  // Persist changes whenever teachers list updates
  useEffect(() => {
    localStorage.setItem('smart_edu_teachers', JSON.stringify(teachers));
  }, [teachers]);

  const handleLogin = (teacher: Teacher) => {
    setCurrentTeacher(teacher);
  };

  const handleLogout = () => {
    setCurrentTeacher(null);
  };

  const handleUpdateTeacher = (updates: Partial<Teacher>) => {
    if (currentTeacher) {
      const updatedTeacher = { ...currentTeacher, ...updates };
      setCurrentTeacher(updatedTeacher);
      
      // Update the master list so persistence works
      setTeachers(prev => prev.map(t => t.id === updatedTeacher.id ? updatedTeacher : t));
    }
  };

  return (
    <ErrorBoundary>
      <div className="antialiased text-slate-900">
        {currentTeacher ? (
          <Dashboard 
            teacher={currentTeacher} 
            onLogout={handleLogout} 
            onUpdateTeacher={handleUpdateTeacher} 
          />
        ) : (
          <Login onLogin={handleLogin} teachers={teachers} />
        )}
      </div>
    </ErrorBoundary>
  );
};

export default App;