import { Trans, t } from "@lingui/macro";
import { useHeroStats } from "landing/pages/Home/hooks/useHeroStats";
import { shortFormat, shortFormatUsd } from "landing/pages/Home/utils/formatters";
import { CSSProperties, MouseEvent, useEffect, useRef, useState } from "react";

import IcGmxHeader from "img/ic_gmx_header.svg?react";

import { HomePageContextProvider } from "../Home/contexts/HomePageContext";
import { FaqSection } from "../Home/FaqSection/FaqSection";
import { RedirectChainIds, useGoToTrade } from "../Home/hooks/useGoToTrade";
import { LaunchSection } from "../Home/LaunchSection/LaunchSection";
import { LiqiuditySection } from "../Home/LiqiuditySection/LiqiuditySection";
import { RoadmapSection } from "../Home/RoadmapSection/RoadmapSection";
import { ProgramCards } from "../Home/SocialSection/ProgramCards";
import { SocialSection } from "../Home/SocialSection/SocialSection";
import { SponsorsSection } from "../Home/SponsorsSection/SponsorsSection";

import "./NewHomepage.css";

const featureCards = [
  {
    eyebrow: t`Trade`,
    title: t`Perpetuals with no expiry`,
    copy: t`Go long or short on crypto markets with deep liquidity and transparent pricing.`,
    action: t`Explore markets`,
    href: `${import.meta.env.VITE_APP_BASE_URL ?? ""}/trade`,
    tone: "blue",
  },
  {
    eyebrow: t`Earn`,
    title: t`Put your liquidity to work`,
    copy: t`Access real yield opportunities powered by trading activity across the protocol.`,
    action: t`View opportunities`,
    href: "/earn",
    tone: "green",
  },
  {
    eyebrow: t`Build`,
    title: t`Open infrastructure for builders`,
    copy: t`Compose on a battle-tested stack with docs, SDKs, and a growing ecosystem.`,
    action: t`Build with GMX`,
    href: "/builders",
    tone: "navy",
  },
];

// Placeholder values for layout purposes — replace with live market data.
const marketRows = [
  { symbol: "BTC", name: "Bitcoin", price: "$82,483", change: "+2.84%", up: true },
  { symbol: "ETH", name: "Ethereum", price: "$3,412", change: "+1.92%", up: true },
  { symbol: "SOL", name: "Solana", price: "$168.40", change: "-0.73%", up: false },
  { symbol: "LINK", name: "Chainlink", price: "$17.85", change: "+4.10%", up: true },
  { symbol: "ARB", name: "Arbitrum", price: "$0.92", change: "-1.38%", up: false },
];

/* ---------- motion helpers ---------- */

const prefersReducedMotion = () =>
  typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Sets a per-element transition delay used by the CSS reveal rules. */
const delay = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;

function smoothTo(e: MouseEvent, id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  e.preventDefault();
  el.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
}

/** Adds `is-visible` to every [data-reveal] element once it scrolls into view. */
function useReveal(rootRef: React.RefObject<HTMLElement>) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const els = root.querySelectorAll<HTMLElement>("[data-reveal]");

    if (prefersReducedMotion() || !("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("is-visible"));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [rootRef]);
}

/** Header state, scroll progress bar and parallax offsets — one rAF-throttled scroll listener. */
function useScrollEffects(rootRef: React.RefObject<HTMLElement>, progressRef: React.RefObject<HTMLDivElement>) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reduced = prefersReducedMotion();
    const parallaxEls = Array.from(root.querySelectorAll<HTMLElement>("[data-parallax]"));
    let raf = 0;

    const update = () => {
      raf = 0;
      const y = window.scrollY;
      setScrolled(y > 8);

      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (progressRef.current) {
        progressRef.current.style.transform = `scaleX(${max > 0 ? Math.min(y / max, 1) : 0})`;
      }

      if (!reduced) {
        parallaxEls.forEach((el) => {
          const rect = el.getBoundingClientRect();
          const offset = (rect.top + rect.height / 2 - window.innerHeight / 2) * -0.12;
          el.style.setProperty("--py", `${offset.toFixed(1)}px`);
        });
      }
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [rootRef, progressRef]);

  return scrolled;
}

/** Counts from 0 to `end` the first time it is visible. */
function CountUp({
  end,
  prefix = "",
  suffix = "",
  decimals = 0,
  duration = 1600,
}: {
  end: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [value, setValue] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion() || !("IntersectionObserver" in window)) {
      setValue(end);
      return;
    }

    let raf = 0;
    const run = () => {
      const start = performance.now();
      const tick = (now: number) => {
        const p = Math.min((now - start) / duration, 1);
        setValue(end * (1 - Math.pow(1 - p, 4))); // ease-out quart
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          run();
          io.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [end, duration]);

  return (
    <span ref={ref}>
      {prefix}
      {value.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
      {suffix}
    </span>
  );
}

export default function Homepage() {
  const goToTrade = useGoToTrade({
    buttonPosition: "HomepageHero",
    chainId: RedirectChainIds.Arbitum,
  });

  const rootRef = useRef<HTMLElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const scrolled = useScrollEffects(rootRef, progressRef);
  useReveal(rootRef);
  const { traders, openInterest, totalVolume } = useHeroStats();

  const traderCount = traders.summary.total === undefined ? "-" : shortFormat(Number(traders.summary.total));
  const openInterestValue = openInterest.summary.total === undefined ? "-" : shortFormatUsd(openInterest.summary.total);
  const totalVolumeValue = totalVolume.summary.total === undefined ? "-" : shortFormatUsd(totalVolume.summary.total);

  // 3D tilt + glare on the market panel (mouse only)
  const onPanelMove = (e: MouseEvent<HTMLDivElement>) => {
    if (prefersReducedMotion()) return;
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    el.classList.add("is-tilting");
    el.style.setProperty("--rx", `${((0.5 - y) * 10).toFixed(2)}deg`);
    el.style.setProperty("--ry", `${((x - 0.5) * 12).toFixed(2)}deg`);
    el.style.setProperty("--mx", `${(x * 100).toFixed(1)}%`);
    el.style.setProperty("--my", `${(y * 100).toFixed(1)}%`);
  };

  const onPanelLeave = (e: MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    el.classList.remove("is-tilting");
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  };

  return (
    <HomePageContextProvider>
      <main className="NewHomepage" ref={rootRef}>
        <header className={`NewHomepage-header${scrolled ? " is-scrolled" : ""}`}>
          <div className="NewHomepage-header-inner">
            <a href="/" aria-label="GMX home">
              <IcGmxHeader className="NewHomepage-logo" />
            </a>
            <nav className="NewHomepage-nav" aria-label="Main navigation">
              <a href="#markets" onClick={(e) => smoothTo(e, "markets")}>
                <Trans>Markets</Trans>
              </a>
              <a href="#protocol" onClick={(e) => smoothTo(e, "protocol")}>
                <Trans>Protocol</Trans>
              </a>
              <a href="#ecosystem" onClick={(e) => smoothTo(e, "ecosystem")}>
                <Trans>Ecosystem</Trans>
              </a>
              <a href="/legacy-home">
                <Trans>Original home</Trans>
              </a>
            </nav>
            <div className="NewHomepage-header-actions">
              <a href="https://docs.gmx.io/" rel="noreferrer" target="_blank">
                <Trans>Docs</Trans>
              </a>
              <button className="NewHomepage-button NewHomepage-button--small" onClick={goToTrade}>
                <Trans>Open app</Trans>
              </button>
            </div>
          </div>
          <div className="NewHomepage-progress" ref={progressRef} aria-hidden="true" />
        </header>

        {/* Hero */}
        <section className="NewHomepage-hero" aria-labelledby="homepage-title">
          <div className="NewHomepage-hero-copy">
            <h1 id="homepage-title">
              <span className="NewHomepage-rise">
                <Trans>Trade the future of markets.</Trans>
              </span>
            </h1>
            <p className="NewHomepage-hero-description" data-reveal="up" style={delay(250)}>
              <Trans>
                Trade crypto with deep liquidity, up to 100x leverage, and a protocol built for transparent onchain
                markets.
              </Trans>
            </p>
            <div className="NewHomepage-hero-actions" data-reveal="up" style={delay(380)}>
              <button className="NewHomepage-button NewHomepage-button--large" onClick={goToTrade}>
                <Trans>Start trading</Trans>
              </button>
              <a
                className="NewHomepage-button NewHomepage-button--ghost NewHomepage-button--large"
                href="#protocol"
                onClick={(e) => smoothTo(e, "protocol")}
              >
                <Trans>Explore GMX</Trans>
              </a>
            </div>
          </div>

          <div className="NewHomepage-hero-visual" data-reveal="right" style={delay(300)}>
            <div
              className="NewHomepage-market-panel"
              aria-label="Protocol highlights"
              onMouseMove={onPanelMove}
              onMouseLeave={onPanelLeave}
            >
              <div className="NewHomepage-market-panel-topline">
                <span>
                  <Trans>GMX markets</Trans>
                </span>
                <span className="NewHomepage-status">
                  <i /> <Trans>Live</Trans>
                </span>
              </div>
              <div className="NewHomepage-market-main">
                <span className="NewHomepage-market-symbol">BTC/USD</span>
                <strong>
                  <CountUp end={82483} prefix="$" duration={2000} />
                </strong>
                <span className="NewHomepage-positive">+2.84% 24h</span>
              </div>
              <div className="NewHomepage-chart" aria-hidden="true">
                {Array.from({ length: 12 }).map((_, i) => (
                  <span key={i} style={{ "--i": i } as CSSProperties} />
                ))}
              </div>
              <div className="NewHomepage-market-footer">
                <span>
                  <Trans>24h volume</Trans>
                  <strong>$1.02B</strong>
                </span>
                <span>
                  <Trans>Markets</Trans>
                  <strong>100+</strong>
                </span>
                <span>
                  <Trans>Networks</Trans>
                  <strong>6</strong>
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Price table */}
        <section className="NewHomepage-section NewHomepage-section--tight" id="markets">
          <div className="NewHomepage-section-heading" data-reveal="stagger">
            <h2>
              <Trans>Explore markets</Trans>
            </h2>
            <p>
              <Trans>Pick a market and open a position in seconds.</Trans>
            </p>
          </div>
          <div className="NewHomepage-table" role="table" aria-label="Markets">
            <div className="NewHomepage-table-row NewHomepage-table-row--head" role="row">
              <span role="columnheader">
                <Trans>Market</Trans>
              </span>
              <span role="columnheader">
                <Trans>Price</Trans>
              </span>
              <span role="columnheader">
                <Trans>24h</Trans>
              </span>
              <span role="columnheader" />
            </div>
            {marketRows.map((row, i) => (
              <div
                className="NewHomepage-table-row"
                role="row"
                key={row.symbol}
                data-reveal="up"
                style={delay(i * 80)}
              >
                <span className="NewHomepage-table-asset" role="cell">
                  <i className="NewHomepage-table-icon">{row.symbol[0]}</i>
                  <b>{row.name}</b>
                  <em>{row.symbol}</em>
                </span>
                <span role="cell">{row.price}</span>
                <span className={row.up ? "NewHomepage-positive" : "NewHomepage-negative"} role="cell">
                  {row.change}
                </span>
                <span role="cell">
                  <button className="NewHomepage-button NewHomepage-button--pill" onClick={goToTrade}>
                    <Trans>Trade</Trans>
                  </button>
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Blue stats band */}
        <section className="NewHomepage-trust" aria-label="Protocol stats">
          <div className="NewHomepage-trust-inner">
            <div data-reveal="up" style={delay(0)}>
              <strong>
                {traderCount}
              </strong>
              <span>
                <Trans>Traders</Trans>
              </span>
            </div>
            <div data-reveal="up" style={delay(120)}>
              <strong>
                {openInterestValue}
              </strong>
              <span>
                <Trans>Open interest</Trans>
              </span>
            </div>
            <div data-reveal="up" style={delay(240)}>
              <strong>
                {totalVolumeValue}
              </strong>
              <span>
                <Trans>Total volume</Trans>
              </span>
            </div>
            <div data-reveal="up" style={delay(360)}>
              <strong>
                <CountUp end={100} suffix="%" />
              </strong>
              <span>
                <Trans>Onchain transparency</Trans>
              </span>
            </div>
          </div>
        </section>

        {/* Alternating feature rows */}
        <section className="NewHomepage-section" id="protocol">
          <div className="NewHomepage-section-heading" data-reveal="stagger">
            <h2>
              <Trans>One protocol. Many ways to participate.</Trans>
            </h2>
          </div>
          <div className="NewHomepage-features">
            {featureCards.map((card, index) => {
              const reverse = index % 2 === 1;
              return (
                <div className={`NewHomepage-feature${reverse ? " NewHomepage-feature--reverse" : ""}`} key={card.title}>
                  <div className="NewHomepage-feature-text" data-reveal="stagger">
                    <p className="NewHomepage-feature-eyebrow">{card.eyebrow}</p>
                    <h3>{card.title}</h3>
                    <p className="NewHomepage-feature-copy">{card.copy}</p>
                    <div>
                      <a className="NewHomepage-button NewHomepage-button--large" href={card.href}>
                        {card.action}
                      </a>
                    </div>
                  </div>
                  <div
                    className={`NewHomepage-feature-visual NewHomepage-feature-visual--${card.tone}`}
                    aria-hidden="true"
                    data-reveal={reverse ? "clip-rev" : "clip"}
                  >
                    <span data-parallax>{card.eyebrow}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Blue CTA banner */}
        <section className="NewHomepage-ecosystem" id="ecosystem" data-reveal="scale">
          <div>
            <h2>
              <Trans>A market that stays yours.</Trans>
            </h2>
            <p>
              <Trans>
                GMX combines self-custody, transparent execution, and community-led governance into one open financial
                system.
              </Trans>
            </p>
          </div>
          <button className="NewHomepage-button NewHomepage-button--light NewHomepage-button--large" onClick={goToTrade}>
            <Trans>Enter the app</Trans>
          </button>
        </section>

        {/* Existing sections live on a dark band so their current styling stays legible */}
        <div className="NewHomepage-dark">
          <LaunchSection />
          <LiqiuditySection />
          <SponsorsSection />
          <section className="NewHomepage-community">
            <ProgramCards />
          </section>
          <FaqSection />
          <RoadmapSection />
          <SocialSection />
        </div>

        <footer className="NewHomepage-footer">
          <a href="/" aria-label="GMX home">
            <IcGmxHeader className="NewHomepage-logo" />
          </a>
          <span>
            <Trans>Built onchain. Owned by the community.</Trans>
          </span>
          <a href="/legacy-home">
            <Trans>Original GMX homepage</Trans>
          </a>
        </footer>
      </main>
    </HomePageContextProvider>
  );
}