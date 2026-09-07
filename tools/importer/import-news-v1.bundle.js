/* eslint-disable */
var CustomImportScript = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // tools/importer/import-news-v1.js
  var import_news_v1_exports = {};
  __export(import_news_v1_exports, {
    default: () => import_news_v1_default
  });

  // tools/importer/transformers/ustafoundation-cleanup.js
  var TransformHook = { beforeTransform: "beforeTransform", afterTransform: "afterTransform" };
  function transform(hookName, element, payload) {
    if (hookName === TransformHook.afterTransform) {
      element.querySelectorAll(".cmp-experiencefragment--header, .cmp-experiencefragment--footer").forEach((cmp) => {
        const wrapper = cmp.closest(".experiencefragment");
        (wrapper || cmp).remove();
      });
      WebImporter.DOMUtils.remove(element, [
        ".header",
        ".top-navigation",
        "nav.navigation-menu",
        ".breadcrumb",
        "#searchAndLocationPanelSwitch"
      ]);
      WebImporter.DOMUtils.remove(element, [
        "#destination_publishing_iframe_usta_0",
        "#XVRCGAHD"
      ]);
      WebImporter.DOMUtils.remove(element, [
        "noscript",
        "link",
        "meta",
        "style"
      ]);
      element.querySelectorAll("a").forEach((a) => {
        const href = (a.getAttribute("href") || "").trim();
        const text = (a.textContent || "").trim();
        if (href === "about:blank" || href.startsWith("about:") || href === "" || href === "#" || text === "_hjSafeContext") {
          const wrapper = a.closest("p");
          if (wrapper && (wrapper.textContent || "").trim() === text) {
            wrapper.remove();
          } else {
            a.remove();
          }
        }
      });
    }
  }

  // tools/importer/transformers/ustafoundation-sections.js
  var TransformHook2 = { beforeTransform: "beforeTransform", afterTransform: "afterTransform" };
  var SECTION_BANDS = {
    "Impact Nationwide Feature": [{ color: "cards-band-bg", height: "17px" }],
    "Support Cards": [{ color: "cards-band-bg", height: "17px" }]
  };
  var TRAILING_BANDS = [{ color: "stats-band-bg", height: "17px" }];
  function createSpacerBlock(document, band) {
    return WebImporter.Blocks.createBlock(document, {
      name: "Spacer",
      cells: { color: band.color, desktop: band.height }
    });
  }
  function insertSpacerSection(document, parent, ref, band) {
    const hr = document.createElement("hr");
    const spacer = createSpacerBlock(document, band);
    parent.insertBefore(hr, ref);
    parent.insertBefore(spacer, ref);
  }
  function findSectionEl(element, selector) {
    if (!selector) return null;
    let el = null;
    try {
      el = element.querySelector(selector);
    } catch (e) {
      el = null;
    }
    if (!el && element.ownerDocument) {
      try {
        el = element.ownerDocument.querySelector(selector);
      } catch (e) {
        el = null;
      }
    }
    return el;
  }
  function transform2(hookName, element, payload) {
    if (hookName === TransformHook2.beforeTransform) {
      const sections = payload && payload.template && payload.template.sections || [];
      if (sections.length < 2) return;
      const document = element.ownerDocument;
      const lastSection = sections[sections.length - 1];
      const lastEl = findSectionEl(element, lastSection.selector);
      if (lastEl) {
        for (let b = TRAILING_BANDS.length - 1; b >= 0; b -= 1) {
          const ref = lastEl.nextSibling;
          const hr = document.createElement("hr");
          const spacer = createSpacerBlock(document, TRAILING_BANDS[b]);
          lastEl.parentNode.insertBefore(spacer, ref);
          lastEl.parentNode.insertBefore(hr, spacer);
        }
      }
      for (let i = sections.length - 1; i >= 0; i -= 1) {
        const section = sections[i];
        const sectionEl = findSectionEl(element, section.selector);
        if (!sectionEl) continue;
        if (section.style) {
          const metaBlock = WebImporter.Blocks.createBlock(document, {
            name: "Section Metadata",
            cells: { style: section.style }
          });
          sectionEl.parentNode.insertBefore(metaBlock, sectionEl.nextSibling);
        }
        if (i > 0) {
          const hr = document.createElement("hr");
          sectionEl.parentNode.insertBefore(hr, sectionEl);
        }
        const bands = SECTION_BANDS[section.name];
        if (bands && i > 0) {
          for (let b = bands.length - 1; b >= 0; b -= 1) {
            insertSpacerSection(document, sectionEl.parentNode, sectionEl.previousSibling || sectionEl, bands[b]);
          }
        }
      }
    }
  }

  // tools/importer/import-news-v1.js
  var PAGE_TEMPLATE = {
    name: "news",
    description: "USTA Foundation news article: H1 headline + rich-text body (with inline image + caption), a right-aligned social share bar, and a Related Articles cards feed.",
    // The article body is default content; social + related are re-authored blocks.
    blocks: [],
    // Single section — the article. Section metadata sets the template.
    sections: []
  };
  var resolvedPublicationDate = "";
  var MONTH_NAMES = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December"
  ];
  function formatIsoDate(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
    if (!m) return "";
    const name = MONTH_NAMES[parseInt(m[2], 10) - 1];
    return name ? `${name} ${m[3]}, ${m[1]}` : "";
  }
  function normPath(p) {
    return (p || "").replace(/\.html?$/, "").replace(/\/$/, "");
  }
  var transformers = [
    transform,
    ...PAGE_TEMPLATE.sections && PAGE_TEMPLATE.sections.length > 1 ? [transform2] : []
  ];
  function executeTransformers(hookName, element, payload) {
    const enhancedPayload = { ...payload, template: PAGE_TEMPLATE };
    transformers.forEach((transformerFn) => {
      try {
        transformerFn.call(null, hookName, element, enhancedPayload);
      } catch (e) {
        console.error(`Transformer failed at ${hookName}:`, e);
      }
    });
  }
  function buildSocialBlock(document) {
    return WebImporter.DOMUtils.createTable([
      ["Social (right)"],
      [""]
    ], document);
  }
  function buildRelatedBlock(document, ul) {
    const rows = [["Cards (news)"]];
    ul.querySelectorAll(":scope > li").forEach((li) => {
      const card = li.querySelector('[role="group"]') || li;
      const titleH = card.querySelector("h3, h2, h4");
      let title = titleH ? titleH.textContent.trim() : "";
      if (!title) {
        const labels = [
          ...[...card.querySelectorAll("[aria-label]")].map((a) => a.getAttribute("aria-label")),
          ...[...card.querySelectorAll("img[alt]")].map((i) => i.getAttribute("alt"))
        ];
        const labelled = labels.find((l) => /^visit the .+ page$/i.test((l || "").trim()));
        if (labelled) title = labelled.trim().replace(/^visit the\s+/i, "").replace(/\s+page$/i, "").trim();
      }
      const links = [...card.querySelectorAll("a")];
      const readMore = links.find((a) => /read more/i.test(a.textContent));
      const titleLink = titleH ? titleH.closest("a") : null;
      const imgLink = card.querySelector("a:has(img), a > img") ? card.querySelector("a") : null;
      const href = (titleLink || imgLink || readMore || {}).getAttribute ? (titleLink || imgLink || readMore).getAttribute("href") : "#";
      const dateEl = [...card.querySelectorAll("*")].find((e) => e.children.length === 0 && /^[A-Z][a-z]+ \d{1,2}, \d{4}$/.test((e.textContent || "").trim()));
      const date = dateEl ? dateEl.textContent.trim() : "";
      let desc = "";
      if (readMore) {
        const descHost = readMore.parentElement;
        const clone = descHost.cloneNode(true);
        clone.querySelectorAll("a").forEach((a) => a.remove());
        desc = (clone.textContent || "").trim();
      }
      const srcImg = card.querySelector("img");
      let picture = null;
      if (srcImg) {
        const realSrc = srcImg.getAttribute("src") || srcImg.getAttribute("data-src");
        if (realSrc) {
          picture = document.createElement("img");
          picture.setAttribute("src", new URL(realSrc, "https://www.ustafoundation.com").href);
          picture.setAttribute("alt", srcImg.getAttribute("title") || srcImg.getAttribute("alt") || title);
        }
      }
      if (!title && !href) return;
      const imageCell = document.createElement("div");
      if (picture) imageCell.append(picture);
      const bodyCell = document.createElement("div");
      const h3 = document.createElement("h3");
      h3.textContent = title;
      bodyCell.append(h3);
      if (date) {
        const d = document.createElement("p");
        d.textContent = date;
        bodyCell.append(d);
      }
      if (desc) {
        const de = document.createElement("p");
        de.textContent = desc;
        bodyCell.append(de);
      }
      const rm = document.createElement("p");
      const rmA = document.createElement("a");
      rmA.setAttribute("href", href || "#");
      rmA.textContent = "Read More";
      rm.append(rmA);
      bodyCell.append(rm);
      rows.push([imageCell, bodyCell]);
    });
    return WebImporter.DOMUtils.createTable(rows, document);
  }
  function wrapMediaColumns(document, root) {
    const bodyImg = [...root.querySelectorAll("img, picture")].find((el) => {
      if (el.closest("ul")) return false;
      const alt = el.getAttribute("alt") || el.querySelector?.("img")?.getAttribute("alt") || "";
      return !/facebook|twitter|linkedin|copy|print|checkmark/i.test(alt);
    });
    if (!bodyImg) return false;
    const imgP = bodyImg.closest("p") || bodyImg.parentElement;
    if (!imgP) return false;
    let captionText = "";
    const wrapClone = imgP.cloneNode(true);
    wrapClone.querySelectorAll("picture, img").forEach((n) => n.remove());
    captionText = (wrapClone.textContent || "").trim();
    if (!captionText) {
      const nx = imgP.nextElementSibling;
      if (nx && nx.tagName === "P" && !nx.querySelector("picture, img")) {
        captionText = (nx.textContent || "").trim();
        if (captionText) nx.remove();
      }
    }
    const beforeImg = (el) => !!(bodyImg.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_PRECEDING);
    let textEls = [];
    const prevGroup = imgP.previousElementSibling;
    if (prevGroup) {
      const groupParas = [...prevGroup.querySelectorAll("p")].filter((p) => (p.textContent || "").trim() && !p.querySelector("picture, img"));
      if (prevGroup.tagName === "P" && (prevGroup.textContent || "").trim()) textEls = [prevGroup];
      else if (groupParas.length) textEls = groupParas;
    }
    if (!textEls.length) {
      const allTextP = [...root.querySelectorAll("p")].filter((p) => (p.textContent || "").trim() && !p.querySelector("picture, img") && !p.closest("ul") && beforeImg(p));
      textEls = allTextP.slice(-2);
    }
    if (!textEls.length) return false;
    const textCell = document.createElement("div");
    textEls.forEach((el) => textCell.append(el.cloneNode(true)));
    const mediaCell = document.createElement("div");
    const pic = bodyImg.tagName === "PICTURE" ? bodyImg : bodyImg.closest("picture") || bodyImg;
    mediaCell.append(pic.cloneNode(true));
    if (captionText) {
      const cap = document.createElement("p");
      const em = document.createElement("em");
      em.textContent = captionText;
      cap.append(em);
      mediaCell.append(cap);
    }
    const table = WebImporter.DOMUtils.createTable([
      ["Columns (media-right)"],
      [textCell, mediaCell]
    ], document);
    imgP.replaceWith(table);
    textEls.forEach((el) => el.remove());
    return true;
  }
  var import_news_v1_default = {
    // Runs in-page BEFORE transform. Resolve this article's publication date from
    // the site sitemap (<lastmod>), matched by pathname. Same-origin fetch, awaited
    // by the runner. Best-effort: on any failure the date is simply omitted.
    onLoad: async ({ document }) => {
      resolvedPublicationDate = "";
      try {
        const here = normPath(document.location.pathname);
        const res = await fetch("/sitemap.xml", { credentials: "omit" });
        if (!res.ok) return;
        const xml = await res.text();
        const entries = [...xml.matchAll(/<loc>([^<]+)<\/loc>\s*(?:<lastmod>([^<]+)<\/lastmod>)?/gi)];
        const match = entries.find((e) => {
          try {
            return normPath(new URL(e[1]).pathname) === here;
          } catch {
            return false;
          }
        });
        if (match && match[2]) resolvedPublicationDate = formatIsoDate(match[2].trim());
      } catch (e) {
      }
    },
    transform: ({ document, url, params }) => {
      const main = document.querySelector("#mainContent") || document.querySelector("main") || document.body;
      const descP = [...main.querySelectorAll("p")].find((p) => {
        if (p.querySelector("picture, img, a[href]") && (p.textContent || "").trim().length < 60) return false;
        if (p.closest("ul")) return false;
        return (p.textContent || "").trim().length >= 40;
      });
      const metaDescription = descP ? (descP.textContent || "").trim().replace(/\s+/g, " ") : "";
      const heroImg = [...main.querySelectorAll("img, picture")].find((el) => {
        if (el.closest("ul")) return false;
        const alt = el.getAttribute("alt") || el.querySelector?.("img")?.getAttribute("alt") || "";
        return !/facebook|twitter|linkedin|copy|print|checkmark/i.test(alt);
      });
      let metaImage = null;
      if (heroImg) {
        const imgEl = heroImg.tagName === "IMG" ? heroImg : heroImg.querySelector("img");
        const rawSrc = imgEl && (imgEl.getAttribute("src") || imgEl.getAttribute("data-src"));
        if (rawSrc) {
          metaImage = document.createElement("img");
          metaImage.setAttribute("src", new URL(rawSrc, "https://www.ustafoundation.com").href);
          metaImage.setAttribute("alt", (imgEl.getAttribute("alt") || "").trim());
        }
      }
      executeTransformers("beforeTransform", main, { url, params });
      executeTransformers("afterTransform", main, { url, params });
      wrapMediaColumns(document, main);
      const labelText = (el) => `${el.getAttribute && el.getAttribute("aria-label") || ""} ${el.getAttribute && el.getAttribute("alt") || ""}`.toLowerCase();
      const hasShareLabels = (el) => {
        const all = [el, ...el.querySelectorAll("a, img")].map(labelText).join(" ");
        return all.includes("facebook") && all.includes("linkedin") && (all.includes("copy link") || all.includes("print"));
      };
      const shareCandidates = [...main.querySelectorAll("div, p, span, ul")].filter(hasShareLabels);
      const shareEl = shareCandidates.sort((a, b) => a.querySelectorAll("*").length - b.querySelectorAll("*").length)[0];
      if (shareEl) {
        const scope = shareEl.parentElement || main;
        [...scope.querySelectorAll("p, span, div")].forEach((n) => {
          const t = (n.textContent || "").trim().toLowerCase();
          if (t === "link copied!" && n !== shareEl) n.remove();
        });
        scope.querySelectorAll('img[alt=""]').forEach((img) => {
          const src = (img.getAttribute("src") || "").toLowerCase();
          if (src.includes("checkmark")) {
            const wrap = img.closest("p, span, div");
            if (wrap && wrap !== shareEl) wrap.remove();
          }
        });
        shareEl.replaceWith(buildSocialBlock(document));
      }
      const relatedHeading = [...main.querySelectorAll("h2")].find((h) => /related articles/i.test(h.textContent));
      const relatedUl = relatedHeading ? [...main.querySelectorAll("ul")].find((ul) => ul.querySelector('li a[href*="/news/"], li a[href]')) : null;
      if (relatedUl) {
        relatedUl.replaceWith(buildRelatedBlock(document, relatedUl));
      }
      main.appendChild(document.createElement("hr"));
      WebImporter.rules.createMetadata(main, document);
      const metaTable = [...main.querySelectorAll("table")].find((t) => {
        const first = t.querySelector("th, td");
        return first && /metadata/i.test(first.textContent);
      });
      const hasRow = (key) => !!metaTable && [...metaTable.querySelectorAll("tr")].some((tr) => /^(td|th)$/i.test(tr.firstElementChild?.tagName || "") && (tr.firstElementChild.textContent || "").trim().toLowerCase() === key.toLowerCase());
      const addMetaRow = (key, value) => {
        if (!metaTable || !value || hasRow(key)) return;
        const tr = document.createElement("tr");
        const k = document.createElement("td");
        k.textContent = key;
        const v = document.createElement("td");
        if (typeof value === "string") v.textContent = value;
        else v.append(value);
        tr.append(k, v);
        metaTable.querySelector("tbody")?.append(tr) || metaTable.append(tr);
      };
      addMetaRow("Description", metaDescription);
      addMetaRow("Image", metaImage);
      addMetaRow("Template", "news");
      addMetaRow("Publication Date", params?.publicationDate || resolvedPublicationDate);
      WebImporter.rules.transformBackgroundImages(main, document);
      WebImporter.rules.adjustImageUrls(main, url, params.originalURL);
      const rawPath = new URL(params.originalURL).pathname.replace(/\/$/, "").replace(/\.html?$/, "");
      const path = WebImporter.FileUtils.sanitizePath(rawPath === "" ? "/index" : rawPath);
      return [{
        element: main,
        path,
        report: {
          title: document.title,
          template: PAGE_TEMPLATE.name,
          blocks: ["social", "cards-news"]
        }
      }];
    }
  };
  return __toCommonJS(import_news_v1_exports);
})();
