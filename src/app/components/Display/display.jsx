"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "@/app/firebase/firebase";
import { User, LogOut } from "lucide-react";
import styles from "./display.module.css";

export default function Display() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const startChat = () => {
    router.push("/chat");
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
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const toggleUserMenu = () => {
    setShowUserMenu(!showUserMenu);
  };

  return (
    <div className={styles.displayContainer}>
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
        </div>

        {/* Enhanced start button */}
        <button className={styles.startBtn} onClick={startChat}>
          <span className={styles.buttonText}>🚀 Începe conversația</span>
          <div className={styles.buttonGlow}></div>
        </button>

        {/* Additional info */}
        <p className={styles.subtitle}>Powered by DeepSeek AI</p>
      </div>
    </div>
  );
}
