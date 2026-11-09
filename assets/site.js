/* Renders the public pages from content.json / the Cloudflare API. */
(() => {
  const CACHE_KEY = "tenzou-content-v2";
  const page = document.body.dataset.page || "";
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  const ICONS = {
    email:
      '<svg viewBox="2.45 2.95 19.1 18.1" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3.5" width="18" height="17" rx="2.5"></rect><path d="m3.6 5.4 8.4 6.4 8.4-6.4"></path></svg>',
    github:
      '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"></path></svg>',
    x:
      '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z"></path></svg>',
    telegram:
      '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"></path></svg>',
    instagram:
      '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7.0301.084c-1.2768.0602-2.1487.264-2.911.5634-.7888.3075-1.4575.72-2.1228 1.3877-.6652.6677-1.075 1.3368-1.3802 2.127-.2954.7638-.4956 1.6365-.552 2.914-.0564 1.2775-.0689 1.6882-.0626 4.947.0062 3.2586.0206 3.6671.0825 4.9473.061 1.2765.264 2.1482.5635 2.9107.308.7889.72 1.4573 1.388 2.1228.6679.6655 1.3365 1.0743 2.1285 1.38.7632.295 1.6361.4961 2.9134.552 1.2773.056 1.6884.069 4.9462.0627 3.2578-.0062 3.668-.0207 4.9478-.0814 1.28-.0607 2.147-.2652 2.9098-.5633.7889-.3086 1.4578-.72 2.1228-1.3881.665-.6682 1.0745-1.3378 1.3795-2.1284.2957-.7632.4966-1.636.552-2.9124.056-1.2809.0692-1.6898.063-4.948-.0063-3.2583-.021-3.6668-.0817-4.9465-.0607-1.2797-.264-2.1487-.5633-2.9117-.3084-.7889-.72-1.4568-1.3876-2.1228C21.2982 1.33 20.628.9208 19.8378.6165 19.074.321 18.2017.1197 16.9244.0645 15.6471.0093 15.236-.005 11.977.0014 8.718.0076 8.31.0215 7.0301.0839m.1402 21.6932c-1.17-.0509-1.8053-.2453-2.2287-.408-.5606-.216-.96-.4771-1.3819-.895-.422-.4178-.6811-.8186-.9-1.378-.1644-.4234-.3624-1.058-.4171-2.228-.0595-1.2645-.072-1.6442-.079-4.848-.007-3.2037.0053-3.583.0607-4.848.05-1.169.2456-1.805.408-2.2282.216-.5613.4762-.96.895-1.3816.4188-.4217.8184-.6814 1.3783-.9003.423-.1651 1.0575-.3614 2.227-.4171 1.2655-.06 1.6447-.072 4.848-.079 3.2033-.007 3.5835.005 4.8495.0608 1.169.0508 1.8053.2445 2.228.408.5608.216.96.4754 1.3816.895.4217.4194.6816.8176.9005 1.3787.1653.4217.3617 1.056.4169 2.2263.0602 1.2655.0739 1.645.0796 4.848.0058 3.203-.0055 3.5834-.061 4.848-.051 1.17-.245 1.8055-.408 2.2294-.216.5604-.4763.96-.8954 1.3814-.419.4215-.8181.6811-1.3783.9-.4224.1649-1.0577.3617-2.2262.4174-1.2656.0595-1.6448.072-4.8493.079-3.2045.007-3.5825-.006-4.848-.0608M16.953 5.5864A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.4424M5.8385 12.012c.0067 3.4032 2.7706 6.1557 6.173 6.1493 3.4026-.0065 6.157-2.7701 6.1506-6.1733-.0065-3.4032-2.771-6.1565-6.174-6.1498-3.403.0067-6.156 2.771-6.1496 6.1738M8 12.0077a4 4 0 1 1 4.008 3.9921A3.9996 3.9996 0 0 1 8 12.0077"></path></svg>',
    facebook:
      '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z"></path></svg>',
    linkedin:
      '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"></path></svg>',
    youtube:
      '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"></path></svg>',
    tiktok:
      '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"></path></svg>',
    whatsapp:
      '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"></path></svg>',
    discord:
      '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"></path></svg>',
    reddit:
      '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 0C5.373 0 0 5.373 0 12c0 3.314 1.343 6.314 3.515 8.485l-2.286 2.286C.775 23.225 1.097 24 1.738 24H12c6.627 0 12-5.373 12-12S18.627 0 12 0Zm4.388 3.199c1.104 0 1.999.895 1.999 1.999 0 1.105-.895 2-1.999 2-.946 0-1.739-.657-1.947-1.539v.002c-1.147.162-2.032 1.15-2.032 2.341v.007c1.776.067 3.4.567 4.686 1.363.473-.363 1.064-.58 1.707-.58 1.547 0 2.802 1.254 2.802 2.802 0 1.117-.655 2.081-1.601 2.531-.088 3.256-3.637 5.876-7.997 5.876-4.361 0-7.905-2.617-7.998-5.87-.954-.447-1.614-1.415-1.614-2.538 0-1.548 1.255-2.802 2.803-2.802.645 0 1.239.218 1.712.585 1.275-.79 2.881-1.291 4.64-1.365v-.01c0-1.663 1.263-3.034 2.88-3.207.188-.911.993-1.595 1.959-1.595Zm-8.085 8.376c-.784 0-1.459.78-1.506 1.797-.047 1.016.64 1.429 1.426 1.429.786 0 1.371-.369 1.418-1.385.047-1.017-.553-1.841-1.338-1.841Zm7.406 0c-.786 0-1.385.824-1.338 1.841.047 1.017.634 1.385 1.418 1.385.785 0 1.473-.413 1.426-1.429-.046-1.017-.721-1.797-1.506-1.797Zm-3.703 4.013c-.974 0-1.907.048-2.77.135-.147.015-.241.168-.183.305.483 1.154 1.622 1.964 2.953 1.964 1.33 0 2.47-.81 2.953-1.964.057-.137-.037-.29-.184-.305-.863-.087-1.795-.135-2.769-.135Z"></path></svg>',
    pinterest:
      '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.39 18.592.026 11.985.026L12.017 0z"></path></svg>',
    twitch:
      '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"></path></svg>',
    spotify:
      '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"></path></svg>',
    medium:
      '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4.21 0A4.201 4.201 0 0 0 0 4.21v15.58A4.201 4.201 0 0 0 4.21 24h15.58A4.201 4.201 0 0 0 24 19.79v-1.093c-.137.013-.278.02-.422.02-2.577 0-4.027-2.146-4.09-4.832a7.592 7.592 0 0 1 .022-.708c.093-1.186.475-2.241 1.105-3.022a3.885 3.885 0 0 1 1.395-1.1c.468-.237 1.127-.367 1.664-.367h.023c.101 0 .202.004.303.01V4.211A4.201 4.201 0 0 0 19.79 0Zm.198 5.583h4.165l3.588 8.435 3.59-8.435h3.864v.146l-.019.004c-.705.16-1.063.397-1.063 1.254h-.003l.003 10.274c.06.676.424.885 1.063 1.03l.02.004v.145h-4.923v-.145l.019-.005c.639-.144.994-.353 1.054-1.03V7.267l-4.745 11.15h-.261L6.15 7.569v9.445c0 .857.358 1.094 1.063 1.253l.02.004v.147H4.405v-.147l.019-.004c.705-.16 1.065-.397 1.065-1.253V6.987c0-.857-.358-1.094-1.064-1.254l-.018-.004zm19.25 3.668c-1.086.023-1.733 1.323-1.813 3.124H24V9.298a1.378 1.378 0 0 0-.342-.047Zm-1.862 3.632c-.1 1.756.86 3.239 2.204 3.634v-3.634z"></path></svg>',
    threads:
      '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.263 11.097c-.03-3.486-1.92-5.586-5.111-5.586-2.13 0-3.922.963-4.863 2.499l2.062 1.438c.535-.843 1.272-1.543 2.628-1.543 1.528 0 2.318.85 2.544 2.431a15 15 0 0 0-2.236-.173c-4.125 0-6.068 1.867-6.068 4.336s1.943 3.99 4.804 3.99c3.139 0 5.013-2.115 5.781-4.735.798.361 1.348 1.204 1.348 2.47 0 3.387-3.907 5.232-7.22 5.232-4.885 0-8.077-3.207-8.077-8.424 0-6.392 4.223-10.487 9.9-10.487 3.808 0 5.69 1.671 6.97 3.914l2.108-1.475C21.44 2.078 18.331 0 13.663 0 6.227 0 1.168 5.277 1.168 12.934c0 7 4.953 11.066 10.856 11.066 4.878 0 9.809-2.846 9.809-7.716 0-2.545-1.46-4.231-3.569-5.187m-6.33 4.855c-1.077 0-2.026-.512-2.026-1.453 0-1.483 1.822-1.934 3.606-1.934.678 0 1.34.045 1.927.173-.422 1.927-1.671 3.215-3.508 3.214Z"></path></svg>',
    bluesky:
      '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M5.202 2.857C7.954 4.922 10.913 9.11 12 11.358c1.087-2.247 4.046-6.436 6.798-8.501C20.783 1.366 24 .213 24 3.883c0 .732-.42 6.156-.667 7.037-.856 3.061-3.978 3.842-6.755 3.37 4.854.826 6.089 3.562 3.422 6.299-5.065 5.196-7.28-1.304-7.847-2.97-.104-.305-.152-.448-.153-.327 0-.121-.05.022-.153.327-.568 1.666-2.782 8.166-7.847 2.97-2.667-2.737-1.432-5.473 3.422-6.3-2.777.473-5.899-.308-6.755-3.369C.42 10.04 0 4.615 0 3.883c0-3.67 3.217-2.517 5.202-1.026"></path></svg>',
    gitlab:
      '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m23.6004 9.5927-.0337-.0862L20.3.9814a.851.851 0 0 0-.3362-.405.8748.8748 0 0 0-.9997.0539.8748.8748 0 0 0-.29.4399l-2.2055 6.748H7.5375l-2.2057-6.748a.8573.8573 0 0 0-.29-.4412.8748.8748 0 0 0-.9997-.0537.8585.8585 0 0 0-.3362.4049L.4332 9.5015l-.0325.0862a6.0657 6.0657 0 0 0 2.0119 7.0105l.0113.0087.03.0213 4.976 3.7264 2.462 1.8633 1.4995 1.1321a1.0085 1.0085 0 0 0 1.2197 0l1.4995-1.1321 2.4619-1.8633 5.006-3.7489.0125-.01a6.0682 6.0682 0 0 0 2.0094-7.003z"></path></svg>',
    stackoverflow:
      '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M15.725 0l-1.72 1.277 6.39 8.588 1.716-1.277L15.725 0zm-3.94 3.418l-1.369 1.644 8.225 6.85 1.369-1.644-8.225-6.85zm-3.15 4.465l-.905 1.94 9.702 4.517.904-1.94-9.701-4.517zm-1.85 4.86l-.44 2.093 10.473 2.201.44-2.092-10.473-2.203zM1.89 15.47V24h19.19v-8.53h-2.133v6.397H4.021v-6.396H1.89zm4.265 2.133v2.13h10.66v-2.13H6.154Z"></path></svg>',
    dribbble:
      '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 24C5.385 24 0 18.615 0 12S5.385 0 12 0s12 5.385 12 12-5.385 12-12 12zm10.12-10.358c-.35-.11-3.17-.953-6.384-.438 1.34 3.684 1.887 6.684 1.992 7.308 2.3-1.555 3.936-4.02 4.395-6.87zm-6.115 7.808c-.153-.9-.75-4.032-2.19-7.77l-.066.02c-5.79 2.015-7.86 6.025-8.04 6.4 1.73 1.358 3.92 2.166 6.29 2.166 1.42 0 2.77-.29 4-.814zm-11.62-2.58c.232-.4 3.045-5.055 8.332-6.765.135-.045.27-.084.405-.12-.26-.585-.54-1.167-.832-1.74C7.17 11.775 2.206 11.71 1.756 11.7l-.004.312c0 2.633.998 5.037 2.634 6.855zm-2.42-8.955c.46.008 4.683.026 9.477-1.248-1.698-3.018-3.53-5.558-3.8-5.928-2.868 1.35-5.01 3.99-5.676 7.17zM9.6 2.052c.282.38 2.145 2.914 3.822 6 3.645-1.365 5.19-3.44 5.373-3.702-1.81-1.61-4.19-2.586-6.795-2.586-.825 0-1.63.1-2.4.285zm10.335 3.483c-.218.29-1.935 2.493-5.724 4.04.24.49.47.985.68 1.486.08.18.15.36.22.53 3.41-.43 6.8.26 7.14.33-.02-2.42-.88-4.64-2.31-6.38z"></path></svg>',
    behance:
      '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16.969 16.927a2.561 2.561 0 0 0 1.901.677 2.501 2.501 0 0 0 1.531-.475c.362-.235.636-.584.779-.99h2.585a5.091 5.091 0 0 1-1.9 2.896 5.292 5.292 0 0 1-3.091.88 5.839 5.839 0 0 1-2.284-.433 4.871 4.871 0 0 1-1.723-1.211 5.657 5.657 0 0 1-1.08-1.874 7.057 7.057 0 0 1-.383-2.393c-.005-.8.129-1.595.396-2.349a5.313 5.313 0 0 1 5.088-3.604 4.87 4.87 0 0 1 2.376.563c.661.362 1.231.87 1.668 1.485a6.2 6.2 0 0 1 .943 2.133c.194.821.263 1.666.205 2.508h-7.699c-.063.79.184 1.574.688 2.187ZM6.947 4.084a8.065 8.065 0 0 1 1.928.198 4.29 4.29 0 0 1 1.49.638c.418.303.748.711.958 1.182.241.579.357 1.203.341 1.83a3.506 3.506 0 0 1-.506 1.961 3.726 3.726 0 0 1-1.503 1.287 3.588 3.588 0 0 1 2.027 1.437c.464.747.697 1.615.67 2.494a4.593 4.593 0 0 1-.423 2.032 3.945 3.945 0 0 1-1.163 1.413 5.114 5.114 0 0 1-1.683.807 7.135 7.135 0 0 1-1.928.259H0V4.084h6.947Zm-.235 12.9c.308.004.616-.029.916-.099a2.18 2.18 0 0 0 .766-.332c.228-.158.411-.371.534-.619.142-.317.208-.663.191-1.009a2.08 2.08 0 0 0-.642-1.715 2.618 2.618 0 0 0-1.696-.505h-3.54v4.279h3.471Zm13.635-5.967a2.13 2.13 0 0 0-1.654-.619 2.336 2.336 0 0 0-1.163.259 2.474 2.474 0 0 0-.738.62 2.359 2.359 0 0 0-.396.792c-.074.239-.12.485-.137.734h4.769a3.239 3.239 0 0 0-.679-1.785l-.002-.001Zm-13.813-.648a2.254 2.254 0 0 0 1.423-.433c.399-.355.607-.88.56-1.413a1.916 1.916 0 0 0-.178-.891 1.298 1.298 0 0 0-.495-.533 1.851 1.851 0 0 0-.711-.274 3.966 3.966 0 0 0-.835-.073H3.241v3.631h3.293v-.014ZM21.62 5.122h-5.976v1.527h5.976V5.122Z"></path></svg>',
    mastodon:
      '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M23.268 5.313c-.35-2.578-2.617-4.61-5.304-5.004C17.51.242 15.792 0 11.813 0h-.03c-3.98 0-4.835.242-5.288.309C3.882.692 1.496 2.518.917 5.127.64 6.412.61 7.837.661 9.143c.074 1.874.088 3.745.26 5.611.118 1.24.325 2.47.62 3.68.55 2.237 2.777 4.098 4.96 4.857 2.336.792 4.849.923 7.256.38.265-.061.527-.132.786-.213.585-.184 1.27-.39 1.774-.753a.057.057 0 0 0 .023-.043v-1.809a.052.052 0 0 0-.02-.041.053.053 0 0 0-.046-.01 20.282 20.282 0 0 1-4.709.545c-2.73 0-3.463-1.284-3.674-1.818a5.593 5.593 0 0 1-.319-1.433.053.053 0 0 1 .066-.054c1.517.363 3.072.546 4.632.546.376 0 .75 0 1.125-.01 1.57-.044 3.224-.124 4.768-.422.038-.008.077-.015.11-.024 2.435-.464 4.753-1.92 4.989-5.604.008-.145.03-1.52.03-1.67.002-.512.167-3.63-.024-5.545zm-3.748 9.195h-2.561V8.29c0-1.309-.55-1.976-1.67-1.976-1.23 0-1.846.79-1.846 2.35v3.403h-2.546V8.663c0-1.56-.617-2.35-1.848-2.35-1.112 0-1.668.668-1.67 1.977v6.218H4.822V8.102c0-1.31.337-2.35 1.011-3.12.696-.77 1.608-1.164 2.74-1.164 1.311 0 2.302.5 2.962 1.498l.638 1.06.638-1.06c.66-.999 1.65-1.498 2.96-1.498 1.13 0 2.043.395 2.74 1.164.675.77 1.012 1.81 1.012 3.12z"></path></svg>',
    devdotto:
      '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7.42 10.05c-.18-.16-.46-.23-.84-.23H6l.02 2.44.04 2.45.56-.02c.41 0 .63-.07.83-.26.24-.24.26-.36.26-2.2 0-1.91-.02-1.96-.29-2.18zM0 4.94v14.12h24V4.94H0zM8.56 15.3c-.44.58-1.06.77-2.53.77H4.71V8.53h1.4c1.67 0 2.16.18 2.6.9.27.43.29.6.32 2.57.05 2.23-.02 2.73-.47 3.3zm5.09-5.47h-2.47v1.77h1.52v1.28l-.72.04-.75.03v1.77l1.22.03 1.2.04v1.28h-1.6c-1.53 0-1.6-.01-1.87-.3l-.3-.28v-3.16c0-3.02.01-3.18.25-3.48.23-.31.25-.31 1.88-.31h1.64v1.3zm4.68 5.45c-.17.43-.64.79-1 .79-.18 0-.45-.15-.67-.39-.32-.32-.45-.63-.82-2.08l-.9-3.39-.45-1.67h.76c.4 0 .75.02.75.05 0 .06 1.16 4.54 1.26 4.83.04.15.32-.7.73-2.3l.66-2.52.74-.04c.4-.02.73 0 .73.04 0 .14-1.67 6.38-1.8 6.68z"></path></svg>',
    link:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.5.5l2-2a5 5 0 0 0-7-7l-1.2 1.2"></path><path d="M14 11a5 5 0 0 0-7.5-.5l-2 2a5 5 0 0 0 7 7l1.2-1.2"></path></svg>',
  };
  const SOCIAL_LABEL = {
    email: "Email",
    github: "GitHub",
    x: "X",
    telegram: "Telegram",
    instagram: "Instagram",
    facebook: "Facebook",
    linkedin: "LinkedIn",
    youtube: "YouTube",
    tiktok: "TikTok",
    whatsapp: "WhatsApp",
    discord: "Discord",
    reddit: "Reddit",
    pinterest: "Pinterest",
    twitch: "Twitch",
    spotify: "Spotify",
    medium: "Medium",
    threads: "Threads",
    bluesky: "Bluesky",
    gitlab: "GitLab",
    stackoverflow: "Stack Overflow",
    dribbble: "Dribbble",
    behance: "Behance",
    mastodon: "Mastodon",
    devdotto: "dev.to",
    link: "Link",
  };

  const SOCIAL_HOSTS = [
    ["github.com", "github"],
    ["x.com", "x"],
    ["twitter.com", "x"],
    ["t.me", "telegram"],
    ["telegram.me", "telegram"],
    ["telegram.org", "telegram"],
    ["instagram.com", "instagram"],
    ["facebook.com", "facebook"],
    ["fb.com", "facebook"],
    ["linkedin.com", "linkedin"],
    ["youtube.com", "youtube"],
    ["youtu.be", "youtube"],
    ["tiktok.com", "tiktok"],
    ["wa.me", "whatsapp"],
    ["whatsapp.com", "whatsapp"],
    ["discord.gg", "discord"],
    ["discord.com", "discord"],
    ["reddit.com", "reddit"],
    ["twitch.tv", "twitch"],
    ["spotify.com", "spotify"],
    ["medium.com", "medium"],
    ["threads.net", "threads"],
    ["threads.com", "threads"],
    ["bsky.app", "bluesky"],
    ["gitlab.com", "gitlab"],
    ["stackoverflow.com", "stackoverflow"],
    ["dribbble.com", "dribbble"],
    ["behance.net", "behance"],
    ["dev.to", "devdotto"],
  ];

  /* Icon follows the URL, so pasting an Instagram/Facebook link is enough. */
  function detectSocialType(url, declared) {
    const explicit = String(declared || "").toLowerCase();
    if (explicit && explicit !== "link" && ICONS[explicit]) return explicit;

    if (/^mailto:/i.test(url)) return "email";

    let host = "";
    try {
      host = new URL(url).hostname.replace(/^www\./i, "").toLowerCase();
    } catch (e) {
      return "link";
    }

    if (host === "pinterest.com" || host.startsWith("pinterest.")) return "pinterest";
    if (host.includes("mastodon")) return "mastodon";

    for (const [suffix, type] of SOCIAL_HOSTS) {
      if (host === suffix || host.endsWith("." + suffix)) return type;
    }

    return "link";
  }

  function safeUrl(value, allowMail) {
    const url = String(value || "").trim();
    if (!url) return "";
    if (/^https?:\/\//i.test(url)) return url;
    if (allowMail && /^mailto:/i.test(url)) return url;
    return "";
  }

  function cacheRead() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function cacheWrite(content) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(content));
    } catch (e) {
      /* ignore */
    }
  }

  async function loadContent() {
    try {
      const res = await fetch("/api/content", {
        headers: { accept: "application/json" },
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.content && typeof data.content === "object") {
          cacheWrite(data.content);
          return data.content;
        }
      }
    } catch (e) {
      /* no API (static hosting or local file) */
    }

    try {
      const res = await fetch("content.json", { cache: "no-cache" });
      if (res.ok) {
        const data = await res.json();
        cacheWrite(data);
        return data;
      }
    } catch (e) {
      /* ignore */
    }

    return cacheRead();
  }

  function fillChrome(content) {
    const name = String(content.name || "").trim();
    $$("[data-brand]").forEach((el) => {
      el.textContent = name ? name + "." : ".";
    });
    $$("[data-version]").forEach((el) => {
      if (content.version) el.textContent = content.version;
    });
    if (page !== "admin" && typeof window.tzApplyFont === "function") {
      window.tzApplyFont(content.font);
    }
    if (typeof window.tzApplyBackground === "function") {
      window.tzApplyBackground(content.background, content.backgroundOpacity);
    }
  }

  function renderName(el, name) {
    const label = String(name || "").trim();
    if (el.getAttribute("aria-label") === label && el.childElementCount > 0) return;

    el.setAttribute("aria-label", label);
    el.textContent = "";

    [...label]
      .filter((char) => char.trim() !== "")
      .forEach((char, index) => {
        const span = document.createElement("span");
        span.textContent = char;
        span.style.setProperty("--i", String(index));
        span.setAttribute("aria-hidden", "true");
        el.append(span);
      });

    const dot = document.createElement("span");
    dot.textContent = ".";
    dot.style.setProperty("--i", String([...label].filter((char) => char.trim() !== "").length));
    dot.setAttribute("aria-hidden", "true");
    el.append(dot);
  }

  function renderSocials(container, socials) {
    if (!container) return;
    container.textContent = "";

    (Array.isArray(socials) ? socials : []).forEach((item) => {
      const url = safeUrl(item && item.url, true);
      if (!url) return;

      const type = detectSocialType(url, item && item.type);
      const label = SOCIAL_LABEL[type] || SOCIAL_LABEL.link;
      const link = document.createElement("a");

      link.href = url;
      link.setAttribute("aria-label", label);
      link.title = label.toLowerCase();
      link.innerHTML = ICONS[type] || ICONS.link;

      if (/^https?:/i.test(url)) {
        link.target = "_blank";
        link.rel = "noopener noreferrer";
      }

      container.append(link);
    });

    container.hidden = container.children.length === 0;
  }

  async function loadStatus() {
    try {
      const res = await fetch("/api/status", {
        headers: { accept: "application/json" },
        cache: "no-store",
      });
      if (!res.ok) return null;

      const data = await res.json();
      return data && data.ok ? data : null;
    } catch (e) {
      return null;
    }
  }

  function startUptime(el, since) {
    if (!el) return;

    const started = Date.parse(since);
    if (!Number.isFinite(started)) return;

    const pad = (value) => String(value).padStart(2, "0");

    const tick = () => {
      const total = Math.max(0, Date.now() - started);
      const days = Math.floor(total / 86400000);
      const hours = Math.floor(total / 3600000) % 24;
      const minutes = Math.floor(total / 60000) % 60;
      const seconds = Math.floor(total / 1000) % 60;
      const millis = Math.floor(total) % 1000;

      el.textContent =
        days +
        "." +
        pad(hours) +
        pad(minutes) +
        pad(seconds) +
        String(millis).padStart(3, "0");
      el.hidden = false;
    };

    el.title = "Site uptime (days.hhmmss.mmm)";
    tick();

    const frame = () => {
      tick();
      requestAnimationFrame(frame);
    };

    requestAnimationFrame(frame);
  }

  async function renderWhere(el) {
    if (!el) return;
    try {
      const res = await fetch("/api/where", {
        headers: { accept: "application/json" },
        cache: "no-store",
      });
      if (!res.ok) throw new Error("no api");

      const data = await res.json();
      const lat = Number(data && data.lat);
      const lon = Number(data && data.lon);

      if (!data || data.ok === false || !Number.isFinite(lat) || !Number.isFinite(lon)) {
        throw new Error("no geo");
      }

      const place = [data.city, data.country].filter(Boolean).join(", ");
      el.textContent = lat.toFixed(5) + ", " + lon.toFixed(5);
      el.title = "Your approximate location" + (place ? " — " + place : "");
      el.hidden = false;
    } catch (e) {
      el.hidden = true;
      el.textContent = "";
    }
  }

  function listNote(text) {
    const li = document.createElement("li");
    const p = document.createElement("p");
    p.className = "list-note";
    p.textContent = text;
    li.append(p);
    return li;
  }

  function formatDate(value) {
    const raw = String(value || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    const date = new Date(raw + "T00:00:00");
    if (Number.isNaN(date.getTime())) return raw;
    return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  }

  function slugify(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80);
  }

  function postTags(value) {
    const list = Array.isArray(value) ? value : String(value || "").split(",");
    return list
      .map((tag) => String(tag || "").trim().replace(/^#+/, ""))
      .filter(Boolean)
      .slice(0, 6);
  }

  function readingTime(body) {
    const words = String(body || "")
      .replace(/[#>*`[\]-]/g, " ")
      .trim()
      .split(/\s+/)
      .filter(Boolean).length;
    return Math.max(1, Math.round(words / 200));
  }

  function appendInline(text, parent) {
    const pattern =
      /(`[^`\n]+`|\*\*[^*\n]+\*\*|__[^_\n]+__|\[[^\]\n]+\]\(https?:\/\/[^)\s]+\)|\*[^*\n]+\*)/g;
    let last = 0;
    let match;

    while ((match = pattern.exec(text))) {
      if (match.index > last) {
        parent.append(document.createTextNode(text.slice(last, match.index)));
      }

      const token = match[0];

      if (token.startsWith("`")) {
        const code = document.createElement("code");
        code.textContent = token.slice(1, -1);
        parent.append(code);
      } else if (token.startsWith("**")) {
        const strong = document.createElement("strong");
        strong.textContent = token.slice(2, -2);
        parent.append(strong);
      } else if (token.startsWith("__")) {
        const underline = document.createElement("span");
        underline.className = "u";
        underline.textContent = token.slice(2, -2);
        parent.append(underline);
      } else if (token.startsWith("[")) {
        const link = /^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/.exec(token);
        if (link) {
          const a = document.createElement("a");
          a.href = link[2];
          a.target = "_blank";
          a.rel = "noopener noreferrer";
          a.textContent = link[1];
          parent.append(a);
        } else {
          parent.append(document.createTextNode(token));
        }
      } else {
        const em = document.createElement("em");
        em.textContent = token.slice(1, -1);
        parent.append(em);
      }

      last = pattern.lastIndex;
    }

    if (last < text.length) {
      parent.append(document.createTextNode(text.slice(last)));
    }
  }

  function renderInlineText(text, parent) {
    const lines = String(text || "").split("\n");
    lines.forEach((line, index) => {
      if (index) parent.append(document.createElement("br"));
      appendInline(line, parent);
    });
  }

  function renderHome(content) {
    const nameEl = $("[data-name]");
    if (nameEl) renderName(nameEl, content.name);

    const intro = $("[data-intro]");
    if (intro && content.intro) {
      intro.textContent = "";
      renderInlineText(content.intro, intro);
    }

    renderSocials($("[data-socials]"), content.socials);
    renderWhere($("[data-where]"));
  }

  function renderPosts(content) {
    const list = $("[data-posts]");
    if (!list) return;

    const posts = (Array.isArray(content.posts) ? content.posts : [])
      .filter((post) => post && String(post.title || "").trim())
      .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));

    list.textContent = "";

    if (!posts.length) {
      list.append(listNote("nothing published yet."));
      return;
    }

    posts.forEach((post) => {
      const li = document.createElement("li");
      const link = document.createElement("a");
      const slug = String(post.slug || "").trim() || slugify(post.title);

      link.className = "row";
      link.href = "post.html?slug=" + encodeURIComponent(slug);

      const title = document.createElement("span");
      title.className = "row-title";
      title.textContent = post.title;

      const meta = document.createElement("span");
      meta.className = "row-meta";
      meta.textContent = formatDate(post.date) + (post.body ? " · " + readingTime(post.body) + " min" : "");

      const arrow = document.createElement("span");
      arrow.className = "row-arrow";
      arrow.setAttribute("aria-hidden", "true");
      arrow.textContent = "↗";

      link.append(title, meta, arrow);
      li.append(link);

      if (post.summary) {
        const desc = document.createElement("p");
        desc.className = "row-desc";
        desc.textContent = post.summary;
        li.append(desc);
      }

      const tags = postTags(post.tags);
      if (tags.length) {
        const tagBox = document.createElement("div");
        tagBox.className = "tags";
        tags.forEach((tag) => {
          const badge = document.createElement("span");
          badge.className = "tag";
          badge.textContent = "#" + tag;
          tagBox.append(badge);
        });
        li.append(tagBox);
      }

      list.append(li);
    });
  }

  let projectsTabsReady = false;
  let communityFormReady = false;
  let communityLoaded = false;
  let communityLoading = false;

  const LANGUAGE_COLORS = {
    JavaScript: "#f1e05a",
    TypeScript: "#3178c6",
    Python: "#3572a5",
    HTML: "#e34c26",
    CSS: "#563d7c",
    SCSS: "#c6538c",
    Shell: "#89e051",
    Go: "#00add8",
    Rust: "#dea584",
    PHP: "#4f5d95",
    Ruby: "#701516",
    Java: "#b07219",
    "C++": "#f34b7d",
    C: "#555555",
    "C#": "#178600",
    Vue: "#41b883",
    Svelte: "#ff3e00",
    Astro: "#ff5a03",
    Dart: "#00b4ab",
    Kotlin: "#a97bff",
    Swift: "#f05138",
    Lua: "#000080",
    Nix: "#7e7eff",
    Dockerfile: "#384d54",
  };

  function communityNote(text) {
    const note = document.createElement("p");
    note.className = "list-note";
    note.textContent = text;
    return note;
  }

  function updateCommunityCount(count) {
    const badge = $("[data-community-count]");
    if (!badge) return;
    badge.textContent = count > 0 ? String(count) : "";
    badge.hidden = !(count > 0);
  }

  function setProjectTab(name, remember) {
    const active = name === "community" ? "community" : "mine";
    const tabs = $$("[data-projects-tab]");
    const panes = $$("[data-projects-pane]");
    const add = $("[data-community-open]");
    const subMine = $("[data-projects-sub-mine]");
    const subCommunity = $("[data-projects-sub-community]");

    tabs.forEach((tab) => {
      const selected = tab.dataset.projectsTab === active;
      tab.classList.toggle("is-active", selected);
      tab.setAttribute("aria-selected", selected ? "true" : "false");
      tab.tabIndex = selected ? 0 : -1;
    });

    panes.forEach((pane) => {
      pane.hidden = pane.dataset.projectsPane !== active;
    });

    if (add) add.hidden = active !== "community";
    if (subMine) subMine.hidden = active !== "mine";
    if (subCommunity) subCommunity.hidden = active !== "community";

    if (remember) {
      try {
        history.replaceState(
          null,
          "",
          active === "community" ? "#komunitas" : location.pathname + location.search
        );
      } catch (e) {
        /* ignore */
      }
    }

    if (active === "community") loadCommunity();
  }

  function initProjectTabs() {
    if (projectsTabsReady) return;
    const tabs = $$("[data-projects-tab]");
    if (!tabs.length) return;

    projectsTabsReady = true;

    tabs.forEach((tab) => {
      tab.addEventListener("click", () => setProjectTab(tab.dataset.projectsTab, true));
      tab.addEventListener("keydown", (event) => {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        event.preventDefault();
        const index = tabs.indexOf(tab);
        const next = tabs[(index + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length];
        next.focus();
        setProjectTab(next.dataset.projectsTab, true);
      });
    });

    const initial =
      location.hash === "#komunitas" ||
      location.hash === "#komunitas-tambah" ||
      new URLSearchParams(location.search).get("tambah") === "1"
        ? "community"
        : "mine";
    setProjectTab(initial, false);
  }

  function communityCard(project) {
    const repo = project.repo && typeof project.repo === "object" ? project.repo : {};
    const owner = String(repo.owner || "").trim() || "github";
    const name = String(repo.name || "").trim() || "repo";
    const repoUrl =
      safeUrl(repo.url, false) ||
      "https://github.com/" + encodeURIComponent(owner) + "/" + encodeURIComponent(name);

    const card = document.createElement("article");
    card.className = "gh-card";

    const head = document.createElement("div");
    head.className = "gh-head";

    const avatarWrap = document.createElement("span");
    avatarWrap.className = "gh-avatar-wrap";
    const avatar = document.createElement("img");
    avatar.className = "gh-avatar";
    avatar.alt = "";
    avatar.loading = "lazy";
    avatar.decoding = "async";
    avatar.width = 40;
    avatar.height = 40;
    avatar.referrerPolicy = "no-referrer";
    avatar.src =
      safeUrl(repo.avatar, false) ||
      "https://github.com/" + encodeURIComponent(owner) + ".png?size=80";

    const showInitial = () => {
      avatar.remove();
      avatarWrap.classList.add("is-letter");
      avatarWrap.textContent = owner.charAt(0).toUpperCase() || "?";
    };

    avatar.addEventListener("error", showInitial, { once: true });
    avatarWrap.append(avatar);

    const ident = document.createElement("div");
    ident.className = "gh-ident";

    const repoLink = document.createElement("a");
    repoLink.className = "gh-repo";
    repoLink.href = repoUrl;
    repoLink.target = "_blank";
    repoLink.rel = "noopener noreferrer";

    const ownerSpan = document.createElement("span");
    ownerSpan.className = "gh-owner";
    ownerSpan.textContent = owner;

    const nameSpan = document.createElement("span");
    nameSpan.className = "gh-name";
    nameSpan.textContent = name;

    repoLink.append(ownerSpan, " / ", nameSpan);

    const title = document.createElement("p");
    title.className = "gh-title";
    title.textContent = String(project.title || "").trim() || name;

    ident.append(repoLink, title);

    head.append(avatarWrap, ident);

    const stars = Math.max(0, Math.floor(Number(repo.stars) || 0));
    if (stars > 0) {
      const star = document.createElement("span");
      star.className = "gh-stars";
      star.textContent = "★ " + stars;
      star.title = stars + " stars";
      head.append(star);
    }

    card.append(head);

    const description = String(project.description || "").trim();
    if (description) {
      const desc = document.createElement("p");
      desc.className = "gh-desc";
      desc.textContent = description;
      card.append(desc);
    }

    const meta = document.createElement("div");
    meta.className = "gh-meta";

    const language = String(repo.language || "").trim();
    if (language) {
      const lang = document.createElement("span");
      lang.className = "gh-lang";
      const dot = document.createElement("span");
      dot.className = "gh-dot";
      dot.style.background = LANGUAGE_COLORS[language] || "var(--dim)";
      lang.append(dot, language);
      meta.append(lang);
    }

    if (repo.license) {
      const license = document.createElement("span");
      license.textContent = repo.license;
      meta.append(license);
    }

    const pushed = String(repo.pushedAt || "").slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(pushed)) {
      const updated = document.createElement("span");
      updated.textContent = "updated " + formatDate(pushed);
      meta.append(updated);
    }

    const socialUrl = safeUrl(project.social, false);
    if (socialUrl) {
      const type = detectSocialType(socialUrl, "");
      const label = SOCIAL_LABEL[type] || SOCIAL_LABEL.link;

      const social = document.createElement("a");
      social.className = "gh-social";
      social.href = socialUrl;
      social.target = "_blank";
      social.rel = "noopener noreferrer";

      let handle = "";
      try {
        const parsed = new URL(socialUrl);
        const segment = parsed.pathname.split("/").filter(Boolean)[0] || "";
        handle = segment.replace(/^@+/, "");
      } catch (e) {
        /* ignore */
      }

      const icon = document.createElement("span");
      icon.className = "gh-social-icon";
      icon.setAttribute("aria-hidden", "true");
      icon.innerHTML = ICONS[type] || ICONS.link;

      const text = document.createElement("span");
      text.textContent = handle ? "@" + handle : label.toLowerCase();

      social.setAttribute("aria-label", label + (handle ? " @" + handle : ""));
      social.append(icon, text);
      meta.append(social);
    }

    const demoUrl = safeUrl(project.demo, false);
    if (demoUrl) {
      const demo = document.createElement("a");
      demo.className = "gh-social";
      demo.href = demoUrl;
      demo.target = "_blank";
      demo.rel = "noopener noreferrer";
      demo.textContent = "demo ↗";
      meta.append(demo);
    }

    if (project.author) {
      const author = document.createElement("span");
      author.textContent = "by " + String(project.author).trim();
      meta.append(author);
    }

    if (meta.childElementCount) card.append(meta);

    return card;
  }

  function renderCommunity(container, projects) {
    container.textContent = "";

    const items = (Array.isArray(projects) ? projects : []).filter(
      (project) => project && String(project.title || "").trim() && project.repo
    );

    if (!items.length) {
      container.append(
        communityNote("belum ada project komunitas. kalau kamu punya repo, tekan + tambah.")
      );
      return;
    }

    items.forEach((project) => container.append(communityCard(project)));
  }

  async function loadCommunity(force) {
    const list = $("[data-community]");
    if (!list) return;
    if (communityLoading || (communityLoaded && !force)) return;

    communityLoading = true;
    list.textContent = "";
    list.append(communityNote("memuat…"));

    try {
      const res = await fetch("/api/community", {
        headers: { accept: "application/json" },
        cache: "no-store",
      });

      if (!res.ok) throw new Error("http " + res.status);

      const data = await res.json();
      const projects = data && Array.isArray(data.projects) ? data.projects : [];

      communityLoaded = true;
      renderCommunity(list, projects);
      updateCommunityCount(projects.length);
    } catch (e) {
      list.textContent = "";
      list.append(communityNote("daftar komunitas belum bisa dimuat. coba muat ulang halaman."));
    } finally {
      communityLoading = false;
    }
  }

  function setupCommunityForm() {
    if (communityFormReady) return;

    const open = $("[data-community-open]");
    const form = $("[data-community-form]");
    const close = $("[data-community-close]");
    const status = $("[data-community-status]");
    if (!open || !form) return;

    communityFormReady = true;

    const setFormStatus = (message, kind) => {
      if (!status) return;
      status.textContent = message || "";
      status.className = "status" + (kind ? " status--" + kind : "");
    };

    open.addEventListener("click", () => {
      form.hidden = false;
      setFormStatus("");
      const first = $('input[name="title"]', form);
      if (first) first.focus();
    });

    if (close) {
      close.addEventListener("click", () => {
        form.hidden = true;
        setFormStatus("");
      });
    }

    const wantsAdd =
      location.hash === "#komunitas-tambah" ||
      new URLSearchParams(location.search).get("tambah") === "1";

    if (wantsAdd) {
      form.hidden = false;
      queueMicrotask(() => {
        const first = $('input[name="title"]', form);
        if (first) first.focus();
      });
    }

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const data = new FormData(form);
      const payload = {
        title: String(data.get("title") || "").trim(),
        author: String(data.get("author") || "").trim(),
        description: String(data.get("description") || "").trim(),
        repo: String(data.get("repo") || "").trim(),
        social: String(data.get("social") || "").trim(),
        demo: String(data.get("demo") || "").trim(),
        website: String(data.get("website") || ""),
        consent: data.get("consent") === "on",
      };

      if (payload.title.length < 3) {
        setFormStatus("judul minimal 3 karakter.", "err");
        return;
      }
      if (payload.description.length < 10) {
        setFormStatus("deskripsi minimal 10 karakter.", "err");
        return;
      }
      if (!/^https?:\/\/(?:www\.)?github\.com\/[^/\s]+\/[^/\s]+/i.test(payload.repo)) {
        setFormStatus("link repo harus URL GitHub, mis. github.com/username/repo.", "err");
        return;
      }
      if (!payload.consent) {
        setFormStatus("centang persetujuan dulu ya.", "err");
        return;
      }

      const button = $('button[type="submit"]', form);
      if (button) button.disabled = true;
      setFormStatus("mengirim…");

      let adminToken = "";
      try {
        adminToken = sessionStorage.getItem("tenzou-admin") || "";
      } catch (e) {
        /* ignore */
      }

      const headers = { "content-type": "application/json", accept: "application/json" };
      if (adminToken) headers.authorization = "Bearer " + adminToken;

      try {
        const res = await fetch("/api/community", {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });

        const result = await res.json().catch(() => null);
        if (!res.ok || !result || !result.ok) {
          throw new Error((result && result.error) || "gagal mengirim (" + res.status + ")");
        }

        form.reset();
        setFormStatus(result.message || "terkirim — menunggu review.", "ok");
        if (typeof window.tzToast === "function") {
          window.tzToast(result.project ? "project ditambahkan ✓" : "project terkirim. menunggu review ✓");
        }
        if (result.project) loadCommunity(true);
      } catch (e) {
        const message = String(e && e.message ? e.message : e);
        setFormStatus(message, "err");
      } finally {
        if (button) button.disabled = false;
      }
    });
  }

  function renderProjects(content) {
    initProjectTabs();
    setupCommunityForm();

    const list = $("[data-projects]");
    const sub = $("[data-projects-sub-mine]") || $("[data-projects-sub]");
    if (!list) return;

    const user = String(content.github || "").replace(/[^a-zA-Z0-9-]/g, "");
    const profile = "https://github.com/" + user;
    const manual = (Array.isArray(content.projects) ? content.projects : []).filter(
      (project) => project && String(project.title || "").trim()
    );
    const manualUrls = new Set(
      manual.map((project) => safeUrl(project.url, false)).filter(Boolean)
    );

    if (sub) {
      sub.textContent = "";

      if (manual.length) {
        sub.append("Selected work");
        if (user) sub.append(", plus public repos from GitHub — ");
        else sub.append(".");
      } else if (user) {
        sub.append("Public repos from GitHub — ");
      } else {
        sub.append("Selected work and public repositories.");
      }

      if (user) {
        const link = document.createElement("a");
        link.href = profile;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.className = "inline-link";
        link.textContent = "@" + user;
        sub.append(link, ".");
      }
    }

    const paint = (repos, emptyNote) => {
      list.textContent = "";

      manual.forEach((project) => {
        const li = document.createElement("li");
        const url = safeUrl(project.url, false);
        const row = url ? document.createElement("a") : document.createElement("span");
        row.className = "row";

        if (url) {
          row.href = url;
          if (/^https?:/i.test(url)) {
            row.target = "_blank";
            row.rel = "noopener noreferrer";
          }
        }

        const title = document.createElement("span");
        title.className = "row-title";
        title.textContent = String(project.title || "").trim();

        const side = document.createElement("span");
        side.className = "row-side";

        if (project.meta) {
          const meta = document.createElement("span");
          meta.className = "row-meta";
          meta.textContent = String(project.meta).trim();
          side.append(meta);
        }

        if (url) {
          const arrow = document.createElement("span");
          arrow.className = "row-arrow";
          arrow.setAttribute("aria-hidden", "true");
          arrow.textContent = "↗";
          side.append(arrow);
        }

        const badges = document.createElement("span");
        badges.className = "row-badges";

        if (project.stack) {
          const labels = String(project.stack)
            .split(/\s*[·|]\s*/)
            .map((label) => label.trim())
            .filter(Boolean)
            .slice(0, 8);

          labels.forEach((label) => {
            const badge = document.createElement("span");
            badge.className = "badge";
            badge.textContent = label;
            badges.append(badge);
          });
        }

        row.append(title);
        if (side.childElementCount) row.append(side);
        if (badges.childElementCount) row.append(badges);

        li.append(row);

        if (project.description) {
          const desc = document.createElement("p");
          desc.className = "row-desc";
          desc.textContent = String(project.description).trim();
          li.append(desc);
        }

        list.append(li);
      });

      repos
        .filter((repo) => !manualUrls.has(repo.html_url))
        .forEach((repo) => {
          const li = document.createElement("li");
          const link = document.createElement("a");
          link.className = "row";
          link.href = repo.html_url;
          link.target = "_blank";
          link.rel = "noopener noreferrer";

          const title = document.createElement("span");
          title.className = "row-title";
          title.textContent = repo.name;

          const side = document.createElement("span");
          side.className = "row-side";

          const metaBits = [];
          if (repo.stargazers_count > 0) metaBits.push("★ " + repo.stargazers_count);
          if (repo.archived) metaBits.push("archived");

          if (metaBits.length) {
            const meta = document.createElement("span");
            meta.className = "row-meta";
            meta.textContent = metaBits.join(" · ");
            side.append(meta);
          }

          const arrow = document.createElement("span");
          arrow.className = "row-arrow";
          arrow.setAttribute("aria-hidden", "true");
          arrow.textContent = "↗";
          side.append(arrow);

          const badges = document.createElement("span");
          badges.className = "row-badges";

          if (repo.language) {
            const badge = document.createElement("span");
            badge.className = "badge";
            badge.textContent = repo.language;
            badges.append(badge);
          }

          link.append(title);
          if (side.childElementCount) link.append(side);
          if (badges.childElementCount) link.append(badges);
          li.append(link);

          if (repo.description) {
            const desc = document.createElement("p");
            desc.className = "row-desc";
            desc.textContent = repo.description;
            li.append(desc);
          }

          list.append(li);
        });

      if (!list.children.length && emptyNote) {
        list.append(listNote(emptyNote));
      }
    };

    if (!user) {
      paint([], manual.length ? "" : "nothing here yet.");
      return;
    }

    const repoCacheKey = "tenzou-repos-" + user.toLowerCase();

    try {
      const cached = sessionStorage.getItem(repoCacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && Date.now() - parsed.at < 10 * 60 * 1000 && Array.isArray(parsed.repos)) {
          paint(parsed.repos, "no public repos yet.");
          return;
        }
      }
    } catch (e) {
      /* ignore */
    }

    paint([], "");
    list.append(listNote("fetching repos…"));

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);

    fetch(
      "https://api.github.com/users/" +
        encodeURIComponent(user) +
        "/repos?per_page=100&sort=updated&type=owner",
      { headers: { accept: "application/vnd.github+json" }, signal: controller.signal }
    )
      .then((res) => {
        if (!res.ok) throw new Error("github " + res.status);
        return res.json();
      })
      .then((repos) => {
        if (!Array.isArray(repos)) throw new Error("unexpected response");
        const clean = repos
          .filter((repo) => repo && !repo.fork)
          .slice(0, 40)
          .map((repo) => ({
            name: repo.name,
            html_url: repo.html_url,
            description: repo.description,
            language: repo.language,
            stargazers_count: repo.stargazers_count,
            archived: repo.archived,
          }));

        try {
          sessionStorage.setItem(repoCacheKey, JSON.stringify({ at: Date.now(), repos: clean }));
        } catch (e) {
          /* ignore */
        }

        paint(clean, "no public repos yet.");
      })
      .catch(() => {
        try {
          const cached = sessionStorage.getItem(repoCacheKey);
          const parsed = cached ? JSON.parse(cached) : null;
          if (parsed && Array.isArray(parsed.repos) && parsed.repos.length) {
            paint(parsed.repos, "no public repos yet.");
            return;
          }
        } catch (e) {
          /* ignore */
        }

        paint([], "");
        const li = listNote("gagal memuat repo dari GitHub.");
        const link = document.createElement("a");
        link.className = "inline-link";
        link.href = profile;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = "buka profil GitHub ↗";
        li.querySelector(".list-note").append(" ", link);
        list.append(li);
      })
      .finally(() => clearTimeout(timer));
  }

  if (page === "projects") {
    initProjectTabs();
    setupCommunityForm();
  }

  Promise.all([loadContent(), loadStatus()]).then(([content, status]) => {
    if (content && typeof content === "object") {
      fillChrome(content);

      if (page === "home") renderHome(content);
      else if (page === "blog") renderPosts(content);
      else if (page === "projects") renderProjects(content);

      document.body.classList.add("content-ready");
    }

    if (!status) return;

    if (status.version) {
      $$("[data-version]").forEach((el) => {
        el.textContent = status.version;
      });
    }

    if (page === "home" && status.since) {
      startUptime($("[data-uptime]"), status.since);
    }
  });
})();
