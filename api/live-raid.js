export default async function handler(req, res) {
  try {
    const clientId = process.env.WCL_CLIENT_ID;
    const clientSecret = process.env.WCL_CLIENT_SECRET;

    const params = new URLSearchParams();
    params.append("grant_type", "client_credentials");
    params.append("client_id", clientId);
    params.append("client_secret", clientSecret);

    const tokenResponse = await fetch("https://www.warcraftlogs.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: params.toString()
    });

    const tokenData = await tokenResponse.json();

    res.status(200).json({
      tokenData
    });

  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
}
