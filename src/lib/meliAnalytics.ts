import { CompetitionMetrics, MeliProduct } from "@/types/meli";

export function calculateCompetitionMetrics(
  products: MeliProduct[],
  defaultCurrency = "COP"
): CompetitionMetrics {
  if (!products || products.length === 0) {
    return {
      totalCompetitors: 0,
      minPrice: 0,
      maxPrice: 0,
      avgPrice: 0,
      medianPrice: 0,
      currencyId: defaultCurrency,
      freeShippingCount: 0,
      freeShippingPercentage: 0,
      fullShippingCount: 0,
      fullShippingPercentage: 0,
      topSellers: [],
      priceRangeDistribution: [],
    };
  }

  const prices = products
    .map((p) => p.price)
    .filter((price) => typeof price === "number" && !isNaN(price))
    .sort((a, b) => a - b);

  const currencyId = products[0]?.currency_id || defaultCurrency;
  const minPrice = prices.length > 0 ? prices[0] : 0;
  const maxPrice = prices.length > 0 ? prices[prices.length - 1] : 0;
  const sumPrice = prices.reduce((acc, curr) => acc + curr, 0);
  const avgPrice = prices.length > 0 ? Math.round(sumPrice / prices.length) : 0;

  let medianPrice = 0;
  if (prices.length > 0) {
    const mid = Math.floor(prices.length / 2);
    medianPrice =
      prices.length % 2 !== 0
        ? prices[mid]
        : Math.round((prices[mid - 1] + prices[mid]) / 2);
  }

  // Envíos
  const freeShippingCount = products.filter(
    (p) => p.shipping?.free_shipping
  ).length;
  const freeShippingPercentage = Math.round(
    (freeShippingCount / products.length) * 100
  );

  const fullShippingCount = products.filter(
    (p) => p.shipping?.logistic_type === "fulfillment"
  ).length;
  const fullShippingPercentage = Math.round(
    (fullShippingCount / products.length) * 100
  );

  // Top Sellers
  const sellerCounts: Record<string, number> = {};
  products.forEach((p) => {
    const seller = p.seller?.nickname || `Vendedor #${p.seller?.id || "Desc"}`;
    sellerCounts[seller] = (sellerCounts[seller] || 0) + 1;
  });

  const topSellers = Object.entries(sellerCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Rangos de precio (Gamas: Económica, Media, Alta)
  const rangeStep = (maxPrice - minPrice) / 3;
  let priceRangeDistribution = [];
  if (rangeStep > 0) {
    const lowLimit = minPrice + rangeStep;
    const midLimit = minPrice + rangeStep * 2;

    const lowCount = prices.filter((p) => p <= lowLimit).length;
    const midCount = prices.filter((p) => p > lowLimit && p <= midLimit).length;
    const highCount = prices.filter((p) => p > midLimit).length;

    priceRangeDistribution = [
      { range: `Económica (< ${formatCurrency(lowLimit, currencyId)})`, count: lowCount },
      { range: `Media (${formatCurrency(lowLimit, currencyId)} - ${formatCurrency(midLimit, currencyId)})`, count: midCount },
      { range: `Alta (> ${formatCurrency(midLimit, currencyId)})`, count: highCount },
    ];
  } else {
    priceRangeDistribution = [
      { range: `Precio estándar (${formatCurrency(minPrice, currencyId)})`, count: prices.length },
    ];
  }

  return {
    totalCompetitors: products.length,
    minPrice,
    maxPrice,
    avgPrice,
    medianPrice,
    currencyId,
    freeShippingCount,
    freeShippingPercentage,
    fullShippingCount,
    fullShippingPercentage,
    topSellers,
    priceRangeDistribution,
  };
}

export function formatCurrency(amount: number, currency = "COP"): string {
  try {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: currency === "COP" || currency === "ARS" || currency === "MXN" || currency === "CLP" ? currency : "USD",
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `$${amount.toLocaleString()}`;
  }
}
