
import React, { useState, useEffect, useRef } from 'react';
import { QuizQuestion, Student } from '../types';
import { Check, X, HelpCircle, Search, ChevronDown, Terminal } from 'lucide-react';

// --- Interactive Quiz Component ---

export const InteractiveQuiz = ({ questions }: { questions: QuizQuestion[] }) => {
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

// --- Student Search Component ---

export const StudentSearch = ({ 
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

// --- Thinking Console Component ---

export const ThinkingConsole = ({ content }: { content: string }) => {
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

// --- Smooth Line Chart Component ---

export const SmoothLineChart = ({ data }: { data: any[] }) => {
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
