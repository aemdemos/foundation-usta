import { Page } from "@playwright/test";
import { NewsArticlePage } from "./ustafoundation/NewsArticlePage";

// Registry of template families -> their source page object.
// As new families are added (e.g. LandingPage, Home), register them here.
export function createSourcePage(template: string, page: Page) {
  switch (template) {
    case "NewsArticle":
      return new NewsArticlePage(page);
    default:
      throw new Error(`No source page object registered for template: "${template}"`);
  }
}