import { mapSustainedNoteScoreToCoaching } from '../index';

describe('mapSustainedNoteScoreToCoaching', () => {
  it('returns excellent for score >= 85', () => {
    const result = mapSustainedNoteScoreToCoaching(85);
    expect(result.successBand).toBe('excellent');
  });

  it('returns good for score >= 70', () => {
    const result = mapSustainedNoteScoreToCoaching(70);
    expect(result.successBand).toBe('good');
  });

  it('returns developing for score >= 50', () => {
    const result = mapSustainedNoteScoreToCoaching(50);
    expect(result.successBand).toBe('developing');
  });

  it('returns retry for score < 50', () => {
    const result = mapSustainedNoteScoreToCoaching(49);
    expect(result.successBand).toBe('retry');
  });
});
