// pages/chat/page.js or components/ChatPage.js
"use client";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useConversations } from "@/hooks/useConversations";
import { conversationsService } from "@/services/conversationsService";
import ConversationsSidebar from "@/components/ConversationsSidebar";

export default function ChatPage() {
  const searchParams = useSearchParams();
  const conversationId = searchParams.get("conversationId");

  const {
    currentConversation,
    addMessageToConversation,
    loadConversation,
    createNewConversation,
    isAuthenticated,
  } = useConversations();

  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Load conversation when ID changes
  useEffect(() => {
    if (conversationId && isAuthenticated) {
      loadConversationData();
    } else if (!conversationId) {
      setMessages([]);
    }
  }, [conversationId, isAuthenticated]);

  const loadConversationData = async () => {
    try {
      const conversation = await loadConversation(conversationId);
      if (conversation && conversation.messages) {
        setMessages(conversation.messages);
      }
    } catch (error) {
      console.error("Error loading conversation:", error);
    }
  };

  const handleSendMessage = async (messageContent) => {
    if (!messageContent.trim()) return;

    const userMessage = {
      content: messageContent,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      if (isAuthenticated && conversationId) {
        await addMessageToConversation(conversationId, userMessage);
      }

      const aiResponse = await getAIResponse(messageContent);

      const aiMessage = {
        content: aiResponse,
        sender: "ai",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMessage]);

      if (isAuthenticated && conversationId) {
        await addMessageToConversation(conversationId, aiMessage);

        if (currentConversation && currentConversation.messages.length <= 2) {
          const autoTitle = conversationsService.generateAutoTitle(userMessage);
          await conversationsService.updateConversationTitle(
            conversationId,
            autoTitle
          );
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages((prev) => [
        ...prev,
        {
          content: "Sorry, an error occurred. Please try again.",
          sender: "ai",
          timestamp: new Date(),
          isError: true,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const getAIResponse = async (message) => {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return `You asked: "${message}". This is a simulated AI response for SportML.`;
  };

  const handleConversationSelect = (conversation) => {
    window.history.pushState({}, "", `/chat?conversationId=${conversation.id}`);
    loadConversation(conversation.id);
  };

  return (
    <div className="chat-container">
      <ConversationsSidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        onConversationSelect={handleConversationSelect}
      />

      <div className={`chat-main ${sidebarOpen ? "with-sidebar" : ""}`}>
        <div className="chat-header">
          <h2>SportML Chat</h2>
          {!isAuthenticated && (
            <div className="save-warning">
              ⚠️ Conversation will not be saved. Sign in to preserve history.
            </div>
          )}
          {isAuthenticated && conversationId && (
            <div className="save-status">✅ Conversation auto-saves</div>
          )}
        </div>

        <div className="messages-container">
          {messages.length === 0 ? (
            <div className="welcome-message">
              <h3>Welcome to SportML!</h3>
              <p>Ask me anything about sports and AI predictions.</p>
              {!isAuthenticated && (
                <p className="auth-reminder">
                  💡 Sign in to save your conversations.
                </p>
              )}
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={message.id || index}
                className={`message ${
                  message.sender === "user" ? "user-message" : "ai-message"
                } ${message.isError ? "error-message" : ""}`}
              >
                <div className="message-content">{message.content}</div>
                <div className="message-timestamp">
                  {new Date(message.timestamp).toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            ))
          )}
          {isLoading && (
            <div className="ai-message loading-message">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          )}
        </div>

        <div className="chat-input-container">
          <div className="chat-input-wrapper">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(inputValue);
                }
              }}
              placeholder="Ask about sports predictions..."
              disabled={isLoading}
              className="chat-input"
            />
            <button
              onClick={() => handleSendMessage(inputValue)}
              disabled={isLoading || !inputValue.trim()}
              className="send-button"
            >
              Send
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .chat-container {
          display: flex;
          height: 100vh;
          background: #0a0a0a;
        }

        .chat-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          transition: margin-left 0.3s ease;
        }

        .with-sidebar {
          margin-left: 300px;
        }

        .chat-header {
          padding: 20px;
          border-bottom: 1px solid #333;
          background: rgba(26, 26, 26, 0.9);
          backdrop-filter: blur(10px);
        }

        .chat-header h2 {
          color: white;
          margin: 0 0 8px 0;
          font-size: 24px;
        }

        .save-warning {
          color: #fbbf24;
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .save-status {
          color: #10b981;
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .messages-container {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .welcome-message {
          text-align: center;
          color: white;
          padding: 40px 20px;
        }

        .welcome-message h3 {
          margin: 0 0 16px 0;
          font-size: 28px;
          background: linear-gradient(135deg, #4f46e5, #06b6d4);
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .auth-reminder {
          margin-top: 16px;
          color: #a78bfa;
          font-size: 14px;
        }

        .message {
          max-width: 80%;
          padding: 12px 16px;
          border-radius: 12px;
          position: relative;
        }

        .user-message {
          align-self: flex-end;
          background: linear-gradient(135deg, #4f46e5, #6366f1);
          color: white;
          border-bottom-right-radius: 4px;
        }

        .ai-message {
          align-self: flex-start;
          background: rgba(255, 255, 255, 0.1);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-bottom-left-radius: 4px;
        }

        .error-message {
          background: rgba(239, 68, 68, 0.2);
          border-color: rgba(239, 68, 68, 0.3);
          color: #fca5a5;
        }

        .message-content {
          margin-bottom: 4px;
          line-height: 1.5;
        }

        .message-timestamp {
          font-size: 11px;
          opacity: 0.7;
        }

        .loading-message {
          background: rgba(255, 255, 255, 0.05);
        }

        .typing-indicator {
          display: flex;
          gap: 4px;
          align-items: center;
        }

        .typing-indicator span {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #6366f1;
          animation: typing 1.4s infinite;
        }

        .typing-indicator span:nth-child(2) {
          animation-delay: 0.2s;
        }

        .typing-indicator span:nth-child(3) {
          animation-delay: 0.4s;
        }

        @keyframes typing {
          0%,
          60%,
          100% {
            transform: translateY(0);
            opacity: 0.5;
          }
          30% {
            transform: translateY(-10px);
            opacity: 1;
          }
        }

        .chat-input-container {
          padding: 20px;
          border-top: 1px solid #333;
          background: rgba(26, 26, 26, 0.9);
          backdrop-filter: blur(10px);
        }

        .chat-input-wrapper {
          display: flex;
          gap: 12px;
          max-width: 800px;
          margin: 0 auto;
        }

        .chat-input {
          flex: 1;
          padding: 12px 16px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          color: white;
          font-size: 16px;
          outline: none;
          transition: all 0.2s ease;
        }

        .chat-input:focus {
          border-color: #4f46e5;
          box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
        }

        .chat-input::placeholder {
          color: rgba(255, 255, 255, 0.5);
        }

        .send-button {
          padding: 12px 24px;
          background: linear-gradient(135deg, #4f46e5, #6366f1);
          border: none;
          border-radius: 8px;
          color: white;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .send-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
        }

        .send-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        @media (max-width: 768px) {
          .with-sidebar {
            margin-left: 0;
          }

          .message {
            max-width: 90%;
          }

          .chat-input-wrapper {
            flex-direction: column;
          }

          .chat-input {
            margin-bottom: 8px;
          }
        }
      `}</style>
    </div>
  );
}
