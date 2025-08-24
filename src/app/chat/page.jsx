"use client";
import { useState, useEffect } from "react";
import styles from "./chat.module.css";

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  useEffect(() => {
    const firstMessage = localStorage.getItem("firstMessage");
    if (firstMessage) {
      setMessages([{ from: "user", text: firstMessage }]);
      localStorage.removeItem("firstMessage");
    }
  }, []);

  const sendMessage = () => {
    if (!input) return;
    setMessages([...messages, { from: "user", text: input }]);
    setInput("");
  };

  return (
    <div className={styles.chatContainer}>
      <h1 className={styles.appName}>SportML Chat</h1>
      <div className={styles.chatBox}>
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`${styles.message} ${
              msg.from === "user" ? styles.user : styles.bot
            }`}
          >
            {msg.text}
          </div>
        ))}
      </div>

      <div className={styles.startConv}>
        <input
          type="text"
          value={input}
          placeholder="Type your question..."
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          className={styles.searchInput}
        />
        <button className={styles.sendBtn} onClick={sendMessage}>
          Send
        </button>
      </div>
    </div>
  );
}
