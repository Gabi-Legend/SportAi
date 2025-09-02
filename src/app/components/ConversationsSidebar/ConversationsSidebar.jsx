"use client";
import { useState, useEffect } from "react";
import { useConversationsRealtime as useConversations } from "@/app/hooks/useConversationRealtime";
import {
  MessageSquare,
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  Clock,
  ChevronLeft,
  Menu,
} from "lucide-react";
import styles from "./ConversationsSidebar.module.css";

export default function ConversationsSidebar({
  isOpen,
  onToggle,
  onConversationSelect,
}) {
  const {
    conversations,
    currentConversation,
    loading,
    isAuthenticated,
    createNewConversation,
    deleteConversation,
    updateConversationTitle,
  } = useConversations();

  const [editingId, setEditingId] = useState(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleConversationSelect = (conversation) => {
    onConversationSelect(conversation);
    if (isMobile) {
      onToggle();
    }
  };

  const handleNewConversation = async () => {
    if (!isAuthenticated) return;

    try {
      const newConv = await createNewConversation();
      handleConversationSelect(newConv);
    } catch (error) {
      console.error("Error creating conversation:", error);
    }
  };

  const handleDeleteConversation = async (conversationId, e) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this conversation?")) {
      try {
        await deleteConversation(conversationId);
      } catch (error) {
        console.error("Error deleting conversation:", error);
      }
    }
  };

  const startEditing = (conversation, e) => {
    e.stopPropagation();
    setEditingId(conversation.id);
    setEditingTitle(conversation.title);
  };

  const saveTitle = async () => {
    if (!editingTitle.trim()) return;

    try {
      await updateConversationTitle(editingId, editingTitle.trim());
      setEditingId(null);
      setEditingTitle("");
    } catch (error) {
      console.error("Error updating title:", error);
    }
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingTitle("");
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "";

    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return "Today";
    if (diffDays === 2) return "Yesterday";
    if (diffDays <= 7) return `${diffDays} days ago`;
    return date.toLocaleDateString("en-US");
  };

  if (!isAuthenticated) {
    return (
      <>
        <div className={styles.toggleBtn} onClick={onToggle}>
          {isMobile ? (
            <Menu size={20} />
          ) : isOpen ? (
            <ChevronLeft size={20} />
          ) : (
            <Menu size={20} />
          )}
        </div>

        {isOpen && isMobile && (
          <div className={styles.overlay} onClick={onToggle} />
        )}

        <div
          className={`${styles.sidebar} ${
            isOpen ? styles.open : styles.closed
          } ${isMobile ? styles.mobile : styles.desktop}`}
        >
          {isOpen && (
            <div className={styles.authMessage}>
              <MessageSquare size={32} className={styles.authIcon} />
              <p>Log in to save your conversations</p>
            </div>
          )}
        </div>
      </>
    );
  }

  return (
    <>
      <div className={styles.toggleBtn} onClick={onToggle}>
        {isMobile ? (
          <Menu size={20} />
        ) : isOpen ? (
          <ChevronLeft size={20} />
        ) : (
          <Menu size={20} />
        )}
      </div>

      {isOpen && isMobile && (
        <div className={styles.overlay} onClick={onToggle} />
      )}

      <div
        className={`${styles.sidebar} ${isOpen ? styles.open : styles.closed} ${
          isMobile ? styles.mobile : styles.desktop
        }`}
      >
        {isOpen && (
          <div className={styles.sidebarContent}>
            <div className={styles.header}>
              <h3 className={styles.title}>Conversations</h3>
              <button
                className={styles.newChatBtn}
                onClick={handleNewConversation}
                title="New Conversation"
              >
                <Plus size={18} />
              </button>
            </div>

            <div className={styles.conversationsList}>
              {loading ? (
                <div className={styles.loading}>Loading...</div>
              ) : conversations.length === 0 ? (
                <div className={styles.emptyState}>
                  <MessageSquare size={32} className={styles.emptyIcon} />
                  <p>No conversations yet</p>
                  <button
                    className={styles.startBtn}
                    onClick={handleNewConversation}
                  >
                    Start your first conversation
                  </button>
                </div>
              ) : (
                conversations.map((conversation) => (
                  <div
                    key={conversation.id}
                    className={`${styles.conversationItem} ${
                      currentConversation?.id === conversation.id
                        ? styles.active
                        : ""
                    }`}
                    onClick={() => handleConversationSelect(conversation)}
                  >
                    <div className={styles.conversationMain}>
                      {editingId === conversation.id ? (
                        <div className={styles.editingContainer}>
                          <input
                            type="text"
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            className={styles.editInput}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveTitle();
                              if (e.key === "Escape") cancelEditing();
                            }}
                          />
                          <div className={styles.editActions}>
                            <button
                              onClick={saveTitle}
                              className={styles.saveBtn}
                            >
                              <Check size={12} />
                            </button>
                            <button
                              onClick={cancelEditing}
                              className={styles.cancelBtn}
                            >
                              <X size={12} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className={styles.conversationInfo}>
                            <h4 className={styles.conversationTitle}>
                              {conversation.title}
                            </h4>
                            <div className={styles.conversationMeta}>
                              <Clock size={12} />
                              <span>
                                {formatTimestamp(conversation.updatedAt)}
                              </span>
                              {conversation.messageCount > 0 && (
                                <span className={styles.messageCount}>
                                  {conversation.messageCount} messages
                                </span>
                              )}
                            </div>
                          </div>
                          <div className={styles.conversationActions}>
                            <button
                              onClick={(e) => startEditing(conversation, e)}
                              className={styles.actionBtn}
                              title="Edit title"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              onClick={(e) =>
                                handleDeleteConversation(conversation.id, e)
                              }
                              className={styles.deleteBtn}
                              title="Delete conversation"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
