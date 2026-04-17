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
      benefit_enrollments: {
        Row: {
          benefitId: string
          companyId: string
          createdAt: string
          employeeId: string
          endedAt: string | null
          enrolledAt: string
          id: string
          notes: string | null
          status: string
          updatedAt: string
        }
        Insert: {
          benefitId: string
          companyId: string
          createdAt?: string
          employeeId: string
          endedAt?: string | null
          enrolledAt?: string
          id?: string
          notes?: string | null
          status?: string
          updatedAt?: string
        }
        Update: {
          benefitId?: string
          companyId?: string
          createdAt?: string
          employeeId?: string
          endedAt?: string | null
          enrolledAt?: string
          id?: string
          notes?: string | null
          status?: string
          updatedAt?: string
        }
        Relationships: []
      }
      benefit_types: {
        Row: {
          color: string
          companyId: string
          createdAt: string
          description: string | null
          id: string
          isActive: boolean
          name: string
          updatedAt: string
        }
        Insert: {
          color?: string
          companyId: string
          createdAt?: string
          description?: string | null
          id?: string
          isActive?: boolean
          name: string
          updatedAt?: string
        }
        Update: {
          color?: string
          companyId?: string
          createdAt?: string
          description?: string | null
          id?: string
          isActive?: boolean
          name?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "benefit_types_companyId_fkey"
            columns: ["companyId"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      benefits: {
        Row: {
          benefitTypeId: string | null
          companyId: string
          coverageDetails: string | null
          createdAt: string
          description: string | null
          employeeContribution: number
          employerContribution: number
          id: string
          name: string
          provider: string | null
          updatedAt: string
        }
        Insert: {
          benefitTypeId?: string | null
          companyId: string
          coverageDetails?: string | null
          createdAt?: string
          description?: string | null
          employeeContribution?: number
          employerContribution?: number
          id?: string
          name: string
          provider?: string | null
          updatedAt?: string
        }
        Update: {
          benefitTypeId?: string | null
          companyId?: string
          coverageDetails?: string | null
          createdAt?: string
          description?: string | null
          employeeContribution?: number
          employerContribution?: number
          id?: string
          name?: string
          provider?: string | null
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "benefits_benefitTypeId_fkey"
            columns: ["benefitTypeId"]
            isOneToOne: false
            referencedRelation: "benefit_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "benefits_companyId_fkey"
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
      documents: {
        Row: {
          category: string
          companyId: string
          createdAt: string
          employeeId: string | null
          fileSize: number | null
          fileUrl: string | null
          id: string
          isCompanyWide: boolean
          name: string
          type: string
          updatedAt: string
          uploadedBy: string | null
        }
        Insert: {
          category: string
          companyId: string
          createdAt?: string
          employeeId?: string | null
          fileSize?: number | null
          fileUrl?: string | null
          id?: string
          isCompanyWide?: boolean
          name: string
          type: string
          updatedAt?: string
          uploadedBy?: string | null
        }
        Update: {
          category?: string
          companyId?: string
          createdAt?: string
          employeeId?: string | null
          fileSize?: number | null
          fileUrl?: string | null
          id?: string
          isCompanyWide?: boolean
          name?: string
          type?: string
          updatedAt?: string
          uploadedBy?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_companyId_fkey"
            columns: ["companyId"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_employeeId_fkey"
            columns: ["employeeId"]
            isOneToOne: false
            referencedRelation: "employees"
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
      expense_types: {
        Row: {
          color: string
          companyId: string
          createdAt: string
          description: string | null
          id: string
          isActive: boolean
          name: string
          updatedAt: string
        }
        Insert: {
          color?: string
          companyId: string
          createdAt?: string
          description?: string | null
          id?: string
          isActive?: boolean
          name: string
          updatedAt?: string
        }
        Update: {
          color?: string
          companyId?: string
          createdAt?: string
          description?: string | null
          id?: string
          isActive?: boolean
          name?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_types_companyId_fkey"
            columns: ["companyId"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          companyId: string
          createdAt: string
          description: string
          employeeId: string
          expenseDate: string
          expenseTypeId: string | null
          id: string
          notes: string | null
          receiptUrl: string | null
          status: string
          updatedAt: string
        }
        Insert: {
          amount?: number
          companyId: string
          createdAt?: string
          description: string
          employeeId: string
          expenseDate: string
          expenseTypeId?: string | null
          id?: string
          notes?: string | null
          receiptUrl?: string | null
          status?: string
          updatedAt?: string
        }
        Update: {
          amount?: number
          companyId?: string
          createdAt?: string
          description?: string
          employeeId?: string
          expenseDate?: string
          expenseTypeId?: string | null
          id?: string
          notes?: string | null
          receiptUrl?: string | null
          status?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_companyId_fkey"
            columns: ["companyId"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_employeeId_fkey"
            columns: ["employeeId"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_expenseTypeId_fkey"
            columns: ["expenseTypeId"]
            isOneToOne: false
            referencedRelation: "expense_types"
            referencedColumns: ["id"]
          },
        ]
      }
      job_candidates: {
        Row: {
          appliedDate: string | null
          companyId: string
          coverLetter: string | null
          createdAt: string
          email: string
          firstName: string
          id: string
          jobId: string | null
          lastName: string
          notes: string | null
          phone: string | null
          rating: number | null
          resumeUrl: string | null
          stage: string
          updatedAt: string
        }
        Insert: {
          appliedDate?: string | null
          companyId: string
          coverLetter?: string | null
          createdAt?: string
          email: string
          firstName: string
          id?: string
          jobId?: string | null
          lastName: string
          notes?: string | null
          phone?: string | null
          rating?: number | null
          resumeUrl?: string | null
          stage?: string
          updatedAt?: string
        }
        Update: {
          appliedDate?: string | null
          companyId?: string
          coverLetter?: string | null
          createdAt?: string
          email?: string
          firstName?: string
          id?: string
          jobId?: string | null
          lastName?: string
          notes?: string | null
          phone?: string | null
          rating?: number | null
          resumeUrl?: string | null
          stage?: string
          updatedAt?: string
        }
        Relationships: []
      }
      jobs: {
        Row: {
          closingDate: string | null
          companyId: string
          createdAt: string
          departmentId: string | null
          description: string | null
          employmentType: Database["public"]["Enums"]["employment_type"]
          id: string
          location: string | null
          postedDate: string | null
          requirements: string | null
          salaryMax: number | null
          salaryMin: number | null
          status: string
          title: string
          updatedAt: string
        }
        Insert: {
          closingDate?: string | null
          companyId: string
          createdAt?: string
          departmentId?: string | null
          description?: string | null
          employmentType?: Database["public"]["Enums"]["employment_type"]
          id?: string
          location?: string | null
          postedDate?: string | null
          requirements?: string | null
          salaryMax?: number | null
          salaryMin?: number | null
          status?: string
          title: string
          updatedAt?: string
        }
        Update: {
          closingDate?: string | null
          companyId?: string
          createdAt?: string
          departmentId?: string | null
          description?: string | null
          employmentType?: Database["public"]["Enums"]["employment_type"]
          id?: string
          location?: string | null
          postedDate?: string | null
          requirements?: string | null
          salaryMax?: number | null
          salaryMin?: number | null
          status?: string
          title?: string
          updatedAt?: string
        }
        Relationships: []
      }
      leave_types: {
        Row: {
          color: string | null
          companyId: string
          createdAt: string
          daysAllowed: number
          description: string | null
          id: string
          isActive: boolean
          name: string
          requiresDeptApproval: boolean
          requiresMgmtApproval: boolean
          updatedAt: string
        }
        Insert: {
          color?: string | null
          companyId: string
          createdAt?: string
          daysAllowed?: number
          description?: string | null
          id?: string
          isActive?: boolean
          name: string
          requiresDeptApproval?: boolean
          requiresMgmtApproval?: boolean
          updatedAt?: string
        }
        Update: {
          color?: string | null
          companyId?: string
          createdAt?: string
          daysAllowed?: number
          description?: string | null
          id?: string
          isActive?: boolean
          name?: string
          requiresDeptApproval?: boolean
          requiresMgmtApproval?: boolean
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_types_companyId_fkey"
            columns: ["companyId"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          companyId: string | null
          createdAt: string
          id: string
          link: string | null
          readAt: string | null
          title: string
          type: string
          userId: string
        }
        Insert: {
          body?: string | null
          companyId?: string | null
          createdAt?: string
          id?: string
          link?: string | null
          readAt?: string | null
          title: string
          type: string
          userId: string
        }
        Update: {
          body?: string | null
          companyId?: string | null
          createdAt?: string
          id?: string
          link?: string | null
          readAt?: string | null
          title?: string
          type?: string
          userId?: string
        }
        Relationships: []
      }
      payroll_records: {
        Row: {
          baseSalary: number
          companyId: string
          createdAt: string
          deductionNotes: string | null
          deductions: number
          employeeId: string
          grossSalary: number
          id: string
          month: string
          netPay: number
          overtimeAmount: number
          overtimeHours: number
          overtimeRate: number
          payFrequency: string
          payPeriodEnd: string
          payPeriodStart: string
          status: string
          updatedAt: string
        }
        Insert: {
          baseSalary?: number
          companyId: string
          createdAt?: string
          deductionNotes?: string | null
          deductions?: number
          employeeId: string
          grossSalary?: number
          id?: string
          month: string
          netPay?: number
          overtimeAmount?: number
          overtimeHours?: number
          overtimeRate?: number
          payFrequency?: string
          payPeriodEnd: string
          payPeriodStart: string
          status?: string
          updatedAt?: string
        }
        Update: {
          baseSalary?: number
          companyId?: string
          createdAt?: string
          deductionNotes?: string | null
          deductions?: number
          employeeId?: string
          grossSalary?: number
          id?: string
          month?: string
          netPay?: number
          overtimeAmount?: number
          overtimeHours?: number
          overtimeRate?: number
          payFrequency?: string
          payPeriodEnd?: string
          payPeriodStart?: string
          status?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_records_companyId_fkey"
            columns: ["companyId"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_records_employeeId_fkey"
            columns: ["employeeId"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_reviews: {
        Row: {
          comments: string | null
          communicationRating: number | null
          companyId: string
          createdAt: string
          employeeId: string
          goals: string | null
          id: string
          improvements: string | null
          overallRating: number | null
          productivityRating: number | null
          qualityRating: number | null
          reviewDate: string | null
          reviewerId: string | null
          reviewPeriodEnd: string
          reviewPeriodStart: string
          status: string
          strengths: string | null
          teamworkRating: number | null
          updatedAt: string
        }
        Insert: {
          comments?: string | null
          communicationRating?: number | null
          companyId: string
          createdAt?: string
          employeeId: string
          goals?: string | null
          id?: string
          improvements?: string | null
          overallRating?: number | null
          productivityRating?: number | null
          qualityRating?: number | null
          reviewDate?: string | null
          reviewerId?: string | null
          reviewPeriodEnd: string
          reviewPeriodStart: string
          status?: string
          strengths?: string | null
          teamworkRating?: number | null
          updatedAt?: string
        }
        Update: {
          comments?: string | null
          communicationRating?: number | null
          companyId?: string
          createdAt?: string
          employeeId?: string
          goals?: string | null
          id?: string
          improvements?: string | null
          overallRating?: number | null
          productivityRating?: number | null
          qualityRating?: number | null
          reviewDate?: string | null
          reviewerId?: string | null
          reviewPeriodEnd?: string
          reviewPeriodStart?: string
          status?: string
          strengths?: string | null
          teamworkRating?: number | null
          updatedAt?: string
        }
        Relationships: []
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
      time_entries: {
        Row: {
          breakMinutes: number
          clockIn: string
          clockInLatitude: number | null
          clockInLocation: string | null
          clockInLongitude: number | null
          clockOut: string | null
          clockOutLatitude: number | null
          clockOutLocation: string | null
          clockOutLongitude: number | null
          companyId: string
          createdAt: string
          date: string
          employeeId: string
          id: string
          notes: string | null
          updatedAt: string
        }
        Insert: {
          breakMinutes?: number
          clockIn?: string
          clockInLatitude?: number | null
          clockInLocation?: string | null
          clockInLongitude?: number | null
          clockOut?: string | null
          clockOutLatitude?: number | null
          clockOutLocation?: string | null
          clockOutLongitude?: number | null
          companyId: string
          createdAt?: string
          date?: string
          employeeId: string
          id?: string
          notes?: string | null
          updatedAt?: string
        }
        Update: {
          breakMinutes?: number
          clockIn?: string
          clockInLatitude?: number | null
          clockInLocation?: string | null
          clockInLongitude?: number | null
          clockOut?: string | null
          clockOutLatitude?: number | null
          clockOutLocation?: string | null
          clockOutLongitude?: number | null
          companyId?: string
          createdAt?: string
          date?: string
          employeeId?: string
          id?: string
          notes?: string | null
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_companyId_fkey"
            columns: ["companyId"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_employeeId_fkey"
            columns: ["employeeId"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      time_off_requests: {
        Row: {
          actualReturnDate: string | null
          adminApprovalStatus: string
          companyId: string
          createdAt: string
          deptApprovalStatus: string
          deptApprovalToken: string | null
          employeeId: string
          endDate: string
          id: string
          leaveTypeId: string | null
          mgmtApprovalStatus: string
          mgmtApprovalToken: string | null
          reason: string | null
          startDate: string
          status: string
          type: string | null
          updatedAt: string
        }
        Insert: {
          actualReturnDate?: string | null
          adminApprovalStatus?: string
          companyId: string
          createdAt?: string
          deptApprovalStatus?: string
          deptApprovalToken?: string | null
          employeeId: string
          endDate: string
          id?: string
          leaveTypeId?: string | null
          mgmtApprovalStatus?: string
          mgmtApprovalToken?: string | null
          reason?: string | null
          startDate: string
          status?: string
          type?: string | null
          updatedAt?: string
        }
        Update: {
          actualReturnDate?: string | null
          adminApprovalStatus?: string
          companyId?: string
          createdAt?: string
          deptApprovalStatus?: string
          deptApprovalToken?: string | null
          employeeId?: string
          endDate?: string
          id?: string
          leaveTypeId?: string | null
          mgmtApprovalStatus?: string
          mgmtApprovalToken?: string | null
          reason?: string | null
          startDate?: string
          status?: string
          type?: string | null
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_off_requests_companyId_fkey"
            columns: ["companyId"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_off_requests_employeeId_fkey"
            columns: ["employeeId"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_off_requests_leaveTypeId_fkey"
            columns: ["leaveTypeId"]
            isOneToOne: false
            referencedRelation: "leave_types"
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
