export interface SubSubCategory {
  id: string;
  name: string;
  slug: string;
}

export interface SubCategory {
  id: string;
  name: string;
  slug: string;
  subSubCategories?: SubSubCategory[];
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  image: string; // Untuk lingkaran Shop By Category
  subCategories?: SubCategory[];
}

export interface Product {
  id: string;
  title: string;
  slug: string;
  vendor: string;
  price: number;
  oldPrice?: number;
  discountRate?: number;
  image: string;
  rating: number;
  wishlistCount: number;
  isFeatured: boolean;
  createdAt: string; // Untuk sorting New Arrivals
  categorySlug: string;
  brandSlug: string;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  logo: string;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  category: string;
  date: string;
  image: string;
  excerpt: string;
}

// ==========================================
// 1. DATA KATEGORI (Header Mega Menu & Shop By Category)
// ==========================================
export const categoriesMock: Category[] = [
  {
    id: "cat-1",
    name: "Clothing",
    slug: "clothing",
    image: "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?q=80&w=300&auto=format&fit=crop",
    subCategories: [
      {
        id: "sub-1-1",
        name: "Women's Clothing",
        slug: "womens-clothing",
        subSubCategories: [
          { id: "sub-1-1-1", name: "Dresses", slug: "dresses" },
          { id: "sub-1-1-2", name: "Skirts", slug: "skirts" },
          { id: "sub-1-1-3", name: "Pants & Capris", slug: "pants-capris" },
          { id: "sub-1-1-4", name: "Sweaters", slug: "womens-sweaters" },
        ]
      },
      {
        id: "sub-1-2",
        name: "Men's Clothing",
        slug: "mens-clothing",
        subSubCategories: [
          { id: "sub-1-2-1", name: "Jackets & Coats", slug: "jackets-coats" },
          { id: "sub-1-2-2", name: "Sweaters", slug: "sweaters" },
          { id: "sub-1-2-3", name: "Pants & Jeans", slug: "pants-jeans" },
          { id: "sub-1-2-4", name: "Shirts", slug: "shirts" },
        ]
      },
      {
        id: "sub-1-3",
        name: "Kid's Clothing",
        slug: "kids-clothing",
        subSubCategories: [
          { id: "sub-1-3-1", name: "Clothing Sets", slug: "clothing-sets" },
        ]
      }
    ]
  },
  {
    id: "cat-2",
    name: "Shoes",
    slug: "shoes",
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=300&auto=format&fit=crop",
    subCategories: [
      { id: "sub-2-1", name: "Sneakers", slug: "sneakers" },
      { id: "sub-2-2", name: "Boots", slug: "boots" },
      { id: "sub-2-3", name: "Sandals", slug: "sandals" }
    ]
  },
  {
    id: "cat-3",
    name: "Home & Living",
    slug: "home-living",
    image: "https://images.unsplash.com/photo-1484101403633-562f891dc89a?q=80&w=300&auto=format&fit=crop",
    subCategories: [
      { id: "sub-3-1", name: "Furniture", slug: "furniture" },
      { id: "sub-3-2", name: "Decorative Pillows", slug: "decorative-pillows" }
    ]
  },
  {
    id: "cat-4",
    name: "Toys & Entertainment",
    slug: "toys-entertainment",
    image: "https://images.unsplash.com/photo-1559251606-c623743a6d76?q=80&w=300&auto=format&fit=crop"
  }
];

// ==========================================
// 2. DATA PRODUK (Special Offers, Featured, New Arrivals)
// ==========================================
// ==========================================
// 2. DATA PRODUK (DIUPDATE AGAR SINKRON BERTINGKAT)
// ==========================================
export const productsMock: Product[] = [
  {
    id: "prod-1",
    title: "Summer fashion top lace",
    slug: "summer-fashion-top-lace",
    vendor: "Trendshop",
    price: 65,
    oldPrice: 79,
    discountRate: 17,
    image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=400&auto=format&fit=crop",
    rating: 3,
    wishlistCount: 3,
    isFeatured: true,
    createdAt: "2026-07-01T10:00:00Z",
    categorySlug: "dresses", // <-- Diubah dari "womens-clothing" ke sub spesifik
    brandSlug: "hm"
  },
  {
    id: "prod-2",
    title: "Women lace blouse with different colors",
    slug: "women-lace-blouse-colors",
    vendor: "Trendshop",
    price: 69,
    oldPrice: 79,
    discountRate: 12,
    image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=400&auto=format&fit=crop",
    rating: 0,
    wishlistCount: 5,
    isFeatured: false,
    createdAt: "2026-07-03T09:00:00Z",
    categorySlug: "womens-sweaters", // <-- Diubah agar menjadi anak dari "womens-clothing"
    brandSlug: "gucci"
  },
  {
    id: "prod-3",
    title: "Floral women sundress",
    slug: "floral-women-sundress",
    vendor: "Admin",
    price: 80,
    oldPrice: 89,
    discountRate: 10,
    image: "https://images.unsplash.com/photo-1612336307429-8a898d10e223?q=80&w=400&auto=format&fit=crop",
    rating: 5,
    wishlistCount: 6,
    isFeatured: true,
    createdAt: "2026-07-05T08:00:00Z",
    categorySlug: "dresses", // <-- Sudah pas sub spesifik
    brandSlug: "zara"
  },
  {
    id: "prod-4",
    title: "Gucci nylon fabric smart backpack",
    slug: "gucci-nylon-fabric-smart-backpack",
    vendor: "Admin",
    price: 55,
    oldPrice: 69,
    discountRate: 20,
    image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?q=80&w=400&auto=format&fit=crop",
    rating: 0,
    wishlistCount: 2,
    isFeatured: false,
    createdAt: "2026-07-07T12:00:00Z",
    categorySlug: "bags",
    brandSlug: "gucci"
  },
  {
    id: "prod-5",
    title: "Black sneakers with white sole",
    slug: "black-sneakers-white-sole",
    vendor: "Admin",
    price: 69,
    oldPrice: 89,
    discountRate: 22,
    image: "https://images.unsplash.com/photo-1549298916-b41d501d3772?q=80&w=400&auto=format&fit=crop",
    rating: 4,
    wishlistCount: 0,
    isFeatured: true,
    createdAt: "2026-07-08T01:00:00Z",
    categorySlug: "sneakers", // <-- Sudah pas anak dari "shoes"
    brandSlug: "diesel"
  },

];

// ==========================================
// 3. DATA BRAND (Shop By Brand Carousel)
// ==========================================
export const brandsMock: Brand[] = [
  { id: "b-1", name: "Burberry", slug: "burberry", logo: "https://upload.wikimedia.org/wikipedia/commons/2/20/Burberry_Logo.svg" },
  { id: "b-2", name: "Diesel", slug: "diesel", logo: "https://upload.wikimedia.org/wikipedia/commons/e/eb/Diesel_logo.svg" },
  { id: "b-3", name: "Dockers", slug: "dockers", logo: "https://upload.wikimedia.org/wikipedia/commons/6/60/Dockers_logo.svg" },
  { id: "b-4", name: "Gucci", slug: "gucci", logo: "https://upload.wikimedia.org/wikipedia/commons/7/79/1920s_Gucci_Logo.svg" },
  { id: "b-5", name: "H&M", slug: "hm", logo: "https://upload.wikimedia.org/wikipedia/commons/5/53/H%26M-Logo.svg" },
  { id: "b-6", name: "Hugo Boss", slug: "hugo-boss", logo: "https://upload.wikimedia.org/wikipedia/commons/c/cc/Hugo_Boss_logo.svg" }
];

// ==========================================
// 4. DATA BLOG (Latest Blog Posts)
// ==========================================
export const blogsMock: BlogPost[] = [
  {
    id: "post-1",
    title: "Essential travel packing tips for fashion lovers",
    slug: "essential-travel-packing-tips",
    category: "Life Style",
    date: "10 months ago",
    image: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=400&auto=format&fit=crop",
    excerpt: "Stay stylish and organized on your trips with these smart packing hacks..."
  },
  {
    id: "post-2",
    title: "The psychology of colors in fashion",
    slug: "psychology-of-colors-fashion",
    category: "Fashion",
    date: "10 months ago",
    image: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?q=80&w=400&auto=format&fit=crop",
    excerpt: "Learn how the colors you wear influence mood, confidence, and perception..."
  },
  {
    id: "post-3",
    title: "Gift ideas for every budget from affordable to luxury",
    slug: "gift-ideas-every-budget",
    category: "Life Style",
    date: "10 months ago",
    image: "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?q=80&w=400&auto=format&fit=crop",
    excerpt: "Find the perfect gift without breaking the bank our ideas suit every budget..."
  }
];