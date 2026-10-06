"use client";

import { useState } from "react";

/** The [contact_form] shortcode — name, email, message. Saved to Admin → Contact Messages. */
const EN = { name: "Name", email: "Email", message: "Message", send: "Send Message", sending: "Sending…", thanks: "Thank you! Your message has been sent. We will get back to you soon." };

export function ContactForm({ labels = EN }: { labels?: typeof EN }) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setState("sending");
    setError("");
    try {
      const { token } = await fetch("/api/csrf-token").then((r) => r.json());
      const body = new FormData(form);
      body.set("cTkn", token ?? "");
      body.set("page", location.pathname);
      const res = await fetch("/api/contact", { method: "POST", body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.message || "Could not send your message. Please try again.");
      form.reset();
      setState("sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send your message.");
      setState("error");
    }
  }

  if (state === "sent") {
    return (
      <div className="cf-box cf-sent" role="status">
        {labels.thanks}
      </div>
    );
  }

  return (
    <form className="cf-box" onSubmit={submit}>
      <div className="cf-row">
        <label className="cf-field">
          <span>
            {labels.name} <b aria-hidden="true">*</b>
          </span>
          <input type="text" name="name" required maxLength={100} autoComplete="name" />
        </label>
        <label className="cf-field">
          <span>
            {labels.email} <b aria-hidden="true">*</b>
          </span>
          <input type="email" name="email" required maxLength={150} autoComplete="email" />
        </label>
      </div>
      <label className="cf-field">
        <span>
          {labels.message} <b aria-hidden="true">*</b>
        </span>
        <textarea name="message" required rows={6} maxLength={5000} />
      </label>
      {/* Left empty by people; bots fill it. */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="cf-hp" aria-hidden="true" />
      {error && (
        <p className="cf-error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="cf-submit" disabled={state === "sending"}>
        {state === "sending" ? labels.sending : labels.send}
      </button>
    </form>
  );
}
