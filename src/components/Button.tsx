import Link from "next/link";

const base =
  "inline-block rounded px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50";

const variants = {
  primary:
    "bg-primary text-primary-foreground hover:bg-primary-hover focus:ring-offset-white",
  secondary:
    "border border-gray-300 bg-white text-content-foreground hover:bg-gray-50 focus:ring-offset-white",
};

type BaseProps = {
  variant?: "primary" | "secondary";
  className?: string;
  children: React.ReactNode;
};

type ButtonAsButton = BaseProps & {
  href?: never;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
};

type ButtonAsLink = BaseProps & {
  href: string;
  type?: never;
  disabled?: never;
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
};

export type ButtonProps = ButtonAsButton | ButtonAsLink;

export default function Button(props: ButtonProps) {
  const { variant = "primary", className = "", children } = props;
  const style = `${base} ${variants[variant]} ${className}`.trim();

  if ("href" in props && props.href != null) {
    const { href, onClick } = props;
    return (
      <Link href={href} className={style} onClick={onClick}>
        {children}
      </Link>
    );
  }

  const { type = "button", disabled, onClick } = props;
  return (
    <button type={type} disabled={disabled} onClick={onClick} className={style}>
      {children}
    </button>
  );
}
