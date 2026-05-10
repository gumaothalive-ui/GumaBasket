'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';

type MP = { month: string; revenue: number; orders: number; users: number };

const C = {
  bg: '#f6f8fa', sidebar: '#ffffff', card: '#ffffff',
  border: '#e1e4e8', text: '#24292f', muted: '#656d76',
  blue: '#0969da', green: '#1a7f37', red: '#cf222e',
  purple: '#8250df', orange: '#bc4c00', teal: '#0a6481',
  blueBg: '#ddf4ff', greenBg: '#dafbe1', redBg: '#ffebe9',
  purpleBg: '#fbefff',
};

function LineChart({ data, color, height = 60 }: { data: number[]; color: string; height?: number }) {
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const w = 200, h = height;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * (h - 8) - 4}`).join(' ');
  const fill = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * (h - 8) - 4}`).join(' ') + ` ${w},${h} 0,${h}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`g${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={fill} fill={`url(#g${color.replace('#','')})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BarChart({ months, mode }: { months: MP[]; mode: 'revenue'|'orders'|'users' }) {
  const vals = months.map(m => m[mode]);
  const max = Math.max(...vals, 1);
  const colors = { revenue: C.blue, orders: C.green, users: C.purple };
  const col = colors[mode];
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 200, padding: '0 4px' }}>
      {months.map((m, i) => {
        const prev = i > 0 ? vals[i-1] : vals[0];
        const up = vals[i] >= prev;
        const barColor = i === 0 ? col : (up ? col : C.red);
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
            {i > 0 && <div style={{ fontSize: 10, fontWeight: 700, color: up ? C.green : C.red }}>{up ? '▲' : '▼'}</div>}
            <div style={{ fontSize: 10, fontWeight: 600, color: C.muted }}>{mode === 'revenue' ? `R${vals[i]}` : vals[i]}</div>
            <div
              style={{ width: '100%', height: `${Math.max(4, (vals[i] / max) * 170)}px`, background: barColor, borderRadius: '4px 4px 0 0', opacity: 0.85, transition: 'opacity 0.2s', cursor: 'pointer' }}
              onMouseOver={e => e.currentTarget.style.opacity = '1'}
              onMouseOut={e => e.currentTarget.style.opacity = '0.85'}
            />
            <div style={{ fontSize: 11, fontWeight: 500, color: C.muted, textAlign: 'center' }}>{m.month}</div>
          </div>
        );
      })}
    </div>
  );
}

export default function Admin() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'overview'|'users'|'orders'|'vendors'>('overview');
  const [chartMode, setChartMode] = useState<'revenue'|'orders'|'users'>('revenue');

  useEffect(() => {
    async function load() {
      const sb = createClient();
      const [
        { count: users }, { count: orders }, { count: vendors }, { count: products },
        { data: allOrders }, { data: allProfiles }, { data: vendorProds }, { data: recent },
      ] = await Promise.all([
        sb.from('profiles').select('*',{count:'exact',head:true}),
        sb.from('orders').select('*',{count:'exact',head:true}),
        sb.from('sellers').select('*',{count:'exact',head:true}),
        sb.from('products').select('*',{count:'exact',head:true}),
        sb.from('orders').select('created_at,total_amount'),
        sb.from('profiles').select('created_at'),
        sb.from('products').select('vendor_name'),
        sb.from('orders').select('id,created_at,total_amount,status,customer_name').order('created_at',{ascending:false}).limit(10),
      ]);
      const totalRevenue = allOrders?.reduce((s,o)=>s+(o.total_amount||0),0)||0;
      const months: MP[] = Array.from({length:6},(_,i)=>{
        const d=new Date(); d.setMonth(d.getMonth()-5+i);
        const label=d.toLocaleDateString('en-ZA',{month:'short',year:'2-digit'});
        const y=d.getFullYear(),m=d.getMonth();
        const inMonth=(row: any)=>{ const x=new Date(row.created_at); return x.getFullYear()===y&&x.getMonth()===m; };
        return {
          month: label,
          revenue: allOrders?.filter(inMonth).reduce((s,o)=>s+(o.total_amount||0),0)||0,
          orders: allOrders?.filter(inMonth).length||0,
          users: allProfiles?.filter(inMonth).length||0,
        };
      });
      const vm: Record<string,number>={};
      vendorProds?.forEach(p=>{vm[p.vendor_name]=(vm[p.vendor_name]||0)+1;});
      const topVendors=Object.entries(vm).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([name,count])=>({name,count}));
      const cur=months[5], prev=months[4];
      setStats({
        users, orders, vendors, products, totalRevenue, months, topVendors, recent,
        revChange: prev.revenue?((cur.revenue-prev.revenue)/prev.revenue*100).toFixed(1):'0',
        ordChange: prev.orders?((cur.orders-prev.orders)/prev.orders*100).toFixed(1):'0',
        usrChange: prev.users?((cur.users-prev.users)/prev.users*100).toFixed(1):'0',
      });
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return (
    <div style={{minHeight:'100vh',background:C.bg,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:16}}>
      <div style={{width:44,height:44,border:`3px solid ${C.border}`,borderTop:`3px solid ${C.blue}`,borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/>
      <p style={{color:C.muted,fontSize:14,fontWeight:500}}>Loading analytics…</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const navItems = [
    {id:'overview',icon:'▦',label:'Overview'},
    {id:'users',icon:'◉',label:'Users'},
    {id:'orders',icon:'▣',label:'Orders'},
    {id:'vendors',icon:'◈',label:'Vendors'},
  ] as const;

  const kpis = [
    {label:'Total Users',val:stats.users?.toLocaleString(),sub:'Registered customers',chg:stats.usrChange,spark:stats.months.map((m:MP)=>m.users),color:C.blue,bg:C.blueBg},
    {label:'Total Orders',val:stats.orders?.toLocaleString(),sub:'All-time orders',chg:stats.ordChange,spark:stats.months.map((m:MP)=>m.orders),color:C.green,bg:C.greenBg},
    {label:'Gross Revenue',val:`R${stats.totalRevenue?.toLocaleString()}`,sub:'Platform transactions',chg:stats.revChange,spark:stats.months.map((m:MP)=>m.revenue),color:C.purple,bg:C.purpleBg},
    {label:'Active Vendors',val:stats.vendors?.toLocaleString(),sub:'Registered sellers',chg:'0',spark:[0,0,0,0,0,stats.vendors],color:C.orange,bg:'#fff8f0'},
    {label:'Listed Products',val:stats.products?.toLocaleString(),sub:'Marketplace items',chg:'0',spark:[0,0,0,0,0,stats.products],color:C.teal,bg:'#f0f9ff'},
    {label:'Platform Fee',val:`R${(stats.totalRevenue*0.15).toFixed(0)}`,sub:'Est. 15% earnings',chg:stats.revChange,spark:stats.months.map((m:MP)=>m.revenue*0.15),color:C.green,bg:C.greenBg},
  ];

  return (
    <div style={{display:'flex',minHeight:'100vh',background:C.bg,fontFamily:"'Inter',system-ui,sans-serif",color:C.text}}>
      {/* Sidebar */}
      <aside style={{width:240,background:C.sidebar,borderRight:`1px solid ${C.border}`,display:'flex',flexDirection:'column',position:'fixed',top:0,left:0,bottom:0,zIndex:50}}>
        <div style={{padding:'20px 16px',borderBottom:`1px solid ${C.border}`}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:32,height:32,background:'linear-gradient(135deg,#10b981,#3b82f6)',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontWeight:800,fontSize:16}}>G</div>
            <div>
              <div style={{fontWeight:700,fontSize:14,color:C.text}}>Guma Basket</div>
              <div style={{fontSize:11,color:C.muted}}>Admin Analytics</div>
            </div>
          </div>
        </div>

        <nav style={{padding:'12px 8px',flex:1}}>
          <div style={{fontSize:11,fontWeight:600,color:C.muted,padding:'8px 8px 4px',textTransform:'uppercase',letterSpacing:'0.5px'}}>Analytics</div>
          {navItems.map(n=>(
            <button key={n.id} onClick={()=>setTab(n.id)}
              style={{width:'100%',display:'flex',alignItems:'center',gap:10,padding:'8px 10px',borderRadius:6,border:'none',cursor:'pointer',fontSize:14,fontWeight:tab===n.id?600:400,background:tab===n.id?'#ddf4ff':'transparent',color:tab===n.id?C.blue:C.text,transition:'all 0.15s',textAlign:'left',marginBottom:2}}>
              <span style={{fontSize:16}}>{n.icon}</span>{n.label}
            </button>
          ))}
        </nav>

        <div style={{padding:'16px',borderTop:`1px solid ${C.border}`}}>
          <div style={{display:'flex',alignItems:'center',gap:8,padding:'10px',borderRadius:8,background:C.greenBg}}>
            <div style={{width:8,height:8,borderRadius:'50%',background:C.green,flexShrink:0}}/>
            <div>
              <div style={{fontSize:12,fontWeight:600,color:C.green}}>Live Data</div>
              <div style={{fontSize:11,color:C.muted}}>Supabase connected</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div style={{marginLeft:240,flex:1,display:'flex',flexDirection:'column'}}>
        {/* Top bar */}
        <header style={{background:C.sidebar,borderBottom:`1px solid ${C.border}`,padding:'12px 32px',display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:40}}>
          <div>
            <h1 style={{fontSize:16,fontWeight:600,margin:0,color:C.text,textTransform:'capitalize'}}>{tab === 'overview' ? 'Platform Overview' : `${tab.charAt(0).toUpperCase()+tab.slice(1)} Analytics`}</h1>
            <p style={{fontSize:12,color:C.muted,margin:0}}>Last updated just now</p>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <div style={{fontSize:12,color:C.muted,background:C.bg,border:`1px solid ${C.border}`,padding:'6px 14px',borderRadius:6,fontWeight:500}}>Last 6 months</div>
          </div>
        </header>

        <main style={{padding:'28px 32px',flex:1}}>

          {/* OVERVIEW */}
          {tab === 'overview' && (
            <>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,marginBottom:24}}>
                {kpis.map((k,i)=>{
                  const up = parseFloat(k.chg)>=0;
                  return (
                    <div key={i} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:'20px',overflow:'hidden',position:'relative'}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12}}>
                        <div>
                          <div style={{fontSize:12,color:C.muted,fontWeight:500,marginBottom:6}}>{k.label}</div>
                          <div style={{fontSize:26,fontWeight:700,color:C.text,letterSpacing:'-0.5px'}}>{k.val}</div>
                        </div>
                        <span style={{fontSize:12,fontWeight:600,color:up?C.green:C.red,background:up?C.greenBg:C.redBg,padding:'3px 8px',borderRadius:20,whiteSpace:'nowrap'}}>
                          {up?'↑':'↓'} {Math.abs(parseFloat(k.chg))}%
                        </span>
                      </div>
                      <div style={{fontSize:11,color:C.muted,marginBottom:8}}>{k.sub}</div>
                      <LineChart data={k.spark} color={k.color} height={48} />
                    </div>
                  );
                })}
              </div>

              {/* Monthly chart */}
              <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:'24px',marginBottom:20}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
                  <div>
                    <h2 style={{fontSize:15,fontWeight:600,margin:'0 0 4px'}}>Monthly Trends</h2>
                    <p style={{fontSize:12,color:C.muted,margin:0}}>Month-over-month growth — blue = up, red = down</p>
                  </div>
                  <div style={{display:'flex',gap:6}}>
                    {(['revenue','orders','users'] as const).map(m=>(
                      <button key={m} onClick={()=>setChartMode(m)}
                        style={{padding:'6px 14px',borderRadius:6,border:`1px solid ${chartMode===m?C.blue:C.border}`,cursor:'pointer',fontSize:12,fontWeight:500,background:chartMode===m?C.blueBg:'#fff',color:chartMode===m?C.blue:C.muted,transition:'all 0.15s'}}>
                        {m.charAt(0).toUpperCase()+m.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                <BarChart months={stats.months} mode={chartMode} />
                <div style={{display:'flex',gap:20,marginTop:16,fontSize:12,color:C.muted}}>
                  <span style={{color:C.green}}>▲ Increase vs previous month</span>
                  <span style={{color:C.red}}>▼ Decrease vs previous month</span>
                </div>
              </div>
            </>
          )}

          {/* USERS */}
          {tab === 'users' && (
            <>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,marginBottom:24}}>
                {[{label:'Total Users',val:stats.users,color:C.blue},{label:'This Month',val:stats.months[5].users,color:C.green},{label:'Last Month',val:stats.months[4].users,color:C.purple}].map((s,i)=>(
                  <div key={i} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:'24px'}}>
                    <div style={{fontSize:12,color:C.muted,fontWeight:500,marginBottom:8}}>{s.label}</div>
                    <div style={{fontSize:32,fontWeight:700,color:s.color}}>{s.val?.toLocaleString()}</div>
                  </div>
                ))}
              </div>
              <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:'24px'}}>
                <h2 style={{fontSize:15,fontWeight:600,margin:'0 0 20px'}}>New User Registrations — Monthly</h2>
                <BarChart months={stats.months} mode="users" />
              </div>
            </>
          )}

          {/* ORDERS */}
          {tab === 'orders' && (
            <>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,marginBottom:24}}>
                {[{label:'Total Orders',val:stats.orders,color:C.green},{label:'Gross Revenue',val:`R${stats.totalRevenue?.toLocaleString()}`,color:C.blue},{label:'This Month',val:stats.months[5].orders,color:C.purple}].map((s,i)=>(
                  <div key={i} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:'24px'}}>
                    <div style={{fontSize:12,color:C.muted,fontWeight:500,marginBottom:8}}>{s.label}</div>
                    <div style={{fontSize:32,fontWeight:700,color:s.color}}>{s.val?.toLocaleString?.()??s.val}</div>
                  </div>
                ))}
              </div>
              <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:'24px',marginBottom:20}}>
                <h2 style={{fontSize:15,fontWeight:600,margin:'0 0 20px'}}>Revenue Per Month</h2>
                <BarChart months={stats.months} mode="revenue" />
              </div>
              <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:'24px'}}>
                <h2 style={{fontSize:15,fontWeight:600,margin:'0 0 16px'}}>Recent Orders</h2>
                <table style={{width:'100%',borderCollapse:'collapse'}}>
                  <thead>
                    <tr style={{borderBottom:`1px solid ${C.border}`}}>
                      {['Order ID','Customer','Amount','Status','Date'].map(h=>(
                        <th key={h} style={{textAlign:'left',padding:'8px 12px',fontSize:11,fontWeight:600,color:C.muted,textTransform:'uppercase',letterSpacing:'0.4px'}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {stats.recent?.map((o: any,i: number)=>{
                      const sc: Record<string,string>={completed:C.green,pending:'#b45309',cancelled:C.red,preparing:C.blue,ready:C.purple};
                      const sb: Record<string,string>={completed:C.greenBg,pending:'#fef3c7',cancelled:C.redBg,preparing:C.blueBg,ready:C.purpleBg};
                      return (
                        <tr key={i} style={{borderBottom:`1px solid ${C.border}`,background:i%2===0?'#fafbfc':'#fff'}}>
                          <td style={{padding:'12px',fontSize:12,fontFamily:'monospace',color:C.muted}}>#{o.id?.slice(0,10)}</td>
                          <td style={{padding:'12px',fontSize:13,fontWeight:500}}>{o.customer_name||'—'}</td>
                          <td style={{padding:'12px',fontSize:13,fontWeight:700}}>R{o.total_amount?.toFixed(2)}</td>
                          <td style={{padding:'12px'}}>
                            <span style={{fontSize:11,fontWeight:600,color:sc[o.status]||C.muted,background:sb[o.status]||C.bg,padding:'3px 10px',borderRadius:20,textTransform:'capitalize'}}>{o.status}</span>
                          </td>
                          <td style={{padding:'12px',fontSize:12,color:C.muted}}>{new Date(o.created_at).toLocaleDateString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* VENDORS */}
          {tab === 'vendors' && (
            <>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,marginBottom:24}}>
                {[{label:'Total Vendors',val:stats.vendors,color:C.purple},{label:'Total Products',val:stats.products,color:C.blue},{label:'Avg Products / Vendor',val:stats.vendors?Math.round(stats.products/stats.vendors):0,color:C.green}].map((s,i)=>(
                  <div key={i} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:'24px'}}>
                    <div style={{fontSize:12,color:C.muted,fontWeight:500,marginBottom:8}}>{s.label}</div>
                    <div style={{fontSize:32,fontWeight:700,color:s.color}}>{s.val?.toLocaleString()}</div>
                  </div>
                ))}
              </div>
              <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:'24px'}}>
                <h2 style={{fontSize:15,fontWeight:600,margin:'0 0 20px'}}>Top Vendors by Listings</h2>
                {stats.topVendors.map((v: any,i: number)=>{
                  const max=stats.topVendors[0]?.count||1;
                  const cols=[C.blue,C.green,'#f59e0b',C.purple,'#ec4899',C.teal];
                  return (
                    <div key={i} style={{marginBottom:18}}>
                      <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                        <span style={{fontSize:13,fontWeight:500}}>{i+1}. {v.name}</span>
                        <span style={{fontSize:12,color:C.muted}}>{v.count} items</span>
                      </div>
                      <div style={{height:8,background:C.bg,borderRadius:10,border:`1px solid ${C.border}`}}>
                        <div style={{height:'100%',width:`${(v.count/max)*100}%`,background:cols[i%cols.length],borderRadius:10,transition:'width 0.8s ease'}}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </main>

        <footer style={{padding:'16px 32px',borderTop:`1px solid ${C.border}`,background:C.card,fontSize:12,color:C.muted,display:'flex',justifyContent:'space-between'}}>
          <span>Guma Basket Admin • Private & Confidential</span>
          <span>Real-time Supabase data</span>
        </footer>
      </div>
    </div>
  );
}
