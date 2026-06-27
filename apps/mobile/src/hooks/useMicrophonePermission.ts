import { useState, useEffect } from 'react';
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

  useEffect(() => {
    let isMounted = true;

    (async () => {
      const result = await checkMicrophonePermission();
        if (isMounted) {
          setHasPermission(result.hasPermission);
          setStatus(result.status);
      })();
  
      return () => {
        isMounted = false;
      };
  }, []);

  const requestPermission = async () => {
    const result = await requestMicrophonePermission();
      setHasPermission(result.hasPermission);
      setStatus(result.status);
    return result.hasPermission;
  };

  return { hasPermission, status, requestPermission };
}
