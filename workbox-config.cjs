module.exports = {
	globDirectory: 'dist/',
	globPatterns: ['**/*.{js,css,html,svg,png,ico,webp,json}'],
	swDest: 'dist/sw.js',
	cleanupOutdatedCaches: true,
	clientsClaim: true,
	skipWaiting: true,

	navigateFallback: '/index.html',

	runtimeCaching: [
		
		{
			urlPattern: ({ request, url }) =>
				request.destination === 'script' ||
				request.destination === 'style' ||
				request.destination === 'worker',
			handler: 'CacheFirst',
			options: {
				cacheName: 'static-assets',
				expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 30 }
			}
		},

		{
			urlPattern: ({ request }) => request.destination === 'image',
			handler: 'StaleWhileRevalidate',
			options: {
				cacheName: 'images',
				expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 }
			}
		},

		{
			urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
			handler: 'StaleWhileRevalidate',
			options: {
				cacheName: 'google-fonts',
				expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 }
			}
		}
	]
};
