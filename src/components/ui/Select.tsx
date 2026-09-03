"use client";

import {
  forwardRef,
  useId,
  type ChangeEvent,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import {
  ChevronDown,
  LoaderCircle,
} from "lucide-react";

export type SelectSize = "sm" | "md" | "lg";

export type SelectOptionValue = string | number;

export interface SelectOption {
  /**
   * ค่าที่ส่งไปพร้อม Form
   */
  value: SelectOptionValue;

  /**
   * ข้อความที่แสดง
   */
  label: ReactNode;

  /**
   * ปิดการเลือก Option นี้
   */
  disabled?: boolean;

  /**
   * ข้อมูลเพิ่มเติมสำหรับใช้งานภายนอก
   */
  metadata?: Record<string, unknown>;
}

export interface SelectOptionGroup {
  /**
   * ชื่อกลุ่ม
   */
  label: string;

  /**
   * รายการ Option ภายในกลุ่ม
   */
  options: SelectOption[];

  /**
   * ปิดการใช้งานทั้งกลุ่ม
   */
  disabled?: boolean;
}

export interface SelectProps
  extends Omit<
    SelectHTMLAttributes<HTMLSelectElement>,
    "size" | "children"
  > {
  /**
   * Label ของ Select
   */
  label?: ReactNode;

  /**
   * ข้อความแนะนำใต้ Select
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
   * ขนาดของ Select
   */
  selectSize?: SelectSize;

  /**
   * Placeholder ตัวเลือกเริ่มต้น
   */
  placeholder?: string;

  /**
   * รายการตัวเลือก
   */
  options?: SelectOption[];

  /**
   * กลุ่มตัวเลือก
   */
  optionGroups?: SelectOptionGroup[];

  /**
   * Custom Option จากภายนอก
   *
   * เมื่อส่ง children เข้ามา จะใช้ children
   * แทน options และ optionGroups
   */
  children?: ReactNode;

  /**
   * Element ด้านซ้าย เช่น Icon
   */
  startAdornment?: ReactNode;

  /**
   * กำลังโหลดข้อมูล
   */
  loading?: boolean;

  /**
   * ข้อความขณะโหลด
   */
  loadingText?: string;

  /**
   * ข้อความเมื่อไม่มี Option
   */
  emptyText?: string;

  /**
   * ขยายเต็มความกว้าง Container
   */
  fullWidth?: boolean;

  /**
   * ซ่อนเครื่องหมาย * เมื่อ Required
   */
  hideRequiredIndicator?: boolean;

  /**
   * เรียกเมื่อค่าเปลี่ยน
   */
  onValueChange?: (
    value: string,
    event: ChangeEvent<HTMLSelectElement>
  ) => void;

  /**
   * Class ของ Container
   */
  containerClassName?: string;

  /**
   * Class ของ Label
   */
  labelClassName?: string;

  /**
   * Class ของกล่องครอบ Select
   */
  fieldClassName?: string;

  /**
   * Class ของ Select
   */
  selectClassName?: string;

  /**
   * Class ของ Helper หรือ Error Message
   */
  messageClassName?: string;
}

const SIZE_CLASSES: Record<SelectSize, string> = {
  sm: "h-9 rounded-lg px-3 text-sm",
  md: "h-10 rounded-lg px-3.5 text-sm",
  lg: "h-12 rounded-xl px-4 text-base",
};

const START_PADDING_CLASSES: Record<SelectSize, string> = {
  sm: "pl-9",
  md: "pl-10",
  lg: "pl-11",
};

const END_PADDING_CLASSES: Record<SelectSize, string> = {
  sm: "pr-9",
  md: "pr-10",
  lg: "pr-11",
};

const START_POSITION_CLASSES: Record<SelectSize, string> = {
  sm: "left-3",
  md: "left-3.5",
  lg: "left-4",
};

const END_POSITION_CLASSES: Record<SelectSize, string> = {
  sm: "right-3",
  md: "right-3.5",
  lg: "right-4",
};

function cn(
  ...classNames: Array<string | null | undefined | false>
): string {
  return classNames.filter(Boolean).join(" ");
}

function hasOptions(
  options: SelectOption[],
  optionGroups: SelectOptionGroup[]
): boolean {
  if (options.length > 0) {
    return true;
  }

  return optionGroups.some(
    (group) => group.options.length > 0
  );
}

/**
 * คืนค่า className ของ Select
 */
export function selectVariants({
  selectSize = "md",
  error = false,
  disabled = false,
  hasStartAdornment = false,
  multiple = false,
  className,
}: {
  selectSize?: SelectSize;
  error?: boolean;
  disabled?: boolean;
  hasStartAdornment?: boolean;
  multiple?: boolean;
  className?: string;
} = {}): string {
  return cn(
    "peer block w-full appearance-none border",
    "bg-white font-normal text-gray-950",
    "outline-none",

    "transition-[border-color,background-color,box-shadow]",
    "duration-200",

    "hover:border-gray-400",

    "focus:border-green-500",
    "focus:ring-2",
    "focus:ring-green-500/20",

    "disabled:cursor-not-allowed",
    "disabled:bg-gray-100",
    "disabled:text-gray-500",
    "disabled:opacity-70",

    "dark:bg-gray-950",
    "dark:text-gray-100",
    "dark:hover:border-gray-600",
    "dark:disabled:bg-gray-900",
    "dark:disabled:text-gray-500",

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

    SIZE_CLASSES[selectSize],

    hasStartAdornment &&
      START_PADDING_CLASSES[selectSize],

    !multiple &&
      END_PADDING_CLASSES[selectSize],

    multiple && [
      "h-auto min-h-28",
      "appearance-auto py-2",
    ].join(" "),

    disabled && "pointer-events-none",

    className
  );
}

const Select = forwardRef<
  HTMLSelectElement,
  SelectProps
>(function Select(
  {
    id: providedId,

    label,
    helperText,

    error = false,
    errorMessage,

    selectSize = "md",
    placeholder = "กรุณาเลือก",

    options = [],
    optionGroups = [],
    children,

    startAdornment,

    loading = false,
    loadingText = "กำลังโหลดตัวเลือก...",
    emptyText = "ไม่มีตัวเลือก",

    fullWidth = true,
    hideRequiredIndicator = false,

    onValueChange,

    containerClassName,
    labelClassName,
    fieldClassName,
    selectClassName,
    messageClassName,

    disabled = false,
    required = false,
    multiple = false,

    value,
    defaultValue,

    onChange,

    "aria-describedby": ariaDescribedBy,
    "aria-invalid": ariaInvalid,
    "aria-errormessage": ariaErrorMessage,

    className,
    ...selectProps
  },
  forwardedRef
) {
  const generatedId = useId().replace(/:/g, "");

  const selectId =
    providedId ?? `select-${generatedId}`;

  const helperTextId =
    `${selectId}-helper-text`;

  const errorMessageId =
    `${selectId}-error-message`;

  const loadingStatusId =
    `${selectId}-loading-status`;

  const hasErrorMessage =
    error &&
    errorMessage !== undefined &&
    errorMessage !== null;

  const hasHelperText =
    !hasErrorMessage &&
    helperText !== undefined &&
    helperText !== null;

  const hasAvailableOptions =
    children !== undefined &&
    children !== null
      ? true
      : hasOptions(options, optionGroups);

  const isDisabled =
    disabled || loading || !hasAvailableOptions;

  const describedByIds = [
    ariaDescribedBy,
    hasErrorMessage
      ? errorMessageId
      : undefined,
    hasHelperText
      ? helperTextId
      : undefined,
    loading
      ? loadingStatusId
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

  const handleChange = (
    event: ChangeEvent<HTMLSelectElement>
  ): void => {
    onValueChange?.(
      event.currentTarget.value,
      event
    );

    onChange?.(event);
  };

  const renderOptions = (): ReactNode => {
    if (children !== undefined && children !== null) {
      return children;
    }

    return (
      <>
        {options.map((option) => (
          <option
            key={String(option.value)}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}

        {optionGroups.map((group) => (
          <optgroup
            key={group.label}
            label={group.label}
            disabled={group.disabled}
          >
            {group.options.map((option) => (
              <option
                key={`${group.label}-${String(
                  option.value
                )}`}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
          </optgroup>
        ))}
      </>
    );
  };

  return (
    <div
      data-component="select"
      data-error={error ? "true" : "false"}
      data-disabled={
        isDisabled ? "true" : "false"
      }
      data-loading={
        loading ? "true" : "false"
      }
      className={cn(
        fullWidth ? "w-full" : "w-auto",
        containerClassName
      )}
    >
      {label !== undefined &&
        label !== null && (
          <label
            htmlFor={selectId}
            className={cn(
              "mb-1.5 block",
              "text-sm font-medium",
              "text-gray-700",
              "dark:text-gray-200",

              isDisabled &&
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
                    จำเป็นต้องเลือก
                  </span>
                </>
              )}
          </label>
        )}

      <div
        data-slot="select-field"
        className={cn(
          "relative",
          fullWidth ? "w-full" : "w-auto",
          fieldClassName
        )}
      >
        {startAdornment && (
          <span
            aria-hidden="true"
            data-slot="select-start-adornment"
            className={cn(
              "pointer-events-none absolute",
              "top-1/2 z-10",
              "flex -translate-y-1/2",
              "items-center justify-center",
              "text-gray-400",
              "transition-colors",

              "peer-focus:text-green-600",

              "dark:text-gray-500",
              "dark:peer-focus:text-green-400",

              error &&
                "text-red-500 dark:text-red-400",

              START_POSITION_CLASSES[selectSize]
            )}
          >
            {startAdornment}
          </span>
        )}

        <select
          {...selectProps}
          ref={forwardedRef}
          id={selectId}
          value={value}
          defaultValue={defaultValue}
          disabled={isDisabled}
          required={required}
          multiple={multiple}
          aria-invalid={resolvedAriaInvalid}
          aria-describedby={
            describedByIds || undefined
          }
          aria-errormessage={
            resolvedAriaErrorMessage
          }
          aria-busy={loading || undefined}
          onChange={handleChange}
          data-slot="select-control"
          className={selectVariants({
            selectSize,
            error,
            disabled: isDisabled,
            hasStartAdornment:
              Boolean(startAdornment),
            multiple,
            className: cn(
              className,
              selectClassName
            ),
          })}
        >
          {!multiple && placeholder && (
            <option
              value=""
              disabled={required}
            >
              {loading
                ? loadingText
                : hasAvailableOptions
                  ? placeholder
                  : emptyText}
            </option>
          )}

          {hasAvailableOptions &&
            renderOptions()}
        </select>

        {!multiple && (
          <span
            aria-hidden="true"
            data-slot="select-end-icon"
            className={cn(
              "pointer-events-none absolute",
              "top-1/2 z-10",
              "flex -translate-y-1/2",
              "items-center justify-center",
              "text-gray-400",

              "dark:text-gray-500",

              error &&
                "text-red-500 dark:text-red-400",

              END_POSITION_CLASSES[selectSize]
            )}
          >
            {loading ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </span>
        )}
      </div>

      {loading && (
        <span
          id={loadingStatusId}
          role="status"
          aria-live="polite"
          className="sr-only"
        >
          {loadingText}
        </span>
      )}

      {hasErrorMessage && (
        <p
          id={errorMessageId}
          role="alert"
          data-slot="select-error-message"
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
          data-slot="select-helper-text"
          className={cn(
            "mt-1.5 text-xs",
            "text-gray-500",
            "dark:text-gray-400",
            messageClassName
          )}
        >
          {helperText}
        </p>
      )}
    </div>
  );
});

Select.displayName = "Select";

export default Select;