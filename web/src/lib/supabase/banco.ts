export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  app: {
    Tables: {
      agente_memoria: {
        Row: {
          id: number
          message: Json
          session_id: string
        }
        Insert: {
          id?: number
          message: Json
          session_id: string
        }
        Update: {
          id?: number
          message?: Json
          session_id?: string
        }
        Relationships: []
      }
      conversa: {
        Row: {
          atualizada_em: string
          canal: string
          criada_em: string
          id: string
          titulo: string
          usuario_id: string
        }
        Insert: {
          atualizada_em?: string
          canal?: string
          criada_em?: string
          id?: string
          titulo: string
          usuario_id: string
        }
        Update: {
          atualizada_em?: string
          canal?: string
          criada_em?: string
          id?: string
          titulo?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversa_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id"]
          },
        ]
      }
      cota_diaria: {
        Row: {
          dia: string
          perguntas: number
          usuario_id: string
        }
        Insert: {
          dia: string
          perguntas?: number
          usuario_id: string
        }
        Update: {
          dia?: string
          perguntas?: number
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cota_diaria_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          criado_em: string
          mensagem_id: string
          motivo: string | null
          nota: number
          usuario_id: string
        }
        Insert: {
          criado_em?: string
          mensagem_id: string
          motivo?: string | null
          nota: number
          usuario_id: string
        }
        Update: {
          criado_em?: string
          mensagem_id?: string
          motivo?: string | null
          nota?: number
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_mensagem_id_fkey"
            columns: ["mensagem_id"]
            isOneToOne: false
            referencedRelation: "mensagem"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_versao: {
        Row: {
          ativa: boolean
          avaliacao: Json | null
          conteudo: string
          criado_em: string
          hash: string
          tokens: number
          versao: string
        }
        Insert: {
          ativa?: boolean
          avaliacao?: Json | null
          conteudo: string
          criado_em?: string
          hash: string
          tokens: number
          versao: string
        }
        Update: {
          ativa?: boolean
          avaliacao?: Json | null
          conteudo?: string
          criado_em?: string
          hash?: string
          tokens?: number
          versao?: string
        }
        Relationships: []
      }
      mensagem: {
        Row: {
          conversa_id: string
          criado_em: string
          erro: string | null
          ferramentas: Json | null
          id: string
          kb_versao: string | null
          latencia_ms: number | null
          modelo: string | null
          numeros_sem_origem: Json | null
          papel: string
          praticas_sem_origem: Json | null
          texto: string
          wamid: string | null
        }
        Insert: {
          conversa_id: string
          criado_em?: string
          erro?: string | null
          ferramentas?: Json | null
          id?: string
          kb_versao?: string | null
          latencia_ms?: number | null
          modelo?: string | null
          numeros_sem_origem?: Json | null
          papel: string
          praticas_sem_origem?: Json | null
          texto: string
          wamid?: string | null
        }
        Update: {
          conversa_id?: string
          criado_em?: string
          erro?: string | null
          ferramentas?: Json | null
          id?: string
          kb_versao?: string | null
          latencia_ms?: number | null
          modelo?: string | null
          numeros_sem_origem?: Json | null
          papel?: string
          praticas_sem_origem?: Json | null
          texto?: string
          wamid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mensagem_conversa_id_fkey"
            columns: ["conversa_id"]
            isOneToOne: false
            referencedRelation: "conversa"
            referencedColumns: ["id"]
          },
        ]
      }
      usuario: {
        Row: {
          aceite_termo_em: string
          criado_em: string
          decidido_em: string | null
          decidido_por: string | null
          email: string
          id: string
          instituicao: string
          municipio_ibge: string
          municipio_nome: string
          nome: string
          papel: string
          perfil: string
          status: string
          telefone_e164: string | null
          uf: string
          ufs_acesso: string[]
        }
        Insert: {
          aceite_termo_em: string
          criado_em?: string
          decidido_em?: string | null
          decidido_por?: string | null
          email: string
          id: string
          instituicao: string
          municipio_ibge: string
          municipio_nome: string
          nome: string
          papel?: string
          perfil: string
          status?: string
          telefone_e164?: string | null
          uf: string
          ufs_acesso: string[]
        }
        Update: {
          aceite_termo_em?: string
          criado_em?: string
          decidido_em?: string | null
          decidido_por?: string | null
          email?: string
          id?: string
          instituicao?: string
          municipio_ibge?: string
          municipio_nome?: string
          nome?: string
          papel?: string
          perfil?: string
          status?: string
          telefone_e164?: string | null
          uf?: string
          ufs_acesso?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "usuario_decidido_por_fkey"
            columns: ["decidido_por"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      vw_uso_diario: {
        Row: {
          avaliacoes: number | null
          cadastros_pendentes: number | null
          com_numero_sem_origem: number | null
          com_pratica_sem_origem: number | null
          dia: string | null
          erros: number | null
          latencia_p50_ms: number | null
          latencia_p95_ms: number | null
          perguntas: number | null
          respostas: number | null
          taxa_negativa: number | null
          usuarios: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      eh_admin: { Args: never; Returns: boolean }
      fn_perguntas_hoje: { Args: never; Returns: number }
    }
    Enums: {
      [_ in never]: never
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
  app: {
    Enums: {},
  },
} as const

