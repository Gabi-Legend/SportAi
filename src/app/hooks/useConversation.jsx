// hooks/useConversations.js
import { useState, useEffect } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/app/firebase/firebase";
import { conversationsService } from "@/services/conversationsService";

export function useConversations() {
  const [user] = useAuthState(auth);
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Încarcă conversațiile utilizatorului
  const loadConversations = async () => {
    if (!user) {
      setConversations([]);
      return;
    }

    setLoading(true);
    try {
      const userConversations = await conversationsService.getUserConversations(
        user.uid
      );
      setConversations(userConversations);
      setError(null);
    } catch (err) {
      setError("Eroare la încărcarea conversațiilor");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Creează o conversație nouă
  const createNewConversation = async (title) => {
    if (!user) {
      throw new Error("User not authenticated");
    }

    try {
      const newConversation = await conversationsService.createConversation(
        user.uid,
        title || "Conversație nouă"
      );

      setConversations((prev) => [newConversation, ...prev]);
      setCurrentConversation(newConversation);
      return newConversation;
    } catch (err) {
      setError("Eroare la crearea conversației");
      throw err;
    }
  };

  // Adaugă un mesaj la conversația curentă
  const addMessageToConversation = async (conversationId, message) => {
    if (!user) {
      console.warn("User not authenticated, message not saved");
      return;
    }

    try {
      const newMessage = await conversationsService.addMessage(
        conversationId,
        message
      );

      // Actualizează conversația curentă dacă este cea activă
      if (currentConversation && currentConversation.id === conversationId) {
        setCurrentConversation((prev) => ({
          ...prev,
          messages: [...(prev.messages || []), newMessage],
        }));
      }

      // Actualizează lista de conversații pentru a reflecta ultima actualizare
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === conversationId
            ? {
                ...conv,
                updatedAt: new Date(),
                messageCount: (conv.messageCount || 0) + 1,
              }
            : conv
        )
      );

      return newMessage;
    } catch (err) {
      setError("Eroare la salvarea mesajului");
      throw err;
    }
  };

  // Încarcă o conversație specifică
  const loadConversation = async (conversationId) => {
    if (!user) return;

    setLoading(true);
    try {
      const conversation = await conversationsService.getConversation(
        conversationId
      );
      setCurrentConversation(conversation);
      setError(null);
      return conversation;
    } catch (err) {
      setError("Eroare la încărcarea conversației");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Șterge o conversație
  const deleteConversation = async (conversationId) => {
    if (!user) return;

    try {
      await conversationsService.deleteConversation(conversationId);
      setConversations((prev) =>
        prev.filter((conv) => conv.id !== conversationId)
      );

      // Dacă conversația ștearsă era cea curentă, resetează-o
      if (currentConversation && currentConversation.id === conversationId) {
        setCurrentConversation(null);
      }

      setError(null);
    } catch (err) {
      setError("Eroare la ștergerea conversației");
      throw err;
    }
  };

  // Actualizează titlul unei conversații
  const updateConversationTitle = async (conversationId, title) => {
    if (!user) return;

    try {
      await conversationsService.updateConversationTitle(conversationId, title);

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
      setError("Eroare la actualizarea titlului");
      throw err;
    }
  };

  // Încarcă conversațiile când se schimbă utilizatorul
  useEffect(() => {
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
