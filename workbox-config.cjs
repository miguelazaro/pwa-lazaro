module.exports = {
	globDirectory: 'dist/',
	globPatterns: [
		'**/*.{js,css,html,svg,png,ico,webp,json}'
	],
	swDest: 'dist/sw.js',
	cleanupOutdatedCaches: true,
	clientsClaim: true,
	skipWaiting: true,

	// Si navegaa una ruta desconocida, servir index.html
	navigateFallback: '/index.html',

	// Caché en tiempo de ejecución 
	runtimeCaching: [
		// 1) Assets generados por Vite 
		{
			urlPattern: ({ url }) =>
				url.origin === self.location.origin && url.pathname.startsWith('/assets/'),
			handler: 'StaleWhileRevalidate',
			options: {
				cacheName: 'static-assets',
			}
		},

		// 2) Imágenes locales
		{
			urlPattern: ({ request, url }) =>
				request.destination === 'image' && url.origin === self.location.origin,
			handler: 'CacheFirst',
			options: {
				cacheName: 'images',
				expiration: {
					maxEntries: 60,
					maxAgeSeconds: 60 * 60 * 24 * 30 // 30 días
				}
			}
		},

		// 3) Google Fonts 
		{
			urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
			handler: 'StaleWhileRevalidate',
			options: {
				cacheName: 'google-fonts',
				expiration: {
					maxEntries: 30,
					maxAgeSeconds: 60 * 60 * 24 * 365 
				}
			}
		}
	]
};
