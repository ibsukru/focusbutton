import { useState, useEffect } from "react";

export default function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(initialValue);

  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const item = window.localStorage.getItem(key);
        if (item) {
          setStoredValue(JSON.parse(item));
        }
      }
    } catch (error) {
      console.log(error);
    }
  }, [key]);

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore =
        value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (typeof window !== "undefined") {
        valueToStore !== null && valueToStore !== undefined
          ? window.localStorage.setItem(key, JSON.stringify(valueToStore))
          : window.localStorage.removeItem(key);
      }
    } catch (error) {
      console.log(error);
    }
  };

  return [storedValue, setValue] as const;
}