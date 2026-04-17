/**
 * Phase-0 type stubs for the original Drizzle schema. Each entity is `any` so
 * the ported pages compile freely. Replaced with real Lovable Cloud DB types
 * in later phases.
 */
export type Company = any;
export type CompanySettings = any;
export type Department = any;
export type Project = any;
export type Accommodation = any;
export type AccommodationRoom = any;
export type Employee = any;
export type InsertEmployee = any;
export type Skill = any;
export type Certification = any;
export type TimeOffRequest = any;
export type LeaveType = any;
export type Document = any;
export type OnboardingTask = any;
export type RecruitmentCandidate = any;
export type Announcement = any;
export type PayrollRecord = any;
export type CompensationHistory = any;
export type PerformanceReview = any;
export type Goal = any;
export type TimeEntry = any;
export type Expense = any;
export type ExpenseType = any;
export type Benefit = any;
export type BenefitType = any;
export type EmployeeBenefit = any;
export type BankTransferSettings = any;
export type BankTransferPayment = any;
export type PlatformContactSettings = any;

export const PROJECT_TYPES = ["project", "branch", "site"] as const;
export const LEAVE_STATUSES = ["pending", "approved", "rejected"] as const;
export const DOCUMENT_STATUSES = ["valid", "expiring", "expired", "missing"] as const;
