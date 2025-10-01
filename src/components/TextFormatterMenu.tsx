import { Bold, Italic, Underline, Palette } from 'lucide-react'; // Importe Palette
import React from 'react';

// O tipo 'onFormat' agora aceita o tipo 'color' e uma cor HEX
// Opcionalmente, você pode ter uma função separada como 'onColorChange'
const TextFormatterMenu = ({ 
    visible, 
    onFormat,
    onColorChange, // NOVO PROP
    currentColor // NOVO PROP
}: { 
    visible: boolean, 
    onFormat: (type: 'bold' | 'italic' | 'underline') => void,
    onColorChange: (color: string) => void, // NOVO: Função para alterar a cor
    currentColor: string // NOVO: Cor atual para o seletor
}) => {
  if (!visible) return null;

  return (
<div className="absolute bottom-full mb-2 left-1/4 -translate-x-1/2 flex gap-1 p-1 bg-gray-950/90 backdrop-blur-sm rounded-lg shadow-md z-10 border border-gray-800">
  <button
    onClick={(e) => {
      e.preventDefault();
      onFormat("bold");
    }}
    aria-label="Negrito"
    className="flex items-center justify-center w-6 h-6 rounded-md bg-gray-800 hover:bg-emerald-700 active:bg-gray-600 text-gray-200 hover:text-white transition-colors duration-150"
  >
    <Bold className="h-2.5 w-2.5" />
  </button>

  <button
    onClick={(e) => {
      e.preventDefault();
      onFormat("italic");
    }}
    aria-label="Itálico"
    className="flex items-center justify-center w-6 h-6 rounded-md bg-gray-800 hover:bg-emerald-700 active:bg-gray-600 text-gray-200 hover:text-white transition-colors duration-150"
  >
    <Italic className="h-2.5 w-2.5" />
  </button>

  <button
    onClick={(e) => {
      e.preventDefault();
      onFormat("underline");
    }}
    aria-label="Sublinhado"
    className="flex items-center justify-center w-6 h-6 rounded-md bg-gray-800 hover:bg-emerald-700 active:bg-gray-600 text-gray-200 hover:text-white transition-colors duration-150"
  >
    <Underline className="h-2.5 w-2.5" />
  </button>
    
    {/* NOVO: Seletor de Cor */}
    <label 
        title="Cor do Texto"
        className="relative flex items-center justify-center w-6 h-6 rounded-md bg-gray-800 hover:bg-emerald-700 active:bg-gray-600 text-gray-200 hover:text-white transition-colors duration-150 cursor-pointer"
    >
        {/* Ícone de Paleta */}
        <Palette className="h-2.5 w-2.5" style={{ color: currentColor }} /> 
        
        {/* Input de Cor Escondido */}
        <input 
            type="color"
            value={currentColor}
            onChange={(e) => {
                e.stopPropagation(); // Previne que o foco saia da Textarea, se necessário
                onColorChange(e.target.value);
            }}
            // Torna o input invisível, mas clicável através do label
            className="absolute inset-0 opacity-0 cursor-pointer"
            // Adiciona estilos para garantir que o picker funcione como esperado
            style={{ 
                appearance: 'none', 
                WebkitAppearance: 'none', 
                MozAppearance: 'none',
                width: '100%',
                height: '100%'
            }}
        />
    </label>
</div>
  );
};

export default TextFormatterMenu;