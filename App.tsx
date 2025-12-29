import React, { useState, useEffect } from 'react';
import { SupportTicket, IssueType, Urgency, TroubleshootingTip } from './types';
import { getTroubleshootingTips } from './services/geminiService';
import { syncToGoogleSheet, fetchTickets } from './services/sheetService';
import { fetchResidentData, ResidentRecord } from './services/validationService';
import { generateCSV, downloadCSV } from './services/csvService';

const Header: React.FC<{ onAdminClick: () => void, isAdmin: boolean, onLogout: () => void }> = ({ onAdminClick, isAdmin, onLogout }) => (
  <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
    <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="bg-emerald-600 p-2 rounded-lg shadow-sm">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800">Support Portal</h1>
          <p className="text-[10px] text-slate-400 font-medium tracking-widest uppercase">Resident Verification System</p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        {isAdmin ? (
          <button onClick={onLogout} className="text-xs font-bold text-rose-600 hover:text-rose-700 uppercase tracking-wider transition-colors">Logout</button>
        ) : (
          <button onClick={onAdminClick} className="text-xs font-bold text-slate-400 hover:text-emerald-600 uppercase tracking-wider transition-colors">Admin Portal</button>
        )}
        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 font-medium bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
          Cloud Sync
        </div>
      </div>
    </div>
  </header>
);

const App: React.FC = () => {
  const [view, setView] = useState<'form' | 'admin' | 'login'>('form');
  const [step, setStep] = useState(1);
  const [residentRecords, setResidentRecords] = useState<ResidentRecord[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [matchedRecord, setMatchedRecord] = useState<ResidentRecord | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [allTickets, setAllTickets] = useState<SupportTicket[]>([]);
  const [isLoadingTickets, setIsLoadingTickets] = useState(false);
  const [ticketError, setTicketError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<Partial<SupportTicket>>({
    issueType: IssueType.VDP,
    urgency: Urgency.MEDIUM,
    description: ''
  });
  
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tips, setTips] = useState<TroubleshootingTip[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      const records = await fetchResidentData();
      setResidentRecords(records);
      setIsLoadingData(false);
    };
    loadData();
  }, []);

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      (loginData.username === 'adminC' && loginData.password === 'Sun$892') ||
      (loginData.username === 'AdminD' && loginData.password === '786$cityD')
    ) {
      setIsAdmin(true);
      setView('admin');
      loadTickets();
      setValidationError(null);
    } else {
      setValidationError("Invalid credentials. Please try again.");
    }
  };

  const loadTickets = async () => {
    setIsLoadingTickets(true);
    setTicketError(null);
    try {
      const tickets = await fetchTickets();
      setAllTickets(tickets);
    } catch (err: any) {
      setTicketError(err.message || "Failed to connect to Google Sheets.");
      setAllTickets([]);
    } finally {
      setIsLoadingTickets(false);
    }
  };

  const maskName = (firstName: string, lastName: string) => {
    const f = (firstName || '').trim();
    const l = (lastName || '').trim();
    const firstPart = f.length > 4 ? f.substring(0, 4) : f;
    const lastPart = l.length > 2 ? l.substring(l.length - 2) : l;
    return `${firstPart}...${lastPart}`.toUpperCase();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    let { name, value } = e.target;
    // Force Uppercase for specific inputs as requested
    if (name === 'towerBlock' || name === 'fullName') {
      value = value.toUpperCase();
    }
    setFormData(prev => ({ ...prev, [name]: value }));
    if (validationError) setValidationError(null);
  };

  const nextStep = () => {
    if (step === 1) {
      if (!formData.towerBlock || !formData.unitNumber) {
        setValidationError("Please enter both Tower and Flat number.");
        return;
      }
      const record = residentRecords.find(r => 
        r.building.toLowerCase().trim() === formData.towerBlock?.toLowerCase().trim() && 
        r.flatNo.toLowerCase().trim() === formData.unitNumber?.toLowerCase().trim()
      );
      if (record) {
        setMatchedRecord(record);
        const masked = maskName(record.firstName, record.lastName);
        setFormData(prev => ({ ...prev, fullName: masked }));
      } else {
        setMatchedRecord(null);
      }
      setStep(2);
    } else if (step === 2) {
      if (!formData.fullName || !formData.contactNumber) {
        setValidationError("Please enter your name and contact number.");
        return;
      }
      setStep(3);
    }
    setValidationError(null);
  };

  const handleAiAnalysis = async () => {
    if (!formData.description || formData.description.length < 10) return;
    setIsAnalyzing(true);
    const result = await getTroubleshootingTips(formData.description, formData.issueType as IssueType);
    setTips(result);
    setIsAnalyzing(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const newTicket: SupportTicket = {
      ...(formData as SupportTicket),
      id: `VDP-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      submittedAt: new Date().toLocaleString()
    };
    const syncSuccess = await syncToGoogleSheet(newTicket);
    if (syncSuccess) {
      setIsSubmitting(false);
      setShowSuccess(true);
      setFormData({ issueType: IssueType.VDP, urgency: Urgency.MEDIUM, description: '' });
      setTips([]);
      setStep(1);
      setMatchedRecord(null);
      setTimeout(() => setShowSuccess(false), 5000);
    } else {
      setIsSubmitting(false);
      alert("Submission failed. This is usually due to CORS issues or script deployment settings in Google Apps Script.");
    }
  };

  const handleExportCSV = () => {
    if (allTickets.length === 0) {
      alert("No data available to export.");
      return;
    }
    const csvContent = generateCSV(allTickets);
    downloadCSV(csvContent, `vdp_tickets_${new Date().toISOString().split('T')[0]}.csv`);
  };

  if (isLoadingData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium text-sm">Synchronizing Database...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <Header 
        onAdminClick={() => { setView('login'); setValidationError(null); }} 
        isAdmin={isAdmin} 
        onLogout={() => { setIsAdmin(false); setView('form'); }} 
      />
      
      <main className="max-w-5xl mx-auto px-4 mt-8">
        {view === 'login' && (
          <div className="max-w-md mx-auto mt-20 animate-in fade-in zoom-in-95 duration-300">
            <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200">
              <h2 className="text-2xl font-bold text-slate-800 mb-6">Admin Login</h2>
              {validationError && <div className="mb-4 p-3 bg-rose-50 text-rose-600 text-xs font-bold rounded-lg border border-rose-100">{validationError}</div>}
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Username</label>
                  <input type="text" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" value={loginData.username} onChange={(e) => setLoginData({...loginData, username: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase">Password</label>
                  <input type="password" required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" value={loginData.password} onChange={(e) => setLoginData({...loginData, password: e.target.value})} />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setView('form')} className="flex-1 py-3 text-slate-500 font-bold hover:text-slate-700">Cancel</button>
                  <button type="submit" className="flex-[2] bg-slate-900 text-white py-3 px-8 rounded-xl font-bold shadow-lg hover:bg-slate-800 active:scale-95 transition-all">Access Dashboard</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {view === 'admin' && isAdmin && (
          <div className="animate-in fade-in duration-500 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-3xl font-black text-slate-800 tracking-tight">Management Dashboard</h2>
                <p className="text-slate-500 text-sm mt-1">Real-time view of resident service applications.</p>
              </div>
              <div className="flex gap-3">
                <button onClick={loadTickets} disabled={isLoadingTickets} className="bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-slate-50 disabled:opacity-50 transition-all">
                  <svg className={`w-4 h-4 ${isLoadingTickets ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {isLoadingTickets ? 'Loading...' : 'Refresh'}
                </button>
                <button onClick={handleExportCSV} disabled={allTickets.length === 0} className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-emerald-200 hover:bg-emerald-700 disabled:bg-slate-300 disabled:shadow-none transition-all">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Export CSV
                </button>
              </div>
            </div>

            {ticketError && (
              <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-start gap-3 animate-in slide-in-from-top-4">
                <div className="bg-rose-100 p-1.5 rounded-lg text-rose-600">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-rose-800">Connection Error</p>
                  <p className="text-xs text-rose-600/80 mt-1">{ticketError}. Check if your Google Apps Script is deployed for "Anyone".</p>
                  <button onClick={loadTickets} className="mt-2 text-xs font-black uppercase text-rose-800 hover:underline">Retry Connection</button>
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50/50 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">ID / Date</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Location / Resident</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Issue Details</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {isLoadingTickets ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-24 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <div className="w-10 h-10 border-3 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
                            <span className="text-slate-400 text-xs font-medium tracking-wide">Retrieving encrypted data...</span>
                          </div>
                        </td>
                      </tr>
                    ) : allTickets.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-24 text-center">
                          <div className="flex flex-col items-center gap-2 text-slate-300">
                            <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                            <p className="text-sm italic font-medium">No records found matching your current credentials.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      allTickets.map((ticket, i) => (
                        <tr key={ticket.id || i} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-6 py-5">
                            <div className="text-xs font-black text-slate-800">{ticket.id}</div>
                            <div className="text-[10px] text-slate-400 mt-1 font-medium">{ticket.submittedAt}</div>
                          </td>
                          <td className="px-6 py-5">
                            <div className="text-xs font-bold text-slate-700">{ticket.towerBlock} • {ticket.unitNumber}</div>
                            <div className="text-[10px] text-slate-400 font-medium group-hover:text-slate-600 transition-colors uppercase">{ticket.fullName}</div>
                            <div className="text-[10px] text-slate-400 font-medium">{ticket.contactNumber}</div>
                          </td>
                          <td className="px-6 py-5 max-w-md">
                            <div className="flex gap-2 mb-1.5">
                              <span className="text-[9px] font-black bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200 uppercase">{ticket.issueType}</span>
                              <span className={`text-[9px] font-black px-2 py-0.5 rounded border uppercase ${
                                (ticket.urgency || '').includes('High') ? 'bg-rose-50 text-rose-600 border-rose-100' : 
                                (ticket.urgency || '').includes('Medium') ? 'bg-amber-50 text-amber-600 border-amber-100' : 
                                'bg-sky-50 text-sky-600 border-sky-100'
                              }`}>
                                {ticket.urgency ? ticket.urgency.split(' - ')[0] : 'Normal'}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">{ticket.description}</p>
                          </td>
                          <td className="px-6 py-5">
                             <div className="flex items-center gap-2">
                               <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                               <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-tighter">Received</span>
                             </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {view === 'form' && (
          <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-6 duration-500">
            <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden">
              <div className="flex bg-slate-50/50 border-b border-slate-100">
                {[1, 2, 3].map((s) => (
                  <div key={s} className={`flex-1 py-4 text-center text-[10px] font-bold uppercase tracking-widest transition-all ${step === s ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50/50' : step > s ? 'text-emerald-500' : 'text-slate-300'}`}>
                    {s === 1 ? 'Location' : s === 2 ? 'Resident' : 'Details'}
                  </div>
                ))}
              </div>

              <div className="p-8">
                {validationError && (
                  <div className="mb-6 p-4 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-3 text-amber-800 text-sm animate-in zoom-in-95">
                    <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    {validationError}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-8">
                  {step === 1 && (
                    <div className="space-y-6 animate-in slide-in-from-right-4">
                      <div className="space-y-2">
                        <h2 className="text-xl font-bold text-slate-800 tracking-tight">Apartment Location</h2>
                        <p className="text-sm text-slate-500 font-medium">Please enter your building and flat details exactly as per records.</p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Tower / Building</label>
                          <input required name="towerBlock" value={formData.towerBlock || ''} onChange={handleInputChange} className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none uppercase font-semibold" placeholder="E.G. TOWER 1" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Flat Number</label>
                          <input required name="unitNumber" value={formData.unitNumber || ''} onChange={handleInputChange} className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none font-semibold" placeholder="e.g. 501" />
                        </div>
                      </div>
                      <button type="button" onClick={nextStep} className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2 group shadow-xl shadow-slate-200">
                        Continue to Resident Info
                        <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                      </button>
                    </div>
                  )}

                  {step === 2 && (
                    <div className="space-y-6 animate-in slide-in-from-right-4">
                      <div className="space-y-2">
                        <h2 className="text-xl font-bold text-slate-800 tracking-tight">Resident Details</h2>
                        <p className="text-sm text-slate-500">Verification for <b>{formData.towerBlock}</b>, Flat <b>{formData.unitNumber}</b>.</p>
                        {matchedRecord && (
                           <div className="flex items-center gap-2 py-1.5 px-3 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-100 w-fit">
                             <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                             Resident Data Matched
                           </div>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Full Name</label>
                          <input required name="fullName" value={formData.fullName || ''} onChange={handleInputChange} className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none uppercase font-semibold" placeholder="ENTER NAME" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Contact Number</label>
                          <input required type="tel" name="contactNumber" value={formData.contactNumber || ''} onChange={handleInputChange} className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none font-semibold" placeholder="+91 XXXX XXX XXX" />
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <button type="button" onClick={() => setStep(1)} className="flex-1 bg-white text-slate-600 border border-slate-200 font-bold py-4 rounded-xl hover:bg-slate-50 transition-all">Back</button>
                        <button type="button" onClick={nextStep} className="flex-[2] bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-xl shadow-slate-200">Proceed to Issue</button>
                      </div>
                    </div>
                  )}

                  {step === 3 && (
                    <div className="space-y-8 animate-in slide-in-from-right-4">
                      <div className="space-y-2">
                        <h2 className="text-xl font-bold text-slate-800 tracking-tight">Issue Information</h2>
                        <p className="text-sm text-slate-500 font-medium">Providing support for <b>{formData.fullName}</b>.</p>
                      </div>
                      <div className="space-y-3">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider font-black">Device Category</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {Object.values(IssueType).map(type => (
                            <button key={type} type="button" onClick={() => setFormData(prev => ({ ...prev, issueType: type }))} className={`px-4 py-4 text-sm font-black rounded-xl border flex items-center gap-3 transition-all ${formData.issueType === type ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-200' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                              <div className={`w-2.5 h-2.5 rounded-full ${formData.issueType === type ? 'bg-white' : 'bg-slate-300'}`}></div>
                              {type}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider font-black">Problem Description</label>
                        <div className="relative group">
                          <textarea required name="description" rows={4} value={formData.description || ''} onChange={handleInputChange} className="w-full px-4 py-4 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none resize-none font-medium leading-relaxed" placeholder="Please describe exactly what is happening (e.g. 'No video showing', 'Card not reading'...)" />
                          <button type="button" onClick={handleAiAnalysis} disabled={isAnalyzing || !formData.description || formData.description.length < 10} className="absolute bottom-4 right-4 flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-full text-[10px] font-black hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-all shadow-lg active:scale-95">
                            {isAnalyzing ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 010 1.414l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 0zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1a1 1 0 112 0v1a1 1 0 11-2 0zM13.536 14.95a1 1 0 011.414 0l.707.707a1 1 0 11-1.414 1.414l-.707-.707a1 1 0 010-1.414zM15.657 14.243a1 1 0 010 1.414l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 0z" /></svg> AI FIX GUIDE</>}
                          </button>
                        </div>
                      </div>
                      {tips.length > 0 && (
                        <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-6 animate-in zoom-in-95 duration-300">
                          <div className="flex items-center gap-2 text-indigo-900 font-bold mb-4"><h3 className="text-sm">Instant Troubleshooting Tips</h3></div>
                          <div className="space-y-5">
                            {tips.map((tip, idx) => (
                              <div key={idx} className="flex gap-4">
                                <span className="flex-shrink-0 w-6 h-6 bg-white text-indigo-600 rounded-full flex items-center justify-center text-[10px] font-black border border-indigo-100 shadow-sm">{idx + 1}</span>
                                <div>
                                  <p className="text-xs font-bold text-indigo-900 leading-tight uppercase tracking-wide">{tip.title}</p>
                                  <p className="text-[11px] text-indigo-700/80 mt-1 font-medium leading-relaxed">{tip.suggestion}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="flex gap-4 pt-4">
                        <button type="button" onClick={() => setStep(2)} className="flex-1 bg-white text-slate-600 border border-slate-200 font-bold py-4 rounded-xl hover:bg-slate-50 transition-all">Back</button>
                        <button type="submit" disabled={isSubmitting} className="flex-[2] bg-slate-900 text-white font-bold py-4 rounded-xl shadow-xl shadow-slate-200 hover:bg-slate-800 disabled:bg-slate-400 flex items-center justify-center gap-3 transition-all active:scale-95">
                          {isSubmitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Final Submission"}
                        </button>
                      </div>
                    </div>
                  )}
                </form>
              </div>
            </div>
          </div>
        )}
      </main>

      {showSuccess && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4 animate-in fade-in slide-in-from-bottom-10 duration-500">
          <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-2xl flex items-center gap-5 border border-slate-800 overflow-hidden relative">
            <div className="absolute top-0 left-0 w-1 bg-emerald-500 h-full"></div>
            <div className="bg-emerald-500 p-2.5 rounded-xl shadow-lg shadow-emerald-500/20">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
            </div>
            <div>
              <p className="font-bold text-sm leading-none">Application Filed</p>
              <p className="text-[11px] text-slate-400 mt-2">Your data is synced with management portal.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;