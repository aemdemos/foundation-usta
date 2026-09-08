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

  // tools/importer/import-ypi-v1.js
  var import_ypi_v1_exports = {};
  __export(import_ypi_v1_exports, {
    default: () => import_ypi_v1_default
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

  // tools/importer/import-ypi-v1.js
  var PAGE_TEMPLATE = {
    name: "general",
    description: "USTA Foundation YPI page: hero (text-up), alternating image+text columns (two yellow bands), and a quote-image block.",
    blocks: [],
    sections: []
  };
  var ORIGIN = "https://www.ustafoundation.com";
  function executeCleanup(hookName, element, payload) {
    try {
      transform.call(null, hookName, element, { ...payload, template: PAGE_TEMPLATE });
    } catch (e) {
      console.error(`Cleanup transformer failed at ${hookName}:`, e);
    }
  }
  var norm = (s) => (s || "").replace(/ /g, " ").replace(/\s+/g, " ").trim();
  function absUrl(u) {
    if (!u) return u;
    try {
      return new URL(u, ORIGIN).href;
    } catch {
      return u;
    }
  }
  function ctaParagraph(document, href, text) {
    const p = document.createElement("p");
    const strong = document.createElement("strong");
    const a = document.createElement("a");
    a.href = href;
    a.textContent = text;
    strong.append(a);
    p.append(strong);
    return p;
  }
  function cloneImg(document, srcImg) {
    if (!srcImg) return null;
    const img = document.createElement("img");
    img.setAttribute("src", absUrl(srcImg.getAttribute("src")));
    img.setAttribute("alt", srcImg.getAttribute("alt") || "");
    return img;
  }
  function ctaOf(container) {
    if (!container) return null;
    return [...container.querySelectorAll(".button a[href], a.cmp-button[href], a.button[href]")].map((a) => ({ href: a.getAttribute("href"), text: norm(a.textContent) })).filter((c) => c.text)[0] || null;
  }
  function columnsBlock(document, { textNodes, img, imageSide }) {
    const textCell = textNodes.length ? textNodes : [""];
    const imgCell = img ? [cloneImg(document, img)] : [""];
    const rows = imageSide === "left" ? [["Columns"], [imgCell, textCell]] : [["Columns"], [textCell, imgCell]];
    return WebImporter.DOMUtils.createTable(rows, document);
  }
  function yellowStrip(document) {
    return WebImporter.Blocks.createBlock(document, {
      name: "Spacer",
      cells: { color: "section-yellow-bg", desktop: "30px" }
    });
  }
  var import_ypi_v1_default = {
    transform: (payload) => {
      const { document, url, params } = payload;
      const main = document.querySelector("#mainContent") || document.querySelector("main") || document.body;
      const emittedBlocks = [];
      executeCleanup("beforeTransform", main, { url, params });
      executeCleanup("afterTransform", main, { url, params });
      const title = document.title;
      const h1 = main.querySelector("h1");
      const heroH1Text = h1 ? norm(h1.textContent) : "Help us get young people ready for life.";
      let heroBgEl = h1;
      let heroBgUrl = null;
      while (heroBgEl && heroBgEl !== main) {
        const style = heroBgEl.getAttribute && heroBgEl.getAttribute("style");
        if (style && /background-image\s*:\s*url/i.test(style)) {
          const m = style.match(/background-image\s*:\s*url\((['"]?)([^'")]+)\1\)/i);
          if (m) {
            heroBgUrl = m[2];
            break;
          }
        }
        heroBgEl = heroBgEl.parentElement;
      }
      const heroContainer = h1 && h1.closest(".container.responsivegrid") || null;
      const heroSubhead = heroContainer ? norm(heroContainer.querySelector(".cmp-text p")?.textContent || "") : "";
      const heroCta = ctaOf(heroContainer) || { href: "https://ustaf.tfaforms.net/67", text: "JOIN US" };
      const FUTURE_INTRO = "The Young Professional Initiative (YPI) is a community of emerging leaders who are passionate about creating opportunities for young people through the power of tennis, education and mentorship.";
      const WHATIS_BODY = [
        { p: "As an affiliate group of the USTA Foundation, YPI brings together young professionals who are passionate about making a difference." },
        { p: "This initiative connects you with peers who share a commitment to giving back while helping create opportunities for the next generation. Through networking events, mentorship, fundraising, and mission-driven experiences, YPI supports the USTA Foundation's work to help young people thrive both on and off the tennis court." },
        { b: "As a part of The Young Professional Initiative, you can:" },
        { ul: [
          "Build meaningful professional and personal relationships",
          "Give back to local communities",
          "Develop leadership skills through service and engagement",
          "Make a lasting impact on young people nationwide"
        ] }
      ];
      const IMPACT_BODY = [
        { p: "YPI plays an active role in advancing the USTA Foundation's mission by investing their time, talents, and resources into creating opportunities for young people across the country." },
        { p: "Through personal philanthropy, advocacy, and community engagement, YPI helps expand access to programs that empower young people to succeed in school, bring change in their communities, and achieve excellence." },
        { p: "By supporting the USTA Foundation, YPI helps make a lasting impact through initiatives specifically focused on:" },
        { ul: [
          "Academic achievement and educational support",
          "Leadership development",
          "Career exploration and workforce readiness",
          "Mentorship and personal growth",
          "Access to welcoming tennis opportunities"
        ] }
      ];
      const WAYS_PARAS = [
        "Connect with fellow supporters through networking events, volunteer opportunities, mission-focused experiences, and special gatherings throughout the year, including during the US Open.",
        "Support the USTA Foundation through annual giving, fundraising campaigns, and other initiatives that help create opportunities for young people.",
        "Join a growing network of young professionals committed to leadership, service, and making a lasting impact."
      ];
      const QUOTE_TEXT = `"Young leaders can play a key role in championing the next generation. The Young Professional Initiative is vital in the USTA Foundation's future & growing its impact."`;
      const QUOTE_ATTR = "Greg Labanowski, Young Professional Initiative";
      const p = (text) => {
        const el = document.createElement("p");
        el.textContent = text;
        return el;
      };
      const boldP = (text) => {
        const el = document.createElement("p");
        const s = document.createElement("strong");
        s.textContent = text;
        el.append(s);
        return el;
      };
      const bulletList = (items) => {
        const ul = document.createElement("ul");
        items.forEach((t) => {
          const li = document.createElement("li");
          li.textContent = t;
          ul.append(li);
        });
        return ul;
      };
      const bodyNodes = (body) => body.map((item) => {
        if (item.b) return boldP(item.b);
        if (item.ul) return bulletList(item.ul);
        return p(item.p);
      });
      main.textContent = "";
      const heroCells = [];
      if (heroBgUrl) {
        const bg = document.createElement("img");
        bg.setAttribute("src", absUrl(heroBgUrl));
        bg.setAttribute("alt", "");
        heroCells.push([bg]);
      }
      const heroContentCell = [];
      const heroHeading = document.createElement("h1");
      heroHeading.textContent = "Young Professional Initiative";
      heroContentCell.push(heroHeading);
      if (heroSubhead) heroContentCell.push(p(heroSubhead));
      if (heroCta) heroContentCell.push(ctaParagraph(document, heroCta.href, heroCta.text));
      heroCells.push([heroContentCell]);
      main.append(WebImporter.Blocks.createBlock(document, { name: "Hero (text-up, tall)", cells: heroCells }));
      emittedBlocks.push("hero-text-up-tall");
      const columnsSection = ({
        heading,
        paras,
        body,
        img,
        alt,
        imageSide,
        cta,
        yellow = false
      }) => {
        main.append(document.createElement("hr"));
        if (yellow) {
          main.append(yellowStrip(document));
          emittedBlocks.push("spacer(yellow-strip)");
          main.append(document.createElement("hr"));
        }
        const text = [];
        const h2 = document.createElement("h2");
        h2.textContent = heading;
        text.push(h2);
        if (body) bodyNodes(body).forEach((n) => text.push(n));
        else (paras || []).forEach((t) => text.push(p(t)));
        if (cta) text.push(ctaParagraph(document, cta.href, cta.text));
        const image = document.createElement("img");
        image.setAttribute("src", absUrl(img));
        image.setAttribute("alt", alt || "");
        main.append(columnsBlock(document, { textNodes: text, img: image, imageSide }));
        if (yellow) {
          main.append(WebImporter.Blocks.createBlock(document, {
            name: "Section Metadata",
            cells: { style: "section-yellow" }
          }));
        }
      };
      main.append(document.createElement("hr"));
      {
        const h2 = document.createElement("h2");
        h2.textContent = "The future of giving starts here.";
        main.append(h2);
        main.append(p(FUTURE_INTRO));
        main.append(ctaParagraph(document, "https://ustaf.donorsupport.co/page/YPI", "MAKE A GIFT"));
        main.append(WebImporter.Blocks.createBlock(document, {
          name: "Section Metadata",
          cells: { style: "center" }
        }));
        emittedBlocks.push("center-intro(future-of-giving)");
      }
      columnsSection({
        heading: "What is YPI?",
        body: WHATIS_BODY,
        img: "/content/dam/usta-foundation/get-involved/ypi-alternate.jpg",
        alt: "YPI donors at the US Open",
        imageSide: "right"
      });
      emittedBlocks.push("columns(what-is-ypi,image-right)");
      columnsSection({
        heading: "How YPI Makes an Impact",
        body: IMPACT_BODY,
        img: "/content/dam/usta-foundation/get-involved/ypi-insert.jpg",
        alt: "YPI members with Tommy Haas and James Blake",
        imageSide: "left",
        yellow: true
      });
      emittedBlocks.push("columns(impact,image-left,yellow)");
      main.append(document.createElement("hr"));
      {
        const qh2 = document.createElement("h2");
        qh2.textContent = QUOTE_TEXT;
        const attr = document.createElement("p");
        const em = document.createElement("em");
        em.textContent = QUOTE_ATTR;
        attr.append(document.createTextNode("- "), em);
        const image = document.createElement("img");
        image.setAttribute("src", absUrl("/content/dam/usta-foundation/get-involved/ypi-3.png"));
        image.setAttribute("alt", "Two YPI members");
        main.append(WebImporter.DOMUtils.createTable([
          ["Quote (image)"],
          [[qh2, attr], [image]]
        ], document));
        emittedBlocks.push("quote-image(labanowski)");
      }
      columnsSection({
        heading: "Ways to Get Involved",
        paras: WAYS_PARAS,
        img: "/content/dam/usta-foundation/get-involved/ypi-4.png",
        alt: "USTA Foundation YPI members",
        imageSide: "left",
        yellow: true
      });
      emittedBlocks.push("columns(ways,image-left,yellow)");
      main.append(document.createElement("hr"));
      main.append(WebImporter.Blocks.createBlock(document, {
        name: "Spacer",
        cells: { color: "stats-band-bg", desktop: "17px" }
      }));
      emittedBlocks.push("spacer(trailing-black-band)");
      main.appendChild(document.createElement("hr"));
      WebImporter.rules.createMetadata(main, document);
      const metaTable = [...main.querySelectorAll("table")].find((t) => {
        const first = t.querySelector("th, td");
        return first && /^\s*metadata\s*$/i.test(first.textContent || "");
      });
      const hasRow = (key) => !!metaTable && [...metaTable.querySelectorAll("tr")].some((tr) => (tr.firstElementChild?.textContent || "").trim().toLowerCase() === key.toLowerCase());
      const addMetaRow = (key, value) => {
        if (!metaTable || !value || hasRow(key)) return;
        const tr = document.createElement("tr");
        const k = document.createElement("td");
        k.textContent = key;
        const v = document.createElement("td");
        v.textContent = value;
        tr.append(k, v);
        metaTable.querySelector("tbody")?.append(tr) || metaTable.append(tr);
      };
      addMetaRow("Theme", "general");
      WebImporter.rules.transformBackgroundImages(main, document);
      WebImporter.rules.adjustImageUrls(main, url, params.originalURL);
      main.querySelectorAll('img[src*="/media-da/"]').forEach((img) => {
        const src = img.getAttribute("src") || "";
        const idx = src.indexOf("/media-da/");
        if (idx > 0) img.setAttribute("src", src.slice(idx));
      });
      const rawPath = new URL(params.originalURL).pathname.replace(/\/$/, "").replace(/\.html?$/, "");
      const path = WebImporter.FileUtils.sanitizePath(rawPath === "" ? "/index" : rawPath);
      return [{
        element: main,
        path,
        report: { title, template: PAGE_TEMPLATE.name, blocks: emittedBlocks }
      }];
    }
  };
  return __toCommonJS(import_ypi_v1_exports);
})();
