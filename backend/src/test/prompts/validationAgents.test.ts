import { describe, it, expect } from 'vitest';
import type { PostInput } from '../../modules/prompts/validation/types';
import { postText } from '../../modules/prompts/validation/types';
import { PolicyCheckAgent } from '../../modules/prompts/validation/agents/PolicyCheckAgent';
import { GeneralContentAgent } from '../../modules/prompts/validation/agents/GeneralContentAgent';
import { PlatformComplianceAgent } from '../../modules/prompts/validation/agents/PlatformComplianceAgent';

// Build a complete PostInput with sane defaults; override per test.
function makePost(over: Partial<PostInput> = {}): PostInput {
  return {
    description: '',
    content: '',
    heading: '',
    keywords: [],
    hashtags: [],
    mentions: [],
    links: [],
    imageUrls: [],
    platform: 'linkedin',
    workspaceId: 'ws-test',
    ...over,
  };
}

describe('postText — covers every text artifact', () => {
  it('includes title, caption, description, keywords, hashtags and mentions', () => {
    const t = postText(
      makePost({
        heading: 'TITLE',
        content: 'CAPTION',
        description: 'DESC',
        keywords: ['KW1'],
        hashtags: ['#TAG'],
        mentions: ['@USER'],
      }),
    );
    for (const piece of ['TITLE', 'CAPTION', 'DESC', 'KW1', '#TAG', '@USER']) {
      expect(t).toContain(piece);
    }
  });
});

describe('Policy Check Agent — only safety + high-risk', () => {
  const agent = new PolicyCheckAgent();

  it('BLOCKS prohibited/unsafe content', async () => {
    const f = await agent.run(makePost({ content: 'how to attack and kill' }));
    expect(f.verdict).toBe('BLOCK');
    expect(f.categories?.policy_safety).toBe(true);
  });

  it('REVIEWS regulated high-risk domains', async () => {
    const f = await agent.run(makePost({ content: 'our medical drug treats the disease' }));
    expect(f.verdict).toBe('REVIEW');
    expect(f.details?.kind).toBe('high_risk');
  });

  it('PASSES clean copy and ignores claims/platform (not its job)', async () => {
    const f = await agent.run(makePost({ content: 'We are the best, guaranteed #1', platform: 'x' }));
    expect(f.verdict).toBe('PASS');
  });

  it('catches unsafe words inside hashtags/mentions too', async () => {
    const f = await agent.run(makePost({ content: 'great launch', hashtags: ['#kill'] }));
    expect(f.verdict).toBe('BLOCK');
  });
});

describe('General Content Agent — only claim detection, across all text', () => {
  const agent = new GeneralContentAgent();

  it('flags a claim in the caption', async () => {
    const f = await agent.run(makePost({ content: 'clinically proven to be the best' }));
    expect(f.details?.hasClaim).toBe(true);
  });

  it('flags a claim hidden in a hashtag', async () => {
    const f = await agent.run(makePost({ content: 'new drop', hashtags: ['#guaranteed'] }));
    expect(f.details?.hasClaim).toBe(true);
  });

  it('no claim → basic content', async () => {
    const f = await agent.run(makePost({ content: 'Here is our weekly team photo.' }));
    expect(f.details?.hasClaim).toBe(false);
    expect(f.verdict).toBe('PASS');
  });
});

describe('Platform Compliance Agent — only platform limits, per platform', () => {
  const agent = new PlatformComplianceAgent();
  const longCaption = 'x'.repeat(400);

  it('BLOCKS a 400-char caption on X (max 280)', async () => {
    const f = await agent.run(makePost({ content: longCaption, platform: 'x' }));
    expect(f.verdict).toBe('BLOCK');
    expect(f.categories?.platform_limit).toBe(true);
  });

  it('PASSES the same caption on LinkedIn (max 3000)', async () => {
    const f = await agent.run(makePost({ content: longCaption, platform: 'linkedin' }));
    expect(f.verdict).toBe('PASS');
  });

  it('BLOCKS when hashtag count exceeds the platform limit', async () => {
    const tags = Array.from({ length: 35 }, (_, i) => `#t${i}`);
    const f = await agent.run(makePost({ content: 'hi', hashtags: tags, platform: 'instagram' }));
    expect(f.verdict).toBe('BLOCK');
  });
});
