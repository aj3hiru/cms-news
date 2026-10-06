import "@/app/(public)/theme/base.css";
import "@/app/(public)/theme/post.css";
import "@/app/(public)/theme/footer.css";
import "@/app/(public)/theme/news.css";
import "@/app/(public)/theme/customizer.css";
import { getTheme } from "@/lib/theme/settings";
import { buildThemeCss, googleFontsHref } from "@/lib/theme/css";

/** Theme stylesheets + the Customizer's colors/typography + Google Fonts. */
export async function ThemeHead() {
  const theme = await getTheme();
  const fontsHref = googleFontsHref(theme);
  return (
    <>
      {fontsHref && (
        <>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
          <link rel="stylesheet" href={fontsHref} precedence="default" />
        </>
      )}
      <style id="nb-customizer" dangerouslySetInnerHTML={{ __html: buildThemeCss(theme) }} />
    </>
  );
}
