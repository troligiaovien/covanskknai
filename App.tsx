
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Message, User, AppView } from './types';
import { geminiService } from './services/geminiService';
import { SUGGESTED_TOPICS } from './constants';

const Logo: React.FC<{ className?: string, color?: string }> = ({ className = "w-10 h-10", color = "currentColor" }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 30C20 24.4772 24.4772 20 30 20H70C75.5228 20 80 24.4772 80 30V70C80 75.5228 75.5228 80 70 80H30C24.4772 80 20 75.5228 20 70V30Z" fill={color} fillOpacity="0.1"/>
    <path d="M50 25V75M25 50H75" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.2"/>
    <path d="M30 40C30 34.4772 34.4772 30 40 30H60C65.5228 30 70 34.4772 70 40V60C70 65.5228 65.5228 70 60 70H40C34.4772 70 30 65.5228 30 60V40Z" stroke={color} strokeWidth="4" strokeLinejoin="round"/>
    <path d="M40 45H60M40 55H55" stroke={color} strokeWidth="4" strokeLinecap="round"/>
    <circle cx="70" cy="30" r="8" fill="#10b981" />
    <path d="M68 30L72 30M70 28L70 32" stroke="white" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const MessageBubble: React.FC<{ message: Message }> = ({ message }) => {
  const isUser = message.role === 'user';
  
  const renderMarkdown = (content: string) => {
    // @ts-ignore
    return { __html: window.marked.parse(content) };
  };

  const handleDownload = () => {
    const titleMatch = message.content.match(/^# (.*)$/m);
    const fileName = titleMatch ? `${titleMatch[1].substring(0, 30)}.doc` : `SKKN_${new Date().getTime()}.doc`;
    
    const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset='utf-8'><title>SKKN</title><style>
    body { font-family: 'Times New Roman', serif; line-height: 1.5; padding: 1in; }
    h1, h2, h3 { color: #000; }
    table { border-collapse: collapse; width: 100%; margin: 10px 0; }
    th, td { border: 1px solid black; padding: 8px; text-align: left; }
    </style></head><body>`;
    const footer = "</body></html>";
    
    // @ts-ignore
    const htmlContent = window.marked.parse(message.content);
    const blob = new Blob([header + htmlContent + footer], { type: 'application/msword' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-6 animate-fade-in group`}>
      <div className={`flex max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start gap-3`}>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isUser ? 'bg-blue-600 shadow-blue-200' : 'bg-emerald-600 shadow-emerald-200'} shadow-lg`}>
          {isUser ? <i className="fas fa-user text-white text-sm"></i> : <Logo className="w-6 h-6" color="white" />}
        </div>
        <div className="flex flex-col gap-2">
          <div className={`p-4 rounded-2xl shadow-sm border transition-all relative ${
            isUser ? 'bg-blue-600 text-white border-blue-500 rounded-tr-none' : 'bg-white text-slate-800 border-slate-200 rounded-tl-none'
          }`}>
            <div className="prose prose-sm md:prose-base prose-slate max-w-none prose-headings:text-inherit prose-p:text-inherit prose-strong:text-inherit prose-ul:text-inherit prose-ol:text-inherit" dangerouslySetInnerHTML={renderMarkdown(message.content)} />
            <div className={`text-[10px] mt-2 opacity-60 ${isUser ? 'text-right' : 'text-left'}`}>
              {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
          
          {!isUser && message.content.length > 50 && (
            <button 
              onClick={handleDownload}
              className="flex items-center gap-2 text-[11px] font-black text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg w-fit transition-all uppercase tracking-widest opacity-0 group-hover:opacity-100"
            >
              <i className="fas fa-download"></i>
              Tải Sáng Kiến (.doc)
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('login');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showStructureModal, setShowStructureModal] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [customStructure, setCustomStructure] = useState<string>(() => localStorage.getItem('skkn_custom_structure') || '');
  const [tempStructure, setTempStructure] = useState('');

  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedUsers = localStorage.getItem('skkn_users');
    let currentUsers: User[] = [];
    
    if (savedUsers) {
      currentUsers = JSON.parse(savedUsers);
      const adminUser = currentUsers.find(u => u.username === 'admin');
      if (adminUser && adminUser.password !== 'CTGVDG') {
        adminUser.password = 'CTGVDG';
        localStorage.setItem('skkn_users', JSON.stringify(currentUsers));
      }
    } else {
      const defaultAdmin: User = { username: 'admin', password: 'CTGVDG', role: 'admin', name: 'Quản trị viên' };
      currentUsers = [defaultAdmin];
      localStorage.setItem('skkn_users', JSON.stringify(currentUsers));
    }
    
    setUsers(currentUsers);

    const sessionUser = localStorage.getItem('skkn_session');
    if (sessionUser) {
      const parsed = JSON.parse(sessionUser);
      const validUser = currentUsers.find(u => u.username === parsed.username && u.password === parsed.password);
      if (validUser) {
        setCurrentUser(validUser);
        setView('chat');
      } else {
        localStorage.removeItem('skkn_session');
      }
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = users.find(u => u.username === loginUsername && u.password === loginPassword);
    if (user) {
      setCurrentUser(user);
      localStorage.setItem('skkn_session', JSON.stringify(user));
      setView('chat');
      setLoginError('');
    } else {
      setLoginError('Sai tài khoản hoặc mật khẩu!');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('skkn_session');
    setView('login');
    setMessages([]);
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (users.find(u => u.username === newUsername)) {
      alert("Tên đăng nhập đã tồn tại!");
      return;
    }
    const newUser: User = { username: newUsername, password: newPassword, name: newName, role: 'user' };
    const updatedUsers = [...users, newUser];
    setUsers(updatedUsers);
    localStorage.setItem('skkn_users', JSON.stringify(updatedUsers));
    setNewUsername('');
    setNewPassword('');
    setNewName('');
    alert("Tạo người dùng thành công!");
  };

  const handleDeleteUser = (username: string) => {
    if (username === 'admin') return;
    if (confirm(`Bạn có chắc muốn xóa tài khoản ${username}?`)) {
      const updatedUsers = users.filter(u => u.username !== username);
      setUsers(updatedUsers);
      localStorage.setItem('skkn_users', JSON.stringify(updatedUsers));
    }
  };

  const scrollToBottom = useCallback(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (view === 'chat') scrollToBottom();
  }, [messages, isTyping, view, scrollToBottom]);

  const saveStructure = () => {
    setCustomStructure(tempStructure);
    localStorage.setItem('skkn_custom_structure', tempStructure);
    setShowStructureModal(false);
  };

  const openStructureModal = () => {
    setTempStructure(customStructure);
    setShowStructureModal(true);
  };

  const handleSuggestionClick = (topic: string) => {
    handleSend(topic);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
      alert("Hỗ trợ định dạng PDF.");
      return;
    }
    setIsExtracting(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result?.toString().split(',')[1];
        if (base64) {
          const extracted = await geminiService.extractStructureFromFile(base64, file.type);
          setTempStructure(extracted);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      alert("Lỗi trích xuất.");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSend = async (text: string = inputText) => {
    if (!text.trim() || isTyping) return;
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);
    try {
      const history = messages.map(m => ({ role: (m.role === 'assistant' ? 'model' : 'user') as 'user' | 'model', parts: [{ text: m.content }] }));
      const finalPrompt = customStructure ? `[CẤU TRÚC FORM BẮT BUỘC]:\n${customStructure}\n\n[YÊU CẦU]:\nHãy viết Sáng kiến kinh nghiệm cho đề tài: ${text}. Bám sát cấu trúc trên.` : text;
      const stream = await geminiService.generateSKKNContent(finalPrompt, history);
      let assistantMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: '', timestamp: Date.now() };
      setMessages(prev => [...prev, assistantMsg]);
      let fullContent = '';
      for await (const chunk of stream) {
        if (chunk.text) {
          fullContent += chunk.text;
          setMessages(prev => {
            const last = [...prev];
            last[last.length - 1] = { ...assistantMsg, content: fullContent };
            return last;
          });
        }
      }
    } catch (error) {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: "Lỗi kết nối.", timestamp: Date.now() }]);
    } finally {
      setIsTyping(false);
    }
  };

  if (view === 'login') {
    return (
      <div className="h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl w-full max-w-md animate-fade-in border border-slate-100">
          <div className="flex flex-col items-center mb-10">
            <div className="w-20 h-20 bg-blue-600 rounded-[2rem] flex items-center justify-center shadow-xl mb-4">
              <Logo className="w-12 h-12" color="white" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Hệ Thống SKKN AI</h1>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-2">Dành cho cán bộ giáo viên</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Tài khoản</label>
              <input 
                type="text" 
                value={loginUsername} 
                onChange={(e) => setLoginUsername(e.target.value)}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium"
                placeholder="Nhập tên đăng nhập..."
                required
              />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Mật khẩu</label>
              <input 
                type="password" 
                value={loginPassword} 
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium"
                placeholder="••••••••"
                required
              />
            </div>
            {loginError && <p className="text-red-500 text-xs font-bold text-center animate-shake">{loginError}</p>}
            <button type="submit" className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-blue-500/30 transition-all active:scale-95">
              Đăng nhập hệ thống
            </button>
          </form>
          <div className="mt-8 pt-8 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400 font-medium">Tài khoản được cấp bởi Quản trị viên của bạn.</p>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'admin') {
    return (
      <div className="flex h-screen bg-slate-50 overflow-hidden">
        <aside className="w-80 bg-slate-900 flex flex-col shadow-2xl z-20">
          <div className="p-8 flex items-center gap-3 border-b border-white/10">
            <Logo className="w-10 h-10" color="white" />
            <span className="font-black text-xl text-white tracking-tight">Admin CP</span>
          </div>
          <div className="flex-1 p-6 space-y-4">
            <button onClick={() => setView('chat')} className="w-full py-4 px-5 bg-white/5 hover:bg-white/10 text-white rounded-2xl flex items-center gap-3 transition-all text-sm font-bold">
              <i className="fas fa-comment-dots"></i> Quay lại Chat AI
            </button>
          </div>
          <div className="p-6 border-t border-white/10">
            <button onClick={handleLogout} className="w-full py-3 px-5 text-red-400 hover:bg-red-500/10 rounded-2xl flex items-center gap-3 transition-all text-sm font-bold">
              <i className="fas fa-sign-out-alt"></i> Đăng xuất
            </button>
          </div>
        </aside>
        <main className="flex-1 p-10 overflow-y-auto">
          <div className="max-w-5xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">Quản lý người dùng</h2>
              <div className="bg-blue-600 text-white px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest">
                {users.length} Tài khoản
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="md:col-span-1">
                <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-xl space-y-4">
                  <h3 className="font-black text-slate-900 uppercase tracking-widest text-xs flex items-center gap-2">
                    <i className="fas fa-plus-circle text-blue-600"></i> Thêm tài khoản
                  </h3>
                  <form onSubmit={handleCreateUser} className="space-y-4">
                    <input type="text" placeholder="Họ và tên" value={newName} onChange={e => setNewName(e.target.value)} required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none" />
                    <input type="text" placeholder="Tên đăng nhập" value={newUsername} onChange={e => setNewUsername(e.target.value)} required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none" />
                    <input type="password" placeholder="Mật khẩu" value={newPassword} onChange={e => setNewPassword(e.target.value)} required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none" />
                    <button type="submit" className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-black transition-all">Tạo tài khoản mới</button>
                  </form>
                </div>
              </div>
              <div className="md:col-span-2">
                <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Họ tên</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tài khoản</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Quyền</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Hành động</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {users.map(u => (
                        <tr key={u.username} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold">{u.name.substring(0,2).toUpperCase()}</div>
                              <span className="font-bold text-sm text-slate-700">{u.name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-slate-500">{u.username}</td>
                          <td className="px-6 py-4">
                            <span className={`text-[9px] font-black px-2 py-1 rounded-full uppercase tracking-widest ${u.role === 'admin' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {u.role !== 'admin' && (
                              <button onClick={() => handleDeleteUser(u.username)} className="text-red-400 hover:text-red-600 transition-colors">
                                <i className="fas fa-trash"></i>
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden font-sans">
      <aside className="w-80 bg-white border-r border-slate-200 flex flex-col hidden lg:flex shadow-xl z-20">
        <div className="p-6 border-b border-slate-100 flex items-center gap-3 bg-gradient-to-r from-slate-900 to-slate-800 text-white">
          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg shadow-black/20 overflow-hidden">
            <Logo className="w-9 h-9" color="#2563eb" />
          </div>
          <div>
            <h1 className="font-black text-xl leading-none tracking-tight">SKKN AI</h1>
            <span className="text-[10px] text-blue-400 font-bold uppercase tracking-[0.2em]">HÀNH CHÍNH SỐ</span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-xs">
              {currentUser?.name.substring(0,1).toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Đang đăng nhập</p>
              <h4 className="font-bold text-sm text-slate-700 truncate">{currentUser?.name}</h4>
            </div>
          </div>
          <div>
            <button onClick={openStructureModal} className={`w-full py-4 px-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all font-bold text-sm ${
              customStructure ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100' : 'bg-blue-50 border-blue-100 text-blue-700 hover:bg-blue-100'
            }`}>
              <i className={`fas ${customStructure ? 'fa-check-circle text-lg' : 'fa-file-signature text-lg'}`}></i>
              {customStructure ? 'Cấu trúc Form: Đã nạp' : 'Tải Form Cấu trúc'}
            </button>
          </div>
          <div className="h-px bg-slate-100 w-full"></div>
          <div>
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-4 px-1 flex items-center justify-between">
              <span>ĐỀ TÀI TIÊU BIỂU</span>
            </h3>
            <div className="space-y-2">
              {SUGGESTED_TOPICS.map((topic, i) => (
                <button key={i} onClick={() => handleSuggestionClick(topic)} className="w-full text-left px-4 py-3 text-sm text-slate-600 hover:bg-blue-50 hover:text-blue-700 border border-transparent hover:border-blue-100 rounded-xl transition-all duration-300 flex items-start gap-3 group">
                  <span className="mt-1 text-blue-300 group-hover:text-blue-500"><i className="fas fa-lightbulb text-xs"></i></span>
                  <span className="flex-1 leading-snug">{topic}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        
        {/* Footer info in sidebar */}
        <div className="p-5 border-t border-slate-100 bg-slate-50/50">
          <div className="text-center space-y-1 mb-4">
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Phát triển bởi</p>
             <p className="text-xs font-black text-slate-700">Chuyên gia Trần Thế Việt</p>
             <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-blue-600">
               <i className="fab fa-whatsapp"></i>
               <span>Zalo: 0378 472 960</span>
             </div>
          </div>
          <div className="space-y-2">
            {currentUser?.role === 'admin' && (
              <button onClick={() => setView('admin')} className="w-full py-3 px-4 text-xs font-black text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all flex items-center justify-center gap-2 uppercase tracking-widest">
                <i className="fas fa-user-shield"></i> Quản trị hệ thống
              </button>
            )}
            <button onClick={handleLogout} className="w-full py-3 px-4 text-xs font-black text-slate-400 hover:text-red-500 hover:bg-white rounded-xl transition-all flex items-center justify-center gap-2 border border-transparent hover:border-red-100 uppercase tracking-widest">
              <i className="fas fa-power-off"></i> Đăng xuất
            </button>
          </div>
        </div>
      </aside>
      <main className="flex-1 flex flex-col relative h-full bg-slate-50">
        <header className="bg-white/90 backdrop-blur-md border-b border-slate-200 p-4 flex items-center justify-between sticky top-0 z-30 lg:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Logo className="w-7 h-7" color="white" />
            </div>
            <span className="font-black text-slate-900 tracking-tight">SKKN AI</span>
          </div>
          <button onClick={handleLogout} className="text-red-500 font-black text-[10px] uppercase"><i className="fas fa-power-off"></i></button>
        </header>
        <div className="flex-1 overflow-y-auto p-4 md:p-10 space-y-6">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-2xl mx-auto py-12">
              <div className="relative mb-10 group">
                <div className="absolute inset-0 bg-blue-600 rounded-[3rem] blur-2xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
                <div className="relative w-32 h-32 bg-white rounded-[3rem] shadow-2xl flex items-center justify-center border border-slate-100">
                  <Logo className="w-20 h-20" color="#2563eb" />
                </div>
              </div>
              <h2 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">Chào {currentUser?.name},</h2>
              <p className="text-slate-500 mb-12 text-lg font-medium">Bạn cần trợ giúp gì cho Sáng kiến kinh nghiệm hôm nay?</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full px-4">
                {SUGGESTED_TOPICS.slice(0, 4).map((t, i) => (
                  <button key={i} onClick={() => handleSuggestionClick(t)} className="p-6 bg-white border border-slate-200 rounded-[1.5rem] hover:border-blue-400 hover:shadow-2xl transition-all text-sm font-bold text-slate-700 text-left flex items-start gap-4">
                    <span className="w-8 h-8 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center text-xs shrink-0">{i+1}</span>
                    <span className="flex-1 py-1 leading-snug">"{t}"</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto w-full">
              {messages.map(msg => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
              {isTyping && (
                <div className="flex items-center gap-3 text-slate-500 text-xs font-black uppercase tracking-widest ml-14 bg-white/80 backdrop-blur shadow-sm w-fit px-5 py-3 rounded-full border border-slate-200 animate-pulse">
                  <div className="flex space-x-1.5"><div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div><div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce [animation-delay:0.2s]"></div><div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce [animation-delay:0.4s]"></div></div>
                  <span>Đang phân tích dữ liệu...</span>
                </div>
              )}
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
        <div className="p-4 md:p-8 bg-gradient-to-t from-slate-100 via-slate-50 to-transparent sticky bottom-0 z-20">
          <div className="max-w-4xl mx-auto">
            <div className="relative bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 focus-within:ring-8 focus-within:ring-blue-500/5 transition-all p-2.5">
              <div className="flex items-end">
                <textarea
                  value={inputText} onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder={customStructure ? "Nhập tên đề tài..." : "Nhập yêu cầu sáng kiến..."}
                  className="flex-1 p-4 bg-transparent outline-none resize-none text-slate-800 placeholder-slate-400 font-medium min-h-[60px] max-h-[200px]"
                  rows={1}
                />
                <button
                  onClick={() => handleSend()} disabled={!inputText.trim() || isTyping}
                  className={`m-1 w-14 h-14 rounded-[1.5rem] flex items-center justify-center transition-all ${
                    !inputText.trim() || isTyping ? 'bg-slate-50 text-slate-300' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-xl'
                  }`}
                ><i className="fas fa-arrow-up text-lg"></i></button>
              </div>
              <div className="absolute -top-4 left-8 flex items-center gap-2">
                {customStructure ? (
                  <div className="bg-emerald-600 text-white text-[10px] font-black px-4 py-1.5 rounded-full shadow-lg flex items-center gap-2 border-2 border-white uppercase tracking-tighter">
                    <i className="fas fa-file-circle-check"></i> CHẾ ĐỘ FORM RIÊNG
                  </div>
                ) : (
                  <div className="bg-slate-800 text-white text-[10px] font-black px-4 py-1.5 rounded-full shadow-lg flex items-center gap-2 border-2 border-white uppercase tracking-tighter">
                    <i className="fas fa-wand-sparkles"></i> DÀN Ý MẶC ĐỊNH
                  </div>
                )}
              </div>
            </div>
            {/* Mobile author info */}
            <div className="lg:hidden text-center mt-4">
              <p className="text-[10px] font-bold text-slate-400">Trần Thế Việt • Zalo: 0378 472 960</p>
            </div>
          </div>
        </div>
      </main>
      {showStructureModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fade-in">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100">
            <div className="p-8 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                  <Logo className="w-8 h-8" color="white" />
                </div>
                <div>
                  <h3 className="font-black text-xl text-slate-900 tracking-tight">Cấu Hình Form Mẫu</h3>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Quy chuẩn báo cáo</p>
                </div>
              </div>
              <button onClick={() => setShowStructureModal(false)} className="w-10 h-10 rounded-2xl hover:bg-slate-200 text-slate-400 flex items-center justify-center"><i className="fas fa-times"></i></button>
            </div>
            <div className="p-8 space-y-6">
              <div onClick={() => fileInputRef.current?.click()} className={`border-2 border-dashed rounded-[2rem] p-8 flex flex-col items-center justify-center cursor-pointer transition-all ${isExtracting ? 'bg-slate-50 border-blue-400' : 'bg-blue-50/20 border-blue-100 hover:border-blue-400'}`}>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".pdf" />
                {isExtracting ? <div className="animate-spin w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full"></div> : <div className="text-center"><i className="fas fa-file-pdf text-3xl text-red-500 mb-2"></i><p className="text-sm font-black text-slate-800">Tải File Cấu trúc (.pdf)</p></div>}
              </div>
              <textarea value={tempStructure} onChange={(e) => setTempStructure(e.target.value)} placeholder="Nhập tay cấu trúc mong muốn..." className="w-full h-48 p-6 border border-slate-200 rounded-[2rem] focus:ring-4 focus:ring-blue-500/10 outline-none text-sm font-medium bg-slate-50 shadow-inner resize-none" />
            </div>
            <div className="p-8 bg-slate-50/80 border-t border-slate-100 flex gap-4">
              <button onClick={() => setTempStructure('')} className="flex-1 py-4 px-6 rounded-2xl text-xs font-black text-slate-500 bg-white border border-slate-200 uppercase tracking-widest">Xóa</button>
              <button onClick={saveStructure} className="flex-[2] py-4 px-6 rounded-2xl text-xs font-black text-white bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-500/30 uppercase tracking-widest">Lưu</button>
            </div>
          </div>
        </div>
      )}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
        .animate-shake { animation: shake 0.2s ease-in-out 0s 2; }
      `}} />
    </div>
  );
};

export default App;
