import React, { useState, useEffect, useRef } from 'react';
import { Teacher, ViewState, Homework, LessonPlan } from '../types';
import { MOCK_STUDENTS, MOCK_HOMEWORK, MOCK_EXAMS } from '../constants';
import { generateGradingSuggestion, generateStudentAnalysis, generateLessonPlan } from '../services/geminiService';
import { 
  LayoutDashboard, PenTool, FileText, TrendingUp, LogOut, CheckCircle, 
  Clock, Brain, ChevronRight, Sparkles, Menu, X, Search, Bell, GraduationCap, 
  Calendar, BarChart3, Users, ChevronDown, ArrowLeft, MoreHorizontal, Zap, Loader2, Camera,
  Mic, Send, Printer, Share2, Award, ListFilter, CheckSquare, Presentation, Plus
} from 'lucide-react';

interface DashboardProps {
  teacher: Teacher;
  onLogout: () => void;
  onUpdateTeacher?: (updates: Partial<Teacher>) => void;
}

// --- Smooth Curve Chart (Fix Deformed Lines) ---
const SmoothLineChart = ({ data }: { data: any[] }) => {
    const scores = data.map(d => d.averageScore || d.score);
    const max = 100;
    const min = 60;
    
    // Calculate points coordinates
    const points = scores.map((score, i) => {
        const x = (i / (scores.length - 1)) * 100;
        const y = 100 - ((score - min) / (max - min)) * 100;
        return { x, y };
    });

    // Generate Catmull-Rom like smooth path
    const getPath = (points: {x: number, y: number}[]) => {
        if (points.length === 0) return "";
        
        let d = `M ${points[0].x} ${points[0].y}`;
        
        for (let i = 0; i < points.length - 1; i++) {
            const p0 = points[i === 0 ? 0 : i - 1];
            const p1 = points[i];
            const p2 = points[i + 1];
            const p3 = points[i + 2] || p2;

            const cp1x = p1.x + (p2.x - p0.x) / 6;
            const cp1y = p1.y + (p2.y - p0.y) / 6;

            const cp2x = p2.x - (p3.x - p1.x) / 6;
            const cp2y = p2.y - (p3.y - p1.y) / 6;

            d += ` C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${p2.x} ${p2.y}`;
        }
        return d;
    };

    const pathD = getPath(points);
    // Area fill path
    const areaD = `${pathD} L 100 100 L 0 100 Z`;

    return (
        <div className="w-full h-full relative flex flex-col justify-end overflow-hidden rounded-2xl">
             {/* Grid Lines */}
             <div className="absolute inset-0 flex flex-col justify-between py-4 pointer-events-none opacity-20 z-0">
                 {[100, 90, 80, 70, 60].map(val => (
                    <div key={val} className="border-t border-slate-400 w-full flex items-center">
                        <span className="text-[10px] text-slate-500 -mt-4 pl-1">{val}</span>
                    </div>
                 ))}
             </div>
             
             <svg className="w-full h-full overflow-visible z-10" viewBox="0 0 100 100" preserveAspectRatio="none">
                <defs>
                    <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#3b82f6" />
                        <stop offset="100%" stopColor="#8b5cf6" />
                    </linearGradient>
                    <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2"/>
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0"/>
                    </linearGradient>
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="1" result="coloredBlur"/>
                        <feMerge>
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                    </filter>
                </defs>
                
                {/* Area Fill */}
                <path d={areaD} fill="url(#areaGradient)" />

                {/* Line */}
                <path 
                    d={pathD} 
                    fill="none" 
                    stroke="url(#lineGradient)" 
                    strokeWidth="1.5" 
                    vectorEffect="non-scaling-stroke"
                    filter="url(#glow)"
                    className="drop-shadow-lg"
                />

                {/* Points */}
                 {points.map((p, i) => (
                    <g key={i}>
                        <circle cx={p.x} cy={p.y} r="1.5" fill="white" stroke="#3b82f6" strokeWidth="0.5" vectorEffect="non-scaling-stroke" className="hover:r-3 transition-all" />
                        <text x={p.x} y={p.y - 5} fontSize="3" textAnchor="middle" fill="#475569" fontWeight="bold" className="opacity-0 hover:opacity-100 transition-opacity select-none">{scores[i]}</text>
                    </g>
                 ))}
             </svg>
             <div className="flex justify-between mt-2 text-xs text-slate-400 font-bold px-1">
                 {data.map((d, i) => (
                     <span key={i}>{d.date ? d.date.split('-').slice(1).join('/') : d.name || `T${i+1}`}</span>
                 ))}
             </div>
        </div>
    );
};

const CssBarChart = () => {
    const data = [
        { label: '90-100', val: 35, color: 'bg-green-500' },
        { label: '80-89', val: 50, color: 'bg-blue-500' },
        { label: '70-79', val: 15, color: 'bg-orange-400' },
        { label: '<60', val: 5, color: 'bg-red-500' },
    ];

    return (
        <div className="w-full h-full flex items-end justify-around gap-4 px-4 pb-2">
            {data.map((d, i) => (
                <div key={i} className="flex flex-col items-center gap-2 w-full group">
                    <div className="relative w-full bg-slate-100 rounded-t-xl overflow-hidden h-40 flex items-end">
                        <div 
                            className={`w-full ${d.color} opacity-80 group-hover:opacity-100 transition-all duration-1000 ease-out`}
                            style={{ height: `${d.val}%` }}
                        ></div>
                    </div>
                    <span className="text-xs font-bold text-slate-400">{d.label}</span>
                </div>
            ))}
        </div>
    )
}

const Dashboard: React.FC<DashboardProps> = ({ teacher, onLogout, onUpdateTeacher }) => {
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.DASHBOARD);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Homework State
  const [homeworkList, setHomeworkList] = useState<Homework[]>(MOCK_HOMEWORK);
  const [gradingId, setGradingId] = useState<string | null>(null);
  const [gradingLoading, setGradingLoading] = useState(false);
  const [homeworkTab, setHomeworkTab] = useState<'all' | 'pending' | 'graded'>('all');
  
  // Analysis State
  const [selectedStudentId, setSelectedStudentId] = useState<string>(MOCK_STUDENTS[0].id);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  
  // Lesson Prep State
  const [lessonTopic, setLessonTopic] = useState('');
  const [lessonPlan, setLessonPlan] = useState<LessonPlan | null>(null);
  const [lessonLoading, setLessonLoading] = useState(false);

  const [animateIn, setAnimateIn] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setAnimateIn(true);
  }, [currentView]);

  const pendingCount = homeworkList.filter(h => h.status === 'pending').length;
  const gradedCount = homeworkList.filter(h => h.status === 'graded').length;

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUpdateTeacher) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onUpdateTeacher({ avatar: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAIGrading = async (hw: Homework) => {
    setGradingLoading(true);
    const student = MOCK_STUDENTS.find(s => s.id === hw.studentId);
    if (!student) {
        setGradingLoading(false);
        return;
    }

    const result = await generateGradingSuggestion(teacher.subject, student.name, hw.content);
    
    // Simulate slight delay for "Processing" feel
    setTimeout(() => {
        setHomeworkList(prev => prev.map(h => {
          if (h.id === hw.id) {
            return { 
              ...h, 
              status: 'graded', 
              score: result.score, 
              feedback: result.feedback,
              aiAnalysis: "AI 自动批改完成"
            };
          }
          return h;
        }));
        setGradingLoading(false);
        // Keep Expanded to show result
    }, 1500);
  };

  const handleAnalysis = async () => {
    setAnalysisLoading(true);
    const student = MOCK_STUDENTS.find(s => s.id === selectedStudentId);
    if (student) {
      const result = await generateStudentAnalysis(student.name, teacher.subject, student.recentScores);
      setAnalysisResult(result);
    }
    setAnalysisLoading(false);
  };

  const handleGenerateLesson = async () => {
    if (!lessonTopic) return;
    setLessonLoading(true);
    const plan = await generateLessonPlan(lessonTopic, teacher.subject);
    setLessonPlan(plan);
    setLessonLoading(false);
  };

  const NavItem = ({ view, icon: Icon, label }: { view: ViewState; icon: any; label: string }) => (
    <button
      onClick={() => {
        if(currentView !== view) setAnimateIn(false);
        setTimeout(() => {
            setCurrentView(view);
            setMobileMenuOpen(false);
            setSelectedExamId(null);
        }, 100);
      }}
      className={`group w-full flex items-center space-x-3 px-6 py-4 transition-all duration-300 rounded-2xl mb-2 relative overflow-hidden ${
        currentView === view 
          ? 'text-white shadow-xl shadow-blue-500/20' 
          : 'text-slate-500 hover:bg-white/50 hover:text-blue-600'
      }`}
    >
      {currentView === view && (
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl animate-in fade-in zoom-in-95 duration-300" />
      )}
      <Icon className={`w-5 h-5 relative z-10 transition-transform duration-300 ${currentView === view ? 'text-white' : 'group-hover:scale-110'}`} />
      <span className="font-bold relative z-10">{label}</span>
    </button>
  );

  const containerClass = `transition-all duration-500 transform ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`;

  const renderContent = () => {
    switch (currentView) {
      case ViewState.DASHBOARD:
        return (
          <div className={containerClass}>
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
              <div className="stagger-1 animate-in fade-in slide-in-from-bottom-4">
                <h2 className="text-4xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                  Hello, {teacher.name} <span className="text-2xl animate-bounce">👋</span>
                </h2>
                <p className="text-slate-500 mt-2 font-medium flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  系统运行正常 · {teacher.subject}教研组
                </p>
              </div>
              <div className="flex gap-4 stagger-2 animate-in fade-in slide-in-from-bottom-4">
                 <button className="glass-panel p-3 rounded-2xl text-slate-600 hover:text-blue-600 transition-colors relative">
                    <Bell className="w-6 h-6" />
                    <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                 </button>
                 <div className="glass-panel px-6 py-3 rounded-2xl flex items-center gap-3 font-bold text-slate-700">
                   <Calendar className="w-5 h-5 text-blue-500" />
                   {new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })}
                 </div>
              </div>
            </div>
            
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {[
                { label: '待批改', value: pendingCount, icon: Clock, color: 'text-orange-500', bg: 'bg-orange-500/10', sub: '较昨日 +5' },
                { label: '已完成', value: gradedCount, icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/10', sub: '本周累计' },
                { label: '平均分', value: '88.5', icon: TrendingUp, color: 'text-blue-500', bg: 'bg-blue-500/10', sub: '较上月 +1.2' },
                { label: '学生数', value: MOCK_STUDENTS.length, icon: Users, color: 'text-purple-500', bg: 'bg-purple-500/10', sub: '三年级二班' }
              ].map((stat, idx) => (
                <div key={idx} className={`glass-panel p-6 rounded-3xl glass-card-hover stagger-${idx+1} animate-in fade-in zoom-in-95 fill-mode-backwards`}>
                  <div className="flex items-center justify-between mb-6">
                    <div className={`p-4 rounded-2xl ${stat.bg}`}>
                      <stat.icon className={`w-7 h-7 ${stat.color}`} />
                    </div>
                    <MoreHorizontal className="text-slate-300 w-5 h-5" />
                  </div>
                  <div className="flex items-baseline gap-2">
                     <span className="text-4xl font-black text-slate-800">{stat.value}</span>
                     {stat.label === '平均分' && <span className="text-sm text-slate-400 font-bold">分</span>}
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <h3 className="text-slate-500 font-bold text-sm">{stat.label}</h3>
                    <span className="text-xs font-bold px-2 py-1 rounded-lg bg-white/50 text-slate-500 border border-white/50">{stat.sub}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Main Chart */}
            <div className="glass-panel p-8 rounded-3xl animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300 relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-32 bg-blue-500/5 rounded-full blur-3xl group-hover:bg-blue-500/10 transition-colors duration-500"></div>
              <div className="flex items-center justify-between mb-6 relative z-10">
                <div>
                   <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                     <BarChart3 className="w-6 h-6 text-blue-600" />
                     班级成绩走势图
                   </h3>
                   <p className="text-slate-400 font-medium mt-1">最近8次大型考试综合分析</p>
                </div>
                <button className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl text-sm font-bold transition-colors">
                    导出报表
                </button>
              </div>
              
              <div className="h-[350px] w-full relative z-10 px-4">
                <SmoothLineChart data={MOCK_EXAMS} />
              </div>
            </div>
          </div>
        );

      case ViewState.HOMEWORK:
        const filteredHomework = homeworkList.filter(h => {
            if (homeworkTab === 'all') return true;
            return h.status === homeworkTab;
        });

        return (
          <div className={containerClass}>
            <div className="flex flex-col md:flex-row justify-between items-end mb-8 stagger-1">
              <div>
                <h2 className="text-3xl font-black text-slate-800">作业智能批改中心</h2>
                <p className="text-slate-500 font-medium mt-2">SmartEdu AI Pro Edition 3.0</p>
              </div>
              <div className="flex items-center gap-4 mt-4 md:mt-0">
                  <button className="px-4 py-2 bg-white/60 rounded-xl text-slate-600 text-sm font-bold hover:bg-white hover:text-blue-600 transition-all flex items-center gap-2">
                     <Bell className="w-4 h-4" /> 一键催交
                  </button>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-all flex items-center gap-2">
                     <Zap className="w-4 h-4" /> 批量 AI 预批
                  </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-6 mb-8 border-b border-slate-200/50 pb-2">
                {[
                    { id: 'all', label: '全部作业' },
                    { id: 'pending', label: '待批改' },
                    { id: 'graded', label: '已完成' },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setHomeworkTab(tab.id as any)}
                        className={`text-sm font-bold pb-2 relative transition-all ${homeworkTab === tab.id ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        {tab.label}
                        {homeworkTab === tab.id && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-full animate-in fade-in slide-in-from-left-2" />}
                    </button>
                ))}
            </div>
            
            <div className="space-y-6">
              {filteredHomework.map((hw, index) => {
                const student = MOCK_STUDENTS.find(s => s.id === hw.studentId);
                if (!student) return null;
                
                const isExpanded = gradingId === hw.id;

                return (
                  <div 
                    key={hw.id} 
                    className={`glass-panel rounded-3xl overflow-hidden transition-all duration-500 ${isExpanded ? 'ring-4 ring-blue-500/20 scale-[1.01] shadow-2xl' : 'hover:scale-[1.005] hover:bg-white/80'} stagger-${(index%5)+1} animate-in fade-in slide-in-from-bottom-8 fill-mode-backwards`}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div 
                      className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 cursor-pointer"
                      onClick={() => setGradingId(isExpanded ? null : hw.id)}
                    >
                      <div className="flex items-center space-x-5">
                        <div className="relative">
                          <img src={student.avatar} alt="" className="w-16 h-16 rounded-2xl shadow-md object-cover bg-white" />
                          <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center ${hw.status === 'pending' ? 'bg-orange-500' : 'bg-green-500'}`}>
                             {hw.status === 'graded' && <CheckCircle className="w-3 h-3 text-white" />}
                          </div>
                        </div>
                        <div>
                          <h3 className="font-bold text-xl text-slate-800">{student.name}</h3>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs px-2.5 py-1 bg-slate-100/80 rounded-lg text-slate-500 font-bold">{student.grade}</span>
                            <span className="text-xs text-slate-400 font-medium">{hw.title}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6">
                         <div className="text-right hidden md:block">
                            <p className="text-xs text-slate-400 font-bold">提交时间</p>
                            <p className="text-sm font-bold text-slate-600">{hw.submittedAt}</p>
                         </div>
                         {hw.status === 'graded' ? (
                           <div className="flex flex-col items-center px-5 py-2 bg-green-50/50 rounded-2xl border border-green-100/50 relative">
                             <span className="text-2xl font-black text-green-600">{hw.score}</span>
                             <span className="text-[10px] text-green-600 font-bold uppercase tracking-wider">SCORE</span>
                             {/* A+ Stamp */}
                             {(hw.score || 0) >= 90 && (
                                <div className="absolute -top-4 -right-4 w-12 h-12 bg-red-500 text-white rounded-full flex items-center justify-center font-black rotate-12 shadow-lg border-2 border-white animate-in zoom-in spin-in-12 duration-500">
                                    A+
                                </div>
                             )}
                           </div>
                         ) : (
                           <div className="px-5 py-3 bg-orange-50/50 rounded-2xl border border-orange-100/50 flex items-center gap-2 text-orange-600 font-bold text-sm">
                             <div className="w-2 h-2 bg-orange-500 rounded-full animate-ping"></div>
                             待批改
                           </div>
                         )}
                         <div className={`w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center transition-all duration-300 ${isExpanded ? 'bg-blue-500 text-white rotate-90' : 'text-slate-400 group-hover:bg-blue-50'}`}>
                           <ChevronRight className="w-5 h-5" />
                         </div>
                      </div>
                    </div>

                    {/* Expandable Grading Area */}
                    <div className={`overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] ${isExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                      <div className="border-t border-slate-100 p-8 bg-gradient-to-b from-slate-50/50 to-white/50">
                        <div className="grid md:grid-cols-2 gap-10">
                           {/* Student Content */}
                           <div className="glass-panel p-6 rounded-2xl relative group">
                              <div className="flex items-center justify-between mb-4">
                                  <h4 className="text-sm font-bold text-blue-900 flex items-center gap-2">
                                    <FileText className="w-4 h-4" />
                                    作业原件
                                  </h4>
                                  <button className="text-slate-400 hover:text-blue-500 transition-colors">
                                      <Share2 className="w-4 h-4" />
                                  </button>
                              </div>
                              <div className="bg-slate-50/80 p-5 rounded-xl border border-slate-100 font-mono text-sm leading-relaxed text-slate-700 min-h-[200px] whitespace-pre-wrap">
                                {hw.content}
                              </div>
                           </div>

                           {/* Grading Control */}
                           <div className="flex flex-col justify-center">
                             {hw.status === 'pending' ? (
                               <div className="space-y-6">
                                  <div className="bg-white/60 p-6 rounded-2xl border border-slate-200/50">
                                     <h4 className="text-sm font-bold text-slate-600 mb-4">快捷评价标签</h4>
                                     <div className="flex flex-wrap gap-2">
                                        {['字迹工整', '计算准确', '逻辑清晰', '需加强练习', '进步很大'].map(tag => (
                                            <button key={tag} className="px-3 py-1 bg-white border border-slate-200 rounded-full text-xs font-bold text-slate-500 hover:border-blue-500 hover:text-blue-500 transition-all active:scale-95">
                                                + {tag}
                                            </button>
                                        ))}
                                     </div>
                                  </div>

                                  <div className="text-center py-6 relative">
                                    <button
                                      onClick={() => handleAIGrading(hw)}
                                      disabled={gradingLoading}
                                      className="relative z-10 w-full flex items-center justify-center gap-3 bg-slate-900 text-white px-8 py-4 rounded-2xl shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all disabled:opacity-70 group overflow-hidden"
                                    >
                                      <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                      {gradingLoading ? (
                                        <Loader2 className="w-5 h-5 animate-spin relative z-10" />
                                      ) : (
                                        <Sparkles className="w-5 h-5 relative z-10 group-hover:text-yellow-300 transition-colors" />
                                      )}
                                      <span className="font-bold relative z-10">{gradingLoading ? 'AI 正在批阅中...' : '启动 AI 智能批改'}</span>
                                    </button>
                                    <p className="text-xs text-slate-400 mt-3 font-medium">支持手写识别 OCR 与语义分析</p>
                                  </div>
                               </div>
                             ) : (
                               <div className="glass-panel p-0 rounded-2xl overflow-hidden shadow-lg animate-in fade-in slide-in-from-right-8 duration-500">
                                  <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-1"></div>
                                  <div className="p-6">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-green-100 rounded-lg">
                                                <Brain className="w-5 h-5 text-green-600" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-800">批改完成</h4>
                                                <p className="text-xs text-slate-400">已同步至学生端</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-blue-500" title="语音评语">
                                                <Mic className="w-4 h-4" />
                                            </button>
                                            <button className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-green-500" title="发送给家长">
                                                <Send className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-4">
                                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 relative">
                                            <div className="absolute -left-1 top-4 w-1 h-8 bg-green-500 rounded-r-full"></div>
                                            <p className="text-xs font-bold text-slate-400 uppercase mb-2 ml-2">评语</p>
                                            <p className="text-slate-700 text-sm leading-relaxed font-medium ml-2">"{hw.feedback}"</p>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-3">
                                            <button className="py-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-500 hover:bg-slate-50 flex items-center justify-center gap-2">
                                                <Printer className="w-3 h-3" /> 打印报告
                                            </button>
                                            <button className="py-2 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-blue-600 flex items-center justify-center gap-2 transition-colors">
                                                <CheckSquare className="w-3 h-3" /> 修改评分
                                            </button>
                                        </div>
                                    </div>
                                  </div>
                               </div>
                             )}
                           </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );

      case ViewState.EXAMS:
        if (selectedExamId) {
          const exam = MOCK_EXAMS.find(e => e.id === selectedExamId);
          return (
             <div className={containerClass}>
                <button onClick={() => setSelectedExamId(null)} className="flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors mb-6 group">
                   <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                     <ArrowLeft className="w-4 h-4" />
                   </div>
                   <span className="font-bold">返回列表</span>
                </button>
                
                <div className="glass-panel p-8 rounded-3xl flex justify-between items-center mb-6 relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
                   <div className="relative z-10">
                      <h2 className="text-3xl font-black text-slate-800">{exam?.title}</h2>
                      <div className="flex items-center gap-4 mt-3">
                         <span className="bg-white/60 px-3 py-1 rounded-lg text-sm font-bold text-slate-600 flex items-center gap-2">
                            <Calendar className="w-4 h-4" /> {exam?.date}
                         </span>
                         <span className="bg-white/60 px-3 py-1 rounded-lg text-sm font-bold text-slate-600 flex items-center gap-2">
                            <Users className="w-4 h-4" /> {MOCK_STUDENTS.length} 人参考
                         </span>
                      </div>
                   </div>
                   <div className="text-right relative z-10">
                      <p className="text-sm text-slate-400 font-bold uppercase tracking-widest mb-1">AVERAGE SCORE</p>
                      <p className="text-5xl font-black text-blue-600 tracking-tighter">{exam?.averageScore}</p>
                   </div>
                </div>

                <div className="glass-panel rounded-3xl overflow-hidden shadow-xl">
                   <table className="w-full text-left">
                      <thead className="bg-slate-50/80 border-b border-slate-100 backdrop-blur-sm">
                         <tr>
                            <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-wider">学生信息</th>
                            <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-wider">学号</th>
                            <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-wider text-right">考试分数</th>
                            <th className="px-8 py-5 text-xs font-black text-slate-400 uppercase tracking-wider text-right">班级排名</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100/50">
                         {MOCK_STUDENTS.map((student, idx) => {
                           // Mock varied scores based on average
                           const score = Math.min(100, Math.max(60, Math.floor(exam!.averageScore + (Math.sin(idx) * 15))));
                           return (
                             <tr key={student.id} className="hover:bg-blue-50/30 transition-colors group">
                                <td className="px-8 py-5 flex items-center gap-4">
                                   <div className="relative">
                                      <img src={student.avatar} className="w-10 h-10 rounded-full bg-white shadow-sm group-hover:scale-110 transition-transform" alt="" />
                                   </div>
                                   <span className="font-bold text-slate-700">{student.name}</span>
                                </td>
                                <td className="px-8 py-5 text-slate-500 font-mono text-sm">{student.id.toUpperCase()}</td>
                                <td className="px-8 py-5 text-right font-black text-slate-800 text-lg">{score}</td>
                                <td className="px-8 py-5 text-right text-slate-500 font-bold">#{idx + 1}</td>
                             </tr>
                           );
                         })}
                      </tbody>
                   </table>
                </div>
             </div>
          )
        }

        return (
          <div className={containerClass}>
            <div className="flex justify-between items-center mb-8 stagger-1">
              <div>
                <h2 className="text-3xl font-black text-slate-800">试卷管理归档</h2>
                <p className="text-slate-500 font-medium mt-2">查看班级历史考试数据与成绩分布</p>
              </div>
              <button className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl hover:bg-blue-600 hover:shadow-lg hover:shadow-blue-500/30 transition-all font-bold group">
                <div className="bg-white/20 p-1 rounded group-hover:rotate-90 transition-transform">
                    <FileText className="w-4 h-4" />
                </div>
                <span>录入新试卷</span>
              </button>
            </div>

            <div className="grid grid-cols-1 gap-6 mb-10">
              {MOCK_EXAMS.map((exam, idx) => (
                <div 
                    key={exam.id} 
                    onClick={() => setSelectedExamId(exam.id)} 
                    className={`glass-panel p-6 rounded-3xl flex flex-col md:flex-row items-center justify-between gap-6 glass-card-hover cursor-pointer group stagger-${(idx%4)+1} animate-in fade-in slide-in-from-bottom-4 fill-mode-backwards`}
                    style={{ animationDelay: `${idx * 100}ms` }}
                >
                  <div className="flex items-center gap-6 w-full md:w-auto">
                    <div className="p-5 bg-gradient-to-br from-indigo-500 to-blue-600 text-white rounded-2xl shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform duration-300">
                      <FileText className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-800 group-hover:text-blue-600 transition-colors">{exam.title}</h3>
                      <div className="flex items-center gap-3 mt-1 text-sm font-medium text-slate-400">
                         <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {exam.date}</span>
                         <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                         <span>期中检测</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-10 w-full md:w-auto justify-between md:justify-end pr-4">
                    <div className="text-center">
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">AVG SCORE</p>
                      <p className="text-2xl font-black text-blue-600">{exam.averageScore}</p>
                    </div>
                    <div className="w-12 h-12 rounded-full border border-slate-200 flex items-center justify-center group-hover:bg-blue-600 group-hover:border-blue-600 group-hover:text-white transition-all duration-300">
                      <ChevronRight className="w-5 h-5" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Score Distribution */}
            <div className="glass-panel p-8 rounded-3xl animate-in fade-in slide-in-from-bottom-8 delay-500">
              <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                 <BarChart3 className="w-5 h-5 text-blue-500" />
                 成绩分布透视
              </h3>
              <div className="h-64">
                <CssBarChart />
              </div>
            </div>
          </div>
        );

      case ViewState.LESSON_PREP:
        return (
          <div className={containerClass}>
             <div className="mb-8 stagger-1">
                <h2 className="text-3xl font-black text-slate-800">AI 智能备课中心</h2>
                <p className="text-slate-500 font-medium mt-2">输入课程单元，一键生成 PPT 讲课大纲</p>
             </div>

             {/* Input Area */}
             <div className="glass-panel p-8 rounded-3xl mb-8 flex flex-col md:flex-row items-end gap-4 stagger-2 animate-in fade-in slide-in-from-bottom-4">
                <div className="w-full">
                   <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">备课主题 / 单元名称</label>
                   <div className="relative">
                      <input 
                         type="text" 
                         value={lessonTopic}
                         onChange={(e) => setLessonTopic(e.target.value)}
                         placeholder="例如：三年级数学《分数的认识》、语文《静夜思》..."
                         className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 pl-12 pr-4 font-bold text-lg focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                      />
                      <Presentation className="absolute top-5 left-4 w-5 h-5 text-slate-400" />
                   </div>
                </div>
                <button 
                  onClick={handleGenerateLesson}
                  disabled={lessonLoading || !lessonTopic}
                  className="w-full md:w-auto bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold shadow-xl hover:bg-blue-600 hover:-translate-y-1 transition-all disabled:opacity-50 flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  {lessonLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5 text-yellow-300" />}
                  {lessonLoading ? '正在生成课件...' : '生成大纲'}
                </button>
             </div>

             {/* Result Area */}
             {lessonPlan && (
                <div className="stagger-3 animate-in fade-in slide-in-from-bottom-8">
                   <div className="flex items-center justify-between mb-6">
                      <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                         <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                             <Presentation className="w-6 h-6" />
                         </div>
                         {lessonPlan.topic}
                      </h3>
                      <button className="text-blue-600 font-bold text-sm hover:underline">下载 PPTX 源文件</button>
                   </div>
                   
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {lessonPlan.outline.map((slide, idx) => (
                         <div key={idx} className="glass-panel p-6 rounded-3xl relative overflow-hidden group hover:-translate-y-2 transition-transform duration-300">
                            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-400 to-indigo-500"></div>
                            <span className="absolute top-4 right-4 text-6xl font-black text-slate-100 -z-10 group-hover:text-blue-50 transition-colors">
                                {String(idx + 1).padStart(2, '0')}
                            </span>
                            
                            <h4 className="text-lg font-bold text-slate-800 mb-4">{slide.title}</h4>
                            <ul className="space-y-3 mb-6">
                               {slide.points.map((point, pIdx) => (
                                  <li key={pIdx} className="flex items-start gap-2 text-sm text-slate-600 font-medium leading-relaxed">
                                     <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-1.5 shrink-0"></span>
                                     {point}
                                  </li>
                               ))}
                            </ul>
                            
                            <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-100">
                               <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> {slide.duration}
                               </span>
                               <button className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-blue-500 transition-colors">
                                  <MoreHorizontal className="w-4 h-4" />
                               </button>
                            </div>
                         </div>
                      ))}
                      
                      {/* Add New Slide Button */}
                      <button className="border-4 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center p-8 hover:border-blue-300 hover:bg-blue-50 transition-all group min-h-[300px]">
                         <div className="w-12 h-12 rounded-full bg-slate-100 group-hover:bg-blue-200 flex items-center justify-center text-slate-400 group-hover:text-blue-600 transition-colors mb-3">
                            <Plus className="w-6 h-6" />
                         </div>
                         <span className="font-bold text-slate-400 group-hover:text-blue-600">添加幻灯片</span>
                      </button>
                   </div>
                </div>
             )}
          </div>
        );

      case ViewState.ANALYSIS:
        const currentStudent = MOCK_STUDENTS.find(s => s.id === selectedStudentId);
        // Prepare chart data for CSS Chart
        const chartData = currentStudent?.recentScores.map((score, index) => ({
          name: `T${index + 1}`,
          score
        })) || [];

        return (
          <div className={`${containerClass} h-[calc(100vh-140px)] flex flex-col`}>
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-6">
              <div>
                <h2 className="text-3xl font-black text-slate-800">定点优化辅导系统</h2>
                <p className="text-slate-500 font-medium mt-1">SmartEdu · 个性化学习诊断引擎</p>
              </div>
              <div className="relative group min-w-[240px]">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                   <Search className="w-4 h-4 text-slate-400" />
                </div>
                <select 
                  value={selectedStudentId}
                  onChange={(e) => {
                    setSelectedStudentId(e.target.value);
                    setAnalysisResult(null);
                  }}
                  className="w-full appearance-none bg-white/80 backdrop-blur border border-slate-200 text-slate-700 py-3 pl-10 pr-12 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold shadow-sm cursor-pointer hover:border-blue-400 transition-colors"
                >
                  {MOCK_STUDENTS.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.grade})</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                   <ChevronDown className="w-4 h-4 text-slate-400" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1 min-h-0">
              {/* Left Column: Student Profile & Chart */}
              <div className="glass-panel p-8 rounded-3xl flex flex-col animate-in fade-in slide-in-from-left-8 duration-700">
                 <div className="flex items-center gap-6 mb-8">
                   <div className="relative">
                      <div className="absolute inset-0 bg-blue-500 blur-xl opacity-20 rounded-full"></div>
                      <img src={currentStudent?.avatar} className="relative w-24 h-24 rounded-2xl shadow-lg bg-white object-cover" alt="avatar" />
                   </div>
                   <div>
                     <h3 className="text-3xl font-black text-slate-800">{currentStudent?.name}</h3>
                     <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs bg-indigo-50 text-indigo-600 px-3 py-1 rounded-lg font-bold border border-indigo-100">重点关注对象</span>
                        <p className="text-slate-400 text-sm font-medium">最近 5 次测验数据</p>
                     </div>
                   </div>
                 </div>
                 
                 <div className="flex-1 min-h-[250px] relative px-4">
                    <div className="absolute top-0 right-0 flex gap-2">
                       <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                       <span className="text-xs text-slate-400 font-bold">成绩走势</span>
                    </div>
                    {/* Replaced with CSS Chart */}
                    <SmoothLineChart data={chartData} />
                 </div>
              </div>

              {/* Right Column: AI Analysis */}
              <div className="glass-panel p-0 rounded-3xl flex flex-col h-full overflow-hidden border-0 shadow-2xl shadow-blue-500/10 animate-in fade-in slide-in-from-right-8 duration-700">
                <div className="bg-slate-900 p-6 text-white flex justify-between items-center relative overflow-hidden">
                   <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-20"></div>
                   <h3 className="text-lg font-bold flex items-center gap-3 relative z-10">
                    <div className="p-2 bg-white/10 rounded-lg backdrop-blur-md">
                        <Sparkles className="w-5 h-5 text-yellow-300" />
                    </div>
                    AI 辅导方案生成器
                  </h3>
                </div>

                <div className="flex-1 bg-white/60 p-8 overflow-y-auto relative scroll-smooth">
                  {analysisResult ? (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                      <div className="space-y-6">
                        <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-100">
                          <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-lg">
                              <Brain className="w-5 h-5 text-blue-500" />
                              深度诊断报告
                          </h4>
                          <div className="prose prose-sm prose-slate max-w-none whitespace-pre-line leading-loose text-slate-600 font-medium">
                            {analysisResult}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
                      <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6 relative">
                        <Brain className="w-8 h-8 text-slate-400" />
                        {analysisLoading && <div className="absolute inset-0 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>}
                      </div>
                      <h4 className="text-slate-800 font-bold text-lg mb-2">{analysisLoading ? '正在运算数据...' : '等待生成指令'}</h4>
                      <p className="text-slate-400 text-sm max-w-xs leading-relaxed">
                        AI 引擎将对比 {MOCK_STUDENTS.length} 位同学的数据模型，为 {currentStudent?.name} 生成专属提分方案。
                      </p>
                    </div>
                  )}
                </div>

                <div className="p-6 bg-white/80 border-t border-slate-100 backdrop-blur">
                  <button
                    onClick={handleAnalysis}
                    disabled={analysisLoading}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-2xl font-bold shadow-xl shadow-blue-500/30 hover:shadow-blue-500/50 hover:-translate-y-1 active:scale-95 transition-all disabled:opacity-70 flex items-center justify-center gap-3"
                  >
                    {analysisLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>AI 神经网络计算中...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        <span>{analysisResult ? '重新生成诊断' : '启动 AI 诊断分析'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex min-h-screen relative overflow-hidden">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-80 h-full fixed left-0 top-0 z-50 glass-panel border-r border-white/40 shadow-2xl">
        <div className="p-10 flex items-center gap-4">
           <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
             <GraduationCap className="w-7 h-7" />
           </div>
           <div>
             <span className="text-xl font-black text-slate-800 tracking-tight block">新达小学</span>
             <span className="text-[10px] text-blue-500 uppercase tracking-[0.2em] font-bold">Smart System</span>
           </div>
        </div>
        
        <div className="flex-1 px-6 py-4 space-y-1 overflow-y-auto">
          <p className="px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">MAIN MENU</p>
          <NavItem view={ViewState.DASHBOARD} icon={LayoutDashboard} label="工作台概览" />
          <NavItem view={ViewState.LESSON_PREP} icon={Presentation} label="智能备课" />
          <NavItem view={ViewState.HOMEWORK} icon={PenTool} label="作业批改" />
          <NavItem view={ViewState.EXAMS} icon={FileText} label="考试分析" />
          <NavItem view={ViewState.ANALYSIS} icon={TrendingUp} label="定点辅导" />
        </div>

        <div className="p-6 mt-auto">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-4 text-white shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 bg-white/10 rounded-full blur-xl group-hover:bg-white/20 transition-all"></div>
            <div className="flex items-center gap-3 mb-4 relative z-10">
                {/* Hidden File Input for Avatar Change */}
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*"
                    onChange={handleFileChange}
                />
                <div className="relative cursor-pointer group-hover:scale-105 transition-transform" onClick={handleAvatarClick}>
                    <img src={teacher.avatar} alt="User" className="w-10 h-10 rounded-full border-2 border-slate-600 object-cover bg-white" />
                    <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera className="w-4 h-4 text-white" />
                    </div>
                </div>
                <div>
                    <p className="font-bold text-sm">{teacher.name}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">{teacher.subject} TEACHER</p>
                </div>
            </div>
            <button 
                onClick={onLogout}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/10 hover:bg-red-500/80 hover:text-white text-xs font-bold transition-all"
            >
                <LogOut className="w-3 h-3" /> 退出系统
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 w-full glass-panel z-50 flex items-center justify-between p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
             <GraduationCap className="w-5 h-5" />
          </div>
          <span className="text-lg font-bold text-slate-800">新达小学</span>
        </div>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 text-slate-600 active:bg-slate-100 rounded-lg">
          {mobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-white/95 backdrop-blur-xl z-40 pt-24 px-6 space-y-2 md:hidden animate-in fade-in slide-in-from-top-10 duration-300">
           <NavItem view={ViewState.DASHBOARD} icon={LayoutDashboard} label="工作台概览" />
           <NavItem view={ViewState.LESSON_PREP} icon={Presentation} label="智能备课" />
           <NavItem view={ViewState.HOMEWORK} icon={PenTool} label="作业批改" />
           <NavItem view={ViewState.EXAMS} icon={FileText} label="考试分析" />
           <NavItem view={ViewState.ANALYSIS} icon={TrendingUp} label="定点辅导" />
           <div className="pt-8 border-t border-slate-100 mt-8">
             <button onClick={onLogout} className="w-full flex items-center justify-center space-x-3 px-6 py-4 bg-red-50 text-red-600 rounded-2xl font-bold">
               <LogOut className="w-5 h-5" />
               <span>退出登录</span>
             </button>
           </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 md:ml-80 p-4 md:p-12 pt-24 md:pt-12 min-h-screen transition-all">
        <div className="max-w-[1600px] mx-auto">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;