import React, { useState, useEffect } from 'react';
import { AlertCircle, WifiOff, Wifi, CheckCircle2, AlertTriangle } from 'lucide-react';

const ConnectionAlertBadge = ({ connectionState, reconnectAttempts, maxReconnectAttempts, onManualReconnect }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [networkStatus, setNetworkStatus] = useState(navigator.onLine ? 'online' : 'offline');
  
  // Define the styles and content based on connection state and network status
  const getAlertStyles = () => {
    // Offline takes precedence over other connection states
    if (networkStatus === 'offline') {
      return {
        bgColor: 'bg-red-100',
        textColor: 'text-red-800',
        borderColor: 'border-red-300',
        // icon: <WifiOff className="h-4 w-4" />,
        message: 'Offline',
        description: 'No internet connection. Please check your network.'
      };
    }

    switch(connectionState) {
      case 'disconnected':
        return {
          bgColor: 'bg-red-100',
          textColor: 'text-red-800',
          borderColor: 'border-red-300',
          icon: <AlertTriangle className="h-4 w-4" />,
          message: 'Disconnected',
          // description: 'Connection to the quiz server has been lost.'
        };
      case 'connecting':
        return {
          bgColor: 'bg-blue-100',
          textColor: 'text-blue-800',
          borderColor: 'border-blue-300',
        //   icon: <Wifi className="h-4 w-4 animate-pulse" />,
          message: 'Connecting',
          // description: 'Establishing connection to the quiz server...'
        };
      case 'reconnecting':
        return {
          bgColor: 'bg-yellow-100',
          textColor: 'text-yellow-800',
          borderColor: 'border-yellow-300',
        //   icon: <Wifi className="h-4 w-4 animate-spin" />,
          message: `Reconnecting (${reconnectAttempts}/${maxReconnectAttempts})`,
          // description: 'Attempting to restore connection...'
        };
      case 'connected':
        return {
          bgColor: 'bg-green-100',
          textColor: 'text-green-800',
          borderColor: 'border-green-300',
          icon: <CheckCircle2 className="h-4 w-4" />,
          message: 'Connected',
          // description: 'Successfully connected to the quiz server.'
        };
      default:
        return {
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-800',
          borderColor: 'border-gray-300',
          icon: <AlertCircle className="h-4 w-4" />,
          message: 'Unknown Status',
          description: 'Connection status unknown.'
        };
    }
  };
  
  // Handle online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setNetworkStatus('online');
    };

    const handleOffline = () => {
      setNetworkStatus('offline');
    };

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cleanup listeners
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  // Auto-hide 'connected' status after 3 seconds
  useEffect(() => {
    if (connectionState === 'connected' && networkStatus === 'online') {
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 3000);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(true);
    }
  }, [connectionState, networkStatus]);
  
  const alertStyles = getAlertStyles();
  
  // Don't render if connected and auto-hidden
  if (connectionState === 'connected' && networkStatus === 'online' && !isVisible) {
    return null;
  }
  
  return (
    <div 
      className="fixed bottom-4 left-4 z-50 flex flex-col items-start"
      onClick={() => setExpanded(!expanded)}
    >
      <div 
        className={`flex items-center rounded-lg shadow-md px-3 py-2 ${alertStyles.bgColor} ${alertStyles.textColor} border ${alertStyles.borderColor} cursor-pointer transition-all`}
      >
        <div className="mr-2">
          {alertStyles.icon}
        </div>
        <span className="font-medium text-sm">{alertStyles.message}</span>
        
        {/* Expanding arrow button */}
        <button 
          className="ml-2 p-1 rounded-full hover:bg-white hover:bg-opacity-30 transition-colors"
          aria-label={expanded ? "Collapse details" : "Expand details"}
        >
          <svg 
            className={`h-3 w-3 transition-transform ${expanded ? 'rotate-180' : ''}`} 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
      
      {/* Expandable details */}
      {expanded && (
        <div className={`mt-2 p-3 rounded-lg ${alertStyles.bgColor} ${alertStyles.textColor} border ${alertStyles.borderColor} text-xs max-w-xs shadow-md`}>
          <p className="mb-2">{alertStyles.description}</p>
          
          {(networkStatus === 'offline' || connectionState === 'disconnected') && (
            <div className="mt-3">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onManualReconnect();
                }}
                className="bg-white text-red-700 px-3 py-1 rounded text-xs font-medium hover:bg-red-50 transition-colors"
              >
                Reconnect Manually
              </button>
            </div>
          )}
          
          {connectionState === 'reconnecting' && (
            <div className="w-full bg-yellow-200 rounded-full h-1.5 mt-2">
              <div 
                className="bg-yellow-500 h-1.5 rounded-full" 
                style={{ width: `${(reconnectAttempts / maxReconnectAttempts) * 100}%` }}
              ></div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ConnectionAlertBadge;