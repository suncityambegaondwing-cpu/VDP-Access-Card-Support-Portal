
import React, { useState, useEffect } from 'react';
import { SupportTicket, IssueType, Urgency, TroubleshootingTip } from './types';
import { getTroubleshootingTips } from './services/geminiService';
import { syncToGoogleSheet } from './services/sheetService';
import { fetchResidentData, ResidentRecord } from './services/validationService';

const Header: React.FC = () => (
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
      <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 font-medium bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100">
        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
        Cloud Sync Active
      </div>
    </div>
  </header>
);

const App: React.FC = () => {
  const [step, setStep] = useState(1);
  const [residentRecords, setResidentRecords] = useState<ResidentRecord[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [matchedRecord, setMatchedRecord] = useState<ResidentRecord | null>(null);
  
  const [formData, setFormData] = useState<Partial<SupportTicket>>({
    issueType: IssueType.VDP,
    urgency: Urgency.MEDIUM,
    description: ''
  });
  
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

  const maskName = (firstName: string, lastName: string) => {
    const f = firstName.trim();
    const l = lastName.trim();
    const firstPart = f.length > 4 ? f.substring(0, 4) : f;
    const lastPart = l.length > 2 ? l.substring(l.length - 2) : l;
    return `${firstPart}...${lastPart}`.toUpperCase();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    let { name, value } = e.target;
    
    // FORCE CAPS for Tower and Name
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

  const prevStep = () => {
    setStep(prev => prev - 1);
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
      setFormData({
        issueType: IssueType.VDP,
        urgency: Urgency.MEDIUM,
        description: ''
      });
      setTips([]);
      setStep(1);
      setMatchedRecord(null);
      setTimeout(() => setShowSuccess(false), 5000);
    } else {
      setIsSubmitting(false);
      alert("Submission failed. Ensure you have deployed the Google Apps Script correctly.");
    }
  };

  if (isLoadingData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium text-sm">Loading Support Portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <Header />
      
      <main className="max-w-2xl mx-auto px-4 mt-8 lg:mt-12">
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden">
          <div className="flex bg-slate-50/50 border-b border-slate-100">
            {[1, 2, 3].map((s) => (
              <div 
                key={s} 
                className={`flex-1 py-4 text-center text-[10px] font-bold uppercase tracking-widest transition-all ${
                  step === s ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50/50' : 
                  step > s ? 'text-emerald-500' : 'text-slate-300'
                }`}
              >
                {s === 1 ? 'Location' : s === 2 ? 'Resident' : 'Details'}
              </div>
            ))}
          </div>

          <div className="p-8">
            {validationError && (
              <div className="mb-6 p-4 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-3 text-amber-800 text-sm">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                {validationError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
              {step === 1 && (
                <div className="space-y-6 animate-in slide-in-from-right-4">
                  <div className="space-y-2">
                    <h2 className="text-xl font-bold text-slate-800 tracking-tight">Apartment Location</h2>
                    <p className="text-sm text-slate-500">Provide your building and flat details to begin.</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Tower / Building</label>
                      <input
                        required
                        name="towerBlock"
                        value={formData.towerBlock || ''}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none uppercase"
                        placeholder="E.G. BUILDING A"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Flat No.</label>
                      <input
                        required
                        name="unitNumber"
                        value={formData.unitNumber || ''}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none"
                        placeholder="e.g. 102"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={nextStep}
                    className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2 group shadow-xl shadow-slate-200"
                  >
                    Next Step
                    <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6 animate-in slide-in-from-right-4">
                  <div className="space-y-2">
                    <h2 className="text-xl font-bold text-slate-800 tracking-tight">Resident Details</h2>
                    <p className="text-sm text-slate-500">Information for Tower <b>{formData.towerBlock}</b>, Flat <b>{formData.unitNumber}</b>.</p>
                    {matchedRecord && (
                      <div className="flex items-center gap-2 py-1 px-3 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-lg border border-emerald-100 w-fit">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Resident Match Confirmed
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Resident Full Name</label>
                      <input
                        required
                        name="fullName"
                        value={formData.fullName || ''}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none uppercase font-medium"
                        placeholder="ENTER NAME"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Contact Number</label>
                      <input
                        required
                        type="tel"
                        name="contactNumber"
                        value={formData.contactNumber || ''}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none"
                        placeholder="Mobile No."
                      />
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <button type="button" onClick={prevStep} className="flex-1 bg-white text-slate-600 border border-slate-200 font-bold py-4 rounded-xl hover:bg-slate-50 transition-all">Back</button>
                    <button type="button" onClick={nextStep} className="flex-[2] bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-xl shadow-slate-200">Continue</button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-8 animate-in slide-in-from-right-4">
                  <div className="space-y-2">
                    <h2 className="text-xl font-bold text-slate-800 tracking-tight">Issue Information</h2>
                    <p className="text-sm text-slate-500">Reporting for <b>{formData.fullName}</b>.</p>
                  </div>
                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Device Category</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {Object.values(IssueType).map(type => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, issueType: type }))}
                          className={`px-4 py-3 text-sm font-semibold rounded-xl border flex items-center gap-3 transition-all ${
                            formData.issueType === type 
                            ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-200' 
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          <div className={`w-2 h-2 rounded-full ${formData.issueType === type ? 'bg-white' : 'bg-slate-300'}`}></div>
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Problem Description</label>
                    <div className="relative group">
                      <textarea
                        required
                        name="description"
                        rows={4}
                        value={formData.description || ''}
                        onChange={handleInputChange}
                        className="w-full px-4 py-4 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none resize-none"
                        placeholder="Please describe the issue in detail..."
                      />
                      <button
                        type="button"
                        onClick={handleAiAnalysis}
                        disabled={isAnalyzing || !formData.description || formData.description.length < 10}
                        className="absolute bottom-4 right-4 flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-full text-[10px] font-black hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-all shadow-lg active:scale-95"
                      >
                        {isAnalyzing ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "AI FIX GUIDE"}
                      </button>
                    </div>
                  </div>
                  {tips.length > 0 && (
                    <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-6 animate-in zoom-in-95 fade-in duration-300">
                      <div className="flex items-center gap-2 text-indigo-900 font-bold mb-4">
                        <h3 className="text-sm">Instant Troubleshooting Tips</h3>
                      </div>
                      <div className="space-y-4">
                        {tips.map((tip, idx) => (
                          <div key={idx} className="flex gap-4">
                            <span className="flex-shrink-0 w-6 h-6 bg-white text-indigo-600 rounded-full flex items-center justify-center text-[10px] font-black border border-indigo-100 shadow-sm">{idx + 1}</span>
                            <div>
                              <p className="text-xs font-bold text-indigo-900 leading-tight">{tip.title}</p>
                              <p className="text-[11px] text-indigo-700/80 mt-1">{tip.suggestion}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex gap-4">
                    <button type="button" onClick={prevStep} className="flex-1 bg-white text-slate-600 border border-slate-200 font-bold py-4 rounded-xl hover:bg-slate-50 transition-all">Back</button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-[2] bg-slate-900 text-white font-bold py-4 rounded-xl shadow-xl shadow-slate-200 hover:bg-slate-800 disabled:bg-slate-400 flex items-center justify-center gap-3 transition-all active:scale-95"
                    >
                      {isSubmitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Final Submission"}
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      </main>

      {showSuccess && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4 animate-in fade-in slide-in-from-bottom-10 duration-500">
          <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-2xl flex items-center gap-5 border border-slate-800">
            <div className="bg-emerald-500 p-2.5 rounded-xl shadow-lg shadow-emerald-500/20">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="font-bold text-sm leading-none">Request Filed</p>
              <p className="text-[11px] text-slate-400 mt-2">Your data is now saved to the Google Sheet.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
