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

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();

    setMessages((prev) => [...prev, { from: "user", text: userMessage }]);

    setInput("");

    setMessages((prev) => [...prev, { from: "bot", text: "Se încarcă..." }]);

    try {
      const res = await fetch("/api/deepseek", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage }),
      });

      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`);
      }

      const data = await res.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setMessages((prev) => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = { from: "bot", text: data.reply };
        return newMessages;
      });
    } catch (err) {
      console.error("Error sending message:", err);

      setMessages((prev) => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = {
          from: "bot",
          text: "Ne pare rău, a apărut o eroare. Te rog încearcă din nou.",
        };
        return newMessages;
      });
    }
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
