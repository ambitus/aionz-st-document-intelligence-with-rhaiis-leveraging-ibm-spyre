
import React, { useState } from 'react';
import {
  Watson,
  Renew,
  Settings,
  ArrowUpRight,
} from '@carbon/icons-react';
import Icons from './Icons'

//SetupGuideTab Componets
const SetupGuide = () => {
  const [completedSteps, setCompletedSteps] = useState([1]);
  const [currentStep, setCurrentStep] = useState(2);

  const steps = [
    {
      id: 1,
      title: 'Upload Your First Document',
      //   status: 'Not started',
      description: 'Start by uploading a document to test the analysis capabilities.',
      substeps: [
        'Click "Upload Documents"',
        'Select a PDF, DOCX, or TXT file',
        'Wait for AI processing',
        'Review the generated insights'
      ]
    },
    {
      id: 2,
      title: 'Explore AI Features',
      //   status: 'Not started',
      description: 'Learn how to use the AI assistant and analytics dashboard.',
      substeps: [
        'Try the AI chat feature',
        'Ask questions about your documents',
        'View analytics dashboard',
        'Export reports'
      ]
    }
  ];

  const getStepIcon = (status) => {
    if (status === 'Completed') {
      return (
        <div style={{
          width: '48px',
          height: '48px',
          background: '#24a148',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>

          <Icons.CheckCircle style={{ color: 'white', width: '24px', height: '24px' }} />
        </div>
      );
    } else if (status === 'In Progress') {
      return (
        <div style={{
          width: '48px',
          height: '48px',
          background: '#0f62fe',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Renew size={24} style={{ color: 'white' }} className="animate-spin" />
        </div>
      );
    } else {
      return (
        <div style={{
          width: '48px',
          height: '48px',
          background: '#0f62fe',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#525252',
          fontSize: '1.25rem',
          fontWeight: '600'
        }}>
          <ArrowUpRight size={24} style={{ color: 'white' }} className="animate-spin" />
        </div>
      );
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      'Completed': { background: '#d1f0d4', color: '#24a148' },
      'In Progress': { background: '#d0e2ff', color: '#0f62fe' },
      //   'Not started': { background: '#e0e0e0', color: '#525252' }
    };

    return (
      <span style={{
        ...styles[status],
        padding: '0.25rem 0.75rem',
        borderRadius: '12px',
        fontSize: '0.75rem',
        fontWeight: 600
      }}>
        {status}
      </span>
    );
  };

  const completionPercentage = (completedSteps.length) * 100;
  //const completionPercentage = (completedSteps.length / steps.length) * 100;


  return (
    <div style={{
      padding: '2rem'}}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(to right, #0f62fe, #0353e9)',
        borderRadius: '12px',
        padding: '2rem',
        marginBottom: '2rem',
        color: 'white',
        position: 'relative',
        overflow: 'hidden',

      }}>
        <div style={{
          position: 'absolute',
          top: '1.5rem',
          left: '1.5rem',
          background: 'rgba(255, 255, 255, 0.2)',
          padding: '0.5rem 0.75rem',
          borderRadius: '4px',
          fontSize: '0.75rem',
          fontWeight: 600
        }}>
          Getting Started
        </div>
        <div style={{
          position: 'absolute',
          background: 'rgba(255, 255, 255, 0.09)',
          padding: '1rem 1rem',
          borderRadius: '5px',
          top: '3rem',
          right: '3rem'
        }}>
          <Settings size={40} style={{ color: 'white' }} />
        </div>
        <h1 style={{
          fontSize: '2rem',
          fontWeight: 450,
          margin: '2rem 0 0.5rem 0'
        }}>
          Setup Guide
        </h1>
        <p style={{
          fontSize: '1rem',
          opacity: 0.9,
          margin: 0
        }}>
          Learn how to use IBM Document Intelligence to analyze your documents with AI.
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr',
        gap: '2rem'
      }}>
        {/* Left Column - Steps */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem'
        }}>
          {steps.map((step, index) => (
            <div key={step.id} style={{
              background: 'white',
              border: '1px solid #e0e0e0',
              borderRadius: '12px',
              padding: '1.5rem',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
            }}>
              <div style={{
                display: 'flex',
                gap: '1.5rem',
                marginBottom: '1rem'
              }}>
                {getStepIcon(step.status)}
                <div style={{ flex: 1 }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'start',
                    marginBottom: '0.5rem'
                  }}>
                    <div>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        marginBottom: '0.25rem'
                      }}>
                        <span style={{
                          color: '#525252',
                          fontSize: '0.875rem',
                          fontWeight: 500
                        }}>
                          Step {step.id}
                        </span>
                        {getStatusBadge(step.status)}
                      </div>
                      <h3 style={{
                        color: '#161616',
                        fontSize: '1.125rem',
                        fontWeight: 500,
                        margin: '0 0 0.5rem 0'
                      }}>
                        {step.title}
                      </h3>
                      <p style={{
                        color: '#525252',
                        fontSize: '0.875rem',
                        margin: 0
                      }}>
                        {step.description}
                      </p>
                    </div>
                  </div>

                  {/* Substeps */}
                  <div style={{
                    marginTop: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem'
                  }}>
                    {step.substeps.map((substep, idx) => (
                      <div key={idx} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        color: '#525252',
                        fontSize: '0.875rem'
                      }}>

                        <span style={{ width: '16px', height: '16px', color: '#0f62fe' }} ><Icons.ArrowRight /></span>
                        {substep}
                      </div>
                    ))}
                  </div>

                  {step.status === 'Not started' && (
                    <span style={{
                      display: 'inline-block',
                      marginTop: '1rem',
                      background: '#f4f4f4',
                      color: '#525252',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 500
                    }}>
                      Not started
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Right Column - Progress & Resources */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem'
        }}>
          {/* Setup Progress */}
          <div style={{
            background: 'white',
            border: '1px solid #e0e0e0',
            borderRadius: '12px',
            padding: '1.5rem',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
          }}>
            <h3 style={{
              color: '#161616',
              fontSize: '1rem',
              fontWeight: 500,
              margin: '0 0 1.5rem 0'
            }}>
              Setup Progress
            </h3>

            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '0.5rem'
              }}>
                <span style={{ color: '#525252', fontSize: '0.875rem' }}>Completion</span>
                <span style={{ color: '#0f62fe', fontSize: '0.875rem', fontWeight: 600 }}>
                  {Math.round(completionPercentage)}%
                </span>
              </div>
              <div style={{
                width: '100%',
                height: '8px',
                background: '#e0e0e0',
                borderRadius: '4px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${completionPercentage}%`,
                  height: '100%',
                  background: '#0f62fe',
                  transition: 'width 0.3s ease'
                }} />
              </div>
            </div>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '0.75rem',
                background: '#fafafa',
                borderRadius: '6px'
              }}>
                <span style={{ color: '#525252', fontSize: '0.875rem' }}>Steps Completed</span>
                <span style={{ color: '#161616', fontWeight: 600, fontSize: '0.875rem' }}>
                  {steps.length} of {steps.length}
                </span>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '0.75rem',
                background: '#fafafa',
                borderRadius: '6px'
              }}>
                <span style={{ color: '#525252', fontSize: '0.875rem' }}>Estimated Time</span>
                <span style={{ color: '#161616', fontWeight: 600, fontSize: '0.875rem' }}>15 min</span>
              </div>
            </div>
          </div>

          {/* Quick Start */}
          <div style={{
            background: '#d1f0d4',
            border: '1px solid #a7d9a8',
            borderRadius: '12px',
            padding: '1.5rem'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '1rem'
            }}>
              <span style={{ color: '#24a148', width: '20px', height: '20px' }}><Icons.CheckCircle /></span>
              <h3 style={{
                color: '#161616',
                fontSize: '1rem',
                fontWeight: 500,
                margin: 0
              }}>
                Quick Start
              </h3>
            </div>
            <p style={{
              color: '#161616',
              fontSize: '0.875rem',
              marginBottom: '1rem'
            }}>
              Everything is configured and ready to use!
            </p>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem'
            }}>
              {[
                'IBM ReadHat Inference server with Spyre Connected',
                'Cloud Storage Ready',
                'AI Models Active'
              ].map((item, idx) => (
                <div key={idx} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  color: '#161616',
                  fontSize: '0.875rem'
                }}>
                  <span style={{ color: '#24a148', width: '16px', height: '16px' }}><Icons.CheckCircle /></span>
                  {item}
                </div>
              ))}
            </div>
          </div>

          {/* Resources */}
          <div style={{
            background: 'white',
            border: '1px solid #e0e0e0',
            borderRadius: '12px',
            padding: '1.5rem',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
          }}>
            <h3 style={{
              color: '#161616',
              fontSize: '1rem',
              fontWeight: 500,
              margin: '0 0 1rem 0'
            }}>
              Resources
            </h3>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}>
              {[
                { icon: Icons.FileText, label: 'Documentation' },
                { icon: Watson, label: 'IBM ReadHat Inference server with Spyre Docs' },
                { icon: Icons.MessageSquare, label: 'Video Tutorials' }
              ].map((resource, idx) => (
                <a key={idx} href="#" style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem',
                  background: '#fafafa',
                  borderRadius: '6px',
                  textDecoration: 'none',
                  color: '#161616',
                  fontSize: '0.875rem',
                  transition: 'background 0.2s'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <resource.icon size={16} style={{ color: '#0f62fe' }} />
                    {resource.label}
                  </div>
                  <span style={{ width: '16px', height: '16px', color: '#525252' }}><Icons.ArrowRight /></span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SetupGuide;