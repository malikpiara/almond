import { useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { store } from '@/lib/store';

const LAST_BOARD_KEY = 'almond-last-board';

/**
 * Land-in-writing: open straight to the last board the user wrote in (or the
 * first board) instead of the journal list. The list lives at `/journals`.
 */
export function IndexRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    (async () => {
      await store.init();
      const boards = await store.getBoards();
      if (!active) return;
      const lastId = localStorage.getItem(LAST_BOARD_KEY);
      const target = boards.find((b) => b.id === lastId) ?? boards[0];
      if (target) {
        navigate({ to: '/boards/$id', params: { id: target.id }, replace: true });
      } else {
        navigate({ to: '/journals', replace: true });
      }
    })();
    return () => {
      active = false;
    };
  }, [navigate]);

  return null;
}
