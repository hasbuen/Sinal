import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function addReaction(mensagemId: string, emoji: string) {
  const { data: user } = await supabase.auth.getUser();
  if (!user?.user) throw new Error("Usuário não autenticado");

  // Primeiro verifica se já existe uma reação do mesmo usuário nessa mensagem
  const { data: existing } = await supabase
    .from("mensagens_reacoes")
    .select("id")
    .eq("mensagem_id", mensagemId)
    .eq("remetente", user.user.id)
    .maybeSingle();

  if (existing) {
    // Atualiza a reação existente
    return await supabase
      .from("mensagens_reacoes")
      .update({ emoji })
      .eq("id", existing.id);
  }

  // Caso contrário, insere uma nova
  return await supabase.from("mensagens_reacoes").insert({
    mensagem_id: mensagemId,
    remetente: user.user.id,
    emoji,
  });
}