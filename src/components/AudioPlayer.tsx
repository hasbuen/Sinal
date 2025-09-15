import { useRef, useState, useEffect } from "react";
import { Play, Pause, Volume2 } from "lucide-react";

interface AudioPlayerProps {
  src: string;
}

export default function AudioPlayer({ src }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const setMeta = () => setDuration(audio.duration);

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", setMeta);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", setMeta);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const toggleSpeed = () => {
    const newSpeed = speed === 1 ? 1.5 : speed === 1.5 ? 2 : 1;
    setSpeed(newSpeed);
    if (audioRef.current) audioRef.current.playbackRate = newSpeed;
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  };

  return (
    <div className="flex items-center gap-3 bg-gradient-to-r from-[#6a00f4] to-[#00d4ff] text-white px-4 py-2 rounded-full shadow-lg w-full max-w-md">
      {/* Botão Play/Pause */}
      <button onClick={togglePlay} className="p-2 rounded-full bg-black/30 hover:bg-black/50">
        {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
      </button>

      {/* Barra de progresso */}
      <input
        type="range"
        min={0}
        max={duration || 0}
        value={currentTime}
        onChange={(e) => {
          if (audioRef.current) {
            audioRef.current.currentTime = Number(e.target.value);
            setCurrentTime(Number(e.target.value));
          }
        }}
        className="flex-1 accent-[#00ff87] cursor-pointer"
      />

      {/* Tempo */}
      <span className="text-xs w-16 text-center">
        {formatTime(currentTime)} / {formatTime(duration)}
      </span>

      {/* Volume fixo (só ícone) */}
      <Volume2 className="w-5 h-5 opacity-70" />

      {/* Velocidade */}
      <button
        onClick={toggleSpeed}
        className="ml-2 px-2 py-1 rounded bg-black/30 hover:bg-black/50 text-xs font-bold"
      >
        {speed}x
      </button>

      {/* Elemento de áudio escondido */}
      <audio ref={audioRef} src={src} />
    </div>
  );
}