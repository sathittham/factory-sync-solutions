import { auth } from '@/lib/firebase';

/**
 * Open the CMS (blog) admin with single sign-on.
 *
 * The CMS runs its own auth, so we hand off the signed-in user's Firebase ID
 * token via a top-level form POST to the CMS `/sso/handover` route (token in the
 * body, never the URL). The CMS verifies it, provisions/maps the user, starts an
 * admin session, and redirects to /admin — all in a new tab.
 *
 * The target tab is opened synchronously inside the click gesture so the browser
 * doesn't treat the post-`await` submit as a blocked popup.
 */
export async function openCmsBlog(handoverUrl: string): Promise<void> {
  const targetName = 'fs-cms-blog';
  const win = window.open('about:blank', targetName);

  try {
    const token = await auth.currentUser?.getIdToken();
    if (!token) {
      win?.close();
      return;
    }

    const form = document.createElement('form');
    form.method = 'POST';
    form.action = handoverUrl;
    form.target = targetName;

    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = 'token';
    input.value = token;
    form.appendChild(input);

    document.body.appendChild(form);
    form.submit();
    form.remove();
  } catch {
    win?.close();
  }
}
