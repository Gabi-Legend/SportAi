"use client";
import { useRouter } from "next/navigation";
import styles from "./display.module.css";
import { Football } from "lucide-react";

export default function Display() {
  const router = useRouter();

  const startChat = () => {
    router.push("/chat");
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
