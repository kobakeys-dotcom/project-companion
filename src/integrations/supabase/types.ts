export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      accommodation_rooms: {
        Row: {
          accommodationId: string
          capacity: number
          createdAt: string
          id: string
          name: string
          updatedAt: string
        }
        Insert: {
          accommodationId: string
          capacity?: number
          createdAt?: string
          id?: string
          name: string
          updatedAt?: string
        }
        Update: {
          accommodationId?: string
          capacity?: number
          createdAt?: string
          id?: string
          name?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "accommodation_rooms_accommodationId_fkey"
            columns: ["accommodationId"]
            isOneToOne: false
            referencedRelation: "accommodations"
            referencedColumns: ["id"]
          },
        ]
      }
      accommodations: {
        Row: {
          address: string | null
          capacity: number | null
          color: string | null
          companyId: string
          createdAt: string
          description: string | null
          id: string
          name: string
          numberOfRooms: number | null
          updatedAt: string
        }
        Insert: {
          address?: string | null
          capacity?: number | null
          color?: string | null
          companyId: string
          createdAt?: string
          description?: string | null
          id?: string
          name: string
          numberOfRooms?: number | null
          updatedAt?: string
        }
        Update: {
          address?: string | null
          capacity?: number | null
          color?: string | null
          companyId?: string
          createdAt?: string
          description?: string | null
          id?: string
          name?: string
          numberOfRooms?: number | null
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "accommodations_companyId_fkey"
            columns: ["companyId"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          company_id: string
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          created_by: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          company_id: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      departments: {
        Row: {
          color: string | null
          companyId: string
          createdAt: string
          description: string | null
          id: string
          name: string
          updatedAt: string
        }
        Insert: {
          color?: string | null
          companyId: string
          createdAt?: string
          description?: string | null
          id?: string
          name: string
          updatedAt?: string
        }
        Update: {
          color?: string | null
          companyId?: string
          createdAt?: string
          description?: string | null
          id?: string
          name?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "departments_companyId_fkey"
            columns: ["companyId"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          accommodationAllowance: number | null
          accommodationId: string | null
          accountNumber1: string | null
          accountNumber2: string | null
          bankName1: string | null
          bankName2: string | null
          basicSalary: number | null
          bio: string | null
          companyId: string
          createdAt: string
          currency1: string | null
          currency2: string | null
          departmentId: string | null
          email: string
          emergencyContactName: string | null
          emergencyContactPhone: string | null
          emergencyContactRelation: string | null
          employmentStatus: Database["public"]["Enums"]["employment_status"]
          employmentType: Database["public"]["Enums"]["employment_type"]
          firstName: string
          foodAllowance: number | null
          id: string
          insuranceExpiryDate: string | null
          jobTitle: string
          lastName: string
          location: string | null
          medicalExpiryDate: string | null
          nationality: string | null
          otherAllowance: number | null
          passportExpiryDate: string | null
          passportNumber: string | null
          phone: string | null
          profileImageUrl: string | null
          projectId: string | null
          quotaExpiryDate: string | null
          roomId: string | null
          safetyShoeIssuedDate: string | null
          safetyShoeSize: string | null
          salary: number | null
          sickDaysTotal: number | null
          sickDaysUsed: number | null
          startDate: string | null
          uniformIssuedDate: string | null
          uniformSize: string | null
          updatedAt: string
          userId: string | null
          vacationDaysTotal: number | null
          vacationDaysUsed: number | null
          visaExpiryDate: string | null
          visaNumber: string | null
          workPermitExpiryDate: string | null
          workPermitNumber: string | null
        }
        Insert: {
          accommodationAllowance?: number | null
          accommodationId?: string | null
          accountNumber1?: string | null
          accountNumber2?: string | null
          bankName1?: string | null
          bankName2?: string | null
          basicSalary?: number | null
          bio?: string | null
          companyId: string
          createdAt?: string
          currency1?: string | null
          currency2?: string | null
          departmentId?: string | null
          email: string
          emergencyContactName?: string | null
          emergencyContactPhone?: string | null
          emergencyContactRelation?: string | null
          employmentStatus?: Database["public"]["Enums"]["employment_status"]
          employmentType?: Database["public"]["Enums"]["employment_type"]
          firstName: string
          foodAllowance?: number | null
          id?: string
          insuranceExpiryDate?: string | null
          jobTitle: string
          lastName: string
          location?: string | null
          medicalExpiryDate?: string | null
          nationality?: string | null
          otherAllowance?: number | null
          passportExpiryDate?: string | null
          passportNumber?: string | null
          phone?: string | null
          profileImageUrl?: string | null
          projectId?: string | null
          quotaExpiryDate?: string | null
          roomId?: string | null
          safetyShoeIssuedDate?: string | null
          safetyShoeSize?: string | null
          salary?: number | null
          sickDaysTotal?: number | null
          sickDaysUsed?: number | null
          startDate?: string | null
          uniformIssuedDate?: string | null
          uniformSize?: string | null
          updatedAt?: string
          userId?: string | null
          vacationDaysTotal?: number | null
          vacationDaysUsed?: number | null
          visaExpiryDate?: string | null
          visaNumber?: string | null
          workPermitExpiryDate?: string | null
          workPermitNumber?: string | null
        }
        Update: {
          accommodationAllowance?: number | null
          accommodationId?: string | null
          accountNumber1?: string | null
          accountNumber2?: string | null
          bankName1?: string | null
          bankName2?: string | null
          basicSalary?: number | null
          bio?: string | null
          companyId?: string
          createdAt?: string
          currency1?: string | null
          currency2?: string | null
          departmentId?: string | null
          email?: string
          emergencyContactName?: string | null
          emergencyContactPhone?: string | null
          emergencyContactRelation?: string | null
          employmentStatus?: Database["public"]["Enums"]["employment_status"]
          employmentType?: Database["public"]["Enums"]["employment_type"]
          firstName?: string
          foodAllowance?: number | null
          id?: string
          insuranceExpiryDate?: string | null
          jobTitle?: string
          lastName?: string
          location?: string | null
          medicalExpiryDate?: string | null
          nationality?: string | null
          otherAllowance?: number | null
          passportExpiryDate?: string | null
          passportNumber?: string | null
          phone?: string | null
          profileImageUrl?: string | null
          projectId?: string | null
          quotaExpiryDate?: string | null
          roomId?: string | null
          safetyShoeIssuedDate?: string | null
          safetyShoeSize?: string | null
          salary?: number | null
          sickDaysTotal?: number | null
          sickDaysUsed?: number | null
          startDate?: string | null
          uniformIssuedDate?: string | null
          uniformSize?: string | null
          updatedAt?: string
          userId?: string | null
          vacationDaysTotal?: number | null
          vacationDaysUsed?: number | null
          visaExpiryDate?: string | null
          visaNumber?: string | null
          workPermitExpiryDate?: string | null
          workPermitNumber?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_accommodationId_fkey"
            columns: ["accommodationId"]
            isOneToOne: false
            referencedRelation: "accommodations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_companyId_fkey"
            columns: ["companyId"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_departmentId_fkey"
            columns: ["departmentId"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_projectId_fkey"
            columns: ["projectId"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_roomId_fkey"
            columns: ["roomId"]
            isOneToOne: false
            referencedRelation: "accommodation_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company_id: string | null
          created_at: string
          email: string | null
          employee_id: string | null
          first_name: string | null
          id: string
          last_name: string | null
          profile_image_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          email?: string | null
          employee_id?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          profile_image_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          email?: string | null
          employee_id?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          profile_image_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          color: string | null
          companyId: string
          createdAt: string
          description: string | null
          id: string
          name: string
          type: Database["public"]["Enums"]["project_type"]
          updatedAt: string
        }
        Insert: {
          color?: string | null
          companyId: string
          createdAt?: string
          description?: string | null
          id?: string
          name: string
          type?: Database["public"]["Enums"]["project_type"]
          updatedAt?: string
        }
        Update: {
          color?: string | null
          companyId?: string
          createdAt?: string
          description?: string | null
          id?: string
          name?: string
          type?: Database["public"]["Enums"]["project_type"]
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_companyId_fkey"
            columns: ["companyId"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          company_id: string | null
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_company: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_company_manager: { Args: { _company_id: string }; Returns: boolean }
      is_company_member: { Args: { _company_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "super_admin" | "admin" | "manager" | "employee"
      employment_status: "active" | "on_leave" | "terminated"
      employment_type: "full_time" | "part_time" | "contractor" | "intern"
      project_type: "project" | "branch" | "site"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["super_admin", "admin", "manager", "employee"],
      employment_status: ["active", "on_leave", "terminated"],
      employment_type: ["full_time", "part_time", "contractor", "intern"],
      project_type: ["project", "branch", "site"],
    },
  },
} as const
