export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type StudentStatus = 'active' | 'inactive';

export interface ClassItem {
  id: string;
  name: string;
  section: string | null;
  created_at: string;
  student_count?: number;
}

export interface StudentItem {
  id: string;
  name: string;
  class_id: string | null;
  roll_number: string | null;
  status: StudentStatus;
  created_at: string;
  classes?: {
    id: string;
    name: string;
    section: string | null;
  } | null;
}

export interface ResultItem {
  id: string;
  student_id: string;
  subject: string;
  score: number | null;
  grade: string | null;
  date: string | null;
  created_at: string;
  students?: {
    id: string;
    name: string;
    roll_number: string | null;
    class_id: string | null;
    classes?: {
      id: string;
      name: string;
      section: string | null;
    } | null;
  } | null;
}

export interface Database {
  public: {
    Tables: {
      classes: {
        Row: {
          id: string;
          name: string;
          section: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          section?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          section?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      students: {
        Row: {
          id: string;
          name: string;
          class_id: string | null;
          roll_number: string | null;
          status: 'active' | 'inactive';
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          class_id?: string | null;
          roll_number?: string | null;
          status?: 'active' | 'inactive';
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          class_id?: string | null;
          roll_number?: string | null;
          status?: 'active' | 'inactive';
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "students_class_id_fkey";
            columns: ["class_id"];
            isOneToOne: false;
            referencedRelation: "classes";
            referencedColumns: ["id"];
          }
        ];
      };
      results: {
        Row: {
          id: string;
          student_id: string;
          subject: string;
          score: number | null;
          grade: string | null;
          date: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          subject: string;
          score?: number | null;
          grade?: string | null;
          date?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string;
          subject?: string;
          score?: number | null;
          grade?: string | null;
          date?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "results_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
