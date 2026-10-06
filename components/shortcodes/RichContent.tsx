import { AdminHtml } from "@/components/AdminHtml";
import { ContactForm } from "./ContactForm";
import type { Dict } from "@/lib/i18n/public";

const FORM_CODE = /(?:<p>\s*)?\[contact[_-]form\s*\/?\](?:\s*<\/p>)?/i;

/**
 * Post / page body. Value shortcodes are already replaced (applyShortcodes);
 * this renders [contact_form] as the real form, anywhere in the content.
 */
export function RichContent({ html, className, t }: { html: string; className?: string; t?: Dict }) {
  if (!FORM_CODE.test(html)) return <AdminHtml html={html} className={className} />;
  const parts = html.split(new RegExp(FORM_CODE.source, "gi"));
  return (
    <div className={className}>
      {parts.map((part, i) => (
        <div key={i} className="nb-rich-part">
          {part.trim() && <AdminHtml html={part} />}
          {i < parts.length - 1 && <ContactForm labels={t ? { name: t.name, email: t.email, message: t.message, send: t.sendMessage, sending: t.sending, thanks: t.thankYou } : undefined} />}
        </div>
      ))}
    </div>
  );
}
