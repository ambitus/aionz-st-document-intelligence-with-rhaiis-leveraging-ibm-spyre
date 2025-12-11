import React, { useState, useEffect } from 'react';
import {
  Watson,
  Login,
  Asset,
} from '@carbon/icons-react';
import AIChat from './AIChatTab';
import DocumentsTab from './DocumentTab';
import SetupGuide from './SetupGuide'
import CustomHeader from './Header'
import HomePage from './HomeTab'
import Icons from './Icons'

const Dashboard = () => {
  const [selectedTab, setSelectedTab] = useState(0);
  const [documents, setDocuments] = useState([]);
  const [showLogin, setShowLogin] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [username, setUsername] = useState('');
  const [userRole, setUserRole] = useState('user');
  const [uploadingFiles, setUploadingFiles] = useState(new Set());
  const [loadingUserDocuments, setLoadingUserDocuments] = useState(false);

  // Fetch user documents when user logs in
  const fetchUserDocuments = async (username) => {
    if (!username) return;
    
    setLoadingUserDocuments(true);
    try {
      console.log(`Fetching documents for user: ${username}`);
      
      // The API expects user_id as a query parameter in GET request
      const encodedUsername = encodeURIComponent(username);
      const apiUrl = process.env.REACT_APP_API_BASE_URL  
      const response = await fetch(
        `${apiUrl}/user_exists_check?user_id=${encodedUsername}`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          }
        }
      );
      
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        // If GET fails, maybe it's actually a POST endpoint
        if (response.status === 405) {
          console.log('GET failed with 405, trying POST...');
          // Try POST with query parameter in URL
          const postResponse = await fetch(
            `${apiUrl}/user_exists_check?user_id=${encodedUsername}`,
            {
              method: 'POST',
              headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              },
              // Some APIs expect an empty body or specific body for POST
              body: JSON.stringify({})
            }
          );
          
          if (!postResponse.ok) {
            throw new Error(`POST failed with status: ${postResponse.status}`);
          }
          
          const userDocuments = await postResponse.json();
          processUserDocuments(userDocuments, username);
          return;
        }
        
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const userDocuments = await response.json();
      console.log('Received user documents:', userDocuments);
      processUserDocuments(userDocuments, username);
      
    } catch (error) {
      console.error('Error fetching user documents:', error);
      // If there's an error, still show the UI but with no documents
      // This allows users to upload new documents
    } finally {
      setLoadingUserDocuments(false);
    }
  };

// Helper function to process user documents
const processUserDocuments = (userDocuments, username) => {
  if (!userDocuments) {
    console.log('No response data received');
    setDocuments([]);
    return;
  }
  
  // Handle error response format
  if (userDocuments.detail) {
    console.log('Error response from server:', userDocuments.detail);
    setDocuments([]);
    return;
  }
  
  // Handle different response formats
  let documentsArray = [];
  
  if (Array.isArray(userDocuments)) {
    documentsArray = userDocuments;
    console.log('Received array of', documentsArray.length, 'documents');
  } else if (userDocuments.documents && Array.isArray(userDocuments.documents)) {
    documentsArray = userDocuments.documents;
  } else if (typeof userDocuments === 'object' && userDocuments !== null) {
    // Try to extract array from object
    const keys = Object.keys(userDocuments);
    if (keys.length > 0 && Array.isArray(userDocuments[keys[0]])) {
      documentsArray = userDocuments[keys[0]];
    } else {
      // If it's a single document object, wrap in array
      documentsArray = [userDocuments];
    }
  }
  
  if (documentsArray.length > 0) {
    const transformedDocs = documentsArray.map((doc, index) => ({
      id: doc._id || `server_doc_${Date.now()}_${index}`,
      name: doc.doc_name || `Document ${index + 1}`,
      size: doc.size || 0,
      uploadedAt: doc.uploaded_at ? new Date(doc.uploaded_at) : new Date(),
      status: 'ready',
      // Use the actual doc_summary from API response
      summary: doc.doc_summary || `Document "${doc.doc_name || `Document ${index + 1}`}" loaded from server storage.`,
      // Use the actual doc_content from API response
      extractedInfo: doc.doc_content || '',
      file: null,
      processingTime: null,
      apiResponse: [{
        doc_summary: { 
          choices: [{ 
            text: doc.doc_summary || 
              `Document: ${doc.doc_name || `Document ${index + 1}`}\n\nThis document was loaded from server storage.`
          }] 
        },
        doc_content: doc.doc_content || '',
        filename: doc.doc_name || `Document ${index + 1}`,
        rouge_scores: doc.Rouge_Score || null,
        uploaded_at: doc.uploaded_at,
        // Include the original doc_summary as separate field for easy access
        original_summary: doc.doc_summary
      }],
      uploadedBy: username,
      fromServer: true,
      serverData: doc,
      fileType: doc.doc_name ? doc.doc_name.split('.').pop().toLowerCase() : 'unknown'
    }));
    
    setDocuments(transformedDocs);
    console.log(`Loaded ${transformedDocs.length} documents for user: ${username}`);
  } else {
    setDocuments([]);
    console.log(`No documents found for user: ${username}`);
  }
};

  // Clear documents when user changes
  useEffect(() => {
    if (currentUser && currentUser.username) {
      // When a new user logs in, fetch their documents from server
      fetchUserDocuments(currentUser.username);
    }
  }, [currentUser?.username]); // Only trigger when username changes

  const handleDeleteDocument = (docId) => {
    setDocuments(prevDocs => prevDocs.filter(doc => doc.id !== docId));
  };

  // Handle file upload - updated to support streaming
  const handleFileUpload = async (files, finalDoc = null) => {
    console.log('handleFileUpload called with:', files.length, 'files');
    
    // If we have a final document from streaming, just add it
    if (finalDoc) {
      console.log('Adding final document from streaming:', finalDoc.name);
      // Mark as not from server
      const docWithServerFlag = {
        ...finalDoc,
        fromServer: false,
        uploadedBy: currentUser?.username
      };
      setDocuments(prev => [...prev, docWithServerFlag]);
      return;
    }

    // Fallback for non-streaming uploads (shouldn't be used with streaming)
    const newDocuments = Array.from(files).map(file => ({
      id: Date.now() + Math.random(),
      name: file.name,
      size: file.size,
      uploadedAt: new Date(),
      status: 'processing',
      file: file,
      summary: '',
      extractedInfo: '',
      fromServer: false,
      uploadedBy: currentUser?.username
    }));

    setDocuments(prev => [...prev, ...newDocuments]);

    // Simulate processing (only for fallback)
    setTimeout(() => {
      setDocuments(prev => prev.map(doc => {
        if (newDocuments.find(nd => nd.id === doc.id)) {
          return {
            ...doc,
            status: 'ready',
            summary: 'This is a simulated summary for: ' + doc.name,
            extractedInfo: 'Simulated extracted content for: ' + doc.name,
            processingTime: '3s'
          };
        }
        return doc;
      }));
    }, 3000);
  };

  // Login handler
  const handleLogin = async (e) => {
    e.preventDefault();
    if (username.trim()) {
      const role = username.toLowerCase() === 'admin' ? 'admin' : 'user';
      const userObj = { username: username.trim(), role };
      setCurrentUser(userObj);
      setUserRole(role);
      setUsername('');
      
      // Don't hide login immediately - let documents load first
      setShowLogin(false);
    }
  };

  // Logout handler
  const handleLogout = () => {
    setCurrentUser(null);
    setShowLogin(true);
    setUserRole('user');
    setDocuments([]); // Clear all documents on logout
    setUploadingFiles(new Set());
  };

  // Show login page if not authenticated
  if (showLogin) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #001d6c 0%, #0062ff 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        padding: '20px'
      }}>
        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          borderRadius: '24px',
          padding: '60px 48px',
          width: '100%',
          maxWidth: '480px',
          boxShadow: '0 20px 60px rgba(0, 29, 108, 0.3)',
          textAlign: 'center',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            background: 'linear-gradient(135deg, #0062ff 0%, #001d6c 100%)',
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 32px',
            boxShadow: '0 8px 24px rgba(0, 98, 255, 0.4)'
          }}>
            <Icons.RedHat />
          </div>

          <h1 style={{
            fontSize: '30px',
            fontWeight: '600',
            margin: '0 0 12px 0',
            color: '#001d6c',
            background: 'linear-gradient(135deg, #001d6c 0%, #0062ff 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            Document Intelligence with Spyre Accelerator for IBM Z & IBM LinuxONE
          </h1>
          <p style={{
            fontSize: '18px',
            color: '#667085',
            margin: '0 0 40px 0',
            fontWeight: '500'
          }}>
            Intelligent Document Analysis
          </p>

          <form onSubmit={handleLogin} style={{ textAlign: 'left' }}>
            <div style={{ marginBottom: '32px' }}>
              <label style={{
                display: 'block',
                fontSize: '16px',
                fontWeight: '600',
                color: '#001d6c',
                marginBottom: '12px'
              }}>
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                style={{
                  width: '100%',
                  padding: '16px 20px',
                  border: '2px solid #e0e7ff',
                  borderRadius: '12px',
                  fontSize: '16px',
                  outline: 'none',
                  fontFamily: 'inherit',
                  backgroundColor: '#f8fbff',
                  transition: 'all 0.2s'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#0062ff';
                  e.target.style.backgroundColor = '#ffffff';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e0e7ff';
                  e.target.style.backgroundColor = '#f8fbff';
                }}
                required
              />
              <p style={{
                fontSize: '14px',
                color: '#667085',
                margin: '12px 0 0 0'
              }}>
                Use "admin" for administrator access or any other name for user access
              </p>
            </div>

            <button
              type="submit"
              style={{
                width: '100%',
                padding: '18px 24px',
                background: 'linear-gradient(135deg, #0062ff 0%, #001d6c 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                transition: 'all 0.2s',
                boxShadow: '0 8px 24px rgba(0, 98, 255, 0.4)'
              }}
              disabled={loadingUserDocuments}
            >
              {loadingUserDocuments ? (
                <>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    border: '2px solid white',
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                  Loading...
                </>
              ) : (
                <>
                  <Login size={20} />
                  Sign In to Dashboard
                </>
              )}
            </button>
          </form>

          <div style={{
            marginTop: '40px',
            padding: '24px',
            backgroundColor: '#f0f4ff',
            borderRadius: '16px',
            fontSize: '14px',
            color: '#475467',
            border: '1px solid #e0e7ff'
          }}>
            <p style={{ margin: '0 0 12px 0', fontWeight: '600', color: '#001d6c' }}>Demo Accounts:</p>
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
              <span style={{ padding: '6px 16px', backgroundColor: '#0062ff', color: 'white', borderRadius: '20px', fontSize: '12px', fontWeight: '500' }}>
                Admin: "admin"
              </span>
              <span style={{ padding: '6px 16px', backgroundColor: '#e0e7ff', color: '#0062ff', borderRadius: '20px', fontSize: '12px', fontWeight: '500' }}>
                User: Any name
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: '#f8fbff',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      minHeight: '100vh',
      paddingTop: '140px'
    }}>
      <style>{`
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    `}</style>

      <CustomHeader onLogout={handleLogout} currentUser={currentUser} />

      {/* Navigation Tabs - Fixed */}
      <div style={{
        position: 'fixed',
        top: '88px',
        left: 0,
        right: 0,
        backgroundColor: 'white',
        borderBottom: '1px solid #e0e7ff',
        zIndex: 999
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          width: '100%'
        }}>
          {[
            { name: 'Home', icon: Icons.Home },
            { name: 'Documents', icon: Icons.FileText },
            { name: 'AI Assistant', icon: Icons.MessageSquare },
            { name: 'Setup Guide', icon: Icons.Settings }
          ].map((tab, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedTab(idx)}
              style={{
                padding: '20px 16px',
                backgroundColor: selectedTab === idx ? 'white' : 'transparent',
                border: 'none',
                borderBottom: selectedTab === idx ? '3px solid #0062ff' : '3px solid transparent',
                color: selectedTab === idx ? '#0062ff' : '#171919ff',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: selectedTab === idx ? '700' : '500',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                transition: 'all 0.2s',
                width: '100%',
                boxSizing: 'border-box'
              }}
            >
              <tab.icon size={20} />
              {tab.name}
              {idx === 1 && documents.length > 0 && (
                <span style={{
                  backgroundColor: selectedTab === idx ? '#0062ff' : '#e0e7ff',
                  color: selectedTab === idx ? 'white' : '#0062ff',
                  padding: '4px 12px',
                  borderRadius: '16px',
                  fontSize: '12px',
                  fontWeight: '700'
                }}>
                  {documents.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {selectedTab === 0 && (
          <HomePage documents={documents} onNavigate={setSelectedTab} />
        )}
        {selectedTab === 1 && (
          <DocumentsTab
            documents={documents}
            onUpload={handleFileUpload}
            onDelete={handleDeleteDocument}
            currentUser={currentUser}
            loadingUserDocuments={loadingUserDocuments}
          />
        )}
        {selectedTab === 2 && (
          <AIChat documents={documents} currentUser={currentUser} />
        )}
        {selectedTab === 3 && (
          <SetupGuide />
        )}
      </div>
    </div>
  );
};

export default Dashboard;