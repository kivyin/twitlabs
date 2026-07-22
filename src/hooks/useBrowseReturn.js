import { useBrowseStack } from "../context/BrowseStackContext";

/**
 * After record CRUD (or Cancel), pop the browse stack to the previous page.
 * Falls back to the table list (or other default) when the stack is empty.
 */
export function useBrowseReturn(fallback) {
  const { goBack, previousPath, canGoBack } = useBrowseStack();

  return {
    returnTo: previousPath || fallback,
    canGoBack,
    goBack: () => goBack(fallback),
  };
}
