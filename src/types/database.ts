export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserType = 'student' | 'staff';
export type AchievementCategory = 'academic' | 'sports' | 'arts' | 'leadership' | 'other';

export type Session =
  | {
      type: 'admin';
    }
  | {
      type: 'staff';
      id: string;
      name: string;
      email: string;
      accessClasses: boolean;
      accessResults: boolean;
    }
  | {
      type: 'student';
      id: string;
      name: string;
      email: string;
      classId: string | null;
      className?: string;
    };

export interface ClassItem {
  id: string;
  name: string;
  section: string | null;
  created_at: string;
  student_count?: number;
}

export interface UserItem {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  user_type: UserType;
  class_id: string | null;
  access_classes: boolean;
  access_results: boolean;
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
    email?: string;
    class_id: string | null;
    classes?: {
      id: string;
      name: string;
      section: string | null;
    } | null;
  } | null;
}

export interface AchievementItem {
  id: string;
  student_id: string;
  title: string;
  description: string | null;
  category: AchievementCategory;
  date: string | null;
  created_at: string;
  users?: {
    id: string;
    name: string;
    email: string;
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
      users: {
        Row: {
          id: string;
          name: string;
          email: string;
          password_hash: string;
          user_type: UserType;
          class_id: string | null;
          access_classes: boolean;
          access_results: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email: string;
          password_hash: string;
          user_type: UserType;
          class_id?: string | null;
          access_classes?: boolean;
          access_results?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          password_hash?: string;
          user_type?: UserType;
          class_id?: string | null;
          access_classes?: boolean;
          access_results?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "users_class_id_fkey";
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
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      achievements: {
        Row: {
          id: string;
          student_id: string;
          title: string;
          description: string | null;
          category: AchievementCategory;
          date: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          title: string;
          description?: string | null;
          category?: AchievementCategory;
          date?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string;
          title?: string;
          description?: string | null;
          category?: AchievementCategory;
          date?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "achievements_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "users";
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
