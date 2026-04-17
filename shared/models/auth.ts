/** Phase-0 stub for the Drizzle auth model. */
export interface User {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
  role?: "admin" | "employee" | "super_admin";
}
export type UpsertUser = Partial<User> & { id?: string };
