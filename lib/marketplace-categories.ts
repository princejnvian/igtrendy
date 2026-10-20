export type MarketplaceCategory = {
  label: string;
  subcategories: string[];
};

export const MARKETPLACE_CATEGORIES: MarketplaceCategory[] = [
  { label: "Graphics & Design", subcategories: ["Logo Design", "Brand Style Guides", "Presentation Design", "Social Media Design", "Thumbnails", "Illustration", "Poster Design", "UI/UX Design"] },
  { label: "Video & Animation", subcategories: ["Video Editing", "YouTube Editing", "Shorts & Reels", "Video Ads", "Motion Graphics", "2D/3D Animation", "Intro & Outro", "Color Grading"] },
  { label: "Writing & Translation", subcategories: ["Script Writing", "Content Writing", "Copywriting", "Storytelling", "Translation", "Proofreading", "Research", "Product Descriptions"] },
  { label: "Music & Audio", subcategories: ["Voice Over", "Podcast Editing", "Audio Editing", "Sound Design", "Music Production", "Mixing & Mastering", "Jingles", "Background Music"] },
  { label: "Programming & Tech", subcategories: ["Web Development", "App Development", "Next.js", "React", "WordPress", "Automation", "Bug Fixes", "AI Integrations"] },
  { label: "Digital Marketing", subcategories: ["Social Media Marketing", "SEO", "YouTube Marketing", "Email Marketing", "Paid Ads", "Content Strategy", "Influencer Marketing", "Analytics"] },
  { label: "AI Services", subcategories: ["AI Video", "AI Image Generation", "AI Content", "AI Voice", "AI Automation", "Prompt Engineering", "Chatbot Development", "AI Consulting"] },
  { label: "Photography", subcategories: ["Portrait Photography", "Product Photography", "Photo Editing", "Event Photography", "Real Estate Photography", "Food Photography", "Wedding Photography", "Photo Retouching"] },
  { label: "Business", subcategories: ["Business Consulting", "Market Research", "Business Plans", "Virtual Assistant", "Data Entry", "Presentations", "Project Management", "Career Advice"] },
  { label: "Finance", subcategories: ["Financial Planning", "Bookkeeping", "Tax Preparation", "Financial Analysis", "Accounting", "Business Finance", "Investment Research", "Excel & Spreadsheets"] },
];

export const MARKETPLACE_CATEGORY_NAMES = MARKETPLACE_CATEGORIES.map((item) => item.label);

export function getSubcategories(category: string): string[] {
  return MARKETPLACE_CATEGORIES.find((item) => item.label === category)?.subcategories || [];
}
