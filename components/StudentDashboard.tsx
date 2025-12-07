
import React, { useState, useEffect } from 'react';
import { Student, Assignment } from '../types';
import { dataService } from '../services/dataService';
import { LogOut, BookOpen, Clock, Upload, CheckCircle2, FileText, Image as ImageIcon, Send, Loader2, ArrowRight, CloudUpload, FileCheck } from 'lucide-react';

interface Props {
  student: Student;
  onLogout: () => void;
}

const StudentDashboard: React.FC<Props> = ({ student, onLogout }) => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  
  // Submission State
  const [answerText, setAnswerText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // Progress State
  const [uploadProgress, setUploadProgress] = useState<{status: string; percent: number; loaded: string; total: string} | null>(null);

  useEffect(() => {
    loadAssignments();
  }, []);

  const loadAssignments = async () => {
    try {
      const data = await dataService.fetchAssignments(student.className);
      setAssignments(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    setUploadProgress({
        status: '准备中',
        percent: 0,
        loaded: '0 B',
        total: formatBytes(file.size)
    });

    try {
        const url = await dataService.uploadFile(file, 'homeworks', (status, percent, loaded, total) => {
             let statusText = status === 'compressing' ? '智能压缩中...' : '正在上传云端...';
             if (percent === 100) statusText = '处理完成';
             
             setUploadProgress({
                 status: statusText,
                 percent: percent,
                 loaded: formatBytes(loaded),
                 total: formatBytes(total)
             });
        });
        setUploadedUrl(url);
    } catch (e: any) {
        alert("上传失败: " + e.message);
        setUploadProgress(null);
    } finally {
        setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedAssignment) return;
    setSubmitting(true);
    try {
        await dataService.submitHomework(student.id, selectedAssignment.id, answerText, uploadedUrl);
        alert("作业提交成功！");
        setSelectedAssignment(null);
        setAnswerText('');
        setUploadedUrl('');
        setUploadProgress(null);
    } catch (e) {
        alert("提交失败，请重试");
    } finally {
        setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen relative bg-[#fff5f0] overflow-hidden font-sans">
       {/* Warm Aurora Background */}
       <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-[50vw] h-[50vw] bg-rose-200/40 rounded-full blur-[100px] animate-pulse"></div>
          <div className="absolute bottom-0 left-0 w-[60vw] h-[60vw] bg-orange-200/40 rounded-full blur-[100px] animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-white/30 backdrop-blur-[2px]"></div>
       </div>

       {/* Header */}
       <header className="relative z-10 bg-white/70 backdrop-blur-md border-b border-white/50 sticky top-0">
          <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
             <div className="flex items-center gap-4">
                <div className="relative">
                  <img src={student.avatar} className="w-12 h-12 rounded-full bg-white shadow-lg ring-2 ring-white" alt="" />
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                     <CheckCircle2 className="w-3 h-3 text-white" />
                  </div>
                </div>
                <div>
                   <h1 className="font-black text-slate-800 text-lg tracking-tight">你好，{student.name}</h1>
                   <p className="text-xs text-orange-600 font-bold bg-orange-100 px-2 py-0.5 rounded-full inline-block">{student.className}</p>
                </div>
             </div>
             <button onClick={onLogout} className="group flex items-center gap-2 px-4 py-2 bg-white text-slate-500 rounded-xl hover:bg-red-50 hover:text-red-500 transition-all shadow-sm font-bold text-sm">
                <LogOut className="w-4 h-4" /> 退出
             </button>
          </div>
       </header>

       <main className="relative z-10 max-w-5xl mx-auto px-4 py-8">
          <div className="mb-10">
             <h2 className="text-3xl font-black text-slate-800 mb-2">我的学习任务</h2>
             <p className="text-slate-500 font-medium flex items-center gap-2">
               <Clock className="w-4 h-4 text-orange-400" />
               今天也要努力加油哦 ✨
             </p>
          </div>

          {loading ? (
             <div className="flex flex-col items-center justify-center py-32 opacity-50">
                <Loader2 className="animate-spin text-orange-400 w-12 h-12 mb-4" />
                <p className="font-bold text-slate-400">正在同步作业数据...</p>
             </div>
          ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {assignments.length === 0 ? (
                    <div className="col-span-2 text-center py-24 bg-white/60 backdrop-blur-lg rounded-[2rem] border border-white shadow-xl">
                        <div className="w-24 h-24 bg-gradient-to-br from-orange-100 to-rose-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                            <CheckCircle2 className="w-12 h-12 text-orange-400" />
                        </div>
                        <h3 className="text-xl font-black text-slate-800 mb-2">太棒了！</h3>
                        <p className="text-slate-500 font-bold">暂时没有新的作业任务</p>
                    </div>
                ) : (
                    assignments.map((assign, idx) => (
                        <div 
                          key={assign.id} 
                          className="group bg-white/80 backdrop-blur-lg rounded-[2rem] p-6 shadow-lg shadow-orange-500/5 border border-white hover:-translate-y-2 hover:shadow-orange-500/15 transition-all duration-300 cursor-pointer relative overflow-hidden" 
                          style={{ animationDelay: `${idx * 100}ms` }}
                          onClick={() => setSelectedAssignment(assign)}
                        >
                           <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                              <BookOpen className="w-24 h-24 text-orange-500 transform rotate-12" />
                           </div>
                           
                           <div className="relative z-10">
                             <div className="flex justify-between items-start mb-6">
                                <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-rose-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
                                   <BookOpen className="w-6 h-6" />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-100/80 px-3 py-1.5 rounded-full">
                                   {new Date(assign.createdAt).toLocaleDateString()}
                                </span>
                             </div>
                             
                             <h3 className="text-xl font-black text-slate-800 mb-2 line-clamp-1">{assign.title}</h3>
                             <p className="text-slate-500 text-sm font-medium line-clamp-2 mb-6 h-10">{assign.description}</p>
                             
                             <div className="flex justify-between items-center pt-4 border-t border-slate-100/50">
                                <span className="text-xs font-bold text-orange-500 group-hover:underline">点击开始写作业</span>
                                <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center transform group-hover:scale-110 group-hover:rotate-[-45deg] transition-all duration-300">
                                   <ArrowRight className="w-4 h-4" />
                                </div>
                             </div>
                           </div>
                        </div>
                    ))
                )}
             </div>
          )}
       </main>

       {/* Submission Modal */}
       {selectedAssignment && (
          <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center">
             <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setSelectedAssignment(null)}></div>
             
             <div className="bg-white w-full max-w-3xl rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-2xl h-[95vh] md:h-auto max-h-[90vh] flex flex-col relative z-10 animate-in slide-in-from-bottom-20 duration-500 overflow-hidden">
                
                {/* Modal Header */}
                <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white/80 backdrop-blur-md sticky top-0 z-20">
                   <div>
                      <h3 className="text-xl font-black text-slate-800">{selectedAssignment.title}</h3>
                      <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-1">作业详情与提交</p>
                   </div>
                   <button onClick={() => setSelectedAssignment(null)} className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors">
                      <LogOut className="w-4 h-4 transform rotate-180" />
                   </button>
                </div>

                {/* Modal Content */}
                <div className="flex-1 overflow-y-auto p-8 space-y-8">
                   <div className="bg-orange-50/50 p-8 rounded-[2rem] border border-orange-100 text-slate-700 leading-relaxed font-medium text-lg">
                      {selectedAssignment.description}
                   </div>
                   
                   {selectedAssignment.attachmentUrl && (
                      <a href={selectedAssignment.attachmentUrl} target="_blank" className="flex items-center gap-4 p-5 border border-slate-200 rounded-2xl hover:border-blue-400 hover:bg-blue-50/30 transition-all group shadow-sm hover:shadow-md">
                          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                             <FileText className="w-6 h-6" />
                          </div>
                          <div>
                             <p className="font-bold text-slate-800 group-hover:text-blue-600">下载作业附件 (PDF)</p>
                             <p className="text-xs text-slate-400 mt-0.5">点击下载查看完整题目</p>
                          </div>
                          <div className="ml-auto">
                              <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-blue-400" />
                          </div>
                      </a>
                   )}

                   <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-1 h-6 bg-green-500 rounded-full"></div>
                        <h4 className="font-black text-slate-800 text-lg">填写答案</h4>
                      </div>
                      
                      <textarea 
                        value={answerText}
                        onChange={e => setAnswerText(e.target.value)}
                        placeholder="在这里输入你的答案..." 
                        className="w-full h-40 p-6 bg-slate-50 border border-slate-200 rounded-[1.5rem] focus:outline-none focus:ring-2 focus:ring-orange-400/50 focus:border-orange-400 font-medium text-slate-700 transition-all"
                      ></textarea>

                      <div>
                         <label className={`relative block group cursor-pointer transition-all ${uploading ? 'pointer-events-none' : ''}`}>
                            <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                            
                            <div className={`border-2 border-dashed rounded-[1.5rem] p-8 flex flex-col items-center justify-center gap-4 transition-all min-h-[160px] ${uploading ? 'bg-slate-50 border-slate-200' : 'border-slate-300 bg-slate-50/50 hover:bg-orange-50/50 hover:border-orange-300'}`}>
                               
                               {uploading && uploadProgress ? (
                                  <div className="w-full max-w-sm">
                                      <div className="flex justify-between text-xs font-bold text-slate-500 mb-2">
                                          <span>{uploadProgress.status}</span>
                                          <span>{Math.round(uploadProgress.percent)}%</span>
                                      </div>
                                      <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden relative">
                                          <div 
                                            className="h-full bg-gradient-to-r from-orange-400 to-rose-500 transition-all duration-300 relative" 
                                            style={{ width: `${uploadProgress.percent}%` }}
                                          >
                                            <div className="absolute inset-0 bg-white/20 animate-[shimmer_1s_infinite] w-full h-full" style={{ backgroundImage: 'linear-gradient(45deg,rgba(255,255,255,.15) 25%,transparent 25%,transparent 50%,rgba(255,255,255,.15) 50%,rgba(255,255,255,.15) 75%,transparent 75%,transparent)', backgroundSize: '1rem 1rem' }}></div>
                                          </div>
                                      </div>
                                      <div className="flex justify-between text-[10px] font-bold text-slate-400 mt-2">
                                          <span>{uploadProgress.loaded}</span>
                                          <span>{uploadProgress.total}</span>
                                      </div>
                                  </div>
                               ) : uploadedUrl ? (
                                  <div className="relative w-full h-48 rounded-2xl overflow-hidden group-hover:opacity-80 transition-opacity shadow-lg">
                                      <img src={uploadedUrl} className="w-full h-full object-cover" />
                                      <div className="absolute bottom-2 right-2 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-md">
                                          <FileCheck className="w-3 h-3" /> 上传成功
                                      </div>
                                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <span className="text-white font-bold flex items-center gap-2"><ImageIcon className="w-4 h-4"/> 点击更换图片</span>
                                      </div>
                                  </div>
                               ) : (
                                  <>
                                    <div className="w-16 h-16 bg-white rounded-full shadow-lg flex items-center justify-center text-orange-500 group-hover:scale-110 transition-transform">
                                        <CloudUpload className="w-8 h-8" />
                                    </div>
                                    <div className="text-center">
                                        <p className="font-bold text-slate-700 text-lg group-hover:text-orange-600">点击拍照 / 上传图片</p>
                                        <p className="text-xs text-slate-400 mt-1">支持 JPG, PNG 格式 (大图自动压缩)</p>
                                    </div>
                                  </>
                               )}
                            </div>
                         </label>
                      </div>
                   </div>
                </div>

                {/* Footer */}
                <div className="p-6 md:p-8 border-t border-slate-100 bg-white sticky bottom-0 z-20">
                   <button 
                     onClick={handleSubmit}
                     disabled={submitting || (!answerText && !uploadedUrl)}
                     className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-lg shadow-xl hover:bg-orange-500 hover:shadow-orange-500/30 transition-all disabled:opacity-50 flex items-center justify-center gap-3 active:scale-[0.98]"
                   >
                      {submitting ? <Loader2 className="animate-spin w-6 h-6" /> : <Send className="w-6 h-6" />}
                      {submitting ? '正在提交作业...' : '确认提交作业'}
                   </button>
                </div>
             </div>
          </div>
       )}
    </div>
  );
};

export default StudentDashboard;
