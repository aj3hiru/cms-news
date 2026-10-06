/**
 * Front-end labels in the Site Language chosen in General Settings. The
 * admin panel stays in English. Labels the admin typed in the Customizer are
 * shown as typed — only the untouched English defaults get translated
 * (see `tl()` below).
 */

export const LANGS = ["en", "hi", "bn", "mr", "te", "ta", "es", "fr", "pt", "ar"] as const;
export type Lang = (typeof LANGS)[number];

export const LOCALE: Record<Lang, { og: string; bcp: string; dir: "ltr" | "rtl" }> = {
  en: { og: "en_US", bcp: "en-IN", dir: "ltr" },
  hi: { og: "hi_IN", bcp: "hi-IN", dir: "ltr" },
  bn: { og: "bn_IN", bcp: "bn-IN", dir: "ltr" },
  mr: { og: "mr_IN", bcp: "mr-IN", dir: "ltr" },
  te: { og: "te_IN", bcp: "te-IN", dir: "ltr" },
  ta: { og: "ta_IN", bcp: "ta-IN", dir: "ltr" },
  es: { og: "es_ES", bcp: "es-ES", dir: "ltr" },
  fr: { og: "fr_FR", bcp: "fr-FR", dir: "ltr" },
  pt: { og: "pt_BR", bcp: "pt-BR", dir: "ltr" },
  ar: { og: "ar_AR", bcp: "ar", dir: "rtl" },
};

const EN = {
  home: "Home",
  search: "Search",
  searchFor: "Search for:",
  searchPlaceholder: "Type keywords....",
  by: "By",
  on: "On:",
  logIn: "Log in",
  subscribe: "Subscribe",
  darkMode: "Dark Mode",
  helloReader: "Hello, Reader",
  followUs: "Follow Us",
  followUsSocial: "Follow Us On Social Media",
  latestOnSocial: "Get Latest Update On Social Media",
  categories: "Categories",
  allCategories: "All Categories",
  quickLinks: "Quick Links",
  category: "Category",
  tag: "Tag",
  posts: "posts",
  post: "post",
  articles: "articles",
  results: "results",
  result: "result",
  resultsFor: "Results for",
  nothingFound: "Nothing found. Try different keywords.",
  typeToSearch: "Type something to search.",
  noPosts: "No posts found.",
  summary: "Summary",
  keyPoints: "Key Points",
  toc: "Table of Contents",
  hide: "Hide",
  show: "Show",
  alsoRead: "Also Read",
  continueReading: "Continue reading",
  faq: "Frequently Asked Questions",
  readMore: "Read more",
  leaveComment: "Leave a Comment",
  comments: "Comments",
  shareThoughts: "Share your thoughts...",
  name: "Name",
  email: "Email",
  rememberMe: "Save my name and email in this browser for the next time I comment.",
  postComment: "Post Comment",
  posting: "Posting…",
  replyingTo: "Replying to",
  reply: "Reply",
  cancel: "Cancel",
  showMore: "Show more",
  inThisArticle: "In this article",
  backToTop: "Back to top",
  addPreferred1: "Add as a preferred",
  addPreferred2: "source on Google",
  joinUs: "Join Us",
  joinNow: "Join Now",
  joinWhatsapp: "Join WhatsApp",
  joinTelegram: "Join Telegram",
  getNotifications: "Get notifications",
  notificationsEnabled: "Notifications enabled!",
  notificationsBlocked: "Notifications are blocked",
  notificationsHelp: "Tap the 🔒 icon next to the web address, allow Notifications, then reload the page.",
  message: "Message",
  sendMessage: "Send Message",
  sending: "Sending…",
  thankYou: "Thank you! Your message has been sent. We will get back to you soon.",
  notFoundTitle: "This page doesn't exist, or has been moved.",
  goHome: "Go to Homepage",
  previous: "Previous",
  next: "Next",
  page: "Page",
  minRead: "min read",
  share: "Share",
  copyLink: "Copy link",
  copied: "Copied!",
};
export type Dict = typeof EN;

const T: Record<Exclude<Lang, "en">, Partial<Dict>> = {
  hi: {
    share: "शेयर करें", copyLink: "लिंक कॉपी करें", copied: "कॉपी हो गया!",
    home: "होम", search: "खोजें", searchFor: "खोजें:", searchPlaceholder: "कीवर्ड लिखें....", by: "द्वारा", on: "दिनांक:", logIn: "लॉग इन", subscribe: "सब्सक्राइब करें",
    darkMode: "डार्क मोड", helloReader: "नमस्ते, पाठक", followUs: "हमें फॉलो करें", followUsSocial: "सोशल मीडिया पर हमें फॉलो करें", latestOnSocial: "सोशल मीडिया पर ताज़ा अपडेट पाएं",
    categories: "श्रेणियाँ", allCategories: "सभी श्रेणियाँ", quickLinks: "उपयोगी लिंक", category: "श्रेणी", tag: "टैग", posts: "पोस्ट", post: "पोस्ट", articles: "लेख", results: "परिणाम", result: "परिणाम",
    resultsFor: "इसके परिणाम", nothingFound: "कुछ नहीं मिला। दूसरे शब्दों से खोजें।", typeToSearch: "खोजने के लिए कुछ लिखें।", noPosts: "कोई पोस्ट नहीं मिली।",
    summary: "सारांश", keyPoints: "मुख्य बातें", toc: "विषय सूची", hide: "छिपाएँ", show: "दिखाएँ", alsoRead: "यह भी पढ़ें", continueReading: "आगे पढ़ें", faq: "अक्सर पूछे जाने वाले प्रश्न",
    readMore: "और पढ़ें", leaveComment: "टिप्पणी करें", comments: "टिप्पणियाँ", shareThoughts: "अपनी राय लिखें...", name: "नाम", email: "ईमेल", rememberMe: "अगली बार के लिए मेरा नाम और ईमेल इस ब्राउज़र में सेव करें।",
    postComment: "टिप्पणी भेजें", posting: "भेजा जा रहा है…", replyingTo: "जवाब दे रहे हैं", reply: "जवाब दें", cancel: "रद्द करें", showMore: "और दिखाएँ", inThisArticle: "इस लेख में", backToTop: "ऊपर जाएँ",
    addPreferred1: "Google पर पसंदीदा", addPreferred2: "स्रोत के रूप में जोड़ें", joinUs: "जुड़ें", joinNow: "अभी जुड़ें", joinWhatsapp: "WhatsApp से जुड़ें", joinTelegram: "Telegram से जुड़ें",
    getNotifications: "सूचनाएँ पाएं", notificationsEnabled: "सूचनाएँ चालू हो गईं!", notificationsBlocked: "सूचनाएँ बंद हैं", notificationsHelp: "वेब पते के पास 🔒 पर टैप करें, Notifications की अनुमति दें, फिर पेज रीलोड करें।",
    message: "संदेश", sendMessage: "संदेश भेजें", sending: "भेजा जा रहा है…", thankYou: "धन्यवाद! आपका संदेश भेज दिया गया है। हम जल्द ही आपसे संपर्क करेंगे।",
    notFoundTitle: "यह पेज मौजूद नहीं है या हटा दिया गया है।", goHome: "होमपेज पर जाएँ", previous: "पिछला", next: "अगला", page: "पेज", minRead: "मिनट पढ़ें",
  },
  bn: {
    share: "শেয়ার করুন", copyLink: "লিংক কপি করুন", copied: "কপি হয়েছে!",
    home: "হোম", search: "খুঁজুন", searchFor: "খুঁজুন:", searchPlaceholder: "কীওয়ার্ড লিখুন....", by: "লিখেছেন", on: "তারিখ:", logIn: "লগ ইন", subscribe: "সাবস্ক্রাইব",
    darkMode: "ডার্ক মোড", helloReader: "নমস্কার, পাঠক", followUs: "আমাদের ফলো করুন", followUsSocial: "সোশ্যাল মিডিয়ায় আমাদের ফলো করুন", latestOnSocial: "সোশ্যাল মিডিয়ায় সর্বশেষ আপডেট পান",
    categories: "বিভাগ", allCategories: "সব বিভাগ", quickLinks: "দরকারি লিংক", category: "বিভাগ", tag: "ট্যাগ", posts: "পোস্ট", post: "পোস্ট", articles: "প্রবন্ধ", results: "ফলাফল", result: "ফলাফল",
    resultsFor: "ফলাফল:", nothingFound: "কিছু পাওয়া যায়নি। অন্য শব্দে খুঁজুন।", typeToSearch: "খুঁজতে কিছু লিখুন।", noPosts: "কোনো পোস্ট নেই।",
    summary: "সারসংক্ষেপ", keyPoints: "মূল বিষয়", toc: "সূচিপত্র", hide: "লুকান", show: "দেখান", alsoRead: "আরও পড়ুন", continueReading: "আরও পড়ুন", faq: "সাধারণ জিজ্ঞাসা",
    readMore: "আরও পড়ুন", leaveComment: "মন্তব্য করুন", comments: "মন্তব্য", shareThoughts: "আপনার মতামত লিখুন...", name: "নাম", email: "ইমেল", rememberMe: "পরের বারের জন্য আমার নাম ও ইমেল এই ব্রাউজারে সেভ করুন।",
    postComment: "মন্তব্য পাঠান", posting: "পাঠানো হচ্ছে…", replyingTo: "উত্তর দিচ্ছেন", reply: "উত্তর", cancel: "বাতিল", showMore: "আরও দেখুন", inThisArticle: "এই লেখায়", backToTop: "উপরে যান",
    addPreferred1: "Google-এ পছন্দের", addPreferred2: "সোর্স হিসেবে যোগ করুন", joinUs: "যোগ দিন", joinNow: "এখনই যোগ দিন", joinWhatsapp: "WhatsApp-এ যোগ দিন", joinTelegram: "Telegram-এ যোগ দিন",
    getNotifications: "নোটিফিকেশন পান", notificationsEnabled: "নোটিফিকেশন চালু হয়েছে!", notificationsBlocked: "নোটিফিকেশন বন্ধ আছে", message: "বার্তা", sendMessage: "বার্তা পাঠান", sending: "পাঠানো হচ্ছে…",
    thankYou: "ধন্যবাদ! আপনার বার্তা পাঠানো হয়েছে।", notFoundTitle: "এই পেজটি নেই বা সরানো হয়েছে।", goHome: "হোমপেজে যান", previous: "আগের", next: "পরের", page: "পেজ", minRead: "মিনিট পড়া",
  },
  mr: {
    share: "शेअर करा", copyLink: "लिंक कॉपी करा", copied: "कॉपी झाले!",
    home: "मुख्यपृष्ठ", search: "शोधा", searchFor: "शोधा:", searchPlaceholder: "कीवर्ड लिहा....", by: "लेखक", on: "दिनांक:", logIn: "लॉग इन", subscribe: "सबस्क्राईब करा",
    darkMode: "डार्क मोड", helloReader: "नमस्कार, वाचक", followUs: "आम्हाला फॉलो करा", followUsSocial: "सोशल मीडियावर आम्हाला फॉलो करा", latestOnSocial: "सोशल मीडियावर ताजे अपडेट मिळवा",
    categories: "श्रेणी", allCategories: "सर्व श्रेणी", quickLinks: "उपयुक्त लिंक", category: "श्रेणी", tag: "टॅग", posts: "पोस्ट", post: "पोस्ट", articles: "लेख", results: "निकाल", result: "निकाल",
    resultsFor: "यासाठी निकाल", nothingFound: "काहीही सापडले नाही. दुसरे शब्द वापरून पहा.", typeToSearch: "शोधण्यासाठी काहीतरी लिहा.", noPosts: "एकही पोस्ट नाही.",
    summary: "सारांश", keyPoints: "महत्त्वाचे मुद्दे", toc: "अनुक्रमणिका", hide: "लपवा", show: "दाखवा", alsoRead: "हे पण वाचा", continueReading: "पुढे वाचा", faq: "वारंवार विचारले जाणारे प्रश्न",
    readMore: "अधिक वाचा", leaveComment: "प्रतिक्रिया द्या", comments: "प्रतिक्रिया", shareThoughts: "तुमचे मत लिहा...", name: "नाव", email: "ईमेल", rememberMe: "पुढील वेळेसाठी माझे नाव व ईमेल या ब्राउझरमध्ये जतन करा.",
    postComment: "प्रतिक्रिया पाठवा", posting: "पाठवत आहे…", replyingTo: "उत्तर देत आहात", reply: "उत्तर", cancel: "रद्द करा", showMore: "आणखी दाखवा", inThisArticle: "या लेखात", backToTop: "वर जा",
    addPreferred1: "Google वर पसंतीचा", addPreferred2: "स्रोत म्हणून जोडा", joinUs: "सामील व्हा", joinNow: "आता सामील व्हा", joinWhatsapp: "WhatsApp वर सामील व्हा", joinTelegram: "Telegram वर सामील व्हा",
    getNotifications: "सूचना मिळवा", notificationsEnabled: "सूचना सुरू झाल्या!", notificationsBlocked: "सूचना बंद आहेत", message: "संदेश", sendMessage: "संदेश पाठवा", sending: "पाठवत आहे…",
    thankYou: "धन्यवाद! तुमचा संदेश पाठवला गेला आहे.", notFoundTitle: "हे पान अस्तित्वात नाही किंवा हलवले आहे.", goHome: "मुख्यपृष्ठावर जा", previous: "मागील", next: "पुढील", page: "पान", minRead: "मिनिटे वाचन",
  },
  te: {
    share: "షేర్ చేయండి", copyLink: "లింక్ కాపీ", copied: "కాపీ అయింది!",
    home: "హోమ్", search: "వెతకండి", searchFor: "వెతకండి:", searchPlaceholder: "కీవర్డ్స్ టైప్ చేయండి....", by: "రచయిత", on: "తేదీ:", logIn: "లాగిన్", subscribe: "సబ్‌స్క్రైబ్",
    darkMode: "డార్క్ మోడ్", helloReader: "నమస్కారం, పాఠకుడా", followUs: "మమ్మల్ని ఫాలో అవ్వండి", followUsSocial: "సోషల్ మీడియాలో మమ్మల్ని ఫాలో అవ్వండి", latestOnSocial: "సోషల్ మీడియాలో తాజా అప్‌డేట్స్ పొందండి",
    categories: "వర్గాలు", allCategories: "అన్ని వర్గాలు", quickLinks: "ఉపయోగకరమైన లింకులు", category: "వర్గం", tag: "ట్యాగ్", posts: "పోస్టులు", post: "పోస్ట్", articles: "వ్యాసాలు", results: "ఫలితాలు", result: "ఫలితం",
    resultsFor: "ఫలితాలు:", nothingFound: "ఏమీ దొరకలేదు. వేరే పదాలతో వెతకండి.", typeToSearch: "వెతకడానికి ఏదైనా టైప్ చేయండి.", noPosts: "పోస్టులు లేవు.",
    summary: "సారాంశం", keyPoints: "ముఖ్యాంశాలు", toc: "విషయ సూచిక", hide: "దాచు", show: "చూపు", alsoRead: "ఇది కూడా చదవండి", continueReading: "ఇంకా చదవండి", faq: "తరచుగా అడిగే ప్రశ్నలు",
    readMore: "ఇంకా చదవండి", leaveComment: "వ్యాఖ్యానించండి", comments: "వ్యాఖ్యలు", shareThoughts: "మీ అభిప్రాయం రాయండి...", name: "పేరు", email: "ఈమెయిల్", rememberMe: "తదుపరి సారి కోసం నా పేరు, ఈమెయిల్ ఈ బ్రౌజర్‌లో సేవ్ చేయండి.",
    postComment: "వ్యాఖ్య పంపండి", posting: "పంపుతోంది…", replyingTo: "సమాధానం ఇస్తున్నారు", reply: "సమాధానం", cancel: "రద్దు", showMore: "మరిన్ని చూపు", inThisArticle: "ఈ వ్యాసంలో", backToTop: "పైకి వెళ్ళండి",
    addPreferred1: "Google లో ఇష్టమైన", addPreferred2: "సోర్స్‌గా జోడించండి", joinUs: "చేరండి", joinNow: "ఇప్పుడే చేరండి", joinWhatsapp: "WhatsApp లో చేరండి", joinTelegram: "Telegram లో చేరండి",
    getNotifications: "నోటిఫికేషన్లు పొందండి", notificationsEnabled: "నోటిఫికేషన్లు ఆన్ అయ్యాయి!", notificationsBlocked: "నోటిఫికేషన్లు బ్లాక్ అయ్యాయి", message: "సందేశం", sendMessage: "సందేశం పంపండి", sending: "పంపుతోంది…",
    thankYou: "ధన్యవాదాలు! మీ సందేశం పంపబడింది.", notFoundTitle: "ఈ పేజీ లేదు లేదా తరలించబడింది.", goHome: "హోమ్‌పేజీకి వెళ్ళండి", previous: "మునుపటి", next: "తదుపరి", page: "పేజీ", minRead: "నిమిషాల పఠనం",
  },
  ta: {
    share: "பகிர்", copyLink: "இணைப்பை நகலெடு", copied: "நகலெடுக்கப்பட்டது!",
    home: "முகப்பு", search: "தேடு", searchFor: "தேடு:", searchPlaceholder: "முக்கிய சொற்களை தட்டச்சு செய்யவும்....", by: "எழுதியவர்", on: "தேதி:", logIn: "உள்நுழை", subscribe: "சந்தா",
    darkMode: "இருண்ட பயன்முறை", helloReader: "வணக்கம், வாசகரே", followUs: "எங்களைப் பின்தொடருங்கள்", followUsSocial: "சமூக ஊடகங்களில் எங்களைப் பின்தொடருங்கள்", latestOnSocial: "சமூக ஊடகங்களில் சமீபத்திய செய்திகள்",
    categories: "வகைகள்", allCategories: "அனைத்து வகைகள்", quickLinks: "பயனுள்ள இணைப்புகள்", category: "வகை", tag: "குறிச்சொல்", posts: "பதிவுகள்", post: "பதிவு", articles: "கட்டுரைகள்", results: "முடிவுகள்", result: "முடிவு",
    resultsFor: "முடிவுகள்:", nothingFound: "எதுவும் கிடைக்கவில்லை. வேறு சொற்களில் தேடவும்.", typeToSearch: "தேட ஏதாவது தட்டச்சு செய்யவும்.", noPosts: "பதிவுகள் இல்லை.",
    summary: "சுருக்கம்", keyPoints: "முக்கிய அம்சங்கள்", toc: "பொருளடக்கம்", hide: "மறை", show: "காட்டு", alsoRead: "இதையும் படிக்கவும்", continueReading: "மேலும் படிக்க", faq: "அடிக்கடி கேட்கப்படும் கேள்விகள்",
    readMore: "மேலும் படிக்க", leaveComment: "கருத்து தெரிவிக்கவும்", comments: "கருத்துகள்", shareThoughts: "உங்கள் கருத்தை எழுதுங்கள்...", name: "பெயர்", email: "மின்னஞ்சல்", rememberMe: "அடுத்த முறைக்காக என் பெயர் மற்றும் மின்னஞ்சலை இந்த உலாவியில் சேமிக்கவும்.",
    postComment: "கருத்தை அனுப்பு", posting: "அனுப்புகிறது…", replyingTo: "பதிலளிக்கிறீர்கள்", reply: "பதில்", cancel: "ரத்து", showMore: "மேலும் காட்டு", inThisArticle: "இந்தக் கட்டுரையில்", backToTop: "மேலே செல்",
    addPreferred1: "Google-இல் விருப்பமான", addPreferred2: "மூலமாகச் சேர்க்கவும்", joinUs: "இணையுங்கள்", joinNow: "இப்போதே இணையுங்கள்", joinWhatsapp: "WhatsApp-இல் இணையுங்கள்", joinTelegram: "Telegram-இல் இணையுங்கள்",
    getNotifications: "அறிவிப்புகளைப் பெறுக", notificationsEnabled: "அறிவிப்புகள் இயக்கப்பட்டன!", notificationsBlocked: "அறிவிப்புகள் தடுக்கப்பட்டுள்ளன", message: "செய்தி", sendMessage: "செய்தியை அனுப்பு", sending: "அனுப்புகிறது…",
    thankYou: "நன்றி! உங்கள் செய்தி அனுப்பப்பட்டது.", notFoundTitle: "இந்தப் பக்கம் இல்லை அல்லது நகர்த்தப்பட்டது.", goHome: "முகப்புக்குச் செல்", previous: "முந்தைய", next: "அடுத்த", page: "பக்கம்", minRead: "நிமிட வாசிப்பு",
  },
  es: {
    share: "Compartir", copyLink: "Copiar enlace", copied: "¡Copiado!",
    home: "Inicio", search: "Buscar", searchFor: "Buscar:", searchPlaceholder: "Escribe palabras clave....", by: "Por", on: "El:", logIn: "Iniciar sesión", subscribe: "Suscribirse",
    darkMode: "Modo oscuro", helloReader: "Hola, lector", followUs: "Síguenos", followUsSocial: "Síguenos en redes sociales", latestOnSocial: "Recibe las últimas novedades en redes sociales",
    categories: "Categorías", allCategories: "Todas las categorías", quickLinks: "Enlaces rápidos", category: "Categoría", tag: "Etiqueta", posts: "artículos", post: "artículo", articles: "artículos", results: "resultados", result: "resultado",
    resultsFor: "Resultados para", nothingFound: "No se encontró nada. Prueba con otras palabras.", typeToSearch: "Escribe algo para buscar.", noPosts: "No hay artículos.",
    summary: "Resumen", keyPoints: "Puntos clave", toc: "Índice", hide: "Ocultar", show: "Mostrar", alsoRead: "Lee también", continueReading: "Seguir leyendo", faq: "Preguntas frecuentes",
    readMore: "Leer más", leaveComment: "Deja un comentario", comments: "Comentarios", shareThoughts: "Comparte tu opinión...", name: "Nombre", email: "Correo", rememberMe: "Guardar mi nombre y correo en este navegador para la próxima vez.",
    postComment: "Publicar comentario", posting: "Publicando…", replyingTo: "Respondiendo a", reply: "Responder", cancel: "Cancelar", showMore: "Ver más", inThisArticle: "En este artículo", backToTop: "Volver arriba",
    addPreferred1: "Añadir como fuente", addPreferred2: "preferida en Google", joinUs: "Únete", joinNow: "Únete ahora", joinWhatsapp: "Únete a WhatsApp", joinTelegram: "Únete a Telegram",
    getNotifications: "Recibir notificaciones", notificationsEnabled: "¡Notificaciones activadas!", notificationsBlocked: "Las notificaciones están bloqueadas", message: "Mensaje", sendMessage: "Enviar mensaje", sending: "Enviando…",
    thankYou: "¡Gracias! Tu mensaje ha sido enviado.", notFoundTitle: "Esta página no existe o se ha movido.", goHome: "Ir al inicio", previous: "Anterior", next: "Siguiente", page: "Página", minRead: "min de lectura",
  },
  fr: {
    share: "Partager", copyLink: "Copier le lien", copied: "Copié !",
    home: "Accueil", search: "Rechercher", searchFor: "Rechercher :", searchPlaceholder: "Tapez des mots-clés....", by: "Par", on: "Le :", logIn: "Se connecter", subscribe: "S'abonner",
    darkMode: "Mode sombre", helloReader: "Bonjour, lecteur", followUs: "Suivez-nous", followUsSocial: "Suivez-nous sur les réseaux sociaux", latestOnSocial: "Les dernières actualités sur les réseaux",
    categories: "Catégories", allCategories: "Toutes les catégories", quickLinks: "Liens utiles", category: "Catégorie", tag: "Étiquette", posts: "articles", post: "article", articles: "articles", results: "résultats", result: "résultat",
    resultsFor: "Résultats pour", nothingFound: "Aucun résultat. Essayez d'autres mots.", typeToSearch: "Tapez quelque chose pour rechercher.", noPosts: "Aucun article.",
    summary: "Résumé", keyPoints: "Points clés", toc: "Sommaire", hide: "Masquer", show: "Afficher", alsoRead: "À lire aussi", continueReading: "Lire la suite", faq: "Questions fréquentes",
    readMore: "Lire plus", leaveComment: "Laisser un commentaire", comments: "Commentaires", shareThoughts: "Partagez votre avis...", name: "Nom", email: "E-mail", rememberMe: "Enregistrer mon nom et mon e-mail dans ce navigateur pour la prochaine fois.",
    postComment: "Publier le commentaire", posting: "Publication…", replyingTo: "Réponse à", reply: "Répondre", cancel: "Annuler", showMore: "Voir plus", inThisArticle: "Dans cet article", backToTop: "Revenir en haut",
    addPreferred1: "Ajouter comme source", addPreferred2: "préférée sur Google", joinUs: "Rejoignez-nous", joinNow: "Rejoindre", joinWhatsapp: "Rejoindre WhatsApp", joinTelegram: "Rejoindre Telegram",
    getNotifications: "Recevoir les notifications", notificationsEnabled: "Notifications activées !", notificationsBlocked: "Les notifications sont bloquées", message: "Message", sendMessage: "Envoyer", sending: "Envoi…",
    thankYou: "Merci ! Votre message a été envoyé.", notFoundTitle: "Cette page n'existe pas ou a été déplacée.", goHome: "Retour à l'accueil", previous: "Précédent", next: "Suivant", page: "Page", minRead: "min de lecture",
  },
  pt: {
    share: "Compartilhar", copyLink: "Copiar link", copied: "Copiado!",
    home: "Início", search: "Pesquisar", searchFor: "Pesquisar:", searchPlaceholder: "Digite palavras-chave....", by: "Por", on: "Em:", logIn: "Entrar", subscribe: "Assinar",
    darkMode: "Modo escuro", helloReader: "Olá, leitor", followUs: "Siga-nos", followUsSocial: "Siga-nos nas redes sociais", latestOnSocial: "Receba as últimas novidades nas redes",
    categories: "Categorias", allCategories: "Todas as categorias", quickLinks: "Links rápidos", category: "Categoria", tag: "Tag", posts: "posts", post: "post", articles: "artigos", results: "resultados", result: "resultado",
    resultsFor: "Resultados para", nothingFound: "Nada encontrado. Tente outras palavras.", typeToSearch: "Digite algo para pesquisar.", noPosts: "Nenhum post encontrado.",
    summary: "Resumo", keyPoints: "Pontos-chave", toc: "Índice", hide: "Ocultar", show: "Mostrar", alsoRead: "Leia também", continueReading: "Continuar lendo", faq: "Perguntas frequentes",
    readMore: "Leia mais", leaveComment: "Deixe um comentário", comments: "Comentários", shareThoughts: "Compartilhe sua opinião...", name: "Nome", email: "E-mail", rememberMe: "Salvar meu nome e e-mail neste navegador para a próxima vez.",
    postComment: "Publicar comentário", posting: "Publicando…", replyingTo: "Respondendo a", reply: "Responder", cancel: "Cancelar", showMore: "Ver mais", inThisArticle: "Neste artigo", backToTop: "Voltar ao topo",
    addPreferred1: "Adicionar como fonte", addPreferred2: "preferida no Google", joinUs: "Junte-se", joinNow: "Entrar agora", joinWhatsapp: "Entrar no WhatsApp", joinTelegram: "Entrar no Telegram",
    getNotifications: "Receber notificações", notificationsEnabled: "Notificações ativadas!", notificationsBlocked: "As notificações estão bloqueadas", message: "Mensagem", sendMessage: "Enviar mensagem", sending: "Enviando…",
    thankYou: "Obrigado! Sua mensagem foi enviada.", notFoundTitle: "Esta página não existe ou foi movida.", goHome: "Ir para o início", previous: "Anterior", next: "Próximo", page: "Página", minRead: "min de leitura",
  },
  ar: {
    share: "مشاركة", copyLink: "نسخ الرابط", copied: "تم النسخ!",
    home: "الرئيسية", search: "بحث", searchFor: "ابحث عن:", searchPlaceholder: "اكتب كلمات البحث....", by: "بقلم", on: "في:", logIn: "تسجيل الدخول", subscribe: "اشترك",
    darkMode: "الوضع الداكن", helloReader: "مرحبًا أيها القارئ", followUs: "تابعنا", followUsSocial: "تابعنا على وسائل التواصل", latestOnSocial: "احصل على آخر التحديثات",
    categories: "الأقسام", allCategories: "كل الأقسام", quickLinks: "روابط سريعة", category: "القسم", tag: "وسم", posts: "مقالات", post: "مقال", articles: "مقالات", results: "نتائج", result: "نتيجة",
    resultsFor: "نتائج البحث عن", nothingFound: "لم يتم العثور على شيء. جرّب كلمات أخرى.", typeToSearch: "اكتب شيئًا للبحث.", noPosts: "لا توجد مقالات.",
    summary: "الملخص", keyPoints: "أهم النقاط", toc: "جدول المحتويات", hide: "إخفاء", show: "إظهار", alsoRead: "اقرأ أيضًا", continueReading: "تابع القراءة", faq: "الأسئلة الشائعة",
    readMore: "اقرأ المزيد", leaveComment: "اترك تعليقًا", comments: "التعليقات", shareThoughts: "شاركنا رأيك...", name: "الاسم", email: "البريد الإلكتروني", rememberMe: "احفظ اسمي وبريدي في هذا المتصفح للمرة القادمة.",
    postComment: "نشر التعليق", posting: "جارٍ النشر…", replyingTo: "رد على", reply: "رد", cancel: "إلغاء", showMore: "عرض المزيد", inThisArticle: "في هذا المقال", backToTop: "العودة للأعلى",
    addPreferred1: "أضف كمصدر", addPreferred2: "مفضل على Google", joinUs: "انضم إلينا", joinNow: "انضم الآن", joinWhatsapp: "انضم إلى واتساب", joinTelegram: "انضم إلى تيليجرام",
    getNotifications: "احصل على الإشعارات", notificationsEnabled: "تم تفعيل الإشعارات!", notificationsBlocked: "الإشعارات محظورة", message: "الرسالة", sendMessage: "إرسال الرسالة", sending: "جارٍ الإرسال…",
    thankYou: "شكرًا! تم إرسال رسالتك.", notFoundTitle: "هذه الصفحة غير موجودة أو تم نقلها.", goHome: "العودة للرئيسية", previous: "السابق", next: "التالي", page: "صفحة", minRead: "دقائق للقراءة",
  },
};

export function normLang(v: string | undefined | null): Lang {
  const l = String(v ?? "en").toLowerCase().slice(0, 2);
  return (LANGS as readonly string[]).includes(l) ? (l as Lang) : "en";
}

export function dict(lang: Lang): Dict {
  return lang === "en" ? EN : { ...EN, ...T[lang] };
}

/**
 * A Customizer label: shown as the admin typed it, but if it is still the
 * untouched English default it is translated to the site language.
 */
export function tl(value: string, key: keyof Dict, d: Dict): string {
  const v = (value ?? "").trim();
  if (!v || v === EN[key]) return d[key];
  return value;
}
