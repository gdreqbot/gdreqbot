export default {
    twitch: {
        clientId: process.env.TWITCH_CLIENT_ID,
        clientSecret: process.env.TWITCH_SECRET,
        botId: process.env.BOT_ID,
        ownerId: process.env.OWNER_ID,
    },
    google: {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_SECRET,
    },
    prefix: process.env.PREFIX,
    clientVersion: {
        win32: "1.2.2",
        darwin: "1.2.2",
        linux: "1.2.2"
    }
};
