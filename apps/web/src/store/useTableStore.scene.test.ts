import { describe, it, expect, beforeEach } from 'vitest';
import { useTableStore } from './useTableStore';

describe('useTableStore — scene state', () => {
  beforeEach(() => {
    useTableStore.setState({ activeSceneId: null, activeSceneImg: null });
  });

  it('starts with null activeSceneId and activeSceneImg', () => {
    const { activeSceneId, activeSceneImg } = useTableStore.getState();
    expect(activeSceneId).toBeNull();
    expect(activeSceneImg).toBeNull();
  });

  it('setActiveScene sets both id and img', () => {
    useTableStore.getState().setActiveScene('scene-1', 'https://example.com/map.jpg');

    const { activeSceneId, activeSceneImg } = useTableStore.getState();
    expect(activeSceneId).toBe('scene-1');
    expect(activeSceneImg).toBe('https://example.com/map.jpg');
  });

  it('setActiveScene accepts null img (scene without image)', () => {
    useTableStore.getState().setActiveScene('scene-2', null);

    const { activeSceneId, activeSceneImg } = useTableStore.getState();
    expect(activeSceneId).toBe('scene-2');
    expect(activeSceneImg).toBeNull();
  });

  it('setActiveScene(null, null) clears the active scene', () => {
    useTableStore.getState().setActiveScene('scene-1', 'img-url');
    useTableStore.getState().setActiveScene(null, null);

    const { activeSceneId, activeSceneImg } = useTableStore.getState();
    expect(activeSceneId).toBeNull();
    expect(activeSceneImg).toBeNull();
  });

  it('replaces the previously active scene', () => {
    useTableStore.getState().setActiveScene('scene-1', 'img-1');
    useTableStore.getState().setActiveScene('scene-2', 'img-2');

    const { activeSceneId, activeSceneImg } = useTableStore.getState();
    expect(activeSceneId).toBe('scene-2');
    expect(activeSceneImg).toBe('img-2');
  });

  it('setActiveScene does not disturb unrelated state', () => {
    const before = useTableStore.getState();
    useTableStore.getState().setActiveScene('scene-x', 'img-x');
    const after = useTableStore.getState();

    expect(after.worldId).toBe(before.worldId);
    expect(after.tokens).toBe(before.tokens);
    expect(after.chatMessages).toBe(before.chatMessages);
    expect(after.combatants).toBe(before.combatants);
  });
});
