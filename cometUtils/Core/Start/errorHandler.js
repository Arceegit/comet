module.exports = async (client, error, attempts) => {
    client.logs.error(`Client error: ${error.message}`);
    console.error(error.stack);
};
