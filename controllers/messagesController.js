const {
  CustomBadRequestError,
  CustomNotFoundError,
  CustomUnauthorizedError,
  CustomServerError,
} = require("../errors/CustomErrors");
const prisma = require("../prisma/client");
const asyncHandler = require("express-async-handler");

exports.sendMessage = asyncHandler(async (req, res) => {
  const conversationId = parseInt(req.params.conversationId);
  const userId = parseInt(req.user);
  const { content, imageUrl } = req.body;
  try {
    const conversation = await prisma.conversation.findUnique({
      where: {
        id: conversationId,
      },
    });
  } catch (err) {
    console.error(err);
    if (
      err instanceof CustomBadRequestError ||
      err instanceof CustomNotFoundError ||
      err instanceof CustomUnauthorizedError
    ) {
      throw err;
    }
    throw new CustomServerError("Server error while sending message");
  }
});
