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
  Notification
} from '@carbon/icons-react';
import {
  Button,
  Tag,
  InlineLoading,
  Tile,
  Stack,
  Slider,
  TextArea,
  Modal,
  InlineNotification
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
  const [recentActivities, setRecentActivities] = useState([]);
  const [processingStartTimes, setProcessingStartTimes] = useState({});
  const [accuracyRatings, setAccuracyRatings] = useState({});
  const [accuracyFeedback, setAccuracyFeedback] = useState({});
  const [fileSizeError, setFileSizeError] = useState(null);
  const [fileSizeModalOpen, setFileSizeModalOpen] = useState(false);
  const [oversizedFiles, setOversizedFiles] = useState([]);

  // Constants
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes

  // Function to add activity to recent activities
  const addActivity = (documentName, action, duration = null, status = 'completed') => {
    const activity = {
      id: Date.now() + Math.random(),
      documentName,
      action,
      timestamp: new Date(),
      duration,
      status
    };

    setRecentActivities(prev => [activity, ...prev].slice(0, 10)); // Keep only last 10 activities
  };

  // Function to calculate processing time
  const calculateProcessingTime = (startTime, endTime) => {
    const duration = endTime - startTime;
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);

    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  // Function to validate file size
  const validateFileSize = (file) => {
    if (file.size > MAX_FILE_SIZE) {
      return {
        isValid: false,
        error: `File "${file.name}" exceeds 10MB limit. Size: ${formatFileSize(file.size)}`
      };
    }
    return { isValid: true };
  };

  // Function to handle file size errors with modal
  const handleFileSizeError = (invalidFiles) => {
    setOversizedFiles(invalidFiles);
    setFileSizeModalOpen(true);

    // Add to recent activities
    invalidFiles.forEach(file => {
      addActivity(file.name, 'upload failed', null, 'error');
    });
  };

  // Enhanced function to automatically evaluate accuracy based on comprehensive analysis
  const evaluateAccuracyAutomatically = (doc) => {
    console.log('=== EVALUATING ACCURACY ===');
    console.log('Document:', doc.name);

    if (!doc.apiResponse || !doc.apiResponse[0]) {
      console.log('No API response found, returning default 75');
      return 75;
    }

    const response = doc.apiResponse[0];
    const docContent = response.doc_content || '';

    console.log('Doc content length:', docContent.length);
    console.log('Doc summary structure:', response.doc_summary);

    // Extract summary from the nested structure
    let summary = '';
    const docSummary = response.doc_summary;

    if (docSummary && docSummary.choices && docSummary.choices.length > 0) {
      summary = docSummary.choices[0].text || '';
      summary = summary.replace(/^Summarize the following document:\s*/i, '');
      console.log('Extracted summary from choices:', summary.substring(0, 100) + '...');
    } else if (typeof docSummary === 'string') {
      summary = docSummary;
      console.log('Summary is string:', summary.substring(0, 100) + '...');
    } else if (Array.isArray(docSummary)) {
      summary = docSummary.join('\n');
      console.log('Summary is array, joined:', summary.substring(0, 100) + '...');
    } else {
      console.log('Summary format not recognized:', typeof docSummary);
    }

    let accuracyScore = 75; // Base score
    let evaluationFactors = [];

    if (docContent && summary) {
      const contentWords = docContent.split(/\s+/).filter(w => w.length > 0).length;
      const summaryWords = summary.split(/\s+/).filter(w => w.length > 0).length;

      console.log('Content words:', contentWords);
      console.log('Summary words:', summaryWords);

      // Factor 1: Summary length ratio
      const lengthRatio = summaryWords / contentWords;
      console.log('Length ratio:', lengthRatio);

      if (lengthRatio >= 0.08 && lengthRatio <= 0.25) {
        accuracyScore += 8;
        evaluationFactors.push('Optimal summary length');
      } else if (lengthRatio >= 0.05 && lengthRatio < 0.08) {
        accuracyScore += 3;
        evaluationFactors.push('Slightly short summary');
      } else if (lengthRatio > 0.25 && lengthRatio <= 0.4) {
        accuracyScore += 2;
        evaluationFactors.push('Slightly long summary');
      } else {
        accuracyScore -= 10;
        evaluationFactors.push('Poor summary length ratio');
      }

      // Factor 2: Key information coverage
      const keyTerms = extractKeyTerms(docContent);
      const coveredTerms = keyTerms.filter(term =>
        summary.toLowerCase().includes(term.toLowerCase())
      ).length;

      const termCoverageRatio = keyTerms.length > 0 ? coveredTerms / keyTerms.length : 0;
      console.log('Term coverage:', termCoverageRatio);

      if (termCoverageRatio >= 0.7) {
        accuracyScore += 12;
        evaluationFactors.push('Excellent key information coverage');
      } else if (termCoverageRatio >= 0.5) {
        accuracyScore += 8;
        evaluationFactors.push('Good key information coverage');
      } else if (termCoverageRatio >= 0.3) {
        accuracyScore += 4;
        evaluationFactors.push('Moderate key information coverage');
      } else {
        accuracyScore -= 8;
        evaluationFactors.push('Poor key information coverage');
      }

      // Factor 3: Structure
      const paragraphs = summary.split('\n').filter(p => p.trim().length > 0);
      if (paragraphs.length >= 2) {
        accuracyScore += 5;
        evaluationFactors.push('Well-structured paragraphs');
      }
    } else {
      console.log('Missing content or summary!');
      evaluationFactors.push('Missing content or summary');
    }

    const finalScore = Math.min(Math.max(accuracyScore, 50), 95);
    console.log('Final accuracy score:', finalScore);
    console.log('Evaluation factors:', evaluationFactors);

    // Store evaluation factors
    doc.accuracyEvaluation = {
      score: finalScore,
      factors: evaluationFactors
    };

    return finalScore;
  };
  // Enhanced key term extraction
  const extractKeyTerms = (content) => {
    if (!content) return [];

    const words = content.toLowerCase().split(/\s+/);
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'as', 'is', 'was', 'were', 'be', 'been', 'have',
      'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
      'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those', 'it'
    ]);

    const wordFreq = {};
    words.forEach(word => {
      const cleanWord = word.replace(/[^\w]/g, '');
      if (cleanWord.length > 3 && !stopWords.has(cleanWord) && !cleanWord.match(/^\d+$/)) {
        wordFreq[cleanWord] = (wordFreq[cleanWord] || 0) + 1;
      }
    });

    // Return top 15 most frequent meaningful words
    return Object.entries(wordFreq)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 15)
      .map(([word]) => word);
  };

  // Extract key phrases (2-3 word sequences)
  const extractKeyPhrases = (content) => {
    if (!content) return [];

    const sentences = content.split(/[.!?]+/);
    const phrases = new Set();

    sentences.forEach(sentence => {
      const words = sentence.toLowerCase().split(/\s+/).filter(word => word.length > 2);
      for (let i = 0; i < words.length - 1; i++) {
        // Extract 2-word phrases
        if (i < words.length - 1) {
          const phrase2 = `${words[i]} ${words[i + 1]}`;
          if (phrase2.length > 6) phrases.add(phrase2);
        }
        // Extract 3-word phrases
        if (i < words.length - 2) {
          const phrase3 = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
          if (phrase3.length > 10) phrases.add(phrase3);
        }
      }
    });

    return Array.from(phrases).slice(0, 10);
  };

  // Evaluate semantic coherence between content and summary
  const evaluateSemanticCoherence = (content, summary) => {
    if (!content || !summary) return 0;

    const contentSentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
    const summarySentences = summary.split(/[.!?]+/).filter(s => s.trim().length > 10);

    if (contentSentences.length === 0 || summarySentences.length === 0) return 0;

    let coherenceScore = 0;

    // Check if summary sentences relate to content sentences
    summarySentences.forEach(summarySentence => {
      const summaryWords = new Set(summarySentence.toLowerCase().split(/\s+/));
      let maxOverlap = 0;

      contentSentences.forEach(contentSentence => {
        const contentWords = new Set(contentSentence.toLowerCase().split(/\s+/));
        const overlap = [...summaryWords].filter(word => contentWords.has(word)).length;
        maxOverlap = Math.max(maxOverlap, overlap);
      });

      if (maxOverlap >= 3) coherenceScore += 2;
    });

    return Math.min(coherenceScore, 8);
  };

  // Evaluate redundancy in summary
  const evaluateRedundancy = (summary) => {
    if (!summary) return 0;

    const sentences = summary.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length <= 1) return 0;

    let redundancyCount = 0;
    const processedSentences = new Set();

    sentences.forEach(sentence => {
      const keyWords = new Set(
        sentence.toLowerCase()
          .split(/\s+/)
          .filter(word => word.length > 4)
      );

      if (processedSentences.size > 0) {
        processedSentences.forEach(processedSentence => {
          const processedWords = new Set(
            processedSentence.toLowerCase()
              .split(/\s+/)
              .filter(word => word.length > 4)
          );

          const overlap = [...keyWords].filter(word => processedWords.has(word)).length;
          if (overlap >= 3) {
            redundancyCount++;
          }
        });
      }

      processedSentences.add(sentence);
    });

    return Math.min(redundancyCount * 2, 6);
  };

  // Track processing start time for each document
  const trackProcessingStart = (docId) => {
    setProcessingStartTimes(prev => ({
      ...prev,
      [docId]: Date.now()
    }));
  };

  // Get processing time for a specific document
  const getDocumentProcessingTime = (doc) => {
    if (doc.processingTime) {
      return doc.processingTime;
    }

    const startTime = processingStartTimes[doc.id];
    if (startTime && doc.status === 'ready') {
      const processingTime = calculateProcessingTime(startTime, Date.now());
      // Update the document with processing time
      doc.processingTime = processingTime;
      return processingTime;
    }

    return null;
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  const handleFileUpload = async (files) => {
    const filesArray = Array.from(files);
    const startTime = Date.now();

    // Validate file sizes first
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

    // Show modal for oversized files
    if (invalidFiles.length > 0) {
      handleFileSizeError(invalidFiles);

      // If no valid files, return early
      if (validFiles.length === 0) {
        return;
      }
    }

    // Add valid files to uploading set
    const newUploadingFiles = new Set(uploadingFiles);
    validFiles.forEach(file => newUploadingFiles.add(file.name));
    setUploadingFiles(newUploadingFiles);

    try {
      await onUpload(validFiles);
      const endTime = Date.now();
      const processingTime = calculateProcessingTime(startTime, endTime);

      // Add activity for each uploaded file
      validFiles.forEach(file => {
        addActivity(file.name, 'uploaded', processingTime);
      });
    } catch (error) {
      validFiles.forEach(file => {
        addActivity(file.name, 'upload failed', null, 'error');
      });
    } finally {
      // Remove files from uploading set
      const updatedUploadingFiles = new Set(uploadingFiles);
      validFiles.forEach(file => updatedUploadingFiles.delete(file.name));
      setUploadingFiles(updatedUploadingFiles);
    }
  };

  // Monitor document status changes to track processing time and evaluate accuracy
  useEffect(() => {
    console.log('=== useEffect triggered - checking documents ===');
    console.log('Total documents:', documents.length);

    documents.forEach(doc => {
      // Track when processing starts
      if (doc.status === 'processing' && !processingStartTimes[doc.id]) {
        setProcessingStartTimes(prev => ({
          ...prev,
          [doc.id]: Date.now()
        }));
      }

      // Calculate accuracy when document becomes ready
      if (doc.status === 'ready') {
        console.log(`Document ready: ${doc.name}, ID: ${doc.id}`);
        console.log('Current accuracy for this doc:', accuracyRatings[doc.id]);

        // Calculate processing time if needed
        if (!doc.processingTime && processingStartTimes[doc.id]) {
          const processingTime = calculateProcessingTime(
            processingStartTimes[doc.id],
            Date.now()
          );
          doc.processingTime = processingTime;
          doc.processedAt = new Date();
        }

        // Calculate accuracy ONLY if not already calculated
        if (typeof accuracyRatings[doc.id] === 'undefined') {
          console.log(`Calculating accuracy for: ${doc.name}`);

          // Use setTimeout to ensure state updates properly
          setTimeout(() => {
            const accuracy = evaluateAccuracyAutomatically(doc);
            console.log(`Setting accuracy to ${accuracy}% for doc ${doc.id}`);

            setAccuracyRatings(prev => {
              const updated = { ...prev, [doc.id]: accuracy };
              console.log('Updated ratings state:', updated);
              return updated;
            });
          }, 100);
        }
      }
    });
  }, [documents]);
  // Clear documents when user changes or on refresh
  useEffect(() => {
    // This ensures that when a different user logs in or page refreshes,
    // the documents are cleared and reloaded for the current user
    // The parent component should handle the actual document loading based on currentUser
    setRecentActivities([]);
    setProcessingStartTimes({});
    setAccuracyRatings({});
    setAccuracyFeedback({});
    setSelectedDocForDetails(null);
    setSelectedDocForPreview(null);
    setUploadingFiles(new Set());
    setFileSizeError(null);
    setFileSizeModalOpen(false);
    setOversizedFiles([]);

    // Clear any preview URLs
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  }, [currentUser]);

  // Accuracy assessment functions
  const handleAccuracyRating = (docId, rating) => {
    setAccuracyRatings(prev => ({
      ...prev,
      [docId]: rating
    }));
  };

  const handleAccuracyFeedback = (docId, feedback) => {
    setAccuracyFeedback(prev => ({
      ...prev,
      [docId]: feedback
    }));
  };

  const getAccuracyColor = (rating) => {
    if (rating >= 90) return '#24a148'; // Green - Excellent
    if (rating >= 80) return '#198038'; // Dark Green - Very Good
    if (rating >= 70) return '#f1c21b'; // Yellow - Good
    if (rating >= 60) return '#ff832b'; // Orange - Fair
    return '#da1e28'; // Red - Poor
  };

  const getAccuracyLabel = (rating) => {
    if (rating >= 90) return 'Excellent';
    if (rating >= 80) return 'Very Good';
    if (rating >= 70) return 'Good';
    if (rating >= 60) return 'Fair';
    return 'Poor';
  };

  const getAccuracyIcon = (rating) => {
    if (rating >= 80) return <Checkmark size={16} style={{ color: getAccuracyColor(rating) }} />;
    return <Warning size={16} style={{ color: getAccuracyColor(rating) }} />;
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
            .accuracy-badge {
              display: inline-block;
              padding: 0.5rem 1rem;
              border-radius: 20px;
              font-weight: 600;
              font-size: 0.875rem;
              margin: 0.5rem 0;
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
            ${doc.processingTime ? `
            <div class="metadata-item">
              <span class="metadata-label">Processing Time:</span> ${doc.processingTime}
            </div>
            ` : ''}
            ${accuracyRatings[doc.id] ? `
            <div class="metadata-item">
              <span class="metadata-label">AI Accuracy Score:</span> 
              <span class="accuracy-badge" style="background: ${getAccuracyColor(accuracyRatings[doc.id])}; color: white;">
                ${accuracyRatings[doc.id]}% - ${getAccuracyLabel(accuracyRatings[doc.id])}
              </span>
            </div>
            ` : ''}
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

  const formatDateTimeForActivity = (date) => {
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getActivityIcon = (action, status) => {
    switch (action) {
      case 'uploaded':
        return <Icons.Upload size={16} />;
      case 'processed':
        return <Icons.Sparkles size={16} />;
      case 'deleted':
        return <TrashCan size={16} />;
      case 'upload failed':
        return <Close size={16} />;
      default:
        return <Document size={16} />;
    }
  };

  const getActivityColor = (action, status) => {
    if (status === 'error') return '#da1e28';

    switch (action) {
      case 'uploaded':
        return '#0f62fe';
      case 'processed':
        return '#24a148';
      case 'deleted':
        return '#8a3ffc';
      default:
        return '#525252';
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
        .activity-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          border-radius: 6px;
          transition: background-color 0.2s;
        }
        .activity-item:hover {
          background: #f4f4f4;
        }
        .activity-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .activity-content {
          flex: 1;
          min-width: 0;
        }
        .activity-main {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.25rem;
        }
        .activity-document {
          font-weight: 500;
          color: #161616;
          font-size: '0.875rem';
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .activity-time {
          color: '#525252';
          font-size: '0.75rem';
          flex-shrink: 0;
          margin-left: '0.5rem';
        }
        .activity-details {
          display: flex;
          align-items: center;
          gap: '0.5rem';
          font-size: '0.75rem';
          color: '#525252';
        }
        .activity-duration {
          background: '#e0e7ff';
          color: '#3730a3';
          padding: '0.125rem 0.5rem';
          border-radius: '12px';
          font-weight: 500;
          font-size: '0.6875rem';
        }
        .accuracy-section {
          background: '#f8f9fa';
          border-radius: '8px';
          padding: '1.5rem';
          margin-top: '1.5rem';
          border: '1px solid #e9ecef';
        }
        .accuracy-rating {
          display: flex;
          align-items: center;
          gap: '1rem';
          margin-bottom: '1rem';
        }
        .accuracy-label {
          font-weight: 600;
          color: '#161616';
          min-width: '120px';
        }
        .accuracy-value {
          font-weight: 600;
          padding: '0.25rem 0.75rem';
          border-radius: '20px';
          font-size: '0.875rem';
        }
        .file-size-warning {
          display: flex;
          gap: '1rem';
          margin-top: '1rem';
          padding: '0.75rem';
          background: '#da1e28';
          border: '1px solid #ffd7d9';
          border-radius: '6px';
          color: '#da1e28';
          font-size: '0.875rem';
        }
      `}</style>

      {/* File Size Error Modal */}
      {fileSizeModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '2rem'
        }} onClick={() => setFileSizeModalOpen(false)}>
          <div style={{
            background: 'white',
            borderRadius: '8px',
            width: '100%',
            maxWidth: '600px',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
            display: 'flex',
            flexDirection: 'column',

          }} onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div style={{
              padding: '1.5rem',
              borderBottom: '1px solid #e0e0e0',
              background: 'white',
              borderRadius: '8px 8px 8px 8px',

            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '0.5rem'
              }}>
                <Warning size={20} style={{ color: '#da1e28' }} />
                <h3 style={{
                  color: '#161616',
                  fontSize: '1.25rem',
                  fontWeight: 600,
                  margin: 0
                }}>
                  File Size Limit Exceeded
                </h3>
              </div>
              <p style={{
                color: '#525252',
                fontSize: '0.875rem',
                margin: 0
              }}>
                Upload Error
              </p>
            </div>

            {/* Modal Content */}
            <div style={{
              padding: '1.5rem',
              background: 'white',
              flex: 1
            }}>
              <p style={{
                marginBottom: '1rem',
                color: '#161616',
                background: 'white'
              }}>
                The following files exceed the 10MB file size limit and cannot be uploaded:
              </p>
              <ul style={{
                margin: '1rem 0',
                paddingLeft: '1.5rem',
                color: '#525252',
                background: 'white'
              }}>
                {oversizedFiles.map((file, index) => (
                  <li key={index} style={{
                    margin: '0.5rem 0',
                    background: 'white'
                  }}>
                    <strong>{file.name}</strong> - {formatFileSize(file.size)}
                  </li>
                ))}
              </ul>
              <p style={{
                color: '#525252',
                fontSize: '0.875rem',
                background: 'white',
                margin: 0
              }}>
                Please select files that are 10MB or smaller and try again.
              </p>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '1rem 1.5rem',
              borderTop: '1px solid #e0e0e0',
              display: 'flex',
              justifyContent: 'flex-end',
              borderRadius: '8px 8px 8px 8px',

              background: 'white',
            }}>
              <button
                onClick={() => setFileSizeModalOpen(false)}
                style={{
                  background: '#0f62fe',
                  color: 'white',
                  border: 'none',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  minWidth: '120px'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = '#0353e9';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = '#0f62fe';
                }}
              >
                OK, I Understand
              </button>
            </div>
          </div>
        </div>
      )}

      {/* File Size Error Notification (fallback) */}
      {fileSizeError && (
        <div style={{
          position: 'fixed',
          top: '1rem',
          right: '1rem',
          zIndex: 10000,
          maxWidth: '400px'
        }}>
          <InlineNotification
            kind="error"
            title={fileSizeError.title}
            subtitle={fileSizeError.message}
            lowContrast
            onClose={() => setFileSizeError(null)}
            timeout={5000}
          />
        </div>
      )}

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

              {/* File Size Warning */}

            </div>
            <div style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ color: '#525252', fontSize: '0.875rem' }}>Supported file types:</span>
              <Tag type="gray" size="sm">PDF</Tag>
              <Tag type="gray" size="sm">DOCX</Tag>
              <Tag type="gray" size="sm">TXT</Tag>
              <Tag type="gray" size="sm">PNG, JPG</Tag>
              <div className="file-size-warning">
                <Warning size={16} style={{ color: "red" }} />
                <span style={{ color: "red", marginLeft: "0.5rem" }}>  Maximum file size: 10MB per file</span>
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
                  {documents.map((doc) => {
                    const processingTime = getDocumentProcessingTime(doc);
                    const accuracy = accuracyRatings[doc.id];

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
                      Processing Time
                    </p>
                    <p style={{
                      color: '#111827',
                      fontSize: '0.9375rem',
                      margin: 0,
                      fontWeight: 500
                    }}>
                      {getDocumentProcessingTime(selectedDocForDetails) || 'Calculating...'}
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
                  padding: '2rem 2.5rem',
                  background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                  border: '2px solid #bfdbfe',
                  borderRadius: '12px',
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: '0 2px 8px rgba(15, 98, 254, 0.1)'
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
                    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                  }}>
                    {(() => {
                      let summaryText = '';
                      if (selectedDocForDetails.apiResponse && selectedDocForDetails.apiResponse.length > 0) {
                        const docSummary = selectedDocForDetails.apiResponse[0].doc_summary;

                        if (docSummary && docSummary.choices && docSummary.choices.length > 0) {
                          summaryText = docSummary.choices[0].text || '';
                          summaryText = summaryText.replace(/^Summarize the following document:\s*/i, '');
                        } else if (typeof docSummary === 'string') {
                          summaryText = docSummary;
                        } else if (Array.isArray(docSummary)) {
                          summaryText = docSummary.join('\n');
                        } else {
                          summaryText = 'No summary available';
                        }
                      } else {
                        summaryText = selectedDocForDetails.summary || 'No summary available';
                      }

                      return summaryText.split('\n').map((paragraph, index) => {
                        if (paragraph.trim() === '') {
                          return <div key={index} style={{ height: '0.75rem' }} />;
                        }

                        if (paragraph.match(/^\d+\.\s+[A-Z]/)) {
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
                            textAlign: 'justify',
                            textIndent: '1.5rem'
                          }}>
                            {paragraph}
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* Enhanced Automatic Accuracy Assessment */}
                <div className="accuracy-section">
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '1rem',
                  }}>
                    <h4 style={{
                      color: '#111827',
                      fontSize: '1rem',
                      fontWeight: 600,
                      margin: 0,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      <Checkmark size={16} style={{ color: '#0f62fe' }} />
                      AI Accuracy Assessment
                    </h4>
                    {/* FIX: Ensure we always show the accuracy */}
                    {accuracyRatings[selectedDocForDetails.id] && (
                      <span
                        className="accuracy-value"
                        style={{
                          background: getAccuracyColor(accuracyRatings[selectedDocForDetails.id]),
                          color: 'white',
                          fontSize: '0.875rem',
                          padding: '0.5rem 1rem',
                          marginTop: '1rem'
                        }}
                      >
                        {accuracyRatings[selectedDocForDetails.id]}% - {getAccuracyLabel(accuracyRatings[selectedDocForDetails.id])}
                      </span>
                    )}
                  </div>

                  <p style={{
                    color: '#525252',
                    fontSize: '0.875rem',
                    lineHeight: '1.5',
                    margin: '0 0 1rem 0'
                  }}>
                    This enhanced accuracy score evaluates multiple factors including summary length,
                    key information coverage, semantic coherence, structural quality, and redundancy analysis.
                  </p>
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
                        {(selectedDocForDetails.apiResponse[0].doc_content?.length || 0).toLocaleString()} characters
                      </span>
                    </>
                  )}
                </div>

                <div style={{
                  padding: '2rem 2.5rem',
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
                      const content = selectedDocForDetails.apiResponse && selectedDocForDetails.apiResponse.length > 0
                        ? selectedDocForDetails.apiResponse[0].doc_content
                        : selectedDocForDetails.extractedInfo || 'No extracted information available for this document.';

                      // Add null/undefined check and ensure content is a string
                      if (!content) {
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

                      // Convert to string and handle empty content
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