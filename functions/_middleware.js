import { authRedirectPath, authorizeRouteAccess, readCurrentAccount } from './api/_auth.js';

const PUBLIC_PATHS = new Set([
  '/',
  '/index.html',
  '/signin',
  '/signin.html',
  '/sign-in',
  '/sign-in.html',
  '/login',
  '/forgot-password',
  '/forgot-password.html',
  '/reset-password',
  '/reset-password.html',
  '/pricing',
  '/pricing.html',
  '/subscribe',
  '/subscribe.html',
  '/legal.html',
  '/robots.txt',
  '/sitemap.xml',
  '/styles.css',
  '/app.js',
  '/dist',
  '/dist/app.js',
  '/dist/index.html',
  '/dist/pricing.html',
  '/dist/subscribe',
  '/dist/subscribe.html',
  '/dist/login.html',
  '/dist/signin.html',
  '/dist/sign-in.html',
  '/dist/forgot-password.html',
  '/dist/reset-password.html',
  '/dist/legal.html',
  '/stage-one.css',
]);

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const pathname = url.pathname;

  if (pathname.startsWith('/api/')) {
    return context.next();
  }

  const isAsset = /\.(css|js|mjs|png|jpg|jpeg|gif|webp|svg|ico|txt|xml|json|map|woff2?|ttf|otf)$/i.test(pathname);
  const isPublic = PUBLIC_PATHS.has(pathname) || pathname.startsWith('/assets/') || pathname.startsWith('/dist/assets/') || pathname.startsWith('/.well-known/') || isAsset;
  if (isPublic) {
    return context.next();
  }

  const current = await readCurrentAccount(request, env);
  const intended = encodeURIComponent(`${pathname}${url.search || ''}`);

  if (!current.account || !current.session) {
    return Response.redirect(new URL(`/signin?redirect=${intended}`, url.origin), 302);
  }

  const access = authorizeRouteAccess(request, current.account, pathname);
  if (!access.ok) {
    const target = authRedirectPath(current.account, { redirectTarget: `${pathname}${url.search || ''}` });
    if (target === '/signin') {
      return Response.redirect(new URL(`/signin?redirect=${intended}`, url.origin), 302);
    }
    return Response.redirect(new URL(target, url.origin), 302);
  }

  return context.next();
}
