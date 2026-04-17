---
name: perf-frontend
description: Assess frontend performance — bundle size, code splitting, lazy loading, image optimization, Web Vitals
---

# Skill: perf-frontend

## Domain: Performance
## Purpose
Assess frontend performance — bundle size, code splitting, lazy loading, image optimization, render performance, and Web Vitals signals.

## Input
- Scout report at: `vibeguard-reports/scout-report.md`
- Mode: `deep` (default) | `shallow`

## What to Assess

Frontend performance is user-facing and measurable. A 2MB JavaScript bundle takes 10+ seconds to load on a 3G connection. An unoptimized LCP image adds seconds to perceived load time. Layout shifts destroy user trust in the interface. Google uses Web Vitals as a ranking signal — poor performance directly affects SEO. These issues are especially impactful on mobile where bandwidth and CPU are constrained.

### 1. Bundle Size
- How is the application bundled? (Webpack, Vite, esbuild, Turbopack, Rollup, Parcel)
- Is there bundle analysis configured? (webpack-bundle-analyzer, rollup-plugin-visualizer, source-map-explorer)
- Are there obviously large dependencies? (moment.js → use date-fns/dayjs, lodash full → use lodash-es or individual imports)
- Is tree-shaking effective? (ESM imports, no barrel files that prevent tree-shaking)
- Are production builds minified? (Terser, esbuild minify, swc)

### 2. Code Splitting
- Is route-based code splitting implemented? (Dynamic imports for routes/pages)
- Are heavy components lazy-loaded? (Charts, editors, maps — not loaded until needed)
- Are third-party libraries split from application code? (Vendor chunk)
- Is there a strategy for critical vs non-critical JS? (Critical path JS loaded first)

### 3. Asset Optimization
- **Images**: Are images optimized? (WebP/AVIF format, responsive images with srcset, lazy loading with `loading="lazy"`)
- **Fonts**: Are fonts optimized? (Subset, preloaded, `font-display: swap` or `optional`)
- **CSS**: Is unused CSS removed? (PurgeCSS, Tailwind purge, CSS modules)
- **SVG**: Are SVGs optimized? (SVGO, inline where small)
- **Static assets**: Are assets hashed for cache busting? (filename.hash.js)
- **CDN**: Are static assets served from a CDN?

### 4. Loading Performance
- **Critical rendering path**: Is critical CSS inlined? Are render-blocking resources minimized?
- **Preloading**: Are critical resources preloaded? (`<link rel="preload">`, `<link rel="prefetch">`)
- **Above-the-fold**: Is above-the-fold content prioritized?
- **Third-party scripts**: Are they async/deferred? Are they loaded after core content?
- **Loading states**: Are there skeleton/placeholder screens during data loading?

### 5. Render Performance
- **React**: Are there unnecessary re-renders? (Missing `React.memo`, `useMemo`, `useCallback` where needed)
- **Vue**: Are computed properties used vs methods? Are components properly keyed in lists?
- **Svelte**: Reactive declarations efficient?
- **Virtual scrolling**: For long lists, is virtual scrolling implemented? (react-window, react-virtualized, vue-virtual-scroller)
- **Animation**: Are animations using CSS transforms/opacity (GPU-accelerated) instead of layout-triggering properties?
- **Layout thrashing**: Multiple DOM reads/writes interleaved?

### 6. Web Vitals Signals
- **LCP (Largest Contentful Paint)**: Is the largest visible element optimized? (Preloaded, not delayed by JS)
- **FID/INP (Interaction to Next Paint)**: Are interactions responsive? (No long tasks blocking main thread)
- **CLS (Cumulative Layout Shift)**: Are dimensions set on images/embeds? No content that shifts after load?
- Is Web Vitals monitoring in place? (web-vitals library, RUM data)
- Is there a performance budget defined?

### 7. Data Fetching
- Is there a data fetching strategy? (SWR, React Query/TanStack Query, Apollo Client)
- Is data cached client-side? (Stale-while-revalidate, cache-first)
- Is there unnecessary data fetching? (Waterfall requests, over-fetching, refetching on every mount)
- Is there prefetching for likely next pages? (Link hover prefetch)

### 8. Service Worker / PWA
- Is there a service worker? (Offline capability, caching strategy)
- Is the caching strategy appropriate? (Cache-first for static, network-first for API)
- Is the service worker updated properly? (No stale cache issues)
- Is there a PWA manifest? (If appropriate for the application type)

## How to Assess (by framework)

- **React**: Check for React.lazy/Suspense, memo usage, Context optimization, bundle config, Next.js Image/Link optimization
- **Next.js**: Check `next.config.js` for optimization flags, Image component usage, dynamic imports, ISR/SSG where appropriate
- **Vue/Nuxt**: Check for async components, Nuxt auto-imports, image optimization, lazy hydration
- **Svelte/SvelteKit**: Check for code splitting, adapter config, prerendering
- **Angular**: Check for lazy loaded modules, OnPush change detection, tree-shakeable providers
- **Any**: Check for lighthouse CI, bundle analyzer, web-vitals library

## Shallow Mode
Build config checks only — no bundle analysis:
- Is the bundler configured for production? (Minification, tree-shaking enabled)
- Is code splitting configured? (Dynamic imports, route-based splitting)
- Check for obviously large dependencies: `moment` (use dayjs), full `lodash` (use lodash-es), `@material-ui` without tree-shaking
- Is there a CDN configured for static assets?
- Are images using modern formats (WebP/AVIF) or an optimization pipeline?

## Deep Mode (default)
All of Shallow Mode, plus:
- Analyze bundle composition: look at webpack/Vite config for chunk splitting, vendor separation, and tree-shaking effectiveness
- Trace code splitting: is every route dynamically imported? Are heavy components (charts, editors, maps) lazy-loaded?
- Check render performance: search for `dangerouslySetInnerHTML`, missing `key` props on lists, `useEffect` without dependency arrays, `v-html`
- Review data fetching: is there a client-side caching strategy (React Query, SWR, Apollo)? Are there waterfall requests? Over-fetching?
- Assess Web Vitals signals: are image dimensions set (CLS)? Is critical CSS inlined (LCP)? Are third-party scripts deferred (INP/FID)?

## Severity Guide
- **CRITICAL**: No production build minification, entire app in a single bundle (no code splitting), unoptimized images causing >10s load times
- **HIGH**: No code splitting, large dependencies without tree-shaking, no image optimization, render-blocking third-party scripts, no lazy loading
- **MEDIUM**: Bundle size could be reduced significantly, no Web Vitals monitoring, no caching strategy for data fetching, unnecessary re-renders on key pages
- **LOW**: No prefetching, no service worker, fonts not optimized, minor CLS issues, no performance budgets defined

## Output
Write report to: `vibeguard-reports/skill-reports/perf-frontend.md`
Follow the output contract at `references/skill-output-contract.md`.
