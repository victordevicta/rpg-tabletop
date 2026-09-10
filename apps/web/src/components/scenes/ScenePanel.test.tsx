import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ScenePanel from './ScenePanel';
import { useTableStore } from '../../store/useTableStore';

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockEmit = vi.fn();

vi.mock('../../lib/api', () => ({
  api: {
    get:    vi.fn(),
    post:   vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../../lib/socket', () => ({
  getSocket: vi.fn(() => ({ emit: mockEmit })),
}));

// Import after mocks so the mock is in place
import { api } from '../../lib/api';

// ── Helpers ────────────────────────────────────────────────────────────────────

const makeScene = (id: string, name: string, img?: string) => ({
  id,
  name,
  data: { img, active: false },
});

const apiSceneResponse = (scenes: ReturnType<typeof makeScene>[]) =>
  ({ data: scenes.map((s) => ({ id: s.id, name: s.name, data: s.data })) });

// ── Suite ──────────────────────────────────────────────────────────────────────

describe('ScenePanel', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    useTableStore.setState({ worldId: 'world-1', activeSceneId: null, activeSceneImg: null });
    vi.clearAllMocks();
    mockEmit.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── Initial states ───────────────────────────────────────────────────────────

  it('shows loading while fetching scenes', () => {
    vi.mocked(api.get).mockReturnValue(new Promise(() => {})); // never resolves
    render(<ScenePanel />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('shows empty message when API returns no scenes', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [] });
    render(<ScenePanel />);

    await waitFor(() => expect(screen.getByText('No scenes yet')).toBeInTheDocument());
  });

  it('does not show Add Scene button when worldId is null', () => {
    useTableStore.setState({ worldId: null });
    vi.mocked(api.get).mockResolvedValue({ data: [] });
    render(<ScenePanel />);

    expect(screen.getByRole('button', { name: /add scene/i })).toBeDisabled();
  });

  // ── Scene list ───────────────────────────────────────────────────────────────

  it('renders scene names returned by the API', async () => {
    vi.mocked(api.get).mockResolvedValue(
      apiSceneResponse([
        makeScene('s-1', 'Dark Forest'),
        makeScene('s-2', 'Old Tavern'),
      ]),
    );
    render(<ScenePanel />);

    await waitFor(() => {
      expect(screen.getByText('Dark Forest')).toBeInTheDocument();
      expect(screen.getByText('Old Tavern')).toBeInTheDocument();
    });
  });

  it('fetches from the correct API endpoint for the current world', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [] });
    render(<ScenePanel />);

    await waitFor(() =>
      expect(api.get).toHaveBeenCalledWith('/api/worlds/world-1/documents?type=scene'),
    );
  });

  it('shows a thumbnail img when the scene has an img URL', async () => {
    vi.mocked(api.get).mockResolvedValue(
      apiSceneResponse([makeScene('s-1', 'Forest', 'https://example.com/forest.jpg')]),
    );
    render(<ScenePanel />);

    // Thumbnails use alt="" (decorative), so they have role "presentation", not "img"
    await waitFor(() => {
      const thumb = screen.getByAltText('');
      expect(thumb).toHaveAttribute('src', 'https://example.com/forest.jpg');
    });
  });

  // ── Activation ───────────────────────────────────────────────────────────────

  it('clicking Activate updates the store and emits scene:activate on the socket', async () => {
    vi.mocked(api.get).mockResolvedValue(
      apiSceneResponse([makeScene('s-1', 'Dark Forest', 'https://example.com/map.jpg')]),
    );
    render(<ScenePanel />);

    const btn = await screen.findByTitle('Activate scene');
    await user.click(btn);

    const { activeSceneId, activeSceneImg } = useTableStore.getState();
    expect(activeSceneId).toBe('s-1');
    expect(activeSceneImg).toBe('https://example.com/map.jpg');
    expect(mockEmit).toHaveBeenCalledWith('scene:activate', {
      worldId: 'world-1',
      sceneId: 's-1',
    });
  });

  it('shows a check icon instead of play for the active scene', async () => {
    useTableStore.setState({ activeSceneId: 's-1' });
    vi.mocked(api.get).mockResolvedValue(
      apiSceneResponse([makeScene('s-1', 'Active Scene')]),
    );
    render(<ScenePanel />);

    await screen.findByText('Active Scene');
    expect(screen.queryByTitle('Activate scene')).toBeNull();
    expect(screen.getByTitle('Active')).toBeInTheDocument();
  });

  // ── Deletion ─────────────────────────────────────────────────────────────────

  it('clicking Delete calls the API and removes the scene from the list', async () => {
    vi.mocked(api.get).mockResolvedValue(
      apiSceneResponse([
        makeScene('s-1', 'Dark Forest'),
        makeScene('s-2', 'Old Tavern'),
      ]),
    );
    vi.mocked(api.delete).mockResolvedValue({ data: {} });

    render(<ScenePanel />);
    await screen.findByText('Dark Forest');

    const deleteButtons = screen.getAllByTitle('Delete scene');
    await user.click(deleteButtons[0]); // delete first scene

    await waitFor(() =>
      expect(api.delete).toHaveBeenCalledWith('/api/worlds/world-1/documents/s-1'),
    );
    await waitFor(() => expect(screen.queryByText('Dark Forest')).toBeNull());
    expect(screen.getByText('Old Tavern')).toBeInTheDocument();
  });

  it('clears the store active scene when the active scene is deleted', async () => {
    useTableStore.setState({ activeSceneId: 's-1', activeSceneImg: 'img-url' });
    vi.mocked(api.get).mockResolvedValue(
      apiSceneResponse([makeScene('s-1', 'Active Scene')]),
    );
    vi.mocked(api.delete).mockResolvedValue({ data: {} });

    render(<ScenePanel />);
    await user.click(await screen.findByTitle('Delete scene'));

    await waitFor(() => {
      const { activeSceneId, activeSceneImg } = useTableStore.getState();
      expect(activeSceneId).toBeNull();
      expect(activeSceneImg).toBeNull();
    });
  });

  // ── Modal — Add Scene ────────────────────────────────────────────────────────

  it('opens the Add Scene modal when the button is clicked', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [] });
    render(<ScenePanel />);

    await user.click(screen.getByRole('button', { name: /add scene/i }));

    expect(screen.getByRole('heading', { name: /add scene/i })).toBeInTheDocument();
  });

  it('closes the modal when the X button is clicked', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [] });
    render(<ScenePanel />);

    await user.click(screen.getByRole('button', { name: /add scene/i }));
    await user.click(screen.getByRole('button', { name: '' })); // X button

    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: /add scene/i })).toBeNull(),
    );
  });

  // ── Modal — Starter Pack ──────────────────────────────────────────────────────

  it('Starter Pack tab shows 6 map options', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [] });
    vi.mocked(api.post).mockResolvedValue({ data: { id: 'new-1', name: 'Old Tavern' } });

    render(<ScenePanel />);
    await user.click(screen.getByRole('button', { name: /add scene/i }));

    const mapButtons = screen.getAllByRole('button').filter(
      (btn) => btn.querySelector('img') !== null,
    );
    expect(mapButtons).toHaveLength(6);
  });

  it('clicking a Starter Pack map calls api.post with type=scene and closes modal', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [] });
    vi.mocked(api.post).mockResolvedValue({
      data: { id: 'new-1', name: 'Old Tavern', data: {} },
    });

    render(<ScenePanel />);
    await user.click(screen.getByRole('button', { name: /add scene/i }));

    const [firstMap] = screen.getAllByRole('button').filter(
      (btn) => btn.querySelector('img') !== null,
    );
    await user.click(firstMap);

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith(
        '/api/worlds/world-1/documents',
        expect.objectContaining({ type: 'scene' }),
      ),
    );
    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: /add scene/i })).toBeNull(),
    );
  });

  // ── Modal — URL tab ───────────────────────────────────────────────────────────

  it('URL tab: fills name and URL then saves the scene', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [] });
    vi.mocked(api.post).mockResolvedValue({
      data: { id: 'new-2', name: 'My Map', data: { img: 'https://example.com/map.png' } },
    });

    render(<ScenePanel />);
    await user.click(screen.getByRole('button', { name: /add scene/i }));
    await user.click(screen.getByRole('button', { name: /^url$/i }));

    await user.type(screen.getByPlaceholderText(/e\.g\. dark forest/i), 'My Map');
    await user.type(screen.getByPlaceholderText(/https:\/\//i), 'https://example.com/map.png');

    // The sidebar also has an "Add Scene" button — take the last match (the modal's save button)
    const addBtns = screen.getAllByRole('button', { name: /add scene/i });
    await user.click(addBtns[addBtns.length - 1]);

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith(
        '/api/worlds/world-1/documents',
        expect.objectContaining({
          type: 'scene',
          name: 'My Map',
          data: expect.objectContaining({ img: 'https://example.com/map.png' }),
        }),
      ),
    );
  });

  it('URL tab: Add Scene button is disabled when URL is empty', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [] });
    render(<ScenePanel />);

    await user.click(screen.getByRole('button', { name: /add scene/i }));
    await user.click(screen.getByRole('button', { name: /^url$/i }));

    const addBtns = screen.getAllByRole('button', { name: /add scene/i });
    expect(addBtns[addBtns.length - 1]).toBeDisabled();
  });

  // ── Modal — Upload tab ────────────────────────────────────────────────────────

  it('Upload tab: renders the file upload area', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [] });
    render(<ScenePanel />);

    await user.click(screen.getByRole('button', { name: /add scene/i }));
    await user.click(screen.getByRole('button', { name: /^upload$/i }));

    expect(screen.getByText(/click to select image/i)).toBeInTheDocument();
  });

  it('Upload tab: Add Scene button is disabled when no file is selected', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [] });
    render(<ScenePanel />);

    await user.click(screen.getByRole('button', { name: /add scene/i }));
    await user.click(screen.getByRole('button', { name: /^upload$/i }));

    // Both the sidebar button and the modal button match "Add Scene"; take the modal one (last)
    const addBtns = screen.getAllByRole('button', { name: /add scene/i });
    expect(addBtns[addBtns.length - 1]).toBeDisabled();
  });
});
