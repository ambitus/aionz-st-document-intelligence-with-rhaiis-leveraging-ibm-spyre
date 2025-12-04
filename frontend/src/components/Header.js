import React, { useState, useRef, useEffect } from 'react';
import {
    Login,
    Logout,
    Cloud
} from '@carbon/icons-react';
import {
    Header,
    HeaderContainer,
    HeaderGlobalBar,
    HeaderGlobalAction,
} from '@carbon/react';
import Icons from './Icons'


// Header Component
const CustomHeader = ({ onLogout, currentUser }) => {
    const [showUserMenu, setShowUserMenu] = useState(false);
    const menuRef = useRef(null);
const [serviceHealthy, setServiceHealthy] = useState(false);


    // Close menu when clicking outside
useEffect(() => {
    const handleClickOutside = (event) => {
        if (menuRef.current && !menuRef.current.contains(event.target)) {
            setShowUserMenu(false);
        }
    };

    const checkServiceHealth = async () => {
        try {
            const res = await fetch("http://129.40.90.163:8002/rhaiis/health", {
                method: "GET",
                headers: { "accept": "application/json" }
            });

            const data = await res.json();
            setServiceHealthy(data.reachable);
        } catch (e) {
            console.error("Health check failed:", e);
            setServiceHealthy(false);
        }
    };

    // Run once on load
    checkServiceHealth();

    // OPTIONAL: auto polling every 60 seconds
    const interval = setInterval(checkServiceHealth, 60000);

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        clearInterval(interval);
    };
}, []);



    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 1000,
            backgroundColor: 'rgba(22, 22, 22, 0.95)'
        }}>
            <HeaderContainer
                render={({ isSideNavExpanded, onClickSideNavExpand }) => (
                    <Header
                        aria-label="IBM Document Intelligence"
                        style={{
                            background: 'linear-gradient(135deg, #0f1f3f 0%, #1a365d 50%, #0f1f3f 100%)',
                            color: 'white',
                            borderBottom: '2px solid #0f62fe',
                            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                            position: 'relative',
                            overflow: 'visible',
                            padding: 0,
                            height: 'auto'
                        }}
                    >
                        {/* Background pattern */}
                        <div style={{
                            position: 'absolute',
                            inset: 0,
                            opacity: 0.05,
                            backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
                            backgroundSize: '32px 32px',
                            pointerEvents: 'none'
                        }} />

                        <div style={{
                            margin: '0 auto',
                            padding: '1.25rem 1.5rem',
                            position: 'relative',
                            width: '100%'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                {/* Left side - Logo and Title */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <div style={{ position: 'relative' }}>
                                            <div style={{
                                                width: '48px',
                                                height: '48px',
                                                background: 'linear-gradient(to bottom right, #0f62fe, #0353e9, #002d9c)',
                                                borderRadius: '12px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                                                transition: 'transform 0.2s'
                                            }}>
                                                <span style={{ color: 'white', fontWeight: 500 }}>IBM</span>
                                            </div>
                                        </div>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                                <h1 style={{ color: 'white', fontSize: '1.25rem', fontWeight: 500, margin: 0 }}>Document Intelligence</h1>
                                            </div>
                                            <p style={{ color: '#c6c6c6', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                                                <span style={{ width: '18px', height: '18px', color: '#0f62fe' }}><Icons.Sparkles /></span>
                                                AI-Powered Document Analysis
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Right side - Status and Actions */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    {/* Status Panel */}
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '1.5rem',
                                        padding: '0.5rem 1.5rem',
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        backdropFilter: 'blur(8px)',
                                        borderRadius: '12px',
                                        border: '1px solid rgba(255, 255, 255, 0.1)'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <div style={{ position: 'relative' }}>
                                                <div style={{ width: '20px', height: '20px', color: '#42be65' }}><Cloud /></div>
                                                <div style={{
                                                    position: 'absolute',
                                                    top: '-4px',
                                                    right: '-4px',
                                                    width: '8px',
                                                    height: '8px',
                                                    background: '#42be65',
                                                    borderRadius: '50%'
                                                }} />
                                            </div>
                                            <div style={{ fontSize: '0.875rem' }}>
                                                {/* <p style={{ color: '#c6c6c6', fontSize: '0.75rem', margin: 0 }}>AI</p>
                                                <p style={{ color: '#42be65', fontWeight: 500, margin: 0 }}>Online</p> */}
                                                <p style={{ color: '#c6c6c6', fontSize: '0.75rem', margin: 0 }}>AI</p>
                                                <p style={{ 
                                                    color: serviceHealthy ? '#42be65' : '#da1e28',
                                                    fontWeight: 500, 
                                                    margin: 0 
                                                }}>
                                                    {serviceHealthy ? "Online" : "Offline"}
                                                </p>

                                            </div>
                                        </div>

                                        <div style={{ width: '1px', height: '32px', background: 'rgba(255, 255, 255, 0.2)' }} />

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <div style={{ width: '20px', height: '20px', color: '#0f62fe' }}><Icons.Activity /></div>
                                            <div style={{ fontSize: '0.875rem' }}>
                                                <p style={{ color: '#c6c6c6', fontSize: '0.75rem', margin: 0 }}>RHAIIS API</p>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                    {/* <div style={{ width: '12px', height: '12px', color: '#42be65' }}><Icons.CheckCircle /></div>
                                                    <span style={{ color: '#42be65', fontWeight: 500 }}>Active</span> */}
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                    <div style={{ 
                                                        width: '12px', 
                                                        height: '12px', 
                                                        color: serviceHealthy ? '#42be65' : '#da1e28'
                                                    }}>
                                                        {serviceHealthy ? <Icons.CheckCircle /> : <Icons.CloseCircle />}
                                                    </div>

                                                    <span style={{ 
                                                        color: serviceHealthy ? '#42be65' : '#da1e28',
                                                        fontWeight: 500 
                                                    }}>
                                                        {serviceHealthy ? "Active" : "Not Active"}
                                                    </span>
                                                </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ width: '1px', height: '32px', background: 'rgba(255, 255, 255, 0.2)' }} />

                                        <div style={{ fontSize: '0.875rem' }}>
                                            <p style={{ color: '#c6c6c6', fontSize: '0.75rem', margin: 0 }}>Region</p>
                                            <p style={{ color: 'white', fontWeight: 500, margin: 0 }}>US-East</p>
                                        </div>
                                    </div>

                                    {/* Current User Display */}
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.75rem',
                                        padding: '0.5rem 1rem',
                                        background: 'rgba(255, 255, 255, 0.1)',
                                        backdropFilter: 'blur(8px)',
                                        borderRadius: '12px',
                                        border: '1px solid rgba(255, 255, 255, 0.2)'
                                    }}>
                                        <div style={{
                                            width: '32px',
                                            height: '32px',
                                            background: 'linear-gradient(135deg, #0f62fe 0%, #0353e9 100%)',
                                            borderRadius: '50%',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: 'white',
                                            fontWeight: 600,
                                            fontSize: '0.875rem'
                                        }}>
                                            {currentUser?.username?.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p style={{
                                                color: 'white',
                                                fontWeight: 500,
                                                margin: 0,
                                                fontSize: '0.875rem'
                                            }}>
                                                {currentUser?.username}
                                            </p>
                                            <p style={{
                                                color: '#c6c6c6',
                                                fontSize: '0.75rem',
                                                margin: 0,
                                                textTransform: 'capitalize'
                                            }}>
                                                {currentUser?.role}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Header Global Actions */}
                                    <HeaderGlobalBar style={{ gap: '0.5rem', position: 'relative' }}>
                                        <HeaderGlobalAction
                                            aria-label="Notifications"
                                            onClick={() => { }}
                                            style={{
                                                background: 'transparent',
                                                border: 'none',
                                                color: 'white',
                                                padding: '0.5rem',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                width: '40px',
                                                height: '40px',
                                                position: 'relative',
                                                margin: 0
                                            }}
                                        >
                                            <Icons.Bell />
                                            <div style={{
                                                position: 'absolute',
                                                top: '4px',
                                                right: '4px',
                                                width: '8px',
                                                height: '8px',
                                                background: '#da1e28',
                                                borderRadius: '50%'
                                            }} />
                                        </HeaderGlobalAction>

                                        {/* User Menu */}
                                        <div ref={menuRef} style={{ position: 'relative' }}>
                                            <HeaderGlobalAction
                                                aria-label="User"
                                                onClick={() => setShowUserMenu(!showUserMenu)}
                                                style={{
                                                    background: showUserMenu ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                                                    border: 'none',
                                                    color: 'white',
                                                    padding: '0.5rem',
                                                    borderRadius: '8px',
                                                    cursor: 'pointer',
                                                    width: '40px',
                                                    height: '40px',
                                                    margin: 0,
                                                    position: 'relative'
                                                }}
                                            >
                                                <Icons.User />
                                            </HeaderGlobalAction>

                                            {/* Dropdown Menu */}
                                            {showUserMenu && (
                                                <div style={{
                                                    position: 'absolute',
                                                    top: '100%',
                                                    right: 0,
                                                    marginTop: '8px',
                                                    background: 'white',
                                                    borderRadius: '8px',
                                                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
                                                    minWidth: '240px',
                                                    overflow: 'hidden',
                                                    zIndex: 9999,
                                                    border: '1px solid #e0e0e0'
                                                }}>
                                                    {/* User Info Section */}
                                                    <div style={{
                                                        padding: '1rem',
                                                        borderBottom: '1px solid #e0e0e0',
                                                        background: '#f4f4f4'
                                                    }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                            <div style={{
                                                                width: '48px',
                                                                height: '48px',
                                                                background: 'linear-gradient(135deg, #0f62fe 0%, #0353e9 100%)',
                                                                borderRadius: '50%',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                color: 'white',
                                                                fontWeight: 600,
                                                                fontSize: '1.125rem'
                                                            }}>
                                                                {currentUser?.username?.charAt(0).toUpperCase()}
                                                            </div>
                                                            <div>
                                                                <p style={{
                                                                    color: '#161616',
                                                                    fontWeight: 600,
                                                                    margin: '0 0 0.25rem 0',
                                                                    fontSize: '0.9375rem'
                                                                }}>
                                                                    {currentUser?.username}
                                                                </p>
                                                                <span style={{
                                                                    background: currentUser?.role === 'admin' ? '#0f62fe' : '#525252',
                                                                    color: 'white',
                                                                    padding: '3px 10px',
                                                                    borderRadius: '12px',
                                                                    fontSize: '0.75rem',
                                                                    fontWeight: 600,
                                                                    textTransform: 'capitalize'
                                                                }}>
                                                                    {currentUser?.role}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Logout Button */}
                                                    <div style={{
                                                        padding: '0.5rem',
                                                        borderTop: '1px solid #e0e0e0',
                                                        background: '#fafafa'
                                                    }}>
                                                        <button
                                                            onClick={() => {
                                                                setShowUserMenu(false);
                                                                onLogout();
                                                            }}
                                                            style={{
                                                                width: '100%',
                                                                padding: '0.875rem 1rem',
                                                                background: 'transparent',
                                                                border: 'none',
                                                                textAlign: 'left',
                                                                cursor: 'pointer',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '0.75rem',
                                                                color: '#da1e28',
                                                                fontSize: '0.875rem',
                                                                fontWeight: 600,
                                                                borderRadius: '4px',
                                                                transition: 'background 0.2s'
                                                            }}
                                                            onMouseEnter={(e) => e.currentTarget.style.background = '#fff1f1'}
                                                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                                        >
                                                            <Logout size={18} />
                                                            Sign Out
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </HeaderGlobalBar>
                                </div>
                            </div>
                        </div>
                    </Header>
                )}
            />
        </div>
    );
};
export default CustomHeader;