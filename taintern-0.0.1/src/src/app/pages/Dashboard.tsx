import { Banknote, Users, AlertCircle, Zap, ShieldCheck, ArrowRight, Table2, CreditCard, LayoutDashboard, Settings, FileCheck, ChevronRight, TrendingUp, Activity, Database } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useAppData } from '../lib/AppDataContext';
import { formatVND, parseMoneyToNumber } from '../lib/data-utils';
import { StatCard } from '../components/StatCard';
import { motion } from 'motion/react';
import { DashboardCharts } from '../components/DashboardCharts';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1]
    }
  }
} as const;

export function Dashboard() {
  const navigate = useNavigate();
  const { appData } = useAppData();

  const totalPayroll = appData.Final_Centers.data.reduce((sum, row) => {
    const amt = parseMoneyToNumber(row["TOTAL PAYMENT"] || 0);
    return sum + amt;
  }, 0);

  const totalInterns = appData.Final_Centers.data.length;
  const totalAuditErrors = appData.AuditReport.data.length;

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex-1 flex flex-col h-full overflow-y-auto bg-transparent p-10 gap-12 max-w-[1600px] mx-auto w-full"
    >
      {/* Header Section */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center border-2 border-slate-900 shadow-hard-sm">
              <Activity className="w-5 h-5 text-slate-900" />
            </div>
            <div className="flex flex-col">
              <span className="text-[0.625rem] font-black uppercase tracking-[0.3em] text-slate-400 leading-none">System Status</span>
              <span className="text-[0.625rem] font-black uppercase tracking-[0.3em] text-emerald-500 mt-1 leading-none">Operational</span>
            </div>
          </div>
          <h1 className="text-6xl font-normal text-slate-900 tracking-tighter leading-none">
            Payroll <span className="italic text-slate-400">Intelligence</span>
          </h1>
          <p className="text-slate-500 max-w-lg text-sm font-medium leading-relaxed">
            Enterprise-grade payroll management and audit system. Monitor real-time distribution and detect discrepancies with AI.
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/audit')}
            className="flex items-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 transition-all shadow-hard-sm group border-2 border-slate-900 active:translate-y-1 active:shadow-sm"
          >
            <FileCheck className="w-4 h-4 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-black uppercase tracking-[0.2em]">Run Audit</span>
          </button>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <StatCard 
          title="Total Payroll"
          value={formatVND(totalPayroll)}
          icon={Banknote}
          iconColor="text-emerald-600"
          iconBgColor="bg-emerald-50"
          subtitle="Current Cycle Distribution"
          onClick={() => navigate('/payment')}
        />
        <StatCard 
          title="Active Interns"
          value={totalInterns}
          icon={Users}
          iconColor="text-blue-600"
          iconBgColor="bg-blue-50"
          subtitle="Total Headcount Tracking"
          onClick={() => navigate('/centers')}
        />
        <StatCard 
          title="Audit Exceptions"
          value={totalAuditErrors}
          icon={AlertCircle}
          iconColor="text-rose-600"
          iconBgColor="bg-rose-50"
          subtitle="Critical Items Flagged"
          onClick={() => navigate('/audit')}
        />
      </motion.div>

      {/* Charts Section */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center gap-3 mb-8">
          <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center border-2 border-slate-200">
            <TrendingUp className="w-4 h-4 text-slate-400" />
          </div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">
            Data <span className="italic text-primary">Visualization</span>
          </h2>
        </div>
        <DashboardCharts />
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Quick Access Column */}
        <motion.div variants={itemVariants} className="lg:col-span-3 space-y-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center border-2 border-slate-200">
              <Zap className="w-4 h-4 text-slate-400" />
            </div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">
              Quick <span className="italic text-primary">Actions</span>
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { title: 'Master AE', icon: Database, path: '/master-ae', desc: 'Manage AE data sheets', color: 'text-amber-500', bg: 'bg-amber-50' },
              { title: 'Pivot Report', icon: Table2, path: '/pivot', desc: 'Generate pivot summaries', color: 'text-blue-600', bg: 'bg-blue-50' },
              { title: 'Bulk Payment', icon: CreditCard, path: '/payment', desc: 'Process bank exports', color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { title: 'Audit Center', icon: ShieldCheck, path: '/audit', desc: 'Compare payroll data', color: 'text-rose-600', bg: 'bg-rose-50' },
            ].map((link) => (
              <motion.div
                key={link.path}
                whileHover={{ x: 10 }}
                onClick={() => navigate(link.path)}
                className="group p-6 bg-white/65 backdrop-blur-2xl border-2 border-slate-100 rounded-[2rem] shadow-hard-sm hover:shadow-hard-lg hover:border-slate-900 transition-all cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-5">
                  <div className={`p-4 ${link.bg} rounded-2xl group-hover:bg-slate-900 group-hover:text-white transition-all duration-300 border-2 border-transparent group-hover:border-slate-800`}>
                    <link.icon className={`w-6 h-6 ${link.color} group-hover:text-white transition-colors`} />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 uppercase text-[0.75rem] tracking-[0.15em] mb-1">{link.title}</h3>
                    <p className="text-[0.625rem] text-slate-400 font-black uppercase tracking-[0.1em]">{link.desc}</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-200 group-hover:text-slate-900 group-hover:translate-x-1 transition-all" />
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
