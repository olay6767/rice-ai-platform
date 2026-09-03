"use client";

import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";

export type InputSize = "sm" | "md" | "lg";

export interface InputProps
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    "size"
  > {
  /**
   * Label ของช่องกรอกข้อมูล
   */
  label?: ReactNode;

  /**
   * ข้อความอธิบายใต้ช่องกรอก
   */
  helperText?: ReactNode;

  /**
   * สถานะ Error
   */
  error?: boolean;

  /**
   * ข้อความ Error
   */
  errorMessage?: ReactNode;

  /**
   * ขนาดของ Input
   */
  inputSize?: InputSize;

  /**
   * Element ด้านซ้าย เช่น Icon
   */
  startAdornment?: ReactNode;

  /**
   * Element ด้านขวา เช่น ปุ่มแสดงรหัสผ่าน
   */
  endAdornment?: ReactNode;

  /**
   * ขยายเต็มความกว้าง Container
   */
  fullWidth?: boolean;

  /**
   * ซ่อนเครื่องหมาย * เมื่อ required
   */
  hideRequiredIndicator?: boolean;

  /**
   * Class ของ Container หลัก
   */
  containerClassName?: string;

  /**
   * Class ของ Label
   */
  labelClassName?: string;

  /**
   * Class ของกล่องที่ครอบ Input
   */
  fieldClassName?: string;

  /**
   * Class ของ Input โดยตรง
   */
  inputClassName?: string;

  /**
   * Class ของ Helper หรือ Error message
   */
  messageClassName?: string;
}

const SIZE_CLASSES: Record<InputSize, string> = {
  sm: "h-9 rounded-lg px-3 text-sm",
  md: "h-10 rounded-lg px-3.5 text-sm",
  lg: "h-12 rounded-xl px-4 text-base",
};

const START_PADDING_CLASSES: Record<InputSize, string> = {
  sm: "pl-9",
  md: "pl-10",
  lg: "pl-11",
};

const END_PADDING_CLASSES: Record<InputSize, string> = {
  sm: "pr-9",
  md: "pr-10",
  lg: "pr-11",
};

const ADORNMENT_POSITION_CLASSES: Record<
  InputSize,
  {
    start: string;
    end: string;
  }
> = {
  sm: {
    start: "left-3",
    end: "right-3",
  },
  md: {
    start: "left-3.5",
    end: "right-3.5",
  },
  lg: {
    start: "left-4",
    end: "right-4",
  },
};

function cn(
  ...classNames: Array<
    string | null | undefined | false
  >
): string {
  return classNames.filter(Boolean).join(" ");
}

/**
 * Class พื้นฐานของ Input
 *
 * สามารถใช้กับ Component อื่นที่ต้องการรูปแบบเดียวกันได้
 */
export function inputVariants({
  inputSize = "md",
  error = false,
  disabled = false,
  hasStartAdornment = false,
  hasEndAdornment = false,
  className,
}: {
  inputSize?: InputSize;
  error?: boolean;
  disabled?: boolean;
  hasStartAdornment?: boolean;
  hasEndAdornment?: boolean;
  className?: string;
} = {}): string {
  return cn(
    "peer block w-full border bg-white",
    "font-normal text-gray-950",
    "outline-none",
    "transition-[border-color,background-color,box-shadow]",
    "duration-200",

    "placeholder:text-gray-400",

    "hover:border-gray-400",

    "focus:border-green-500",
    "focus:ring-2",
    "focus:ring-green-500/20",

    "disabled:cursor-not-allowed",
    "disabled:bg-gray-100",
    "disabled:text-gray-500",
    "disabled:opacity-70",

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
        ].join(" ")
      : [
          "border-gray-300",
          "dark:border-gray-700",
        ].join(" "),

    SIZE_CLASSES[inputSize],

    hasStartAdornment &&
      START_PADDING_CLASSES[inputSize],

    hasEndAdornment &&
      END_PADDING_CLASSES[inputSize],

    disabled && "pointer-events-none",

    className
  );
}

/**
 * Input พื้นฐานของ Rice AI Platform
 */
const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input(
    {
      id: providedId,
      label,
      helperText,
      error = false,
      errorMessage,

      inputSize = "md",

      startAdornment,
      endAdornment,

      fullWidth = true,
      hideRequiredIndicator = false,

      containerClassName,
      labelClassName,
      fieldClassName,
      inputClassName,
      messageClassName,

      disabled = false,
      required = false,

      "aria-describedby": ariaDescribedBy,
      "aria-invalid": ariaInvalid,
      "aria-errormessage": ariaErrorMessage,

      className,
      ...inputProps
    },
    forwardedRef
  ) {
    const generatedId = useId().replace(/:/g, "");

    const inputId =
      providedId ?? `input-${generatedId}`;

    const helperTextId =
      `${inputId}-helper-text`;

    const errorMessageId =
      `${inputId}-error-message`;

    const hasErrorMessage =
      error &&
      errorMessage !== undefined &&
      errorMessage !== null;

    const hasHelperText =
      !hasErrorMessage &&
      helperText !== undefined &&
      helperText !== null;

    const describedByIds = [
      ariaDescribedBy,
      hasErrorMessage
        ? errorMessageId
        : undefined,
      hasHelperText
        ? helperTextId
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

    return (
      <div
        data-component="input"
        data-error={error ? "true" : "false"}
        data-disabled={
          disabled ? "true" : "false"
        }
        className={cn(
          fullWidth ? "w-full" : "w-auto",
          containerClassName
        )}
      >
        {label !== undefined &&
          label !== null && (
            <label
              htmlFor={inputId}
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

        <div
          data-slot="input-field"
          className={cn(
            "relative",
            fullWidth ? "w-full" : "w-auto",
            fieldClassName
          )}
        >
          {startAdornment && (
            <span
              data-slot="input-start-adornment"
              className={cn(
                "absolute top-1/2 z-10",
                "flex -translate-y-1/2",
                "items-center justify-center",
                "text-gray-400",
                "pointer-events-none",

                "peer-focus:text-green-600",

                "dark:text-gray-500",
                "dark:peer-focus:text-green-400",

                error &&
                  "text-red-500 dark:text-red-400",

                ADORNMENT_POSITION_CLASSES[
                  inputSize
                ].start
              )}
            >
              {startAdornment}
            </span>
          )}

          <input
            {...inputProps}
            ref={forwardedRef}
            id={inputId}
            disabled={disabled}
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
            data-slot="input-control"
            className={inputVariants({
              inputSize,
              error,
              disabled,
              hasStartAdornment:
                Boolean(startAdornment),
              hasEndAdornment:
                Boolean(endAdornment),
              className: cn(
                className,
                inputClassName
              ),
            })}
          />

          {endAdornment && (
            <span
              data-slot="input-end-adornment"
              className={cn(
                "absolute top-1/2 z-10",
                "flex -translate-y-1/2",
                "items-center justify-center",
                "text-gray-400",

                "dark:text-gray-500",

                error &&
                  "text-red-500 dark:text-red-400",

                ADORNMENT_POSITION_CLASSES[
                  inputSize
                ].end
              )}
            >
              {endAdornment}
            </span>
          )}
        </div>

        {hasErrorMessage && (
          <p
            id={errorMessageId}
            role="alert"
            data-slot="input-error-message"
            className={cn(
              "mt-1.5 text-xs",
              "text-red-600",
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
            data-slot="input-helper-text"
            className={cn(
              "mt-1.5 text-xs",
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
    );
  }
);

Input.displayName = "Input";

export default Input;