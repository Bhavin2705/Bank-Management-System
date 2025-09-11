import { Bot, Loader2, MessageCircle, RefreshCw, Send, User } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import { useNotification } from '../components/NotificationProvider';
import '../styles/Support.css';

const Support = ({ user }) => {
  const { showError, showSuccess } = useNotification();
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      content: `Hello ${user?.name || 'there'}! 👋\n\nWelcome to BankPro Support Chat. Our support team is here to help you with:\n\n• Account balance and transactions\n• Money transfers and payments\n• Card management and security\n• Loan and credit information\n\nPlease describe your issue and a support agent will assist you shortly.`,
      timestamp: new Date(),
    },
  ]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [socket, setSocket] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const messagesContainerRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('bank_auth_token');
    if (!token) {
      showError('Please login to use support chat');
      return;
    }

    const newSocket = io('http://localhost:5000', {
      auth: { token },
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true,
    });

    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Connected to support chat');
      setConnectionStatus('connected');
      showSuccess('Connected to support chat');
      newSocket.emit('join_support', { userId: user?._id, name: user?.name });
    });

    newSocket.on('support_message', (message) => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          type: 'bot',
          content: message.content,
          timestamp: new Date(message.timestamp),
          isAutoResponse: message.isAutoResponse,
          agentName: message.agentName,
        },
      ]);
    });

    newSocket.on('support_typing', (data) => {
      setIsTyping(data.isTyping);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setConnectionStatus('error');
      showError('Failed to connect to support chat. Please check if you are logged in.');
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Disconnected from support chat:', reason);
      setConnectionStatus('disconnected');
      showError('Disconnected from support chat. Trying to reconnect...');
    });

    return () => {
      newSocket.disconnect();
    };
  }, [user, showError, showSuccess]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages]);

  const quickReplies = [
    'Check my balance',
    'How to transfer money',
    'Card is not working',
    'Recent transactions',
    'Security question',
    'Contact support',
    'Find a branch',
    'Loan information',
  ];

  const handleSendMessage = async () => {
    if (!newMessage.trim() || isTyping || isLoading || connectionStatus !== 'connected' || !socket) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: newMessage.trim(),
      timestamp: new Date(),
    };

    console.log('User message sent:', userMessage.content);

    setMessages((prev) => [...prev, userMessage]);
    setNewMessage('');
    setIsLoading(true);

    try {
      socket.emit('user_message', {
        content: userMessage.content,
        userId: user?._id,
        name: user?.name,
      });
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
    } catch (error) {
      console.error('Chat error:', error);
      showError('Failed to send message. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickReply = async (reply) => {
    if (isTyping || isLoading || connectionStatus !== 'connected' || !socket) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: reply,
      timestamp: new Date(),
    };

    console.log('User quick reply sent:', userMessage.content);

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      socket.emit('user_message', {
        content: reply,
        userId: user?._id,
        name: user?.name,
      });
    } catch (error) {
      console.error('Quick reply error:', error);
      showError('Failed to send message. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: Date.now(),
        type: 'bot',
        content: `Hello ${user?.name || 'there'}! 👋\n\nWelcome to BankPro Support Chat. How can I help you today?`,
        timestamp: new Date(),
      },
    ]);
    showSuccess('Chat cleared successfully!');
  };

  const reconnectSocket = () => {
    if (socket) {
      socket.disconnect();
    }
    setConnectionStatus('connecting');

    setTimeout(() => {
      const token = localStorage.getItem('bank_auth_token');
      if (token) {
        const newSocket = io('http://localhost:5000', {
          auth: { token },
          transports: ['websocket', 'polling'],
          timeout: 20000,
          forceNew: true,
        });
        setSocket(newSocket);

        newSocket.on('connect', () => {
          setConnectionStatus('connected');
          showSuccess('Reconnected to support chat');
          newSocket.emit('join_support', { userId: user?._id, name: user?.name });
        });

        newSocket.on('connect_error', () => {
          setConnectionStatus('error');
          showError('Failed to reconnect. Please try again.');
        });
      }
    }, 1000);
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="support-page">
      <div className="support-container">
        <header className="support-header">
          <h1>
            <MessageCircle size={28} />
            Support Chat
          </h1>
          <p>Get real-time help from our support team</p>
        </header>

        <div className="dashboard-grid">
          {/* Chat Section */}
          <section className="card chat-container">
            <div className="chat-header">
              <div className="chat-header-info">
                <div className="avatar">
                  <Bot size={20} />
                </div>
                <div>
                  <div className="chat-header-title">BankPro Support</div>
                  <div className="chat-header-status">
                    {connectionStatus === 'connected'
                      ? isTyping
                        ? 'Typing...'
                        : 'Online'
                      : connectionStatus === 'connecting'
                        ? 'Connecting...'
                        : connectionStatus === 'error'
                          ? 'Connection Failed'
                          : 'Reconnecting...'}
                  </div>
                </div>
              </div>
              <div className="chat-header-actions">
                <span
                  className={`status-dot ${connectionStatus === 'connected'
                    ? 'status-connected'
                    : connectionStatus === 'connecting'
                      ? 'status-connecting'
                      : 'status-error'
                    }`}
                ></span>
                <button
                  onClick={clearChat}
                  title="Clear chat"
                  aria-label="Clear chat"
                  className="action-btn"
                >
                  <RefreshCw size={16} />
                </button>
                {connectionStatus !== 'connected' && (
                  <button
                    onClick={reconnectSocket}
                    title="Reconnect"
                    aria-label="Reconnect to chat"
                    className="action-btn"
                  >
                    🔄
                  </button>
                )}
              </div>
            </div>

            <div className="chat-messages" ref={messagesContainerRef}>
              {messages.map((message) => (
                <div key={message.id} className={`message ${message.type}`}>
                  <div className="message-content">
                    <div className="message-header">
                      {message.type === 'bot' ? (
                        <Bot size={14} />
                      ) : (
                        <User size={14} />
                      )}
                      <span className="message-sender">
                        {message.type === 'user'
                          ? 'You'
                          : message.agentName
                            ? `${message.agentName} (Support)`
                            : message.isAutoResponse
                              ? 'BankPro Assistant'
                              : 'Support'}
                      </span>
                      <span className="message-time">• {formatTime(message.timestamp)}</span>
                    </div>
                    <div className="message-text">{message.content}</div>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="typing-indicator">
                  <span className="dot"></span>
                  <span className="dot"></span>
                  <span className="dot"></span>
                </div>
              )}
            </div>

            <div className="chat-input-container">
              <div className="chat-input">
                <textarea
                  ref={inputRef}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message... (Press Enter to send)"
                  disabled={isTyping || isLoading || connectionStatus !== 'connected'}
                  rows={1}
                  aria-label="Type your message"
                />
                {newMessage.length > 0 && (
                  <div className="character-count">{newMessage.length}</div>
                )}
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || isTyping || isLoading || connectionStatus !== 'connected'}
                  className="send-button"
                  aria-label="Send message"
                >
                  {isLoading ? <Loader2 size={18} className="rotating" /> : <Send size={18} />}
                </button>
              </div>
            </div>
          </section>

          {/* Sidebar section commented out to prevent rendering */}
          {/*
            <aside className="sidebar">
              <div className="card">
                <h3>
                  <MessageCircle size={18} />
                  Quick Help
                </h3>
                <div className="quick-replies">
                  {quickReplies.map((reply, index) => (
                    <button
                      key={index}
                      onClick={() => handleQuickReply(reply)}
                      disabled={isTyping || isLoading || connectionStatus !== 'connected'}
                      className="quick-reply-btn"
                      aria-label={`Send quick reply: ${reply}`}
                    >
                      {reply}
                    </button>
                  ))}
                </div>
              </div>

              <div className="card">
                <h3>
                  <Phone size={18} />
                  Contact Support
                </h3>
                <div className="contact-info">
                  <div className="contact-item">
                    <Phone size={16} />
                    <div>
                      <div>24/7 Support</div>
                      <div>1-800-BANK-HELP</div>
                    </div>
                  </div>
                  <div className="contact-item">
                    <Mail size={16} />
                    <div>
                      <div>Email</div>
                      <div>support@bankpro.com</div>
                    </div>
                  </div>
                  <div className="contact-item">
                    <MapPin size={16} />
                    <div>
                      <div>Branch Locator</div>
                      <div>Find nearest branch</div>
                    </div>
                  </div>
                  <div className="contact-item">
                    <Clock size={16} />
                    <div>
                      <div>Business Hours</div>
                      <div>Mon-Fri: 9AM-9PM EST</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card emergency-card">
                <h3>🚨 Emergency</h3>
                <p>For lost/stolen cards or suspected fraud:</p>
                <div className="emergency-contact">1-800-555-1234</div>
                <div className="emergency-info">Available 24/7 • Immediate Response</div>
              </div>
            </aside>
          */}
        </div>
      </div>
    </div>
  );
};

export default Support;