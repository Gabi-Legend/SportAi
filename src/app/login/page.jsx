"use client";
import { useState } from "react";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth } from "@/app/firebase/firebase";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Validate input
    if (!email || !password) {
      setError("All fields are required");
      setLoading(false);
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Redirect to home page after successful login
      router.push("/");
    } catch (error) {
      console.error("Login error:", error); // Pentru debugging
      switch (error.code) {
        case "auth/user-not-found":
          setError("No account found with this email");
          break;
        case "auth/wrong-password":
          setError("Incorrect password");
          break;
        case "auth/invalid-email":
          setError("Invalid email address");
          break;
        case "auth/user-disabled":
          setError("This account has been disabled");
          break;
        case "auth/too-many-requests":
          setError("Too many failed attempts. Please try again later");
          break;
        case "auth/invalid-credential":
          setError("Invalid email or password");
          break;
        default:
          setError(`Login failed: ${error.message}`);
      }
    }
    setLoading(false);
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();

    // Validare email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      setError("Please enter your email address");
      return;
    }

    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setResetLoading(true);
    setError("");

    try {
      // Trimite email simplu fără URL personalizat
      // Utilizatorul va fi redirectionat la o pagină Firebase generică
      await sendPasswordResetEmail(auth, email);

      setResetEmailSent(true);
      setError("");
      console.log("Password reset email sent successfully"); // Pentru debugging
    } catch (error) {
      console.error("Password reset error:", error); // Pentru debugging
      switch (error.code) {
        case "auth/user-not-found":
          setError("No account found with this email address");
          break;
        case "auth/invalid-email":
          setError("Invalid email address format");
          break;
        case "auth/too-many-requests":
          setError("Too many requests. Please wait before trying again");
          break;
        case "auth/network-request-failed":
          setError("Network error. Please check your connection");
          break;
        default:
          setError(`Failed to send reset email: ${error.message}`);
      }
    }
    setResetLoading(false);
  };

  if (resetEmailSent) {
    return (
      <div className={styles.container}>
        <div className={styles.successCard}>
          <h2 className={styles.successTitle}>Reset Email Sent!</h2>
          <p className={styles.successMessage}>
            We've sent a password reset link to <strong>{email}</strong>.
          </p>
          <p className={styles.successMessage}>
            Check your email inbox (and spam folder) for further instructions.
          </p>
          <div className={styles.buttonGroup}>
            <button
              className={styles.backButton}
              onClick={() => {
                setResetEmailSent(false);
                setShowForgotPassword(false);
                setEmail(""); // Curăță email-ul pentru securitate
              }}
            >
              Back to Login
            </button>
            <button
              className={styles.secondaryButton}
              onClick={() => {
                setResetEmailSent(false);
                // Rămâi pe ecranul de forgot password pentru a retrimite
              }}
            >
              Send Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (showForgotPassword) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <h1 className={styles.title}>Reset Password</h1>
          <p className={styles.subtitle}>
            Enter your email address and we'll send you a link to reset your
            password
          </p>

          <form onSubmit={handleForgotPassword} className={styles.form}>
            <div className={styles.inputGroup}>
              <label htmlFor="email" className={styles.label}>
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={styles.input}
                placeholder="Enter your email"
                disabled={resetLoading}
                required
              />
            </div>

            {error && <div className={styles.error}>{error}</div>}

            <button
              type="submit"
              className={`${styles.submitButton} ${
                resetLoading ? styles.loading : ""
              }`}
              disabled={resetLoading || !email.trim()}
            >
              {resetLoading ? "Sending..." : "Send Reset Email"}
            </button>
          </form>

          <div className={styles.footer}>
            <p className={styles.footerText}>
              Remember your password?{" "}
              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword(false);
                  setError(""); // Curăță erorile
                }}
                className={styles.linkButton}
              >
                Back to Login
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Welcome Back</h1>
        <p className={styles.subtitle}>Sign in to your account</p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="email" className={styles.label}>
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={styles.input}
              placeholder="Enter your email"
              disabled={loading}
              required
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="password" className={styles.label}>
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={styles.input}
              placeholder="Enter your password"
              disabled={loading}
              required
            />
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.forgotPasswordContainer}>
            <button
              type="button"
              onClick={() => {
                setShowForgotPassword(true);
                setError(""); // Curăță erorile
              }}
              className={styles.forgotPasswordLink}
            >
              Forgot your password?
            </button>
          </div>

          <button
            type="submit"
            className={`${styles.submitButton} ${
              loading ? styles.loading : ""
            }`}
            disabled={loading}
          >
            {loading ? "Signing In..." : "Sign In"}
          </button>
        </form>

        <div className={styles.footer}>
          <p className={styles.footerText}>
            Don't have an account?{" "}
            <a href="/register" className={styles.link}>
              Create one
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
