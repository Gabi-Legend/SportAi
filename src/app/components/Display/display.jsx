"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "@/app/firebase/firebase";
import { User, LogOut, MessageSquare } from "lucide-react";
import ConversationsSidebar from "../ConversationsSidebar/ConversationsSidebar";
import { useConversationsRealtime as useConversations } from "@/app/hooks/useConversationRealtime";
import styles from "./display.module.css";

export default function Display() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { currentConversation, createNewConversation, isAuthenticated } =
    useConversations();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);

      if (currentUser) setSidebarOpen(true);
    });

    return () => unsubscribe();
  }, []);

  const startChat = async () => {
    if (user) {
      try {
        const newConversation = await createNewConversation();
        router.push(`/chat?conversationId=${newConversation.id}`);
      } catch (error) {
        console.error("Error creating conversation:", error);
        router.push("/chat");
      }
    } else {
      router.push("/chat");
    }
  };

  const handleLogin = () => router.push("/login");
  const handleRegister = () => router.push("/register");
  const handleLogout = async () => {
    try {
      await signOut(auth);
      setShowUserMenu(false);
      setSidebarOpen(false);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const toggleUserMenu = () => setShowUserMenu(!showUserMenu);

  const handleConversationSelect = (conversation) => {
    router.push(`/chat?conversationId=${conversation.id}`);
  };

  return (
    <>
      <ConversationsSidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        onConversationSelect={handleConversationSelect}
      />

      <div
        className={`${styles.displayContainer} ${
          sidebarOpen ? styles.withSidebar : ""
        }`}
      >
        <div className={styles.backgroundElements}>
          <div className={`${styles.floatingBall} ${styles.ball1}`}></div>
          <div className={`${styles.floatingBall} ${styles.ball2}`}></div>
          <div className={`${styles.floatingBall} ${styles.ball3}`}></div>
          <div className={styles.gridPattern}></div>
        </div>

        <div className={styles.authSection}>
          {loading ? (
            <div className={styles.authLoading}>Loading...</div>
          ) : user ? (
            <div className={styles.userProfile}>
              <div className={styles.userAvatar} onClick={toggleUserMenu}>
                <User size={20} />
                <span className={styles.userEmail}>{user.email}</span>
              </div>
              {showUserMenu && (
                <div className={styles.userMenu}>
                  <div className={styles.userInfo}>
                    <p className={styles.userEmailFull}>{user.email}</p>
                  </div>
                  <button className={styles.logoutBtn} onClick={handleLogout}>
                    <LogOut size={16} />
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className={styles.authButtons}>
              <button className={styles.loginBtn} onClick={handleLogin}>
                Login
              </button>
              <button className={styles.registerBtn} onClick={handleRegister}>
                Register
              </button>
            </div>
          )}
        </div>

        <div className={styles.heroSection}>
          <h1 className={styles.appName}>
            <span className={styles.sport}>Sport</span>
            <span className={styles.ml}>ML</span>
          </h1>
          <p className={styles.tagline}>
            Smart sports predictions powered by AI
          </p>

          <div className={styles.features}>
            <div className={styles.feature}>
              <span className={styles.featureIcon}>🎯</span>
              <span>Accurate predictions</span>
            </div>
            <div className={styles.feature}>
              <span className={styles.featureIcon}>⚡</span>
              <span>Instant responses</span>
            </div>
            <div className={styles.feature}>
              <span className={styles.featureIcon}>📊</span>
              <span>Detailed analysis</span>
            </div>
            {user && (
              <div className={styles.feature}>
                <span className={styles.featureIcon}>💾</span>
                <span>Saved conversations</span>
              </div>
            )}
          </div>

          <button className={styles.startBtn} onClick={startChat}>
            <span className={styles.buttonText}>
              {user ? "🚀 Start the conversation" : "🚀 Start (unsaved)"}
            </span>
            <div className={styles.buttonGlow}></div>
          </button>

          <p className={styles.subtitle}>Powered by DeepSeek AI</p>

          {!user && (
            <p className={styles.authHint}>
              <MessageSquare size={16} />
              Log in to save your conversations
            </p>
          )}
        </div>
      </div>
    </>
  );
}
