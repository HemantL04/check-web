const capitalize = (str) => {
  if (!str) {
    return '';
  }
  return str.charAt(0).toUpperCase() + str.slice(1);
};

const twitterTags = (metadata, config) => {
  return [
    '<meta content="summary" name="twitter:card" />',
    `<meta content="${metadata.title}" name="twitter:title" />`,
    `<meta content="${metadata.description}" name="twitter:text:description" />`,
    `<meta content="${metadata.description}" name="twitter:description" />`,
    `<meta content="${metadata.picture}" name="twitter:image" />`,
    `<meta content="${config.appName}" name="twitter:site" />`
  ].join("\n");
};

const facebookTags = (metadata, config) => {
  return [
    `<meta content="article" property="og:type" />`,
    `<meta content="${metadata.title}" property="og:title" />`,
    `<meta content="${metadata.picture}" property="og:image" />`,
    `<meta content="${metadata.permalink}" property="og:url" />`,
    `<meta content="${metadata.description}" property="og:description" />`
  ].join("\n");
};

const metaTags = (metadata, config) => {
  return [
    `<meta name="description" content="${metadata.description}" />`,
    `<link rel="alternate" type="application/json+oembed" href="${metadata.oembed_url}" title="${metadata.title}" />`
  ].join("\n");
};

const socialTags = (metadata, config) => {
  if (!metadata) {
    return '';
  }

  return [
    metaTags(metadata, config),
    twitterTags(metadata, config),
    facebookTags(metadata, config)
  ].join("\n");
};

export default ({ config, metadata }) => {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>${ metadata ? metadata.title : capitalize(config.appName) }</title>
        ${socialTags(metadata, config)}
        <link href="/images/logo/${config.appName || 'favicon'}.ico" rel="icon">
        <script src="/js/config.js" defer="defer"></script>
        <script src="/js/newrelic.js" defer="defer"></script>
        <script src="/js/vendor.bundle.js" defer="defer"></script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/pusher/4.0.0/pusher.min.js"></script>
        <link href="https://fonts.googleapis.com/css?family=Roboto:300,400,500,700|" rel="stylesheet" type="text/css">
      </head>
      <body>
        <div id="root"></div>
      </body>
      <script src="/js/index.bundle.js" defer="defer"></script>
    </html>
  `;
};
