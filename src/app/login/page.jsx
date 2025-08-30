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
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Validation
    if (!email || !password) {
      setError("All fields are required");
      setLoading(false);
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Redirect to dashboard or home page after successful login
      router.push("/");
    } catch (error) {
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
        default:
          setError("Login failed. Please try again.");
      }
    }
    setLoading(false);
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter your email address");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await sendPasswordResetEmail(auth, email);
      setResetEmailSent(true);
      setError("");
    } catch (error) {
      switch (error.code) {
        case "auth/user-not-found":
          setError("No account found with this email");
          break;
        case "auth/invalid-email":
          setError("Invalid email address");
          break;
        default:
          setError("Failed to send reset email. Please try again.");
      }
    }
    setLoading(false);
  };

  if (resetEmailSent) {
    return (
      <div className={styles.container}>
        <div className={styles.successCard}>
          <h2 className={styles.successTitle}>Reset Email Sent!</h2>
          <p className={styles.successMessage}>
            Check your email for password reset instructions.
          </p>
          <button
            className={styles.backButton}
            onClick={() => {
              setResetEmailSent(false);
              setShowForgotPassword(false);
            }}
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  if (showForgotPassword) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <h1 className={styles.title}>Reset Password</h1>
          <p className={styles.subtitle}>Enter your email to reset password</p>

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
                disabled={loading}
              />
            </div>

            {error && <div className={styles.error}>{error}</div>}

            <button
              type="submit"
              className={`${styles.submitButton} ${
                loading ? styles.loading : ""
              }`}
              disabled={loading}
            >
              {loading ? "Sending..." : "Send Reset Email"}
            </button>
          </form>

          <div className={styles.footer}>
            <p className={styles.footerText}>
              Remember your password?{" "}
              <button
                type="button"
                onClick={() => setShowForgotPassword(false)}
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
            />
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.forgotPasswordContainer}>
            <button
              type="button"
              onClick={() => setShowForgotPassword(true)}
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
