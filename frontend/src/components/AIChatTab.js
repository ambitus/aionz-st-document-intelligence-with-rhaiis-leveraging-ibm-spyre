import React, { useState, useRef, useEffect } from 'react';
import {
  Watson,
  User,
  Document,
  Send,
  Close,
  Copy,
  TrashCan,
  StopFilled
} from '@carbon/icons-react';
import {
  InlineLoading
} from '@carbon/react';
import Icons from './Icons'

const AIChat = ({ documents, currentUser }) => {
  // Initialize messages from localStorage or with welcome message
  const [messages, setMessages] = useState(() => {
    if (currentUser?.username) {
      const savedChat = localStorage.getItem(`chatHistory_${currentUser.username}`);
      if (savedChat) {
        try {
          return JSON.parse(savedChat);
        } catch (error) {
          console.error('Error loading chat history:', error);
        }
      }
    }
    return [{
      id: 'welcome-' + Date.now(),
      role: 'assistant',
      content: "Hello! I'm your IBM Document Intelligence AI Assistant. I can help you analyze documents, answer questions about their content, extract insights, and more. How can I assist you today?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }];
  });

  const [input, setInput] = useState('');
  const [selectedDocuments, setSelectedDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState(null);
  const messagesEndRef = useRef(null);
  const abortControllerRef = useRef(null);

  const suggestedPrompts = [
    'Summarize all documents',
    'What are the key features of Spyre?',
    'Analyze the hardware requirements',
    'Explain the installation process'
  ];

  // Save chat history to localStorage whenever messages change
  useEffect(() => {
    if (currentUser?.username && messages.length > 0) {
      localStorage.setItem(`chatHistory_${currentUser.username}`, JSON.stringify(messages));
    }
  }, [messages, currentUser]);

  // Clear chat history when user changes
  useEffect(() => {
    if (currentUser?.username) {
      const savedChat = localStorage.getItem(`chatHistory_${currentUser.username}`);
      if (savedChat) {
        try {
          setMessages(JSON.parse(savedChat));
        } catch (error) {
          console.error('Error loading chat history:', error);
          setMessages([{
            id: 'welcome-' + Date.now(),
            role: 'assistant',
            content: "Hello! I'm your IBM Document Intelligence AI Assistant. I can help you analyze documents, answer questions about their content, extract insights, and more. How can I assist you today?",
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }]);
        }
      }
    }
  }, [currentUser]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

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

  // Add function to clear chat history
  const clearChatHistory = () => {
    const welcomeMessage = [{
      id: 'welcome-' + Date.now(),
      role: 'assistant',
      content: "Hello! I'm your IBM Document Intelligence AI Assistant. I can help you analyze documents, answer questions about their content, extract insights, and more. How can I assist you today?",
      timestamp: getCurrentTime()
    }];
    setMessages(welcomeMessage);
    if (currentUser?.username) {
      localStorage.setItem(`chatHistory_${currentUser.username}`, JSON.stringify(welcomeMessage));
    }
  };

  // Function to copy message content
  const copyToClipboard = async (content) => {
    try {
      await navigator.clipboard.writeText(content);
      // You could add a toast notification here for better UX
      console.log('Message copied to clipboard');
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  // Function to delete individual message
  const deleteMessage = (messageId) => {
    setMessages(prev => prev.filter(msg => msg.id !== messageId));
  };

  // Function to stop streaming response
  const stopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      const stoppedMessage = `[Response stopped by user. Partial response received:] ${messages.find(m => m.id === streamingMessageId)?.content || ''}`;
      
      setMessages(prev => prev.map(msg =>
        msg.id === streamingMessageId
          ? { 
              ...msg, 
              content: stoppedMessage, 
              isStreaming: false,
              isStopped: true 
            }
          : msg
      ));
      
      setIsLoading(false);
      setStreamingMessageId(null);
      abortControllerRef.current = null;
    }
  };

  // Function to clean response text and format it properly
  const cleanResponseText = (text) => {
    if (!text) return text;

    // Remove [DONE] and any trailing special characters
    let cleaned = text.replace(/\[DONE\]/g, '').trim();

    // Remove any other common streaming artifacts
    cleaned = cleaned.replace(/\\n/g, '\n');

    // Format URLs to display properly (remove angle brackets)
    cleaned = cleaned.replace(/<([^>]+)>/g, '$1');

    // Format the text for better readability
    cleaned = formatTextForReadability(cleaned);

    return cleaned;
  };

  // Function to format text with proper spacing and structure
  const formatTextForReadability = (text) => {
    if (!text) return text;

    // Replace multiple spaces with single space
    let formatted = text.replace(/\s+/g, ' ');

    // Add proper spacing after sentences
    formatted = formatted.replace(/([.!?])\s*([A-Z])/g, '$1\n\n$2');

    // Format lists and bullet points
    formatted = formatted.replace(/(\d+\.)\s*/g, '\n$1 ');
    formatted = formatted.replace(/[-•*]\s*/g, '\n• ');

    // Format headings or important sections
    formatted = formatted.replace(/([A-Z][^.!?]*?:)/g, '\n\n$1\n');

    // Ensure proper paragraph spacing
    formatted = formatted.replace(/\n\s*\n/g, '\n\n');

    // Trim and clean up
    formatted = formatted.trim();

    return formatted;
  };

  // Function to render formatted message content with proper line breaks and structure
  const renderFormattedContent = (content, isStreaming = false, isStopped = false) => {
    if (!content) return null;

    // Split content by lines and render with proper formatting
    const lines = content.split('\n');

    return (
      <>
        {lines.map((line, index) => {
          const trimmedLine = line.trim();

          // Skip empty lines but maintain spacing
          if (!trimmedLine) {
            return <div key={index} style={{ height: '0.75rem' }} />;
          }

          // Check if line is a heading (ends with colon)
          const isHeading = trimmedLine.endsWith(':') && trimmedLine.length < 100;

          // Check if line is a list item
          const isListItem = trimmedLine.startsWith('•') ||
            trimmedLine.startsWith('-') ||
            /^\d+\./.test(trimmedLine);

          // Check if line contains a URL
          const containsUrl = /https?:\/\/[^\s]+/.test(trimmedLine);

          return (
            <div
              key={index}
              style={{
                marginBottom: '0.5rem',
                marginLeft: isListItem ? '1rem' : '0',
                fontSize: '0.875rem',
                fontWeight: isHeading ? '600' : '400',
                color: isStopped ? '#8a3b00' : '#161616',
                lineHeight: '1.6',
                padding: isHeading ? '0.25rem 0' : '0',
                wordBreak: 'break-word',
                opacity: isStopped ? 0.8 : 1
              }}
            >
              {containsUrl ? (
                // Render URLs as clickable links
                trimmedLine.split(/(https?:\/\/[^\s]+)/g).map((part, partIndex) => {
                  if (part.match(/https?:\/\/[^\s]+/)) {
                    return (
                      <a
                        key={partIndex}
                        href={part}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: isStopped ? '#8a3b00' : '#0f62fe',
                          textDecoration: 'underline'
                        }}
                      >
                        {part}
                      </a>
                    );
                  }
                  return part;
                })
              ) : (
                trimmedLine
              )}
            </div>
          );
        })}
        {isStopped && (
          <div style={{
            marginTop: '0.5rem',
            padding: '0.5rem',
            background: '#fff8e1',
            border: '1px solid #ffc107',
            borderRadius: '4px',
            fontSize: '0.75rem',
            color: '#8a3b00'
          }}>
            Response was stopped by user
          </div>
        )}
      </>
    );
  };

  const sendStreamingQueryToAPI = async (query, username, onChunk, onTimeout) => {
    // Create abort controller for timeout handling
    abortControllerRef.current = new AbortController();
    const timeoutId = setTimeout(() => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        onTimeout?.();
      }
    }, 120000); // 2 minutes timeout

    try {
      const formData = new FormData();
      formData.append('query', query);
      formData.append('user_id', username);

      // Send selected document IDs and filenames
      // const documentIds = selectedDocuments.map(d => d.id).join(',');
      const documentNames = selectedDocuments.map(d => d.name).join(',');

      // formData.append('document_ids', documentIds);
      formData.append('document_names', documentNames);

      const apiUrl = process.env.REACT_APP_API_BASE_URL
      const response = await fetch(`${apiUrl}/ask-query`,{
        method: 'POST',
        body: formData,
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Check if the response is streamable
      const reader = response.body?.getReader();
      if (!reader) {
        // Fallback to regular response if streaming is not supported
        const result = await response.json();
        clearTimeout(timeoutId);
        return result;
      }

      const decoder = new TextDecoder();
      let accumulatedText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        accumulatedText += chunk;

        // Clean the text before updating UI
        const cleanedChunk = cleanResponseText(accumulatedText);

        // Call the callback with the cleaned chunk
        if (onChunk) {
          onChunk(cleanedChunk);
        }

        // Small delay to make streaming visible
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      clearTimeout(timeoutId);
      return { answer: accumulatedText };
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('Request was stopped by user.');
      }
      throw error;
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !currentUser?.username) return;

    const userMessage = {
      id: 'user-' + Date.now(),
      role: 'user',
      content: input,
      timestamp: getCurrentTime()
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Create a placeholder for the streaming response
    const streamingMessageId = 'ai-' + Date.now();
    setStreamingMessageId(streamingMessageId);

    const aiResponsePlaceholder = {
      id: streamingMessageId,
      role: 'assistant',
      content: '',
      timestamp: getCurrentTime(),
      isStreaming: true
    };
    setMessages(prev => [...prev, aiResponsePlaceholder]);

    let accumulatedContent = '';

    try {
      // Use streaming API with callback to update UI in real-time
      await sendStreamingQueryToAPI(
        input,
        currentUser.username,
        (chunk) => {
          accumulatedContent = chunk;
          setMessages(prev => prev.map(msg =>
            msg.id === streamingMessageId
              ? { ...msg, content: chunk }
              : msg
          ));
        },
        // Timeout callback
        () => {
          if (accumulatedContent) {
            // If we have some content, show it with a timeout notice
            const timeoutMessage = accumulatedContent + '\n\n[Note: Response was truncated due to timeout. This is a partial response.]';
            setMessages(prev => prev.map(msg =>
              msg.id === streamingMessageId
                ? { ...msg, content: timeoutMessage, isStreaming: false }
                : msg
            ));
          } else {
            // If no content received at all
            const timeoutMessage = "I'm sorry, the request timed out after 2 minutes. Please try again with a more specific query or check your network connection.";
            setMessages(prev => prev.map(msg =>
              msg.id === streamingMessageId
                ? { ...msg, content: timeoutMessage, isStreaming: false }
                : msg
            ));
          }
        }
      );

      // Streaming completed successfully - clean the final response
      setMessages(prev => prev.map(msg =>
        msg.id === streamingMessageId
          ? { ...msg, content: cleanResponseText(msg.content), isStreaming: false }
          : msg
      ));
    } catch (error) {
      console.error('Streaming failed:', error);

      // Handle abort (user stopped) differently
      if (error.message === 'Request was stopped by user.') {
        // Message already updated in stopStreaming function
        return;
      }

      // Handle other errors
      if (accumulatedContent) {
        // Show partial response with error notice
        const errorMessage = accumulatedContent + `\n\n[Note: ${error.message}]`;
        setMessages(prev => prev.map(msg =>
          msg.id === streamingMessageId
            ? { ...msg, content: errorMessage, isStreaming: false }
            : msg
        ));
      } else {
        const errorResponse = {
          id: 'error-' + Date.now(),
          role: 'assistant',
          content: `I'm sorry, I encountered an error while processing your request: ${error.message}. Please try again.`,
          timestamp: getCurrentTime()
        };
        setMessages(prev => [...prev.filter(msg => msg.id !== streamingMessageId), errorResponse]);
      }
    } finally {
      setIsLoading(false);
      setStreamingMessageId(null);
      abortControllerRef.current = null;
    }
  };

  const handlePromptClick = async (prompt) => {
    if (!currentUser?.username) {
      const errorMessage = {
        id: 'error-' + Date.now(),
        role: 'assistant',
        content: "Please make sure you're logged in to use the AI assistant.",
        timestamp: getCurrentTime()
      };
      setMessages(prev => [...prev, errorMessage]);
      return;
    }

    setInput(prompt);
    const userMessage = {
      id: 'user-' + Date.now(),
      role: 'user',
      content: prompt,
      timestamp: getCurrentTime()
    };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    // Create a placeholder for the streaming response
    const streamingMessageId = 'ai-' + Date.now();
    setStreamingMessageId(streamingMessageId);

    const aiResponsePlaceholder = {
      id: streamingMessageId,
      role: 'assistant',
      content: '',
      timestamp: getCurrentTime(),
      isStreaming: true
    };
    setMessages(prev => [...prev, aiResponsePlaceholder]);

    let accumulatedContent = '';

    try {
      // Use streaming API with callback to update UI in real-time
      await sendStreamingQueryToAPI(
        prompt,
        currentUser.username,
        (chunk) => {
          accumulatedContent = chunk;
          setMessages(prev => prev.map(msg =>
            msg.id === streamingMessageId
              ? { ...msg, content: chunk }
              : msg
          ));
        },
        // Timeout callback
        () => {
          if (accumulatedContent) {
            // If we have some content, show it with a timeout notice
            const timeoutMessage = accumulatedContent + '\n\n[Note: Response was truncated due to timeout. This is a partial response.]';
            setMessages(prev => prev.map(msg =>
              msg.id === streamingMessageId
                ? { ...msg, content: timeoutMessage, isStreaming: false }
                : msg
            ));
          } else {
            // If no content received at all
            const timeoutMessage = "I'm sorry, the request timed out after 2 minutes. Please try again with a more specific query or check your network connection.";
            setMessages(prev => prev.map(msg =>
              msg.id === streamingMessageId
                ? { ...msg, content: timeoutMessage, isStreaming: false }
                : msg
            ));
          }
        }
      );

      // Streaming completed successfully - clean the final response
      setMessages(prev => prev.map(msg =>
        msg.id === streamingMessageId
          ? { ...msg, content: cleanResponseText(msg.content), isStreaming: false }
          : msg
      ));
    } catch (error) {
      console.error('Streaming failed:', error);

      // Handle abort (user stopped) differently
      if (error.message === 'Request was stopped by user.') {
        // Message already updated in stopStreaming function
        return;
      }

      // Handle other errors
      if (accumulatedContent) {
        // Show partial response with error notice
        const errorMessage = accumulatedContent + `\n\n[Note: ${error.message}]`;
        setMessages(prev => prev.map(msg =>
          msg.id === streamingMessageId
            ? { ...msg, content: errorMessage, isStreaming: false }
            : msg
        ));
      } else {
        const errorResponse = {
          id: 'error-' + Date.now(),
          role: 'assistant',
          content: `I'm sorry, I encountered an error while processing your request: ${error.message}. Please try again.`,
          timestamp: getCurrentTime()
        };
        setMessages(prev => [...prev.filter(msg => msg.id !== streamingMessageId), errorResponse]);
      }
    } finally {
      setIsLoading(false);
      setStreamingMessageId(null);
      abortControllerRef.current = null;
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
        {/* Chat Header with Selected Documents and Clear Chat Button */}
        <div style={{
          padding: '1.5rem',
          borderBottom: '2px solid #f4f4f4',
          background: 'linear-gradient(to right, #f8f9fa, white)',
          position: 'relative'
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
              <Icons.RedHat />
            </div>
            <div style={{ flex: 1 }}>
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

          {/* Stop Streaming Button - Only shows when streaming is active */}
          {streamingMessageId && (
            <button
              onClick={stopStreaming}
              style={{
                position: 'absolute',
                top: '1.5rem',
                right: '9rem',
                background: '#fff1f1',
                border: '1px solid #ffd7d9',
                color: '#da1e28',
                padding: '0.4rem 0.8rem',
                borderRadius: '6px',
                fontSize: '0.7rem',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#ffd7d9';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = '#fff1f1';
              }}
            >
              <StopFilled size={12} />
              Stop
            </button>
          )}

          {/* Clear Chat Button */}
          <button
            onClick={clearChatHistory}
            disabled={isLoading}
            style={{
              position: 'absolute',
              top: '1.5rem',
              right: '1.5rem',
              background: '#fff1f1',
              border: '1px solid #ffd7d9',
              color: '#da1e28',
              padding: '0.4rem 0.8rem',
              borderRadius: '6px',
              fontSize: '0.7rem',
              fontWeight: 500,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              opacity: isLoading ? 0.6 : 1
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.target.style.background = '#ffd7d9';
              }
            }}
            onMouseLeave={(e) => {
              if (!isLoading) {
                e.target.style.background = '#fff1f1';
              }
            }}
          >
            Clear Chat
          </button>

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
              marginBottom: '1.5rem',
              position: 'relative'
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
                      <Icons.RedHat />
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
                      width: '4px',
                      height: '4px',
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
              <div
                style={{
                  background: msg.isStopped ? '#fff8e1' : msg.role === 'assistant' ? 'white' : '#edf5ff',
                  border: `2px solid ${msg.isStopped ? '#ffc107' : msg.role === 'assistant' ? '#e0e0e0' : '#d0e2ff'}`,
                  borderRadius: '8px',
                  padding: '1rem',
                  marginLeft: msg.role === 'assistant' ? '0' : '2rem',
                  position: 'relative'
                }}
                className="message-container"
              >
                <div style={{
                  color: '#161616',
                  lineHeight: '1.5',
                  fontSize: '0.875rem',
                  wordBreak: 'break-word',
                  minHeight: msg.isStreaming && !msg.content ? '40px' : 'auto'
                }}>
                  {msg.role === 'assistant' ?
                    renderFormattedContent(msg.content, msg.isStreaming, msg.isStopped) :
                    msg.content
                  }

                  {msg.isStreaming && !msg.content && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <InlineLoading
                        description="AI is thinking..."
                        status="active"
                      />
                    </div>
                  )}
                </div>

                {/* Message Action Buttons - Only show for non-streaming assistant messages at the bottom */}
                {!msg.isStreaming && msg.role === 'assistant' && (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      gap: '0.5rem',
                      marginTop: '1rem',
                      paddingTop: '0.75rem',
                      borderTop: '1px solid #f0f0f0',
                      opacity: 0,
                      transition: 'opacity 0.2s'
                    }}
                    className="message-actions"
                  >
                    {/* Copy Button */}
                    {msg.id !== messages[0]?.id && (
                      <button
                        onClick={() => copyToClipboard(msg.content)}
                        style={{
                          background: 'transparent',
                          border: '1px solid #e0e0e0',
                          borderRadius: '4px',
                          padding: '0.4rem 0.6rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          fontSize: '0.7rem',
                          color: '#525252',
                          transition: 'all 0.2s'
                        }}
                      >
                        <Copy size={10} />
                        Copy
                      </button>
                    )}

                    {/* Delete Button - Don't show for welcome message */}
                    {msg.id !== messages[0]?.id && (
                      <button
                        onClick={() => deleteMessage(msg.id)}
                        style={{
                          background: 'transparent',
                          border: '1px solid #ffd7d9',
                          borderRadius: '4px',
                          padding: '0.4rem 0.6rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          fontSize: '0.7rem',
                          color: '#da1e28',
                          transition: 'all 0.2s'
                        }}
                      >
                        <TrashCan size={10} />
                        Delete
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* CSS for hover effect on message actions */}
              <style jsx>{`
                .message-container:hover .message-actions {
                  opacity: 1 !important;
                }
                @keyframes blink {
                  0%, 50% { opacity: 1; }
                  51%, 100% { opacity: 0; }
                }
                @keyframes pulse {
                  0% { opacity: 1; }
                  50% { opacity: 0.5; }
                  100% { opacity: 1; }
                }
              `}</style>
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
            <Icons.RedHat />
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