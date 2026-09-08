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
  function buildSocialBlock(document, align) {
    const variant = align === "right" ? "Social (right)" : "Social (left)";
    return WebImporter.DOMUtils.createTable([
      [variant],
      [""]
    ], document);
  }
  function buildReactionsBlock(document) {
    return WebImporter.DOMUtils.createTable([
      ["Custom Widget Reactions"],
      ["Reactions"],
      ["Be the first to add a reaction"]
    ], document);
  }
  function buildTweetBlock(document, blockquote) {
    const paras = [...blockquote.querySelectorAll(":scope > p")];
    const bodyCell = document.createElement("div");
    paras.forEach((p) => bodyCell.append(p.cloneNode(true)));
    const footerP = document.createElement("p");
    const lastP = paras[paras.length - 1] || null;
    let started = !lastP;
    blockquote.childNodes.forEach((node) => {
      if (node === lastP) {
        started = true;
        return;
      }
      if (!started) return;
      footerP.append(node.cloneNode(true));
    });
    const footerCell = document.createElement("div");
    if ((footerP.textContent || "").trim()) footerCell.append(footerP);
    const rows = [["Quote (tweet)"], [bodyCell]];
    if (footerCell.childNodes.length) rows.push([footerCell]);
    return WebImporter.DOMUtils.createTable(rows, document);
  }
  function buildInstagramBlock(document, rawPermalink) {
    let permalink = rawPermalink || "";
    try {
      const u = new URL(permalink);
      permalink = `${u.origin}${u.pathname}`;
    } catch {
    }
    if (!permalink) return null;
    const cell = document.createElement("div");
    const a = document.createElement("a");
    a.setAttribute("href", permalink);
    a.textContent = "View this post on Instagram";
    cell.append(a);
    return WebImporter.DOMUtils.createTable([
      ["Embed Instagram"],
      [cell]
    ], document);
  }
  function instaPermalinkFrom(url) {
    const m = /instagram\.com\/p\/([A-Za-z0-9_-]+)/.exec(url || "");
    return m ? `https://www.instagram.com/p/${m[1]}/` : "";
  }
  function isHiddenDup(el) {
    if (!el.getBoundingClientRect) return false;
    const r = el.getBoundingClientRect();
    return r.width === 0 && r.height === 0;
  }
  function wrapTweetSections(document, root) {
    let built = 0;
    [...root.querySelectorAll("blockquote.twitter-tweet")].forEach((bq) => {
      if (isHiddenDup(bq)) {
        bq.remove();
        return;
      }
      const tweetCol = bq.closest('[class*="GridColumn--default--5"], [class*="GridColumn--default--6"], [class*="GridColumn--default--7"]');
      if (!tweetCol || !tweetCol.parentElement) return;
      const sibs = [...tweetCol.parentElement.children].filter((c) => c.className && /GridColumn--default--\d+/.test(c.className));
      const idx = sibs.indexOf(tweetCol);
      const textCol = [sibs[idx + 1], sibs[idx - 1]].find((c) => c && !c.querySelector("blockquote, iframe, picture, img") && (c.textContent || "").trim().length > 20 && !/GridColumn--default--12/.test(c.className));
      if (!textCol) return;
      const tweetBlock = buildTweetBlock(document, bq);
      const frag = document.createElement("div");
      frag.append(document.createElement("hr"));
      frag.append(tweetBlock);
      const t = textCol.cloneNode(true);
      while (t.firstChild) frag.append(t.firstChild);
      const meta = WebImporter.Blocks.createBlock(document, {
        name: "Section Metadata",
        cells: { style: "split-left" }
      });
      frag.append(meta);
      frag.append(document.createElement("hr"));
      tweetCol.replaceWith(...frag.childNodes);
      textCol.remove();
      built += 1;
    });
    return built;
  }
  function wrapEmbeds(document, root) {
    root.querySelectorAll("blockquote.twitter-tweet").forEach((bq) => {
      if (isHiddenDup(bq)) {
        bq.remove();
        return;
      }
      bq.replaceWith(buildTweetBlock(document, bq));
    });
    root.querySelectorAll("blockquote.instagram-media").forEach((bq) => {
      const permalink = bq.getAttribute("data-instgrm-permalink") || (bq.querySelector('a[href*="instagram.com/p/"]') || {}).getAttribute?.("href") || "";
      const block = buildInstagramBlock(document, instaPermalinkFrom(permalink) || permalink);
      if (block) bq.replaceWith(block);
      else bq.remove();
    });
    root.querySelectorAll('iframe[src*="instagram.com/p/"]').forEach((iframe) => {
      const permalink = instaPermalinkFrom(iframe.getAttribute("src"));
      const block = buildInstagramBlock(document, permalink);
      if (!block) {
        return;
      }
      let target = iframe;
      let parent = iframe.parentElement;
      while (parent && parent !== root && parent.querySelectorAll("iframe, img, p").length <= 1 && (parent.textContent || "").trim().length < 5) {
        target = parent;
        parent = parent.parentElement;
      }
      target.replaceWith(block);
    });
  }
  function buildRelatedBlock(document, ul) {
    const rows = [["Cards (news)"]];
    ul.querySelectorAll(":scope > li").forEach((li) => {
      const card = li.querySelector('[role="group"]') || li;
      const titleH = card.querySelector('h3, h2, h4, [role="heading"], .list-core-component__title');
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
  function buildVideoEmbedBlock(document, ytUrl) {
    const linkCell = document.createElement("div");
    const a = document.createElement("a");
    a.setAttribute("href", ytUrl);
    a.textContent = "YouTube video";
    linkCell.append(a);
    const consentCell = document.createElement("div");
    const p = document.createElement("p");
    p.textContent = "This video requires Social Media cookies to be accepted. Please update your cookie preferences to watch.";
    consentCell.append(p);
    return WebImporter.DOMUtils.createTable([
      ["Video Embed"],
      [linkCell],
      [consentCell]
    ], document);
  }
  function wrapVideoSections(document, root) {
    let built = 0;
    const ytIframes = [...root.querySelectorAll("iframe")].filter((f) => /youtube\.com|youtu\.be/.test(f.getAttribute("data-src") || f.getAttribute("src") || ""));
    ytIframes.forEach((iframe) => {
      const ytUrl = iframe.getAttribute("data-src") || iframe.getAttribute("src");
      const vidCol = iframe.closest('[class*="GridColumn--default--6"]') || iframe.closest('[class*="GridColumn"]');
      if (!vidCol || !vidCol.parentElement) return;
      const grid = vidCol.parentElement;
      const cols = [...grid.children];
      const vi = cols.indexOf(vidCol);
      const textCol = vi > 0 ? cols[vi - 1] : null;
      const videoBlock = buildVideoEmbedBlock(document, ytUrl);
      const frag = document.createElement("div");
      const before = document.createElement("hr");
      frag.append(before);
      if (textCol) {
        const t = textCol.cloneNode(true);
        while (t.firstChild) frag.append(t.firstChild);
      }
      frag.append(videoBlock);
      const meta = WebImporter.Blocks.createBlock(document, {
        name: "Section Metadata",
        cells: { style: "split-right" }
      });
      frag.append(meta);
      frag.append(document.createElement("hr"));
      vidCol.replaceWith(...frag.childNodes);
      if (textCol) textCol.remove();
      built += 1;
    });
    return built;
  }
  function wrapDataTables(document, root) {
    let built = 0;
    const headerOf = (col) => {
      const b = col.querySelector("b, strong");
      const t = b ? (b.textContent || "").trim() : "";
      const firstLine = (col.textContent || "").trim().split("\n")[0].trim();
      return t && t.length <= 40 && firstLine.startsWith(t) ? t : "";
    };
    const grids = [...root.querySelectorAll(".aem-Grid")];
    grids.forEach((grid) => {
      const textCols = [...grid.children].filter((c) => c.classList && c.classList.contains("text"));
      let cols = null;
      for (let i = 0; i < textCols.length - 1; i += 1) {
        if (headerOf(textCols[i]) && headerOf(textCols[i + 1])) {
          cols = [textCols[i], textCols[i + 1]];
          break;
        }
      }
      if (!cols) return;
      const h1 = headerOf(cols[0]);
      const h2 = headerOf(cols[1]);
      if (!h1 || !h2) return;
      const bodyParas = (col, header) => {
        const textHost = col.querySelector(".cmp-text") || col;
        return [...textHost.querySelectorAll("p")].filter((p) => {
          if (p.querySelector("picture, img")) return true;
          const t = (p.textContent || "").replace(/[\s\u00a0]/g, "");
          return t && (p.textContent || "").trim() !== header;
        });
      };
      const isGroupHeader = (p) => {
        const t = (p.textContent || "").trim();
        return t.length <= 40 && /(\band under\b|\band over\b|\bdivision\b|\bcategory\b|\bboys\b|\bgirls\b|\b\d+s\b)/i.test(t);
      };
      const leftParas = bodyParas(cols[0], h1);
      const rightParas = bodyParas(cols[1], h2);
      const leftGroups = [];
      leftParas.forEach((p) => {
        if (isGroupHeader(p) || !leftGroups.length) leftGroups.push([]);
        leftGroups[leftGroups.length - 1].push(p);
      });
      const nGroups = leftGroups.length;
      const rightGroups = [];
      if (nGroups > 1 && rightParas.length >= nGroups) {
        const per = Math.floor(rightParas.length / nGroups);
        let k = 0;
        for (let gi = 0; gi < nGroups; gi += 1) {
          const take = gi === nGroups - 1 ? rightParas.length - k : per;
          rightGroups.push(rightParas.slice(k, k + take));
          k += take;
        }
      } else {
        rightGroups.push(rightParas);
      }
      const toCell = (paras) => {
        const cell = document.createElement("div");
        paras.forEach((p) => cell.append(p.cloneNode(true)));
        return cell;
      };
      const hc1 = document.createElement("div");
      hc1.textContent = h1;
      const hc2 = document.createElement("div");
      hc2.textContent = h2;
      const rowCount = Math.max(leftGroups.length, rightGroups.length, 1);
      const bodyRows = [];
      for (let r = 0; r < rowCount; r += 1) {
        bodyRows.push([
          leftGroups[r] ? toCell(leftGroups[r]) : document.createElement("div"),
          rightGroups[r] ? toCell(rightGroups[r]) : document.createElement("div")
        ]);
      }
      const table = WebImporter.DOMUtils.createTable([
        ["Table"],
        [hc1, hc2],
        ...bodyRows
      ], document);
      cols[0].replaceWith(table);
      cols[1].remove();
      built += 1;
    });
    return built;
  }
  var OUR_BLOCK_NAMES = /^(columns|social|cards|table|video embed|embed instagram|quote|custom widget reactions|section metadata|metadata)\b/i;
  function flattenLayoutTables(document, root) {
    const layout = [...root.querySelectorAll("table")].filter((t) => {
      const firstCell = t.querySelector("th, td");
      const label = (firstCell && firstCell.textContent || "").trim();
      return !OUR_BLOCK_NAMES.test(label);
    });
    layout.sort((a, b) => b.querySelectorAll("table").length - a.querySelectorAll("table").length);
    layout.forEach((t) => {
      if (t.querySelector("table") && [...t.querySelectorAll("table")].some((inner) => OUR_BLOCK_NAMES.test((inner.querySelector("th, td")?.textContent || "").trim()))) return;
      const frag = document.createDocumentFragment();
      t.querySelectorAll(":scope > tbody > tr > td, :scope > tr > td, :scope > tbody > tr > th, :scope > tr > th").forEach((cell) => {
        while (cell.firstChild) frag.append(cell.firstChild);
      });
      if (frag.childNodes.length) t.replaceWith(frag);
      else t.remove();
    });
  }
  function wrapMediaColumns(document, root) {
    const isDecorative = (alt) => /facebook|twitter|linkedin|copy|print|checkmark|smile|thumbs|love|clap|lightbulb/i.test(alt || "");
    const bodyImgs = [...root.querySelectorAll("img")].filter((img) => {
      if (img.closest("ul")) return false;
      if (img.closest(".socialmediasharing, .reactions")) return false;
      const alt = (img.getAttribute("alt") || "").trim();
      if (!alt) return false;
      return !isDecorative(alt);
    });
    if (!bodyImgs.length) return 0;
    const viewportCentre = 640;
    let built = 0;
    bodyImgs.forEach((img) => {
      const pic = img.closest("picture") || img;
      const imgCol = pic.closest('[class*="GridColumn--default--6"]') || pic.closest('[class*="GridColumn"]');
      let textCol = null;
      if (imgCol && imgCol.parentElement) {
        const sibs = [...imgCol.parentElement.children].filter((c) => c.className && /GridColumn--default--6/.test(c.className));
        const idx = sibs.indexOf(imgCol);
        textCol = sibs[idx - 1] && !sibs[idx - 1].querySelector("picture, img") ? sibs[idx - 1] : sibs[idx + 1] && !sibs[idx + 1].querySelector("picture, img") ? sibs[idx + 1] : null;
      }
      let captionText = "";
      const capHost = imgCol || pic.closest("p") || pic.parentElement;
      if (capHost) {
        const clone = capHost.cloneNode(true);
        clone.querySelectorAll("picture, img").forEach((n) => n.remove());
        captionText = (clone.textContent || "").trim();
      }
      const textCell = document.createElement("div");
      const pairedParas = [];
      const ir = pic.getBoundingClientRect ? pic.getBoundingClientRect() : null;
      if (ir && ir.width) {
        const imgIsLeft = ir.left < viewportCentre;
        [...root.querySelectorAll("p")].forEach((p) => {
          if (!(p.textContent || "").trim() || p.querySelector("picture, img") || p.closest("ul")) return;
          if (p.closest(".socialmediasharing, .reactions")) return;
          const pr = p.getBoundingClientRect();
          if (!pr.width) return;
          const vOverlap = pr.bottom > ir.top - 20 && pr.top < ir.bottom + 20 && pr.top > ir.top - 110;
          const opposite = imgIsLeft ? pr.left >= viewportCentre - 40 : pr.right <= viewportCentre + 40;
          if (vOverlap && opposite) pairedParas.push(p);
        });
      }
      if (pairedParas.length) {
        pairedParas.forEach((p) => textCell.append(p.cloneNode(true)));
        pairedParas.forEach((p) => p.remove());
      }
      if (!textCell.childNodes.length && textCol) {
        [...textCol.querySelectorAll("p")].filter((p) => (p.textContent || "").trim() && !p.querySelector("picture, img")).forEach((p) => textCell.append(p.cloneNode(true)));
      }
      if (!textCell.childNodes.length) {
        const beforeImg = (el) => !!(pic.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_PRECEDING);
        const near = [...root.querySelectorAll("p")].filter((p) => (p.textContent || "").trim() && !p.querySelector("picture, img") && !p.closest("ul") && beforeImg(p)).slice(-2);
        near.forEach((p) => {
          textCell.append(p.cloneNode(true));
        });
        near.forEach((p) => p.remove());
      }
      if (!textCell.childNodes.length) return;
      const mediaCell = document.createElement("div");
      mediaCell.append(pic.cloneNode(true));
      if (captionText) {
        const cap = document.createElement("p");
        const em = document.createElement("em");
        em.textContent = captionText;
        cap.append(em);
        mediaCell.append(cap);
      }
      const rect = (imgCol || pic).getBoundingClientRect ? (imgCol || pic).getBoundingClientRect() : { left: viewportCentre + 1 };
      const isLeft = rect.left < viewportCentre;
      const variant = isLeft ? "Columns (media-left)" : "Columns (media-right)";
      const cells = isLeft ? [mediaCell, textCell] : [textCell, mediaCell];
      const table = WebImporter.DOMUtils.createTable([[variant], cells], document);
      const anchor = imgCol || pic.closest("p") || pic;
      anchor.replaceWith(table);
      if (textCol && textCol.parentElement) textCol.remove();
      built += 1;
    });
    return built;
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
      const emittedBlocks = ["cards-news"];
      const tweetCount = main.querySelectorAll("blockquote.twitter-tweet").length;
      const igCount = main.querySelectorAll("blockquote.instagram-media").length;
      if (tweetCount) emittedBlocks.push(`quote-tweet\xD7${tweetCount}`);
      if (igCount) emittedBlocks.push(`embed-instagram\xD7${igCount}`);
      if (main.querySelector(".socialmediasharing")) emittedBlocks.push("social");
      if (main.querySelector(".reactions")) emittedBlocks.push("reactions");
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
      const videoSections = wrapVideoSections(document, main);
      if (videoSections) emittedBlocks.push(`video-embed\xD7${videoSections}`);
      const tweetSections = wrapTweetSections(document, main);
      if (tweetSections) emittedBlocks.push(`tweet-split\xD7${tweetSections}`);
      wrapEmbeds(document, main);
      const tablesBuilt = wrapDataTables(document, main);
      if (tablesBuilt) emittedBlocks.push(`table\xD7${tablesBuilt}`);
      const mediaBlocks = wrapMediaColumns(document, main);
      if (mediaBlocks) emittedBlocks.push(`columns-media\xD7${mediaBlocks}`);
      flattenLayoutTables(document, main);
      const shareEl = main.querySelector(".socialmediasharing");
      if (shareEl) {
        const align = shareEl.classList.contains("position-right") ? "right" : "left";
        shareEl.replaceWith(buildSocialBlock(document, align));
      }
      const reactionsEl = main.querySelector(".reactions");
      if (reactionsEl) {
        reactionsEl.replaceWith(buildReactionsBlock(document));
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
        return first && /^\s*metadata\s*$/i.test(first.textContent || "");
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
          blocks: emittedBlocks
        }
      }];
    }
  };
  return __toCommonJS(import_news_v1_exports);
})();
