
export interface SystemPrompt {
  id: string;
  key: string;
  title: string;
  content: string;
  category: string;
  description: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Database {
  public: {
    Tables: {
      admin_users: {
        Row: {
          created_at: string;
          email: string;
          id: string;
        };
        Insert: {
          created_at?: string;
          email: string;
          id: string;
        };
        Update: {
          created_at?: string;
          email?: string;
          id?: string;
        };
      };
      api_keys: {
        Row: {
          active: boolean;
          name: string;
          key: string;
          created_by: string;
          id: string;
          created_at: string;
        };
        Insert: {
          active?: boolean;
          name: string;
          key: string;
          created_by: string;
          id?: string;
          created_at?: string;
        };
        Update: {
          active?: boolean;
          name?: string;
          key?: string;
          created_by?: string;
          id?: string;
          created_at?: string;
        };
      };
      rules: {
        Row: {
          created_at: string;
          updated_at: string;
          created_by: string;
          id: string;
          title: string;
          content: string;
          file_url: string | null;
          file_name: string | null;
        };
        Insert: {
          created_at?: string;
          updated_at?: string;
          created_by: string;
          id?: string;
          title: string;
          content: string;
          file_url?: string | null;
          file_name?: string | null;
        };
        Update: {
          created_at?: string;
          updated_at?: string;
          created_by?: string;
          id?: string;
          title?: string;
          content?: string;
          file_url?: string | null;
          file_name?: string | null;
        };
      };
      sample_statements: {
        Row: {
          id: string;
          title: string;
          content: string;
          created_by: string;
          category: string;
          updated_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          content: string;
          created_by: string;
          category?: string;
          updated_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          content?: string;
          created_by?: string;
          category?: string;
          updated_at?: string;
          created_at?: string;
        };
      };
      system_prompts: {
        Row: {
          id: string;
          key: string;
          title: string;
          content: string;
          category: string;
          description: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          key: string;
          title: string;
          content: string;
          category: string;
          description?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          key?: string;
          title?: string;
          content?: string;
          category?: string;
          description?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}
