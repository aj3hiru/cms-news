/** EEA + UK + Switzerland: Google requires consent before ad/analytics cookies here. */
export const STRICT_REGIONS = [
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL",
  "PL", "PT", "RO", "SK", "SI", "ES", "SE", "IS", "LI", "NO", "GB", "CH",
];

export const CONSENT_COOKIE = "nb_consent";

/**
 * Runs while the HTML is parsed — before any Google tag (Code Snippets and ads start after load):
 *  - Google Consent Mode v2 defaults: denied in EEA/UK/CH (or everywhere when "ask everyone"),
 *    granted elsewhere; a saved choice always wins.
 *  - AdSense: requests wait (pauseAdRequests) until the banner knows the visitor's region and choice.
 * Cookie value: "1.<analytics>.<ads>.<personalized>.<unix time>", e.g. "1.1.1.0.1791000000".
 */
export function consentBootScript(optInEverywhere: boolean): string {
  return `(function(){try{
var R=${JSON.stringify(STRICT_REGIONS)},O=${optInEverywhere ? 1 : 0};
window.dataLayer=window.dataLayer||[];
if(!window.gtag)window.gtag=function(){dataLayer.push(arguments)};
var m=document.cookie.match(/(?:^|; )${CONSENT_COOKIE}=([^;]+)/),v=m?decodeURIComponent(m[1]).split("."):null;
if(v&&v[0]!=="1")v=null;
var G=function(b){return b?"granted":"denied"},base={functionality_storage:"granted",security_storage:"granted"};
gtag("set","ads_data_redaction",true);
if(v){var a=v[1]==="1",d=v[2]==="1",p=v[3]==="1";
gtag("consent","default",Object.assign({analytics_storage:G(a),ad_storage:G(d),ad_user_data:G(d),ad_personalization:G(d&&p)},base));}
else{var no=Object.assign({analytics_storage:"denied",ad_storage:"denied",ad_user_data:"denied",ad_personalization:"denied",wait_for_update:500},base);
if(O)gtag("consent","default",no);
else{gtag("consent","default",Object.assign({region:R},no));
gtag("consent","default",Object.assign({analytics_storage:"granted",ad_storage:"granted",ad_user_data:"granted",ad_personalization:"granted"},base));}}
var q=window.adsbygoogle=window.adsbygoogle||[];q.pauseAdRequests=1;
if(v)q.requestNonPersonalizedAds=v[2]==="1"&&v[3]==="1"?0:1;
}catch(e){}})();`;
}
