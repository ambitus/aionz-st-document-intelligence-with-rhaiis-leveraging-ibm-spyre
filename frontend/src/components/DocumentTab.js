import React, { useState, useRef, useEffect } from 'react';
import {
  Calendar,
  DataBase,
  Document,
  Time,
  TrashCan,
  Download,
  Close,
  Checkmark,
  Warning,
  Error
} from '@carbon/icons-react';
import {
  Button,
  Tag,
  InlineLoading,
  Tile,
  Stack
} from '@carbon/react';
import Icons from './Icons'

const DocumentsTab = ({ documents, onUpload, onDelete, currentUser, loadingUserDocuments = false }) => {
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedDocForDetails, setSelectedDocForDetails] = useState(null);
  const [selectedDocForPreview, setSelectedDocForPreview] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploadingFiles, setUploadingFiles] = useState(new Set());
  const [recentActivities, setRecentActivities] = useState([]);
  const [processingStartTimes, setProcessingStartTimes] = useState({});
  const [fileSizeError, setFileSizeError] = useState(null);
  const [fileSizeModalOpen, setFileSizeModalOpen] = useState(false);
  const [oversizedFiles, setOversizedFiles] = useState([]);
  const [loadingServerDocuments, setLoadingServerDocuments] = useState(false);

  
  // Enhanced streaming state
  const [streamingDocuments, setStreamingDocuments] = useState({});
  const [streamingSummaries, setStreamingSummaries] = useState({});
  const [streamingContent, setStreamingContent] = useState({});
  const [streamingModalOpen, setStreamingModalOpen] = useState(false);
  const [activeStreamingDoc, setActiveStreamingDoc] = useState(null);
  const [streamingStatus, setStreamingStatus] = useState({});
  const [streamingProgress, setStreamingProgress] = useState({});
  const [documentContent, setDocumentContent] = useState({}); // Store raw document content
  const [streamingError, setStreamingError] = useState({}); // Store streaming errors

  const MAX_FILE_SIZE = 10 * 1024 * 1024;

  const addActivity = (documentName, action, duration = null, status = 'completed') => {
    const activity = {
      id: Date.now() + Math.random(),
      documentName,
      action,
      timestamp: new Date(),
      duration,
      status
    };
    setRecentActivities(prev => [activity, ...prev].slice(0, 10));
  };

  const calculateProcessingTime = (startTime, endTime) => {
    const duration = endTime - startTime;
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  const validateFileSize = (file) => {
    if (file.size > MAX_FILE_SIZE) {
      return {
        isValid: false,
        error: `File "${file.name}" exceeds 10MB limit. Size: ${formatFileSize(file.size)}`
      };
    }
    return { isValid: true };
  };

  const handleFileSizeError = (invalidFiles) => {
    setOversizedFiles(invalidFiles);
    setFileSizeModalOpen(true);
    invalidFiles.forEach(file => {
      addActivity(file.name, 'upload failed', null, 'error');
    });
  };

  const getDocumentProcessingTime = (doc) => {
    if (doc.processingTime) {
      return doc.processingTime;
    }
    const startTime = processingStartTimes[doc.id];
    if (startTime && doc.status === 'ready') {
      const processingTime = calculateProcessingTime(startTime, Date.now());
      doc.processingTime = processingTime;
      return processingTime;
    }
    return null;
  };

  // Enhanced streaming upload handler with improved parsing
  const handleStreamingUpload = async (files) => {
    const filesArray = Array.from(files);
    
    // Validate file sizes
    const invalidFiles = [];
    const validFiles = [];

    filesArray.forEach(file => {
      const validation = validateFileSize(file);
      if (!validation.isValid) {
        invalidFiles.push(file);
      } else {
        validFiles.push(file);
      }
    });

    if (invalidFiles.length > 0) {
      handleFileSizeError(invalidFiles);
      if (validFiles.length === 0) return;
    }

    // Add to uploading files
    const newUploadingFiles = new Set(uploadingFiles);
    validFiles.forEach(file => newUploadingFiles.add(file.name));
    setUploadingFiles(newUploadingFiles);

    // Process each file
    for (const file of validFiles) {
      const tempDocId = `temp_${Date.now()}_${Math.random()}`;
      const startTime = Date.now();
      
      // Initialize streaming state
      setStreamingDocuments(prev => ({
        ...prev,
        [tempDocId]: {
          id: tempDocId,
          name: file.name,
          size: file.size,
          status: 'uploading',
          startTime: startTime,
          file: file,
          completed: false,
          error: null
        }
      }));
      
      setStreamingSummaries(prev => ({ ...prev, [tempDocId]: '' }));
      setStreamingContent(prev => ({ ...prev, [tempDocId]: '' }));
      setStreamingStatus(prev => ({ ...prev, [tempDocId]: 'Initializing upload...' }));
      setStreamingProgress(prev => ({ ...prev, [tempDocId]: 0 }));
      setDocumentContent(prev => ({ ...prev, [tempDocId]: '' }));
      setStreamingError(prev => ({ ...prev, [tempDocId]: null }));

      // AUTO-OPEN STREAMING MODAL
      setActiveStreamingDoc(tempDocId);
      setStreamingModalOpen(true);

      try {
        const formData = new FormData();
        formData.append('files', file);
        formData.append('user_id', currentUser.username);
        const apiUrl = process.env.REACT_APP_API_BASE_URL  
       // const streamUrl = process.env.REACT_APP_API_BASE_URL || 'http://129.40.90.163:8002/upload-files';
        
        setStreamingStatus(prev => ({ ...prev, [tempDocId]: 'Uploading file to server...' }));
        setStreamingProgress(prev => ({ ...prev, [tempDocId]: 10 }));

        const response = await fetch(`${apiUrl}/upload-files`, {
          method: 'POST',
          body: formData,
          headers: {
            'Accept': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let summary = '';
        let content = '';
        let rawContent = '';
        let isComplete = false;

        setStreamingStatus(prev => ({ ...prev, [tempDocId]: 'Processing document...' }));
        setStreamingProgress(prev => ({ ...prev, [tempDocId]: 25 }));

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.trim() === '') continue;
            
            try {
              // Check if this is an event line
              if (line.startsWith('data: ')) {
                const dataStr = line.slice(6);
                
                // Try to parse as JSON first (for events)
                try {
                  const data = JSON.parse(dataStr);
                  
                  if (data.event === 'document_start') {
                    setStreamingStatus(prev => ({ 
                      ...prev, 
                      [tempDocId]: `Processing: ${data.filename}` 
                    }));
                    setStreamingDocuments(prev => ({
                      ...prev,
                      [tempDocId]: { 
                        ...prev[tempDocId], 
                        status: 'processing', 
                        filename: data.filename 
                      }
                    }));
                    setStreamingProgress(prev => ({ ...prev, [tempDocId]: 40 }));
                  }
                  
                  if (data.event === 'raw_content') {
                    // Store raw document content
                    if (data['doc-content']) {
                      rawContent = data['doc-content'];
                      setDocumentContent(prev => ({ ...prev, [tempDocId]: rawContent }));
                    }
                    setStreamingStatus(prev => ({ 
                      ...prev, 
                      [tempDocId]: 'summarizing...' 
                    }));
                    setStreamingProgress(prev => ({ ...prev, [tempDocId]: 50 }));
                  }
                  
                  if (data.event === 'summary_chunk') {
                    // Append summary chunk to existing summary
                    if (data['doc-summary']) {
                      summary += data['doc-summary'];
                      setStreamingSummaries(prev => ({ ...prev, [tempDocId]: summary }));
                      setStreamingDocuments(prev => ({
                        ...prev,
                        [tempDocId]: { ...prev[tempDocId], status: 'summarizing' }
                      }));
                      setStreamingProgress(prev => ({ 
                        ...prev, 
                        [tempDocId]: Math.min(prev[tempDocId] + 3, 90) 
                      }));
                    }
                  }
                  
                  if (data.event === 'document_end') {
                    setStreamingStatus(prev => ({ 
                      ...prev, 
                      [tempDocId]: `Document processed: ${data.filename}` 
                    }));
                    setStreamingProgress(prev => ({ ...prev, [tempDocId]: 90 }));
                  }
                  
                  if (data.event === 'all_complete') {
                    const endTime = Date.now();
                    const processingTime = calculateProcessingTime(startTime, endTime);

                    setStreamingStatus(prev => ({
                      ...prev,
                      [tempDocId]: `Processing complete! (${processingTime})`
                    }));

                    setStreamingProgress(prev => ({ ...prev, [tempDocId]: 100 }));

                    setStreamingDocuments(prev => ({
                      ...prev,
                      [tempDocId]: {
                        ...prev[tempDocId],
                        status: 'complete',
                        processingTime,
                        completedAt: new Date(),
                        completed: true
                      }
                    }));

                    // Create final document object with both summary and raw content
                    const finalDoc = {
                      id: `doc_${Date.now()}_${Math.random()}`,
                      name: file.name,
                      size: file.size,
                      uploadedAt: new Date(),
                      status: 'ready',
                      summary: summary || `Document ${file.name} has been successfully processed and analyzed.`,
                      extractedInfo: rawContent || 'Extracted content',
                      file: file,
                      processingTime: processingTime,
                      apiResponse: [{
                        doc_summary: { choices: [{ text: summary || 'No summary generated' }] },
                        doc_content: rawContent || '',
                        filename: file.name
                      }]
                    };

                    // CRITICAL: Add to documents list via onUpload callback
                    if (onUpload) {
                      await onUpload([file], finalDoc);
                    }

                    addActivity(file.name, 'processed', processingTime, 'completed');

                    // Update streaming status to show completion
                    setTimeout(() => {
                      setStreamingStatus(prev => ({
                        ...prev,
                        [tempDocId]: `Response complete! Document added to recent documents.`
                      }));
                    }, 500);

                    isComplete = true;
                    break;
                  }
                  
                  if (data.event === 'error') {
                    throw new Error(data.message || 'Processing error');
                  }
                  
                } catch (jsonError) {
                  // If it's not JSON, it might be direct text content
                  console.log('Non-JSON data:', dataStr);
                  
                  // For non-JSON data, add to content
                  if (dataStr.trim() && !dataStr.includes('[DONE]')) {
                    content += dataStr + '\n';
                    setStreamingContent(prev => ({ ...prev, [tempDocId]: content }));
                  }
                }
              } else {
                // Handle raw text lines (not prefixed with 'data: ')
                if (line.trim() && !line.includes('[DONE]')) {
                  content += line + '\n';
                  setStreamingContent(prev => ({ ...prev, [tempDocId]: content }));
                }
              }
              
            } catch (e) {
              console.error('Error parsing streaming data:', e);
            }
          }
          
          if (isComplete) break;
        }
      } catch (error) {
        console.error('Streaming error:', error);
        setStreamingDocuments(prev => ({
          ...prev,
          [tempDocId]: { 
            ...prev[tempDocId], 
            status: 'error',
            error: error.message
          }
        }));
        setStreamingError(prev => ({ ...prev, [tempDocId]: error.message }));
        setStreamingStatus(prev => ({
          ...prev,
          [tempDocId]: '✗ Error: ' + error.message
        }));
        setStreamingProgress(prev => ({ ...prev, [tempDocId]: 0 }));
        addActivity(file.name, 'upload failed', null, 'error');
        
        // Create error document
        const errorDoc = {
          id: `doc_${Date.now()}_${Math.random()}`,
          name: file.name,
          size: file.size,
          uploadedAt: new Date(),
          status: 'error',
          summary: `Failed to process document: ${error.message}`,
          extractedInfo: '',
          file: file,
          processingTime: null,
          apiResponse: [],
          error: error.message
        };

        if (onUpload) {
          await onUpload([], errorDoc);
        }

        // Auto-close modal after error
        setTimeout(() => {
          if (activeStreamingDoc === tempDocId) {
            closeStreamingModal();
          }
        }, 3000);
      } finally {
        // Remove from uploading files
        const updatedUploadingFiles = new Set(uploadingFiles);
        updatedUploadingFiles.delete(file.name);
        setUploadingFiles(updatedUploadingFiles);
      }
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  const handleFileUpload = async (files) => {
    await handleStreamingUpload(files);
  };

  const closeStreamingModal = () => {
    setStreamingModalOpen(false);
    
    // If there's a completed streaming document, ensure it's in the list
    if (activeStreamingDoc && streamingDocuments[activeStreamingDoc]?.status === 'complete') {
      // The document should already be added via onUpload callback
      console.log('Document processing complete, added to recent documents');
    }
    
    setActiveStreamingDoc(null);
  };

  // Updated viewStreamingSummary function
  const viewStreamingSummary = () => {
    if (!activeStreamingDoc || !streamingDocuments[activeStreamingDoc]) return;
    
    const doc = streamingDocuments[activeStreamingDoc];
    const summary = streamingSummaries[activeStreamingDoc] || '';
    const content = documentContent[activeStreamingDoc] || streamingContent[activeStreamingDoc] || '';
    
    // Check if this document is already in the main documents list
    const isInMainList = documents.some(d => 
      d.name === doc.name && 
      Math.abs(new Date(d.uploadedAt).getTime() - new Date().getTime()) < 10000
    );
    
    // If not in main list, add it via onUpload
    if (!isInMainList && onUpload) {
      const finalDoc = {
        id: `doc_${Date.now()}_${Math.random()}`,
        name: doc.name,
        size: doc.size,
        uploadedAt: new Date(),
        status: 'ready',
        summary: summary || `Document ${doc.name} has been successfully processed and analyzed.`,
        extractedInfo: content || 'Extracted content',
        processingTime: doc.processingTime,
        apiResponse: [{
          doc_summary: { choices: [{ text: summary || '' }] },
          doc_content: content || '',
          filename: doc.name
        }]
      };
      
      onUpload([], finalDoc);
    }
    
    // Find the document in the main list or use the streaming doc
    const mainDoc = documents.find(d => 
      d.name === doc.name && 
      Math.abs(new Date(d.uploadedAt).getTime() - new Date().getTime()) < 10000
    ) || {
      id: `stream_${Date.now()}`,
      name: doc.name,
      size: doc.size,
      uploadedAt: doc.completedAt || new Date(),
      status: 'ready',
      summary: summary || `Document ${doc.name} has been successfully processed and analyzed.`,
      extractedInfo: content || 'Extracted content',
      processingTime: doc.processingTime,
      apiResponse: [{
        doc_summary: { choices: [{ text: summary || '' }] },
        doc_content: content || '',
        filename: doc.name
      }]
    };
    
    setSelectedDocForDetails(mainDoc);
    closeStreamingModal();
  };
  // Add a new useEffect to handle auto-scrolling when summary updates
useEffect(() => {
  if (activeStreamingDoc && streamingSummaries[activeStreamingDoc]) {
    // Wait for the DOM to update, then scroll to bottom
    setTimeout(() => {
      const summaryContainer = document.querySelector('.summary-container');
      if (summaryContainer) {
        summaryContainer.scrollTop = summaryContainer.scrollHeight;
      }
    }, 50);
  }
}, [streamingSummaries, activeStreamingDoc]);
  useEffect(() => {
    if (currentUser?.username) {
      // Check if we need to fetch documents (they might already be passed from Dashboard)
      const hasServerDocs = documents.some(doc => doc.fromServer);
      if (!hasServerDocs) {
        // Optionally fetch here too for redundancy
      }
    }
  }, [currentUser?.username]);
  useEffect(() => {
    // Check if any streaming document is complete and update documents
    if (activeStreamingDoc && streamingDocuments[activeStreamingDoc]?.status === 'complete') {
      const streamingDoc = streamingDocuments[activeStreamingDoc];
      const summary = streamingSummaries[activeStreamingDoc];
      const content = documentContent[activeStreamingDoc] || streamingContent[activeStreamingDoc];
      
      // Check if this document is already in the documents list
      const isAlreadyAdded = documents.some(doc => 
        doc.name === streamingDoc.name && 
        Math.abs(new Date(doc.uploadedAt).getTime() - new Date().getTime()) < 5000
      );
      
      if (!isAlreadyAdded && summary && onUpload) {
        // Create final document object
        const finalDoc = {
          id: Date.now() + Math.random(),
          name: streamingDoc.name,
          size: streamingDoc.size,
          uploadedAt: new Date(),
          status: 'ready',
          summary: summary || `Document ${streamingDoc.name} has been successfully processed and analyzed.`,
          extractedInfo: content || 'Extracted content',
          processingTime: streamingDoc.processingTime,
          apiResponse: [{
            doc_summary: { choices: [{ text: summary || '' }] },
            doc_content: content || '',
            filename: streamingDoc.name
          }]
        };
        
        // Add to documents via onUpload
        onUpload([], finalDoc);
      }
    }
  }, [streamingDocuments, activeStreamingDoc]);

  // Monitor document status changes
  useEffect(() => {
    documents.forEach(doc => {
      if (doc.status === 'processing' && !processingStartTimes[doc.id]) {
        setProcessingStartTimes(prev => ({ ...prev, [doc.id]: Date.now() }));
      }

      if (doc.status === 'ready') {
        if (!doc.processingTime && processingStartTimes[doc.id]) {
          const processingTime = calculateProcessingTime(processingStartTimes[doc.id], Date.now());
          doc.processingTime = processingTime;
          doc.processedAt = new Date();
        }
      }
    });
  }, [documents]);

  // Clear on user change
  useEffect(() => {
    setRecentActivities([]);
    setProcessingStartTimes({});
    setSelectedDocForDetails(null);
    setSelectedDocForPreview(null);
    setUploadingFiles(new Set());
    setFileSizeError(null);
    setFileSizeModalOpen(false);
    setOversizedFiles([]);
    setStreamingDocuments({});
    setStreamingSummaries({});
    setStreamingContent({});
    setStreamingModalOpen(false);
    setActiveStreamingDoc(null);
    setStreamingStatus({});
    setStreamingProgress({});
    setDocumentContent({});
    setStreamingError({});

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  }, [currentUser]);

  const openPreviewPopup = (doc) => {
    if (!doc.file) {
      alert('File not available for preview');
      return;
    }
    const url = URL.createObjectURL(doc.file);
    setPreviewUrl(url);
    setSelectedDocForPreview(doc);
  };

  const closePreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setSelectedDocForPreview(null);
  };

  const getPreviewContent = (doc, url) => {
    if (doc.file.type.startsWith('image/')) {
      return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', padding: '2rem' }}>
          <img src={url} alt="Preview" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)' }} />
        </div>
      );
    } else if (doc.file.type === 'application/pdf') {
      return <iframe src={url} style={{ width: '100%', height: '100%', border: 'none', borderRadius: '8px' }} title="PDF Preview" />;
    } else if (doc.file.type === 'text/plain' || doc.name.endsWith('.txt')) {
      return <TextFilePreview url={url} />;
    } else {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '3rem', textAlign: 'center' }}>
          <Document size={64} style={{ color: '#c6c6c6', marginBottom: '1rem' }} />
          <h3 style={{ color: '#161616', fontSize: '1.25rem', fontWeight: 500, margin: '0 0 0.5rem 0' }}>Preview Not Available</h3>
          <p style={{ color: '#525252', fontSize: '0.875rem', margin: '0 0 1rem 0' }}>This file type cannot be previewed in the browser.</p>
          <a href={url} download={doc.name} style={{ background: '#0f62fe', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>Download File</a>
        </div>
      );
    }
  };

  const TextFilePreview = ({ url }) => {
    const [content, setContent] = useState('Loading...');
    const [error, setError] = useState(null);

    React.useEffect(() => {
      fetch(url)
        .then(response => {
          if (!response.ok) throw new Error('Failed to load file');
          return response.text();
        })
        .then(text => setContent(text))
        .catch(err => setError('Error loading file content: ' + err.message));
    }, [url]);

    return (
      <div style={{ padding: '2rem', height: '100%', overflow: 'auto', background: 'white' }}>
        <pre style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word', fontFamily: "'Courier New', monospace", fontSize: '0.875rem', lineHeight: '1.6', color: '#161616', margin: 0 }}>
          {error || content}
        </pre>
      </div>
    );
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileUpload(e.target.files);
      e.target.value = ''; // Reset input
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / 1048576).toFixed(2) + ' MB';
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    });
  };

  const formatDateTime = (date) => {
    return date.toLocaleString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const downloadSummary = (doc, format) => {
    let summaryContent = '';
    let extractedContent = '';

    if (doc.apiResponse && doc.apiResponse.length > 0) {
      const response = doc.apiResponse[0];
      const docSummary = response.doc_summary;

      if (docSummary && docSummary.choices && docSummary.choices.length > 0) {
        const summaryText = docSummary.choices[0].text || '';
        summaryContent = summaryText.replace(/^Summarize the following document:\s*/i, '') || 'No summary available';
      } else if (typeof docSummary === 'string') {
        summaryContent = docSummary;
      } else if (Array.isArray(docSummary)) {
        summaryContent = docSummary.join('\n');
      } else {
        summaryContent = 'No summary available';
      }

      extractedContent = response.doc_content || 'No extracted content available';
    } else {
      summaryContent = doc.summary || 'No summary available';
      extractedContent = doc.extractedInfo || 'No extracted information available';
    }

    if (format === 'txt') {
      const content = `Document: ${doc.name}\n\nSummary:\n${summaryContent}\n\nExtracted Information:\n${extractedContent}`;
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${doc.name.replace(/\.[^/.]+$/, '')}_summary.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } else if (format === 'pdf') {
      const printWindow = window.open('', '_blank');
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>${doc.name} - Summary</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; color: #333; }
            h1 { color: #0f62fe; border-bottom: 3px solid #0f62fe; padding-bottom: 10px; margin-bottom: 20px; }
            h2 { color: #161616; margin-top: 30px; margin-bottom: 15px; }
            .summary-box { background: #edf5ff; border-left: 4px solid #0f62fe; padding: 20px; margin: 20px 0; white-space: pre-line; line-height: 1.6; }
          </style>
        </head>
        <body>
          <h1>${doc.name}</h1>
          <h2>AI-Generated Summary</h2>
          <div class="summary-box">${summaryContent}</div>
          <h2>Extracted Information</h2>
          <div class="extracted-info">${extractedContent}</div>
        </body>
        </html>
      `;
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      setTimeout(() => printWindow.print(), 250);
    }
  };

  return (
    <>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
        @keyframes shimmer { 0% { background-position: -1000px 0; } 100% { background-position: 1000px 0; } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .processing-overlay {
          position: absolute; top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(255, 255, 255, 0.9);
          display: flex; align-items: center; justifyContent: center;
          border-radius: 8px; z-index: 10;
        }
        .streaming-text { animation: pulse 1.5s ease-in-out infinite; }
        .shimmer-bg {
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 1000px 100%; animation: shimmer 2s infinite;
        }
        .spinner { animation: spin 1s linear infinite; }
        .progress-bar {
          height: 8px; background: #e5e7eb; border-radius: 4px; overflow: hidden; width: 100%;
        }
        .progress-fill {
          height: 100%; background: linear-gradient(90deg, #0f62fe, #0353e9);
          transition: width 0.3s ease; border-radius: 4px;
        }
        .summary-container {
          max-height: 400px;
          overflow-y: auto;
          padding-right: 10px;
        }
        .summary-container::-webkit-scrollbar {
          width: 6px;
        }
        .summary-container::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 3px;
        }
        .summary-container::-webkit-scrollbar-thumb {
          background: #0f62fe;
          border-radius: 3px;
        }
        .summary-container::-webkit-scrollbar-thumb:hover {
          background: #0353e9;
        }
      `}</style>

      {/* LIVE STREAMING MODAL - Updated to show real summary chunks */}
      {streamingModalOpen && activeStreamingDoc && streamingDocuments[activeStreamingDoc] && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 10001, padding: '2rem', animation: 'fadeIn 0.3s ease-in-out'
        }} onClick={closeStreamingModal}>
          <div style={{
            background: 'white', borderRadius: '16px', width: '100%', maxWidth: '900px',
            maxHeight: '90vh', display: 'flex', flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', animation: 'slideUp 0.3s ease-out'
          }} onClick={(e) => e.stopPropagation()}>
            
            {/* Header */}
            <div style={{
              padding: '2rem', borderBottom: '1px solid #e5e7eb',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'linear-gradient(to bottom, #ffffff, #f9fafb)',
              borderTopLeftRadius: '16px', borderTopRightRadius: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{
                  width: '48px', height: '48px',
                  background: streamingDocuments[activeStreamingDoc].status === 'complete' 
                    ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                    : streamingDocuments[activeStreamingDoc].status === 'error'
                    ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                    : 'linear-gradient(135deg, #0f62fe 0%, #0353e9 100%)',
                  borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 6px rgba(15, 98, 254, 0.2)'
                }}>
                  {streamingDocuments[activeStreamingDoc].status === 'complete' ? (
                    <Checkmark size={24} style={{ color: 'white' }} />
                  ) : streamingDocuments[activeStreamingDoc].status === 'error' ? (
                    <Error size={24} style={{ color: 'white' }} />
                  ) : (
                    <div className="spinner">
                      <span style={{ width: '20px', height: '20px', color: 'white' }}><Icons.RedHat/></span>
                    </div>
                  )}
                </div>
                <div>
                  <h2 style={{ color: '#111827', fontSize: '1.25rem', fontWeight: 600, margin: 0, lineHeight: 1.3 }}>
                    {streamingDocuments[activeStreamingDoc].status === 'error' ? 'Processing Failed' : `Processing: ${streamingDocuments[activeStreamingDoc].name}`}
                  </h2>
                  <p style={{ color: streamingDocuments[activeStreamingDoc].status === 'error' ? '#dc2626' : '#6b7280', fontSize: '0.875rem', margin: '0.25rem 0 0 0' }}>
                    {streamingStatus[activeStreamingDoc] || 'Initializing...'}
                  </p>
                </div>
              </div>
              
              <button onClick={closeStreamingModal} style={{
                background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.5rem',
                borderRadius: '6px', color: '#525252', fontSize: '1.5rem',
                width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                '&:hover': { backgroundColor: '#f3f4f6' }
              }}>
                <Close size={24} />
              </button>
            </div>

            {/* Content */}
            <div style={{ padding: '2rem', overflowY: 'auto', flex: 1 }}>
              
              {/* Progress Bar - Only show if not error */}
              {streamingDocuments[activeStreamingDoc].status !== 'complete' && streamingDocuments[activeStreamingDoc].status !== 'error' && (
                <div style={{ marginBottom: '2rem', padding: '1.5rem', background: '#f9fafb', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                    <span className="spinner" style={{ width: '20px', height: '20px', color: '#0f62fe' }}><Icons.Sparkles /></span>
                    <div style={{ flex: 1 }}>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ 
                          width: `${streamingProgress[activeStreamingDoc] || 0}%` 
                        }} />
                      </div>
                    </div>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f62fe', minWidth: '45px', textAlign: 'right' }}>
                      {streamingProgress[activeStreamingDoc] || 0}%
                    </span>
                  </div>
                  <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: 0, textAlign: 'center' }}>
                    {streamingDocuments[activeStreamingDoc].status === 'uploading' && 'Uploading document...'}
                    {streamingDocuments[activeStreamingDoc].status === 'processing' && 'Extracting text content...'}
                    {streamingDocuments[activeStreamingDoc].status === 'summarizing' && 'AI is analyzing and generating summary...'}
                  </p>
                </div>
              )}

              {/* Error Display */}
              {streamingDocuments[activeStreamingDoc].status === 'error' && (
                <div style={{ marginBottom: '2rem', padding: '1.5rem', background: '#fef2f2', borderRadius: '12px', border: '2px solid #fecaca' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                    <Error size={20} style={{ color: '#dc2626' }} />
                    <h3 style={{ color: '#dc2626', fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>
                      Processing Failed
                    </h3>
                  </div>
                  <p style={{ color: '#7f1d1d', fontSize: '0.9375rem', margin: 0, lineHeight: '1.6' }}>
                    {streamingError[activeStreamingDoc] || 'An error occurred while processing the document. Please try again.'}
                  </p>
                  <p style={{ color: '#991b1b', fontSize: '0.875rem', margin: '1rem 0 0 0', fontStyle: 'italic' }}>
                    The streaming modal will close automatically in a few seconds...
                  </p>
                </div>
              )}

              {/* Live Summary - Now shows actual summary chunks from stream */}
             {streamingSummaries[activeStreamingDoc] && streamingDocuments[activeStreamingDoc].status !== 'error' && (
  <div style={{ marginBottom: '2rem' }}>
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      marginBottom: '1rem'
    }}>
      <span style={{ width: '20px', height: '20px', color: '#0f62fe' }}>
        <Icons.Sparkles />
      </span>
      <h3 style={{
        color: '#111827',
        fontSize: '1.125rem',
        fontWeight: 600,
        margin: 0
      }}>
        AI-Generated Summary
        {streamingDocuments[activeStreamingDoc].status !== 'complete' && (
          <span className="streaming-text" style={{ color: '#0f62fe', fontSize: '0.875rem', fontWeight: 400, marginLeft: '0.5rem' }}>
            (streaming live...)
          </span>
        )}
      </h3>
    </div>

    <div style={{
      padding: '1.5rem',
      background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
      border: '2px solid #bfdbfe',
      borderRadius: '12px',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: '0 2px 8px rgba(15, 98, 254, 0.1)',
      maxHeight: '400px', // Reduced from 400px for better UX
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '4px',
        height: '100%',
        background: 'linear-gradient(to bottom, #0f62fe, #0353e9)'
      }} />
      
      {/* Auto-scrolling summary container */}
      <div 
        className="summary-container"
        ref={(el) => {
          // Auto-scroll to bottom when content updates
          if (el && streamingSummaries[activeStreamingDoc]) {
            setTimeout(() => {
              el.scrollTop = el.scrollHeight;
            }, 0);
          }
        }}
        style={{
          flex: 1,
          overflowY: 'auto',
          paddingRight: '10px',
          maxHeight: '400px' // Fixed height for consistent scrolling
        }}
      >
        <div 
          id={`summary-content-${activeStreamingDoc}`}
          style={{
            color: '#1e3a8a',
            fontSize: '0.9375rem',
            lineHeight: '1.8',
            whiteSpace: 'pre-wrap',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
            minHeight: '50px',
            paddingBottom: '10px' // Add padding at bottom
          }}
        >
          {streamingSummaries[activeStreamingDoc]}
          {streamingDocuments[activeStreamingDoc].status !== 'complete' && (
            <span 
              className="streaming-text" 
              style={{ 
                display: 'inline-block', 
                width: '8px', 
                height: '16px', 
                background: '#0f62fe', 
                marginLeft: '2px', 
                verticalAlign: 'middle',
                animation: 'pulse 1.5s ease-in-out infinite'
              }} 
            />
          )}
        </div>
      </div>
      
      <div style={{ 
        marginTop: '1rem', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '0.5rem', 
        color: '#6b7280', 
        fontSize: '0.75rem',
        paddingTop: '0.5rem',
        borderTop: '1px solid rgba(191, 219, 254, 0.5)'
      }}>
        <span style={{ width: '12px', height: '12px' }}><Icons.FileText /></span>
        <span>{streamingSummaries[activeStreamingDoc].length} characters generated</span>
        <span style={{ marginLeft: 'auto', color: '#0f62fe', fontWeight: '600' }}>
          {streamingDocuments[activeStreamingDoc].status === 'complete' ? '✓ Complete' : '⌛ Streaming...'}
        </span>
      </div>
    </div>
  </div>
)}

              {/* Extracted Content - Now shows actual document content */}
              {documentContent[activeStreamingDoc] && streamingDocuments[activeStreamingDoc].status !== 'error' && (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                    <DataBase size={18} style={{ color: '#0f62fe' }} />
                    <h3 style={{ color: '#111827', fontSize: '1.125rem', fontWeight: 600, margin: 0 }}>
                      Extracted Document Content
                      {streamingDocuments[activeStreamingDoc].status === 'complete' && ' ✓'}
                    </h3>
                  </div>

                  <div style={{
                    padding: '1.5rem', background: 'white', border: '2px solid #e5e7eb',
                    borderRadius: '12px', maxHeight: '300px', overflowY: 'auto',
                    boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.05)'
                  }}>
                    <div style={{
                      color: '#1f2937', fontSize: '0.875rem', lineHeight: '1.6',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                      whiteSpace: 'pre-wrap', wordWrap: 'break-word'
                    }}>
                      {documentContent[activeStreamingDoc].substring(0, 2000)}
                      {documentContent[activeStreamingDoc].length > 2000 && '...'}
                    </div>
                  </div>

                  <p style={{ marginTop: '0.75rem', color: '#6b7280', fontSize: '0.75rem', textAlign: 'center' }}>
                    Extracted {documentContent[activeStreamingDoc].length.toLocaleString()} characters • 
                    Processing time: {streamingDocuments[activeStreamingDoc].processingTime || 'Calculating...'}
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{
              padding: '1.5rem 2rem', borderTop: '1px solid #e5e7eb',
              display: 'flex', justifyContent: streamingDocuments[activeStreamingDoc]?.status === 'complete' ? 'space-between' : 'flex-end',
              background: 'linear-gradient(to top, #ffffff, #f9fafb)',
              borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px'
            }}>
              {streamingDocuments[activeStreamingDoc]?.status === 'complete' ? (
                <>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button onClick={viewStreamingSummary} style={{
                      background: '#0f62fe', color: 'white', border: 'none', padding: '0.75rem 1.5rem',
                      borderRadius: '8px', cursor: 'pointer', fontSize: '0.9375rem', fontWeight: 600,
                      display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'all 0.2s',
                      boxShadow: '0 4px 4px rgba(15, 98, 254, 0.3)'
                    }}>
                      View Full Details
                    </button>
                    
                    <button onClick={() => {
                      const doc = streamingDocuments[activeStreamingDoc];
                      const summary = streamingSummaries[activeStreamingDoc] || '';
                      const content = documentContent[activeStreamingDoc] || '';
                      
                      const downloadContent = `Document: ${doc.name}\n\nSummary:\n${summary}\n\nExtracted Content:\n${content}`;
                      const blob = new Blob([downloadContent], { type: 'text/plain' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `${doc.name.replace(/\.[^/.]+$/, '')}_summary.txt`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                    }} style={{
                      background: 'white', border: '2px solid #e5e7eb', padding: '0.625rem 1.25rem',
                      borderRadius: '8px', cursor: 'pointer', fontSize: '0.875rem', color: '#374151',
                      fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem'
                    }}>
                      <Download size={16} />
                      Download Summary
                    </button>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                    <span style={{ color: '#10b981', fontSize: '0.875rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Checkmark size={16} />
                      Added to Recent Documents
                    </span>
                    <button onClick={closeStreamingModal} style={{
                      background: 'transparent', border: '2px solid #e5e7eb', color: '#374151',
                      padding: '0.75rem 2rem', borderRadius: '8px', cursor: 'pointer',
                      fontSize: '0.9375rem', fontWeight: 600
                    }}>
                      Close
                    </button>
                  </div>
                </>
              ) : streamingDocuments[activeStreamingDoc]?.status === 'error' ? (
                <button onClick={closeStreamingModal} style={{
                  background: '#ef4444', color: 'white', border: 'none',
                  padding: '0.75rem 2rem', borderRadius: '8px', cursor: 'pointer',
                  fontSize: '0.9375rem', fontWeight: 600, display: 'flex',
                  alignItems: 'center', gap: '0.5rem'
                }}>
                  <Close size={16} />
                  Close
                </button>
              ) : (
                <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: 0, fontStyle: 'italic' }}>
                  {streamingStatus[activeStreamingDoc] || 'Processing in progress... Please wait'}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Rest of the component remains the same */}
      <div style={{ display: 'flex', gap: '1.5rem', padding: '2rem', margin: '0 auto' }}>
        {/* Left Column - Upload and Documents */}
        <div style={{ flex: 1 }}>
          {/* Upload Area */}
          <div style={{
            background: 'white',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            padding: '1.5rem',
            marginBottom: '1.5rem',
            position: 'relative'
          }}>
            {uploadingFiles.size > 0 && (
              <div className="processing-overlay">
                <div style={{ textAlign: 'center' }}>
                  <InlineLoading
                    description={`Processing ${uploadingFiles.size} file(s)...`}
                    status="active"
                  />
                  <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#525252' }}>
                    Document uploaded, summarizing the document......
                  </p>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div style={{
                width: '40px',
                height: '40px',
                background: '#0f62fe',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <span style={{ width: '20px', height: '20px', color: 'white' }}><Icons.Upload /></span>
              </div>
              <div>
                <p style={{ color: '#161616', fontWeight: 500, fontSize: '1rem', margin: 0 }}>Upload Documents</p>
                <p style={{ color: '#525252', fontSize: '0.875rem', margin: 0 }}>Start by uploading your files for AI analysis</p>
              </div>
            </div>

            <div
              style={{
                position: 'relative',
                border: `2px dashed ${isDragging ? '#0f62fe' : '#c6c6c6'}`,
                borderRadius: '8px',
                padding: '2.5rem',
                textAlign: 'center',
                background: isDragging ? '#edf5ff' : '#fafafa',
                cursor: uploadingFiles.size === 0 ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s',
                transform: isDragging ? 'scale(1.01)' : 'scale(1)',
                opacity: uploadingFiles.size > 0 ? 0.6 : 1
              }}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={() => setIsDragging(false)}
              onClick={() => uploadingFiles.size === 0 && fileInputRef.current?.click()}
            >
              <div style={{
                width: '48px',
                height: '48px',
                margin: '0 auto 1rem',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: isDragging ? '#0f62fe' : '#e0e7ff',
                transition: 'all 0.2s'
              }}>
                <span style={{ width: '24px', height: '24px', color: isDragging ? 'white' : '#0f62fe' }}><Icons.Upload /></span>
              </div>

              <p style={{ color: '#161616', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                {isDragging ? 'Drop files here' : 'Drag and drop files here'}
              </p>
              <p style={{ color: '#525252', fontSize: '0.875rem', marginBottom: '1.5rem' }}>or</p>

              <button
                style={{
                  background: uploadingFiles.size > 0 ? '#c6c6c6' : '#0f62fe',
                  color: 'white',
                  border: 'none',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '6px',
                  cursor: uploadingFiles.size > 0 ? 'not-allowed' : 'pointer',
                  fontWeight: 500,
                  fontSize: '0.875rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  uploadingFiles.size === 0 && fileInputRef.current?.click();
                }}
                disabled={uploadingFiles.size > 0}
              >
                <span style={{ width: '16px', height: '16px' }}><Icons.Plus /></span>
                {uploadingFiles.size > 0 ? 'Processing...' : 'Browse Files'}
              </button>
            </div>
            
            <div style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ color: '#525252', fontSize: '0.875rem' }}>Supported file types:</span>
              <Tag type="gray" size="sm">PDF</Tag>
              <Tag type="gray" size="sm">DOCX</Tag>
              <Tag type="gray" size="sm">TXT</Tag>
              <Tag type="gray" size="sm">PNG, JPG</Tag>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: '0.5rem' }}>
                <Warning size={16} style={{ color: "red" }} />
                <span style={{ color: "red", fontSize: '0.875rem' }}>Maximum file size: 10MB per file</span>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
              disabled={uploadingFiles.size > 0}
            />
          </div>

          {/* Recent Documents */}
           <Tile style={{
        background: 'white',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        padding: '1rem',
        margin: 0,
        flex: 1,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{
            width: '40px',
            height: '40px',
            background: '#0f62fe',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <span style={{ width: '20px', height: '20px', color: 'white' }}><Icons.Clock /></span>
          </div>
          <div>
            <p style={{ color: '#161616', fontWeight: 500, fontSize: '1rem', margin: 0 }}>Recent Documents</p>
            <p style={{ color: '#525252', fontSize: '0.875rem', margin: 0 }}>
              {loadingUserDocuments ? 'Loading...' : `${documents.length} document${documents.length !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>

        {loadingUserDocuments ? (
          <div style={{
            textAlign: 'center',
            padding: '3rem',
            background: '#fafafa',
            borderRadius: '8px',
            border: '2px dashed #e0e0e0',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              border: '3px solid #0f62fe',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              marginBottom: '1rem'
            }} />
            <p style={{ color: '#161616', marginBottom: '0.5rem', fontWeight: 500 }}>
              Loading your documents...
            </p>
            <p style={{ color: '#525252', fontSize: '0.875rem' }}>
              Fetching documents from server storage
            </p>
          </div>
        ) : documents.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '2rem',
            background: '#fafafa',
            borderRadius: '8px',
            border: '2px dashed #e0e0e0',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            <div style={{ width: '48px', height: '48px', color: '#c6c6c6', margin: '0 auto 1rem' }}><Icons.FileText /></div>
            <p style={{ color: '#161616', marginBottom: '0.5rem', fontWeight: 500 }}>No documents yet</p>
            <p style={{ color: '#525252', fontSize: '0.875rem' }}>Upload your first document to get started</p>
          </div>
        ) : (

              <div style={{
                flex: 1,
                overflow: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem'
              }}>
                <Stack gap={5}>
                    {documents.map((doc) => {
    const processingTime = getDocumentProcessingTime(doc);
    const isServerDocument = doc.fromServer;
    
    return (
      <Tile key={doc.id} style={{
        background: 'white',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        padding: '1rem',
        margin: 0,
        position: 'relative'
      }}>
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
          <div style={{
            width: '48px',
            height: '48px',
            background: isServerDocument ? '#e0e7ff' : '#f4f4f4',
            border: isServerDocument ? '2px solid #0f62fe' : '1px solid #e0e0e0',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            position: 'relative'
          }}>
            <Document size={20} style={{ 
              color: doc.status === 'error' ? '#ef4444' : 
                     isServerDocument ? '#0f62fe' : '#da1e28' 
            }} />
            {isServerDocument && (
              <div style={{
                position: 'absolute',
                top: -5,
                right: -5,
                background: '#0f62fe',
                color: 'white',
                borderRadius: '50%',
                width: '16px',
                height: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                fontWeight: 'bold'
              }}>
                <span style={{ width: '10px', height: '10px' }}><Icons.Cloud /></span>
              </div>
            )}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
              <div>
                <h3 style={{
                  color: '#161616',
                  margin: 0,
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  wordBreak: 'break-word'
                }}>
                  {doc.name}
                </h3>
                {isServerDocument && (
                  <span style={{
                    fontSize: '0.7rem',
                    color: '#0f62fe',
                    background: '#e0e7ff',
                    padding: '2px 6px',
                    borderRadius: '10px',
                    marginTop: '4px',
                    display: 'inline-block'
                  }}>
                    Server Document
                  </span>
                )}
              </div>
              {doc.status === 'ready' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {processingTime && (
                    <Tag style={{
                      background: '#e0e7ff',
                      color: '#3730a3',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      fontWeight: 600
                    }} size="sm">
                      {processingTime}
                    </Tag>
                  )}
                  <Tag style={{
                    background: '#d1f0d4',
                    color: '#24a148',
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    fontWeight: 600
                  }} size="sm">
                    Ready
                  </Tag>
                </div>
              )}
                              {doc.status === 'processing' && (
                                <Tag style={{
                                  color: '#0f62fe',
                                  padding: '0.25rem 0.75rem',
                                  borderRadius: '12px',
                                  fontSize: '0.75rem',
                                  fontWeight: 600
                                }}>
                                  <InlineLoading size="sm" description="Processing" />
                                </Tag>
                              )}
                              {doc.status === 'error' && (
                                <Tag style={{
                                  background: '#ffd7d9',
                                  color: '#da1e28',
                                  borderRadius: '12px',
                                  fontSize: '0.75rem',
                                  fontWeight: 600
                                }} size="sm">
                                  Error
                                </Tag>
                              )}
                            </div>

                     <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              fontSize: '0.75rem',
              color: '#525252'
            }}>
              <span>{doc.size > 0 ? formatFileSize(doc.size) : 'Size unknown'}</span>
              <span>•</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Time size={12} />
                <span>{formatDate(doc.uploadedAt)}</span>
              </div>
              {currentUser && (
                <>
                  <span>•</span>
                  <span>Uploaded by: {doc.uploadedBy || currentUser.username}</span>
                </>
              )}
            </div>
          </div>
                        </div>

                        {doc.status === 'ready' && doc.summary && (
                          <div style={{
                            padding: '1rem',
                            background: '#edf5ff',
                            border: '1px solid #d0e2ff',
                            borderRadius: '6px',
                            marginBottom: '1rem'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'start', gap: '0.5rem', marginBottom: '0.5rem' }}>
                              <span style={{ width: '18px', height: '18px', color: '#0f62fe' }}><Icons.Sparkles /></span>
                              <div style={{ flex: 1 }}>
                                <p style={{
                                  color: '#525252',
                                  fontSize: '0.75rem',
                                  margin: '0 0 0.25rem 0',
                                  fontWeight: 500
                                }}>
                                  AI Summary
                                </p>
                                <p style={{
                                  color: '#161616',
                                  fontSize: '0.875rem',
                                  lineHeight: '1.5',
                                  margin: 0
                                }}>
                                  {`Document ${doc.name} has been successfully processed and analyzed.`}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Show error message if document failed */}
                        {doc.status === 'error' && (
                          <div style={{
                            padding: '1rem',
                            background: '#fef2f2',
                            border: '1px solid #fecaca',
                            borderRadius: '6px',
                            marginBottom: '1rem'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'start', gap: '0.5rem', marginBottom: '0.5rem' }}>
                              <Error size={18} style={{ color: '#ef4444' }} />
                              <div style={{ flex: 1 }}>
                                <p style={{
                                  color: '#7f1d1d',
                                  fontSize: '0.75rem',
                                  margin: '0 0 0.25rem 0',
                                  fontWeight: 500
                                }}>
                                  Processing Error
                                </p>
                                <p style={{
                                  color: '#b91c1c',
                                  fontSize: '0.875rem',
                                  lineHeight: '1.5',
                                  margin: 0
                                }}>
                                  {doc.error || 'Failed to process document. Please try again.'}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          {doc.status === 'ready' && (
                            <Button
                              kind="primary"
                              size="sm"
                              onClick={() => setSelectedDocForDetails(doc)}
                              renderIcon={Icons.FileText}
                              style={{
                                background: '#0f62fe',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '0.875rem',
                                fontWeight: 500,
                                display: 'flex'
                              }}
                            >
                              View Details
                            </Button>
                          )}
                          {doc.status === 'error' && (
                            <Button
                              kind="danger"
                              size="sm"
                              onClick={() => {
                                if (window.confirm(`Are you sure you want to delete this failed document "${doc.name}"?`)) {
                                  onDelete(doc.id);
                                }
                              }}
                              renderIcon={TrashCan}
                              style={{
                                background: '#ef4444',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '0.875rem',
                                fontWeight: 500,
                                display: 'flex'
                              }}
                            >
                              Delete Failed
                            </Button>
                          )}
                          <Button
                            kind="secondary"
                            size="sm"
                            onClick={() => openPreviewPopup(doc)}
                            renderIcon={Icons.FileText}
                            style={{
                              background: 'transparent',
                              color: '#161616',
                              border: '1px solid #e0e0e0',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '0.875rem',
                              fontWeight: 500,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem'
                            }}
                          >
                            Preview
                          </Button>
                          <Button
                            kind="danger--tertiary"
                            size="sm"
                            onClick={() => {
                              if (window.confirm(`Are you sure you want to delete "${doc.name}"?`)) {
                                onDelete(doc.id);
                              }
                            }}
                            renderIcon={TrashCan}
                            style={{
                              background: 'transparent',
                              color: '#da1e28',
                              border: '1px solid #e0e0e0',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '0.875rem',
                              fontWeight: 500,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem'
                            }}
                          >
                            Delete
                          </Button>
                        </div>
                      </Tile>
                    );
                  })}
                </Stack>
              </div>
            )}
          </Tile>
        </div>

        {/* Right Column - Quick Stats */}
        <div style={{
          width: '400px',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          {/* Quick Stats Tile */}
          <Tile style={{
            background: 'white',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            padding: '1rem'
          }}>
            <h3 style={{
              color: '#161616',
              fontSize: '1rem',
              fontWeight: 500,
              margin: '0 0 1rem 0'
            }}>
              Quick Stats
            </h3>

            <Stack gap={4}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.75rem',
                background: '#fafafa',
                borderRadius: '6px'
              }}>
                <span style={{ color: '#525252', fontSize: '0.875rem' }}>Total Documents</span>
                <Tag type="gray">
                  {documents.length}
                </Tag>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.75rem',
                background: '#fafafa',
                borderRadius: '6px'
              }}>
                <span style={{ color: '#525252', fontSize: '0.875rem' }}>Processed</span>
                <Tag type="green">
                  {documents.filter(d => d.status === 'ready').length}
                </Tag>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.75rem',
                background: '#fafafa',
                borderRadius: '6px'
              }}>
                <span style={{ color: '#525252', fontSize: '0.875rem' }}>Processing</span>
                <Tag type="blue">
                  {documents.filter(d => d.status === 'processing').length}
                </Tag>
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.75rem',
                background: '#fafafa',
                borderRadius: '6px'
              }}>
                <span style={{ color: '#525252', fontSize: '0.875rem' }}>Errors</span>
                <Tag type="red">
                  {documents.filter(d => d.status === 'error').length}
                </Tag>
              </div>
            </Stack>
          </Tile>

          <Tile style={{
            background: '#edf5ff',
            border: '1px solid #d0e2ff',
            borderRadius: '8px',
            padding: '1rem',
            margin: 0,
            textAlign: 'center'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: '0.75rem'
            }}>
              <span style={{ width: '40px', height: '40px', color: '#0f62fe' }}>
                <Icons.Sparkles />
              </span>
            </div>

            <h3 style={{
              color: '#161616',
              fontSize: '0.875rem',
              fontWeight: 500,
              margin: '0 0 0.5rem 0'
            }}>
              AI-Powered Analysis
            </h3>

            <p style={{
              color: '#525252',
              fontSize: '0.75rem',
              lineHeight: '1.4',
              margin: 0
            }}>
              Click "View Details" on any processed document to see complete AI analysis with document preview
            </p>
          </Tile>
        </div>
      </div>

      {/* Preview Modal */}
      {selectedDocForPreview && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '2rem'
        }} onClick={closePreview}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '90vw',
            height: '90vh',
            overflow: 'hidden',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
            display: 'flex',
            flexDirection: 'column'
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{
              padding: '1.5rem',
              borderBottom: '1px solid #e0e0e0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'white',
              flexShrink: 0
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  background: '#edf5ff',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Document size={20} style={{ color: '#0f62fe' }} />
                </div>
                <div>
                  <h2 style={{
                    color: '#161616',
                    fontSize: '1.125rem',
                    fontWeight: 500,
                    margin: 0
                  }}>
                    {selectedDocForPreview.name}
                  </h2>
                  <p style={{
                    color: '#525252',
                    fontSize: '0.875rem',
                    margin: 0
                  }}>
                    {formatFileSize(selectedDocForPreview.size)} • {selectedDocForPreview.file?.type || 'Unknown type'}
                  </p>
                </div>
              </div>
              <button
                onClick={closePreview}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  borderRadius: '6px',
                  color: '#525252',
                  fontSize: '1.5rem',
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ✕
              </button>
            </div>

            <div style={{
              flex: 1,
              overflow: 'auto',
              background: '#f4f4f4'
            }}>
              {previewUrl && getPreviewContent(selectedDocForPreview, previewUrl)}
            </div>

            <div style={{
              padding: '1rem 1.5rem',
              borderTop: '1px solid #e0e0e0',
              display: 'flex',
              justifyContent: 'flex-end',
              background: 'white',
              flexShrink: 0
            }}>
              <button
                onClick={closePreview}
                style={{
                  background: '#0f62fe',
                  color: 'white',
                  border: 'none',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: 500
                }}
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Details Modal - Enhanced with Accuracy Assessment */}
      {selectedDocForDetails && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '2rem',
          animation: 'fadeIn 0.2s ease-in-out'
        }} onClick={() => setSelectedDocForDetails(null)}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '900px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
            animation: 'slideUp 0.3s ease-out'
          }} onClick={(e) => e.stopPropagation()}>

            {/* Modal Header */}
            <div style={{
              padding: '2rem',
              borderBottom: '1px solid #e5e7eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'linear-gradient(to bottom, #ffffff, #f9fafb)',
              borderTopLeftRadius: '16px',
              borderTopRightRadius: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  background: 'linear-gradient(135deg, #0f62fe 0%, #0353e9 100%)',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 6px rgba(15, 98, 254, 0.2)'
                }}>
                  <Document size={24} style={{ color: 'white' }} />
                </div>
                <div>
                  <h2 style={{
                    color: '#111827',
                    fontSize: '1.25rem',
                    fontWeight: 600,
                    margin: 0,
                    lineHeight: 1.3
                  }}>
                    {selectedDocForDetails.name}
                  </h2>
                  <p style={{
                    color: '#6b7280',
                    fontSize: '0.875rem',
                    margin: '0.25rem 0 0 0'
                  }}>
                    Document Analysis & Summary
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Content */}
            <div style={{
              padding: '2rem',
              overflowY: 'auto',
              flex: 1
            }}>

              {/* Metadata Section */}
              <div style={{ marginBottom: '2rem' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '1rem'
                }}>
                  <Calendar size={18} style={{ color: '#0f62fe' }} />
                  <h3 style={{
                    color: '#111827',
                    fontSize: '1.125rem',
                    fontWeight: 600,
                    margin: 0
                  }}>
                    Metadata
                  </h3>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '1.25rem',
                  padding: '1.5rem',
                  background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)',
                  borderRadius: '12px',
                  border: '1px solid #e5e7eb'
                }}>
                  <div>
                    <p style={{
                      color: '#6b7280',
                      fontSize: '0.8125rem',
                      margin: '0 0 0.5rem 0',
                      fontWeight: 500,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      Status
                    </p>
                    <span style={{
                      background: '#10b981',
                      color: 'white',
                      padding: '0.375rem 0.875rem',
                      borderRadius: '20px',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      display: 'inline-block',
                      boxShadow: '0 2px 4px rgba(16, 185, 129, 0.3)'
                    }}>
                      Processed
                    </span>
                  </div>

                  <div>
                    <p style={{
                      color: '#6b7280',
                      fontSize: '0.8125rem',
                      margin: '0 0 0.5rem 0',
                      fontWeight: 500,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      Uploaded
                    </p>
                    <p style={{
                      color: '#111827',
                      fontSize: '0.9375rem',
                      margin: 0,
                      fontWeight: 500
                    }}>
                      {formatDateTime(selectedDocForDetails.uploadedAt)}
                    </p>
                  </div>

                  <div>
                    <p style={{
                      color: '#6b7280',
                      fontSize: '0.8125rem',
                      margin: '0 0 0.5rem 0',
                      fontWeight: 500,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      Processing Time
                    </p>
                    <p style={{
                      color: '#111827',
                      fontSize: '0.9375rem',
                      margin: 0,
                      fontWeight: 500
                    }}>
                      {selectedDocForDetails.processingTime || getDocumentProcessingTime(selectedDocForDetails) || 'Calculating...'}
                    </p>
                  </div>

                  <div>
                    <p style={{
                      color: '#6b7280',
                      fontSize: '0.8125rem',
                      margin: '0 0 0.5rem 0',
                      fontWeight: 500,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      File Size
                    </p>
                    <p style={{
                      color: '#111827',
                      fontSize: '0.9375rem',
                      margin: 0,
                      fontWeight: 500
                    }}>
                      {formatFileSize(selectedDocForDetails.size)}
                    </p>
                  </div>
                </div>
              </div>

         {/* AI Summary Section */}
<div style={{ marginBottom: '2rem' }}>
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '1rem'
  }}>
    <span style={{ width: '20px', height: '20px', color: '#0f62fe' }}>
      <Icons.Sparkles />
    </span>
    <h3 style={{
      color: '#111827',
      fontSize: '1.125rem',
      fontWeight: 600,
      margin: 0
    }}>
      AI-Generated Summary
    </h3>
  </div>

  <div style={{
    padding: '1.5rem',
    background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
    border: '2px solid #bfdbfe',
    borderRadius: '12px',
    position: 'relative',
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(15, 98, 254, 0.1)',
    maxHeight: '400px',
    overflowY: 'auto'
  }}>
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '4px',
      height: '100%',
      background: 'linear-gradient(to bottom, #0f62fe, #0353e9)'
    }} />
    <div style={{
      color: '#1e3a8a',
      fontSize: '0.9375rem',
      lineHeight: '1.8',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      whiteSpace: 'pre-wrap'
    }}>
      {(() => {
        let summaryText = '';
        
        // First try to get from apiResponse
        if (selectedDocForDetails.apiResponse && selectedDocForDetails.apiResponse.length > 0) {
          const response = selectedDocForDetails.apiResponse[0];
          
          // Try to get from original_summary first
          if (response.original_summary) {
            summaryText = response.original_summary;
          } 
          // Then try from doc_summary.choices
          else if (response.doc_summary && response.doc_summary.choices && response.doc_summary.choices.length > 0) {
            summaryText = response.doc_summary.choices[0].text || '';
            summaryText = summaryText.replace(/^Summarize the following document:\s*/i, '');
          } 
          // Then try direct doc_summary string
          else if (typeof response.doc_summary === 'string') {
            summaryText = response.doc_summary;
          }
        }
        
        // Fallback to document summary field
        if (!summaryText) {
          summaryText = selectedDocForDetails.summary || 'No summary available';
        }

        return summaryText.split('\n').map((paragraph, index) => {
          if (paragraph.trim() === '') {
            return <div key={index} style={{ height: '0.75rem' }} />;
          }

          if (paragraph.match(/^\d+\.\s+[A-Z]/) || paragraph.match(/^•\s+/)) {
            return (
              <div key={index} style={{
                fontWeight: 600,
                fontSize: '1rem',
                color: '#0f62fe',
                marginTop: index > 0 ? '1.25rem' : '0',
                marginBottom: '0.5rem'
              }}>
                {paragraph}
              </div>
            );
          }

          if (paragraph.trim().startsWith('•') || paragraph.trim().startsWith('-') || paragraph.trim().startsWith('–')) {
            return (
              <div key={index} style={{
                marginLeft: '1.5rem',
                marginBottom: '0.5rem',
                paddingLeft: '0.75rem',
                borderLeft: '3px solid rgba(15, 98, 254, 0.3)',
                textAlign: 'justify'
              }}>
                {paragraph}
              </div>
            );
          }

          return (
            <div key={index} style={{
              marginBottom: '1rem',
              textAlign: 'justify'
            }}>
              {paragraph}
            </div>
          );
        });
      })()}
    </div>
  </div>
</div>

 {/* Extracted Information */}
<div>
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '1rem'
  }}>
    <DataBase size={18} style={{ color: '#0f62fe' }} />
    <h3 style={{
      color: '#111827',
      fontSize: '1.125rem',
      fontWeight: 600,
      margin: 0
    }}>
      Extracted Document Content
    </h3>
  </div>

  <div style={{
    display: 'flex',
    gap: '0.625rem',
    marginBottom: '1rem',
    flexWrap: 'wrap'
  }}>
    {selectedDocForDetails.apiResponse && selectedDocForDetails.apiResponse.length > 0 && (
      <>
        <span style={{
          background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
          color: '#1e40af',
          padding: '0.5rem 1rem',
          borderRadius: '8px',
          fontSize: '0.8125rem',
          fontWeight: 600,
          border: '1px solid #bfdbfe',
          display: 'flex',
          alignItems: 'center',
          gap: '0.375rem'
        }}>
          <Document size={14} />
          {selectedDocForDetails.apiResponse[0].filename}
        </span>
        <span style={{
          background: '#f3f4f6',
          color: '#6b7280',
          padding: '0.5rem 1rem',
          borderRadius: '8px',
          fontSize: '0.8125rem',
          fontWeight: 500
        }}>
          {(selectedDocForDetails.extractedInfo?.length || selectedDocForDetails.apiResponse[0].doc_content?.length || 0).toLocaleString()} characters
        </span>
      </>
    )}
  </div>

  <div style={{
    padding: '1.5rem',
    background: 'white',
    border: '2px solid #e5e7eb',
    borderRadius: '12px',
    maxHeight: '500px',
    overflowY: 'auto',
    boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.05)'
  }}>
    <div style={{
      color: '#1f2937',
      fontSize: '0.9375rem',
      lineHeight: '1.8',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      whiteSpace: 'pre-wrap',
      wordWrap: 'break-word'
    }}>
      {(() => {
        // First try to get from extractedInfo (which should contain doc_content)
        let content = selectedDocForDetails.extractedInfo;
        
        // If not there, try from apiResponse
        if (!content && selectedDocForDetails.apiResponse && selectedDocForDetails.apiResponse.length > 0) {
          content = selectedDocForDetails.apiResponse[0].doc_content;
        }
        
        // Final fallback
        if (!content) {
          content = 'No extracted information available for this document.';
        }

        const contentString = String(content || '');

        if (!contentString.trim()) {
          return (
            <div style={{
              color: '#6b7280',
              fontStyle: 'italic',
              textAlign: 'center',
              padding: '2rem'
            }}>
              No content available for this document.
            </div>
          );
        }

        return contentString.split('\n').map((line, index) => {
          if (line.match(/^(Chapter \d+|Introduction|Table \d+|Component|Figure \d+)/i)) {
            return (
              <div key={index} style={{
                fontWeight: 600,
                fontSize: '1.0625rem',
                color: '#0f62fe',
                marginTop: index > 0 ? '1.5rem' : '0',
                marginBottom: '0.75rem'
              }}>
                {line}
              </div>
            );
          }

          if (line.trim().startsWith('•') || line.trim().startsWith('-')) {
            return (
              <div key={index} style={{
                marginLeft: '1.5rem',
                marginBottom: '0.5rem',
                paddingLeft: '0.5rem',
                borderLeft: '2px solid #e5e7eb'
              }}>
                {line}
              </div>
            );
          }

          if (line.trim() === '') {
            return <div key={index} style={{ height: '0.75rem' }} />;
          }

          return (
            <div key={index} style={{
              marginBottom: '0.5rem',
              textAlign: 'justify'
            }}>
              {line}
            </div>
          );
        });
      })()}
    </div>
  </div>
</div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '1.5rem 2rem',
              borderTop: '1px solid #e5e7eb',
              display: 'flex',
              justifyContent: 'flex-end',
              background: 'linear-gradient(to top, #ffffff, #f9fafb)',
              borderBottomLeftRadius: '16px',
              borderBottomRightRadius: '16px'
            }}>
              <button
                onClick={() => setSelectedDocForDetails(null)}
                style={{
                  background: 'linear-gradient(135deg, #0f62fe 0%, #0353e9 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '0.75rem 2rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.9375rem',
                  fontWeight: 600,
                  transition: 'all 0.2s',
                  boxShadow: '0 4px 6px rgba(15, 98, 254, 0.3)'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 12px rgba(15, 98, 254, 0.4)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 6px rgba(15, 98, 254, 0.3)';
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DocumentsTab;