'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';

type MonthPoint = { month: string; revenue: number; orders: number; users: number };

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview'|'users'|'orders'|'vendors'>('overview');
  const [chartMode, setChartMode] = useState<'revenue'|'orders'|'users'>('revenue');

  useEffect(() => {
    async function load() {
      const sb = createClient();
      const [
        { count: users },
        { count: orders },
        { count: vendors },
        { count: products },
        { data: allOrders },
        { data: allProfiles },
        { data: vendorProducts },
        { data: recentOrders },
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

      // Build 6-month data
      const months: MonthPoint[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(); d.setMonth(d.getMonth() - i);
        const label = d.toLocaleDateString('en-ZA',{month:'short',year:'2-digit'});
        const y = d.getFullYear(), m = d.getMonth();
        const rev = allOrders?.filter(o=>{ const x=new Date(o.created_at); return x.getFullYear()===y&&x.getMonth()===m; }).reduce((s,o)=>s+(o.total_amount||0),0)||0;
        const ord = allOrders?.filter(o=>{ const x=new Date(o.created_at); return x.getFullYear()===y&&x.getMonth()===m; }).length||0;
        const usr = allProfiles?.filter(o=>{ const x=new Date(o.created_at); return x.getFullYear()===y&&x.getMonth()===m; }).length||0;
        months.push({ month: label, revenue: rev, orders: ord, users: usr });
      }

      // Vendor ranking
      const vm: Record<string,number> = {};
      vendorProducts?.forEach(p=>{ vm[p.vendor_name]=(vm[p.vendor_name]||0)+1; });
      const topVendors = Object.entries(vm).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([name,count])=>({name,count}));

      // MoM change
      const cur = months[5], prev = months[4];
      const revenueChange = prev.revenue ? ((cur.revenue-prev.revenue)/prev.revenue*100).toFixed(1) : '0';
      const ordersChange = prev.orders ? ((cur.orders-prev.orders)/prev.orders*100).toFixed(1) : '0';
      const usersChange = prev.users ? ((cur.users-prev.users)/prev.users*100).toFixed(1) : '0';

      setStats({ users, orders, vendors, products, totalRevenue, months, topVendors, recentOrders, revenueChange, ordersChange, usersChange });
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return (
    <div style={{minHeight:'100vh',background:'#f8fafc',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:16}}>
      <div style={{width:48,height:48,border:'3px solid #e2e8f0',borderTop:'3px solid #3b82f6',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>
      <p style={{color:'#94a3b8',fontSize:15,fontWeight:600,fontFamily:'system-ui'}}>Loading Analytics...</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const chartData = stats.months.map((m: MonthPoint) => m[chartMode]);
  const maxVal = Math.max(...chartData, 1);
  const chartColors = { revenue:'#3b82f6', orders:'#10b981', users:'#8b5cf6' };

  const tabs = [
    { id:'overview', label:'Overview', icon:'📊' },
    { id:'users', label:'Users', icon:'👥' },
    { id:'orders', label:'Orders', icon:'📦' },
    { id:'vendors', label:'Vendors', icon:'🏪' },
  ] as const;

  const statCards = [
    { label:'Total Users', value: stats.users?.toLocaleString()||'0', icon:'👥', accent:'#3b82f6', bg:'#eff6ff', change: `${stats.usersChange}%`, positive: parseFloat(stats.usersChange)>=0 },
    { label:'Total Orders', value: stats.orders?.toLocaleString()||'0', icon:'📦', accent:'#10b981', bg:'#ecfdf5', change: `${stats.ordersChange}%`, positive: parseFloat(stats.ordersChange)>=0 },
    { label:'Gross Revenue', value: `R${stats.totalRevenue?.toLocaleString()||'0'}`, icon:'💰', accent:'#f59e0b', bg:'#fffbeb', change: `${stats.revenueChange}%`, positive: parseFloat(stats.revenueChange)>=0 },
    { label:'Active Vendors', value: stats.vendors?.toLocaleString()||'0', icon:'🏪', accent:'#8b5cf6', bg:'#f5f3ff', change: '+0%', positive: true },
    { label:'Listed Products', value: stats.products?.toLocaleString()||'0', icon:'🛒', accent:'#ec4899', bg:'#fdf2f8', change: '+0%', positive: true },
    { label:'Platform Fee (15%)', value: `R${(stats.totalRevenue*0.15).toFixed(0)}`, icon:'📈', accent:'#14b8a6', bg:'#f0fdfa', change: `${stats.revenueChange}%`, positive: parseFloat(stats.revenueChange)>=0 },
  ];

  return (
    <div style={{minHeight:'100vh',background:'#f8fafc',fontFamily:'system-ui,-apple-system,sans-serif',color:'#0f172a'}}>

      {/* Nav */}
      <nav style={{background:'#fff',borderBottom:'1px solid #e2e8f0',padding:'0 40px',height:68,display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:100,boxShadow:'0 1px 4px rgba(0,0,0,0.04)'}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <div style={{width:42,height:42,background:'linear-gradient(135deg,#10b981,#3b82f6)',borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,fontWeight:900,color:'#fff'}}>G</div>
          <div>
            <div style={{fontWeight:900,fontSize:17,letterSpacing:'-0.5px'}}>Guma Basket</div>
            <div style={{fontSize:10,color:'#94a3b8',fontWeight:800,textTransform:'uppercase',letterSpacing:'1px'}}>Admin Command Center</div>
          </div>
        </div>

        {/* Tab Buttons */}
        <div style={{display:'flex',gap:6}}>
          {tabs.map(t => (
            <button key={t.id} onClick={()=>setActiveTab(t.id)}
              style={{padding:'8px 18px',borderRadius:8,border:'none',cursor:'pointer',fontWeight:700,fontSize:13,display:'flex',alignItems:'center',gap:6,background:activeTab===t.id?'#0f172a':'#f1f5f9',color:activeTab===t.id?'#fff':'#64748b',transition:'all 0.2s'}}>
              <span>{t.icon}</span>{t.label}
            </button>
          ))}
        </div>

        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <div style={{width:8,height:8,borderRadius:'50%',background:'#10b981'}}/>
          <span style={{fontSize:13,color:'#64748b',fontWeight:600}}>Live</span>
        </div>
      </nav>

      <main style={{padding:'40px',maxWidth:1400,margin:'0 auto'}}>

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <>
            <div style={{marginBottom:36}}>
              <h1 style={{fontSize:30,fontWeight:900,letterSpacing:'-1px',marginBottom:6}}>Platform Intelligence</h1>
              <p style={{color:'#64748b',fontSize:15}}>Month-over-month growth tracking for Guma Basket.</p>
            </div>

            {/* Stat Cards */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(230px,1fr))',gap:16,marginBottom:36}}>
              {statCards.map((c,i)=>(
                <div key={i} style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:18,padding:'24px 26px',position:'relative',overflow:'hidden',transition:'all 0.2s',boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}
                  onMouseOver={e=>{e.currentTarget.style.transform='translateY(-3px)';e.currentTarget.style.boxShadow='0 8px 24px rgba(0,0,0,0.08)';}}
                  onMouseOut={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='0 1px 3px rgba(0,0,0,0.04)';}}>
                  <div style={{position:'absolute',top:0,left:0,right:0,height:4,background:c.accent,borderRadius:'18px 18px 0 0'}}/>
                  <div style={{width:40,height:40,background:c.bg,borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,marginBottom:14}}>{c.icon}</div>
                  <div style={{fontSize:11,fontWeight:800,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.8px',marginBottom:8}}>{c.label}</div>
                  <div style={{display:'flex',alignItems:'baseline',gap:10,marginBottom:4}}>
                    <div style={{fontSize:26,fontWeight:900,letterSpacing:'-1px'}}>{c.value}</div>
                    <span style={{fontSize:11,fontWeight:800,color:c.positive?'#10b981':'#ef4444',background:c.positive?'#ecfdf5':'#fff1f2',padding:'3px 8px',borderRadius:20}}>{c.positive?'↑':'↓'} {c.change}</span>
                  </div>
                  <div style={{fontSize:11,color:'#94a3b8'}}>vs last month</div>
                </div>
              ))}
            </div>

            {/* Monthly Chart */}
            <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:20,padding:'32px',boxShadow:'0 1px 3px rgba(0,0,0,0.04)',marginBottom:24}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:32}}>
                <div>
                  <h2 style={{fontWeight:900,fontSize:18,marginBottom:4}}>Monthly Growth Chart</h2>
                  <p style={{color:'#94a3b8',fontSize:13}}>Track increase or decrease across the last 6 months</p>
                </div>
                <div style={{display:'flex',gap:6}}>
                  {(['revenue','orders','users'] as const).map(mode=>(
                    <button key={mode} onClick={()=>setChartMode(mode)}
                      style={{padding:'7px 14px',borderRadius:8,border:'none',cursor:'pointer',fontWeight:700,fontSize:12,textTransform:'capitalize',background:chartMode===mode?chartColors[mode]:'#f1f5f9',color:chartMode===mode?'#fff':'#64748b',transition:'all 0.2s'}}>
                      {mode==='revenue'?'💰 Revenue':mode==='orders'?'📦 Orders':'👥 Users'}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{display:'flex',alignItems:'flex-end',gap:16,height:220}}>
                {stats.months.map((m: MonthPoint, i: number) => {
                  const val = m[chartMode];
                  const prev = i > 0 ? stats.months[i-1][chartMode] : val;
                  const up = val >= prev;
                  return (
                    <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:6,height:'100%',justifyContent:'flex-end'}}>
                      <div style={{fontSize:10,fontWeight:800,color:up?'#10b981':'#ef4444'}}>{i>0?(up?'▲':'▼'):''}</div>
                      <div style={{fontSize:10,fontWeight:700,color:'#64748b'}}>{chartMode==='revenue'?`R${val}`:val}</div>
                      <div
                        title={`${m.month}: ${chartMode==='revenue'?'R':''}${val}`}
                        style={{width:'100%',height:`${Math.max(6,(val/maxVal)*180)}px`,background:up||i===0?`linear-gradient(to top,${chartColors[chartMode]},${chartColors[chartMode]}99)`:'linear-gradient(to top,#ef4444,#fca5a5)',borderRadius:'6px 6px 0 0',transition:'all 0.3s',cursor:'pointer'}}
                        onMouseOver={e=>e.currentTarget.style.opacity='0.8'}
                        onMouseOut={e=>e.currentTarget.style.opacity='1'}
                      />
                      <div style={{fontSize:11,fontWeight:700,color:'#64748b',whiteSpace:'nowrap'}}>{m.month}</div>
                    </div>
                  );
                })}
              </div>

              <div style={{marginTop:20,padding:'16px',background:'#f8fafc',borderRadius:12,display:'flex',gap:24,fontSize:12,fontWeight:700,color:'#64748b'}}>
                <span style={{color:'#10b981'}}>▲ Blue = Increase</span>
                <span style={{color:'#ef4444'}}>▼ Red = Decrease</span>
                <span>Hover bars for exact values</span>
              </div>
            </div>
          </>
        )}

        {/* USERS TAB */}
        {activeTab === 'users' && (
          <>
            <div style={{marginBottom:32}}>
              <h1 style={{fontSize:30,fontWeight:900,letterSpacing:'-1px',marginBottom:6}}>👥 User Growth</h1>
              <p style={{color:'#64748b',fontSize:15}}>Monthly customer registration trends.</p>
            </div>
            <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:20,padding:'32px',boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>
              <h2 style={{fontWeight:900,fontSize:18,marginBottom:28}}>New Users Per Month</h2>
              <div style={{display:'flex',alignItems:'flex-end',gap:16,height:260}}>
                {stats.months.map((m: MonthPoint, i: number)=>{
                  const prev = i>0?stats.months[i-1].users:m.users;
                  const up = m.users>=prev;
                  const maxU = Math.max(...stats.months.map((x: MonthPoint)=>x.users),1);
                  return (
                    <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:6,height:'100%',justifyContent:'flex-end'}}>
                      {i>0&&<div style={{fontSize:11,fontWeight:800,color:up?'#10b981':'#ef4444'}}>{up?'▲':'▼'}</div>}
                      <div style={{fontSize:12,fontWeight:700,color:'#64748b'}}>{m.users}</div>
                      <div style={{width:'100%',height:`${Math.max(6,(m.users/maxU)*220)}px`,background:up||i===0?'linear-gradient(to top,#8b5cf6,#c4b5fd)':'linear-gradient(to top,#ef4444,#fca5a5)',borderRadius:'6px 6px 0 0'}}/>
                      <div style={{fontSize:11,fontWeight:700,color:'#64748b'}}>{m.month}</div>
                    </div>
                  );
                })}
              </div>
              <div style={{marginTop:20,display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16}}>
                {[{label:'Total Users',val:stats.users},{label:'This Month',val:stats.months[5].users},{label:'Last Month',val:stats.months[4].users}].map((s,i)=>(
                  <div key={i} style={{background:'#f8fafc',borderRadius:12,padding:'20px',textAlign:'center'}}>
                    <div style={{fontSize:11,color:'#94a3b8',fontWeight:700,marginBottom:8,textTransform:'uppercase'}}>{s.label}</div>
                    <div style={{fontSize:28,fontWeight:900,color:'#0f172a'}}>{s.val}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ORDERS TAB */}
        {activeTab === 'orders' && (
          <>
            <div style={{marginBottom:32}}>
              <h1 style={{fontSize:30,fontWeight:900,letterSpacing:'-1px',marginBottom:6}}>📦 Order Analytics</h1>
              <p style={{color:'#64748b',fontSize:15}}>Monthly order volume and revenue breakdown.</p>
            </div>
            <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:20,padding:'32px',marginBottom:20,boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>
              <h2 style={{fontWeight:900,fontSize:18,marginBottom:28}}>Orders & Revenue Per Month</h2>
              <div style={{display:'flex',alignItems:'flex-end',gap:16,height:240}}>
                {stats.months.map((m: MonthPoint, i: number)=>{
                  const prev = i>0?stats.months[i-1].revenue:m.revenue;
                  const up = m.revenue>=prev;
                  const maxR = Math.max(...stats.months.map((x: MonthPoint)=>x.revenue),1);
                  return (
                    <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:6,height:'100%',justifyContent:'flex-end'}}>
                      {i>0&&<div style={{fontSize:11,fontWeight:800,color:up?'#10b981':'#ef4444'}}>{up?'▲':'▼'}</div>}
                      <div style={{fontSize:11,fontWeight:700,color:'#64748b'}}>R{m.revenue}</div>
                      <div style={{width:'100%',height:`${Math.max(6,(m.revenue/maxR)*200)}px`,background:up||i===0?'linear-gradient(to top,#10b981,#6ee7b7)':'linear-gradient(to top,#ef4444,#fca5a5)',borderRadius:'6px 6px 0 0'}}/>
                      <div style={{fontSize:10,fontWeight:700,color:'#94a3b8'}}>{m.orders} ord</div>
                      <div style={{fontSize:11,fontWeight:700,color:'#64748b'}}>{m.month}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:20,padding:'32px',boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>
              <h2 style={{fontWeight:900,fontSize:18,marginBottom:24}}>Recent Orders</h2>
              {stats.recentOrders?.map((o: any, i: number)=>{
                const sc: Record<string,string> = {completed:'#10b981',pending:'#f59e0b',cancelled:'#ef4444',preparing:'#3b82f6',ready:'#8b5cf6'};
                const sb: Record<string,string> = {completed:'#ecfdf5',pending:'#fffbeb',cancelled:'#fff1f2',preparing:'#eff6ff',ready:'#f5f3ff'};
                return (
                  <div key={i} style={{display:'grid',gridTemplateColumns:'1fr 1fr 130px 110px',gap:16,padding:'14px 16px',borderRadius:10,background:i%2===0?'#f8fafc':'#fff',alignItems:'center',marginBottom:2}}>
                    <span style={{fontSize:12,fontFamily:'monospace',color:'#94a3b8'}}>#{o.id?.slice(0,10)}</span>
                    <span style={{fontWeight:600,fontSize:13}}>{o.customer_name||'Anonymous'}</span>
                    <span style={{fontWeight:900,fontSize:15}}>R{o.total_amount?.toFixed(2)}</span>
                    <span style={{fontSize:11,fontWeight:800,color:sc[o.status]||'#94a3b8',background:sb[o.status]||'#f1f5f9',padding:'4px 10px',borderRadius:20,textTransform:'uppercase',width:'fit-content'}}>{o.status}</span>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* VENDORS TAB */}
        {activeTab === 'vendors' && (
          <>
            <div style={{marginBottom:32}}>
              <h1 style={{fontSize:30,fontWeight:900,letterSpacing:'-1px',marginBottom:6}}>🏪 Vendor Overview</h1>
              <p style={{color:'#64748b',fontSize:15}}>Registered sellers and their performance.</p>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
              <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:20,padding:'32px',boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>
                <h2 style={{fontWeight:900,fontSize:18,marginBottom:24}}>Top Vendors by Products</h2>
                {stats.topVendors.map((v: any, i: number)=>{
                  const maxC = stats.topVendors[0]?.count||1;
                  const colors = ['#3b82f6','#10b981','#f59e0b','#8b5cf6','#ec4899','#14b8a6'];
                  return (
                    <div key={i} style={{marginBottom:20}}>
                      <div style={{display:'flex',justifyContent:'space-between',marginBottom:8,fontSize:13}}>
                        <span style={{fontWeight:700}}>{i+1}. {v.name}</span>
                        <span style={{color:'#94a3b8',fontWeight:600}}>{v.count} items</span>
                      </div>
                      <div style={{height:8,background:'#f1f5f9',borderRadius:10}}>
                        <div style={{height:'100%',width:`${(v.count/maxC)*100}%`,background:colors[i%colors.length],borderRadius:10,transition:'width 1s ease'}}/>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:16}}>
                {[{label:'Total Vendors',val:stats.vendors,icon:'🏪',color:'#8b5cf6',bg:'#f5f3ff'},{label:'Total Products',val:stats.products,icon:'🛒',color:'#ec4899',bg:'#fdf2f8'},{label:'Avg Products/Vendor',val:stats.vendors?Math.round(stats.products/stats.vendors):0,icon:'📊',color:'#f59e0b',bg:'#fffbeb'}].map((s,i)=>(
                  <div key={i} style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:18,padding:'28px',boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>
                    <div style={{width:44,height:44,background:s.bg,borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,marginBottom:12}}>{s.icon}</div>
                    <div style={{fontSize:11,color:'#94a3b8',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.8px',marginBottom:6}}>{s.label}</div>
                    <div style={{fontSize:36,fontWeight:900,color:'#0f172a'}}>{s.val}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        <div style={{marginTop:40,paddingTop:24,borderTop:'1px solid #e2e8f0',display:'flex',justifyContent:'space-between',color:'#cbd5e1',fontSize:12,fontWeight:600}}>
          <span>Guma Basket Admin • Private & Confidential</span>
          <span>Real-time Supabase data</span>
        </div>
      </main>
    </div>
  );
}
