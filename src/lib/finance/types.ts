/**
 * หมวดเกษตรเป็นหมวดหลักของระบบใหม่ ส่วนหมวดเดิมคงไว้เพื่อให้ข้อมูล
 * ที่บันทึกก่อน migration ยังคงเปิดดูและคำนวณได้ตามปกติ
 */
export const EXPENSE_CATEGORIES = [
  // หมวดเกษตร
  "seed",
  "fertilizer",
  "pesticide",
  "labor",
  "irrigation",
  "fuel_transport",
  "land_rent",
  "machinery",
  "other_farm_expense",
  // หมวดการใช้จ่ายส่วนตัว
  "food",
  "coffee",
  "transport",
  "housing",
  "phone_internet",
  "utilities_water",
  "utilities_electricity",
  "health",
  "education",
  "shopping",
  "entertainment",
  "subscription",
  "debt",
  "family",
  "other_expense",
] as const;

export const INCOME_CATEGORIES = [
  // รายรับเกษตร
  "rice_sales",
  "farm_support",
  "other_farm_income",
  // รายรับส่วนตัว
  "salary",
  "wage",
  "side_income",
  "product_sales",
  "business",
  "bonus",
  "interest",
  "dividend",
  "cashback",
  "transfer",
  "other_income",
] as const;

export type ExpenseCategory =
  (typeof EXPENSE_CATEGORIES)[number];
export type IncomeCategory =
  (typeof INCOME_CATEGORIES)[number];
export type KnownFinanceCategory =
  | ExpenseCategory
  | IncomeCategory;
/**
 * Custom categories are stored as a user-owned key (custom_xxx).  Keep this
 * broad at the UI boundary, while API routes verify ownership before saving.
 */
export type FinanceCategory = string;
export type FinanceTransactionType =
  | "income"
  | "expense";
export type FinanceTransactionSource =
  | "chat"
  | "manual"
  | "recurring"
  | "receipt"
  | "voice"
  | "pdf";

export const FINANCE_CATEGORY_LABELS: Record<
  KnownFinanceCategory,
  string
> = {
  seed: "เมล็ดพันธุ์",
  fertilizer: "ปุ๋ย",
  pesticide: "สารป้องกันกำจัดศัตรูพืช",
  labor: "ค่าแรง",
  irrigation: "ค่าน้ำและสูบน้ำ",
  fuel_transport: "น้ำมันและขนส่ง",
  land_rent: "ค่าเช่าที่ดิน",
  machinery: "เครื่องจักรและซ่อมบำรุง",
  other_farm_expense: "ต้นทุนเกษตรอื่น ๆ",
  food: "อาหาร",
  coffee: "กาแฟและเครื่องดื่ม",
  transport: "เดินทาง",
  housing: "ที่พักและค่าเช่า",
  phone_internet: "โทรศัพท์และอินเทอร์เน็ต",
  utilities_water: "ค่าน้ำ",
  utilities_electricity: "ค่าไฟ",
  health: "สุขภาพ",
  education: "การศึกษา",
  shopping: "ช้อปปิ้ง",
  entertainment: "ความบันเทิง",
  subscription: "Subscription",
  debt: "หนี้สิน",
  family: "ครอบครัว",
  other_expense: "รายจ่ายอื่น ๆ",
  rice_sales: "ขายผลผลิตข้าว",
  farm_support: "เงินสนับสนุน/ชดเชย",
  other_farm_income: "รายรับเกษตรอื่น ๆ",
  salary: "เงินเดือน",
  wage: "ค่าจ้าง",
  side_income: "รายได้เสริม",
  product_sales: "ขายสินค้า",
  business: "ธุรกิจ",
  bonus: "โบนัส",
  interest: "ดอกเบี้ย",
  dividend: "เงินปันผล",
  cashback: "เงินคืน",
  transfer: "เงินโอน",
  other_income: "รายรับอื่น ๆ",
};

export function getFinanceCategoryLabel(
  category: FinanceCategory,
  customLabel?: string | null
): string {
  if (customLabel?.trim()) {
    return customLabel.trim();
  }

  return isKnownFinanceCategory(category)
    ? FINANCE_CATEGORY_LABELS[category]
    : "อื่น ๆ";
}

export interface FinanceTransactionDraft {
  transactionType: FinanceTransactionType;
  category: FinanceCategory;
  amount: number;
  description: string;
  transactionDate: string;
  transactionTime?: string | null;
  notes?: string;
  source?: FinanceTransactionSource;
  accountId?: string | null;
  sourceText: string;
  confidence: number;
}

export interface FinanceAnalysisResult {
  draft: FinanceTransactionDraft | null;
  drafts: FinanceTransactionDraft[];
  needsClarification: boolean;
  clarificationMessage: string;
}

export interface SavedFinanceTransaction
  extends FinanceTransactionDraft {
  id: string;
  createdAt: string;
  updatedAt?: string;
  categoryLabel?: string;
}

export interface FinanceSummary {
  income: number;
  expense: number;
  balance: number;
  saving: number;
  savingRate: number | null;
  transactionCount: number;
  month: string;
}

export interface FinanceCategoryBreakdown {
  category: FinanceCategory;
  transactionType: FinanceTransactionType;
  amount: number;
}

export type FinanceTrendPeriod = "week" | "month" | "year";

export interface FinanceTrendPoint {
  period: string;
  income: number;
  expense: number;
}

export interface FinanceOverview {
  summary: FinanceSummary;
  transactions: SavedFinanceTransaction[];
  categoryBreakdown: FinanceCategoryBreakdown[];
  trendPeriod: FinanceTrendPeriod;
  trend: FinanceTrendPoint[];
}

export interface FinanceCategoryOption {
  id?: string;
  key: FinanceCategory;
  name: string;
  transactionType: FinanceTransactionType;
  icon: string;
  isCustom: boolean;
  isEnabled: boolean;
  sortOrder: number;
}

export interface FinanceAccount {
  id: string;
  name: string;
  accountType: "cash" | "personal" | "business" | "family" | "other";
  isEnabled: boolean;
}

export interface FinanceSettings {
  onboardingCompleted: boolean;
  budgetCycleStartDay: number;
}

export interface FinanceRecurringTransaction {
  id: string;
  transactionType: FinanceTransactionType;
  category: FinanceCategory;
  description: string;
  amount: number;
  dayOfMonth: number;
  accountId: string | null;
  notes: string;
  isEnabled: boolean;
}

export interface FinanceBudget {
  id: string;
  month: string;
  category: ExpenseCategory;
  amount: number;
  createdAt: string;
  updatedAt: string;
}

export interface FinanceBudgetCategoryStatus {
  category: ExpenseCategory;
  budget: number;
  actual: number;
  remaining: number;
  utilizationPercent: number | null;
  transactionCount: number;
}

export type FinanceBudgetInsightTone =
  | "positive"
  | "warning"
  | "neutral";

export interface FinanceBudgetInsight {
  tone: FinanceBudgetInsightTone;
  title: string;
  description: string;
}

export interface FinanceBudgetOverview {
  month: string;
  totalBudget: number;
  totalExpense: number;
  remaining: number;
  utilizationPercent: number | null;
  previousMonthExpense: number;
  expenseChangePercent: number | null;
  overBudgetCount: number;
  budgets: FinanceBudget[];
  categories: FinanceBudgetCategoryStatus[];
  insights: FinanceBudgetInsight[];
}

export interface FinanceApiError {
  error: {
    code: string;
    message: string;
  };
}

export function isFinanceTransactionType(
  value: unknown
): value is FinanceTransactionType {
  return value === "income" || value === "expense";
}

export function isFinanceCategory(
  value: unknown
): value is FinanceCategory {
  return typeof value === "string" && value.trim().length > 0 && value.length <= 80;
}

export function isKnownFinanceCategory(
  value: unknown
): value is KnownFinanceCategory {
  return (
    typeof value === "string" &&
    ([...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES] as readonly string[]).includes(value)
  );
}

export function isCategoryForType(
  category: FinanceCategory,
  transactionType: FinanceTransactionType
): boolean {
  if (!isKnownFinanceCategory(category)) {
    return true;
  }

  const categories =
    transactionType === "expense"
      ? EXPENSE_CATEGORIES
      : INCOME_CATEGORIES;

  return (categories as readonly string[]).includes(category);
}
