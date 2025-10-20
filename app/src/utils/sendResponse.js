function sendResponse(res, success, message, data = undefined) {
    const response = { success, message };
    if (data !== undefined) response.data = data;
    return res.json(response);
}

module.exports = sendResponse;
