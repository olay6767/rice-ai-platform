"use client";

import {
  forwardRef,
  type HTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from "react";
import { X } from "lucide-react";

export type BadgeVariant =
  | "neutral"
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "purple"
  | "outline";

export type BadgeSize = "xs" | "sm" | "md" | "lg";

export type BadgeShape =
  | "rounded"
  | "pill"
  | "square";

export interface BadgeProps
  extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  /**
   * เนื้อหาภายใน Badge
   */
  children?: ReactNode;

  /**
   * รูปแบบสี
   */
  variant?: BadgeVariant;

  /**
   * ขนาด
   */
  size?: BadgeSize;

  /**
   * รูปทรง
   */
  shape?: BadgeShape;

  /**
   * Icon ด้านซ้าย
   */
  startIcon?: ReactNode;

  /**
   * Icon ด้านขวา
   */
  endIcon?: ReactNode;

  /**
   * แสดงจุดสถานะด้านซ้าย
   */
  dot?: boolean;

  /**
   * ทำให้จุดสถานะกะพริบ
   */
  pulse?: boolean;

  /**
   * ปิดการใช้งาน Badge
   */
  disabled?: boolean;

  /**
   * ทำให้ Badge ขยายเต็มความกว้าง
   */
  fullWidth?: boolean;

  /**
   * Callback เมื่อกดปุ่มลบ Badge
   *
   * เมื่อกำหนดค่านี้ ปุ่ม X จะถูกแสดงอัตโนมัติ
   */
  onRemove?: () => void;

  /**
   * Accessibility label ของปุ่มลบ
   */
  removeAriaLabel?: string;

  /**
   * ป้องกัน Click Event ของปุ่มลบ
   * ไม่ให้ส่งต่อไปยัง Parent
   */
  stopRemovePropagation?: boolean;
}

export interface BadgeCountProps
  extends Omit<BadgeProps, "children"> {
  /**
   * จำนวนที่แสดง
   */
  count: number;

  /**
   * จำนวนสูงสุดก่อนแสดงเครื่องหมาย +
   *
   * ตัวอย่าง:
   * count = 120
   * max = 99
   * แสดงเป็น 99+
   */
  max?: number;

  /**
   * ซ่อน Badge เมื่อ count เป็น 0
   */
  hideWhenZero?: boolean;
}

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  neutral: [
    "border border-gray-200",
    "bg-gray-100 text-gray-700",

    "dark:border-gray-700",
    "dark:bg-gray-800",
    "dark:text-gray-200",
  ].join(" "),

  primary: [
    "border border-green-200",
    "bg-green-100 text-green-700",

    "dark:border-green-900",
    "dark:bg-green-950/70",
    "dark:text-green-300",
  ].join(" "),

  success: [
    "border border-emerald-200",
    "bg-emerald-100 text-emerald-700",

    "dark:border-emerald-900",
    "dark:bg-emerald-950/70",
    "dark:text-emerald-300",
  ].join(" "),

  warning: [
    "border border-amber-200",
    "bg-amber-100 text-amber-800",

    "dark:border-amber-900",
    "dark:bg-amber-950/70",
    "dark:text-amber-300",
  ].join(" "),

  danger: [
    "border border-red-200",
    "bg-red-100 text-red-700",

    "dark:border-red-900",
    "dark:bg-red-950/70",
    "dark:text-red-300",
  ].join(" "),

  info: [
    "border border-blue-200",
    "bg-blue-100 text-blue-700",

    "dark:border-blue-900",
    "dark:bg-blue-950/70",
    "dark:text-blue-300",
  ].join(" "),

  purple: [
    "border border-purple-200",
    "bg-purple-100 text-purple-700",

    "dark:border-purple-900",
    "dark:bg-purple-950/70",
    "dark:text-purple-300",
  ].join(" "),

  outline: [
    "border border-gray-300",
    "bg-transparent text-gray-700",

    "dark:border-gray-700",
    "dark:text-gray-200",
  ].join(" "),
};

const SIZE_CLASSES: Record<BadgeSize, string> = {
  xs: "min-h-5 gap-1 px-1.5 py-0.5 text-[10px]",
  sm: "min-h-6 gap-1 px-2 py-0.5 text-xs",
  md: "min-h-7 gap-1.5 px-2.5 py-1 text-xs",
  lg: "min-h-8 gap-1.5 px-3 py-1 text-sm",
};

const SHAPE_CLASSES: Record<BadgeShape, string> = {
  rounded: "rounded-md",
  pill: "rounded-full",
  square: "rounded-none",
};

const ICON_SIZE_CLASSES: Record<BadgeSize, string> = {
  xs: "[&>svg]:h-3 [&>svg]:w-3",
  sm: "[&>svg]:h-3.5 [&>svg]:w-3.5",
  md: "[&>svg]:h-4 [&>svg]:w-4",
  lg: "[&>svg]:h-[18px] [&>svg]:w-[18px]",
};

const DOT_SIZE_CLASSES: Record<BadgeSize, string> = {
  xs: "h-1.5 w-1.5",
  sm: "h-1.5 w-1.5",
  md: "h-2 w-2",
  lg: "h-2 w-2",
};

const REMOVE_BUTTON_SIZE_CLASSES: Record<
  BadgeSize,
  string
> = {
  xs: "-mr-1 h-4 w-4",
  sm: "-mr-1.5 h-5 w-5",
  md: "-mr-1.5 h-5 w-5",
  lg: "-mr-2 h-6 w-6",
};

const DOT_COLOR_CLASSES: Record<BadgeVariant, string> = {
  neutral: "bg-gray-500 dark:bg-gray-400",
  primary: "bg-green-600 dark:bg-green-400",
  success: "bg-emerald-600 dark:bg-emerald-400",
  warning: "bg-amber-600 dark:bg-amber-400",
  danger: "bg-red-600 dark:bg-red-400",
  info: "bg-blue-600 dark:bg-blue-400",
  purple: "bg-purple-600 dark:bg-purple-400",
  outline: "bg-gray-500 dark:bg-gray-400",
};

function cn(
  ...classNames: Array<string | null | undefined | false>
): string {
  return classNames.filter(Boolean).join(" ");
}

/**
 * คืนค่า className ของ Badge
 *
 * สามารถใช้กับ Element อื่น เช่น Link ได้
 */
export function badgeVariants({
  variant = "neutral",
  size = "sm",
  shape = "pill",
  disabled = false,
  fullWidth = false,
  className,
}: {
  variant?: BadgeVariant;
  size?: BadgeSize;
  shape?: BadgeShape;
  disabled?: boolean;
  fullWidth?: boolean;
  className?: string;
} = {}): string {
  return cn(
    "inline-flex shrink-0 items-center justify-center",
    "whitespace-nowrap font-medium leading-none",
    "transition-[background-color,border-color,color,opacity]",
    "duration-200",

    VARIANT_CLASSES[variant],
    SIZE_CLASSES[size],
    SHAPE_CLASSES[shape],

    fullWidth && "w-full",

    disabled && [
      "cursor-not-allowed",
      "select-none opacity-50",
    ].join(" "),

    className
  );
}

/**
 * Badge พื้นฐานของ Rice AI Platform
 */
const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  function Badge(
    {
      children,

      variant = "neutral",
      size = "sm",
      shape = "pill",

      startIcon,
      endIcon,

      dot = false,
      pulse = false,

      disabled = false,
      fullWidth = false,

      onRemove,
      removeAriaLabel = "ลบรายการ",
      stopRemovePropagation = true,

      className,

      "aria-disabled": ariaDisabled,

      ...badgeProps
    },
    forwardedRef
  ) {
    const handleRemove = (
      event: MouseEvent<HTMLButtonElement>
    ): void => {
      if (stopRemovePropagation) {
        event.stopPropagation();
      }

      if (disabled) {
        event.preventDefault();
        return;
      }

      onRemove?.();
    };

    return (
      <span
        {...badgeProps}
        ref={forwardedRef}
        aria-disabled={
          ariaDisabled ?? (disabled || undefined)
        }
        data-component="badge"
        data-variant={variant}
        data-size={size}
        data-shape={shape}
        data-disabled={disabled ? "true" : "false"}
        className={badgeVariants({
          variant,
          size,
          shape,
          disabled,
          fullWidth,
          className,
        })}
      >
        {dot && (
          <span
            aria-hidden="true"
            data-slot="badge-dot"
            className={cn(
              "relative inline-flex shrink-0",
              DOT_SIZE_CLASSES[size]
            )}
          >
            {pulse && (
              <span
                className={cn(
                  "absolute inline-flex h-full w-full",
                  "animate-ping rounded-full opacity-60",
                  DOT_COLOR_CLASSES[variant]
                )}
              />
            )}

            <span
              className={cn(
                "relative inline-flex h-full w-full",
                "rounded-full",
                DOT_COLOR_CLASSES[variant]
              )}
            />
          </span>
        )}

        {startIcon && (
          <span
            aria-hidden="true"
            data-slot="badge-start-icon"
            className={cn(
              "inline-flex shrink-0",
              "items-center justify-center",
              ICON_SIZE_CLASSES[size]
            )}
          >
            {startIcon}
          </span>
        )}

        {children !== undefined &&
          children !== null && (
            <span
              data-slot="badge-label"
              className="min-w-0 truncate"
            >
              {children}
            </span>
          )}

        {endIcon && !onRemove && (
          <span
            aria-hidden="true"
            data-slot="badge-end-icon"
            className={cn(
              "inline-flex shrink-0",
              "items-center justify-center",
              ICON_SIZE_CLASSES[size]
            )}
          >
            {endIcon}
          </span>
        )}

        {onRemove && (
          <button
            type="button"
            disabled={disabled}
            aria-label={removeAriaLabel}
            title={removeAriaLabel}
            data-slot="badge-remove-button"
            onClick={handleRemove}
            className={cn(
              "inline-flex shrink-0",
              "items-center justify-center",
              "rounded-full",

              "transition-colors",

              "hover:bg-black/10",
              "focus-visible:outline-none",
              "focus-visible:ring-2",
              "focus-visible:ring-current",
              "focus-visible:ring-offset-1",

              "disabled:cursor-not-allowed",
              "disabled:opacity-50",

              "dark:hover:bg-white/10",

              REMOVE_BUTTON_SIZE_CLASSES[size]
            )}
          >
            <X
              aria-hidden="true"
              className={cn(
                size === "xs" && "h-2.5 w-2.5",
                size === "sm" && "h-3 w-3",
                size === "md" && "h-3.5 w-3.5",
                size === "lg" && "h-4 w-4"
              )}
            />
          </button>
        )}
      </span>
    );
  }
);

Badge.displayName = "Badge";

/**
 * Badge สำหรับแสดงจำนวน
 */
const BadgeCount = forwardRef<
  HTMLSpanElement,
  BadgeCountProps
>(function BadgeCount(
  {
    count,
    max = 99,
    hideWhenZero = false,
    variant = "danger",
    size = "xs",
    shape = "pill",
    "aria-label": ariaLabel,
    ...badgeProps
  },
  forwardedRef
) {
  const safeCount = Number.isFinite(count)
    ? Math.max(0, Math.floor(count))
    : 0;

  const safeMax = Number.isFinite(max)
    ? Math.max(1, Math.floor(max))
    : 99;

  if (hideWhenZero && safeCount === 0) {
    return null;
  }

  const displayCount =
    safeCount > safeMax
      ? `${safeMax}+`
      : String(safeCount);

  return (
    <Badge
      {...badgeProps}
      ref={forwardedRef}
      variant={variant}
      size={size}
      shape={shape}
      aria-label={
        ariaLabel ??
        `${safeCount} รายการ`
      }
      className={cn(
        "min-w-5 px-1.5 tabular-nums",
        badgeProps.className
      )}
    >
      {displayCount}
    </Badge>
  );
});

BadgeCount.displayName = "BadgeCount";

export {
  Badge,
  BadgeCount,
};

export default Badge;