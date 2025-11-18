import superagent from "superagent";

export async function getLevel(query: string): Promise<string|null> {
    try {
        let res = await superagent
            .post("http://www.boomlings.com/database/getGJLevels21.php")
            .set("Content-Type", "application/x-www-form-urlencoded")
            .set("User-Agent", "")
            .send({
                "str": query,
                "type": 0,
                "secret": "Wmfd2893gb7",
            });

        return res.text;
    } catch (e) {
        console.error(e);
        return null;
    }
}
