import styles from "./Button.module.css";

export default function Button({
  variant = "secondary", // primary | secondary | ghost
  size = "md",           // sm | md
  icon: Icon,
  children,
  ...props
}) {
  return (
    <button className={`${styles.btn} ${styles[variant]} ${styles[size]}`} {...props}>
      {Icon && <Icon size={16} weight="fill" aria-hidden="true" />}
      {children}
    </button>
  );
}