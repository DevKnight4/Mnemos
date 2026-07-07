import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  LayoutDashboard, MessageSquare, BookOpen, UploadCloud, 
  FileText, Sparkles, Brain, ChevronDown, Check, ArrowLeft, ArrowRight, Lightbulb 
} from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  
  // Dashboard state
  const [uploadStatus, setUploadStatus] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [documents, setDocuments] = useState([])
  const fileInputRef = useRef(null)

  // AI Workspace state
  const [query, setQuery] = useState('')
  const [chatHistory, setChatHistory] = useState([
    { role: 'assistant', text: 'Hello! I am Mnemos. Ask me anything about your uploaded documents.', citations: [] }
  ])
  const [isQuerying, setIsQuerying] = useState(false)
  const [activeCitations, setActiveCitations] = useState([])

  // Revision state
  const [revisionData, setRevisionData] = useState(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [selectedDocs, setSelectedDocs] = useState(['all'])
  const [quizAnswers, setQuizAnswers] = useState({})

  const fetchDocuments = async () => {
    try {
      const res = await fetch(`${API_URL}/documents`)
      if (res.ok) {
        const data = await res.json()
        setDocuments(data.documents || [])
      }
    } catch (error) {
      console.error("Failed to fetch documents")
    }
  }

  useEffect(() => {
    fetchDocuments()
  }, [])

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setIsUploading(true)
    setUploadStatus('Uploading and indexing...')

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (res.ok) {
        setUploadStatus(`Success! ${file.name} indexed (${data.chunks_indexed} chunks).`)
        fetchDocuments()
      } else {
        setUploadStatus(`Error: ${data.detail}`)
      }
    } catch (error) {
      setUploadStatus(`Error: Failed to connect to server.`)
    } finally {
      setIsUploading(false)
    }
  }

  const handleQuery = async () => {
    if (!query.trim()) return
    
    const userMsg = query
    setQuery('')
    setChatHistory(prev => [...prev, { role: 'user', text: userMsg }])
    setIsQuerying(true)
    setActiveCitations([])

    try {
      const res = await fetch(`${API_URL}/query?query=${encodeURIComponent(userMsg)}`, {
        method: 'POST',
      })
      const data = await res.json()
      
      if (res.ok) {
        setChatHistory(prev => [...prev, { 
          role: 'assistant', 
          text: data.answer,
          citations: data.citations
        }])
        setActiveCitations(data.citations || [])
      } else {
        setChatHistory(prev => [...prev, { role: 'assistant', text: `Error: ${data.detail}` }])
      }
    } catch (error) {
       setChatHistory(prev => [...prev, { role: 'assistant', text: `Error connecting to backend.` }])
    } finally {
      setIsQuerying(false)
    }
  }

  const toggleDoc = (doc) => {
    if (doc === 'all') {
      setSelectedDocs(['all'])
    } else {
      const newDocs = selectedDocs.includes(doc) 
        ? selectedDocs.filter(d => d !== doc)
        : [...selectedDocs.filter(d => d !== 'all'), doc]
      setSelectedDocs(newDocs.length === 0 ? ['all'] : newDocs)
    }
  }

  const handleGenerateRevision = async (endpoint) => {
    setIsGenerating(true)
    setRevisionData(null)
    setQuizAnswers({})
    try {
      const docsQuery = selectedDocs.map(d => `document=${encodeURIComponent(d)}`).join('&')
      const res = await fetch(`${API_URL}/${endpoint}?topic=all&${docsQuery}`, { method: 'POST' })
      const data = await res.json()
      setRevisionData({ type: endpoint, content: data })
    } catch (error) {
      setRevisionData({ type: 'error', content: 'Failed to generate' })
    } finally {
      setIsGenerating(false)
    }
  }

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'ai', label: 'AI Workspace', icon: MessageSquare },
    { id: 'revision', label: 'Smart Revision', icon: BookOpen }
  ]

  return (
    <div className="h-screen overflow-hidden flex flex-col md:flex-row bg-background font-sans text-text">
      {/* Floating Sidebar */}
      <aside className="w-full md:w-72 bg-surface m-4 md:mr-0 p-6 flex flex-col gap-8 z-30 relative rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-border">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/20">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-text">Mnemos</h1>
            <p className="text-xs text-text-muted font-medium uppercase tracking-widest">Study Hub</p>
          </div>
        </div>
        
        <nav className="flex flex-col gap-2 mt-4">
          {navItems.map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`text-left px-5 py-3.5 rounded-2xl transition-all font-medium flex items-center gap-3 relative overflow-hidden group ${
                activeTab === tab.id 
                  ? 'bg-primary/10 text-primary shadow-sm' 
                  : 'text-text-muted hover:bg-hover hover:text-text'
              }`}
            >
              <tab.icon className={`w-5 h-5 transition-colors ${activeTab === tab.id ? 'text-primary' : 'text-text-muted group-hover:text-text'}`} />
              {tab.label}
              {activeTab === tab.id && (
                <motion.div layoutId="activeTab" className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full" />
              )}
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        <AnimatePresence mode="wait">
          
          {/* DASHBOARD */}
          {activeTab === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="max-w-5xl mx-auto pb-20"
            >
              <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md pb-6 pt-2 -mx-4 px-4 -mt-2">
                <h2 className="text-4xl font-semibold tracking-tight">Knowledge Base</h2>
                <p className="text-text-muted mt-2">Upload and manage your study materials</p>
              </div>
              
              <div className="mt-6 glass-panel p-12 flex flex-col items-center justify-center min-h-[400px] border-dashed border-2 border-border hover:border-primary/40 bg-surface/50 transition-colors">
                <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-6 shadow-inner">
                  <UploadCloud className="w-10 h-10 text-primary" />
                </div>
                <h3 className="text-2xl font-semibold mb-3">Drag & drop your files here</h3>
                <p className="text-text-muted text-center max-w-md mb-10 leading-relaxed">
                  Upload PDFs, Markdown, or text files to build your knowledge base. Mnemos will intelligently index them for semantic search and revision.
                </p>
                
                <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                <motion.button 
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="btn-primary flex items-center gap-2 px-10 py-4 text-lg shadow-primary/20"
                  onClick={() => fileInputRef.current.click()}
                  disabled={isUploading}
                >
                  {isUploading ? 'Indexing Document...' : 'Select File'}
                </motion.button>
                {uploadStatus && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 text-sm text-success font-medium bg-success/10 px-6 py-3 rounded-full flex items-center gap-2">
                    <Check className="w-4 h-4" /> {uploadStatus}
                  </motion.p>
                )}
              </div>

              {documents.length > 0 && (
                <div className="w-full mt-12">
                  <h4 className="text-sm font-bold tracking-widest text-text-muted uppercase mb-6 flex items-center gap-2">
                    <FileText className="w-4 h-4" /> Indexed Documents
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {documents.map((doc, i) => (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                        key={i} className="flex items-center gap-4 p-5 glass-panel hover:-translate-y-1 transition-transform group cursor-pointer"
                      >
                         <div className="w-10 h-10 rounded-xl bg-hover flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                           <FileText className="w-5 h-5 text-text-muted group-hover:text-primary transition-colors" />
                         </div>
                         <span className="text-sm font-medium text-text truncate pr-4">{doc}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* AI WORKSPACE */}
          {activeTab === 'ai' && (
            <motion.div 
              key="ai"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="h-full flex flex-col max-w-6xl mx-auto"
            >
               <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md pb-6 pt-2 -mx-4 px-4 -mt-2">
                 <h2 className="text-4xl font-semibold tracking-tight">AI Workspace</h2>
                 <p className="text-text-muted mt-2">Chat with your indexed knowledge base</p>
               </div>
               
               <div className="flex-1 glass-panel flex flex-col lg:flex-row overflow-hidden mt-2 border-border shadow-sm">
                  {/* Chat Area */}
                  <div className="flex-1 flex flex-col border-b lg:border-b-0 lg:border-r border-border p-0 bg-surface/50">
                    <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8">
                      {chatHistory.map((msg, idx) => (
                         <motion.div 
                           initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                           key={idx} className={`flex gap-4 max-w-4xl ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
                         >
                           <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white shadow-sm ${msg.role === 'user' ? 'bg-text' : 'bg-gradient-to-br from-primary to-secondary'}`}>
                             {msg.role === 'user' ? <span className="text-sm font-bold">U</span> : <Sparkles className="w-5 h-5" />}
                           </div>
                           <div className={`p-5 rounded-[20px] text-[15px] leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-primary/10 text-text rounded-tr-sm border border-primary/20' : 'bg-surface text-text rounded-tl-sm border border-border'}`}>
                             {msg.role === 'assistant' ? (
                               <div className="prose prose-slate max-w-none text-text prose-p:leading-relaxed prose-a:text-primary prose-headings:font-semibold">
                                 <ReactMarkdown>{msg.text}</ReactMarkdown>
                               </div>
                             ) : (
                               msg.text
                             )}
                             {msg.citations?.length > 0 && (
                               <div className="mt-4 pt-4 border-t border-border flex flex-wrap gap-2">
                                 {msg.citations.map((cite, i) => (
                                   <span key={i} className="text-[11px] bg-hover text-text-muted px-3 py-1.5 rounded-full font-medium border border-border">Source: {cite}</span>
                                 ))}
                               </div>
                             )}
                           </div>
                         </motion.div>
                      ))}
                      {isQuerying && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-4 max-w-3xl">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex-shrink-0 flex items-center justify-center animate-pulse shadow-sm">
                            <Sparkles className="w-5 h-5 text-white" />
                          </div>
                          <div className="bg-surface border border-border p-5 rounded-[20px] rounded-tl-sm shadow-sm flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-primary/50 animate-bounce"></span>
                            <span className="w-2 h-2 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                            <span className="w-2 h-2 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                          </div>
                        </motion.div>
                      )}
                    </div>
                    <div className="p-5 bg-surface border-t border-border">
                      <form className="flex gap-3 items-end" onSubmit={e => { e.preventDefault(); handleQuery(); }}>
                        <textarea 
                          className="input-field flex-1 resize-none py-3.5 px-5 min-h-[52px] max-h-32 text-[15px] leading-relaxed shadow-inner" 
                          placeholder="Ask a question about your documents..." 
                          value={query}
                          rows={1}
                          onChange={e => {
                            setQuery(e.target.value);
                            e.target.style.height = 'auto';
                            e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px';
                          }}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              if (query.trim() && !isQuerying) {
                                handleQuery();
                                e.target.style.height = 'auto';
                              }
                            }
                          }}
                          disabled={isQuerying}
                        />
                        <button type="submit" className="btn-primary px-6 h-[52px] rounded-xl flex-shrink-0 flex items-center justify-center" disabled={isQuerying || !query.trim()}>
                          <ArrowRight className="w-5 h-5" />
                        </button>
                      </form>
                    </div>
                  </div>
                  {/* Citations Area */}
                  <div className="w-full lg:w-80 bg-hover/50 p-6 overflow-y-auto hidden md:block">
                    <h3 className="text-xs font-bold tracking-widest text-text-muted uppercase mb-6 flex items-center gap-2">
                      <FileText className="w-4 h-4" /> Active Context
                    </h3>
                    {activeCitations.length === 0 ? (
                      <div className="text-center mt-12">
                        <div className="w-16 h-16 bg-surface rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-4 border border-border">
                          <FileText className="w-6 h-6 text-text-muted" />
                        </div>
                        <p className="text-sm text-text-muted leading-relaxed">Documents referenced by the AI will appear here.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {activeCitations.map((cite, i) => (
                          <motion.div 
                            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                            key={i} className="p-4 bg-surface rounded-xl shadow-sm border border-border hover:-translate-y-1 transition-transform relative overflow-hidden"
                          >
                            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-primary to-secondary"></div>
                            <p className="text-sm text-text font-medium leading-relaxed">{cite}</p>
                            <p className="text-[10px] text-text-muted mt-2 font-semibold uppercase tracking-widest flex items-center gap-1">
                              <Check className="w-3 h-3 text-success" /> Source Verified
                            </p>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
               </div>
            </motion.div>
          )}

          {/* REVISION WORKSPACE */}
          {activeTab === 'revision' && (
            <motion.div 
              key="revision"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="max-w-5xl mx-auto pb-20"
            >
              <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md pb-6 pt-2 -mx-4 px-4 -mt-2 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-border">
                <div>
                  <h2 className="text-4xl font-semibold tracking-tight">Smart Revision</h2>
                  <p className="text-text-muted mt-2">Generate tailored study materials</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-text-muted uppercase tracking-widest">Source:</span>
                  <div className="relative group min-w-[260px]">
                    <button className="bg-surface border border-border text-text text-sm font-medium rounded-xl px-5 py-3 focus:outline-none w-full text-left flex justify-between items-center hover:border-primary/40 transition-colors shadow-sm">
                      <span className="truncate mr-4">
                        {selectedDocs.includes('all') ? 'All Documents' : `${selectedDocs.length} Document${selectedDocs.length > 1 ? 's' : ''} Selected`}
                      </span>
                      <ChevronDown className="w-4 h-4 text-text-muted" />
                    </button>
                    <div className="absolute top-full left-0 mt-2 w-full bg-surface border border-border rounded-xl shadow-xl hidden group-hover:block z-30 max-h-60 overflow-y-auto">
                      <label className="flex items-center gap-3 p-4 hover:bg-hover cursor-pointer border-b border-border transition-colors">
                        <input type="checkbox" className="accent-primary w-4 h-4 rounded border-border" checked={selectedDocs.includes('all')} onChange={() => toggleDoc('all')} />
                        <span className="text-sm font-medium">All Documents</span>
                      </label>
                      {documents.map((doc, i) => (
                        <label key={i} className="flex items-center gap-3 p-4 hover:bg-hover cursor-pointer transition-colors">
                          <input type="checkbox" className="accent-primary w-4 h-4 rounded border-border" checked={selectedDocs.includes(doc)} onChange={() => toggleDoc(doc)} />
                          <span className="text-sm truncate" title={doc}>{doc}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              {!revisionData && !isGenerating && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
                  
                  <motion.div 
                    whileHover={{ y: -4, shadow: '0 20px 40px -10px rgba(255,95,162,0.1)' }}
                    className="glass-panel p-8 flex flex-col gap-5 cursor-pointer border-2 border-transparent hover:border-primary/20 transition-colors group" 
                    onClick={() => handleGenerateRevision('generate-summary')}
                  >
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                      <FileText className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-2">Quick Summary</h3>
                      <p className="text-sm text-text-muted leading-relaxed">Synthesize your indexed knowledge into a structured, high-yield overview.</p>
                    </div>
                  </motion.div>

                  <motion.div 
                    whileHover={{ y: -4, shadow: '0 20px 40px -10px rgba(167,227,194,0.3)' }}
                    className="glass-panel p-8 flex flex-col gap-5 cursor-pointer border-2 border-transparent hover:border-tertiary/40 transition-colors group" 
                    onClick={() => handleGenerateRevision('generate-flashcards')}
                  >
                    <div className="w-14 h-14 rounded-2xl bg-tertiary/20 text-emerald-600 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                      <Brain className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-2">Active Recall</h3>
                      <p className="text-sm text-text-muted leading-relaxed">Programmatic flashcards based on core concepts for scientifically proven retention.</p>
                    </div>
                  </motion.div>

                  <motion.div 
                    whileHover={{ y: -4, shadow: '0 20px 40px -10px rgba(192,132,252,0.15)' }}
                    className="glass-panel p-8 flex flex-col gap-5 cursor-pointer border-2 border-transparent hover:border-secondary/30 transition-colors group" 
                    onClick={() => handleGenerateRevision('generate-quiz')}
                  >
                    <div className="w-14 h-14 rounded-2xl bg-secondary/10 text-secondary flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                      <Lightbulb className="w-7 h-7" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold mb-2">Practice Quiz</h3>
                      <p className="text-sm text-text-muted leading-relaxed">Test your understanding with a dynamically generated multiple-choice quiz.</p>
                    </div>
                  </motion.div>

                </div>
              )}

              {isGenerating && (
                 <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-panel p-16 flex flex-col items-center justify-center mt-10 text-center">
                    <div className="w-16 h-16 border-4 border-hover border-t-primary rounded-full animate-spin mb-6"></div>
                    <p className="text-xl font-semibold">Generating your study materials...</p>
                    <p className="text-sm text-text-muted mt-3 max-w-sm">
                      Analyzing {selectedDocs.includes('all') ? 'all documents' : selectedDocs.join(', ')}
                    </p>
                 </motion.div>
              )}

              {revisionData && !isGenerating && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-8 md:p-12 mt-10 max-w-4xl mx-auto shadow-xl">
                  <div className="flex items-center justify-between mb-10 pb-6 border-b border-border">
                     <h3 className="text-3xl font-bold capitalize flex items-center gap-3">
                       {revisionData.type.replace('generate-', '')}
                     </h3>
                     <button className="text-sm font-medium text-text-muted hover:text-text flex items-center gap-2 transition-colors bg-hover px-4 py-2 rounded-full" onClick={() => setRevisionData(null)}>
                       <ArrowLeft className="w-4 h-4" /> Back
                     </button>
                  </div>
                  
                  {/* Custom Rendering based on type */}
                  {revisionData.type === 'generate-summary' && (
                    <div className="prose prose-slate max-w-none prose-headings:font-semibold prose-h1:text-3xl prose-a:text-primary prose-strong:text-text prose-li:marker:text-primary text-[15px] leading-relaxed">
                      <ReactMarkdown>{revisionData.content.summary}</ReactMarkdown>
                    </div>
                  )}

                  {revisionData.type === 'generate-flashcards' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {revisionData.content.flashcards?.map((fc, i) => (
                        <div key={i} className="group perspective-1000">
                          <div className="relative w-full h-56 bg-surface rounded-2xl border border-border shadow-md p-8 flex flex-col items-center justify-center text-center hover:bg-hover transition-colors cursor-pointer group-hover:border-tertiary/40">
                             <div className="absolute top-5 left-5 text-[10px] font-bold text-text-muted uppercase tracking-widest flex items-center gap-1"><Brain className="w-3 h-3"/> Front</div>
                             <p className="text-text font-medium text-lg group-hover:opacity-0 transition-opacity duration-300">{fc.q}</p>
                             <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center absolute inset-0 bg-gradient-to-br from-tertiary/20 to-surface rounded-2xl p-8 shadow-inner">
                               <div className="absolute top-5 left-5 text-[10px] font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-1"><Check className="w-3 h-3"/> Back</div>
                               <p className="text-text font-medium text-[15px] leading-relaxed">{fc.a}</p>
                             </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {revisionData.type === 'generate-quiz' && (
                    <div className="space-y-10">
                      {revisionData.content.quiz?.map((q, i) => (
                        <div key={i} className="bg-surface rounded-2xl border border-border shadow-sm p-8">
                          <div className="flex items-start gap-4 mb-8">
                             <span className="flex-shrink-0 w-10 h-10 rounded-full bg-secondary/10 text-secondary flex items-center justify-center font-bold text-lg">{i+1}</span>
                             <h4 className="text-xl font-semibold pt-1 leading-snug">{q.q}</h4>
                          </div>
                          <div className="space-y-4 pl-14">
                            {q.options?.map((opt, j) => {
                              const isSelected = quizAnswers[i] === opt;
                              const showResult = quizAnswers[i] !== undefined;
                              const isCorrect = showResult && q.answer === opt;
                              
                              let bgClass = "bg-surface border-border hover:bg-hover hover:border-text-muted text-text";
                              if (showResult) {
                                 if (isCorrect) bgClass = "bg-success/10 border-success/30 text-emerald-700 font-medium shadow-sm";
                                 else if (isSelected) bgClass = "bg-red-50 border-red-200 text-red-600";
                                 else bgClass = "bg-surface border-border opacity-50";
                              }
                              
                              return (
                                <button 
                                  key={j}
                                  onClick={() => !showResult && setQuizAnswers(prev => ({...prev, [i]: opt}))}
                                  disabled={showResult}
                                  className={`w-full text-left p-4 rounded-xl text-[15px] transition-all border outline-none ${bgClass}`}
                                >
                                  {opt}
                                </button>
                              );
                            })}
                          </div>
                          <div className="mt-8 pl-14">
                             <details className="group cursor-pointer">
                               <summary className="text-sm font-semibold text-secondary hover:text-secondary/80 list-none flex items-center gap-2 outline-none w-max bg-secondary/5 px-4 py-2 rounded-full transition-colors">
                                 <ChevronDown className="w-4 h-4 transition-transform group-open:rotate-180" />
                                 View Correct Answer
                               </summary>
                               <div className="mt-4 p-5 bg-secondary/5 border border-secondary/20 rounded-xl">
                                 <p className="text-[15px]"><span className="font-bold text-secondary">Answer:</span> {q.answer}</p>
                               </div>
                             </details>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {revisionData.type === 'error' && (
                    <div className="text-center py-16 bg-red-50 rounded-2xl border border-red-100">
                       <p className="text-red-600 font-semibold text-lg">There was an error generating the content.</p>
                       <p className="text-red-400 mt-2 text-sm">Please check the backend logs or try again.</p>
                    </div>
                  )}

                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}

export default App
