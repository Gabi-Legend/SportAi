// components/ConversationsSidebar.js
"use client";
import { useState } from "react";
import { useConversations } from "@/hooks/useConversations";
import {
  MessageSquare,
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  Clock,
  ChevronLeft,
  ChevronRight,
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

  const handleNewConversation = async () => {
    if (!isAuthenticated) return;

    try {
      const newConv = await createNewConversation();
      onConversationSelect(newConv);
    } catch (error) {
      console.error("Error creating conversation:", error);
    }
  };

  const handleDeleteConversation = async (conversationId, e) => {
    e.stopPropagation();
    if (window.confirm("Ești sigur că vrei să ștergi această conversație?")) {
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

    if (diffDays === 1) return "Azi";
    if (diffDays === 2) return "Ieri";
    if (diffDays <= 7) return `${diffDays} zile`;
    return date.toLocaleDateString("ro-RO");
  };

  if (!isAuthenticated) {
    return (
      <div
        className={`${styles.sidebar} ${isOpen ? styles.open : styles.closed}`}
      >
        <div className={styles.toggleBtn} onClick={onToggle}>
          {isOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
        </div>
        <div className={styles.authMessage}>
          <MessageSquare size={32} className={styles.authIcon} />
          <p>Conectează-te pentru a salva conversațiile</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${styles.sidebar} ${isOpen ? styles.open : styles.closed}`}
    >
      {/* Toggle Button */}
      <div className={styles.toggleBtn} onClick={onToggle}>
        {isOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
      </div>

      {isOpen && (
        <div className={styles.sidebarContent}>
          {/* Header */}
          <div className={styles.header}>
            <h3 className={styles.title}>Conversații</h3>
            <button
              className={styles.newChatBtn}
              onClick={handleNewConversation}
              title="Conversație nouă"
            >
              <Plus size={18} />
            </button>
          </div>

          {/* Conversations List */}
          <div className={styles.conversationsList}>
            {loading ? (
              <div className={styles.loading}>Se încarcă...</div>
            ) : conversations.length === 0 ? (
              <div className={styles.emptyState}>
                <MessageSquare size={32} className={styles.emptyIcon} />
                <p>Nicio conversație încă</p>
                <button
                  className={styles.startBtn}
                  onClick={handleNewConversation}
                >
                  Începe prima conversație
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
                  onClick={() => onConversationSelect(conversation)}
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
                                {conversation.messageCount} mesaje
                              </span>
                            )}
                          </div>
                        </div>
                        <div className={styles.conversationActions}>
                          <button
                            onClick={(e) => startEditing(conversation, e)}
                            className={styles.actionBtn}
                            title="Editează titlul"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={(e) =>
                              handleDeleteConversation(conversation.id, e)
                            }
                            className={styles.deleteBtn}
                            title="Șterge conversația"
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
  );
}
