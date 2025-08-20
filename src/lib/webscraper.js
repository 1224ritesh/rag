import { load } from "cheerio";

export async function scrapeWebsite(url) {
  try {
    // Fetch the website content
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
      },
      timeout: 10000, // 10 second timeout
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const html = await response.text();
    const $ = load(html);

    // Remove script and style elements
    $(
      "script, style, nav, footer, header, aside, .navigation, .menu, .sidebar, .ads, .advertisement"
    ).remove();

    // Extract meaningful content
    let title = $("title").text().trim() || "";
    let metaDescription = $('meta[name="description"]').attr("content") || "";

    // Try to get main content from common selectors
    let mainContent = "";
    const contentSelectors = [
      "main",
      "article",
      ".content",
      ".main-content",
      ".post-content",
      ".entry-content",
      "#content",
      "#main",
      ".container",
      "body",
    ];

    for (const selector of contentSelectors) {
      const element = $(selector);
      if (element.length > 0) {
        mainContent = element.text().trim();
        if (mainContent.length > 200) {
          // If we found substantial content
          break;
        }
      }
    }

    // Fallback to body text if no main content found
    if (!mainContent || mainContent.length < 100) {
      mainContent = $("body").text().trim();
    }

    // Clean up the text
    const cleanText = cleanupText(mainContent);

    // Extract structured data
    const headings = [];
    $("h1, h2, h3, h4, h5, h6").each((i, el) => {
      const text = $(el).text().trim();
      if (text) {
        headings.push({
          level: el.tagName.toLowerCase(),
          text: text,
        });
      }
    });

    // Extract links for context
    const links = [];
    $("a[href]").each((i, el) => {
      const text = $(el).text().trim();
      const href = $(el).attr("href");
      if (text && href && !href.startsWith("#")) {
        links.push({
          text: text,
          url: href.startsWith("http") ? href : new URL(href, url).href,
        });
      }
    });

    // Extract images with alt text for context
    const images = [];
    $("img[alt]").each((i, el) => {
      const alt = $(el).attr("alt")?.trim();
      const src = $(el).attr("src");
      if (alt) {
        images.push({
          alt: alt,
          src: src,
        });
      }
    });

    return {
      url: url,
      title: title,
      metaDescription: metaDescription,
      content: cleanText,
      headings: headings.slice(0, 20), // Limit headings
      links: links.slice(0, 10), // Limit links
      images: images.slice(0, 5), // Limit images
      scrapedAt: new Date().toISOString(),
      contentLength: cleanText.length,
    };
  } catch (error) {
    console.error("Error scraping website:", error);
    throw new Error(`Failed to scrape website: ${error.message}`);
  }
}

function cleanupText(text) {
  if (!text) return "";

  return (
    text
      // Remove extra whitespace and normalize line breaks
      .replace(/\s+/g, " ")
      .replace(/\n\s*\n/g, "\n\n")
      // Remove common navigation and footer text patterns
      .replace(
        /\b(home|about|contact|privacy|terms|cookies?|newsletter|subscribe|follow us)\b/gi,
        ""
      )
      // Remove email and social media patterns
      .replace(/\b[\w._%+-]+@[\w.-]+\.[A-Z]{2,}\b/gi, "")
      .replace(/\b(facebook|twitter|instagram|linkedin|youtube|tiktok)\b/gi, "")
      // Remove common website elements
      .replace(/\b(copyright|©|\(c\)|all rights reserved|powered by)\b/gi, "")
      // Remove excessive punctuation
      .replace(/[.]{3,}/g, "...")
      .replace(/[-]{3,}/g, "---")
      // Clean up spacing
      .replace(/\s{2,}/g, " ")
      .trim()
  );
}

export function validateUrl(url) {
  try {
    const urlObj = new URL(url);

    // Check if it's HTTP or HTTPS
    if (!["http:", "https:"].includes(urlObj.protocol)) {
      return { valid: false, error: "URL must use HTTP or HTTPS protocol" };
    }

    // Check for common file extensions that shouldn't be scraped
    const invalidExtensions = [
      ".pdf",
      ".doc",
      ".docx",
      ".xls",
      ".xlsx",
      ".ppt",
      ".pptx",
      ".zip",
      ".rar",
      ".exe",
      ".dmg",
    ];
    const pathname = urlObj.pathname.toLowerCase();

    if (invalidExtensions.some((ext) => pathname.endsWith(ext))) {
      return {
        valid: false,
        error: "URL appears to point to a file download, not a webpage",
      };
    }

    return { valid: true, url: urlObj.href };
  } catch (error) {
    return { valid: false, error: "Invalid URL format" };
  }
}

export function formatScrapedContent(scrapedData) {
  const { title, metaDescription, content, headings, url, scrapedAt } =
    scrapedData;

  let formattedContent = "";

  // Add title and metadata
  if (title) {
    formattedContent += `# ${title}\n\n`;
  }

  if (metaDescription) {
    formattedContent += `**Description:** ${metaDescription}\n\n`;
  }

  formattedContent += `**Source URL:** ${url}\n`;
  formattedContent += `**Scraped at:** ${new Date(
    scrapedAt
  ).toLocaleString()}\n\n`;

  // Add table of contents if there are headings
  if (headings && headings.length > 0) {
    formattedContent += `## Table of Contents\n`;
    headings.forEach((heading) => {
      const indent = "  ".repeat(parseInt(heading.level.charAt(1)) - 1);
      formattedContent += `${indent}- ${heading.text}\n`;
    });
    formattedContent += "\n";
  }

  // Add main content
  formattedContent += `## Content\n\n${content}\n\n`;

  // Add footer
  formattedContent += `---\n*This content was automatically scraped from ${url}*`;

  return formattedContent;
}
