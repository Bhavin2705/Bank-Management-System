import { Bot, MessageCircle, Send, User, Users } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import { useNotification } from '../components/NotificationProvider';

const AdminSupport = ({ user }) => {
  const { showError, showSuccess } = useNotification();
  const [userMessages, setUserMessages] = useState([]);
  const [responseText, setResponseText] = useState('');
  const [socket, setSocket] = useState(null);
  const [activeUsers, setActiveUsers] = useState(new Set());
  const [selectedUserId, setSelectedUserId] = useState(null);
  const responseInputRef = useRef(null);

  // Initialize socket connection for admin
  useEffect(() => {
    if (user?.role !== 'admin') {
      showError('Access denied. Admin privileges required.');
      return;
    }

    // Rely on cookie-based auth for sockets. Server will read httpOnly cookies.
    const newSocket = io('http://localhost:5000', {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true
    });

    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Admin connected to support system');
      showSuccess('Connected to admin support system');
      newSocket.emit('join_support', { userId: user._id, name: user.name });
    });

    // Listen for new user messages
    newSocket.on('new_user_message', (message) => {
      setUserMessages(prev => [...prev, {
        id: Date.now(),
        userId: message.userId,
        name: message.name,
        content: message.content,
        timestamp: new Date(message.timestamp),
        isRead: false
      }]);

      setActiveUsers(prev => new Set([...prev, message.userId]));

      // Auto-select first user if none selected
      setSelectedUserId(current => current || message.userId);
    });

    // Listen for users joining
    newSocket.on('user_joined', (data) => {
      setActiveUsers(prev => new Set([...prev, data.userId]));
    });

    newSocket.on('connect_error', (error) => {
      console.error('Admin socket connection error:', error);
      showError('Failed to connect to admin support system');
    });

    return () => {
      newSocket.disconnect();
    };
  }, [user, showError, showSuccess]);

  const sendResponse = () => {
    if (!responseText.trim() || !selectedUserId || !socket) return;

    socket.emit('admin_response', {
      userId: selectedUserId,
      content: responseText.trim()
    });

    // Add response to local messages for display
    setUserMessages(prev => [...prev, {
      id: Date.now(),
      userId: selectedUserId,
      content: responseText.trim(),
      timestamp: new Date(),
      isAdminResponse: true,
      adminName: user.name
    }]);

    setResponseText('');
    showSuccess('Response sent successfully');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendResponse();
    }
  };

  const getMessagesForUser = (userId) => {
    return userMessages.filter(msg => msg.userId === userId);
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (user?.role !== 'admin') {
    return (
      <div className="support-container">
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <h2 style={{ color: '#dc3545', marginBottom: '1rem' }}>Access Denied</h2>
          <p>Admin privileges required to access this page.</p>
        </div>
      </div>
    );
  }

  const selectedUserMessages = selectedUserId ? getMessagesForUser(selectedUserId) : [];
  const selectedUserName = userMessages.find(msg => msg.userId === selectedUserId)?.name || 'Unknown User';

  return (
    <div className="support-container">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Users size={28} style={{ color: '#667eea' }} />
          Admin Support Dashboard
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Manage customer support conversations in real-time
        </p>
      </div>

      <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
        {/* User List */}
        <div className="card">
          <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MessageCircle size={18} style={{ color: '#667eea' }} />
            Active Conversations ({activeUsers.size})
          </h3>

          {activeUsers.size === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
              <MessageCircle size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
              <p>No active conversations</p>
              <p style={{ fontSize: '0.9rem' }}>Users will appear here when they send messages</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {Array.from(activeUsers).map(userId => {
                const userMsgs = getMessagesForUser(userId);
                const lastMessage = userMsgs[userMsgs.length - 1];
                const unreadCount = userMsgs.filter(msg => !msg.isRead && !msg.isAdminResponse).length;

                return (
                  <div
                    key={userId}
                    onClick={() => setSelectedUserId(userId)}
                    style={{
                      padding: '1rem',
                      border: `2px solid ${selectedUserId === userId ? '#667eea' : 'var(--border-color)'}`,
                      borderRadius: '8px',
                      cursor: 'pointer',
                      background: selectedUserId === userId ? 'rgba(102, 126, 234, 0.1)' : 'transparent',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>
                          {lastMessage?.name || `User ${userId.substring(0, 8)}`}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                          {lastMessage ? `${lastMessage.content.substring(0, 50)}${lastMessage.content.length > 50 ? '...' : ''}` : 'No messages yet'}
                        </div>
                      </div>
                      {unreadCount > 0 && (
                        <div style={{
                          background: '#dc3545',
                          color: 'white',
                          borderRadius: '50%',
                          width: '20px',
                          height: '20px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.7rem',
                          fontWeight: 'bold'
                        }}>
                          {unreadCount}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Chat Area */}
        <div className="card chat-container">
          {selectedUserId ? (
            <>
              {/* Chat Header */}
              <div style={{
                padding: '1rem 1.5rem',
                borderBottom: '1px solid var(--border-color)',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <User size={20} />
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '1rem' }}>
                      Conversation with {selectedUserName}
                    </div>
                    <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>
                      {selectedUserMessages.length} messages
                    </div>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="chat-messages" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {selectedUserMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`message ${message.isAdminResponse ? 'user' : 'bot'}`}
                  >
                    <div className="message-content">
                      <div className="message-header">
                        {message.isAdminResponse ? (
                          <User size={14} style={{ color: '#28a745' }} />
                        ) : (
                          <Bot size={14} style={{ color: '#667eea' }} />
                        )}
                        <span className="message-sender">
                          {message.isAdminResponse ? `${message.adminName} (You)` : selectedUserName}
                        </span>
                        <span className="message-time">• {formatTime(message.timestamp)}</span>
                      </div>
                      <div className="message-text">
                        {message.content}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Response Input */}
              <div className="chat-input-container">
                <div className="chat-input">
                  <textarea
                    ref={responseInputRef}
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your response to the customer..."
                    rows={2}
                  />
                  <button
                    onClick={sendResponse}
                    disabled={!responseText.trim()}
                    className="send-button"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '500px',
              flexDirection: 'column',
              color: 'var(--text-secondary)'
            }}>
              <MessageCircle size={64} style={{ opacity: 0.3, marginBottom: '1rem' }} />
              <h3>Select a conversation</h3>
              <p>Choose a user from the left panel to start responding to their messages</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminSupport;
