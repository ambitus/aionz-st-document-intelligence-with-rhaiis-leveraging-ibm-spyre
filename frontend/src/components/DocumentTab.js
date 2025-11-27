import React, { useState, useRef } from 'react';
import {
  Calendar,
  DataBase,
  Document,
  Time,
  TrashCan,
  Download,
  Close,
} from '@carbon/icons-react';
import {
  Button,
  Tag,
  InlineLoading,
  Tile,
  Stack,
} from '@carbon/react';
import Icons from './Icons'

// DocumentsTab Component
const DocumentsTab = ({ documents, onUpload, onDelete, currentUser }) => {
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedDocForDetails, setSelectedDocForDetails] = useState(null);
  const [selectedDocForPreview, setSelectedDocForPreview] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploadingFiles, setUploadingFiles] = useState(new Set());

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  const handleFileUpload = async (files) => {
    const filesArray = Array.from(files);
    
    // Add files to uploading set
    const newUploadingFiles = new Set(uploadingFiles);
    filesArray.forEach(file => newUploadingFiles.add(file.name));
    setUploadingFiles(newUploadingFiles);

    try {
      await onUpload(filesArray);
    } finally {
      // Remove files from uploading set
      const updatedUploadingFiles = new Set(uploadingFiles);
      filesArray.forEach(file => updatedUploadingFiles.delete(file.name));
      setUploadingFiles(updatedUploadingFiles);
    }
  };

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
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%',
          padding: '2rem'
        }}>
          <img
            src={url}
            alt="Preview"
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
            }}
          />
        </div>
      );
    } else if (doc.file.type === 'application/pdf') {
      return (
        <iframe
          src={url}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            borderRadius: '8px'
          }}
          title="PDF Preview"
        />
      );
    } else if (doc.file.type === 'text/plain' || doc.name.endsWith('.txt')) {
      return <TextFilePreview url={url} />;
    } else if (doc.file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      doc.name.endsWith('.docx') ||
      doc.name.endsWith('.doc')) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          padding: '3rem',
          textAlign: 'center'
        }}>
          <Document size={64} style={{ color: '#0f62fe', marginBottom: '1rem' }} />
          <h3 style={{
            color: '#161616',
            fontSize: '1.25rem',
            fontWeight: 500,
            margin: '0 0 0.5rem 0'
          }}>
            Word Document
          </h3>
          <p style={{
            color: '#525252',
            fontSize: '0.875rem',
            margin: '0 0 1rem 0'
          }}>
            {doc.name}
          </p>
          <p style={{
            color: '#525252',
            fontSize: '0.875rem',
            margin: '0 0 1.5rem 0'
          }}>
            Word documents (.docx, .doc) cannot be previewed directly in the browser.
          </p>
          <a
            href={url}
            download={doc.name}
            style={{
              background: '#0f62fe',
              color: 'white',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 500,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <Icons.Download />
            Download to View
          </a>
        </div>
      );
    } else {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          padding: '3rem',
          textAlign: 'center'
        }}>
          <Document size={64} style={{ color: '#c6c6c6', marginBottom: '1rem' }} />
          <h3 style={{
            color: '#161616',
            fontSize: '1.25rem',
            fontWeight: 500,
            margin: '0 0 0.5rem 0'
          }}>
            Preview Not Available
          </h3>
          <p style={{
            color: '#525252',
            fontSize: '0.875rem',
            margin: '0 0 1rem 0'
          }}>
            This file type ({doc.file.type || 'unknown'}) cannot be previewed in the browser.
          </p>
          <a
            href={url}
            download={doc.name}
            style={{
              background: '#0f62fe',
              color: 'white',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: 500,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            Download File
          </a>
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
        .then(text => {
          setContent(text);
        })
        .catch(err => {
          setError('Error loading file content: ' + err.message);
        });
    }, [url]);

    return (
      <div style={{
        padding: '2rem',
        height: '100%',
        overflow: 'auto',
        background: 'white'
      }}>
        <pre style={{
          whiteSpace: 'pre-wrap',
          wordWrap: 'break-word',
          fontFamily: "'Courier New', monospace",
          fontSize: '0.875rem',
          lineHeight: '1.6',
          color: '#161616',
          margin: 0
        }}>
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
      e.target.value = '';
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

  // Handle the API response structure
  if (doc.apiResponse && doc.apiResponse.length > 0) {
    const response = doc.apiResponse[0];
    const docSummary = response.doc_summary;
    
    // Extract summary text from the complex object
    if (docSummary && docSummary.choices && docSummary.choices.length > 0) {
      const summaryText = docSummary.choices[0].text || '';
      // Clean up the text - remove the "Summarize the following document:" prefix
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
    // Fallback to old structure
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
          body {
            font-family: Arial, sans-serif;
            margin: 40px;
            line-height: 1.6;
            color: #333;
          }
          h1 {
            color: #0f62fe;
            border-bottom: 3px solid #0f62fe;
            padding-bottom: 10px;
            margin-bottom: 20px;
          }
          h2 {
            color: #161616;
            margin-top: 30px;
            margin-bottom: 15px;
          }
          .metadata {
            background: #f4f4f4;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
          }
          .metadata-item {
            margin: 10px 0;
          }
          .metadata-label {
            font-weight: bold;
            color: #525252;
          }
          .summary-box {
            background: #edf5ff;
            border-left: 4px solid #0f62fe;
            padding: 20px;
            margin: 20px 0;
            white-space: pre-line;
            line-height: 1.6;
          }
          .extracted-info {
            background: #fafafa;
            border: 1px solid #e0e0e0;
            padding: 20px;
            border-radius: 8px;
            white-space: pre-line;
            line-height: 1.6;
          }
          @media print {
            body { margin: 20px; }
          }
        </style>
      </head>
      <body>
        <h1>${doc.name}</h1>
        
        <div class="metadata">
          <h2>Document Metadata</h2>
          <div class="metadata-item">
            <span class="metadata-label">Status:</span> Processed
          </div>
          <div class="metadata-item">
            <span class="metadata-label">Uploaded:</span> ${formatDateTime(doc.uploadedAt)}
          </div>
          <div class="metadata-item">
            <span class="metadata-label">File Size:</span> ${formatFileSize(doc.size)}
          </div>
        </div>

        <h2>AI-Generated Summary</h2>
        <div class="summary-box">
          ${summaryContent}
        </div>

        <h2>Extracted Information</h2>
        <div class="extracted-info">
          ${extractedContent}
        </div>
      </body>
      </html>
    `;
    
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    setTimeout(() => {
      printWindow.print();
    }, 250);
  }
};

  return (
    <>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .processing-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(255, 255, 255, 0.9);
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          z-index: 10;
        }
      `}</style>
      
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
                    Uploading to API endpoint...
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
                <p style={{ color: '#525252', fontSize: '0.875rem', margin: 0 }}>{documents.length} document{documents.length !== 1 ? 's' : ''}</p>
              </div>
            </div>

            {documents.length === 0 ? (
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
                  {documents.map((doc) => (
                    <Tile key={doc.id} style={{
                      background: 'white',
                      border: '1px solid #e0e0e0',
                      borderRadius: '8px',
                      padding: '1rem',
                      margin: 0,
                      position: 'relative'
                    }}>
                      {/* {doc.status === 'processing' && (
                        <div className="processing-overlay">
                          <InlineLoading
                            description="Processing with AI..."
                            status="active"
                          />
                        </div>
                      )} */}

                      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                        <div style={{
                          width: '48px',
                          height: '48px',
                          background: '#f4f4f4',
                          border: '1px solid #e0e0e0',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          <Document size={20} style={{ color: '#da1e28' }} />
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                            <h3 style={{
                              color: '#161616',
                              margin: 0,
                              fontSize: '0.875rem',
                              fontWeight: 500,
                              wordBreak: 'break-word'
                            }}>
                              {doc.name}
                            </h3>
                            {doc.status === 'ready' && (
                              <Tag style={{
                                background: '#d1f0d4',
                                color: '#24a148', borderRadius: '12px',
                                fontSize: '0.75rem',
                                fontWeight: 600
                              }} size="sm">
                                Ready
                              </Tag>
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
                            <span>{formatFileSize(doc.size)}</span>
                            <span>•</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <Time size={12} />
                              <span>{formatDate(doc.uploadedAt)}</span>
                            </div>
                            {currentUser && (
                              <>
                                <span>•</span>
                                <span>Uploaded by: {currentUser.username}</span>
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
                                {doc.summary}
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
                  ))}
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

      {/* View Details Modal - Enhanced */}
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
            
            {/* Modal Header - Fixed */}
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

            {/* Modal Content - Scrollable */}
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
                      ✓ Processed
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
                  {currentUser && (
                    <div>
                      <p style={{
                        color: '#6b7280',
                        fontSize: '0.8125rem',
                        margin: '0 0 0.5rem 0',
                        fontWeight: 500,
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        Uploaded By
                      </p>
                      <p style={{
                        color: '#111827',
                        fontSize: '0.9375rem',
                        margin: 0,
                        fontWeight: 500
                      }}>
                        {currentUser.username}
                      </p>
                    </div>
                  )}
                </div>
              </div>
{/* AI Summary Section */}
<div style={{ marginBottom: '2rem' }}>
  <h3 style={{
    color: '#111827',
    fontSize: '1.125rem',
    fontWeight: 600,
    margin: '0 0 1rem 0',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  }}>
    <span style={{
      background: 'linear-gradient(135deg, #0f62fe 0%, #0353e9 100%)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text'
    }}>
      AI-Generated Summary
    </span>
  </h3>

  <div style={{
    padding: '1.5rem',
    background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
    border: '2px solid #bfdbfe',
    borderRadius: '12px',
    position: 'relative',
    overflow: 'hidden'
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
      lineHeight: '1.7',
      margin: 0,
      whiteSpace: 'pre-line'
    }}>
      {(() => {
        // Handle the API response structure
        if (selectedDocForDetails.apiResponse && selectedDocForDetails.apiResponse.length > 0) {
          const docSummary = selectedDocForDetails.apiResponse[0].doc_summary;
          
          // If doc_summary is an object with choices array
          if (docSummary && docSummary.choices && docSummary.choices.length > 0) {
            const summaryText = docSummary.choices[0].text || '';
            // Clean up the text - remove the "Summarize the following document:" prefix if present
            const cleanSummary = summaryText.replace(/^Summarize the following document:\s*/i, '');
            return cleanSummary || 'Summary text not available';
          }
          // If doc_summary is a string
          else if (typeof docSummary === 'string') {
            return docSummary;
          }
          // If doc_summary is an array
          else if (Array.isArray(docSummary)) {
            return docSummary.join('\n');
          }
          else {
            return 'No summary available';
          }
        }
        // Fallback to old structure
        else {
          return selectedDocForDetails.summary || 'No summary available';
        }
      })()}
    </div>
  </div>

  {/* Download Summary Buttons */}
  <div style={{
    display: 'flex',
    gap: '0.75rem',
    marginTop: '1rem',
    flexWrap: 'wrap'
  }}>
    <button
      onClick={() => downloadSummary(selectedDocForDetails, 'txt')}
      style={{
        background: 'white',
        border: '2px solid #e5e7eb',
        padding: '0.625rem 1.25rem',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '0.875rem',
        color: '#374151',
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        transition: 'all 0.2s'
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.borderColor = '#0f62fe';
        e.currentTarget.style.color = '#0f62fe';
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.borderColor = '#e5e7eb';
        e.currentTarget.style.color = '#374151';
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      <Download size={16} />
      Download as TXT
    </button>
    <button
      onClick={() => downloadSummary(selectedDocForDetails, 'pdf')}
      style={{
        background: 'linear-gradient(135deg, #0f62fe 0%, #0353e9 100%)',
        border: 'none',
        padding: '0.625rem 1.25rem',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '0.875rem',
        color: 'white',
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
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
      <Download size={16} />
      Download as PDF
    </button>
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
      Extracted Information
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
          border: '1px solid #bfdbfe'
        }}>
          📄 File: {selectedDocForDetails.apiResponse[0].filename}
        </span>
        <span style={{
          background: '#f3f4f6',
          color: '#6b7280',
          padding: '0.5rem 1rem',
          borderRadius: '8px',
          fontSize: '0.8125rem',
          fontWeight: 500
        }}>
          {selectedDocForDetails.apiResponse[0].doc_content?.length || 0} chars
        </span>
      </>
    )}
  </div>

  <div style={{
    padding: '1.5rem',
    background: 'white',
    border: '2px solid #e5e7eb',
    borderRadius: '12px',
    maxHeight: '400px',
    overflowY: 'auto'
  }}>
    <p style={{
      color: '#374151',
      fontSize: '0.9375rem',
      lineHeight: '1.8',
      margin: 0,
      whiteSpace: 'pre-line'
    }}>
      {selectedDocForDetails.apiResponse && selectedDocForDetails.apiResponse.length > 0 
        ? selectedDocForDetails.apiResponse[0].doc_content 
        : selectedDocForDetails.extractedInfo || 'No extracted information available for this document.'}
    </p>
  </div>
</div>
            </div>

            {/* Modal Footer - Fixed */}
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