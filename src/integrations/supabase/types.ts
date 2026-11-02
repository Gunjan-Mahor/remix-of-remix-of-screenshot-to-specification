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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      activity: {
        Row: {
          actor_id: string | null
          company_id: string
          created_at: string
          event_type: string
          id: string
          message: string
          po_id: string | null
          request_id: string | null
        }
        Insert: {
          actor_id?: string | null
          company_id: string
          created_at?: string
          event_type: string
          id?: string
          message: string
          po_id?: string | null
          request_id?: string | null
        }
        Update: {
          actor_id?: string | null
          company_id?: string
          created_at?: string
          event_type?: string
          id?: string
          message?: string
          po_id?: string | null
          request_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "purchase_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      approvals: {
        Row: {
          comments: string | null
          company_id: string
          created_at: string
          decision: string
          id: string
          manager_id: string
          quotation_id: string | null
          request_id: string
        }
        Insert: {
          comments?: string | null
          company_id: string
          created_at?: string
          decision: string
          id?: string
          manager_id: string
          quotation_id?: string | null
          request_id: string
        }
        Update: {
          comments?: string | null
          company_id?: string
          created_at?: string
          decision?: string
          id?: string
          manager_id?: string
          quotation_id?: string | null
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "approvals_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approvals_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approvals_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "purchase_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string | null
          annual_budget: number
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          response_deadline_days: number
          weights: Json
        }
        Insert: {
          address?: string | null
          annual_budget?: number
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          response_deadline_days?: number
          weights?: Json
        }
        Update: {
          address?: string | null
          annual_budget?: number
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          response_deadline_days?: number
          weights?: Json
        }
        Relationships: []
      }
      company_invites: {
        Row: {
          accepted: boolean
          company_id: string
          created_at: string
          email: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          accepted?: boolean
          company_id: string
          created_at?: string
          email: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          accepted?: boolean
          company_id?: string
          created_at?: string
          email?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: [
          {
            foreignKeyName: "company_invites_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_members: {
        Row: {
          company_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      complaints: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          description: string
          id: string
          po_id: string
          status: string
          subject: string
          supplier_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          po_id: string
          status?: string
          subject: string
          supplier_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          po_id?: string
          status?: string
          subject?: string
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "complaints_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complaints_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "complaints_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      email_logs: {
        Row: {
          company_id: string
          created_at: string
          error: string | null
          gmail_message_id: string | null
          id: string
          kind: string
          po_id: string | null
          recipient: string
          request_id: string | null
          status: string
          subject: string
          supplier_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          error?: string | null
          gmail_message_id?: string | null
          id?: string
          kind?: string
          po_id?: string | null
          recipient: string
          request_id?: string | null
          status: string
          subject: string
          supplier_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          error?: string | null
          gmail_message_id?: string | null
          id?: string
          kind?: string
          po_id?: string | null
          recipient?: string
          request_id?: string | null
          status?: string
          subject?: string
          supplier_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_logs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "purchase_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_logs_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      email_replies: {
        Row: {
          attachments: Json
          body: string | null
          company_id: string
          created_at: string
          gmail_message_id: string | null
          id: string
          received_at: string | null
          request_id: string | null
          rfq_id: string | null
          sender: string | null
          subject: string | null
          supplier_id: string | null
        }
        Insert: {
          attachments?: Json
          body?: string | null
          company_id: string
          created_at?: string
          gmail_message_id?: string | null
          id?: string
          received_at?: string | null
          request_id?: string | null
          rfq_id?: string | null
          sender?: string | null
          subject?: string | null
          supplier_id?: string | null
        }
        Update: {
          attachments?: Json
          body?: string | null
          company_id?: string
          created_at?: string
          gmail_message_id?: string | null
          id?: string
          received_at?: string | null
          request_id?: string | null
          rfq_id?: string | null
          sender?: string | null
          subject?: string | null
          supplier_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_replies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_replies_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "purchase_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_replies_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "rfqs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_replies_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          read?: boolean
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      order_events: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          event: string
          id: string
          note: string | null
          po_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          event: string
          id?: string
          note?: string | null
          po_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          event?: string
          id?: string
          note?: string | null
          po_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_events_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_type: string
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          notify_email: boolean
          phone: string | null
        }
        Insert: {
          account_type?: string
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          notify_email?: boolean
          phone?: string | null
        }
        Update: {
          account_type?: string
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          notify_email?: boolean
          phone?: string | null
        }
        Relationships: []
      }
      purchase_orders: {
        Row: {
          actual_delivery: string | null
          company_id: string
          created_at: string
          created_by: string
          delivery_charges: number
          delivery_location: string
          expected_delivery: string | null
          id: string
          item_name: string
          payment_mode: string | null
          payment_terms: string | null
          po_date: string
          po_number: string | null
          quantity: number
          quotation_id: string | null
          request_id: string
          status: string
          supplier_email: string
          supplier_id: string
          supplier_name: string
          supplier_phone: string | null
          tax_amount: number
          tax_percent: number
          total_amount: number
          unit_rate: number
          updated_at: string
        }
        Insert: {
          actual_delivery?: string | null
          company_id: string
          created_at?: string
          created_by: string
          delivery_charges?: number
          delivery_location: string
          expected_delivery?: string | null
          id?: string
          item_name: string
          payment_mode?: string | null
          payment_terms?: string | null
          po_date?: string
          po_number?: string | null
          quantity: number
          quotation_id?: string | null
          request_id: string
          status?: string
          supplier_email: string
          supplier_id: string
          supplier_name: string
          supplier_phone?: string | null
          tax_amount?: number
          tax_percent?: number
          total_amount: number
          unit_rate: number
          updated_at?: string
        }
        Update: {
          actual_delivery?: string | null
          company_id?: string
          created_at?: string
          created_by?: string
          delivery_charges?: number
          delivery_location?: string
          expected_delivery?: string | null
          id?: string
          item_name?: string
          payment_mode?: string | null
          payment_terms?: string | null
          po_date?: string
          po_number?: string | null
          quantity?: number
          quotation_id?: string | null
          request_id?: string
          status?: string
          supplier_email?: string
          supplier_id?: string
          supplier_name?: string
          supplier_phone?: string | null
          tax_amount?: number
          tax_percent?: number
          total_amount?: number
          unit_rate?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "purchase_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_requests: {
        Row: {
          ai_comparison: Json | null
          ai_extraction: Json | null
          budget: number
          category: string
          company_id: string
          created_at: string
          created_by: string
          delivery_location: string
          id: string
          is_demo: boolean
          item_name: string
          notes: string | null
          payment_terms: string | null
          quality_requirements: string | null
          quantity: number
          request_code: string | null
          requester_name: string | null
          required_date: string
          specifications: string | null
          status: string
          unit: string
          updated_at: string
        }
        Insert: {
          ai_comparison?: Json | null
          ai_extraction?: Json | null
          budget: number
          category: string
          company_id: string
          created_at?: string
          created_by: string
          delivery_location: string
          id?: string
          is_demo?: boolean
          item_name: string
          notes?: string | null
          payment_terms?: string | null
          quality_requirements?: string | null
          quantity: number
          request_code?: string | null
          requester_name?: string | null
          required_date: string
          specifications?: string | null
          status?: string
          unit?: string
          updated_at?: string
        }
        Update: {
          ai_comparison?: Json | null
          ai_extraction?: Json | null
          budget?: number
          category?: string
          company_id?: string
          created_at?: string
          created_by?: string
          delivery_location?: string
          id?: string
          is_demo?: boolean
          item_name?: string
          notes?: string | null
          payment_terms?: string | null
          quality_requirements?: string | null
          quantity?: number
          request_code?: string | null
          requester_name?: string | null
          required_date?: string
          specifications?: string | null
          status?: string
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      quotations: {
        Row: {
          ai_issues: string[]
          company_id: string
          conditions: string | null
          created_at: string
          created_by: string | null
          currency: string
          delivery_charges: number
          delivery_days: number
          email_reply_id: string | null
          gst_included: boolean
          gst_percent: number
          id: string
          is_demo: boolean
          item_name: string | null
          needs_verification: string[]
          notes: string | null
          payment_terms: string | null
          pdf_path: string | null
          quality_info: string | null
          quantity: number | null
          request_id: string
          rfq_id: string
          source: string
          source_files: Json
          specifications: string | null
          supplier_id: string
          total_price: number
          unit_price: number
          validity: string | null
          verified: boolean
          verified_at: string | null
          verified_by: string | null
          warranty: string | null
        }
        Insert: {
          ai_issues?: string[]
          company_id: string
          conditions?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          delivery_charges?: number
          delivery_days: number
          email_reply_id?: string | null
          gst_included?: boolean
          gst_percent?: number
          id?: string
          is_demo?: boolean
          item_name?: string | null
          needs_verification?: string[]
          notes?: string | null
          payment_terms?: string | null
          pdf_path?: string | null
          quality_info?: string | null
          quantity?: number | null
          request_id: string
          rfq_id: string
          source?: string
          source_files?: Json
          specifications?: string | null
          supplier_id: string
          total_price: number
          unit_price: number
          validity?: string | null
          verified?: boolean
          verified_at?: string | null
          verified_by?: string | null
          warranty?: string | null
        }
        Update: {
          ai_issues?: string[]
          company_id?: string
          conditions?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          delivery_charges?: number
          delivery_days?: number
          email_reply_id?: string | null
          gst_included?: boolean
          gst_percent?: number
          id?: string
          is_demo?: boolean
          item_name?: string | null
          needs_verification?: string[]
          notes?: string | null
          payment_terms?: string | null
          pdf_path?: string | null
          quality_info?: string | null
          quantity?: number | null
          request_id?: string
          rfq_id?: string
          source?: string
          source_files?: Json
          specifications?: string | null
          supplier_id?: string
          total_price?: number
          unit_price?: number
          validity?: string | null
          verified?: boolean
          verified_at?: string | null
          verified_by?: string | null
          warranty?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_email_reply_id_fkey"
            columns: ["email_reply_id"]
            isOneToOne: false
            referencedRelation: "email_replies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "purchase_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "rfqs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      request_attachments: {
        Row: {
          company_id: string
          created_at: string
          id: string
          name: string
          path: string
          request_id: string
          size: number | null
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          name: string
          path: string
          request_id: string
          size?: number | null
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          name?: string
          path?: string
          request_id?: string
          size?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "request_attachments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_attachments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "purchase_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      rfqs: {
        Row: {
          company_id: string
          created_at: string
          deadline_at: string | null
          id: string
          match_reason: string | null
          match_score: number | null
          request_id: string
          responded_at: string | null
          sent_at: string | null
          status: string
          supplier_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          deadline_at?: string | null
          id?: string
          match_reason?: string | null
          match_score?: number | null
          request_id: string
          responded_at?: string | null
          sent_at?: string | null
          status?: string
          supplier_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          deadline_at?: string | null
          id?: string
          match_reason?: string | null
          match_score?: number | null
          request_id?: string
          responded_at?: string | null
          sent_at?: string | null
          status?: string
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rfqs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfqs_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "purchase_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfqs_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_products: {
        Row: {
          category: string
          created_at: string
          id: string
          indicative_price: number | null
          lead_time_days: number | null
          name: string
          specifications: string | null
          supplier_id: string
          unit: string | null
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          indicative_price?: number | null
          lead_time_days?: number | null
          name: string
          specifications?: string | null
          supplier_id: string
          unit?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          indicative_price?: number | null
          lead_time_days?: number | null
          name?: string
          specifications?: string | null
          supplier_id?: string
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplier_products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          categories: string[]
          company_name: string
          created_at: string
          delivery_capabilities: string | null
          description: string | null
          email: string
          gstin: string | null
          id: string
          is_active: boolean
          is_demo: boolean
          phone: string | null
          user_id: string | null
        }
        Insert: {
          address?: string | null
          categories?: string[]
          company_name: string
          created_at?: string
          delivery_capabilities?: string | null
          description?: string | null
          email: string
          gstin?: string | null
          id?: string
          is_active?: boolean
          is_demo?: boolean
          phone?: string | null
          user_id?: string | null
        }
        Update: {
          address?: string | null
          categories?: string[]
          company_name?: string
          created_at?: string
          delivery_capabilities?: string | null
          description?: string | null
          email?: string
          gstin?: string | null
          id?: string
          is_active?: boolean
          is_demo?: boolean
          phone?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_feedback: {
        Row: {
          comments: string | null
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          on_time: boolean
          po_id: string
          quality_rating: number
          rating: number
          supplier_id: string
        }
        Insert: {
          comments?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          on_time: boolean
          po_id: string
          quality_rating: number
          rating: number
          supplier_id: string
        }
        Update: {
          comments?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          on_time?: boolean
          po_id?: string
          quality_rating?: number
          rating?: number
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_feedback_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_feedback_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: true
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_feedback_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_scores: {
        Row: {
          avg_response_hours: number
          completed_orders: number
          is_demo: boolean
          late_deliveries: number
          on_time_pct: number
          quality_note: string | null
          rating: number
          supplier_id: string
        }
        Insert: {
          avg_response_hours?: number
          completed_orders?: number
          is_demo?: boolean
          late_deliveries?: number
          on_time_pct?: number
          quality_note?: string | null
          rating: number
          supplier_id: string
        }
        Update: {
          avg_response_hours?: number
          completed_orders?: number
          is_demo?: boolean
          late_deliveries?: number
          on_time_pct?: number
          quality_note?: string | null
          rating?: number
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_scores_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: true
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_rfq: { Args: { _rfq: string }; Returns: boolean }
      create_approved_po: { Args: { _request_id: string }; Returns: string }
      has_company_role: {
        Args: { _roles: Database["public"]["Enums"]["app_role"][] }
        Returns: boolean
      }
      my_company_id: { Args: never; Returns: string }
      my_supplier_id: { Args: never; Returns: string }
      supplier_can_see_request: { Args: { _rid: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "manager" | "employee"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "manager", "employee"],
    },
  },
} as const
