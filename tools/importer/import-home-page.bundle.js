/* eslint-disable */
var CustomImportScript = (() => {
  var __defProp = Object.defineProperty;
  var __defProps = Object.defineProperties;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };
  var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
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

  // tools/importer/import-home-page.js
  var import_home_page_exports = {};
  __export(import_home_page_exports, {
    default: () => import_home_page_default
  });

  // tools/importer/parsers/hero-banner.js
  function parse(element, { document }) {
    const bgImage = element.querySelector("img");
    const heading = element.querySelector('h1, h2, h3, [class*="cmp-text"] h1, [class*="title"]');
    const paragraph = element.querySelector(".cmp-text p, p");
    const ctaLinks = Array.from(element.querySelectorAll(".button a[href], a.cmp-button[href]"));
    if (!heading && !paragraph && ctaLinks.length === 0) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const cells = [];
    if (bgImage) {
      cells.push([bgImage]);
    }
    const contentCell = [];
    if (heading) contentCell.push(heading);
    if (paragraph) contentCell.push(paragraph);
    contentCell.push(...ctaLinks);
    cells.push([contentCell]);
    const block = WebImporter.Blocks.createBlock(document, { name: "Hero (banner)", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/columns-stats.js
  function parse2(element, { document }) {
    const statColumns = Array.from(element.querySelectorAll(":scope .text")).filter((col) => col.querySelector(".cmp-text p, p"));
    if (statColumns.length === 0) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const row = statColumns.map((col) => {
      const content = col.querySelector('.cmp-text.phe--display-none, [id^="text-"], .cmp-text') || col;
      const paragraphs = Array.from(content.querySelectorAll(":scope > p"));
      return paragraphs.length ? paragraphs : [content];
    });
    const cells = [row];
    const block = WebImporter.Blocks.createBlock(document, { name: "Columns (stats)", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/columns-statement.js
  function parse3(element, { document }) {
    const heading = element.querySelector('h1, h2, h3, .cmp-text h2, [class*="title"]');
    const paragraph = element.querySelector(".cmp-text p, p");
    if (!heading && !paragraph) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const nodes = [];
    if (heading) nodes.push(heading);
    if (paragraph) nodes.push(paragraph);
    element.replaceWith(...nodes);
  }

  // tools/importer/parsers/columns-feature.js
  function parse4(element, { document }) {
    const nbsp = / /g;
    const norm = (s) => (s || "").replace(nbsp, " ").replace(/\s+/g, " ").trim();
    const cmpContainer = element.querySelector(":scope > .cmp-container") || element;
    const grid = cmpContainer.querySelector(":scope > .aem-Grid") || cmpContainer;
    let columns = Array.from(grid.querySelectorAll(":scope > .container.responsivegrid"));
    if (columns.length < 2) {
      columns = Array.from(element.querySelectorAll(":scope .container.responsivegrid")).filter((c) => c.querySelector(".cmp-text, iframe"));
    }
    if (columns.length === 0) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const prefixKey = (s) => norm(s).slice(0, 40);
    const buildCell = (col) => {
      const cell = [];
      const seen = /* @__PURE__ */ new Set();
      const units = col.querySelectorAll(".cmp-image, .cmp-text, .button a[href], iframe");
      units.forEach((unit) => {
        if (unit.matches(".cmp-image")) {
          const img = unit.querySelector("img");
          if (!img) return;
          const key = `img:${img.getAttribute("data-asset") || unit.getAttribute("data-asset") || img.getAttribute("src") || ""}`;
          if (seen.has(key)) return;
          seen.add(key);
          cell.push(img);
        } else if (unit.matches(".cmp-text")) {
          if (unit.closest(".aem-GridColumn--default--hide")) return;
          const key = `txt:${prefixKey(unit.textContent)}`;
          if (key === "txt:" || seen.has(key)) return;
          seen.add(key);
          const parts = unit.querySelectorAll("h1, h2, h3, h4, h5, h6, p");
          parts.forEach((p) => {
            if (norm(p.textContent)) cell.push(p);
          });
        } else if (unit.matches("iframe")) {
          const src = unit.getAttribute("src");
          if (src) {
            const a = document.createElement("a");
            a.href = src;
            a.textContent = src;
            cell.push(a);
          }
        } else {
          cell.push(unit);
        }
      });
      return cell.length ? cell : [""];
    };
    const row = columns.map(buildCell);
    let liftedHeading = null;
    const hasImages = row.some((cell) => cell.some((n) => {
      var _a, _b;
      return n && n.nodeType === 1 && (((_a = n.matches) == null ? void 0 : _a.call(n, "img, picture")) || ((_b = n.querySelector) == null ? void 0 : _b.call(n, "img, picture")));
    }));
    if (hasImages) {
      row.forEach((cell) => {
        const idx = cell.findIndex((n) => {
          var _a;
          return n && n.nodeType === 1 && ((_a = n.matches) == null ? void 0 : _a.call(n, "h1, h2, h3, h4, h5, h6"));
        });
        const cellHasImg = cell.some((n) => {
          var _a, _b;
          return n && n.nodeType === 1 && (((_a = n.matches) == null ? void 0 : _a.call(n, "img, picture")) || ((_b = n.querySelector) == null ? void 0 : _b.call(n, "img, picture")));
        });
        if (idx !== -1 && cellHasImg && !liftedHeading) {
          [liftedHeading] = cell.splice(idx, 1);
        }
      });
    }
    const cells = [row];
    const block = WebImporter.Blocks.createBlock(document, { name: "Columns (feature)", cells });
    if (liftedHeading) {
      element.replaceWith(liftedHeading, block);
    } else {
      element.replaceWith(block);
    }
  }

  // tools/importer/parsers/cards-support.js
  function parse5(element, { document }) {
    const norm = (s) => (s || "").replace(/ /g, " ").replace(/\s+/g, " ").trim();
    const introEls = [];
    const introText = element.querySelector(".aem-GridColumn--default--12 .cmp-text.phe--display-none, :scope .text.aem-GridColumn--default--12 .cmp-text");
    if (introText) {
      introText.querySelectorAll("h1, h2, h3, p").forEach((el) => {
        if (norm(el.textContent)) introEls.push(el);
      });
    }
    const cardGrids = Array.from(element.querySelectorAll(".aem-Grid.aem-Grid--default--3")).filter((grid) => grid.querySelector(".cmp-image img"));
    if (cardGrids.length === 0) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const cells = [];
    cardGrids.forEach((grid) => {
      const img = grid.querySelector(".cmp-image img");
      const textWrappers = Array.from(grid.querySelectorAll(":scope > .text"));
      const chosen = textWrappers.find((t) => !t.classList.contains("aem-GridColumn--default--hide")) || textWrappers[0];
      const textCell = [];
      if (chosen) {
        const content = chosen.querySelector(".cmp-text.phe--display-none, .cmp-text") || chosen;
        content.querySelectorAll("h1, h2, h3, h4, h5, h6, p").forEach((el) => {
          if (norm(el.textContent)) textCell.push(el);
        });
      }
      cells.push([img ? [img] : [""], textCell.length ? textCell : [""]]);
    });
    const block = WebImporter.Blocks.createBlock(document, { name: "Cards (support)", cells });
    if (introEls.length) {
      element.replaceWith(...introEls, block);
    } else {
      element.replaceWith(block);
    }
  }

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

  // tools/importer/import-home-page.js
  var PAGE_TEMPLATE = {
    name: "home-page",
    description: "USTA Foundation home page: hero with headline and CTA, impact stats band, mission statement, two-column content-with-video section, impact section with image collage, and a 4-card support/donation grid.",
    urls: [
      "https://www.ustafoundation.com/en/home.html"
    ],
    blocks: [
      {
        name: "hero-banner",
        instances: ["#mainContent > div.aem-Grid.aem-Grid--12.aem-Grid--default--12 > div.container.responsivegrid.padding-top-none.padding-bottom-none.full-width.aem-GridColumn.aem-GridColumn--default--12:nth-of-type(1)"]
      },
      {
        name: "columns-stats",
        instances: ["#mainContent > div.aem-Grid.aem-Grid--12.aem-Grid--default--12 > div.container.responsivegrid.padding-top-none.padding-bottom-none.justify-content_space-around.background-round.aem-GridColumn.aem-GridColumn--default--12"]
      },
      {
        // NOTE: "Mission Statement" is no longer a block — it is DEFAULT CONTENT.
        // The parser unwraps its heading + paragraph into the section; the section
        // is tagged with the generic `center, narrow` section styles (see sections
        // below) which center the text and constrain it to a narrower measure — in
        // styles.css. Kept in the parser registry so the section container is still
        // processed/unwrapped.
        name: "columns-statement",
        instances: ["#mainContent > div.aem-Grid.aem-Grid--12.aem-Grid--default--12 > div.container.responsivegrid.full-width.justify-content_space-around.aem-GridColumn--default--none.aem-GridColumn.aem-GridColumn--default--10.aem-GridColumn--offset--default--1"]
      },
      {
        name: "columns-feature",
        instances: [
          "#mainContent > div.aem-Grid.aem-Grid--12.aem-Grid--default--12 > div.container.responsivegrid.padding-top-small.padding-bottom-small.aem-GridColumn--default--none.aem-GridColumn.aem-GridColumn--default--11.aem-GridColumn--offset--default--0",
          "#mainContent > div.aem-Grid.aem-Grid--12.aem-Grid--default--12 > div.container.responsivegrid.padding-top-none.padding-top-small.padding-bottom-none.padding-bottom-small.full-width.aem-GridColumn.aem-GridColumn--default--12:nth-of-type(8)"
        ]
      },
      {
        name: "cards-support",
        instances: ["#mainContent > div.aem-Grid.aem-Grid--12.aem-Grid--default--12 > div.container.responsivegrid.padding-top-none.padding-top-small.padding-bottom-none.padding-bottom-small.full-width.aem-GridColumn.aem-GridColumn--default--12:nth-of-type(11)"]
      }
    ],
    sections: [
      {
        id: "rc4",
        name: "Hero",
        selector: "#mainContent > div.aem-Grid.aem-Grid--12.aem-Grid--default--12 > div.container.responsivegrid.padding-top-none.padding-bottom-none.full-width.aem-GridColumn.aem-GridColumn--default--12:nth-of-type(1)",
        style: null,
        blocks: ["hero-banner"],
        defaultContent: []
      },
      {
        id: "rc6",
        name: "Impact Stats",
        selector: "#mainContent > div.aem-Grid.aem-Grid--12.aem-Grid--default--12 > div.container.responsivegrid.padding-top-none.padding-bottom-none.justify-content_space-around.background-round.aem-GridColumn.aem-GridColumn--default--12",
        style: null,
        blocks: ["columns-stats"],
        defaultContent: []
      },
      {
        id: "rc7",
        name: "Mission Statement",
        selector: "#mainContent > div.aem-Grid.aem-Grid--12.aem-Grid--default--12 > div.container.responsivegrid.full-width.justify-content_space-around.aem-GridColumn--default--none.aem-GridColumn.aem-GridColumn--default--10.aem-GridColumn--offset--default--1",
        style: "center, narrow",
        blocks: ["columns-statement"],
        defaultContent: []
      },
      {
        id: "rc8",
        name: "Beyond Wins Feature",
        selector: "#mainContent > div.aem-Grid.aem-Grid--12.aem-Grid--default--12 > div.container.responsivegrid.padding-top-small.padding-bottom-small.aem-GridColumn--default--none.aem-GridColumn.aem-GridColumn--default--11.aem-GridColumn--offset--default--0",
        style: null,
        blocks: ["columns-feature"],
        defaultContent: []
      },
      {
        id: "rc11",
        name: "Impact Nationwide Feature",
        selector: "#mainContent > div.aem-Grid.aem-Grid--12.aem-Grid--default--12 > div.container.responsivegrid.padding-top-none.padding-top-small.padding-bottom-none.padding-bottom-small.full-width.aem-GridColumn.aem-GridColumn--default--12:nth-of-type(8)",
        style: null,
        blocks: ["columns-feature"],
        defaultContent: []
      },
      {
        id: "rc14",
        name: "Support Cards",
        selector: "#mainContent > div.aem-Grid.aem-Grid--12.aem-Grid--default--12 > div.container.responsivegrid.padding-top-none.padding-top-small.padding-bottom-none.padding-bottom-small.full-width.aem-GridColumn.aem-GridColumn--default--12:nth-of-type(11)",
        style: "highlight",
        blocks: ["cards-support"],
        defaultContent: []
      }
    ]
  };
  var parsers = {
    "hero-banner": parse,
    "columns-stats": parse2,
    "columns-statement": parse3,
    "columns-feature": parse4,
    "cards-support": parse5
  };
  var transformers = [
    transform,
    ...PAGE_TEMPLATE.sections && PAGE_TEMPLATE.sections.length > 1 ? [transform2] : []
  ];
  function executeTransformers(hookName, element, payload) {
    const enhancedPayload = __spreadProps(__spreadValues({}, payload), { template: PAGE_TEMPLATE });
    transformers.forEach((transformerFn) => {
      try {
        transformerFn.call(null, hookName, element, enhancedPayload);
      } catch (e) {
        console.error(`Transformer failed at ${hookName}:`, e);
      }
    });
  }
  function findBlocksOnPage(document, template) {
    const pageBlocks = [];
    template.blocks.forEach((blockDef) => {
      blockDef.instances.forEach((selector) => {
        let elements = [];
        try {
          elements = document.querySelectorAll(selector);
        } catch (e) {
          console.warn(`Invalid selector for "${blockDef.name}": ${selector}`);
        }
        if (!elements || elements.length === 0) {
          console.warn(`Block "${blockDef.name}" selector not found: ${selector}`);
        }
        elements.forEach((element) => {
          pageBlocks.push({
            name: blockDef.name,
            selector,
            element,
            section: blockDef.section || null
          });
        });
      });
    });
    console.log(`Found ${pageBlocks.length} block instances on page`);
    return pageBlocks;
  }
  var import_home_page_default = {
    transform: (payload) => {
      const { document, url, params } = payload;
      const main = document.body;
      executeTransformers("beforeTransform", main, payload);
      const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);
      pageBlocks.forEach((block) => {
        if (!block.element.parentNode) return;
        const parser = parsers[block.name];
        if (parser) {
          try {
            parser(block.element, { document, url, params });
          } catch (e) {
            console.error(`Failed to parse ${block.name} (${block.selector}):`, e);
          }
        } else {
          console.warn(`No parser found for block: ${block.name}`);
        }
      });
      executeTransformers("afterTransform", main, payload);
      const hr = document.createElement("hr");
      main.appendChild(hr);
      WebImporter.rules.createMetadata(main, document);
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
          blocks: pageBlocks.map((b) => b.name)
        }
      }];
    }
  };
  return __toCommonJS(import_home_page_exports);
})();
