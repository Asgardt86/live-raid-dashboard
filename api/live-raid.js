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

    if (!report) {
      return res.status(200).json({ live:false });
    }

    const reportCode = report.code;
    const reportStart = report.startTime;
    const firstPull = pulls(0);
    const firstPullTime = reportStart + firstPull.startTime;

    const fightsQuery = `
      {
        reportData {
          report(code: "${reportCode}") {
            fights {
              name
              bossPercentage
              kill
              difficulty
              startTime
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
      return res.status(200).json({ live:false });
    }

    const lastPull = pulls[pulls.length - 1];

    const now = Date.now();

    const lastPullTime = reportStart + lastPull.startTime;

    const minutesSinceLastPull =
      (now - lastPullTime) / 1000 / 60;

    const raidStillActive = minutesSinceLastPull < 20;

    const summaryActive =
      minutesSinceLastPull >= 20 &&
      minutesSinceLastPull < 200;

    const currentBoss = lastPull.name;

    const difficultyMap = {
      3: "Normal",
      4: "Heroic",
      5: "Mythic"
    };

    const difficulty =
      difficultyMap[lastPull.difficulty] || "";

    const bossPulls = pulls.filter(p =>
      p.name === currentBoss &&
      p.difficulty === lastPull.difficulty
    );

    const totalPulls = bossPulls.length;

    let best = 100;

    const timeline = [];

    bossPulls.forEach((pull,index)=>{

      let percent = pull.kill ? 0 : pull.bossPercentage;

      if(percent < best){

        best = percent;

        timeline.push({
          pull:index + 1,
          percent:percent.toFixed(2)
        });

      }

    });

    let raidDurationMs;

    if(raidStillActive){
      raidDurationMs = now - firstPullTime;
    }else{
      raidDurationMs = lastPullTime - firstPullTime;
    }

    const hours =
      Math.floor(raidDurationMs / (1000 * 60 * 60));

    const minutes =
      Math.floor(
        (raidDurationMs % (1000 * 60 * 60))
        / (1000 * 60)
      );

    const raidDuration = `${hours}h ${minutes}m`;

    if(raidStillActive){

      return res.status(200).json({

        live:true,
        boss:currentBoss,
        difficulty:difficulty,
        report:reportCode,
        raidDuration:raidDuration,
        totalPulls:totalPulls,
        bestPull:best.toFixed(2),
        kill:lastPull.kill || false,
        timeline:timeline

      });

    }

    if(summaryActive){

      return res.status(200).json({

        live:false,
        summary:true,
        boss:currentBoss,
        difficulty:difficulty,
        report:reportCode,
        raidDuration:raidDuration,
        totalPulls:totalPulls,
        bestPull:best.toFixed(2)

      });

    }

    return res.status(200).json({
      live:false
    });

  }

  catch(error){

    res.status(500).json({
      error:error.message
    });

  }

}
