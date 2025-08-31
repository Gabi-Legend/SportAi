"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "@/app/firebase/firebase";
import { User, LogOut, MessageSquare } from "lucide-react";
import ConversationsSidebar from "@/components/ConversationsSidebar";
import { useConversations } from "@/hooks/useConversations";
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

      // Deschide sidebar-ul automat când utilizatorul se conectează
      if (currentUser) {
        setSidebarOpen(true);
      }
    });

    return () => unsubscribe();
  }, []);

  const startChat = async () => {
    if (user) {
      // Dacă utilizatorul este conectat, creează o conversație nouă
      try {
        const newConversation = await createNewConversation();
        router.push(`/chat?conversationId=${newConversation.id}`);
      } catch (error) {
        console.error("Error creating conversation:", error);
        // Fallback la chat normal
        router.push("/chat");
      }
    } else {
      // Dacă nu este conectat, mergi direct la chat
      router.push("/chat");
    }
  };

  const handleLogin = () => {
    router.push("/login");
  };

  const handleRegister = () => {
    router.push("/register");
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setShowUserMenu(false);
      setSidebarOpen(false);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const toggleUserMenu = () => {
    setShowUserMenu(!showUserMenu);
  };

  const handleConversationSelect = (conversation) => {
    router.push(`/chat?conversationId=${conversation.id}`);
  };

  return (
    <>
      {/* Conversations Sidebar */}
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
        {/* Background elements */}
        <div className={styles.backgroundElements}>
          <div className={`${styles.floatingBall} ${styles.ball1}`}></div>
          <div className={`${styles.floatingBall} ${styles.ball2}`}></div>
          <div className={`${styles.floatingBall} ${styles.ball3}`}></div>
          <div className={styles.gridPattern}></div>
        </div>

        {/* Auth Section */}
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
          {/* Main title with enhanced styling */}
          <h1 className={styles.appName}>
            <span className={styles.sport}>Sport</span>
            <span className={styles.ml}>ML</span>
          </h1>

          {/* Enhanced tagline */}
          <p className={styles.tagline}>
            Predicții sportive inteligente cu puterea AI
          </p>

          {/* Feature highlights */}
          <div className={styles.features}>
            <div className={styles.feature}>
              <span className={styles.featureIcon}>🎯</span>
              <span>Predicții precise</span>
            </div>
            <div className={styles.feature}>
              <span className={styles.featureIcon}>⚡</span>
              <span>Răspunsuri instant</span>
            </div>
            <div className={styles.feature}>
              <span className={styles.featureIcon}>📊</span>
              <span>Analize detaliate</span>
            </div>
            {user && (
              <div className={styles.feature}>
                <span className={styles.featureIcon}>💾</span>
                <span>Conversații salvate</span>
              </div>
            )}
          </div>

          {/* Enhanced start button */}
          <button className={styles.startBtn} onClick={startChat}>
            <span className={styles.buttonText}>
              {user ? "🚀 Începe conversația" : "🚀 Începe (fără salvare)"}
            </span>
            <div className={styles.buttonGlow}></div>
          </button>

          {/* Additional info */}
          <p className={styles.subtitle}>Powered by DeepSeek AI</p>

          {!user && (
            <p className={styles.authHint}>
              <MessageSquare size={16} />
              Conectează-te pentru a salva conversațiile
            </p>
          )}
        </div>
      </div>
    </>
  );
}
