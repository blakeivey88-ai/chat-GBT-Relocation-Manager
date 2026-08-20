import { authRedirectPath, authorizeRouteAccess, readCurrentAccount } from './api/_auth.js';

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com https://www.googletagmanager.com https://www.clarity.ms https://t.whop.tw https://pagead2.googlesyndication.com https://www.google.com https://www.gstatic.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://cloudflareinsights.com https://static.cloudflareinsights.com https://www.google-analytics.com https://region1.google-analytics.com https://www.googletagmanager.com https://*.clarity.ms https://api.countapi.xyz https://t.whop.tw https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net https://*.google.com",
  "frame-src 'self' https://buy.stripe.com https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://www.google.com https://pagead2.googlesyndication.com",
  "form-action 'self' https://buy.stripe.com",
  'upgrade-insecure-requests',
].join('; ');

function secureResponse(response, pathname = '') {
  const headers = new Headers(response.headers);
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self), browsing-topics=()');
  headers.set('Content-Security-Policy', CONTENT_SECURITY_POLICY);
  if (/^\/(?:member(?:\.html)?|workspace)(?:\/|$)/i.test(pathname)) {
    headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
    headers.set('Cache-Control', 'private, no-store');
  }
  const body = response.status === 204 || response.status === 304 ? null : response.body;
  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

const PUBLIC_PATHS = new Set([
  '/',
  '/index.html',
  '/about',
  '/about.html',
  '/privacy',
  '/privacy.html',
  '/terms',
  '/terms.html',
  '/cancellation',
  '/cancellation.html',
  '/signup',
  '/signup.html',
  '/verify',
  '/verify.html',
  '/public-site.css',
  '/public-site.js',
  '/dist/about.html',
  '/dist/privacy.html',
  '/dist/terms.html',
  '/dist/cancellation.html',
  '/dist/signup.html',
  '/dist/verify.html',
  '/dist/public-site.css',
  '/dist/public-site.js',
  '/blog',
  '/cities',
  '/directories',
  '/knowledge',
  '/states',
  '/resources',
  '/resources.html',
  '/support',
  '/support.html',
  '/share-an-idea',
  '/share-an-idea.html',
  '/safety',
  '/safety.html',
  '/demo',
  '/demo.html',
  '/stage-one',
  '/stage-one.html',
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
  '/legal',
  '/subscribe',
  '/subscribe.html',
  '/legal.html',
  '/robots.txt',
  '/sitemap.xml',
  '/styles.css',
  '/analytics-loader.js',
  '/display-ads.js',
  '/display-ads.css',
  '/display-ads-config.js',
  '/ads.txt',
  '/rate-calculator',
  '/rate-calculator.html',
  '/rate-calc-core.js',
  '/partner-select.js',
  '/partners.json',
  '/tools',
  '/tools/',
  '/tools/index.html',
  '/tools/cube-fit',
  '/tools/cube-fit.html',
  '/tools/cube-fit-core.js',
  '/tools/wait-cost',
  '/tools/wait-cost.html',
  '/tools/wait-cost-core.js',
  '/tools/before-you-call',
  '/tools/before-you-call.html',
  '/carrier-profile',
  '/carrier-profile.html',
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

const PUBLIC_PATH_PREFIXES = [
  '/assets/',
  '/blog/',
  '/cities/',
  '/directories/',
  '/knowledge/',
  '/states/',
  '/tools/',
  '/dist/assets/',
  '/.well-known/',
];

const KNOWN_API_PATHS = new Set([
  '/api/account',
  '/api/agent-telemetry',
  '/api/bulletin',
  '/api/communication',
  '/api/dispatch',
  '/api/leaderboard',
  '/api/leads',
  '/api/loads',
  '/api/metrics',
  '/api/suggestions',
  '/api/stripe-webhook',
  '/api/translate',
]);

function accessDenialRedirectPath(access, intendedPath) {
  const route = String(access?.route || '').trim().toLowerCase();
  const encoded = encodeURIComponent(intendedPath);
  if (route === 'signin') return `/signin?redirect=${encoded}`;
  if (route === 'verify') return '/verify.html';
  if (route === 'profile-completion') return '/signup.html?mode=complete';
  if (route === 'billing' || route === 'renewal') {
    return `/account/billing?redirect=${encoded}`;
  }
  if (route === 'plan-selection' || route === 'pricing') {
    return `/pricing?redirect=${encoded}`;
  }
  return '';
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const pathname = url.pathname;

  if (url.hostname.toLowerCase() === 'www.relocationmanagerusa.com') {
    url.hostname = 'relocationmanagerusa.com';
    return secureResponse(Response.redirect(url, 308), pathname);
  }

  if (pathname.startsWith('/api/')) {
    if (!KNOWN_API_PATHS.has(pathname)) {
      return secureResponse(new Response(JSON.stringify({ ok: false, error: 'API route not found.' }), {
        status: 404,
        headers: {
          'content-type': 'application/json; charset=utf-8',
          'cache-control': 'no-store',
        },
      }), pathname);
    }
    return secureResponse(await context.next(), pathname);
  }

  const isAsset = /\.(css|js|mjs|png|jpg|jpeg|gif|webp|svg|ico|txt|xml|json|map|woff2?|ttf|otf)$/i.test(pathname);
  const isPublic =
    PUBLIC_PATHS.has(pathname) ||
    PUBLIC_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix)) ||
    isAsset;
  if (isPublic) {
    return secureResponse(await context.next(), pathname);
  }

  const current = await readCurrentAccount(request, env);
  const intendedPath = `${pathname}${url.search || ''}`;
  const intended = encodeURIComponent(intendedPath);

  if (!current.account || !current.session) {
    return secureResponse(Response.redirect(new URL(`/signin?redirect=${intended}`, url.origin), 302), pathname);
  }

  const access = authorizeRouteAccess(request, current.account, pathname);
  if (!access.ok) {
    const deniedTarget = accessDenialRedirectPath(access, intendedPath);
    if (deniedTarget) {
      return secureResponse(Response.redirect(new URL(deniedTarget, url.origin), 302), pathname);
    }
    const target = authRedirectPath(current.account, { redirectTarget: intendedPath });
    if (target === '/signin') {
      return secureResponse(Response.redirect(new URL(`/signin?redirect=${intended}`, url.origin), 302), pathname);
    }
    if (target === intendedPath || target === pathname) {
      return secureResponse(Response.redirect(new URL(`/pricing?redirect=${intended}`, url.origin), 302), pathname);
    }
    return secureResponse(Response.redirect(new URL(target, url.origin), 302), pathname);
  }

  return secureResponse(await context.next(), pathname);
}
