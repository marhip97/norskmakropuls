/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: process.env.BASE_PATH ?? '/norskmakropuls',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig
