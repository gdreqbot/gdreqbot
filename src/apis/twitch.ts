import superagent from "superagent";

export async function getUser(query: string, type: "id" | "login"): Promise<any|null> {
    try {
        let res = await superagent
            .get(`https://api.twitch.tv/helix/users?${type}=${query}`)
            .set("Authorization", `Bearer ${process.env.ACCESS_TOKEN}`)
            .set("Client-Id", process.env.CLIENT_ID);

        return res.body;
    } catch (e) {
        console.error(e);
        return null;
    }
}
