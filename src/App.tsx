// src/App.tsx 전체 내용을 이걸로 교체하세요!
const { createClient } = (window as any).supabase;
import React, { useState, useEffect, useRef } from 'react';

const SUPABASE_URL = 'https://tcmcrpszpbawgwolzuno.supabase.co';
const SUPABASE_KEY = 'sb_publishable_ktL_xVzsDjv3wmbrO8j0Tg_DP2vYBHO';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const CHART_START = new Date('2026-01-01T00:00:00');
const CHART_END = new Date('2026-12-31T00:00:00');
const TOTAL_DAYS = (CHART_END - CHART_START) / 86400000;
const MONTHS = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
const LEFT_COL = 400, ASSIGNEE_COL = 100;
const MONTH_COL = Math.floor((window.innerWidth - LEFT_COL - ASSIGNEE_COL) / 12);
const TIMELINE_W = MONTH_COL * 12;
const CATEGORY_ORDER = { '영업': 0, '기획': 1, '개발': 2 };

const COLOR_MAP = {
  blue:   { bar:'#3b82f6', barLight:'#bfdbfe', text:'#1e40af', border:'#3b82f6', rowBg:'#f8faff' },
  green:  { bar:'#22c55e', barLight:'#bbf7d0', text:'#15803d', border:'#22c55e', rowBg:'#f6fef8' },
  purple: { bar:'#a855f7', barLight:'#e9d5ff', text:'#6b21a8', border:'#a855f7', rowBg:'#fdf8ff' },
  orange: { bar:'#f97316', barLight:'#fed7aa', text:'#c2410c', border:'#f97316', rowBg:'#fffaf5' },
  pink:   { bar:'#ec4899', barLight:'#fbcfe8', text:'#be185d', border:'#ec4899', rowBg:'#fef7fb' },
};

const CATEGORY_COLORS = {
  '영업': { bg:'#fef3c7', text:'#92400e', border:'#f59e0b' },
  '기획': { bg:'#ede9fe', text:'#5b21b6', border:'#7c3aed' },
  '개발': { bg:'#d1fae5', text:'#065f46', border:'#10b981' },
};

const toDateStr = d => d.toISOString().split('T')[0];
const parseDate = s => new Date(s + 'T00:00:00');
const getPos = (s, e) => {
  if (!s || !e) return null;
  const sd = parseDate(s), ed = parseDate(e);
  if (isNaN(sd) || isNaN(ed)) return null;
  const left = Math.max(0, (sd - CHART_START) / 86400000 / TOTAL_DAYS * TIMELINE_W);
  const right = Math.min(TIMELINE_W, (ed - CHART_START) / 86400000 / TOTAL_DAYS * TIMELINE_W);
  return { left, width: Math.max(6, right - left) };
};

export default function GanttChart() {
  const [projects, setProjects] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategories, setActiveCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [editingProject, setEditingProject] = useState(null);
  const [dragging, setDragging] = useState(null);
  const [tooltip, setTooltip] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const dragRef = useRef(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('gantt_projects').select('data').eq('id', 1).single();
      if (!error && data) setProjects(data.data || []);
    } catch {}
    finally { setLoading(false); }
  };

  const save = async (p) => {
    setProjects(p);
    setSaving(true);
    try { await supabase.from('gantt_projects').upsert({ id: 1, data: p }); } catch {}
    finally { setSaving(false); }
  };

  const addProject = () => save([...projects, {
    id: Date.now(), name: '새 프로젝트', owner: '', description: '',
    color: 'blue', expanded: true, tasks: [], category: '기획',
    startDate: '', endDate: '', progress: 0
  }]);

  const addTask = pid => save(projects.map(p => p.id !== pid ? p : {
    ...p, tasks: [...p.tasks, {
      id: Date.now(), name: '새 Task', assignee: '',
      startDate: '2026-03-01', endDate: '2026-05-31',
      progress: 0, dependencies: [], description: ''
    }]
  }));

  const toggleProject = pid => setProjects(projects.map(p => p.id === pid ? { ...p, expanded: !p.expanded } : p));
  const updateTask = (pid, tid, upd) => save(projects.map(p => p.id !== pid ? p : { ...p, tasks: p.tasks.map(t => t.id !== tid ? t : { ...t, ...upd }) }));
  const deleteTask = (pid, tid) => save(projects.map(p => p.id !== pid ? p : { ...p, tasks: p.tasks.filter(t => t.id !== tid) }));
  const deleteProject = pid => save(projects.filter(p => p.id !== pid));
  const updateProject = (pid, upd) => save(projects.map(p => p.id !== pid ? p : { ...p, ...upd }));

  const getProjectMeta = proj => {
    const tasks = proj.tasks.filter(t => t.startDate && t.endDate);
    if (!tasks.length) {
      if (proj.startDate && proj.endDate) {
        return { pos: getPos(proj.startDate, proj.endDate), progress: proj.progress || 0 };
      }
      return { pos: null, progress: 0 };
    }
    const starts = tasks.map(t => +parseDate(t.startDate));
    const ends = tasks.map(t => +parseDate(t.endDate));
    let totalW = 0, totalP = 0;
    tasks.forEach(t => {
      const dur = Math.max(1, (parseDate(t.endDate) - parseDate(t.startDate)) / 86400000);
      totalW += dur; totalP += (t.progress || 0) * dur;
    });
    const visStart = toDateStr(new Date(Math.max(Math.min(...starts), +CHART_START)));
    const visEnd = toDateStr(new Date(Math.min(Math.max(...ends), +CHART_END)));
    return { pos: getPos(visStart, visEnd), progress: totalW > 0 ? Math.round(totalP / totalW) : 0 };
  };

  const handleMouseDown = (e, pid, tid, type) => {
    e.preventDefault(); e.stopPropagation();
    if (tid === '__proj__') {
      const proj = projects.find(p => p.id === pid);
      if (!proj) return;
      dragRef.current = { pid, tid: '__proj__', type, startX: e.clientX, startDate: proj.startDate, endDate: proj.endDate };
    } else {
      const task = projects.find(p => p.id === pid)?.tasks.find(t => t.id === tid);
      if (!task) return;
      dragRef.current = { pid, tid, type, startX: e.clientX, startDate: task.startDate, endDate: task.endDate };
    }
    setDragging({ pid, tid, type });
  };

  useEffect(() => {
    if (!dragging) return;
    const onMove = e => {
      const d = dragRef.current; if (!d) return;
      e.preventDefault();
      const deltaDays = Math.round(((e.clientX - d.startX) / TIMELINE_W) * TOTAL_DAYS);
      const s0 = parseDate(d.startDate), e0 = parseDate(d.endDate);
      let ns = new Date(s0), ne = new Date(e0);
      if (d.type === 'move') {
        ns = new Date(+s0 + deltaDays * 86400000); ne = new Date(+e0 + deltaDays * 86400000);
        if (ns < CHART_START) { const diff = CHART_START - ns; ns = new Date(CHART_START); ne = new Date(+ne + diff); }
        if (ne > CHART_END) { const diff = ne - CHART_END; ne = new Date(CHART_END); ns = new Date(+ns - diff); }
      } else if (d.type === 'start') {
        ns = new Date(Math.max(+CHART_START, Math.min(+s0 + deltaDays * 86400000, +e0 - 86400000)));
      } else {
        ne = new Date(Math.min(+CHART_END, Math.max(+e0 + deltaDays * 86400000, +s0 + 86400000)));
      }
      if (d.tid === '__proj__') {
        updateProject(d.pid, { startDate: toDateStr(ns), endDate: toDateStr(ne) });
        setTooltip(t => t ? { ...t, startDate: toDateStr(ns), endDate: toDateStr(ne) } : t);
      } else {
        updateTask(d.pid, d.tid, { startDate: toDateStr(ns), endDate: toDateStr(ne) });
        setTooltip(t => t ? { ...t, startDate: toDateStr(ns), endDate: toDateStr(ne) } : t);
      }
    };
    const onUp = () => { dragRef.current = null; setDragging(null); document.body.style.cursor = ''; document.body.style.userSelect = ''; };
    document.body.style.userSelect = 'none';
    document.body.style.cursor = dragging.type === 'move' ? 'grabbing' : 'ew-resize';
    window.addEventListener('mousemove', onMove, { passive: false });
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [dragging]);

  const filtered = projects
    .filter(p => activeCategories.length === 0 || activeCategories.includes(p.category))
    .filter(p =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.owner?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.tasks.some(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()) || t.assignee?.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    .sort((a, b) => {
      const oa = CATEGORY_ORDER[a.category] ?? 99;
      const ob = CATEGORY_ORDER[b.category] ?? 99;
      if (oa !== ob) return oa - ob;
      return a.id - b.id;
    });

  const today = new Date();
  const todayLeft = today >= CHART_START && today <= CHART_END
    ? Math.round((today - CHART_START) / 86400000 / TOTAL_DAYS * TIMELINE_W) : null;

  const ProjectEditModal = ({ proj, onClose }) => {
    const [fd, setFd] = useState({ ...proj });
    const colorOpts = [
      { name:'blue', label:'파란색', color:'#3b82f6' }, { name:'green', label:'초록색', color:'#22c55e' },
      { name:'purple', label:'보라색', color:'#a855f7' }, { name:'orange', label:'주황색', color:'#f97316' },
      { name:'pink', label:'분홍색', color:'#ec4899' },
    ];
    return (
      <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:50,padding:16}}>
        <div style={{background:'white',borderRadius:12,padding:24,maxWidth:480,width:'100%',boxShadow:'0 20px 60px rgba(0,0,0,0.3)',maxHeight:'90vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
            <h3 style={{fontSize:18,fontWeight:'bold',margin:0}}>프로젝트 편집</h3>
            <button onClick={onClose} style={{border:'none',background:'none',cursor:'pointer',fontSize:20,color:'#9ca3af'}}>✕</button>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:16}}>
            <div>
              <label style={{display:'block',fontSize:14,fontWeight:500,marginBottom:4}}>프로젝트 이름</label>
              <input value={fd.name} onChange={e=>setFd({...fd,name:e.target.value})} style={{width:'100%',border:'1px solid #d1d5db',borderRadius:8,padding:'8px 12px',fontSize:14,boxSizing:'border-box'}} />
            </div>
            <div>
              <label style={{display:'block',fontSize:14,fontWeight:500,marginBottom:4}}>프로젝트 오너</label>
              <input value={fd.owner||''} onChange={e=>setFd({...fd,owner:e.target.value})} style={{width:'100%',border:'1px solid #d1d5db',borderRadius:8,padding:'8px 12px',fontSize:14,boxSizing:'border-box'}} />
            </div>
            <div>
              <label style={{display:'block',fontSize:14,fontWeight:500,marginBottom:8}}>카테고리</label>
              <div style={{display:'flex',gap:8}}>
                {['영업','기획','개발'].map(cat => {
                  const cc = CATEGORY_COLORS[cat];
                  return (
                    <button key={cat} onClick={()=>setFd({...fd,category:cat})}
                      style={{padding:'6px 16px',borderRadius:20,border:`2px solid ${fd.category===cat?cc.border:'#e5e7eb'}`,background:fd.category===cat?cc.bg:'white',color:fd.category===cat?cc.text:'#6b7280',cursor:'pointer',fontSize:13,fontWeight:fd.category===cat?600:400}}>
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label style={{display:'block',fontSize:14,fontWeight:500,marginBottom:8}}>색상</label>
              <div style={{display:'flex',gap:8}}>
                {colorOpts.map(o=>(
                  <button key={o.name} onClick={()=>setFd({...fd,color:o.name})}
                    style={{display:'flex',flexDirection:'column',alignItems:'center',gap:4,padding:8,borderRadius:8,border:fd.color===o.name?'2px solid #111':'2px solid #e5e7eb',background:'white',cursor:'pointer'}}>
                    <div style={{width:28,height:28,borderRadius:'50%',background:o.color}} />
                    <span style={{fontSize:11}}>{o.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={{display:'block',fontSize:14,fontWeight:500,marginBottom:4}}>
                프로젝트 기간 <span style={{fontSize:12,color:'#9ca3af',fontWeight:400}}>(Task 없을 때 사용)</span>
              </label>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div>
                  <label style={{display:'block',fontSize:12,color:'#6b7280',marginBottom:4}}>시작일</label>
                  <input type="date" value={fd.startDate||''} onChange={e=>setFd({...fd,startDate:e.target.value})}
                    style={{width:'100%',border:'1px solid #d1d5db',borderRadius:8,padding:'8px 12px',fontSize:14,boxSizing:'border-box'}} />
                </div>
                <div>
                  <label style={{display:'block',fontSize:12,color:'#6b7280',marginBottom:4}}>종료일</label>
                  <input type="date" value={fd.endDate||''} onChange={e=>setFd({...fd,endDate:e.target.value})}
                    style={{width:'100%',border:'1px solid #d1d5db',borderRadius:8,padding:'8px 12px',fontSize:14,boxSizing:'border-box'}} />
                </div>
              </div>
            </div>
            <div>
              <label style={{display:'block',fontSize:14,fontWeight:500,marginBottom:4}}>
                진행률 <span style={{fontSize:12,color:'#9ca3af',fontWeight:400}}>(Task 없을 때 사용)</span>
                <span style={{color:'#3b82f6',fontWeight:'bold',marginLeft:8}}>{fd.progress||0}%</span>
              </label>
              <input type="range" min="0" max="100" value={fd.progress||0}
                onChange={e=>setFd({...fd,progress:Number(e.target.value)})} style={{width:'100%'}} />
            </div>
            <div>
              <label style={{display:'block',fontSize:14,fontWeight:500,marginBottom:4}}>설명</label>
              <textarea value={fd.description||''} onChange={e=>setFd({...fd,description:e.target.value})} style={{width:'100%',border:'1px solid #d1d5db',borderRadius:8,padding:'8px 12px',fontSize:14,height:80,boxSizing:'border-box',resize:'vertical'}} />
            </div>
          </div>
          <div style={{display:'flex',justifyContent:'flex-end',gap:8,marginTop:24}}>
            <button onClick={onClose} style={{padding:'8px 16px',border:'1px solid #d1d5db',borderRadius:8,background:'white',cursor:'pointer',fontSize:14}}>취소</button>
            <button onClick={()=>{updateProject(proj.id,fd);onClose();}} style={{padding:'8px 16px',border:'none',borderRadius:8,background:'#3b82f6',color:'white',cursor:'pointer',fontSize:14,fontWeight:500}}>저장</button>
          </div>
        </div>
      </div>
    );
  };

  const TaskEditModal = ({ task, pid, onClose }) => {
    const [fd, setFd] = useState({ ...task });
    const others = projects.find(p=>p.id===pid)?.tasks.filter(t=>t.id!==task.id)||[];
    return (
      <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:50,padding:16}}>
        <div style={{background:'white',borderRadius:12,padding:24,maxWidth:560,width:'100%',maxHeight:'90vh',overflowY:'auto',boxShadow:'0 20px 60px rgba(0,0,0,0.3)'}} onClick={e=>e.stopPropagation()}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
            <h3 style={{fontSize:18,fontWeight:'bold',margin:0}}>Task 편집</h3>
            <button onClick={onClose} style={{border:'none',background:'none',cursor:'pointer',fontSize:20,color:'#9ca3af'}}>✕</button>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:16}}>
            <div><label style={{display:'block',fontSize:14,fontWeight:500,marginBottom:4}}>Task 이름</label>
              <input value={fd.name} onChange={e=>setFd({...fd,name:e.target.value})} style={{width:'100%',border:'1px solid #d1d5db',borderRadius:8,padding:'8px 12px',fontSize:14,boxSizing:'border-box'}} /></div>
            <div><label style={{display:'block',fontSize:14,fontWeight:500,marginBottom:4}}>담당자</label>
              <input value={fd.assignee||''} onChange={e=>setFd({...fd,assignee:e.target.value})} style={{width:'100%',border:'1px solid #d1d5db',borderRadius:8,padding:'8px 12px',fontSize:14,boxSizing:'border-box'}} /></div>
            <div><label style={{display:'block',fontSize:14,fontWeight:500,marginBottom:4}}>설명</label>
              <textarea value={fd.description||''} onChange={e=>setFd({...fd,description:e.target.value})} style={{width:'100%',border:'1px solid #d1d5db',borderRadius:8,padding:'8px 12px',fontSize:14,height:80,boxSizing:'border-box',resize:'vertical'}} /></div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
              <div><label style={{display:'block',fontSize:14,fontWeight:500,marginBottom:4}}>시작일</label>
                <input type="date" value={fd.startDate} onChange={e=>setFd({...fd,startDate:e.target.value})} style={{width:'100%',border:'1px solid #d1d5db',borderRadius:8,padding:'8px 12px',fontSize:14,boxSizing:'border-box'}} /></div>
              <div><label style={{display:'block',fontSize:14,fontWeight:500,marginBottom:4}}>종료일</label>
                <input type="date" value={fd.endDate} onChange={e=>setFd({...fd,endDate:e.target.value})} style={{width:'100%',border:'1px solid #d1d5db',borderRadius:8,padding:'8px 12px',fontSize:14,boxSizing:'border-box'}} /></div>
            </div>
            <div><label style={{display:'block',fontSize:14,fontWeight:500,marginBottom:4}}>진행률: <span style={{color:'#3b82f6',fontWeight:'bold'}}>{fd.progress}%</span></label>
              <input type="range" min="0" max="100" value={fd.progress} onChange={e=>setFd({...fd,progress:Number(e.target.value)})} style={{width:'100%'}} /></div>
            <div><label style={{display:'block',fontSize:14,fontWeight:500,marginBottom:4}}>선행 Task</label>
              <div style={{border:'1px solid #d1d5db',borderRadius:8,padding:8,maxHeight:140,overflowY:'auto'}}>
                {others.length===0
                  ? <p style={{fontSize:14,color:'#9ca3af',textAlign:'center',margin:'8px 0'}}>선택 가능한 Task 없음</p>
                  : others.map(t=>(
                    <label key={t.id} style={{display:'flex',alignItems:'center',gap:8,fontSize:14,cursor:'pointer',padding:'2px 4px',borderRadius:4}}>
                      <input type="checkbox" checked={fd.dependencies?.includes(t.id)}
                        onChange={e=>setFd({...fd,dependencies:e.target.checked?[...(fd.dependencies||[]),t.id]:(fd.dependencies||[]).filter(i=>i!==t.id)})} />
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

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',flexDirection:'column',gap:12,color:'#6b7280'}}>
      <div style={{width:32,height:32,border:'4px solid #93c5fd',borderTopColor:'transparent',borderRadius:'50%',animation:'spin 0.8s linear infinite'}} />
      <p style={{fontSize:14,margin:0}}>Supabase에서 불러오는 중...</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const totalW = LEFT_COL + ASSIGNEE_COL + TIMELINE_W;

  return (
    <div style={{minHeight:'100vh',width:'100%',background:'#f3f4f6',display:'flex',flexDirection:'column',fontFamily:'-apple-system,BlinkMacSystemFont,sans-serif'}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} *{box-sizing:border-box}`}</style>

      {/* Header */}
      <div style={{background:'white',borderBottom:'1px solid #e5e7eb',padding:'16px 24px',flexShrink:0,boxShadow:'0 1px 3px rgba(0,0,0,0.05)'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div>
            <h1 style={{fontSize:20,fontWeight:'bold',color:'#111827',margin:0}}>샌디버스 간트차트</h1>
            <p style={{fontSize:12,color:'#9ca3af',margin:'2px 0 0'}}>2026년 · Supabase 연동</p>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            {saving && (
              <div style={{display:'flex',alignItems:'center',gap:6,fontSize:12,color:'#16a34a',background:'#f0fdf4',padding:'6px 12px',borderRadius:20}}>
                <div style={{width:12,height:12,border:'2px solid #16a34a',borderTopColor:'transparent',borderRadius:'50%',animation:'spin 0.8s linear infinite'}} />
                저장 중...
              </div>
            )}
            <div style={{position:'relative'}}>
              <span style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'#9ca3af',fontSize:14}}>🔍</span>
              <input type="text" placeholder="프로젝트, Task, 담당자 검색..."
                value={searchQuery} onChange={e=>setSearchQuery(e.target.value)}
                style={{paddingLeft:32,paddingRight:16,paddingTop:8,paddingBottom:8,border:'1px solid #d1d5db',borderRadius:8,width:260,fontSize:14,outline:'none'}} />
            </div>
            <button onClick={load} style={{padding:'8px 12px',border:'1px solid #d1d5db',borderRadius:8,background:'white',cursor:'pointer',fontSize:14}} title="새로고침">🔄</button>
            <button onClick={addProject} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 16px',background:'#3b82f6',color:'white',border:'none',borderRadius:8,cursor:'pointer',fontSize:14,fontWeight:500}}>
              + 프로젝트 추가
            </button>
          </div>
        </div>

        {/* 카테고리 필터 */}
        <div style={{display:'flex',gap:8,marginTop:12,alignItems:'center'}}>
          <button onClick={()=>setActiveCategories([])}
            style={{padding:'6px 18px',borderRadius:20,fontSize:13,cursor:'pointer',fontWeight:activeCategories.length===0?600:400,border:activeCategories.length===0?'2px solid #3b82f6':'2px solid #e5e7eb',background:activeCategories.length===0?'#eff6ff':'white',color:activeCategories.length===0?'#1d4ed8':'#6b7280'}}>
            전체 <span style={{marginLeft:4,fontSize:11,opacity:0.7}}>{projects.length}</span>
          </button>
          <div style={{width:1,height:20,background:'#e5e7eb'}} />
          {['영업','기획','개발'].map(cat => {
            const isActive = activeCategories.includes(cat);
            const cc = CATEGORY_COLORS[cat];
            return (
              <button key={cat} onClick={()=>setActiveCategories(prev=>prev.includes(cat)?prev.filter(c=>c!==cat):[...prev,cat])}
                style={{padding:'6px 18px',borderRadius:20,fontSize:13,cursor:'pointer',fontWeight:isActive?600:400,border:isActive?`2px solid ${cc.border}`:'2px solid #e5e7eb',background:isActive?cc.bg:'white',color:isActive?cc.text:'#6b7280'}}>
                {cat} <span style={{marginLeft:4,fontSize:11,opacity:0.7}}>{projects.filter(p=>p.category===cat).length}</span>
              </button>
            );
          })}
          {activeCategories.length > 0 && (
            <button onClick={()=>setActiveCategories([])} style={{marginLeft:4,fontSize:12,color:'#9ca3af',background:'none',border:'none',cursor:'pointer',textDecoration:'underline'}}>초기화</button>
          )}
        </div>
      </div>

      {/* Chart */}
      <div style={{flex:1,overflow:'auto'}}>
        <div style={{minWidth:totalW}}>
          {/* Header row */}
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
            {filtered.length === 0 ? (
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'96px 0',color:'#9ca3af',fontSize:14,gap:12}}>
                <span>{activeCategories.length>0?`${activeCategories.join(', ')} 카테고리에 프로젝트가 없습니다.`:'프로젝트가 없습니다.'}</span>
                <button onClick={addProject} style={{color:'#3b82f6',background:'none',border:'none',cursor:'pointer',fontSize:13}}>+ 프로젝트 추가하기</button>
              </div>
            ) : filtered.map(proj => {
              const c = COLOR_MAP[proj.color] || COLOR_MAP.blue;
              const { pos: projPos, progress: projProg } = getProjectMeta(proj);
              const catColor = CATEGORY_COLORS[proj.category];
              return (
                <React.Fragment key={proj.id}>
                  {/* Project row */}
                  <div style={{display:'flex',borderBottom:'1px solid #e5e7eb',background:c.rowBg}}>
                    <div style={{width:LEFT_COL,minWidth:LEFT_COL,flexShrink:0,display:'flex',alignItems:'flex-start',padding:'8px 12px',borderRight:'1px solid #e5e7eb',gap:8}}>
                      <button onClick={()=>toggleProject(proj.id)} style={{flexShrink:0,padding:2,borderRadius:4,border:'none',background:'none',cursor:'pointer',marginTop:2}}>
                        <span style={{color:c.text,fontSize:14}}>{proj.expanded?'▼':'▶'}</span>
                      </button>
                      <div style={{width:4,borderRadius:2,flexShrink:0,alignSelf:'stretch',background:c.border}} />
                      <div style={{flex:1,minWidth:0,padding:'4px 0'}}>
                        {/* 뱃지 먼저, 프로젝트명 다음 */}
                        <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
                          {catColor && (
                            <span style={{fontSize:11,padding:'2px 8px',borderRadius:10,background:catColor.bg,color:catColor.text,border:`1px solid ${catColor.border}`,fontWeight:600,flexShrink:0,whiteSpace:'nowrap'}}>
                              {proj.category}
                            </span>
                          )}
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
                    <div style={{width:ASSIGNEE_COL,minWidth:ASSIGNEE_COL,flexShrink:0,display:'flex',alignItems:'flex-start',justifyContent:'center',padding:'12px 8px',borderRight:'1px solid #e5e7eb',fontSize:12,color:'#4b5563',textAlign:'center'}}>
                      {proj.owner || <span style={{color:'#d1d5db'}}>-</span>}
                    </div>
                    <div style={{width:TIMELINE_W,minWidth:TIMELINE_W,flexShrink:0,position:'relative',minHeight:52,display:'flex',alignItems:'center'}}>
                      {MONTHS.map((_,i)=><div key={i} style={{width:MONTH_COL,height:'100%',position:'absolute',left:i*MONTH_COL,top:0,borderRight:i<11?'1px solid #f3f4f6':'none'}} />)}
                      {todayLeft!==null && <div style={{position:'absolute',left:todayLeft,top:0,bottom:0,width:2,background:'#ef4444',opacity:0.7,zIndex:5}} />}

                      {/* Task 없는 프로젝트 - 드래그 가능 */}
                      {projPos && proj.tasks.length === 0 && (() => {
                        const isProjDrag = dragging?.pid === proj.id && dragging?.tid === '__proj__';
                        return (
                          <div style={{position:'absolute',left:projPos.left,width:projPos.width,height:22,top:'50%',transform:'translateY(-50%)',background:c.barLight,borderRadius:4,overflow:'visible',border:`1px solid ${c.bar}33`,zIndex:6,cursor:'grab'}}
                            onMouseDown={e=>handleMouseDown(e,proj.id,'__proj__','move')}
                            onMouseEnter={e=>{setTooltip({startDate:proj.startDate,endDate:proj.endDate});setTooltipPos({x:e.clientX,y:e.clientY});}}
                            onMouseMove={e=>setTooltipPos({x:e.clientX,y:e.clientY})}
                            onMouseLeave={()=>{ if(!isProjDrag) setTooltip(null); }}>
                            <div style={{position:'absolute',left:0,top:0,bottom:0,width:8,cursor:'ew-resize',zIndex:8,borderRadius:'4px 0 0 4px'}}
                              onMouseDown={e=>handleMouseDown(e,proj.id,'__proj__','start')} />
                            <div style={{width:`${projProg}%`,height:'100%',background:c.bar,borderRadius:4,overflow:'hidden'}} />
                            <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,color:projProg>50?'#fff':c.text,fontWeight:600,pointerEvents:'none'}}>{projProg}%</div>
                            <div style={{position:'absolute',right:0,top:0,bottom:0,width:8,cursor:'ew-resize',zIndex:8,borderRadius:'0 4px 4px 0'}}
                              onMouseDown={e=>handleMouseDown(e,proj.id,'__proj__','end')} />
                          </div>
                        );
                      })()}

                      {/* Task 있는 프로젝트 - 자동 계산 바 */}
                      {projPos && proj.tasks.length > 0 && (
                        <div style={{position:'absolute',left:projPos.left,width:projPos.width,height:22,top:'50%',transform:'translateY(-50%)',background:c.barLight,borderRadius:4,overflow:'hidden',border:`1px solid ${c.bar}33`,zIndex:6}}>
                          <div style={{width:`${projProg}%`,height:'100%',background:c.bar,borderRadius:4}} />
                          <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,color:projProg>50?'#fff':c.text,fontWeight:600}}>{projProg}%</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Task rows */}
                  {proj.expanded && proj.tasks.map(task => {
                    const pos = getPos(task.startDate, task.endDate);
                    const deps = proj.tasks.filter(t => task.dependencies?.includes(t.id));
                    const isDrag = dragging?.pid === proj.id && dragging?.tid === task.id;
                    return (
                      <div key={task.id} style={{display:'flex',borderBottom:'1px solid #e5e7eb',background:'white'}}>
                        <div style={{width:LEFT_COL,minWidth:LEFT_COL,flexShrink:0,display:'flex',alignItems:'center',padding:'8px 12px',borderRight:'1px solid #e5e7eb'}}>
                          <div style={{paddingLeft:24,display:'flex',alignItems:'flex-start',gap:8,width:'100%'}}>
                            <div style={{flex:1,minWidth:0}}>
                              <div style={{fontSize:14,color:'#1f2937',wordBreak:'break-word',lineHeight:1.4}}>{task.name}</div>
                              {task.description && <div style={{fontSize:12,color:'#9ca3af',wordBreak:'break-word',marginTop:2}}>{task.description}</div>}
                              {deps.length>0 && <div style={{fontSize:12,color:'#7c3aed',background:'#f5f3ff',display:'inline-block',padding:'2px 8px',borderRadius:4,marginTop:2}}>선행: {deps.map(d=>d.name).join(', ')}</div>}
                            </div>
                            <div style={{display:'flex',gap:4,flexShrink:0,marginTop:2}}>
                              <button onClick={()=>setEditingTask({task,pid:proj.id})} style={{padding:4,borderRadius:4,border:'none',background:'none',cursor:'pointer',fontSize:12}}>✏️</button>
                              <button onClick={()=>deleteTask(proj.id,task.id)} style={{padding:4,borderRadius:4,border:'none',background:'none',cursor:'pointer',fontSize:12}}>🗑️</button>
                            </div>
                          </div>
                        </div>
                        <div style={{width:ASSIGNEE_COL,minWidth:ASSIGNEE_COL,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',padding:'8px',borderRight:'1px solid #e5e7eb',fontSize:12,color:'#6b7280'}}>
                          {task.assignee || <span style={{color:'#d1d5db'}}>-</span>}
                        </div>
                        <div style={{width:TIMELINE_W,minWidth:TIMELINE_W,flexShrink:0,position:'relative',minHeight:46,display:'flex',alignItems:'center'}}>
                          {MONTHS.map((_,i)=><div key={i} style={{width:MONTH_COL,height:'100%',position:'absolute',left:i*MONTH_COL,top:0,borderRight:i<11?'1px solid #f3f4f6':'none'}} />)}
                          {todayLeft!==null && <div style={{position:'absolute',left:todayLeft,top:0,bottom:0,width:2,background:'#ef4444',opacity:0.4,zIndex:5}} />}
                          {pos && (
                            <div style={{position:'absolute',left:pos.left,width:pos.width,height:26,top:'50%',transform:'translateY(-50%)',background:c.barLight,borderRadius:5,border:`1px solid ${c.bar}44`,cursor:'grab',zIndex:6,overflow:'visible'}}
                              onMouseDown={e=>handleMouseDown(e,proj.id,task.id,'move')}
                              onMouseEnter={e=>{setTooltip({startDate:task.startDate,endDate:task.endDate});setTooltipPos({x:e.clientX,y:e.clientY});}}
                              onMouseMove={e=>setTooltipPos({x:e.clientX,y:e.clientY})}
                              onMouseLeave={()=>{ if(!isDrag) setTooltip(null); }}>
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
          </div>
        </div>
      </div>

      {/* Legend */}
      <div style={{background:'white',borderTop:'1px solid #e5e7eb',padding:'8px 24px',display:'flex',alignItems:'center',gap:24,fontSize:12,color:'#6b7280',flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',gap:6}}><div style={{width:12,height:12,borderRadius:'50%',background:'#f87171'}} /><span>오늘</span></div>
        <div style={{display:'flex',alignItems:'center',gap:6}}><div style={{width:32,height:12,borderRadius:4,background:'linear-gradient(to right, #3b82f6 50%, #bfdbfe 50%)'}} /><span>진행률</span></div>
        <span style={{marginLeft:'auto',color:'#9ca3af'}}>바를 드래그하여 일정 조정 | 양쪽 끝을 드래그하여 기간 조정</span>
      </div>

      {/* 전역 툴팁 - position fixed로 항상 최상위 */}
      {tooltip?.startDate && (
        <div style={{position:'fixed',left:tooltipPos.x+12,top:tooltipPos.y+12,background:'#1f2937',color:'white',fontSize:11,padding:'4px 10px',borderRadius:5,whiteSpace:'nowrap',pointerEvents:'none',zIndex:99999,boxShadow:'0 2px 8px rgba(0,0,0,0.3)'}}>
          {tooltip.startDate} ~ {tooltip.endDate}
        </div>
      )}

      {editingProject && <ProjectEditModal proj={editingProject} onClose={()=>setEditingProject(null)} />}
      {editingTask && <TaskEditModal task={editingTask.task} pid={editingTask.pid} onClose={()=>setEditingTask(null)} />}
    </div>
  );
}
