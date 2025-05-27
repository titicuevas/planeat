export interface UserProfile {
  id: string;
  name: string;
  email: string;
  goal: string;
  weight?: number; // en kg, 3 dígitos máximo
  height?: number; // en cm, 3 dígitos máximo
  intolerances: string[];
  created_at?: string;
  updated_at?: string;
} 