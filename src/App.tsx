// src/App.tsx 전체 내용을 이걸로 교체하세요!
const { createClient } = (window as any).supabase;
const XLSX = (window as any).XLSX;
import React, { useState, useEffect, useRef, useCallback } from 'react';

const SUPABASE_URL = 'https://tcmcrpszpbawgwolzuno.supabase.co';
const SUPABASE_KEY = 'sb_publishable_ktL_xVzsDjv3wmbrO8j0Tg_DP2vYBHO';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

type ViewMode = 'year'|'half'|'week'|'day';

const WEEK_COL_W = 52;
const DAY_COL_W  = 28;

// ── 2026년 대한민국 법정공휴일 + 대체공휴일 ────────────────────
const KR_HOLIDAYS_2026: Record<string, string> = {
  '2026-01-01': '신정',
  '2026-02-16': '설날 전날',
  '2026-02-17': '설날',
  '2026-02-18': '설날 다음날',
  '2026-03-01': '3·1절',
  '2026-03-02': '3·1절 대체공휴일',
  '2026-05-05': '어린이날',
  '2026-05-24': '부처님오신날',
  '2026-05-25': '부처님오신날 대체공휴일',
  '2026-06-06': '현충일',
  '2026-08-15': '광복절',
  '2026-08-17': '광복절 대체공휴일',
  '2026-09-30': '추석 전날',
  '2026-10-01': '추석',
  '2026-10-02': '추석 다음날',
  '2026-10-03': '개천절',
  '2026-10-05': '개천절 대체공휴일',
  '2026-10-09': '한글날',
  '2026-12-25': '크리스마스',
};

// ── 기기/화면 분류 ────────────────────────────────────────────
const isTouchDevice = () => 'ontouchstart' in window || navigator.maxTouchPoints > 0;

type DeviceType = 'phone' | 'tablet' | 'fold' | 'fold-open' | 'desktop';

const classifyDevice = (w: number, h: number): DeviceType => {
  if (!isTouchDevice()) return 'desktop';
  const short = Math.min(w, h);
  const long  = Math.max(w, h);
  if (short < 300 && long > 700) return 'fold';
  if (short >= 600 && long / short < 1.35) return 'fold-open';
  if (short >= 600) return 'tablet';
  return 'phone';
};

const shouldShowGantt = (w: number, h: number): boolean => {
  const device = classifyDevice(w, h);
  if (device === 'desktop')   return true;
  if (device === 'tablet')    return w > h;
  if (device === 'fold-open') return w > h;
  return false;
};

const calcLayout = (mode: ViewMode, screenW: number, deviceType: string = 'desktop') => {
  const isCompact = deviceType === 'tablet' || deviceType === 'fold-open' || (deviceType === 'desktop' && screenW < 1400);
  const leftCol     = isCompact ? 22 : Math.max(220, Math.floor(screenW * 0.25));
  const assigneeCol = isCompact ? 0  : Math.max(52, Math.floor(screenW * 0.05));
  const subCol      = isCompact ? 0  : Math.max(52, Math.floor(screenW * 0.05));
  const availW      = screenW - leftCol - assigneeCol - subCol;

  let colW: number, totalTimelineW: number;
  if (mode === 'year') {
    colW = Math.floor(availW / 12);
    totalTimelineW = colW * 12;
  } else if (mode === 'half') {
    colW = Math.floor(availW / 6);
    totalTimelineW = colW * 12;
  } else if (mode === 'week') {
    colW = WEEK_COL_W;
    totalTimelineW = WEEK_COL_W * 52;
  } else {
    colW = DAY_COL_W;
    totalTimelineW = DAY_COL_W * 365;
  }
  return { leftCol, assigneeCol, subCol, colW, totalTimelineW };
};

const MONTH_LABELS = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];

const WEEK_HEADERS = (() => {
  const items: { label: string; isFirstOfMonth: boolean; month: number; weekInMonth: number }[] = [];
  const base = new Date('2026-01-01T00:00:00');
  let currentMonth = -1;
  let weekInMonth = 0;
  for (let w = 0; w < 52; w++) {
    const d = new Date(base); d.setDate(d.getDate() + w * 7);
    const month = d.getMonth() + 1;
    const isFirstOfMonth = month !== currentMonth;
    if (isFirstOfMonth) { currentMonth = month; weekInMonth = 1; }
    else { weekInMonth++; }
    items.push({ label: `W${weekInMonth}`, isFirstOfMonth, month, weekInMonth });
  }
  return items;
})();

const DAY_HEADERS = (() => {
  const items: { day: number; month: number; isFirst: boolean; dateStr: string; isHoliday: boolean; holidayName: string; isSunday: boolean; isSaturday: boolean }[] = [];
  const base = new Date('2026-01-01T00:00:00');
  for (let i = 0; i < 365; i++) {
    const d = new Date(base); d.setDate(d.getDate() + i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${day}`;
    const dow = d.getDay();
    items.push({
      day: d.getDate(),
      month: d.getMonth() + 1,
      isFirst: d.getDate() === 1,
      dateStr,
      isHoliday: !!KR_HOLIDAYS_2026[dateStr],
      holidayName: KR_HOLIDAYS_2026[dateStr] || '',
      isSunday: dow === 0,
      isSaturday: dow === 6,
    });
  }
  return items;
})();

const COLOR_MAP: Record<string, any> = {
  blue:   { bar:'#3b82f6', barLight:'#bfdbfe', text:'#1e40af', border:'#3b82f6', rowBg:'#f8faff' },
  green:  { bar:'#22c55e', barLight:'#bbf7d0', text:'#15803d', border:'#22c55e', rowBg:'#f6fef8' },
  purple: { bar:'#a855f7', barLight:'#e9d5ff', text:'#6b21a8', border:'#a855f7', rowBg:'#fdf8ff' },
  orange: { bar:'#f97316', barLight:'#fed7aa', text:'#c2410c', border:'#f97316', rowBg:'#fffaf5' },
  pink:   { bar:'#ec4899', barLight:'#fbcfe8', text:'#be185d', border:'#ec4899', rowBg:'#fef7fb' },
};

const CATEGORY_COLORS: Record<string, any> = {
  '영업': { bg:'#fef3c7', text:'#92400e', border:'#f59e0b' },
  '기획': { bg:'#fce7f3', text:'#9d174d', border:'#ec4899' },
  '운영': { bg:'#e0f2fe', text:'#075985', border:'#0ea5e9' },
  '개발': { bg:'#d1fae5', text:'#065f46', border:'#10b981' },
  '보안': { bg:'#fee2e2', text:'#991b1b', border:'#ef4444' },
};
const CATEGORIES = ['영업','기획','운영','개발','보안'];

const toDateStr = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
const parseDate = (s: string) => new Date(s + 'T00:00:00');
const todayStr = () => toDateStr(new Date());
const weekLaterStr = () => { const d = new Date(); d.setDate(d.getDate() + 7); return toDateStr(d); };

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
    <div style={{minHeight:'100dvh',background:'linear-gradient(135deg,#0f0f1a 0%,#1a1a2e 60%,#16213e 100%)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Pretendard',-apple-system,BlinkMacSystemFont,sans-serif"}}>
      <style>{`@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css'); @keyframes spin{to{transform:rotate(360deg)}} *{box-sizing:border-box;}`}</style>
      <div style={{width:'100%',maxWidth:400,padding:'0 24px'}}>
        <div style={{textAlign:'center',marginBottom:40}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:16,marginBottom:14}}>
            <div style={{width:52,height:52,borderRadius:14,background:'linear-gradient(135deg,#6366f1,#8b5cf6)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:26,boxShadow:'0 4px 18px rgba(99,102,241,0.45)'}}>📱</div>
            <div style={{width:2,height:40,background:'rgba(255,255,255,0.12)',borderRadius:2}} />
            <div style={{width:52,height:52,borderRadius:14,background:'linear-gradient(135deg,#0ea5e9,#6366f1)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:26,boxShadow:'0 4px 18px rgba(14,165,233,0.4)'}}>🚌</div>
          </div>
          <h1 style={{fontSize:36,fontWeight:'bold',color:'#f1f5f9',margin:'0 0 10px',letterSpacing:'-1px'}}>간트차트</h1>
          <p style={{fontSize:16,color:'rgba(148,163,184,0.8)',margin:0,fontWeight:500}}>팀원만 접근 가능한 프로젝트 관리 도구</p>
        </div>
        <div style={{background:'rgba(255,255,255,0.05)',borderRadius:16,padding:32,border:'1px solid rgba(255,255,255,0.1)',backdropFilter:'blur(10px)'}}>
          <div style={{marginBottom:18}}>
            <label style={{display:'block',fontSize:13,color:'rgba(148,163,184,0.8)',marginBottom:7,fontWeight:500}}>이메일</label>
            <input type="email" value={email} onChange={e=>{setEmail(e.target.value);setError('');}}
              onKeyDown={e=>e.key==='Enter'&&handleLogin()} placeholder="이메일 입력"
              style={{width:'100%',padding:'11px 14px',background:'rgba(255,255,255,0.07)',border:`1px solid ${error?'rgba(239,68,68,0.5)':'rgba(255,255,255,0.12)'}`,borderRadius:10,fontSize:14,color:'#f1f5f9',outline:'none'}} />
          </div>
          <div style={{marginBottom:24}}>
            <label style={{display:'block',fontSize:13,color:'rgba(148,163,184,0.8)',marginBottom:7,fontWeight:500}}>비밀번호</label>
            <input type="password" value={password} onChange={e=>{setPassword(e.target.value);setError('');}}
              onKeyDown={e=>e.key==='Enter'&&handleLogin()} placeholder="비밀번호 입력"
              style={{width:'100%',padding:'11px 14px',background:'rgba(255,255,255,0.07)',border:`1px solid ${error?'rgba(239,68,68,0.5)':'rgba(255,255,255,0.12)'}`,borderRadius:10,fontSize:14,color:'#f1f5f9',outline:'none'}} />
          </div>
          {error && (
            <div style={{background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.3)',borderRadius:8,padding:'10px 14px',marginBottom:18,fontSize:13,color:'#fca5a5'}}>⚠️ {error}</div>
          )}
          <button onClick={handleLogin} disabled={loading}
            style={{width:'100%',padding:'12px',background:loading?'rgba(99,102,241,0.5)':'linear-gradient(135deg,#6366f1,#8b5cf6)',color:'white',border:'none',borderRadius:10,fontSize:15,fontWeight:600,cursor:loading?'not-allowed':'pointer',boxShadow:'0 2px 12px rgba(99,102,241,0.4)',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
            {loading ? (<><div style={{width:16,height:16,border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'white',borderRadius:'50%',animation:'spin 0.8s linear infinite'}} />로그인 중...</>) : '로그인'}
          </button>
        </div>
        <p style={{textAlign:'center',fontSize:12,color:'rgba(148,163,184,0.35)',marginTop:24}}>© 2026 S&I Corp. 내부 전용</p>
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [appId, setAppId] = useState<1|2>(() => {
    const saved = localStorage.getItem('gantt_last_app');
    return (saved === '1' ? 1 : 2) as 1|2;
  });
  const [authLoading, setAuthLoading] = useState(true);
  const [isResetMode, setIsResetMode] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') { setUser(session?.user ?? null); setIsResetMode(true); }
      else { setUser(session?.user ?? null); }
    });
    return () => subscription.unsubscribe();
  }, []);

  if (authLoading) return (
    <div style={{minHeight:'100dvh',background:'#0f0f1a',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{width:32,height:32,border:'4px solid rgba(99,102,241,0.3)',borderTopColor:'#6366f1',borderRadius:'50%',animation:'spin 0.8s linear infinite'}} />
      <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
    </div>
  );

  if (isResetMode && user) return <ResetPasswordScreen user={user} onDone={()=>setIsResetMode(false)} />;
  if (!user) return <LoginScreen onLogin={setUser} />;

  return <GanttChart user={user} appId={appId}
    onAppChange={(id) => { setAppId(id); localStorage.setItem('gantt_last_app', String(id)); }}
    onLogout={async () => { await supabase.auth.signOut(); setUser(null); }} />;
}

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
      if (err) setError('비밀번호 변경에 실패했습니다.');
      else { setSuccess(true); setTimeout(() => onDone(), 2000); }
    } catch { setError('오류가 발생했습니다.'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{minHeight:'100dvh',background:'linear-gradient(135deg,#0f0f1a 0%,#1a1a2e 60%,#16213e 100%)',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Pretendard',-apple-system,BlinkMacSystemFont,sans-serif"}}>
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
            </div>
          ) : (
            <>
              <div style={{marginBottom:16}}>
                <label style={{display:'block',fontSize:13,color:'rgba(148,163,184,0.8)',marginBottom:7,fontWeight:500}}>새 비밀번호</label>
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

function GanttChart({ user, appId, onAppChange, onLogout }: { user: any; appId: 1|2; onAppChange: (id: 1|2) => void; onLogout: () => void }) {
  const APP_CONFIG = {
    1: { name: '샌디버스 간트차트', channel: 'gantt-bus-sync', csvPrefix: '샌디버스' },
    2: { name: '샌디앱 간트차트',   channel: 'gantt-app-sync', csvPrefix: '샌디앱'   },
  };
  const currentApp = APP_CONFIG[appId];

  const [viewMode, setViewMode] = useState<ViewMode>('year');
  const getW = () => window.innerWidth  || window.screen.width;
  const getH = () => window.innerHeight || window.screen.height;
  const [screenW, setScreenW] = useState(getW);
  const [screenH, setScreenH] = useState(getH);

  useEffect(() => {
    const updateSize = () => {
      const vv = (window as any).visualViewport;
      const w = vv ? Math.round(vv.width)  : window.innerWidth  || window.screen.width;
      const h = vv ? Math.round(vv.height) : window.innerHeight || window.screen.height;
      setScreenW(w);
      setScreenH(h);
    };
    const onOrient = () => {
      updateSize();
      setTimeout(updateSize, 100);
      setTimeout(updateSize, 300);
      setTimeout(updateSize, 600);
    };
    const vv = (window as any).visualViewport;
    if (vv) vv.addEventListener('resize', updateSize);
    window.addEventListener('resize', updateSize);
    window.addEventListener('orientationchange', onOrient);
    return () => {
      window.removeEventListener('resize', updateSize);
      window.removeEventListener('orientationchange', onOrient);
      const vv2 = (window as any).visualViewport;
      if (vv2) vv2.removeEventListener('resize', updateSize);
    };
  }, []);

  const showGantt = shouldShowGantt(screenW, screenH);
  const deviceType = classifyDevice(screenW, screenH);
  const isPortrait = screenH > screenW;
  const isCompactUI = (deviceType === 'fold-open' && !isPortrait) || (deviceType === 'tablet' && !isPortrait) || (deviceType === 'desktop' && screenW < 1400);

  const layout       = React.useMemo(() => calcLayout(viewMode, screenW, deviceType), [viewMode, screenW, deviceType]);
  const LEFT_COL     = layout.leftCol;
  const ASSIGNEE_COL = layout.assigneeCol;
  const SUB_COL      = layout.subCol;
  const MONTH_COL    = layout.colW;
  const TIMELINE_W   = layout.totalTimelineW;

  const GridLines = React.useMemo(() => (
    <div style={{
      position:'absolute',inset:0,pointerEvents:'none',zIndex:0,
      backgroundImage:`repeating-linear-gradient(to right, transparent 0px, transparent ${MONTH_COL-1}px, #e8ecf8 ${MONTH_COL-1}px, #e8ecf8 ${MONTH_COL}px)`,
      backgroundSize:`${MONTH_COL}px 100%`,
    }} />
  ), [MONTH_COL]);

  const DayOverlayLines = viewMode === 'day' ? (
    <div style={{position:'absolute',inset:0,pointerEvents:'none',zIndex:1,overflow:'hidden'}}>
      {DAY_HEADERS.map((h, i) => {
        if (!h.isHoliday && !h.isSunday && !h.isSaturday) return null;
        const bg = h.isHoliday
          ? 'rgba(220,38,38,0.10)'
          : h.isSunday
            ? 'rgba(239,68,68,0.06)'
            : 'rgba(37,99,235,0.05)';
        const borderLeft = h.isHoliday ? '1px solid rgba(220,38,38,0.18)' : undefined;
        return (
          <div key={i} style={{
            position:'absolute', top:0, bottom:0,
            left: i * DAY_COL_W, width: DAY_COL_W,
            background: bg,
            borderLeft,
          }} />
        );
      })}
    </div>
  ) : null;

  const V_START      = new Date('2026-01-01T00:00:00');
  const V_END        = new Date('2026-12-31T00:00:00');
  const V_TOTAL_DAYS = 365;

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
  const [showHistory, setShowHistory]         = useState(false);
  const [history, setHistory]                 = useState<any[]>([]);
  const [historyLoading, setHistoryLoading]   = useState(false);
  const [restoring, setRestoring]             = useState(false);
  const [showChangePw, setShowChangePw]       = useState(false);
  const [rowDrag, setRowDrag]                 = useState<any>(null);
  const [rowDragOver, setRowDragOver]         = useState<any>(null);
  const [groupOrder, setGroupOrder]           = useState<string[]>([]);
  const [realtimeToast, setRealtimeToast]     = useState(false);
  const [headerCollapsed, setHeaderCollapsed] = useState(false);
  const [uploadPreview, setUploadPreview]     = useState<any[]|null>(null);
  const [uploadError, setUploadError]         = useState<string>('');

  const dragRef      = useRef<any>(null);
  const rowDragRef   = useRef<any>(null);
  const historyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const headerRef    = useRef<HTMLDivElement>(null);
  const draggingRef  = useRef<any>(null);
  const isSavingRef  = useRef<boolean>(false);
  const toastTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastScrollY  = useRef(0);
  const mobileScrollRef = useRef<HTMLDivElement>(null);
  const chartScrollRef  = useRef<HTMLDivElement>(null);
  const tooltipTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const HISTORY_DEBOUNCE_MS = 5 * 60 * 1000;

  // ── beforeunload 용 최신 projects ref ───────────────────────
  const projectsRef = useRef<any[]>([]);
  useEffect(() => { projectsRef.current = projects; }, [projects]);

  useEffect(() => { draggingRef.current = dragging; }, [dragging]);
  useEffect(() => { if (isPortrait) setHeaderCollapsed(false); }, [isPortrait]);

  useEffect(() => {
    const el = mobileScrollRef.current;
    if (!el) return;
    const handler = () => {
      if (isPortrait) { setHeaderCollapsed(false); return; }
      const currentY = el.scrollTop;
      const delta = currentY - lastScrollY.current;
      if (delta > 8 && currentY > 30) setHeaderCollapsed(true);
      else if (delta < -8) setHeaderCollapsed(false);
      lastScrollY.current = currentY;
    };
    el.addEventListener("scroll", handler, { passive: true });
    return () => el.removeEventListener("scroll", handler);
  }, [isPortrait]);

  const getPos = useCallback((s: string, e: string) => {
    if (!s || !e) return null;
    const sd = parseDate(s), ed = parseDate(e);
    if (isNaN(sd.getTime()) || isNaN(ed.getTime())) return null;
    const startDays = (sd.getTime() - V_START.getTime()) / 86400000;
    const endDays   = (ed.getTime() - V_START.getTime()) / 86400000;
    const left  = Math.max(0, startDays / V_TOTAL_DAYS * TIMELINE_W);
    const right = Math.min(TIMELINE_W, endDays / V_TOTAL_DAYS * TIMELINE_W);
    if (right <= left) return null;
    return { left, width: Math.max(6, right - left) };
  }, [TIMELINE_W]);

  const getProjectMeta = useCallback((proj: any) => {
    const tasks = proj.tasks.filter((t:any) => t.startDate && t.endDate);
    if (!tasks.length) {
      if (proj.startDate && proj.endDate) return { pos: getPos(proj.startDate, proj.endDate), progress: proj.progress || 0, startDate: proj.startDate, endDate: proj.endDate };
      return { pos: null, progress: 0, startDate: '', endDate: '' };
    }
    let totalW = 0, totalP = 0;
    tasks.forEach((t:any) => {
      const dur = Math.max(1, (parseDate(t.endDate).getTime() - parseDate(t.startDate).getTime()) / 86400000);
      totalW += dur; totalP += (t.progress || 0) * dur;
    });
    const starts = tasks.map((t:any) => +parseDate(t.startDate));
    const ends   = tasks.map((t:any) => +parseDate(t.endDate));
    const realStart = toDateStr(new Date(Math.min(...starts)));
    const realEnd   = toDateStr(new Date(Math.max(...ends)));
    return { pos: getPos(realStart, realEnd), progress: totalW > 0 ? Math.round(totalP / totalW) : 0, startDate: realStart, endDate: realEnd };
  }, [getPos]);

  const TASK_ROW_H = 22;
  const TASK_GAP   = 4;
  const BAR_GAP_PX = 4;

  const assignLanes = useCallback((tasks: any[]) => {
    const laneEnds: number[] = [];
    const sorted = [...tasks]
      .map((task, origIdx) => ({ task, origIdx, pos: getPos(task.startDate, task.endDate) }))
      .filter(item => item.pos !== null)
      .sort((a, b) => (a.task.startDate || '').localeCompare(b.task.startDate || ''));
    const laneMap: Record<number, number> = {};
    sorted.forEach(({ origIdx, pos }) => {
      const laneIdx = laneEnds.findIndex(end => end + BAR_GAP_PX <= pos!.left);
      const lane = laneIdx === -1 ? laneEnds.length : laneIdx;
      laneEnds[lane] = pos!.left + pos!.width;
      laneMap[origIdx] = lane;
    });
    return tasks.map((task, origIdx) => ({ task, lane: laneMap[origIdx] ?? 0, pos: getPos(task.startDate, task.endDate) }));
  }, [getPos]);

  const calcLaneCount = (laned: ReturnType<typeof assignLanes>) => {
    const validLanes = laned.filter(l => l.pos !== null).map(l => l.lane);
    return validLanes.length > 0 ? Math.max(...validLanes) + 1 : 1;
  };

  const calcCollapsedMinH = useCallback((proj: any) => {
    const validTasks = proj.tasks.filter((t:any) => t.startDate && t.endDate);
    if (!validTasks.length) return 52;
    const laned = assignLanes(validTasks);
    const laneCount = calcLaneCount(laned);
    const totalH = laneCount * (TASK_ROW_H + TASK_GAP) - TASK_GAP;
    return Math.max(52, totalH + 12);
  }, [assignLanes]);

  // ── 히스토리 스냅샷 저장 (app_id 포함) ──────────────────────
  const saveHistorySnapshot = async (p: any[], memo?: string) => {
    try {
      await supabase.from('gantt_history').insert({
        data: { app_id: appId, projects: p },
        memo: memo || '',
      });
    } catch {}
  };

  // ── beforeunload: 브라우저 종료 시 즉시 스냅샷 (fetch keepalive) ──
  useEffect(() => {
    const handleUnload = () => {
      const snap = projectsRef.current;
      if (!snap.length) return;
      const body = JSON.stringify({
        data: { app_id: appId, projects: snap },
        memo: '브라우저 종료',
      });
      fetch(`${SUPABASE_URL}/rest/v1/gantt_history`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Prefer': 'return=minimal',
        },
        body,
        keepalive: true,
      });
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [appId]);

  useEffect(() => {
    setProjects([]);
    load();
    const channel = supabase.channel(currentApp.channel)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'gantt_projects', filter: `id=eq.${appId}` },
        (payload: any) => {
          if (isSavingRef.current || draggingRef.current) return;
          setProjects(payload.new.data || []);
          if (toastTimer.current) clearTimeout(toastTimer.current);
          setRealtimeToast(true);
          toastTimer.current = setTimeout(() => setRealtimeToast(false), 2500);
        })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, [appId]);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('gantt_projects').select('data').eq('id', appId).single();
      if (!error && data) setProjects(data.data || []);
    } catch {}
    finally { setLoading(false); }
  };

  const save = async (p: any[], memo?: string) => {
    setProjects(p); setSaving(true); isSavingRef.current = true;
    try { await supabase.from('gantt_projects').upsert({ id: appId, data: p }); } catch {}
    finally { setSaving(false); setTimeout(() => { isSavingRef.current = false; }, 1000); }
    if (historyTimer.current) clearTimeout(historyTimer.current);
    historyTimer.current = setTimeout(() => saveHistorySnapshot(p, memo), HISTORY_DEBOUNCE_MS);
  };

  // ── 히스토리 조회 (현재 앱만 필터) ──────────────────────────
  const loadHistory = async () => {
    setHistoryLoading(true); setShowHistory(true);
    try {
      // data 컬럼도 함께 가져와서 app_id 필터링 (jsonb 컬럼은 .eq 불가)
      const { data: raw } = await supabase
        .from('gantt_history')
        .select('id, saved_at, memo, data')
        .order('saved_at', { ascending: false })
        .limit(200);
      // 현재 appId 것만, 최대 50개
      const filtered = (raw || [])
        .filter((h: any) => h.data?.app_id === appId)
        .slice(0, 50);
      setHistory(filtered);
    } catch {}
    finally { setHistoryLoading(false); }
  };

  // ── 히스토리 복원 ────────────────────────────────────────────
  const restoreHistory = async (id: number) => {
    if (!confirm('이 시점으로 복원할까요?\n현재 데이터는 덮어쓰여집니다.')) return;
    setRestoring(true);
    try {
      const { data } = await supabase.from('gantt_history').select('data').eq('id', id).single();
      if (data) {
        // 신버전: { app_id, projects }, 구버전(레거시): 배열 직접
        const restoredProjects = Array.isArray(data.data)
          ? data.data
          : (data.data?.projects ?? []);
        setProjects(restoredProjects); setSaving(true);
        try { await supabase.from('gantt_projects').upsert({ id: appId, data: restoredProjects }); } catch {}
        finally { setSaving(false); }
        await saveHistorySnapshot(restoredProjects, '복원됨');
        setShowHistory(false); alert('복원 완료!');
      }
    } catch { alert('복원 중 오류가 발생했습니다.'); }
    finally { setRestoring(false); }
  };

  const addProject = () => save([...projects, { id:Date.now(), name:'새 프로젝트', owner:'', subOwner:'', description:'', color:'blue', expanded:true, tasks:[], category:'기획', group: activeGroup || '미분류', startDate:todayStr(), endDate:weekLaterStr(), progress:0 }]);
  const addTask = (pid: number) => save(projects.map(p => p.id !== pid ? p : { ...p, tasks:[...p.tasks, { id:Date.now(), name:'새 Task', assignee:'', subAssignee:'', startDate:todayStr(), endDate:weekLaterStr(), progress:0, dependencies:[], description:'', category: p.category||'' }] }));
  const toggleProject  = (pid: number) => setProjects(projects.map(p => p.id===pid ? {...p, expanded:!p.expanded} : p));
  const collapseAll    = () => { setCollapsedGroups(new Set(allGroups)); setProjects(projects.map(p => ({...p, expanded:false}))); };
  const expandAll      = () => { setCollapsedGroups(new Set()); setProjects(projects.map(p => ({...p, expanded:true}))); };
  const updateTask     = (pid: number, tid: number, upd: any) => save(projects.map(p => p.id!==pid ? p : {...p, tasks:p.tasks.map((t:any)=>t.id!==tid?t:{...t,...upd})}));
  const deleteTask     = (pid: number, tid: number) => save(projects.map(p => p.id!==pid ? p : {...p, tasks:p.tasks.filter((t:any)=>t.id!==tid)}));
  const deleteProject  = (pid: number) => save(projects.filter(p => p.id!==pid));
  const updateProject  = (pid: number, upd: any) => save(projects.map(p => p.id!==pid ? p : {...p,...upd}));
  const toggleGroup    = (g: string) => setCollapsedGroups(prev => {
    const next = new Set(prev);
    if (next.has(g)) {
      next.delete(g);
      setProjects(ps => ps.map(p => (p.group||'미분류') === g ? {...p, expanded:false} : p));
    } else {
      next.add(g);
    }
    return next;
  });
  const renameGroup    = (oldName: string, newName: string) => { if (!newName.trim() || newName === oldName) return; save(projects.map(p => p.group === oldName ? {...p, group: newName.trim()} : p)); };

  const handleMouseDown = (e: React.MouseEvent, pid: number, tid: any, type: string) => {
    e.preventDefault(); e.stopPropagation();
    if (tid==='__proj__') {
      const proj = projects.find(p=>p.id===pid); if (!proj) return;
      dragRef.current = { pid, tid:'__proj__', type, startX:e.clientX, startDate:proj.startDate, endDate:proj.endDate };
    } else {
      const task = projects.find(p=>p.id===pid)?.tasks.find((t:any)=>t.id===tid); if (!task) return;
      dragRef.current = { pid, tid, type, startX:e.clientX, startDate:task.startDate, endDate:task.endDate };
    }
    isSavingRef.current = true;
    setDragging({ pid, tid, type });
  };

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      const d = dragRef.current; if (!d) return;
      e.preventDefault();
      const deltaDays = Math.round(((e.clientX - d.startX) / TIMELINE_W) * V_TOTAL_DAYS);
      const s0=parseDate(d.startDate), e0=parseDate(d.endDate);
      let ns=new Date(s0), ne=new Date(e0);
      if (d.type==='move') {
        ns=new Date(+s0+deltaDays*86400000); ne=new Date(+e0+deltaDays*86400000);
        if (ns<V_START){const diff=V_START.getTime()-ns.getTime();ns=new Date(V_START);ne=new Date(+ne+diff);}
        if (ne>V_END)  {const diff=ne.getTime()-V_END.getTime();ne=new Date(V_END);ns=new Date(+ns-diff);}
      } else if (d.type==='start') {
        ns=new Date(Math.max(+V_START,Math.min(+s0+deltaDays*86400000,+e0-86400000)));
      } else {
        ne=new Date(Math.min(+V_END,Math.max(+e0+deltaDays*86400000,+s0+86400000)));
      }
      const nsStr = toDateStr(ns), neStr = toDateStr(ne);
      if (d.tid==='__proj__') setProjects(prev => prev.map(p => p.id!==d.pid ? p : {...p, startDate:nsStr, endDate:neStr}));
      else setProjects(prev => prev.map(p => p.id!==d.pid ? p : {...p, tasks:p.tasks.map((t:any)=>t.id!==d.tid?t:{...t,startDate:nsStr,endDate:neStr})}));
      setTooltip((t:any)=>t?{...t,startDate:nsStr,endDate:neStr}:t);
    };
    const onUp = () => {
      const d = dragRef.current; dragRef.current=null; setDragging(null);
      document.body.style.cursor=''; document.body.style.userSelect='';
      if (d) {
        setProjects(prev => {
          const latest = prev; setSaving(true);
          supabase.from('gantt_projects').upsert({ id: appId, data: latest })
            .then(() => { setSaving(false); setTimeout(() => { isSavingRef.current = false; }, 1000); if (historyTimer.current) clearTimeout(historyTimer.current); historyTimer.current = setTimeout(() => { saveHistorySnapshot(latest); }, HISTORY_DEBOUNCE_MS); })
            .catch(() => { setSaving(false); setTimeout(() => { isSavingRef.current = false; }, 1000); });
          return latest;
        });
      } else { setTimeout(() => { isSavingRef.current = false; }, 1500); }
    };
    document.body.style.userSelect='none';
    document.body.style.cursor=dragging.type==='move'?'grabbing':'ew-resize';
    window.addEventListener('mousemove', onMove, {passive:false});
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [dragging, TIMELINE_W]);

  const rawGroups = Array.from(new Set(projects.map(p => p.group || '미분류')));
  const allGroups = [...groupOrder.filter(g => rawGroups.includes(g)), ...rawGroups.filter(g => !groupOrder.includes(g))];

  const filtered = projects
    .filter(p => activeCategories.length===0 || activeCategories.includes(p.category))
    .filter(p => activeGroup==='' || (p.group||'미분류')===activeGroup)
    .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.owner?.toLowerCase().includes(searchQuery.toLowerCase()) || p.tasks.some((t:any)=>t.name.toLowerCase().includes(searchQuery.toLowerCase())||t.assignee?.toLowerCase().includes(searchQuery.toLowerCase())));

  const groupedFiltered = allGroups
    .filter(g => activeGroup==='' || g===activeGroup)
    .map(g => ({ name:g, items: filtered.filter(p=>(p.group||'미분류')===g) }))
    .filter(g => g.items.length > 0);

  const handleRowDragStart = (e: React.DragEvent, info: any) => { rowDragRef.current = info; setRowDrag(info); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setDragImage(new Image(), 0, 0); };
  const handleRowDragOver  = (e: React.DragEvent, info: any) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setRowDragOver(info); };
  const handleRowDragEnd   = () => { setRowDrag(null); setRowDragOver(null); };

  const handleRowDrop = (e: React.DragEvent, target: any) => {
    e.preventDefault();
    const src = rowDragRef.current;
    if (!src || !target) { setRowDrag(null); setRowDragOver(null); return; }
    if (src.type === 'group' && target.type === 'group' && src.name !== target.name) {
      const cur = allGroups.filter(g => g !== src.name); const ti = cur.indexOf(target.name); cur.splice(ti, 0, src.name); setGroupOrder(cur);
    } else if (src.type === 'project' && target.type === 'project' && src.id !== target.id) {
      const srcProj = projects.find((p:any) => p.id === src.id); if (!srcProj) return;
      const updatedSrcProj = { ...srcProj, group: target.group };
      const withoutSrc = projects.filter((p:any) => p.id !== src.id);
      const tgtIdx = withoutSrc.findIndex((p:any) => p.id === target.id);
      const newProjects = [...withoutSrc]; newProjects.splice(tgtIdx, 0, updatedSrcProj); save(newProjects);
    } else if (src.type === 'task' && target.type === 'task' && src.tid !== target.tid) {
      const srcProj = projects.find((p:any) => p.id === src.pid); if (!srcProj) return;
      const srcTask = srcProj.tasks.find((t:any) => t.id === src.tid); if (!srcTask) return;
      if (src.pid === target.pid) {
        save(projects.map((p:any) => { if (p.id !== src.pid) return p; const tasks = [...p.tasks]; const si = tasks.findIndex((t:any) => t.id === src.tid); const ti = tasks.findIndex((t:any) => t.id === target.tid); tasks.splice(si, 1); tasks.splice(ti, 0, srcProj.tasks[si]); return { ...p, tasks }; }));
      } else {
        save(projects.map((p:any) => { if (p.id === src.pid) return { ...p, tasks: p.tasks.filter((t:any) => t.id !== src.tid) }; if (p.id === target.pid) { const tasks = [...p.tasks]; const ti = tasks.findIndex((t:any) => t.id === target.tid); tasks.splice(ti, 0, srcTask); return { ...p, tasks }; } return p; }));
      }
    } else if (src.type === 'task' && target.type === 'project') {
      const srcProj = projects.find((p:any) => p.id === src.pid); if (!srcProj || src.pid === target.id) return;
      const srcTask = srcProj.tasks.find((t:any) => t.id === src.tid); if (!srcTask) return;
      save(projects.map((p:any) => { if (p.id === src.pid) return { ...p, tasks: p.tasks.filter((t:any) => t.id !== src.tid) }; if (p.id === target.id) return { ...p, tasks: [...p.tasks, srcTask] }; return p; }));
    }
    setRowDrag(null); setRowDragOver(null);
  };

  const exportXLSX = () => {
    const headers = ['그룹','카테고리','프로젝트','오너(정)','부오너(부)','프로젝트 시작일','프로젝트 종료일','프로젝트 진행률','프로젝트 설명','Task','Task 설명','담당자(정)','부담당자(부)','Task 시작일','Task 종료일','Task 진행률'];
    const rows: any[][] = [];
    projects.filter(p => activeCategories.length===0 || activeCategories.includes(p.category)).forEach(proj => {
      const { progress: projProg } = getProjectMeta(proj);
      const base = [proj.group||'미분류', proj.category||'', proj.name, proj.owner||'', proj.subOwner||'', proj.startDate||'', proj.endDate||'', `${projProg}%`, proj.description||''];
      if (proj.tasks.length === 0) rows.push([...base, '', '', '', '', '', '', '']);
      else proj.tasks.forEach((t: any) => rows.push([...base, t.name, t.description||'', t.assignee||'', t.subAssignee||'', t.startDate||'', t.endDate||'', `${t.progress||0}%`]));
    });
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const range = XLSX.utils.decode_range(ws['!ref']||'A1');
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = ws[XLSX.utils.encode_cell({r:0, c})];
      if (cell) cell.s = { font: { bold: true }, fill: { fgColor: { rgb: 'EFF6FF' } }, alignment: { horizontal: 'center' } };
    }
    ws['!cols'] = headers.map((h, i) => {
      const maxLen = Math.max(h.length, ...rows.map(r => String(r[i]||'').length));
      return { wch: Math.min(Math.max(maxLen + 2, 10), 40) };
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '간트차트');
    XLSX.writeFile(wb, `${currentApp.csvPrefix}_간트차트_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const handleImportXLSX = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadError('');
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        if (rows.length < 2) { setUploadError('데이터가 없습니다.'); return; }
        const header = rows[0] as string[];
        const hi = (name: string) => header.findIndex(h => String(h).trim() === name);
        const iGrp=hi('그룹'), iCat=hi('카테고리'), iProj=hi('프로젝트'), iOwn=hi('오너(정)'), iSub=hi('부오너(부)');
        const iPSD=hi('프로젝트 시작일'), iPED=hi('프로젝트 종료일'), iPProg=hi('프로젝트 진행률'), iPDesc=hi('프로젝트 설명');
        const iTask=hi('Task'), iTDesc=hi('Task 설명'), iAss=hi('담당자(정)'), iSAss=hi('부담당자(부)');
        const iTSD=hi('Task 시작일'), iTED=hi('Task 종료일'), iTProg=hi('Task 진행률');
        if (iProj === -1) { setUploadError('헤더 형식이 맞지 않습니다. Excel 다운로드 양식을 사용해주세요.'); return; }
        const projMap: Record<string, any> = {};
        const projOrder: string[] = [];
        for (let i = 1; i < rows.length; i++) {
          const r = rows[i];
          const projName = String(r[iProj]||'').trim();
          if (!projName) continue;
          const key = `${String(r[iGrp]||'미분류').trim()}__${projName}`;
          if (!projMap[key]) {
            projOrder.push(key);
            projMap[key] = {
              id: Date.now() + Math.random(),
              name: projName,
              group: String(r[iGrp]||'미분류').trim(),
              category: String(r[iCat]||'').trim(),
              owner: String(r[iOwn]||'').trim(),
              subOwner: String(r[iSub]||'').trim(),
              startDate: String(r[iPSD]||'').trim(),
              endDate: String(r[iPED]||'').trim(),
              progress: parseInt(String(r[iPProg]||'0').replace('%',''))||0,
              description: String(r[iPDesc]||'').trim(),
              color: 'blue', expanded: true, tasks: [],
            };
          }
          const taskName = String(r[iTask]||'').trim();
          if (taskName) {
            projMap[key].tasks.push({
              id: Date.now() + Math.random(),
              name: taskName,
              description: String(r[iTDesc]||'').trim(),
              assignee: String(r[iAss]||'').trim(),
              subAssignee: String(r[iSAss]||'').trim(),
              startDate: String(r[iTSD]||'').trim(),
              endDate: String(r[iTED]||'').trim(),
              progress: parseInt(String(r[iTProg]||'0').replace('%',''))||0,
              category: String(r[iCat]||'').trim(),
              dependencies: [],
            });
          }
        }
        const parsed = projOrder.map(k => projMap[k]);
        if (parsed.length === 0) { setUploadError('파싱된 프로젝트가 없습니다.'); return; }
        setUploadPreview(parsed);
      } catch(err) {
        setUploadError('파일 파싱 중 오류가 발생했습니다.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const confirmImport = () => {
    if (!uploadPreview) return;
    save([...projects, ...uploadPreview]);
    setUploadPreview(null);
  };

  const today = new Date();
  const todayLeft = today>=V_START && today<=V_END ? Math.round((today.getTime()-V_START.getTime())/86400000/V_TOTAL_DAYS*TIMELINE_W) : null;
  const modalW = Math.min(500, Math.max(320, window.innerWidth * 0.9));
  const inp = (extra={}) => ({width:'100%',border:'1px solid #d1d5db',borderRadius:8,padding:'8px 12px',fontSize:14,boxSizing:'border-box' as const,...extra});

  const descLineStyle: React.CSSProperties = {
    fontSize: 12,
    color: '#6b7280',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    whiteSpace: 'normal',
    marginTop: 2,
    lineHeight: '14px',
    cursor: 'default',
  };

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
            <div><label style={{display:'block',fontSize:14,fontWeight:500,marginBottom:4}}>프로젝트 이름</label><input value={fd.name} onChange={e=>setFd({...fd,name:e.target.value})} style={inp()} /></div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <div><label style={{display:'block',fontSize:14,fontWeight:500,marginBottom:4}}>오너 (정)</label><input value={fd.owner||''} onChange={e=>setFd({...fd,owner:e.target.value})} style={inp()} /></div>
              <div><label style={{display:'block',fontSize:14,fontWeight:500,marginBottom:4}}>오너 (부)</label><input value={fd.subOwner||''} onChange={e=>setFd({...fd,subOwner:e.target.value})} style={inp()} /></div>
            </div>
            <div>
              <label style={{display:'block',fontSize:14,fontWeight:500,marginBottom:8}}>그룹</label>
              <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:8}}>
                {allGroups.filter(g=>g!=='미분류').map(g=>(
                  <button key={g} type="button" onClick={()=>setFd({...fd,group:g})}
                    style={{padding:'6px 14px',borderRadius:20,fontSize:13,cursor:'pointer',fontWeight:fd.group===g?600:400,border:fd.group===g?'2px solid #6366f1':'2px solid #e5e7eb',background:fd.group===g?'#eef2ff':'white',color:fd.group===g?'#4338ca':'#6b7280'}}>{g}</button>
                ))}
                <button type="button" onClick={()=>setFd({...fd,group:''})}
                  style={{padding:'6px 14px',borderRadius:20,fontSize:13,cursor:'pointer',fontWeight:fd.group===''||fd.group==='미분류'?600:400,border:fd.group===''||fd.group==='미분류'?'2px solid #9ca3af':'2px solid #e5e7eb',background:fd.group===''||fd.group==='미분류'?'#f3f4f6':'white',color:'#6b7280'}}>미분류</button>
              </div>
              <input value={(!allGroups.filter(g=>g!=='미분류').includes(fd.group) && fd.group && fd.group!=='미분류') ? fd.group : ''} onChange={e=>setFd({...fd,group:e.target.value})} placeholder="+ 새 그룹 직접 입력" style={{...inp(),fontSize:13}} />
            </div>
            <div>
              <label style={{display:'block',fontSize:14,fontWeight:500,marginBottom:8}}>카테고리</label>
              <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                {CATEGORIES.map(cat=>{ const cc=CATEGORY_COLORS[cat]; return <button key={cat} onClick={()=>setFd({...fd,category:cat})} style={{padding:'6px 16px',borderRadius:20,border:`2px solid ${fd.category===cat?cc.border:'#e5e7eb'}`,background:fd.category===cat?cc.bg:'white',color:fd.category===cat?cc.text:'#6b7280',cursor:'pointer',fontSize:13,fontWeight:fd.category===cat?600:400}}>{cat}</button>; })}
              </div>
            </div>
            <div>
              <label style={{display:'block',fontSize:14,fontWeight:500,marginBottom:4}}>프로젝트 기간</label>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div><label style={{display:'block',fontSize:12,color:'#6b7280',marginBottom:4}}>시작일</label><input type="date" value={fd.startDate||''} onChange={e=>setFd({...fd,startDate:e.target.value})} style={inp()} /></div>
                <div><label style={{display:'block',fontSize:12,color:'#6b7280',marginBottom:4}}>종료일</label><input type="date" value={fd.endDate||''} onChange={e=>setFd({...fd,endDate:e.target.value})} style={inp()} /></div>
              </div>
            </div>
            <div>
              <label style={{display:'block',fontSize:14,fontWeight:500,marginBottom:4}}>진행률 <span style={{color:'#3b82f6',fontWeight:'bold',marginLeft:8}}>{fd.progress||0}%</span></label>
              <input type="range" min="0" max="100" value={fd.progress||0} onChange={e=>setFd({...fd,progress:Number(e.target.value)})} style={{width:'100%'}} />
            </div>
            <div><label style={{display:'block',fontSize:14,fontWeight:500,marginBottom:4}}>설명</label><textarea value={fd.description||''} onChange={e=>setFd({...fd,description:e.target.value})} style={{...inp(),height:80,resize:'vertical'} as any} /></div>
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
    return (
      <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:50,padding:16}}>
        <div style={{background:'white',borderRadius:12,padding:24,width:modalW,maxHeight:'90vh',overflowY:'auto',boxShadow:'0 20px 60px rgba(0,0,0,0.3)'}} onClick={e=>e.stopPropagation()}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
            <h3 style={{fontSize:18,fontWeight:'bold',margin:0}}>Task 편집</h3>
            <button onClick={onClose} style={{border:'none',background:'none',cursor:'pointer',fontSize:20,color:'#9ca3af'}}>✕</button>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:16}}>
            <div><label style={{display:'block',fontSize:14,fontWeight:500,marginBottom:4}}>Task 이름</label><input value={fd.name} onChange={e=>setFd({...fd,name:e.target.value})} style={inp()} /></div>
            <div>
              <label style={{display:'block',fontSize:14,fontWeight:500,marginBottom:8}}>카테고리</label>
              <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                <button onClick={()=>setFd({...fd,category:''})} style={{padding:'6px 14px',borderRadius:20,border:`2px solid ${!fd.category?'#6b7280':'#e5e7eb'}`,background:!fd.category?'#f3f4f6':'white',color:!fd.category?'#374151':'#9ca3af',cursor:'pointer',fontSize:13,fontWeight:!fd.category?600:400}}>없음</button>
                {CATEGORIES.map(cat=>{ const cc=CATEGORY_COLORS[cat]; return <button key={cat} onClick={()=>setFd({...fd,category:cat})} style={{padding:'6px 14px',borderRadius:20,border:`2px solid ${fd.category===cat?cc.border:'#e5e7eb'}`,background:fd.category===cat?cc.bg:'white',color:fd.category===cat?cc.text:'#6b7280',cursor:'pointer',fontSize:13,fontWeight:fd.category===cat?600:400}}>{cat}</button>; })}
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <div><label style={{display:'block',fontSize:14,fontWeight:500,marginBottom:4}}>담당자 (정)</label><input value={fd.assignee||''} onChange={e=>setFd({...fd,assignee:e.target.value})} style={inp()} /></div>
              <div><label style={{display:'block',fontSize:14,fontWeight:500,marginBottom:4}}>담당자 (부)</label><input value={fd.subAssignee||''} onChange={e=>setFd({...fd,subAssignee:e.target.value})} style={inp()} /></div>
            </div>
            <div><label style={{display:'block',fontSize:14,fontWeight:500,marginBottom:4}}>설명</label><textarea value={fd.description||''} onChange={e=>setFd({...fd,description:e.target.value})} style={{...inp(),height:80,resize:'vertical'} as any} /></div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
              <div><label style={{display:'block',fontSize:14,fontWeight:500,marginBottom:4}}>시작일</label><input type="date" value={fd.startDate} onChange={e=>setFd({...fd,startDate:e.target.value})} style={inp()} /></div>
              <div><label style={{display:'block',fontSize:14,fontWeight:500,marginBottom:4}}>종료일</label><input type="date" value={fd.endDate} onChange={e=>setFd({...fd,endDate:e.target.value})} style={inp()} /></div>
            </div>
            <div><label style={{display:'block',fontSize:14,fontWeight:500,marginBottom:4}}>진행률: <span style={{color:'#3b82f6',fontWeight:'bold'}}>{fd.progress}%</span></label><input type="range" min="0" max="100" value={fd.progress} onChange={e=>setFd({...fd,progress:Number(e.target.value)})} style={{width:'100%'}} /></div>
          </div>
          <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:24}}>
            <button onClick={onClose} style={{padding:'8px 16px',border:'1px solid #d1d5db',borderRadius:8,background:'white',cursor:'pointer',fontSize:14}}>취소</button>
            <button onClick={()=>{updateTask(pid,task.id,fd);onClose();}} style={{padding:'8px 16px',border:'none',borderRadius:8,background:'#3b82f6',color:'white',cursor:'pointer',fontSize:14,fontWeight:500}}>저장</button>
          </div>
        </div>
      </div>
    );
  };

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
        const { error: signInErr } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPw });
        if (signInErr) { setPwError('현재 비밀번호가 올바르지 않습니다.'); setPwLoading(false); return; }
        const { error: updateErr } = await supabase.auth.updateUser({ password: newPw });
        if (updateErr) setPwError('비밀번호 변경 중 오류가 발생했습니다.');
        else { setPwSuccess(true); setTimeout(() => setShowChangePw(false), 1500); }
      } catch { setPwError('오류가 발생했습니다.'); }
      finally { setPwLoading(false); }
    };
    const inp2 = () => ({width:'100%',border:'1px solid #d1d5db',borderRadius:8,padding:'9px 12px',fontSize:14,boxSizing:'border-box' as const,outline:'none'});
    return (
      <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:50,padding:16}} onClick={()=>setShowChangePw(false)}>
        <div style={{background:'white',borderRadius:14,padding:28,width:Math.min(400,window.innerWidth*0.95),boxShadow:'0 20px 60px rgba(0,0,0,0.3)'}} onClick={e=>e.stopPropagation()}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
            <div><h3 style={{margin:0,fontSize:17,fontWeight:'bold'}}>🔑 비밀번호 변경</h3><p style={{margin:'4px 0 0',fontSize:12,color:'#9ca3af'}}>{user.email}</p></div>
            <button onClick={()=>setShowChangePw(false)} style={{border:'none',background:'none',cursor:'pointer',fontSize:20,color:'#9ca3af'}}>✕</button>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            <div><label style={{display:'block',fontSize:13,fontWeight:500,marginBottom:5,color:'#374151'}}>현재 비밀번호</label><input type="password" value={currentPw} onChange={e=>setCurrentPw(e.target.value)} placeholder="현재 비밀번호" style={inp2()} /></div>
            <div><label style={{display:'block',fontSize:13,fontWeight:500,marginBottom:5,color:'#374151'}}>새 비밀번호</label><input type="password" value={newPw} onChange={e=>setNewPw(e.target.value)} placeholder="새 비밀번호" style={inp2()} /></div>
            <div><label style={{display:'block',fontSize:13,fontWeight:500,marginBottom:5,color:'#374151'}}>새 비밀번호 확인</label><input type="password" value={confirmPw} onChange={e=>setConfirmPw(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleChange()} placeholder="새 비밀번호 재입력" style={inp2()} /></div>
            {pwError && <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:8,padding:'10px 14px',fontSize:13,color:'#dc2626'}}>⚠️ {pwError}</div>}
            {pwSuccess && <div style={{background:'#f0fdf4',border:'1px solid #bbf7d0',borderRadius:8,padding:'10px 14px',fontSize:13,color:'#16a34a'}}>✅ 비밀번호가 변경되었습니다!</div>}
          </div>
          <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:22}}>
            <button onClick={()=>setShowChangePw(false)} style={{padding:'8px 16px',border:'1px solid #d1d5db',borderRadius:8,background:'white',cursor:'pointer',fontSize:14}}>취소</button>
            <button onClick={handleChange} disabled={pwLoading} style={{padding:'8px 20px',border:'none',borderRadius:8,background:pwLoading?'#93c5fd':'#3b82f6',color:'white',cursor:pwLoading?'not-allowed':'pointer',fontSize:14,fontWeight:500}}>{pwLoading ? '변경 중...' : '변경하기'}</button>
          </div>
        </div>
      </div>
    );
  };

  const HistoryModal = () => (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:50,padding:16}} onClick={()=>setShowHistory(false)}>
      <div style={{background:'white',borderRadius:12,padding:24,width:Math.min(480, window.innerWidth*0.95),maxHeight:'75vh',display:'flex',flexDirection:'column',boxShadow:'0 20px 60px rgba(0,0,0,0.3)'}} onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16,flexShrink:0}}>
          <div>
            <h3 style={{margin:0,fontSize:18,fontWeight:'bold'}}>🕐 저장 히스토리</h3>
            <p style={{margin:'4px 0 0',fontSize:12,color:'#9ca3af'}}>
              {APP_CONFIG[appId].csvPrefix} · 최근 50개 스냅샷
            </p>
          </div>
          <button onClick={()=>setShowHistory(false)} style={{border:'none',background:'none',cursor:'pointer',fontSize:20,color:'#9ca3af',flexShrink:0}}>✕</button>
        </div>
        <div style={{overflowY:'auto',flex:1}}>
          {historyLoading ? (
            <div style={{display:'flex',alignItems:'center',justifyContent:'center',padding:'48px 0',gap:10,color:'#6b7280'}}>
              <div style={{width:20,height:20,border:'3px solid #a78bfa',borderTopColor:'transparent',borderRadius:'50%',animation:'spin 0.8s linear infinite'}} /><span style={{fontSize:14}}>불러오는 중...</span>
            </div>
          ) : history.length === 0 ? (
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'48px 0',color:'#9ca3af',gap:8}}>
              <span style={{fontSize:32}}>📭</span><span style={{fontSize:14}}>저장 히스토리가 없습니다.</span>
            </div>
          ) : history.map((h, i) => (
            <div key={h.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 14px',borderRadius:10,marginBottom:6,background:i===0?'#f5f3ff':'#f9fafb',border:`1px solid ${i===0?'#c4b5fd':'#e5e7eb'}`}}>
              <div style={{minWidth:0,flex:1}}>
                <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                  <span style={{fontSize:13,fontWeight:600,color:'#1f2937'}}>{new Date(h.saved_at).toLocaleString('ko-KR',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'})}</span>
                  {i===0 && <span style={{fontSize:11,color:'#7c3aed',background:'#ede9fe',padding:'1px 8px',borderRadius:10,fontWeight:600}}>최신</span>}
                </div>
                {h.memo && <div style={{fontSize:12,color:'#6b7280',marginTop:3}}>📝 {h.memo}</div>}
              </div>
              <button onClick={()=>restoreHistory(h.id)} disabled={restoring} style={{padding:'6px 14px',background:restoring?'#e5e7eb':'#7c3aed',color:restoring?'#9ca3af':'white',border:'none',borderRadius:7,cursor:restoring?'not-allowed':'pointer',fontSize:12,fontWeight:600,flexShrink:0,marginLeft:12}}>{restoring ? '복원 중...' : '복원'}</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100dvh',flexDirection:'column',gap:12,color:'#6b7280'}}>
      <div style={{width:32,height:32,border:'4px solid #93c5fd',borderTopColor:'transparent',borderRadius:'50%',animation:'spin 0.8s linear infinite'}} />
      <p style={{fontSize:14,margin:0}}>Supabase에서 불러오는 중...</p>
      <style>{`@import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css'); @keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const totalW = LEFT_COL + ASSIGNEE_COL + SUB_COL + TIMELINE_W;

  // ────────────────────────────────────────────────────────────
  // 모바일 / 태블릿 세로 → 카드형 뷰
  // ────────────────────────────────────────────────────────────
  if (!showGantt) {
    const getMiniPos = (s: string, e: string) => {
      if (!s || !e) return null;
      const sd = parseDate(s), ed = parseDate(e);
      if (isNaN(sd.getTime()) || isNaN(ed.getTime())) return null;
      const total = V_END.getTime() - V_START.getTime();
      const left  = Math.max(0, Math.min(100, (sd.getTime() - V_START.getTime()) / total * 100));
      const right = Math.max(0, Math.min(100, (ed.getTime() - V_START.getTime()) / total * 100));
      return { left, width: Math.max(2, right - left) };
    };
    const todayPct = (() => {
      const t = new Date();
      if (t < V_START || t > V_END) return null;
      return (t.getTime() - V_START.getTime()) / (V_END.getTime() - V_START.getTime()) * 100;
    })();

    const isTabletPortrait = deviceType === 'tablet' && isPortrait;

    return (
      <div style={{height:'100dvh',width:'100%',maxWidth:'100vw',display:'flex',flexDirection:'column',background:'#0f0f1a',fontFamily:"'Pretendard',-apple-system,BlinkMacSystemFont,sans-serif",overflow:'hidden',boxSizing:'border-box'}}>

        <style>{`
          @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');
          @keyframes spin{to{transform:rotate(360deg)}}
          @keyframes fadeInDown{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}
          *, *::before, *::after { box-sizing: border-box; font-family:'Pretendard',-apple-system,BlinkMacSystemFont,sans-serif; }
          html, body { overflow-x: hidden; max-width: 100vw; }
          .ms::-webkit-scrollbar{display:none} .ms{scrollbar-width:none}
          .ghdr:active{opacity:0.75} .btask:active{opacity:0.7}
          .hdr-collapsible{ overflow:hidden; transition:max-height 0.3s cubic-bezier(0.4,0,0.2,1), opacity 0.25s ease; }
        `}</style>

        {/* 헤더 */}
        <div style={{
          background:'linear-gradient(135deg,#0f0f1a,#1a1a2e,#16213e)',
          borderBottom:'1px solid rgba(255,255,255,0.08)',
          flexShrink:0,
          boxShadow:'0 2px 16px rgba(0,0,0,0.4)',
          paddingTop: (!isPortrait && headerCollapsed) ? 6 : 10,
          paddingBottom: (!isPortrait && headerCollapsed) ? 6 : 10,
          paddingLeft: 'max(14px, env(safe-area-inset-left))',
          paddingRight: 'max(14px, env(safe-area-inset-right))',
          transition:'padding 0.28s ease',
        }}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:(!isPortrait&&headerCollapsed)?0:8,transition:'margin-bottom 0.28s ease'}}>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <div style={{display:'flex',background:'rgba(255,255,255,0.07)',borderRadius:9,padding:3,border:'1px solid rgba(255,255,255,0.1)',gap:2}}>
                {([2,1] as const).map(id=>(
                  <button key={id} onClick={()=>onAppChange(id)}
                    style={{padding:'5px 12px',borderRadius:7,border:'none',cursor:'pointer',fontSize:12,fontWeight:appId===id?700:400,
                      background:appId===id?'linear-gradient(135deg,#6366f1,#8b5cf6)':'transparent',
                      color:appId===id?'#fff':'rgba(148,163,184,0.7)',fontFamily:'inherit',
                      boxShadow:appId===id?'0 2px 8px rgba(99,102,241,0.4)':'none',transition:'all 0.2s'}}>
                    {id===2?'샌디앱':'버스'}
                  </button>
                ))}
              </div>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:6}}>
              {saving && <div style={{display:'flex',alignItems:'center',gap:4,fontSize:10,color:'#4ade80'}}><div style={{width:8,height:8,border:'2px solid #4ade80',borderTopColor:'transparent',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>저장중</div>}
              {realtimeToast && <span style={{fontSize:10,color:'#4ade80',background:'rgba(74,222,128,0.12)',padding:'2px 7px',borderRadius:8,border:'1px solid rgba(74,222,128,0.25)',fontWeight:600,animation:'fadeInDown 0.3s ease'}}>🔄 업데이트</span>}
              <button onClick={expandAll} style={{padding:'5px 8px',background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.15)',borderRadius:7,cursor:'pointer',fontSize:10,color:'#a5b4fc',fontFamily:'inherit',fontWeight:600}}>전체펴기</button>
              <button onClick={collapseAll} style={{padding:'5px 8px',background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.15)',borderRadius:7,cursor:'pointer',fontSize:10,color:'#a5b4fc',fontFamily:'inherit',fontWeight:600}}>전체접기</button>
              <button onClick={onLogout} style={{padding:'5px 10px',background:'rgba(239,68,68,0.15)',border:'1px solid rgba(239,68,68,0.25)',borderRadius:7,cursor:'pointer',fontSize:11,color:'#fca5a5',fontFamily:'inherit'}}>로그아웃</button>
            </div>
          </div>

          <div className="hdr-collapsible" style={{maxHeight:(!isPortrait&&headerCollapsed)?'0px':'50px',opacity:(!isPortrait&&headerCollapsed)?0:1}}>
            <div className="ms" style={{display:'flex',gap:5,overflowX:'auto',paddingBottom:2,alignItems:'center'}}>
              <button onClick={()=>setActiveCategories([])}
                style={{padding:'4px 12px',borderRadius:20,fontSize:11,cursor:'pointer',fontWeight:activeCategories.length===0?600:400,border:activeCategories.length===0?'1.5px solid #818cf8':'1.5px solid rgba(255,255,255,0.2)',background:activeCategories.length===0?'rgba(99,102,241,0.35)':'rgba(255,255,255,0.07)',color:activeCategories.length===0?'#fff':'#e2e8f0',whiteSpace:'nowrap',flexShrink:0,fontFamily:'inherit'}}>
                전체 {projects.length}
              </button>
              {CATEGORIES.map(cat=>{ const isActive=activeCategories.includes(cat); const cc=CATEGORY_COLORS[cat]; return (
                <button key={cat} onClick={()=>setActiveCategories(prev=>prev.includes(cat)?prev.filter(c=>c!==cat):[...prev,cat])}
                  style={{padding:'4px 12px',borderRadius:20,fontSize:11,cursor:'pointer',fontWeight:isActive?600:400,border:isActive?`1.5px solid ${cc.border}`:'1.5px solid rgba(255,255,255,0.2)',background:isActive?`${cc.bg}22`:'rgba(255,255,255,0.07)',color:isActive?cc.border:'#e2e8f0',whiteSpace:'nowrap',flexShrink:0,fontFamily:'inherit',display:'flex',alignItems:'center',gap:4}}>
                  <span style={{width:7,height:7,borderRadius:'50%',background:cc.border,flexShrink:0,display:'inline-block'}}/>
                  {cat}
                </button>
              ); })}
              <div style={{width:1,height:14,background:'rgba(255,255,255,0.2)',flexShrink:0}}/>
            </div>
          </div>
        </div>

        {/* 스크롤 영역 */}
        <div ref={mobileScrollRef} className="ms" style={{
          flex:1, overflowY:'auto', overflowX:'hidden',
          paddingTop: 10,
          paddingBottom: 90,
          paddingLeft: isTabletPortrait ? 'max(20px, env(safe-area-inset-left))' : 'max(12px, env(safe-area-inset-left))',
          paddingRight: isTabletPortrait ? 'max(20px, env(safe-area-inset-right))' : 'max(12px, env(safe-area-inset-right))',
        }}>
          {groupedFiltered.length===0 ? (
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'80px 0',color:'#475569',gap:10}}>
              <span style={{fontSize:32}}>📋</span>
              <span style={{fontSize:14}}>프로젝트가 없습니다</span>
              <button onClick={addProject} style={{color:'#6366f1',background:'none',border:'1px solid rgba(99,102,241,0.3)',borderRadius:20,padding:'6px 16px',cursor:'pointer',fontSize:13,fontFamily:'inherit'}}>+ 프로젝트 추가</button>
            </div>
          ) : groupedFiltered.map(group=>(
            <div key={group.name} style={{marginBottom:14}}>
              <div className="ghdr" onClick={()=>toggleGroup(group.name)}
                style={{display:'flex',alignItems:'center',gap:7,padding:'7px 10px',background:'rgba(99,102,241,0.1)',borderRadius:10,marginBottom:8,borderLeft:'3px solid #6366f1',cursor:'pointer',userSelect:'none'}}>
                <span style={{fontSize:13}}>📁</span>
                <span style={{fontSize:13,fontWeight:800,color:'#e2e8f0',flex:1}}>{group.name}</span>
                <span style={{fontSize:11,color:'#6366f1',background:'rgba(99,102,241,0.15)',padding:'1px 7px',borderRadius:10,fontWeight:600}}>{group.items.length}개</span>
                <span style={{fontSize:11,color:'#6366f1',transition:'transform 0.2s',display:'inline-block',transform:collapsedGroups.has(group.name)?'rotate(0deg)':'rotate(90deg)'}}>▶</span>
              </div>

              {!collapsedGroups.has(group.name) && group.items.map((proj:any)=>{
                const c=COLOR_MAP[proj.color]||COLOR_MAP.blue;
                const catColor=CATEGORY_COLORS[proj.category];
                const {progress:projProg,startDate:projStart,endDate:projEnd}=getProjectMeta(proj);
                const projMiniPos=getMiniPos(projStart,projEnd);
                return (
                  <div key={proj.id} style={{background:'rgba(255,255,255,0.03)',border:`1px solid ${catColor?catColor.border+'33':c.border+'33'}`,borderRadius:12,marginBottom:8,overflow:'hidden'}}>
                    <div style={{padding:'10px 12px 8px'}}>
                      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:8,marginBottom:6}}>
                        <div style={{display:'flex',alignItems:'center',gap:6,flex:1,flexWrap:'wrap'}}>
                          {catColor && <span style={{fontSize:11,fontWeight:700,padding:'2px 7px',borderRadius:8,background:catColor.bg,color:catColor.text,border:`1px solid ${catColor.border}`,flexShrink:0}}>{proj.category}</span>}
                          <span style={{fontSize:13,fontWeight:700,color:'#f1f5f9',lineHeight:1.3}}>{proj.name}</span>
                        </div>
                        <div style={{display:'flex',alignItems:'center',gap:4,flexShrink:0}}>
                          <span style={{fontSize:11,fontWeight:700,padding:'2px 8px',borderRadius:10,background:catColor?`${catColor.bg}33`:'rgba(59,130,246,0.15)',color:catColor?catColor.border:'#60a5fa'}}>{projProg}%</span>
                          <button onClick={()=>setEditingProject(proj)} style={{padding:4,background:'none',border:'none',cursor:'pointer',fontSize:14,lineHeight:1}}>✏️</button>
                          <button onClick={()=>deleteProject(proj.id)} style={{padding:4,background:'none',border:'none',cursor:'pointer',fontSize:14,lineHeight:1}}>🗑️</button>
                        </div>
                      </div>
                      {(proj.owner||proj.subOwner||projStart) && (
                        <div style={{fontSize:11,color:'#94a3b8',marginBottom:6,display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                          {(proj.owner||proj.subOwner) && <span>👤 {[proj.owner,proj.subOwner].filter(Boolean).join(' · ')}</span>}
                          {projStart && <span>📅 {projStart} → {projEnd}</span>}
                        </div>
                      )}
                      {projMiniPos && (
                        <div style={{position:'relative',marginBottom:2}}>
                          <div style={{height:5,background:'rgba(255,255,255,0.05)',borderRadius:3,position:'relative',overflow:'visible'}}>
                            <div style={{position:'absolute',top:0,left:`${projMiniPos.left}%`,width:`${projMiniPos.width}%`,height:'100%',background:catColor?`${catColor.border}33`:c.barLight,borderRadius:3}}/>
                            <div style={{position:'absolute',top:0,left:`${projMiniPos.left}%`,width:`${projMiniPos.width*(projProg/100)}%`,height:'100%',background:catColor?catColor.border:c.bar,borderRadius:3,opacity:0.9}}/>
                            {todayPct!==null&&<div style={{position:'absolute',left:`${todayPct}%`,top:-3,width:2,height:11,background:'#ef4444',borderRadius:1,zIndex:2}}/>}
                          </div>
                          <div style={{display:'flex',justifyContent:'space-between',marginTop:3,fontSize:9,color:'#475569'}}>
                            <span>1월</span><span>4월</span><span>7월</span><span>10월</span><span>12월</span>
                          </div>
                        </div>
                      )}
                      {proj.description&&<div style={{fontSize:12,color:'#64748b',marginTop:4,lineHeight:1.4}}>{proj.description}</div>}
                    </div>

                    {proj.expanded && proj.tasks.length>0 && (
                      <div style={{borderTop:'1px solid rgba(255,255,255,0.05)',padding:'6px 12px 6px'}}>
                        {proj.tasks.map((task:any)=>{
                          const tc=CATEGORY_COLORS[task.category];
                          const tp=getMiniPos(task.startDate,task.endDate);
                          return (
                            <div key={task.id} style={{padding:'6px 8px',borderRadius:8,marginBottom:4,background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.04)'}}>
                              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:6,marginBottom:tp?3:0}}>
                                <div style={{display:'flex',alignItems:'center',gap:5,flex:1,minWidth:0}}>
                                  <span style={{color:'rgba(167,139,250,0.5)',fontSize:11,flexShrink:0}}>└</span>
                                  {task.category&&tc&&<span style={{fontSize:10,fontWeight:700,padding:'1px 5px',borderRadius:6,background:tc.bg,color:tc.text,border:`1px solid ${tc.border}`,flexShrink:0}}>{task.category}</span>}
                                  <span style={{fontSize:12,color:'#e2e8f0',fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{task.name}</span>
                                </div>
                                <div style={{display:'flex',alignItems:'center',gap:3,flexShrink:0}}>
                                  <span style={{fontSize:10,color:'#475569',whiteSpace:'nowrap'}}>{task.startDate?.slice(5)} → {task.endDate?.slice(5)}</span>
                                  <button onClick={()=>setEditingTask({task,pid:proj.id})} style={{padding:2,background:'none',border:'none',cursor:'pointer',fontSize:12,lineHeight:1}}>✏️</button>
                                  <button onClick={()=>deleteTask(proj.id,task.id)} style={{padding:2,background:'none',border:'none',cursor:'pointer',fontSize:12,lineHeight:1}}>🗑️</button>
                                </div>
                              </div>
                              {tp&&(<div style={{height:3,background:'rgba(255,255,255,0.04)',borderRadius:2,position:'relative',overflow:'hidden'}}>
                                <div style={{position:'absolute',top:0,left:`${tp.left}%`,width:`${tp.width}%`,height:'100%',background:tc?tc.bg:'rgba(255,255,255,0.08)'}}/>
                                <div style={{position:'absolute',top:0,left:`${tp.left}%`,width:`${tp.width*(task.progress||0)/100}%`,height:'100%',background:tc?tc.border:c.bar,opacity:0.85}}/>
                              </div>)}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {!proj.expanded && proj.tasks.length>0 && (
                      <div style={{padding:'2px 12px 0',borderTop:'1px solid rgba(255,255,255,0.04)'}} />
                    )}
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'6px 12px 9px',borderTop:'1px solid rgba(255,255,255,0.05)'}}>
                      <button onClick={()=>toggleProject(proj.id)} style={{fontSize:11,color:'#6366f1',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',gap:3}}>
                        {proj.expanded ? '▲ 접기' : `▼ 펼치기${proj.tasks.length>0?` (Task ${proj.tasks.length}개)`:''}`}
                      </button>
                      <button className="btask" onClick={()=>{if(!proj.expanded)toggleProject(proj.id);addTask(proj.id);}}
                        style={{display:'flex',alignItems:'center',gap:5,padding:'5px 14px',background:'rgba(99,102,241,0.1)',border:'1px solid rgba(99,102,241,0.4)',borderRadius:20,fontSize:12,fontWeight:600,color:'#818cf8',cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap'}}>
                        ＋ Task 추가
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* FAB */}
        <button onClick={addProject} style={{
          position:'fixed',
          bottom:'max(24px, calc(env(safe-area-inset-bottom) + 16px))',
          right:'max(18px, env(safe-area-inset-right))',
          width:52,height:52,
          background:'linear-gradient(135deg,#6366f1,#8b5cf6)',border:'none',borderRadius:'50%',
          display:'flex',alignItems:'center',justifyContent:'center',
          fontSize:26,color:'white',cursor:'pointer',
          boxShadow:'0 4px 20px rgba(99,102,241,0.55)',zIndex:30,
        }}>+</button>

        {editingProject && <ProjectEditModal proj={editingProject} onClose={()=>setEditingProject(null)} />}
        {editingTask && <TaskEditModal task={editingTask.task} pid={editingTask.pid} onClose={()=>setEditingTask(null)} />}
        {showChangePw && <ChangePwModal />}
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────
  // 데스크탑 / 태블릿 가로 → 간트차트 뷰
  // ────────────────────────────────────────────────────────────

  const getDayHeaderStyle = (h: typeof DAY_HEADERS[0]) => {
    if (h.isHoliday || h.isSunday) return { color:'#ef4444', fontWeight: 500, bg:'#fff5f5' };
    if (h.isSaturday) return { color:'#2563eb', fontWeight: 400, bg:'#eff6ff' };
    if (h.isFirst)    return { color:'#1d4ed8', fontWeight: 600, bg:'#eff6ff' };
    return { color:'#6b7280', fontWeight: 400, bg:'#f9fafb' };
  };

  return (
    <div style={{height:'100dvh',width:'100%',background:'#eef0f5',display:'flex',flexDirection:'column',overflow:'hidden',fontFamily:"'Pretendard',-apple-system,BlinkMacSystemFont,sans-serif"}}>
      <style>{`
        @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeInDown{from{opacity:0;transform:translateY(-10px)}to{opacity:1;transform:translateY(0)}}
        *{box-sizing:border-box; font-family:'Pretendard',-apple-system,BlinkMacSystemFont,sans-serif;}
        .day-holiday-cell:hover .holiday-tooltip { opacity: 1 !important; }
        .day-holiday-cell { overflow: visible !important; }
      `}</style>

      {/* Header */}
      <div ref={headerRef} style={{background:'linear-gradient(135deg,#0f0f1a 0%,#1a1a2e 60%,#16213e 100%)',borderBottom:'1px solid rgba(255,255,255,0.08)',padding:isCompactUI?'6px 16px':'16px 24px',flexShrink:0,boxShadow:'0 2px 16px rgba(0,0,0,0.4)',position:'sticky',top:0,zIndex:30}}>
        {isCompactUI ? (
          <>
            <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:5}}>
              <div style={{display:'flex',background:'rgba(255,255,255,0.07)',borderRadius:8,padding:3,border:'1px solid rgba(255,255,255,0.1)',gap:1}}>
                {([2,1] as const).map(id=>(
                  <button key={id} onClick={()=>onAppChange(id)} style={{padding:'4px 12px',borderRadius:6,border:'none',cursor:'pointer',fontSize:12,fontWeight:appId===id?700:400,
                    background:appId===id?'linear-gradient(135deg,#6366f1,#8b5cf6)':'transparent',
                    color:appId===id?'#fff':'rgba(148,163,184,0.7)'}}>
                    {id===2?'샌디앱':'통근버스'}
                  </button>
                ))}
              </div>
              <div style={{width:1,height:18,background:'rgba(255,255,255,0.15)'}}/>
              <div style={{display:'flex',background:'rgba(255,255,255,0.07)',borderRadius:8,padding:3,border:'1px solid rgba(255,255,255,0.12)',gap:1}}>
                {([['year','월'],['half','월↔'],['week','주'],['day','일']] as const).map(([mode,label])=>(
                  <button key={mode} onClick={()=>{const el=chartScrollRef.current;if(el){const r=el.scrollLeft/(el.scrollWidth-el.clientWidth||1);setViewMode(mode as ViewMode);requestAnimationFrame(()=>requestAnimationFrame(()=>{if(chartScrollRef.current)chartScrollRef.current.scrollLeft=r*(chartScrollRef.current.scrollWidth-chartScrollRef.current.clientWidth);}));}else setViewMode(mode as ViewMode);}}
                    style={{padding:'4px 10px',borderRadius:6,border:'none',cursor:'pointer',fontSize:12,fontWeight:viewMode===mode?700:400,
                      background:viewMode===mode?'rgba(99,102,241,0.9)':'transparent',
                      color:viewMode===mode?'white':'rgba(148,163,184,0.8)'}}>
                    {label}
                  </button>
                ))}
              </div>
              <div style={{flex:1}}/>
              {saving && <div style={{display:'flex',alignItems:'center',gap:4,fontSize:11,color:'#4ade80'}}><div style={{width:8,height:8,border:'2px solid #4ade80',borderTopColor:'transparent',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>저장중</div>}
              {realtimeToast && <span style={{fontSize:11,color:'#4ade80',fontWeight:600,animation:'fadeInDown 0.3s ease'}}>🔄 업데이트</span>}
              <button onClick={addProject} style={{padding:'4px 12px',background:'linear-gradient(135deg,#6366f1,#8b5cf6)',color:'white',border:'none',borderRadius:7,cursor:'pointer',fontSize:12,fontWeight:600}}>+ 추가</button>
              <button onClick={onLogout} style={{padding:'4px 10px',background:'rgba(239,68,68,0.15)',border:'1px solid rgba(239,68,68,0.25)',borderRadius:7,cursor:'pointer',fontSize:11,color:'#fca5a5'}}>로그아웃</button>
            </div>
            <div style={{display:'flex',gap:4,alignItems:'center',flexWrap:'wrap'}}>
              <button onClick={()=>setActiveCategories([])} style={{padding:'3px 10px',borderRadius:14,fontSize:11,cursor:'pointer',fontWeight:activeCategories.length===0?600:400,border:activeCategories.length===0?'1.5px solid #818cf8':'1.5px solid rgba(255,255,255,0.3)',background:activeCategories.length===0?'rgba(99,102,241,0.35)':'rgba(255,255,255,0.08)',color:activeCategories.length===0?'#fff':'#e2e8f0'}}>전체 {projects.length}</button>
              {CATEGORIES.map(cat=>{const isActive=activeCategories.includes(cat);const cc=CATEGORY_COLORS[cat];return(
                <button key={cat} onClick={()=>setActiveCategories(prev=>prev.includes(cat)?prev.filter(c=>c!==cat):[...prev,cat])} style={{padding:'3px 10px',borderRadius:14,fontSize:11,cursor:'pointer',fontWeight:isActive?600:400,border:isActive?`1.5px solid ${cc.border}`:'1.5px solid rgba(255,255,255,0.3)',background:isActive?`${cc.bg}22`:'rgba(255,255,255,0.08)',color:isActive?cc.border:'#e2e8f0',display:'flex',alignItems:'center',gap:4}}>
                  <span style={{width:7,height:7,borderRadius:'50%',background:cc.border,flexShrink:0,display:'inline-block'}}/>
                  {cat}
                </button>
              );})}
              {allGroups.length>0 && <>
                <div style={{width:1,height:14,background:'rgba(255,255,255,0.25)'}}/>
                <button onClick={()=>setActiveGroup('')} style={{padding:'3px 10px',borderRadius:14,fontSize:11,cursor:'pointer',fontWeight:activeGroup===''?600:400,border:activeGroup===''?'1.5px solid #818cf8':'1.5px solid rgba(255,255,255,0.3)',background:activeGroup===''?'rgba(99,102,241,0.35)':'rgba(255,255,255,0.08)',color:activeGroup===''?'#fff':'#e2e8f0'}}>전체그룹</button>
                {allGroups.map(g=>(
                  <button key={g} onClick={()=>setActiveGroup(prev=>prev===g?'':g)} style={{padding:'3px 10px',borderRadius:14,fontSize:11,cursor:'pointer',fontWeight:activeGroup===g?600:400,border:activeGroup===g?'1.5px solid #818cf8':'1.5px solid rgba(255,255,255,0.3)',background:activeGroup===g?'rgba(99,102,241,0.35)':'rgba(255,255,255,0.08)',color:activeGroup===g?'#fff':'#e2e8f0'}}>{g}</button>
                ))}
              </>}
              <div style={{width:1,height:14,background:'rgba(255,255,255,0.25)'}}/>
              <button onClick={expandAll} style={{padding:'3px 8px',borderRadius:10,fontSize:10,cursor:'pointer',border:'1px solid rgba(255,255,255,0.2)',background:'rgba(255,255,255,0.08)',color:'#a5b4fc',fontWeight:600}}>전체펴기</button>
              <button onClick={collapseAll} style={{padding:'3px 8px',borderRadius:10,fontSize:10,cursor:'pointer',border:'1px solid rgba(255,255,255,0.2)',background:'rgba(255,255,255,0.08)',color:'#a5b4fc',fontWeight:600}}>전체접기</button>
            </div>
          </>
        ) : (
          <>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8}}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <div>
              <div style={{display:'flex',alignItems:'center',gap:0,background:'rgba(255,255,255,0.07)',borderRadius:10,padding:4,border:'1px solid rgba(255,255,255,0.1)'}}>
                {([2,1] as const).map(id => (
                  <button key={id} onClick={()=>onAppChange(id)}
                    style={{display:'flex',alignItems:'center',gap:6,padding:'7px 16px',borderRadius:8,border:'none',cursor:'pointer',transition:'all 0.2s',
                      background: appId===id ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'transparent',
                      color: appId===id ? '#fff' : 'rgba(148,163,184,0.7)',
                      fontWeight: appId===id ? 700 : 400, fontSize: 14,
                      boxShadow: appId===id ? '0 2px 8px rgba(99,102,241,0.4)' : 'none'}}>
                    {id===2 ? '샌디앱 간트차트' : '통근버스 간트차트'}
                  </button>
                ))}
              </div>
              <div style={{display:'flex',alignItems:'center',gap:8,marginTop:2}}>
                <p style={{fontSize:11,color:'rgba(148,163,184,0.8)',margin:0}}>2026년 · Supabase 연동 · 실시간 동기화 🟢</p>
                {realtimeToast && <span style={{fontSize:11,color:'#4ade80',background:'rgba(74,222,128,0.12)',padding:'2px 8px',borderRadius:10,border:'1px solid rgba(74,222,128,0.25)',fontWeight:600,animation:'fadeInDown 0.3s ease',display:'flex',alignItems:'center',gap:4}}>🔄 다른 팀원이 업데이트했습니다</span>}
              </div>
            </div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
            {saving && <div style={{display:'flex',alignItems:'center',gap:5,fontSize:11,color:'#4ade80',background:'rgba(74,222,128,0.1)',padding:'4px 10px',borderRadius:20,border:'1px solid rgba(74,222,128,0.2)'}}><div style={{width:10,height:10,border:'2px solid #4ade80',borderTopColor:'transparent',borderRadius:'50%',animation:'spin 0.8s linear infinite'}} />저장 중...</div>}
            <div style={{position:'relative'}}>
              <span style={{position:'absolute',left:9,top:'50%',transform:'translateY(-50%)',color:'rgba(148,163,184,0.6)',fontSize:12}}>🔍</span>
              <input type="text" placeholder="검색..." value={searchQuery} onChange={e=>setSearchQuery(e.target.value)}
                style={{paddingLeft:28,paddingRight:10,height:30,border:'1px solid rgba(255,255,255,0.12)',borderRadius:7,width:150,fontSize:12,outline:'none',background:'rgba(255,255,255,0.07)',color:'#f1f5f9'}} />
            </div>
            <button onClick={loadHistory} style={{display:'flex',alignItems:'center',gap:5,height:30,padding:'0 11px',background:'rgba(124,58,237,0.85)',color:'white',border:'1px solid rgba(167,139,250,0.3)',borderRadius:7,cursor:'pointer',fontSize:12,fontWeight:500}}>🕐 히스토리</button>
            <button onClick={exportXLSX} style={{display:'flex',alignItems:'center',gap:5,height:30,padding:'0 11px',background:'rgba(22,163,74,0.85)',color:'white',border:'1px solid rgba(74,222,128,0.2)',borderRadius:7,cursor:'pointer',fontSize:12,fontWeight:500}}>⬇ Excel</button>
            <label style={{display:'flex',alignItems:'center',gap:5,height:30,padding:'0 11px',background:'rgba(59,130,246,0.85)',color:'white',border:'1px solid rgba(96,165,250,0.3)',borderRadius:7,cursor:'pointer',fontSize:12,fontWeight:500}}>
              ⬆ Excel 업로드
              <input type="file" accept=".xlsx,.xls" onChange={handleImportXLSX} style={{display:'none'}} />
            </label>
            <div style={{display:'flex',alignItems:'center',background:'rgba(255,255,255,0.07)',borderRadius:8,border:'1px solid rgba(255,255,255,0.12)',padding:2,gap:2}}>
              <span style={{fontSize:10,color:'rgba(148,163,184,0.5)',padding:'0 4px',userSelect:'none'}}>🔍</span>
              {([['year','월','12개월 한화면'],['half','월↔','6개월씩 스크롤'],['week','주','주단위 스크롤'],['day','일','일단위 스크롤']] as const).map(([mode,label,title])=>(
                <button key={mode} onClick={()=>{
                  const el = chartScrollRef.current;
                  if (el) {
                    const ratio = el.scrollLeft / (el.scrollWidth - el.clientWidth || 1);
                    setViewMode(mode as ViewMode);
                    requestAnimationFrame(() => {
                      requestAnimationFrame(() => {
                        if (chartScrollRef.current) {
                          const newMax = chartScrollRef.current.scrollWidth - chartScrollRef.current.clientWidth;
                          chartScrollRef.current.scrollLeft = ratio * newMax;
                        }
                      });
                    });
                  } else {
                    setViewMode(mode as ViewMode);
                  }
                }} title={title}
                  style={{height:26,padding:'0 10px',borderRadius:6,border:'none',cursor:'pointer',fontSize:12,fontWeight:viewMode===mode?700:400,background:viewMode===mode?'rgba(99,102,241,0.9)':'transparent',color:viewMode===mode?'white':'rgba(148,163,184,0.8)',transition:'all 0.15s'}}>
                  {label}
                </button>
              ))}
            </div>
            <button onClick={addProject} style={{display:'flex',alignItems:'center',gap:5,height:30,padding:'0 13px',background:'linear-gradient(135deg,#6366f1,#8b5cf6)',color:'white',border:'none',borderRadius:7,cursor:'pointer',fontSize:12,fontWeight:600,boxShadow:'0 2px 6px rgba(99,102,241,0.4)'}}>+ 프로젝트 추가</button>
            <div style={{display:'flex',alignItems:'center',gap:6,paddingLeft:8,borderLeft:'1px solid rgba(255,255,255,0.12)'}}>
              <span style={{fontSize:11,color:'rgba(148,163,184,0.6)',maxWidth:110,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{user.email}</span>
              <button onClick={()=>setShowChangePw(true)} style={{height:30,padding:'0 9px',background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.12)',borderRadius:7,cursor:'pointer',fontSize:11,color:'rgba(148,163,184,0.8)',fontWeight:500,display:'flex',alignItems:'center'}}>🔑 비번변경</button>
              <button onClick={onLogout} style={{height:30,padding:'0 9px',background:'rgba(239,68,68,0.15)',border:'1px solid rgba(239,68,68,0.25)',borderRadius:7,cursor:'pointer',fontSize:11,color:'#fca5a5',fontWeight:500,display:'flex',alignItems:'center'}}>로그아웃</button>
            </div>
          </div>
        </div>

        {/* 카테고리 + 그룹 필터 */}
        <div style={{display:'flex',gap:6,marginTop:12,alignItems:'center',flexWrap:'wrap'}}>
          <span style={{fontSize:12,color:'#e2e8f0',flexShrink:0,fontWeight:600}}>카테고리:</span>
          <button onClick={()=>setActiveCategories([])} style={{padding:'5px 14px',borderRadius:20,fontSize:12,cursor:'pointer',fontWeight:activeCategories.length===0?600:400,border:activeCategories.length===0?'1.5px solid #818cf8':'1.5px solid rgba(255,255,255,0.4)',background:activeCategories.length===0?'rgba(99,102,241,0.35)':'rgba(255,255,255,0.12)',color:activeCategories.length===0?'#fff':'#e2e8f0'}}>전체 <span style={{marginLeft:2,fontSize:11,opacity:0.9}}>{projects.length}</span></button>
          {CATEGORIES.map(cat=>{ const isActive=activeCategories.includes(cat); const cc=CATEGORY_COLORS[cat]; return (
            <button key={cat} onClick={()=>setActiveCategories(prev=>prev.includes(cat)?prev.filter(c=>c!==cat):[...prev,cat])}
              style={{padding:'5px 14px',borderRadius:20,fontSize:12,cursor:'pointer',fontWeight:isActive?600:400,border:isActive?`1.5px solid ${cc.border}`:'1.5px solid rgba(255,255,255,0.4)',background:isActive?`${cc.bg}33`:'rgba(255,255,255,0.12)',color:isActive?cc.border:'#e2e8f0',display:'flex',alignItems:'center',gap:5}}>
              <span style={{width:8,height:8,borderRadius:'50%',background:cc.border,flexShrink:0,display:'inline-block'}} />
              {cat} <span style={{marginLeft:2,fontSize:11,opacity:0.9}}>{projects.filter(p=>p.category===cat).length}</span>
            </button>
          ); })}
          {activeCategories.length>0 && <button onClick={()=>setActiveCategories([])} style={{fontSize:11,color:'#94a3b8',background:'none',border:'none',cursor:'pointer',textDecoration:'underline'}}>초기화</button>}
          {allGroups.length > 0 && <>
            <div style={{width:1,height:16,background:'rgba(255,255,255,0.3)',flexShrink:0,marginLeft:4}} />
            <span style={{fontSize:12,color:'#e2e8f0',flexShrink:0,fontWeight:600}}>그룹:</span>
            <button onClick={()=>setActiveGroup('')} style={{padding:'5px 14px',borderRadius:20,fontSize:12,cursor:'pointer',fontWeight:activeGroup===''?600:400,border:activeGroup===''?'1.5px solid #818cf8':'1.5px solid rgba(255,255,255,0.4)',background:activeGroup===''?'rgba(99,102,241,0.35)':'rgba(255,255,255,0.12)',color:activeGroup===''?'#fff':'#e2e8f0'}}>전체</button>
            {allGroups.map(g=>(
              <button key={g} onClick={()=>setActiveGroup(prev=>prev===g?'':g)} style={{padding:'5px 14px',borderRadius:20,fontSize:12,cursor:'pointer',fontWeight:activeGroup===g?600:400,border:activeGroup===g?'1.5px solid #818cf8':'1.5px solid rgba(255,255,255,0.4)',background:activeGroup===g?'rgba(99,102,241,0.35)':'rgba(255,255,255,0.12)',color:activeGroup===g?'#fff':'#e2e8f0'}}>
                {g} <span style={{fontSize:11,opacity:0.9}}>{projects.filter(p=>(p.group||'미분류')===g).length}</span>
              </button>
            ))}
          </>}
        </div>

        {/* Legend */}
        {<div style={{display:'flex',alignItems:'center',gap:16,marginTop:10,flexWrap:'wrap',paddingTop:10,borderTop:'1px solid rgba(255,255,255,0.15)'}}>
          <div style={{display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
            <div style={{display:'flex',alignItems:'center',gap:5}}><div style={{width:10,height:10,borderRadius:'50%',background:'#f87171'}} /><span style={{fontSize:12,color:'#e2e8f0'}}>오늘</span></div>
            <div style={{display:'flex',alignItems:'center',gap:5}}><div style={{width:28,height:9,borderRadius:3,background:'linear-gradient(to right,#3b82f6 50%,#bfdbfe 50%)'}} /><span style={{fontSize:12,color:'#e2e8f0'}}>진행률</span></div>
            {viewMode === 'day' && <>
              <div style={{display:'flex',alignItems:'center',gap:5}}><div style={{width:12,height:12,background:'rgba(239,68,68,0.15)',borderRadius:2,border:'1px solid rgba(239,68,68,0.3)'}} /><span style={{fontSize:12,color:'#e2e8f0'}}>공휴일</span></div>
              <div style={{display:'flex',alignItems:'center',gap:5}}><div style={{width:12,height:12,background:'rgba(59,130,246,0.1)',borderRadius:2,border:'1px solid rgba(59,130,246,0.2)'}} /><span style={{fontSize:12,color:'#e2e8f0'}}>토요일</span></div>
            </>}
            <span style={{fontSize:12,color:'#94a3b8'}}>⠿ 드래그로 순서 변경 | 바 드래그로 일정 조정 | 그룹명 더블클릭 이름 변경</span>
          </div>
          <div style={{flex:1}}/>
          <div style={{display:'flex',gap:4}}>
            <button onClick={expandAll} style={{height:26,padding:'0 10px',background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.15)',borderRadius:6,cursor:'pointer',fontSize:11,color:'#a5b4fc',fontWeight:600}}>전체펴기</button>
            <button onClick={collapseAll} style={{height:26,padding:'0 10px',background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.15)',borderRadius:6,cursor:'pointer',fontSize:11,color:'#a5b4fc',fontWeight:600}}>전체접기</button>
          </div>
        </div>}
          </>
        )}
      </div>

      {/* Chart */}
      <div ref={chartScrollRef} style={{overflowX:'auto',overflowY:'auto',flex:1}}>
        <div style={{minWidth:totalW}}>
          {/* Column Header */}
          {(viewMode === 'day' || viewMode === 'week') ? (
            <div style={{position:'sticky',top:0,zIndex:20,background:'white',borderBottom:'2px solid #e2e8f0',boxShadow:'0 1px 3px rgba(0,0,0,0.05)',width:totalW}}>
              <div style={{display:'flex',height:20,borderBottom:'1px solid #e8ecf8'}}>
                <div style={{width:isCompactUI?22:LEFT_COL+ASSIGNEE_COL+SUB_COL,minWidth:isCompactUI?22:LEFT_COL+ASSIGNEE_COL+SUB_COL,flexShrink:0,background:'#f9fafb',borderRight:'1px solid #e5e7eb',position:'sticky',left:0,zIndex:10}} />
                <div style={{display:'flex',width:TIMELINE_W,minWidth:TIMELINE_W,flexShrink:0,overflow:'hidden'}}>
                  {(viewMode === 'day' ? DAY_HEADERS : WEEK_HEADERS).reduce((acc: any[], h: any) => {
                    const isFirst = viewMode === 'day' ? h.isFirst : h.isFirstOfMonth;
                    if (isFirst || acc.length === 0) acc.push({ month: h.month, count: 1 });
                    else acc[acc.length - 1].count++;
                    return acc;
                  }, []).map((seg: any, i: number) => (
                    <div key={i} style={{width:seg.count*MONTH_COL,minWidth:seg.count*MONTH_COL,flexShrink:0,height:20,background:['#eff6ff','#f0fdf4','#fef3c7','#fdf4ff','#fff7ed','#f0fdfa','#fefce8','#faf5ff','#fff1f2','#f0f9ff','#fefce8','#f5f3ff'][i%12],borderRight:'1px solid #e8ecf8',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden'}}>
                      <span style={{fontSize:10,fontWeight:700,color:'#374151',whiteSpace:'nowrap'}}>{seg.month}월</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{display:'flex',height:22}}>
                {isCompactUI ? (
                  <div style={{width:22,minWidth:22,flexShrink:0,background:'#f9fafb',borderRight:'1px solid #e5e7eb',position:'sticky',left:0,zIndex:10}} />
                ) : (<>
                  <div style={{width:LEFT_COL,minWidth:LEFT_COL,flexShrink:0,padding:'0 12px',fontWeight:600,fontSize:13,color:'#374151',borderRight:'1px solid #e5e7eb',background:'#f9fafb',position:'sticky',left:0,zIndex:10,display:'flex',alignItems:'center'}}>그룹 / 프로젝트 / Task</div>
                  <div style={{width:ASSIGNEE_COL,minWidth:ASSIGNEE_COL,flexShrink:0,fontWeight:600,fontSize:12,color:'#374151',borderRight:'1px solid #e5e7eb',background:'#f9fafb',textAlign:'center',position:'sticky',left:LEFT_COL,zIndex:10,display:'flex',alignItems:'center',justifyContent:'center'}}>담당(정)</div>
                  <div style={{width:SUB_COL,minWidth:SUB_COL,flexShrink:0,fontWeight:600,fontSize:12,color:'#374151',borderRight:'1px solid #e5e7eb',background:'#f9fafb',textAlign:'center',position:'sticky',left:LEFT_COL+ASSIGNEE_COL,zIndex:10,display:'flex',alignItems:'center',justifyContent:'center'}}>담당(부)</div>
                </>)}
                <div style={{display:'flex',width:TIMELINE_W,minWidth:TIMELINE_W,flexShrink:0,overflow:'hidden'}}>
                  {viewMode === 'week'
                    ? WEEK_HEADERS.map((h,i)=>(<div key={i} style={{width:MONTH_COL,minWidth:MONTH_COL,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:h.isFirstOfMonth?700:500,color:h.isFirstOfMonth?'#1d4ed8':'#4b5563',borderRight:'1px solid #e8ecf8',background:h.isFirstOfMonth?'#eff6ff':'#f9fafb'}}>{h.label}</div>))
                    : DAY_HEADERS.map((h,i)=>{
                        const st = getDayHeaderStyle(h);
                        return (
                          <div key={i}
                            style={{
                              width:MONTH_COL,minWidth:MONTH_COL,flexShrink:0,
                              display:'flex',alignItems:'center',justifyContent:'center',
                              fontSize:10,fontWeight:st.fontWeight,color:st.color,
                              borderRight:'1px solid #e8ecf8',background:st.bg,
                              position:'relative',
                              cursor:'default',
                            }}
                            onMouseEnter={h.isHoliday ? e => {
                              if(tooltipTimer.current) clearTimeout(tooltipTimer.current);
                              tooltipTimer.current = setTimeout(() => {
                                setTooltip({ holidayOnly: true, name: h.holidayName });
                                setTooltipPos({ x: e.clientX, y: e.clientY });
                              }, 80);
                            } : undefined}
                            onMouseMove={h.isHoliday ? e => setTooltipPos({ x: e.clientX, y: e.clientY }) : undefined}
                            onMouseLeave={h.isHoliday ? () => { if(tooltipTimer.current) clearTimeout(tooltipTimer.current); setTooltip(null); } : undefined}
                          >
                            {h.day}
                          </div>
                        );
                      })
                  }
                </div>
              </div>
            </div>
          ) : (
            <div style={{display:'flex',position:'sticky',top:0,zIndex:20,background:'white',borderBottom:'1px solid #e5e7eb',boxShadow:'0 1px 3px rgba(0,0,0,0.05)',width:totalW,height:42}}>
              {isCompactUI ? (
                <div style={{width:22,minWidth:22,flexShrink:0,background:'#f9fafb',borderRight:'1px solid #e5e7eb',position:'sticky',left:0,zIndex:10}} />
              ) : (<>
                <div style={{width:LEFT_COL,minWidth:LEFT_COL,flexShrink:0,padding:'0 12px',fontWeight:600,fontSize:14,color:'#374151',borderRight:'1px solid #e5e7eb',background:'#f9fafb',position:'sticky',left:0,zIndex:10,display:'flex',alignItems:'center'}}>그룹 / 프로젝트 / Task</div>
                <div style={{width:ASSIGNEE_COL,minWidth:ASSIGNEE_COL,flexShrink:0,fontWeight:600,fontSize:13,color:'#374151',borderRight:'1px solid #e5e7eb',background:'#f9fafb',textAlign:'center',position:'sticky',left:LEFT_COL,zIndex:10,display:'flex',alignItems:'center',justifyContent:'center'}}>담당(정)</div>
                <div style={{width:SUB_COL,minWidth:SUB_COL,flexShrink:0,fontWeight:600,fontSize:13,color:'#374151',borderRight:'1px solid #e5e7eb',background:'#f9fafb',textAlign:'center',position:'sticky',left:LEFT_COL+ASSIGNEE_COL,zIndex:10,display:'flex',alignItems:'center',justifyContent:'center'}}>담당(부)</div>
              </>)}
              <div style={{display:'flex',width:TIMELINE_W,minWidth:TIMELINE_W,flexShrink:0,alignItems:'center'}}>
                {MONTH_LABELS.map((m,i)=>(<div key={i} style={{width:MONTH_COL,minWidth:MONTH_COL,flexShrink:0,textAlign:'center',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:600,color:'#4b5563',borderRight:i<11?'1px solid #e5e7eb':'none',background:'#f9fafb'}}>{m}</div>))}
              </div>
            </div>
          )}

          {/* Rows */}
          <div style={{width:totalW}}>
            {groupedFiltered.length===0 ? (
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'96px 0',color:'#9ca3af',fontSize:14,gap:12}}>
                <span>프로젝트가 없습니다.</span>
                <button onClick={addProject} style={{color:'#3b82f6',background:'none',border:'none',cursor:'pointer',fontSize:13}}>+ 프로젝트 추가하기</button>
              </div>
            ) : groupedFiltered.map(group=>(
              <React.Fragment key={group.name}>
                {/* 컴팩트 + 접힘: 그룹명 전용 행 1줄 */}
                {isCompactUI && collapsedGroups.has(group.name) && (
                  <div style={{display:'flex',borderBottom:'1px solid #e5e7eb',background:'#eff6ff',width:totalW}}>
                    <div style={{width:22,minWidth:22,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',
                      borderRight:'1px solid #e5e7eb',position:'sticky',left:0,zIndex:8,background:'#eff6ff',borderLeft:'4px solid #6366f1'}}>
                      <button onClick={()=>toggleGroup(group.name)} style={{border:'none',background:'none',cursor:'pointer',padding:'4px 6px',fontSize:10,color:'#6366f1',lineHeight:1}}>▶</button>
                    </div>
                    <div style={{flex:1,display:'flex',alignItems:'center',gap:6,padding:'0 10px',background:'#eff6ff'}}>
                      <span style={{fontSize:11}}>📁</span>
                      <span style={{fontSize:12,fontWeight:800,color:'#1e293b',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{group.name}</span>
                      <span style={{fontSize:10,color:'#6366f1',background:'rgba(99,102,241,0.15)',padding:'1px 6px',borderRadius:8,fontWeight:600,flexShrink:0}}>{group.items.length}개</span>
                    </div>
                  </div>
                )}
                <div draggable onDragStart={e=>handleRowDragStart(e,{type:'group',name:group.name})} onDragOver={e=>handleRowDragOver(e,{type:'group',name:group.name})} onDrop={e=>handleRowDrop(e,{type:'group',name:group.name})} onDragEnd={handleRowDragEnd}
                  style={{display:'flex',borderBottom:'1px solid #e5e7eb',background:rowDragOver?.type==='group'&&rowDragOver?.name===group.name?'#e0e7ff':'white',width:totalW,opacity:rowDrag?.type==='group'&&rowDrag?.name===group.name?0.5:1}}>
                  {isCompactUI ? (
                    !collapsedGroups.has(group.name) && (
                    <div style={{width:22,minWidth:22,flexShrink:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
                      borderRight:'1px solid #e5e7eb',position:'sticky',left:0,zIndex:8,background:'#eff6ff',borderLeft:'4px solid #6366f1'}}>
                      <button onClick={()=>toggleGroup(group.name)} style={{border:'none',background:'none',cursor:'pointer',padding:'4px 6px',fontSize:10,color:'#6366f1',lineHeight:1}}>▼</button>
                    </div>)
                  ) : (
                    <div style={{
                      width:LEFT_COL, minWidth:LEFT_COL, flexShrink:0, display:'flex', alignItems:'center',
                      padding:'8px 12px', gap:8,
                      borderRight:'1px solid #e5e7eb', position:'sticky', left:0, zIndex:8,
                      background:'#f0f4ff', borderLeft:'4px solid #6366f1', overflow:'hidden',
                    }}>
                      <span style={{fontSize:14,color:'#9ca3af',cursor:'grab',userSelect:'none',padding:'0 2px'}}>⠿</span>
                      <button onClick={()=>toggleGroup(group.name)} style={{border:'none',background:'none',cursor:'pointer',padding:2,fontSize:13,color:'#6366f1'}}>{collapsedGroups.has(group.name)?'▶':'▼'}</button>
                      <span style={{fontSize:15,color:'#6366f1'}}>📁</span>
                      {editingGroupName===group.name ? (
                        <input autoFocus value={editingGroupValue} onChange={e=>setEditingGroupValue(e.target.value)}
                          onBlur={()=>{renameGroup(group.name,editingGroupValue);setEditingGroupName(null);}}
                          onKeyDown={e=>{if(e.key==='Enter'){renameGroup(group.name,editingGroupValue);setEditingGroupName(null);}if(e.key==='Escape')setEditingGroupName(null);}}
                          style={{fontSize:13,fontWeight:700,border:'1px solid #6366f1',borderRadius:4,padding:'2px 6px',outline:'none',minWidth:120}} />
                      ) : (
                        <span onDoubleClick={()=>{setEditingGroupName(group.name);setEditingGroupValue(group.name);}} title="더블클릭하여 이름 변경" style={{fontSize:16,fontWeight:800,color:'#1e293b',cursor:'text',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{group.name}</span>
                      )}
                      <span style={{fontSize:12,color:'#6b7280',fontWeight:600,marginLeft:2,whiteSpace:'nowrap'}}>({group.items.length}개)</span>
                    </div>
                  )}
                  {!isCompactUI && <>
                    <div style={{width:ASSIGNEE_COL,minWidth:ASSIGNEE_COL,flexShrink:0,borderRight:'1px solid #e5e7eb',position:'sticky',left:LEFT_COL,zIndex:8,background:'white'}} />
                    <div style={{width:SUB_COL,minWidth:SUB_COL,flexShrink:0,borderRight:'1px solid #e5e7eb',position:'sticky',left:LEFT_COL+ASSIGNEE_COL,zIndex:8,background:'white'}} />
                  </>}
                  <div style={{width:TIMELINE_W,minWidth:TIMELINE_W,flexShrink:0,position:'relative',minHeight:(()=>{
                    if (!collapsedGroups.has(group.name)) return isCompactUI?32:44;
                    const projsWithDate = group.items.map((proj:any) => { const tasks=proj.tasks.filter((t:any)=>t.startDate&&t.endDate); const sd=tasks.length?tasks.map((t:any)=>t.startDate).sort()[0]:(proj.startDate||''); const ed=tasks.length?tasks.map((t:any)=>t.endDate).sort().reverse()[0]:(proj.endDate||''); return {startDate:sd,endDate:ed}; });
                    const laneEnds: number[] = [];
                    const sorted = [...projsWithDate].map((p,i)=>({p,i,pos:getPos(p.startDate,p.endDate)})).filter(x=>x.pos).sort((a,b)=>a.p.startDate.localeCompare(b.p.startDate));
                    sorted.forEach(({pos})=>{const li=laneEnds.findIndex(e=>e+BAR_GAP_PX<=pos!.left);const lane=li===-1?laneEnds.length:li;laneEnds[lane]=pos!.left+pos!.width;});
                    const laneCount=laneEnds.length||1; return Math.max(44,laneCount*(TASK_ROW_H+TASK_GAP)-TASK_GAP+12);
                  })()}}>
                    {GridLines}
                    {DayOverlayLines}
                    {todayLeft!==null && <div style={{position:'absolute',left:todayLeft,top:0,bottom:0,width:2,background:'#ef4444',opacity:0.3,zIndex:5}} />}
                    {isCompactUI && !collapsedGroups.has(group.name) && (
                      <div style={{position:'absolute',left:8,top:'50%',transform:'translateY(-50%)',display:'flex',alignItems:'center',gap:5,zIndex:4,pointerEvents:'none'}}>
                        <span style={{fontSize:11,color:'#6366f1'}}>📁</span>
                        <span style={{fontSize:12,fontWeight:800,color:'#1e293b',whiteSpace:'nowrap'}}>{group.name}</span>
                        <span style={{fontSize:10,color:'#64748b',fontWeight:600}}>({group.items.length}개)</span>
                      </div>
                    )}
                    {collapsedGroups.has(group.name) && (()=>{
                      const projBars = group.items.map((proj:any) => { const c=COLOR_MAP[proj.color]||COLOR_MAP.blue; const catColor=CATEGORY_COLORS[proj.category]; const barBg=catColor?catColor.border:c.bar; const tasks=proj.tasks.filter((t:any)=>t.startDate&&t.endDate); const startDate=tasks.length?tasks.map((t:any)=>t.startDate).sort()[0]:(proj.startDate||''); const endDate=tasks.length?tasks.map((t:any)=>t.endDate).sort().reverse()[0]:(proj.endDate||''); const pos=getPos(startDate,endDate); return {proj,startDate,endDate,pos,barBg}; });
                      const laneEnds: number[] = [];
                      const sorted = [...projBars].map((item,origIdx)=>({item,origIdx})).filter(({item})=>item.pos!==null).sort((a,b)=>a.item.startDate.localeCompare(b.item.startDate));
                      const laneMap: Record<number,number> = {};
                      sorted.forEach(({item,origIdx})=>{const laneIdx=laneEnds.findIndex(end=>end+BAR_GAP_PX<=item.pos!.left);const lane=laneIdx===-1?laneEnds.length:laneIdx;laneEnds[lane]=item.pos!.left+item.pos!.width;laneMap[origIdx]=lane;});
                      const validLanes=Object.values(laneMap); const laneCount=validLanes.length>0?Math.max(...validLanes)+1:1; const totalH=laneCount*(TASK_ROW_H+TASK_GAP)-TASK_GAP; const containerH=Math.max(44,totalH+12); const topBase=(containerH-totalH)/2;
                      return projBars.map((item,origIdx)=>{ if(!item.pos)return null; const lane=laneMap[origIdx]??0; const topOffset=topBase+lane*(TASK_ROW_H+TASK_GAP);
                        return (<div key={item.proj.id} onMouseEnter={e=>{if(tooltipTimer.current)clearTimeout(tooltipTimer.current);tooltipTimer.current=setTimeout(()=>{setTooltip({startDate:item.startDate,endDate:item.endDate,name:item.proj.name});setTooltipPos({x:e.clientX,y:e.clientY});},isCompactUI?0:80);}} onMouseMove={e=>setTooltipPos({x:e.clientX,y:e.clientY})} onMouseLeave={()=>{if(tooltipTimer.current)clearTimeout(tooltipTimer.current);setTooltip(null);}} onTouchStart={e=>{e.stopPropagation();const t=e.touches[0];if(tooltipTimer.current)clearTimeout(tooltipTimer.current);setTooltip({startDate:item.startDate,endDate:item.endDate,name:item.proj.name});setTooltipPos({x:t.clientX,y:t.clientY});}} onTouchEnd={()=>setTimeout(()=>setTooltip(null),1200)}
                          style={{position:'absolute',left:item.pos.left,width:item.pos.width,height:TASK_ROW_H,top:topOffset,background:item.barBg,borderRadius:4,opacity:0.9,zIndex:6,cursor:'default',display:'flex',alignItems:'center',overflow:'hidden',minWidth:4,border:`1px solid ${item.barBg}`,boxShadow:`0 1px 4px ${item.barBg}55`}}>
                          {item.pos.width>40&&<span style={{fontSize:11,color:'white',fontWeight:700,padding:'0 8px',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',lineHeight:1,textShadow:'0 1px 3px rgba(0,0,0,0.5)',maxWidth:item.pos.width-4}}>{item.proj.name}</span>}
                        </div>);
                      });
                    })()}
                  </div>
                </div>

                {!collapsedGroups.has(group.name) && group.items.map(proj=>{
                  const c=COLOR_MAP[proj.color]||COLOR_MAP.blue;
                  const {pos:projPos,progress:projProg,startDate:projStart,endDate:projEnd}=getProjectMeta(proj);
                  const catColor=CATEGORY_COLORS[proj.category];
                  const collapsedMinH=calcCollapsedMinH(proj);

                  const projRowMinH = isCompactUI
                    ? 32
                    : (proj.expanded || proj.tasks.length === 0)
                      ? (proj.description ? 56 : 44)
                      : (collapsedMinH + (proj.description ? 14 : 0));

                  return (
                    <React.Fragment key={proj.id}>
                      <div draggable onDragStart={e=>handleRowDragStart(e,{type:'project',id:proj.id,group:proj.group||'미분류'})} onDragOver={e=>handleRowDragOver(e,{type:'project',id:proj.id,group:proj.group||'미분류'})} onDrop={e=>handleRowDrop(e,{type:'project',id:proj.id,group:proj.group||'미분류'})} onDragEnd={handleRowDragEnd}
                        style={{display:'flex',borderBottom:'1px solid #e5e7eb',background:rowDragOver?.type==='project'&&rowDragOver?.id===proj.id?'#dbeafe':'white',opacity:rowDrag?.type==='project'&&rowDrag?.id===proj.id?0.5:1,minHeight:projRowMinH}}>

                        {isCompactUI ? (
                          <div style={{width:22,minWidth:22,flexShrink:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
                            borderRight:'1px solid #e5e7eb',position:'sticky',left:0,zIndex:8,background:'inherit',
                            borderLeft:`3px solid ${catColor?catColor.border:c.border}`}}>
                            <button onClick={()=>toggleProject(proj.id)} style={{border:'none',background:'none',cursor:'pointer',padding:'4px 6px',fontSize:10,color:catColor?catColor.border:c.text,lineHeight:1}}>{proj.expanded?'▼':'▶'}</button>
                          </div>
                        ) : (
                          <div style={{
                            width:LEFT_COL, minWidth:LEFT_COL, flexShrink:0,
                            display:'flex', alignItems:'flex-start',
                            padding:'6px 12px 6px 14px',
                            borderRight:'1px solid #e5e7eb',
                            borderLeft:'4px solid #e5e7eb',
                            background: 'white',
                            gap:6,
                            position:'sticky', left:0, zIndex:8, overflow:'hidden',
                          }}>
                            <span style={{fontSize:13,color:'#9ca3af',flexShrink:0,userSelect:'none',marginTop:2}}>└</span>
                            <span style={{fontSize:14,color:'#d1d5db',cursor:'grab',userSelect:'none',flexShrink:0,marginTop:1}}>⠿</span>
                            <button onClick={()=>toggleProject(proj.id)} style={{flexShrink:0,padding:'2px 2px 0',borderRadius:4,border:'none',background:'none',cursor:'pointer',marginTop:0}}>
                              <span style={{color:catColor?catColor.border:c.text,fontSize:13}}>{proj.expanded?'▼':'▶'}</span>
                            </button>
                            <div style={{flex:1,minWidth:0,overflow:'hidden'}}>
                              <div style={{overflow:'hidden',marginBottom:0}}>
                                <span style={{
                                  fontWeight:700, fontSize:14,
                                  color: catColor?catColor.border:'#1e293b',
                                  whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis',
                                  display:'inline-block', maxWidth:'100%', lineHeight:1.2,
                                }}>
                                  {proj.name}
                                </span>
                              </div>
                              {proj.description && (
                                <div
                                  style={descLineStyle}
                                  onMouseEnter={e=>{if(tooltipTimer.current)clearTimeout(tooltipTimer.current);tooltipTimer.current=setTimeout(()=>{setTooltip({descOnly:true,name:proj.description});setTooltipPos({x:e.clientX,y:e.clientY});},80);}}
                                  onMouseMove={e=>setTooltipPos({x:e.clientX,y:e.clientY})}
                                  onMouseLeave={()=>{if(tooltipTimer.current)clearTimeout(tooltipTimer.current);setTooltip(null);}}
                                >
                                  {proj.description}
                                </div>
                              )}
                            </div>
                            <div style={{display:'flex',gap:4,flexShrink:0,marginTop:1}}>
                              <button onClick={()=>setEditingProject(proj)} style={{padding:4,borderRadius:4,border:'none',background:'none',cursor:'pointer',fontSize:12}}>✏️</button>
                              <button onClick={()=>addTask(proj.id)} style={{padding:4,borderRadius:4,border:'none',background:'none',cursor:'pointer',fontSize:12}}>➕</button>
                              <button onClick={()=>deleteProject(proj.id)} style={{padding:4,borderRadius:4,border:'none',background:'none',cursor:'pointer',fontSize:12}}>🗑️</button>
                            </div>
                          </div>
                        )}
                        {!isCompactUI && <>
                          <div style={{width:ASSIGNEE_COL,minWidth:ASSIGNEE_COL,flexShrink:0,display:'flex',alignItems:'flex-start',justifyContent:'center',padding:'9px 4px 6px',borderRight:'1px solid #e5e7eb',fontSize:12,color:'#4b5563',textAlign:'center',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',position:'sticky',left:LEFT_COL,zIndex:8,background:'white'}}>{proj.owner||<span style={{color:'#d1d5db'}}>-</span>}</div>
                          <div style={{width:SUB_COL,minWidth:SUB_COL,flexShrink:0,display:'flex',alignItems:'flex-start',justifyContent:'center',padding:'9px 4px 6px',borderRight:'1px solid #e5e7eb',fontSize:12,color:'#6b7280',textAlign:'center',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',position:'sticky',left:LEFT_COL+ASSIGNEE_COL,zIndex:8,background:'white'}}>{proj.subOwner||<span style={{color:'#d1d5db'}}>-</span>}</div>
                        </>}
                        <div style={{width:TIMELINE_W,minWidth:TIMELINE_W,flexShrink:0,position:'relative',display:'flex',alignItems:'center',minHeight:projRowMinH}}>
                          {GridLines}
                          {DayOverlayLines}
                          {todayLeft!==null && <div style={{position:'absolute',left:todayLeft,top:0,bottom:0,width:2,background:'#ef4444',opacity:0.7,zIndex:5}} />}
                          {isCompactUI && projPos && (proj.tasks.length===0 || proj.expanded) && (
                            <div style={{position:'absolute',left:projPos.left+5,top:'50%',transform:'translateY(-50%)',zIndex:8,pointerEvents:'none',
                              display:'flex',alignItems:'center',whiteSpace:'nowrap',overflow:'visible'}}>
                              <span style={{fontSize:10,fontWeight:700,color:'#1e293b',letterSpacing:'-0.2px',
                                textShadow:'0 0 6px rgba(255,255,255,0.9),0 0 3px rgba(255,255,255,0.9)'}}>{proj.name}<span style={{fontWeight:600,color:'#374151',textShadow:'0 0 4px rgba(255,255,255,1)'}}> - {projProg}%</span></span>
                            </div>
                          )}
                          {projPos && proj.tasks.length===0 && (()=>{const isProjDrag=dragging?.pid===proj.id&&dragging?.tid==='__proj__'; return (
                            <div style={{position:'absolute',left:projPos.left,width:projPos.width,height:22,top:'50%',transform:'translateY(-50%)',background:isCompactUI?(catColor?catColor.border:c.bar):(catColor?catColor.bg:c.barLight),borderRadius:4,overflow:'visible',border:`1px solid ${catColor?catColor.border:c.bar}55`,zIndex:6,cursor:'grab'}}
                              onMouseDown={e=>handleMouseDown(e,proj.id,'__proj__','move')} onMouseEnter={e=>{if(tooltipTimer.current)clearTimeout(tooltipTimer.current);tooltipTimer.current=setTimeout(()=>{setTooltip({name:proj.name,startDate:projStart,endDate:projEnd});setTooltipPos({x:e.clientX,y:e.clientY});},isCompactUI?0:80);}} onMouseMove={e=>setTooltipPos({x:e.clientX,y:e.clientY})} onMouseLeave={()=>{if(tooltipTimer.current)clearTimeout(tooltipTimer.current);if(!isProjDrag)setTooltip(null);}} onTouchStart={e=>{e.stopPropagation();const t=e.touches[0];if(tooltipTimer.current)clearTimeout(tooltipTimer.current);setTooltip({name:proj.name,startDate:projStart,endDate:projEnd});setTooltipPos({x:t.clientX,y:t.clientY});}} onTouchEnd={e=>{e.stopPropagation();if(isCompactUI){setTooltip(null);setEditingProject(proj);}else{setTimeout(()=>setTooltip(null),1500);}}}>
                              <div style={{position:'absolute',left:0,top:0,bottom:0,width:8,cursor:'ew-resize',zIndex:8,borderRadius:'4px 0 0 4px'}} onMouseDown={e=>handleMouseDown(e,proj.id,'__proj__','start')} />
                              <div style={{width:`${projProg}%`,height:'100%',background:catColor?catColor.border:c.bar,borderRadius:4,overflow:'hidden'}} />
                              {!isCompactUI && (projPos.width>40?<div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,color:'#1f2937',fontWeight:700,pointerEvents:'none'}}>{projProg}%</div>:<div style={{position:'absolute',left:projPos.width+5,top:'50%',transform:'translateY(-50%)',whiteSpace:'nowrap',fontSize:11,color:'#374151',fontWeight:600,pointerEvents:'none'}}>{projProg}%</div>)}
                              <div style={{position:'absolute',right:0,top:0,bottom:0,width:8,cursor:'ew-resize',zIndex:8,borderRadius:'0 4px 4px 0'}} onMouseDown={e=>handleMouseDown(e,proj.id,'__proj__','end')} />
                            </div>);
                          })()}
                          {proj.tasks.length>0 && proj.expanded && projPos && (()=>{const isProjDrag=dragging?.pid===proj.id&&dragging?.tid==='__proj__'; return (
                            <div style={{position:'absolute',left:projPos.left,width:projPos.width,height:22,top:'50%',transform:'translateY(-50%)',background:catColor?catColor.bg:c.barLight,borderRadius:4,overflow:'hidden',border:`1px solid ${catColor?catColor.border:c.bar}55`,zIndex:6,cursor:'default'}}
                              onMouseEnter={e=>{if(tooltipTimer.current)clearTimeout(tooltipTimer.current);tooltipTimer.current=setTimeout(()=>{setTooltip({name:proj.name,startDate:projStart,endDate:projEnd});setTooltipPos({x:e.clientX,y:e.clientY});},isCompactUI?0:80);}} onMouseMove={e=>setTooltipPos({x:e.clientX,y:e.clientY})} onMouseLeave={()=>{if(tooltipTimer.current)clearTimeout(tooltipTimer.current);if(!isProjDrag)setTooltip(null);}} onTouchStart={e=>{e.stopPropagation();const t=e.touches[0];setTooltip({name:proj.name,startDate:projStart,endDate:projEnd});setTooltipPos({x:t.clientX,y:t.clientY});}} onTouchEnd={e=>{e.stopPropagation();if(isCompactUI){setTooltip(null);setEditingProject(proj);}else{setTimeout(()=>setTooltip(null),1500);}}}>
                              <div style={{width:`${projProg}%`,height:'100%',background:catColor?catColor.border:c.bar,borderRadius:4}} />
                              {!isCompactUI && (projPos.width>40?<div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,color:'#1f2937',fontWeight:700,pointerEvents:'none'}}>{projProg}%</div>:<div style={{position:'absolute',left:projPos.width+5,top:'50%',transform:'translateY(-50%)',whiteSpace:'nowrap',fontSize:11,color:'#374151',fontWeight:600,pointerEvents:'none'}}>{projProg}%</div>)}
                            </div>);
                          })()}
                          {proj.tasks.length>0 && !proj.expanded && (()=>{
                            if (isCompactUI) {
                              if (!projPos) return null;
                              return (
                                <div key="collapsed-bar"
                                  onMouseEnter={e=>{if(tooltipTimer.current)clearTimeout(tooltipTimer.current);tooltipTimer.current=setTimeout(()=>{setTooltip({startDate:projStart,endDate:projEnd,name:proj.name});setTooltipPos({x:e.clientX,y:e.clientY});},isCompactUI?0:80);}}
                                  onMouseMove={e=>setTooltipPos({x:e.clientX,y:e.clientY})}
                                  onMouseLeave={()=>{if(tooltipTimer.current)clearTimeout(tooltipTimer.current);setTooltip(null);}}
                                  onTouchStart={e=>{e.stopPropagation();}} onTouchEnd={e=>{e.stopPropagation();if(isCompactUI){setEditingProject(proj);}}}
                                  style={{position:'absolute',left:projPos.left,width:projPos.width,height:22,top:'50%',transform:'translateY(-50%)',
                                    background:catColor?catColor.bg:c.barLight,borderRadius:4,zIndex:6,cursor:'default',
                                    overflow:'visible',minWidth:4,border:`1px solid ${catColor?catColor.border:c.bar}55`,
                                    boxShadow:`0 1px 4px ${catColor?catColor.border:c.bar}55`}}>
                                  <div style={{width:`${projProg}%`,height:'100%',background:catColor?catColor.border:c.bar,borderRadius:4,pointerEvents:'none'}} />
                                  <div style={{position:'absolute',left:6,top:'50%',transform:'translateY(-50%)',fontSize:10,color:'#1e293b',fontWeight:700,pointerEvents:'none',whiteSpace:'nowrap',zIndex:7,textShadow:'0 0 5px rgba(255,255,255,1)',overflow:'visible'}}>{proj.name}<span style={{fontWeight:700,color:'#374151'}}> - {projProg}%</span></div>
                                </div>
                              );
                            }
                            const validTasks=proj.tasks.filter((t:any)=>t.startDate&&t.endDate); const laned=assignLanes(validTasks); const laneCount=calcLaneCount(laned); const totalH=laneCount*(TASK_ROW_H+TASK_GAP)-TASK_GAP; const containerH=projRowMinH; const topBase=(containerH-totalH)/2;
                            return laned.map(({task,lane,pos:tpos})=>{
                              if(!tpos)return null;
                              const taskCatColor=CATEGORY_COLORS[task.category];
                              const tc=COLOR_MAP[proj.color]||COLOR_MAP.blue;
                              const barBg=taskCatColor?taskCatColor.border:tc.bar;
                              const barBgLight=taskCatColor?taskCatColor.bg:tc.barLight;
                              const topOffset=topBase+lane*(TASK_ROW_H+TASK_GAP); const isDrag=dragging?.pid===proj.id&&dragging?.tid===task.id;
                              return (<div key={task.id} onMouseEnter={e=>{if(tooltipTimer.current)clearTimeout(tooltipTimer.current);tooltipTimer.current=setTimeout(()=>{setTooltip({startDate:task.startDate,endDate:task.endDate,name:task.name});setTooltipPos({x:e.clientX,y:e.clientY});},isCompactUI?0:80);}} onMouseMove={e=>setTooltipPos({x:e.clientX,y:e.clientY})} onMouseLeave={()=>{if(tooltipTimer.current)clearTimeout(tooltipTimer.current);if(!isDrag)setTooltip(null);}} onMouseDown={e=>handleMouseDown(e,proj.id,task.id,'move')}
                                style={{position:'absolute',left:tpos.left,width:tpos.width,height:TASK_ROW_H,top:topOffset,background:barBgLight,borderRadius:3,zIndex:6,cursor:'grab',display:'flex',alignItems:'center',overflow:'visible',minWidth:4,border:`1px solid ${barBg}55`}}>
                                <div onMouseDown={e=>handleMouseDown(e,proj.id,task.id,'start')} style={{position:'absolute',left:0,top:0,bottom:0,width:6,cursor:'ew-resize',zIndex:8,borderRadius:'3px 0 0 3px'}} />
                                <div style={{width:`${task.progress||0}%`,height:'100%',background:barBg,borderRadius:3,opacity:0.7,pointerEvents:'none'}} />
                                {tpos.width>36&&<span style={{position:'absolute',left:8,right:8,fontSize:10,color:'#1f2937',fontWeight:600,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',lineHeight:1,pointerEvents:'none'}}>{task.name}</span>}
                                <div onMouseDown={e=>handleMouseDown(e,proj.id,task.id,'end')} style={{position:'absolute',right:0,top:0,bottom:0,width:6,cursor:'ew-resize',zIndex:8,borderRadius:'0 3px 3px 0'}} />
                              </div>);
                            });
                          })()}
                        </div>
                      </div>

                      {proj.expanded && proj.tasks.map((task:any)=>{
                        if (!proj.expanded) return null;
                        const pos=getPos(task.startDate,task.endDate); const isDrag=dragging?.pid===proj.id&&dragging?.tid===task.id;
                        const taskCatColor=CATEGORY_COLORS[task.category];
                        const tc=COLOR_MAP[proj.color]||COLOR_MAP.blue;
                        const taskBarBg=taskCatColor?taskCatColor.border:tc.bar;
                        const taskBarBgLight=taskCatColor?taskCatColor.bg:tc.barLight;
                        const taskRowMinH = !isCompactUI && task.description ? 52 : (isCompactUI ? 32 : 40);

                        return (
                          <div key={task.id} draggable onDragStart={e=>handleRowDragStart(e,{type:'task',tid:task.id,pid:proj.id})} onDragOver={e=>handleRowDragOver(e,{type:'task',tid:task.id,pid:proj.id})} onDrop={e=>handleRowDrop(e,{type:'task',tid:task.id,pid:proj.id})} onDragEnd={handleRowDragEnd}
                            style={{display:'flex',borderBottom:'1px solid #e5e7eb',background:rowDragOver?.type==='task'&&rowDragOver?.tid===task.id?'#f0fdf4':'white',opacity:rowDrag?.type==='task'&&rowDrag?.tid===task.id?0.5:1,minHeight:taskRowMinH}}>
                            {isCompactUI ? (
                              <div style={{width:22,minWidth:22,flexShrink:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
                                borderRight:'1px solid #e5e7eb',position:'sticky',left:0,zIndex:8,background:'inherit',
                                borderLeft:`3px solid ${catColor?catColor.border+'88':c.border+'88'}`}}>
                                <span style={{fontSize:8,color:'#c4b5fd',lineHeight:1}}>└</span>
                              </div>
                            ) : (
                              <div style={{width:LEFT_COL,minWidth:LEFT_COL,flexShrink:0,display:'flex',alignItems:'center',
                                padding:'6px 12px',borderRight:'1px solid #e5e7eb',position:'sticky',left:0,zIndex:8,background:'white',overflow:'hidden'}}>
                                <div style={{paddingLeft:48,display:'flex',alignItems:'center',gap:8,width:'100%',overflow:'hidden'}}>
                                  <span style={{fontSize:12,color:'#c4b5fd',flexShrink:0,userSelect:'none'}}>└</span>
                                  <span style={{fontSize:14,color:'#d1d5db',cursor:'grab',userSelect:'none',flexShrink:0}}>⠿</span>
                                  <div style={{flex:1,minWidth:0,overflow:'hidden'}}>
                                    <div style={{display:'flex',alignItems:'center',gap:4,overflow:'hidden'}}>
                                      {task.category && CATEGORY_COLORS[task.category] && (()=>{const cc=CATEGORY_COLORS[task.category];return <span style={{fontSize:9,padding:'1px 4px',borderRadius:4,background:cc.bg,color:cc.text,border:`1px solid ${cc.border}`,fontWeight:700,flexShrink:0,whiteSpace:'nowrap',lineHeight:1.4}}>{task.category}</span>;})()}
                                      <span style={{fontSize:12,color:'#1f2937',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1,minWidth:0,lineHeight:1.2}}>{task.name}</span>
                                    </div>
                                    {task.description && (
                                      <div
                                        style={descLineStyle}
                                        onMouseEnter={e=>{if(tooltipTimer.current)clearTimeout(tooltipTimer.current);tooltipTimer.current=setTimeout(()=>{setTooltip({descOnly:true,name:task.description});setTooltipPos({x:e.clientX,y:e.clientY});},80);}}
                                        onMouseMove={e=>setTooltipPos({x:e.clientX,y:e.clientY})}
                                        onMouseLeave={()=>{if(tooltipTimer.current)clearTimeout(tooltipTimer.current);setTooltip(null);}}
                                      >
                                        {task.description}
                                      </div>
                                    )}
                                  </div>
                                  <div style={{display:'flex',gap:4,flexShrink:0}}>
                                    <button onClick={()=>setEditingTask({task,pid:proj.id})} style={{padding:4,borderRadius:4,border:'none',background:'none',cursor:'pointer',fontSize:12}}>✏️</button>
                                    <button onClick={()=>deleteTask(proj.id,task.id)} style={{padding:4,borderRadius:4,border:'none',background:'none',cursor:'pointer',fontSize:12}}>🗑️</button>
                                  </div>
                                </div>
                              </div>
                            )}
                            {!isCompactUI && <>
                              <div style={{width:ASSIGNEE_COL,minWidth:ASSIGNEE_COL,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',padding:'6px 4px',borderRight:'1px solid #e5e7eb',fontSize:12,color:'#6b7280',textAlign:'center',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',position:'sticky',left:LEFT_COL,zIndex:8,background:'white'}}>{task.assignee||<span style={{color:'#d1d5db'}}>-</span>}</div>
                              <div style={{width:SUB_COL,minWidth:SUB_COL,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',padding:'6px 4px',borderRight:'1px solid #e5e7eb',fontSize:12,color:'#9ca3af',textAlign:'center',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',position:'sticky',left:LEFT_COL+ASSIGNEE_COL,zIndex:8,background:'white'}}>{task.subAssignee||<span style={{color:'#d1d5db'}}>-</span>}</div>
                            </>}
                            <div style={{width:TIMELINE_W,minWidth:TIMELINE_W,flexShrink:0,position:'relative',minHeight:taskRowMinH,display:'flex',alignItems:'center'}}>
                              {GridLines}
                              {DayOverlayLines}
                              {todayLeft!==null && <div style={{position:'absolute',left:todayLeft,top:0,bottom:0,width:2,background:'#ef4444',opacity:0.4,zIndex:5}} />}
                              {isCompactUI && pos && (
                                <div style={{position:'absolute',left:pos.left+4,top:'50%',transform:'translateY(-50%)',zIndex:7,pointerEvents:'none',
                                  display:'flex',alignItems:'center',whiteSpace:'nowrap',overflow:'visible'}}>
                                  <span style={{fontSize:9,fontWeight:600,color:'#1e293b',
                                    textShadow:'0 0 5px rgba(255,255,255,0.9),0 0 3px rgba(255,255,255,0.9)'}}>{task.name}<span style={{fontWeight:600,color:'#374151',textShadow:'0 0 4px rgba(255,255,255,1)'}}> - {task.progress||0}%</span></span>
                                </div>
                              )}
                              {pos && (
                                <div style={{position:'absolute',left:pos.left,width:pos.width,height:22,top:'50%',transform:'translateY(-50%)',
                                  background:taskBarBgLight,
                                  borderRadius:4,border:`1px solid ${taskBarBg}55`,cursor:'grab',zIndex:6,overflow:'visible'}}
                                  onMouseDown={e=>handleMouseDown(e,proj.id,task.id,'move')} onMouseEnter={e=>{if(tooltipTimer.current)clearTimeout(tooltipTimer.current);tooltipTimer.current=setTimeout(()=>{setTooltip({name:task.name,startDate:task.startDate,endDate:task.endDate});setTooltipPos({x:e.clientX,y:e.clientY});},isCompactUI?0:80);}} onMouseMove={e=>setTooltipPos({x:e.clientX,y:e.clientY})} onMouseLeave={()=>{if(tooltipTimer.current)clearTimeout(tooltipTimer.current);if(!isDrag)setTooltip(null);}} onTouchStart={e=>{e.stopPropagation();const t=e.touches[0];if(tooltipTimer.current)clearTimeout(tooltipTimer.current);setTooltip({name:task.name,startDate:task.startDate,endDate:task.endDate});setTooltipPos({x:t.clientX,y:t.clientY});}} onTouchEnd={e=>{e.stopPropagation();if(isCompactUI){setTooltip(null);setEditingTask({task,pid:proj.id});}else{setTimeout(()=>setTooltip(null),1500);}}}>
                                  <div style={{position:'absolute',left:0,top:0,bottom:0,width:8,cursor:'ew-resize',zIndex:8,borderRadius:'5px 0 0 5px'}} onMouseDown={e=>handleMouseDown(e,proj.id,task.id,'start')} />
                                  <div style={{width:`${task.progress||0}%`,height:'100%',background:taskBarBg,borderRadius:4,pointerEvents:'none'}} />
                                  {!isCompactUI && (pos.width>40?<div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,pointerEvents:'none',color:'#1f2937'}}>{task.progress||0}%</div>:<div style={{position:'absolute',left:pos.width+5,top:'50%',transform:'translateY(-50%)',whiteSpace:'nowrap',fontSize:11,fontWeight:600,pointerEvents:'none',color:'#374151'}}>{task.progress||0}%</div>)}
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

      {tooltip && (tooltip.holidayOnly || tooltip.descOnly || tooltip.startDate) && (
        <div style={{position:'fixed',left:tooltipPos.x+14,top:tooltipPos.y-8,background:'#111827',color:'white',fontSize:13,padding:'10px 14px',borderRadius:8,whiteSpace:'nowrap',pointerEvents:'none',zIndex:99999,boxShadow:'0 4px 16px rgba(0,0,0,0.45)',lineHeight:1.7,border:'1px solid rgba(255,255,255,0.08)'}}>
          {tooltip.holidayOnly ? (
            <div style={{display:'flex',alignItems:'center',gap:6,fontWeight:600,color:'#fca5a5',fontSize:13}}>
              🗓️ {tooltip.name}
            </div>
          ) : tooltip.descOnly ? (
            <div style={{fontWeight:500,color:'#e2e8f0',fontSize:13,maxWidth:320,whiteSpace:'pre-wrap'}}>
              {tooltip.name}
            </div>
          ) : (
            <>
              {tooltip.name && <div style={{fontWeight:700,marginBottom:4,color:'#f1f5f9',fontSize:14}}>{tooltip.name}</div>}
              <div style={{display:'flex',alignItems:'center',gap:6}}>
                <span style={{color:'#6ee7b7',fontWeight:600,fontSize:13}}>▶</span>
                <span style={{color:'#ffffff',fontWeight:600,letterSpacing:'0.3px'}}>{tooltip.startDate}</span>
                <span style={{color:'#9ca3af',fontSize:12,margin:'0 2px'}}>→</span>
                <span style={{color:'#ffffff',fontWeight:600,letterSpacing:'0.3px'}}>{tooltip.endDate}</span>
              </div>
              {tooltip.startDate && KR_HOLIDAYS_2026[tooltip.startDate] && (
                <div style={{fontSize:11,color:'#fca5a5',marginTop:3}}>🗓️ {KR_HOLIDAYS_2026[tooltip.startDate]}</div>
              )}
            </>
          )}
        </div>
      )}

      {editingProject && <ProjectEditModal proj={editingProject} onClose={()=>setEditingProject(null)} />}
      {editingTask && <TaskEditModal task={editingTask.task} pid={editingTask.pid} onClose={()=>setEditingTask(null)} />}
      {showChangePw && <ChangePwModal />}
      {showHistory && <HistoryModal />}

      {/* 업로드 에러 토스트 */}
      {uploadError && (
        <div style={{position:'fixed',top:20,left:'50%',transform:'translateX(-50%)',background:'#fee2e2',border:'1px solid #fca5a5',color:'#991b1b',padding:'10px 20px',borderRadius:10,fontSize:13,fontWeight:600,zIndex:9999,boxShadow:'0 4px 16px rgba(0,0,0,0.15)'}}>
          ⚠️ {uploadError}
          <button onClick={()=>setUploadError('')} style={{marginLeft:12,background:'none',border:'none',cursor:'pointer',color:'#991b1b',fontWeight:700}}>✕</button>
        </div>
      )}

      {/* 업로드 미리보기 모달 */}
      {uploadPreview && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.6)',zIndex:9000,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
          <div style={{background:'white',borderRadius:16,width:'100%',maxWidth:700,maxHeight:'80vh',display:'flex',flexDirection:'column',boxShadow:'0 8px 40px rgba(0,0,0,0.3)'}}>
            <div style={{padding:'16px 20px',borderBottom:'1px solid #e5e7eb',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div>
                <div style={{fontSize:16,fontWeight:700,color:'#1e293b'}}>📊 업로드 미리보기</div>
                <div style={{fontSize:12,color:'#64748b',marginTop:2}}>프로젝트 {uploadPreview.length}개 · Task {uploadPreview.reduce((s,p)=>s+p.tasks.length,0)}개가 추가됩니다</div>
              </div>
              <button onClick={()=>setUploadPreview(null)} style={{background:'none',border:'none',cursor:'pointer',fontSize:18,color:'#9ca3af'}}>✕</button>
            </div>
            <div style={{flex:1,overflowY:'auto',padding:'12px 20px'}}>
              {uploadPreview.map((proj, pi) => (
                <div key={pi} style={{marginBottom:10,border:'1px solid #e5e7eb',borderRadius:10,overflow:'hidden'}}>
                  <div style={{padding:'8px 12px',background:'#f8fafc',borderBottom:'1px solid #e5e7eb',display:'flex',alignItems:'center',gap:8}}>
                    <span style={{fontSize:11,color:'#6366f1',background:'rgba(99,102,241,0.1)',padding:'1px 7px',borderRadius:8,fontWeight:700}}>{proj.group}</span>
                    {proj.category && <span style={{fontSize:11,fontWeight:700,padding:'1px 6px',borderRadius:6,background: CATEGORY_COLORS[proj.category]?.bg||'#f1f5f9',color:CATEGORY_COLORS[proj.category]?.text||'#374151',border:`1px solid ${CATEGORY_COLORS[proj.category]?.border||'#e5e7eb'}`}}>{proj.category}</span>}
                    <span style={{fontSize:13,fontWeight:700,color:'#1e293b',flex:1}}>{proj.name}</span>
                    {proj.owner && <span style={{fontSize:11,color:'#64748b'}}>👤 {proj.owner}</span>}
                  </div>
                  {proj.tasks.length > 0 && (
                    <div style={{padding:'6px 12px'}}>
                      {proj.tasks.map((t: any, ti: number) => (
                        <div key={ti} style={{display:'flex',alignItems:'center',gap:6,padding:'3px 0',borderBottom:ti<proj.tasks.length-1?'1px solid #f1f5f9':'none'}}>
                          <span style={{fontSize:11,color:'#c4b5fd'}}>└</span>
                          <span style={{fontSize:12,color:'#374151',flex:1}}>{t.name}</span>
                          {t.assignee && <span style={{fontSize:11,color:'#94a3b8'}}>👤 {t.assignee}</span>}
                          {t.startDate && <span style={{fontSize:11,color:'#94a3b8'}}>{t.startDate} ~ {t.endDate}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div style={{padding:'14px 20px',borderTop:'1px solid #e5e7eb',display:'flex',justifyContent:'flex-end',gap:8}}>
              <button onClick={()=>setUploadPreview(null)} style={{padding:'8px 20px',borderRadius:8,border:'1px solid #e5e7eb',background:'white',fontSize:13,cursor:'pointer',color:'#374151'}}>취소</button>
              <button onClick={confirmImport} style={{padding:'8px 20px',borderRadius:8,border:'none',background:'#3b82f6',color:'white',fontSize:13,fontWeight:700,cursor:'pointer'}}>✓ 추가 저장</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
