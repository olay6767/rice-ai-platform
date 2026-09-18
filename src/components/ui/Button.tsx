import {
  forwardRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import { LoaderCircle } from "lucide-react";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "soft"
  | "success"
  | "warning"
  | "danger";

export type ButtonSize =
  | "xs"
  | "sm"
  | "md"
  | "lg"
  | "xl"
  | "icon";

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * รูปแบบสีของปุ่ม
   */
  variant?: ButtonVariant;

  /**
   * ขนาดของปุ่ม
   */
  size?: ButtonSize;

  /**
   * สถานะกำลังประมวลผล
   *
   * เมื่อเป็น true ปุ่มจะถูก disabled อัตโนมัติ
   */
  loading?: boolean;

  /**
   * ข้อความที่แสดงระหว่าง Loading
   */
  loadingText?: string;

  /**
   * ไอคอนด้านซ้าย
   */
  startIcon?: ReactNode;

  /**
   * ไอคอนด้านขวา
   */
  endIcon?: ReactNode;

  /**
   * ขยายเต็มความกว้างของ Container
   */
  fullWidth?: boolean;

  /**
   * ปิดเอฟเฟกต์ย่อเมื่อกด
   */
  disablePressEffect?: boolean;
}

export interface ButtonVariantsOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  disabled?: boolean;
  loading?: boolean;
  disablePressEffect?: boolean;
  className?: string;
}

const BASE_CLASSES = [
  "relative inline-flex shrink-0 items-center justify-center",
  "select-none whitespace-nowrap",
  "font-heading font-semibold",
  "outline-none",
  "transition-[transform,background-color,border-color,color,box-shadow,opacity]",
  "duration-300 ease-premium",

  "focus-visible:ring-2",
  "focus-visible:ring-rice-leaf",
  "focus-visible:ring-offset-2",
  "focus-visible:ring-offset-rice-background",

  "disabled:pointer-events-none",
  "disabled:cursor-not-allowed",
  "disabled:opacity-55",

  "dark:focus-visible:ring-rice-mint",
  "dark:focus-visible:ring-offset-rice-dark",
].join(" ");

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: [
    "border border-transparent",
    "bg-rice-natural text-white",
    "shadow-primary",

    "hover:-translate-y-0.5",
    "hover:bg-rice-forest",
    "hover:shadow-primary-hover",

    "dark:bg-rice-mint-light",
    "dark:text-rice-dark",
    "dark:hover:bg-rice-mint",
  ].join(" "),

  secondary: [
    "border border-white/80",
    "bg-white/75",
    "text-rice-forest",
    "shadow-glass",
    "backdrop-blur-glass",

    "hover:-translate-y-0.5",
    "hover:border-white",
    "hover:bg-white/95",
    "hover:shadow-card-hover",

    "dark:border-white/10",
    "dark:bg-white/[0.07]",
    "dark:text-white",
    "dark:hover:bg-white/[0.11]",
  ].join(" "),

  outline: [
    "border border-rice-forest/15",
    "bg-transparent",
    "text-rice-forest",

    "hover:-translate-y-0.5",
    "hover:border-rice-leaf/40",
    "hover:bg-rice-mint/20",

    "dark:border-white/15",
    "dark:text-rice-mint-light",
    "dark:hover:border-rice-mint/30",
    "dark:hover:bg-rice-mint/10",
  ].join(" "),

  ghost: [
    "border border-transparent",
    "bg-transparent",
    "text-rice-muted",

    "hover:bg-rice-forest/[0.06]",
    "hover:text-rice-forest",

    "dark:text-white/75",
    "dark:hover:bg-white/[0.08]",
    "dark:hover:text-white",
  ].join(" "),

  soft: [
    "border border-rice-mint/50",
    "bg-rice-mint/35",
    "text-rice-forest",

    "hover:-translate-y-0.5",
    "hover:border-rice-mint",
    "hover:bg-rice-mint/55",
    "hover:shadow-mint",

    "dark:border-rice-leaf/25",
    "dark:bg-rice-leaf/15",
    "dark:text-rice-mint-light",
    "dark:hover:bg-rice-leaf/25",
  ].join(" "),

  success: [
    "border border-transparent",
    "bg-[#347846]",
    "text-white",
    "shadow-[0_10px_28px_rgba(52,120,70,0.18)]",

    "hover:-translate-y-0.5",
    "hover:bg-[#286238]",
    "hover:shadow-[0_16px_38px_rgba(52,120,70,0.24)]",

    "focus-visible:ring-[#347846]",

    "dark:bg-[#7FC993]",
    "dark:text-[#06120B]",
    "dark:hover:bg-[#95D7A6]",
  ].join(" "),

  warning: [
    "border border-transparent",
    "bg-rice-gold",
    "text-rice-dark",
    "shadow-gold",

    "hover:-translate-y-0.5",
    "hover:bg-[#C79E42]",
    "hover:shadow-[0_16px_38px_rgba(216,180,91,0.24)]",

    "focus-visible:ring-rice-gold",
  ].join(" "),

  danger: [
    "border border-transparent",
    "bg-rice-error",
    "text-white",
    "shadow-[0_10px_28px_rgba(186,26,26,0.16)]",

    "hover:-translate-y-0.5",
    "hover:bg-[#981313]",
    "hover:shadow-[0_16px_38px_rgba(186,26,26,0.22)]",

    "focus-visible:ring-rice-error",

    "dark:bg-[#FFB4AB]",
    "dark:text-[#690005]",
    "dark:hover:bg-[#FFDAD6]",
  ].join(" "),
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  xs: [
    "h-8 min-h-8",
    "gap-1.5 rounded-xl",
    "px-3",
    "text-xs",
  ].join(" "),

  sm: [
    "h-10 min-h-10",
    "gap-2 rounded-control",
    "px-4",
    "text-sm",
  ].join(" "),

  md: [
    "h-touch min-h-touch",
    "gap-2 rounded-control",
    "px-5",
    "text-sm",
  ].join(" "),

  lg: [
    "h-12 min-h-12",
    "gap-2.5 rounded-pill",
    "px-6",
    "text-sm",
  ].join(" "),

  xl: [
    "h-14 min-h-14",
    "gap-2.5 rounded-pill",
    "px-7",
    "text-base",
  ].join(" "),

  icon: [
    "h-touch w-touch",
    "min-h-touch min-w-touch",
    "rounded-control p-0",
  ].join(" "),
};

const ICON_SIZE_CLASSES: Record<ButtonSize, string> = {
  xs: "[&>svg]:h-3.5 [&>svg]:w-3.5",
  sm: "[&>svg]:h-4 [&>svg]:w-4",
  md: "[&>svg]:h-[18px] [&>svg]:w-[18px]",
  lg: "[&>svg]:h-5 [&>svg]:w-5",
  xl: "[&>svg]:h-5 [&>svg]:w-5",
  icon: "[&>svg]:h-5 [&>svg]:w-5",
};

const SPINNER_SIZE_CLASSES: Record<ButtonSize, string> = {
  xs: "h-3.5 w-3.5",
  sm: "h-4 w-4",
  md: "h-[18px] w-[18px]",
  lg: "h-5 w-5",
  xl: "h-5 w-5",
  icon: "h-5 w-5",
};

/**
 * รวม className โดยไม่ต้องติดตั้ง clsx
 */
export function cn(
  ...classNames: Array<
    string | null | undefined | false
  >
): string {
  return classNames.filter(Boolean).join(" ");
}

/**
 * สร้าง className ของปุ่ม
 *
 * ใช้กับ Next.js Link หรือ Element อื่นได้
 */
export function buttonVariants({
  variant = "primary",
  size = "md",
  fullWidth = false,
  disabled = false,
  loading = false,
  disablePressEffect = false,
  className,
}: ButtonVariantsOptions = {}): string {
  const isDisabled = disabled || loading;

  return cn(
    BASE_CLASSES,
    VARIANT_CLASSES[variant],
    SIZE_CLASSES[size],

    fullWidth && "w-full",

    !isDisabled &&
      !disablePressEffect &&
      [
        "active:translate-y-0",
        "active:scale-[0.98]",
      ].join(" "),

    isDisabled && "translate-y-0 shadow-none",

    className
  );
}

/**
 * ปุ่มพื้นฐานของ Rice AI
 */
const Button = forwardRef<
  HTMLButtonElement,
  ButtonProps
>(function Button(
  {
    children,
    type = "button",

    variant = "primary",
    size = "md",

    loading = false,
    loadingText,

    startIcon,
    endIcon,

    fullWidth = false,
    disablePressEffect = false,

    disabled = false,

    className,

    "aria-label": ariaLabel,
    "aria-describedby": ariaDescribedBy,

    ...buttonProps
  },
  forwardedRef
) {
  const isDisabled = disabled || loading;
  const isIconButton = size === "icon";

  const hasVisibleChildren =
    children !== undefined &&
    children !== null &&
    !isIconButton;

  const resolvedLoadingText =
    loadingText ?? "กำลังประมวลผล...";

  return (
    <button
      {...buttonProps}
      ref={forwardedRef}
      type={type}
      disabled={isDisabled}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      aria-disabled={isDisabled || undefined}
      aria-busy={loading || undefined}
      data-component="button"
      data-variant={variant}
      data-size={size}
      data-loading={loading ? "true" : "false"}
      className={buttonVariants({
        variant,
        size,
        fullWidth,
        disabled,
        loading,
        disablePressEffect,
        className,
      })}
    >
      {loading ? (
        <>
          <LoaderCircle
            aria-hidden="true"
            className={cn(
              "shrink-0 animate-spin",
              SPINNER_SIZE_CLASSES[size]
            )}
          />

          {isIconButton ? (
            <span className="sr-only">
              {resolvedLoadingText}
            </span>
          ) : (
            <span className="min-w-0 truncate">
              {loadingText ?? children ?? resolvedLoadingText}
            </span>
          )}
        </>
      ) : (
        <>
          {startIcon !== undefined &&
            startIcon !== null && (
              <span
                aria-hidden="true"
                data-slot="button-start-icon"
                className={cn(
                  "inline-flex shrink-0",
                  "items-center justify-center",
                  ICON_SIZE_CLASSES[size]
                )}
              >
                {startIcon}
              </span>
            )}

          {hasVisibleChildren && (
            <span
              data-slot="button-label"
              className="min-w-0 truncate"
            >
              {children}
            </span>
          )}

          {isIconButton &&
            children !== undefined &&
            children !== null && (
              <span
                aria-hidden={
                  ariaLabel ? "true" : undefined
                }
                className={cn(
                  "inline-flex shrink-0",
                  "items-center justify-center",
                  ICON_SIZE_CLASSES[size]
                )}
              >
                {children}
              </span>
            )}

          {endIcon !== undefined &&
            endIcon !== null && (
              <span
                aria-hidden="true"
                data-slot="button-end-icon"
                className={cn(
                  "inline-flex shrink-0",
                  "items-center justify-center",
                  ICON_SIZE_CLASSES[size]
                )}
              >
                {endIcon}
              </span>
            )}
        </>
      )}
    </button>
  );
});

Button.displayName = "Button";

export default Button;