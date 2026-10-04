export interface MeliProduct {
  id: string;
  title: string;
  price: number;
  original_price: number | null;
  currency_id: string;
  condition: string;
  thumbnail: string;
  permalink: string;
  seller: {
    id: number;
    nickname?: string;
    car_dealer?: boolean;
    real_estate_agency?: boolean;
  };
  shipping: {
    free_shipping: boolean;
    logistic_type?: string;
    store_pick_up?: boolean;
  };
  installments?: {
    quantity: number;
    amount: number;
    rate: number;
    currency_id: string;
  };
  sold_quantity?: number;
  available_quantity?: number;
}

export interface CompetitionMetrics {
  totalCompetitors: number;
  minPrice: number;
  maxPrice: number;
  avgPrice: number;
  medianPrice: number;
  currencyId: string;
  freeShippingCount: number;
  freeShippingPercentage: number;
  fullShippingCount: number;
  fullShippingPercentage: number;
  topSellers: { name: string; count: number }[];
  priceRangeDistribution: {
    range: string;
    count: number;
  }[];
}

export interface ImageAnalysisResult {
  productTitle: string;
  suggestedKeywords: string[];
  brand: string | null;
  model: string | null;
  category: string | null;
  features: string[];
  confidenceScore: number;
  estimatedPriceUsd?: number;
  estimatedCompetitors?: number;
  competitorsList?: {
    title: string;
    estimatedPriceUsd: number;
    seller: string;
    condition: string;
    isFull: boolean;
    freeShipping: boolean;
  }[];
}

export interface SearchResponse {
  analysis: ImageAnalysisResult;
  siteId: string;
  metrics: CompetitionMetrics;
  products: MeliProduct[];
  totalResults: number;
  isSimulated?: boolean;
  notice?: string;
}

export const MELI_SITES = [
  { id: "MCO", name: "Colombia (MCO)", currency: "COP", flag: "🇨🇴" },
  { id: "MLM", name: "México (MLM)", currency: "MXN", flag: "🇲🇽" },
  { id: "MLA", name: "Argentina (MLA)", currency: "ARS", flag: "🇦🇷" },
  { id: "MLC", name: "Chile (MLC)", currency: "CLP", flag: "🇨🇱" },
  { id: "MPE", name: "Perú (MPE)", currency: "PEN", flag: "🇵🇪" },
  { id: "MLB", name: "Brasil (MLB)", currency: "BRL", flag: "🇧🇷" },
  { id: "MLU", name: "Uruguay (MLU)", currency: "UYU", flag: "🇺🇾" },
];
