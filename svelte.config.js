import preprocess from 'svelte-preprocess';
import adapter from '@sveltejs/adapter-static';
const dev = process.env.NODE_ENV === 'development';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://github.com/sveltejs/svelte-preprocess
	// for more information about preprocessors
	preprocess: preprocess(),
	kit: {
		adapter: adapter({
			// default options are shown
			pages: 'docs',
			assets: 'docs',
			precompress: false,
			fallback: 'index.html',
			path: ''
		}),
		paths: {
			base: dev ? '' : '/check-that-mountains',
			assets: 'https://martin-havala.github.io/check-that-mountains'
		},
		files: {
			assets: 'public'
		},
		// If you are not using a .nojekyll file, change your appDir to something not starting with an underscore.
		// For example, instead of '_app', use 'app_', 'internal', etc.
		appDir: 'internal',
		prerender: {
			// This can be false if you're using a fallback (i.e. SPA mode)
			default: false
		}
	}
};

export default config;
