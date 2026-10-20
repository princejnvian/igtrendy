export type ServicePackage = {
  id: string;
  name: string;
  description: string;
  scope?: string;
  includes?: string;
  price: number | "";
  deliveryDays: number | "";
  revisions: number | "";
  media: GigMedia[];
};

export type GigMedia = {
  id: string;
  url: string;
  mediaType: "image" | "video";
  title?: string;
  path?: string;
};

export type CreatorGig = {
  id: string;
  title: string;
  category: string;
  subcategory: string;
  tags: string[];
  description: string;
  media: GigMedia[];
  packages: ServicePackage[];
};

export const DEFAULT_GIG_PACKAGES: ServicePackage[] = [
  { id: "basic", name: "Basic", description: "A focused starter package for simple projects.", scope: "", includes: "", price: 499, deliveryDays: 3, revisions: 1, media: [] },
  { id: "standard", name: "Standard", description: "A complete package for most client needs.", scope: "", includes: "", price: 1499, deliveryDays: 5, revisions: 2, media: [] },
  { id: "premium", name: "Premium", description: "A polished end-to-end package with extra value.", scope: "", includes: "", price: 2999, deliveryDays: 7, revisions: 3, media: [] },
];

export function normalizePackages(value: unknown): ServicePackage[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 3).map((item: any, index) => ({
    id: typeof item?.id === "string" && item.id ? item.id : ["basic", "standard", "premium"][index] || crypto.randomUUID(),
    name: typeof item?.name === "string" && item.name.trim() ? item.name.trim().slice(0, 40) : ["Basic", "Standard", "Premium"][index] || `Package ${index + 1}`,
    description: typeof item?.description === "string" ? item.description.trim().slice(0, 700) : "",
    scope: typeof item?.scope === "string" ? item.scope.trim().slice(0, 250) : "",
    includes: typeof item?.includes === "string" ? item.includes.trim().slice(0, 700) : "",
    price: Math.max(0, Number(item?.price) || 0),
    deliveryDays: Math.max(1, Number(item?.deliveryDays) || 1),
    revisions: Math.max(0, Math.min(50, Number(item?.revisions) || 0)),
    media: Array.isArray(item?.media) ? item.media.slice(0, 6).map((media: any) => ({
      id: typeof media?.id === "string" && media.id ? media.id : crypto.randomUUID(),
      url: typeof media?.url === "string" ? media.url.slice(0, 2000) : "",
      mediaType: media?.mediaType === "video" ? "video" : "image",
      title: typeof media?.title === "string" ? media.title.slice(0, 120) : "",
      path: typeof media?.path === "string" ? media.path.slice(0, 2000) : "",
    })).filter((media: GigMedia) => media.url || media.path) : [],
  }));
}

export function normalizeGigs(value: unknown, legacyPackages?: unknown, legacyCategory?: string): CreatorGig[] {
  if (Array.isArray(value) && value.length) {
    return value.slice(0, 20).map((item: any, index) => ({
      id: typeof item?.id === "string" && item.id ? item.id : crypto.randomUUID(),
      title: typeof item?.title === "string" && item.title.trim() ? item.title.trim().slice(0, 120) : `Gig ${index + 1}`,
      category: typeof item?.category === "string" && item.category.trim() ? item.category.trim().slice(0, 80) : (legacyCategory || "Creative Services"),
      subcategory: typeof item?.subcategory === "string" ? item.subcategory.trim().slice(0, 80) : "",
      tags: Array.isArray(item?.tags) ? item.tags.filter((tag: any) => typeof tag === "string").map((tag: string) => tag.trim().slice(0, 40)).filter(Boolean).slice(0, 10) : [],
      description: typeof item?.description === "string" ? item.description.trim().slice(0, 700) : "",
      media: Array.isArray(item?.media) ? item.media.slice(0, 6).map((media: any) => ({
        id: typeof media?.id === "string" && media.id ? media.id : crypto.randomUUID(),
        url: typeof media?.url === "string" ? media.url.slice(0, 2000) : "",
        mediaType: media?.mediaType === "video" ? "video" : "image",
        title: typeof media?.title === "string" ? media.title.slice(0, 120) : "",
        path: typeof media?.path === "string" ? media.path.slice(0, 2000) : "",
      })).filter((media: GigMedia) => media.url) : [],
      packages: normalizePackages(item?.packages),
    })).filter((gig) => gig.packages.length > 0);
  }

  const packages = normalizePackages(legacyPackages);
  return packages.length
    ? [{
        id: "gig-default",
        title: `${legacyCategory || "Creative"} Service`,
        category: legacyCategory || "Creative Services",
        subcategory: "",
        tags: [],
        description: "A service offered by this freelancer on YOUTENT.",
        media: [],
        packages,
      }]
    : [];
}

export function packagePriceRange(gig: CreatorGig): { min: number; max: number } {
  const prices = gig.packages.map((item) => Number(item.price)).filter((value) => Number.isFinite(value) && value > 0);
  return { min: prices.length ? Math.min(...prices) : 0, max: prices.length ? Math.max(...prices) : 0 };
}
