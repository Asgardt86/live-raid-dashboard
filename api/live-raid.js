export default async function handler(req, res) {

  try {

    const clientId = process.env.WCL_CLIENT_ID;
    const clientSecret = process.env.WCL_CLIENT_SECRET;

    const credentials = Buffer
      .from(`${clientId}:${clientSecret}`)
      .toString("base64");

    const tokenResponse = await fetch(
      "https://www.warcraftlogs.com/oauth/token",
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: "grant_type=client_credentials"
      }
    );

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    const reportsQuery = `
      {
        reportData {
          reports(
            guildName: "We Pull at Two",
            guildServerSlug: "blackrock",
            guildServerRegion: "eu",
            limit: 1
          ) {
            data {
              code
              startTime
              endTime
            }
          }
        }
      }
    `;

    const reportsResponse = await fetch(
      "https://www.warcraftlogs.com/api/v2/client",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ query: reportsQuery })
      }
    );

    const reportsData = await reportsResponse.json();

    const report = reportsData.data.reportData.reports.data[0];

    const reportCode = report.code;
    const startTime = report.startTime;

    const now = Date.now();

    const raidIsLive = (now - startTime) < (6 * 60 * 60 * 1000);

    const raidDurationMs = now - startTime;

    const raidHours = Math.floor(raidDurationMs / (1000 * 60 * 60));
    const raidMinutes = Math.floor((raidDurationMs % (1000 * 60 * 60)) / (1000 * 60));

    const raidDuration = `${raidHours}h ${raidMinutes}m`;

    const fightsQuery = `
      {
        reportData {
          report(code: "${reportCode}") {
            fights {
              id
              name
              bossPercentage
              kill
            }
          }
        }
      }
    `;

    const fightsResponse = await fetch(
      "https://www.warcraftlogs.com/api/v2/client",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ query: fightsQuery })
      }
    );

    const fightsData = await fightsResponse.json();

    const fights = fightsData.data.reportData.report.fights;

    const pulls = fights.filter(f => f.bossPercentage !== null);

    if (pulls.length === 0) {

      return res.status(200).json({
        live: false
      });

    }

    const lastPull = pulls[pulls.length - 1];

    const currentBoss = lastPull.name;

    const bossPulls = pulls.filter(p => p.name === currentBoss);

    const totalPulls = bossPulls.length;

    let best = 100;

    const timeline = [];

    bossPulls.forEach((pull, index) => {

      const percent = pull.bossPercentage;

      if (percent < best) {

        best = percent;

        timeline.push({
          pull: index + 1,
          percent: percent.toFixed(2)
        });

      }

    });

    res.status(200).json({

      live: raidIsLive,
      report: reportCode,
      boss: currentBoss,
      raidDuration: raidDuration,
      totalPulls: totalPulls,
      bestPull: best.toFixed(2),
      kill: lastPull.kill || false,
      timeline: timeline

    });

  }

  catch (error) {

    res.status(500).json({
      error: error.message
    });

  }

}
