import { Trans } from "@lingui/macro";
import useSWR from "swr";

import "./CryptoPriceTicker.css";

const PRICE_URL =
  "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin%2Cethereum%2Cgmx&vs_currencies=usd&include_24hr_change=true";

type CoinGeckoPrice = {
  usd?: number;
  usd_24h_change?: number;
};

type CoinGeckoResponse = Record<string, CoinGeckoPrice>;

const fetchPrices = async (url: string): Promise<CoinGeckoResponse> => {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Price request failed with status ${response.status}`);
  }

  return (await response.json()) as CoinGeckoResponse;
};

const assets = [
  { id: "bitcoin", symbol: "BTC" },
  { id: "ethereum", symbol: "ETH" },
  { id: "gmx", symbol: "GMX" },
];

function formatPrice(value?: number) {
  if (value === undefined) {
    return "--";
  }

  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value < 1 ? 4 : 2,
  }).format(value);
}

export function CryptoPriceTicker({ isCollapsed }: { isCollapsed: boolean | undefined }) {
  const { data, error, isLoading } = useSWR(PRICE_URL, fetchPrices, {
    refreshInterval: 60_000,
    revalidateOnFocus: true,
  });

  if (isCollapsed) {
    return null;
  }

  return (
    <section className="CryptoPriceTicker" aria-label="Live crypto prices">
      <div className="CryptoPriceTicker-heading">
        <span><Trans>Live prices</Trans></span>
        <span className="CryptoPriceTicker-dot" aria-hidden="true" />
      </div>

      {isLoading && <div className="CryptoPriceTicker-state"><Trans>Loading prices...</Trans></div>}
      {error && <div className="CryptoPriceTicker-state"><Trans>Prices unavailable</Trans></div>}

      {!isLoading && !error && (
        <div className="CryptoPriceTicker-list">
          {assets.map((asset) => {
            const price = data?.[asset.id];
            const change = price?.usd_24h_change;

            return (
              <div className="CryptoPriceTicker-row" key={asset.id}>
                <span className="CryptoPriceTicker-symbol">{asset.symbol}</span>
                <span className="CryptoPriceTicker-value">
                  <span>{formatPrice(price?.usd)}</span>
                  {change !== undefined && (
                    <span
                      className={
                        change >= 0
                          ? "CryptoPriceTicker-change is-positive"
                          : "CryptoPriceTicker-change is-negative"
                      }
                    >
                      {change >= 0 ? "+" : ""}
                      {change.toFixed(2)}%
                    </span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
