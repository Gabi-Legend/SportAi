"use client";
import { useRouter } from "next/navigation";
import styles from "./display.module.css";

export default function Display() {
  const router = useRouter();

  const startChat = () => {
    router.push("/chat");
  };

  return (
    <div className={styles.displayContainer}>
      <div className={styles.heroSection}>
        <h1 className={styles.appName}>SportML</h1>
        <p className={styles.tagline}>Your AI Sports Predictor</p>

        <button className={styles.startBtn} onClick={startChat}>
          🚀 Start Chat
        </button>
      </div>
    </div>
  );
}
