import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import JobExplorer from './pages/JobExplorer';
import QueueManager from './pages/QueueManager';
import WorkerMonitor from './pages/WorkerMonitor';
import DLQManager from './pages/DLQManager';
import CronSchedules from './pages/CronSchedules';
import JobDetailDrawer from './pages/JobDetailDrawer';
import CreateJobModal from './pages/CreateJobModal';
import Login from './pages/Login';

const MainLayout = () => {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  useEffect(() => {
    let timer;
    if (autoRefresh) {
      timer = setInterval(() => {
        setLastRefreshed(new Date());
      }, 3000);
    }
    return () => clearInterval(timer);
  }, [autoRefresh]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0f17] flex items-center justify-center text-cyan-400 font-mono text-xs">
        Initializing Developer Console...
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const getTabTitles = () => {
    switch (activeTab) {
      case 'dashboard':
        return { title: 'Executive Overview', subtitle: 'Real-time telemetry, queue throughput, and worker node health' };
      case 'jobs':
        return { title: 'Job Explorer', subtitle: 'Search, filter, and inspect execution states & historical logs' };
      case 'queues':
        return { title: 'Queue Manager', subtitle: 'Control queue status, concurrency limits, and execution priorities' };
      case 'workers':
        return { title: 'Worker Node Fleet', subtitle: 'Monitor worker heartbeats, current capacity, and process nodes' };
      case 'dlq':
        return { title: 'Dead Letter Queue (DLQ)', subtitle: 'Audit failed jobs, analyze root causes, and redrive executions' };
      case 'schedules':
        return { title: 'Recurring Cron Schedules', subtitle: 'Automated job generation driven by cron expressions' };
      default:
        return { title: 'Dashboard', subtitle: '' };
    }
  };

  const { title, subtitle } = getTabTitles();

  return (
    <div className="flex min-h-screen bg-[#0b0f17] text-slate-100 font-sans">
      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenCreateModal={() => setIsCreateModalOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          title={title}
          subtitle={subtitle}
          onRefresh={() => setLastRefreshed(new Date())}
          autoRefresh={autoRefresh}
          setAutoRefresh={setAutoRefresh}
          lastRefreshed={lastRefreshed}
        />

        <main className="flex-1 overflow-y-auto">
          {activeTab === 'dashboard' && <Dashboard key={lastRefreshed.getTime()} onSelectTab={setActiveTab} />}
          {activeTab === 'jobs' && <JobExplorer key={lastRefreshed.getTime()} onSelectJob={(id) => setSelectedJobId(id)} />}
          {activeTab === 'queues' && <QueueManager key={lastRefreshed.getTime()} />}
          {activeTab === 'workers' && <WorkerMonitor key={lastRefreshed.getTime()} />}
          {activeTab === 'dlq' && <DLQManager key={lastRefreshed.getTime()} />}
          {activeTab === 'schedules' && <CronSchedules key={lastRefreshed.getTime()} />}
        </main>
      </div>

      {/* Job Detail Slide-over Drawer */}
      {selectedJobId && (
        <JobDetailDrawer
          jobId={selectedJobId}
          onClose={() => setSelectedJobId(null)}
          onJobUpdated={() => setLastRefreshed(new Date())}
        />
      )}

      {/* Create Job Modal */}
      {isCreateModalOpen && (
        <CreateJobModal
          onClose={() => setIsCreateModalOpen(false)}
          onJobCreated={() => setLastRefreshed(new Date())}
        />
      )}
    </div>
  );
};

const App = () => (
  <AuthProvider>
    <MainLayout />
  </AuthProvider>
);

export default App;
