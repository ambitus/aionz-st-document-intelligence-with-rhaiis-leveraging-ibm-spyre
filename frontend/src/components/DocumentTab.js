import React, { useState, useRef } from 'react';
import {
  Document,
  Time,
  TrashCan,
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
const DocumentsTab = ({ documents, onUpload, onDelete }) => {
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedDocForDetails, setSelectedDocForDetails] = useState(null);
  const [selectedDocForPreview, setSelectedDocForPreview] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      onUpload(e.dataTransfer.files);
    }
  };

  const openPreviewPopup = (doc) => {
    if (!doc.file) {
      alert('File not available for preview');
      return;
    }

    // Create object URL for the file
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

          <Icons.Download />
          Download to View
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

          Download File

        </div>
      );
    }
  };

  // Text file preview component
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
      onUpload(e.target.files);
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
    const content = doc.summary || 'No summary available';
    const blob = new Blob([content], { type: format === 'pdf' ? 'application/pdf' : 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.name}_summary.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };


  return (
    <>
      <div style={{ display: 'flex', gap: '1.5rem', padding: '2rem', margin: '0 auto' }}>
        {/* Left Column - Upload and Documents */}
        <div style={{ flex: 1 }}>
          {/* Upload Area */}
          <div style={{
            background: 'white',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            padding: '1.5rem',
            marginBottom: '1.5rem'
          }}>
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
                cursor: 'pointer',
                transition: 'all 0.2s',
                transform: isDragging ? 'scale(1.01)' : 'scale(1)'
              }}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={() => setIsDragging(false)}
              onClick={() => fileInputRef.current?.click()}
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

              <button style={{
                background: '#0f62fe',
                color: 'white',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 500,
                fontSize: '0.875rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem'
              }} onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}>
                <span style={{ width: '16px', height: '16px' }}><Icons.Plus /></span>
                Browse Files
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
                      margin: 0
                    }}>
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
                              }}> <InlineLoading size="sm" description="Processing" /> </Tag>
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

          {/* Quick Stats */}
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
            </Stack>
          </Tile>

          {/* AI Analysis Info */}
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
            {/* Preview Header */}
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

            {/* Preview Content */}
            <div style={{
              flex: 1,
              overflow: 'auto',
              background: '#f4f4f4'
            }}>
              {previewUrl && getPreviewContent(selectedDocForPreview, previewUrl)}
            </div>

            {/* Preview Footer */}
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
      {/* View Details Modal */}
      {selectedDocForDetails && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '2rem'
        }} onClick={() => setSelectedDocForDetails(null)}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '900px',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)'
          }} onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div style={{
              padding: '1.5rem',
              borderBottom: '1px solid #e0e0e0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              position: 'sticky',
              top: 0,
              background: 'white',
              zIndex: 1
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
                    {selectedDocForDetails.name}
                  </h2>
                  <p style={{
                    color: '#525252',
                    fontSize: '0.875rem',
                    margin: 0
                  }}>
                    Document Analysis
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDocForDetails(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  borderRadius: '6px',
                  color: '#525252',
                  fontSize: '1.5rem'
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ padding: '1.5rem' }}>
              {/* Metadata Section */}
              <div style={{ marginBottom: '2rem' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '1rem'
                }}>
                  <Icons.FileText size={16} style={{ color: '#525252' }} />
                  <h3 style={{
                    color: '#161616',
                    fontSize: '1rem',
                    fontWeight: 500,
                    margin: 0
                  }}>
                    Metadata
                  </h3>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '1.5rem'
                }}>
                  <div>
                    <p style={{
                      color: '#525252',
                      fontSize: '0.875rem',
                      margin: '0 0 0.25rem 0'
                    }}>
                      Status
                    </p>
                    <span style={{
                      background: '#161616',
                      color: 'white',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      display: 'inline-block'
                    }}>
                      processed
                    </span>
                  </div>

                  <div>
                    <p style={{
                      color: '#525252',
                      fontSize: '0.875rem',
                      margin: '0 0 0.25rem 0'
                    }}>
                      Uploaded
                    </p>
                    <p style={{
                      color: '#161616',
                      fontSize: '0.875rem',
                      margin: 0
                    }}>
                      {formatDateTime(selectedDocForDetails.uploadedAt)}
                    </p>
                  </div>

                  <div>
                    <p style={{
                      color: '#525252',
                      fontSize: '0.875rem',
                      margin: '0 0 0.25rem 0'
                    }}>
                      Processed
                    </p>
                    <p style={{
                      color: '#161616',
                      fontSize: '0.875rem',
                      margin: 0
                    }}>
                      {formatDateTime(selectedDocForDetails.uploadedAt)}
                    </p>
                  </div>

                  <div>
                    <p style={{
                      color: '#525252',
                      fontSize: '0.875rem',
                      margin: '0 0 0.25rem 0'
                    }}>
                      File Size
                    </p>
                    <p style={{
                      color: '#161616',
                      fontSize: '0.875rem',
                      margin: 0
                    }}>
                      {formatFileSize(selectedDocForDetails.size)}
                    </p>
                  </div>
                </div>
              </div>

              {/* AI Summary Section */}
              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{
                  color: '#161616',
                  fontSize: '1rem',
                  fontWeight: 500,
                  margin: '0 0 1rem 0'
                }}>
                  AI-Generated Summary
                </h3>

                <div style={{
                  padding: '1.5rem',
                  background: '#edf5ff',
                  border: '1px solid #d0e2ff',
                  borderRadius: '8px'
                }}>
                  <p style={{
                    color: '#161616',
                    fontSize: '0.875rem',
                    lineHeight: '1.625',
                    margin: 0
                  }}>
                    {selectedDocForDetails.summary}
                  </p>
                </div>

                {/* Download Summary Buttons */}
                <div style={{
                  display: 'flex',
                  gap: '0.5rem',
                  marginTop: '1rem'
                }}>
                  <button
                    onClick={() => downloadSummary(selectedDocForDetails, 'txt')}
                    style={{
                      background: 'transparent',
                      border: '1px solid #e0e0e0',
                      padding: '0.5rem 1rem',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      color: '#161616',
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    <Icons.FileText />
                    Download as TXT
                  </button>
                  <button
                    onClick={() => downloadSummary(selectedDocForDetails, 'pdf')}
                    style={{
                      background: 'transparent',
                      border: '1px solid #e0e0e0',
                      padding: '0.5rem 1rem',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      color: '#161616',
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    <Icons.FileText />
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
                  <Icons.FileText size={16} style={{ color: '#525252' }} />
                  <h3 style={{
                    color: '#161616',
                    fontSize: '1rem',
                    fontWeight: 500,
                    margin: 0
                  }}>
                    Extracted Information
                  </h3>
                </div>

                <div style={{
                  display: 'flex',
                  gap: '0.5rem',
                  marginBottom: '1rem',
                  flexWrap: 'wrap'
                }}>
                  <span style={{
                    background: '#edf5ff',
                    color: '#0f62fe',
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    fontWeight: 500
                  }}>
                    Type: legal
                  </span>
                  <span style={{
                    background: '#f4f4f4',
                    color: '#525252',
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                    fontSize: '0.875rem'
                  }}>
                    1.4K chars
                  </span>
                </div>

                <div style={{
                  padding: '1.5rem',
                  background: '#fafafa',
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px'
                }}>
                  <p style={{
                    color: '#161616',
                    fontSize: '0.875rem',
                    lineHeight: '1.625',
                    margin: 0,
                    whiteSpace: 'pre-line'
                  }}>
                    Here is the extracted information structured clearly and accurately:

                    <strong>**Document Type:**</strong> License Information (International Program License Agreement)

                    <strong>**Parties Involved:**</strong>

                    * Client (Licensee)
                    * IBM (Licensee's Service Provider/Licensor)

                    <strong>**Key Dates and Deadlines:**</strong>
                    No specific dates mentioned in the document. However, it appears that if Client does not have previously agreed to license terms in effect, the International Program License Agreement (i125-3301-15) applies.
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '1.5rem',
              borderTop: '1px solid #e0e0e0',
              display: 'flex',
              justifyContent: 'flex-end',
              position: 'sticky',
              bottom: 0,
              background: 'white',
              zIndex: 1
            }}>
              <button
                onClick={() => setSelectedDocForDetails(null)}
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