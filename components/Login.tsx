
import React, { useState, useRef, useEffect } from 'react';
import { Teacher, Subject, UserRole, Student } from '../types';
import { dataService } from '../services/dataService';
import { Loader2, ShieldCheck, Lock, User, GraduationCap, ArrowRight, UserCircle, ChevronDown, Check, Sparkles } from 'lucide-react';

interface LoginProps {
  onTeacherLogin: (teacher: Teacher) => void;
  onStudentLogin: (student: Student) => void;
}

// --- Premium Custom Select Component ---

const CustomSelect = ({ 
  value, 
  onChange, 
  options 
}: { 
  value: string; 
  onChange: (val: string) => void; 
  options: { value: string; label: string; color?: string }[] 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOpt = options.find(o => o.value === value);

  return (
    <div className="relative group z-50" ref={containerRef}>
      {/* Trigger Button */}
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-5 py-4 bg-white/5 border backdrop-blur-md rounded-2xl font-bold text-white flex items-center justify-between transition-all duration-300 group-hover:bg-white/10 ${isOpen ? 'border-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.3)]' : 'border-white/10 hover:border-white/30'}`}
      >
        <span className="flex items-center gap-3">
          <span className={`w-2 h-2 rounded-full ${selectedOpt?.color || 'bg-blue-400'} shadow-[0_0_10px_currentColor]`}></span>
          <span className="text-sm tracking-wide">{selectedOpt?.label || '选择科目'}</span>
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-blue-400' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      <div className={`absolute left-0 right-0 mt-2 p-2 bg-[#0f172a]/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl transition-all duration-300 origin-top transform ${isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'}`}>
        {options.map((opt) => (
          <div 
            key={opt.value}
            onClick={() => { onChange(opt.value); setIsOpen(false); }}
            className={`px-4 py-3 rounded-xl cursor-pointer flex items-center justify-between group/item transition-all mb-1 last:mb-0 ${value === opt.value ? 'bg-blue-600/20' : 'hover:bg-white/5'}`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${value === opt.value ? 'bg-blue-500 text-white' : 'bg-white/5 text-slate-400 group-hover/item:bg-white/10 group-hover/item:text-white'}`}>
                 <span className="text-xs font-black">{opt.label.charAt(0)}</span>
              </div>
              <span className={`text-sm font-bold ${value === opt.value ? 'text-white' : 'text-slate-300 group-hover/item:text-white'}`}>
                {opt.label}
              </span>
            </div>
            {value === opt.value && <Check className="w-4 h-4 text-blue-400 animate-in zoom-in" />}
          </div>
        ))}
      </div>
    </div>
  );
};

// --- Main Component ---

const Login: React.FC<LoginProps> = ({ onTeacherLogin, onStudentLogin }) => {
  const [role, setRole] = useState<UserRole>('teacher');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Teacher Form State
  const [tUsername, setTUsername] = useState(''); 
  const [tPassword, setTPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [tName, setTName] = useState('');
  const [tSubject, setTSubject] = useState<string>(Subject.MATH);

  // Student Form State
  const [sName, setSName] = useState('');
  const [sPassword, setSPassword] = useState('');
  const [showResetModal, setShowResetModal] = useState(false);
  const [tempStudentId, setTempStudentId] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const handleTeacherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isRegister) {
        if (!tName || !tUsername || !tPassword) throw new Error('请填写完整信息');
        // Register directly to custom table
        const teacher = await dataService.teacherRegister({
          name: tName,
          subject: tSubject,
          username: tUsername,
          password: tPassword
        });
        onTeacherLogin(teacher);
      } else {
        // Login via custom table
        const teacher = await dataService.teacherLogin(tUsername, tPassword);
        onTeacherLogin(teacher);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || '操作失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const student = await dataService.studentLogin(sName, sPassword);
      if (student.needsReset) {
        setTempStudentId(student.id);
        setShowResetModal(true);
        setLoading(false);
        return;
      }
      onStudentLogin(student);
    } catch (err: any) {
      setError(err.message || '登录失败');
    } finally {
      if (!showResetModal) setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (newPassword.length < 6) {
      alert("新密码至少6位");
      return;
    }
    try {
      await dataService.changeStudentPassword(tempStudentId, newPassword);
      alert("密码修改成功，请重新登录");
      setShowResetModal(false);
      setSPassword('');
    } catch (e) {
      alert("修改失败");
    }
  };

  const bgGradient = role === 'teacher' 
    ? 'from-[#020617] via-[#0f172a] to-[#1e1b4b]'
    : 'from-orange-50 via-rose-50 to-amber-50';

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 relative overflow-hidden transition-colors duration-1000 bg-gradient-to-br ${bgGradient}`}>
      
      {/* Dynamic Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
         {role === 'teacher' ? (
           <>
             <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>
             <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] bg-blue-600/30 rounded-full blur-[120px] animate-pulse"></div>
             <div className="absolute bottom-[-10%] right-[20%] w-[600px] h-[600px] bg-purple-600/20 rounded-full blur-[120px] animate-pulse delay-1000"></div>
           </>
         ) : (
           <>
             <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-orange-300/30 rounded-full blur-[100px] animate-float"></div>
             <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-rose-300/30 rounded-full blur-[100px] animate-float delay-2000"></div>
           </>
         )}
      </div>

      <div className={`w-full max-w-[420px] backdrop-blur-2xl rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden animate-in fade-in zoom-in-95 duration-500 border ${role === 'teacher' ? 'bg-white/5 border-white/10 shadow-blue-900/20' : 'bg-white/60 border-white/40 shadow-orange-500/10'}`}>
        
        {/* Role Toggle */}
        <div className="p-2 m-2 bg-black/5 rounded-[1.8rem] flex relative backdrop-blur-md">
           <div className={`absolute top-2 bottom-2 w-[calc(50%-8px)] shadow-lg rounded-[1.4rem] transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${role === 'teacher' ? 'left-2 bg-slate-800' : 'left-[calc(50%+4px)] bg-white'}`}></div>
           <button onClick={()=>setRole('teacher')} className={`flex-1 relative z-10 py-3 text-sm font-black flex items-center justify-center gap-2 transition-colors duration-300 ${role==='teacher'?'text-white':'text-slate-500 hover:text-slate-800'}`}>
             <ShieldCheck className="w-4 h-4"/> 教师入口
           </button>
           <button onClick={()=>setRole('student')} className={`flex-1 relative z-10 py-3 text-sm font-black flex items-center justify-center gap-2 transition-colors duration-300 ${role==='student'?'text-orange-500':'text-slate-500 hover:text-slate-800'}`}>
             <GraduationCap className="w-4 h-4"/> 学生入口
           </button>
        </div>

        <div className="p-8 pt-6">
          <div className="text-center mb-10">
            <h1 className={`text-3xl font-black mb-2 tracking-tight ${role === 'teacher' ? 'text-white' : 'text-slate-800'}`}>
               {role === 'teacher' ? (isRegister ? '注册教师档案' : '教务系统') : '学生作业中心'}
            </h1>
            <p className={`font-medium text-sm ${role === 'teacher' ? 'text-blue-200/60' : 'text-slate-500'}`}>
               {role === 'teacher' ? (isRegister ? '创建您的专属数字化教学空间' : '欢迎回来，请输入账号继续') : '快乐学习，天天向上'}
            </p>
          </div>

          <form onSubmit={role === 'teacher' ? handleTeacherSubmit : handleStudentSubmit} className="space-y-5">
            
            {role === 'teacher' ? (
              <>
                 {/* Teacher Form */}
                 {isRegister && (
                    <div className="space-y-5 animate-in slide-in-from-left-4 duration-300">
                      <div className="relative group">
                          <UserCircle className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-400 transition-colors" />
                          <input 
                            type="text" 
                            placeholder="您的姓名 (如: 王老师)" 
                            value={tName}
                            onChange={e => setTName(e.target.value)}
                            className="w-full pl-14 pr-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-white/20 focus:outline-none focus:bg-white/10 focus:border-blue-500/50 focus:shadow-[0_0_20px_rgba(59,130,246,0.2)] transition-all font-bold text-sm"
                            required
                          />
                      </div>
                      <CustomSelect 
                        value={tSubject} 
                        onChange={(val) => setTSubject(val)}
                        options={[
                          { value: Subject.MATH, label: '数学 (Mathematics)', color: 'bg-blue-500' },
                          { value: Subject.ENGLISH, label: '英语 (English)', color: 'bg-purple-500' },
                          { value: Subject.CHINESE, label: '语文 (Chinese)', color: 'bg-red-500' }
                        ]}
                      />
                    </div>
                 )}

                 <div className="relative group">
                    <User className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-400 transition-colors" />
                    <input 
                      type="text" 
                      placeholder="设置用户名 (如: wanglaoshi)" 
                      value={tUsername}
                      onChange={e => setTUsername(e.target.value)}
                      className="w-full pl-14 pr-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-white/20 focus:outline-none focus:bg-white/10 focus:border-blue-500/50 focus:shadow-[0_0_20px_rgba(59,130,246,0.2)] transition-all font-bold text-sm"
                      required
                    />
                 </div>

                 <div className="relative group">
                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-400 transition-colors" />
                    <input 
                      type="password" 
                      placeholder="设置密码" 
                      value={tPassword}
                      onChange={e => setTPassword(e.target.value)}
                      className="w-full pl-14 pr-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-white/20 focus:outline-none focus:bg-white/10 focus:border-blue-500/50 focus:shadow-[0_0_20px_rgba(59,130,246,0.2)] transition-all font-bold text-sm"
                      required
                    />
                 </div>
              </>
            ) : (
              <>
                 {/* Student Form */}
                 <div className="relative group">
                    <User className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-orange-400 transition-colors" />
                    <input 
                      type="text" 
                      placeholder="输入你的姓名 (如: 张小明)" 
                      value={sName}
                      onChange={e => setSName(e.target.value)}
                      className="w-full pl-14 pr-6 py-4 bg-white border border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-orange-400 focus:shadow-[0_0_20px_rgba(251,146,60,0.2)] transition-all font-bold text-sm"
                      required
                    />
                 </div>
                 <div className="relative group">
                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-orange-400 transition-colors" />
                    <input 
                      type="password" 
                      placeholder="输入密码 (默认 123456)" 
                      value={sPassword}
                      onChange={e => setSPassword(e.target.value)}
                      className="w-full pl-14 pr-6 py-4 bg-white border border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-orange-400 focus:shadow-[0_0_20px_rgba(251,146,60,0.2)] transition-all font-bold text-sm"
                      required
                    />
                 </div>
              </>
            )}

            {error && (
               <div className={`p-4 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-2 animate-in slide-in-from-top-2 ${role === 'teacher' ? 'bg-red-500/20 text-red-200 border border-red-500/30' : 'bg-red-50 text-red-500 border border-red-100'}`}>
                 <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></div>
                 {error}
               </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className={`w-full py-4 rounded-2xl font-black text-white shadow-xl transition-all flex items-center justify-center gap-2 group active:scale-[0.98] mt-4 ${
                role === 'teacher' 
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-blue-900/50 hover:shadow-blue-900/80' 
                  : 'bg-gradient-to-r from-orange-500 to-rose-500 shadow-orange-500/30 hover:shadow-orange-500/50'
              }`}
            >
              {loading ? <Loader2 className="animate-spin w-5 h-5" /> : (
                <>
                  {role === 'teacher' ? (isRegister ? '立即注册并登录' : '登 录') : '开启学习之旅'} 
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
            
            {role === 'teacher' && (
              <div className="text-center mt-6">
                <button type="button" onClick={() => setIsRegister(!isRegister)} className="text-xs font-bold text-slate-400 hover:text-white transition-colors flex items-center justify-center gap-1 mx-auto group">
                   <Sparkles className="w-3 h-3 group-hover:text-blue-400 transition-colors" />
                   {isRegister ? '已有账号？返回直接登录' : '没有账号？创建教师档案'}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Force Password Reset Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
           <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full animate-in zoom-in-95">
              <h3 className="text-xl font-black text-slate-800 mb-2">首次登录安全提示</h3>
              <p className="text-slate-500 text-sm mb-6 font-medium">为了您的账户安全，请修改默认密码。</p>
              <input 
                type="password" 
                placeholder="设置新密码 (至少6位)" 
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl mb-4 font-bold focus:border-orange-500 focus:outline-none"
              />
              <button onClick={handlePasswordReset} className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-black transition-colors">
                 确认修改
              </button>
           </div>
        </div>
      )}
    </div>
  );
};

export default Login;
