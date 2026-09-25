import { Page } from "@playwright/test";

export interface LinkInfo {
  text: string;
  href: string | null;
}

export interface ImageInfo {
  src: string;
  alt: string;
}

export interface NewsArticleBaseline {
  pageTitle: string;
  h1: string;
  breadcrumb: LinkInfo[];
  bodyText: string;
  images: ImageInfo[];
  allLinks: LinkInfo[];
  footerText: string;
  footerLinks: LinkInfo[];
  socialLinks: LinkInfo[];
}

export class NewsArticlePage {
  constructor(private page: Page) {}

     async goto(url: string): Promise<void> {
    await this.page.goto(url, { waitUntil: "domcontentloaded" });
    // EDS (Adobe Edge Delivery Services) pages load header/footer as
    // separate fragments fetched asynchronously, sometimes after other
    // content on the page. Waiting for one link isn't reliable (the
    // first links to appear may be in the body, not the header/footer).
    // Wait for network activity to settle instead.
    await this.page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
  }

  async extract(): Promise<NewsArticleBaseline> {
    return await this.page.evaluate(() => {
      function textOf(el: Element): string {
        return (el.textContent || "").replace(/\s+/g, " ").trim();
      }

      const pageTitle = document.title;

      const h1El = document.querySelector("h1");
      const h1 = h1El ? textOf(h1El) : "";

      const allLinks = Array.from(document.querySelectorAll("a[href]")).map((a) => ({
        text: textOf(a),
        href: a.getAttribute("href"),
      }));

      const fullText = (document.body.innerText || document.body.textContent || "").trim();
      let bodyText = "";
      if (h1) {
        const h1Idx = fullText.indexOf(h1);
        if (h1Idx !== -1) {
          const afterH1 = h1Idx + h1.length;
          const relatedIdx = fullText.toLowerCase().indexOf("related articles", afterH1);
          const end = relatedIdx !== -1 ? relatedIdx : fullText.length;
          bodyText = fullText.slice(afterH1, end).trim();
        }
      }

      const images: { src: string; alt: string }[] = [];
      if (h1El) {
        const headingCandidates = Array.from(
          document.querySelectorAll("h1, h2, h3, h4, h5, h6")
        );
        const relatedHeading = headingCandidates.find((el) =>
          /related articles/i.test(el.textContent || "")
        );

        const allImgs = Array.from(document.querySelectorAll("img"));
        for (const img of allImgs) {
          const afterH1 =
            (h1El.compareDocumentPosition(img) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
          const beforeRelated = relatedHeading
            ? (img.compareDocumentPosition(relatedHeading) &
                Node.DOCUMENT_POSITION_FOLLOWING) !==
              0
            : true;
          if (afterH1 && beforeRelated) {
            images.push({
              src: img.getAttribute("src") || "",
              alt: img.getAttribute("alt") || "",
            });
          }
        }
      }

      let breadcrumb: { text: string; href: string | null }[] = [];
      if (h1El) {
                const homeLinks = Array.from(
          document.querySelectorAll(
            'a[href="/en/home.html"], a[href$="/home.html"], a[href="/en/home"], a[href$="/home"]'
          )
        );
        const beforeH1 = homeLinks.filter(
          (a) => (a.compareDocumentPosition(h1El) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0
        );
        const homeLink = beforeH1[beforeH1.length - 1];

        if (homeLink) {
          let container: Element | null = homeLink.parentElement;
          let steps = 0;
          while (container && steps < 6 && !(container.textContent || "").includes(h1)) {
            container = container.parentElement;
            steps++;
          }
          if (container) {
            const items = container.querySelectorAll("a[href], li");
            breadcrumb = Array.from(items).map((node) => {
              const a = node.tagName === "A" ? node : node.querySelector("a[href]");
              return {
                text: textOf(node),
                href: a ? a.getAttribute("href") : null,
              };
            });
          }
        }
      }

      let footerText = "";
      let footerLinks: { text: string; href: string | null }[] = [];
      const allNodes = Array.from(document.querySelectorAll("body *"));
      const copyrightNode = allNodes.find(
        (n) => /all rights reserved/i.test(n.textContent || "") && n.children.length === 0
      );
      if (copyrightNode) {
        let container: Element | null = copyrightNode.parentElement;
        let steps = 0;
        while (container && steps < 8) {
          const t = container.textContent || "";
          if (/careers/i.test(t) && /keep up with us/i.test(t)) {
            break;
          }
          container = container.parentElement;
          steps++;
        }
        if (container) {
          footerText = textOf(container);
          footerLinks = Array.from(container.querySelectorAll("a[href]")).map((a) => ({
            text: textOf(a),
            href: a.getAttribute("href"),
          }));
        }
      }

      const socialDomains = ["facebook.com", "instagram.com", "linkedin.com"];
      const socialLinks = footerLinks.filter((l) =>
        socialDomains.some((d) => (l.href || "").includes(d))
      );

      return {
        pageTitle,
        h1,
        breadcrumb,
        bodyText,
        images,
        allLinks,
        footerText,
        footerLinks,
        socialLinks,
      };
    });
  }
}