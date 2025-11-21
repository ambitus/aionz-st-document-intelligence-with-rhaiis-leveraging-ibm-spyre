//AIChatTab Component
import React, { useState, useRef, useEffect } from 'react';
import { 
  Watson,
  User,
  Document, 
  Send,
  Close
} from '@carbon/icons-react';
import Icons from './Icons'

const AIChat = ({ documents }) => {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hello! I'm your IBM Document Intelligence AI Assistant. I can help you analyze documents, answer questions about their content, extract insights, and more. How can I assist you today?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [selectedDocuments, setSelectedDocuments] = useState([]);
  const messagesEndRef = useRef(null);

  const suggestedPrompts = [
    'Summarize all documents',
    'What are the key financial metrics?',
    'Analyze sentiment across documents',
    'Extract important dates and deadlines'
  ];

  // Auto-scroll to bottom of messages
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const getCurrentTime = () => {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleDocumentSelect = (doc) => {
    setSelectedDocuments(prev => {
      const isSelected = prev.find(d => d.id === doc.id);
      if (isSelected) {
        return prev.filter(d => d.id !== doc.id);
      } else {
        return [...prev, doc];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedDocuments.length === documents.length) {
      setSelectedDocuments([]);
    } else {
      setSelectedDocuments([...documents]);
    }
  };

  const handleClearAll = () => {
    setSelectedDocuments([]);
  };

  const handleRemoveDocument = (docId, e) => {
    e.stopPropagation();
    setSelectedDocuments(prev => prev.filter(d => d.id !== docId));
  };

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage = { 
      role: 'user', 
      content: input,
      timestamp: getCurrentTime()
    };
    setMessages([...messages, userMessage]);

    // Simulate AI response based on input
    setTimeout(() => {
      let aiResponse;
      const docCount = selectedDocuments.length > 0 ? selectedDocuments.length : documents.length;
      
      if (input.toLowerCase().includes('sentiment')) {
        const docList = selectedDocuments.length > 0 ? selectedDocuments : documents.slice(0, 3);
        aiResponse = {
          role: 'assistant',
          content: `I've performed sentiment analysis on ${docCount} documents:\n\n${docList.map(doc => `• ${doc.name}: Positive`).join('\n')}\n\nOverall, the document collection shows a positive tone.`,
          timestamp: getCurrentTime(),
          documents: docList
        };
      } else {
        aiResponse = {
          role: 'assistant',
          content: `I've analyzed your request: "${input}". Based on ${docCount} documents, I can provide insights, summaries, and answer specific questions about your document content.`,
          timestamp: getCurrentTime()
        };
      }
      setMessages(prev => [...prev, aiResponse]);
    }, 1000);

    setInput('');
  };

  const handlePromptClick = (prompt) => {
    setInput(prompt);
    // Auto-send the prompt
    const userMessage = { 
      role: 'user', 
      content: prompt,
      timestamp: getCurrentTime()
    };
    setMessages([...messages, userMessage]);

    // Simulate AI response
    setTimeout(() => {
      let aiResponse;
      const docCount = selectedDocuments.length > 0 ? selectedDocuments.length : documents.length;
      const docList = selectedDocuments.length > 0 ? selectedDocuments : documents.slice(0, 3);

      if (prompt.toLowerCase().includes('sentiment')) {
        aiResponse = {
          role: 'assistant',
          content: `I've performed sentiment analysis on ${docCount} documents:\n\n${docList.map(doc => `• ${doc.name}: Positive`).join('\n')}\n\nOverall, the document collection shows a positive tone.`,
          timestamp: getCurrentTime(),
          documents: docList
        };
      } else if (prompt.toLowerCase().includes('summarize')) {
        aiResponse = {
          role: 'assistant',
          content: `I've summarized the key points from your ${docCount} documents:\n\n• Financial Report shows strong Q4 performance with 15% revenue growth\n• Contract Agreement outlines standard terms and conditions\n• Product Specifications detail new feature implementations\n\nAll documents are properly formatted and ready for review.`,
          timestamp: getCurrentTime()
        };
      } else if (prompt.toLowerCase().includes('financial')) {
        aiResponse = {
          role: 'assistant',
          content: `Key financial metrics from your ${docCount} documents:\n\n• Revenue: $4.8M (15% growth)\n• Operating Margin: 22%\n• Customer Acquisition Cost: $1,200\n• Lifetime Value: $8,500\n• Cash Flow: Positive $1.2M`,
          timestamp: getCurrentTime()
        };
      } else if (prompt.toLowerCase().includes('dates')) {
        aiResponse = {
          role: 'assistant',
          content: `Important dates and deadlines found in ${docCount} documents:\n\n• Contract Renewal: December 15, 2024\n• Project Deadline: January 30, 2025\n• Quarterly Review: March 15, 2025\n• Annual Report: February 28, 2025`,
          timestamp: getCurrentTime()
        };
      } else {
        aiResponse = {
          role: 'assistant',
          content: `I've analyzed your request: "${prompt}". Based on ${docCount} documents, I can provide detailed insights and answer specific questions about your document content.`,
          timestamp: getCurrentTime()
        };
      }
      setMessages(prev => [...prev, aiResponse]);
    }, 1000);
  };

  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: '2fr 1fr', 
      gap: '1.5rem', 
      padding: '2rem',
      height: 'calc(100vh - 140px)',
      overflow: 'hidden',
    }}>
      {/* Left Column - Chat Interface */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        background: 'white',
        border: '2px solid #e0e0e0',
        borderRadius: '12px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden'
      }}>
        {/* Chat Header with Selected Documents */}
        <div style={{
          padding: '1.5rem',
          borderBottom: '2px solid #f4f4f4',
          background: 'linear-gradient(to right, #f8f9fa, white)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: selectedDocuments.length > 0 ? '1rem' : '0' }}>
            <div style={{
              width: '40px',
              height: '40px',
              background: 'linear-gradient(135deg, #0062ff 0%, #001d6c 100%)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {/* <Watson size={20} style={{ color: 'white' }} /> */}
                {/* <svg width="30" height="30" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 10h16M8 13h16M8 16h16M8 19h16M8 22h16" stroke="white" stroke-width="2"></path><path d="M12 10v12M20 10v12" stroke="white" stroke-width="2"></path></svg> */}
                      <Icons.RedHat/>

            </div>
            <div>
              <h3 style={{ 
                color: '#161616', 
                margin: 0, 
                fontSize: '1.125rem',
                fontWeight: 500 
              }}>
                AI Assistant
              </h3>
              <p style={{ 
                color: '#525252', 
                margin: 0, 
                fontSize: '0.875rem' 
              }}>
                Powered by IBM ReadHat Inference server with Spyre
              </p>
            </div>
          </div>

          {/* Selected Documents in Header */}
          {selectedDocuments.length > 0 && (
            <div>
              <p style={{
                color: '#525252',
                fontSize: '0.75rem',
                marginBottom: '0.5rem',
                fontWeight: 500
              }}>
                Selected Documents ({selectedDocuments.length}):
              </p>
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.5rem',
                maxHeight: '60px',
                overflowY: 'auto'
              }}>
                {selectedDocuments.map(doc => (
                  <span
                    key={doc.id}
                    style={{
                      background: '#edf5ff',
                      border: '1px solid #d0e2ff',
                      borderRadius: '4px',
                      padding: '0.25rem 0.5rem',
                      fontSize: '0.75rem',
                      color: '#0f62fe',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      cursor: 'pointer'
                    }}
                    onClick={(e) => handleRemoveDocument(doc.id, e)}
                  >
                    {doc.name}
                    <Close size={12} />
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Chat Messages with Scroll */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '1.5rem',
          background: '#fafafa'
        }}>
          {messages.map((msg, idx) => (
            <div key={idx} style={{
              marginBottom: '1.5rem'
            }}>
              {/* Message Header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '0.5rem'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '4px',
                    background: msg.role === 'assistant' 
                      ? 'linear-gradient(to bottom right, #0f62fe, #0353e9)' 
                      : '#e0e0e0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {msg.role === 'assistant' ? (
                      // <Watson size={12} style={{ color: 'white' }} />
                      <Icons.RedHat/>
                    ) : (
                      <User size={12} style={{ color: '#525252' }} />
                    )}
                  </div>
                  <span style={{
                    color: '#161616',
                    fontSize: '0.875rem',
                    fontWeight: 500
                  }}>
                    {msg.role === 'assistant' ? 'AI Assistant' : 'You'}
                  </span>
                </div>
                <span style={{
                  color: '#525252',
                  fontSize: '0.75rem'
                }}>
                  {msg.timestamp}
                </span>
              </div>

              {/* Message Content */}
              <div style={{
                background: msg.role === 'assistant' ? 'white' : '#edf5ff',
                border: `2px solid ${msg.role === 'assistant' ? '#e0e0e0' : '#d0e2ff'}`,
                borderRadius: '8px',
                padding: '1rem',
                marginLeft: msg.role === 'assistant' ? '0' : '2rem'
              }}>
                {/* Document links for sentiment analysis */}
                {msg.documents && (
                  <div style={{ marginBottom: '1rem' }}>
                    {msg.documents.map((doc, docIdx) => (
                      <div key={docIdx} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        marginBottom: '0.25rem',
                        fontSize: '0.875rem'
                      }}>
                        <span style={{ color: '#525252' }}>•</span>
                        <span style={{ color: '#161616' }}>{doc.name}:</span>
                        <span style={{
                          color: '#24a148',
                          fontWeight: 500
                        }}>
                          Positive
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Main message content */}
                <div style={{
                  color: '#161616',
                  lineHeight: '1.5',
                  whiteSpace: 'pre-line'
                }}>
                  {msg.content}
                </div>

                {/* Document links */}
                {msg.documents && (
                  <div style={{
                    display: 'flex',
                    gap: '0.5rem',
                    marginTop: '1rem',
                    flexWrap: 'wrap'
                  }}>
                    {msg.documents.map((doc, docIdx) => (
                      <a key={docIdx} href="#" style={{
                        color: '#0f62fe',
                        fontSize: '0.875rem',
                        textDecoration: 'none',
                        fontWeight: 500
                      }}>
                        [{doc.name}]
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div style={{
          padding: '1.5rem',
          borderTop: '2px solid #f4f4f4',
          background: 'white'
        }}>
          <div style={{
            display: 'flex',
            gap: '0.75rem',
            alignItems: 'flex-end'
          }}>
            <div style={{ flex: 1 }}>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask about your documents..."
                style={{
                  width: '100%',
                  padding: '1rem 1.25rem',
                  border: '2px solid #e0e0e0',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#0f62fe';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e0e0e0';
                }}
              />
            </div>
            <button
              onClick={handleSend}
              style={{
                background: '#0f62fe',
                color: 'white',
                border: 'none',
                padding: '1rem 1.5rem',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontWeight: 500,
                fontSize: '0.875rem',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#0353e9';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = '#0f62fe';
              }}
            >
              <Send size={16} />
              Send
            </button>
          </div>
        </div>
      </div>

      {/* Right Column - Sidebar */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        overflow: 'hidden'
      }}>
        {/* Suggested Prompts */}
        <div style={{
          background: 'white',
          border: '2px solid #e0e0e0',
          borderRadius: '12px',
          padding: '1rem',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}>
          <h4 style={{
            color: '#161616',
            marginBottom: '1rem',
            fontSize: '1rem',
            fontWeight: 500
          }}>
            Suggested Prompts
          </h4>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem'
          }}>
            {suggestedPrompts.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handlePromptClick(prompt)}
                style={{
                  background: 'transparent',
                  border: '2px solid #e0e0e0',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '0.875rem',
                  color: '#161616',
                  transition: 'all 0.2s',
                  width: '100%'
                }}
                onMouseEnter={(e) => {
                  e.target.style.borderColor = '#0f62fe';
                  e.target.style.background = '#edf5ff';
                }}
                onMouseLeave={(e) => {
                  e.target.style.borderColor = '#e0e0e0';
                  e.target.style.background = 'transparent';
                }}
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        {/* Document Context with Increased Height */}
        <div style={{
          background: 'white',
          border: '2px solid #e0e0e0',
          borderRadius: '12px',
          padding: '1.5rem',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          height: '500px', // Increased height
          overflow: 'hidden'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem'
          }}>
            <h4 style={{
              color: '#161616',
              margin: 0,
              fontSize: '1rem',
              fontWeight: 500
            }}>
              Document Context
            </h4>
            <span style={{
              color: '#525252',
              fontSize: '0.75rem'
            }}>
              {selectedDocuments.length} selected
            </span>
          </div>
          
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1rem'
          }}>
            <div >
              <p style={{
                color: '#525252',
                fontSize: '0.875rem',
                margin: 0,
              }}>
                Total Documents
               <span style={{
                color: '#161616',
              fontSize: '1rem',
                margin: 0,
                fontWeight: 500
            }}> {documents.length}</span>
              </p>
            </div>
     
          </div>

          {/* Select All and Clear All Buttons */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '0.75rem',
            marginBottom: '1rem'
          }}>
            <button 
              onClick={handleSelectAll}
              style={{
                background: '#edf5ff',
                border: '2px solid #d0e2ff',
                padding: '0.75rem',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.875rem',
                color: '#0f62fe',
                fontWeight: 500,
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#d0e2ff';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = '#edf5ff';
              }}
            >
              Select All
            </button>
            <button 
              onClick={handleClearAll}
              style={{
                background: '#f4f4f4',
                border: '2px solid #e0e0e0',
                padding: '0.75rem',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '0.875rem',
                color: '#161616',
                fontWeight: 500,
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#e0e0e0';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = '#f4f4f4';
              }}
            >
              Clear All
            </button>
          </div>

          {/* Documents List with Scroll */}
          <div style={{ 
            flex: 1, 
            overflowY: 'auto',
            border: '1px solid #e0e0e0',
            borderRadius: '6px',
            padding: '0.5rem'
          }}>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem'
            }}>
              {documents.map((doc, idx) => (
                <div 
                  key={doc.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem',
                    borderRadius: '6px',
                    background: selectedDocuments.find(d => d.id === doc.id) ? '#edf5ff' : 'transparent',
                    border: selectedDocuments.find(d => d.id === doc.id) ? '1px solid #0f62fe' : '1px solid transparent',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onClick={() => handleDocumentSelect(doc)}
                >
                  <input
                    type="checkbox"
                    checked={!!selectedDocuments.find(d => d.id === doc.id)}
                    onChange={() => handleDocumentSelect(doc)}
                    style={{ cursor: 'pointer' }}
                  />
                  <Document size={16} style={{ color: '#0f62fe', flexShrink: 0 }} />
                  <span style={{
                    color: '#161616',
                    fontSize: '0.75rem',
                    flex: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {doc.name}
                  </span>
                  {doc.status === 'ready' ? (
                    <div style={{
                      width: '8px',
                      height: '8px',
                      background: '#24a148',
                      borderRadius: '50%',
                      flexShrink: 0
                    }} />
                  ) : (
                    <div style={{
                      width: '8px',
                      height: '8px',
                      background: '#0f62fe',
                      borderRadius: '50%',
                      flexShrink: 0
                    }} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* AI Status */}
        <div style={{
          background: 'linear-gradient(to bottom right, #edf5ff, white)',
          border: '2px solid #d0e2ff',
          borderRadius: '12px',
          padding: '1.5rem',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                      <Icons.RedHat/>
            <div>
              <p style={{ 
                color: '#161616', 
                margin: 0, 
                fontSize: '0.875rem',
                fontWeight: 500 
              }}>
                RHAIIS AI Online
              </p>
              <p style={{ 
                color: '#525252', 
                margin: 0, 
                fontSize: '0.75rem' 
              }}>
                Natural Language Understanding
              </p>
            </div>
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              background: '#24a148',
              borderRadius: '50%'
            }} />
            <span style={{
              color: '#24a148',
              fontSize: '0.75rem',
              fontWeight: 500
            }}>
              System Operational
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIChat;