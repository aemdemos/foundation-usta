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

  // tools/importer/import-leadership-v1.js
  var import_leadership_v1_exports = {};
  __export(import_leadership_v1_exports, {
    default: () => import_leadership_v1_default
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

  // tools/importer/import-leadership-v1.js
  var PAGE_TEMPLATE = {
    name: "leadership",
    description: "USTA Foundation Leadership & Staff: H1 + toc-profile tabs, a Staff section (profile cards + staff list) and a Board of Directors section (profile cards + directory table).",
    blocks: [],
    sections: []
  };
  function executeCleanup(hookName, element, payload) {
    try {
      transform.call(null, hookName, element, { ...payload, template: PAGE_TEMPLATE });
    } catch (e) {
      console.error(`Cleanup transformer failed at ${hookName}:`, e);
    }
  }
  var ORIGIN = "https://www.ustafoundation.com";
  function normalizeLine(text) {
    return (text || "").replace(/ /g, " ").replace(/\s+/g, " ").replace(/\s+,/g, ",").replace(/,(?=\S)/g, ", ").replace(/^[,\s]+|[,\s]+$/g, "").trim();
  }
  function findPanel(root, title) {
    return [...root.querySelectorAll('[role="tabpanel"]')].find((p) => (p.getAttribute("data-title") || "").trim().toLowerCase() === title.toLowerCase()) || null;
  }
  function buildProfileCards(document, panel) {
    if (!panel) return null;
    const rows = [["Cards (profile)"]];
    panel.querySelectorAll(".cmp-teaser").forEach((teaser) => {
      const titleEl = teaser.querySelector(".cmp-teaser__title_scalable") || teaser.querySelector(".cmp-teaser__title");
      const name = titleEl ? titleEl.textContent.trim() : "";
      if (!name) return;
      const descP = teaser.querySelector(".cmp-teaser__description p");
      const role = descP ? descP.textContent.trim() : "";
      const imageCell = document.createElement("div");
      const srcImg = teaser.querySelector(".cmp-teaser__image img");
      const rawSrc = srcImg && (srcImg.getAttribute("src") || srcImg.getAttribute("data-src"));
      if (rawSrc) {
        const img = document.createElement("img");
        img.setAttribute("src", new URL(rawSrc, ORIGIN).href);
        img.setAttribute("alt", name);
        imageCell.append(img);
      }
      const bodyCell = document.createElement("div");
      const h4 = document.createElement("h4");
      h4.textContent = name;
      bodyCell.append(h4);
      if (role) {
        const p = document.createElement("p");
        const em = document.createElement("em");
        em.textContent = role;
        p.append(em);
        bodyCell.append(p);
      }
      rows.push([imageCell, bodyCell]);
    });
    if (rows.length < 2) return null;
    return WebImporter.DOMUtils.createTable(rows, document);
  }
  function buildStaffList(document, panel) {
    if (!panel) return [];
    const container = [...panel.querySelectorAll(".cmp-text")].find((c) => !c.querySelector("h3, h4") && c.querySelector("p b, p strong") && [...c.querySelectorAll(":scope > p")].length >= 3);
    if (!container) return [];
    const out = [];
    container.querySelectorAll(":scope > p").forEach((p) => {
      const temp = document.createElement("div");
      temp.innerHTML = p.innerHTML;
      const fragments = temp.innerHTML.split(/<br\s*\/?>/i);
      fragments.forEach((frag) => {
        const holder = document.createElement("div");
        holder.innerHTML = frag;
        const text = normalizeLine(holder.textContent);
        if (!text) return;
        const line = document.createElement("p");
        line.textContent = text;
        out.push(line);
      });
    });
    return out;
  }
  function buildDirectory(document, panel) {
    if (!panel) return null;
    const wanted = ["officers and directors", "advisory board", "honorary board"];
    const seen = /* @__PURE__ */ new Set();
    const cells = [];
    wanted.forEach((headKey) => {
      const h4 = [...panel.querySelectorAll("h4")].find((h) => {
        const key = h.textContent.trim().toLowerCase();
        if (key !== headKey) return false;
        if (seen.has(key)) return false;
        if (h.closest('[class*="--default--hide"]')) return false;
        return true;
      });
      if (!h4) return;
      seen.add(headKey);
      const sourceP = h4.nextElementSibling && h4.nextElementSibling.tagName === "P" ? h4.nextElementSibling : h4.parentElement.querySelector("p");
      const cell = document.createElement("div");
      const head = document.createElement("h4");
      head.textContent = h4.textContent.trim();
      cell.append(head);
      if (sourceP) {
        const outP = document.createElement("p");
        const temp = document.createElement("div");
        temp.innerHTML = sourceP.innerHTML;
        const fragments = temp.innerHTML.split(/<br\s*\/?>/i);
        let first = true;
        fragments.forEach((frag) => {
          const holder = document.createElement("div");
          holder.innerHTML = frag;
          const iEl = holder.querySelector("i, em");
          const bEl = holder.querySelector("b, strong");
          const role = iEl ? normalizeLine(iEl.textContent).replace(/^[,\s]+|[,\s]+$/g, "") : "";
          let name = "";
          if (bEl) {
            name = bEl.textContent;
          } else {
            name = iEl ? holder.textContent.replace(iEl.textContent, "") : holder.textContent;
          }
          name = normalizeLine(name).replace(/[,\s]+$/g, "").trim();
          if (!name && !role) return;
          if (!first) outP.append(document.createElement("br"));
          first = false;
          if (role) {
            const b = document.createElement("b");
            b.textContent = name;
            outP.append(b);
            outP.append(document.createTextNode(", "));
            const i = document.createElement("i");
            i.textContent = role;
            outP.append(i);
          } else {
            outP.append(document.createTextNode(name));
          }
        });
        if (outP.childNodes.length) cell.append(outP);
      }
      cells.push(cell);
    });
    if (!cells.length) return null;
    return WebImporter.DOMUtils.createTable([
      ["Table (directory)"],
      cells
    ], document);
  }
  var import_leadership_v1_default = {
    transform: ({ document, url, params }) => {
      const main = document.querySelector("#mainContent") || document.querySelector("main") || document.body;
      const emittedBlocks = ["toc-profile"];
      executeCleanup("beforeTransform", main, { url, params });
      executeCleanup("afterTransform", main, { url, params });
      const h1Src = main.querySelector("h1");
      const h1Text = h1Src ? h1Src.textContent.trim() : "Leadership & Staff";
      const staffPanel = findPanel(main, "Staff");
      const boardPanel = findPanel(main, "Board of Directors");
      const staffCards = buildProfileCards(document, staffPanel);
      const staffList = buildStaffList(document, staffPanel);
      const boardCards = buildProfileCards(document, boardPanel);
      const directory = buildDirectory(document, boardPanel);
      if (staffCards) emittedBlocks.push("cards-profile(staff)");
      if (boardCards) emittedBlocks.push("cards-profile(board)");
      if (directory) emittedBlocks.push("table-directory");
      main.textContent = "";
      const h1 = document.createElement("h1");
      h1.textContent = h1Text;
      main.append(h1);
      main.append(WebImporter.DOMUtils.createTable([
        ["toc-profile"],
        ["Staff", "staff"],
        ["Board of Directors", "board-of-directors"]
      ], document));
      main.append(document.createElement("hr"));
      const staffH3 = document.createElement("h3");
      staffH3.textContent = "Our Staff";
      main.append(staffH3);
      if (staffCards) main.append(staffCards);
      staffList.forEach((p) => main.append(p));
      main.append(WebImporter.Blocks.createBlock(document, {
        name: "Section Metadata",
        cells: { "profile-anchor": "staff" }
      }));
      emittedBlocks.push("section-metadata(staff)");
      main.append(document.createElement("hr"));
      const boardH3 = document.createElement("h3");
      boardH3.textContent = "Board of Directors";
      main.append(boardH3);
      if (boardCards) main.append(boardCards);
      if (directory) main.append(directory);
      main.append(WebImporter.Blocks.createBlock(document, {
        name: "Section Metadata",
        cells: { "profile-anchor": "board-of-directors" }
      }));
      emittedBlocks.push("section-metadata(board)");
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
        if (typeof value === "string") v.textContent = value;
        else v.append(value);
        tr.append(k, v);
        metaTable.querySelector("tbody")?.append(tr) || metaTable.append(tr);
      };
      addMetaRow("Theme", "leadership");
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
  return __toCommonJS(import_leadership_v1_exports);
})();