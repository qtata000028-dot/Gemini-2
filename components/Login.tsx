import React, { useState, useEffect } from 'react';
import { Teacher } from '../types';
import { Loader2, ShieldCheck, Search, UserCheck, Fingerprint } from 'lucide-react';

interface LoginProps {
  onLogin: (teacher: Teacher) => void;
  teachers: Teacher[];
}

const Login: React.FC<LoginProps> = ({ onLogin, teachers }) => {
  const [inputName, setInputName] = useState('');
  const [matchedTeacher, setMatchedTeacher] = useState<Teacher | null>(null);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Real-time search simulation
  useEffect(() => {
    if (!inputName) {
      setMatchedTeacher(null);
      return;
    }

    const timer = setTimeout(() => {
      // Fuzzy match: remove spaces, case insensitive
      const cleanInput = inputName.trim().replace(/\s/g, '');
      const found = teachers.find(t => t.name.includes(cleanInput));
      
      if (found && cleanInput.length >= 2) {
        setVerifying(true);
        // Play verify animation
        setTimeout(() => {
          setVerifying(false);
          setMatchedTeacher(found);
        }, 600);
      } else {
        setMatchedTeacher(null);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [inputName, teachers]);

  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!matchedTeacher) return;

    setLoading(true);
    setTimeout(() => {
        onLogin(matchedTeacher);
    }, 800);
  };

  const handleQuickLogin = (teacher: Teacher) => {
    setInputName(teacher.name);
    setVerifying(true);
    setTimeout(() => {
        setVerifying(false);
        setMatchedTeacher(teacher);
        setLoading(true);
        setTimeout(() => {
            onLogin(teacher);
        }, 800);
    }, 400);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-[#e0e5ec]">
      
      {/* Dynamic Background Shapes */}
      <div className={`absolute top-0 left-0 w-full h-full overflow-hidden transition-opacity duration-1000 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
         <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-400/20 rounded-full blur-[100px] animate-pulse"></div>
         <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-400/20 rounded-full blur-[100px] animate-pulse delay-1000"></div>
      </div>

      <div className={`transition-all duration-1000 transform relative z-10 w-full max-w-md px-4 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
          <div className="flex flex-col items-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-slate-800 to-black rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-500/20 mb-6 animate-float ring-4 ring-white/50 border border-white/20 backdrop-blur-md">
                <ShieldCheck className="w-10 h-10 text-blue-400" />
            </div>
            <h1 className="text-4xl font-black text-slate-800 tracking-tighter text-center">
              新达小学 <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">教务中枢</span>
            </h1>
            <p className="text-slate-400 font-bold mt-2 tracking-widest text-xs uppercase">Security Access Level 4</p>
          </div>

          <div className="glass-panel rounded-[2rem] overflow-hidden shadow-2xl relative backdrop-blur-xl border border-white/60">
             {/* Header Decoration */}
             <div className="h-2 w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
             
             <div className="p-8 relative">
                <form onSubmit={handleLogin} className="space-y-6">
                   <div className="space-y-2">
                       <label className="text-xs font-black text-slate-400 uppercase tracking-wider flex justify-between">
                          <span>Identity Input</span>
                          <span className={`${matchedTeacher ? 'text-green-500' : 'text-slate-300'}`}>
                            {verifying ? 'SCANNING...' : matchedTeacher ? 'VERIFIED' : 'WAITING'}
                          </span>
                       </label>
                       
                       <div className="relative group">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                             {verifying ? (
                               <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                             ) : matchedTeacher ? (
                               <UserCheck className="h-5 w-5 text-green-500" />
                             ) : (
                               <Search className="h-5 w-5 text-slate-400" />
                             )}
                          </div>
                          
                          <input
                            type="text"
                            value={inputName}
                            onChange={(e) => setInputName(e.target.value)}
                            disabled={loading}
                            className={`block w-full pl-12 pr-4 py-5 bg-white/50 border-2 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-bold text-lg text-slate-800 placeholder:text-slate-300 placeholder:font-normal ${
                              matchedTeacher ? 'border-green-500/50 bg-green-50/30' : 'border-slate-200 focus:border-blue-500'
                            }`}
                            placeholder="输入您的姓名"
                            autoComplete="off"
                          />
                       </div>
                   </div>

                   {/* Quick Access Area */}
                   {!matchedTeacher && !inputName && (
                      <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4">
                         <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">快速通行证 (Quick Access)</p>
                         <div className="grid grid-cols-3 gap-3">
                            {teachers.map(t => (
                                <button 
                                    key={t.id}
                                    type="button"
                                    onClick={() => handleQuickLogin(t)}
                                    className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white/40 border border-white hover:bg-white hover:shadow-lg hover:-translate-y-1 transition-all group active:scale-95"
                                >
                                    <div className="relative">
                                      <img src={t.avatar} alt={t.name} className="w-12 h-12 rounded-full border-2 border-slate-100 group-hover:border-blue-400 transition-colors object-cover bg-white" />
                                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                                    </div>
                                    <span className="text-xs font-bold text-slate-600">{t.name}</span>
                                </button>
                            ))}
                         </div>
                      </div>
                   )}

                   {/* Identity Card Result */}
                   <div className={`transition-all duration-500 ease-out overflow-hidden ${matchedTeacher ? 'max-h-48 opacity-100 scale-100' : 'max-h-0 opacity-0 scale-95'}`}>
                      {matchedTeacher && (
                        <div className="bg-gradient-to-r from-slate-50 to-white border border-slate-100 rounded-2xl p-4 flex items-center gap-4 relative overflow-hidden">
                           <div className="absolute right-0 top-0 p-10 bg-green-500/10 rounded-full blur-xl -mr-5 -mt-5"></div>
                           <div className="relative">
                             <div className="w-14 h-14 rounded-full p-1 bg-gradient-to-br from-green-400 to-blue-500 animate-in zoom-in spin-in-12 duration-500">
                               <img src={matchedTeacher.avatar} alt={matchedTeacher.name} className="w-full h-full rounded-full border-2 border-white object-cover bg-white" />
                             </div>
                             <div className="absolute -bottom-1 -right-1 bg-green-500 text-white p-1 rounded-full border-2 border-white">
                               <UserCheck className="w-3 h-3" />
                             </div>
                           </div>
                           <div className="relative z-10">
                              <h3 className="font-black text-lg text-slate-800">{matchedTeacher.name} 老师</h3>
                              <p className="text-xs font-bold text-slate-500">{matchedTeacher.subject}教学组</p>
                           </div>
                        </div>
                      )}
                   </div>

                   <button
                     type="submit"
                     disabled={!matchedTeacher || loading}
                     className={`w-full relative overflow-hidden py-4 rounded-2xl font-black text-lg shadow-xl transition-all transform hover:-translate-y-1 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none ${
                        matchedTeacher ? 'bg-slate-900 text-white shadow-blue-500/30 hover:shadow-blue-500/50' : 'bg-slate-200 text-slate-400 shadow-none'
                     }`}
                   >
                     <span className="flex items-center justify-center gap-2 relative z-10">
                         {loading ? (
                           <>
                             <Loader2 className="w-5 h-5 animate-spin" />
                             <span>接入系统...</span>
                           </>
                         ) : (
                           <>
                             <span>{matchedTeacher ? '确认身份并登录' : '等待识别...'}</span>
                             {matchedTeacher && <Fingerprint className="w-5 h-5" />}
                           </>
                         )}
                     </span>
                     {matchedTeacher && !loading && (
                        <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]"></div>
                     )}
                   </button>
                </form>
             </div>
          </div>
      </div>
    </div>
  );
};

export default Login;