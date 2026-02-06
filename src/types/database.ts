// Supabase Database types - manual definition matching @supabase/supabase-js expected structure
// Will be replaced by CLI-generated types when Supabase project is connected

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      events: {
        Row: {
          id: string;
          admin_id: string;
          slug: string;
          name: string;
          race_date: string;
          registration_opens: string | null;
          registration_closes: string | null;
          payment_qr_url: string | null;
          published: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          admin_id: string;
          slug: string;
          name: string;
          race_date: string;
          registration_opens?: string | null;
          registration_closes?: string | null;
          payment_qr_url?: string | null;
          published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          admin_id?: string;
          slug?: string;
          name?: string;
          race_date?: string;
          registration_opens?: string | null;
          registration_closes?: string | null;
          payment_qr_url?: string | null;
          published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "events_admin_id_fkey";
            columns: ["admin_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      classes: {
        Row: {
          id: string;
          event_id: string;
          name: string;
          fee: number;
          number_start: number;
          number_end: number;
          number_format: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          name: string;
          fee?: number;
          number_start: number;
          number_end: number;
          number_format?: string;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          name?: string;
          fee?: number;
          number_start?: number;
          number_end?: number;
          number_format?: string;
          sort_order?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "classes_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
      checkpoints: {
        Row: {
          id: string;
          event_id: string;
          name: string;
          sort_order: number;
          access_code: string;
          code_expires_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          name: string;
          sort_order: number;
          access_code: string;
          code_expires_at: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          name?: string;
          sort_order?: number;
          access_code?: string;
          code_expires_at?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "checkpoints_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
      class_checkpoints: {
        Row: {
          class_id: string;
          checkpoint_id: string;
        };
        Insert: {
          class_id: string;
          checkpoint_id: string;
        };
        Update: {
          class_id?: string;
          checkpoint_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "class_checkpoints_class_id_fkey";
            columns: ["class_id"];
            isOneToOne: false;
            referencedRelation: "classes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "class_checkpoints_checkpoint_id_fkey";
            columns: ["checkpoint_id"];
            isOneToOne: false;
            referencedRelation: "checkpoints";
            referencedColumns: ["id"];
          },
        ];
      };
      racers: {
        Row: {
          id: string;
          event_id: string;
          name: string;
          team: string | null;
          bike: string | null;
          phone: string | null;
          photo_url: string | null;
          short_uid: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          name: string;
          team?: string | null;
          bike?: string | null;
          phone?: string | null;
          photo_url?: string | null;
          short_uid?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          name?: string;
          team?: string | null;
          bike?: string | null;
          phone?: string | null;
          photo_url?: string | null;
          short_uid?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "racers_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
      racer_classes: {
        Row: {
          id: string;
          racer_id: string;
          class_id: string;
          race_number: number;
          payment_slip_url: string | null;
          confirmed: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          racer_id: string;
          class_id: string;
          race_number: number;
          payment_slip_url?: string | null;
          confirmed?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          racer_id?: string;
          class_id?: string;
          race_number?: number;
          payment_slip_url?: string | null;
          confirmed?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "racer_classes_racer_id_fkey";
            columns: ["racer_id"];
            isOneToOne: false;
            referencedRelation: "racers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "racer_classes_class_id_fkey";
            columns: ["class_id"];
            isOneToOne: false;
            referencedRelation: "classes";
            referencedColumns: ["id"];
          },
        ];
      };
      timestamps: {
        Row: {
          id: string;
          checkpoint_id: string;
          racer_id: string;
          recorded_at: string;
          recorded_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          checkpoint_id: string;
          racer_id: string;
          recorded_at?: string;
          recorded_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          checkpoint_id?: string;
          racer_id?: string;
          recorded_at?: string;
          recorded_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "timestamps_checkpoint_id_fkey";
            columns: ["checkpoint_id"];
            isOneToOne: false;
            referencedRelation: "checkpoints";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "timestamps_racer_id_fkey";
            columns: ["racer_id"];
            isOneToOne: false;
            referencedRelation: "racers";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_logs: {
        Row: {
          id: string;
          event_id: string;
          admin_id: string;
          action: string;
          target_type: string;
          target_id: string;
          old_value: Json | null;
          new_value: Json | null;
          reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          admin_id: string;
          action: string;
          target_type: string;
          target_id: string;
          old_value?: Json | null;
          new_value?: Json | null;
          reason?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          admin_id?: string;
          action?: string;
          target_type?: string;
          target_id?: string;
          old_value?: Json | null;
          new_value?: Json | null;
          reason?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "audit_logs_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "audit_logs_admin_id_fkey";
            columns: ["admin_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      dnf_records: {
        Row: {
          id: string;
          racer_id: string;
          checkpoint_id: string | null;
          reason: string;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          racer_id: string;
          checkpoint_id?: string | null;
          reason: string;
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          racer_id?: string;
          checkpoint_id?: string | null;
          reason?: string;
          created_by?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "dnf_records_racer_id_fkey";
            columns: ["racer_id"];
            isOneToOne: true;
            referencedRelation: "racers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "dnf_records_checkpoint_id_fkey";
            columns: ["checkpoint_id"];
            isOneToOne: false;
            referencedRelation: "checkpoints";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "dnf_records_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      penalties: {
        Row: {
          id: string;
          racer_id: string;
          seconds: number;
          reason: string;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          racer_id: string;
          seconds: number;
          reason: string;
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          racer_id?: string;
          seconds?: number;
          reason?: string;
          created_by?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "penalties_racer_id_fkey";
            columns: ["racer_id"];
            isOneToOne: false;
            referencedRelation: "racers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "penalties_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_next_race_number: {
        Args: {
          p_class_id: string;
        };
        Returns: number;
      };
      validate_access_code: {
        Args: {
          p_code: string;
        };
        Returns: {
          checkpoint_id: string;
          checkpoint_name: string;
          event_id: string;
          event_name: string;
        }[];
      };
      record_timestamp: {
        Args: {
          p_checkpoint_id: string;
          p_racer_id: string;
          p_recorded_by?: string;
        };
        Returns: string;
      };
      generate_short_uid: {
        Args: Record<string, never>;
        Returns: string;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

// Convenience type aliases
type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type Event = Tables<"events">;
export type RaceClass = Tables<"classes">;
export type Checkpoint = Tables<"checkpoints">;
export type ClassCheckpoint = Tables<"class_checkpoints">;
export type Racer = Tables<"racers">;
export type RacerClass = Tables<"racer_classes">;
export type RaceTimestamp = Tables<"timestamps">;
export type AuditLog = Tables<"audit_logs">;
export type DnfRecord = Tables<"dnf_records">;
export type Penalty = Tables<"penalties">;
