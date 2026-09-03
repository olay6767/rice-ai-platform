"use client";

import {
  forwardRef,
  useCallback,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type ForwardedRef,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";

export type TextareaSize = "sm" | "md" | "lg";

export type TextareaResize =
  | "none"
  | "vertical"
  | "horizontal"
  | "both";

export interface TextareaProps
  extends Omit<
    TextareaHTMLAttributes<HTMLTextAreaElement>,
    "size"
  > {
  /**
   * Label ของช่องกรอกข้อความ
   */
  label?: ReactNode;

  /**
   * ข้อความแนะนำใต้ช่องกรอก
   */
  helperText?: ReactNode;

  /**
   * กำหนดสถานะ Error
   */
  error?: boolean;

  /**
   * ข้อความ Error
   */
  errorMessage?: ReactNode;

  /**
   * ขนาดของ Textarea
   */
  textareaSize?: TextareaSize;

  /**
   * รูปแบบการปรับขนาดด้วยเมาส์
   */
  resize?: TextareaResize;

  /**
   * ปรับความสูงตามข้อความอัตโนมัติ
   */
  autoResize?: boolean;

  /**
   * ความสูงสูงสุดเมื่อใช้ Auto Resize
   *
   * หน่วยเป็นพิกเซล
   */
  maxAutoResizeHeight?: number;

  /**
   * แสดงจำนวนตัวอักษร
   */
  showCharacterCount?: boolean;

  /**
   * ขยายเต็มความกว้าง Container
   */
  fullWidth?: boolean;

  /**
   * ซ่อนเครื่องหมายดอกจันเมื่อ required
   */
  hideRequiredIndicator?: boolean;

  /**
   * เรียกเมื่อค่าข้อความเปลี่ยน
   */
  onValueChange?: (value: string) => void;

  /**
   * Class ของ Container หลัก
   */
  containerClassName?: string;

  /**
   * Class ของ Label
   */
  labelClassName?: string;

  /**
   * Class ของ Textarea โดยตรง
   */
  textareaClassName?: string;

  /**
   * Class ของ Helper Text หรือ Error Message
   */
  messageClassName?: string;

  /**
   * Class ของ Character Counter
   */
  characterCountClassName?: string;
}

const SIZE_CLASSES: Record<TextareaSize, string> = {
  sm: "min-h-20 rounded-lg px-3 py-2 text-sm",
  md: "min-h-28 rounded-lg px-3.5 py-2.5 text-sm",
  lg: "min-h-36 rounded-xl px-4 py-3 text-base",
};

const RESIZE_CLASSES: Record<TextareaResize, string> = {
  none: "resize-none",
  vertical: "resize-y",
  horizontal: "resize-x",
  both: "resize",
};

function cn(
  ...classNames: Array<string | null | undefined | false>
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

function getValueLength(
  value:
    | string
    | number
    | readonly string[]
    | null
    | undefined
): number {
  if (value === null || value === undefined) {
    return 0;
  }

  if (Array.isArray(value)) {
    return value.join("").length;
  }

  return String(value).length;
}

/**
 * คืนค่า className ของ Textarea
 */
export function textareaVariants({
  textareaSize = "md",
  resize = "vertical",
  error = false,
  disabled = false,
  readOnly = false,
  className,
}: {
  textareaSize?: TextareaSize;
  resize?: TextareaResize;
  error?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  className?: string;
} = {}): string {
  return cn(
    "block w-full border bg-white",
    "font-normal text-gray-950",
    "outline-none",

    "transition-[border-color,background-color,box-shadow]",
    "duration-200",

    "placeholder:text-gray-400",

    !disabled &&
      !readOnly &&
      [
        "hover:border-gray-400",
        "focus:border-green-500",
        "focus:ring-2",
        "focus:ring-green-500/20",
      ].join(" "),

    "disabled:cursor-not-allowed",
    "disabled:bg-gray-100",
    "disabled:text-gray-500",
    "disabled:opacity-70",

    "read-only:cursor-default",
    "read-only:bg-gray-50",
    "read-only:text-gray-700",
    "read-only:focus:ring-0",

    "dark:bg-gray-950",
    "dark:text-gray-100",
    "dark:placeholder:text-gray-500",
    "dark:hover:border-gray-600",
    "dark:disabled:bg-gray-900",
    "dark:disabled:text-gray-500",
    "dark:read-only:bg-gray-900",
    "dark:read-only:text-gray-300",

    error
      ? [
          "border-red-500",
          "focus:border-red-500",
          "focus:ring-red-500/20",
          "dark:border-red-500",
          "dark:focus:border-red-500",
          "dark:focus:ring-red-500/20",
        ].join(" ")
      : "border-gray-300 dark:border-gray-700",

    SIZE_CLASSES[textareaSize],
    RESIZE_CLASSES[resize],

    className
  );
}

const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaProps
>(function Textarea(
  {
    id: providedId,

    label,
    helperText,

    error = false,
    errorMessage,

    textareaSize = "md",
    resize = "vertical",

    autoResize = false,
    maxAutoResizeHeight = 400,

    showCharacterCount = false,

    fullWidth = true,
    hideRequiredIndicator = false,

    onValueChange,

    containerClassName,
    labelClassName,
    textareaClassName,
    messageClassName,
    characterCountClassName,

    disabled = false,
    readOnly = false,
    required = false,
    rows = 4,

    value,
    defaultValue,
    maxLength,

    onChange,

    "aria-describedby": ariaDescribedBy,
    "aria-invalid": ariaInvalid,
    "aria-errormessage": ariaErrorMessage,

    className,
    ...textareaProps
  },
  forwardedRef
) {
  const generatedId = useId().replace(/:/g, "");

  const textareaId =
    providedId ?? `textarea-${generatedId}`;

  const helperTextId =
    `${textareaId}-helper-text`;

  const errorMessageId =
    `${textareaId}-error-message`;

  const characterCountId =
    `${textareaId}-character-count`;

  const internalTextareaRef =
    useRef<HTMLTextAreaElement | null>(null);

  const [characterCount, setCharacterCount] =
    useState<number>(() => {
      return getValueLength(value ?? defaultValue);
    });

  const hasErrorMessage =
    error &&
    errorMessage !== undefined &&
    errorMessage !== null;

  const hasHelperText =
    !hasErrorMessage &&
    helperText !== undefined &&
    helperText !== null;

  const hasCharacterCounter =
    showCharacterCount ||
    maxLength !== undefined;

  const isAtCharacterLimit =
    maxLength !== undefined &&
    characterCount >= maxLength;

  const describedByIds = [
    ariaDescribedBy,
    hasErrorMessage
      ? errorMessageId
      : undefined,
    hasHelperText
      ? helperTextId
      : undefined,
    hasCharacterCounter
      ? characterCountId
      : undefined,
  ]
    .filter(Boolean)
    .join(" ");

  const resolvedAriaInvalid =
    ariaInvalid ?? (error || undefined);

  const resolvedAriaErrorMessage =
    ariaErrorMessage ??
    (hasErrorMessage
      ? errorMessageId
      : undefined);

  const resizeTextarea = useCallback(
    (
      textarea:
        | HTMLTextAreaElement
        | null = internalTextareaRef.current
    ): void => {
      if (!textarea || !autoResize) {
        return;
      }

      const maximumHeight = Math.max(
        80,
        maxAutoResizeHeight
      );

      textarea.style.height = "auto";

      const nextHeight = Math.min(
        textarea.scrollHeight,
        maximumHeight
      );

      textarea.style.height = `${nextHeight}px`;

      textarea.style.overflowY =
        textarea.scrollHeight > maximumHeight
          ? "auto"
          : "hidden";
    },
    [autoResize, maxAutoResizeHeight]
  );

  const setTextareaRef = useCallback(
    (
      element: HTMLTextAreaElement | null
    ): void => {
      internalTextareaRef.current = element;
      assignRef(forwardedRef, element);
    },
    [forwardedRef]
  );

  /**
   * ปรับจำนวนตัวอักษรและความสูง
   * เมื่อ value แบบ Controlled เปลี่ยนจากภายนอก
   */
  useLayoutEffect(() => {
    if (value !== undefined) {
      setCharacterCount(
        getValueLength(value)
      );
    }

    resizeTextarea();
  }, [resizeTextarea, value]);

  /**
   * ปรับความสูงครั้งแรกหลัง Component แสดงผล
   */
  useLayoutEffect(() => {
    resizeTextarea();
  }, [resizeTextarea]);

  const handleChange = (
    event: ChangeEvent<HTMLTextAreaElement>
  ): void => {
    const nextValue = event.currentTarget.value;

    setCharacterCount(nextValue.length);
    resizeTextarea(event.currentTarget);

    onValueChange?.(nextValue);
    onChange?.(event);
  };

  return (
    <div
      data-component="textarea"
      data-error={
        error ? "true" : "false"
      }
      data-disabled={
        disabled ? "true" : "false"
      }
      data-read-only={
        readOnly ? "true" : "false"
      }
      data-auto-resize={
        autoResize ? "true" : "false"
      }
      className={cn(
        fullWidth ? "w-full" : "w-auto",
        containerClassName
      )}
    >
      {label !== undefined &&
        label !== null && (
          <label
            htmlFor={textareaId}
            className={cn(
              "mb-1.5 block",
              "text-sm font-medium",
              "text-gray-700",
              "dark:text-gray-200",

              disabled &&
                "cursor-not-allowed opacity-60",

              labelClassName
            )}
          >
            {label}

            {required &&
              !hideRequiredIndicator && (
                <>
                  <span
                    aria-hidden="true"
                    className="ml-1 text-red-500"
                  >
                    *
                  </span>

                  <span className="sr-only">
                    จำเป็นต้องกรอก
                  </span>
                </>
              )}
          </label>
        )}

      <textarea
        {...textareaProps}
        ref={setTextareaRef}
        id={textareaId}
        rows={rows}
        value={value}
        defaultValue={defaultValue}
        maxLength={maxLength}
        disabled={disabled}
        readOnly={readOnly}
        required={required}
        aria-invalid={
          resolvedAriaInvalid
        }
        aria-describedby={
          describedByIds || undefined
        }
        aria-errormessage={
          resolvedAriaErrorMessage
        }
        onChange={handleChange}
        data-slot="textarea-control"
        className={textareaVariants({
          textareaSize,
          resize: autoResize
            ? "none"
            : resize,
          error,
          disabled,
          readOnly,
          className: cn(
            className,
            textareaClassName
          ),
        })}
      />

      {(hasErrorMessage ||
        hasHelperText ||
        hasCharacterCounter) && (
        <div
          data-slot="textarea-footer"
          className={cn(
            "mt-1.5 flex items-start",
            "justify-between gap-3"
          )}
        >
          <div className="min-w-0 flex-1">
            {hasErrorMessage && (
              <p
                id={errorMessageId}
                role="alert"
                data-slot="textarea-error-message"
                className={cn(
                  "text-xs text-red-600",
                  "dark:text-red-400",
                  messageClassName
                )}
              >
                {errorMessage}
              </p>
            )}

            {hasHelperText && (
              <p
                id={helperTextId}
                data-slot="textarea-helper-text"
                className={cn(
                  "text-xs",
                  error
                    ? [
                        "text-red-600",
                        "dark:text-red-400",
                      ].join(" ")
                    : [
                        "text-gray-500",
                        "dark:text-gray-400",
                      ].join(" "),
                  messageClassName
                )}
              >
                {helperText}
              </p>
            )}
          </div>

          {hasCharacterCounter && (
            <p
              id={characterCountId}
              aria-live="polite"
              aria-atomic="true"
              data-slot="textarea-character-count"
              className={cn(
                "shrink-0 text-xs",
                "tabular-nums",

                isAtCharacterLimit
                  ? [
                      "font-medium text-red-600",
                      "dark:text-red-400",
                    ].join(" ")
                  : [
                      "text-gray-400",
                      "dark:text-gray-500",
                    ].join(" "),

                characterCountClassName
              )}
            >
              {characterCount}

              {maxLength !== undefined && (
                <> / {maxLength}</>
              )}
            </p>
          )}
        </div>
      )}
    </div>
  );
});

Textarea.displayName = "Textarea";

export default Textarea;