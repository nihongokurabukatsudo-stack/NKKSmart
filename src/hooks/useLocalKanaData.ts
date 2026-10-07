import { useEffect, useState } from "react";
import type { KanaCharacter } from "../types/kana";

export function useLocalKanaData(kanaCharacters: KanaCharacter[]) {
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [characters, setCharacters] = useState<KanaCharacter[]>([]);

  useEffect(() => {
    setIsLoading(true);
    setErrorMessage(null);

    const timerId = window.setTimeout(() => {
      if (!kanaCharacters.length) {
        setErrorMessage("Data huruf belum tersedia.");
      }

      setCharacters(kanaCharacters);
      setIsLoading(false);
    }, 180);

    return () => window.clearTimeout(timerId);
  }, [kanaCharacters]);

  return {
    characters,
    errorMessage,
    isLoading,
  };
}
