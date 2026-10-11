import type { SeoSettings } from "./settings";
import { SCHEMA_TYPES } from "./settings";

/**
 * The SEO settings screens, laid out like Rank Math's (General Settings, Titles & Meta, Sitemap Settings): each screen
 * has vertical tabs, each tab a title, a description and its rows. Descriptions are static HTML written here.
 */
export type FieldType = "toggle" | "text" | "textarea" | "number" | "select" | "seg" | "image" | "tpl" | "robots" | "advrobots" | "code" | "info" | "separator";

export interface SeoField {
  k: keyof SeoSettings | `__${string}`;
  t: FieldType;
  label: string;
  desc?: string;
  opts?: Record<string, string>;
  placeholder?: string;
}

export interface SeoTab {
  id: string;
  title: string;
  desc: string;
  icon: string;
  /** Group heading shown above this tab in the tab list ("Post Types:", "Taxonomies:") */
  group?: string;
  fields: SeoField[];
}

export interface SeoScreen {
  id: "general" | "titles" | "sitemap";
  title: string;
  tabs: SeoTab[];
}

const VARS = "Variables: <code>%title%</code> <code>%sep%</code> <code>%sitename%</code> <code>%excerpt%</code> <code>%category%</code> <code>%focuskw%</code> <code>%currentyear%</code>";
const TERM_VARS = "Variables: <code>%term%</code> <code>%term_description%</code> <code>%sep%</code> <code>%sitename%</code> <code>%page%</code>";

export const SEO_SCREENS: SeoScreen[] = [
  {
    id: "general",
    title: "General Settings",
    tabs: [
      {
        id: "links",
        title: "Links",
        desc: "Change how some of the links open and operate on your website.",
        icon: "fa-link",
        fields: [
          { k: "nofollow_external", t: "toggle", label: "Nofollow External Links", desc: 'Automatically add <code>rel="nofollow"</code> attribute for external links appearing in your posts and pages. The attribute is applied when the content is displayed — the stored content is not changed.' },
          { k: "nofollow_image_links", t: "toggle", label: "Nofollow Image File Links", desc: 'Automatically add <code>rel="nofollow"</code> attribute for links pointing to external image files.' },
          { k: "external_blank", t: "toggle", label: "Open External Links in New Tab/Window", desc: 'Automatically add a <code>target="_blank"</code> attribute to external links appearing in your posts and pages.' },
          { k: "affiliate_prefix", t: "textarea", label: "Affiliate Link Prefix", desc: "Add the URI prefixes you use for affiliate (cloaked) links, which redirect to external sites. One per line. These links get <code>rel=\"sponsored nofollow\"</code>.", placeholder: "/go/" },
        ],
      },
      {
        id: "images",
        title: "Images",
        desc: "SEO options related to featured images and media appearing in your post content.",
        icon: "fa-image",
        fields: [
          { k: "img_alt_missing", t: "toggle", label: "Add missing ALT attributes", desc: "Add the post title as <code>alt</code> text to images that have none. Applied when the content is displayed (needs the Image SEO module)." },
          { k: "img_title_missing", t: "toggle", label: "Add missing TITLE attributes", desc: "Add the post title as <code>title</code> text to images that have none." },
        ],
      },
      {
        id: "webmaster",
        title: "Webmaster Tools",
        desc: "Enter verification codes for third-party webmaster tools.",
        icon: "fa-shield-halved",
        fields: [
          { k: "google_verification", t: "text", label: "Google Search Console", desc: 'Enter your Google Search Console verification HTML code or ID. <a href="https://search.google.com/search-console" target="_blank" rel="noopener">Get it from here.</a>' },
          { k: "bing_verification", t: "text", label: "Bing Webmaster Tools", desc: 'Enter your Bing Webmaster Tools verification HTML code or ID. <a href="https://www.bing.com/webmasters" target="_blank" rel="noopener">Get it from here.</a>' },
          { k: "baidu_verification", t: "text", label: "Baidu Webmaster Tools", desc: "Enter your Baidu Webmaster Tools verification HTML code or ID." },
          { k: "yandex_verification", t: "text", label: "Yandex Verification ID", desc: "Enter your Yandex verification HTML code or ID." },
          { k: "pinterest_verification", t: "text", label: "Pinterest Verification ID", desc: "Enter your Pinterest verification HTML code or ID." },
          { k: "norton_verification", t: "text", label: "Norton Safe Web Verification ID", desc: "Enter your Norton Safe Web verification HTML code or ID." },
        ],
      },
      {
        id: "robots",
        title: "Edit robots.txt",
        desc: "Edit your robots.txt file to control what bots see.",
        icon: "fa-robot",
        fields: [
          { k: "robots_txt", t: "code", label: "robots.txt", desc: "Leave empty to use the default rules (admin hidden, SEO-tool bots slowed down, AI scrapers blocked). The <code>Sitemap:</code> lines are always added at the end." },
        ],
      },
      {
        id: "redirect404",
        title: "404 Redirect",
        desc: "Send visitors who open a page that doesn't exist to another address instead of the 404 page.",
        icon: "fa-route",
        fields: [
          { k: "redirect_404_enabled", t: "toggle", label: "Redirect Missing Pages", desc: "Every address that would show the 404 page redirects instead (301)." },
          { k: "redirect_404_url", t: "text", label: "Redirect To", desc: "A path like <code>/</code> or a full address.", placeholder: "/" },
        ],
      },
      {
        id: "roles",
        title: "Role Manager",
        desc: "Choose which roles get the SEO box (title, description, focus keyword, schema) in the post editor. Admins always have it.",
        icon: "fa-user-shield",
        fields: [
          { k: "role_editor_seo", t: "toggle", label: "Editors", desc: "Editors can change a post’s SEO title, description, schema and social preview." },
          { k: "role_author_seo", t: "toggle", label: "Authors", desc: "Authors can change the SEO box of their own posts." },
        ],
      },
    ],
  },
  {
    id: "titles",
    title: "Titles & Meta",
    tabs: [
      {
        id: "global",
        title: "Global Meta",
        desc: "Change Global meta settings that take effect across your website.",
        icon: "fa-gear",
        fields: [
          { k: "__robots", t: "robots", label: "Robots Meta", desc: "Default values for robots meta tag. These can be changed for individual posts." },
          { k: "__advrobots", t: "advrobots", label: "Advanced Robots Meta" },
          { k: "noindex_empty_categories", t: "toggle", label: "Noindex Empty Category and Tag Archives", desc: "Setting empty archives to <code>noindex</code> is useful for avoiding indexation of thin content pages and dilution of page rank. As soon as a post is added, the page is updated to <code>index</code>." },
          { k: "separator", t: "seg", label: "Separator Character", desc: "You can use the separator character in titles by inserting <code>%separator%</code> or <code>%sep%</code> in the title fields.", opts: { "-": "-", "–": "–", "—": "—", "»": "»", "|": "|", "•": "•", "·": "·", "/": "/" } },
          { k: "capitalize_titles", t: "toggle", label: "Capitalize Titles", desc: "Automatically capitalize the first character of each word in the titles." },
          { k: "default_og_image", t: "image", label: "OpenGraph Thumbnail", desc: "When a featured image or an OpenGraph Image is not set for individual posts/pages, this image will be used as a fallback thumbnail when your post is shared on Facebook. The recommended image size is 1200 x 630 pixels." },
          { k: "twitter_card", t: "select", label: "Twitter Card Type", desc: "Card type used for posts and pages.", opts: { summary_large_image: "Summary Card with Large Image", summary: "Summary Card" } },
          { k: "noindex_site", t: "toggle", label: "Discourage Search Engines", desc: '<b style="color:#b91c1c">Keep this off on the live site.</b> Hides the whole site from search engines (noindex on every page).' },
        ],
      },
      {
        id: "local",
        title: "Local SEO",
        desc: "Who is behind this website — used in the Organization / Person schema (Knowledge Graph).",
        icon: "fa-location-dot",
        fields: [
          { k: "represents", t: "seg", label: "Person or Company", desc: "Choose whether the site represents a person or an organization.", opts: { organization: "Organization", person: "Person" } },
          { k: "org_type", t: "select", label: "Organization Type", desc: "The schema type of your organization.", opts: { NewsMediaOrganization: "News Media Organization", Organization: "Organization", OnlineBusiness: "Online Business" } },
          { k: "org_name", t: "text", label: "Website Name / Organization", desc: "Enter the name of your site to appear in search results." },
          { k: "person_name", t: "text", label: "Person Name", desc: "Used when the site represents a person." },
          { k: "org_logo", t: "image", label: "Logo", desc: "<b>Min Size: 112Χ112px</b>. A squared image is preferred by the search engines." },
          { k: "publisher_schema", t: "toggle", label: "Publisher in Article Schema", desc: "Add the organization as the publisher of every article." },
          { k: "breadcrumbs_schema", t: "toggle", label: "Breadcrumbs Schema", desc: "Add BreadcrumbList schema (Home › Category › Post)." },
          { k: "faq_schema", t: "toggle", label: "FAQ Schema", desc: "Add FAQPage schema from the FAQs of a post." },
        ],
      },
      {
        id: "social",
        title: "Social Meta",
        desc: "Add social account information to your website’s Schema and Open Graph.",
        icon: "fa-share-nodes",
        fields: [
          { k: "facebook_url", t: "text", label: "Facebook Page URL", desc: "Enter your complete Facebook page URL here. eg: <code>https://www.facebook.com/yourpage/</code>" },
          { k: "fb_author", t: "text", label: "Facebook Authorship", desc: "Insert a personal profile or page URL to show the authorship when your posts are shared on Facebook (an author’s own Facebook link wins)." },
          { k: "fb_admin", t: "text", label: "Facebook Admin", desc: "Enter numeric user ID of Facebook." },
          { k: "fb_app_id", t: "text", label: "Facebook App", desc: "Enter numeric app ID of Facebook." },
          { k: "twitter_username", t: "text", label: "Twitter Username", desc: "Enter the Twitter username of the site (without @)." },
          { k: "same_as", t: "textarea", label: "Additional Profiles", desc: "One URL per line (YouTube, Instagram, LinkedIn, Wikipedia…). Added to the organization schema as <code>sameAs</code>." },
        ],
      },
      {
        id: "homepage",
        title: "Homepage",
        desc: "Add SEO meta and OpenGraph details to your homepage.",
        icon: "fa-house",
        fields: [
          { k: "home_title", t: "tpl", label: "Homepage Title", desc: "Homepage title tag. Empty = site name and tagline. " + VARS },
          { k: "home_description", t: "textarea", label: "Homepage Meta Description", desc: "Homepage meta description. Empty = the site’s default description." },
          { k: "home_og_title", t: "text", label: "Homepage Title for Facebook", desc: "Title of your site when shared on Facebook, Twitter and other social networks." },
          { k: "home_og_description", t: "textarea", label: "Homepage Description for Facebook", desc: "Description of your site when shared on Facebook, Twitter and other social networks." },
          { k: "home_og_image", t: "image", label: "Homepage Thumbnail for Facebook", desc: "Image displayed when your homepage is shared on Facebook and other social networks. Use images that are at least 1200 x 630 pixels." },
        ],
      },
      {
        id: "authors",
        title: "Authors",
        desc: "Change SEO options related to the author archives.",
        icon: "fa-users",
        fields: [
          { k: "noindex_authors", t: "toggle", label: "Author Robots Meta: No Index", desc: "Hide author pages from search results (and from the sitemap)." },
          { k: "author_title_format", t: "tpl", label: "Author Archive Title", desc: "Title tag on author archives. Variables: <code>%name%</code> <code>%sep%</code> <code>%sitename%</code> <code>%page%</code>" },
          { k: "author_description_format", t: "tpl", label: "Author Archive Description", desc: "Variables: <code>%name%</code> <code>%user_description%</code> (the author’s bio)" },
        ],
      },
      {
        id: "misc",
        title: "Misc Pages",
        desc: "Customize SEO meta settings of pages like search results, 404s, etc.",
        icon: "fa-ellipsis",
        fields: [
          { k: "search_title_format", t: "tpl", label: "Search Results Title", desc: "Title tag on search results page. Variables: <code>%search_query%</code> <code>%sep%</code> <code>%sitename%</code> <code>%page%</code>" },
          { k: "title_404", t: "tpl", label: "404 Title", desc: "Title tag on 404 Not Found error page." },
          { k: "noindex_search", t: "toggle", label: "Noindex Search Results", desc: "Prevent search results pages from getting indexed by search engines." },
          { k: "noindex_paginated", t: "toggle", label: "Noindex Paginated Pages", desc: "Set this to on to prevent page 2 and further of any archive to show up in the search results." },
        ],
      },
      {
        id: "posts",
        title: "Posts",
        group: "Post Types:",
        desc: "Change Global SEO, Schema, and other settings for single posts.",
        icon: "fa-file-lines",
        fields: [
          { k: "post_title_format", t: "tpl", label: "Single Post Title", desc: "Default title tag for single post pages. This can be changed on a per-post basis in the post editor. " + VARS },
          { k: "post_description_format", t: "tpl", label: "Single Post Description", desc: "Default description for single post pages (used when the post has none of its own). " + VARS },
          { k: "default_schema", t: "select", label: "Schema Type", desc: "Default rich snippet type for posts (each post can change it in the editor’s Schema tab).", opts: { ...SCHEMA_TYPES } },
        ],
      },
      {
        id: "pages",
        title: "Pages",
        desc: "Change Global SEO, Schema, and other settings for Pages.",
        icon: "fa-file",
        fields: [
          { k: "page_title_format", t: "tpl", label: "Single Page Title", desc: "Default title tag for pages. A page’s own SEO title wins. " + VARS },
          { k: "page_description_format", t: "tpl", label: "Single Page Description", desc: "Default description for pages. " + VARS },
        ],
      },
      {
        id: "categories",
        title: "Categories",
        group: "Taxonomies:",
        desc: "Change SEO options related to categories.",
        icon: "fa-folder",
        fields: [
          { k: "archive_title_format", t: "tpl", label: "Category Archive Titles", desc: "Title tag for category pages (a category’s own SEO title wins). " + TERM_VARS },
          { k: "category_description_format", t: "tpl", label: "Category Archive Descriptions", desc: "Description for category pages (a category’s own SEO description wins). " + TERM_VARS },
          { k: "noindex_categories", t: "toggle", label: "Category Robots Meta: No Index", desc: "Hide category pages from search results (and from the sitemap)." },
        ],
      },
      {
        id: "tags",
        title: "Tags",
        desc: "Change SEO options related to tags.",
        icon: "fa-tags",
        fields: [
          { k: "tag_title_format", t: "tpl", label: "Tag Archive Titles", desc: "Title tag for tag pages. " + TERM_VARS },
          { k: "tag_description_format", t: "tpl", label: "Tag Archive Descriptions", desc: "Description for tag pages. " + TERM_VARS },
          { k: "noindex_tags", t: "toggle", label: "Tag Robots Meta: No Index", desc: "Hide tag pages from search results (and from the sitemap)." },
        ],
      },
    ],
  },
  {
    id: "sitemap",
    title: "Sitemap Settings",
    tabs: [
      {
        id: "general",
        title: "General",
        desc: "This tab contains General settings related to the XML sitemaps.",
        icon: "fa-gear",
        fields: [
          { k: "__sminfo", t: "info", label: "" },
          { k: "sm_per", t: "number", label: "Links Per Sitemap", desc: "Max number of links on each sitemap page." },
          { k: "sm_images", t: "toggle", label: "Images in Sitemaps", desc: "Include reference to images from the post content in sitemaps. This helps search engines index the important images on your pages." },
          { k: "sm_featured", t: "toggle", label: "Include Featured Images", desc: "Include the Featured Image too, even if it does not appear directly in the post content." },
          { k: "sm_exclude_posts", t: "text", label: "Exclude Posts", desc: "Enter post IDs of posts you want to exclude from the sitemap, separated by commas. Posts set to No Index are left out automatically." },
          { k: "sm_exclude_terms", t: "text", label: "Exclude Terms", desc: "Add category / tag IDs, separated by comma." },
        ],
      },
      { id: "posts", title: "Posts", group: "Post Types:", desc: "Change Sitemap settings of Posts.", icon: "fa-file-lines", fields: [{ k: "sm_posts", t: "toggle", label: "Include in Sitemap", desc: "Include Posts in the XML Sitemap (<code>post-sitemap.xml</code>)." }] },
      { id: "pages", title: "Pages", desc: "Change Sitemap settings of Pages.", icon: "fa-file", fields: [{ k: "sm_pages", t: "toggle", label: "Include in Sitemap", desc: "Include the homepage, Pages and main lists in the XML Sitemap (<code>page-sitemap.xml</code>)." }] },
      { id: "categories", title: "Categories", group: "Taxonomies:", desc: "Change Sitemap settings of Categories.", icon: "fa-folder", fields: [{ k: "sm_categories", t: "toggle", label: "Include in Sitemap", desc: "Include category pages in the XML Sitemap (<code>category-sitemap.xml</code>). Empty categories are left out." }] },
      { id: "tags", title: "Tags", desc: "Change Sitemap settings of Tags.", icon: "fa-tags", fields: [{ k: "sm_tags", t: "toggle", label: "Include in Sitemap", desc: "Include tag pages in the XML Sitemap (<code>post_tag-sitemap.xml</code>)." }] },
      { id: "authors", title: "Authors", desc: "Set the sitemap options for author archive pages.", icon: "fa-users", fields: [{ k: "sm_authors", t: "toggle", label: "Include in Sitemap", desc: "Include author archives in the XML sitemap (<code>author-sitemap.xml</code>)." }] },
      {
        id: "news",
        title: "News Sitemap",
        group: "Special Sitemaps:",
        desc: "Google News sitemap (news-sitemap.xml): posts of the last 2 days.",
        icon: "fa-newspaper",
        fields: [
          { k: "news_sitemap", t: "toggle", label: "News Sitemap", desc: "Create <code>news-sitemap.xml</code> (same as the News Sitemap module)." },
          { k: "news_name", t: "text", label: "Google News Publication Name", desc: "The name of the news publication. It must match the name exactly as it appears on your articles in news.google.com. Empty = the site name." },
          { k: "news_language", t: "select", label: "Language", desc: "Language of your news articles. Empty = the site language.", opts: { "": "Site language", en: "English", hi: "Hindi", bn: "Bengali", mr: "Marathi", ta: "Tamil", te: "Telugu", gu: "Gujarati", kn: "Kannada", ml: "Malayalam", pa: "Punjabi", ur: "Urdu" } },
          { k: "news_exclude_cats", t: "text", label: "Exclude Categories", desc: "Category IDs to leave out of the news sitemap, separated by comma." },
        ],
      },
    ],
  },
];

/** Dashboard → Modules, as Rank Math's module cards. `href` = the module's Settings button. */
export const SEO_MODULES: { k: keyof SeoSettings; title: string; icon: string; color: string; bg: string; desc: string; href?: string }[] = [
  { k: "m_sitemap", title: "Sitemap", icon: "fa-sitemap", color: "#16a34a", bg: "#ecfdf5", desc: "Enable the XML sitemap index (/sitemap_index.xml), which helps search engines intelligently crawl your website’s content.", href: "/admin/seo/sitemap" },
  { k: "news_sitemap", title: "News Sitemap", icon: "fa-newspaper", color: "#2563eb", bg: "#eff6ff", desc: "Create a News Sitemap for your news-related content. You only need it if you post news and are (or plan to be) in Google News.", href: "/admin/seo/sitemap?tab=news" },
  { k: "m_schema", title: "Schema (Structured Data)", icon: "fa-diagram-project", color: "#b45309", bg: "#fff7ed", desc: "Adds Schema code (Organization, Article, Person, FAQ …) to your website, resulting in rich search results, better CTR and more traffic.", href: "/admin/seo/titles?tab=posts" },
  { k: "m_instant_indexing", title: "Instant Indexing", icon: "fa-bolt", color: "#7c3aed", bg: "#f5f3ff", desc: "Directly notify search engines like Bing & Yandex using the IndexNow API when pages are added or updated, or submit URLs manually.", href: "/admin/seo/indexing" },
  { k: "m_image_seo", title: "Image SEO", icon: "fa-images", color: "#0891b2", bg: "#ecfeff", desc: "Automatically adds missing ALT and TITLE text to the images in your posts on the fly.", href: "/admin/seo/general?tab=images" },
  { k: "m_analyzer", title: "SEO Analyzer", icon: "fa-magnifying-glass-chart", color: "#db2777", bg: "#fdf2f8", desc: "Let the site analyse itself and your content against more than 15 checks to provide tailor-made SEO advice.", href: "/admin/seo/analyzer" },
  { k: "m_role_manager", title: "Role Manager", icon: "fa-user-shield", color: "#4f46e5", bg: "#eef2ff", desc: "Control which roles (editors, authors) see the SEO box in the post editor.", href: "/admin/seo/general?tab=roles" },
  { k: "m_link_counter", title: "Link Counter", icon: "fa-link", color: "#0d9488", bg: "#f0fdfa", desc: "Counts the internal and external links inside your posts, shown in the post editor’s SEO checks." },
  { k: "redirect_404_enabled", title: "404 Redirect", icon: "fa-triangle-exclamation", color: "#dc2626", bg: "#fef2f2", desc: "Send visitors who open a page that doesn't exist to another address instead of the 404 page.", href: "/admin/seo/general?tab=redirect404" },
];
