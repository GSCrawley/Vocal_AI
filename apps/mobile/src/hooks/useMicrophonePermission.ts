import { useState, useEffect, useRef } from 'react';
import { Audio } from 'expo-av';

export async function checkMicrophonePermission() {
  try {
    const { status } = await Audio.getPermissionsAsync();
    return { hasPermission: status === 'granted', status };
  } catch {
    return { hasPermission: false, status: null };
  }
}

export async function requestMicrophonePermission() {
  try {
    const { status } = await Audio.requestPermissionsAsync();
    return { hasPermission: status === 'granted', status };
  } catch {
    return { hasPermission: false, status: null };
  }
}

export function useMicrophonePermission() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    (async () => {
      const result = await checkMicrophonePermission();
      if (isMountedRef.current) {
        setHasPermission(result.hasPermission);
        setStatus(result.status);
      }
    })();

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const requestPermission = async () => {
    const result = await requestMicrophonePermission();
    if (isMountedRef.current) {
      setHasPermission(result.hasPermission);
      setStatus(result.status);
    }
    return result.hasPermission;
  };

  return { hasPermission, status, requestPermission };
}
