import {
    Document,
    Time,
    Upload,
    ArrowRight,
    Chip,
    Cognitive
} from '@carbon/icons-react';
import {
    Row,
    Column,
    Button,
    Tag,
    Tile,
} from '@carbon/react';
import Icons from './Icons'

//HomeTab Component
const HomePage = ({ documents, onNavigate }) => {
    const processedCount = documents.filter(d => d.status === 'ready').length;
    const processingCount = documents.filter(d => d.status === 'processing').length;

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
            padding: '2rem',
        }}>
            {/* Hero Section */}
            <Tile className="hero-tile">
                <Row>
                    <Column lg={12}>
                        <div className="hero-content">
                            <div className="tag-group">
                                <Tag style={{ background: 'rgba(255, 255, 255, 0.2)', borderRadius: '0.5rem' }}>IBM Spyre Powered</Tag>
                                <Tag style={{ background: 'rgba(255, 255, 255, 0.2)', borderRadius: '0.5rem' }}>Enterprise Ready</Tag>
                            </div>
                            <h1 className="hero-title">Welcome to Document Intelligence</h1>
                            <p className="hero-description">
                                Transform your documents into actionable insights with AI-powered analysis.
                                Upload, analyze, and chat with your documents using advanced natural language processing.
                            </p>
                            <div className="hero-actions">
                                <Button
                                    kind="tertiary"
                                    onClick={() => onNavigate(1)}
                                    renderIcon={(props) => <Upload size={20} {...props} />}
                                    size="lg"
                                >
                                    Upload Documents
                                </Button>
                                <Button
                                    onClick={() => onNavigate(3)}
                                    kind="tertiary"
                                    renderIcon={(props) => <ArrowRight size={20} {...props} />}
                                    size="lg"
                                >
                                    Setup Guide
                                </Button>
                            </div>
                        </div>
                    </Column>
                </Row>
            </Tile>

            {/* Stats Overview */}
            <div style={{
                background: 'linear-gradient(135deg, #f6f5f5bf 0%, #e9eff0ff 100%)',
                border: '2px solid #e0e0e0',
                borderRadius: '12px',
                padding: '2rem',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '1.5rem'
                }}>
                    <div style={{
                        background: 'linear-gradient(135deg, #ffffff 0%, #f8fbff 100%)',
                        border: '1px solid rgba(15, 98, 254, 0.1)',
                        padding: '1.75rem',
                        borderRadius: '16px',
                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
                        transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                    }} onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.08)';
                    }} onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.04)';
                    }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <div style={{
                                width: '48px',
                                height: '48px',
                                background: 'linear-gradient(135deg, #0f62fe 0%, #0353e9 100%)',
                                borderRadius: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 4px 12px rgba(15, 98, 254, 0.3)'
                            }}>
                                <span style={{ color: 'white' }}><Icons.FileText size={24}/></span>
                            </div>
                            <span style={{ width: '20px', height: '20px', color: '#24a148' }}><Icons.TrendingUp /></span>
                        </div>
                        <p style={{ color: '#525252', fontSize: '0.875rem', marginBottom: '0.5rem', fontWeight: 500 }}>Total Documents</p>
                        <p style={{ color: '#161616', fontSize: '2rem', marginBottom: '0.75rem', fontWeight: 600 }}>{documents.length}</p>
                        <Tag type="green" style={{ borderRadius: '12px', fontSize: '0.75rem', fontWeight: 500 }}>
                            {documents.filter(d => {
                                const dayAgo = new Date();
                                dayAgo.setDate(dayAgo.getDate() - 1);
                                return d.uploadedAt > dayAgo;
                            }).length} uploaded today
                        </Tag>
                    </div>

                    <div style={{
                        background: 'linear-gradient(135deg, #ffffff 0%, #f8fbff 100%)',
                        border: '1px solid rgba(36, 161, 72, 0.1)',
                        padding: '1.75rem',
                        borderRadius: '16px',
                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
                        transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                    }} onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.08)';
                    }} onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.04)';
                    }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <div style={{
                                width: '48px',
                                height: '48px',
                                background: 'linear-gradient(135deg, #24a148 0%, #198038 100%)',
                                borderRadius: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 4px 12px rgba(36, 161, 72, 0.3)'
                            }}>
                                <span style={{ width: '24px', height: '24px', color: 'white' }}><Icons.CheckCircle /></span>
                            </div>
                            <span style={{ width: '20px', height: '20px', color: '#0f62fe' }}><Icons.Sparkles /></span>
                        </div>
                        <p style={{ color: '#525252', fontSize: '0.875rem', marginBottom: '0.5rem', fontWeight: 500 }}>Processed</p>
                        <p style={{ color: '#161616', fontSize: '2rem', marginBottom: '0.75rem', fontWeight: 600 }}>{processedCount}</p>
                        <Tag type="blue" style={{ borderRadius: '12px', fontSize: '0.75rem', fontWeight: 500 }}>
                            AI analysis complete
                        </Tag>
                    </div>

                    <div style={{
                        background: 'linear-gradient(135deg, #ffffff 0%, #f8fbff 100%)',
                        border: '1px solid rgba(138, 63, 252, 0.1)',
                        padding: '1.75rem',
                        borderRadius: '16px',
                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
                        transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                    }} onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.08)';
                    }} onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.04)';
                    }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <div style={{
                                width: '48px',
                                height: '48px',
                                background: 'linear-gradient(135deg, #8a3ffc 0%, #6929c4 100%)',
                                borderRadius: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 4px 12px rgba(138, 63, 252, 0.3)'
                            }}>
                                <span style={{  color: 'white' }}><Cognitive size={24}/></span>
                            </div>
                            {processingCount > 0 && (
                                <div style={{
                                    width: '8px',
                                    height: '8px',
                                    background: '#0f62fe',
                                    borderRadius: '50%',
                                    animation: 'pulse 2s infinite'
                                }} />
                            )}
                        </div>
                        <p style={{ color: '#525252', fontSize: '0.875rem', marginBottom: '0.5rem', fontWeight: 500 }}>Processing</p>
                        <p style={{ color: '#161616', fontSize: '2rem', marginBottom: '0.75rem', fontWeight: 600 }}>{processingCount}</p>
                        <Tag type="purple" style={{ borderRadius: '12px', fontSize: '0.75rem', fontWeight: 500 }}>
                            {processingCount === 0 ? 'Queue empty' : 'In progress'}
                        </Tag>
                    </div>
                </div>
            </div>

            {/* Key Features Section */}
            <div style={{
                background: 'linear-gradient(135deg, #f6f5f5bf 0%, #e9eff0ff 100%)',
                border: '2px solid #e0e0e0',
                borderRadius: '12px',
                padding: '2rem',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}>
                <h4 style={{
                    color: '#161616',
                    marginBottom: '2rem',
                    fontWeight: 500,
                    textAlign: 'left'
                }}>
                    Key Features
                </h4>

                {/* Recent Activity and Quick Actions */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1fr',
                    gap: '2rem',
                    alignItems: 'start'
                }}>
                    {/* Left Column - Recent Activity */}
                    <div style={{
                        background: 'white',
                        border: '2px solid #e0e0e0',
                        borderRadius: '12px',
                        padding: '1.5rem'
                    }}>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
                            gap: '1.5rem',
                            marginBottom: '2rem'
                        }}>
                            {/* AI-Powered Analysis */}
                            <div style={{
                                background: 'white',
                                border: '2px solid #3773e26d',
                                borderRadius: '12px',
                                padding: '1.5rem',
                                transition: 'all 0.3s ease',
                                background: 'linear-gradient(to bottom right, #e3e9f593, #0354e91f)',
                                padding: '1.75rem',
                                transition: 'all 0.3s ease',
                                cursor: 'pointer'
                            }} onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 8px 32px rgba(15, 98, 254, 0.15)';
                            }} onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = 'none';
                            }}>
                                <div style={{
                                    width: '48px',
                                    height: '48px',
                                    background: 'linear-gradient(to bottom right, #0f62fe, #0353e9)',
                                    borderRadius: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginBottom: '1rem'
                                }}>
                                    <span style={{ width: '24px', height: '24px', color: 'white' }}><Icons.Sparkles /></span>
                                </div>
                                <h3 style={{
                                    color: '#161616',
                                    marginBottom: '0.75rem',
                                    fontWeight: 500,
                                    fontSize: '1.125rem'
                                }}>
                                    AI-Powered Document Analysis
                                </h3>
                                <p style={{
                                    color: '#525252',
                                    lineHeight: '1.625',
                                    fontSize: '0.875rem',
                                    margin: 0
                                }}>
                                    Extract key insights, entities, and sentiment from your documents automatically using IBM ReadHat Inference server with Spyre.
                                </p>
                            </div>

                            {/* Document Analytics */}
                            <div style={{
                                background: 'white',
                                border: '2px solid #96ea87a7',
                                borderRadius: '12px',
                                padding: '1.5rem',
                                transition: 'all 0.3s ease',
                                background: 'linear-gradient(to bottom right, #9be6911d, #94d29574)',
                                padding: '1.75rem',
                                transition: 'all 0.3s ease',
                                cursor: 'pointer'
                            }} onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 8px 32px rgba(15, 98, 254, 0.15)';
                            }} onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = 'none';
                            }}>
                                <div style={{
                                    width: '48px',
                                    height: '48px',
                                    background: 'linear-gradient(to bottom right, #24a148, #198038)',
                                    borderRadius: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginBottom: '1rem'

                                }}>
                                    <span style={{ width: '24px', height: '24px', color: 'white' }}><Icons.BarChart /></span>
                                </div>
                                <h3 style={{
                                    color: '#161616',
                                    marginBottom: '0.75rem',
                                    fontWeight: 500,
                                    fontSize: '1.125rem'
                                }}>
                                    LLM Inference with RHAIIS
                                </h3>
                                <p style={{
                                    color: '#525252',
                                    lineHeight: '1.625',
                                    fontSize: '0.875rem',
                                    margin: 0
                                }}>
                    High-performance LLM inference powered by Red Hat AI Inference Server and IBM Spyre for fast, scalable document processing.
                                </p>
                            </div>

                            {/* Intelligent Chat */}
                            <div style={{
                                background: 'white',
                                border: '2px solid #c3a6eeff',
                                borderRadius: '12px',
                                padding: '1.5rem',
                                transition: 'all 0.3s ease',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                                background: 'linear-gradient(to bottom right, #bebac341, #9881b849)',
                                padding: '1.75rem',
                                transition: 'all 0.3s ease',
                                cursor: 'pointer'
                            }} onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 8px 32px rgba(15, 98, 254, 0.15)';
                            }} onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = 'none';
                            }}>
                                <div style={{
                                    width: '48px',
                                    height: '48px',
                                    background: 'linear-gradient(to bottom right, #8a3ffc, #6929c4)',
                                    borderRadius: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginBottom: '1rem'
                                }}>
                                    <span style={{ color: 'white' }}><Icons.MessageSquare size={24} /></span>
                                </div>
                                <h3 style={{
                                    color: '#161616',
                                    marginBottom: '0.75rem',
                                    fontWeight: 500,
                                    fontSize: '1.125rem'
                                }}>
                                 RAG-based AI Chatbot
                                </h3>
                                <p style={{
                                    color: '#525252',
                                    lineHeight: '1.625',
                                    fontSize: '0.875rem',
                                    margin: 0
                                }}>
                                   Retrieval-Augmented Generation powered chatbot that answers questions using your documents with IBM Spyre's contextual understanding.
                                </p>
                            </div>

                            {/* Powered by IBM Spyre */}
                            <div style={{
                                background: 'white',
                                border: '2px solid #df7379c6',
                                borderRadius: '12px',
                                padding: '1.5rem',
                                transition: 'all 0.3s ease',
                                background: 'linear-gradient(to bottom right, #c78f9169, #ce8b9018)',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                                padding: '1.75rem',
                                transition: 'all 0.3s ease',
                                cursor: 'pointer'
                            }} onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 8px 32px rgba(15, 98, 254, 0.15)';
                            }} onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = 'none';
                            }}>
                                <div style={{
                                    width: '48px',
                                    height: '48px',
                                    background: 'linear-gradient(to bottom right, #da1e28, #ba1b23)',
                                    borderRadius: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginBottom: '1rem'
                                }}>
                                    <span style={{color: 'white' }}><Chip size={24}/></span>
                                </div>
                                <h3 style={{
                                    color: '#161616',
                                    marginBottom: '0.75rem',
                                    fontWeight: 500,
                                    fontSize: '1.125rem'
                                }}>
                                    Powered by IBM Spyre
                                </h3>
                                <p style={{
                                    color: '#525252',
                                    lineHeight: '1.625',
                                    fontSize: '0.875rem',
                                    margin: 0
                                }}>
                    Enterprise-grade AI infrastructure with IBM Spyre's advanced semantic processing and secure document intelligence platform.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Recent Activity */}
                    <div style={{
                        background: "white",
                        border: "2px solid #e0e0e0",
                        borderRadius: "12px",
                        padding: "1.5rem",
                        display: "flex",
                        flexDirection: "column",
                        gap: "1.25rem",
                    }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <Time style={{ color: "#0f62fe", height: "24px", width: "24px" }} />
                            <h3 style={{
                                color: "#161616",
                                margin: 0,
                                fontWeight: 600,
                                fontSize: "1rem",
                            }}>
                                Recent Activity
                            </h3>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                            {documents.length === 0 ? (
                                // Placeholder documents
                                [
                                    { name: "No documents available." },
                                 
                                ].map((doc, index) => (
                                    <div key={index} style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        padding: "12px 0",
                                        borderBottom: index < 2 ? "1px solid #f0f0f0" : "none",
                                        opacity: 0.5
                                    }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                            <div style={{
                                                width: "40px",
                                                height: "40px",
                                                background: "#f4f4f4",
                                                border: "1px solid #e0e0e0",
                                                borderRadius: "8px",
                                                display: "flex",
                                                justifyContent: "center",
                                                alignItems: "center",
                                            }}>
                                                <Document style={{ color: "#0f62fe", width: "20px", height: "20px" }} />
                                            </div>
                                            <span style={{ color: "#525252", fontWeight: 500, fontSize: "0.875rem" }}>
                                                {doc.name}
                                            </span>
                                        </div>
                                        <span style={{
                                            color: "#a8a8a8",
                                            backgroundColor: "#f4f4f4",
                                            padding: "4px 12px",
                                            borderRadius: "12px",
                                            fontSize: "0.75rem",
                                            fontWeight: 600,
                                        }}>
                                            {doc.status}
                                        </span>
                                    </div>
                                ))
                            ) : (
                                // Real uploaded documents
                                documents.slice(0, 3).map((doc, index) => (
                                    <div key={doc.id} style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        padding: "12px 0",
                                        borderBottom: index < Math.min(2, documents.length - 1) ? "1px solid #f0f0f0" : "none",
                                    }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                            <div style={{
                                                width: "40px",
                                                height: "40px",
                                                background: "#f4f4f4",
                                                border: "1px solid #e0e0e0",
                                                borderRadius: "8px",
                                                display: "flex",
                                                justifyContent: "center",
                                                alignItems: "center",
                                            }}>
                                                <Document style={{ color: "#0f62fe", width: "20px", height: "20px" }} />
                                            </div>
                                            <span style={{
                                                color: "#161616",
                                                fontWeight: 500,
                                                fontSize: "0.875rem",
                                                maxWidth: "200px",
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                                whiteSpace: "nowrap"
                                            }}>
                                                {doc.name}
                                            </span>
                                        </div>
                                        <span style={{
                                            color: doc.status === 'ready' ? "#24a148" : "#0f62fe",
                                            backgroundColor: doc.status === 'ready' ? "#d1f0d4" : "#d0e2ff",
                                            padding: "4px 12px",
                                            borderRadius: "12px",
                                            fontSize: "0.75rem",
                                            fontWeight: 600,
                                        }}>
                                            {doc.status === 'ready' ? 'Ready' : 'Processing'}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div style={{
                background: 'linear-gradient(to bottom right, white, #f4f4f4)',
                border: '2px solid #e0e0e0',
                borderRadius: '12px',
                padding: '1.5rem',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}>
                <h4 style={{ color: '#161616', marginBottom: '1.5rem', fontWeight: 500 }}>Quick Actions</h4>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '1rem'
                }}>
                    <button onClick={() => onNavigate(1)} style={{
                        background: 'transparent',
                        border: '2px solid #e0e0e0',
                        padding: '1.5rem',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.2s'
                    }}>
                        <div style={{ width: '24px', height: '24px', color: '#0f62fe', marginBottom: '0.5rem' }}><Icons.Upload /></div>
                        <span style={{ color: '#161616', display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>Upload Documents</span>
                        <span style={{ color: '#525252', fontSize: '0.75rem', display: 'block' }}>Add new files for analysis</span>
                    </button>

                    <button onClick={() => onNavigate(2)} style={{
                        background: 'transparent',
                        border: '2px solid #e0e0e0',
                        padding: '1.5rem',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.2s'
                    }}>
                        <div style={{ width: '24px', height: '24px', color: '#0f62fe', marginBottom: '0.5rem' }}><Icons.MessageSquare size={24}/></div>
                        <span style={{ color: '#161616', display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>AI Assistant</span>
                        <span style={{ color: '#525252', fontSize: '0.75rem', display: 'block' }}>Chat with your documents</span>
                    </button>

                    <button onClick={() => onNavigate(3)} style={{
                        background: 'transparent',
                        border: '2px solid #e0e0e0',
                        padding: '1.5rem',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.2s'
                    }}>
                        <div style={{ width: '24px', height: '24px', color: '#0f62fe', marginBottom: '0.5rem' }}><Icons.Shield /></div>
                        <span style={{ color: '#161616', display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>Setup Guide</span>
                        <span style={{ color: '#525252', fontSize: '0.75rem', display: 'block' }}>Configure your workspace</span>
                    </button>
                </div>
            </div>
        </div>
    );
};
export default HomePage;