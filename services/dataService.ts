
import { supabase, supabaseUrl, supabaseKey } from './supabaseClient';
import { Student, Homework, Exam, LessonPlan, Assignment, Teacher, Subject, Textbook } from '../types';
import * as XLSX from 'xlsx';

export type UploadProgressCallback = (status: 'compressing' | 'uploading', percent: number, loaded: number, total: number) => void;

export const dataService = {
  // --- CUSTOM TEACHER AUTH (No Supabase Auth) ---

  async teacherLogin(username: string, password: string): Promise<Teacher> {
    const cleanUsername = username.trim();
    const { data, error } = await supabase
      .from('teachers')
      .select('*')
      .eq('username', cleanUsername)
      .eq('password', password)
      .single();

    if (error || !data) throw new Error('用户名或密码错误');

    return {
      id: data.id,
      name: data.full_name,
      subject: data.subject as Subject,
      avatar: data.avatar_url
    };
  },

  async teacherRegister(teacher: { username: string; password: string; name: string; subject: string }): Promise<Teacher> {
    const cleanUsername = teacher.username.trim();
    const { data: existing } = await supabase.from('teachers').select('id').eq('username', cleanUsername).single();
    if (existing) throw new Error('该用户名已被注册');

    const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${cleanUsername}`;

    const { data, error } = await supabase
      .from('teachers')
      .insert({
        username: cleanUsername,
        password: teacher.password,
        full_name: teacher.name,
        subject: teacher.subject,
        avatar_url: avatarUrl
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      name: data.full_name,
      subject: data.subject as Subject,
      avatar: data.avatar_url
    };
  },

  async updateTeacherAvatar(teacherId: string, file: File): Promise<string> {
    const url = await this.uploadFile(file, 'avatars');
    const { error } = await supabase.from('teachers').update({ avatar_url: url }).eq('id', teacherId);
    if (error) throw error;
    return url;
  },

  // --- STUDENT AUTH ---

  async studentLogin(name: string, password: string) {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('name', name)
      .eq('password', password)
      .single();

    if (error) throw new Error('用户名或密码错误');
    if (!data) throw new Error('用户不存在');

    return {
      id: data.id,
      name: data.name,
      grade: data.grade,
      className: data.class_name,
      avatar: data.avatar_url,
      recentScores: data.recent_scores || [],
      needsReset: data.needs_reset
    } as Student;
  },

  async changeStudentPassword(studentId: string, newPassword: string) {
    const { error } = await supabase.from('students').update({ password: newPassword, needs_reset: false }).eq('id', studentId);
    if (error) throw error;
  },

  // --- STUDENT MANAGEMENT ---

  async addStudent(name: string, grade: string, className: string) {
    const { data, error } = await supabase
      .from('students')
      .insert({
        name,
        grade,
        class_name: className,
        password: '123456', 
        needs_reset: true,
        avatar_url: `https://api.dicebear.com/7.x/notionists/svg?seed=${name}`
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteStudent(id: string) {
    const { error } = await supabase.from('students').delete().eq('id', id);
    if (error) throw error;
  },

  // --- ASSIGNMENTS ---

  async createAssignment(teacherId: string, assignment: Omit<Assignment, 'id' | 'createdAt' | 'teacherId'>) {
    const { error } = await supabase.from('assignments').insert({
      teacher_id: teacherId,
      title: assignment.title,
      description: assignment.description,
      class_target: assignment.classTarget,
      attachment_url: assignment.attachmentUrl
    });
    if (error) throw error;
  },

  async fetchAssignments(classTarget: string) {
    const { data, error } = await supabase.from('assignments').select('*').eq('class_target', classTarget).order('created_at', { ascending: false });
    if (error) throw error;
    return data.map((a: any) => ({
      id: a.id,
      teacherId: a.teacher_id,
      title: a.title,
      description: a.description,
      classTarget: a.class_target,
      attachmentUrl: a.attachment_url,
      createdAt: a.created_at
    })) as Assignment[];
  },

  // --- HOMEWORK SUBMISSION ---

  async submitHomework(studentId: string, assignmentId: string, content: string, imageUrl?: string) {
    const { data: assignment } = await supabase.from('assignments').select('title').eq('id', assignmentId).single();
    const { error } = await supabase.from('homeworks').insert({
      student_id: studentId,
      assignment_id: assignmentId,
      title: assignment?.title || '学生作业',
      content: content,
      image_url: imageUrl,
      status: 'pending',
      submitted_at: new Date().toISOString()
    });
    if (error) throw error;
  },

  // --- FILE UPLOAD (Simplified Standard SDK) ---

  async uploadFile(file: File, bucketName: string = 'homeworks', onProgress?: UploadProgressCallback): Promise<string> {
    return new Promise((resolve, reject) => {
        // 1. 生成唯一文件名 (防止中文乱码，加个时间戳)
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
        
        // 2. 手动拼接 API 地址 (核心步骤!)
        // .replace(/\/$/, '') 是为了把 URL 末尾可能多余的斜杠去掉，防止拼成 //storage
        const cleanBaseUrl = supabaseUrl.replace(/\/$/, '');
        const url = `${cleanBaseUrl}/storage/v1/object/${bucketName}/${fileName}`;

        // 3. 创建请求对象 (相当于 C# 的 new HttpClient())
        const xhr = new XMLHttpRequest();
        xhr.open('POST', url);

        // 4. 塞入鉴权头 (相当于 C# client.DefaultRequestHeaders.Add)
        // 这里的 Key 就是你连数据库用的那个 anon key
        xhr.setRequestHeader('Authorization', `Bearer ${supabaseKey}`);
        xhr.setRequestHeader('apikey', supabaseKey);
        xhr.setRequestHeader('x-upsert', 'false'); // 不覆盖同名文件

        // 5. 绑定进度条事件 (SDK 做不到的就在这里!)
        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable && onProgress) {
                // 计算百分比
                const percent = (event.loaded / event.total) * 100;
                // 回调给前端界面
                onProgress('uploading', percent, event.loaded, event.total);
            }
        };

        // 6. 处理结果
        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                // 上传成功了，我们需要自己拼出“公开访问链接”返回给数据库存起来
                const publicUrl = `${cleanBaseUrl}/storage/v1/object/public/${bucketName}/${fileName}`;
                console.log("✅ 上传成功:", publicUrl);
                resolve(publicUrl);
            } else {
                console.error("❌ 上传失败:", xhr.responseText);
                reject(new Error(`上传失败: ${xhr.statusText}`));
            }
        };

        xhr.onerror = () => reject(new Error('网络请求致命错误'));

        // 7. 发射!
        xhr.send(file);
    });
  },

  async uploadTextbook(teacherId: string, file: File, onProgress?: UploadProgressCallback): Promise<Textbook> {
    // Reuse upload for PDF
    // 'textbooks' matches the bucket name created in SQL
    const url = await this.uploadFile(file, 'textbooks', onProgress);
    const title = file.name.replace(/\.[^/.]+$/, "");
    
    const { data, error } = await supabase
      .from('textbooks')
      .insert({ teacher_id: teacherId, title: title, file_url: url })
      .select().single();

    if (error) throw error;
    
    return { id: data.id, title: data.title, fileUrl: data.file_url, createdAt: data.created_at };
  },

  async compressImage(file: File): Promise<File> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 1920;

        if (width > height && width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject('Canvas error');
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          if (!blob) return reject('Compression error');
          resolve(new File([blob], file.name, { type: 'image/jpeg' }));
        }, 'image/jpeg', 0.7);
      };
      img.onerror = reject;
    });
  },

  // --- DASHBOARD DATA ---
  async fetchDashboardData() {
    try {
      const [studentsRes, homeworksRes, examsRes] = await Promise.all([
        supabase.from('students').select('*').order('name'),
        supabase.from('homeworks').select('*').order('submitted_at', { ascending: false }),
        supabase.from('exams').select('*').order('date', { ascending: false })
      ]);

      if (studentsRes.error) throw studentsRes.error;
      if (homeworksRes.error) throw homeworksRes.error;
      if (examsRes.error) throw examsRes.error;

      const students: Student[] = (studentsRes.data || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        grade: s.grade || '三年级二班',
        className: s.class_name || '三年级二班',
        avatar: s.avatar_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${s.name}`,
        recentScores: s.recent_scores || []
      }));

      const homeworkList: Homework[] = (homeworksRes.data || []).map((h: any) => ({
        id: h.id,
        studentId: h.student_id,
        title: h.title,
        content: h.content,
        imageUrl: h.image_url,
        submittedAt: h.submitted_at,
        status: h.status as 'pending' | 'graded',
        score: h.score,
        feedback: h.feedback,
        aiAnalysis: h.ai_analysis
      }));

      const exams: Exam[] = (examsRes.data || []).map((e: any) => ({
        id: e.id,
        title: e.title,
        date: e.date,
        averageScore: e.average_score,
        totalStudents: e.total_students || students.length,
        details: e.details
      }));

      return { students, homeworkList, exams };
    } catch (error) {
      console.error('Data Fetch Error:', error);
      return { students: [], homeworkList: [], exams: [] };
    }
  },

  async updateHomework(id: string, updates: Partial<Homework>) {
    const dbUpdates: any = {};
    if (updates.status) dbUpdates.status = updates.status;
    if (updates.score !== undefined) dbUpdates.score = updates.score;
    if (updates.feedback) dbUpdates.feedback = updates.feedback;
    if (updates.aiAnalysis) dbUpdates.ai_analysis = updates.aiAnalysis;
    const { error } = await supabase.from('homeworks').update(dbUpdates).eq('id', id);
    if (error) throw error;
  },

  async createLessonPlan(teacherId: string, plan: LessonPlan) {
    if (!teacherId) return;
    await supabase.from('lesson_plans').insert({ teacher_id: teacherId, topic: plan.topic, outline: plan });
  },

  async fetchTextbooks(teacherId: string): Promise<Textbook[]> {
    const { data, error } = await supabase.from('textbooks').select('*').eq('teacher_id', teacherId).order('created_at', { ascending: false });
    if (error) throw error;
    return data.map((t: any) => ({ id: t.id, title: t.title, fileUrl: t.file_url, createdAt: t.created_at }));
  },

  async deleteTextbook(id: string) {
    const { error } = await supabase.from('textbooks').delete().eq('id', id);
    if (error) throw error;
  },

  // --- EXCEL IMPORT ---
  async parseAndSaveExamExcel(buffer: ArrayBuffer, filename: string) {
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet);
    if (jsonData.length === 0) throw new Error("Excel 文件为空");
    const keys = Object.keys(jsonData[0]);
    const nameKey = keys.find(k => k.includes('姓名') || k.toLowerCase().includes('name'));
    if (!nameKey) throw new Error("未找到'姓名'列");
    const excludedCols = [nameKey, '总分', 'total', 'Total', 'id', 'ID', '序号', 'No', 'No.'];
    const subjects = keys.filter(k => !excludedCols.includes(k) && !isNaN(Number(jsonData[0][k])));
    const studentScores = jsonData.map(row => {
      const scores: Record<string, number> = {};
      let calculatedTotal = 0;
      subjects.forEach(sub => {
        const val = Number(row[sub]) || 0;
        scores[sub] = val;
        calculatedTotal += val;
      });
      const excelTotal = Number(row['总分'] || row['Total']);
      return { name: row[nameKey], scores, total: !isNaN(excelTotal) && excelTotal > 0 ? excelTotal : calculatedTotal };
    });
    const classTotalScore = studentScores.reduce((sum, s) => sum + s.total, 0);
    const average = studentScores.length > 0 ? parseFloat((classTotalScore / studentScores.length).toFixed(1)) : 0;
    const title = filename.replace(/\.[^/.]+$/, "");
    const { error } = await supabase.from('exams').insert({
      title,
      date: new Date().toISOString().split('T')[0],
      average_score: average,
      total_students: studentScores.length,
      details: { subjects, students: studentScores }
    });
    if (error) throw error;
  }
};
