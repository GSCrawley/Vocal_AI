import { useState, useEffect } from 'react';
import { Audio } from 'expo-av';

export function useMicrophonePermission() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [status, setStatus] = useState<Audio.PermissionStatus | null>(null);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        const response = await Audio.getPermissionsAsync();
        if (isMounted) {
          setStatus(response.status);
          setHasPermission(response.status === 'granted');
        }
      } catch {
        if (isMounted) {
          setStatus(null);
          setHasPermission(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const requestPermission = async () => {
    try {
      const response = await Audio.requestPermissionsAsync();
      setStatus(response.status);
      setHasPermission(response.status === 'granted');
      return response.status === 'granted';
    } catch {
      setStatus(null);
      setHasPermission(false);
      return false;
    }
  };

  return { hasPermission, status, requestPermission };
}
