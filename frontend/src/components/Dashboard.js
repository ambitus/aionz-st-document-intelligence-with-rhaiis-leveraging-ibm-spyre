import React, { useState } from 'react';
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
import Logo from '../assets/Redhat.png'

const Dashboard = () => {
  const [selectedTab, setSelectedTab] = useState(0);
  const [documents, setDocuments] = useState([]);
  const [showLogin, setShowLogin] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [username, setUsername] = useState('');
  const [userRole, setUserRole] = useState('user');
  
  const handleDeleteDocument = (docId) => {
    setDocuments(prevDocs => prevDocs.filter(doc => doc.id !== docId));
  };

  // Login handler
  const handleLogin = (e) => {
    e.preventDefault();
    if (username.trim()) {
      const role = username.toLowerCase() === 'admin' ? 'admin' : 'user';
      setCurrentUser({ username: username.trim(), role });
      setShowLogin(false);
      setUsername('');
      setUserRole(role);
    }
  };

  // Logout handler
  const handleLogout = () => {
    setCurrentUser(null);
    setShowLogin(true);
    setUserRole('user');
  };

  const handleFileUpload = async (files) => {
    const filesArray = Array.from(files);
    
    // Create initial document entries with processing status
    const newDocuments = filesArray.map((file) => ({
      id: Date.now() + Math.random(),
      name: file.name,
      size: file.size,
      uploadedAt: new Date(),
      status: 'processing',
      summary: null,
      extractedInfo: null,
      file: file  // Store the actual file object
    }));

    setDocuments(prev => [...newDocuments, ...prev]);

    // Process each file with the API
    for (const doc of newDocuments) {
      try {
        const formData = new FormData();
        formData.append('files', doc.file);
        formData.append('user_id', currentUser.username);

        const response = await fetch('http://129.40.90.163:8002/upload-files', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        // Update document with API response
        setDocuments(prev =>
          prev.map(d =>
            d.id === doc.id
              ? {
                ...d,
                status: 'ready',
                summary: result.summary || `Document ${doc.name} has been successfully processed and analyzed.`,
                extractedInfo: result.extracted_text || result.content || JSON.stringify(result, null, 2),
                apiResponse: result
              }
              : d
          )
        );
      } catch (error) {
        console.error(`Error processing ${doc.name}:`, error);
        
        // Update document with error status
        setDocuments(prev =>
          prev.map(d =>
            d.id === doc.id
              ? {
                ...d,
                status: 'error',
                summary: `Error processing document: ${error.message}`,
                extractedInfo: `Failed to process the document. Error: ${error.message}`
              }
              : d
          )
        );
      }
    }
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
            <Icons.RedHat/>
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
            Document Intelligence with IBM Spyre
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
            >
              <Login size={20} />
              Sign In to Dashboard
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