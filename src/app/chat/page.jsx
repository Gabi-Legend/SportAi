"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import styles from "./chat.module.css";

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("online");
  const [retryCount, setRetryCount] = useState(0);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Auto-scroll la ultimul mesaj
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Mesaj de bun venit
  useEffect(() => {
    const welcomeMessage = {
      from: "bot",
      text: "👋 Bună! Sunt SportML Chat, asistentul tău AI pentru sport și machine learning. Cu ce te pot ajuta astăzi?",
      timestamp: new Date(),
    };
    setMessages([welcomeMessage]);
  }, []);

  // Verificare conexiune
  useEffect(() => {
    const checkConnection = () => {
      setConnectionStatus(navigator.onLine ? "online" : "offline");
    };

    window.addEventListener("online", checkConnection);
    window.addEventListener("offline", checkConnection);
    checkConnection();

    return () => {
      window.removeEventListener("online", checkConnection);
      window.removeEventListener("offline", checkConnection);
    };
  }, []);

  // Animație typing pentru bot
  const simulateTyping = useCallback((duration = 1000) => {
    setIsTyping(true);
    setTimeout(() => setIsTyping(false), duration);
  }, []);

  // Funcție pentru oprirea cererii în curs
  const stopCurrentRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  // Funcție pentru retry
  const retryLastMessage = useCallback(() => {
    if (messages.length >= 2) {
      const lastUserMessage = [...messages]
        .reverse()
        .find((msg) => msg.from === "user");
      if (lastUserMessage) {
        setInput(lastUserMessage.text);
        // Elimină ultimul mesaj de eroare
        setMessages((prev) => prev.slice(0, -1));
      }
    }
  }, [messages]);

  const sendMessage = useCallback(
    async (messageText = null) => {
      const messageToSend = messageText || input.trim();

      if (!messageToSend || isLoading) return;

      // Verifică conexiunea
      if (connectionStatus === "offline") {
        setMessages((prev) => [
          ...prev,
          {
            from: "bot",
            text: "❌ Nu ai conexiune la internet. Te rog verifică conexiunea și încearcă din nou.",
            timestamp: new Date(),
            isError: true,
          },
        ]);
        return;
      }

      const userMessage = {
        from: "user",
        text: messageToSend,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput("");
      setIsLoading(true);
      setRetryCount(0);

      // Simulează typing
      simulateTyping(500);

      // Adaugă mesaj de loading cu animație
      const loadingMessage = {
        from: "bot",
        text: "Se încarcă",
        timestamp: new Date(),
        isLoading: true,
      };

      setMessages((prev) => [...prev, loadingMessage]);

      // Creează abort controller pentru această cerere
      abortControllerRef.current = new AbortController();

      try {
        const response = await fetch("/api/deepseek", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: messageToSend }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          let errorMessage = "A apărut o eroare. Te rog încearcă din nou.";

          if (response.status === 429) {
            const data = await response.json().catch(() => ({}));
            errorMessage =
              data.error || "Prea multe cereri. Te rog așteaptă puțin.";
          } else if (response.status === 408) {
            errorMessage =
              "Cererea a depășit timpul limită. Te rog încearcă din nou.";
          } else if (response.status >= 500) {
            errorMessage =
              "Serviciul este temporar indisponibil. Te rog încearcă din nou.";
          }

          throw new Error(errorMessage);
        }

        const data = await response.json();

        if (data.error) {
          throw new Error(data.error);
        }

        // Înlocuiește mesajul de loading cu răspunsul
        setMessages((prev) => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = {
            from: "bot",
            text: data.reply,
            timestamp: new Date(),
            responseTime: data.responseTime,
            cached: data.cached,
          };
          return newMessages;
        });
      } catch (error) {
        console.error("Error sending message:", error);

        // Dacă cererea a fost anulată, nu afișa eroare
        if (error.name === "AbortError") {
          setMessages((prev) => prev.slice(0, -1)); // Elimină mesajul de loading
          return;
        }

        const errorMessage = {
          from: "bot",
          text: error.message,
          timestamp: new Date(),
          isError: true,
          canRetry: true,
        };

        setMessages((prev) => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1] = errorMessage;
          return newMessages;
        });

        setRetryCount((prev) => prev + 1);
      } finally {
        setIsLoading(false);
        setIsTyping(false);
        abortControllerRef.current = null;
      }
    },
    [input, isLoading, connectionStatus, simulateTyping]
  );

  // Cleanup la unmount
  useEffect(() => {
    return () => {
      stopCurrentRequest();
    };
  }, [stopCurrentRequest]);

  const handleKeyPress = useCallback(
    (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    },
    [sendMessage]
  );

  const clearChat = useCallback(() => {
    setMessages([
      {
        from: "bot",
        text: "👋 Chat curățat! Cu ce te pot ajuta?",
        timestamp: new Date(),
      },
    ]);
    setInput("");
    stopCurrentRequest();
  }, [stopCurrentRequest]);

  // Loading dots animation pentru mesajele în curs de încărcare
  const LoadingDots = () => (
    <span className={styles.loadingDots}>
      <span>.</span>
      <span>.</span>
      <span>.</span>
    </span>
  );

  return (
    <div className={styles.chatContainer}>
      <header className={styles.header}>
        <h1 className={styles.appName}>
          🏃‍♂️ SportML Chat
          <span
            className={`${styles.statusIndicator} ${styles[connectionStatus]}`}
          >
            {connectionStatus === "online" ? "🟢" : "🔴"}
          </span>
        </h1>
        <div className={styles.headerActions}>
          {isLoading && (
            <button
              className={styles.stopButton}
              onClick={stopCurrentRequest}
              title="Oprește cererea"
            >
              ⏹️
            </button>
          )}
          <button
            className={styles.clearButton}
            onClick={clearChat}
            title="Curăță conversația"
          >
            🗑️
          </button>
        </div>
      </header>

      <div className={styles.chatBox}>
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`${styles.message} ${
              msg.from === "user" ? styles.user : styles.bot
            } ${msg.isError ? styles.error : ""}`}
          >
            {/* Avatar */}
            <div
              className={`${styles.messageAvatar} ${
                msg.from === "user" ? styles.userAvatar : styles.botAvatar
              }`}
            >
              {msg.from === "user" ? "Tu" : "AI"}
            </div>

            <div className={styles.messageContent}>
              {msg.isLoading ? (
                <span>
                  Se încarcă <LoadingDots />
                </span>
              ) : (
                msg.text
              )}

              {msg.canRetry && (
                <button
                  className={styles.retryButton}
                  onClick={retryLastMessage}
                  title="Încearcă din nou"
                >
                  🔄
                </button>
              )}
            </div>

            <div className={styles.messageInfo}>
              <span className={styles.timestamp}>
                {msg.timestamp?.toLocaleTimeString("ro-RO", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              {msg.responseTime && (
                <span className={styles.responseTime}>
                  {msg.responseTime}ms
                </span>
              )}
              {msg.cached && (
                <span className={styles.cached} title="Răspuns din cache">
                  ⚡
                </span>
              )}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className={`${styles.message} ${styles.bot} ${styles.typing}`}>
            <div className={styles.messageContent}>
              Se gândește <LoadingDots />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className={styles.inputContainer}>
        <div className={styles.inputWrapper}>
          <textarea
            ref={inputRef}
            value={input}
            placeholder={
              connectionStatus === "offline"
                ? "Fără conexiune la internet..."
                : "Scrie întrebarea ta aici..."
            }
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            className={styles.messageInput}
            disabled={isLoading || connectionStatus === "offline"}
            rows="1"
            style={{
              resize: "none",
              minHeight: "30px",
              maxHeight: "30px",
              overflow: "hidden",
            }}
            onInput={(e) => {
              e.target.style.height = "auto";
              e.target.style.height =
                Math.min(e.target.scrollHeight, 120) + "px";
            }}
          />

          <button
            className={`${styles.sendButton} ${
              !input.trim() || isLoading || connectionStatus === "offline"
                ? styles.disabled
                : ""
            }`}
            onClick={() => sendMessage()}
            disabled={
              !input.trim() || isLoading || connectionStatus === "offline"
            }
            title={isLoading ? "Se încarcă..." : "Trimite mesajul"}
          >
            {isLoading ? "⏳" : "➤"}
          </button>
        </div>

        {retryCount > 0 && (
          <div className={styles.retryInfo}>Încercări eșuate: {retryCount}</div>
        )}

        <div className={styles.inputHints}>
          <span>Enter pentru a trimite • Shift+Enter pentru rând nou</span>
        </div>
      </div>
    </div>
  );
}
