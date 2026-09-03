import {
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
} from "react";

export type CardVariant =
  | "default"
  | "glass"
  | "surface"
  | "soft"
  | "outlined"
  | "elevated"
  | "dark"
  | "mint"
  | "gold"
  | "success"
  | "warning"
  | "danger";

export type CardPadding =
  | "none"
  | "sm"
  | "md"
  | "lg";

export type CardRadius =
  | "md"
  | "lg"
  | "xl"
  | "2xl"
  | "3xl";

export type CardOverflow =
  | "hidden"
  | "visible";

export interface CardProps
  extends HTMLAttributes<HTMLDivElement> {
  /**
   * รูปแบบของ Card
   */
  variant?: CardVariant;

  /**
   * ระยะห่างภายใน Card
   *
   * แนะนำใช้ "none" เมื่อมี CardHeader,
   * CardContent และ CardFooter อยู่ภายใน
   */
  padding?: CardPadding;

  /**
   * ความโค้งของมุม
   */
  radius?: CardRadius;

  /**
   * เพิ่มเอฟเฟกต์ Hover
   *
   * เป็นเอฟเฟกต์ด้านภาพเท่านั้น
   * สำหรับ Card ที่คลิกได้ควรใช้ Link หรือ Button ครอบ
   */
  interactive?: boolean;

  /**
   * สถานะถูกเลือก
   */
  selected?: boolean;

  /**
   * ปิดการใช้งาน
   */
  disabled?: boolean;

  /**
   * ขยายความสูงเต็ม Container
   */
  fullHeight?: boolean;

  /**
   * รูปแบบ Overflow
   */
  overflow?: CardOverflow;

  children?: ReactNode;
}

export interface CardHeaderProps
  extends HTMLAttributes<HTMLDivElement> {
  /**
   * Element ด้านขวาของ Header
   */
  action?: ReactNode;

  /**
   * ลด Padding ของ Header
   */
  compact?: boolean;

  /**
   * แสดงเส้นแบ่งด้านล่าง
   */
  divider?: boolean;

  children?: ReactNode;
}

export interface CardTitleProps
  extends HTMLAttributes<HTMLHeadingElement> {
  children?: ReactNode;
}

export interface CardDescriptionProps
  extends HTMLAttributes<HTMLParagraphElement> {
  children?: ReactNode;
}

export interface CardContentProps
  extends HTMLAttributes<HTMLDivElement> {
  /**
   * ลด Padding ของ Content
   */
  compact?: boolean;

  /**
   * ไม่ใส่ Padding
   */
  noPadding?: boolean;

  children?: ReactNode;
}

export type CardFooterAlign =
  | "start"
  | "center"
  | "end"
  | "between";

export interface CardFooterProps
  extends HTMLAttributes<HTMLDivElement> {
  /**
   * ตำแหน่งของเนื้อหาใน Footer
   */
  align?: CardFooterAlign;

  /**
   * ลด Padding
   */
  compact?: boolean;

  /**
   * แสดงเส้นแบ่งด้านบน
   */
  divider?: boolean;

  children?: ReactNode;
}

export type CardMediaAspectRatio =
  | "auto"
  | "square"
  | "video"
  | "wide"
  | "portrait";

export interface CardMediaProps
  extends HTMLAttributes<HTMLDivElement> {
  /**
   * อัตราส่วนของพื้นที่รูปภาพ
   */
  aspectRatio?: CardMediaAspectRatio;

  /**
   * ตำแหน่งของ Media
   */
  position?: "top" | "bottom";

  /**
   * Element ที่แสดงทับ Media
   */
  overlay?: ReactNode;

  children?: ReactNode;
}

export interface CardDividerProps
  extends HTMLAttributes<HTMLHRElement> {}

export interface CardIconProps
  extends HTMLAttributes<HTMLSpanElement> {
  /**
   * รูปแบบสีของกล่อง Icon
   */
  variant?:
    | "green"
    | "mint"
    | "gold"
    | "neutral"
    | "danger";

  /**
   * ขนาดของกล่อง Icon
   */
  size?: "sm" | "md" | "lg";

  children?: ReactNode;
}

const VARIANT_CLASSES: Record<CardVariant, string> = {
  default: [
    "border border-white/75",
    "bg-white/78",
    "text-rice-text",
    "shadow-glass",
    "backdrop-blur-glass",

    "dark:border-white/10",
    "dark:bg-white/[0.055]",
    "dark:text-white",
  ].join(" "),

  glass: [
    "border border-white/80",
    "bg-white/70",
    "text-rice-text",
    "shadow-glass",
    "backdrop-blur-glass",

    "dark:border-white/10",
    "dark:bg-white/[0.06]",
    "dark:text-white",
  ].join(" "),

  surface: [
    "border border-rice-forest/10",
    "bg-white",
    "text-rice-text",
    "shadow-card",

    "dark:border-white/10",
    "dark:bg-[#0d2014]",
    "dark:text-white",
  ].join(" "),

  soft: [
    "border border-rice-forest/[0.06]",
    "bg-rice-surface-soft",
    "text-rice-text",

    "dark:border-white/[0.07]",
    "dark:bg-[#11261a]",
    "dark:text-white",
  ].join(" "),

  outlined: [
    "border border-rice-forest/15",
    "bg-transparent",
    "text-rice-text",

    "dark:border-white/15",
    "dark:text-white",
  ].join(" "),

  elevated: [
    "border border-white/90",
    "bg-white",
    "text-rice-text",
    "shadow-glass-lg",

    "dark:border-white/10",
    "dark:bg-[#0d2014]",
    "dark:text-white",
    "dark:shadow-[0_24px_70px_rgba(0,0,0,0.32)]",
  ].join(" "),

  dark: [
    "border border-white/10",
    "bg-rice-dark",
    "text-white",
    "shadow-floating",

    "dark:bg-[#00180b]",
  ].join(" "),

  mint: [
    "border border-rice-mint/60",
    "bg-rice-mint/35",
    "text-rice-forest",
    "shadow-mint",
    "backdrop-blur-glass",

    "dark:border-rice-mint/15",
    "dark:bg-rice-leaf/15",
    "dark:text-rice-mint-light",
  ].join(" "),

  gold: [
    "border border-rice-gold/35",
    "bg-rice-gold/15",
    "text-rice-dark",
    "shadow-gold",

    "dark:border-rice-gold/20",
    "dark:bg-rice-gold/10",
    "dark:text-[#f3dfaa]",
  ].join(" "),

  success: [
    "border border-emerald-200/80",
    "bg-emerald-50/80",
    "text-emerald-950",

    "dark:border-emerald-500/15",
    "dark:bg-emerald-950/35",
    "dark:text-emerald-100",
  ].join(" "),

  warning: [
    "border border-amber-200/80",
    "bg-amber-50/80",
    "text-amber-950",

    "dark:border-amber-500/15",
    "dark:bg-amber-950/35",
    "dark:text-amber-100",
  ].join(" "),

  danger: [
    "border border-red-200/80",
    "bg-red-50/80",
    "text-red-950",

    "dark:border-red-500/15",
    "dark:bg-red-950/35",
    "dark:text-red-100",
  ].join(" "),
};

const PADDING_CLASSES: Record<CardPadding, string> = {
  none: "p-0",
  sm: "p-4",
  md: "p-5 sm:p-6",
  lg: "p-6 sm:p-8",
};

const RADIUS_CLASSES: Record<CardRadius, string> = {
  md: "rounded-xl",
  lg: "rounded-2xl",
  xl: "rounded-card",
  "2xl": "rounded-[2rem]",
  "3xl": "rounded-[2.5rem]",
};

const OVERFLOW_CLASSES: Record<CardOverflow, string> = {
  hidden: "overflow-hidden",
  visible: "overflow-visible",
};

const FOOTER_ALIGN_CLASSES: Record<
  CardFooterAlign,
  string
> = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
  between: "justify-between",
};

const MEDIA_ASPECT_RATIO_CLASSES: Record<
  CardMediaAspectRatio,
  string
> = {
  auto: "",
  square: "aspect-square",
  video: "aspect-video",
  wide: "aspect-[21/9]",
  portrait: "aspect-[4/5]",
};

const CARD_ICON_VARIANT_CLASSES: Record<
  NonNullable<CardIconProps["variant"]>,
  string
> = {
  green: [
    "bg-rice-natural",
    "text-white",
    "shadow-[0_10px_24px_rgba(60,103,79,0.18)]",

    "dark:bg-rice-mint-light",
    "dark:text-rice-dark",
  ].join(" "),

  mint: [
    "bg-rice-mint/55",
    "text-rice-forest",

    "dark:bg-rice-leaf/20",
    "dark:text-rice-mint-light",
  ].join(" "),

  gold: [
    "bg-rice-gold/20",
    "text-[#88651c]",

    "dark:bg-rice-gold/15",
    "dark:text-[#eed58f]",
  ].join(" "),

  neutral: [
    "bg-rice-surface-soft",
    "text-rice-muted",

    "dark:bg-white/[0.07]",
    "dark:text-white/75",
  ].join(" "),

  danger: [
    "bg-red-100",
    "text-rice-error",

    "dark:bg-red-950/40",
    "dark:text-red-300",
  ].join(" "),
};

const CARD_ICON_SIZE_CLASSES: Record<
  NonNullable<CardIconProps["size"]>,
  string
> = {
  sm: [
    "h-10 w-10",
    "rounded-xl",
    "[&>svg]:h-5 [&>svg]:w-5",
  ].join(" "),

  md: [
    "h-12 w-12",
    "rounded-icon",
    "[&>svg]:h-6 [&>svg]:w-6",
  ].join(" "),

  lg: [
    "h-14 w-14",
    "rounded-2xl",
    "[&>svg]:h-7 [&>svg]:w-7",
  ].join(" "),
};

function cn(
  ...classNames: Array<
    string | null | undefined | false
  >
): string {
  return classNames.filter(Boolean).join(" ");
}

/**
 * สร้าง className ของ Card
 *
 * สามารถนำไปใช้กับ Link หรือ Element อื่นได้
 */
export function cardVariants({
  variant = "default",
  padding = "none",
  radius = "xl",
  interactive = false,
  selected = false,
  disabled = false,
  fullHeight = false,
  overflow = "hidden",
  className,
}: {
  variant?: CardVariant;
  padding?: CardPadding;
  radius?: CardRadius;
  interactive?: boolean;
  selected?: boolean;
  disabled?: boolean;
  fullHeight?: boolean;
  overflow?: CardOverflow;
  className?: string;
} = {}): string {
  return cn(
    "relative isolate",
    "transition-[transform,border-color,background-color,box-shadow,opacity]",
    "duration-300 ease-premium",

    VARIANT_CLASSES[variant],
    PADDING_CLASSES[padding],
    RADIUS_CLASSES[radius],
    OVERFLOW_CLASSES[overflow],

    fullHeight && "h-full",

    interactive &&
      !disabled &&
      [
        "interactive-card",
        "hover:-translate-y-1",
        "hover:border-rice-leaf/25",
        "hover:shadow-card-hover",

        "active:translate-y-0",
        "active:scale-[0.99]",
      ].join(" "),

    selected &&
      [
        "border-rice-leaf/60",
        "ring-2 ring-rice-leaf/15",
        "shadow-card-hover",

        "dark:border-rice-mint/35",
        "dark:ring-rice-mint/10",
      ].join(" "),

    disabled &&
      [
        "pointer-events-none",
        "select-none",
        "opacity-50",
        "grayscale-[0.2]",
      ].join(" "),

    className
  );
}

/**
 * Card หลักของ Rice AI
 */
const Card = forwardRef<HTMLDivElement, CardProps>(
  function Card(
    {
      variant = "default",
      padding = "none",
      radius = "xl",
      interactive = false,
      selected = false,
      disabled = false,
      fullHeight = false,
      overflow = "hidden",

      className,
      children,

      "aria-disabled": ariaDisabled,

      ...cardProps
    },
    forwardedRef
  ) {
    return (
      <div
        {...cardProps}
        ref={forwardedRef}
        aria-disabled={
          ariaDisabled ?? (disabled || undefined)
        }
        data-component="card"
        data-variant={variant}
        data-interactive={
          interactive ? "true" : "false"
        }
        data-selected={
          selected ? "true" : "false"
        }
        data-disabled={
          disabled ? "true" : "false"
        }
        className={cardVariants({
          variant,
          padding,
          radius,
          interactive,
          selected,
          disabled,
          fullHeight,
          overflow,
          className,
        })}
      >
        <span
          aria-hidden="true"
          className="
            pointer-events-none
            absolute inset-x-6 top-0
            z-[-1] h-px
            bg-gradient-to-r
            from-transparent
            via-white/80
            to-transparent
            opacity-70
            dark:via-white/15
          "
        />

        {children}
      </div>
    );
  }
);

Card.displayName = "Card";

/**
 * ส่วนหัวของ Card
 */
const CardHeader = forwardRef<
  HTMLDivElement,
  CardHeaderProps
>(function CardHeader(
  {
    action,
    compact = false,
    divider = false,
    className,
    children,
    ...headerProps
  },
  forwardedRef
) {
  return (
    <div
      {...headerProps}
      ref={forwardedRef}
      data-component="card-header"
      className={cn(
        "flex items-start",
        "justify-between gap-4",

        compact
          ? "px-4 py-4"
          : "px-5 py-5 sm:px-6 sm:py-6",

        divider &&
          [
            "border-b",
            "border-rice-forest/10",
            "dark:border-white/10",
          ].join(" "),

        className
      )}
    >
      <div className="min-w-0 flex-1">
        {children}
      </div>

      {action !== undefined &&
        action !== null && (
          <div
            data-slot="card-header-action"
            className="
              flex shrink-0
              items-center justify-center
            "
          >
            {action}
          </div>
        )}
    </div>
  );
});

CardHeader.displayName = "CardHeader";

/**
 * หัวข้อของ Card
 */
const CardTitle = forwardRef<
  HTMLHeadingElement,
  CardTitleProps
>(function CardTitle(
  {
    className,
    children,
    ...titleProps
  },
  forwardedRef
) {
  return (
    <h3
      {...titleProps}
      ref={forwardedRef}
      data-component="card-title"
      className={cn(
        "font-heading",
        "text-card-title",
        "font-semibold",
        "tracking-[-0.015em]",
        "text-rice-text",

        "dark:text-white",

        className
      )}
    >
      {children}
    </h3>
  );
});

CardTitle.displayName = "CardTitle";

/**
 * คำอธิบายของ Card
 */
const CardDescription = forwardRef<
  HTMLParagraphElement,
  CardDescriptionProps
>(function CardDescription(
  {
    className,
    children,
    ...descriptionProps
  },
  forwardedRef
) {
  return (
    <p
      {...descriptionProps}
      ref={forwardedRef}
      data-component="card-description"
      className={cn(
        "mt-1.5",
        "text-sm leading-6",
        "text-rice-muted/85",

        "dark:text-white/60",

        className
      )}
    >
      {children}
    </p>
  );
});

CardDescription.displayName = "CardDescription";

/**
 * เนื้อหาหลักของ Card
 */
const CardContent = forwardRef<
  HTMLDivElement,
  CardContentProps
>(function CardContent(
  {
    compact = false,
    noPadding = false,
    className,
    children,
    ...contentProps
  },
  forwardedRef
) {
  return (
    <div
      {...contentProps}
      ref={forwardedRef}
      data-component="card-content"
      className={cn(
        !noPadding &&
          (compact
            ? "px-4 py-4"
            : "px-5 py-5 sm:px-6 sm:py-6"),

        className
      )}
    >
      {children}
    </div>
  );
});

CardContent.displayName = "CardContent";

/**
 * ส่วนท้ายของ Card
 */
const CardFooter = forwardRef<
  HTMLDivElement,
  CardFooterProps
>(function CardFooter(
  {
    align = "end",
    compact = false,
    divider = false,
    className,
    children,
    ...footerProps
  },
  forwardedRef
) {
  return (
    <div
      {...footerProps}
      ref={forwardedRef}
      data-component="card-footer"
      className={cn(
        "flex flex-wrap",
        "items-center gap-2",

        FOOTER_ALIGN_CLASSES[align],

        compact
          ? "px-4 py-4"
          : "px-5 py-5 sm:px-6",

        divider &&
          [
            "border-t",
            "border-rice-forest/10",
            "dark:border-white/10",
          ].join(" "),

        className
      )}
    >
      {children}
    </div>
  );
});

CardFooter.displayName = "CardFooter";

/**
 * รูปภาพหรือ Media ของ Card
 */
const CardMedia = forwardRef<
  HTMLDivElement,
  CardMediaProps
>(function CardMedia(
  {
    aspectRatio = "auto",
    position = "top",
    overlay,
    className,
    children,
    ...mediaProps
  },
  forwardedRef
) {
  return (
    <div
      {...mediaProps}
      ref={forwardedRef}
      data-component="card-media"
      data-position={position}
      className={cn(
        "relative w-full overflow-hidden",
        "bg-rice-surface-soft",

        "dark:bg-white/[0.05]",

        MEDIA_ASPECT_RATIO_CLASSES[
          aspectRatio
        ],

        "[&>img]:h-full",
        "[&>img]:w-full",
        "[&>img]:object-cover",

        "[&>video]:h-full",
        "[&>video]:w-full",
        "[&>video]:object-cover",

        position === "top"
          ? "order-first"
          : "order-last",

        className
      )}
    >
      {children}

      {overlay !== undefined &&
        overlay !== null && (
          <div
            data-slot="card-media-overlay"
            className="
              absolute inset-0
              z-10
            "
          >
            {overlay}
          </div>
        )}
    </div>
  );
});

CardMedia.displayName = "CardMedia";

/**
 * เส้นแบ่งภายใน Card
 */
const CardDivider = forwardRef<
  HTMLHRElement,
  CardDividerProps
>(function CardDivider(
  {
    className,
    ...dividerProps
  },
  forwardedRef
) {
  return (
    <hr
      {...dividerProps}
      ref={forwardedRef}
      data-component="card-divider"
      className={cn(
        "border-0 border-t",
        "border-rice-forest/10",
        "dark:border-white/10",
        className
      )}
    />
  );
});

CardDivider.displayName = "CardDivider";

/**
 * กล่อง Icon สำหรับใช้ภายใน Card
 */
const CardIcon = forwardRef<
  HTMLSpanElement,
  CardIconProps
>(function CardIcon(
  {
    variant = "mint",
    size = "md",
    className,
    children,
    ...iconProps
  },
  forwardedRef
) {
  return (
    <span
      {...iconProps}
      ref={forwardedRef}
      data-component="card-icon"
      data-variant={variant}
      data-size={size}
      className={cn(
        "inline-flex shrink-0",
        "items-center justify-center",

        CARD_ICON_VARIANT_CLASSES[variant],
        CARD_ICON_SIZE_CLASSES[size],

        className
      )}
    >
      {children}
    </span>
  );
});

CardIcon.displayName = "CardIcon";

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  CardMedia,
  CardDivider,
  CardIcon,
};

export default Card;