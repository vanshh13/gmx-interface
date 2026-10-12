import { useEffect, useState } from "react";
import useSWR from "swr";

import { AppCard } from "components/AppCard/AppCard";
import AppPageLayout from "components/AppPageLayout/AppPageLayout";

import "./CryptoNews.css";

const NEWS_URL =
  "https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fwww.coindesk.com%2Farc%2Foutboundfeeds%2Frss%2F";
const NEWS_INITIAL_COUNT = 6;
const NEWS_PAGE_SIZE = 6;

type RssNewsItem = {
  guid?: string;
  title: string;
  pubDate: string;
  link: string;
  thumbnail?: string;
  description?: string;
  enclosure?: { link?: string };
};

type RssNewsResponse = {
  status?: string;
  items?: RssNewsItem[];
};

type CryptoNewsItem = {
  id: string;
  title: string;
  source: string;
  published_on: number;
  url: string;
  imageurl?: string;
  body?: string;
};

const fetchNews = async (url: string): Promise<CryptoNewsItem[]> => {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`News request failed with status ${response.status}`);
  }

  const result = (await response.json()) as RssNewsResponse;

  if (result.status !== "ok") {
    throw new Error("News response was not successful");
  }

  return (result.items ?? [])
    .map((item) => {
      const publishedAt = Date.parse(item.pubDate);

      return {
        id: item.guid ?? item.link,
        title: item.title,
        source: "CoinDesk",
        published_on: publishedAt / 1000,
        url: item.link,
        imageurl: item.thumbnail || item.enclosure?.link,
        body: item.description,
      };
    })
    .filter((item) => Number.isFinite(item.published_on) && Boolean(item.title) && Boolean(item.url))
    .sort((left, right) => right.published_on - left.published_on);
};

function formatPublishedTime(timestamp: number) {
  const publishedAt = new Date(timestamp * 1000);
  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - publishedAt.getTime()) / 1000));

  if (elapsedSeconds < 3600) {
    return `${Math.max(1, Math.floor(elapsedSeconds / 60))}m ago`;
  }

  if (elapsedSeconds < 86400) {
    return `${Math.floor(elapsedSeconds / 3600)}h ago`;
  }

  if (elapsedSeconds < 604800) {
    return `${Math.floor(elapsedSeconds / 86400)}d ago`;
  }

  return publishedAt.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function getSummary(body?: string) {
  if (!body) {
    return "Open the full story for the latest market context.";
  }

  const summary = body.replace(/\s+/g, " ").trim();
  return summary.length > 118 ? `${summary.slice(0, 118).trim()}...` : summary;
}

function getSafeExternalUrl(value?: string) {
  if (!value) {
    return undefined;
  }

  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

type CryptoNewsProps = {
  initialVisibleCount?: number;
  pageSize?: number;
  showViewAllLink?: boolean;
};

export function CryptoNews({
  initialVisibleCount = NEWS_INITIAL_COUNT,
  pageSize = NEWS_PAGE_SIZE,
  showViewAllLink = false,
}: CryptoNewsProps) {
  const [visibleCount, setVisibleCount] = useState(initialVisibleCount);
  const { data: news, error, isLoading } = useSWR(NEWS_URL, fetchNews, {
    refreshInterval: 5 * 60 * 1000,
    revalidateOnFocus: false,
  });

  useEffect(() => {
    setVisibleCount(initialVisibleCount);
  }, [initialVisibleCount, news]);

  const visibleNews = news?.slice(0, visibleCount) ?? [];
  const hasMoreNews = visibleCount < (news?.length ?? 0);

  return (
    <AppCard>
      <div className="CryptoNews-header">
        <div>
          <p className="CryptoNews-eyebrow">Market intelligence</p>
          <h2 className="text-h2 font-medium">Crypto news</h2>
        </div>
        <span className="CryptoNews-live-indicator">
          <span /> Live feed
        </span>
      </div>

      {isLoading && (
        <div className="CryptoNews-grid CryptoNews-grid--skeleton" role="status" aria-label="Loading the latest stories">
          {Array.from({ length: Math.min(initialVisibleCount, 6) }).map((_, index) => (
            <div className="CryptoNews-skeleton" key={index} />
          ))}
        </div>
      )}

      {error && (
        <div className="CryptoNews-state" role="alert">
          News is temporarily unavailable. Try refreshing in a moment.
        </div>
      )}

      {!isLoading && !error && news?.length === 0 && <div className="CryptoNews-state">No stories are available right now.</div>}

      {!!visibleNews.length && (
        <div className="CryptoNews-grid">
          {visibleNews.map((item) => (
            <a className="CryptoNews-story" href={getSafeExternalUrl(item.url)} key={item.id} rel="noopener noreferrer" target="_blank">
              {getSafeExternalUrl(item.imageurl) ? (
                <img
                  alt=""
                  className="CryptoNews-image"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  src={getSafeExternalUrl(item.imageurl)}
                />
              ) : (
                <div className="CryptoNews-image CryptoNews-image--empty" />
              )}
              <div className="CryptoNews-story-content">
                <div className="CryptoNews-meta">
                  <span>{item.source}</span>
                  <time dateTime={new Date(item.published_on * 1000).toISOString()}>
                    {formatPublishedTime(item.published_on)}
                  </time>
                </div>
                <h3>{item.title}</h3>
                <p>{getSummary(item.body)}</p>
                <span className="CryptoNews-read-more">Read story <span aria-hidden="true">↗</span></span>
              </div>
            </a>
          ))}
        </div>
      )}

      {!isLoading && !error && hasMoreNews && !showViewAllLink && (
        <div className="CryptoNews-actions">
          <button className="CryptoNews-load-more" onClick={() => setVisibleCount((count) => count + pageSize)}>
            Load more news
          </button>
        </div>
      )}

      {showViewAllLink && !isLoading && !error && news && news.length > initialVisibleCount && (
        <div className="CryptoNews-actions">
          <a className="CryptoNews-view-all" href="/news">View all news <span aria-hidden="true">↗</span></a>
        </div>
      )}
    </AppCard>
  );
}

export default function CryptoNewsPage() {
  return (
    <AppPageLayout title="Crypto News">
      <div className="default-container page-layout flex flex-col gap-20">
        <CryptoNews initialVisibleCount={NEWS_INITIAL_COUNT} pageSize={NEWS_PAGE_SIZE} />
      </div>
    </AppPageLayout>
  );
}