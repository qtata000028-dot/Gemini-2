
import React, { useState, useEffect, useRef } from 'react';
import { Teacher, ViewState, Homework, LessonPlan, Student, Exam, Textbook, PresentationSlide, QuizQuestion, Subject } from '../types';
import { generateGradingSuggestion, generateStudentAnalysis, generateLessonPlan, generatePPTSlides, generateQuiz, generateEducationalImage } from '../services/geminiService';
import { dataService } from '../services/dataService';
import { 
  LayoutDashboard, PenTool, TrendingUp, LogOut, 
  Presentation, Users, SendHorizontal, Trash2, UserPlus, 
  Loader2, Sparkles, CheckCircle, Clock, ChevronRight, ChevronDown,
  FileText, CloudUpload, Image as ImageIcon, X, CheckSquare, Search, Camera,
  FileSpreadsheet, ArrowDownCircle, AlertCircle, Book, FileCheck, Play, Download, BrainCircuit,
  Palette, Wand2
} from 'lucide-react';
import * as XLSX from 'xlsx';
import PptxGenJS from 'pptxgenjs';

interface DashboardProps {
  teacher: Teacher;
  onLogout: () => void;
  onUpdateTeacher: (updates: Partial<Teacher>) => void;
}

// --- Custom Components ---

const StudentSearch = ({ 
    students, 
    selectedId, 
    onSelect 
}: { 
    students: Student[]; 
    selectedId: string; 
    onSelect: (id: string) => void; 
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const selectedStudent = students.find(s => s.id === selectedId);
    const filtered = students.filter(s => s.name.includes(query) || s.grade.includes(query));

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (!isOpen && selectedStudent) setQuery('');
    }, [isOpen, selectedStudent]);

    return (
        <div className="relative w-full z-30" ref={containerRef}>
            <div 
                className={`flex items-center gap-3 w-full p-4 bg-[#1e293b] border rounded-xl cursor-text transition-all ${isOpen ? 'border-blue-500 ring-1 ring-blue-500/50' : 'border-white/10 hover:border-white/30'}`}
                onClick={() => { setIsOpen(true); inputRef.current?.focus(); }}
            >
                <Search className={`w-5 h-5 ${isOpen ? 'text-blue-400' : 'text-slate-400'}`} />
                <input 
                    ref={inputRef}
                    type="text"
                    value={isOpen ? query : (selectedStudent?.name || '')}
                    onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
                    onFocus={() => setIsOpen(true)}
                    placeholder={selectedStudent ? selectedStudent.name : "搜索学生姓名..."}
                    className="bg-transparent border-none outline-none text-white font-bold placeholder-slate-500 w-full text-sm"
                />
                <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>
            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-[#1e293b]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl max-h-64 overflow-y-auto custom-scrollbar">
                    {filtered.length === 0 ? (
                        <div className="p-4 text-center text-slate-500 text-sm">未找到 "{query}"</div>
                    ) : (
                        filtered.map(s => (
                            <div 
                                key={s.id}
                                onClick={() => { onSelect(s.id); setIsOpen(false); setQuery(''); }}
                                className={`p-3 flex items-center gap-3 cursor-pointer border-b border-white/5 last:border-0 ${selectedId === s.id ? 'bg-blue-600/20' : 'hover:bg-white/5'}`}
                            >
                                <img src={s.avatar} className="w-8 h-8 rounded-full bg-slate-800 object-cover" />
                                <div>
                                    <p className={`text-sm font-bold ${selectedId === s.id ? 'text-blue-400' : 'text-white'}`}>{s.name}</p>
                                    <p className="text-xs text-slate-500">{s.grade}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

const SmoothLineChart = ({ data }: { data: any[] }) => {
    const scores = data.map(d => d.averageScore || d.score || 0).reverse(); // Reverse for chronological order if needed
    const max = 100;
    const min = 50; 
    
    if (scores.length === 0) return <div className="w-full h-full flex items-center justify-center text-slate-400 font-bold">暂无考试数据</div>;

    const points = scores.map((score, i) => {
        const x = (i / (Math.max(scores.length - 1, 1))) * 100;
        const y = 100 - ((score - min) / (max - min)) * 100;
        return { x, y };
    });

    const getPath = (points: {x: number, y: number}[]) => {
        if (points.length === 0) return "";
        if (points.length === 1) return `M ${points[0].x} ${points[0].y} L ${points[0].x + 1} ${points[0].y}`;
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
    const areaD = `${pathD} L 100 100 L 0 100 Z`;

    return (
        <div className="w-full h-full relative flex flex-col justify-end overflow-hidden rounded-2xl select-none">
             <div className="absolute inset-0 z-10">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <defs>
                        <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#60a5fa" />
                            <stop offset="100%" stopColor="#a78bfa" />
                        </linearGradient>
                        <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.3"/>
                            <stop offset="100%" stopColor="#60a5fa" stopOpacity="0"/>
                        </linearGradient>
                    </defs>
                    <path d={areaD} fill="url(#areaGradient)" />
                    <path d={pathD} fill="none" stroke="url(#lineGradient)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
                </svg>
             </div>
             <div className="absolute inset-0 z-20 pointer-events-none">
                 {points.map((p, i) => (
                    <div key={i} className="absolute w-3 h-3 bg-[#1e293b] border-2 border-blue-400 rounded-full shadow-[0_0_10px_rgba(96,165,250,0.5)] transform -translate-x-1/2 -translate-y-1/2 hover:scale-150 transition-transform duration-300" style={{ left: `${p.x}%`, top: `${p.y}%` }}></div>
                 ))}
             </div>
        </div>
    );
};


const Dashboard: React.FC<DashboardProps> = ({ teacher, onLogout, onUpdateTeacher }) => {
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.DASHBOARD);
  
  const [students, setStudents] = useState<Student[]>([]);
  const [homeworkList, setHomeworkList] = useState<Homework[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [textbooks, setTextbooks] = useState<Textbook[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Teacher Profile
  const [updatingAvatar, setUpdatingAvatar] = useState(false);

  // Assignment Publishing
  const [assignTitle, setAssignTitle] = useState('');
  const [assignDesc, setAssignDesc] = useState('');
  const [assignClass, setAssignClass] = useState('三年级二班');
  const [assignFile, setAssignFile] = useState(''); 
  const [uploadingFile, setUploadingFile] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [fileProgress, setFileProgress] = useState<{status: string; percent: number; loaded: string; total: string} | null>(null);

  // Student Mgmt
  const [newStudentName, setNewStudentName] = useState('');
  const [addingStudent, setAddingStudent] = useState(false);

  // Grading
  const [expandedHomeworkId, setExpandedHomeworkId] = useState<string | null>(null);
  const [gradingLoading, setGradingLoading] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  
  // Analysis
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  
  // Lesson Plan
  const [lessonTopic, setLessonTopic] = useState('');
  const [selectedTextbookId, setSelectedTextbookId] = useState<string>('');
  const [lessonPlan, setLessonPlan] = useState<LessonPlan | null>(null);
  const [lessonLoading, setLessonLoading] = useState(false);
  const [uploadingTextbook, setUploadingTextbook] = useState(false);
  const [textbookProgress, setTextbookProgress] = useState<{status: string; percent: number; loaded: string; total: string} | null>(null);
  
  // Lesson Plan Extended Features
  const [generatingSlides, setGeneratingSlides] = useState(false);
  const [showSlidePreview, setShowSlidePreview] = useState(false);
  const [slides, setSlides] = useState<PresentationSlide[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  
  // New Image Generation State
  const [generatingImages, setGeneratingImages] = useState(false);
  const [imageGenProgress, setImageGenProgress] = useState(0);

  const [generatingQuiz, setGeneratingQuiz] = useState(false);
  const [quiz, setQuiz] = useState<QuizQuestion[]>([]);

  // Exam
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [expandedExamId, setExpandedExamId] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
        if(students.length === 0) setLoadingData(true);
        try {
            const data = await dataService.fetchDashboardData();
            setStudents(data.students);
            setHomeworkList(data.homeworkList);
            setExams(data.exams);
            if (data.students.length > 0 && !selectedStudentId) setSelectedStudentId(data.students[0].id);
            if (data.exams.length > 0) setSelectedExamId(data.exams[0].id);
            
            // Load textbooks
            const tb = await dataService.fetchTextbooks(teacher.id);
            setTextbooks(tb);
        } catch (error) {
            console.error("Failed load", error);
        } finally {
            setLoadingData(false);
        }
    }
    loadData();
  }, [teacher.id]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleAvatarUpdate = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setUpdatingAvatar(true);
      try {
          const newUrl = await dataService.updateTeacherAvatar(teacher.id, file);
          onUpdateTeacher({ avatar: newUrl });
      } catch (e) {
          alert("头像更新失败");
      } finally {
          setUpdatingAvatar(false);
      }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFile(true);
    setFileProgress({ status: '准备中', percent: 0, loaded: '0 B', total: formatBytes(file.size) });
    
    try {
        const url = await dataService.uploadFile(file, 'homeworks', (status, percent, loaded, total) => {
            let statusText = status === 'compressing' ? '智能压缩中...' : '正在上传...';
            if (percent === 100) statusText = '完成';
            setFileProgress({ status: statusText, percent, loaded: formatBytes(loaded), total: formatBytes(total) });
        });
        setAssignFile(url);
    } catch (e: any) {
        alert("上传失败: " + e.message);
        setFileProgress(null);
    } finally {
        setUploadingFile(false);
    }
  };

  const handleTextbookUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setUploadingTextbook(true);
      setTextbookProgress({ status: '准备中', percent: 0, loaded: '0 B', total: formatBytes(file.size) });

      try {
          await dataService.uploadTextbook(teacher.id, file, (status, percent, loaded, total) => {
              let statusText = status === 'compressing' ? '处理中...' : '上传中...';
              if (percent === 100) statusText = '完成';
              setTextbookProgress({ status: statusText, percent, loaded: formatBytes(loaded), total: formatBytes(total) });
          });
          const tb = await dataService.fetchTextbooks(teacher.id);
          setTextbooks(tb);
      } catch (e: any) {
          alert("教材上传失败: " + e.message);
          setTextbookProgress(null);
      } finally {
          setUploadingTextbook(false);
      }
  };

  const handlePublishAssignment = async () => {
      setPublishing(true);
      try {
          await dataService.createAssignment(teacher.id, {
              title: assignTitle,
              description: assignDesc,
              classTarget: assignClass,
              attachmentUrl: assignFile
          });
          alert("作业发布成功！");
          setAssignTitle('');
          setAssignDesc('');
          setAssignFile('');
          setFileProgress(null);
      } catch (e) {
          alert("发布失败，请重试");
      } finally {
          setPublishing(false);
      }
  };

  const handleAddStudent = async () => {
      setAddingStudent(true);
      try {
          await dataService.addStudent(newStudentName, '三年级', '三年级二班');
          const data = await dataService.fetchDashboardData();
          setStudents(data.students);
          setNewStudentName('');
      } catch(e) {
          alert("添加失败");
      } finally {
          setAddingStudent(false);
      }
  };

  const handleDeleteStudent = async (id: string) => {
      if(!confirm("确定删除该学生吗？")) return;
      try {
          await dataService.deleteStudent(id);
          setStudents(prev => prev.filter(s => s.id !== id));
      } catch(e) { alert("删除失败"); }
  };

  const handleAIGrading = async (hw: Homework) => {
    setGradingLoading(true);
    const student = students.find(s => s.id === hw.studentId);
    if (!student) { setGradingLoading(false); return; }
    const result = await generateGradingSuggestion(teacher.subject, student.name, hw.content);
    
    setTimeout(async () => {
        const updatedHw = { ...hw, status: 'graded' as const, score: result.score, feedback: result.feedback, aiAnalysis: "AI 自动批改完成" };
        setHomeworkList(prev => prev.map(h => h.id === hw.id ? updatedHw : h));
        setGradingLoading(false);
        await dataService.updateHomework(hw.id, updatedHw);
    }, 1500);
  };

  const handleAnalysis = async () => {
    setAnalysisLoading(true);
    const student = students.find(s => s.id === selectedStudentId);
    if (student) {
      const result = await generateStudentAnalysis(student.name, teacher.subject, student.recentScores);
      setAnalysisResult(result);
    }
    setAnalysisLoading(false);
  };

  const handleGenerateLesson = async () => {
    if (!lessonTopic) return;
    setLessonLoading(true);
    setSlides([]);
    setQuiz([]);
    const context = textbooks.find(t => t.id === selectedTextbookId)?.title;
    const plan = await generateLessonPlan(lessonTopic, teacher.subject, context);
    setLessonPlan(plan);
    setLessonLoading(false);
    if (plan) await dataService.createLessonPlan(teacher.id, plan);
  };

  const handleGenerateSlides = async () => {
    if (!lessonPlan) return;
    setGeneratingSlides(true);
    // 1. Generate Text Structure
    const generatedSlides = await generatePPTSlides(lessonPlan.topic, lessonPlan.objectives, teacher.subject);
    setSlides(generatedSlides);
    setGeneratingSlides(false);
    setShowSlidePreview(true);

    // 2. Trigger Image Generation in Background
    handleGenerateImages(generatedSlides);
  };

  const handleGenerateImages = async (currentSlides: PresentationSlide[]) => {
      if (currentSlides.length === 0) return;
      setGeneratingImages(true);
      setImageGenProgress(0);

      // We will generate:
      // 1. One "Cover" image for the title slide.
      // 2. One "Theme" image for the content slides to maintain consistency and speed.
      // 3. (Optional) Images for each slide if possible, but let's stick to Title + Theme + maybe 2 key slides to be fast.
      // Strategy: Generate image for Title (Index 0) and a generic one for Index 1 (and reuse).
      
      const newSlides = [...currentSlides];
      const totalToGen = newSlides.length;

      // Parallel Limit: Generate for all slides but sequence carefully or map.
      // To provide "High Level" experience, we want each slide to have a background.
      
      for (let i = 0; i < newSlides.length; i++) {
          const prompt = newSlides[i].visualPrompt || `${lessonPlan?.topic} educational abstract background`;
          // Use the real banana model (gemini-2.5-flash-image)
          const base64Image = await generateEducationalImage(prompt);
          if (base64Image) {
              newSlides[i].backgroundImage = base64Image;
          }
          setSlides([...newSlides]); // Update state to trigger re-render
          setImageGenProgress(Math.round(((i + 1) / totalToGen) * 100));
      }

      setGeneratingImages(false);
  };

  const handleDownloadPPT = async () => {
    if (slides.length === 0) return;
    try {
        const pres = new PptxGenJS();
        pres.layout = 'LAYOUT_16x9';
        
        // Define Theme Colors based on subject
        const themeColor = teacher.subject === Subject.MATH ? '2563EB' 
                       : teacher.subject === Subject.CHINESE ? 'DC2626' 
                       : '9333EA';

        // Helper to add background
        const addBackground = (slide: PptxGenJS.Slide, imgData?: string) => {
            if (imgData) {
                // Full screen background image
                slide.addImage({ data: imgData, x: 0, y: 0, w: '100%', h: '100%' });
                // Add a glassmorphism overlay to ensure text readability
                slide.addShape(pres.ShapeType.rect, { 
                    x: 0, y: 0, w: '100%', h: '100%', 
                    fill: { color: 'FFFFFF', transparency: 15 } // Light overlay
                });
            } else {
                 // Fallback gradient
                 slide.background = { color: 'F1F5F9' };
            }
        };

        // Generate Slides
        for (let i = 0; i < slides.length; i++) {
            const s = slides[i];
            const slide = pres.addSlide();

            // 1. Add Background (AI Generated)
            addBackground(slide, s.backgroundImage);

            // 2. Add Content based on Layout
            if (s.layout === 'TITLE') {
                // Frosted Glass Card for Title
                slide.addShape(pres.ShapeType.rect, {
                    x: 1.5, y: 2, w: 7, h: 3.5,
                    fill: { color: 'FFFFFF', transparency: 20 },
                    rectRadius: 0.5,
                    shadow: { type: 'outer', color: '000000', blur: 10, offset: 5, opacity: 0.3 }
                });

                slide.addText(s.title, { 
                    x: 1.5, y: 2.5, w: 7, h: 1.5, 
                    fontSize: 44, bold: true, color: '1E293B', align: 'center', fontFace: 'Arial' 
                });
                
                slide.addText(`主讲人：${teacher.name}`, {
                    x: 1.5, y: 4, w: 7, h: 0.5,
                    fontSize: 20, color: '334155', align: 'center'
                });

            } else {
                // Content Slide Layout
                
                // Header Bar (Glass style)
                slide.addShape(pres.ShapeType.rect, {
                    x: 0.5, y: 0.3, w: 9, h: 1,
                    fill: { color: 'FFFFFF', transparency: 10 },
                    rectRadius: 0.2
                });

                slide.addText(s.title, { 
                    x: 0.7, y: 0.3, w: 8, h: 1, 
                    fontSize: 32, bold: true, color: themeColor, fontFace: 'Arial' 
                });

                // Content Box (Left)
                slide.addShape(pres.ShapeType.rect, {
                    x: 0.5, y: 1.5, w: 5.5, h: 5,
                    fill: { color: 'FFFFFF', transparency: 15 },
                    rectRadius: 0.2
                });

                // Bullets
                const contentText = s.content.map(c => ({ text: c, options: { breakLine: true, bullet: { code: '2022' } } }));
                slide.addText(contentText, {
                    x: 0.7, y: 1.7, w: 5, h: 4.5,
                    fontSize: 20, color: '0F172A', fontFace: 'Arial', lineSpacing: 32, bold: true
                });
                
                // Right side Decorative Box (if image didn't load, or just to balance layout)
                // If we have a background image, we don't need a separate image on the right, 
                // but let's add a translucent shape to look "High Tech"
                slide.addShape(pres.ShapeType.rect, {
                    x: 6.2, y: 1.5, w: 3.3, h: 5,
                    fill: { color: themeColor, transparency: 85 },
                    line: { color: themeColor, width: 2 },
                    rectRadius: 0.2
                });
                
                slide.addText("Knowledge Point", {
                    x: 6.2, y: 3.5, w: 3.3, h: 1,
                    align: 'center', color: themeColor, fontSize: 14, rotate: -45, transparency: 50
                });
            }

            // Footer / Slide Number
            slide.addText(`${i + 1}`, { x: 9.2, y: 7.2, w: 0.5, h: 0.3, fontSize: 10, color: '64748B' });
            if (s.notes) slide.addNotes(s.notes);
        }

        pres.writeFile({ fileName: `${lessonPlan?.topic || 'Smart_Lesson'}_${teacher.name}.pptx` });
    } catch (e) {
        console.error("PPT Gen Error", e);
        alert("PPT 生成中断，建议减少页数重试。");
    }
  };

  const handleGenerateQuiz = async () => {
    if (!lessonPlan) return;
    setGeneratingQuiz(true);
    const generatedQuiz = await generateQuiz(lessonPlan.topic, lessonPlan.keyPoints);
    setQuiz(generatedQuiz);
    setGeneratingQuiz(false);
  };

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if(!file) return;
      try {
          const buffer = await file.arrayBuffer();
          await dataService.parseAndSaveExamExcel(buffer, file.name);
          const data = await dataService.fetchDashboardData();
          setExams(data.exams);
          setSelectedExamId(data.exams[0]?.id || '');
          alert("考试数据导入成功");
      } catch(e: any) {
          alert("导入失败: " + e.message);
      }
  };

  const NavItem = ({ view, icon: Icon, label }: { view: ViewState; icon: any; label: string }) => (
    <button
      onClick={() => setCurrentView(view)}
      className={`group w-full flex items-center space-x-3 px-6 py-4 transition-all duration-200 rounded-2xl mb-2 relative overflow-hidden ${currentView === view ? 'text-white shadow-[0_0_20px_rgba(59,130,246,0.3)]' : 'text-slate-400 hover:text-blue-200 hover:bg-white/5'}`}
    >
      {currentView === view && (
         <div className="absolute inset-0 bg-gradient-to-r from-blue-600/80 to-indigo-600/80 backdrop-blur-md"></div>
      )}
      <Icon className={`w-5 h-5 relative z-10 transition-transform group-hover:scale-110 ${currentView === view ? 'animate-pulse' : ''}`} />
      <span className="font-bold relative z-10">{label}</span>
      {currentView === view && <div className="absolute right-4 w-2 h-2 bg-blue-400 rounded-full shadow-[0_0_10px_#60a5fa] animate-ping"></div>}
    </button>
  );

  const selectedExamData = exams.find(e => e.id === selectedExamId);

  return (
    <div className="min-h-screen bg-[#0f172a] text-white flex overflow-hidden font-sans selection:bg-blue-500/30">
      
      {/* Sidebar */}
      <div className="w-72 relative z-20 flex flex-col border-r border-white/5 bg-[#0f172a]/80 backdrop-blur-xl">
        {/* ... Sidebar Profile & Nav ... */}
        <div className="p-8">
          <div className="flex items-center space-x-4 mb-10 group cursor-pointer relative">
             <div className="relative">
                 <img src={teacher.avatar} alt="Avatar" className="w-16 h-16 rounded-2xl object-cover ring-2 ring-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.2)] transition-all group-hover:scale-105" />
                 <label className="absolute inset-0 bg-black/60 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer backdrop-blur-[2px]">
                    <Camera className="w-6 h-6 text-white mb-1" />
                    <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpdate} disabled={updatingAvatar} />
                 </label>
                 {updatingAvatar && (
                     <div className="absolute inset-0 bg-black/60 rounded-2xl flex items-center justify-center">
                         <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                     </div>
                 )}
             </div>
             <div>
                <h2 className="text-xl font-black tracking-tight">{teacher.name}</h2>
                <span className="text-xs font-bold text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded-full">{teacher.subject}教师</span>
             </div>
          </div>
          
          <nav className="space-y-1">
            <NavItem view={ViewState.DASHBOARD} icon={LayoutDashboard} label="工作台概览" />
            <NavItem view={ViewState.HOMEWORK} icon={PenTool} label="作业批改" />
            <NavItem view={ViewState.STUDENTS} icon={Users} label="学生档案管理" />
            <NavItem view={ViewState.PUBLISH} icon={SendHorizontal} label="发布新作业" />
            <NavItem view={ViewState.ANALYSIS} icon={TrendingUp} label="定点辅导分析" />
            <NavItem view={ViewState.LESSON_PREP} icon={Presentation} label="AI 智能备课" />
          </nav>
        </div>

        <div className="mt-auto p-6 border-t border-white/5">
           <button onClick={onLogout} className="flex items-center space-x-3 text-slate-500 hover:text-red-400 transition-colors w-full px-4 py-3 rounded-xl hover:bg-red-500/5 group">
             <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
             <span className="font-bold">退出系统</span>
           </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 relative z-10 overflow-hidden flex flex-col">
         <header className="px-8 py-6 flex justify-between items-center border-b border-white/5 bg-[#0f172a]/50 backdrop-blur-sm sticky top-0 z-20">
            <div>
               <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                  {currentView === ViewState.DASHBOARD && '考试数据分析'}
                  {currentView === ViewState.HOMEWORK && '智能作业批改'}
                  {currentView === ViewState.STUDENTS && '学生档案中心'}
                  {currentView === ViewState.PUBLISH && '发布新作业'}
                  {currentView === ViewState.ANALYSIS && 'AI 定点辅导分析'}
                  {currentView === ViewState.LESSON_PREP && '智能备课中心 (RAG)'}
               </h1>
            </div>
         </header>

         <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            
            {/* DASHBOARD VIEW */}
            {currentView === ViewState.DASHBOARD && (
               <div className="h-full flex flex-col lg:flex-row gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  {/* Left: Exam Archive */}
                  <div className="flex-1 lg:flex-[0.4] flex flex-col gap-6">
                      <div className="p-6 rounded-[2rem] bg-white/5 border border-white/10 hover:bg-white/10 transition-colors group">
                          <label className="flex flex-col items-center justify-center cursor-pointer">
                              <input type="file" accept=".xlsx" onChange={handleExcelUpload} className="hidden" />
                              <FileSpreadsheet className="w-10 h-10 text-green-400 mb-2 group-hover:scale-110 transition-transform" />
                              <h3 className="font-bold text-white">导入考试 Excel</h3>
                              <p className="text-xs text-slate-400">自动识别科目与分数</p>
                          </label>
                      </div>
                      <div className="flex-1 min-h-0 bg-white/5 border border-white/10 rounded-[2rem] p-6 overflow-hidden flex flex-col">
                          <h3 className="font-bold text-slate-300 mb-4 flex items-center gap-2"><Clock className="w-4 h-4 text-blue-400"/> 考试归档</h3>
                          <div className="overflow-y-auto custom-scrollbar space-y-3">
                              {exams.map(exam => (
                                  <div key={exam.id} className="rounded-xl overflow-hidden border border-white/5 bg-white/5">
                                      <div 
                                        onClick={() => { setExpandedExamId(expandedExamId === exam.id ? null : exam.id); setSelectedExamId(exam.id); }}
                                        className={`p-4 cursor-pointer flex items-center justify-between hover:bg-white/5 ${expandedExamId === exam.id ? 'bg-blue-600/20' : ''}`}
                                      >
                                          <div>
                                              <p className={`font-bold text-sm ${expandedExamId === exam.id ? 'text-blue-400' : 'text-white'}`}>{exam.title}</p>
                                              <p className="text-xs text-slate-500 mt-1">{exam.date} • Avg: {exam.averageScore}</p>
                                          </div>
                                          <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${expandedExamId === exam.id ? 'rotate-180' : ''}`} />
                                      </div>
                                      {expandedExamId === exam.id && exam.details && (
                                          <div className="border-t border-white/10 bg-black/20 p-4">
                                              <div className="overflow-x-auto">
                                                  <table className="w-full text-xs text-left text-slate-300">
                                                      <thead className="text-slate-500">
                                                          <tr>
                                                              <th className="py-2 px-2">姓名</th>
                                                              {exam.details.subjects.map(sub => <th key={sub} className="py-2 px-2">{sub}</th>)}
                                                              <th className="py-2 px-2 text-right">总分</th>
                                                          </tr>
                                                      </thead>
                                                      <tbody>
                                                          {exam.details.students.map((stu, i) => (
                                                              <tr key={i} className="border-b border-white/5 last:border-0">
                                                                  <td className="py-2 px-2 font-bold text-white">{stu.name}</td>
                                                                  {exam.details.subjects.map(sub => <td key={sub} className="py-2 px-2">{stu.scores[sub]}</td>)}
                                                                  <td className="py-2 px-2 text-right font-black text-blue-400">{stu.total}</td>
                                                              </tr>
                                                          ))}
                                                      </tbody>
                                                  </table>
                                              </div>
                                          </div>
                                      )}
                                  </div>
                              ))}
                          </div>
                      </div>
                  </div>
                  {/* Right: Chart */}
                  <div className="flex-1 lg:flex-[0.6] flex flex-col gap-6">
                      {selectedExamData && (
                          <div className="grid grid-cols-3 gap-4">
                              <div className="p-5 rounded-2xl bg-blue-500/10 border border-blue-500/20">
                                  <p className="text-xs text-blue-300 font-bold">平均分</p>
                                  <p className="text-3xl font-black text-blue-400">{selectedExamData.averageScore}</p>
                              </div>
                              <div className="p-5 rounded-2xl bg-purple-500/10 border border-purple-500/20">
                                  <p className="text-xs text-purple-300 font-bold">参考人数</p>
                                  <p className="text-3xl font-black text-purple-400">{selectedExamData.totalStudents}</p>
                              </div>
                              <div className="p-5 rounded-2xl bg-green-500/10 border border-green-500/20">
                                  <p className="text-xs text-green-300 font-bold">优秀率</p>
                                  <p className="text-3xl font-black text-green-400">42%</p>
                              </div>
                          </div>
                      )}
                      <div className="flex-1 bg-white/5 border border-white/10 rounded-[2rem] p-8 flex flex-col relative overflow-hidden">
                          <h3 className="font-bold text-lg mb-6 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-blue-400"/> 成绩走势</h3>
                          <div className="flex-1 min-h-[300px] relative z-10">
                              <SmoothLineChart data={exams} />
                          </div>
                      </div>
                  </div>
               </div>
            )}

            {/* LESSON PREP VIEW */}
            {currentView === ViewState.LESSON_PREP && (
               <div className="h-full flex flex-col lg:flex-row gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                   <div className="flex-1 lg:flex-[0.35] bg-white/5 border border-white/10 rounded-[2rem] p-6 flex flex-col">
                       <h3 className="font-bold text-slate-300 mb-6 flex items-center gap-2">
                           <Book className="w-5 h-5 text-orange-400" /> 教材知识库
                       </h3>
                       <label className={`w-full mb-6 p-4 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all group ${uploadingTextbook ? 'border-slate-600 bg-white/5' : 'border-white/10 hover:bg-white/5 hover:border-orange-500/50'}`}>
                           <input type="file" accept=".pdf" onChange={handleTextbookUpload} disabled={uploadingTextbook} className="hidden"/>
                           {uploadingTextbook && textbookProgress ? (
                               <div className="w-full">
                                   <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                                       <span>{textbookProgress.status}</span>
                                       <span>{Math.round(textbookProgress.percent)}%</span>
                                   </div>
                                   <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                                       <div className="h-full bg-orange-500 transition-all duration-300" style={{ width: `${textbookProgress.percent}%` }}></div>
                                   </div>
                               </div>
                           ) : (
                               <>
                                <CloudUpload className="text-slate-500 group-hover:text-orange-400 mb-2"/>
                                <span className="text-xs font-bold text-slate-500">上传教材 PDF</span>
                               </>
                           )}
                       </label>
                       <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
                           {textbooks.map(tb => (
                               <div 
                                   key={tb.id} 
                                   onClick={() => setSelectedTextbookId(tb.id)}
                                   className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${selectedTextbookId === tb.id ? 'bg-orange-600/20 border-orange-500/50' : 'bg-white/5 border-transparent hover:bg-white/10'}`}
                               >
                                   <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs ${selectedTextbookId === tb.id ? 'bg-orange-500 text-white' : 'bg-slate-800 text-slate-400'}`}>PDF</div>
                                   <div className="flex-1 min-w-0">
                                       <p className={`text-sm font-bold truncate ${selectedTextbookId === tb.id ? 'text-orange-300' : 'text-white'}`}>{tb.title}</p>
                                       <p className="text-[10px] text-slate-500">{new Date(tb.createdAt).toLocaleDateString()}</p>
                                   </div>
                               </div>
                           ))}
                       </div>
                   </div>
                   <div className="flex-1 lg:flex-[0.65] flex flex-col gap-6">
                       <div className="flex gap-4">
                           <input 
                               type="text" 
                               placeholder="输入单元/课题 (例如: 第四单元 万以内的加法)" 
                               value={lessonTopic}
                               onChange={e => setLessonTopic(e.target.value)}
                               className="flex-1 p-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold placeholder-slate-500 focus:border-orange-500 focus:outline-none"
                           />
                           <button onClick={handleGenerateLesson} disabled={lessonLoading || !lessonTopic} className="px-8 bg-gradient-to-r from-orange-500 to-rose-500 text-white rounded-2xl font-black flex items-center gap-2 shadow-lg shadow-orange-900/30 disabled:opacity-50">
                               {lessonLoading ? <Loader2 className="animate-spin"/> : <Sparkles />} 深度生成
                           </button>
                       </div>
                       
                       <div className="flex-1 bg-white/5 border border-white/10 rounded-[2rem] p-8 overflow-y-auto custom-scrollbar relative">
                           {lessonPlan ? (
                               <div className="prose prose-invert max-w-none">
                                   <div className="flex justify-between items-start mb-6">
                                       <div>
                                           <h1 className="text-2xl font-black text-orange-400 mb-2">{lessonPlan.topic}</h1>
                                           <p className="text-xs font-bold text-slate-500 bg-white/5 inline-block px-3 py-1 rounded-full">基于教材: {lessonPlan.textbookContext || '通用标准'}</p>
                                       </div>
                                       <div className="flex gap-2">
                                           <button 
                                                onClick={handleGenerateSlides}
                                                disabled={generatingSlides}
                                                className="px-4 py-2 bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 border border-blue-500/30 rounded-xl text-xs font-bold flex items-center gap-2 transition-all"
                                           >
                                                {generatingSlides ? <Loader2 className="w-3 h-3 animate-spin"/> : <Presentation className="w-3 h-3"/>}
                                                生成 PPT
                                           </button>
                                           <button 
                                                onClick={handleGenerateQuiz}
                                                disabled={generatingQuiz}
                                                className="px-4 py-2 bg-green-600/20 hover:bg-green-600/40 text-green-300 border border-green-500/30 rounded-xl text-xs font-bold flex items-center gap-2 transition-all"
                                           >
                                                {generatingQuiz ? <Loader2 className="w-3 h-3 animate-spin"/> : <BrainCircuit className="w-3 h-3"/>}
                                                生成习题 (10道)
                                           </button>
                                       </div>
                                   </div>

                                   <div className="space-y-8">
                                       {quiz.length > 0 && (
                                            <section className="bg-gradient-to-br from-green-500/10 to-teal-500/10 p-6 rounded-2xl border border-green-500/20 animate-in slide-in-from-top-4">
                                                <h3 className="text-lg font-bold text-green-400 mb-4 flex items-center gap-2"><BrainCircuit className="w-5 h-5"/> 课后趣味闯关 ({quiz.length}题)</h3>
                                                <div className="grid grid-cols-1 gap-4">
                                                    {quiz.map((q, i) => (
                                                        <div key={i} className="bg-black/20 p-5 rounded-xl border border-white/5 flex flex-col md:flex-row gap-4">
                                                            <div className="flex-1">
                                                                <div className="flex gap-2 mb-2 items-center">
                                                                    <span className="bg-green-500 text-black text-[10px] font-black px-1.5 py-0.5 rounded">Q{i+1}</span>
                                                                    <span className={`text-[10px] px-2 py-0.5 rounded border ${q.difficulty === '基础' ? 'border-blue-400/30 text-blue-300' : q.difficulty === '进阶' ? 'border-yellow-400/30 text-yellow-300' : 'border-red-400/30 text-red-300'}`}>{q.difficulty}</span>
                                                                    <p className="text-sm font-bold text-white ml-2">{q.question}</p>
                                                                </div>
                                                                <div className="grid grid-cols-2 gap-2 ml-8 mt-3">
                                                                    {q.options.map((opt, idx) => (
                                                                        <div key={idx} className={`text-xs p-2 rounded-lg flex items-center gap-2 ${idx === q.correctAnswer ? 'bg-green-500/10 text-green-300 ring-1 ring-green-500/30' : 'text-slate-400 bg-white/5'}`}>
                                                                            <span className="opacity-50">{String.fromCharCode(65+idx)}.</span> {opt}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                            <div className="md:w-1/3 bg-white/5 rounded-lg p-3 text-[10px] text-slate-400 flex flex-col justify-center">
                                                                <span className="text-slate-500 font-bold mb-1">💡 答案解析:</span>
                                                                {q.explanation}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </section>
                                       )}

                                       <section>
                                           <h3 className="text-lg font-bold text-white border-l-4 border-orange-500 pl-3 mb-4">一、教学目标</h3>
                                           <ul className="list-disc pl-5 space-y-2 text-slate-300 text-sm">{lessonPlan.objectives.map((o, i) => <li key={i}>{o}</li>)}</ul>
                                       </section>
                                       <section>
                                           <h3 className="text-lg font-bold text-white border-l-4 border-orange-500 pl-3 mb-4">二、重难点</h3>
                                           <div className="flex flex-wrap gap-2">{lessonPlan.keyPoints.map((k, i) => <span key={i} className="px-3 py-1 bg-orange-500/10 text-orange-300 text-xs font-bold rounded-lg border border-orange-500/20">{k}</span>)}</div>
                                       </section>
                                       <section>
                                           <h3 className="text-lg font-bold text-white border-l-4 border-orange-500 pl-3 mb-4">三、教学过程</h3>
                                           <div className="space-y-4">{lessonPlan.process.map((step, i) => (
                                                   <div key={i} className="bg-white/5 rounded-xl p-4 border border-white/5">
                                                       <div className="flex justify-between items-center mb-2"><span className="font-bold text-orange-300">{step.phase}</span><span className="text-xs bg-black/30 px-2 py-1 rounded text-slate-400">{step.duration}</span></div>
                                                       <p className="text-sm text-slate-300 leading-relaxed">{step.activity}</p>
                                                   </div>
                                               ))}</div>
                                       </section>
                                       <section className="grid grid-cols-2 gap-6">
                                            <div><h3 className="text-lg font-bold text-white border-l-4 border-orange-500 pl-3 mb-4">四、板书设计</h3><div className="bg-white/5 p-4 rounded-xl border-2 border-dashed border-slate-600 min-h-[100px] text-sm text-slate-300 font-mono whitespace-pre-line">{lessonPlan.blackboard.join('\n')}</div></div>
                                            <div><h3 className="text-lg font-bold text-white border-l-4 border-orange-500 pl-3 mb-4">五、作业布置</h3><div className="bg-white/5 p-4 rounded-xl text-sm text-slate-300">{lessonPlan.homework}</div></div>
                                       </section>
                                   </div>
                               </div>
                           ) : (
                               <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 opacity-30">
                                   <Presentation className="w-24 h-24 mb-4" />
                                   <p className="font-bold text-lg">请选择教材并输入课题</p>
                               </div>
                           )}
                       </div>
                   </div>
               </div>
            )}
            
            {/* PUBLISH VIEW */}
            {currentView === ViewState.PUBLISH && (
                <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-10 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
                            <SendHorizontal className="w-64 h-64 text-blue-500 -rotate-12" />
                        </div>
                        <h2 className="text-3xl font-black mb-8 relative z-10 flex items-center gap-3">
                            <SendHorizontal className="w-8 h-8 text-blue-400" /> 发布新作业
                        </h2>
                        
                        <div className="space-y-6 relative z-10">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-blue-300 uppercase tracking-wider ml-1">作业标题</label>
                                    <input type="text" value={assignTitle} onChange={e => setAssignTitle(e.target.value)} placeholder="例如：第三单元复习" className="w-full p-4 bg-black/20 border border-white/10 rounded-2xl text-white font-bold placeholder-white/20 focus:border-blue-500 focus:outline-none focus:bg-black/40 transition-all" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-blue-300 uppercase tracking-wider ml-1">目标班级</label>
                                    <input type="text" value={assignClass} onChange={e => setAssignClass(e.target.value)} className="w-full p-4 bg-black/20 border border-white/10 rounded-2xl text-white font-bold placeholder-white/20 focus:border-blue-500 focus:outline-none focus:bg-black/40 transition-all" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-blue-300 uppercase tracking-wider ml-1">作业描述 / 要求</label>
                                <textarea value={assignDesc} onChange={e => setAssignDesc(e.target.value)} placeholder="请输入具体的作业内容和要求..." className="w-full h-32 p-4 bg-black/20 border border-white/10 rounded-2xl text-white font-bold placeholder-white/20 focus:border-blue-500 focus:outline-none focus:bg-black/40 transition-all resize-none"></textarea>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-blue-300 uppercase tracking-wider ml-1">附件上传 (PDF/图片)</label>
                                <label className={`block w-full border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all group ${uploadingFile ? 'bg-white/5 border-slate-600 pointer-events-none' : 'border-white/20 hover:bg-white/5 hover:border-blue-500/50'}`}>
                                    <input type="file" onChange={handleFileUpload} disabled={uploadingFile} className="hidden" />
                                    {uploadingFile && fileProgress ? (
                                        <div className="w-full max-w-md">
                                            <div className="flex justify-between text-xs font-bold text-slate-400 mb-2">
                                                <span>{fileProgress.status}</span>
                                                <span>{Math.round(fileProgress.percent)}%</span>
                                            </div>
                                            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden mb-2">
                                                <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${fileProgress.percent}%` }}></div>
                                            </div>
                                            <div className="flex justify-between text-[10px] text-slate-500">
                                                <span>{fileProgress.loaded}</span>
                                                <span>{fileProgress.total}</span>
                                            </div>
                                        </div>
                                    ) : assignFile ? (
                                        <div className="flex items-center gap-3 text-green-400">
                                            <CheckCircle className="w-6 h-6" />
                                            <span className="font-bold">附件已上传成功</span>
                                            <span className="text-xs text-slate-500 underline ml-2">点击更换</span>
                                        </div>
                                    ) : (
                                        <>
                                            <CloudUpload className="w-8 h-8 text-slate-400 group-hover:text-blue-400 mb-2 transition-colors" />
                                            <span className="font-bold text-slate-400 group-hover:text-white transition-colors">点击上传文件</span>
                                        </>
                                    )}
                                </label>
                            </div>
                            <button onClick={handlePublishAssignment} disabled={!assignTitle || publishing} className="w-full py-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-blue-900/30 hover:shadow-blue-900/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                                {publishing ? <Loader2 className="animate-spin" /> : <SendHorizontal />} 立即发布作业
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Other views placeholders if needed, e.g. Homework Grading */}
            {currentView === ViewState.HOMEWORK && (
                 <div className="space-y-4">
                     {/* Reuse previous accordion logic but ensure dataService updates are used */}
                     {homeworkList.map(hw => {
                         const student = students.find(s => s.id === hw.studentId);
                         return (
                             <div key={hw.id} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                                 <div 
                                    onClick={() => setExpandedHomeworkId(expandedHomeworkId === hw.id ? null : hw.id)}
                                    className="p-6 cursor-pointer hover:bg-white/5 flex items-center justify-between"
                                 >
                                     <div className="flex items-center gap-4">
                                         <img src={student?.avatar} className="w-10 h-10 rounded-full" />
                                         <div>
                                             <h3 className="font-bold text-white">{hw.title}</h3>
                                             <p className="text-xs text-slate-400">{student?.name} • {new Date(hw.submittedAt).toLocaleDateString()}</p>
                                         </div>
                                     </div>
                                     <div className={`px-3 py-1 rounded-full text-xs font-bold ${hw.status === 'graded' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                         {hw.status === 'graded' ? '已批改' : '待批改'}
                                     </div>
                                 </div>
                                 {expandedHomeworkId === hw.id && (
                                     <div className="border-t border-white/10 bg-black/20 p-6 flex flex-col md:flex-row gap-8">
                                         <div className="flex-1 space-y-4">
                                             <div className="bg-white/5 p-4 rounded-xl text-sm text-slate-300 min-h-[100px]">{hw.content}</div>
                                             {hw.imageUrl && <img src={hw.imageUrl} className="w-full rounded-xl border border-white/10" />}
                                         </div>
                                         <div className="w-full md:w-80 space-y-4">
                                             <button onClick={() => handleAIGrading(hw)} disabled={gradingLoading || hw.status === 'graded'} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2">
                                                 {gradingLoading ? <Loader2 className="animate-spin"/> : <Sparkles />} AI 一键批改
                                             </button>
                                             {hw.status === 'graded' && (
                                                 <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-xl animate-in zoom-in">
                                                     <div className="text-center mb-2">
                                                         <span className="text-4xl font-black text-green-400">{hw.score}</span>
                                                         <span className="text-xs text-green-300 ml-1">分</span>
                                                     </div>
                                                     <p className="text-xs text-green-200">{hw.feedback}</p>
                                                 </div>
                                             )}
                                         </div>
                                     </div>
                                 )}
                             </div>
                         );
                     })}
                 </div>
            )}
            
            {currentView === ViewState.STUDENTS && (
                <div className="bg-white/5 border border-white/10 rounded-[2rem] p-8">
                    <div className="flex gap-4 mb-8">
                        <input type="text" value={newStudentName} onChange={e => setNewStudentName(e.target.value)} placeholder="输入学生姓名" className="flex-1 p-4 bg-black/20 border border-white/10 rounded-xl text-white font-bold"/>
                        <button onClick={handleAddStudent} disabled={addingStudent || !newStudentName} className="px-6 bg-blue-600 rounded-xl font-bold flex items-center gap-2"><UserPlus className="w-4 h-4"/> 添加</button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {students.map(s => (
                            <div key={s.id} className="p-4 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between group">
                                <div className="flex items-center gap-3">
                                    <img src={s.avatar} className="w-10 h-10 rounded-full bg-slate-800"/>
                                    <div>
                                        <p className="font-bold text-white">{s.name}</p>
                                        <p className="text-xs text-slate-500">{s.grade}</p>
                                    </div>
                                </div>
                                <button onClick={() => handleDeleteStudent(s.id)} className="p-2 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-4 h-4"/></button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {currentView === ViewState.ANALYSIS && (
                 <div className="flex flex-col gap-6 h-full">
                     <div className="flex gap-4 items-center bg-white/5 p-4 rounded-2xl border border-white/10">
                         <div className="w-64"><StudentSearch students={students} selectedId={selectedStudentId} onSelect={setSelectedStudentId} /></div>
                         <button onClick={handleAnalysis} disabled={analysisLoading} className="px-6 py-3 bg-purple-600 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-purple-900/30">
                             {analysisLoading ? <Loader2 className="animate-spin"/> : <TrendingUp />} 生成诊断报告
                         </button>
                     </div>
                     <div className="flex-1 bg-white/5 border border-white/10 rounded-[2.5rem] p-8 relative overflow-hidden">
                         {analysisResult ? (
                             <div className="prose prose-invert max-w-none">
                                 <h2 className="text-2xl font-black text-purple-400 mb-6 flex items-center gap-2"><Sparkles className="w-6 h-6"/> AI 辅导建议</h2>
                                 <div className="whitespace-pre-wrap text-slate-300 leading-relaxed text-lg">{analysisResult}</div>
                             </div>
                         ) : (
                             <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600">
                                 <TrendingUp className="w-24 h-24 mb-4 opacity-20" />
                                 <p className="font-bold">选择学生以获取分析</p>
                             </div>
                         )}
                     </div>
                 </div>
            )}

         </main>
      </div>

      {/* PPT Slide Preview Modal */}
      {showSlidePreview && slides.length > 0 && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
              <div className="w-full max-w-5xl bg-[#1e293b] rounded-2xl border border-white/10 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 h-[80vh]">
                  <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
                      <div className="flex items-center gap-4">
                          <h3 className="text-white font-bold flex items-center gap-2"><Presentation className="w-5 h-5 text-blue-400"/> PPT 智能预览</h3>
                          {generatingImages && (
                              <div className="flex items-center gap-2 px-3 py-1 bg-blue-500/20 rounded-full border border-blue-500/30">
                                  <Loader2 className="w-3 h-3 text-blue-400 animate-spin" />
                                  <span className="text-xs text-blue-300 font-bold">正在生成 AI 配图 {imageGenProgress}%</span>
                              </div>
                          )}
                      </div>
                      <button onClick={() => setShowSlidePreview(false)} className="text-slate-400 hover:text-white transition-colors"><X className="w-6 h-6"/></button>
                  </div>
                  
                  <div className="flex-1 relative bg-black/50 overflow-hidden flex items-center justify-center p-8">
                       {/* Slide Content Render */}
                       <div 
                         key={currentSlideIndex} 
                         className="relative w-full max-w-4xl aspect-video bg-white shadow-2xl rounded-lg overflow-hidden flex animate-in fade-in zoom-in-95 duration-300 select-none group"
                       >
                            {/* AI Background Image Layer */}
                            <div className="absolute inset-0 z-0 bg-slate-100">
                                {slides[currentSlideIndex].backgroundImage ? (
                                    <img 
                                        src={slides[currentSlideIndex].backgroundImage}
                                        alt="AI Background"
                                        className="w-full h-full object-cover transition-transform duration-[10s] group-hover:scale-110"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-slate-200">
                                        <ImageIcon className="w-12 h-12 text-slate-300" />
                                    </div>
                                )}
                                {/* Advanced Gradient Overlay for Text Readability */}
                                <div className="absolute inset-0 bg-gradient-to-r from-white/90 via-white/70 to-white/30 backdrop-blur-[2px]"></div>
                            </div>

                            {/* Content Layer */}
                            <div className="relative z-10 p-12 flex flex-col w-full h-full">
                                {slides[currentSlideIndex].layout === 'TITLE' ? (
                                    <div className="flex flex-col items-center justify-center h-full text-center">
                                         <div className="bg-white/40 backdrop-blur-xl border border-white/50 p-10 rounded-3xl shadow-2xl">
                                             <h1 className="text-5xl font-black text-slate-900 mb-4 tracking-tight drop-shadow-sm">{slides[currentSlideIndex].title}</h1>
                                             <div className="w-20 h-1 bg-blue-600 mx-auto rounded-full mb-6"></div>
                                             <p className="text-xl text-slate-600 font-bold">主讲人：{teacher.name}</p>
                                         </div>
                                    </div>
                                ) : (
                                    <div className="flex h-full gap-8">
                                        <div className="flex-1 flex flex-col justify-center">
                                            <div className="mb-8">
                                                <h2 className="text-4xl font-black text-blue-900 border-l-8 border-blue-500 pl-6 inline-block">{slides[currentSlideIndex].title}</h2>
                                            </div>
                                            <div className="bg-white/60 backdrop-blur-md p-8 rounded-2xl border border-white/40 shadow-lg">
                                                <ul className="space-y-6">
                                                    {slides[currentSlideIndex].content.map((point, i) => (
                                                        <li key={i} className="flex items-start gap-4 text-slate-800 text-xl font-medium">
                                                            <div className="w-2 h-2 rounded-full bg-blue-500 mt-2.5 shrink-0 shadow-[0_0_10px_#3b82f6]"></div>
                                                            <span className="leading-relaxed">{point}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                        {/* Right Decorative Area */}
                                        <div className="w-1/4 h-full flex flex-col justify-center items-center opacity-50">
                                            <div className="w-full h-full border-2 border-white/50 rounded-2xl"></div>
                                        </div>
                                    </div>
                                )}
                                
                                {/* Footer */}
                                <div className="absolute bottom-6 left-8 text-slate-400 text-xs font-bold tracking-widest uppercase">AI Smart Courseware • {teacher.subject}</div>
                                <div className="absolute bottom-6 right-8 text-slate-400 text-lg font-black font-mono">0{currentSlideIndex + 1}</div>
                            </div>
                       </div>
                  </div>

                  <div className="p-6 bg-white/5 border-t border-white/10 flex justify-between items-center">
                      <div className="flex gap-2">
                          <button onClick={() => setCurrentSlideIndex(Math.max(0, currentSlideIndex - 1))} disabled={currentSlideIndex === 0} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><ChevronDown className="w-5 h-5 rotate-90"/></button>
                          <span className="text-slate-400 font-bold px-4 flex items-center">{currentSlideIndex + 1} / {slides.length}</span>
                          <button onClick={() => setCurrentSlideIndex(Math.min(slides.length - 1, currentSlideIndex + 1))} disabled={currentSlideIndex === slides.length - 1} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"><ChevronDown className="w-5 h-5 -rotate-90"/></button>
                      </div>
                      <div className="flex gap-4 items-center">
                          <p className="text-xs text-slate-500 italic max-w-md truncate hidden md:block opacity-50">
                              Visual Prompt: {slides[currentSlideIndex].visualPrompt}
                          </p>
                          <button 
                            onClick={handleDownloadPPT}
                            disabled={generatingImages}
                            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-900/40 transition-all active:scale-95 hover:shadow-blue-900/60 disabled:opacity-50 disabled:cursor-wait"
                          >
                              {generatingImages ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                              {generatingImages ? '正在生成资源...' : '导出 PPTX'}
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

export default Dashboard;
