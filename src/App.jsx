import React, { useState, useEffect, useRef } from 'react';
import { Users, Server, Activity, BarChart3, Zap, TrendingUp, Eye, RefreshCw } from 'lucide-react';

const DashboardStats = () => {
  const [stats, setStats] = useState({
    total_users: 0,
    total_providers: 0,
    total_active_providers: 0,
    total_queries_processed: 0
  });
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);
  const mountedRef = useRef(true);

  // Cache keys for localStorage
  const CACHE_KEYS = {
    STATS: 'dashboard_stats',
    LAST_UPDATED: 'dashboard_last_updated'
  };

  // Load cached data on component mount
  const loadCachedData = () => {
    try {
      const cachedStats = localStorage.getItem(CACHE_KEYS.STATS);
      const cachedLastUpdated = localStorage.getItem(CACHE_KEYS.LAST_UPDATED);
      
      if (cachedStats && cachedLastUpdated) {
        const parsedStats = JSON.parse(cachedStats);
        const lastUpdatedDate = new Date(cachedLastUpdated);
        
        // Use cached data if it's less than 10 minutes old
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
        if (lastUpdatedDate > tenMinutesAgo) {
          setStats(parsedStats);
          setLastUpdated(lastUpdatedDate);
          return true; // Indicate that cached data was used
        }
      }
    } catch (error) {
      console.warn('Error loading cached data:', error);
    }
    return false; // Indicate that fresh data should be fetched
  };

  // Save data to localStorage
  const saveToCache = (statsData, updatedTime) => {
    try {
      localStorage.setItem(CACHE_KEYS.STATS, JSON.stringify(statsData));
      localStorage.setItem(CACHE_KEYS.LAST_UPDATED, updatedTime.toISOString());
    } catch (error) {
      console.warn('Error saving to cache:', error);
    }
  };

  // Fetch stats from your FastAPI endpoint
  const fetchStats = async (skipCache = false) => {
    if (!mountedRef.current) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Check cache first unless explicitly skipping
      if (!skipCache && loadCachedData()) {
        setLoading(false);
        return;
      }

      const response = await fetch('https://server.dllm.chat/dashboard-stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        if (mountedRef.current) {
          const now = new Date();
          setStats(data);
          setLastUpdated(now);
          saveToCache(data, now);
        }
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      if (mountedRef.current) {
        setError(error.message);
        // Try to load cached data as fallback
        loadCachedData();
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    
    // Load cached data first, then fetch fresh data
    const hadCachedData = loadCachedData();
    
    // Fetch fresh data (will skip cache if we just loaded cached data)
    fetchStats(!hadCachedData);
    
    // Auto-refresh every 5 minutes (300000ms) instead of 1 minute for cost optimization
    intervalRef.current = setInterval(() => fetchStats(true), 300000);
    
    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const StatCard = ({ title, value, icon: Icon, color, change, delay = 0 }) => {
    const [displayValue, setDisplayValue] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);
    const animationRef = useRef(null);
    const cardRef = useRef(null);
    const previousValueRef = useRef(0);
    const hasInitializedRef = useRef(false);

    useEffect(() => {
      // Don't animate if value is 0 or hasn't changed
      if (value === 0 || value === previousValueRef.current) {
        if (!hasInitializedRef.current && value > 0) {
          setDisplayValue(value);
          hasInitializedRef.current = true;
          previousValueRef.current = value;
        }
        return;
      }

      // Clear any existing animation
      if (animationRef.current) {
        clearInterval(animationRef.current);
        animationRef.current = null;
      }

      // Don't start new animation if already animating
      if (isAnimating) return;

      const startAnimation = () => {
        if (!mountedRef.current) return;
        
        setIsAnimating(true);
        const startValue = hasInitializedRef.current ? previousValueRef.current : 0;
        const targetValue = value || 0;
        const difference = targetValue - startValue;
        
        if (difference === 0) {
          setIsAnimating(false);
          return;
        }

        const duration = 1500; // 1.5 seconds
        const startTime = Date.now();
        
        const animate = () => {
          if (!mountedRef.current) {
            setIsAnimating(false);
            return;
          }

          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed / duration, 1);
          
          // Use easing function for smooth animation
          const easeOutCubic = 1 - Math.pow(1 - progress, 3);
          const currentValue = startValue + (difference * easeOutCubic);
          
          setDisplayValue(Math.floor(currentValue));
          
          if (progress >= 1) {
            setDisplayValue(targetValue);
            setIsAnimating(false);
            hasInitializedRef.current = true;
            previousValueRef.current = targetValue;
          } else {
            animationRef.current = requestAnimationFrame(animate);
          }
        };

        // Start animation after delay
        setTimeout(() => {
          if (mountedRef.current) {
            animationRef.current = requestAnimationFrame(animate);
          }
        }, delay);
      };

      startAnimation();

      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
          animationRef.current = null;
        }
      };
    }, [value, delay]);

    // Cleanup on unmount
    useEffect(() => {
      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    }, []);

    const getColorValues = (colorName) => {
      const colors = {
        blue: { primary: '#3b82f6', secondary: '#1d4ed8', light: 'rgba(59,130,246,0.1)' },
        green: { primary: '#10b981', secondary: '#059669', light: 'rgba(16,185,129,0.1)' },
        purple: { primary: '#8b5cf6', secondary: '#7c3aed', light: 'rgba(139,92,246,0.1)' },
        orange: { primary: '#f59e0b', secondary: '#d97706', light: 'rgba(245,158,11,0.1)' }
      };
      return colors[colorName] || colors.blue;
    };

    const colorValues = getColorValues(color);

    return (
      <div 
        ref={cardRef}
        className={`stat-card ${color}`}
        style={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '20px',
          padding: '2rem',
          position: 'relative',
          overflow: 'hidden',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          cursor: 'pointer',
          animation: `slideInUp 0.8s cubic-bezier(0.4, 0, 0.2, 1) ${delay}ms both`,
          boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-8px) scale(1.02)';
          e.currentTarget.style.boxShadow = '0 25px 50px rgba(0,0,0,0.25)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0) scale(1)';
          e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.1)';
        }}
      >
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: `linear-gradient(90deg, ${colorValues.primary}, transparent)`
        }} />
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{
            background: `linear-gradient(135deg, ${colorValues.primary}, ${colorValues.secondary})`,
            borderRadius: '12px',
            padding: '0.75rem',
            color: 'white',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
          }}>
            <Icon size={24} />
          </div>
          {change && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              color: change > 0 ? '#10b981' : '#ef4444',
              fontSize: '0.875rem',
              fontWeight: '600'
            }}>
              <TrendingUp size={16} />
              +{change}%
            </div>
          )}
        </div>

        <div style={{ 
          color: 'white', 
          fontSize: '2.5rem', 
          fontWeight: '800', 
          marginBottom: '0.5rem',
          textShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          {displayValue.toLocaleString()}
        </div>
        
        <div style={{ 
          color: 'rgba(255,255,255,0.8)', 
          fontSize: '1rem', 
          fontWeight: '500',
          letterSpacing: '0.5px'
        }}>
          {title}
        </div>

        <div style={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          width: '100px',
          height: '100px',
          background: `radial-gradient(circle, ${colorValues.light}, transparent)`,
          borderRadius: '50%',
          transform: 'translate(30px, 30px)',
          opacity: 0.6
        }} />
      </div>
    );
  };

  const formatTimeAgo = (date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #667eea 100%)',
      backgroundSize: '400% 400%',
      animation: 'gradientShift 20s ease infinite',
      padding: '2rem'
    }}>
      <style>{`
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(40px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translateY(-30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
      `}</style>

      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header with Refresh Button */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '2rem',
          animation: 'fadeInDown 0.8s ease-out'
        }}>
          <div style={{
            color: 'rgba(255,255,255,0.7)',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <Eye size={16} />
            Auto-refresh: Every 5 minutes
          </div>
          
          <button
            onClick={() => fetchStats(true)}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '12px',
              padding: '0.75rem 1.5rem',
              color: 'white',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              backdropFilter: 'blur(10px)',
              opacity: loading ? 0.7 : 1
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.target.style.background = 'rgba(255,255,255,0.2)';
                e.target.style.transform = 'translateY(-2px)';
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'rgba(255,255,255,0.1)';
              e.target.style.transform = 'translateY(0)';
            }}
          >
            <RefreshCw size={16} style={{
              animation: loading ? 'spin 1s linear infinite' : 'none'
            }} />
            {loading ? 'Updating...' : 'Refresh Now'}
          </button>
        </div>

        {/* Title */}
        <div style={{
          textAlign: 'center',
          marginBottom: '3rem',
          animation: 'fadeInDown 0.8s ease-out 0.2s both'
        }}>
          <h1 style={{
            fontSize: '3rem',
            fontWeight: '800',
            background: 'linear-gradient(45deg, #fff, #e0e7ff)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginBottom: '0.5rem',
            textShadow: '0 0 30px rgba(255,255,255,0.3)'
          }}>
            DLLM Analytics
          </h1>
          <p style={{
            color: 'rgba(255,255,255,0.8)',
            fontSize: '1.2rem',
            fontWeight: '300',
            letterSpacing: '0.5px'
          }}>
            Real-time System Performance Dashboard
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '12px',
            padding: '1rem',
            marginBottom: '2rem',
            color: '#fca5a5',
            textAlign: 'center',
            backdropFilter: 'blur(10px)',
            animation: 'slideInUp 0.5s ease-out'
          }}>
            ⚠️ Error loading fresh data: {error}
            <br />
            <small style={{ opacity: 0.8 }}>Showing cached data if available</small>
          </div>
        )}

        {/* Stats Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '2rem',
          marginBottom: '2rem'
        }}>
          <StatCard
            title="Total Users"
            value={stats.total_users}
            icon={Users}
            color="blue"
            delay={0}
          />
          <StatCard
            title="Total Providers"
            value={stats.total_providers}
            icon={Server}
            color="green"
            delay={100}
          />
          <StatCard
            title="Active Providers"
            value={stats.total_active_providers}
            icon={Activity}
            color="purple"
            delay={200}
          />
          <StatCard
            title="Queries Processed"
            value={stats.total_queries_processed}
            icon={BarChart3}
            color="orange"
            delay={300}
          />
        </div>

        {/* Footer */}
        <div style={{
          textAlign: 'center',
          marginTop: '3rem',
          padding: '2rem',
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '20px',
          border: '1px solid rgba(255,255,255,0.1)',
          backdropFilter: 'blur(10px)',
          animation: 'fadeInDown 0.8s ease-out 0.5s both'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            color: 'rgba(255,255,255,0.6)',
            fontSize: '0.875rem',
            marginBottom: '0.5rem'
          }}>
            <Eye size={16} />
            Updated: {lastUpdated.toLocaleTimeString()} ({formatTimeAgo(lastUpdated)})
          </div>
          <div style={{
            marginTop: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            color: error ? 'rgba(239, 68, 68, 0.8)' : 'rgba(16, 185, 129, 0.8)',
            fontSize: '0.875rem',
            fontWeight: '500'
          }}>
            <Zap size={16} />
            System Status: {error ? 'Connection Issues (Using Cache)' : 'All Services Online'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardStats;