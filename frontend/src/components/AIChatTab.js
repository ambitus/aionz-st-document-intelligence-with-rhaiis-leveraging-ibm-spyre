//AIChatTab Component
import React, { useState, useRef, useEffect } from 'react';
import { 
  Watson,
  User,
  Document, 
  Send,
  Close} from '@carbon/icons-react';
import {
  InlineLoading
} from '@carbon/react';
import Icons from './Icons'

const AIChat = ({ documents, currentUser }) => {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hello! I'm your IBM Document Intelligence AI Assistant. I can help you analyze documents, answer questions about their content, extract insights, and more. How can I assist you today?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [selectedDocuments, setSelectedDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState(null);
  const messagesEndRef = useRef(null);

  const suggestedPrompts = [
    'Summarize all documents',
    'What are the key features of Spyre?',
    'Analyze the hardware requirements',
    'Explain the installation process'
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

  const sendQueryToAPI = async (query, username) => {
    try {
      const formData = new FormData();
      formData.append('query', query);
      formData.append('user_id', username);

      const response = await fetch('http://129.40.90.163:8002/ask-query', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error sending query to API:', error);
      throw error;
    }
  };

  const sendStreamingQueryToAPI = async (query, username, onChunk) => {
    try {
      const formData = new FormData();
      formData.append('query', query);
      formData.append('user_id', username);

      const response = await fetch('http://129.40.90.163:8002/ask-query', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Check if the response is streamable
      const reader = response.body?.getReader();
      if (!reader) {
        // Fallback to regular response if streaming is not supported
        const result = await response.json();
        return result;
      }

      const decoder = new TextDecoder();
      let accumulatedText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        accumulatedText += chunk;

        // Call the callback with the new chunk
        if (onChunk) {
          onChunk(accumulatedText);
        }

        // Small delay to make streaming visible
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      return { answer: accumulatedText };
    } catch (error) {
      console.error('Error sending streaming query to API:', error);
      throw error;
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !currentUser?.username) return;

    const userMessage = { 
      role: 'user', 
      content: input,
      timestamp: getCurrentTime()
    };
    setMessages([...messages, userMessage]);
    setInput('');
    setIsLoading(true);

    // Create a placeholder for the streaming response
    const streamingMessageId = Date.now().toString();
    setStreamingMessageId(streamingMessageId);
    
    const aiResponsePlaceholder = {
      id: streamingMessageId,
      role: 'assistant',
      content: '',
      timestamp: getCurrentTime(),
      isStreaming: true
    };
    setMessages(prev => [...prev, aiResponsePlaceholder]);

    try {
      // Use streaming API with callback to update UI in real-time
      await sendStreamingQueryToAPI(input, currentUser.username, (chunk) => {
        setMessages(prev => prev.map(msg => 
          msg.id === streamingMessageId 
            ? { ...msg, content: chunk }
            : msg
        ));
      });

      // Streaming completed successfully
      setMessages(prev => prev.map(msg => 
        msg.id === streamingMessageId 
          ? { ...msg, isStreaming: false }
          : msg
      ));
    } catch (error) {
      console.error('Streaming failed, trying regular API:', error);
      
      // Fallback to regular API if streaming fails
      try {
        const regularResponse = await sendQueryToAPI(input, currentUser.username);
        const finalContent = regularResponse.answer || regularResponse.response || 'I received your query but got an unexpected response format.';
        
        setMessages(prev => prev.map(msg => 
          msg.id === streamingMessageId 
            ? { ...msg, content: finalContent, isStreaming: false }
            : msg
        ));
      } catch (fallbackError) {
        const errorResponse = {
          role: 'assistant',
          content: `I'm sorry, I encountered an error while processing your request: ${fallbackError.message}. Please try again.`,
          timestamp: getCurrentTime()
        };
        setMessages(prev => [...prev.filter(msg => msg.id !== streamingMessageId), errorResponse]);
      }
    } finally {
      setIsLoading(false);
      setStreamingMessageId(null);
    }
  };

  const handlePromptClick = async (prompt) => {
    if (!currentUser?.username) {
      const errorMessage = {
        role: 'assistant',
        content: "Please make sure you're logged in to use the AI assistant.",
        timestamp: getCurrentTime()
      };
      setMessages(prev => [...prev, errorMessage]);
      return;
    }

    setInput(prompt);
    const userMessage = { 
      role: 'user', 
      content: prompt,
      timestamp: getCurrentTime()
    };
    setMessages([...messages, userMessage]);
    setIsLoading(true);

    // Create a placeholder for the streaming response
    const streamingMessageId = Date.now().toString();
    setStreamingMessageId(streamingMessageId);
    
    const aiResponsePlaceholder = {
      id: streamingMessageId,
      role: 'assistant',
      content: '',
      timestamp: getCurrentTime(),
      isStreaming: true
    };
    setMessages(prev => [...prev, aiResponsePlaceholder]);

    try {
      // Use streaming API with callback to update UI in real-time
      await sendStreamingQueryToAPI(prompt, currentUser.username, (chunk) => {
        setMessages(prev => prev.map(msg => 
          msg.id === streamingMessageId 
            ? { ...msg, content: chunk }
            : msg
        ));
      });

      // Streaming completed successfully
      setMessages(prev => prev.map(msg => 
        msg.id === streamingMessageId 
          ? { ...msg, isStreaming: false }
          : msg
      ));
    } catch (error) {
      console.error('Streaming failed, trying regular API:', error);
      
      // Fallback to regular API if streaming fails
      try {
        const regularResponse = await sendQueryToAPI(prompt, currentUser.username);
        const finalContent = regularResponse.answer || regularResponse.response || 'I received your query but got an unexpected response format.';
        
        setMessages(prev => prev.map(msg => 
          msg.id === streamingMessageId 
            ? { ...msg, content: finalContent, isStreaming: false }
            : msg
        ));
      } catch (fallbackError) {
        const errorResponse = {
          role: 'assistant',
          content: `I'm sorry, I encountered an error while processing your request: ${fallbackError.message}. Please try again.`,
          timestamp: getCurrentTime()
        };
        setMessages(prev => [...prev.filter(msg => msg.id !== streamingMessageId), errorResponse]);
      }
    } finally {
      setIsLoading(false);
      setStreamingMessageId(null);
    }
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
                Powered by IBM RedHat Inference server with Spyre
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
            <div key={msg.id || idx} style={{
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
                  {msg.isStreaming && (
                    <div style={{
                      width: '8px',
                      height: '8px',
                      background: '#0f62fe',
                      borderRadius: '50%',
                      animation: 'pulse 1.5s infinite'
                    }} />
                  )}
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
                marginLeft: msg.role === 'assistant' ? '0' : '2rem',
                position: 'relative'
              }}>
                {/* Main message content */}
                <div style={{
                  color: '#161616',
                  lineHeight: '1.5',
                  whiteSpace: 'pre-line'
                }}>
                  {msg.content}
                  {msg.isStreaming && (
                    <span style={{
                      display: 'inline-block',
                      width: '8px',
                      height: '16px',
                      background: '#0f62fe',
                      marginLeft: '4px',
                      animation: 'blink 1s infinite',
                      verticalAlign: 'middle'
                    }} />
                  )}
                </div>
                
                {/* Loading indicator for empty streaming messages */}
                {msg.isStreaming && !msg.content && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <InlineLoading
                      description="AI is thinking..."
                      status="active"
                    />
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
                onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSend()}
                placeholder="Ask about your documents..."
                disabled={isLoading || !currentUser?.username}
                style={{
                  width: '100%',
                  padding: '1rem 1.25rem',
                  border: '2px solid #e0e0e0',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  background: isLoading || !currentUser?.username ? '#f4f4f4' : 'white',
                  cursor: isLoading || !currentUser?.username ? 'not-allowed' : 'text'
                }}
                onFocus={(e) => {
                  if (!isLoading && currentUser?.username) {
                    e.target.style.borderColor = '#0f62fe';
                  }
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e0e0e0';
                }}
              />
              {!currentUser?.username && (
                <p style={{
                  color: '#da1e28',
                  fontSize: '0.75rem',
                  margin: '0.5rem 0 0 0'
                }}>
                  Please log in to use the AI assistant
                </p>
              )}
            </div>
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim() || !currentUser?.username}
              style={{
                background: isLoading || !input.trim() || !currentUser?.username ? '#c6c6c6' : '#0f62fe',
                color: 'white',
                border: 'none',
                padding: '1rem 1.5rem',
                borderRadius: '8px',
                cursor: isLoading || !input.trim() || !currentUser?.username ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontWeight: 500,
                fontSize: '0.875rem',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => {
                if (!isLoading && input.trim() && currentUser?.username) {
                  e.target.style.background = '#0353e9';
                }
              }}
              onMouseLeave={(e) => {
                if (!isLoading && input.trim() && currentUser?.username) {
                  e.target.style.background = '#0f62fe';
                }
              }}
            >
              {isLoading ? (
                <InlineLoading size="sm" />
              ) : (
                <>
                  <Send size={16} />
                  Send
                </>
              )}
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
                disabled={isLoading || !currentUser?.username}
                style={{
                  background: 'transparent',
                  border: '2px solid #e0e0e0',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  cursor: isLoading || !currentUser?.username ? 'not-allowed' : 'pointer',
                  textAlign: 'left',
                  fontSize: '0.875rem',
                  color: isLoading || !currentUser?.username ? '#c6c6c6' : '#161616',
                  transition: 'all 0.2s',
                  width: '100%'
                }}
                onMouseEnter={(e) => {
                  if (!isLoading && currentUser?.username) {
                    e.target.style.borderColor = '#0f62fe';
                    e.target.style.background = '#edf5ff';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isLoading && currentUser?.username) {
                    e.target.style.borderColor = '#e0e0e0';
                    e.target.style.background = 'transparent';
                  }
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
          height: '500px',
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
            <div>
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
              disabled={isLoading}
              style={{
                background: '#edf5ff',
                border: '2px solid #d0e2ff',
                padding: '0.75rem',
                borderRadius: '8px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontSize: '0.875rem',
                color: '#0f62fe',
                fontWeight: 500,
                transition: 'all 0.2s',
                opacity: isLoading ? 0.6 : 1
              }}
              onMouseEnter={(e) => {
                if (!isLoading) {
                  e.target.style.background = '#d0e2ff';
                }
              }}
              onMouseLeave={(e) => {
                if (!isLoading) {
                  e.target.style.background = '#edf5ff';
                }
              }}
            >
              Select All
            </button>
            <button 
              onClick={handleClearAll}
              disabled={isLoading}
              style={{
                background: '#f4f4f4',
                border: '2px solid #e0e0e0',
                padding: '0.75rem',
                borderRadius: '8px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontSize: '0.875rem',
                color: '#161616',
                fontWeight: 500,
                transition: 'all 0.2s',
                opacity: isLoading ? 0.6 : 1
              }}
              onMouseEnter={(e) => {
                if (!isLoading) {
                  e.target.style.background = '#e0e0e0';
                }
              }}
              onMouseLeave={(e) => {
                if (!isLoading) {
                  e.target.style.background = '#f4f4f4';
                }
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
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    opacity: isLoading ? 0.6 : 1
                  }}
                  onClick={() => !isLoading && handleDocumentSelect(doc)}
                >
                  <input
                    type="checkbox"
                    checked={!!selectedDocuments.find(d => d.id === doc.id)}
                    onChange={() => !isLoading && handleDocumentSelect(doc)}
                    style={{ cursor: isLoading ? 'not-allowed' : 'pointer' }}
                    disabled={isLoading}
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
          {currentUser && (
            <div style={{
              marginTop: '0.5rem',
              padding: '0.5rem',
              background: '#f0f4ff',
              borderRadius: '4px',
              border: '1px solid #d0e2ff'
            }}>
              <p style={{
                color: '#0f62fe',
                fontSize: '0.75rem',
                margin: 0,
                fontWeight: 500
              }}>
                Logged in as: {currentUser.username}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIChat;