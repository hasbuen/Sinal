import { Bold, Italic, Underline, Palette } from "lucide-react";
import React, { useState } from "react";
import { HexColorPicker } from "react-colorful";

const TextFormatterMenu = ({
  visible,
  onFormat,
  onColorChange,
  currentColor,
}: {
  visible: boolean;
  onFormat: (type: "bold" | "italic" | "underline") => void;
  onColorChange: (color: string) => void;
  currentColor: string;
}) => {
  const [open, setOpen] = useState(false);

  if (!visible) return null;

  return (
    <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 flex gap-1.5 p-1 bg-gray-950/95 backdrop-blur-sm rounded-lg shadow-md z-10 border border-gray-800">
      {/* Bold */}
      <button
        onClick={(e) => {
          e.preventDefault();
          onFormat("bold");
        }}
        aria-label="Negrito"
        className="flex items-center justify-center w-6 h-6 rounded-md bg-gray-800 hover:bg-emerald-700 text-gray-200"
      >
        <Bold className="h-3 w-3" />
      </button>

      {/* Italic */}
      <button
        onClick={(e) => {
          e.preventDefault();
          onFormat("italic");
        }}
        aria-label="Itálico"
        className="flex items-center justify-center w-6 h-6 rounded-md bg-gray-800 hover:bg-emerald-700 text-gray-200"
      >
        <Italic className="h-3 w-3" />
      </button>

      {/* Underline */}
      <button
        onClick={(e) => {
          e.preventDefault();
          onFormat("underline");
        }}
        aria-label="Sublinhado"
        className="flex items-center justify-center w-6 h-6 rounded-md bg-gray-800 hover:bg-emerald-700 text-gray-200"
      >
        <Underline className="h-3 w-3" />
      </button>

      {/* Color Picker Custom */}
      <div className="relative">
        <button
          onClick={(e) => {
                e.preventDefault(); 
                setOpen(!open);
            }}
          aria-label="Cor do Texto"
          className="flex items-center justify-center w-6 h-6 rounded-md bg-gray-800 hover:bg-emerald-700 text-gray-200"
        >
          <Palette className="h-3 w-3" style={{ color: currentColor }} />
        </button>

        {open && (
          <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-900 border border-gray-700 p-2 rounded shadow-lg z-20">
            <HexColorPicker
              color={currentColor}
              onChange={(c) => onColorChange(c)}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default TextFormatterMenu;
