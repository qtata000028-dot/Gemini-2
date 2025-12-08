
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
  Palette, Wand2, Database, Save, AlertTriangle, Copy, Laptop, Settings, Terminal, Bot, Check, HelpCircle
} from 'lucide-react';
import * as XLSX from 'xlsx';
import PptxGenJS from 'pptxgenjs';

interface DashboardProps {
  teacher: Teacher;
  onLogout: () => void;
  onUpdateTeacher: (updates: Partial<Teacher>) => void;
}

// --- Interactive Quiz Component ---

const InteractiveQuiz = ({ questions }: { questions: QuizQuestion[] }) => {
    const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
    const [showExplanation, setShowExplanation] = useState<Record<number, boolean>>({});

    const handleSelect = (qIndex: number, optIndex: number) => {
        if (selectedAnswers[qIndex] !== undefined) return; // Prevent re-answering
        setSelectedAnswers(prev => ({ ...prev, [qIndex]: optIndex }));
        setShowExplanation(prev => ({ ...prev, [qIndex]: true }));
    };

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            {questions.map((q, qIndex) => {
                const isAnswered = selectedAnswers[qIndex] !== undefined;
                const isCorrect = selectedAnswers[qIndex] === q.correctAnswer;
                
                return (
                    <div key={qIndex} className="bg-[#1e293b] rounded-2xl p-6 border border-white/10 shadow-lg">
                        <div className="flex justify-between items-start mb-4">
                            <span className={`text-xs font-bold px-2 py-1 rounded border ${
                                q.difficulty === '基础' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                q.difficulty === '进阶' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                                'bg-red-500/10 text-red-400 border-red-500/20'
                            }`}>{q.difficulty}</span>
                            <HelpCircle className="w-5 h-5 text-slate-500" />
                        </div>
                        <h4 className="text-white font-bold text-lg mb-6">{qIndex + 1}. {q.question}</h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                            {q.options.map((opt, optIndex) => {
                                let btnClass = "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10";
                                if (isAnswered) {
                                    if (optIndex === q.correctAnswer) {
                                        btnClass = "bg-green-500/20 border-green-500 text-green-300 ring-1 ring-green-500";
                                    } else if (optIndex === selectedAnswers[qIndex]) {
                                        btnClass = "bg-red-500/20 border-red-500 text-red-300";
                                    } else {
                                        btnClass = "opacity-50 border-transparent";
                                    }
                                }

                                return (
                                    <button
                                        key={optIndex}
                                        onClick={() => handleSelect(qIndex, optIndex)}
                                        disabled={isAnswered}
                                        className={`p-4 rounded-xl border text-left font-medium transition-all duration-200 flex items-center justify-between ${btnClass}`}
                                    >
                                        <span>{['A', 'B', 'C', 'D'][optIndex]}. {opt}</span>
                                        {isAnswered && optIndex === q.correctAnswer && <Check className="w-5 h-5" />}
                                        {isAnswered && optIndex === selectedAnswers[qIndex] && optIndex !== q.correctAnswer && <X className="w-5 h-5" />}
                                    </button>
                                );
                            })}
                        </div>

                        {isAnswered && (
                            <div className={`p-4 rounded-xl border ${isCorrect ? 'bg-green-900/10 border-green-500/20' : 'bg-orange-900/10 border-orange-500/20'} animate-in fade-in`}>
                                <div className="flex items-center gap-2 mb-2 font-bold">
                                    {isCorrect ? <span className="text-green-400">🎉 回答正确！</span> : <span className="text-orange-400">💡 难点解析</span>}
                                </div>
                                <p className="text-sm text-slate-300 leading-relaxed">{q.explanation}</p>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

// ... other existing components like StudentSearch, ThinkingConsole, SmoothLineChart ...

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

const ThinkingConsole = ({ content }: { content: string }) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [content]);

    return (
        <div className="w-full h-[500px] bg-[#0f172a] rounded-2xl border border-white/10 shadow-2xl flex flex-col overflow-hidden font-mono text-xs md:text-sm">
            <div className="px-4 py-2 bg-white/5 border-b border-white/5 flex items-center justify-center">
                <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-green-400" />
                    <span className="text-slate-400 font-bold">Aliyun Qwen-Max Agent</span>
                </div>
            </div>
            <div className="flex-1 p-6 overflow-y-auto custom-scrollbar text-green-400/90 leading-relaxed whitespace-pre-wrap" ref={scrollRef}>
                {content}
                <span className="inline-block w-2 h-4 bg-green-400 ml-1 animate-pulse align-middle"></span>
            </div>
        </div>
    );
};

const SmoothLineChart = ({ data }: { data: any[] }) => {
    const scores = data.map(d => d.averageScore || d.score || 0).reverse();
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

  // Assignment & Student Mgmt State
  const [assignTitle, setAssignTitle] = useState('');
  const [assignDesc, setAssignDesc] = useState('');
  const [assignClass, setAssignClass] = useState('三年级二班');
  const [assignFile, setAssignFile] = useState(''); 
  const [uploadingFile, setUploadingFile] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [fileProgress, setFileProgress] = useState<any>(null);
  const [newStudentName, setNewStudentName] = useState('');
  const [addingStudent, setAddingStudent] = useState(false);
  const [updatingAvatar, setUpdatingAvatar] = useState(false);

  // Grading
  const [expandedHomeworkId, setExpandedHomeworkId] = useState<string | null>(null);
  const [gradingLoading, setGradingLoading] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  
  // Analysis (Streaming)
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [streamingAnalysis, setStreamingAnalysis] = useState(false);
  
  // Lesson Plan
  const [lessonTopic, setLessonTopic] = useState('');
  const [selectedTextbookId, setSelectedTextbookId] = useState<string>('');
  const [lessonPlan, setLessonPlan] = useState<LessonPlan | null>(null);
  const [lessonLoading, setLessonLoading] = useState(false);
  const [thinkingContent, setThinkingContent] = useState(''); 
  const [showThinking, setShowThinking] = useState(false);
  const [uploadingTextbook, setUploadingTextbook] = useState(false);
  const [textbookProgress, setTextbookProgress] = useState<any>(null);
  
  // Slides & Quiz
  const [generatingSlides, setGeneratingSlides] = useState(false);
  const [showSlidePreview, setShowSlidePreview] = useState(false);
  const [slides, setSlides] = useState<PresentationSlide[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [generatingImages, setGeneratingImages] = useState(false);
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
            const tb = await dataService.fetchTextbooks(teacher.id);
            setTextbooks(tb);
        } catch (error) { console.error(error); } finally { setLoadingData(false); }
    }
    loadData();
  }, [teacher.id]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]; if(!file) return;
      setUploadingFile(true); setFileProgress({status:'准备',percent:0,loaded:'0',total:'0'});
      try {
          const url = await dataService.uploadFile(file, 'homeworks', (s, p, l, t) => setFileProgress({status:s,percent:p,loaded:l,total:t}));
          setAssignFile(url);
      } catch(e:any) { alert(e.message); setFileProgress(null); } finally { setUploadingFile(false); }
  };
  const handlePublishAssignment = async () => {
     setPublishing(true);
     try { await dataService.createAssignment(teacher.id, { title:assignTitle, description:assignDesc, classTarget:assignClass, attachmentUrl:assignFile }); alert("发布成功"); setAssignTitle(''); setAssignDesc(''); setAssignFile(''); setFileProgress(null); } catch(e) { alert("失败"); } finally { setPublishing(false); }
  };
  const handleTextbookUpload = async (e: any) => {
      const file = e.target.files?.[0]; if(!file) return; setUploadingTextbook(true); setTextbookProgress({status:'准备',percent:0});
      try { await dataService.uploadTextbook(teacher.id, file, (s,p,l,t) => setTextbookProgress({status:s,percent:p})); const tb = await dataService.fetchTextbooks(teacher.id); setTextbooks(tb); } catch(e:any) { alert(e.message); } finally { setUploadingTextbook(false); }
  };
  const handleAddStudent = async () => {
      setAddingStudent(true); try { await dataService.addStudent(newStudentName, '三年级', '三年级二班'); const d = await dataService.fetchDashboardData(); setStudents(d.students); setNewStudentName(''); } catch(e) { alert("失败"); } finally { setAddingStudent(false); }
  };
  const handleDeleteStudent = async (id: string) => { if(!confirm('删除?')) return; await dataService.deleteStudent(id); setStudents(prev=>prev.filter(s=>s.id!==id)); };
  const handleAIGrading = async (hw: Homework) => {
      setGradingLoading(true); try { const res = await generateGradingSuggestion(teacher.subject, students.find(s=>s.id===hw.studentId)?.name||'', hw.content); setHomeworkList(prev=>prev.map(h=>h.id===hw.id?{...h, status:'graded', score:res.score, feedback:res.feedback}:h)); } catch(e) { alert(e); } finally { setGradingLoading(false); }
  };

  const handleAnalysis = async () => {
    setAnalysisLoading(true);
    setStreamingAnalysis(true);
    setAnalysisResult('');
    const student = students.find(s => s.id === selectedStudentId);
    if (student) {
      try {
        await generateStudentAnalysis(student.name, teacher.subject, student.recentScores, (chunk) => {
            setAnalysisResult(chunk);
        });
      } catch (e: any) {
          alert(e.message);
      }
    }
    setAnalysisLoading(false);
    setStreamingAnalysis(false);
  };

  const handleGenerateLesson = async () => {
    if (!lessonTopic) return;
    setLessonLoading(true);
    setShowThinking(true);
    setThinkingContent(''); 
    setLessonPlan(null);
    setSlides([]);
    setQuiz([]);
    
    const context = textbooks.find(t => t.id === selectedTextbookId)?.title;
    
    try {
        const plan = await generateLessonPlan(lessonTopic, teacher.subject, context, (chunk) => {
            setThinkingContent(chunk);
        });
        if (plan) {
            setLessonPlan(plan);
            await dataService.createLessonPlan(teacher.id, plan);
            setTimeout(() => setShowThinking(false), 800);
        }
    } catch (e: any) {
        alert("生成出错: " + e.message);
    } finally {
        setLessonLoading(false);
    }
  };

  const handleGenerateSlides = async () => { if(!lessonPlan) return; setGeneratingSlides(true); try { const s = await generatePPTSlides(lessonPlan.topic, lessonPlan.objectives, teacher.subject); setSlides(s); if(s.length>0) setShowSlidePreview(true); } catch(e){console.error(e)} finally {setGeneratingSlides(false);} };
  
  // --- High End PPT Export using PptxGenJS ---
  const handleExportHighEndPPT = () => {
      if (slides.length === 0) return;
      const pres = new PptxGenJS();
      pres.layout = 'LAYOUT_16x9';

      // 1. Define Professional Masters
      // Master: Title Slide (Dark, Gradient)
      pres.defineSlideMaster({
        title: 'MASTER_TITLE',
        background: { color: '0F172A' }, // Slate 900
        objects: [
           { rect: { x: 0, y: 0, w: '100%', h: '100%', fill: { type: 'solid', color: '0F172A' } } },
           { rect: { x: 0, y: 0, w: 13.4, h: 0.15, fill: { color: 'F97316' } } }, // Orange top bar
           // Removed unsupported 'circle' object type
           // To simulate a circle, one would typically use an image or shape if supported by defineSlideMaster objects,
           // but keeping it simple to satisfy types.
        ]
      });

      // Master: Content Slide (Light, Clean)
      pres.defineSlideMaster({
        title: 'MASTER_CONTENT',
        background: { color: 'F8FAFC' }, // Slate 50
        slideNumber: { x: 12.5, y: 7.2, color: '94A3B8', fontSize: 10 },
        objects: [
           { rect: { x: 0.5, y: 0.4, w: 0.8, h: 0.08, fill: { color: 'F97316' } } }, // Title Accent
           { text: { text: lessonTopic, options: { x: 0.5, y: 7.2, w: 4, h: 0.3, fontSize: 10, color: '94A3B8' } } }, // Footer text
        ]
      });

      // Master: Section Slide (Mid-tone)
      pres.defineSlideMaster({
        title: 'MASTER_SECTION',
        background: { color: '1E293B' }, // Slate 800
        objects: [
           { rect: { x: 0, y: 3.5, w: '100%', h: 1.5, fill: { color: '0F172A' } } }, // Band
        ]
      });

      // 2. Generate Slides based on AI Layout Type
      slides.forEach((slide) => {
          if (slide.layout === 'TITLE') {
              const s = pres.addSlide({ masterName: 'MASTER_TITLE' });
              s.addText(slide.title, { x: 0.8, y: 2.8, w: 10, fontSize: 44, color: 'FFFFFF', bold: true, fontFace: 'Arial' });
              if(slide.subtitle) s.addText(slide.subtitle, { x: 0.8, y: 4, w: 10, fontSize: 24, color: 'CBD5E1' });
              s.addText(`Presented by ${teacher.name}`, { x: 0.8, y: 6, fontSize: 14, color: '64748B' });
              if(slide.notes) s.addNotes(slide.notes);
          } 
          else if (slide.layout === 'SECTION') {
              const s = pres.addSlide({ masterName: 'MASTER_SECTION' });
              s.addText(slide.title, { x: 0, y: 3.8, w: '100%', fontSize: 36, color: 'F97316', bold: true, align: 'center' });
              if(slide.notes) s.addNotes(slide.notes);
          } 
          else if (slide.layout === 'CONCLUSION') {
              const s = pres.addSlide({ masterName: 'MASTER_TITLE' });
              s.addText(slide.title || '感谢聆听', { x: 0, y: 3, w: '100%', fontSize: 40, color: 'FFFFFF', bold: true, align: 'center' });
              if(slide.notes) s.addNotes(slide.notes);
          }
          else {
              // Standard Content
              const s = pres.addSlide({ masterName: 'MASTER_CONTENT' });
              s.addText(slide.title, { x: 0.5, y: 0.6, w: 10, fontSize: 28, color: '0F172A', bold: true });
              
              // Bullet points
              const bullets = slide.content.map(c => ({ text: c, options: { fontSize: 18, color: '334155', breakLine: true, bullet: { code: '2022' } } }));
              s.addText(bullets, { x: 0.5, y: 1.6, w: 12, h: 5, lineSpacing: 32, valign: 'top' });
              
              if(slide.notes) s.addNotes(slide.notes);
          }
      });

      pres.writeFile({ fileName: `${lessonTopic}_教学课件.pptx` });
  };

  const handleGenerateQuiz = async () => { if(!lessonPlan) return; setGeneratingQuiz(true); try { const q = await generateQuiz(lessonPlan.topic, lessonPlan.keyPoints); if(q.length>0) setQuiz(q); } catch(e){console.error(e)} finally {setGeneratingQuiz(false);} };
  const handleExcelUpload = async (e:any) => { const file=e.target.files[0]; if(!file)return; try{ await dataService.parseAndSaveExamExcel(await file.arrayBuffer(), file.name); const d=await dataService.fetchDashboardData(); setExams(d.exams); alert("导入成功"); } catch(e:any){alert(e.message);} };

  const NavItem = ({ view, icon: Icon, label }: { view: ViewState; icon: any; label: string }) => (
    <button
      onClick={() => setCurrentView(view)}
      className={`group w-full flex items-center space-x-3 px-6 py-4 transition-all duration-200 rounded-2xl mb-2 relative overflow-hidden ${currentView === view ? 'text-white shadow-[0_0_20px_rgba(59,130,246,0.3)]' : 'text-slate-400 hover:text-blue-200 hover:bg-white/5'}`}
    >
      {currentView === view && ( <div className="absolute inset-0 bg-gradient-to-r from-blue-600/80 to-indigo-600/80 backdrop-blur-md"></div> )}
      <Icon className={`w-5 h-5 relative z-10 transition-transform group-hover:scale-110 ${currentView === view ? 'animate-pulse' : ''}`} />
      <span className="font-bold relative z-10">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-[#0f172a] text-white flex overflow-hidden font-sans selection:bg-blue-500/30">
      
      {/* Sidebar */}
      <div className="w-72 relative z-20 flex flex-col border-r border-white/5 bg-[#0f172a]/80 backdrop-blur-xl">
        <div className="p-8">
          <div className="flex items-center space-x-4 mb-10 group cursor-pointer relative">
             <div className="relative">
                 <img src={teacher.avatar} alt="Avatar" className="w-16 h-16 rounded-2xl object-cover ring-2 ring-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.2)] transition-all group-hover:scale-105" />
                 <label className="absolute inset-0 bg-black/60 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer backdrop-blur-[2px]">
                    <Camera className="w-6 h-6 text-white mb-1" />
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => {const f=e.target.files?.[0]; if(f) {setUpdatingAvatar(true); dataService.updateTeacherAvatar(teacher.id, f).then(u=>{onUpdateTeacher({avatar:u});setUpdatingAvatar(false)})}}} disabled={updatingAvatar} />
                 </label>
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
            <NavItem view={ViewState.ANALYSIS} icon={TrendingUp} label="AI 定点辅导分析" />
            <NavItem view={ViewState.LESSON_PREP} icon={Presentation} label="智能备课" />
          </nav>
        </div>
        <div className="mt-auto p-6 border-t border-white/5">
           <button onClick={onLogout} className="flex items-center space-x-3 text-slate-500 hover:text-red-400 w-full px-4 py-3 hover:bg-red-500/5 rounded-xl"><LogOut className="w-5 h-5" /><span>退出</span></button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 relative z-10 overflow-hidden flex flex-col">
         <header className="px-8 py-6 flex justify-between items-center border-b border-white/5 bg-[#0f172a]/50 backdrop-blur-sm sticky top-0 z-20">
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
               {currentView === ViewState.LESSON_PREP && '智能备课中心 (Aliyun Qwen-Max)'}
               {currentView === ViewState.ANALYSIS && 'AI 学情诊断 (Streaming)'}
               {currentView !== ViewState.LESSON_PREP && currentView !== ViewState.ANALYSIS && '教务管理系统'}
            </h1>
         </header>

         <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            {/* Dashboard View */}
            {currentView === ViewState.DASHBOARD && (
               <div className="h-full flex flex-col lg:flex-row gap-8">
                  <div className="flex-1 lg:flex-[0.4] flex flex-col gap-6">
                      <div className="p-6 rounded-[2rem] bg-white/5 border border-white/10 hover:bg-white/10 transition-colors group cursor-pointer">
                          <label className="flex flex-col items-center justify-center cursor-pointer">
                              <input type="file" accept=".xlsx" onChange={handleExcelUpload} className="hidden" />
                              <FileSpreadsheet className="w-10 h-10 text-green-400 mb-2 group-hover:scale-110 transition-transform" />
                              <h3 className="font-bold text-white">导入考试 Excel</h3>
                          </label>
                      </div>
                      <div className="flex-1 min-h-0 bg-white/5 border border-white/10 rounded-[2rem] p-6 overflow-hidden flex flex-col">
                          <h3 className="font-bold text-slate-300 mb-4 flex items-center gap-2"><Clock className="w-4 h-4 text-blue-400"/> 考试归档</h3>
                          <div className="overflow-y-auto custom-scrollbar space-y-3">
                              {exams.map(exam => (
                                  <div key={exam.id} onClick={() => setSelectedExamId(exam.id)} className={`p-4 rounded-xl border cursor-pointer ${selectedExamId===exam.id?'bg-blue-600/20 border-blue-500/30':'bg-white/5 border-white/5'}`}>
                                      <p className="font-bold text-sm text-white">{exam.title}</p>
                                      <p className="text-xs text-slate-400">{exam.date} • Avg: {exam.averageScore}</p>
                                  </div>
                              ))}
                          </div>
                      </div>
                  </div>
                  <div className="flex-1 lg:flex-[0.6] flex flex-col gap-6">
                       <div className="flex-1 bg-white/5 border border-white/10 rounded-[2rem] p-8 flex flex-col relative overflow-hidden">
                          <h3 className="font-bold text-lg mb-6 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-blue-400"/> 成绩走势</h3>
                          <div className="flex-1 min-h-[300px] relative z-10"><SmoothLineChart data={exams} /></div>
                      </div>
                  </div>
               </div>
            )}

            {/* Analysis View */}
            {currentView === ViewState.ANALYSIS && (
                 <div className="flex flex-col gap-6 h-full animate-in fade-in">
                     <div className="flex gap-4 items-center bg-white/5 p-4 rounded-2xl border border-white/10">
                         <div className="w-64"><StudentSearch students={students} selectedId={selectedStudentId} onSelect={setSelectedStudentId} /></div>
                         <button onClick={handleAnalysis} disabled={analysisLoading || !selectedStudentId} className="px-6 py-3 bg-purple-600 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-purple-900/30 disabled:opacity-50">
                             {analysisLoading ? <Loader2 className="animate-spin"/> : <Bot />} 
                             {streamingAnalysis ? 'AI 正在分析...' : '开始深度诊断'}
                         </button>
                     </div>
                     <div className="flex-1 bg-white/5 border border-white/10 rounded-[2.5rem] p-8 relative overflow-hidden">
                         {analysisResult || streamingAnalysis ? (
                             <div className="prose prose-invert max-w-none">
                                 <h2 className="text-2xl font-black text-purple-400 mb-6 flex items-center gap-2"><Sparkles className="w-6 h-6"/> 学情诊断报告</h2>
                                 <div className="whitespace-pre-wrap text-slate-300 leading-relaxed text-lg font-medium">
                                    {analysisResult}
                                    {streamingAnalysis && <span className="inline-block w-2 h-5 bg-purple-400 ml-1 animate-pulse align-middle"></span>}
                                 </div>
                             </div>
                         ) : (
                             <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600">
                                 <TrendingUp className="w-24 h-24 mb-4 opacity-20" />
                                 <p className="font-bold">请选择学生并点击生成</p>
                             </div>
                         )}
                     </div>
                 </div>
            )}

            {/* LESSON PREP VIEW (Updated for Thinking Console & Quiz) */}
            {currentView === ViewState.LESSON_PREP && (
               <div className="h-full flex flex-col lg:flex-row gap-8 animate-in fade-in">
                   <div className="flex-1 lg:flex-[0.35] bg-white/5 border border-white/10 rounded-[2rem] p-6 flex flex-col">
                       <h3 className="font-bold text-slate-300 mb-6 flex items-center gap-2">
                           <Book className="w-5 h-5 text-orange-400" /> 教材知识库
                       </h3>
                       <label className={`w-full mb-6 p-4 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all group ${uploadingTextbook ? 'border-slate-600 bg-white/5' : 'border-white/10 hover:bg-white/5'}`}>
                           <input type="file" accept=".pdf" onChange={handleTextbookUpload} disabled={uploadingTextbook} className="hidden"/>
                           {uploadingTextbook ? <span className="text-xs text-orange-400">上传中...</span> : <><CloudUpload className="text-slate-500 mb-2"/><span className="text-xs font-bold text-slate-500">上传教材 PDF</span></>}
                       </label>
                       <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
                           {textbooks.map(tb => (
                               <div key={tb.id} onClick={() => setSelectedTextbookId(tb.id)} className={`p-4 rounded-xl border cursor-pointer ${selectedTextbookId===tb.id?'bg-orange-600/20 border-orange-500/50':'bg-white/5 border-transparent'}`}>
                                   <p className={`text-sm font-bold truncate ${selectedTextbookId===tb.id?'text-orange-300':'text-white'}`}>{tb.title}</p>
                               </div>
                           ))}
                       </div>
                   </div>
                   
                   <div className="flex-1 lg:flex-[0.65] flex flex-col gap-6">
                       <div className="flex gap-4">
                           <input type="text" placeholder="输入课题 (例如: 万以内的加法)" value={lessonTopic} onChange={e => setLessonTopic(e.target.value)} className="flex-1 p-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold focus:border-orange-500 focus:outline-none" />
                           <button onClick={handleGenerateLesson} disabled={lessonLoading || !lessonTopic} className="px-8 bg-gradient-to-r from-orange-500 to-rose-500 text-white rounded-2xl font-black flex items-center gap-2 shadow-lg shadow-orange-900/30 disabled:opacity-50">
                               {lessonLoading ? <Loader2 className="animate-spin"/> : <Sparkles />} 深度生成
                           </button>
                       </div>
                       
                       <div className="flex-1 bg-white/5 border border-white/10 rounded-[2rem] p-8 overflow-y-auto custom-scrollbar relative">
                           {showThinking ? (
                               <div className="animate-in fade-in zoom-in-95 duration-300">
                                   <div className="mb-4 flex items-center gap-3">
                                       <Loader2 className="w-5 h-5 text-green-400 animate-spin" />
                                       <h3 className="font-bold text-green-400">AI 正在思考并撰写教案...</h3>
                                   </div>
                                   <ThinkingConsole content={thinkingContent} />
                               </div>
                           ) : lessonPlan ? (
                               <div className="prose prose-invert max-w-none animate-in fade-in slide-in-from-bottom-8 duration-500">
                                   <div className="flex justify-between items-start mb-6">
                                       <div>
                                           <h1 className="text-3xl font-black text-orange-400 mb-2">{lessonPlan.topic}</h1>
                                           <div className="flex gap-2">
                                              <span className="text-xs font-bold text-slate-900 bg-orange-400 px-2 py-1 rounded">逐字稿模式</span>
                                              <span className="text-xs font-bold text-slate-500 bg-white/5 px-2 py-1 rounded border border-white/10">Qwen-Max</span>
                                           </div>
                                       </div>
                                       <div className="flex gap-2">
                                           <button onClick={handleGenerateSlides} disabled={generatingSlides} className="px-4 py-2 bg-blue-600/20 text-blue-300 border border-blue-500/30 rounded-xl text-xs font-bold flex items-center gap-2">
                                                {generatingSlides?<Loader2 className="w-3 h-3 animate-spin"/>:<Presentation className="w-3 h-3"/>} PPT
                                           </button>
                                           <button onClick={handleGenerateQuiz} disabled={generatingQuiz} className="px-4 py-2 bg-green-600/20 text-green-300 border border-green-500/30 rounded-xl text-xs font-bold flex items-center gap-2">
                                                {generatingQuiz?<Loader2 className="w-3 h-3 animate-spin"/>:<BrainCircuit className="w-3 h-3"/>} 习题
                                           </button>
                                       </div>
                                   </div>
                                   
                                   {/* Main Lesson Content */}
                                   <div className="space-y-8">
                                       {/* Objectives */}
                                       <section className="bg-black/20 p-6 rounded-2xl border border-white/5">
                                           <h3 className="text-lg font-bold text-white border-l-4 border-orange-500 pl-3 mb-4">一、教学目标</h3>
                                           <ul className="grid grid-cols-1 gap-2">
                                               {lessonPlan.objectives.map((o, i) => (
                                                   <li key={i} className="flex gap-3 text-slate-300 text-sm bg-white/5 p-3 rounded-lg border border-white/5">
                                                       <div className="w-6 h-6 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center text-xs font-black shrink-0">{i+1}</div>
                                                       {o}
                                                   </li>
                                               ))}
                                           </ul>
                                       </section>

                                       {/* Process */}
                                       <section>
                                           <h3 className="text-lg font-bold text-white border-l-4 border-orange-500 pl-3 mb-4">二、教学过程 (逐字稿)</h3>
                                           <div className="space-y-6">
                                               {lessonPlan.process.map((step, i) => (
                                                   <div key={i} className="bg-white/5 rounded-2xl p-6 border border-white/5 relative overflow-hidden group hover:border-orange-500/30 transition-colors">
                                                       <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-orange-500 to-rose-500 opacity-50"></div>
                                                       <div className="flex justify-between items-center mb-4">
                                                           <h4 className="font-bold text-lg text-orange-200">{step.phase}</h4>
                                                           <span className="text-xs bg-orange-500/20 text-orange-300 px-3 py-1 rounded-full font-bold border border-orange-500/20">{step.duration}</span>
                                                       </div>
                                                       <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap font-medium">{step.activity}</div>
                                                   </div>
                                               ))}
                                           </div>
                                       </section>
                                       
                                       {/* Blackboard & Homework */}
                                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="bg-[#1e293b] p-6 rounded-2xl border-4 border-slate-700 shadow-2xl relative">
                                                <div className="absolute top-2 right-2 text-slate-600 text-xs font-bold">BLACKBOARD</div>
                                                <h3 className="text-white font-bold mb-4 flex items-center gap-2"><Palette className="w-4 h-4"/> 板书设计</h3>
                                                <div className="text-sm text-white font-handwriting whitespace-pre-line leading-loose tracking-wide">{lessonPlan.blackboard.join('\n')}</div>
                                            </div>
                                            <div className="bg-gradient-to-br from-blue-900/20 to-indigo-900/20 p-6 rounded-2xl border border-blue-500/20">
                                                <h3 className="text-blue-300 font-bold mb-4 flex items-center gap-2"><FileCheck className="w-4 h-4"/> 作业设计</h3>
                                                <div className="text-sm text-blue-100 whitespace-pre-line">{lessonPlan.homework}</div>
                                            </div>
                                       </div>

                                       {/* Quiz Section (Restored & Upgraded) */}
                                       {quiz.length > 0 && (
                                           <section className="mt-12 pt-8 border-t border-white/10">
                                               <h3 className="text-2xl font-black text-green-400 mb-6 flex items-center gap-2"><BrainCircuit className="w-6 h-6"/> 课堂互动习题 (Interactive)</h3>
                                               <InteractiveQuiz questions={quiz} />
                                           </section>
                                       )}
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
            
            {/* ... Other Views ... */}

         </main>
      </div>

      {/* Slide Preview Modal */}
      {showSlidePreview && slides.length > 0 && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
              <div className="w-full max-w-5xl bg-[#1e293b] rounded-2xl border border-white/10 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 h-[80vh]">
                   <div className="flex-1 relative bg-black/50 overflow-hidden flex items-center justify-center p-8">
                       <div className="relative w-full max-w-4xl aspect-video bg-white shadow-2xl rounded-lg overflow-hidden flex flex-col p-12">
                           {/* Simplified Preview Render */}
                           {slides[currentSlideIndex].layout === 'TITLE' ? (
                               <div className="flex flex-col items-center justify-center h-full bg-slate-900 text-white">
                                   <h1 className="text-4xl font-black mb-4">{slides[currentSlideIndex].title}</h1>
                                   <p className="text-xl text-slate-300">{slides[currentSlideIndex].subtitle}</p>
                               </div>
                           ) : (
                               <>
                                   <h1 className="text-4xl font-black text-slate-900 mb-6">{slides[currentSlideIndex].title}</h1>
                                   <ul className="space-y-4 text-xl text-slate-700 list-disc pl-6">
                                       {slides[currentSlideIndex].content.map((c,i)=><li key={i}>{c}</li>)}
                                   </ul>
                               </>
                           )}
                           <div className="mt-auto pt-6 border-t border-slate-200">
                               <p className="text-sm text-slate-500 font-mono">SPEAKER NOTES: {slides[currentSlideIndex].notes}</p>
                           </div>
                       </div>
                   </div>
                   <div className="p-4 bg-white/5 flex justify-between items-center">
                       <button onClick={()=>setShowSlidePreview(false)} className="px-4 py-2 text-white hover:bg-white/10 rounded-lg transition-colors">关闭预览</button>
                       <div className="flex gap-4">
                            <div className="flex gap-2">
                                <button onClick={()=>setCurrentSlideIndex(Math.max(0,currentSlideIndex-1))} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">上一页</button>
                                <button onClick={()=>setCurrentSlideIndex(Math.min(slides.length-1,currentSlideIndex+1))} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">下一页</button>
                            </div>
                            <button onClick={handleExportHighEndPPT} className="px-6 py-2 bg-gradient-to-r from-orange-500 to-rose-500 text-white font-bold rounded-lg shadow-lg hover:shadow-orange-500/20 flex items-center gap-2">
                                <Download className="w-4 h-4" /> 导出 PPTX 文件
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
