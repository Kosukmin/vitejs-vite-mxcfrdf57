// src/App.tsx 전체 내용을 이걸로 교체하세요!
const { createClient } = (window as any).supabase;
import React, { useState, useEffect, useRef, useCallback } from 'react';

const SUPABASE_URL = 'https://tcmcrpszpbawgwolzuno.supabase.co';
const SUPABASE_KEY = 'sb_publishable_ktL_xVzsDjv3wmbrO8j0Tg_DP2vYBHO';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const CHART_START = new Date('2026-01-01T00:00:00');
const CHART_END   = new Date('2026-12-31T00:00:00');
const TOTAL_DAYS  = (CHART_END.getTime() - CHART_START.getTime()) / 86400000;
const MONTHS = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];

const calcCols = (w: number) => {
  const leftCol     = Math.max(260, Math.floor(w * 0.30));
  const assigneeCol = Math.max(64,  Math.floor(w * 0.07));
  const timelineTotal = w - leftCol - assigneeCol;
  const monthCol    = Math.floor(timelineTotal / 12);
  const timelineW   = monthCol * 12;
  return { leftCol, assigneeCol, monthCol, timelineW };
};

const COLOR_MAP: Record<string, any> = {
  blue:   { bar:'#3b82f6', barLight:'#bfdbfe', text:'#1e40af', border:'#3b82f6', rowBg:'#f8faff' },
  green:  { bar:'#22c55e', barLight:'#bbf7d0', text:'#15803d', border:'#22c55e', rowBg:'#f6fef8' },
  purple: { bar:'#a855f7', barLight:'#e9d5ff', text:'#6b21a8', border:'#a855f7', rowBg:'#fdf8ff' },
  orange: { bar:'#f97316', barLight:'#fed7aa', text:'#c2410c', border:'#f97316', rowBg:'#fffaf5' },
  pink:   { bar:'#ec4899', barLight:'#fbcfe8', text:'#be185d', border:'#ec4899', rowBg:'#fef7fb' },
};

const CATEGORY_COLORS: Record<string, any> = {
  '영업': { bg:'#fef3c7', text:'#92400e', border:'#f59e0b' },
  '기획': { bg:'#ede9fe', text:'#5b21b6', border:'#7c3aed' },
  '운영': { bg:'#e0f2fe', text:'#075985', border:'#0ea5e9' },
  '개발': { bg:'#d1fae5', text:'#065f46', border:'#10b981' },
};
const CATEGORY_ORDER: Record<string, number> = { '영업':0, '기획':1, '운영':2, '개발':3 };
const CATEGORIES = ['영업','기획','운영','개발'];

const toDateStr = (d: Date) => d.toISOString().split('T')[0];
const parseDate = (s: string) => new Date(s + 'T00:00:00');
const todayStr = () => toDateStr(new Date());
const weekLaterStr = () => { const d = new Date(); d.setDate(d.getDate() + 7); return toDateStr(d); };

// ── 로그인 화면 ────────────────────────────────────
function LoginScreen({ onLogin }: { onLogin: (user: any) => void }) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const handleLogin = async () => {
    if (!email || !password) { setError('이메일과 비밀번호를 입력해주세요.'); return; }
    setLoading(true); setError('');
    try {
      const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) { setError('이메일 또는 비밀번호가 올바르지 않습니다.'); }
      else if (data.user) { onLogin(data.user); }
    } catch { setError('로그인 중 오류가 발생했습니다.'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{minHeight:'100vh',background:'linear-gradient(135deg,#0f0f1a 0%,#1a1a2e 60%,#16213e 100%)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Pretendard',-apple-system,BlinkMacSystemFont,sans-serif"}}>
      <style>{`@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css'); @keyframes spin{to{transform:rotate(360deg)}} *{box-sizing:border-box;}`}</style>
      <div style={{width:'100%',maxWidth:400,padding:'0 24px'}}>
        {/* 로고 */}
        <div style={{textAlign:'center',marginBottom:40}}>
          <div style={{width:56,height:56,borderRadius:16,background:'linear-gradient(135deg,#6366f1,#a855f7)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,margin:'0 auto 16px',boxShadow:'0 4px 20px rgba(99,102,241,0.4)'}}>📊</div>
          <h1 style={{fontSize:22,fontWeight:'bold',color:'#f1f5f9',margin:'0 0 6px',letterSpacing:'-0.5px'}}>샌디버스 간트차트</h1>
          <p style={{fontSize:13,color:'rgba(148,163,184,0.6)',margin:0}}>팀원만 접근 가능한 프로젝트 관리 도구</p>
        </div>
        {/* 로그인 카드 */}
        <div style={{background:'rgba(255,255,255,0.05)',borderRadius:16,padding:32,border:'1px solid rgba(255,255,255,0.1)',backdropFilter:'blur(10px)'}}>
          <div style={{marginBottom:18}}>
            <label style={{display:'block',fontSize:13,color:'rgba(148,163,184,0.8)',marginBottom:7,fontWeight:500}}>이메일</label>
            <input type="email" value={email} onChange={e=>{setEmail(e.target.value);setError('');}}
              onKeyDown={e=>e.key==='Enter'&&handleLogin()}
              placeholder="이메일 입력"
              style={{width:'100%',padding:'11px 14px',background:'rgba(255,255,255,0.07)',border:`1px solid ${error?'rgba(239,68,68,0.5)':'rgba(255,255,255,0.12)'}`,borderRadius:10,fontSize:14,color:'#f1f5f9',outline:'none'}} />
          </div>
          <div style={{marginBottom:24}}>
            <label style={{display:'block',fontSize:13,color:'rgba(148,163,184,0.8)',marginBottom:7,fontWeight:500}}>비밀번호</label>
            <input type="password" value={password} onChange={e=>{setPassword(e.target.value);setError('');}}
              onKeyDown={e=>e.key==='Enter'&&handleLogin()}
              placeholder="비밀번호 입력"
              style={{width:'100%',padding:'11px 14px',background:'rgba(255,255,255,0.07)',border:`1px solid ${error?'rgba(239,68,68,0.5)':'rgba(255,255,255,0.12)'}`,borderRadius:10,fontSize:14,color:'#f1f5f9',outline:'none'}} />
          </div>
          {error && (
            <div style={{background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.3)',borderRadius:8,padding:'10px 14px',marginBottom:18,fontSize:13,color:'#fca5a5'}}>
              ⚠️ {error}
            </div>
          )}
          <button onClick={handleLogin} disabled={loading}
            style={{width:'100%',padding:'12px',background:loading?'rgba(99,102,241,0.5)':'linear-gradient(135deg,#6366f1,#8b5cf6)',color:'white',border:'none',borderRadius:10,fontSize:15,fontWeight:600,cursor:loading?'not-allowed':'pointer',boxShadow:'0 2px 12px rgba(99,102,241,0.4)',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
            {loading ? (
              <><div style={{width:16,height:16,border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'white',borderRadius:'50%',animation:'spin 0.8s linear infinite'}} />로그인 중...</>
            ) : '로그인'}
          </button>
        </div>
        <p style={{textAlign:'center',fontSize:12,color:'rgba(148,163,184,0.35)',marginTop:24}}>© 2026 S&I Corp. 내부 전용</p>
      </div>
    </div>
  );
}
// ────────────────────────────────────────────────────

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isResetMode, setIsResetMode] = useState(false);

  useEffect(() => {
    // 기존 세션 확인
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setAuthLoading(false);
    });
    // 세션 변경 감지 - PASSWORD_RECOVERY 이벤트 처리
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setUser(session?.user ?? null);
        setIsResetMode(true);
      } else {
        setUser(session?.user ?? null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  if (authLoading) return (
    <div style={{minHeight:'100vh',background:'#0f0f1a',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{width:32,height:32,border:'4px solid rgba(99,102,241,0.3)',borderTopColor:'#6366f1',borderRadius:'50%',animation:'spin 0.8s linear infinite'}} />
      <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
    </div>
  );

  // 비밀번호 재설정 모드 - 별도 화면
  if (isResetMode && user) return (
    <ResetPasswordScreen user={user} onDone={async () => {
      setIsResetMode(false);
    }} />
  );

  if (!user) return <LoginScreen onLogin={setUser} />;

  return <GanttChart user={user} onLogout={async () => { await supabase.auth.signOut(); setUser(null); }} />;
}

// ── 비밀번호 재설정 화면 (이메일 링크 클릭 후) ──────────
function ResetPasswordScreen({ user, onDone }: { user: any; onDone: () => void }) {
  const [newPw, setNewPw]         = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState(false);
  const [loading, setLoading]     = useState(false);

  const handleReset = async () => {
    setError('');
    if (!newPw || !confirmPw) { setError('모든 항목을 입력해주세요.'); return; }
    if (newPw.length < 6) { setError('비밀번호는 6자 이상이어야 합니다.'); return; }
    if (newPw !== confirmPw) { setError('비밀번호가 일치하지 않습니다.'); return; }
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.updateUser({ password: newPw });
      if (err) { setError('비밀번호 변경에 실패했습니다.'); }
      else { setSuccess(true); setTimeout(() => onDone(), 2000); }
    } catch { setError('오류가 발생했습니다.'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{minHeight:'100vh',background:'linear-gradient(135deg,#0f0f1a 0%,#1a1a2e 60%,#16213e 100%)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Pretendard',-apple-system,BlinkMacSystemFont,sans-serif"}}>
      <style>{`@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css'); @keyframes spin{to{transform:rotate(360deg)}} *{box-sizing:border-box;}`}</style>
      <div style={{width:'100%',maxWidth:400,padding:'0 24px'}}>
        <div style={{textAlign:'center',marginBottom:36}}>
          <div style={{width:56,height:56,borderRadius:16,background:'linear-gradient(135deg,#6366f1,#a855f7)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,margin:'0 auto 16px',boxShadow:'0 4px 20px rgba(99,102,241,0.4)'}}>🔑</div>
          <h1 style={{fontSize:20,fontWeight:'bold',color:'#f1f5f9',margin:'0 0 6px'}}>새 비밀번호 설정</h1>
          <p style={{fontSize:13,color:'rgba(148,163,184,0.6)',margin:0}}>{user.email}</p>
        </div>
        <div style={{background:'rgba(255,255,255,0.05)',borderRadius:16,padding:28,border:'1px solid rgba(255,255,255,0.1)'}}>
          {success ? (
            <div style={{textAlign:'center',padding:'20px 0'}}>
              <div style={{fontSize:40,marginBottom:12}}>✅</div>
              <p style={{color:'#4ade80',fontSize:15,fontWeight:600,margin:0}}>비밀번호가 변경되었습니다!</p>
              <p style={{color:'rgba(148,163,184,0.6)',fontSize:13,marginTop:8}}>잠시 후 로그인 화면으로 이동합니다...</p>
            </div>
          ) : (
            <>
              <div style={{marginBottom:16}}>
                <label style={{display:'block',fontSize:13,color:'rgba(148,163,184,0.8)',marginBottom:7,fontWeight:500}}>새 비밀번호 <span style={{fontSize:11,opacity:0.6}}>(6자 이상)</span></label>
                <input type="password" value={newPw} onChange={e=>setNewPw(e.target.value)} placeholder="새 비밀번호 입력"
                  style={{width:'100%',padding:'11px 14px',background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:10,fontSize:14,color:'#f1f5f9',outline:'none'}} />
              </div>
              <div style={{marginBottom:20}}>
                <label style={{display:'block',fontSize:13,color:'rgba(148,163,184,0.8)',marginBottom:7,fontWeight:500}}>새 비밀번호 확인</label>
                <input type="password" value={confirmPw} onChange={e=>setConfirmPw(e.target.value)}
                  onKeyDown={e=>e.key==='Enter'&&handleReset()} placeholder="새 비밀번호 재입력"
                  style={{width:'100%',padding:'11px 14px',background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:10,fontSize:14,color:'#f1f5f9',outline:'none'}} />
              </div>
              {error && <div style={{background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.3)',borderRadius:8,padding:'10px 14px',marginBottom:16,fontSize:13,color:'#fca5a5'}}>⚠️ {error}</div>}
              <button onClick={handleReset} disabled={loading}
                style={{width:'100%',padding:'12px',background:loading?'rgba(99,102,241,0.5)':'linear-gradient(135deg,#6366f1,#8b5cf6)',color:'white',border:'none',borderRadius:10,fontSize:15,fontWeight:600,cursor:loading?'not-allowed':'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
                {loading ? <><div style={{width:16,height:16,border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'white',borderRadius:'50%',animation:'spin 0.8s linear infinite'}} />변경 중...</> : '비밀번호 변경'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
// ────────────────────────────────────────────────────

function GanttChart({ user, onLogout }: { user: any; onLogout: () => void }) {
  const [cols, setCols] = useState(() => calcCols(window.innerWidth));
  const { leftCol: LEFT_COL, assigneeCol: ASSIGNEE_COL, monthCol: MONTH_COL, timelineW: TIMELINE_W } = cols;

  const [projects, setProjects]               = useState<any[]>([]);
  const [searchQuery, setSearchQuery]         = useState('');
  const [activeCategories, setActiveCategories] = useState<string[]>([]);
  const [activeGroup, setActiveGroup]         = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [loading, setLoading]                 = useState(true);
  const [saving, setSaving]                   = useState(false);
  const [editingTask, setEditingTask]         = useState<any>(null);
  const [editingProject, setEditingProject]   = useState<any>(null);
  const [editingGroupName, setEditingGroupName] = useState<string|null>(null);
  const [editingGroupValue, setEditingGroupValue] = useState('');
  const [dragging, setDragging]               = useState<any>(null);
  const [tooltip, setTooltip]                 = useState<any>(null);
  const [tooltipPos, setTooltipPos]           = useState({ x:0, y:0 });

  // ── 히스토리 상태 ──────────────────────────────────
  const [showHistory, setShowHistory]         = useState(false);
  const [history, setHistory]                 = useState<any[]>([]);
  const [historyLoading, setHistoryLoading]   = useState(false);
  const [restoring, setRestoring]             = useState(false);
  // ── 비밀번호 변경 상태 ─────────────────────────────
  const [showChangePw, setShowChangePw]       = useState(false);
  // ────────────────────────────────────────────────────
  // ────────────────────────────────────────────────────

  const dragRef        = useRef<any>(null);
  const historyTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const HISTORY_DEBOUNCE_MS = 5 * 60 * 1000; // 5분

  useEffect(() => {
    const onResize = () => setCols(calcCols(window.innerWidth));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const getPos = useCallback((s: string, e: string) => {
    if (!s || !e) return null;
    const sd = parseDate(s), ed = parseDate(e);
    if (isNaN(sd.getTime()) || isNaN(ed.getTime())) return null;
    const left  = Math.max(0, (sd.getTime() - CHART_START.getTime()) / 86400000 / TOTAL_DAYS * TIMELINE_W);
    const right = Math.min(TIMELINE_W, (ed.getTime() - CHART_START.getTime()) / 86400000 / TOTAL_DAYS * TIMELINE_W);
    return { left, width: Math.max(6, right - left) };
  }, [TIMELINE_W]);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('gantt_projects').select('data').eq('id', 1).single();
      if (!error && data) setProjects(data.data || []);
    } catch {}
    finally { setLoading(false); }
  };

  // ── 히스토리 스냅샷 (직접 호출용) ───────────────────
  const saveHistorySnapshot = async (p: any[], memo?: string) => {
    try {
      await supabase.from('gantt_history').insert({ data: p, memo: memo || '' });
    } catch {}
  };

  // ── 저장 (간트 데이터) + 5분 디바운스 히스토리 ─────
  const save = async (p: any[], memo?: string) => {
    setProjects(p);
    setSaving(true);
    try {
      await supabase.from('gantt_projects').upsert({ id: 1, data: p });
    } catch {}
    finally { setSaving(false); }

    // 히스토리: 마지막 변경 후 5분 뒤에 한 번만 스냅샷
    if (historyTimer.current) clearTimeout(historyTimer.current);
    historyTimer.current = setTimeout(() => {
      saveHistorySnapshot(p, memo);
    }, HISTORY_DEBOUNCE_MS);
  };

  // ── 히스토리 목록 불러오기 ────────────────────────
  const loadHistory = async () => {
    setHistoryLoading(true);
    setShowHistory(true);
    try {
      const { data } = await supabase
        .from('gantt_history')
        .select('id, saved_at, memo')
        .order('saved_at', { ascending: false })
        .limit(50);
      setHistory(data || []);
    } catch {}
    finally { setHistoryLoading(false); }
  };

  // ── 특정 시점으로 복원 ────────────────────────────
  const restoreHistory = async (id: number) => {
    if (!confirm('이 시점으로 복원할까요?\n현재 데이터는 덮어쓰여집니다.')) return;
    setRestoring(true);
    try {
      const { data } = await supabase.from('gantt_history').select('data').eq('id', id).single();
      if (data) {
        // 복원은 간트 저장 + 즉시 스냅샷
        setProjects(data.data);
        setSaving(true);
        try { await supabase.from('gantt_projects').upsert({ id: 1, data: data.data }); } catch {}
        finally { setSaving(false); }
        await saveHistorySnapshot(data.data, '복원됨');
        setShowHistory(false);
        alert('복원 완료!');
      }
    } catch {
      alert('복원 중 오류가 발생했습니다.');
    }
    finally { setRestoring(false); }
  };
  // ────────────────────────────────────────────────────

  const addProject = () => save([...projects, {
    id:Date.now(), name:'새 프로젝트', owner:'', description:'',
    color:'blue', expanded:true, tasks:[], category:'기획',
    group: activeGroup || '미분류',
    startDate:todayStr(), endDate:weekLaterStr(), progress:0
  }]);

  const addTask = (pid: number) => save(projects.map(p => p.id !== pid ? p : {
    ...p, tasks:[...p.tasks, {
      id:Date.now(), name:'새 Task', assignee:'',
      startDate:todayStr(), endDate:weekLaterStr(),
      progress:0, dependencies:[], description:''
    }]
  }));

  const toggleProject  = (pid: number) => setProjects(projects.map(p => p.id===pid ? {...p, expanded:!p.expanded} : p));
  const updateTask     = (pid: number, tid: number, upd: any) => save(projects.map(p => p.id!==pid ? p : {...p, tasks:p.tasks.map((t:any)=>t.id!==tid?t:{...t,...upd})}));
  const deleteTask     = (pid: number, tid: number) => save(projects.map(p => p.id!==pid ? p : {...p, tasks:p.tasks.filter((t:any)=>t.id!==tid)}));
  const deleteProject  = (pid: number) => save(projects.filter(p => p.id!==pid));
  const updateProject  = (pid: number, upd: any) => save(projects.map(p => p.id!==pid ? p : {...p,...upd}));

  const toggleGroup = (g: string) => setCollapsedGroups(prev => {
    const next = new Set(prev); next.has(g) ? next.delete(g) : next.add(g); return next;
  });

  const renameGroup = (oldName: string, newName: string) => {
    if (!newName.trim() || newName === oldName) return;
    save(projects.map(p => p.group === oldName ? {...p, group: newName.trim()} : p));
  };

  const getProjectMeta = (proj: any) => {
    const tasks = proj.tasks.filter((t:any) => t.startDate && t.endDate);
    if (!tasks.length) {
      if (proj.startDate && proj.endDate) return { pos:getPos(proj.startDate, proj.endDate), progress:proj.progress||0 };
      return { pos:null, progress:0 };
    }
    const starts = tasks.map((t:any) => +parseDate(t.startDate));
    const ends   = tasks.map((t:any) => +parseDate(t.endDate));
    let totalW=0, totalP=0;
    tasks.forEach((t:any) => {
      const dur = Math.max(1, (parseDate(t.endDate).getTime()-parseDate(t.startDate).getTime())/86400000);
      totalW+=dur; totalP+=(t.progress||0)*dur;
    });
    const visStart = toDateStr(new Date(Math.max(Math.min(...starts), +CHART_START)));
    const visEnd   = toDateStr(new Date(Math.min(Math.max(...ends),   +CHART_END)));
    return { pos:getPos(visStart, visEnd), progress:totalW>0?Math.round(totalP/totalW):0 };
  };

  const handleMouseDown = (e: React.MouseEvent, pid: number, tid: any, type: string) => {
    e.preventDefault(); e.stopPropagation();
    if (tid==='__proj__') {
      const proj = projects.find(p=>p.id===pid); if (!proj) return;
      dragRef.current = { pid, tid:'__proj__', type, startX:e.clientX, startDate:proj.startDate, endDate:proj.endDate };
    } else {
      const task = projects.find(p=>p.id===pid)?.tasks.find((t:any)=>t.id===tid); if (!task) return;
      dragRef.current = { pid, tid, type, startX:e.clientX, startDate:task.startDate, endDate:task.endDate };
    }
    setDragging({ pid, tid, type });
  };

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      const d = dragRef.current; if (!d) return;
      e.preventDefault();
      const deltaDays = Math.round(((e.clientX - d.startX) / TIMELINE_W) * TOTAL_DAYS);
      const s0=parseDate(d.startDate), e0=parseDate(d.endDate);
      let ns=new Date(s0), ne=new Date(e0);
      if (d.type==='move') {
        ns=new Date(+s0+deltaDays*86400000); ne=new Date(+e0+deltaDays*86400000);
        if (ns<CHART_START){const diff=CHART_START.getTime()-ns.getTime();ns=new Date(CHART_START);ne=new Date(+ne+diff);}
        if (ne>CHART_END)  {const diff=ne.getTime()-CHART_END.getTime();ne=new Date(CHART_END);ns=new Date(+ns-diff);}
      } else if (d.type==='start') {
        ns=new Date(Math.max(+CHART_START,Math.min(+s0+deltaDays*86400000,+e0-86400000)));
      } else {
        ne=new Date(Math.min(+CHART_END,Math.max(+e0+deltaDays*86400000,+s0+86400000)));
      }
      if (d.tid==='__proj__') { updateProject(d.pid,{startDate:toDateStr(ns),endDate:toDateStr(ne)}); setTooltip((t:any)=>t?{...t,startDate:toDateStr(ns),endDate:toDateStr(ne)}:t); }
      else                    { updateTask(d.pid,d.tid,{startDate:toDateStr(ns),endDate:toDateStr(ne)}); setTooltip((t:any)=>t?{...t,startDate:toDateStr(ns),endDate:toDateStr(ne)}:t); }
    };
    const onUp = () => { dragRef.current=null; setDragging(null); document.body.style.cursor=''; document.body.style.userSelect=''; };
    document.body.style.userSelect='none';
    document.body.style.cursor=dragging.type==='move'?'grabbing':'ew-resize';
    window.addEventListener('mousemove', onMove, {passive:false});
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [dragging, TIMELINE_W]);

  const allGroups = Array.from(new Set(projects.map(p => p.group || '미분류')));

  const filtered = projects
    .filter(p => activeCategories.length===0 || activeCategories.includes(p.category))
    .filter(p => activeGroup==='' || (p.group||'미분류')===activeGroup)
    .filter(p =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.owner?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.tasks.some((t:any)=>t.name.toLowerCase().includes(searchQuery.toLowerCase())||t.assignee?.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    .sort((a,b)=>{
      const oa=CATEGORY_ORDER[a.category]??99, ob=CATEGORY_ORDER[b.category]??99;
      return oa!==ob ? oa-ob : a.id-b.id;
    });

  const groupedFiltered = allGroups
    .filter(g => activeGroup==='' || g===activeGroup)
    .map(g => ({ name:g, items: filtered.filter(p=>(p.group||'미분류')===g) }))
    .filter(g => g.items.length > 0);

  const exportCSV = () => {
    const headers = ['그룹','카테고리','프로젝트','오너','프로젝트 시작일','프로젝트 종료일','프로젝트 진행률','프로젝트 설명','Task','Task 설명','담당자','Task 시작일','Task 종료일','Task 진행률'];
    const escape = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows: string[][] = [];
    projects
      .filter(p => activeCategories.length===0 || activeCategories.includes(p.category))
      .sort((a,b) => {
        const oa=CATEGORY_ORDER[a.category]??99, ob=CATEGORY_ORDER[b.category]??99;
        return oa!==ob ? oa-ob : a.id-b.id;
      })
      .forEach(proj => {
        const { progress: projProg } = getProjectMeta(proj);
        const base = [proj.group||'미분류', proj.category||'', proj.name, proj.owner||'', proj.startDate||'', proj.endDate||'', `${projProg}%`, proj.description||''];
        if (proj.tasks.length === 0) {
          rows.push([...base, '', '', '', '', '', '']);
        } else {
          proj.tasks.forEach((t: any) => {
            rows.push([...base, t.name, t.description||'', t.assignee||'', t.startDate||'', t.endDate||'', `${t.progress||0}%`]);
          });
        }
      });
    const csv = [headers, ...rows].map(r => r.map(escape).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `샌디버스_간트차트_${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const today = new Date();
  const todayLeft = today>=CHART_START && today<=CHART_END
    ? Math.round((today.getTime()-CHART_START.getTime())/86400000/TOTAL_DAYS*TIMELINE_W) : null;

  const modalW = Math.min(500, Math.max(320, window.innerWidth * 0.9));
  const inp = (extra={}) => ({width:'100%',border:'1px solid #d1d5db',borderRadius:8,padding:'8px 12px',fontSize:14,boxSizing:'border-box' as const,...extra});

  const ProjectEditModal = ({ proj, onClose }: any) => {
    const [fd, setFd] = useState({...proj});
    return (
      <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:50,padding:16}}>
        <div style={{background:'white',borderRadius:12,padding:24,width:modalW,boxShadow:'0 20px 60px rgba(0,0,0,0.3)',maxHeight:'90vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
            <h3 style={{fontSize:18,fontWeight:'bold',margin:0}}>프로젝트 편집</h3>
            <button onClick={onClose} style={{border:'none',background:'none',cursor:'pointer',fontSize:20,color:'#9ca3af'}}>✕</button>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:16}}>
            <div><label style={{display:'block',fontSize:14,fontWeight:500,marginBottom:4}}>프로젝트 이름</label>
              <input value={fd.name} onChange={e=>setFd({...fd,name:e.target.value})} style={inp()} /></div>
            <div><label style={{display:'block',fontSize:14,fontWeight:500,marginBottom:4}}>프로젝트 오너</label>
              <input value={fd.owner||''} onChange={e=>setFd({...fd,owner:e.target.value})} style={inp()} /></div>
            <div>
              <label style={{display:'block',fontSize:14,fontWeight:500,marginBottom:4}}>그룹 <span style={{fontSize:12,color:'#9ca3af',fontWeight:400}}>(서비스/제품 단위)</span></label>
              {allGroups.length > 0 && (
                <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:8}}>
                  {allGroups.map(g=>(
                    <button key={g} type="button" onClick={()=>setFd({...fd,group:g})}
                      style={{padding:'5px 14px',borderRadius:16,fontSize:12,cursor:'pointer',border:`1.5px solid ${fd.group===g?'#6366f1':'#e5e7eb'}`,background:fd.group===g?'#eef2ff':'#f9fafb',color:fd.group===g?'#4f46e5':'#6b7280',fontWeight:fd.group===g?600:400}}>
                      {g}
                    </button>
                  ))}
                </div>
              )}
              <input value={fd.group||''} onChange={e=>setFd({...fd,group:e.target.value})}
                placeholder="그룹명 직접 입력 또는 수정" style={inp()} />
            </div>
            <div>
              <label style={{display:'block',fontSize:14,fontWeight:500,marginBottom:8}}>카테고리</label>
              <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                {CATEGORIES.map(cat=>{
                  const cc=CATEGORY_COLORS[cat];
                  return <button key={cat} onClick={()=>setFd({...fd,category:cat})}
                    style={{padding:'6px 16px',borderRadius:20,border:`2px solid ${fd.category===cat?cc.border:'#e5e7eb'}`,background:fd.category===cat?cc.bg:'white',color:fd.category===cat?cc.text:'#6b7280',cursor:'pointer',fontSize:13,fontWeight:fd.category===cat?600:400}}>{cat}</button>;
                })}
              </div>
            </div>
            <div>
              <label style={{display:'block',fontSize:14,fontWeight:500,marginBottom:4}}>프로젝트 기간 <span style={{fontSize:12,color:'#9ca3af',fontWeight:400}}>(Task 없을 때)</span></label>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div><label style={{display:'block',fontSize:12,color:'#6b7280',marginBottom:4}}>시작일</label>
                  <input type="date" value={fd.startDate||''} onChange={e=>setFd({...fd,startDate:e.target.value})} style={inp()} /></div>
                <div><label style={{display:'block',fontSize:12,color:'#6b7280',marginBottom:4}}>종료일</label>
                  <input type="date" value={fd.endDate||''} onChange={e=>setFd({...fd,endDate:e.target.value})} style={inp()} /></div>
              </div>
            </div>
            <div>
              <label style={{display:'block',fontSize:14,fontWeight:500,marginBottom:4}}>
                진행률 <span style={{fontSize:12,color:'#9ca3af',fontWeight:400}}>(Task 없을 때)</span>
                <span style={{color:'#3b82f6',fontWeight:'bold',marginLeft:8}}>{fd.progress||0}%</span>
              </label>
              <input type="range" min="0" max="100" value={fd.progress||0} onChange={e=>setFd({...fd,progress:Number(e.target.value)})} style={{width:'100%'}} />
            </div>
            <div><label style={{display:'block',fontSize:14,fontWeight:500,marginBottom:4}}>설명</label>
              <textarea value={fd.description||''} onChange={e=>setFd({...fd,description:e.target.value})} style={{...inp(),height:80,resize:'vertical'} as any} /></div>
          </div>
          <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:24}}>
            <button onClick={onClose} style={{padding:'8px 16px',border:'1px solid #d1d5db',borderRadius:8,background:'white',cursor:'pointer',fontSize:14}}>취소</button>
            <button onClick={()=>{updateProject(proj.id,fd);onClose();}} style={{padding:'8px 16px',border:'none',borderRadius:8,background:'#3b82f6',color:'white',cursor:'pointer',fontSize:14,fontWeight:500}}>저장</button>
          </div>
        </div>
      </div>
    );
  };

  const TaskEditModal = ({ task, pid, onClose }: any) => {
    const [fd, setFd] = useState({...task});
    const others = projects.find(p=>p.id===pid)?.tasks.filter((t:any)=>t.id!==task.id)||[];
    return (
      <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:50,padding:16}}>
        <div style={{background:'white',borderRadius:12,padding:24,width:modalW,maxHeight:'90vh',overflowY:'auto',boxShadow:'0 20px 60px rgba(0,0,0,0.3)'}} onClick={e=>e.stopPropagation()}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
            <h3 style={{fontSize:18,fontWeight:'bold',margin:0}}>Task 편집</h3>
            <button onClick={onClose} style={{border:'none',background:'none',cursor:'pointer',fontSize:20,color:'#9ca3af'}}>✕</button>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:16}}>
            <div><label style={{display:'block',fontSize:14,fontWeight:500,marginBottom:4}}>Task 이름</label>
              <input value={fd.name} onChange={e=>setFd({...fd,name:e.target.value})} style={inp()} /></div>
            <div><label style={{display:'block',fontSize:14,fontWeight:500,marginBottom:4}}>담당자</label>
              <input value={fd.assignee||''} onChange={e=>setFd({...fd,assignee:e.target.value})} style={inp()} /></div>
            <div><label style={{display:'block',fontSize:14,fontWeight:500,marginBottom:4}}>설명</label>
              <textarea value={fd.description||''} onChange={e=>setFd({...fd,description:e.target.value})} style={{...inp(),height:80,resize:'vertical'} as any} /></div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
              <div><label style={{display:'block',fontSize:14,fontWeight:500,marginBottom:4}}>시작일</label>
                <input type="date" value={fd.startDate} onChange={e=>setFd({...fd,startDate:e.target.value})} style={inp()} /></div>
              <div><label style={{display:'block',fontSize:14,fontWeight:500,marginBottom:4}}>종료일</label>
                <input type="date" value={fd.endDate} onChange={e=>setFd({...fd,endDate:e.target.value})} style={inp()} /></div>
            </div>
            <div><label style={{display:'block',fontSize:14,fontWeight:500,marginBottom:4}}>진행률: <span style={{color:'#3b82f6',fontWeight:'bold'}}>{fd.progress}%</span></label>
              <input type="range" min="0" max="100" value={fd.progress} onChange={e=>setFd({...fd,progress:Number(e.target.value)})} style={{width:'100%'}} /></div>
            <div><label style={{display:'block',fontSize:14,fontWeight:500,marginBottom:4}}>선행 Task</label>
              <div style={{border:'1px solid #d1d5db',borderRadius:8,padding:8,maxHeight:140,overflowY:'auto'}}>
                {others.length===0
                  ? <p style={{fontSize:14,color:'#9ca3af',textAlign:'center',margin:'8px 0'}}>선택 가능한 Task 없음</p>
                  : others.map((t:any)=>(
                    <label key={t.id} style={{display:'flex',alignItems:'center',gap:8,fontSize:14,cursor:'pointer',padding:'2px 4px',borderRadius:4}}>
                      <input type="checkbox" checked={fd.dependencies?.includes(t.id)}
                        onChange={e=>setFd({...fd,dependencies:e.target.checked?[...(fd.dependencies||[]),t.id]:(fd.dependencies||[]).filter((i:any)=>i!==t.id)})} />
                      {t.name}
                    </label>
                  ))}
              </div>
            </div>
          </div>
          <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:24}}>
            <button onClick={onClose} style={{padding:'8px 16px',border:'1px solid #d1d5db',borderRadius:8,background:'white',cursor:'pointer',fontSize:14}}>취소</button>
            <button onClick={()=>{updateTask(pid,task.id,fd);onClose();}} style={{padding:'8px 16px',border:'none',borderRadius:8,background:'#3b82f6',color:'white',cursor:'pointer',fontSize:14,fontWeight:500}}>저장</button>
          </div>
        </div>
      </div>
    );
  };

  // ── 비밀번호 변경 모달 ───────────────────────────────
  const ChangePwModal = () => {
    const [currentPw, setCurrentPw] = useState('');
    const [newPw, setNewPw]         = useState('');
    const [confirmPw, setConfirmPw] = useState('');
    const [pwError, setPwError]     = useState('');
    const [pwSuccess, setPwSuccess] = useState(false);
    const [pwLoading, setPwLoading] = useState(false);

    const handleChange = async () => {
      setPwError(''); setPwSuccess(false);
      if (!currentPw || !newPw || !confirmPw) { setPwError('모든 항목을 입력해주세요.'); return; }
      if (newPw.length < 6) { setPwError('새 비밀번호는 6자 이상이어야 합니다.'); return; }
      if (newPw !== confirmPw) { setPwError('새 비밀번호가 일치하지 않습니다.'); return; }
      setPwLoading(true);
      try {
        // 현재 비밀번호 확인 (재로그인)
        const { error: signInErr } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPw });
        if (signInErr) { setPwError('현재 비밀번호가 올바르지 않습니다.'); setPwLoading(false); return; }
        // 비밀번호 변경
        const { error: updateErr } = await supabase.auth.updateUser({ password: newPw });
        if (updateErr) { setPwError('비밀번호 변경 중 오류가 발생했습니다.'); }
        else { setPwSuccess(true); setTimeout(() => setShowChangePw(false), 1500); }
      } catch { setPwError('오류가 발생했습니다.'); }
      finally { setPwLoading(false); }
    };

    const inp2 = () => ({width:'100%',border:'1px solid #d1d5db',borderRadius:8,padding:'9px 12px',fontSize:14,boxSizing:'border-box' as const,outline:'none'});

    return (
      <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:50,padding:16}}
        onClick={()=>setShowChangePw(false)}>
        <div style={{background:'white',borderRadius:14,padding:28,width:Math.min(400,window.innerWidth*0.95),boxShadow:'0 20px 60px rgba(0,0,0,0.3)'}}
          onClick={e=>e.stopPropagation()}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
            <div>
              <h3 style={{margin:0,fontSize:17,fontWeight:'bold'}}>🔑 비밀번호 변경</h3>
              <p style={{margin:'4px 0 0',fontSize:12,color:'#9ca3af'}}>{user.email}</p>
            </div>
            <button onClick={()=>setShowChangePw(false)} style={{border:'none',background:'none',cursor:'pointer',fontSize:20,color:'#9ca3af'}}>✕</button>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            <div>
              <label style={{display:'block',fontSize:13,fontWeight:500,marginBottom:5,color:'#374151'}}>현재 비밀번호</label>
              <input type="password" value={currentPw} onChange={e=>setCurrentPw(e.target.value)} placeholder="현재 비밀번호" style={inp2()} />
            </div>
            <div>
              <label style={{display:'block',fontSize:13,fontWeight:500,marginBottom:5,color:'#374151'}}>새 비밀번호 <span style={{fontSize:11,color:'#9ca3af',fontWeight:400}}>(6자 이상)</span></label>
              <input type="password" value={newPw} onChange={e=>setNewPw(e.target.value)} placeholder="새 비밀번호" style={inp2()} />
            </div>
            <div>
              <label style={{display:'block',fontSize:13,fontWeight:500,marginBottom:5,color:'#374151'}}>새 비밀번호 확인</label>
              <input type="password" value={confirmPw} onChange={e=>setConfirmPw(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&handleChange()}
                placeholder="새 비밀번호 재입력" style={inp2()} />
            </div>
            {pwError && (
              <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:8,padding:'10px 14px',fontSize:13,color:'#dc2626'}}>⚠️ {pwError}</div>
            )}
            {pwSuccess && (
              <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:8,padding:'10px 14px',fontSize:13,color:'#16a34a'}}>✅ 비밀번호가 변경되었습니다!</div>
            )}
          </div>
          <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:22}}>
            <button onClick={()=>setShowChangePw(false)} style={{padding:'8px 16px',border:'1px solid #d1d5db',borderRadius:8,background:'white',cursor:'pointer',fontSize:14}}>취소</button>
            <button onClick={handleChange} disabled={pwLoading}
              style={{padding:'8px 20px',border:'none',borderRadius:8,background:pwLoading?'#93c5fd':'#3b82f6',color:'white',cursor:pwLoading?'not-allowed':'pointer',fontSize:14,fontWeight:500}}>
              {pwLoading ? '변경 중...' : '변경하기'}
            </button>
          </div>
        </div>
      </div>
    );
  };
  // ────────────────────────────────────────────────────

  // ── 히스토리 모달 ─────────────────────────────────
  const HistoryModal = () => (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:50,padding:16}}
      onClick={()=>setShowHistory(false)}>
      <div style={{background:'white',borderRadius:12,padding:24,width:Math.min(480, window.innerWidth*0.95),maxHeight:'75vh',display:'flex',flexDirection:'column',boxShadow:'0 20px 60px rgba(0,0,0,0.3)'}}
        onClick={e=>e.stopPropagation()}>
        {/* 모달 헤더 */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16,flexShrink:0}}>
          <div>
            <h3 style={{margin:0,fontSize:18,fontWeight:'bold'}}>🕐 저장 히스토리</h3>
            <p style={{margin:'4px 0 0',fontSize:12,color:'#9ca3af'}}>최근 50개 스냅샷 · 복원 버튼으로 해당 시점으로 되돌리기</p>
          </div>
          <button onClick={()=>setShowHistory(false)} style={{border:'none',background:'none',cursor:'pointer',fontSize:20,color:'#9ca3af',flexShrink:0}}>✕</button>
        </div>

        {/* 목록 */}
        <div style={{overflowY:'auto',flex:1}}>
          {historyLoading ? (
            <div style={{display:'flex',alignItems:'center',justifyContent:'center',padding:'48px 0',gap:10,color:'#6b7280'}}>
              <div style={{width:20,height:20,border:'3px solid #a78bfa',borderTopColor:'transparent',borderRadius:'50%',animation:'spin 0.8s linear infinite'}} />
              <span style={{fontSize:14}}>불러오는 중...</span>
            </div>
          ) : history.length === 0 ? (
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'48px 0',color:'#9ca3af',gap:8}}>
              <span style={{fontSize:32}}>📭</span>
              <span style={{fontSize:14}}>저장 히스토리가 없습니다.</span>
            </div>
          ) : history.map((h, i) => (
            <div key={h.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 14px',borderRadius:10,marginBottom:6,background:i===0?'#f5f3ff':'#f9fafb',border:`1px solid ${i===0?'#c4b5fd':'#e5e7eb'}`,transition:'background 0.15s'}}>
              <div style={{minWidth:0,flex:1}}>
                <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                  <span style={{fontSize:13,fontWeight:600,color:'#1f2937'}}>
                    {new Date(h.saved_at).toLocaleString('ko-KR',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'})}
                  </span>
                  {i===0 && <span style={{fontSize:11,color:'#7c3aed',background:'#ede9fe',padding:'1px 8px',borderRadius:10,fontWeight:600}}>최신</span>}
                </div>
                {h.memo && (
                  <div style={{fontSize:12,color:'#6b7280',marginTop:3,display:'flex',alignItems:'center',gap:4}}>
                    <span style={{opacity:0.6}}>📝</span>
                    <span>{h.memo}</span>
                  </div>
                )}
              </div>
              <button
                onClick={()=>restoreHistory(h.id)}
                disabled={restoring}
                style={{padding:'6px 14px',background:restoring?'#e5e7eb':'#7c3aed',color:restoring?'#9ca3af':'white',border:'none',borderRadius:7,cursor:restoring?'not-allowed':'pointer',fontSize:12,fontWeight:600,flexShrink:0,marginLeft:12,whiteSpace:'nowrap'}}>
                {restoring ? '복원 중...' : '복원'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
  // ────────────────────────────────────────────────────

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',flexDirection:'column',gap:12,color:'#6b7280'}}>
      <div style={{width:32,height:32,border:'4px solid #93c5fd',borderTopColor:'transparent',borderRadius:'50%',animation:'spin 0.8s linear infinite'}} />
      <p style={{fontSize:14,margin:0,fontFamily:"'Pretendard',-apple-system,BlinkMacSystemFont,sans-serif"}}>Supabase에서 불러오는 중...</p>
      <style>{`@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css'); @keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const totalW = LEFT_COL + ASSIGNEE_COL + TIMELINE_W;

  return (
    <div style={{minHeight:'100vh',width:'100%',background:'#eef0f5',display:'flex',flexDirection:'column',fontFamily:"'Pretendard',-apple-system,BlinkMacSystemFont,sans-serif"}}>
      <style>{`
        @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');
        @keyframes spin{to{transform:rotate(360deg)}}
        *{box-sizing:border-box; font-family:'Pretendard',-apple-system,BlinkMacSystemFont,sans-serif;}
      `}</style>

      {/* Header - 다크 테마 */}
      <div style={{background:'linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 60%, #16213e 100%)',borderBottom:'1px solid rgba(255,255,255,0.08)',padding:'16px 24px',flexShrink:0,boxShadow:'0 2px 16px rgba(0,0,0,0.4)'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8}}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <div style={{width:36,height:36,borderRadius:10,background:'linear-gradient(135deg,#6366f1,#a855f7)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,boxShadow:'0 2px 8px rgba(99,102,241,0.4)'}}>📊</div>
            <div>
              <h1 style={{fontSize:18,fontWeight:'bold',color:'#f1f5f9',margin:0,letterSpacing:'-0.3px'}}>샌디버스 간트차트</h1>
              <p style={{fontSize:11,color:'rgba(148,163,184,0.8)',margin:'2px 0 0'}}>2026년 · Supabase 연동</p>
            </div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
            {saving && (
              <div style={{display:'flex',alignItems:'center',gap:6,fontSize:12,color:'#4ade80',background:'rgba(74,222,128,0.1)',padding:'6px 12px',borderRadius:20,border:'1px solid rgba(74,222,128,0.2)'}}>
                <div style={{width:12,height:12,border:'2px solid #4ade80',borderTopColor:'transparent',borderRadius:'50%',animation:'spin 0.8s linear infinite'}} />저장 중...
              </div>
            )}
            <div style={{position:'relative'}}>
              <span style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'rgba(148,163,184,0.6)',fontSize:14}}>🔍</span>
              <input type="text" placeholder="검색..." value={searchQuery} onChange={e=>setSearchQuery(e.target.value)}
                style={{paddingLeft:32,paddingRight:12,paddingTop:8,paddingBottom:8,border:'1px solid rgba(255,255,255,0.12)',borderRadius:8,width:180,fontSize:13,outline:'none',background:'rgba(255,255,255,0.07)',color:'#f1f5f9'}} />
            </div>
            <button onClick={load}
              style={{padding:'8px 12px',border:'1px solid rgba(255,255,255,0.12)',borderRadius:8,background:'rgba(255,255,255,0.07)',cursor:'pointer',fontSize:14,color:'#e2e8f0'}} title="새로고침">🔄</button>
            <button onClick={loadHistory}
              style={{display:'flex',alignItems:'center',gap:6,padding:'8px 14px',background:'rgba(124,58,237,0.85)',color:'white',border:'1px solid rgba(167,139,250,0.3)',borderRadius:8,cursor:'pointer',fontSize:13,fontWeight:500,boxShadow:'0 1px 6px rgba(124,58,237,0.3)'}}>
              🕐 히스토리
            </button>
            <button onClick={exportCSV}
              style={{display:'flex',alignItems:'center',gap:6,padding:'8px 14px',background:'rgba(22,163,74,0.85)',color:'white',border:'1px solid rgba(74,222,128,0.2)',borderRadius:8,cursor:'pointer',fontSize:13,fontWeight:500,boxShadow:'0 1px 6px rgba(22,163,74,0.25)'}}>
              ⬇ CSV
            </button>
            <button onClick={addProject}
              style={{display:'flex',alignItems:'center',gap:6,padding:'8px 16px',background:'linear-gradient(135deg,#6366f1,#8b5cf6)',color:'white',border:'none',borderRadius:8,cursor:'pointer',fontSize:13,fontWeight:600,boxShadow:'0 2px 8px rgba(99,102,241,0.4)'}}>
              + 프로젝트 추가
            </button>
            <div style={{display:'flex',alignItems:'center',gap:8,paddingLeft:8,borderLeft:'1px solid rgba(255,255,255,0.12)'}}>
              <span style={{fontSize:11,color:'rgba(148,163,184,0.7)',maxWidth:120,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{user.email}</span>
              <button onClick={()=>setShowChangePw(true)} title="비밀번호 변경"
                style={{padding:'6px 10px',background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:7,cursor:'pointer',fontSize:12,color:'rgba(148,163,184,0.8)',fontWeight:500}}>
                🔑 비번변경
              </button>
              <button onClick={onLogout} title="로그아웃"
                style={{padding:'6px 10px',background:'rgba(239,68,68,0.15)',border:'1px solid rgba(239,68,68,0.25)',borderRadius:7,cursor:'pointer',fontSize:12,color:'#fca5a5',fontWeight:500}}>
                로그아웃
              </button>
            </div>
          </div>
        </div>

        {/* 카테고리 필터 */}
        <div style={{display:'flex',gap:6,marginTop:14,alignItems:'center',flexWrap:'wrap'}}>
          <button onClick={()=>setActiveCategories([])}
            style={{padding:'5px 16px',borderRadius:20,fontSize:12,cursor:'pointer',fontWeight:activeCategories.length===0?600:400,border:activeCategories.length===0?'1.5px solid #818cf8':'1.5px solid rgba(255,255,255,0.15)',background:activeCategories.length===0?'rgba(99,102,241,0.25)':'rgba(255,255,255,0.05)',color:activeCategories.length===0?'#a5b4fc':'rgba(148,163,184,0.8)'}}>
            전체 <span style={{marginLeft:3,fontSize:11,opacity:0.7}}>{projects.length}</span>
          </button>
          <div style={{width:1,height:16,background:'rgba(255,255,255,0.12)'}} />
          {CATEGORIES.map(cat=>{
            const isActive=activeCategories.includes(cat);
            const cc=CATEGORY_COLORS[cat];
            return (
              <button key={cat} onClick={()=>setActiveCategories(prev=>prev.includes(cat)?prev.filter(c=>c!==cat):[...prev,cat])}
                style={{padding:'5px 16px',borderRadius:20,fontSize:12,cursor:'pointer',fontWeight:isActive?600:400,border:isActive?`1.5px solid ${cc.border}`:'1.5px solid rgba(255,255,255,0.15)',background:isActive?`${cc.bg}22`:'rgba(255,255,255,0.05)',color:isActive?cc.border:'rgba(148,163,184,0.8)'}}>
                {cat} <span style={{marginLeft:3,fontSize:11,opacity:0.7}}>{projects.filter(p=>p.category===cat).length}</span>
              </button>
            );
          })}
          {activeCategories.length>0 && <button onClick={()=>setActiveCategories([])} style={{marginLeft:4,fontSize:11,color:'rgba(148,163,184,0.6)',background:'none',border:'none',cursor:'pointer',textDecoration:'underline'}}>초기화</button>}
        </div>

        {/* 그룹 필터 */}
        {allGroups.length > 0 && (
          <div style={{display:'flex',gap:6,marginTop:8,alignItems:'center',flexWrap:'wrap'}}>
            <span style={{fontSize:11,color:'rgba(148,163,184,0.5)',flexShrink:0}}>그룹:</span>
            <button onClick={()=>setActiveGroup('')}
              style={{padding:'3px 12px',borderRadius:20,fontSize:11,cursor:'pointer',fontWeight:activeGroup===''?600:400,border:activeGroup===''?'1.5px solid #818cf8':'1.5px solid rgba(255,255,255,0.12)',background:activeGroup===''?'rgba(99,102,241,0.2)':'rgba(255,255,255,0.04)',color:activeGroup===''?'#a5b4fc':'rgba(148,163,184,0.7)'}}>
              전체
            </button>
            {allGroups.map(g=>(
              <button key={g} onClick={()=>setActiveGroup(prev=>prev===g?'':g)}
                style={{padding:'3px 12px',borderRadius:20,fontSize:11,cursor:'pointer',fontWeight:activeGroup===g?600:400,border:activeGroup===g?'1.5px solid #818cf8':'1.5px solid rgba(255,255,255,0.12)',background:activeGroup===g?'rgba(99,102,241,0.2)':'rgba(255,255,255,0.04)',color:activeGroup===g?'#a5b4fc':'rgba(148,163,184,0.7)'}}>
                {g} <span style={{fontSize:10,opacity:0.6}}>{projects.filter(p=>(p.group||'미분류')===g).length}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Chart */}
      <div style={{flex:1,overflow:'auto'}}>
        <div style={{minWidth:totalW}}>
          {/* Column Header */}
          <div style={{display:'flex',position:'sticky',top:0,zIndex:20,background:'white',borderBottom:'1px solid #e5e7eb',boxShadow:'0 1px 3px rgba(0,0,0,0.05)',width:totalW}}>
            <div style={{width:LEFT_COL,minWidth:LEFT_COL,flexShrink:0,padding:'12px 16px',fontWeight:600,fontSize:14,color:'#374151',borderRight:'1px solid #e5e7eb',background:'#f9fafb'}}>프로젝트 / Task</div>
            <div style={{width:ASSIGNEE_COL,minWidth:ASSIGNEE_COL,flexShrink:0,padding:'12px',fontWeight:600,fontSize:14,color:'#374151',borderRight:'1px solid #e5e7eb',background:'#f9fafb',textAlign:'center'}}>담당자</div>
            <div style={{display:'flex',width:TIMELINE_W,minWidth:TIMELINE_W,flexShrink:0}}>
              {MONTHS.map((m,i)=>(
                <div key={i} style={{width:MONTH_COL,minWidth:MONTH_COL,textAlign:'center',padding:'12px 0',fontSize:12,fontWeight:600,color:'#4b5563',borderRight:i<11?'1px solid #e5e7eb':'none',background:'#f9fafb'}}>{m}</div>
              ))}
            </div>
          </div>

          {/* Rows */}
          <div style={{width:totalW}}>
            {groupedFiltered.length===0 ? (
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'96px 0',color:'#9ca3af',fontSize:14,gap:12}}>
                <span>프로젝트가 없습니다.</span>
                <button onClick={addProject} style={{color:'#3b82f6',background:'none',border:'none',cursor:'pointer',fontSize:13}}>+ 프로젝트 추가하기</button>
              </div>
            ) : groupedFiltered.map(group=>(
              <React.Fragment key={group.name}>

                {/* 그룹 헤더 */}
                <div style={{display:'flex',borderBottom:'2px solid #e5e7eb',background:'#f0f4ff',width:totalW}}>
                  <div style={{width:LEFT_COL,minWidth:LEFT_COL,flexShrink:0,display:'flex',alignItems:'center',padding:'8px 12px',gap:8,borderRight:'1px solid #e5e7eb'}}>
                    <button onClick={()=>toggleGroup(group.name)} style={{border:'none',background:'none',cursor:'pointer',padding:2,fontSize:13,color:'#6366f1'}}>
                      {collapsedGroups.has(group.name)?'▶':'▼'}
                    </button>
                    <span style={{fontSize:15,color:'#6366f1'}}>📁</span>
                    {editingGroupName===group.name ? (
                      <input autoFocus value={editingGroupValue}
                        onChange={e=>setEditingGroupValue(e.target.value)}
                        onBlur={()=>{renameGroup(group.name,editingGroupValue);setEditingGroupName(null);}}
                        onKeyDown={e=>{
                          if(e.key==='Enter'){renameGroup(group.name,editingGroupValue);setEditingGroupName(null);}
                          if(e.key==='Escape')setEditingGroupName(null);
                        }}
                        style={{fontSize:13,fontWeight:700,border:'1px solid #6366f1',borderRadius:4,padding:'2px 6px',outline:'none',minWidth:120}}
                      />
                    ) : (
                      <span onDoubleClick={()=>{setEditingGroupName(group.name);setEditingGroupValue(group.name);}}
                        title="더블클릭하여 이름 변경"
                        style={{fontSize:13,fontWeight:700,color:'#374151',cursor:'text'}}>
                        {group.name}
                      </span>
                    )}
                    <span style={{fontSize:11,color:'#9ca3af',marginLeft:4}}>({group.items.length}개 프로젝트)</span>
                  </div>
                  <div style={{width:ASSIGNEE_COL,minWidth:ASSIGNEE_COL,flexShrink:0,borderRight:'1px solid #e5e7eb'}} />
                  <div style={{width:TIMELINE_W,minWidth:TIMELINE_W,flexShrink:0,position:'relative',minHeight:44}}>
                    {MONTHS.map((_,i)=><div key={i} style={{width:MONTH_COL,height:'100%',position:'absolute',left:i*MONTH_COL,top:0,borderRight:i<11?'1px solid #e8ecf8':'none'}} />)}
                    {todayLeft!==null && <div style={{position:'absolute',left:todayLeft,top:0,bottom:0,width:2,background:'#ef4444',opacity:0.3,zIndex:5}} />}
                    {/* 접혔을 때 프로젝트 기간바 미리보기 */}
                    {collapsedGroups.has(group.name) && group.items.map((proj:any, pi:number) => {
                      const { pos } = getProjectMeta(proj);
                      const c = COLOR_MAP[proj.color] || COLOR_MAP.blue;
                      if (!pos) return null;
                      const ROW_H = 8;
                      const GAP = 4;
                      const totalH = group.items.length * (ROW_H + GAP) - GAP;
                      const topOffset = (44 - totalH) / 2 + pi * (ROW_H + GAP);
                      return (
                        <div key={proj.id}
                          title={proj.name}
                          style={{position:'absolute',left:pos.left,width:pos.width,height:ROW_H,top:topOffset,background:c.bar,borderRadius:3,opacity:0.75,zIndex:6,cursor:'default'}}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* 그룹 내 프로젝트 */}
                {!collapsedGroups.has(group.name) && group.items.map(proj=>{
                  const c=COLOR_MAP[proj.color]||COLOR_MAP.blue;
                  const {pos:projPos,progress:projProg}=getProjectMeta(proj);
                  const catColor=CATEGORY_COLORS[proj.category];
                  return (
                    <React.Fragment key={proj.id}>
                      {/* Project row */}
                      <div style={{display:'flex',borderBottom:'1px solid #e5e7eb',background:c.rowBg}}>
                        <div style={{width:LEFT_COL,minWidth:LEFT_COL,flexShrink:0,display:'flex',alignItems:'flex-start',padding:'8px 12px',borderRight:'1px solid #e5e7eb',gap:8}}>
                          <div style={{width:16,flexShrink:0}} />
                          <button onClick={()=>toggleProject(proj.id)} style={{flexShrink:0,padding:2,borderRadius:4,border:'none',background:'none',cursor:'pointer',marginTop:2}}>
                            <span style={{color:c.text,fontSize:14}}>{proj.expanded?'▼':'▶'}</span>
                          </button>
                          <div style={{width:4,borderRadius:2,flexShrink:0,alignSelf:'stretch',background:c.border}} />
                          <div style={{flex:1,minWidth:0,padding:'4px 0'}}>
                            <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
                              {catColor && <span style={{fontSize:11,padding:'2px 8px',borderRadius:10,background:catColor.bg,color:catColor.text,border:`1px solid ${catColor.border}`,fontWeight:600,flexShrink:0,whiteSpace:'nowrap'}}>{proj.category}</span>}
                              <span style={{fontWeight:'bold',fontSize:14,color:c.text,wordBreak:'break-word',lineHeight:1.4}}>{proj.name}</span>
                            </div>
                            {proj.description && <div style={{fontSize:12,color:c.text,opacity:0.7,wordBreak:'break-word',marginTop:2}}>{proj.description}</div>}
                          </div>
                          <div style={{display:'flex',gap:4,flexShrink:0,marginTop:4}}>
                            <button onClick={()=>setEditingProject(proj)} style={{padding:4,borderRadius:4,border:'none',background:'none',cursor:'pointer',fontSize:12}}>✏️</button>
                            <button onClick={()=>addTask(proj.id)} style={{padding:4,borderRadius:4,border:'none',background:'none',cursor:'pointer',fontSize:12}}>➕</button>
                            <button onClick={()=>deleteProject(proj.id)} style={{padding:4,borderRadius:4,border:'none',background:'none',cursor:'pointer',fontSize:12}}>🗑️</button>
                          </div>
                        </div>
                        <div style={{width:ASSIGNEE_COL,minWidth:ASSIGNEE_COL,flexShrink:0,display:'flex',alignItems:'flex-start',justifyContent:'center',padding:'12px 4px',borderRight:'1px solid #e5e7eb',fontSize:12,color:'#4b5563',textAlign:'center',wordBreak:'break-all'}}>
                          {proj.owner||<span style={{color:'#d1d5db'}}>-</span>}
                        </div>
                        <div style={{width:TIMELINE_W,minWidth:TIMELINE_W,flexShrink:0,position:'relative',minHeight:52,display:'flex',alignItems:'center'}}>
                          {MONTHS.map((_,i)=><div key={i} style={{width:MONTH_COL,height:'100%',position:'absolute',left:i*MONTH_COL,top:0,borderRight:i<11?'1px solid #f3f4f6':'none'}} />)}
                          {todayLeft!==null && <div style={{position:'absolute',left:todayLeft,top:0,bottom:0,width:2,background:'#ef4444',opacity:0.7,zIndex:5}} />}
                          {projPos && proj.tasks.length===0 && (()=>{
                            const isProjDrag=dragging?.pid===proj.id && dragging?.tid==='__proj__';
                            return (
                              <div style={{position:'absolute',left:projPos.left,width:projPos.width,height:22,top:'50%',transform:'translateY(-50%)',background:c.barLight,borderRadius:4,overflow:'visible',border:`1px solid ${c.bar}33`,zIndex:6,cursor:'grab'}}
                                onMouseDown={e=>handleMouseDown(e,proj.id,'__proj__','move')}
                                onMouseEnter={e=>{setTooltip({startDate:proj.startDate,endDate:proj.endDate});setTooltipPos({x:e.clientX,y:e.clientY});}}
                                onMouseMove={e=>setTooltipPos({x:e.clientX,y:e.clientY})}
                                onMouseLeave={()=>{if(!isProjDrag)setTooltip(null);}}>
                                <div style={{position:'absolute',left:0,top:0,bottom:0,width:8,cursor:'ew-resize',zIndex:8,borderRadius:'4px 0 0 4px'}} onMouseDown={e=>handleMouseDown(e,proj.id,'__proj__','start')} />
                                <div style={{width:`${projProg}%`,height:'100%',background:c.bar,borderRadius:4,overflow:'hidden'}} />
                                <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,color:projProg>50?'#fff':c.text,fontWeight:600,pointerEvents:'none'}}>{projProg}%</div>
                                <div style={{position:'absolute',right:0,top:0,bottom:0,width:8,cursor:'ew-resize',zIndex:8,borderRadius:'0 4px 4px 0'}} onMouseDown={e=>handleMouseDown(e,proj.id,'__proj__','end')} />
                              </div>
                            );
                          })()}
                          {projPos && proj.tasks.length>0 && (
                            <div style={{position:'absolute',left:projPos.left,width:projPos.width,height:22,top:'50%',transform:'translateY(-50%)',background:c.barLight,borderRadius:4,overflow:'hidden',border:`1px solid ${c.bar}33`,zIndex:6}}>
                              <div style={{width:`${projProg}%`,height:'100%',background:c.bar,borderRadius:4}} />
                              <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,color:projProg>50?'#fff':c.text,fontWeight:600}}>{projProg}%</div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Task rows */}
                      {proj.expanded && proj.tasks.map((task:any)=>{
                        const pos=getPos(task.startDate,task.endDate);
                        const deps=proj.tasks.filter((t:any)=>task.dependencies?.includes(t.id));
                        const isDrag=dragging?.pid===proj.id && dragging?.tid===task.id;
                        return (
                          <div key={task.id} style={{display:'flex',borderBottom:'1px solid #e5e7eb',background:'white'}}>
                            <div style={{width:LEFT_COL,minWidth:LEFT_COL,flexShrink:0,display:'flex',alignItems:'center',padding:'8px 12px',borderRight:'1px solid #e5e7eb'}}>
                              <div style={{paddingLeft:40,display:'flex',alignItems:'flex-start',gap:8,width:'100%'}}>
                                <div style={{flex:1,minWidth:0}}>
                                  <div style={{fontSize:14,color:'#1f2937',wordBreak:'break-word',lineHeight:1.4}}>{task.name}</div>
                                  {task.description && <div style={{fontSize:12,color:'#9ca3af',wordBreak:'break-word',marginTop:2}}>{task.description}</div>}
                                  {deps.length>0 && <div style={{fontSize:12,color:'#7c3aed',background:'#f5f3ff',display:'inline-block',padding:'2px 8px',borderRadius:4,marginTop:2}}>선행: {deps.map((d:any)=>d.name).join(', ')}</div>}
                                </div>
                                <div style={{display:'flex',gap:4,flexShrink:0,marginTop:2}}>
                                  <button onClick={()=>setEditingTask({task,pid:proj.id})} style={{padding:4,borderRadius:4,border:'none',background:'none',cursor:'pointer',fontSize:12}}>✏️</button>
                                  <button onClick={()=>deleteTask(proj.id,task.id)} style={{padding:4,borderRadius:4,border:'none',background:'none',cursor:'pointer',fontSize:12}}>🗑️</button>
                                </div>
                              </div>
                            </div>
                            <div style={{width:ASSIGNEE_COL,minWidth:ASSIGNEE_COL,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',padding:'8px 4px',borderRight:'1px solid #e5e7eb',fontSize:12,color:'#6b7280',textAlign:'center',wordBreak:'break-all'}}>
                              {task.assignee||<span style={{color:'#d1d5db'}}>-</span>}
                            </div>
                            <div style={{width:TIMELINE_W,minWidth:TIMELINE_W,flexShrink:0,position:'relative',minHeight:46,display:'flex',alignItems:'center'}}>
                              {MONTHS.map((_,i)=><div key={i} style={{width:MONTH_COL,height:'100%',position:'absolute',left:i*MONTH_COL,top:0,borderRight:i<11?'1px solid #f3f4f6':'none'}} />)}
                              {todayLeft!==null && <div style={{position:'absolute',left:todayLeft,top:0,bottom:0,width:2,background:'#ef4444',opacity:0.4,zIndex:5}} />}
                              {pos && (
                                <div style={{position:'absolute',left:pos.left,width:pos.width,height:26,top:'50%',transform:'translateY(-50%)',background:c.barLight,borderRadius:5,border:`1px solid ${c.bar}44`,cursor:'grab',zIndex:6,overflow:'visible'}}
                                  onMouseDown={e=>handleMouseDown(e,proj.id,task.id,'move')}
                                  onMouseEnter={e=>{setTooltip({startDate:task.startDate,endDate:task.endDate});setTooltipPos({x:e.clientX,y:e.clientY});}}
                                  onMouseMove={e=>setTooltipPos({x:e.clientX,y:e.clientY})}
                                  onMouseLeave={()=>{if(!isDrag)setTooltip(null);}}>
                                  <div style={{position:'absolute',left:0,top:0,bottom:0,width:8,cursor:'ew-resize',zIndex:8,borderRadius:'5px 0 0 5px'}} onMouseDown={e=>handleMouseDown(e,proj.id,task.id,'start')} />
                                  <div style={{width:`${task.progress||0}%`,height:'100%',background:c.bar,borderRadius:4,pointerEvents:'none'}} />
                                  <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:600,pointerEvents:'none',color:(task.progress||0)>50?'#fff':c.text}}>{task.progress||0}%</div>
                                  <div style={{position:'absolute',right:0,top:0,bottom:0,width:8,cursor:'ew-resize',zIndex:8,borderRadius:'0 5px 5px 0'}} onMouseDown={e=>handleMouseDown(e,proj.id,task.id,'end')} />
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div style={{background:'linear-gradient(135deg,#0f0f1a,#1a1a2e)',borderTop:'1px solid rgba(255,255,255,0.08)',padding:'8px 24px',display:'flex',alignItems:'center',gap:24,fontSize:12,color:'rgba(148,163,184,0.7)',flexShrink:0,flexWrap:'wrap'}}>
        <div style={{display:'flex',alignItems:'center',gap:6}}><div style={{width:12,height:12,borderRadius:'50%',background:'#f87171'}} /><span>오늘</span></div>
        <div style={{display:'flex',alignItems:'center',gap:6}}><div style={{width:32,height:12,borderRadius:4,background:'linear-gradient(to right, #3b82f6 50%, #bfdbfe 50%)'}} /><span>진행률</span></div>
        <span style={{marginLeft:'auto',color:'#9ca3af'}}>바를 드래그하여 일정 조정 | 그룹명 더블클릭으로 이름 변경</span>
      </div>

      {/* 툴팁 */}
      {tooltip?.startDate && (
        <div style={{position:'fixed',left:tooltipPos.x+12,top:tooltipPos.y+12,background:'#1f2937',color:'white',fontSize:11,padding:'4px 10px',borderRadius:5,whiteSpace:'nowrap',pointerEvents:'none',zIndex:99999,boxShadow:'0 2px 8px rgba(0,0,0,0.3)'}}>
          {tooltip.startDate} ~ {tooltip.endDate}
        </div>
      )}

      {editingProject && <ProjectEditModal proj={editingProject} onClose={()=>setEditingProject(null)} />}
      {editingTask && <TaskEditModal task={editingTask.task} pid={editingTask.pid} onClose={()=>setEditingTask(null)} />}
      {/* ── 히스토리 모달 ── */}
      {showChangePw && <ChangePwModal />}
      {showHistory && <HistoryModal />}
    </div>
  );
}
