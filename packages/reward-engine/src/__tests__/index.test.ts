import { streakMilestoneXp } from '../index';

describe('streakMilestoneXp', () => {
  it('returns correct XP for milestones', () => {
    expect(streakMilestoneXp(7)).toBe(30);
    expect(streakMilestoneXp(30)).toBe(75);
    expect(streakMilestoneXp(100)).toBe(200);
    expect(streakMilestoneXp(1)).toBe(0);
  });
});
