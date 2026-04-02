import {
  createClient,
  type SupabaseClient,
} from "@supabase/supabase-js";

let browserSupabaseClient: SupabaseClient | null = null;

function getSupabaseEnv() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Supabase env vars ausentes. Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  return { supabaseUrl, supabaseAnonKey };
}

export function getSupabaseClient() {
  if (browserSupabaseClient) {
    return browserSupabaseClient;
  }

  const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv();
  browserSupabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  return browserSupabaseClient;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getSupabaseClient(), prop, receiver);
  },
});

export async function addReaction(mensagemId: string, emoji: string) {
  const client = getSupabaseClient();
  const { data: user } = await client.auth.getUser();

  if (!user?.user) {
    throw new Error("Usuario nao autenticado");
  }

  const { data: existing } = await client
    .from("mensagens_reacoes")
    .select("id")
    .eq("mensagem_id", mensagemId)
    .eq("remetente", user.user.id)
    .maybeSingle();

  if (existing) {
    return client
      .from("mensagens_reacoes")
      .update({ emoji })
      .eq("id", existing.id);
  }

  return client.from("mensagens_reacoes").insert({
    mensagem_id: mensagemId,
    remetente: user.user.id,
    emoji,
  });
}
