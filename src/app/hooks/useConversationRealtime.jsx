// src/app/hooks/useConversationsRealtime.js
import { useState, useEffect } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, database } from "../firebase/firebase";
import {
  ref,
  push,
  set,
  update,
  get,
  serverTimestamp,
} from "firebase/database";

class ConversationsServiceInline {
  constructor() {
    this.basePath = "users";
    console.log("Inline service created with database:", database);
  }

  getUserConversationsPath(userId) {
    return `${this.basePath}/${userId}/conversations`;
  }

  getConversationPath(userId, conversationId) {
    return `${this.getUserConversationsPath(userId)}/${conversationId}`;
  }

  async createConversation(userId, title = "Conversație nouă") {
    console.log("Creating conversation for:", userId);
    try {
      const conversationsRef = ref(
        database,
        this.getUserConversationsPath(userId)
      );
      const newConversationRef = push(conversationsRef);

      const conversationData = {
        title,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isActive: true,
        messageCount: 0,
      };

      await set(newConversationRef, conversationData);

      return {
        id: newConversationRef.key,
        ...conversationData,
        messages: [],
      };
    } catch (error) {
      console.error("Error creating conversation:", error);
      throw error;
    }
  }

  async getUserConversations(userId) {
    console.log("Getting conversations for user:", userId);
    try {
      const conversationsRef = ref(
        database,
        this.getUserConversationsPath(userId)
      );
      const snapshot = await get(conversationsRef);

      if (!snapshot.exists()) {
        console.log("No conversations found");
        return [];
      }

      const conversationsData = snapshot.val();
      const conversations = [];

      for (const [id, data] of Object.entries(conversationsData)) {
        if (data.isActive !== false) {
          conversations.push({
            id,
            title: data.title,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
            messageCount: data.messageCount || 0,
            isActive: data.isActive !== false,
          });
        }
      }

      // Sortează după updatedAt
      conversations.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

      console.log("Found conversations:", conversations);
      return conversations;
    } catch (error) {
      console.error("Error getting conversations:", error);
      throw error;
    }
  }

  async addMessage(userId, conversationId, message) {
    try {
      const messagesRef = ref(
        database,
        `${this.getConversationPath(userId, conversationId)}/messages`
      );
      const newMessageRef = push(messagesRef);

      const newMessage = {
        content: message.content,
        sender: message.sender,
        timestamp: Date.now(),
        ...message,
      };

      await set(newMessageRef, newMessage);

      // Actualizează conversația
      const conversationRef = ref(
        database,
        this.getConversationPath(userId, conversationId)
      );
      await update(conversationRef, {
        updatedAt: Date.now(),
      });

      return { id: newMessageRef.key, ...newMessage };
    } catch (error) {
      console.error("Error adding message:", error);
      throw error;
    }
  }

  async getConversation(userId, conversationId) {
    try {
      const conversationRef = ref(
        database,
        this.getConversationPath(userId, conversationId)
      );
      const snapshot = await get(conversationRef);

      if (!snapshot.exists()) {
        throw new Error("Conversation not found");
      }

      const data = snapshot.val();
      const messages = [];

      if (data.messages) {
        for (const [messageId, messageData] of Object.entries(data.messages)) {
          messages.push({
            id: messageId,
            ...messageData,
          });
        }
      }

      messages.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

      return {
        id: conversationId,
        title: data.title,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        isActive: data.isActive !== false,
        messageCount: data.messageCount || messages.length,
        messages,
      };
    } catch (error) {
      console.error("Error getting conversation:", error);
      throw error;
    }
  }

  async updateConversationTitle(userId, conversationId, title) {
    try {
      const conversationRef = ref(
        database,
        this.getConversationPath(userId, conversationId)
      );
      await update(conversationRef, {
        title,
        updatedAt: Date.now(),
      });
    } catch (error) {
      console.error("Error updating conversation title:", error);
      throw error;
    }
  }

  async deleteConversation(userId, conversationId) {
    try {
      const conversationRef = ref(
        database,
        this.getConversationPath(userId, conversationId)
      );
      await update(conversationRef, {
        isActive: false,
        updatedAt: Date.now(),
      });
    } catch (error) {
      console.error("Error deleting conversation:", error);
      throw error;
    }
  }

  generateAutoTitle(firstMessage) {
    if (!firstMessage || !firstMessage.content) {
      return "Conversație nouă";
    }

    const content = firstMessage.content.trim();
    if (content.length <= 50) {
      return content;
    }

    return content.substring(0, 47) + "...";
  }
}

// Creează serviciul inline
const conversationsService = new ConversationsServiceInline();

export function useConversationsRealtime() {
  const [user] = useAuthState(auth);
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  console.log("Hook initialized, user:", user?.email);
  console.log("Database available:", !!database);
  console.log("Service available:", !!conversationsService);

  const loadConversations = async () => {
    if (!user) {
      setConversations([]);
      return;
    }

    setLoading(true);
    try {
      console.log("Loading conversations...");
      const userConversations = await conversationsService.getUserConversations(
        user.uid
      );
      console.log("Conversations loaded:", userConversations);
      setConversations(userConversations);
      setError(null);
    } catch (err) {
      console.error("Error in loadConversations:", err);
      setError("Eroare la încărcarea conversațiilor");
    } finally {
      setLoading(false);
    }
  };

  const createNewConversation = async (title) => {
    if (!user) {
      throw new Error("User not authenticated");
    }

    try {
      console.log("Creating new conversation...");
      const newConversation = await conversationsService.createConversation(
        user.uid,
        title || "Conversație nouă"
      );

      setConversations((prev) => [newConversation, ...prev]);
      setCurrentConversation(newConversation);
      return newConversation;
    } catch (err) {
      console.error("Error creating conversation:", err);
      setError("Eroare la crearea conversației");
      throw err;
    }
  };

  const addMessageToConversation = async (conversationId, message) => {
    if (!user) {
      console.warn("User not authenticated, message not saved");
      return;
    }

    try {
      const newMessage = await conversationsService.addMessage(
        user.uid,
        conversationId,
        message
      );

      if (currentConversation && currentConversation.id === conversationId) {
        setCurrentConversation((prev) => ({
          ...prev,
          messages: [...(prev.messages || []), newMessage],
        }));
      }

      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === conversationId
            ? {
                ...conv,
                updatedAt: Date.now(),
                messageCount: (conv.messageCount || 0) + 1,
              }
            : conv
        )
      );

      return newMessage;
    } catch (err) {
      console.error("Error adding message:", err);
      setError("Eroare la salvarea mesajului");
      throw err;
    }
  };

  const loadConversation = async (conversationId) => {
    if (!user) return;

    setLoading(true);
    try {
      const conversation = await conversationsService.getConversation(
        user.uid,
        conversationId
      );
      setCurrentConversation(conversation);
      setError(null);
      return conversation;
    } catch (err) {
      console.error("Error loading conversation:", err);
      setError("Eroare la încărcarea conversației");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteConversation = async (conversationId) => {
    if (!user) return;

    try {
      await conversationsService.deleteConversation(user.uid, conversationId);
      setConversations((prev) =>
        prev.filter((conv) => conv.id !== conversationId)
      );

      if (currentConversation && currentConversation.id === conversationId) {
        setCurrentConversation(null);
      }

      setError(null);
    } catch (err) {
      console.error("Error deleting conversation:", err);
      setError("Eroare la ștergerea conversației");
      throw err;
    }
  };

  const updateConversationTitle = async (conversationId, title) => {
    if (!user) return;

    try {
      await conversationsService.updateConversationTitle(
        user.uid,
        conversationId,
        title
      );

      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === conversationId ? { ...conv, title } : conv
        )
      );

      if (currentConversation && currentConversation.id === conversationId) {
        setCurrentConversation((prev) => ({ ...prev, title }));
      }

      setError(null);
    } catch (err) {
      console.error("Error updating title:", err);
      setError("Eroare la actualizarea titlului");
      throw err;
    }
  };

  useEffect(() => {
    console.log("useEffect triggered, user:", user?.email);
    if (user) {
      loadConversations();
    } else {
      setConversations([]);
      setCurrentConversation(null);
    }
  }, [user]);

  return {
    conversations,
    currentConversation,
    loading,
    error,
    isAuthenticated: !!user,
    createNewConversation,
    addMessageToConversation,
    loadConversation,
    deleteConversation,
    updateConversationTitle,
    loadConversations,
    setCurrentConversation,
  };
}
