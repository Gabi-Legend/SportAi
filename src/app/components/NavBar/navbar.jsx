import styles from "./navbar.module.css";
import Link from "next/link";

export default function NavBar() {
  return (
    <nav className={styles.navbar}>
      <Link href="/login">
        <button className={styles.login}>Log in</button>
      </Link>
      <Link href="/register">
        <button className={styles.register}>Register</button>
      </Link>
    </nav>
  );
}
