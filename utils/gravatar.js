const gravatar = require("gravatar");

function generateGravatarUrl(email) {
  return gravatar.url(
    email,
    {
      s: "200",
      r: "pg",
      d: "identicon",
    },
    true
  );
}

module.exports = { generateGravatarUrl };
