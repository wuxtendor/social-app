import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import './ChatPage.css';

function ChatPage() {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const { id: receiverId } = useParams();
  const { user: sender } = useAuth();
  const socket = useSocket();
  const messagesEndRef = useRef(null); // Ref to auto-scroll to the bottom

  // Effect for fetching message history
  useEffect(() => {
    // Only run if the sender object is loaded
    if (sender) {
      const fetchMessages = async () => {
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:5000/api/messages/${receiverId}`, {
          // This header is the crucial fix
          headers: {
            'Authorization': `Bearer ${token}`
          },
        });
        if (response.ok) {
          const data = await response.json();
          setMessages(data);
        }
      };
      fetchMessages();
    }
  }, [receiverId, sender]);

  // Effect for listening for incoming messages in real-time
  useEffect(() => {
    if (socket) {
      socket.on('getMessage', (message) => {
        // Only add the new message if it's part of the current conversation
        if (message.senderId === parseInt(receiverId, 10)) {
          setMessages((prevMessages) => [...prevMessages, message]);
        }
      });

      // Cleanup listener when component unmounts to prevent memory leaks
      return () => socket.off('getMessage');
    }
  }, [socket, receiverId]);
  
  // Effect for auto-scrolling to the latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handler for submitting the message form
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !socket || !sender) return;
    
    const messagePayload = {
      senderId: sender.userId,
      receiverId: parseInt(receiverId, 10),
      content: newMessage,
    };
    
    // Emit the message to the server via WebSocket
    socket.emit('sendMessage', messagePayload);
    
    // Optimistically add the message to our own UI
    setMessages((prevMessages) => [...prevMessages, messagePayload]);
    
    // Clear the input field
    setNewMessage('');
  };
  
  // Guard clause to prevent rendering before contexts are loaded
  if (!socket || !sender) {
    return <p>Connecting to chat...</p>;
  }

  return (
    <div className="chat-container">
      <div className="messages-list">
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.senderId === sender.userId ? 'own' : 'other'}`}>
            <p>{msg.content}</p>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSubmit} className="message-form">
        <input 
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}

export default ChatPage;