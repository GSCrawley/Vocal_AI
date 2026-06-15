// Manual jest mock for expo-av so useRecording can be exercised in a node
// test environment without the native module. Keeps the public surface that
// useRecording depends on: Audio.Recording.createAsync, RecordingOptionsPresets,
// and a recording instance with stopAndUnloadAsync / getURI.

export const RecordingOptionsPresets = {
  HIGH_QUALITY: { isMeteringEnabled: true },
};

export class MockRecording {
  stopAndUnloadAsync = jest.fn(async () => undefined);
  getURI = jest.fn(() => 'file://mock-recording.m4a');
}

export const Recording = {
  createAsync: jest.fn(
    async (_options?: unknown, _onStatusUpdate?: unknown, _interval?: number) => ({
      recording: new MockRecording(),
    })
  ),
};

export const Audio = {
  Recording,
  RecordingOptionsPresets,
};

export default { Audio };
