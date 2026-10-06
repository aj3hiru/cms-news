import "@/app/(public)/theme/base.css";
import "@/app/(public)/theme/post.css";
import "@/app/(public)/theme/footer.css";
import "@/app/(public)/theme/news.css";
import "@/app/(public)/theme/customizer.css";
import { getTheme } from "@/lib/theme/settings";
import { buildThemeCss, googleFontsHref } from "@/lib/theme/css";

/** Inside the Customizer's preview frame: apply unsaved colors / typography as they change. */
const PREVIEW_LISTENER = `if(window.parent!==window){document.documentElement.classList.add("nb-in-customizer");addEventListener("message",function(e){if(e.origin!==location.origin||!e.data||e.data.nbCss==null)return;var s=document.getElementById("nb-customizer");if(s)s.textContent=e.data.nbCss;var l=document.getElementById("nb-cz-fonts");if(e.data.nbFonts){if(!l){l=document.createElement("link");l.id="nb-cz-fonts";l.rel="stylesheet";document.head.appendChild(l)}if(l.href!==e.data.nbFonts)l.href=e.data.nbFonts}})}`;

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
      <script dangerouslySetInnerHTML={{ __html: PREVIEW_LISTENER }} />
    </>
  );
}
