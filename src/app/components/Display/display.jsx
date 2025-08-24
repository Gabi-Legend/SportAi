"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import styles from "./display.module.css";

export default function Display() {
  const [input, setInput] = useState("");
  const router = useRouter();

  const startChat = () => {
    if (!input) return;
    localStorage.setItem("firstMessage", input);
    router.push("/chat");
  };

  return (
    <div className={styles.displayContainer}>
      <h1 className={styles.appName}>SportML</h1>
      <p className={styles.tagline}>Your AI Sports Predictor</p>

      <div className={styles.startConv}>
        <div className={styles.inputBox}>
          <Search className={styles.icon} />
          <input
            type="text"
            placeholder="Ask me: Next F1 race winner..."
            className={styles.searchInput}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && startChat()}
          />
        </div>
        <button className={styles.sendBtn} onClick={startChat}>
          Send
        </button>
      </div>
    </div>
  );
}
