import { Bot, Clock, Loader2, Mail, MapPin, MessageCircle, Phone, RefreshCw, Send, User } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNotification } from '../components/NotificationProvider';
import { sendMessageToGemini } from '../utils/geminiService';

const Support = ({ user }) => {
  const { showError, showSuccess } = useNotification();
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: 'bot',
      content: `Hello ${user?.name || 'there'}! 👋\n\nI'm your BankPro AI assistant. I'm here to help you with:\n\n• Account balance and transactions\n• Money transfers and payments\n• Card management and security\n• Loan and credit information\n• General banking questions\n\nHow can I assist you today?`,
      timestamp: new Date()
    }
  ]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const messagesContainerRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-focus input when component mounts
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const quickReplies = [
    'Check my balance',
    'How to transfer money',
    'Card is not working',
    'Recent transactions',
    'Security question',
    'Contact support',
    'Find a branch',
    'Loan information'
  ];

  const handleSendMessage = async () => {
    if (!newMessage.trim() || isTyping || isLoading) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: newMessage.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setNewMessage('');
    setIsTyping(true);
    setIsLoading(true);

    try {
      const userContext = {
        name: user?.name,
        hasAccount: !!user,
        accountType: user?.accountType || 'savings'
      };

      const botResponse = await sendMessageToGemini(userMessage.content, userContext);

      const botMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: botResponse,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);

    } catch (error) {
      console.error('Chat error:', error);
      showError('Failed to get response. Please try again.');

      const errorMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: 'I apologize, but I\'m having trouble connecting right now. Please try again or contact our support team at 1-800-BANK-HELP.',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
      setIsLoading(false);
      // Re-focus input after sending
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
    }
  };

  const handleQuickReply = async (reply) => {
    if (isTyping || isLoading) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: reply,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);
    setIsLoading(true);

    try {
      const userContext = {
        name: user?.name,
        hasAccount: !!user,
        accountType: user?.accountType || 'savings'
      };

      const botResponse = await sendMessageToGemini(reply, userContext);

      const botMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: botResponse,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);

    } catch (error) {
      console.error('Quick reply error:', error);
      showError('Failed to process your request. Please try again.');

      const errorMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: 'I apologize, but I\'m having trouble processing your request. Please try again or contact our support team.',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
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
        content: `Hello ${user?.name || 'there'}! 👋\n\nI'm your BankPro AI assistant. How can I help you today?`,
        timestamp: new Date()
      }
    ]);
    showSuccess('Chat cleared successfully!');
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="support-container">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <MessageCircle size={28} style={{ color: '#667eea' }} />
          AI Support Assistant
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Get instant help with your banking questions powered by advanced AI
        </p>
      </div>

      <div className="dashboard-grid" style={{ gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
        {/* Chat Section */}
        <div className="card chat-container">
          {/* Chat Header */}
          <div style={{
            padding: '1rem 1.5rem',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Bot size={20} />
              </div>
              <div>
                <div style={{ fontWeight: '600', fontSize: '1rem' }}>BankPro Assistant</div>
                <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>
                  {isTyping ? 'Typing...' : 'Online'}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#28a745',
                animation: 'pulse 2s infinite'
              }}></div>
              <button
                onClick={clearChat}
                style={{
                  padding: '0.5rem',
                  border: 'none',
                  borderRadius: '6px',
                  background: 'rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title="Clear chat"
              >
                <RefreshCw size={16} />
              </button>
            </div>
          </div>

          {/* Messages Container */}
          <div
            ref={messagesContainerRef}
            className="chat-messages"
          >
            {messages.map((message) => (
              <div
                key={message.id}
                className={`message ${message.type}`}
              >
                <div className="message-content">
                  <div className="message-header">
                    {message.type === 'bot' ? (
                      <Bot size={14} style={{ color: '#667eea' }} />
                    ) : (
                      <User size={14} />
                    )}
                    <span className="message-sender">
                      {message.type === 'user' ? 'You' : 'Assistant'}
                    </span>
                    <span className="message-time">• {formatTime(message.timestamp)}</span>
                  </div>
                  <div className="message-text">
                    {message.content}
                  </div>
                </div>
              </div>
            ))}

            {isTyping && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div className="typing-indicator">
                  <div className="dot"></div>
                  <div className="dot"></div>
                  <div className="dot"></div>
                </div>
              </div>
            )}
          </div>

          {/* Message Input */}
          <div className="chat-input-container">
            <div className="chat-input">
              <textarea
                ref={inputRef}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message... (Press Enter to send)"
                disabled={isTyping || isLoading}
                rows={1}
              />
              {newMessage.length > 0 && (
                <div className="character-count">
                  {newMessage.length}
                </div>
              )}
              <button
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || isTyping || isLoading}
                className="send-button"
              >
                {isLoading ? (
                  <Loader2 size={18} className="rotating" />
                ) : (
                  <Send size={18} />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Quick Actions */}
          <div className="card">
            <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MessageCircle size={18} style={{ color: '#667eea' }} />
              Quick Help
            </h3>
            <div className="quick-replies">
              {quickReplies.map((reply, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickReply(reply)}
                  disabled={isTyping || isLoading}
                  className="quick-reply-btn"
                >
                  {reply}
                </button>
              ))}
            </div>
          </div>

          {/* Contact Information */}
          <div className="card">
            <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Phone size={18} style={{ color: '#667eea' }} />
              Contact Support
            </h3>
            <div className="contact-info">
              <div className="contact-item">
                <Phone size={16} style={{ color: '#28a745' }} />
                <div>
                  <div style={{ fontWeight: '500', fontSize: '0.9rem' }}>24/7 Support</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    1-800-BANK-HELP
                  </div>
                </div>
              </div>

              <div className="contact-item">
                <Mail size={16} style={{ color: '#667eea' }} />
                <div>
                  <div style={{ fontWeight: '500', fontSize: '0.9rem' }}>Email</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    support@bankpro.com
                  </div>
                </div>
              </div>

              <div className="contact-item">
                <MapPin size={16} style={{ color: '#ffc107' }} />
                <div>
                  <div style={{ fontWeight: '500', fontSize: '0.9rem' }}>Branch Locator</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Find nearest branch
                  </div>
                </div>
              </div>

              <div className="contact-item">
                <Clock size={16} style={{ color: '#17a2b8' }} />
                <div>
                  <div style={{ fontWeight: '500', fontSize: '0.9rem' }}>Business Hours</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Mon-Fri: 9AM-9PM EST
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="card" style={{
            border: '2px solid #dc3545',
            background: 'linear-gradient(135deg, #fff5f5 0%, #fed7d7 100%)'
          }}>
            <h3 style={{ marginBottom: '1rem', color: '#dc3545', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              🚨 Emergency
            </h3>
            <p style={{ fontSize: '0.9rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>
              For lost/stolen cards or suspected fraud:
            </p>
            <div style={{
              fontSize: '1.1rem',
              fontWeight: '700',
              color: '#dc3545',
              textAlign: 'center',
              padding: '0.5rem',
              background: 'rgba(220, 53, 69, 0.1)',
              borderRadius: '8px'
            }}>
              1-800-BANK-SECURE
            </div>
            <div style={{ fontSize: '0.8rem', color: '#dc3545', marginTop: '0.5rem', textAlign: 'center' }}>
              Available 24/7 • Immediate Response
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Support;
