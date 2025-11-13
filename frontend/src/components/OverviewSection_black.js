import React, { useState } from 'react';
import { 
  Tile,
  Stack,
  Button,
  Tag,
  InlineNotification,
  FileUploader,
  FileUploaderItem,
  FileUploaderDropContainer,
  Content,
  Grid,
  Column,
  Modal,
  TextInput,
  Accordion,
  AccordionItem
} from '@carbon/react';
import { 
  Watson,
  Upload,
  Document,
  Chat,
  ConnectionSignal,
  Renew,
  Close,
  Download,
  View,
  TrashCan,
  Information,
  Warning
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

  const handleFileUpload = (event) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const file = files[0];
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
    setAiConnected(true);
    setShowConnectionAlert(true);
    
    setTimeout(() => {
      setAiConnected(false);
    }, 3000);
  };

  // Custom Tabs Component for Dark Theme
  const CustomTabs = ({ tabs, selectedIndex, onTabChange }) => (
    <div className="custom-tabs">
      <div className="tabs-header">
        {tabs.map((tab, idx) => (
          <button
            key={idx}
            onClick={() => onTabChange(idx)}
            className={`tab-button ${selectedIndex === idx ? 'active' : ''}`}
          >
            <tab.icon size={16} />
            {tab.name}
            {idx === 1 && documents.length > 0 && (
              <Tag size="sm" className="tab-badge">
                {documents.length}
              </Tag>
            )}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <Grid condensed>
          <Column sm={4} md={8} lg={16}>
            <div className="header-content">
              <div className="brand-section">
                <div className="logo">
                  <Watson size={32} />
                </div>
                <div className="brand-text">
                  <h1 className="brand-title">IBM Document Intelligence</h1>
                  <p className="brand-subtitle">AI-Powered Summarization & RAG</p>
                </div>
              </div>
              
              <div className="header-actions">
                <Tag 
                  type={aiConnected ? 'green' : 'red'} 
                  size="sm"
                  className="connection-tag"
                >
                  <div className="status-indicator">
                    <div className={`status-dot ${aiConnected ? 'connected' : 'disconnected'}`} />
                    {aiConnected ? 'AI Connected' : 'AI Disconnected'}
                  </div>
                </Tag>
                
                <Tag type="blue" size="sm" className="model-tag">
                  llama3.2
                </Tag>
                
                <Button
                  kind="ghost"
                  size="sm"
                  renderIcon={ConnectionSignal}
                  onClick={testConnection}
                >
                  Test Connection
                </Button>
                
                <Button
                  kind="ghost"
                  size="sm"
                  renderIcon={Renew}
                  iconDescription="Refresh"
                  onClick={() => window.location.reload()}
                  hasIconOnly
                />
              </div>
            </div>
          </Column>
        </Grid>
      </header>

      {/* Connection Alert Modal */}
      {showConnectionAlert && (
        <Modal
          open={showConnectionAlert}
          passiveModal
          onRequestClose={() => setShowConnectionAlert(false)}
          size="md"
          className="connection-modal"
        >
          {aiConnected ? (
            <InlineNotification
              kind="success"
              title="AI Engine Connected!"
              subtitle={
                <div>
                  <p>Running model: <strong>llama3.2</strong></p>
                  <p>(4 models available)</p>
                </div>
              }
              lowContrast
            />
          ) : (
            <div className="connection-error-content">
              <InlineNotification
                kind="error"
                title="AI Engine Not Connected"
                subtitle="CORS Error: Ollama must be started with CORS enabled."
                lowContrast
              />
              
              <Accordion className="setup-accordion">
                <AccordionItem title="Setup Instructions">
                  <div className="setup-steps">
                    <div className="setup-step">
                      <h5>Step 1: Install Ollama</h5>
                      <p>Download from <a href="https://ollama.ai" target="_blank" rel="noopener noreferrer">ollama.ai</a> and install on your system</p>
                    </div>
                    
                    <div className="setup-step">
                      <h5>Step 2: Enable CORS and Start Ollama</h5>
                      <p>Run with CORS enabled for browser access:</p>
                      <div className="code-block">
                        <code>OLLAMA_ORIGINS=* ollama serve</code>
                      </div>
                    </div>
                    
                    <div className="setup-step">
                      <h5>Step 3: Pull a Model</h5>
                      <p>In a new terminal, download a model:</p>
                      <div className="code-block">
                        <code>ollama pull llama3.2</code>
                      </div>
                    </div>
                  </div>
                  
                  <InlineNotification
                    kind="warning"
                    title="Important"
                    subtitle="The OLLAMA_ORIGINS environment variable is required for browser access due to CORS security."
                    lowContrast
                    className="info-notice"
                  />
                </AccordionItem>
              </Accordion>
            </div>
          )}
        </Modal>
      )}

      {/* Main Content */}
      <Content className="main-content">
        <Grid condensed>
          <Column sm={4} md={8} lg={16}>
            {/* Hero Section */}
            <Tile className="hero-tile">
              <Stack gap={6}>
                <div className="hero-content">
                  <Watson size={48} className="hero-icon" />
                  <div>
                    <h1 className="hero-title">IBM Document Intelligence</h1>
                    <p className="hero-subtitle">AI-Powered Summarization & RAG</p>
                  </div>
                </div>
                <p className="hero-description">
                  Upload any document to automatically extract insights, generate summaries, 
                  and interact with your content through our intelligent RAG-powered chatbot. 
                  Powered by IBM AI technology and Ollama.
                </p>
              </Stack>
            </Tile>

            {/* Tabs */}
            <CustomTabs
              tabs={[
                { name: 'Upload Documents', icon: Upload },
                { name: 'Document Library', icon: Document },
                { name: 'RAG Chat', icon: Chat }
              ]}
              selectedIndex={selectedTab}
              onTabChange={setSelectedTab}
            />

            {/* Tab Content */}
            <div className="tab-content">
              {/* Upload Documents Tab */}
              {selectedTab === 0 && (
                <Stack gap={6}>
                  <p className="tab-description">
                    Upload reports, research papers, contracts, articles, or any text-based documents for AI-powered analysis. 
                    Supported formats: PDF, Word (.doc, .docx), and Text files.
                  </p>

                  <InlineNotification
                    kind="info"
                    title="Enhanced AI Summarization"
                    subtitle="Our system uses advanced multi-stage processing with document-type detection, hierarchical analysis for long documents, and tailored extraction based on content type (legal, research, financial, etc.) to deliver the most accurate and comprehensive summaries."
                    lowContrast
                  />

                  <FileUploader
                    labelTitle="Drag and drop your document here, or"
                    buttonLabel="Browse Files"
                    accept={['.pdf', '.doc', '.docx', '.txt']}
                    name="document"
                    multiple={false}
                    iconDescription="Delete file"
                    onChange={handleFileUpload}
                    className="file-uploader-dark"
                  />

                  {documents.length > 0 && (
                    <div className="recent-uploads">
                      <h3>Recent Uploads</h3>
                      <Stack gap={4}>
                        {documents.map(doc => (
                          <Tile key={doc.id} className="document-tile">
                            <div className="document-info">
                              <div className="document-icon">
                                <Document size={20} />
                              </div>
                              <div className="document-details">
                                <div className="document-header">
                                  <h4>{doc.name}</h4>
                                  <Tag
                                    type={doc.status === 'processed' ? 'green' : 'gray'}
                                    size="sm"
                                  >
                                    {doc.status === 'processed' ? 'Processed' : 'Uploaded'}
                                  </Tag>
                                </div>
                                <p className="document-meta">
                                  Uploaded: {doc.uploadedAt} • Size: {doc.size}
                                  {doc.processedAt && ` • Processed: ${doc.processedAt}`}
                                </p>
                              </div>
                            </div>
                            
                            <div className="document-actions">
                              {processingDoc && processingDoc.toString().includes(doc.id.toString()) ? (
                                <div className="processing-indicator">
                                  <InlineNotification
                                    kind="info"
                                    title={
                                      processingDoc === doc.id ? "Processing..." :
                                      processingDoc === doc.id + '_retrieving' ? "Retrieving document..." :
                                      "Generating embeddings..."
                                    }
                                    hideCloseButton
                                    lowContrast
                                  />
                                </div>
                              ) : (
                                <div className="action-buttons">
                                  {doc.status === 'processed' ? (
                                    <Button
                                      kind="ghost"
                                      size="sm"
                                      renderIcon={View}
                                      onClick={() => viewDetails(doc)}
                                    >
                                      View Details
                                    </Button>
                                  ) : (
                                    <Button
                                      size="sm"
                                      disabled
                                    >
                                      Process with AI
                                    </Button>
                                  )}
                                  <Button
                                    kind="ghost"
                                    hasIconOnly
                                    renderIcon={TrashCan}
                                    iconDescription="Delete"
                                    onClick={() => deleteDoc(doc.id)}
                                    size="sm"
                                  />
                                </div>
                              )}
                            </div>
                          </Tile>
                        ))}
                      </Stack>
                    </div>
                  )}

                  {/* Setup Guide */}
                  <Tile className="setup-guide">
                    <div className="guide-header">
                      <Information size={20} />
                      <h3>AI Engine Setup Guide</h3>
                    </div>
                    <Stack gap={4}>
                      <div className="guide-step">
                        <h5>1. Install Ollama</h5>
                        <p>Download from <a href="https://ollama.ai" target="_blank" rel="noopener noreferrer">ollama.ai</a> and install on your system</p>
                      </div>
                      
                      <div className="guide-step">
                        <h5>2. Enable CORS & Start Ollama</h5>
                        <p>Run with CORS enabled for browser access:</p>
                        <div className="code-block">
                          <code>OLLAMA_ORIGINS=* ollama serve</code>
                        </div>
                      </div>
                      
                      <div className="guide-step">
                        <h5>3. Pull a Model</h5>
                        <p>In a new terminal, download a model:</p>
                        <div className="code-block">
                          <code>ollama pull llama3.2</code>
                        </div>
                        <p className="model-suggestion">Recommended models: llama3.2, mistral, llama2, gemma</p>
                      </div>
                    </Stack>
                  </Tile>
                </Stack>
              )}

              {/* Document Library Tab */}
              {selectedTab === 1 && (
                <Stack gap={6}>
                  <div className="library-header">
                    <div>
                      <h2>Document Library</h2>
                      <p>Manage and analyze your uploaded documents</p>
                    </div>
                    <div className="library-stats">
                      <Tag size="sm" type="green">
                        {documents.filter(d => d.status === 'processed').length} processed
                      </Tag>
                      <Tag size="sm" type="gray">
                        {documents.length} total
                      </Tag>
                    </div>
                  </div>

                  {documents.length === 0 ? (
                    <Tile className="empty-state">
                      <Document size={48} />
                      <h3>No documents uploaded yet</h3>
                      <p>Upload documents to start analyzing with AI</p>
                    </Tile>
                  ) : (
                    <Stack gap={4}>
                      {documents.map(doc => (
                        <Tile key={doc.id} className="document-tile">
                          <div className="document-info">
                            <div className="document-icon">
                              <Document size={20} />
                            </div>
                            <div className="document-details">
                              <div className="document-header">
                                <h4>{doc.name}</h4>
                                {doc.status === 'processed' && (
                                  <Tag type="green" size="sm">Processed</Tag>
                                )}
                              </div>
                              <p className="document-meta">
                                Uploaded: {doc.uploadedAt} • Size: {doc.size}
                                {doc.processedAt && ` • Processed: ${doc.processedAt}`}
                              </p>
                              {doc.summary && (
                                <p className="document-summary">{doc.summary}</p>
                              )}
                            </div>
                          </div>
                          
                          <div className="document-actions">
                            {processingDoc && processingDoc.toString().includes(doc.id.toString()) ? (
                              <InlineNotification
                                kind="info"
                                title={
                                  processingDoc === doc.id ? "Processing..." :
                                  processingDoc === doc.id + '_retrieving' ? "Retrieving document..." :
                                  "Generating embeddings..."
                                }
                                hideCloseButton
                                lowContrast
                              />
                            ) : (
                              <div className="action-buttons">
                                <Button
                                  kind="ghost"
                                  size="sm"
                                  renderIcon={View}
                                  onClick={() => viewDetails(doc)}
                                >
                                  View Details
                                </Button>
                                <Button
                                  kind="ghost"
                                  hasIconOnly
                                  renderIcon={TrashCan}
                                  iconDescription="Delete"
                                  onClick={() => deleteDoc(doc.id)}
                                  size="sm"
                                />
                              </div>
                            )}
                          </div>
                        </Tile>
                      ))}
                    </Stack>
                  )}

                  {/* Setup Guide */}
                  <Tile className="setup-guide">
                    <div className="guide-header">
                      <Information size={20} />
                      <h3>AI Engine Setup Guide</h3>
                    </div>
                    <Stack gap={4}>
                      <div className="guide-step">
                        <h5>Available AI Models</h5>
                        <div className="model-tags">
                          {['mistral:latest', 'llama3.2:latest', 'llama3.1:latest', 'granite3-moe:3b'].map((model, idx) => (
                            <Tag key={idx} type="blue" size="sm">{model}</Tag>
                          ))}
                        </div>
                      </div>
                      
                      <p className="guide-footer">
                        About IBM Document Intelligence: This platform leverages advanced AI models for document understanding, 
                        intelligent extraction, automatic summarization, and RAG-powered question answering. All processing 
                        happens locally using Ollama for enhanced privacy and performance.
                      </p>
                    </Stack>
                  </Tile>
                </Stack>
              )}

              {/* RAG Chat Tab */}
              {selectedTab === 2 && (
                <div className="chat-container">
                  <div className="chat-header">
                    <p>Search in documents:</p>
                    <div className="document-filters">
                      <Tag type="high-contrast" size="sm">All Documents</Tag>
                      {documents.map(doc => (
                        <Tag key={doc.id} type="outline" size="sm">{doc.name}</Tag>
                      ))}
                    </div>
                  </div>
                  
                  <div className="chat-messages">
                    {chatMessages.length === 0 ? (
                      <div className="welcome-message">
                        <div className="assistant-avatar">
                          <Watson size={20} />
                        </div>
                        <p>
                          Hello! I'm your IBM AI assistant. I can help you analyze and understand your documents. 
                          Ask me anything about your uploaded content.
                        </p>
                      </div>
                    ) : (
                      <Stack gap={4}>
                        {chatMessages.map((msg, idx) => (
                          <div key={idx} className={`message ${msg.type}`}>
                            {msg.type === 'assistant' && (
                              <div className="assistant-avatar">
                                <Watson size={20} />
                              </div>
                            )}
                            <div className="message-bubble">
                              {msg.text}
                            </div>
                          </div>
                        ))}
                      </Stack>
                    )}
                  </div>
                  
                  <div className="chat-input">
                    <TextInput
                      placeholder="Ask a question about your documents..."
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                      className="chat-input-field"
                    />
                    <Button
                      onClick={sendMessage}
                      renderIcon={Chat}
                    >
                      Send
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Column>
        </Grid>
      </Content>

      {/* Document Details Modal */}
      {showDetails && selectedDoc && (
        <Modal
          open={showDetails}
          passiveModal
          onRequestClose={() => setShowDetails(false)}
          size="lg"
          modalHeading={selectedDoc.name}
          modalLabel="Document Analysis"
          className="document-modal"
        >
          <div className="modal-body">
            <Grid condensed>
              <Column sm={2} md={4} lg={8} className="metadata-grid">
                <div className="metadata-item">
                  <label>Status</label>
                  <p>{selectedDoc.status === 'processed' ? 'Processed' : 'Uploaded'}</p>
                </div>
                <div className="metadata-item">
                  <label>Uploaded</label>
                  <p>{selectedDoc.uploadedAt}</p>
                </div>
                <div className="metadata-item">
                  <label>Processed</label>
                  <p>{selectedDoc.processedAt || 'November 6, 2025 at 08:51 AM'}</p>
                </div>
                <div className="metadata-item">
                  <label>File Size</label>
                  <p>{selectedDoc.size}</p>
                </div>
              </Column>
            </Grid>

            {selectedDoc.summary && (
              <div className="summary-section">
                <h4>AI-Generated Summary</h4>
                <Tile className="summary-tile">
                  <p>{selectedDoc.summary}</p>
                </Tile>
              </div>
            )}

            <div className="extracted-info">
              <h4>Extracted Information</h4>
              
              <div className="info-tags">
                <Tag type="blue" size="sm">
                  Type: {selectedDoc.type || 'Legal'}
                </Tag>
                <Tag type="green" size="sm">
                  {selectedDoc.sections || 3} sections analyzed
                </Tag>
                <Tag type="gray" size="sm">
                  {selectedDoc.chars || '32.6K'} chars
                </Tag>
              </div>

              <Accordion>
                <AccordionItem title="Important Clauses or Conditions">
                  <ol>
                    <li>The License explicitly affirms your unlimited permission to run the unmodified Program.</li>
                    <li>The output from running a covered work is covered by this License only if the output, given its content, constitutes a covered work.</li>
                    <li>Conveying under any other circumstances is permitted solely under the conditions stated below.</li>
                    <li>Sublicensing is not allowed; section 10 makes it unnecessary.</li>
                    <li>No covered work shall be deemed part of an effective technological measure under any applicable law fulfilling obligations under article 11 of the WIPO copyright treaty adopted on December 20, 1996, or similar laws prohibiting or restricting circumvention of such measures.</li>
                  </ol>
                </AccordionItem>
                
                <AccordionItem title="Other Key Information">
                  <ul>
                    <li>The AGPL is a free, copyleft license for software and other kinds of works.</li>
                    <li>The licenses are intended to guarantee your freedom to share and change all versions of a program.</li>
                    <li>This License explicitly affirms your unlimited permission to run the unmodified Program.</li>
                  </ul>
                </AccordionItem>
              </Accordion>
            </div>
            
            <div className="modal-actions">
              <Button
                kind="secondary"
                onClick={() => setShowDetails(false)}
              >
                Close
              </Button>
              <Button
                renderIcon={Download}
              >
                Download Original Document
              </Button>
            </div>
          </div>
        </Modal>
      )}

      <style jsx>{`
        .app-container {
          min-height: 100vh;
          background-color: #161616;
          color: #f4f4f4;
          font-family: 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }

        /* Header Styles */
        .app-header {
          background-color: #262626;
          border-bottom: 1px solid #393939;
          padding: 1rem 0;
        }

        .header-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 1rem;
        }

        .brand-section {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .logo {
          width: 2.5rem;
          height: 2.5rem;
          background-color: #0f62fe;
          border-radius: 0.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .brand-title {
          font-size: 1.25rem;
          font-weight: 600;
          margin: 0;
          color: #f4f4f4;
        }

        .brand-subtitle {
          font-size: 0.875rem;
          margin: 0;
          color: #c6c6c6;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .status-indicator {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .status-dot {
          width: 0.5rem;
          height: 0.5rem;
          border-radius: 50%;
        }

        .status-dot.connected {
          background-color: #42be65;
        }

        .status-dot.disconnected {
          background-color: #fa4d56;
        }

        .model-tag {
          font-family: 'IBM Plex Mono', monospace;
        }

        /* Main Content */
        .main-content {
          padding: 2rem 0;
        }

        /* Hero Section */
        .hero-tile {
          background: linear-gradient(135deg, #0f62fe 0%, #0050e6 100%);
          color: white;
          margin-bottom: 1.5rem;
          border: none;
        }

        .hero-content {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
        }

        .hero-icon {
          color: rgba(255, 255, 255, 0.9);
        }

        .hero-title {
          font-size: 1.75rem;
          font-weight: 300;
          margin: 0;
          color: white;
        }

        .hero-subtitle {
          font-size: 1rem;
          color: rgba(255, 255, 255, 0.9);
          margin: 0.5rem 0 0 0;
        }

        .hero-description {
          margin: 0;
          line-height: 1.5;
          color: rgba(255, 255, 255, 0.9);
        }

        /* Custom Tabs */
        .custom-tabs {
          margin-bottom: 1.5rem;
        }

        .tabs-header {
          display: flex;
          background-color: #262626;
          border-bottom: 1px solid #393939;
        }

        .tab-button {
          padding: 1rem 1.5rem;
          background-color: transparent;
          border: none;
          border-bottom: 2px solid transparent;
          color: #c6c6c6;
          cursor: pointer;
          font-size: 0.875rem;
          font-weight: 400;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          transition: all 0.2s ease;
        }

        .tab-button:hover {
          background-color: #393939;
          color: #f4f4f4;
        }

        .tab-button.active {
          background-color: #161616;
          border-bottom-color: #0f62fe;
          color: #0f62fe;
          font-weight: 600;
        }

        .tab-badge {
          margin-left: 0.25rem;
        }

        /* Tab Content */
        .tab-content {
          background-color: #262626;
          min-height: 600px;
          border-radius: 0.25rem;
          padding: 2rem;
        }

        .tab-description {
          color: #c6c6c6;
          margin-bottom: 1.5rem;
          font-size: 0.875rem;
        }

        /* File Uploader Dark Theme */
        .file-uploader-dark :global(.cds--file__drop-container) {
          background-color: #393939;
          border-color: #525252;
        }

        .file-uploader-dark :global(.cds--file__drop-container:hover) {
          background-color: #474747;
          border-color: #0f62fe;
        }

        /* Document Tiles */
        .document-tile {
          background-color: #393939;
          border: 1px solid #525252;
          border-radius: 0.25rem;
          padding: 1rem;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
        }

        .document-info {
          display: flex;
          gap: 1rem;
          flex: 1;
        }

        .document-icon {
          width: 2.5rem;
          height: 2.5rem;
          background-color: #0f62fe;
          border-radius: 0.25rem;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          flex-shrink: 0;
        }

        .document-details {
          flex: 1;
        }

        .document-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.25rem;
        }

        .document-header h4 {
          margin: 0;
          color: #f4f4f4;
        }

        .document-meta {
          margin: 0;
          font-size: 0.875rem;
          color: #c6c6c6;
        }

        .document-summary {
          margin: 0.5rem 0 0 0;
          font-size: 0.875rem;
          color: #c6c6c6;
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .document-actions {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .action-buttons {
          display: flex;
          gap: 0.25rem;
        }

        .processing-indicator {
          min-width: 200px;
        }

        /* Recent Uploads */
        .recent-uploads {
          margin-top: 2rem;
        }

        .recent-uploads h3 {
          font-size: 1.125rem;
          font-weight: 600;
          margin-bottom: 1rem;
          color: #f4f4f4;
        }

        /* Library Styles */
        .library-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1.5rem;
        }

        .library-header h2 {
          font-size: 1.25rem;
          font-weight: 600;
          margin: 0 0 0.25rem 0;
          color: #f4f4f4;
        }

        .library-header p {
          margin: 0;
          color: #c6c6c6;
          font-size: 0.875rem;
        }

        .library-stats {
          display: flex;
          gap: 0.5rem;
        }

        .empty-state {
          text-align: center;
          padding: 3rem;
          color: #c6c6c6;
        }

        .empty-state svg {
          margin-bottom: 1rem;
          opacity: 0.5;
        }

        .empty-state h3 {
          margin: 0 0 0.5rem 0;
          color: #f4f4f4;
        }

        .empty-state p {
          margin: 0;
        }

        /* Setup Guide */
        .setup-guide {
          margin-top: 2rem;
          background-color: #393939;
          border: 1px solid #525252;
        }

        .guide-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1.5rem;
        }

        .guide-header h3 {
          margin: 0;
          color: #f4f4f4;
        }

        .guide-step {
          margin-bottom: 1.5rem;
        }

        .guide-step h5 {
          margin: 0 0 0.5rem 0;
          color: #f4f4f4;
        }

        .guide-step p {
          margin: 0 0 0.5rem 0;
          color: #c6c6c6;
        }

        .code-block {
          background-color: #161616;
          color: #42be65;
          padding: 0.75rem;
          border-radius: 0.25rem;
          margin: 0.5rem 0;
        }

        .code-block code {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 0.875rem;
        }

        .model-suggestion {
          font-size: 0.875rem;
          color: #8d8d8d;
          margin: 0.5rem 0 0 0;
        }

        .model-tags {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .guide-footer {
          font-style: italic;
          color: #8d8d8d;
          margin: 0;
          font-size: 0.875rem;
          line-height: 1.5;
        }

        /* Chat Styles */
        .chat-container {
          background-color: #393939;
          border: 1px solid #525252;
          border-radius: 0.25rem;
          height: 600px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .chat-header {
          border-bottom: 1px solid #525252;
          padding: 1rem;
          background-color: #262626;
        }

        .chat-header p {
          margin: 0 0 0.75rem 0;
          color: #c6c6c6;
          font-size: 0.875rem;
        }

        .document-filters {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 1.5rem;
          background-color: #393939;
        }

        .welcome-message {
          display: flex;
          gap: 1rem;
          background-color: #262626;
          padding: 1rem;
          border-radius: 0.25rem;
          align-items: flex-start;
        }

        .assistant-avatar {
          width: 2.5rem;
          height: 2.5rem;
          background-color: #0f62fe;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          flex-shrink: 0;
        }

        .welcome-message p {
          margin: 0;
          color: #f4f4f4;
          line-height: 1.5;
        }

        .message {
          display: flex;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .message.user {
          justify-content: flex-end;
        }

        .message-bubble {
          max-width: 70%;
          padding: 0.75rem 1rem;
          border-radius: 0.25rem;
          background-color: #262626;
          color: #f4f4f4;
          line-height: 1.5;
          font-size: 0.875rem;
        }

        .message.user .message-bubble {
          background-color: #0f62fe;
          color: white;
        }

        .chat-input {
          border-top: 1px solid #525252;
          padding: 1rem;
          display: flex;
          gap: 0.75rem;
          background-color: #262626;
        }

        .chat-input-field {
          flex: 1;
        }

        /* Modal Styles */
        .connection-modal :global(.cds--modal-container) {
          background-color: #262626;
        }

        .connection-error-content {
          margin-top: 1rem;
        }

        .setup-accordion {
          margin-top: 1rem;
        }

        .setup-steps {
          padding: 1rem 0;
        }

        .setup-step {
          margin-bottom: 1.5rem;
        }

        .setup-step h5 {
          margin: 0 0 0.5rem 0;
          color: #f4f4f4;
        }

        .setup-step p {
          margin: 0 0 0.5rem 0;
          color: #c6c6c6;
        }

        .info-notice {
          margin-top: 1rem;
        }

        .document-modal :global(.cds--modal-container) {
          background-color: #262626;
          color: #f4f4f4;
        }

        .modal-body {
          padding: 1rem 0;
        }

        .metadata-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .metadata-item label {
          display: block;
          font-size: 0.75rem;
          color: #c6c6c6;
          margin-bottom: 0.25rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .metadata-item p {
          margin: 0;
          font-weight: 500;
          color: #f4f4f4;
        }

        .summary-section {
          margin-bottom: 2rem;
        }

        .summary-section h4 {
          margin: 0 0 1rem 0;
          color: #f4f4f4;
        }

        .summary-tile {
          background-color: #393939;
          border: 1px solid #525252;
        }

        .summary-tile p {
          margin: 0;
          line-height: 1.6;
          color: #f4f4f4;
        }

        .extracted-info h4 {
          margin: 0 0 1rem 0;
          color: #f4f4f4;
        }

        .info-tags {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
        }

        .modal-actions {
          display: flex;
          gap: 0.75rem;
          justify-content: flex-end;
          margin-top: 2rem;
        }

        /* Responsive Design */
        @media (max-width: 672px) {
          .header-content {
            flex-direction: column;
            gap: 1rem;
            align-items: flex-start;
          }

          .header-actions {
            width: 100%;
            justify-content: space-between;
          }

          .tabs-header {
            flex-direction: column;
          }

          .tab-button {
            width: 100%;
            justify-content: center;
          }

          .document-tile {
            flex-direction: column;
            align-items: stretch;
          }

          .document-actions {
            justify-content: flex-end;
          }

          .library-header {
            flex-direction: column;
            gap: 1rem;
          }

          .modal-actions {
            flex-direction: column;
          }

          .chat-input {
            flex-direction: column;
          }

          .metadata-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default App;