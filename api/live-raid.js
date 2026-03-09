export default async function handler(req, res) {

  try {

    const clientId = process.env.WCL_CLIENT_ID;
    const clientSecret = process.env.WCL_CLIENT_SECRET;

    const tokenResponse = await fetch("https://www.warcraftlogs.com/oauth/token", {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: "grant_type=client_credentials"
    });

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // erstmal nur testen ob Token funktioniert

    res.status(200).json({
      tokenWorking: true,
      tokenPreview: accessToken.substring(0,20)
    });

  } catch (error) {

    res.status(500).json({
      error: error.message
    });

  }

}
