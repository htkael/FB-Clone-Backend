const asyncHandler = require("express-async-handler");

exports.welcome = asyncHandler(async (req, res) => {
  res.json({
    message: "Welcome to the FB Clone API",
    endpoints: {
      users: "/users",
      posts: "/posts",
      comments: "/posts/:postId/comments",
    },
  });
});
