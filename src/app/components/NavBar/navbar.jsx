import styles from "./navbar.module.css";

export default function NavBar() {
  return (
    <nav className={styles.navbar}>
      <button className={styles.login}>Log In</button>
      <button className={styles.register}>Register</button>
    </nav>
  );
}
