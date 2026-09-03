"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ForwardedRef,
  type HTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export type ModalSize =
  | "sm"
  | "md"
  | "lg"
  | "xl"
  | "2xl"
  | "full";

export type ModalPosition = "center" | "top";

export type ModalPadding =
  | "none"
  | "sm"
  | "md"
  | "lg";

export interface ModalProps
  extends Omit<
    HTMLAttributes<HTMLDivElement>,
    "children" | "title" | "role"
  > {
  /**
   * สถานะเปิดหรือปิด Modal
   */
  open: boolean;

  /**
   * เรียกเมื่อ Modal ต้องการเปลี่ยนสถานะ
   */
  onOpenChange: (open: boolean) => void;

  /**
   * เนื้อหาภายใน Modal
   */
  children?: ReactNode;

  /**
   * หัวข้อ Modal
   */
  title?: ReactNode;

  /**
   * คำอธิบายใต้หัวข้อ
   */
  description?: ReactNode;

  /**
   * เนื้อหาด้านขวาของ Header
   *
   * แสดงก่อนปุ่มปิด
   */
  headerAction?: ReactNode;

  /**
   * เนื้อหาส่วนท้าย Modal
   */
  footer?: ReactNode;

  /**
   * ขนาดความกว้าง Modal
   */
  size?: ModalSize;

  /**
   * ตำแหน่ง Modal
   */
  position?: ModalPosition;

  /**
   * Padding ของ Content
   */
  contentPadding?: ModalPadding;

  /**
   * แสดงปุ่มปิด
   */
  showCloseButton?: boolean;

  /**
   * ปิด Modal เมื่อกด Escape
   */
  closeOnEscape?: boolean;

  /**
   * ปิด Modal เมื่อคลิกพื้นหลัง
   */
  closeOnBackdrop?: boolean;

  /**
   * ป้องกันการปิด Modal
   *
   * เหมาะสำหรับช่วงกำลังบันทึกข้อมูล
   */
  closeDisabled?: boolean;

  /**
   * ล็อกการเลื่อนของหน้าเมื่อ Modal เปิด
   */
  preventBodyScroll?: boolean;

  /**
   * แสดง Modal เต็มหน้าจอบนมือถือ
   */
  fullScreenOnMobile?: boolean;

  /**
   * Element ที่ต้องการให้ Focus ตอนเปิด Modal
   */
  initialFocusRef?: {
    readonly current: HTMLElement | null;
  };

  /**
   * Container สำหรับ Portal
   *
   * ค่าเริ่มต้นคือ document.body
   */
  portalContainer?:
    | Element
    | DocumentFragment
    | null;

  /**
   * Role ของ Modal
   */
  role?: "dialog" | "alertdialog";

  /**
   * Accessibility label ของปุ่มปิด
   */
  closeAriaLabel?: string;

  /**
   * Class ของ Overlay
   */
  overlayClassName?: string;

  /**
   * Class ของกล่อง Modal
   */
  panelClassName?: string;

  /**
   * Class ของ Header
   */
  headerClassName?: string;

  /**
   * Class ของ Content
   */
  contentClassName?: string;

  /**
   * Class ของ Footer
   */
  footerClassName?: string;
}

const SIZE_CLASSES: Record<ModalSize, string> = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-lg",
  lg: "sm:max-w-2xl",
  xl: "sm:max-w-4xl",
  "2xl": "sm:max-w-6xl",
  full: "sm:max-w-[calc(100vw-2rem)]",
};

const POSITION_CLASSES: Record<
  ModalPosition,
  string
> = {
  center: "items-center",
  top: "items-start sm:pt-16",
};

const CONTENT_PADDING_CLASSES: Record<
  ModalPadding,
  string
> = {
  none: "p-0",
  sm: "p-4",
  md: "p-5 sm:p-6",
  lg: "p-6 sm:p-8",
};

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "area[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "iframe",
  "object",
  "embed",
  "[contenteditable='true']",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

let bodyScrollLockCount = 0;
let originalBodyOverflow = "";
let originalBodyPaddingRight = "";

function cn(
  ...classNames: Array<
    string | null | undefined | false
  >
): string {
  return classNames.filter(Boolean).join(" ");
}

function assignRef<T>(
  ref: ForwardedRef<T>,
  value: T | null
): void {
  if (typeof ref === "function") {
    ref(value);
    return;
  }

  if (ref) {
    ref.current = value;
  }
}

function getFocusableElements(
  container: HTMLElement
): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      FOCUSABLE_SELECTOR
    )
  ).filter((element) => {
    const isDisabled =
      element.hasAttribute("disabled") ||
      element.getAttribute("aria-disabled") ===
        "true";

    const isHidden =
      element.getAttribute("aria-hidden") ===
        "true" ||
      element.hidden;

    return !isDisabled && !isHidden;
  });
}

function lockBodyScroll(): () => void {
  if (typeof document === "undefined") {
    return () => undefined;
  }

  const body = document.body;

  if (bodyScrollLockCount === 0) {
    originalBodyOverflow = body.style.overflow;
    originalBodyPaddingRight =
      body.style.paddingRight;

    const scrollbarWidth =
      window.innerWidth -
      document.documentElement.clientWidth;

    const currentPaddingRight =
      Number.parseFloat(
        window.getComputedStyle(body).paddingRight
      ) || 0;

    body.style.overflow = "hidden";

    if (scrollbarWidth > 0) {
      body.style.paddingRight =
        `${currentPaddingRight + scrollbarWidth}px`;
    }
  }

  bodyScrollLockCount += 1;

  return () => {
    bodyScrollLockCount = Math.max(
      0,
      bodyScrollLockCount - 1
    );

    if (bodyScrollLockCount === 0) {
      body.style.overflow =
        originalBodyOverflow;

      body.style.paddingRight =
        originalBodyPaddingRight;
    }
  };
}

/**
 * คืนค่า Class ของกล่อง Modal
 */
export function modalVariants({
  size = "md",
  fullScreenOnMobile = true,
  className,
}: {
  size?: ModalSize;
  fullScreenOnMobile?: boolean;
  className?: string;
} = {}): string {
  return cn(
    "relative z-10 flex w-full flex-col",
    "overflow-hidden bg-white text-gray-950",
    "shadow-2xl shadow-black/20",
    "outline-none",

    "dark:bg-gray-950",
    "dark:text-gray-100",
    "dark:shadow-black/50",

    SIZE_CLASSES[size],

    fullScreenOnMobile
      ? [
          "h-[100dvh]",
          "rounded-none",
          "sm:h-auto",
          "sm:max-h-[calc(100dvh-2rem)]",
          "sm:rounded-2xl",
        ].join(" ")
      : [
          "max-h-[calc(100dvh-2rem)]",
          "rounded-2xl",
        ].join(" "),

    size === "full" &&
      [
        "sm:h-[calc(100dvh-2rem)]",
        "sm:max-h-[calc(100dvh-2rem)]",
      ].join(" "),

    className
  );
}

/**
 * Modal พื้นฐานของ Rice AI Platform
 */
const Modal = forwardRef<
  HTMLDivElement,
  ModalProps
>(function Modal(
  {
    open,
    onOpenChange,

    children,
    title,
    description,
    headerAction,
    footer,

    size = "md",
    position = "center",
    contentPadding = "md",

    showCloseButton = true,
    closeOnEscape = true,
    closeOnBackdrop = true,
    closeDisabled = false,

    preventBodyScroll = true,
    fullScreenOnMobile = true,

    initialFocusRef,
    portalContainer,

    role = "dialog",
    closeAriaLabel = "ปิดหน้าต่าง",

    overlayClassName,
    panelClassName,
    headerClassName,
    contentClassName,
    footerClassName,

    className,

    "aria-labelledby": ariaLabelledBy,
    "aria-describedby": ariaDescribedBy,

    ...modalProps
  },
  forwardedRef
) {
  const generatedId = useId().replace(/:/g, "");

  const titleId = `modal-${generatedId}-title`;
  const descriptionId =
    `modal-${generatedId}-description`;

  const [mounted, setMounted] =
    useState(false);

  const dialogRef =
    useRef<HTMLDivElement | null>(null);

  const previousActiveElementRef =
    useRef<HTMLElement | null>(null);

  const requestClose = useCallback((): void => {
    if (closeDisabled) {
      return;
    }

    onOpenChange(false);
  }, [closeDisabled, onOpenChange]);

  const setDialogRef = useCallback(
    (element: HTMLDivElement | null): void => {
      dialogRef.current = element;
      assignRef(forwardedRef, element);
    },
    [forwardedRef]
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  /**
   * ล็อกการเลื่อนของหน้า
   */
  useEffect(() => {
    if (!open || !preventBodyScroll) {
      return;
    }

    return lockBodyScroll();
  }, [open, preventBodyScroll]);

  /**
   * ควบคุม Focus, Escape และ Focus Trap
   */
  useEffect(() => {
    if (!open || !mounted) {
      return;
    }

    previousActiveElementRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const focusTimer = window.setTimeout(() => {
      const dialog = dialogRef.current;

      if (!dialog) {
        return;
      }

      const initialFocusElement =
        initialFocusRef?.current;

      if (
        initialFocusElement &&
        dialog.contains(initialFocusElement)
      ) {
        initialFocusElement.focus();
        return;
      }

      const focusableElements =
        getFocusableElements(dialog);

      const firstFocusableElement =
        focusableElements[0];

      if (firstFocusableElement) {
        firstFocusableElement.focus();
        return;
      }

      dialog.focus();
    }, 0);

    const handleKeyDown = (
      event: globalThis.KeyboardEvent
    ): void => {
      const dialog = dialogRef.current;

      if (!dialog) {
        return;
      }

      if (
        event.key === "Escape" &&
        closeOnEscape &&
        !closeDisabled
      ) {
        event.preventDefault();
        event.stopPropagation();
        requestClose();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusableElements =
        getFocusableElements(dialog);

      if (focusableElements.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const firstElement =
        focusableElements[0];

      const lastElement =
        focusableElements[
          focusableElements.length - 1
        ];

      const activeElement =
        document.activeElement;

      if (
        event.shiftKey &&
        (activeElement === firstElement ||
          !dialog.contains(activeElement))
      ) {
        event.preventDefault();
        lastElement.focus();
        return;
      }

      if (
        !event.shiftKey &&
        activeElement === lastElement
      ) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener(
      "keydown",
      handleKeyDown,
      true
    );

    return () => {
      window.clearTimeout(focusTimer);

      document.removeEventListener(
        "keydown",
        handleKeyDown,
        true
      );

      const previousActiveElement =
        previousActiveElementRef.current;

      window.setTimeout(() => {
        if (
          previousActiveElement &&
          document.contains(
            previousActiveElement
          )
        ) {
          previousActiveElement.focus();
        }
      }, 0);
    };
  }, [
    closeDisabled,
    closeOnEscape,
    initialFocusRef,
    mounted,
    open,
    requestClose,
  ]);

  const handleBackdropClick = (
    event: MouseEvent<HTMLDivElement>
  ): void => {
    if (
      event.target !== event.currentTarget ||
      !closeOnBackdrop ||
      closeDisabled
    ) {
      return;
    }

    requestClose();
  };

  if (!mounted || !open) {
    return null;
  }

  const targetContainer =
    portalContainer ?? document.body;

  const hasHeader =
    title !== undefined ||
    description !== undefined ||
    headerAction !== undefined ||
    showCloseButton;

  const modal = (
    <div
      data-component="modal-overlay"
      data-open="true"
      onMouseDown={handleBackdropClick}
      className={cn(
        "fixed inset-0 z-50",
        "flex justify-center",
        "overflow-y-auto",
        "bg-black/50",
        "backdrop-blur-[2px]",

        POSITION_CLASSES[position],

        fullScreenOnMobile
          ? "p-0 sm:p-4"
          : "p-4",

        overlayClassName
      )}
    >
      <div
        {...modalProps}
        ref={setDialogRef}
        role={role}
        tabIndex={-1}
        aria-modal="true"
        aria-labelledby={
          ariaLabelledBy ??
          (title !== undefined
            ? titleId
            : undefined)
        }
        aria-describedby={
          ariaDescribedBy ??
          (description !== undefined
            ? descriptionId
            : undefined)
        }
        data-component="modal"
        data-size={size}
        data-position={position}
        data-close-disabled={
          closeDisabled ? "true" : "false"
        }
        className={modalVariants({
          size,
          fullScreenOnMobile,
          className: cn(
            className,
            panelClassName
          ),
        })}
      >
        {hasHeader && (
          <header
            data-slot="modal-header"
            className={cn(
              "flex shrink-0 items-start",
              "justify-between gap-4",
              "border-b border-gray-200",
              "px-5 py-4 sm:px-6",
              "dark:border-gray-800",
              headerClassName
            )}
          >
            <div className="min-w-0 flex-1">
              {title !== undefined &&
                title !== null && (
                  <h2
                    id={titleId}
                    data-slot="modal-title"
                    className={cn(
                      "text-lg font-semibold",
                      "leading-7 tracking-tight",
                      "text-gray-950",
                      "dark:text-gray-100"
                    )}
                  >
                    {title}
                  </h2>
                )}

              {description !== undefined &&
                description !== null && (
                  <p
                    id={descriptionId}
                    data-slot="modal-description"
                    className={cn(
                      title !== undefined &&
                        "mt-1",
                      "text-sm leading-6",
                      "text-gray-500",
                      "dark:text-gray-400"
                    )}
                  >
                    {description}
                  </p>
                )}
            </div>

            {(headerAction !== undefined ||
              showCloseButton) && (
              <div
                data-slot="modal-header-actions"
                className={cn(
                  "flex shrink-0",
                  "items-center gap-2"
                )}
              >
                {headerAction}

                {showCloseButton && (
                  <button
                    type="button"
                    aria-label={closeAriaLabel}
                    title={closeAriaLabel}
                    disabled={closeDisabled}
                    onClick={requestClose}
                    data-slot="modal-close-button"
                    className={cn(
                      "inline-flex h-9 w-9",
                      "items-center justify-center",
                      "rounded-lg",
                      "text-gray-500",

                      "transition-colors",

                      "hover:bg-gray-100",
                      "hover:text-gray-900",

                      "focus-visible:outline-none",
                      "focus-visible:ring-2",
                      "focus-visible:ring-green-500",
                      "focus-visible:ring-offset-2",

                      "disabled:cursor-not-allowed",
                      "disabled:opacity-40",

                      "dark:text-gray-400",
                      "dark:hover:bg-gray-800",
                      "dark:hover:text-gray-100",
                      "dark:focus-visible:ring-offset-gray-950"
                    )}
                  >
                    <X
                      aria-hidden="true"
                      className="h-5 w-5"
                    />
                  </button>
                )}
              </div>
            )}
          </header>
        )}

        <div
          data-slot="modal-content"
          className={cn(
            "min-h-0 flex-1 overflow-y-auto",
            CONTENT_PADDING_CLASSES[
              contentPadding
            ],
            contentClassName
          )}
        >
          {children}
        </div>

        {footer !== undefined &&
          footer !== null && (
            <footer
              data-slot="modal-footer"
              className={cn(
                "flex shrink-0 flex-wrap",
                "items-center justify-end gap-2",
                "border-t border-gray-200",
                "px-5 py-4 sm:px-6",
                "dark:border-gray-800",
                footerClassName
              )}
            >
              {footer}
            </footer>
          )}
      </div>
    </div>
  );

  return createPortal(modal, targetContainer);
});

Modal.displayName = "Modal";

export default Modal;