  import React, { useState } from 'react';
  import { 
    Tile,
    Stack,
    Button
  } from '@carbon/react';
  import { 
    Watson,
    Upload,
    Document,
    Chat,
    ConnectionSignal,
    Renew
  } from '@carbon/icons-react';


  const App = () => {
    const [selectedTab, setSelectedTab] = useState(0);
    const [documents, setDocuments] = useState([]);
    const [processingDoc, setProcessingDoc] = useState(null);
    const [showDetails, setShowDetails] = useState(false);
    const [selectedDoc, setSelectedDoc] = useState(null);
    const [chatMessages, setChatMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [aiConnected, setAiConnected] = useState(false);
    const [showConnectionAlert, setShowConnectionAlert] = useState(true);

    const handleFileUpload = (e) => {
      const file = e.target.files[0];
      if (file) {
        const newDoc = {
          id: Date.now(),
          name: file.name,
          size: (file.size / 1024).toFixed(1) + ' KB',
          uploadedAt: new Date().toLocaleString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
          }),
          status: 'uploaded',
          summary: null
        };
        setDocuments([...documents, newDoc]);
        setProcessingDoc(newDoc.id);
        
        setTimeout(() => {
          setProcessingDoc(newDoc.id + '_retrieving');
        }, 1500);
        
        setTimeout(() => {
          setProcessingDoc(newDoc.id + '_embedding');
        }, 3000);
        
        setTimeout(() => {
          const updatedDoc = {
            ...newDoc,
            status: 'processed',
            processedAt: new Date().toLocaleString('en-US', { 
              month: 'short', 
              day: 'numeric', 
              year: 'numeric', 
              hour: '2-digit', 
              minute: '2-digit',
              hour12: true 
            }),
            summary: "Here is a comprehensive summary of the key points from Parts 1-3 of the GNU Affero General Public License: The GNU Affero General Public License (AGPL) is a free, copyleft license that ensures cooperation with the community in network server software. The license...",
            type: 'legal',
            sections: 3,
            chars: '32.6K'
          };
          setDocuments(docs => docs.map(d => d.id === newDoc.id ? updatedDoc : d));
          setProcessingDoc(null);
        }, 5000);
      }
    };

    const viewDetails = (doc) => {
      setSelectedDoc(doc);
      setShowDetails(true);
    };

    const deleteDoc = (id) => {
      setDocuments(documents.filter(d => d.id !== id));
    };

    const sendMessage = () => {
      if (chatInput.trim()) {
        setChatMessages([...chatMessages, { type: 'user', text: chatInput }]);
        setChatInput('');
        
        setTimeout(() => {
          setChatMessages(prev => [...prev, {
            type: 'assistant',
            text: 'I can help you analyze your documents. Based on the uploaded content, I can answer questions about the GNU Affero General Public License and its key provisions.'
          }]);
        }, 1000);
      }
    };

    const testConnection = () => {
      // Simulate connection testing
      setAiConnected(true);
      setShowConnectionAlert(true);
      
      // Show connected state for 3 seconds, then revert to disconnected
      setTimeout(() => {
        setAiConnected(false);
      }, 3000);
    };

    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f4f4f4', fontFamily: "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
        {/* Header */}
        <header style={{ 
          backgroundColor: '#ffffff', 
          borderBottom: '1px solid #e0e0e0', 
          padding: '16px 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              backgroundColor: '#0f63feeb', 
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
            <svg width="48" height="48" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="32" height="32" rx="4" fill="#0f62fe"></rect><path d="M8 10h16M8 13h16M8 16h16M8 19h16M8 22h16" stroke="white" stroke-width="2"></path><path d="M12 10v12M20 10v12" stroke="white" stroke-width="2"></path></svg>
            </div>
            <div>
              <h1 style={{ fontSize: '20px', fontWeight: '600', margin: 0, color: '#161616' }}>
                IBM Document Intelligence
              </h1>
              <p style={{ fontSize: '14px', color: '#525252', margin: 0 }}>
                AI-Powered Summarization & RAG
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              padding: '8px 12px',
              // backgroundColor: aiConnected ? '#d0e2ff' : '#fff1f1',
              // border: aiConnected ? '1px solid #0f62fe' : '1px solid #da1e28',
              borderRadius: '4px'
            }}>
              <svg width="16" height="16" viewBox="0 0 32 32" fill={aiConnected ? "#0f62fe" : "#da1e28"}>
                {aiConnected ? <path d="M13 24l-9-9 1.414-1.414L13 21.171 26.586 7.586 28 9 13 24z"/> : <path d="M16 2C8.3 2 2 8.3 2 16s6.3 14 14 14 14-6.3 14-14S23.7 2 16 2zm0 26C9.4 28 4 22.6 4 16S9.4 4 16 4s12 5.4 12 12-5.4 12-12 12zM21.4 23L16 17.6 10.6 23 9 21.4l5.4-5.4L9 10.6 10.6 9l5.4 5.4L21.4 9l1.6 1.6-5.4 5.4 5.4 5.4z"/>}
              </svg>
              <span style={{ fontSize: '14px', fontWeight: '500', color: aiConnected ? '#0f62fe' : '#da1e28' }}>
                {aiConnected ? 'AI Offline' : 'AI Online'}
              </span>
            </div>
            <span style={{ 
              padding: '4px 12px', 
              backgroundColor: '#0f62fe', 
              color: 'white',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: '500'
            }}>
              llama3.2
            </span>
            <button 
              onClick={testConnection}
              style={{
                padding: '8px 16px',
                backgroundColor: 'transparent',
                border: '1px solid #0f62fe',
                color: '#0f62fe',
                cursor: 'pointer',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                borderRadius: '4px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f4f4f4';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}>
              <ConnectionSignal size={16} />
              Test Connection
            </button>
              {/* <Button
               style={{
                padding: '8px 16px',
                backgroundColor: 'transparent',
                border: '1px solid #0f62fe',
                color: '#0f62fe',
                cursor: 'pointer',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                borderRadius: '4px'
              }}
            kind="ghost"          // subtle style, like your transparent button
            size="sm"   
            color='blue'          // small button size
            renderIcon={Renew}    // Carbon refresh icon
            iconDescription="Refresh"
            onClick={() => window.location.reload()}
          >
            Refresh
          </Button> */}
          
          </div>
        </header>

        {/* Connection Alert Popup */}
        {showConnectionAlert && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '20px'
          }}
          onClick={() => setShowConnectionAlert(false)}>
            <div 
              style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                width: '100%',
                maxWidth: '600px',
                maxHeight: '90vh',
                overflow: 'auto',
                boxShadow: '0 8px 16px rgba(0, 0, 0, 0.2)'
              }}
              onClick={(e) => e.stopPropagation()}>
              
              {aiConnected ? (
                <div style={{ 
                  backgroundColor: '#d0e2ff', 
                  border: '1px solid #0f62fe',
                  borderRadius: '8px',
                  padding: '24px',
                  position: 'relative'
                }}>
                  <button
                    onClick={() => setShowConnectionAlert(false)}
                    style={{
                      position: 'absolute',
                      top: '16px',
                      right: '16px',
                      backgroundColor: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px',
                      color: '#0043ce'
                    }}>
                    <svg width="20" height="20" viewBox="0 0 32 32" fill="currentColor">
                      <path d="M24 9.4L22.6 8 16 14.6 9.4 8 8 9.4l6.6 6.6L8 22.6 9.4 24l6.6-6.6 6.6 6.6 1.4-1.4-6.6-6.6L24 9.4z"/>
                    </svg>
                  </button>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                    <svg width="24" height="24" viewBox="0 0 32 32" fill="#0f62fe" style={{ flexShrink: 0, marginTop: '4px' }}>
                      <path d="M13 24l-9-9 1.414-1.414L13 21.171 26.586 7.586 28 9 13 24z"/>
                    </svg>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ margin: '0 0 8px 0', fontWeight: '600', color: '#0043ce', fontSize: '18px' }}>AI Engine Connected!</h3>
                      <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#0043ce' }}>
                        Running model: <span style={{ fontFamily: 'monospace', fontWeight: '600' }}>llama3.2</span>
                      </p>
                      <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#0043ce' }}>(4 models available)</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ 
                  backgroundColor: '#fff1f1', 
                  border: '1px solid #da1e28',
                  borderRadius: '8px',
                  padding: '24px',
                  position: 'relative'
                }}>
                  <button
                    onClick={() => setShowConnectionAlert(false)}
                    style={{
                      position: 'absolute',
                      top: '16px',
                      right: '16px',
                      backgroundColor: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px',
                      color: '#750e13'
                    }}>
                    <svg width="20" height="20" viewBox="0 0 32 32" fill="currentColor">
                      <path d="M24 9.4L22.6 8 16 14.6 9.4 8 8 9.4l6.6 6.6L8 22.6 9.4 24l6.6-6.6 6.6 6.6 1.4-1.4-6.6-6.6L24 9.4z"/>
                    </svg>
                  </button>
                  
                  <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', alignItems: 'flex-start' }}>
                    <svg width="24" height="24" viewBox="0 0 32 32" fill="#da1e28" style={{ flexShrink: 0, marginTop: '4px' }}>
                      <path d="M16 2C8.3 2 2 8.3 2 16s6.3 14 14 14 14-6.3 14-14S23.7 2 16 2zm0 26C9.4 28 4 22.6 4 16S9.4 4 16 4s12 5.4 12 12-5.4 12-12 12zM21.4 23L16 17.6 10.6 23 9 21.4l5.4-5.4L9 10.6 10.6 9l5.4 5.4L21.4 9l1.6 1.6-5.4 5.4 5.4 5.4z"/>
                    </svg>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '600', color: '#750e13' }}>
                        AI Engine Not Connected
                      </h3>
                      <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#750e13' }}>
                        CORS Error: Ollama must be started with CORS enabled. Run: <span style={{ fontFamily: 'monospace', fontWeight: '600' }}>OLLAMA_ORIGINS=* ollama serve</span>
                      </p>
                    </div>
                  </div>
                  
                  <div style={{ marginLeft: '40px' }}>
                    <div style={{ marginBottom: '16px' }}>
                      <p style={{ margin: '0 0 8px 0', fontSize: '15px', fontWeight: '600', color: '#a2191f' }}>
                        Step 1: <span style={{ fontWeight: '400' }}>Install Ollama from <a href="https://ollama.ai" style={{ color: '#a2191f', textDecoration: 'underline' }}>ollama.ai</a></span>
                      </p>
                    </div>
                    
                    <div style={{ marginBottom: '16px' }}>
                      <p style={{ margin: '0 0 8px 0', fontSize: '15px', fontWeight: '600', color: '#a2191f' }}>
                        Step 2: <span style={{ fontWeight: '400' }}>Enable CORS and start Ollama:</span>
                      </p>
                      <div style={{ 
                        backgroundColor: '#ffd7d9', 
                        padding: '12px', 
                        borderRadius: '4px',
                        fontFamily: 'monospace',
                        fontSize: '13px',
                        color: '#750e13',
                        marginBottom: '12px'
                      }}>
                        OLLAMA_ORIGINS=* ollama serve
                      </div>
                    </div>
                    
                    <div style={{ marginBottom: '16px' }}>
                      <p style={{ margin: '0 0 8px 0', fontSize: '15px', fontWeight: '600', color: '#a2191f' }}>
                        Step 3: <span style={{ fontWeight: '400' }}>Pull a model (in a new terminal):</span>
                      </p>
                      <div style={{ 
                        backgroundColor: '#ffd7d9', 
                        padding: '12px', 
                        borderRadius: '4px',
                        fontFamily: 'monospace',
                        fontSize: '13px',
                        color: '#750e13',
                        marginBottom: '12px'
                      }}>
                        ollama pull llama3.2
                      </div>
                    </div>
                    
                    <div style={{ 
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      backgroundColor: '#fff1f1',
                      padding: '12px',
                      borderRadius: '4px',
                      border: '1px solid #ffd7d9'
                    }}>
                      <svg width="16" height="16" viewBox="0 0 32 32" fill="#f1c21b">
                        <path d="M16 2C8.3 2 2 8.3 2 16s6.3 14 14 14 14-6.3 14-14S23.7 2 16 2zm0 26C9.4 28 4 22.6 4 16S9.4 4 16 4s12 5.4 12 12-5.4 12-12 12z"/>
                        <path d="M15 10h2v11h-2zm0 13h2v2h-2z"/>
                      </svg>
                      <p style={{ margin: 0, fontSize: '13px', color: '#750e13' }}>
                        The OLLAMA_ORIGINS environment variable is required for browser access due to CORS security.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div style={{ padding: '0 32px' }}>
          {/* AI-Powered Document Intelligence Section */}
          <Tile className="hero-tile" style={{ backgroundColor: 'white', padding: '32px', marginBottom: '24px',backgroundColor:"blue" }}>
            <Stack gap={6}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <Watson size={48} style={{ color: '#b8c8b9ff' }} />
                <div>
                  <h1 style={{ fontSize: '28px', fontWeight: '300', margin: 0, color: '#ffffffff' }}>IBM Document Intelligence</h1>
                  <p style={{ fontSize: '16px', color: '#ffffffff', margin: '8px 0 0 0' }}>
                    AI-Powered Summarization & RAG
                  </p>
                </div>
              </div>
              <p style={{ fontSize: '16px', color: '#ffffffff', lineHeight: '1.5', margin: 0 }}>
                Upload any document to automatically extract insights, generate summaries, 
                and interact with your content through our intelligent RAG-powered chatbot. 
                Powered by IBM AI technology and Ollama.
              </p>
            </Stack>
          </Tile>
          
          <div style={{ borderBottom: '1px solid #e0e0e0', backgroundColor: '#ffffff' }}>
            <div style={{ display: 'flex', gap: 0 }}>
              {[
                { name: 'Upload Documents', icon: Upload },
                { name: 'Document Library', icon: Document },
                { name: 'RAG Chat', icon: Chat }
              ].map((tab, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedTab(idx)}
                  style={{
                    padding: '16px 24px',
                    backgroundColor: selectedTab === idx ? '#ffffff' : '#f4f4f4',
                    border: 'none',
                    borderBottom: selectedTab === idx ? '2px solid #0f62fe' : '2px solid transparent',
                    color: selectedTab === idx ? '#0f62fe' : '#525252',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: selectedTab === idx ? '600' : '400',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <tab.icon size={16} />
                  {tab.name}
                  {idx === 1 && documents.length > 0 && (
                    <span style={{
                      backgroundColor: '#e0e0e0',
                      color: '#161616',
                      padding: '2px 8px',
                      borderRadius: '10px',
                      fontSize: '12px'
                    }}>
                      {documents.length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div style={{ backgroundColor: '#ffffff', minHeight: '600px' }}>
            {/* Upload Documents Tab */}
            {selectedTab === 0 && (
              <div style={{ padding: '32px' }}>
                <p style={{ color: '#525252', marginBottom: '24px', fontSize: '14px' }}>
                  Upload reports, research papers, contracts, articles, or any text-based documents for AI-powered analysis. 
                  Supported formats: PDF, Word (.doc, .docx), and Text files.
                </p>

                <div style={{ 
                  backgroundColor: '#d0e2ff', 
                  border: '1px solid #0f62fe',
                  borderRadius: '4px',
                  padding: '16px',
                  marginBottom: '24px'
                }}>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <svg width="20" height="20" viewBox="0 0 32 32" fill="#0f62fe" style={{ flexShrink: 0 }}>
                      <path d="M16 4a12 12 0 1 0 12 12A12 12 0 0 0 16 4zm-1 5h2v11h-2zm1 14a1.5 1.5 0 1 1 1.5-1.5A1.5 1.5 0 0 1 16 23z"/>
                    </svg>
                    <div>
                      <p style={{ margin: 0, fontWeight: '600', color: '#0043ce', marginBottom: '4px' }}>
                        Enhanced AI Summarization:
                      </p>
                      <p style={{ margin: 0, fontSize: '14px', color: '#0043ce' }}>
                        Our system uses advanced multi-stage processing with document-type detection, hierarchical analysis 
                        for long documents, and tailored extraction based on content type (legal, research, financial, etc.) 
                        to deliver the most accurate and comprehensive summaries.
                      </p>
                    </div>
                  </div>
                </div>

                <label style={{
                  display: 'block',
                  border: '2px dashed #8d8d8d',
                  borderRadius: '4px',
                  padding: '64px',
                  textAlign: 'center',
                  backgroundColor: '#ffffff',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#0f62fe';
                  e.currentTarget.style.backgroundColor = '#f4f4f4';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#8d8d8d';
                  e.currentTarget.style.backgroundColor = '#ffffff';
                }}>
                  <input
                    type="file"
                    style={{ display: 'none' }}
                    accept=".pdf,.doc,.docx,.txt"
                    onChange={handleFileUpload}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                    <div style={{
                      width: '64px',
                      height: '64px',
                      backgroundColor: '#d0e2ff',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <svg width="32" height="32" viewBox="0 0 32 32" fill="#0f62fe">
                        <path d="M26 24v4H6v-4H4v4a2 2 0 0 0 2 2h20a2 2 0 0 0 2-2v-4zM16 18L6 8l1.4-1.4 7.6 7.6V2h2v12.2l7.6-7.6L26 8z"/>
                      </svg>
                    </div>
                    <div>
                      <p style={{ color: '#161616', marginBottom: '8px' }}>Drag and drop your document here, or</p>
                      <span style={{
                        display: 'inline-block',
                        padding: '12px 24px',
                        backgroundColor: '#0f62fe',
                        color: 'white',
                        borderRadius: '4px',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: 'pointer'
                      }}>
                        Browse Files
                      </span>
                    </div>
                    <p style={{ fontSize: '12px', color: '#525252' }}>
                      Supported: PDF, Word (.doc, .docx), Text files • Max size: 10MB
                    </p>
                  </div>
                </label>

                {documents.length > 0 && (
                  <div style={{ marginTop: '32px' }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#161616' }}>
                      Recent Uploads
                    </h3>
                    {documents.map(doc => (
                      <div key={doc.id} style={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #e0e0e0',
                        borderRadius: '4px',
                        padding: '16px',
                        marginBottom: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                          <div style={{
                            width: '40px',
                            height: '40px',
                            backgroundColor: '#d0e2ff',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <svg width="20" height="20" viewBox="0 0 32 32" fill="#0f62fe">
                              <path d="M25.7 9.3l-7-7c-.2-.2-.4-.3-.7-.3H8c-1.1 0-2 .9-2 2v24c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V10c0-.3-.1-.5-.3-.7zM18 4.4l5.6 5.6H18V4.4zM24 28H8V4h8v6c0 1.1.9 2 2 2h6v16z"/>
                            </svg>
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                              <p style={{ margin: 0, fontWeight: '500', color: '#161616' }}>{doc.name}</p>
                              <span style={{
                                padding: '2px 8px',
                                backgroundColor: doc.status === 'processed' ? '#24a148' : '#e0e0e0',
                                color: doc.status === 'processed' ? 'white' : '#161616',
                                borderRadius: '10px',
                                fontSize: '11px',
                                fontWeight: '500'
                              }}>
                                {doc.status === 'processed' ? 'Processed' : 'Uploaded'}
                              </span>
                            </div>
                            <p style={{ margin: 0, fontSize: '12px', color: '#525252' }}>
                              Uploaded: {doc.uploadedAt} • Size: {doc.size}
                              {doc.processedAt && ` • Processed: ${doc.processedAt}`}
                            </p>
                          </div>
                        </div>
                        {processingDoc && processingDoc.toString().includes(doc.id.toString()) ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div className="loading-spinner" style={{
                              width: '16px',
                              height: '16px',
                              border: '2px solid #e0e0e0',
                              borderTop: '2px solid #0f62fe',
                              borderRadius: '50%',
                              animation: 'spin 1s linear infinite'
                            }}></div>
                            <span style={{ fontSize: '14px', color: '#525252' }}>
                              {processingDoc === doc.id ? "Processing..." :
                              processingDoc === doc.id + '_retrieving' ? "Retrieving document..." :
                              "Generating embeddings..."}
                            </span>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            {doc.status === 'uploaded' ? (
                              <button style={{
                                padding: '8px 16px',
                                backgroundColor: '#0f62fe',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                fontSize: '14px',
                                cursor: 'pointer',
                                fontWeight: '500'
                              }}>
                                Process with AI
                              </button>
                            ) : (
                              <button 
                                onClick={() => viewDetails(doc)}
                                style={{
                                  padding: '8px 16px',
                                  backgroundColor: 'transparent',
                                  color: '#0f62fe',
                                  border: '1px solid #0f62fe',
                                  borderRadius: '4px',
                                  fontSize: '14px',
                                  cursor: 'pointer',
                                  fontWeight: '500',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px'
                                }}>
                                <svg width="16" height="16" viewBox="0 0 32 32" fill="currentColor">
                                  <path d="M30.94 15.66A16.69 16.69 0 0 0 16 5 16.69 16.69 0 0 0 1.06 15.66a1 1 0 0 0 0 .68A16.69 16.69 0 0 0 16 27a16.69 16.69 0 0 0 14.94-10.66 1 1 0 0 0 0-.68zM16 25c-5.3 0-10.9-3.93-12.93-9C5.1 10.93 10.7 7 16 7s10.9 3.93 12.93 9C26.9 21.07 21.3 25 16 25z"/>
                                  <path d="M16 10a6 6 0 1 0 6 6 6 6 0 0 0-6-6zm0 10a4 4 0 1 1 4-4 4 4 0 0 1-4 4z"/>
                                </svg>
                                View Details
                              </button>
                            )}
                            <button 
                              onClick={() => deleteDoc(doc.id)}
                              style={{
                                padding: '8px',
                                backgroundColor: 'transparent',
                                color: '#da1e28',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer'
                              }}>
                              <svg width="16" height="16" viewBox="0 0 32 32" fill="currentColor">
                                <path d="M12 12h2v12h-2zm6 0h2v12h-2z"/>
                                <path d="M4 6v2h2v20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8h2V6zm4 22V8h16v20zm4-26h8v2h-8z"/>
                              </svg>
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {/* AI Engine Setup Guide for Upload Tab */}
                <div style={{ 
                  marginBottom: '24px', 
                  backgroundColor: '#f4f4f4', 
                  borderRadius: '4px', 
                  padding: '24px', 
                  marginTop:"1rem"
                }}>
                  <div style={{ display: 'flex', alignItems: 'start', gap: '12px', marginBottom: '16px' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      backgroundColor: '#0f62fe',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                   <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-settings w-5 h-5 text-white" aria-hidden="true"><path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"></path><circle cx="12" cy="12" r="3"></circle></svg>
                      
                    </div>
                    <h3 style={{ fontSize: '18px', fontWeight: '600', marginTop:'0.5rem', color: '#161616' }}>
                      AI Engine Setup Guide
                    </h3>
                  </div>
                  
                  <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
                    <div style={{ marginBottom: '16px' }}>
                      <p style={{ fontWeight: '600', marginBottom: '8px', color: '#161616' }}>
                        1. Install Ollama: <span style={{ fontWeight: '400' }}>Download from <a href="https://ollama.ai" style={{ color: '#0f62fe' }}>ollama.ai</a> and install on your system</span>
                      </p>
                    </div>
                    
                    <div style={{ marginBottom: '16px' }}>
                      <p style={{ fontWeight: '600', marginBottom: '8px', color: '#161616' }}>
                        2. Enable CORS & Start Ollama: <span style={{ fontWeight: '400' }}>Run with CORS enabled for browser access:</span>
                      </p>
                      <div style={{ 
                        backgroundColor: '#161616', 
                        color: '#42be65', 
                        padding: '12px', 
                        borderRadius: '4px',
                        fontFamily: 'monospace',
                        fontSize: '13px'
                      }}>
                        OLLAMA_ORIGINS=* ollama serve
                      </div>
                    </div>
                    
                    <div style={{ marginBottom: '16px' }}>
                      <p style={{ fontWeight: '600', marginBottom: '8px', color: '#161616' }}>
                        3. Pull a model: <span style={{ fontWeight: '400' }}>In a new terminal, download a model:</span>
                      </p>
                      <div style={{ 
                        backgroundColor: '#161616', 
                        color: '#42be65', 
                        padding: '12px', 
                        borderRadius: '4px',
                        fontFamily: 'monospace',
                        fontSize: '13px'
                      }}>
                        ollama pull llama3.2
                      </div>
                      <p style={{ color: '#525252', marginTop: '8px' }}>
                        Recommended models: llama3.2, mistral, llama2, gemma
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Document Library Tab */}
            {selectedTab === 1 && (
              <div style={{ padding: '32px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '24px' }}>
                  <div>
                    <h2 style={{ fontSize: '20px', fontWeight: '600', margin: 0, marginBottom: '4px', color: '#161616' }}>
                      Document Library
                    </h2>
                    <p style={{ margin: 0, color: '#525252', fontSize: '14px' }}>
                      Manage and analyze your uploaded documents
                    </p>
                  </div>
                  <p style={{ fontSize: '14px', color: '#525252' }}>
                    {documents.filter(d => d.status === 'processed').length} processed • {documents.length} total
                  </p>
                </div>

                {documents.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '64px', color: '#525252' }}>
                    <svg width="48" height="48" viewBox="0 0 32 32" fill="#8d8d8d" style={{ margin: '0 auto 16px' }}>
                      <path d="M25.7 9.3l-7-7c-.2-.2-.4-.3-.7-.3H8c-1.1 0-2 .9-2 2v24c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V10c0-.3-.1-.5-.3-.7zM18 4.4l5.6 5.6H18V4.4zM24 28H8V4h8v6c0 1.1.9 2 2 2h6v16z"/>
                    </svg>
                    <p>No documents uploaded yet</p>
                  </div>
                ) : (
                  <div>
                    {documents.map(doc => (
                      <div key={doc.id} style={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #e0e0e0',
                        borderRadius: '4px',
                        padding: '16px',
                        marginBottom: '12px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: doc.summary ? '12px' : 0 }}>
                          <div style={{ display: 'flex', gap: '12px', flex: 1 }}>
                            <div style={{
                              width: '40px',
                              height: '40px',
                              backgroundColor: '#d0e2ff',
                              borderRadius: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}>
                              <svg width="20" height="20" viewBox="0 0 32 32" fill="#0f62fe">
                                <path d="M25.7 9.3l-7-7c-.2-.2-.4-.3-.7-.3H8c-1.1 0-2 .9-2 2v24c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V10c0-.3-.1-.5-.3-.7zM18 4.4l5.6 5.6H18V4.4zM24 28H8V4h8v6c0 1.1.9 2 2 2h6v16z"/>
                              </svg>
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                <p style={{ margin: 0, fontWeight: '500', color: '#161616' }}>{doc.name}</p>
                                {doc.status === 'processed' && (
                                  <span style={{
                                    padding: '2px 8px',
                                    backgroundColor: '#24a148',
                                    color: 'white',
                                    borderRadius: '10px',
                                    fontSize: '11px',
                                    fontWeight: '500'
                                  }}>
                                    Processed
                                  </span>
                                )}
                              </div>
                              <p style={{ margin: 0, fontSize: '12px', color: '#525252' }}>
                                Uploaded: {doc.uploadedAt} • Size: {doc.size}
                                {doc.processedAt && ` • Processed: ${doc.processedAt}`}
                              </p>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            {processingDoc && processingDoc.toString().includes(doc.id.toString()) ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div className="loading-spinner" style={{
                                  width: '16px',
                                  height: '16px',
                                  border: '2px solid #e0e0e0',
                                  borderTop: '2px solid #0f62fe',
                                  borderRadius: '50%',
                                  animation: 'spin 1s linear infinite'
                                }}></div>
                                <span style={{ fontSize: '14px', color: '#525252' }}>
                                  {processingDoc === doc.id ? "Processing..." :
                                  processingDoc === doc.id + '_retrieving' ? "Retrieving document..." :
                                  "Generating embeddings..."}
                                </span>
                              </div>
                            ) : (
                              <>
                                <button 
                                  onClick={() => viewDetails(doc)}
                                  style={{
                                    padding: '8px 16px',
                                    backgroundColor: 'transparent',
                                    color: '#0f62fe',
                                    border: '1px solid transparent',
                                    borderRadius: '4px',
                                    fontSize: '14px',
                                    cursor: 'pointer',
                                    fontWeight: '500',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f4f4f4'}
                                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                                  <svg width="16" height="16" viewBox="0 0 32 32" fill="currentColor">
                                    <path d="M30.94 15.66A16.69 16.69 0 0 0 16 5 16.69 16.69 0 0 0 1.06 15.66a1 1 0 0 0 0 .68A16.69 16.69 0 0 0 16 27a16.69 16.69 0 0 0 14.94-10.66 1 1 0 0 0 0-.68zM16 25c-5.3 0-10.9-3.93-12.93-9C5.1 10.93 10.7 7 16 7s10.9 3.93 12.93 9C26.9 21.07 21.3 25 16 25z"/>
                                    <path d="M16 10a6 6 0 1 0 6 6 6 6 0 0 0-6-6zm0 10a4 4 0 1 1 4-4 4 4 0 0 1-4 4z"/>
                                  </svg>
                                  View Details
                                </button>
                                <button 
                                  onClick={() => deleteDoc(doc.id)}
                                  style={{
                                    padding: '8px',
                                    backgroundColor: 'transparent',
                                    color: '#525252',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = '#f4f4f4';
                                    e.currentTarget.style.color = '#da1e28';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                    e.currentTarget.style.color = '#525252';
                                  }}>
                                  <svg width="16" height="16" viewBox="0 0 32 32" fill="currentColor">
                                    <path d="M12 12h2v12h-2zm6 0h2v12h-2z"/>
                                    <path d="M4 6v2h2v20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8h2V6zm4 22V8h16v20zm4-26h8v2h-8z"/>
                                  </svg>
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                        {doc.summary && (
                          <p style={{ 
                            margin: '0 0 0 52px', 
                            fontSize: '13px', 
                            color: '#525252',
                            lineHeight: '1.5',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical'
                          }}>
                            {doc.summary}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* AI Engine Setup Guide */}
                <div style={{ 
                  marginTop: '32px', 
                  backgroundColor: '#f4f4f4', 
                  borderRadius: '4px', 
                  padding: '24px' 
                }}>
                  <div style={{ display: 'flex', alignItems: 'start', gap: '12px', marginBottom: '16px' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      backgroundColor: '#0f62fe',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-settings w-5 h-5 text-white" aria-hidden="true"><path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"></path><circle cx="12" cy="12" r="3"></circle></svg>
                    </div>
                    <h3 style={{ fontSize: '18px', fontWeight: '600', marginTop:"0.5rem", color: '#161616' }}>
                      AI Engine Setup Guide
                    </h3>
                  </div>
                  
                  <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
                    <div style={{ marginBottom: '16px' }}>
                      <p style={{ fontWeight: '600', marginBottom: '8px', color: '#161616' }}>
                        1. Install Ollama: <span style={{ fontWeight: '400' }}>Download from <a href="https://ollama.ai" style={{ color: '#0f62fe' }}>ollama.ai</a> and install on your system</span>
                      </p>
                    </div>
                    
                    <div style={{ marginBottom: '16px' }}>
                      <p style={{ fontWeight: '600', marginBottom: '8px', color: '#161616' }}>
                        2. Enable CORS & Start Ollama: <span style={{ fontWeight: '400' }}>Run with CORS enabled for browser access:</span>
                      </p>
                      <div style={{ 
                        backgroundColor: '#161616', 
                        color: '#42be65', 
                        padding: '12px', 
                        borderRadius: '4px',
                        fontFamily: 'monospace',
                        fontSize: '13px'
                      }}>
                        OLLAMA_ORIGINS=* ollama serve
                      </div>
                    </div>
                    
                    <div style={{ marginBottom: '16px' }}>
                      <p style={{ fontWeight: '600', marginBottom: '8px', color: '#161616' }}>
                        3. Pull a model: <span style={{ fontWeight: '400' }}>In a new terminal, download a model:</span>
                      </p>
                      <div style={{ 
                        backgroundColor: '#161616', 
                        color: '#42be65', 
                        padding: '12px', 
                        borderRadius: '4px',
                        fontFamily: 'monospace',
                        fontSize: '13px'
                      }}>
                        ollama pull llama3.2
                      </div>
                      <p style={{ color: '#525252', marginTop: '8px' }}>
                        Recommended models: llama3.2, mistral, llama2, gemma
                      </p>
                    </div>
                    
                    <div style={{ marginBottom: '16px' }}>
                      <p style={{ fontWeight: '600', marginBottom: '8px', color: '#161616' }}>Available AI models:</p>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {['mistral:latest', 'llama3.2:latest', 'llama3.1:latest', 'granite3-moe:3b'].map((model, idx) => (
                          <span key={idx} style={{
                            padding: '4px 12px',
                            backgroundColor: '#0f62fe',
                            color: 'white',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: '500'
                          }}>
                            {model}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <p style={{ color: '#525252', fontStyle: 'italic', margin: 0 }}>
                      About IBM Document Intelligence: This platform leverages advanced AI models for document understanding, 
                      intelligent extraction, automatic summarization, and RAG-powered question answering. All processing 
                      happens locally using Ollama for enhanced privacy and performance.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* RAG Chat Tab */}
            {selectedTab === 2 && (
              <div style={{ padding: '32px' }}>
                <div style={{ 
                  backgroundColor: '#ffffff', 
                  border: '1px solid #e0e0e0', 
                  borderRadius: '4px',
                  height: '600px',
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                  <div style={{ 
                    borderBottom: '1px solid #e0e0e0', 
                    padding: '16px' 
                  }}>
                    <p style={{ fontSize: '14px', color: '#525252', marginBottom: '12px' }}>
                      Search in documents:
                    </p>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{
                        padding: '6px 12px',
                        backgroundColor: '#161616',
                        color: 'white',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '500'
                      }}>
                        All Documents
                      </span>
                      {documents.map(doc => (
                        <span key={doc.id} style={{
                          padding: '6px 12px',
                          backgroundColor: '#ffffff',
                          color: '#161616',
                          border: '1px solid #e0e0e0',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '500'
                        }}>
                          {doc.name}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                    {chatMessages.length === 0 ? (
                      <div style={{ 
                        display: 'flex', 
                        gap: '12px',
                        backgroundColor: '#f4f4f4',
                        padding: '16px',
                        borderRadius: '4px'
                      }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          backgroundColor: '#0f62fe',
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          <svg width="20" height="20" viewBox="0 0 32 32" fill="white">
                            <path d="M16 2a14 14 0 1 0 14 14A14 14 0 0 0 16 2zm0 26a12 12 0 1 1 12-12 12 12 0 0 1-12 12z"/>
                            <circle cx="16" cy="16" r="4"/>
                          </svg>
                        </div>
                        <p style={{ color: '#161616', margin: '8px 0 0 0', lineHeight: '1.5' }}>
                          Hello! I'm your IBM AI assistant. I can help you analyze and understand your documents. 
                          Ask me anything about your uploaded content.
                        </p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {chatMessages.map((msg, idx) => (
                          <div key={idx} style={{ 
                            display: 'flex', 
                            gap: '12px',
                            justifyContent: msg.type === 'user' ? 'flex-end' : 'flex-start'
                          }}>
                            {msg.type === 'assistant' && (
                              <div style={{
                                width: '40px',
                                height: '40px',
                                backgroundColor: '#0f62fe',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                              }}>
                                <svg width="20" height="20" viewBox="0 0 32 32" fill="white">
                                  <path d="M16 2a14 14 0 1 0 14 14A14 14 0 0 0 16 2zm0 26a12 12 0 1 1 12-12 12 12 0 0 1-12 12z"/>
                                  <circle cx="16" cy="16" r="4"/>
                                </svg>
                              </div>
                            )}
                            <div style={{
                              maxWidth: '70%',
                              padding: '12px 16px',
                              borderRadius: '4px',
                              backgroundColor: msg.type === 'user' ? '#0f62fe' : '#f4f4f4',
                              color: msg.type === 'user' ? 'white' : '#161616',
                              fontSize: '14px',
                              lineHeight: '1.5'
                            }}>
                              {msg.text}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div style={{ 
                    borderTop: '1px solid #e0e0e0', 
                    padding: '16px',
                    display: 'flex',
                    gap: '12px'
                  }}>
                    <input
                      type="text"
                      placeholder="Ask a question about your documents..."
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                      style={{
                        flex: 1,
                        padding: '12px',
                        border: '1px solid #8d8d8d',
                        borderRadius: '4px',
                        fontSize: '14px',
                        outline: 'none',
                        fontFamily: "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#0f62fe'}
                      onBlur={(e) => e.target.style.borderColor = '#8d8d8d'}
                    />
                    <button 
                      onClick={sendMessage}
                      style={{
                        padding: '12px 24px',
                        backgroundColor: '#0f62fe',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0353e9'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0f62fe'}>
                      <svg width="16" height="16" viewBox="0 0 32 32" fill="white">
                        <path d="M27.45 15.11l-22-11a1 1 0 0 0-1.08.12 1 1 0 0 0-.33 1L6.69 15l-2.65 9.77a1 1 0 0 0 .33 1 1 1 0 0 0 1.08.12l22-11a1 1 0 0 0 0-1.78zm-20.9 10.2L8.38 17H16v-2H8.38L6.55 6.69 24.76 16z"/>
                      </svg>
                      Send
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Document Details Modal - Updated to match screenshot */}
        {showDetails && selectedDoc && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
          }}
          onClick={() => setShowDetails(false)}>
            <div 
              style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                width: '90%',
                maxWidth: '900px',
                maxHeight: '90vh',
                overflow: 'auto',
                boxShadow: '0 8px 16px rgba(0, 0, 0, 0.2)'
              }}
              onClick={(e) => e.stopPropagation()}>
              <div style={{ 
                padding: '24px', 
                borderBottom: '1px solid #e0e0e0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: '600', margin: 0, color: '#161616' }}>
                    {selectedDoc.name}
                  </h2>
                  <p style={{ fontSize: '14px', color: '#525252', margin: '4px 0 0 0' }}>
                    Document Analysis
                  </p>
                </div>
                <button
                  onClick={() => setShowDetails(false)}
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '8px',
                    color: '#525252'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#161616'}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#525252'}>
                  <svg width="20" height="20" viewBox="0 0 32 32" fill="currentColor">
                    <path d="M24 9.4L22.6 8 16 14.6 9.4 8 8 9.4l6.6 6.6L8 22.6 9.4 24l6.6-6.6 6.6 6.6 1.4-1.4-6.6-6.6L24 9.4z"/>
                  </svg>
                </button>
              </div>
              
              <div style={{ padding: '24px' }}>
                {/* Metadata Section */}
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                  gap: '16px',
                  marginBottom: '24px'
                }}>
                  <div>
                    <p style={{ fontSize: '12px', color: '#525252', margin: '0 0 4px 0' }}>Status</p>
                    <p style={{ fontSize: '14px', fontWeight: '500', margin: 0, color: '#161616' }}>
                      {selectedDoc.status === 'processed' ? 'Processed' : 'Uploaded'}
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: '12px', color: '#525252', margin: '0 0 4px 0' }}>Uploaded</p>
                    <p style={{ fontSize: '14px', fontWeight: '500', margin: 0, color: '#161616' }}>
                      {selectedDoc.uploadedAt}
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: '12px', color: '#525252', margin: '0 0 4px 0' }}>Processed</p>
                    <p style={{ fontSize: '14px', fontWeight: '500', margin: 0, color: '#161616' }}>
                      {selectedDoc.processedAt || 'November 6, 2025 at 08:51 AM'}
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: '12px', color: '#525252', margin: '0 0 4px 0' }}>File Size</p>
                    <p style={{ fontSize: '14px', fontWeight: '500', margin: 0, color: '#161616' }}>
                      {selectedDoc.size}
                    </p>
                  </div>
                </div>

                {/* AI-Generated Summary */}
                {selectedDoc.summary && (
                  <div style={{ marginBottom: '24px' }}>
                    <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#161616' }}>
                      AI-Generated Summary
                    </h4>
                    <div style={{ 
                      backgroundColor: '#f4f4f4', 
                      borderRadius: '4px', 
                      padding: '16px',
                      border: '1px solid #e0e0e0'
                    }}>
                      <p style={{ margin: 0, color: '#161616', fontSize: '14px', lineHeight: '1.6' }}>
                        {selectedDoc.summary}
                      </p>
                    </div>
                  </div>
                )}

                {/* Extracted Information */}
                <div>
                  <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#161616' }}>
                    Extracted Information
                  </h4>
                  
                  {/* Document Type Tags */}
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                    <span style={{
                      padding: '4px 12px',
                      backgroundColor: '#d0e2ff',
                      color: '#0043ce',
                      border: '1px solid #0f62fe',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '500'
                    }}>
                      Type: {selectedDoc.type || 'Legal'}
                    </span>
                    <span style={{
                      padding: '4px 12px',
                      backgroundColor: '#defbe6',
                      color: '#0e6027',
                      border: '1px solid #24a148',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '500'
                    }}>
                      {selectedDoc.sections || 3} sections analyzed
                    </span>
                    <span style={{
                      padding: '4px 12px',
                      backgroundColor: '#e0e0e0',
                      color: '#161616',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '500'
                    }}>
                      {selectedDoc.chars || '32.6K'} chars
                    </span>
                  </div>

                  {/* Important Clauses */}
                  <div style={{ marginBottom: '16px' }}>
                    <h5 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#161616' }}>
                      Important Clauses or Conditions:
                    </h5>
                    <div style={{ 
                      borderLeft: '4px solid #0f62fe', 
                      paddingLeft: '16px',
                      backgroundColor: '#f4f4f4',
                      padding: '16px',
                      borderRadius: '0 4px 4px 0'
                    }}>
                      <ol style={{ margin: 0, paddingLeft: '16px', color: '#525252', fontSize: '14px', lineHeight: '1.6' }}>
                        <li>The License explicitly affirms your unlimited permission to run the unmodified Program.</li>
                        <li>The output from running a covered work is covered by this License only if the output, given its content, constitutes a covered work.</li>
                        <li>Conveying under any other circumstances is permitted solely under the conditions stated below.</li>
                        <li>Sublicensing is not allowed; section 10 makes it unnecessary.</li>
                        <li>No covered work shall be deemed part of an effective technological measure under any applicable law fulfilling obligations under article 11 of the WIPO copyright treaty adopted on December 20, 1996, or similar laws prohibiting or restricting circumvention of such measures.</li>
                      </ol>
                    </div>
                  </div>

                  {/* Other Key Information */}
                  <div>
                    <h5 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#161616' }}>
                      Other Key Information:
                    </h5>
                    <div style={{ 
                      borderLeft: '4px solid #0f62fe', 
                      paddingLeft: '16px',
                      backgroundColor: '#f4f4f4',
                      padding: '16px',
                      borderRadius: '0 4px 4px 0'
                    }}>
                      <ul style={{ margin: 0, paddingLeft: '16px', color: '#525252', fontSize: '14px', lineHeight: '1.6' }}>
                        <li>The AGPL is a free, copyleft license for software and other kinds of works.</li>
                        <li>The licenses are intended to guarantee your freedom to share and change all versions of a program.</li>
                        <li>This License explicitly affirms your unlimited permission to run the unmodified Program.</li>
                      </ul>
                    </div>
                  </div>
                </div>
                
                {/* Actions */}
                <div style={{ marginTop: '24px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => setShowDetails(false)}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: 'transparent',
                      color: '#0f62fe',
                      border: '1px solid #0f62fe',
                      borderRadius: '4px',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f4f4f4';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}>
                    Close
                  </button>
                  <button
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#0f62fe',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0353e9'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0f62fe'}>
                    <svg width="16" height="16" viewBox="0 0 32 32" fill="white">
                      <path d="M26 24v4H6v-4H4v4a2 2 0 0 0 2 2h20a2 2 0 0 0 2-2v-4zM16 18L6 8l1.4-1.4 7.6 7.6V2h2v12.2l7.6-7.6L26 8z"/>
                    </svg>
                    Download Original Document
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          * {
            box-sizing: border-box;
          }
        `}</style>
      </div>
    );
  };

  export default App;