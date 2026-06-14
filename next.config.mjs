/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // 유튜브 채널/영상 썸네일 도메인 허용
    remotePatterns: [
      { protocol: "https", hostname: "yt3.googleusercontent.com" },
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "*.ggpht.com" },
    ],
  },
};

export default nextConfig;
