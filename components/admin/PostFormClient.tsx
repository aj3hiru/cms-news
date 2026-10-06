"use client";

import { useMemo, useRef, useState } from "react";
import { BlockEditor } from "./editor/BlockEditor";
import { FeaturedImageBox } from "./FeaturedImageBox";
import { FaqModal, type FaqItem } from "./FaqModal";
import { SeoBox, type SeoDefaults, type PostSeoValues } from "./SeoBox";

interface Option {
  id: number;
  name: string;
}

export interface PostFormClientPost {
  id: number;
  title: string;
  slug: string;
  content: string;
  categoryId: number;
  authorId: number;
  status: string;
  faqJson: string | null;
  tags: string[];
  featuredImagePath?: string | null;
  metaDescription: string;
  metaKeywords: string;
  summary: string;
  keyPoints: string[];
  seo: PostSeoValues;
  publishAt?: string;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function parseFaqJson(json: string | null): FaqItem[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.filter((f) => f && typeof f.q === "string") : [];
  } catch {
    return [];
  }
}

/** ISO string → value for <input type="datetime-local"> in the browser's time zone. */
function toLocalInput(iso: string | undefined | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function PostFormClient({
  action,
  post,
  categories,
  authors,
  canAssignAuthor,
  authorLabel,
  isNew,
  seoDefaults,
}: {
  action: (formData: FormData) => void | Promise<void>;
  post?: PostFormClientPost;
  categories: Option[];
  authors: Option[];
  canAssignAuthor: boolean;
  authorLabel: string;
  isNew: boolean;
  seoDefaults: SeoDefaults;
}) {
  const [title, setTitle] = useState(post?.title ?? "");
  const [slug, setSlug] = useState(post?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(post?.slug));
  const [summary, setSummary] = useState(post?.summary ?? "");
  const [keyPoints, setKeyPoints] = useState<string[]>(post?.keyPoints.length ? post.keyPoints : [""]);
  const [metaDescription, setMetaDescription] = useState(post?.metaDescription ?? "");
  const [status, setStatus] = useState(post?.status ?? "published");
  const [statusEditing, setStatusEditing] = useState(false);
  const [publishAtLocal, setPublishAtLocal] = useState(() => toLocalInput(post?.publishAt));
  const [authorId, setAuthorId] = useState(post?.authorId ?? authors[0]?.id);
  const [authorEditing, setAuthorEditing] = useState(false);
  const [faqOpen, setFaqOpen] = useState(false);
  const [faqItems, setFaqItems] = useState<FaqItem[]>(parseFaqJson(post?.faqJson ?? null));
  const [content, setContent] = useState(post?.content ?? "");
  const formRef = useRef<HTMLFormElement>(null);

  const statusLabels: Record<string, string> = { draft: "Draft", published: "Published", scheduled: "Scheduled", archived: "Archived" };
  const authorName = authors.find((a) => a.id === authorId)?.name ?? authorLabel;
  const previewUrl = post ? `/admin/draft/${post.slug}` : "";

  function handleSaveDraft() {
    setStatus("draft");
    requestAnimationFrame(() => formRef.current?.requestSubmit());
  }

  const keyPointsFilled = useMemo(() => keyPoints.filter((k) => k.trim()).length, [keyPoints]);

  function updatePoint(i: number, v: string) {
    setKeyPoints((list) => list.map((x, j) => (j === i ? v : x)));
  }
  function movePoint(i: number, dir: -1 | 1) {
    setKeyPoints((list) => {
      const j = i + dir;
      if (j < 0 || j >= list.length) return list;
      const next = [...list];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  return (
    <form ref={formRef} action={action}>
      <input type="hidden" name="editId" value={post?.id ?? 0} />
      <div className="editor-layout">
        <div className="editor-main">
          <div className="meta-panel">
            <div className="meta-panel-body" style={{ gap: "0.5rem" }}>
              <input
                type="text"
                name="title"
                id="title"
                className="post-title-input"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (!slugTouched) setSlug(slugify(e.target.value));
                }}
                placeholder="Add title"
                autoComplete="off"
                required
              />
              <div className="permalink-row">
                <strong>Permalink:</strong>
                <span className="permalink-base">{seoDefaults.siteUrl.replace(/^https?:\/\//, "")}/</span>
                <input
                  type="text"
                  name="slug"
                  id="slug-input"
                  className="permalink-input"
                  value={slug}
                  onChange={(e) => {
                    setSlug(e.target.value);
                    setSlugTouched(true);
                  }}
                  placeholder="post-url-slug"
                  maxLength={120}
                />
              </div>
            </div>
          </div>

          <div className="meta-panel">
            <div className="meta-panel-body" style={{ padding: 0, gap: 0 }}>
              <BlockEditor name="content" defaultValue={post?.content ?? ""} onChange={setContent} />
            </div>
          </div>

          <div className="meta-panel">
            <div className="meta-panel-header">
              <span>
                <i className="fas fa-align-left" /> Summary
              </span>
              <span className="pe-count">{summary.length}/600</span>
            </div>
            <div className="meta-panel-body">
              <textarea
                name="summary"
                rows={3}
                maxLength={2000}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="A short summary of the article, shown in a highlighted box at the top of the post (2–3 sentences)."
              />
              <span className="field-hint">Shown on the post below the featured image. Turn the box on/off in Customize → Post Template.</span>
            </div>
          </div>

          <div className="meta-panel">
            <div className="meta-panel-header">
              <span>
                <i className="fas fa-list-check" /> Key Points
              </span>
              <span className="pe-count">{keyPointsFilled} added</span>
            </div>
            <div className="meta-panel-body">
              <div className="kp-editor">
                {keyPoints.map((k, i) => (
                  <div className="kp-row" key={i}>
                    <span className="kp-num">{i + 1}</span>
                    <input
                      type="text"
                      name="keyPoints"
                      value={k}
                      maxLength={500}
                      placeholder={i === 0 ? "e.g. Applications open from 10 October" : "Another key point"}
                      onChange={(e) => updatePoint(i, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          setKeyPoints((list) => [...list.slice(0, i + 1), "", ...list.slice(i + 1)]);
                          requestAnimationFrame(() => {
                            const inputs = formRef.current?.querySelectorAll<HTMLInputElement>('.kp-row input[name="keyPoints"]');
                            inputs?.[i + 1]?.focus();
                          });
                        }
                      }}
                    />
                    <button type="button" className="kp-btn" title="Move up" onClick={() => movePoint(i, -1)} disabled={i === 0}>
                      <i className="fas fa-arrow-up" />
                    </button>
                    <button type="button" className="kp-btn" title="Move down" onClick={() => movePoint(i, 1)} disabled={i === keyPoints.length - 1}>
                      <i className="fas fa-arrow-down" />
                    </button>
                    <button type="button" className="kp-btn kp-del" title="Remove" onClick={() => setKeyPoints((list) => (list.length > 1 ? list.filter((_, j) => j !== i) : [""]))}>
                      <i className="fas fa-xmark" />
                    </button>
                  </div>
                ))}
                <button type="button" className="btn btn-secondary kp-add" onClick={() => setKeyPoints((l) => [...l, ""])}>
                  <i className="fas fa-plus" /> Add key point
                </button>
              </div>
              <span className="field-hint">Shown as a bulleted &ldquo;Key Points&rdquo; box at the top of the post. Press Enter to add the next point.</span>
            </div>
          </div>

          <SeoBox
            defaults={seoDefaults}
            title={title}
            slug={slug}
            content={content}
            metaDescription={metaDescription}
            onMetaDescription={setMetaDescription}
            initial={post?.seo}
            hasFeaturedImage={Boolean(post?.featuredImagePath)}
          />
          <input type="hidden" name="metaKeywords" value={post?.metaKeywords ?? ""} />
        </div>

        <div className="editor-sidebar-panel">
          <div className="meta-panel" id="publish-box">
            <div className="meta-panel-header">
              <span>Publish</span>
            </div>
            <div className="meta-panel-body">
              <div className="wp-pub-btn-row">
                <button type="button" className="wp-outline-btn" onClick={handleSaveDraft}>
                  Save Draft
                </button>
                <button type="button" className={`wp-outline-btn${!previewUrl ? " is-disabled" : ""}`} onClick={() => previewUrl && window.open(previewUrl, "_blank")}>
                  Preview
                </button>
              </div>
              <div className="wp-pub-row">
                <i className="fas fa-toggle-on wp-pub-icon" />
                <span>
                  Status: <strong>{statusLabels[status]}</strong>
                </span>
                <a
                  href="#"
                  className="wp-pub-editlink"
                  onClick={(e) => {
                    e.preventDefault();
                    setStatusEditing((v) => !v);
                  }}
                >
                  Edit
                </a>
              </div>
              <div className={`wp-pub-editbox${statusEditing ? " open" : ""}`}>
                <select value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="archived">Archived</option>
                </select>
                <div className="wp-pub-editactions">
                  <button type="button" className="wp-pub-ok" onClick={() => setStatusEditing(false)}>
                    OK
                  </button>
                </div>
              </div>
              <input type="hidden" name="status" value={status} />
              {status === "scheduled" && (
                <div className="wp-pub-row" style={{ flexWrap: "wrap", gap: ".4rem" }}>
                  <i className="fas fa-calendar wp-pub-icon" />
                  <span>Publish on:</span>
                  <input
                    type="datetime-local"
                    value={publishAtLocal}
                    min={toLocalInput(new Date().toISOString())}
                    onChange={(e) => setPublishAtLocal(e.target.value)}
                    required
                    style={{ padding: ".3rem .5rem", border: "1px solid var(--gray-300)", borderRadius: 6, fontSize: ".85rem" }}
                  />
                </div>
              )}
              <input type="hidden" name="publishAt" value={status === "scheduled" && publishAtLocal ? new Date(publishAtLocal).toISOString() : ""} />

              {canAssignAuthor ? (
                <>
                  <div className="wp-pub-row">
                    <i className="fas fa-user wp-pub-icon" />
                    <span>
                      Author: <strong>{authorName}</strong>
                    </span>
                    <a
                      href="#"
                      className="wp-pub-editlink"
                      onClick={(e) => {
                        e.preventDefault();
                        setAuthorEditing((v) => !v);
                      }}
                    >
                      Edit
                    </a>
                  </div>
                  <div className={`wp-pub-editbox${authorEditing ? " open" : ""}`}>
                    <select value={authorId} onChange={(e) => setAuthorId(Number(e.target.value))}>
                      {authors.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                    </select>
                    <div className="wp-pub-editactions">
                      <button type="button" className="wp-pub-ok" onClick={() => setAuthorEditing(false)}>
                        OK
                      </button>
                    </div>
                  </div>
                  <input type="hidden" name="authorId" value={authorId} />
                </>
              ) : (
                <div className="wp-pub-row">
                  <i className="fas fa-user wp-pub-icon" />
                  <span>
                    Author: <strong>{authorLabel}</strong>
                  </span>
                </div>
              )}

              <div className="publish-actions">
                <button type="submit" className="btn btn-primary" style={{ width: "100%", borderRadius: 4 }}>
                  <i className="fas fa-upload" /> <span>{isNew ? "Publish Post" : "Update Post"}</span>
                </button>
              </div>
            </div>
          </div>

          <div className="meta-panel">
            <div className="meta-panel-header">
              <span>Featured Image</span>
            </div>
            <div className="meta-panel-body" id="feat-img-box">
              <FeaturedImageBox name="featuredImageUrl" mediaIdFieldName="featuredImageId" defaultValue={post?.featuredImagePath ?? ""} />
            </div>
          </div>

          <div className="meta-panel">
            <div className="meta-panel-header">
              <span>Category</span>
            </div>
            <div className="meta-panel-body">
              <select name="categoryId" id="categoryId" defaultValue={post?.categoryId} required>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="meta-panel">
            <div className="meta-panel-header">
              <span>Tags</span>
            </div>
            <div className="meta-panel-body">
              <input id="tags" name="tags" type="text" defaultValue={post?.tags.join(", ")} placeholder="tag1, tag2, tag3" />
              <span className="field-hint">Separate tags with commas.</span>
            </div>
          </div>

          <div className="meta-panel">
            <div className="meta-panel-header">
              <span>Post FAQs</span>
            </div>
            <div className="meta-panel-body">
              <p style={{ fontSize: "0.75rem", color: "var(--gray-500)", margin: "0 0 0.5rem" }}>Shown at the end of the post with FAQ schema for Google.</p>
              <button type="button" className="btn btn-secondary" style={{ width: "100%" }} onClick={() => setFaqOpen(true)}>
                <i className="fas fa-circle-question" /> Manage FAQs
              </button>
              {faqItems.length > 0 ? (
                <div style={{ marginTop: "0.4rem" }}>
                  {faqItems.map((f, i) => (
                    <div className="faq-prev-item" key={i}>
                      <strong>
                        <span className="faq-prev-q-num">{i + 1}.</span>
                        {f.q}
                      </strong>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: "11px", color: "var(--gray-400)", fontStyle: "italic", margin: "6px 0 0" }}>No FAQs added.</p>
              )}
              <input type="hidden" name="faqJson" value={faqItems.length > 0 ? JSON.stringify(faqItems) : ""} />
            </div>
          </div>
        </div>

        <FaqModal open={faqOpen} onClose={() => setFaqOpen(false)} initial={faqItems} onSave={setFaqItems} />
      </div>
    </form>
  );
}
