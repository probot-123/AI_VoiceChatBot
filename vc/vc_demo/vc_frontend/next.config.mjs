/** @type {import('next').NextConfig} */
const nextConfig = {
	// Only use the basePath in production
	basePath: process.env.NODE_ENV === 'production' ? '/yash/vc' : '',
	assetPrefix: process.env.NODE_ENV === 'production' ? '/yash/vc' : '',
};

export default nextConfig;
