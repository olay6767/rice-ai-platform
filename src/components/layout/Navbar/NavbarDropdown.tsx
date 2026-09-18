"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type AriaAttributes,
  type AriaRole,
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type RefCallback,
} from "react";
import { createPortal } from "react-dom";

export type NavbarDropdownAlign =
  | "start"
  | "center"
  | "end";

export type NavbarDropdownSide =
  | "top"
  | "bottom"
  | "auto";

export interface NavbarDropdownTriggerProps {
  ref: RefCallback<HTMLElement>;
  id: string;
  "aria-haspopup": AriaAttributes["aria-haspopup"];
  "aria-expanded": boolean;
  "aria-controls": string;
  "aria-disabled"?: boolean;
  "data-state": "open" | "closed";
  onClick: (
    event: ReactMouseEvent<HTMLElement>
  ) => void;
  onKeyDown: (
    event: ReactKeyboardEvent<HTMLElement>
  ) => void;
}

export interface NavbarDropdownProps
  extends Omit<
    ComponentPropsWithoutRef<"div">,
    "children"
  > {
  /**
   * Render function สำหรับปุ่มเปิด Dropdown
   *
   * ต้องกระจาย triggerProps ลงใน Element
   */
  trigger: (
    triggerProps: NavbarDropdownTriggerProps
  ) => ReactNode;

  /**
   * เนื้อหาภายใน Dropdown
   */
  children: ReactNode;

  /**
   * Controlled state
   */
  open?: boolean;

  /**
   * ค่าเริ่มต้นกรณี Uncontrolled
   */
  defaultOpen?: boolean;

  /**
   * เรียกเมื่อสถานะเปิด/ปิดเปลี่ยน
   */
  onOpenChange?: (open: boolean) => void;

  /**
   * ตำแหน่งแนวนอน
   */
  align?: NavbarDropdownAlign;

  /**
   * ตำแหน่งแนวตั้ง
   */
  side?: NavbarDropdownSide;

  /**
   * ระยะห่างจาก Trigger
   */
  sideOffset?: number;

  /**
   * ระยะห่างจากขอบหน้าจอ
   */
  viewportPadding?: number;

  /**
   * ความกว้างขั้นต่ำ
   */
  minWidth?: number;

  /**
   * ความกว้างสูงสุด
   */
  maxWidth?: number;

  /**
   * ให้ความกว้างเท่ากับ Trigger
   */
  matchTriggerWidth?: boolean;

  /**
   * Role ของ Dropdown
   */
  role?: AriaRole;

  /**
   * ชื่อสำหรับ Accessibility
   */
  ariaLabel?: string;

  /**
   * ปิดเมื่อเลือก Menu item
   */
  closeOnSelect?: boolean;

  /**
   * ปิดเมื่อคลิกด้านนอก
   */
  closeOnOutsideClick?: boolean;

  /**
   * ปิดเมื่อกด Escape
   */
  closeOnEscape?: boolean;

  /**
   * Focus รายการแรกอัตโนมัติ
   */
  autoFocus?: boolean;

  /**
   * คืน Focus กลับ Trigger เมื่อปิด
   */
  restoreFocus?: boolean;

  /**
   * ปิดการใช้งาน Dropdown
   */
  disabled?: boolean;

  /**
   * Class ของกล่อง Dropdown
   */
  contentClassName?: string;

  /**
   * Style เพิ่มเติมของกล่อง Dropdown
   */
  contentStyle?: CSSProperties;
}

interface DropdownPosition {
  top: number;
  left: number;
  width?: number;
  maxHeight: number;
  transformOrigin: string;
}

type FocusTarget =
  | "first"
  | "last"
  | "none";

function cn(
  ...classNames: Array<
    string | null | undefined | false
  >
): string {
  return classNames.filter(Boolean).join(" ");
}

function getFocusableElements(
  container: HTMLElement
): HTMLElement[] {
  const selectors = [
    '[role="menuitem"]:not([aria-disabled="true"])',
    '[role="option"]:not([aria-disabled="true"])',
    "a[href]",
    "button:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    '[tabindex]:not([tabindex="-1"])',
  ].join(",");

  return Array.from(
    container.querySelectorAll<HTMLElement>(
      selectors
    )
  ).filter((element) => {
    const style = window.getComputedStyle(element);

    return (
      element.getAttribute("aria-hidden") !==
        "true" &&
      style.display !== "none" &&
      style.visibility !== "hidden"
    );
  });
}

function focusElement(
  element: HTMLElement | undefined
): void {
  element?.focus({
    preventScroll: true,
  });
}

export default function NavbarDropdown({
  trigger,
  children,

  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,

  align = "end",
  side = "auto",
  sideOffset = 8,
  viewportPadding = 12,
  minWidth = 220,
  maxWidth = 420,
  matchTriggerWidth = false,

  role = "menu",
  ariaLabel,

  closeOnSelect = true,
  closeOnOutsideClick = true,
  closeOnEscape = true,
  autoFocus = true,
  restoreFocus = true,
  disabled = false,

  contentClassName,
  contentStyle,

  className,
  ...wrapperProps
}: NavbarDropdownProps) {
  const generatedId = useId().replace(/:/g, "");

  const triggerId =
    `navbar-dropdown-trigger-${generatedId}`;

  const dropdownId =
    `navbar-dropdown-content-${generatedId}`;

  const triggerRef = useRef<HTMLElement | null>(
    null
  );

  const contentRef = useRef<HTMLDivElement | null>(
    null
  );

  const previousFocusRef =
    useRef<HTMLElement | null>(null);

  const pendingFocusRef =
    useRef<FocusTarget>("none");

  const animationFrameRef =
    useRef<number | null>(null);

  const [mounted, setMounted] = useState(false);

  const [internalOpen, setInternalOpen] =
    useState(defaultOpen);

  const [position, setPosition] =
    useState<DropdownPosition | null>(null);

  const [isPositioned, setIsPositioned] =
    useState(false);

  const isControlled =
    controlledOpen !== undefined;

  const isOpen =
    controlledOpen ?? internalOpen;

  const setOpen = useCallback(
    (nextOpen: boolean) => {
      if (disabled && nextOpen) {
        return;
      }

      if (!isControlled) {
        setInternalOpen(nextOpen);
      }

      onOpenChange?.(nextOpen);
    },
    [
      disabled,
      isControlled,
      onOpenChange,
    ]
  );

  const closeDropdown = useCallback(() => {
    setOpen(false);
  }, [setOpen]);

  const openDropdown = useCallback(
    (focusTarget: FocusTarget = "first") => {
      if (disabled) {
        return;
      }

      pendingFocusRef.current = focusTarget;
      previousFocusRef.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;

      setOpen(true);
    },
    [disabled, setOpen]
  );

  const toggleDropdown = useCallback(() => {
    if (isOpen) {
      closeDropdown();
    } else {
      openDropdown("none");
    }
  }, [
    isOpen,
    closeDropdown,
    openDropdown,
  ]);

  const setTriggerElement =
    useCallback<RefCallback<HTMLElement>>(
      (element) => {
        triggerRef.current = element;
      },
      []
    );

  const updatePosition = useCallback(() => {
    const triggerElement = triggerRef.current;
    const dropdownElement = contentRef.current;

    if (
      !triggerElement ||
      !dropdownElement ||
      !isOpen
    ) {
      return;
    }

    const triggerRect =
      triggerElement.getBoundingClientRect();

    const dropdownRect =
      dropdownElement.getBoundingClientRect();

    const viewportWidth =
      document.documentElement.clientWidth;

    const viewportHeight =
      document.documentElement.clientHeight;

    const desiredWidth = matchTriggerWidth
      ? triggerRect.width
      : Math.min(
          Math.max(dropdownRect.width, minWidth),
          maxWidth
        );

    let left: number;

    if (align === "start") {
      left = triggerRect.left;
    } else if (align === "center") {
      left =
        triggerRect.left +
        triggerRect.width / 2 -
        desiredWidth / 2;
    } else {
      left = triggerRect.right - desiredWidth;
    }

    left = Math.max(
      viewportPadding,
      Math.min(
        left,
        viewportWidth -
          desiredWidth -
          viewportPadding
      )
    );

    const spaceBelow =
      viewportHeight -
      triggerRect.bottom -
      sideOffset -
      viewportPadding;

    const spaceAbove =
      triggerRect.top -
      sideOffset -
      viewportPadding;

    let resolvedSide: "top" | "bottom";

    if (side === "auto") {
      resolvedSide =
        spaceBelow >=
          Math.min(dropdownRect.height, 260) ||
        spaceBelow >= spaceAbove
          ? "bottom"
          : "top";
    } else {
      resolvedSide = side;
    }

    const availableHeight =
      resolvedSide === "bottom"
        ? spaceBelow
        : spaceAbove;

    const maxHeight = Math.max(
      120,
      availableHeight
    );

    let top =
      resolvedSide === "bottom"
        ? triggerRect.bottom + sideOffset
        : triggerRect.top -
          dropdownRect.height -
          sideOffset;

    if (resolvedSide === "top") {
      top = Math.max(viewportPadding, top);
    } else {
      top = Math.min(
        top,
        viewportHeight -
          viewportPadding -
          Math.min(
            dropdownRect.height,
            maxHeight
          )
      );
    }

    setPosition({
      top,
      left,
      width: matchTriggerWidth
        ? triggerRect.width
        : undefined,
      maxHeight,
      transformOrigin:
        resolvedSide === "bottom"
          ? align === "start"
            ? "top left"
            : align === "center"
              ? "top center"
              : "top right"
          : align === "start"
            ? "bottom left"
            : align === "center"
              ? "bottom center"
              : "bottom right",
    });

    setIsPositioned(true);
  }, [
    align,
    isOpen,
    matchTriggerWidth,
    maxWidth,
    minWidth,
    side,
    sideOffset,
    viewportPadding,
  ]);

  const schedulePositionUpdate =
    useCallback(() => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(
          animationFrameRef.current
        );
      }

      animationFrameRef.current =
        window.requestAnimationFrame(() => {
          updatePosition();
          animationFrameRef.current = null;
        });
    }, [updatePosition]);

  /* Portal availability and placement are synchronized with the browser layout after mount. */
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setMounted(true);

    return () => {
      if (
        animationFrameRef.current !== null
      ) {
        window.cancelAnimationFrame(
          animationFrameRef.current
        );
      }
    };
  }, []);

  useLayoutEffect(() => {
    if (!isOpen || !mounted) {
      setPosition(null);
      setIsPositioned(false);
      return;
    }

    setIsPositioned(false);
    updatePosition();

    const secondFrame =
      window.requestAnimationFrame(
        updatePosition
      );

    return () => {
      window.cancelAnimationFrame(secondFrame);
    };
  }, [
    isOpen,
    mounted,
    children,
    updatePosition,
  ]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    window.addEventListener(
      "resize",
      schedulePositionUpdate
    );

    window.addEventListener(
      "scroll",
      schedulePositionUpdate,
      true
    );

    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(
            schedulePositionUpdate
          )
        : null;

    if (triggerRef.current) {
      resizeObserver?.observe(triggerRef.current);
    }

    if (contentRef.current) {
      resizeObserver?.observe(contentRef.current);
    }

    return () => {
      window.removeEventListener(
        "resize",
        schedulePositionUpdate
      );

      window.removeEventListener(
        "scroll",
        schedulePositionUpdate,
        true
      );

      resizeObserver?.disconnect();
    };
  }, [
    isOpen,
    schedulePositionUpdate,
  ]);

  useEffect(() => {
    if (
      !isOpen ||
      !closeOnOutsideClick
    ) {
      return;
    }

    const handlePointerDown = (
      event: PointerEvent
    ) => {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      const clickedTrigger =
        triggerRef.current?.contains(target);

      const clickedDropdown =
        contentRef.current?.contains(target);

      if (
        !clickedTrigger &&
        !clickedDropdown
      ) {
        closeDropdown();
      }
    };

    document.addEventListener(
      "pointerdown",
      handlePointerDown,
      true
    );

    return () => {
      document.removeEventListener(
        "pointerdown",
        handlePointerDown,
        true
      );
    };
  }, [
    isOpen,
    closeOnOutsideClick,
    closeDropdown,
  ]);

  useEffect(() => {
    if (!isOpen || !closeOnEscape) {
      return;
    }

    const handleEscape = (
      event: KeyboardEvent
    ) => {
      if (event.key !== "Escape") {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      closeDropdown();
    };

    document.addEventListener(
      "keydown",
      handleEscape,
      true
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleEscape,
        true
      );
    };
  }, [
    isOpen,
    closeOnEscape,
    closeDropdown,
  ]);

  useEffect(() => {
    if (
      !isOpen ||
      !isPositioned ||
      !autoFocus
    ) {
      return;
    }

    const focusTarget =
      pendingFocusRef.current;

    if (focusTarget === "none") {
      return;
    }

    const timer = window.setTimeout(() => {
      if (!contentRef.current) {
        return;
      }

      const focusableElements =
        getFocusableElements(
          contentRef.current
        );

      if (focusTarget === "last") {
        focusElement(
          focusableElements[
            focusableElements.length - 1
          ]
        );
      } else {
        focusElement(focusableElements[0]);
      }

      pendingFocusRef.current = "none";
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    isOpen,
    isPositioned,
    autoFocus,
  ]);

  useEffect(() => {
    if (isOpen || !restoreFocus) {
      return;
    }

    const activeElement =
      document.activeElement;

    const focusWasInsideDropdown =
      activeElement instanceof Node &&
      contentRef.current?.contains(
        activeElement
      );

    if (
      focusWasInsideDropdown ||
      activeElement === document.body
    ) {
      triggerRef.current?.focus({
        preventScroll: true,
      });
    }
  }, [isOpen, restoreFocus]);

  const handleTriggerClick = (
    event: ReactMouseEvent<HTMLElement>
  ) => {
    if (disabled) {
      event.preventDefault();
      return;
    }

    toggleDropdown();
  };

  const handleTriggerKeyDown = (
    event: ReactKeyboardEvent<HTMLElement>
  ) => {
    if (disabled) {
      return;
    }

    if (
      event.key === "ArrowDown"
    ) {
      event.preventDefault();
      openDropdown("first");
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      openDropdown("last");
      return;
    }

    if (
      event.key === "Enter" ||
      event.key === " "
    ) {
      event.preventDefault();
      toggleDropdown();
    }
  };

  const handleContentKeyDown = (
    event: ReactKeyboardEvent<HTMLDivElement>
  ) => {
    if (!contentRef.current) {
      return;
    }

    const focusableElements =
      getFocusableElements(contentRef.current);

    if (focusableElements.length === 0) {
      return;
    }

    const currentIndex =
      focusableElements.indexOf(
        document.activeElement as HTMLElement
      );

    if (event.key === "ArrowDown") {
      event.preventDefault();

      const nextIndex =
        currentIndex < 0 ||
        currentIndex ===
          focusableElements.length - 1
          ? 0
          : currentIndex + 1;

      focusElement(
        focusableElements[nextIndex]
      );

      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();

      const previousIndex =
        currentIndex <= 0
          ? focusableElements.length - 1
          : currentIndex - 1;

      focusElement(
        focusableElements[previousIndex]
      );

      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      focusElement(focusableElements[0]);
      return;
    }

    if (event.key === "End") {
      event.preventDefault();

      focusElement(
        focusableElements[
          focusableElements.length - 1
        ]
      );

      return;
    }

    if (event.key === "Tab") {
      closeDropdown();
    }
  };

  const handleContentClick = (
    event: ReactMouseEvent<HTMLDivElement>
  ) => {
    if (!closeOnSelect) {
      return;
    }

    const target = event.target;

    if (!(target instanceof Element)) {
      return;
    }

    const keepOpenElement = target.closest(
      "[data-dropdown-keep-open='true']"
    );

    if (keepOpenElement) {
      return;
    }

    const closeElement = target.closest(
      [
        "[data-dropdown-close='true']",
        "[role='menuitem']",
        "[role='option']",
        "a[href]",
      ].join(",")
    );

    if (closeElement) {
      closeDropdown();
    }
  };

  const triggerProps: NavbarDropdownTriggerProps =
    {
      ref: setTriggerElement,
      id: triggerId,
      "aria-haspopup":
        role === "menu" ? "menu" : true,
      "aria-expanded": isOpen,
      "aria-controls": dropdownId,
      "aria-disabled":
        disabled || undefined,
      "data-state": isOpen
        ? "open"
        : "closed",
      onClick: handleTriggerClick,
      onKeyDown: handleTriggerKeyDown,
    };

  const dropdownContent =
    mounted && isOpen
      ? createPortal(
          <div
            ref={contentRef}
            id={dropdownId}
            role={role}
            aria-label={ariaLabel}
            aria-labelledby={
              ariaLabel
                ? undefined
                : triggerId
            }
            data-component="navbar-dropdown"
            data-state={
              isPositioned
                ? "open"
                : "positioning"
            }
            tabIndex={-1}
            onKeyDown={handleContentKeyDown}
            onClick={handleContentClick}
            style={{
              position: "fixed",
              zIndex: 100,
              top: position?.top ?? 0,
              left: position?.left ?? 0,
              width: position?.width,
              minWidth,
              maxWidth: `min(${maxWidth}px, calc(100vw - ${
                viewportPadding * 2
              }px))`,
              maxHeight:
                position?.maxHeight ??
                "calc(100vh - 24px)",
              transformOrigin:
                position?.transformOrigin,
              visibility: isPositioned
                ? "visible"
                : "hidden",
              ...contentStyle,
            }}
            className={cn(
              "overflow-x-hidden overflow-y-auto",
              "overscroll-contain rounded-xl",
              "border border-gray-200",
              "bg-white p-1.5",
              "text-gray-950 shadow-xl",
              "outline-none",
              "transition-[opacity,transform]",
              "duration-150 ease-out",

              isPositioned
                ? "scale-100 opacity-100"
                : "scale-95 opacity-0",

              "dark:border-gray-800",
              "dark:bg-gray-950",
              "dark:text-white",

              contentClassName
            )}
          >
            {children}
          </div>,
          document.body
        )
      : null;

  return (
    <div
      {...wrapperProps}
      data-component="navbar-dropdown-wrapper"
      data-state={
        isOpen ? "open" : "closed"
      }
      className={cn(
        "relative inline-flex",
        className
      )}
    >
      {/* The render prop receives a callback ref to attach to its trigger element. */}
      {/* eslint-disable-next-line react-hooks/refs */}
      {trigger(triggerProps)}

      {dropdownContent}
    </div>
  );
}
