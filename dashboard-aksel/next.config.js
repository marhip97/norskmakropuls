/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/norskmakropuls',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig
