export interface TrendingVideo {
  id: string;
  videoUrl: string;
  sourcePlatform: 'facebook' | 'tiktok';
  caption: string;
  likes: number;
}
