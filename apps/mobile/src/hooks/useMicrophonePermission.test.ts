import { Audio } from 'expo-av';
import { checkMicrophonePermission, requestMicrophonePermission } from './useMicrophonePermission';

jest.mock('expo-av');

describe('Microphone Permission Helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkMicrophonePermission', () => {
    it('returns hasPermission true and status granted when getPermissionsAsync resolves granted', async () => {
      (Audio.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: 'granted' });
      const result = await checkMicrophonePermission();
      expect(result).toEqual({ hasPermission: true, status: 'granted' });
    });

    it('returns hasPermission false and status denied when getPermissionsAsync resolves denied', async () => {
      (Audio.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: 'denied' });
      const result = await checkMicrophonePermission();
      expect(result).toEqual({ hasPermission: false, status: 'denied' });
    });

    it('returns hasPermission false and status undetermined when getPermissionsAsync resolves undetermined', async () => {
      (Audio.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: 'undetermined' });
      const result = await checkMicrophonePermission();
      expect(result).toEqual({ hasPermission: false, status: 'undetermined' });
    });

    it('returns hasPermission false and status null when getPermissionsAsync throws', async () => {
      (Audio.getPermissionsAsync as jest.Mock).mockRejectedValueOnce(new Error('error'));
      const result = await checkMicrophonePermission();
      expect(result).toEqual({ hasPermission: false, status: null });
    });
  });

  describe('requestMicrophonePermission', () => {
    it('returns hasPermission true and status granted when requestPermissionsAsync resolves granted', async () => {
      (Audio.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: 'granted' });
      const result = await requestMicrophonePermission();
      expect(result).toEqual({ hasPermission: true, status: 'granted' });
    });

    it('returns hasPermission false and status denied when requestPermissionsAsync resolves denied', async () => {
      (Audio.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: 'denied' });
      const result = await requestMicrophonePermission();
      expect(result).toEqual({ hasPermission: false, status: 'denied' });
    });

    it('returns hasPermission false and status null when requestPermissionsAsync throws', async () => {
      (Audio.requestPermissionsAsync as jest.Mock).mockRejectedValueOnce(new Error('error'));
      const result = await requestMicrophonePermission();
      expect(result).toEqual({ hasPermission: false, status: null });
    });
  });
});
