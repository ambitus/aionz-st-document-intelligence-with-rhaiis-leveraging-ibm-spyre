import React, { useState } from 'react';

export default function DocumentDetailsModal() {
  const [showDetails, setShowDetails] = useState(true);
  const [selectedDoc] = useState({
    name: 'GNU_AGPL_v3.pdf',
    status: 'processed',
    uploadedAt: 'November 6, 2025 at 08:45 AM',
    processedAt: 'November 6, 2025 at 08:51 AM',
    size: '34.7 KB',
    type: 'Legal',
    sections: 3,
    chars: '32.6K',
    summary: 'The GNU Affero General Public License version 3 (AGPL v3) is a free, copyleft license designed to ensure that users who interact with software over a network have access to its source code. It extends the GPL v3 by closing the "ASP loophole," requiring that modified versions of the software made available over a network must also provide source code access. The license protects user freedoms to run, study, share, and modify software while ensuring these freedoms are preserved in derivative works.'
  });

  return (
    <>
      {showDetails && selectedDoc && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}
        onClick={() => setShowDetails(false)}>
          <div 
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              width: '100%',
              maxWidth: '900px',
              maxHeight: '90vh',
              overflow: 'auto',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)'
            }}
            onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div style={{ 
              padding: '24px', 
              borderBottom: '1px solid #e0e0e0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              position: 'sticky',
              top: 0,
              backgroundColor: 'white',
              zIndex: 1
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', flex: 1 }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  backgroundColor: '#d0e2ff',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <svg width="24" height="24" viewBox="0 0 32 32" fill="#0f62fe">
                    <path d="M25.7 9.3l-7-7c-.2-.2-.4-.3-.7-.3H8c-1.1 0-2 .9-2 2v24c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V10c0-.3-.1-.5-.3-.7zM18 4.4l5.6 5.6H18V4.4zM24 28H8V4h8v6c0 1.1.9 2 2 2h6v16z"/>
                  </svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h2 style={{ fontSize: '20px', fontWeight: '600', margin: '0 0 4px 0', color: '#161616', wordBreak: 'break-word' }}>
                    {selectedDoc.name}
                  </h2>
                  <p style={{ fontSize: '14px', color: '#525252', margin: 0 }}>
                    Document Analysis
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDetails(false)}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '8px',
                  color: '#525252',
                  borderRadius: '4px',
                  flexShrink: 0,
                  marginLeft: '16px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f4f4f4';
                  e.currentTarget.style.color = '#161616';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#525252';
                }}>
                <svg width="20" height="20" viewBox="0 0 32 32" fill="currentColor">
                  <path d="M24 9.4L22.6 8 16 14.6 9.4 8 8 9.4l6.6 6.6L8 22.6 9.4 24l6.6-6.6 6.6 6.6 1.4-1.4-6.6-6.6L24 9.4z"/>
                </svg>
              </button>
            </div>
            
            <div style={{ padding: '24px' }}>
              {/* Metadata Section */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
                gap: '16px',
                marginBottom: '32px',
                padding: '20px',
                backgroundColor: '#f4f4f4',
                borderRadius: '8px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    backgroundColor: '#e0e0e0',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <svg width="16" height="16" viewBox="0 0 32 32" fill="#525252">
                      <path d="M16 2a14 14 0 1 0 14 14A14 14 0 0 0 16 2zm-2 19.59l-5-5L10.59 15 14 18.41 21.41 11l1.416 1.41z"/>
                    </svg>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: '12px', color: '#525252', margin: '0 0 2px 0' }}>Status</p>
                    <p style={{ fontSize: '14px', fontWeight: '500', margin: 0, color: '#161616' }}>
                      {selectedDoc.status === 'processed' ? 'Processed' : 'Uploaded'}
                    </p>
                  </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    backgroundColor: '#e0e0e0',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <svg width="16" height="16" viewBox="0 0 32 32" fill="#525252">
                      <path d="M26 14h-2V8h-6V6h6a2 2 0 0 1 2 2z"/>
                      <path d="M24 30H8a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h8v2H8v20h16v-8h2v8a2 2 0 0 1-2 2z"/>
                      <path d="M21 12a5.006 5.006 0 0 0-5-5v2a3 3 0 1 1 3 3h-2v2h2a5.006 5.006 0 0 0 5-5z"/>
                    </svg>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: '12px', color: '#525252', margin: '0 0 2px 0' }}>Uploaded</p>
                    <p style={{ fontSize: '14px', fontWeight: '500', margin: 0, color: '#161616' }}>
                      {selectedDoc.uploadedAt}
                    </p>
                  </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    backgroundColor: '#e0e0e0',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <svg width="16" height="16" viewBox="0 0 32 32" fill="#525252">
                      <path d="M22 22v6H6V4h10V2H6a2 2 0 0 0-2 2v24a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6z"/>
                      <path d="M29.537 13.76l-9.5-9.5a1.875 1.875 0 0 0-2.652 2.652L23.172 12.7H11.875a1.875 1.875 0 0 0 0 3.75h11.297l-5.787 5.787a1.875 1.875 0 0 0 2.652 2.652l9.5-9.5a1.874 1.874 0 0 0 0-2.629z"/>
                    </svg>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: '12px', color: '#525252', margin: '0 0 2px 0' }}>Processed</p>
                    <p style={{ fontSize: '14px', fontWeight: '500', margin: 0, color: '#161616' }}>
                      {selectedDoc.processedAt}
                    </p>
                  </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    backgroundColor: '#e0e0e0',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <svg width="16" height="16" viewBox="0 0 32 32" fill="#525252">
                      <path d="M6 4v2h20V4zm0 22v2h20v-2zm14-11v2h6v-2zm-2-5h-6v2h6zm-8 5v2h6v-2zm-4 0H4v2h2zM4 9h2v2H4zm4 0h6v2H8z"/>
                    </svg>
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: '12px', color: '#525252', margin: '0 0 2px 0' }}>File Size</p>
                    <p style={{ fontSize: '14px', fontWeight: '500', margin: 0, color: '#161616' }}>
                      {selectedDoc.size}
                    </p>
                  </div>
                </div>
              </div>

              {/* AI-Generated Summary */}
              {selectedDoc.summary && (
                <div style={{ marginBottom: '32px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      backgroundColor: '#d0e2ff',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <svg width="16" height="16" viewBox="0 0 32 32" fill="#0f62fe">
                        <path d="M16 2a14 14 0 1 0 14 14A14 14 0 0 0 16 2zm0 26a12 12 0 1 1 12-12 12 12 0 0 1-12 12z"/>
                        <circle cx="16" cy="10.5" r="1.5"/>
                        <path d="M16 13a1 1 0 0 0-1 1v8a1 1 0 0 0 2 0v-8a1 1 0 0 0-1-1z"/>
                      </svg>
                    </div>
                    <h3 style={{ fontSize: '18px', fontWeight: '600', margin: 0, color: '#161616' }}>
                      AI-Generated Summary
                    </h3>
                  </div>
                  <div style={{ 
                    backgroundColor: '#f4f4f4', 
                    borderRadius: '8px', 
                    padding: '20px',
                    border: '1px solid #e0e0e0'
                  }}>
                    <p style={{ margin: 0, color: '#161616', fontSize: '14px', lineHeight: '1.6' }}>
                      {selectedDoc.summary}
                    </p>
                  </div>
                </div>
              )}

              {/* Extracted Information */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    backgroundColor: '#d0e2ff',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <svg width="16" height="16" viewBox="0 0 32 32" fill="#0f62fe">
                      <path d="M27 3H5a2 2 0 0 0-2 2v22a2 2 0 0 0 2 2h22a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm0 2v4H5V5zM5 27V11h22v16z"/>
                      <path d="M10 16h5v2h-5zm0 4h5v2h-5zm0 4h5v2h-5z"/>
                    </svg>
                  </div>
                  <h3 style={{ fontSize: '18px', fontWeight: '600', margin: 0, color: '#161616' }}>
                    Extracted Information
                  </h3>
                </div>
                
                {/* Document Type Tags */}
                <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: '#d0e2ff', borderRadius: '16px' }}>
                    <svg width="14" height="14" viewBox="0 0 32 32" fill="#0f62fe">
                      <path d="M27 22.141V18a2 2 0 0 0-2-2h-8v-4h2a2.002 2.002 0 0 0 2-2V4a2.002 2.002 0 0 0-2-2h-6a2.002 2.002 0 0 0-2 2v6a2.002 2.002 0 0 0 2 2h2v4H7a2 2 0 0 0-2 2v4.142a4 4 0 1 0 2 0V18h8v4.142a4 4 0 1 0 2 0V18h8v4.141a4 4 0 1 0 2 0zM13 4h6l.001 6H13zM6 26a2 2 0 1 1-2-2 2.002 2.002 0 0 1 2 2zm10 0a2 2 0 1 1-2-2 2.003 2.003 0 0 1 2 2zm10 0a2 2 0 1 1-2-2 2.002 2.002 0 0 1 2 2z"/>
                    </svg>
                    <span style={{ fontSize: '12px', fontWeight: '500', color: '#0f62fe' }}>
                      Type: {selectedDoc.type}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: '#d0e2ff', borderRadius: '16px' }}>
                    <svg width="14" height="14" viewBox="0 0 32 32" fill="#0f62fe">
                      <path d="M16 2a14 14 0 1 0 14 14A14 14 0 0 0 16 2zm-2 19.59l-5-5L10.59 15 14 18.41 21.41 11l1.416 1.41z"/>
                    </svg>
                    <span style={{ fontSize: '12px', fontWeight: '500', color: '#0f62fe' }}>
                      {selectedDoc.sections} sections analyzed
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: '#e0e0e0', borderRadius: '16px' }}>
                    <svg width="14" height="14" viewBox="0 0 32 32" fill="#525252">
                      <path d="M4 20v2h4.586L2 28.586 3.414 30 10 23.414V28h2v-8H4zm16-8h8v2h-8zm0 8h8v2h-8zm-8-14V4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-4v2h4a4 4 0 0 0 4-4V4a4 4 0 0 0-4-4H14a4 4 0 0 0-4 4v2h2z"/>
                    </svg>
                    <span style={{ fontSize: '12px', fontWeight: '500', color: '#525252' }}>
                      {selectedDoc.chars} chars
                    </span>
                  </div>
                </div>

                {/* Important Clauses */}
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <div style={{
                      width: '24px',
                      height: '24px',
                      backgroundColor: '#fff1f1',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <svg width="12" height="12" viewBox="0 0 32 32" fill="#da1e28">
                        <path d="M16 2a14 14 0 1 0 14 14A14 14 0 0 0 16 2zm0 26a12 12 0 1 1 12-12 12 12 0 0 1-12 12z"/>
                        <path d="M14.5 7h3v11h-3zm0 13h3v3h-3z"/>
                      </svg>
                    </div>
                    <h4 style={{ fontSize: '16px', fontWeight: '600', margin: 0, color: '#161616' }}>
                      Important Clauses or Conditions
                    </h4>
                  </div>
                  <div style={{ 
                    borderLeft: '4px solid #da1e28', 
                    backgroundColor: '#fff1f1',
                    padding: '20px',
                    borderRadius: '0 8px 8px 0'
                  }}>
                    <ol style={{ 
                      margin: 0, 
                      paddingLeft: '20px', 
                      color: '#525252', 
                      fontSize: '14px', 
                      lineHeight: '1.6'
                    }}>
                      <li style={{ marginBottom: '12px' }}>The License explicitly affirms your unlimited permission to run the unmodified Program.</li>
                      <li style={{ marginBottom: '12px' }}>The output from running a covered work is covered by this License only if the output, given its content, constitutes a covered work.</li>
                      <li style={{ marginBottom: '12px' }}>Conveying under any other circumstances is permitted solely under the conditions stated below.</li>
                      <li style={{ marginBottom: '12px' }}>Sublicensing is not allowed; section 10 makes it unnecessary.</li>
                      <li>No covered work shall be deemed part of an effective technological measure under any applicable law fulfilling obligations under article 11 of the WIPO copyright treaty adopted on December 20, 1996, or similar laws prohibiting or restricting circumvention of such measures.</li>
                    </ol>
                  </div>
                </div>

                {/* Other Key Information */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <div style={{
                      width: '24px',
                      height: '24px',
                      backgroundColor: '#d0e2ff',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <svg width="12" height="12" viewBox="0 0 32 32" fill="#0f62fe">
                        <path d="M16 2a14 14 0 1 0 14 14A14 14 0 0 0 16 2zm0 26a12 12 0 1 1 12-12 12 12 0 0 1-12 12z"/>
                        <circle cx="16" cy="10.5" r="1.5"/>
                        <path d="M16 13a1 1 0 0 0-1 1v8a1 1 0 0 0 2 0v-8a1 1 0 0 0-1-1z"/>
                      </svg>
                    </div>
                    <h4 style={{ fontSize: '16px', fontWeight: '600', margin: 0, color: '#161616' }}>
                      Other Key Information
                    </h4>
                  </div>
                  <div style={{ 
                    borderLeft: '4px solid #0f62fe', 
                    backgroundColor: '#edf5ff',
                    padding: '20px',
                    borderRadius: '0 8px 8px 0'
                  }}>
                    <ul style={{ 
                      margin: 0, 
                      paddingLeft: '20px', 
                      color: '#525252', 
                      fontSize: '14px', 
                      lineHeight: '1.6'
                    }}>
                      <li style={{ marginBottom: '12px' }}>The AGPL is a free, copyleft license for software and other kinds of works.</li>
                      <li style={{ marginBottom: '12px' }}>The licenses are intended to guarantee your freedom to share and change all versions of a program.</li>
                      <li>This License explicitly affirms your unlimited permission to run the unmodified Program.</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              {/* Actions */}
              <div style={{ 
                marginTop: '32px', 
                paddingTop: '24px', 
                borderTop: '1px solid #e0e0e0',
                display: 'flex', 
                gap: '12px', 
                justifyContent: 'flex-end',
                flexWrap: 'wrap'
              }}>
                <button
                  onClick={() => setShowDetails(false)}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: 'transparent',
                    color: '#0f62fe',
                    border: '1px solid #0f62fe',
                    borderRadius: '4px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#e8f4ff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}>
                  <svg width="16" height="16" viewBox="0 0 32 32" fill="currentColor">
                    <path d="M24 9.4L22.6 8 16 14.6 9.4 8 8 9.4l6.6 6.6L8 22.6 9.4 24l6.6-6.6 6.6 6.6 1.4-1.4-6.6-6.6L24 9.4z"/>
                  </svg>
                  Close
                </button>
                <button
                  onClick={() => {
                    const fileContent = `# ${selectedDoc.name}
Document Analysis

## AI-Generated Summary
${selectedDoc.summary || 'No summary available'}

## Important Clauses or Conditions:
1. The License explicitly affirms your unlimited permission to run the unmodified Program.
2. The output from running a covered work is covered by this License only if the output, given its content, constitutes a covered work.
3. Conveying under any other circumstances is permitted solely under the conditions stated below.
4. Sublicensing is not allowed; section 10 makes it unnecessary.
5. No covered work shall be deemed part of an effective technological measure under any applicable law fulfilling obligations under article 11 of the WIPO copyright treaty adopted on December 20, 1996, or similar laws prohibiting or restricting circumvention of such measures.

## Other Key Information:
• The AGPL is a free, copyleft license for software and other kinds of works.
• The licenses are intended to guarantee your freedom to share and change all versions of a program.
• This License explicitly affirms your unlimited permission to run the unmodified Program.

---
Document processed by IBM Document Intelligence
Uploaded: ${selectedDoc.uploadedAt}
Processed: ${selectedDoc.processedAt}
File Size: ${selectedDoc.size}`;

                    const blob = new Blob([fileContent], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = selectedDoc.name.replace(/\.[^/.]+$/, "") + '_analysis.txt';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  }}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: '#0f62fe',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0353e9'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0f62fe'}>
                  <svg width="16" height="16" viewBox="0 0 32 32" fill="white">
                    <path d="M26 24v4H6v-4H4v4a2 2 0 0 0 2 2h20a2 2 0 0 0 2-2v-4zM16 18L6 8l1.4-1.4 7.6 7.6V2h2v12.2l7.6-7.6L26 8z"/>
                  </svg>
                  Download Original Document
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}