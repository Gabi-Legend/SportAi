// services/conversationsService.js
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  getDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/app/firebase/firebase";

export class ConversationsService {
  constructor() {
    this.collectionName = "conversations";
  }

  // Creates a new conversation
  async createConversation(userId, title = "New Conversation") {
    try {
      const conversationData = {
        userId,
        title,
        messages: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isActive: true,
      };

      const docRef = await addDoc(
        collection(db, this.collectionName),
        conversationData
      );
      return { id: docRef.id, ...conversationData };
    } catch (error) {
      console.error("Error creating conversation:", error);
      throw error;
    }
  }

  // Adds a message to an existing conversation
  async addMessage(conversationId, message) {
    try {
      const conversationRef = doc(db, this.collectionName, conversationId);
      const conversationDoc = await getDoc(conversationRef);

      if (!conversationDoc.exists()) {
        throw new Error("Conversation not found");
      }

      const currentMessages = conversationDoc.data().messages || [];
      const newMessage = {
        id: Date.now().toString(),
        content: message.content,
        sender: message.sender, // "user" or "ai"
        timestamp: serverTimestamp(),
        ...message, // for any other properties
      };

      const updatedMessages = [...currentMessages, newMessage];

      await updateDoc(conversationRef, {
        messages: updatedMessages,
        updatedAt: serverTimestamp(),
      });

      return newMessage;
    } catch (error) {
      console.error("Error adding message:", error);
      throw error;
    }
  }

  // Gets all conversations of a user
  async getUserConversations(userId) {
    try {
      const q = query(
        collection(db, this.collectionName),
        where("userId", "==", userId),
        where("isActive", "==", true),
        orderBy("updatedAt", "desc")
      );

      const querySnapshot = await getDocs(q);
      const conversations = [];

      querySnapshot.forEach((doc) => {
        conversations.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      return conversations;
    } catch (error) {
      console.error("Error getting conversations:", error);
      throw error;
    }
  }

  // Gets a specific conversation
  async getConversation(conversationId) {
    try {
      const conversationRef = doc(db, this.collectionName, conversationId);
      const conversationDoc = await getDoc(conversationRef);

      if (!conversationDoc.exists()) {
        throw new Error("Conversation not found");
      }

      return {
        id: conversationDoc.id,
        ...conversationDoc.data(),
      };
    } catch (error) {
      console.error("Error getting conversation:", error);
      throw error;
    }
  }

  // Updates the title of a conversation
  async updateConversationTitle(conversationId, title) {
    try {
      const conversationRef = doc(db, this.collectionName, conversationId);
      await updateDoc(conversationRef, {
        title,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error updating conversation title:", error);
      throw error;
    }
  }

  // Deletes a conversation (soft delete)
  async deleteConversation(conversationId) {
    try {
      const conversationRef = doc(db, this.collectionName, conversationId);
      await updateDoc(conversationRef, {
        isActive: false,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error deleting conversation:", error);
      throw error;
    }
  }

  // Permanently deletes a conversation
  async permanentDeleteConversation(conversationId) {
    try {
      const conversationRef = doc(db, this.collectionName, conversationId);
      await deleteDoc(conversationRef);
    } catch (error) {
      console.error("Error permanently deleting conversation:", error);
      throw error;
    }
  }

  // Gets recent conversations (for sidebar)
  async getRecentConversations(userId, limitCount = 10) {
    try {
      const q = query(
        collection(db, this.collectionName),
        where("userId", "==", userId),
        where("isActive", "==", true),
        orderBy("updatedAt", "desc"),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      const conversations = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        conversations.push({
          id: doc.id,
          title: data.title,
          updatedAt: data.updatedAt,
          messageCount: data.messages ? data.messages.length : 0,
        });
      });

      return conversations;
    } catch (error) {
      console.error("Error getting recent conversations:", error);
      throw error;
    }
  }

  // Generates an automatic title based on the first message
  generateAutoTitle(firstMessage) {
    if (!firstMessage || !firstMessage.content) {
      return "New Conversation";
    }

    const content = firstMessage.content.trim();
    if (content.length <= 50) {
      return content;
    }

    return content.substring(0, 47) + "...";
  }
}

export const conversationsService = new ConversationsService();
