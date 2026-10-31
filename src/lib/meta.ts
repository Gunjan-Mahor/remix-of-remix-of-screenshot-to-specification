export const pageHead = (title: string, description: string) => () => ({
  meta: [
    { title: `${title} — Nexora` },
    { name: "description", content: description },
    { property: "og:title", content: `${title} — Nexora` },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ],
});
