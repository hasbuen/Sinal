

import React, { useState } from "react";

// Componente do zero, com categorias, busca e sem dependências externas

// Novo formato: cada emoji tem um nome (label) para busca
const EMOJI_CATEGORIES = [
  {
    name: "Smileys",
    icon: "😃",
    emojis: [
      { emoji: "😁", label: "carinha feliz" },
      { emoji: "😂", label: "chorando de rir" },
      { emoji: "🤣", label: "rolando de rir" },
      { emoji: "😃", label: "sorriso aberto" },
      { emoji: "😄", label: "sorriso largo" },
      { emoji: "😅", label: "sorriso suado" },
      { emoji: "😆", label: "rindo muito" },
      { emoji: "😉", label: "piscadinha" },
      { emoji: "😊", label: "sorriso tímido" },
      { emoji: "😋", label: "delicioso" },
      { emoji: "😎", label: "óculos escuros" },
      { emoji: "😍", label: "apaixonado" },
      { emoji: "😘", label: "beijo" },
      { emoji: "🥰", label: "amoroso" },
      { emoji: "😗", label: "beijinho" },
      { emoji: "😙", label: "beijo sorrindo" },
      { emoji: "😚", label: "beijo carinhoso" },
      { emoji: "🙂", label: "sorriso leve" },
      { emoji: "🤗", label: "abraço" },
      { emoji: "🤩", label: "olhos brilhando" },
      { emoji: "🤔", label: "pensativo" },
      { emoji: "🤨", label: "desconfiado" },
      { emoji: "😐", label: "neutro" },
      { emoji: "😑", label: "sem emoção" },
      { emoji: "😶", label: "boca fechada" },
      { emoji: "🙄", label: "revirando os olhos" },
      { emoji: "😏", label: "sorriso de lado" },
      { emoji: "😣", label: "desconfortável" },
      { emoji: "😥", label: "aliviado" },
      { emoji: "😮", label: "surpreso" },
      { emoji: "🤐", label: "boca fechada com zíper" },
      { emoji: "😯", label: "boca aberta" },
      { emoji: "😪", label: "sonolento" },
      { emoji: "😫", label: "cansado" },
      { emoji: "🥱", label: "bocejando" },
      { emoji: "😴", label: "dormindo" },
      { emoji: "😌", label: "aliviado" },
      { emoji: "😛", label: "língua de fora" },
      { emoji: "😜", label: "piscando língua de fora" },
      { emoji: "😝", label: "língua de fora forte" },
      { emoji: "🤤", label: "babando" },
      { emoji: "😒", label: "desapontado" },
      { emoji: "😓", label: "suando" },
      { emoji: "😔", label: "triste" },
      { emoji: "😕", label: "confuso" },
      { emoji: "🙃", label: "de cabeça para baixo" },
      { emoji: "🤑", label: "dinheiro" },
      { emoji: "😲", label: "chocado" },
      { emoji: "☹️", label: "carinha triste" },
      { emoji: "🙁", label: "triste leve" },
      { emoji: "😖", label: "sofrendo" },
      { emoji: "😞", label: "decepcionado" },
      { emoji: "😟", label: "preocupado" },
      { emoji: "😤", label: "irritado" },
      { emoji: "😢", label: "chorando" },
      { emoji: "😭", label: "chorando muito" },
      { emoji: "😦", label: "desapontado" },
      { emoji: "😧", label: "angustiado" },
      { emoji: "😨", label: "assustado" },
      { emoji: "😩", label: "exausto" },
      { emoji: "🤯", label: "explodindo a mente" },
      { emoji: "😬", label: "sorriso tenso" },
      { emoji: "😰", label: "ansioso" },
      { emoji: "😱", label: "gritando de medo" },
      { emoji: "🥵", label: "com calor" },
      { emoji: "🥶", label: "com frio" },
      { emoji: "😳", label: "envergonhado" },
      { emoji: "🤪", label: "louco" },
      { emoji: "😵", label: "tonto" },
      { emoji: "😡", label: "bravo" },
      { emoji: "😠", label: "irritado" },
      { emoji: "🤬", label: "xingando" },
      { emoji: "😷", label: "máscara médica" },
      { emoji: "🤒", label: "doente" },
      { emoji: "🤕", label: "machucado" },
      { emoji: "🤢", label: "enjoo" },
      { emoji: "🤮", label: "vomitando" },
      { emoji: "🥴", label: "zonzo" },
      { emoji: "😇", label: "anjo" },
      { emoji: "🥳", label: "festejando" },
      { emoji: "🥺", label: "olhos de cachorro" },
      { emoji: "🤠", label: "chapéu de cowboy" },
      { emoji: "🤡", label: "palhaço" },
      { emoji: "🤥", label: "mentiroso" },
      { emoji: "🤫", label: "silêncio" },
      { emoji: "🤭", label: "escondendo riso" },
      { emoji: "🧐", label: "monóculo" },
      { emoji: "🤓", label: "nerd" },
      { emoji: "😈", label: "diabinho" },
      { emoji: "👿", label: "diabo" },
      { emoji: "👹", label: "ogro" },
      { emoji: "👺", label: "tengu" },
      { emoji: "💀", label: "caveira" },
      { emoji: "👻", label: "fantasma" },
      { emoji: "👽", label: "alien" },
      { emoji: "🤖", label: "robô" },
      { emoji: "💩", label: "cocô" },
    ]
  },
  {
    name: "Animais",
    icon: "🐶",
    emojis: [
      { emoji: "🐶", label: "cachorro" },
      { emoji: "🐱", label: "gato" },
      { emoji: "🐭", label: "rato" },
      { emoji: "🐹", label: "hamster" },
      { emoji: "🐰", label: "coelho" },
      { emoji: "🦊", label: "raposa" },
      { emoji: "🐻", label: "urso" },
      { emoji: "🐼", label: "panda" },
      { emoji: "🐨", label: "coala" },
      { emoji: "🐯", label: "tigre" },
      { emoji: "🦁", label: "leão" },
      { emoji: "🐮", label: "vaca" },
      { emoji: "🐷", label: "porco" },
      { emoji: "🐸", label: "sapo" },
      { emoji: "🐵", label: "macaco" },
      { emoji: "🐔", label: "galinha" },
      { emoji: "🐧", label: "pinguim" },
      { emoji: "🐦", label: "pássaro" },
      { emoji: "🦆", label: "pato" },
      { emoji: "🦅", label: "águia" },
      { emoji: "🦉", label: "coruja" },
      { emoji: "🦇", label: "morcego" },
      { emoji: "🐺", label: "lobo" },
      { emoji: "🐴", label: "cavalo" },
      { emoji: "🦄", label: "unicórnio" },
      { emoji: "🐝", label: "abelha" },
      { emoji: "🐛", label: "lagarta" },
      { emoji: "🦋", label: "borboleta" },
      { emoji: "🐌", label: "caracol" },
      { emoji: "🐞", label: "joaninha" },
      { emoji: "🐜", label: "formiga" },
      { emoji: "🦗", label: "grilo" },
      { emoji: "🕷", label: "aranha" },
      { emoji: "🦂", label: "escorpião" },
      { emoji: "🐢", label: "tartaruga" },
      { emoji: "🐍", label: "cobra" },
      { emoji: "🦎", label: "lagarto" },
      { emoji: "🐙", label: "polvo" },
      { emoji: "🦑", label: "lula" },
      { emoji: "🦐", label: "camarão" },
      { emoji: "🦀", label: "caranguejo" },
      { emoji: "🐠", label: "peixe" },
      { emoji: "🐬", label: "golfinho" },
      { emoji: "🐳", label: "baleia" },
      { emoji: "🦈", label: "tubarão" },
      { emoji: "🐊", label: "jacaré" },
      { emoji: "🦓", label: "zebra" },
      { emoji: "🦍", label: "gorila" },
      { emoji: "🐘", label: "elefante" },
      { emoji: "🦒", label: "girafa" },
      { emoji: "🦘", label: "canguru" },
      { emoji: "🦥", label: "preguiça" },
      { emoji: "🦦", label: "lontra" },
      { emoji: "🦨", label: "gambá" },
      { emoji: "🦡", label: "texugo" },
      { emoji: "🐇", label: "coelho" },
      { emoji: "🐿", label: "esquilo" },
      { emoji: "🦔", label: "ouriço" },
    ]
  },
  {
    name: "Comida",
    icon: "🍎",
    emojis: [
      { emoji: "🍏", label: "maçã verde" },
      { emoji: "🍎", label: "maçã vermelha" },
      { emoji: "🍌", label: "banana" },
      { emoji: "🍉", label: "melancia" },
      { emoji: "🍇", label: "uva" },
      { emoji: "🍓", label: "morango" },
      { emoji: "🍒", label: "cereja" },
      { emoji: "🍑", label: "pêssego" },
      { emoji: "🍍", label: "abacaxi" },
      { emoji: "🥥", label: "coco" },
      { emoji: "🥝", label: "kiwi" },
      { emoji: "🍅", label: "tomate" },
      { emoji: "🥑", label: "abacate" },
      { emoji: "🥦", label: "brócolis" },
      { emoji: "🥕", label: "cenoura" },
      { emoji: "🌽", label: "milho" },
      { emoji: "🍞", label: "pão" },
      { emoji: "🥐", label: "croissant" },
      { emoji: "🥨", label: "pretzel" },
      { emoji: "🧀", label: "queijo" },
      { emoji: "🍕", label: "pizza" },
      { emoji: "🍔", label: "hambúrguer" },
      { emoji: "🍟", label: "batata frita" },
      { emoji: "🌭", label: "cachorro-quente" },
      { emoji: "🍿", label: "pipoca" },
      { emoji: "🍩", label: "rosquinha" },
      { emoji: "🍪", label: "biscoito" },
      { emoji: "🎂", label: "bolo de aniversário" },
      { emoji: "🍰", label: "fatia de bolo" },
      { emoji: "🧁", label: "cupcake" },
      { emoji: "🍫", label: "chocolate" },
      { emoji: "🍬", label: "bala" },
      { emoji: "🍭", label: "pirulito" },
      { emoji: "🍯", label: "mel" },
      { emoji: "🥛", label: "leite" },
      { emoji: "☕", label: "café" },
      { emoji: "🍵", label: "chá" },
      { emoji: "🍺", label: "cerveja" },
      { emoji: "🍷", label: "vinho" },
      { emoji: "🥤", label: "refrigerante" },
    ]
  },
  {
    name: "Atividades",
    icon: "⚽",
    emojis: [
      { emoji: "⚽", label: "futebol" },
      { emoji: "🏀", label: "basquete" },
      { emoji: "🏈", label: "futebol americano" },
      { emoji: "⚾", label: "beisebol" },
      { emoji: "🎾", label: "tênis" },
      { emoji: "🏐", label: "vôlei" },
      { emoji: "🏉", label: "rugby" },
      { emoji: "🎱", label: "sinuca" },
      { emoji: "🏓", label: "pingue-pongue" },
      { emoji: "🏸", label: "badminton" },
      { emoji: "🥅", label: "gol" },
      { emoji: "🏒", label: "hóquei" },
      { emoji: "🥊", label: "boxe" },
      { emoji: "🥋", label: "artes marciais" },
      { emoji: "🎽", label: "camiseta esportiva" },
      { emoji: "⛸", label: "patinação no gelo" },
      { emoji: "🥌", label: "curling" },
      { emoji: "🛹", label: "skate" },
      { emoji: "🛷", label: "trenó" },
      { emoji: "🎣", label: "pesca" },
      { emoji: "🎤", label: "microfone" },
      { emoji: "🎧", label: "fone de ouvido" },
      { emoji: "🎼", label: "partitura" },
      { emoji: "🎹", label: "teclado musical" },
      { emoji: "🥁", label: "bateria" },
      { emoji: "🎷", label: "saxofone" },
      { emoji: "🎺", label: "trompete" },
      { emoji: "🎸", label: "guitarra" },
      { emoji: "🎻", label: "violino" },
      { emoji: "🎲", label: "dado" },
      { emoji: "🧩", label: "quebra-cabeça" },
      { emoji: "🧸", label: "ursinho de pelúcia" },
      { emoji: "🎯", label: "dardo" },
      { emoji: "🎳", label: "boliche" },
      { emoji: "🎮", label: "videogame" },
      { emoji: "🎰", label: "caça-níquel" },
    ]
  },
  {
    name: "Objetos",
    icon: "💡",
    emojis: [
      { emoji: "💡", label: "lâmpada" },
      { emoji: "🔦", label: "lanterna" },
      { emoji: "📱", label: "celular" },
      { emoji: "💻", label: "notebook" },
      { emoji: "🖥", label: "computador" },
      { emoji: "🖨", label: "impressora" },
      { emoji: "⌨️", label: "teclado" },
      { emoji: "🖱", label: "mouse" },
      { emoji: "💽", label: "disquete" },
      { emoji: "💾", label: "disquete 2" },
      { emoji: "💿", label: "cd" },
      { emoji: "📷", label: "câmera" },
      { emoji: "📸", label: "câmera com flash" },
      { emoji: "📹", label: "filmadora" },
      { emoji: "🔍", label: "lupa" },
      { emoji: "🔑", label: "chave" },
      { emoji: "🔒", label: "cadeado fechado" },
      { emoji: "🔓", label: "cadeado aberto" },
      { emoji: "🔨", label: "martelo" },
      { emoji: "🛒", label: "carrinho de compras" },
      { emoji: "🚪", label: "porta" },
      { emoji: "🛏", label: "cama" },
      { emoji: "🚽", label: "vaso sanitário" },
      { emoji: "🚿", label: "chuveiro" },
      { emoji: "🛁", label: "banheira" },
      { emoji: "🧴", label: "sabonete líquido" },
      { emoji: "🧹", label: "vassoura" },
      { emoji: "🧺", label: "cesto de roupa" },
      { emoji: "🧻", label: "papel higiênico" },
      { emoji: "🧼", label: "sabão" },
      { emoji: "🧽", label: "esponja" },
      { emoji: "🧯", label: "extintor" },
    ]
  },
  {
    name: "Símbolos",
    icon: "❤️",
    emojis: [
      { emoji: "❤️", label: "coração vermelho" },
      { emoji: "🧡", label: "coração laranja" },
      { emoji: "💛", label: "coração amarelo" },
      { emoji: "💚", label: "coração verde" },
      { emoji: "💙", label: "coração azul" },
      { emoji: "💜", label: "coração roxo" },
      { emoji: "🖤", label: "coração preto" },
      { emoji: "🤍", label: "coração branco" },
      { emoji: "💔", label: "coração partido" },
      { emoji: "❣️", label: "coração com ponto" },
      { emoji: "💕", label: "dois corações" },
      { emoji: "💞", label: "corações girando" },
      { emoji: "💓", label: "coração pulsando" },
      { emoji: "💗", label: "coração crescente" },
      { emoji: "💖", label: "coração brilhante" },
      { emoji: "💘", label: "coração flechado" },
      { emoji: "💝", label: "coração com fita" },
      { emoji: "💟", label: "coração decorativo" },
      { emoji: "❌", label: "x vermelho" },
      { emoji: "⭕", label: "círculo vermelho" },
      { emoji: "✅", label: "check verde" },
      { emoji: "✔️", label: "check" },
      { emoji: "❗", label: "exclamação" },
      { emoji: "❓", label: "interrogação" },
      { emoji: "⚠️", label: "atenção" },
      { emoji: "🔴", label: "bola vermelha" },
      { emoji: "🟢", label: "bola verde" },
      { emoji: "🔵", label: "bola azul" },
      { emoji: "🟡", label: "bola amarela" },
      { emoji: "🟣", label: "bola roxa" },
      { emoji: "🟤", label: "bola marrom" },
      { emoji: "⚫", label: "bola preta" },
      { emoji: "⚪", label: "bola branca" },
    ]
  },
];


interface EmojiItem {
  emoji: string;
  label: string;
}

interface EmojiBoardProps {
  onEmojiClick: (emoji: string) => void;
}

const EmojiBoard: React.FC<EmojiBoardProps> = ({ onEmojiClick }) => {

  const [categoria, setCategoria] = useState(EMOJI_CATEGORIES[0].name);
  const [busca, setBusca] = useState("");

  // Busca por nome ou emoji
  const emojisFiltrados = EMOJI_CATEGORIES.find(cat => cat.name === categoria)?.emojis.filter(e =>
    e.label.toLowerCase().includes(busca.toLowerCase()) || e.emoji.includes(busca)
  ) || [];

  return (
  <div className="bg-[#1f2937] rounded-lg p-2 w-full flex flex-col">
      <div className="flex gap-2 mb-2">
        {EMOJI_CATEGORIES.map(cat => (
          <button
            key={cat.name}
            className={`text-xl p-1 rounded focus:outline-none ${categoria === cat.name ? 'bg-[#b9fbc0]' : ''}`}
            onClick={() => setCategoria(cat.name)}
            type="button"
            title={cat.name}
          >
            {cat.icon}
          </button>
        ))}
      </div>
      <input
        type="text"
        placeholder="Buscar emoji..."
        value={busca}
        onChange={e => setBusca(e.target.value)}
        className="w-full mb-2 p-1 rounded bg-[#23272f] text-white placeholder:text-gray-400 focus:outline-none"
      />
  <div className="flex gap-2 overflow-x-auto pb-2">
    <div className="flex flex-row">
        {emojisFiltrados.map((item, idx) => (
          <button
            key={item.emoji + idx}
            className="text-2xl rounded p-1 focus:outline-none transition-colors hover:bg-[#b9fbc0] min-w-[40px] min-h-[40px]"
            onClick={() => onEmojiClick(item.emoji)}
            type="button"
            title={item.label}
          >
            {item.emoji}
          </button>
        ))}
        {emojisFiltrados.length === 0 && (
          <span className="text-center text-gray-400">Nenhum emoji encontrado</span>
        )}
    </div>
      </div>
    </div>
  );
};

export default EmojiBoard;